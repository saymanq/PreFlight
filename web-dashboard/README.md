# PreFlight — Web Architecture Studio

The visual workspace for architecture design and cost simulation. Split into a FastAPI backend and a Next.js frontend.

## Structure

- **backend**: Python service handling Gemini AI, RAG (LangChain/FAISS), and cost logic.
- **frontend**: Next.js app with React Flow for the interactive canvas, Convex for real-time data.

## Setup

1. Go to `backend/` and follow its README to start the API.
2. Go to `frontend/` and follow its README to start the dev server.
3. Needs a Google Gemini API key in `backend/.env`.
