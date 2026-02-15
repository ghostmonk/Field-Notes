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
    current_time = datetime.now(timezone.utc)

    for section_def in INITIAL_SECTIONS:
        existing = sections.find_one({"slug": section_def["slug"], "is_deleted": False})
        if existing:
            continue
        sections.insert_one(
            {
                **section_def,
                "createdDate": current_time,
                "updatedDate": current_time,
            }
        )


def downgrade(db: "pymongo.database.Database"):
    slugs = [s["slug"] for s in INITIAL_SECTIONS]
    db["sections"].delete_many({"slug": {"$in": slugs}})
