from collections.abc import Iterator
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import get_settings


class Base(DeclarativeBase):
    pass


def _make_engine():
    url = get_settings().resolved_database_url()
    if not url.startswith("sqlite"):
        return create_engine(url, future=True)

    # FastAPI dependencies may hand a session to a different thread than the
    # one that created the engine.
    kwargs: dict = {"connect_args": {"check_same_thread": False}, "future": True}
    path = url.removeprefix("sqlite:///")
    if path in (":memory:", ""):
        # A bare in-memory DB is per-connection; pin one shared connection so
        # the schema created at startup is visible to every request.
        kwargs["poolclass"] = StaticPool
    else:
        Path(path).parent.mkdir(parents=True, exist_ok=True)
    return create_engine(url, **kwargs)


engine = _make_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def reset_database() -> None:
    """Drop and recreate every table.

    Called on application startup so each run (and each fresh Docker
    container) begins with an empty database, per PREL-4.
    """
    # Import models so they are registered on Base.metadata before create_all.
    from app import models  # noqa: F401

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
