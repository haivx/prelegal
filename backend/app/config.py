from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/  (this file is backend/app/config.py)
BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """Runtime configuration, overridable via environment variables."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Key used to sign the session cookie. The default is fine for local dev
    # only; Docker/compose passes a real value.
    session_secret: str = "insecure-dev-session-secret-change-me"

    # SQLAlchemy URL for the throwaway database. Relative sqlite paths are
    # resolved against the backend directory so the CWD does not matter.
    database_url: str = "sqlite:///./data/app.db"

    # Directory holding the statically exported frontend (Next.js `out/`).
    frontend_dist: Path = BACKEND_DIR.parent / "frontend" / "out"

    # OpenRouter key for the AI chat (PREL-5). Empty means the chat endpoint
    # is unavailable and returns a 502.
    openrouter_api_key: str = ""

    def resolved_database_url(self) -> str:
        prefix = "sqlite:///"
        if self.database_url.startswith(prefix):
            raw = self.database_url[len(prefix):]
            if raw != ":memory:" and not Path(raw).is_absolute():
                return prefix + str((BACKEND_DIR / raw).resolve())
        return self.database_url


@lru_cache
def get_settings() -> Settings:
    return Settings()
