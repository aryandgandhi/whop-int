"""Seed the fixed topic taxonomy. Idempotent: safe to run on every boot."""

from app.database import SessionLocal
from app.models import Topic

TOPICS: list[dict[str, object]] = [
    {"slug": "programming", "name": "Programming", "icon": "code", "sort_order": 1},
    {"slug": "design", "name": "Design", "icon": "palette", "sort_order": 2},
    {"slug": "writing", "name": "Writing", "icon": "pencil", "sort_order": 3},
    {"slug": "marketing", "name": "Marketing", "icon": "megaphone", "sort_order": 4},
    {"slug": "data", "name": "Data & Research", "icon": "chart", "sort_order": 5},
    {"slug": "delivery", "name": "Delivery & Errands", "icon": "truck", "sort_order": 6},
    {"slug": "video", "name": "Video & Audio", "icon": "video", "sort_order": 7},
    {"slug": "translation", "name": "Translation", "icon": "globe", "sort_order": 8},
    {"slug": "admin", "name": "Admin & Virtual Assist", "icon": "clipboard", "sort_order": 9},
    {"slug": "other", "name": "Other", "icon": "sparkles", "sort_order": 99},
]


def seed_topics() -> None:
    db = SessionLocal()
    try:
        for data in TOPICS:
            existing = db.get(Topic, data["slug"])
            if existing is None:
                db.add(Topic(**data))
            else:
                existing.name = data["name"]
                existing.icon = data["icon"]
                existing.sort_order = data["sort_order"]
        db.commit()
        print(f"Seeded {len(TOPICS)} topics.")
    finally:
        db.close()


if __name__ == "__main__":
    seed_topics()
