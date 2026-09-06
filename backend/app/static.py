"""Serve the statically exported Next.js frontend as a single-page app.

Next's `output: 'export'` writes `out/index.html`, `out/login.html`, hashed
assets under `out/_next/`, etc. We serve real files when they exist, map
extensionless routes to their `.html` sibling, and fall back to
`index.html` so client-side routes still resolve on a hard refresh.
"""

from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, PlainTextResponse

from app.config import get_settings

_CACHE_FOREVER = "public, max-age=31536000, immutable"


def _safe_join(root: Path, relative: str) -> Path | None:
    candidate = (root / relative).resolve()
    if root == candidate or root in candidate.parents:
        return candidate
    return None  # path traversal attempt


def mount_frontend(app: FastAPI) -> None:
    @app.get("/{full_path:path}", include_in_schema=False, response_model=None)
    def serve_spa(full_path: str, request: Request) -> FileResponse | PlainTextResponse:
        # Unknown API paths must 404 as JSON, not silently return the SPA.
        if full_path == "api" or full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not found")

        dist = get_settings().frontend_dist.resolve()
        if not dist.is_dir():
            return PlainTextResponse(
                "Frontend build not found. Run `npm run build` in frontend/ "
                "(or set FRONTEND_DIST).",
                status_code=503,
            )

        index = dist / "index.html"
        if not full_path:
            return FileResponse(index)

        target = _safe_join(dist, full_path)
        if target is None:
            raise HTTPException(status_code=404, detail="Not found")

        for path in (target, target.with_suffix(".html"), target / "index.html"):
            if path.is_file():
                headers = (
                    {"Cache-Control": _CACHE_FOREVER}
                    if "_next/static" in path.as_posix()
                    else None
                )
                return FileResponse(path, headers=headers)

        # Client-side route - let the SPA render it.
        return FileResponse(index)
