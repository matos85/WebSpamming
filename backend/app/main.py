from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import get_settings
from app.auth_utils import hash_password
from app import database as db
from app.database import create_tables
from app.models import User
from app.routers import auth, cleanup, lists, send, users
from app.services.default_mailing import bootstrap_default_lists


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()
    settings = get_settings()
    session = db.SessionLocal()
    try:
        # Lightweight, idempotent schema upgrade for existing installations.
        session.execute(
            text(
                "ALTER TABLE smtp_settings "
                "ADD COLUMN IF NOT EXISTS allow_html_body BOOLEAN NOT NULL DEFAULT TRUE"
            )
        )
        session.execute(
            text(
                "ALTER TABLE recipients "
                "ADD COLUMN IF NOT EXISTS organization VARCHAR(255) NOT NULL DEFAULT ''"
            )
        )
        session.commit()
        if session.query(User).count() == 0:
            admin = User(
                username=settings.bootstrap_admin_username,
                hashed_password=hash_password(settings.bootstrap_admin_password),
                role="admin",
            )
            session.add(admin)
            session.commit()
        bootstrap_default_lists(session, settings)
    finally:
        session.close()
    yield


app = FastAPI(title="WebSpamming API", lifespan=lifespan)

_settings = get_settings()
if _settings.cors_allow_all:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    origins = [o.strip() for o in _settings.cors_origins.split(",") if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(lists.router)
app.include_router(send.router)
app.include_router(cleanup.router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
