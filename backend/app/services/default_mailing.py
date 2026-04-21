import re
from pathlib import Path

from sqlalchemy.orm import Session

from app.config import Settings
from app.models import MailingList, Recipient, User

EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$")


def _read_pairs_from_dirs(source_dir: str) -> dict[str, str]:
    path = Path(source_dir)
    if not path.exists() or not path.is_dir():
        return {}
    pairs: dict[str, str] = {}
    for child in path.iterdir():
        if not child.is_dir():
            continue
        email = child.name.strip().lower()
        if EMAIL_RE.match(email):
            pairs[email] = ""
    return pairs


def _read_pairs_from_file(source_file: str) -> dict[str, str]:
    path = Path(source_file)
    if not path.exists() or not path.is_file():
        return {}
    pairs: dict[str, str] = {}
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line:
            continue
        if "|" in line:
            org, email = [part.strip() for part in line.split("|", 1)]
        else:
            org, email = "", line
        email = email.lower()
        if EMAIL_RE.match(email):
            pairs[email] = org
    return pairs


def _ensure_default_list_for_user(
    db: Session,
    user_id: int,
    list_name: str,
    recipients_by_email: dict[str, str],
) -> tuple[bool, int]:
    row = (
        db.query(MailingList)
        .filter(MailingList.user_id == user_id, MailingList.name == list_name)
        .first()
    )
    created = False
    if row is None:
        row = MailingList(user_id=user_id, name=list_name)
        db.add(row)
        db.flush()
        created = True

    existing_rows = db.query(Recipient).filter(Recipient.mailing_list_id == row.id).all()
    existing = {r.email.lower().strip(): r for r in existing_rows}
    added = 0
    for email, organization in recipients_by_email.items():
        current = existing.get(email)
        if current is None:
            db.add(
                Recipient(
                    mailing_list_id=row.id,
                    organization=organization,
                    email=email,
                )
            )
            added += 1
            continue
        if not (current.organization or "").strip() and organization:
            current.organization = organization
    return created, added


def bootstrap_default_lists(db: Session, settings: Settings) -> dict:
    if not settings.default_mailing_bootstrap_enabled:
        return {"enabled": False, "created_lists": 0, "added_recipients": 0}

    recipients_by_email = _read_pairs_from_dirs(settings.default_mailing_source_dir)
    recipients_by_email.update(
        _read_pairs_from_file(settings.default_mailing_source_file)
    )
    users = db.query(User).order_by(User.id).all()

    created_lists = 0
    added_recipients = 0
    for user in users:
        created, added = _ensure_default_list_for_user(
            db,
            user.id,
            settings.default_mailing_list_name.strip() or "По умолчанию",
            recipients_by_email,
        )
        if created:
            created_lists += 1
        added_recipients += added
    db.commit()
    return {
        "enabled": True,
        "created_lists": created_lists,
        "added_recipients": added_recipients,
        "emails_source_count": len(recipients_by_email),
    }
