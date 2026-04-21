from datetime import datetime
from typing import Annotated, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, model_validator
from sqlalchemy.orm import Session

from app.auth_utils import hash_password
from app.config import get_settings
from app.database import get_db
from app.deps import get_current_user, require_admin
from app.models import SmtpSettings, User
from app.schemas import SmtpSettingsOut, SmtpSettingsUpdate
from app.services.default_mailing import bootstrap_default_lists
from app.services.mail import test_smtp_connection

router = APIRouter(tags=["users"])


class UserCreate(BaseModel):
    username: str = Field(min_length=1, max_length=128)
    password: str = Field(min_length=4, max_length=128)
    role: Literal["user", "admin"] = "user"


class UserAdminUpdate(BaseModel):
    role: Optional[Literal["user", "admin"]] = None
    password: Optional[str] = Field(default=None, min_length=4, max_length=128)

    @model_validator(mode="after")
    def need_one_field(self):
        if self.role is None and self.password is None:
            raise ValueError("Укажите role и/или password")
        return self


class UserAdminOut(BaseModel):
    id: int
    username: str
    role: str
    created_at: datetime

    model_config = {"from_attributes": True}


class UserOut(BaseModel):
    username: str
    role: str

    model_config = {"from_attributes": True}


@router.get("/me", response_model=UserOut)
def read_me(user: Annotated[User, Depends(get_current_user)]) -> User:
    return user


def _admin_count(db: Session) -> int:
    return db.query(User).filter(User.role == "admin").count()


def _get_or_create_smtp_settings(db: Session) -> SmtpSettings:
    row = db.query(SmtpSettings).filter(SmtpSettings.id == 1).first()
    if row:
        return row
    env = get_settings()
    row = SmtpSettings(
        id=1,
        host=env.smtp_host,
        port=env.smtp_port,
        username=env.smtp_user,
        password=env.smtp_password,
        from_email=env.smtp_from_email,
        from_name=env.smtp_from_name,
        use_tls=env.smtp_use_tls,
        use_ssl=env.smtp_use_ssl,
        allow_html_body=True,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("/admin/smtp-settings", response_model=SmtpSettingsOut)
def admin_get_smtp_settings(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_admin)],
) -> SmtpSettingsOut:
    row = _get_or_create_smtp_settings(db)
    return SmtpSettingsOut(
        host=row.host or "",
        port=row.port,
        username=row.username or "",
        has_password=bool((row.password or "").strip()),
        from_email=row.from_email or "",
        from_name=row.from_name or "",
        use_tls=bool(row.use_tls),
        use_ssl=bool(row.use_ssl),
        allow_html_body=bool(getattr(row, "allow_html_body", True)),
    )


@router.patch("/admin/smtp-settings", response_model=SmtpSettingsOut)
def admin_update_smtp_settings(
    body: SmtpSettingsUpdate,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_admin)],
) -> SmtpSettingsOut:
    row = _get_or_create_smtp_settings(db)
    row.host = body.host.strip()
    row.port = int(body.port)
    row.username = body.username.strip()
    if body.password is not None:
        # Empty string means explicit password reset.
        row.password = body.password
    row.from_email = body.from_email.strip()
    row.from_name = body.from_name.strip()
    row.use_tls = bool(body.use_tls)
    row.use_ssl = bool(body.use_ssl)
    row.allow_html_body = bool(body.allow_html_body)
    row.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(row)
    return SmtpSettingsOut(
        host=row.host or "",
        port=row.port,
        username=row.username or "",
        has_password=bool((row.password or "").strip()),
        from_email=row.from_email or "",
        from_name=row.from_name or "",
        use_tls=bool(row.use_tls),
        use_ssl=bool(row.use_ssl),
        allow_html_body=bool(getattr(row, "allow_html_body", True)),
    )


@router.post("/admin/smtp-settings/test")
def admin_test_smtp_settings(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_admin)],
) -> dict:
    row = _get_or_create_smtp_settings(db)
    host = (row.host or "").strip()
    username = (row.username or "").strip()
    from_email = (row.from_email or "").strip()
    if not host:
        raise HTTPException(status_code=400, detail="Укажите SMTP host")
    if not from_email and not username:
        raise HTTPException(
            status_code=400,
            detail="Укажите From email или Логин (SMTP user)",
        )

    settings = get_settings()
    settings.smtp_host = host
    settings.smtp_port = int(row.port)
    settings.smtp_user = username
    settings.smtp_password = row.password or ""
    settings.smtp_from_email = from_email
    settings.smtp_from_name = (row.from_name or "").strip()
    settings.smtp_use_tls = bool(row.use_tls)
    settings.smtp_use_ssl = bool(row.use_ssl)

    try:
        test_smtp_connection(settings)
        return {
            "ok": True,
            "message": (
                "SMTP проверка успешна: подключение и авторизация выполнены."
            ),
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/admin/users", response_model=list[UserAdminOut])
def admin_list_users(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_admin)],
) -> list[User]:
    return db.query(User).order_by(User.id).all()


@router.patch("/admin/users/{user_id}", response_model=UserAdminOut)
def admin_update_user(
    user_id: int,
    body: UserAdminUpdate,
    db: Annotated[Session, Depends(get_db)],
    admin: Annotated[User, Depends(require_admin)],
) -> User:
    row = db.query(User).filter(User.id == user_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    if body.role is not None and body.role != row.role:
        if row.id == admin.id and body.role == "user":
            raise HTTPException(
                status_code=400,
                detail="Нельзя снять с себя роль администратора",
            )
        if row.role == "admin" and body.role == "user" and _admin_count(db) <= 1:
            raise HTTPException(
                status_code=400,
                detail="Нельзя снять роль с последнего администратора",
            )
        row.role = body.role

    if body.password is not None:
        row.hashed_password = hash_password(body.password)

    db.commit()
    db.refresh(row)
    return row


@router.delete("/admin/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_user(
    user_id: int,
    db: Annotated[Session, Depends(get_db)],
    admin: Annotated[User, Depends(require_admin)],
) -> None:
    row = db.query(User).filter(User.id == user_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    if row.id == admin.id:
        raise HTTPException(
            status_code=400,
            detail="Нельзя удалить собственную учётную запись",
        )
    if row.role == "admin" and _admin_count(db) <= 1:
        raise HTTPException(
            status_code=400,
            detail="Нельзя удалить последнего администратора",
        )
    db.delete(row)
    db.commit()


@router.post("/admin/users", status_code=status.HTTP_201_CREATED)
def admin_create_user(
    body: UserCreate,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_admin)],
) -> dict:
    if db.query(User).filter(User.username == body.username.strip()).first():
        raise HTTPException(status_code=409, detail="Пользователь уже существует")
    row = User(
        username=body.username.strip(),
        hashed_password=hash_password(body.password),
        role=body.role,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    # Ensure default mailing list exists for every user.
    bootstrap_default_lists(db, get_settings())
    return {"id": row.id, "username": row.username, "role": row.role}
