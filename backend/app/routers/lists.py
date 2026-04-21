from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import MailingList, Recipient, User
from app.schemas import (
    MailingListCreate,
    MailingListOut,
    MailingListUpdate,
    RecipientCreate,
    RecipientOut,
    RecipientUpdate,
)

router = APIRouter(prefix="/mailing-lists", tags=["mailing-lists"])


@router.get("", response_model=list[MailingListOut])
def list_mailing_lists(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> list[MailingList]:
    return (
        db.query(MailingList)
        .filter(MailingList.user_id == user.id)
        .order_by(MailingList.id)
        .all()
    )


@router.post("", response_model=MailingListOut, status_code=status.HTTP_201_CREATED)
def create_mailing_list(
    body: MailingListCreate,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> MailingList:
    row = MailingList(user_id=user.id, name=body.name.strip())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/{list_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_mailing_list(
    list_id: int,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> None:
    row = (
        db.query(MailingList)
        .filter(MailingList.id == list_id, MailingList.user_id == user.id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Список не найден")
    db.delete(row)
    db.commit()


@router.patch("/{list_id}", response_model=MailingListOut)
def update_mailing_list(
    list_id: int,
    body: MailingListUpdate,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> MailingList:
    row = (
        db.query(MailingList)
        .filter(MailingList.id == list_id, MailingList.user_id == user.id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Список не найден")
    row.name = body.name.strip()
    db.commit()
    db.refresh(row)
    return row


@router.get("/{list_id}/recipients", response_model=list[RecipientOut])
def list_recipients(
    list_id: int,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> list[Recipient]:
    lst = (
        db.query(MailingList)
        .filter(MailingList.id == list_id, MailingList.user_id == user.id)
        .first()
    )
    if not lst:
        raise HTTPException(status_code=404, detail="Список не найден")
    return (
        db.query(Recipient)
        .filter(Recipient.mailing_list_id == list_id)
        .order_by(Recipient.id)
        .all()
    )


@router.post(
    "/{list_id}/recipients",
    response_model=RecipientOut,
    status_code=status.HTTP_201_CREATED,
)
def add_recipient(
    list_id: int,
    body: RecipientCreate,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> Recipient:
    lst = (
        db.query(MailingList)
        .filter(MailingList.id == list_id, MailingList.user_id == user.id)
        .first()
    )
    if not lst:
        raise HTTPException(status_code=404, detail="Список не найден")
    email = str(body.email).lower().strip()
    organization = body.organization.strip()
    row = Recipient(
        mailing_list_id=list_id,
        organization=organization,
        email=email,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.patch(
    "/{list_id}/recipients/{recipient_id}",
    response_model=RecipientOut,
)
def update_recipient(
    list_id: int,
    recipient_id: int,
    body: RecipientUpdate,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> Recipient:
    lst = (
        db.query(MailingList)
        .filter(MailingList.id == list_id, MailingList.user_id == user.id)
        .first()
    )
    if not lst:
        raise HTTPException(status_code=404, detail="Список не найден")
    row = (
        db.query(Recipient)
        .filter(
            Recipient.id == recipient_id,
            Recipient.mailing_list_id == list_id,
        )
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Адрес не найден")
    email = str(body.email).lower().strip()
    dup = (
        db.query(Recipient)
        .filter(
            Recipient.mailing_list_id == list_id,
            Recipient.email == email,
            Recipient.id != recipient_id,
        )
        .first()
    )
    if dup:
        raise HTTPException(
            status_code=409,
            detail="Такой адрес уже есть в этом списке",
        )
    row.email = email
    row.organization = body.organization.strip()
    db.commit()
    db.refresh(row)
    return row


@router.delete(
    "/{list_id}/recipients/{recipient_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_recipient(
    list_id: int,
    recipient_id: int,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> None:
    lst = (
        db.query(MailingList)
        .filter(MailingList.id == list_id, MailingList.user_id == user.id)
        .first()
    )
    if not lst:
        raise HTTPException(status_code=404, detail="Список не найден")
    row = (
        db.query(Recipient)
        .filter(
            Recipient.id == recipient_id,
            Recipient.mailing_list_id == list_id,
        )
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Адрес не найден")
    db.delete(row)
    db.commit()
