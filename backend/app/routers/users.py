import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.deps import get_current_user
from app.models import Review, Submission, Task, User, Wallet, WalletTransaction
from app.schemas import ProfileOut, ReviewOut, UserOut, UserUpdate

router = APIRouter(prefix="/api/users", tags=["users"])


@router.patch("/me", response_model=UserOut)
def update_me(
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> User:
    if payload.display_name is not None:
        current_user.display_name = payload.display_name
    if payload.bio is not None:
        current_user.bio = payload.bio
    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/{user_id}", response_model=ProfileOut)
def get_profile(user_id: uuid.UUID, db: Session = Depends(get_db)) -> ProfileOut:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    tasks_posted = db.scalar(
        select(func.count()).select_from(Task).where(Task.poster_id == user_id)
    ) or 0
    tasks_completed = db.scalar(
        select(func.count())
        .select_from(Submission)
        .where(Submission.worker_id == user_id, Submission.status == "completed")
    ) or 0
    total_earned_cents = db.scalar(
        select(func.coalesce(func.sum(WalletTransaction.amount_cents), 0))
        .select_from(WalletTransaction)
        .join(Wallet, Wallet.id == WalletTransaction.wallet_id)
        .where(Wallet.user_id == user_id, WalletTransaction.type == "payout")
    ) or 0
    avg_rating = db.scalar(
        select(func.avg(Review.rating)).where(Review.reviewee_id == user_id)
    )
    review_count = db.scalar(
        select(func.count()).select_from(Review).where(Review.reviewee_id == user_id)
    ) or 0

    return ProfileOut(
        id=user.id,
        display_name=user.display_name,
        bio=user.bio,
        created_at=user.created_at,
        tasks_posted=tasks_posted,
        tasks_completed=tasks_completed,
        total_earned_cents=int(total_earned_cents),
        avg_rating=round(float(avg_rating), 2) if avg_rating is not None else None,
        review_count=review_count,
    )


@router.get("/{user_id}/reviews", response_model=list[ReviewOut])
def list_reviews(user_id: uuid.UUID, db: Session = Depends(get_db)) -> list[Review]:
    stmt = (
        select(Review)
        .options(joinedload(Review.reviewer))
        .where(Review.reviewee_id == user_id)
        .order_by(Review.created_at.desc())
    )
    return list(db.scalars(stmt))
