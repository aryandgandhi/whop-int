import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app import services
from app.database import get_db
from app.deps import get_current_user
from app.models import Review, Submission, Task, User
from app.schemas import (
    ReviewCreate,
    ReviewOut,
    SubmissionOut,
    SubmissionWithTaskOut,
    SubmitWorkCreate,
    VolunteerCreate,
)

router = APIRouter(prefix="/api", tags=["submissions"])


def _load_submission(db: Session, submission_id: uuid.UUID) -> Submission:
    submission = db.get(Submission, submission_id)
    if submission is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
    return submission


def _require_poster(submission: Submission, user: User) -> Task:
    task = submission.task
    if task.poster_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Only the poster can do this"
        )
    return task


# ---- Worker: volunteer for a task ----
@router.post(
    "/tasks/{task_id}/volunteer",
    response_model=SubmissionOut,
    status_code=status.HTTP_201_CREATED,
)
def volunteer(
    task_id: uuid.UUID,
    payload: VolunteerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Submission:
    task = db.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    if task.status not in ("open", "in_progress"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="This task is no longer accepting volunteers"
        )
    if task.poster_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot volunteer for your own task"
        )
    if task.slots_filled >= task.slots_total:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="All slots for this task are filled"
        )

    submission = Submission(
        task_id=task.id,
        worker_id=current_user.id,
        pitch=payload.pitch,
        status="volunteered",
    )
    db.add(submission)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already volunteered for this task",
        )
    db.refresh(submission)
    return submission


# ---- Worker: my engagement for a task (or null) ----
@router.get("/tasks/{task_id}/me", response_model=SubmissionOut | None)
def my_engagement(
    task_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Submission | None:
    return db.scalar(
        select(Submission).where(
            Submission.task_id == task_id, Submission.worker_id == current_user.id
        )
    )


# ---- Poster: list all engagements for a task ----
@router.get("/tasks/{task_id}/submissions", response_model=list[SubmissionOut])
def list_task_submissions(
    task_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Submission]:
    task = db.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    if task.poster_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Only the poster can view submissions"
        )
    stmt = (
        select(Submission)
        .options(joinedload(Submission.worker))
        .where(Submission.task_id == task_id)
        .order_by(Submission.created_at.desc())
    )
    return list(db.scalars(stmt))


# ---- Poster: accept a volunteer into a slot ----
@router.post("/submissions/{submission_id}/accept", response_model=SubmissionOut)
def accept_volunteer(
    submission_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Submission:
    submission = _load_submission(db, submission_id)
    task = _require_poster(submission, current_user)
    if submission.status != "volunteered":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot accept a {submission.status} volunteer",
        )
    if task.slots_filled >= task.slots_total:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="All slots are already filled"
        )

    submission.status = "accepted"
    task.slots_filled += 1
    if task.status == "open":
        task.status = "in_progress"

    db.commit()
    db.refresh(submission)
    return submission


# ---- Poster: reject a volunteer ----
@router.post("/submissions/{submission_id}/reject", response_model=SubmissionOut)
def reject_volunteer(
    submission_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Submission:
    submission = _load_submission(db, submission_id)
    _require_poster(submission, current_user)
    if submission.status != "volunteered":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot reject a {submission.status} volunteer",
        )
    submission.status = "rejected"
    db.commit()
    db.refresh(submission)
    return submission


# ---- Worker: deliver work after being accepted ----
@router.post("/submissions/{submission_id}/submit-work", response_model=SubmissionOut)
def submit_work(
    submission_id: uuid.UUID,
    payload: SubmitWorkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Submission:
    submission = _load_submission(db, submission_id)
    if submission.worker_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="This is not your engagement"
        )
    if submission.status not in ("accepted", "submitted"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must be accepted before submitting work",
        )
    submission.content = payload.content
    submission.status = "submitted"
    db.commit()
    db.refresh(submission)
    return submission


# ---- Poster: confirm delivery and pay out ----
@router.post("/submissions/{submission_id}/complete", response_model=SubmissionOut)
def complete_submission(
    submission_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Submission:
    submission = _load_submission(db, submission_id)
    task = _require_poster(submission, current_user)
    if submission.status != "submitted":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Work must be submitted before it can be completed",
        )

    services.payout(
        db,
        poster_wallet=current_user.wallet,
        worker_wallet=submission.worker.wallet,
        amount_cents=task.reward_per_slot_cents,
        task_id=task.id,
        description=f"Payout for task: {task.title}",
    )

    submission.status = "completed"
    task.slots_completed += 1
    if task.slots_completed >= task.slots_total:
        task.status = "completed"

    db.commit()
    db.refresh(submission)
    return submission


# ---- Worker: withdraw before completing ----
@router.post("/submissions/{submission_id}/withdraw", response_model=SubmissionOut)
def withdraw(
    submission_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Submission:
    submission = _load_submission(db, submission_id)
    if submission.worker_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="This is not your engagement"
        )
    if submission.status not in ("volunteered", "accepted", "submitted"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot withdraw a {submission.status} engagement",
        )

    task = submission.task
    # Free the reserved slot if it had been accepted.
    if submission.status in ("accepted", "submitted"):
        task.slots_filled = max(task.slots_filled - 1, 0)
        if task.status == "in_progress" and task.slots_filled == 0 and task.slots_completed == 0:
            task.status = "open"

    submission.status = "withdrawn"
    db.commit()
    db.refresh(submission)
    return submission


# ---- Worker: all my engagements ----
@router.get("/me/submissions", response_model=list[SubmissionWithTaskOut])
def my_submissions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Submission]:
    stmt = (
        select(Submission)
        .options(joinedload(Submission.task).joinedload(Task.poster))
        .where(Submission.worker_id == current_user.id)
        .order_by(Submission.created_at.desc())
    )
    return list(db.scalars(stmt).unique())


# ---- Reviews: leave a review on a completed engagement ----
@router.post("/submissions/{submission_id}/review", response_model=ReviewOut, status_code=201)
def review_engagement(
    submission_id: uuid.UUID,
    payload: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Review:
    submission = _load_submission(db, submission_id)
    task = submission.task
    if submission.status != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You can only review a completed task",
        )

    poster_id = task.poster_id
    worker_id = submission.worker_id
    if current_user.id == poster_id:
        reviewee_id, role = worker_id, "worker"
    elif current_user.id == worker_id:
        reviewee_id, role = poster_id, "poster"
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="You were not part of this task"
        )

    review = Review(
        task_id=task.id,
        reviewer_id=current_user.id,
        reviewee_id=reviewee_id,
        role=role,
        rating=payload.rating,
        comment=payload.comment,
    )
    db.add(review)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="You already reviewed this task"
        )
    db.refresh(review)
    return review
