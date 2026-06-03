from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Topic
from app.schemas import TopicOut

router = APIRouter(prefix="/api/topics", tags=["topics"])


@router.get("", response_model=list[TopicOut])
def list_topics(db: Session = Depends(get_db)) -> list[Topic]:
    return list(db.scalars(select(Topic).order_by(Topic.sort_order, Topic.name)))
