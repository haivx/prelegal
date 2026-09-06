# Prelegal backend

FastAPI service for the Prelegal V1 foundation. It does two things:

1. Serves the statically exported Next.js frontend (`frontend/out`) as a
   single-page app.
2. Exposes a small **fake-login** auth API under `/api` backed by a
   throwaway SQLite database that is recreated from scratch on every start.
3. Exposes `POST /api/chat` (PREL-5): a stateless AI chat turn that returns
   the assistant's reply plus the Mutual NDA fields extracted from the
   conversation so far, as Structured Outputs from `gpt-oss-120b` routed
   through OpenRouter to Cerebras. Needs `OPENROUTER_API_KEY`; without it
   the endpoint returns a 502 and the rest of the app is unaffected.

There is no real authentication or route protection yet (see PREL-4) - the
login screen exists only to bring a user "into the platform".

## Layout

| Path | Purpose |
|---|---|
| `app/main.py` | App factory, startup DB reset, static-file mounting |
| `app/config.py` | Environment-driven settings (`pydantic-settings`) |
| `app/database.py` | SQLAlchemy engine/session + `get_db` dependency |
| `app/models.py` | ORM models (`User`) |
| `app/schemas.py` | Request/response models |
| `app/security.py` | bcrypt password hashing |
| `app/routers/auth.py` | `/api/auth/*` and `/api/health` |
| `app/routers/chat.py` | `POST /api/chat` - AI chat turn (PREL-5) |
| `app/llm.py` | LiteLLM/OpenRouter/Cerebras call + structured schema |
| `tests/` | pytest suite |

## Running locally (without Docker)

```bash
cd backend
uv sync
# Build the frontend first so there is something to serve:
(cd ../frontend && npm ci && npm run build)
FRONTEND_DIST=../frontend/out uv run uvicorn app.main:app --reload --port 8000
```

Then open http://localhost:8000.

If `FRONTEND_DIST` does not exist the API still runs; `/` just returns a
placeholder message.

## Environment variables

| Name | Default | Meaning |
|---|---|---|
| `SESSION_SECRET` | dev-only fallback | Key used to sign the session cookie |
| `DATABASE_URL` | `sqlite:///./data/app.db` | SQLAlchemy URL for the throwaway DB |
| `FRONTEND_DIST` | `../frontend/out` | Directory of the built static frontend |
| `OPENROUTER_API_KEY` | _(empty)_ | Enables `POST /api/chat`; empty = 502 |

## Tests

```bash
cd backend
uv run pytest
```
