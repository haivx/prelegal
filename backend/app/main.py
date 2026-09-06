from contextlib import asynccontextmanager

from fastapi import FastAPI
from starlette.middleware.sessions import SessionMiddleware

from app.config import get_settings
from app.database import reset_database
from app.routers import auth, chat, documents
from app.static import mount_frontend


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Recreate the throwaway database on every startup (PREL-4).
    reset_database()
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Prelegal", lifespan=lifespan)

    app.add_middleware(
        SessionMiddleware,
        secret_key=settings.session_secret,
        same_site="lax",
        https_only=False,
    )

    app.include_router(auth.router)
    app.include_router(chat.router)
    app.include_router(documents.router)
    # Catch-all static handler - must be registered last.
    mount_frontend(app)
    return app


app = create_app()
