# PreFlight — Backend

FastAPI server powering the architecture studio. Handles AI chat (Gemini), RAG for design context, and infrastructure cost calculations.

## Setup

1. `python -m venv venv && source venv/bin/activate`
2. `pip install -r requirements.txt`
3. `cp .env.example .env` (add `GEMINI_API_KEY`)
4. `python -m app.main`

Runs at `localhost:8000`. API docs at `/docs`.

## Core Services

- **Gemini AI** (`app/services/gemini_service.py`): Planning and workspace chat with context-aware system prompts.
- **RAG** (`app/services/rag_service.py`): LangChain + FAISS for technical knowledge retrieval.
- **Architecture** (`app/services/architecture_service.py`): Node/edge schema and graph generation.
- **Cost Engine** (`app/data/components_data.py`): Component pricing library with 60+ cloud-native services.

## Endpoints

- `POST /api/chat`: Workspace AI architect (canvas-aware).
- `POST /api/chat/plan`: Planning phase AI (discovery + stack recommendations).
- `POST /api/chat/implement`: AI-driven graph modifications.
- `GET /health`: Health check.
