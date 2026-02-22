# PreFlight — VS Code Extension

Shift-left cost intelligence directly in your editor. Uses Tree-sitter for AST parsing and Gemini AI to classify and price resource usage.

## Setup

1. `npm install`
2. `cp .env.example .env` (add your `GEMINI_API_KEY`)
3. `npm run compile`
4. Press `F5` to launch the extension host.

## How It Works

- **Parser** (`src/parser.ts`, `src/ast_parser.ts`): Extracts functions and calls using AST analysis.
- **Classifier** (`src/intelligence.ts`): Sends code batches to Gemini to tag paid providers (OpenAI, Stripe, etc).
- **CodeLens** (`src/codelens_provider.ts`): Inline price annotations above expensive code.
- **Sidebar** (`src/treeview_provider.ts`): Total cost dashboard and scale projections.

## Commands

- `PreFlight: Refresh Cost Analysis` — Re-scans the workspace.
- `PreFlight: Update User Count` — Changes the projection scale.

## Testing

Check `test_files/` for sample files. Run `npm run watch` during development.
