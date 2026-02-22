"""Gemini API service for chat completions."""

from typing import Optional
from app.config import settings
from app.data.components_data import COMPONENT_LIBRARY


class MockGeminiService:
    """Fallback service that returns template-based responses when no API key is available."""

    def generate_response(
        self,
        user_message: str,
        context: Optional[str] = None,
        conversation_history: Optional[list[dict[str, str]]] = None,
        chat_width: Optional[int] = None,
        scope: Optional[dict] = None
    ) -> str:
        msg = user_message.lower()

        if any(kw in msg for kw in ["cost", "price", "budget", "expensive", "cheap"]):
            return (
                "**Cost Optimization Tips:**\n"
                "- Use serverless hosting (`vercel`, `netlify`, `cloudrun`) for auto-scaling\n"
                "- Start with free-tier databases (`supabase`, `firebase`)\n"
                "- Add `redis-cache` to reduce DB load\n"
                "- Use `cloudflare-cdn` for static assets\n\n"
                "Would you like me to visualize a cost-optimized architecture on the canvas?"
            )

        if any(kw in msg for kw in ["scale", "performance", "high traffic", "enterprise"]):
            return (
                "**High-Scale Architecture:**\n"
                "- `react` or `nextjs` frontend behind `cloudflare-cdn`\n"
                "- `go` or `fastapi` backend on `aws-ec2` / `cloudrun`\n"
                "- `postgresql` primary DB + `redis-cache` for hot data\n"
                "- `kafka` for async event processing\n"
                "- `datadog` or `sentry` for observability\n\n"
                "Would you like me to visualize this on the canvas?"
            )

        if any(kw in msg for kw in ["simple", "basic", "mvp", "startup", "small"]):
            return (
                "**MVP Stack:**\n"
                "- `nextjs` (frontend + API routes)\n"
                "- `supabase` (DB + auth + storage)\n"
                "- `vercel` (hosting, free tier)\n"
                "- `github-actions` (CI/CD, free)\n\n"
                "Estimated cost: ~$25/mo at low scale.\n\n"
                "Would you like me to visualize this on the canvas?"
            )

        if any(kw in msg for kw in ["create", "build", "design", "implement", "show", "draw", "canvas", "visualize"]):
            return (
                "I can help design an architecture. To give the best recommendation, I need:\n"
                "- **What are you building?** (e.g., SaaS, e-commerce, API service)\n"
                "- **Expected users?** (helps size infrastructure)\n"
                "- **Budget constraints?**\n\n"
                "Or describe your stack and I'll visualize it on the canvas."
            )

        return (
            "I'm an architecture advisor running in **offline mode** (no Gemini API key configured).\n\n"
            "I can help with:\n"
            "- Designing architectures (just describe what you're building)\n"
            "- Cost optimization suggestions\n"
            "- Scaling recommendations\n\n"
            "Try: *\"Design an MVP for a SaaS app\"* or *\"How do I optimize costs?\"*"
        )

    def extract_component_ids_from_text(self, text: str) -> list[str]:
        text_lower = text.lower()
        mentioned_ids = []
        for category in COMPONENT_LIBRARY:
            for comp in category.components:
                if comp.id in text_lower or comp.name.lower() in text_lower:
                    mentioned_ids.append(comp.id)
        return list(set(mentioned_ids))


