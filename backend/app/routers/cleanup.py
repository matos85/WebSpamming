from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_admin
from app.models import MailingList, Recipient, SendJob, SendLog, User
from app.schemas import CleanupAdminBody, CleanupUserBody

router = APIRouter(prefix="/cleanup", tags=["cleanup"])


@router.post("/me")
def cleanup_my_data(
    body: CleanupUserBody,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    action = body.action.strip().lower()
    deleted: dict[str, int] = {}

    if action == "lists":
        q = db.query(MailingList).filter(MailingList.user_id == user.id)
        deleted["mailing_lists"] = q.delete(synchronize_session=False)
        db.commit()
        return {"ok": True, "deleted": deleted}

    if action == "send_history":
        q = db.query(SendJob).filter(SendJob.user_id == user.id)
        deleted["send_jobs"] = q.delete(synchronize_session=False)
        db.commit()
        return {"ok": True, "deleted": deleted}

    if action == "all_my_data":
        db.query(SendJob).filter(SendJob.user_id == user.id).delete(
            synchronize_session=False
        )
        db.query(MailingList).filter(MailingList.user_id == user.id).delete(
            synchronize_session=False
        )
        db.commit()
        return {"ok": True, "deleted": {"send_jobs_and_lists": -1}}

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Неизвестное action: используйте lists | send_history | all_my_data",
    )


@router.post("/admin")
def cleanup_admin(
    body: CleanupAdminBody,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_admin)],
) -> dict:
    action = body.action.strip().lower()

    if action == "global_mailing_data":
        if body.confirm != "DELETE":
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                detail='Подтвердите: передайте "confirm": "DELETE"',
            )
        db.query(SendLog).delete(synchronize_session=False)
        db.query(SendJob).delete(synchronize_session=False)
        db.query(Recipient).delete(synchronize_session=False)
        db.query(MailingList).delete(synchronize_session=False)
        db.commit()
        return {"ok": True, "cleared": "lists_recipients_jobs_logs"}

    if action == "global_send_logs_only":
        n = db.query(SendLog).delete(synchronize_session=False)
        db.commit()
        return {"ok": True, "deleted_send_logs": n}

    if action == "non_admin_users":
        if body.confirm != "DELETE":
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                detail='Подтвердите: передайте "confirm": "DELETE"',
            )
        n = db.query(User).filter(User.role != "admin").delete(
            synchronize_session=False
        )
        db.commit()
        return {"ok": True, "deleted_users": n}

    raise HTTPException(
        status.HTTP_400_BAD_REQUEST,
        detail="Неизвестное action: global_mailing_data | global_send_logs_only | non_admin_users",
    )
