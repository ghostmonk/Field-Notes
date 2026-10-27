"""
Seed rich homepage test data for local development.
Adds sections matching production (Stack Shift, Stills And Stories, Scraps),
stories with tags, more projects, and photo essays with placeholder cover images.
Skipped in production (requires ALLOW_DEV_AUTH=true).
"""

import os
import re
from datetime import datetime, timedelta, timezone

import pymongo

name = "0018_seed_homepage_data"
dependencies = ["0017_seed_nested_sections"]

PLACEHOLDER_IMAGES = [
    "https://picsum.photos/seed/ghostmonk1/800/600",
    "https://picsum.photos/seed/ghostmonk2/800/600",
    "https://picsum.photos/seed/ghostmonk3/800/600",
    "https://picsum.photos/seed/ghostmonk4/800/600",
    "https://picsum.photos/seed/ghostmonk5/800/600",
    "https://picsum.photos/seed/ghostmonk6/800/600",
    "https://picsum.photos/seed/ghostmonk7/800/600",
    "https://picsum.photos/seed/ghostmonk8/800/600",
]


def _slugify(text: str) -> str:
    slug = text.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[-\s]+", "-", slug)
    return slug.strip("-")


SECTIONS_TO_ADD = [
    {
        "title": "Stack Shift",
        "slug": "stack-shift",
        "path": "stack-shift",
        "display_type": "feed",
        "content_type": "story",
        "nav_visibility": "main",
        "sort_order": 0,
        "icon": "code",
    },
    {
        "title": "Stills And Stories",
        "slug": "stills-and-stories",
        "path": "stills-and-stories",
        "display_type": "gallery",
        "content_type": "photo_essay",
        "nav_visibility": "main",
        "sort_order": 1,
        "icon": "camera",
    },
    {
        "title": "Scraps",
        "slug": "scraps",
        "path": "scraps",
        "display_type": "feed",
        "content_type": "story",
        "nav_visibility": "main",
        "sort_order": 2,
        "icon": "folder",
    },
]

STORIES_WITH_TAGS = [
    {
        "title": "Designing a Flow Field with Perlin Noise",
        "content": "<p>Flow fields are one of the most satisfying generative art techniques. A vector field guides thousands of particles across the canvas, each tracing its own path through the noise.</p><p>The key parameters are noise scale (how tightly curves bend), particle count (density), and fade alpha (trail persistence). At scale 0.003 with 4000 particles and fadeAlpha 0.09, you get organic, smoke-like trails.</p><p>Adding boid flocking on top of the noise field creates emergent behavior: particles cluster into streams, split around obstacles, and reform downstream. The spatial hash makes neighbor lookups O(n) instead of O(n^2).</p>",
        "tags": ["generative-art", "canvas", "perlin-noise", "typescript"],
        "section_slug": "stack-shift",
        "is_published": True,
    },
    {
        "title": "Building a Config-Driven Homepage",
        "content": "<p>The homepage is defined entirely in site.config.json. Each block has a type that maps to a registered component, and data is fetched based on which block types are present.</p><p>This means adding a new homepage section is just one line of JSON and one component. No routing changes, no API changes. The block registry handles the rest.</p>",
        "tags": ["architecture", "next.js", "react"],
        "section_slug": "stack-shift",
        "is_published": True,
    },
    {
        "title": "MongoDB Aggregation Pipelines for Content Feeds",
        "content": "<p>When your content model has sections, subsections, and cross-references, simple find queries stop scaling. Aggregation pipelines let you join, filter, and reshape documents in a single round trip.</p><p>The $lookup stage is the key: it performs a left outer join against another collection. Combined with $unwind and $match, you can traverse the section hierarchy without multiple queries.</p>",
        "tags": ["mongodb", "backend", "python"],
        "section_slug": "stack-shift",
        "is_published": True,
    },
    {
        "title": "ISR and the 5-Minute Stale Problem",
        "content": "<p>Next.js Incremental Static Regeneration rebuilds pages in the background after the revalidation interval. The first visitor after that interval gets the stale page while the new one builds.</p><p>For a personal site this is fine. But when you rebuild the Docker container, the ISR cache is empty and every page serves the fallback until revalidation kicks in. The fix: prime the cache on startup by hitting key routes.</p>",
        "tags": ["next.js", "deployment", "performance"],
        "section_slug": "stack-shift",
        "is_published": True,
    },
    {
        "title": "Review: Blood Meridian",
        "content": "<p>Cormac McCarthy's prose operates at a register that makes most other fiction feel timid. Blood Meridian is not a novel you enjoy. It is a novel that happens to you.</p><p>The Judge is one of the great antagonists in American literature: erudite, monstrous, and utterly convinced that war is the supreme form of human expression. McCarthy never flinches from the implications.</p>",
        "tags": ["book-review", "literature", "cormac-mccarthy"],
        "section_slug": "scraps",
        "is_published": True,
    },
    {
        "title": "Notes on Wabi-Sabi in Software",
        "content": "<p>Wabi-sabi values imperfection, impermanence, and incompleteness. Applied to software: ship the thing that works, not the thing that is perfect. Let the rough edges show.</p><p>A hand-rolled CSS system with visible seams has more character than a pixel-perfect design system that took six months. The craft is in knowing which imperfections to keep.</p>",
        "tags": ["philosophy", "craft", "design"],
        "section_slug": "scraps",
        "is_published": True,
    },
]

