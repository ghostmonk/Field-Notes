"""
Seed nested section hierarchy and content for local development.
Skipped in production (requires MONGO_URI pointing to localhost).
"""

import os
import re
from datetime import datetime, timedelta, timezone

import pymongo

name = "0017_seed_nested_sections"
dependencies = ["0016_nested_routing_indexes"]


def _slugify(text: str) -> str:
    slug = text.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[-\s]+", "-", slug)
    return slug.strip("-")


# Child sections to create under existing top-level sections
CHILD_SECTIONS = [
    # blog children
    {
        "title": "Tech",
        "slug": "tech",
        "parent_slug": "blog",
        "path": "blog/tech",
        "display_type": "feed",
        "content_type": "story",
        "nav_visibility": "hidden",
        "sort_order": 0,
    },
    {
        "title": "Personal",
        "slug": "personal",
        "parent_slug": "blog",
        "path": "blog/personal",
        "display_type": "feed",
        "content_type": "story",
        "nav_visibility": "hidden",
        "sort_order": 1,
    },
    # creative-work (new top-level)
    {
        "title": "Creative Work",
        "slug": "creative-work",
        "parent_slug": None,
        "path": "creative-work",
        "display_type": "card-grid",
        "content_type": "project",
        "nav_visibility": "main",
        "sort_order": 1,
    },
    # creative-work children
    {
        "title": "Photography",
        "slug": "photography",
        "parent_slug": "creative-work",
        "path": "creative-work/photography",
        "display_type": "gallery",
        "content_type": "photo_essay",
        "nav_visibility": "hidden",
        "sort_order": 0,
    },
    {
        "title": "Portraits",
        "slug": "portraits",
        "parent_slug": "creative-work/photography",
        "path": "creative-work/photography/portraits",
        "display_type": "gallery",
        "content_type": "photo_essay",
        "nav_visibility": "hidden",
        "sort_order": 0,
    },
    {
        "title": "Writing",
        "slug": "writing",
        "parent_slug": "creative-work",
        "path": "creative-work/writing",
        "display_type": "feed",
        "content_type": "story",
        "nav_visibility": "hidden",
        "sort_order": 1,
    },
]

# Top-level sections that need path backfill and sort_order updates
TOP_LEVEL_UPDATES = {
    "blog": {"path": "blog", "sort_order": 0},
    "projects": {"path": "projects", "sort_order": 2},
    "about": {"path": "about", "sort_order": 3},
    "contact": {"path": "contact", "sort_order": 4},
}

TECH_STORIES = [
    {
        "title": "Kubernetes Pod Scheduling Deep Dive",
        "content": "<p>Understanding how the kube-scheduler assigns pods to nodes, including affinity rules, taints, and resource requests.</p>",
        "is_published": True,
    },
    {
        "title": "Event Sourcing with MongoDB Change Streams",
        "content": "<p>Using change streams to implement event sourcing patterns without a dedicated event store.</p>",
        "is_published": True,
    },
]

PERSONAL_STORIES = [
    {
        "title": "Reflections on a Year of Remote Work",
        "content": "<p>What I learned about focus, boundaries, and async communication after a full year of distributed work.</p>",
        "is_published": True,
    },
]

PORTRAIT_ESSAYS = [
    {
        "title": "Studio Portraits Series",
        "slug": "studio-portraits-series",
        "is_published": True,
    },
    {
        "title": "Street Portraits Montreal",
        "slug": "street-portraits-montreal",
        "is_published": True,
    },
]

WRITING_STORIES = [
    {
        "title": "Short Fiction: The Last Compiler",
        "content": "<p>A short story about the last human who still writes code by hand in a world of AI-generated everything.</p>",
        "is_published": True,
    },
]


def _find_section_by_path(db, path):
    """Find a section by its path field."""
    return db["sections"].find_one({"path": path, "deleted": {"$ne": True}})


