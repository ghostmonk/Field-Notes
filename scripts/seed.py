#!/usr/bin/env python3
"""
Idempotent seed script for local development.
Populates MongoDB with representative content matching production structure.

Usage:
    python scripts/seed.py [--mongo-uri URI] [--db-name NAME]

Defaults to mongodb://localhost:27017/ghostmonk.
"""

import argparse
import re
import sys
from datetime import datetime, timedelta, timezone

import pymongo
from pymongo.errors import ConnectionFailure


def _slugify(text: str) -> str:
    slug = text.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[-\s]+", "-", slug)
    return slug.strip("-")


PLACEHOLDER_IMAGES = [
    f"https://picsum.photos/seed/ghostmonk{i}/800/600" for i in range(1, 9)
]

SECTIONS = [
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
    {
        "title": "About",
        "slug": "about",
        "path": "about",
        "display_type": "static-page",
        "content_type": "page",
        "nav_visibility": "footer",
        "sort_order": 3,
        "icon": "user",
    },
    {
        "title": "Projects",
        "slug": "projects",
        "path": "projects",
        "display_type": "card-grid",
        "content_type": "project",
        "nav_visibility": "footer",
        "sort_order": 4,
        "icon": "folder",
    },
    {
        "title": "Contact",
        "slug": "contact",
        "path": "contact",
        "display_type": "static-page",
        "content_type": "page",
        "nav_visibility": "footer",
        "sort_order": 5,
        "icon": "mail",
    },
]

