"""
Seed initial sections from hardcoded frontend structure.
"""

from datetime import datetime, timezone

import pymongo

name = "0003_seed_initial_sections"
dependencies = ["0002_add_user_id_to_content"]

INITIAL_SECTIONS = [
    {
        "title": "Blog",
        "slug": "blog",
        "parent_id": None,
        "display_type": "feed",
        "content_type": "story",
        "nav_visibility": "main",
        "sort_order": 0,
        "is_published": True,
        "is_deleted": False,
    },
    {
        "title": "About",
        "slug": "about",
        "parent_id": None,
        "display_type": "static-page",
        "content_type": "page",
        "nav_visibility": "main",
        "sort_order": 1,
        "is_published": True,
        "is_deleted": False,
    },
    {
        "title": "Projects",
        "slug": "projects",
        "parent_id": None,
        "display_type": "card-grid",
        "content_type": "project",
        "nav_visibility": "main",
        "sort_order": 2,
        "is_published": True,
        "is_deleted": False,
    },
    {
        "title": "Contact",
        "slug": "contact",
        "parent_id": None,
        "display_type": "static-page",
        "content_type": "page",
        "nav_visibility": "main",
        "sort_order": 3,
        "is_published": True,
        "is_deleted": False,
    },
]


def upgrade(db: "pymongo.database.Database"):
    sections = db["sections"]

    existing = sections.count_documents({"is_deleted": False})
    if existing > 0:
        return

    current_time = datetime.now(timezone.utc)
    docs = []
    for section in INITIAL_SECTIONS:
        docs.append(
            {
                **section,
                "createdDate": current_time,
                "updatedDate": current_time,
            }
        )

    sections.insert_many(docs)


def downgrade(db: "pymongo.database.Database"):
    slugs = [s["slug"] for s in INITIAL_SECTIONS]
    db["sections"].delete_many({"slug": {"$in": slugs}})