class GeminiService:
    """Service for interacting with Google Gemini API."""

    def __init__(self):
        """Initialize Gemini client."""
        if not settings.gemini_api_key:
            raise ValueError("GEMINI_API_KEY environment variable is required")
        
        from google import genai
        self.client = genai.Client(api_key=settings.gemini_api_key)
        self.model_id = settings.gemini_model
    
    def generate_response(
        self,
        user_message: str,
        context: Optional[str] = None,
        conversation_history: Optional[list[dict[str, str]]] = None,
        chat_width: Optional[int] = None,
        scope: Optional[dict] = None,
        constraints: Optional[dict] = None,
        lint_issues: Optional[list[dict]] = None,
        recent_actions: Optional[list[str]] = None,
        plan_context: Optional[list[list[dict]]] = None,
    ) -> str:
        system_prompt = self._build_system_prompt(
            context, chat_width, scope, constraints, lint_issues, recent_actions, plan_context
        )
        
        # Build conversation history
        from google.genai import types
        contents = []
        if conversation_history:
            for msg in conversation_history:
                role = "user" if msg.get("role") == "user" else "model"
                contents.append(types.Content(
                    role=role,
                    parts=[types.Part.from_text(text=msg.get("content", ""))]
                ))
            
        try:
            chat = self.client.chats.create(
                model=self.model_id,
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt
                ),
                history=contents
            )
            response = chat.send_message(user_message)
            return response.text
        except Exception as e:
            print(f"Gemini API Error: {e}")
            raise e
    
    def _build_system_prompt(
        self, 
        context: Optional[str] = None,
        chat_width: Optional[int] = None,
        scope: Optional[dict] = None,
        constraints: Optional[dict] = None,
        lint_issues: Optional[list[dict]] = None,
        recent_actions: Optional[list[str]] = None,
        plan_context: Optional[list[list[dict]]] = None,
    ) -> str:
        """Build the system prompt with context, component library, constraints, and planning history."""
        
        component_library_text = self._build_component_library_text()
        
        scope_text = ""
        if scope:
            scope_text = f"""
Current Architecture Scope:
- Users: {scope.get('users', 'not specified')}
- Traffic Level: {scope.get('trafficLevel', 'not specified')}/5
- Data Volume: {scope.get('dataVolumeGB', 'not specified')} GB
- Regions: {scope.get('regions', 1)}
- Availability: {scope.get('availability', 99.9)}%
"""
        
        width_text = ""
        if chat_width:
            width_text = f"""
UI Constraints:
- Chat panel width: {chat_width}px
- For complex diagrams or visualizations, suggest implementing on the canvas instead of text
- Keep code blocks and text responses concise to fit the chat width
- Avoid ASCII diagrams that are wider than {chat_width - 100}px
"""

        constraints_text = ""
        if constraints:
            constraints_text = f"""
Project Constraints (user-defined):
- Budget: {constraints.get('budgetLevel', 'medium')}
- Team Size: {constraints.get('teamSize', 2)}
- Timeline: {constraints.get('timeline', '1month')}
- Traffic: {constraints.get('trafficExpectation', 'medium')}
- Data Volume: {constraints.get('dataVolume', 'medium')}
- Uptime Target: {constraints.get('uptimeTarget', 99)}%
- Regions: {constraints.get('regionCount', 1)}
- Dev Experience Goal: {constraints.get('devExperienceGoal', 'balanced')}
- Data Sensitivity: {constraints.get('dataSensitivity', 'low')}
- Preferred Providers: {', '.join(constraints.get('preferredProviders', [])) or 'none'}
- Avoid Providers: {', '.join(constraints.get('avoidProviders', [])) or 'none'}
Use these constraints to tailor every recommendation. If budget is low, prioritize free tiers. If timeline is hackathon, simplify.
"""

        lint_text = ""
        if lint_issues and len(lint_issues) > 0:
            issue_lines = []
            for issue in lint_issues[:10]:
                sev = issue.get("severity", "info").upper()
                title = issue.get("title", "")
                desc = issue.get("description", "")
                fix = issue.get("suggestedFix", "")
                line = f"  [{sev}] {title}: {desc}"
                if fix:
                    line += f" (suggested: {fix})"
                issue_lines.append(line)
            lint_text = f"""
**ACTIVE LINT ISSUES ON CANVAS** (the user sees these — proactively address them):
{chr(10).join(issue_lines)}
When the user asks about issues or improvements, reference these specific lint problems. Suggest fixes using component IDs in backticks.
"""

        actions_text = ""
        if recent_actions and len(recent_actions) > 0:
            actions_text = f"""
Recent user actions on the canvas:
{chr(10).join('- ' + a for a in recent_actions[-8:])}
Acknowledge these changes naturally. If they just added a component, explain how it fits. If they removed one, ask if they need an alternative.
"""

        plan_text = ""
        if plan_context and len(plan_context) > 0:
            session_blocks = []
            for idx, session_msgs in enumerate(plan_context[:5], 1):
                lines = []
                for msg in session_msgs[-30:]:
                    role = msg.get("role", "user").upper()
                    content = msg.get("content", "")
                    if len(content) > 1500:
                        content = content[:1500] + "…"
                    lines.append(f"  [{role}]: {content}")
                session_blocks.append(f"  --- Plan Session {idx} ---\n" + chr(10).join(lines))
            plan_text = f"""
**PLANNING PHASE HISTORY** (the user discussed their project in the Plan chat BEFORE arriving here — this is your memory of what they want to build):
{chr(10).join(session_blocks)}

CRITICAL: You already know what the user is building from these planning conversations. Reference their goals, requirements, constraints, and decisions made during planning. Do NOT ask questions that were already answered in the plan. Build on top of those decisions. If their current canvas diverges from the plan, note it and ask if they changed direction.
"""
        
        base_prompt = f"""You are **Preflight Workspace** — the same principal-level architect, now in build mode. The user already has components on the canvas. Your job: refine, optimize, and evolve their architecture in real-time.

**IDENTITY & TONE:**
- You are a staff-level architect pair-programming on the design. Direct, opinionated, evidence-based.
- Zero filler. No "Great question!", "Happy to help!". Go straight to the answer.
- Bullet points preferred. Max 2 sentences per paragraph.
- You remember EVERYTHING from this conversation. Build on prior decisions, don't repeat rejected ideas.

**CONTEXT AWARENESS:**
- You see the user's current architecture (nodes on the canvas) and scope constraints.
- Reference specific components already on the canvas: "Your `postgresql` handles the relational data, but you're missing a cache layer for your hot reads."
- When the user asks "what next?" — give 1-3 concrete, prioritized actions based on their SPECIFIC architecture and goals.

**RESPONSIBILITIES:**
1. Analyze and improve the architecture on the canvas using ONLY the Component Library.
2. Identify gaps, single points of failure, missing layers (auth, cache, CDN, monitoring, CI/CD).
3. Propose cost-effective, scalable solutions matched to the Scope.
4. For every suggestion, explain **why it matters for THIS app** — not generic advice.
5. When suggesting new components, use backtick IDs (e.g., `redis`, `sentry`) — the system auto-renders them on the canvas.

**SCOPE-DRIVEN DECISIONS:**
- <1K users: Free tiers, serverless, minimal infra. Don't over-engineer.
- 1K-10K users: Managed services, add caching, basic monitoring.
- 10K-100K users: Load balancing, read replicas, CDN, proper CI/CD.
- >100K users: Multi-region, auto-scaling, event-driven architecture, observability stack.

**CANVAS INTERACTION:**
- To visualize components on the canvas, mention their IDs in backticks: `nextjs` `fastapi` `redis`
- The system detects these and can add them to the canvas automatically.
- NEVER output Mermaid, Graphviz, ASCII diagrams, or code-block diagrams. The canvas handles visualization.

**SCOPE ANALYSIS FORMAT:**
When the user defines or updates scope, output a JSON block:
```json
{{
  "scope_analysis": {{
    "users": [Number],
    "trafficLevel": [1-5],
    "dataVolumeGB": [Number],
    "regions": [Number],
    "availability": [Number 0-100],
    "estimatedCost": [Number]
  }}
}}
```
Provide a brief text summary BEFORE the JSON block. The JSON block is parsed by the system and hidden from the user.

**ANTI-PATTERNS:**
- Don't say "It depends" without your recommendation
- Don't suggest components not in the library
- Don't repeat suggestions the user already accepted or rejected
- Don't give generic advice — every recommendation must reference the user's specific context

{component_library_text}

{scope_text}

{width_text}

{constraints_text}

{lint_text}

{actions_text}

{plan_text}
"""
        
        if context:
            base_prompt += f"\n\nRelevant Knowledge Base Context:\n{context}"
        
        return base_prompt
    
    def _build_component_library_text(self) -> str:
        """Build a text representation of the component library."""
        lines = ["Available Component Library:"]
        
        for category in COMPONENT_LIBRARY:
            lines.append(f"\n{category.name} ({category.id}):")
            for comp in category.components:
                cost_text = f"${comp.baseCost}/mo" if comp.baseCost and comp.baseCost > 0 else "Free"
                lines.append(f"  - {comp.name} (ID: {comp.id}) - {cost_text}")
        
        return "\n".join(lines)
    
    def extract_component_ids_from_text(self, text: str) -> list[str]:
        """
        Extract component IDs mentioned in text.
        
        This is a simple keyword-based extraction. In production, you might use
        more sophisticated NLP or have Gemini return structured data.
        """
        text_lower = text.lower()
        mentioned_ids = []
        
        for category in COMPONENT_LIBRARY:
            for comp in category.components:
                # Check if component name or ID is mentioned
                if comp.id in text_lower or comp.name.lower() in text_lower:
                    mentioned_ids.append(comp.id)
        
        return list(set(mentioned_ids))  # Remove duplicates

    # --- Planning chat (pre-dashboard architecture discovery) ---

    def generate_plan_response(
        self,
        user_message: str,
        conversation_history: Optional[list[dict[str, str]]] = None,
    ) -> str:
        """
        Generate a response for the planning chat: understand what the user is building,
        ask clarifying questions, then recommend components. Uses a dedicated system prompt.
        """
        from google.genai import types
        system_prompt = self._build_plan_system_prompt()
        contents = []
        if conversation_history:
            for msg in conversation_history:
                role = "user" if msg.get("role") == "user" else "model"
                contents.append(types.Content(
                    role=role,
                    parts=[types.Part.from_text(text=msg.get("content", ""))]
                ))
        chat = self.client.chats.create(
            model=self.model_id,
            config=types.GenerateContentConfig(system_instruction=system_prompt),
            history=contents,
        )
        response = chat.send_message(user_message)
        return response.text

    def _build_plan_system_prompt(self) -> str:
        """System prompt for the architecture planning chat (world-class architect persona)."""
        component_lib = self._build_component_library_text()
        return f"""You are **Preflight** — a principal-level systems architect with 20+ years across startups, FAANG, and infrastructure companies (AWS, Cloudflare, Vercel). You have shipped architectures serving billions of requests. You think in trade-offs, not absolutes.

**YOUR IDENTITY:**
- You are the user's CTO-for-hire. They are pre-code — no line written yet. Your job: prevent the 6 months of pain that comes from choosing the wrong stack.
- You speak like a senior eng in a design review: direct, opinionated, evidence-based. Zero filler.
- You have deep expertise across: web apps, mobile backends, AI/ML pipelines, real-time systems, marketplaces, SaaS platforms, developer tools, data platforms, IoT, and agentic AI systems.

**CONVERSATION PROTOCOL:**

Phase 1 — DISCOVERY (first 1-2 messages):
Ask exactly 3-5 high-signal questions. Tailor them to what the user described. Examples:
- "What's your timeline — hackathon weekend, 3-month MVP, or long-term product?"
- "Expected concurrent users at launch? And in 12 months?"
- "Any hard constraints? (e.g., must use Python, budget under $50/mo, HIPAA compliance)"
- "Solo dev or team? This changes whether I optimize for speed-to-ship or maintainability."
- "What's the core user action that MUST be fast? (e.g., search, checkout, real-time collab)"

Phase 2 — DIAGNOSIS (after user answers):
Before recommending, give a 2-3 sentence **architecture thesis** — the core insight that drives every choice. Examples:
- "This is a read-heavy content app with spiky traffic. The architecture should be edge-first with aggressive caching."
- "This is an AI agent platform — the bottleneck is LLM latency and cost. We need async job queues and streaming."
- "This is a two-sided marketplace. The critical path is trust + payments. Auth and Stripe integration are non-negotiable from day 1."

Phase 3 — RECOMMENDATION:
Recommend 5-10 components from the library. For EACH component, give ONE line explaining **why it fits THIS specific project** (not generic marketing). Format:

**Recommended Stack:**
- **Frontend:** `nextjs` — SSR gives you SEO for your public pages + React ecosystem for the dashboard
- **Backend:** `fastapi` — Python lets you share code with your ML pipeline; async handles your webhook volume
- **Database:** `postgresql` — Relational fits your multi-tenant data model; row-level security for isolation
- **Auth:** `clerk` — Ship auth in an afternoon; supports org-level access you'll need for B2B
- **Hosting:** `vercel` — Zero-config deploys for Next.js; edge functions for your API routes
- **Cache:** `redis` — Session store + rate limiting; your API will need both at 10k users

**Cost Estimate:** ~$XX/mo at launch, ~$XXX/mo at 10k users

End with COMPONENT_IDS line.

**CRITICAL RULES:**
1. NEVER recommend a component not in the library. If the user needs something missing, say "I'd recommend X but it's not in our library yet — closest option is Y."
2. ALWAYS explain trade-offs: "I chose X over Z because [reason]. If [condition changes], switch to Z."
3. When the user says something vague ("I want to build an app"), don't guess — ask. But make your questions specific, not generic.
4. If the user's idea has a fatal flaw (e.g., "real-time multiplayer game on serverless"), flag it diplomatically: "Heads up — serverless has cold-start latency that will hurt real-time UX. Consider [alternative]."
5. Adapt your depth to the user's expertise. If they mention "k8s" or "event sourcing", go deep. If they say "I'm new to backend", simplify.
6. For AI/agent projects: always consider LLM cost, latency, context window limits, and whether they need streaming.
7. For marketplaces: always address payments, trust/safety, and the chicken-and-egg problem.
8. For SaaS: always address multi-tenancy, billing, and onboarding flow.
9. Output format for component recommendation — you MUST end with a single line:
   COMPONENT_IDS: id1, id2, id3, ...
   Use ONLY IDs from the component library. This line triggers the UI to show selectable cards.

**ANTI-PATTERNS (never do these):**
- Don't say "It depends" without immediately following with your recommendation
- Don't list 15 components — pick the minimal viable set (5-8) and explain why each earns its place
- Don't use phrases: "Great question!", "Happy to help!", "Let me think about that"
- Don't output Mermaid, ASCII diagrams, or code blocks with diagram syntax
- Don't recommend over-engineering for MVPs or under-engineering for scale

**Component Library (use ONLY these IDs in COMPONENT_IDS):**
{component_lib}
"""

    def parse_component_ids_from_plan_response(self, response_text: str) -> list[str]:
        """Extract COMPONENT_IDS line from a plan response. Returns list of IDs or empty list."""
        import re
        match = re.search(r"COMPONENT_IDS:\s*([^\n]+)", response_text, re.IGNORECASE)
        if not match:
            return []
        raw = match.group(1).strip()
        ids = [x.strip().lower() for x in raw.split(",") if x.strip()]
        # Filter to only known library IDs
        known = set()
        for category in COMPONENT_LIBRARY:
            for comp in category.components:
                known.add(comp.id.lower())
        return [i for i in ids if i in known]
