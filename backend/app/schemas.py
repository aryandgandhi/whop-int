import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, computed_field


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---- Auth / Users ----
class UserCreate(BaseModel):
    email: EmailStr
    display_name: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=8, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(ORMModel):
    id: uuid.UUID
    email: EmailStr
    display_name: str
    bio: str | None = None
    created_at: datetime


class UserUpdate(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=120)
    bio: str | None = Field(default=None, max_length=2000)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---- Topics ----
class TopicOut(ORMModel):
    slug: str
    name: str
    icon: str | None
    sort_order: int


# ---- Tasks ----
class TaskCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str = Field(min_length=1)
    topic_slug: str
    reward_per_slot_cents: int = Field(gt=0)
    slots_total: int = Field(default=1, ge=1, le=10_000)
    currency: str = "usd"


class PosterOut(ORMModel):
    id: uuid.UUID
    display_name: str


class TaskOut(ORMModel):
    id: uuid.UUID
    title: str
    description: str
    topic_slug: str
    reward_per_slot_cents: int
    currency: str
    slots_total: int
    slots_filled: int
    slots_completed: int
    status: str
    poster: PosterOut
    created_at: datetime
    updated_at: datetime

    @computed_field
    @property
    def slots_remaining(self) -> int:
        return max(self.slots_total - self.slots_filled, 0)


class TaskListResponse(BaseModel):
    items: list[TaskOut]
    total: int
    page: int
    page_size: int


# ---- Submissions / engagements ----
class VolunteerCreate(BaseModel):
    pitch: str | None = Field(default=None, max_length=2000)


class SubmitWorkCreate(BaseModel):
    content: str = Field(min_length=1)


class WorkerOut(ORMModel):
    id: uuid.UUID
    display_name: str


class SubmissionOut(ORMModel):
    id: uuid.UUID
    task_id: uuid.UUID
    worker: WorkerOut
    pitch: str | None
    content: str | None
    status: str
    created_at: datetime
    updated_at: datetime


class SubmissionWithTaskOut(SubmissionOut):
    task: TaskOut


# ---- Reviews ----
class ReviewCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str | None = Field(default=None, max_length=2000)


class ReviewOut(ORMModel):
    id: uuid.UUID
    task_id: uuid.UUID
    reviewer: WorkerOut
    reviewee_id: uuid.UUID
    role: str
    rating: int
    comment: str | None
    created_at: datetime


# ---- Profiles ----
class ProfileOut(BaseModel):
    id: uuid.UUID
    display_name: str
    bio: str | None
    created_at: datetime
    tasks_posted: int
    tasks_completed: int
    total_earned_cents: int
    avg_rating: float | None
    review_count: int


# ---- Wallet ----
class TransactionOut(ORMModel):
    id: uuid.UUID
    type: str
    amount_cents: int
    task_id: uuid.UUID | None
    description: str | None
    created_at: datetime


class WalletOut(BaseModel):
    available_cents: int
    escrow_cents: int
    transactions: list[TransactionOut]
