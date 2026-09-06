# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Stage 1 - build the frontend into a static bundle (frontend/out)
# ---------------------------------------------------------------------------
FROM node:24-alpine AS frontend
WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ---------------------------------------------------------------------------
# Stage 2 - Python runtime that serves the API and the static bundle
# ---------------------------------------------------------------------------
FROM python:3.12-slim AS runtime

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never \
    PYTHONUNBUFFERED=1

WORKDIR /app/backend

# Install dependencies first for better layer caching.
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY backend/ ./
# The default config resolves the frontend to ../frontend/out relative to
# the backend directory, i.e. /app/frontend/out.
COPY --from=frontend /app/frontend/out /app/frontend/out

EXPOSE 8000

# The database lives under /app/backend/data and is recreated from scratch
# on every startup (see app/main.py lifespan).
CMD ["uv", "run", "--no-dev", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
