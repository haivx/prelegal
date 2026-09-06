#!/usr/bin/env bash
# Start Prelegal (frontend + backend + throwaway DB) in Docker on Linux.
set -euo pipefail

cd "$(dirname "$0")/.."

if ! docker info >/dev/null 2>&1; then
  echo "Cannot talk to the Docker daemon. Is it running / are you in the docker group?" >&2
  exit 1
fi

docker compose up -d --build

echo
echo "Prelegal is starting at http://localhost:8000"
echo "Follow logs with:  docker compose logs -f"
command -v xdg-open >/dev/null 2>&1 && xdg-open "http://localhost:8000" >/dev/null 2>&1 || true
