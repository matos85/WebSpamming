from __future__ import annotations

import smtplib
from datetime import datetime, timezone
from typing import Optional
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config import Settings


def _smtp_mode_label(settings: Settings) -> str:
    return "STARTTLS" if settings.smtp_use_tls and not settings.smtp_use_ssl else "off"


def test_smtp_connection(settings: Settings) -> None:
    try:
        if settings.smtp_use_ssl:
            with smtplib.SMTP_SSL(
                settings.smtp_host, settings.smtp_port, timeout=30
            ) as smtp:
                smtp.ehlo()
                if settings.smtp_user:
                    smtp.login(settings.smtp_user, settings.smtp_password)
        else:
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=30) as smtp:
                smtp.ehlo()
                if settings.smtp_use_tls:
                    smtp.starttls()
                    smtp.ehlo()
                if settings.smtp_user:
                    smtp.login(settings.smtp_user, settings.smtp_password)
    except smtplib.SMTPException as e:
        raise RuntimeError(
            f"SMTP ({settings.smtp_host}:{settings.smtp_port}, "
            f"TLS={_smtp_mode_label(settings)}, SSL={settings.smtp_use_ssl}): {e}"
        ) from e
    except OSError as e:
        raise RuntimeError(
            f"Сеть/SMTP {settings.smtp_host}:{settings.smtp_port}: {e}. "
            "Проверьте хост, порт, фаервол."
        ) from e


def send_single_message(
    settings: Settings,
    to_email: str,
    subject: str,
    body_text: Optional[str],
    body_html: Optional[str],
) -> None:
    from_addr = (settings.smtp_from_email or settings.smtp_user or "").strip()
    if not from_addr:
        raise ValueError(
            "Не задан отправитель: укажите SMTP_FROM_EMAIL или SMTP_USER в secrets/backend.env"
        )

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    name = (settings.smtp_from_name or "").strip()
    msg["From"] = f"{name} <{from_addr}>" if name else from_addr
    msg["To"] = to_email

    if body_text:
        msg.attach(MIMEText(body_text, "plain", "utf-8"))
    if body_html:
        msg.attach(MIMEText(body_html, "html", "utf-8"))
    if not body_text and not body_html:
        msg.attach(MIMEText("", "plain", "utf-8"))

    raw = msg.as_string()

    try:
        if settings.smtp_use_ssl:
            with smtplib.SMTP_SSL(
                settings.smtp_host, settings.smtp_port, timeout=120
            ) as smtp:
                if settings.smtp_user:
                    smtp.login(settings.smtp_user, settings.smtp_password)
                smtp.sendmail(from_addr, [to_email], raw)
        else:
            with smtplib.SMTP(
                settings.smtp_host, settings.smtp_port, timeout=120
            ) as smtp:
                smtp.ehlo()
                if settings.smtp_use_tls:
                    smtp.starttls()
                    smtp.ehlo()
                if settings.smtp_user:
                    smtp.login(settings.smtp_user, settings.smtp_password)
                smtp.sendmail(from_addr, [to_email], raw)
    except smtplib.SMTPException as e:
        raise RuntimeError(
            f"SMTP ({settings.smtp_host}:{settings.smtp_port}, "
            f"TLS={_smtp_mode_label(settings)}, "
            f"SSL={settings.smtp_use_ssl}): {e}"
        ) from e
    except OSError as e:
        raise RuntimeError(
            f"Сеть/SMTP {settings.smtp_host}:{settings.smtp_port}: {e}. "
            "Проверьте хост, порт, фаервол. Для порта 465 попробуйте SMTP_USE_SSL=true."
        ) from e


def utcnow() -> datetime:
    return datetime.now(timezone.utc)