PHOTO_ESSAYS = [
    {
        "title": "Rainy Streets of Tokyo",
        "slug": "rainy-streets-tokyo",
        "description": "Nighttime reflections on wet pavement in Shinjuku and Shibuya.",
        "photo_count": 24,
    },
    {
        "title": "Abandoned Grain Elevators",
        "slug": "abandoned-grain-elevators",
        "description": "Prairie monoliths left standing after the railways moved on.",
        "photo_count": 18,
    },
    {
        "title": "Morning Light in the Rockies",
        "slug": "morning-light-rockies",
        "description": "First light hitting Lake Louise and Moraine Lake in September.",
        "photo_count": 12,
    },
    {
        "title": "Portraits at the Boxing Gym",
        "slug": "portraits-boxing-gym",
        "description": "Fighters between rounds, shot on medium format.",
        "photo_count": 15,
    },
    {
        "title": "Urban Geometry",
        "slug": "urban-geometry",
        "description": "Lines, angles, and negative space in Montreal architecture.",
        "photo_count": 20,
    },
]

EXTRA_PROJECTS = [
    {
        "title": "Particle Playground",
        "summary": "Interactive WebGL particle system with flocking, noise fields, and attractor physics. 60fps with 10,000 particles.",
        "content": "<p>A sandbox for experimenting with particle behaviors. Combines Perlin noise flow fields with Craig Reynolds' boid rules.</p>",
        "technologies": ["WebGL", "TypeScript", "GLSL"],
        "is_featured": True,
        "sort_order": 3,
    },
    {
        "title": "Ghostmonk.com",
        "summary": "This site. A self-hosted CMS built with Next.js, FastAPI, and MongoDB. Open source, forkable, zero external dependencies.",
        "content": "<p>Dynamic routing, rich text editing, photo essays, project showcases, GitHub integration, and a block-based homepage.</p>",
        "technologies": ["Next.js", "FastAPI", "MongoDB", "Docker"],
        "is_featured": True,
        "sort_order": 0,
    },
]


