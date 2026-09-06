# Stop Prelegal and remove its container. The SQLite DB is not persisted,
# so the next start comes up empty.
$ErrorActionPreference = "Stop"

Set-Location (Join-Path $PSScriptRoot "..")

docker compose down

Write-Host "Prelegal stopped."
