#!/usr/bin/env bash
# Start Prelegal (frontend + backend + throwaway DB) in Docker on macOS.
set -euo pipefail

cd "$(dirname "$0")/.."

if ! docker info >/dev/null 2>&1; then
  echo "Docker does not appear to be running. Start Docker Desktop and retry." >&2
  exit 1
fi

docker compose up -d --build

echo
echo "Prelegal is starting at http://localhost:8000"
echo "Follow logs with:  docker compose logs -f"
command -v open >/dev/null 2>&1 && open "http://localhost:8000" || true
