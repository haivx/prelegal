# prelegal

## Status: 🚧 In Progress

This project is under active development. It is expected to be completed by **September 12, 2026** (approximately 1 week from now).

Prelegal is a SaaS product for drafting legal agreements from templates. This
repository currently contains the **V1 technical foundation**: a Next.js
frontend, a FastAPI backend, a throwaway SQLite database, and a fake login
screen. The only product feature so far is the frontend-only Mutual NDA
creator (form → live preview → PDF download).

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
`docker compose up -d`. The SQLite database is **not** persisted - every
start comes up with an empty `users` table. Sign up with any email and
password (min 8 chars) to enter the platform; there is no real
authentication yet.

## Layout

| Path | What it is |
|---|---|
| `frontend/` | Next.js 16 app (static export). NDA creator + `/login` screen. See `frontend/README` / `frontend/TESTING.md`. |
| `backend/` | `uv` + FastAPI. Serves `frontend/out` and the `/api/auth/*` fake-login API. See `backend/README.md`. |
| `templates/` | Common Paper legal agreement templates. |
| `catalog.json` | Catalogue of available documents. |
| `scripts/` | Cross-platform start/stop wrappers around `docker compose`. |
| `Dockerfile`, `docker-compose.yml` | Multi-stage build (node → python) + one-service compose file. |

## Local development without Docker

```bash
# Backend (terminal 1)
cd backend && uv sync
FRONTEND_DIST=../frontend/out uv run uvicorn app.main:app --reload --port 8000

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
- [ ] AI chat to drive document drafting
- [ ] Remaining document types
- [ ] Real authentication
- [ ] Setup & usage documentation