STORIES = [
    {
        "title": "Building A Thing That Builds A Thing",
        "content": (
            "<h2>... Or How I Met the Bomb and Learned to Love Your Mother</h2>"
            "<p>This tip top editor is absolute trash, or this machine has completely "
            "flubber deglassified the whole experience.</p>"
            "<p>This tip top editor is what I am using to write this post and it's truly "
            "a terrible experience. To be fair, I can't tell if it's my own stupidity for "
            "not telling some networked classification dictionary to properly configure it, "
            "or because software is actually just a total pain in the ass, and always will "
            "be a total pain in the ass.</p>"
            "<p>I suspect it's the latter...</p>"
        ),
        "tags": ["meta", "building", "software"],
        "section_slug": "stack-shift",
    },
    {
        "title": "Designing a Flow Field with Perlin Noise",
        "content": (
            "<p>Flow fields are one of the most satisfying generative art techniques. "
            "A vector field guides thousands of particles across the canvas, each tracing "
            "its own path through the noise.</p>"
            "<p>The key parameters are noise scale (how tightly curves bend), particle "
            "count (density), and fade alpha (trail persistence). At scale 0.003 with "
            "4000 particles and fadeAlpha 0.09, you get organic, smoke-like trails.</p>"
            "<p>Adding boid flocking on top of the noise field creates emergent behavior: "
            "particles cluster into streams, split around obstacles, and reform downstream. "
            "The spatial hash makes neighbor lookups O(n) instead of O(n^2).</p>"
        ),
        "tags": ["generative-art", "canvas", "perlin-noise", "typescript"],
        "section_slug": "stack-shift",
    },
    {
        "title": "Building a Config-Driven Homepage",
        "content": (
            "<p>The homepage is defined entirely in site.config.json. Each block has a "
            "type that maps to a registered component, and data is fetched based on which "
            "block types are present.</p>"
            "<p>This means adding a new homepage section is just one line of JSON and one "
            "component. No routing changes, no API changes. The block registry handles "
            "the rest.</p>"
        ),
        "tags": ["architecture", "next.js", "react"],
        "section_slug": "stack-shift",
    },
    {
        "title": "ISR and the 5-Minute Stale Problem",
        "content": (
            "<p>Next.js Incremental Static Regeneration rebuilds pages in the background "
            "after the revalidation interval. The first visitor after that interval gets "
            "the stale page while the new one builds.</p>"
            "<p>For a personal site this is fine. But when you rebuild the Docker container, "
            "the ISR cache is empty and every page serves the fallback until revalidation "
            "kicks in. The fix: prime the cache on startup by hitting key routes.</p>"
        ),
        "tags": ["next.js", "deployment", "performance"],
        "section_slug": "stack-shift",
    },
    {
        "title": "Review: Blood Meridian",
        "content": (
            "<p>Cormac McCarthy's prose operates at a register that makes most other "
            "fiction feel timid. Blood Meridian is not a novel you enjoy. It is a novel "
            "that happens to you.</p>"
            "<p>The Judge is one of the great antagonists in American literature: erudite, "
            "monstrous, and utterly convinced that war is the supreme form of human "
            "expression. McCarthy never flinches from the implications.</p>"
        ),
        "tags": ["book-review", "literature", "cormac-mccarthy"],
        "section_slug": "scraps",
    },
    {
        "title": "Notes on Wabi-Sabi in Software",
        "content": (
            "<p>Wabi-sabi values imperfection, impermanence, and incompleteness. Applied "
            "to software: ship the thing that works, not the thing that is perfect. Let "
            "the rough edges show.</p>"
            "<p>A hand-rolled CSS system with visible seams has more character than a "
            "pixel-perfect design system that took six months. The craft is in knowing "
            "which imperfections to keep.</p>"
        ),
        "tags": ["philosophy", "craft", "design"],
        "section_slug": "scraps",
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

PROJECTS = [
    {
        "title": "Ghostmonk.com",
        "summary": "This site. A self-hosted CMS built with Next.js, FastAPI, and MongoDB. Open source, forkable, zero external dependencies.",
        "content": "<p>Dynamic routing, rich text editing, photo essays, project showcases, GitHub integration, and a block-based homepage.</p>",
        "technologies": ["Next.js", "FastAPI", "MongoDB", "Docker"],
        "is_featured": True,
        "sort_order": 0,
    },
    {
        "title": "Particle Playground",
        "summary": "Interactive WebGL particle system with flocking, noise fields, and attractor physics. 60fps with 10,000 particles.",
        "content": "<p>A sandbox for experimenting with particle behaviors. Combines Perlin noise flow fields with Craig Reynolds' boid rules.</p>",
        "technologies": ["WebGL", "TypeScript", "GLSL"],
        "is_featured": True,
        "sort_order": 1,
    },
    {
        "title": "Financial Tracker",
        "summary": "Tauri v2 desktop app for personal finance. Rust backend, React frontend, SQLite storage.",
        "content": "<p>Track accounts, transactions, budgets, and net worth over time. All data stays local.</p>",
        "technologies": ["Tauri", "Rust", "React", "SQLite"],
        "is_featured": False,
        "sort_order": 2,
    },
]

PAGES = [
    {
        "page_type": "about",
        "title": "Hi I'm Nicholas",
        "content": (
            "<p>Welcome to Field Notes.</p>"
            "<p>I started this project to have a quick conduit for collecting "
            "personal expressions.</p>"
            "<p>Poetry, thoughts, photography, in-progress work and on and on.</p>"
            "<p>A place to create and collect and to become inspired.</p>"
            "<p>Great work is revealed from a clear vision, but rarely is the "
            "path direct.</p>"
            "<p>With Field Notes you can find that path.</p>"
        ),
    },
    {
        "page_type": "contact",
        "title": "How Do You Do a Proper Contact In 2026",
        "content": (
            "<p>You sure as hell don't share your phone number or email... "
            "that's for sure.</p>"
        ),
    },
]


def seed(db):
    now = datetime.now(timezone.utc)
    sections_coll = db["sections"]
    stories_coll = db["stories"]
    photo_essays_coll = db["photo_essays"]
    projects_coll = db["projects"]
    pages_coll = db["pages"]
    users_coll = db["users"]

    admin = users_coll.find_one({"role": "admin"})
    user_id = str(admin["_id"]) if admin else None

    created = {"sections": 0, "stories": 0, "photo_essays": 0, "projects": 0, "pages": 0}

    # Sections
    for sec in SECTIONS:
        if sections_coll.find_one({"slug": sec["slug"], "is_deleted": {"$ne": True}}):
            continue
        sections_coll.insert_one({
            **sec,
            "parent_id": None,
            "is_published": True,
            "is_deleted": False,
            "createdDate": now,
            "updatedDate": now,
        })
        created["sections"] += 1

    section_cache = {}

    def get_section_id(slug):
        if slug not in section_cache:
            sec = sections_coll.find_one({"slug": slug, "is_deleted": {"$ne": True}})
            section_cache[slug] = str(sec["_id"]) if sec else None
        return section_cache[slug]

    # Stories
    for i, story in enumerate(STORIES):
        slug = _slugify(story["title"])
        if stories_coll.find_one({"slug": slug}):
            continue
        offset = len(STORIES) - i
        stories_coll.insert_one({
            "title": story["title"],
            "slug": slug,
            "content": story["content"],
            "tags": story["tags"],
            "is_published": True,
            "is_deleted": False,
            "date": now - timedelta(days=offset),
            "user_id": user_id,
            "section_id": get_section_id(story["section_slug"]),
            "createdDate": now - timedelta(days=offset),
            "updatedDate": now,
        })
        created["stories"] += 1

    # Photo essays
    photo_section_id = get_section_id("stills-and-stories")
    for i, essay in enumerate(PHOTO_ESSAYS):
        if photo_essays_coll.find_one({"slug": essay["slug"]}):
            continue
        photo_essays_coll.insert_one({
            "title": essay["title"],
            "slug": essay["slug"],
            "description": essay["description"],
            "cover_image_url": PLACEHOLDER_IMAGES[i % len(PLACEHOLDER_IMAGES)],
            "cover_image_position": "50% 50%",
            "photos": [],
            "photo_count": essay["photo_count"],
            "tags": [],
            "is_published": True,
            "is_deleted": False,
            "section_id": photo_section_id,
            "user_id": user_id,
            "createdDate": now - timedelta(days=len(PHOTO_ESSAYS) - i),
            "updatedDate": now,
        })
        created["photo_essays"] += 1

    # Projects
    projects_section_id = get_section_id("projects")
    for proj in PROJECTS:
        slug = _slugify(proj["title"])
        if projects_coll.find_one({"slug": slug}):
            continue
        projects_coll.insert_one({
            **proj,
            "slug": slug,
            "github_url": None,
            "image_url": None,
            "live_url": None,
            "is_published": True,
            "is_deleted": False,
            "user_id": user_id,
            "section_id": projects_section_id,
            "createdDate": now,
            "updatedDate": now,
        })
        created["projects"] += 1

    # Pages
    for page in PAGES:
        if pages_coll.find_one({"page_type": page["page_type"]}):
            continue
        pages_coll.insert_one({
            **page,
            "slug": page["page_type"],
            "is_published": True,
            "is_deleted": False,
            "user_id": user_id,
            "createdDate": now,
            "updatedDate": now,
        })
        created["pages"] += 1

    total = sum(created.values())
    if total == 0:
        print("Seed: all data already present, nothing to do.")
    else:
        parts = [f"{v} {k}" for k, v in created.items() if v > 0]
        print(f"Seed: created {', '.join(parts)}")


def main():
    parser = argparse.ArgumentParser(description="Seed local dev database")
    parser.add_argument("--mongo-uri", default=None, help="MongoDB URI")
    parser.add_argument("--db-name", default=None, help="Database name")
    args = parser.parse_args()

    mongo_uri = args.mongo_uri or "mongodb://localhost:27017"
    db_name = args.db_name or "ghostmonk"

    client = pymongo.MongoClient(mongo_uri)
    db = client[db_name]

    try:
        client.admin.command("ping")
    except ConnectionFailure:
        print(f"Error: cannot connect to MongoDB at {mongo_uri}", file=sys.stderr)
        sys.exit(1)

    seed(db)
    client.close()


if __name__ == "__main__":
    main()
