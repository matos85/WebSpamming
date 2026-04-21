from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.config import get_settings


class Base(DeclarativeBase):
    pass


def _engine():
    settings = get_settings()
    return create_engine(
        settings.database_url,
        pool_pre_ping=True,
    )


engine = None
SessionLocal = None


def init_engine() -> None:
    global engine, SessionLocal
    if engine is None:
        engine = _engine()
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    init_engine()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables() -> None:
    init_engine()
    from app import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
