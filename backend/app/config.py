from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=None, extra="ignore")

    database_url: str = "postgresql+psycopg2://webspam:webspam@localhost:5432/webspam"
    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7

    bootstrap_admin_username: str = "admin"
    bootstrap_admin_password: str = "admin"

    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from_email: str = ""
    smtp_from_name: str = ""
    smtp_use_tls: bool = True
    # true = порт 465, SSL с начала соединения (без STARTTLS)
    smtp_use_ssl: bool = False
    default_mailing_bootstrap_enabled: bool = True
    default_mailing_list_name: str = "По умолчанию"
    default_mailing_source_dir: str = "/data/default-email"
    default_mailing_source_file: str = "/data/default-email/organizations_emails.txt"

    cors_allow_all: bool = False
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    @field_validator(
        "cors_allow_all",
        "smtp_use_tls",
        "smtp_use_ssl",
        "default_mailing_bootstrap_enabled",
        mode="before",
    )
    @classmethod
    def parse_bool(cls, v):
        if isinstance(v, str):
            return v.lower() in ("1", "true", "yes", "on")
        return v


@lru_cache
def get_settings() -> Settings:
    return Settings()


def clear_settings_cache() -> None:
    get_settings.cache_clear()