def upgrade(db: "pymongo.database.Database"):
    if os.getenv("ALLOW_DEV_AUTH") != "true":
        print("Skipping homepage seed data (ALLOW_DEV_AUTH not set)")
        return

    sections = db["sections"]
    stories_coll = db["stories"]
    photo_essays_coll = db["photo_essays"]
    projects_coll = db["projects"]
    users_coll = db["users"]

    admin = users_coll.find_one({"role": "admin"})
    user_id = str(admin["_id"]) if admin else None
    now = datetime.now(timezone.utc)

    # Add missing production sections
    for sec_def in SECTIONS_TO_ADD:
        existing = sections.find_one({"slug": sec_def["slug"], "is_deleted": {"$ne": True}})
        if existing:
            continue
        sections.insert_one(
            {
                **sec_def,
                "parent_id": None,
                "is_published": True,
                "is_deleted": False,
                "createdDate": now,
                "updatedDate": now,
            }
        )

    # Add tags to existing stories that lack them
    stories_coll.update_many(
        {"tags": {"$exists": False}},
        {"$set": {"tags": []}},
    )

    # Seed stories with tags
    section_cache = {}
    for story_def in STORIES_WITH_TAGS:
        slug = _slugify(story_def["title"])
        if stories_coll.find_one({"slug": slug}):
            continue

        section_slug = story_def.get("section_slug")
        if section_slug not in section_cache:
            sec = sections.find_one({"slug": section_slug, "is_deleted": {"$ne": True}})
            section_cache[section_slug] = str(sec["_id"]) if sec else None
        section_id = section_cache[section_slug]

        doc = {k: v for k, v in story_def.items() if k != "section_slug"}
        offset = len(STORIES_WITH_TAGS) - STORIES_WITH_TAGS.index(story_def)
        stories_coll.insert_one(
            {
                **doc,
                "slug": slug,
                "date": now - timedelta(days=offset),
                "user_id": user_id,
                "section_id": section_id,
                "is_deleted": False,
                "createdDate": now - timedelta(days=offset),
                "updatedDate": now,
            }
        )

    # Seed photo essays with cover images
    photo_section = sections.find_one({"slug": "stills-and-stories", "is_deleted": {"$ne": True}})
    photo_section_id = str(photo_section["_id"]) if photo_section else None

    for i, essay_def in enumerate(PHOTO_ESSAYS):
        if photo_essays_coll.find_one({"slug": essay_def["slug"]}):
            continue
        photo_essays_coll.insert_one(
            {
                "title": essay_def["title"],
                "slug": essay_def["slug"],
                "description": essay_def["description"],
                "cover_image_url": PLACEHOLDER_IMAGES[i % len(PLACEHOLDER_IMAGES)],
                "cover_image_position": "50% 50%",
                "photos": [],
                "photo_count": essay_def["photo_count"],
                "tags": [],
                "is_published": True,
                "deleted": False,
                "section_id": photo_section_id,
                "user_id": user_id,
                "createdDate": now - timedelta(days=len(PHOTO_ESSAYS) - i),
                "updatedDate": now,
            }
        )

    # Seed extra projects
    projects_section = sections.find_one({"slug": "projects", "is_deleted": {"$ne": True}})
    projects_section_id = str(projects_section["_id"]) if projects_section else None

    for project_def in EXTRA_PROJECTS:
        slug = _slugify(project_def["title"])
        if projects_coll.find_one({"slug": slug}):
            continue
        projects_coll.insert_one(
            {
                **project_def,
                "slug": slug,
                "github_url": None,
                "image_url": None,
                "live_url": None,
                "is_published": True,
                "user_id": user_id,
                "section_id": projects_section_id,
                "is_deleted": False,
                "createdDate": now,
                "updatedDate": now,
            }
        )

    # Ensure blog section stories have tags backfilled
    blog_section = sections.find_one({"slug": "blog", "is_deleted": {"$ne": True}})
    if blog_section:
        blog_id = str(blog_section["_id"])
        tag_map = {
            "building-a-dynamic-routing-system": ["next.js", "routing", "architecture"],
            "mongodb-connection-pooling-best-practices": ["mongodb", "backend", "performance"],
            "content-registries-in-react": ["react", "patterns", "architecture"],
            "fastapi-dependency-injection-patterns": ["python", "fastapi", "backend"],
        }
        for slug, tags in tag_map.items():
            stories_coll.update_one(
                {"slug": slug, "section_id": blog_id},
                {"$set": {"tags": tags}},
            )

    print("Migration 0018 complete: homepage test data seeded")


def downgrade(db: "pymongo.database.Database"):
    if os.getenv("ALLOW_DEV_AUTH") != "true":
        print("Skipping homepage seed data rollback (ALLOW_DEV_AUTH not set)")
        return

    section_slugs = [s["slug"] for s in SECTIONS_TO_ADD]
    db["sections"].delete_many({"slug": {"$in": section_slugs}})

    story_slugs = [_slugify(s["title"]) for s in STORIES_WITH_TAGS]
    db["stories"].delete_many({"slug": {"$in": story_slugs}})

    essay_slugs = [e["slug"] for e in PHOTO_ESSAYS]
    db["photo_essays"].delete_many({"slug": {"$in": essay_slugs}})

    project_slugs = [_slugify(p["title"]) for p in EXTRA_PROJECTS]
    db["projects"].delete_many({"slug": {"$in": project_slugs}})

    print("Migration 0018 downgraded: homepage test data removed")
