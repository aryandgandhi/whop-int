"""hybrid volunteer flow, profiles, reviews

Revision ID: 0002_hybrid
Revises: 0001_initial
Create Date: 2026-06-03

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002_hybrid"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Users get an optional bio.
    op.add_column("users", sa.Column("bio", sa.Text(), nullable=True))

    # Tasks track how many slots have been delivered + paid.
    op.add_column(
        "tasks",
        sa.Column("slots_completed", sa.Integer(), nullable=False, server_default="0"),
    )

    # Submissions become multi-stage engagements.
    op.add_column("submissions", sa.Column("pitch", sa.Text(), nullable=True))
    op.alter_column("submissions", "content", existing_type=sa.Text(), nullable=True)
    # Existing rows used the old "pending" status; map them onto the new vocabulary.
    op.execute("UPDATE submissions SET status = 'volunteered' WHERE status = 'pending'")
    op.execute("UPDATE submissions SET status = 'completed' WHERE status = 'accepted'")

    op.create_table(
        "reviews",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("task_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("reviewer_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("reviewee_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("role", sa.String(length=16), nullable=False),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["task_id"], ["tasks.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["reviewer_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["reviewee_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("task_id", "reviewer_id", "reviewee_id", name="uq_review_unique"),
    )
    op.create_index("ix_reviews_task_id", "reviews", ["task_id"])
    op.create_index("ix_reviews_reviewee_id", "reviews", ["reviewee_id"])


def downgrade() -> None:
    op.drop_index("ix_reviews_reviewee_id", table_name="reviews")
    op.drop_index("ix_reviews_task_id", table_name="reviews")
    op.drop_table("reviews")

    op.alter_column("submissions", "content", existing_type=sa.Text(), nullable=False)
    op.drop_column("submissions", "pitch")

    op.drop_column("tasks", "slots_completed")
    op.drop_column("users", "bio")
