import logging
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.database import get_db
from app.deps import get_current_user
from app.models import MailingList, Recipient, SendJob, SendLog, SmtpSettings, User
from app.schemas import SendMailingBody
from app.services.mail import send_single_message, utcnow

router = APIRouter(prefix="/mailing", tags=["mailing"])
logger = logging.getLogger(__name__)


@router.get("/options")
def mailing_options(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
) -> dict:
    smtp_row = db.query(SmtpSettings).filter(SmtpSettings.id == 1).first()
    return {"allow_html_body": bool(getattr(smtp_row, "allow_html_body", True))}


@router.post("/send", status_code=status.HTTP_201_CREATED)
def send_to_list(
    body: SendMailingBody,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    env_settings = get_settings()
    smtp_row = db.query(SmtpSettings).filter(SmtpSettings.id == 1).first()
    settings = Settings.model_validate(env_settings.model_dump())
    if smtp_row:
        settings.smtp_host = (smtp_row.host or "").strip()
        settings.smtp_port = int(smtp_row.port)
        settings.smtp_user = (smtp_row.username or "").strip()
        settings.smtp_password = smtp_row.password or ""
        settings.smtp_from_email = (smtp_row.from_email or "").strip()
        settings.smtp_from_name = (smtp_row.from_name or "").strip()
        settings.smtp_use_tls = bool(smtp_row.use_tls)
        settings.smtp_use_ssl = bool(smtp_row.use_ssl)

    if body.from_email is not None:
        settings.smtp_from_email = str(body.from_email).strip()
    if body.from_name is not None:
        settings.smtp_from_name = body.from_name.strip()

    if not settings.smtp_host:
        raise HTTPException(
            status_code=503,
            detail="SMTP не настроен. Заполните настройки в админке.",
        )
    from_preview = (settings.smtp_from_email or settings.smtp_user or "").strip()
    if not from_preview:
        raise HTTPException(
            status_code=503,
            detail="Задайте From Email или Username в настройках SMTP (админка).",
        )

    lst = (
        db.query(MailingList)
        .filter(MailingList.id == body.mailing_list_id, MailingList.user_id == user.id)
        .first()
    )
    if not lst:
        raise HTTPException(status_code=404, detail="Список не найден")

    if not body.body_text and not body.body_html:
        raise HTTPException(
            status_code=400,
            detail="Нужен body_text и/или body_html",
        )
    if (
        body.body_html
        and smtp_row is not None
        and not bool(getattr(smtp_row, "allow_html_body", True))
    ):
        raise HTTPException(
            status_code=400,
            detail="HTML-рассылка отключена администратором",
        )

    emails = [
        r.email
        for r in db.query(Recipient)
        .filter(Recipient.mailing_list_id == lst.id)
        .order_by(Recipient.id)
        .all()
    ]
    if not emails:
        raise HTTPException(status_code=400, detail="В списке нет адресов")

    job = SendJob(
        user_id=user.id,
        subject=body.subject.strip(),
        body_text=body.body_text,
        body_html=body.body_html,
    )
    db.add(job)
    db.flush()

    for addr in emails:
        db.add(
            SendLog(
                job_id=job.id,
                to_email=addr,
                status="pending",
            )
        )
    db.commit()
    db.refresh(job)

    logs = (
        db.query(SendLog)
        .filter(SendLog.job_id == job.id)
        .order_by(SendLog.id)
        .all()
    )
    sent = 0
    failed = 0
    results: list[dict[str, Any]] = []
    for send_log in logs:
        try:
            send_single_message(
                settings,
                send_log.to_email,
                job.subject,
                job.body_text,
                job.body_html,
            )
            send_log.status = "sent"
            send_log.sent_at = utcnow()
            send_log.error_message = None
            sent += 1
            results.append(
                {"to_email": send_log.to_email, "status": "sent", "error": None}
            )
        except Exception as e:
            send_log.status = "failed"
            send_log.error_message = str(e)[:4000]
            failed += 1
            logger.warning(
                "mailing job_id=%s to=%s failed: %s",
                job.id,
                send_log.to_email,
                send_log.error_message,
            )
            results.append(
                {
                    "to_email": send_log.to_email,
                    "status": "failed",
                    "error": send_log.error_message,
                }
            )
        db.commit()

    return {
        "job_id": job.id,
        "recipients": len(emails),
        "sent": sent,
        "failed": failed,
        "results": results,
    }
