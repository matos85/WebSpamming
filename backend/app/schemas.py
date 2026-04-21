from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class MailingListCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class MailingListUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class MailingListOut(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


class RecipientCreate(BaseModel):
    organization: str = Field(default="", max_length=255)
    email: EmailStr


class RecipientUpdate(BaseModel):
    organization: str = Field(default="", max_length=255)
    email: EmailStr


class RecipientOut(BaseModel):
    id: int
    organization: str
    email: str

    model_config = {"from_attributes": True}


class SendMailingBody(BaseModel):
    mailing_list_id: int
    subject: str = Field(min_length=1, max_length=998)
    body_text: Optional[str] = None
    body_html: Optional[str] = None
    from_email: Optional[EmailStr] = None
    from_name: Optional[str] = Field(default=None, max_length=255)


class CleanupUserBody(BaseModel):
    """Действия очистки для текущего пользователя."""

    action: str = Field(
        description="lists | send_history | all_my_data",
    )


class CleanupAdminBody(BaseModel):
    """Действия очистки для администратора."""

    action: str = Field(
        description="global_mailing_data | non_admin_users | global_send_logs_only",
    )
    confirm: Optional[str] = Field(
        default=None,
        description='Для global_mailing_data и non_admin_users передайте "DELETE"',
    )


class SmtpSettingsOut(BaseModel):
    host: str
    port: int
    username: str
    has_password: bool
    from_email: str
    from_name: str
    use_tls: bool
    use_ssl: bool
    allow_html_body: bool


class SmtpSettingsUpdate(BaseModel):
    host: str = Field(default="", max_length=255)
    port: int = Field(default=587, ge=1, le=65535)
    username: str = Field(default="", max_length=255)
    password: Optional[str] = Field(
        default=None,
        description="Оставьте null/пусто, чтобы не менять пароль",
    )
    from_email: str = Field(default="", max_length=320)
    from_name: str = Field(default="", max_length=255)
    use_tls: bool = True
    use_ssl: bool = False
    allow_html_body: bool = True
