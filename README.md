# prelegal

## Status: 🚧 In Progress

This project is under active development. It is expected to be completed by
**September 12, 2026**.

Prelegal is a SaaS product for drafting legal agreements from templates. A user
describes what they need in a **freeform chat with an AI**, which picks the right
document, guides them through the details question by question, and fills in a
live preview they can download as a PDF.

The current feature set:

- **AI drafting chat** — the assistant lists the available agreements, asks
  follow-up questions (with worked examples) until it has the core details, and
  extracts them into the document. Ask for something we don't have a template
  for and it says so and points you to the closest fit.
- **All 12 Common Paper templates** — Mutual NDA, Cloud Service Agreement, DPA,
  Professional Services Agreement, and the rest of `catalog.json`, rendered
  generically from the markdown in `templates/`.
- **Live preview → PDF** — the chosen template renders as the chat progresses,
  with filled values highlighted and unfilled ones bracketed. "Download PDF"
  enables once the core fields are in.
- **V1 platform shell** — FastAPI backend, a statically-exported Next.js
  frontend served from the same origin, a throwaway SQLite database, and a fake
  login screen (no real authentication yet).

## AI configuration

The chat calls `openai/gpt-oss-120b` through LiteLLM → OpenRouter with Cerebras
as the inference provider. Set `OPENROUTER_API_KEY` (copy `.env.example` to
`.env` and fill it in). Without a key the `/api/chat` endpoint returns HTTP 502
and the rest of the app still runs.

## Running the app

The whole app is packaged into a single Docker container that serves the
statically built frontend and the API from http://localhost:8000.

```bash
# macOS
scripts/start-mac.sh
scripts/stop-mac.sh

# Linux
scripts/start-linux.sh
scripts/stop-linux.sh

# Windows (PowerShell)
scripts/start-windows.ps1
scripts/stop-windows.ps1
```

The start scripts build the frontend, build the image, and run
`docker compose up -d`. Compose picks up `OPENROUTER_API_KEY` and
`SESSION_SECRET` from your shell or a repo-root `.env`. The SQLite database is
**not** persisted - every start comes up with an empty `users` table. Sign up
with any email and password (min 8 chars) to enter the platform; there is no
real authentication yet.

## Layout

| Path | What it is |
|---|---|
| `frontend/` | Next.js 16 app (static export): the drafting chat, live preview, and `/login` screen. See `frontend/README` / `frontend/TESTING.md`. |
| `backend/` | `uv` + FastAPI. Serves `frontend/out` and the `/api/*` API - fake-login auth, the AI chat (`/api/chat`), and the document catalog (`/api/documents`). See `backend/README.md`. |
| `templates/` | The 12 Common Paper agreement templates (markdown with fill-in placeholders). |
| `catalog.json` | Catalogue of available documents (name, description, template file). |
| `scripts/` | Cross-platform start/stop wrappers around `docker compose`. |
| `Dockerfile`, `docker-compose.yml` | Multi-stage build (node → python) + one-service compose file. |

## Local development without Docker

```bash
# Backend (terminal 1)
cd backend && uv sync
OPENROUTER_API_KEY=... FRONTEND_DIST=../frontend/out \
  uv run uvicorn app.main:app --reload --port 8000

# Frontend build it serves (terminal 2, re-run on change)
cd frontend && npm ci && npm run build
```

## Tests

```bash
cd backend  && uv run pytest
cd frontend && npm run lint && npm run test:run && npm run build && npm run test:e2e
```

## Roadmap

- [x] Define project scope and requirements
- [x] Initial implementation (NDA creator prototype)
- [x] V1 foundation: backend, DB, containerisation, login shell
- [x] AI chat to drive document drafting
- [x] All catalog document types
- [ ] Real authentication
- [ ] Setup & usage documentation
