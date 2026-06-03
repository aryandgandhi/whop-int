import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app import services
from app.database import get_db
from app.deps import get_current_user
from app.models import Task, Topic, User
from app.schemas import TaskCreate, TaskListResponse, TaskOut

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.get("", response_model=TaskListResponse)
def list_tasks(
    db: Session = Depends(get_db),
    topic: str | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    q: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> TaskListResponse:
    stmt = select(Task).options(joinedload(Task.poster))

    if topic:
        stmt = stmt.where(Task.topic_slug == topic)
    if status_filter:
        stmt = stmt.where(Task.status == status_filter)
    else:
        # Marketplace defaults to showing tasks that can still be worked on.
        stmt = stmt.where(Task.status.in_(["open", "in_progress"]))
    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(
            func.lower(Task.title).like(like) | func.lower(Task.description).like(like)
        )

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0

    stmt = stmt.order_by(Task.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    items = list(db.scalars(stmt).unique())

    return TaskListResponse(
        items=[TaskOut.model_validate(t) for t in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
def create_task(
    payload: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Task:
    topic = db.get(Topic, payload.topic_slug)
    if topic is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown topic")

    total_cost = payload.reward_per_slot_cents * payload.slots_total

    task = Task(
        title=payload.title,
        description=payload.description,
        topic_slug=payload.topic_slug,
        reward_per_slot_cents=payload.reward_per_slot_cents,
        currency=payload.currency,
        slots_total=payload.slots_total,
        poster_id=current_user.id,
    )
    db.add(task)
    db.flush()

    services.hold_escrow(
        db,
        current_user.wallet,
        total_cost,
        task.id,
        description=f"Escrow for task: {task.title}",
    )

    db.commit()
    db.refresh(task)
    return task


@router.get("/me/posted", response_model=list[TaskOut])
def my_posted_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Task]:
    stmt = (
        select(Task)
        .options(joinedload(Task.poster))
        .where(Task.poster_id == current_user.id)
        .order_by(Task.created_at.desc())
    )
    return list(db.scalars(stmt).unique())


@router.get("/{task_id}", response_model=TaskOut)
def get_task(task_id: uuid.UUID, db: Session = Depends(get_db)) -> Task:
    task = db.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return task


@router.post("/{task_id}/cancel", response_model=TaskOut)
def cancel_task(
    task_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Task:
    task = db.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    if task.poster_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Only the poster can cancel this task"
        )
    if task.status in ("completed", "cancelled"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=f"Task is already {task.status}"
        )

    # Escrow only leaves the pool when a slot is completed (paid out), so refund
    # everything that has not yet been paid - including accepted-but-unpaid slots.
    unpaid_slots = task.slots_total - task.slots_completed
    refund_amount = unpaid_slots * task.reward_per_slot_cents
    services.refund(
        db,
        current_user.wallet,
        refund_amount,
        task.id,
        description=f"Refund for cancelled task: {task.title}",
    )

    task.status = "cancelled"
    db.commit()
    db.refresh(task)
    return task
