#!/usr/bin/env bash
# Stop Prelegal and remove its container. The SQLite DB is not persisted,
# so the next start comes up empty.
set -euo pipefail

cd "$(dirname "$0")/.."

docker compose down

echo "Prelegal stopped."
