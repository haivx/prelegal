# Start Prelegal (frontend + backend + throwaway DB) in Docker on Windows.
$ErrorActionPreference = "Stop"

Set-Location (Join-Path $PSScriptRoot "..")

try {
    docker info | Out-Null
} catch {
    Write-Error "Docker does not appear to be running. Start Docker Desktop and retry."
    exit 1
}

docker compose up -d --build

Write-Host ""
Write-Host "Prelegal is starting at http://localhost:8000"
Write-Host "Follow logs with:  docker compose logs -f"
Start-Process "http://localhost:8000"
