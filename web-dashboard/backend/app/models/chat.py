"""Pydantic models for chat API requests and responses."""

from typing import Optional, Literal, Any
from pydantic import BaseModel, Field
from app.models.architecture import ArchitectureJson, Scope


class ChatRequest(BaseModel):
    """Chat request model. architecture_json can be a dict for lenient parsing."""
    message: str
    session_id: Optional[str] = None
    conversation_history: Optional[list[dict]] = None
    architecture_json: Optional[Any] = None
    chat_width: Optional[int] = Field(
        default=600,
        description="Width of the chat panel in pixels for UI-aware responses"
    )
    constraints: Optional[dict] = None
    lint_issues: Optional[list[dict]] = None
    recent_actions: Optional[list[str]] = None
    plan_context: Optional[list[list[dict]]] = None


class ChatResponse(BaseModel):
    """Chat response model."""
    message: str
    session_id: str
    suggest_implementation: bool = False
    updated_architecture: Optional[ArchitectureJson] = None
    canvas_action: Optional[Literal["update", "clear", "none"]] = Field(
        default="none",
        description="Action for the frontend canvas: 'update' to apply architecture, 'clear' to reset, 'none' for no action"
    )
    updated_scope: Optional[dict] = Field(
        default=None,
        description="Updated scope parameters (users, trafficLevel, dataVolumeGB, regions, availability) to sync with frontend"
    )


class ImplementRequest(BaseModel):
    """Architecture implementation request model."""
    session_id: str
    architecture_json: ArchitectureJson
    implementation_request: str


class ImplementResponse(BaseModel):
    """Architecture implementation response model."""
    updated_architecture: ArchitectureJson
    explanation: str


class PlanMessage(BaseModel):
    """Single message in plan chat."""
    role: Literal["user", "assistant"]
    content: str


class PlanChatRequest(BaseModel):
    """Request for the planning chat (pre-dashboard)."""
    messages: list[PlanMessage]
    session_id: Optional[str] = None


class PlanChatResponse(BaseModel):
    """Response from planning chat."""
    message: str
    session_id: str
    suggested_component_ids: list[str] = Field(default_factory=list)