def upgrade(db: "pymongo.database.Database"):
    mongo_uri = os.getenv("MONGO_URI", "")
    if "localhost" not in mongo_uri and "127.0.0.1" not in mongo_uri:
        print("Skipping nested section seed (not a local database)")
        return

    sections = db["sections"]
    stories_coll = db["stories"]
    photo_essays_coll = db["photo_essays"]
    users_coll = db["users"]

    admin = users_coll.find_one({"role": "admin"})
    user_id = str(admin["_id"]) if admin else None
    now = datetime.now(timezone.utc)

    # Update existing top-level sections with path and sort_order
    for slug, updates in TOP_LEVEL_UPDATES.items():
        sections.update_one(
            {"slug": slug, "deleted": {"$ne": True}, "parent_id": None},
            {"$set": {**updates, "updatedDate": now}},
        )

    # Create child sections
    for child_def in CHILD_SECTIONS:
        # Skip if section already exists at this path
        existing = _find_section_by_path(db, child_def["path"])
        if existing:
            continue

        parent_id = None
        if child_def["parent_slug"]:
            parent = _find_section_by_path(db, child_def["parent_slug"])
            if parent:
                parent_id = str(parent["_id"])

        sections.insert_one(
            {
                "title": child_def["title"],
                "slug": child_def["slug"],
                "path": child_def["path"],
                "parent_id": parent_id,
                "display_type": child_def["display_type"],
                "content_type": child_def["content_type"],
                "nav_visibility": child_def["nav_visibility"],
                "sort_order": child_def["sort_order"],
                "is_published": True,
                "deleted": False,
                "createdDate": now,
                "updatedDate": now,
            }
        )

    # Seed content for blog/tech
    tech_section = _find_section_by_path(db, "blog/tech")
    if tech_section:
        tech_section_id = str(tech_section["_id"])
        for i, story in enumerate(TECH_STORIES):
            slug = _slugify(story["title"])
            if stories_coll.find_one({"slug": slug, "section_id": tech_section_id}):
                continue
            stories_coll.insert_one(
                {
                    **story,
                    "slug": slug,
                    "date": now - timedelta(days=len(TECH_STORIES) - i),
                    "user_id": user_id,
                    "section_id": tech_section_id,
                    "deleted": False,
                    "createdDate": now - timedelta(days=len(TECH_STORIES) - i),
                    "updatedDate": now,
                }
            )

    # Seed content for blog/personal
    personal_section = _find_section_by_path(db, "blog/personal")
    if personal_section:
        personal_section_id = str(personal_section["_id"])
        for i, story in enumerate(PERSONAL_STORIES):
            slug = _slugify(story["title"])
            if stories_coll.find_one({"slug": slug, "section_id": personal_section_id}):
                continue
            stories_coll.insert_one(
                {
                    **story,
                    "slug": slug,
                    "date": now,
                    "user_id": user_id,
                    "section_id": personal_section_id,
                    "deleted": False,
                    "createdDate": now,
                    "updatedDate": now,
                }
            )

    # Seed content for creative-work/photography/portraits
    portraits_section = _find_section_by_path(db, "creative-work/photography/portraits")
    if portraits_section:
        portraits_section_id = str(portraits_section["_id"])
        for essay in PORTRAIT_ESSAYS:
            if photo_essays_coll.find_one(
                {"slug": essay["slug"], "section_id": portraits_section_id}
            ):
                continue
            photo_essays_coll.insert_one(
                {
                    "title": essay["title"],
                    "slug": essay["slug"],
                    "is_published": essay["is_published"],
                    "description": "",
                    "cover_image_url": "",
                    "photos": [],
                    "section_id": portraits_section_id,
                    "user_id": user_id,
                    "deleted": False,
                    "createdDate": now,
                    "updatedDate": now,
                }
            )

    # Seed content for creative-work/writing
    writing_section = _find_section_by_path(db, "creative-work/writing")
    if writing_section:
        writing_section_id = str(writing_section["_id"])
        for story in WRITING_STORIES:
            slug = _slugify(story["title"])
            if stories_coll.find_one({"slug": slug, "section_id": writing_section_id}):
                continue
            stories_coll.insert_one(
                {
                    **story,
                    "slug": slug,
                    "date": now,
                    "user_id": user_id,
                    "section_id": writing_section_id,
                    "deleted": False,
                    "createdDate": now,
                    "updatedDate": now,
                }
            )

    print("Migration 0017 complete: nested sections and content seeded")


def downgrade(db: "pymongo.database.Database"):
    mongo_uri = os.getenv("MONGO_URI", "")
    if "localhost" not in mongo_uri and "127.0.0.1" not in mongo_uri:
        print("Skipping nested section seed rollback (not a local database)")
        return

    # Remove child sections (by path)
    child_paths = [c["path"] for c in CHILD_SECTIONS]
    db["sections"].delete_many({"path": {"$in": child_paths}})

    # Remove seeded content by slug
    tech_slugs = [_slugify(s["title"]) for s in TECH_STORIES]
    personal_slugs = [_slugify(s["title"]) for s in PERSONAL_STORIES]
    writing_slugs = [_slugify(s["title"]) for s in WRITING_STORIES]
    db["stories"].delete_many({"slug": {"$in": tech_slugs + personal_slugs + writing_slugs}})

    essay_slugs = [e["slug"] for e in PORTRAIT_ESSAYS]
    db["photo_essays"].delete_many({"slug": {"$in": essay_slugs}})

    print("Migration 0017 downgraded: nested sections and content removed")
