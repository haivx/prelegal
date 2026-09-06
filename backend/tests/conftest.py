import os
from pathlib import Path

# Point the app at a throwaway in-memory DB before anything imports it.
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("SESSION_SECRET", "test-secret")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402


@pytest.fixture
def client(tmp_path: Path):
    """Fresh app + empty database per test.

    Entering the ``TestClient`` context runs the app's startup hook, which
    drops and recreates every table (PREL-4's from-scratch DB).
    """
    from app.main import app

    with TestClient(app) as c:
        yield c


@pytest.fixture
def frontend_dist(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """A minimal built-frontend directory for static-serving tests."""
    dist = tmp_path / "out"
    (dist / "_next" / "static").mkdir(parents=True)
    (dist / "index.html").write_text("<!doctype html><title>SPA root</title>")
    (dist / "login.html").write_text("<!doctype html><title>Login</title>")
    (dist / "_next" / "static" / "app.js").write_text("console.log('app')")

    from app.config import get_settings

    monkeypatch.setenv("FRONTEND_DIST", str(dist))
    get_settings.cache_clear()
    yield dist
    get_settings.cache_clear()
