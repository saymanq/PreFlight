"""Chat API router -- AI-only; session persistence is handled by Convex on the frontend."""

import re
import json
from typing import Optional
from fastapi import APIRouter, HTTPException
from app.models.chat import (
    ChatRequest,
    ChatResponse,
    ImplementRequest,
    ImplementResponse,
    PlanChatRequest,
    PlanChatResponse,
)
from app.models.architecture import ArchitectureJson, Scope
from app.services.gemini_service import GeminiService, MockGeminiService
from app.services.rag_service import RAGService, MockRAGService
from app.services.architecture_service import ArchitectureService
from app.config import settings
from pydantic import ValidationError

router = APIRouter(prefix="/chat", tags=["chat"])

gemini_service = None
rag_service = None
architecture_service: ArchitectureService | None = None

MAX_HISTORY_MESSAGES = 40


def get_gemini_service():
    global gemini_service
    if gemini_service is None:
        if settings.gemini_api_key:
            try:
                gemini_service = GeminiService()
                print("Using real Gemini service")
            except Exception as e:
                print(f"Failed to init Gemini, falling back to mock: {e}")
                gemini_service = MockGeminiService()
        else:
            print("No GEMINI_API_KEY - using MockGeminiService")
            gemini_service = MockGeminiService()
    return gemini_service


def get_rag_service():
    global rag_service
    if rag_service is None:
        if settings.gemini_api_key:
            try:
                rag_service = RAGService()
                print("Using real RAG service")
            except Exception as e:
                print(f"Failed to init RAG, falling back to mock: {e}")
                rag_service = MockRAGService()
        else:
            print("No GEMINI_API_KEY - using MockRAGService")
            rag_service = MockRAGService()
    return rag_service


def get_architecture_service() -> ArchitectureService:
    global architecture_service
    if architecture_service is None:
        architecture_service = ArchitectureService()
    return architecture_service


def normalize_architecture_json(payload: Optional[dict]) -> ArchitectureJson:
    if not payload or not isinstance(payload, dict):
        return ArchitectureJson(scope=Scope())
    try:
        scope_data = payload.get("scope") or {}
        if isinstance(scope_data, dict):
            scope = Scope(
                users=int(scope_data.get("users", 1000)),
                trafficLevel=min(5, max(1, int(scope_data.get("trafficLevel", 2)))),
                dataVolumeGB=float(scope_data.get("dataVolumeGB", 10.0)),
                regions=int(scope_data.get("regions", 1)),
                availability=float(scope_data.get("availability", 99.9)),
            )
        else:
            scope = Scope()
        nodes = payload.get("nodes") if isinstance(payload.get("nodes"), list) else []
        edges = payload.get("edges") if isinstance(payload.get("edges"), list) else []
        try:
            return ArchitectureJson(nodes=nodes, edges=edges, scope=scope)
        except ValidationError:
            return ArchitectureJson(scope=scope)
    except (TypeError, ValueError, KeyError):
        return ArchitectureJson(scope=Scope())


def detect_canvas_intent(message: str) -> bool:
    message_lower = message.lower()
    direct_triggers = ["canvas", "diagram", "visualize", "visualization", "draw", "sure", "show"]
    if any(trigger in message_lower for trigger in direct_triggers):
        return True
    architecture_terms = ["architecture", "system", "stack", "setup", "infrastructure"]
    action_words = ["create", "design", "build", "make", "show", "implement", "set up", "add", "sure"]
    has_architecture = any(term in message_lower for term in architecture_terms)
    has_action = any(action in message_lower for action in action_words)
    return has_architecture and has_action


