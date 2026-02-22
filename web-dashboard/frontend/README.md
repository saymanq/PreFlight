# PreFlight — Frontend

Next.js dashboard for the architecture studio. Uses React Flow for the canvas, Zustand for state, and Convex for real-time persistence.

## Setup

1. `npm install`
2. `npm run dev`

Runs at `localhost:3000`. Needs the backend up at `localhost:8000`.

## Features

- **Canvas**: Drag-and-drop cloud components with real-time cost scoring.
- **AI Chat**: Sidebar to talk to the AI architect (planning + workspace modes).
- **Scaling**: Adjust users/traffic/regions and watch cost estimates update live.
- **Linting**: Architecture lint rules with staged auto-fix and version history.

## Structure

- `app/sandbox/new/page.tsx`: The main editor.
- `lib/store/`: Zustand slices for nodes, edges, scope, history, lint, and more.
- `lib/api.ts`: API client for the FastAPI backend.
- `convex/`: Convex schema, queries, and mutations.