@router.post("", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Handle chat messages with RAG context and canvas implementation detection."""
    try:
        arch = normalize_architecture_json(request.architecture_json)

        rag = get_rag_service()
        gemini = get_gemini_service()
        arch_service = get_architecture_service()

        context = rag.retrieve_context(request.message)

        conversation_history = (request.conversation_history or [])[-MAX_HISTORY_MESSAGES:]

        scope_dict = {
            "users": arch.scope.users,
            "trafficLevel": arch.scope.trafficLevel,
            "dataVolumeGB": arch.scope.dataVolumeGB,
            "regions": arch.scope.regions,
            "availability": arch.scope.availability,
        }

        response_text = gemini.generate_response(
            user_message=request.message,
            context=context,
            conversation_history=conversation_history if conversation_history else None,
            chat_width=request.chat_width,
            scope=scope_dict,
            constraints=request.constraints,
            lint_issues=request.lint_issues,
            recent_actions=request.recent_actions,
            plan_context=request.plan_context,
        )

        canvas_intent = detect_canvas_intent(request.message)
        canvas_action = "none"
        updated_architecture = None

        if canvas_intent:
            mentioned_components = gemini.extract_component_ids_from_text(
                request.message + " " + response_text
            )
            if mentioned_components and len(mentioned_components) > 0:
                updated_architecture = arch_service.generate_architecture_from_components(
                    component_ids=mentioned_components,
                    scope=arch.scope,
                )
                canvas_action = "update"

        updated_scope = None
        try:
            json_match = re.search(r"```json\s*(\{.*?\})\s*```", response_text, re.DOTALL)
            if json_match:
                data = json.loads(json_match.group(1))
                if "scope_analysis" in data:
                    analysis = data["scope_analysis"]
                    updated_scope = {
                        k: v
                        for k, v in {
                            "users": analysis.get("users"),
                            "trafficLevel": analysis.get("trafficLevel"),
                            "dataVolumeGB": analysis.get("dataVolumeGB"),
                            "regions": analysis.get("regions"),
                            "availability": analysis.get("availability"),
                        }.items()
                        if v is not None
                    }
                    response_text = response_text.replace(json_match.group(0), "").strip()
        except Exception:
            pass

        suggest_implementation = any(
            keyword in request.message.lower()
            for keyword in ["implement", "create", "build", "design", "set up", "add"]
        )

        return ChatResponse(
            message=response_text,
            session_id=request.session_id or "",
            suggest_implementation=suggest_implementation,
            updated_architecture=updated_architecture,
            canvas_action=canvas_action,
            updated_scope=updated_scope,
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error processing chat: {str(e)}")


@router.post("/implement", response_model=ImplementResponse)
async def implement_architecture(request: ImplementRequest):
    """Implement architecture changes based on user request."""
    try:
        return ImplementResponse(
            updated_architecture=request.architecture_json,
            explanation="Architecture implementation feature is being enhanced.",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error implementing architecture: {str(e)}")


@router.post("/plan", response_model=PlanChatResponse)
async def plan_chat(request: PlanChatRequest):
    """Planning chat -- AI only. Session persistence handled by Convex on the frontend."""
    try:
        if not request.messages or not isinstance(request.messages, list):
            raise HTTPException(status_code=400, detail="messages must be a non-empty list")
        if request.messages[-1].role != "user":
            raise HTTPException(status_code=400, detail="Last message must be from user")
        user_message = request.messages[-1].content or ""
        history = [{"role": m.role, "content": m.content or ""} for m in request.messages[:-1]]

        gemini = get_gemini_service()
        if isinstance(gemini, MockGeminiService):
            reply = (
                "I'm in offline mode. Describe what you're building and I'll ask a few questions, "
                "then recommend a stack. When the API is connected, I'll suggest components you can select."
            )
            suggested_ids: list[str] = []
        else:
            try:
                reply = gemini.generate_plan_response(
                    user_message=user_message,
                    conversation_history=history if history else None,
                )
                suggested_ids = gemini.parse_component_ids_from_plan_response(reply or "")
            except Exception as e:
                import traceback
                traceback.print_exc()
                raise HTTPException(status_code=502, detail=f"LLM error: {str(e)}")

        return PlanChatResponse(
            message=reply,
            session_id=request.session_id or "",
            suggested_component_ids=suggested_ids or [],
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
