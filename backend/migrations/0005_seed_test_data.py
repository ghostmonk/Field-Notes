"""
Seed test content for local development.
Skipped in production (requires MONGO_URI pointing to localhost).
"""

import os
import re
from datetime import datetime, timedelta, timezone

import pymongo

name = "0005_seed_test_data"
dependencies = ["0004_backfill_section_id"]


def _slugify(text: str) -> str:
    slug = text.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[-\s]+", "-", slug)
    return slug.strip("-")


STORIES = [
    {
        "title": "Building a Dynamic Routing System",
        "content": "<p>This post explores how to build a catch-all routing system in Next.js that resolves sections from a database and renders content using a registry pattern.</p><p>The key insight is that a single <code>[...slugPath]</code> route can replace dozens of hardcoded page files by looking up section configuration at request time.</p>",
        "is_published": True,
    },
    {
        "title": "MongoDB Connection Pooling Best Practices",
        "content": "<p>Connection pooling is essential for any production MongoDB deployment. This article covers the key parameters: <code>maxPoolSize</code>, <code>minPoolSize</code>, and <code>maxIdleTimeMS</code>.</p><p>Getting these right means fewer connection timeouts and better throughput under load.</p>",
        "is_published": True,
    },
    {
        "title": "Content Registries in React",
        "content": "<p>A registry pattern decouples content types from display logic. Instead of switch statements scattered across your codebase, you register components once and look them up by key.</p><p>This makes adding new content types a matter of defining a component and adding a single registry entry.</p>",
        "is_published": True,
    },
    {
        "title": "FastAPI Dependency Injection Patterns",
        "content": "<p>FastAPI's dependency injection system is one of its strongest features. This post walks through common patterns: database sessions, authentication, and rate limiting.</p><p>The <code>Depends()</code> function makes it trivial to compose reusable middleware without global state.</p>",
        "is_published": True,
    },
    {
        "title": "Draft: Upcoming Feature Ideas",
        "content": "<p>Some rough notes on features to build next. Not ready for publication yet.</p>",
        "is_published": False,
    },
]

PROJECTS = [
    {
        "title": "Field Notes",
        "summary": "A content management system built with Next.js and FastAPI, featuring dynamic routing, rich text editing, and a registry-based architecture.",
        "content": "<p>Field Notes is a full-stack CMS that uses a dynamic sections system to render content. Sections are configured in the database and mapped to display and content components via registries.</p><p>Key features include infinite scroll, server-side rendering, Google OAuth, and image uploads to GCS.</p>",
        "technologies": ["Next.js", "FastAPI", "MongoDB", "TypeScript", "Python"],
        "github_url": "https://github.com/example/field-notes",
        "image_url": None,
        "live_url": None,
        "is_published": True,
        "is_featured": True,
        "sort_order": 0,
    },
    {
        "title": "CLI Task Runner",
        "summary": "A lightweight task runner for shell workflows, written in Go with concurrent execution support.",
        "content": "<p>A CLI tool that reads task definitions from YAML and executes them with dependency resolution and parallelism.</p><p>Supports watch mode, environment variable interpolation, and colored output.</p>",
        "technologies": ["Go", "YAML", "CLI"],
        "github_url": "https://github.com/example/task-runner",
        "image_url": None,
        "live_url": None,
        "is_published": True,
        "is_featured": False,
        "sort_order": 1,
    },
    {
        "title": "Neural Style Transfer",
        "summary": "A Python implementation of neural style transfer using PyTorch, with a web interface for uploading images.",
        "content": "<p>Apply the artistic style of one image to the content of another using convolutional neural networks.</p><p>The web interface lets you upload a content image and a style image, then generates the output in real time.</p>",
        "technologies": ["Python", "PyTorch", "Flask", "CSS"],
        "github_url": None,
        "image_url": None,
        "live_url": None,
        "is_published": True,
        "is_featured": True,
        "sort_order": 2,
    },
]

PAGES = [
    {
        "title": "About",
        "page_type": "about",
        "content": "<h2>About This Site</h2><p>This is a personal site for writing, projects, and experiments. Built with Next.js and FastAPI, it uses a dynamic sections system where all routing and rendering is driven by database configuration.</p><p>The architecture is designed so that adding a new content type requires only a component and a registry entry — no new route files.</p>",
        "is_published": True,
    },
    {
        "title": "Contact",
        "page_type": "contact",
        "content": "<h2>Get in Touch</h2><p>You can reach me at <strong>hello@example.com</strong> or find me on GitHub.</p>",
        "is_published": True,
    },
]


def upgrade(db: "pymongo.database.Database"):
    mongo_uri = os.getenv("MONGO_URI", "")
    if "localhost" not in mongo_uri and "127.0.0.1" not in mongo_uri:
        print("Skipping test seed data (not a local database)")
        return

    sections = db["sections"]
    stories_coll = db["stories"]
    projects_coll = db["projects"]
    pages_coll = db["pages"]
    users_coll = db["users"]

    admin = users_coll.find_one({"role": "admin"})
    user_id = str(admin["_id"]) if admin else None

    blog_section = sections.find_one({"slug": "blog", "is_deleted": False})
    projects_section = sections.find_one({"slug": "projects", "is_deleted": False})
    about_section = sections.find_one({"slug": "about", "is_deleted": False})
    contact_section = sections.find_one({"slug": "contact", "is_deleted": False})

    blog_section_id = str(blog_section["_id"]) if blog_section else None
    projects_section_id = str(projects_section["_id"]) if projects_section else None
    about_section_id = str(about_section["_id"]) if about_section else None
    contact_section_id = str(contact_section["_id"]) if contact_section else None

    now = datetime.now(timezone.utc)

    for i, story in enumerate(STORIES):
        slug = _slugify(story["title"])
        if stories_coll.find_one({"slug": slug}):
            continue
        stories_coll.insert_one(
            {
                **story,
                "slug": slug,
                "date": now - timedelta(days=len(STORIES) - i),
                "user_id": user_id,
                "section_id": blog_section_id,
                "is_deleted": False,
                "createdDate": now - timedelta(days=len(STORIES) - i),
                "updatedDate": now,
            }
        )

    for project in PROJECTS:
        slug = _slugify(project["title"])
        if projects_coll.find_one({"slug": slug}):
            continue
        projects_coll.insert_one(
            {
                **project,
                "slug": slug,
                "user_id": user_id,
                "section_id": projects_section_id,
                "is_deleted": False,
                "createdDate": now,
                "updatedDate": now,
            }
        )

    section_map = {"about": about_section_id, "contact": contact_section_id}
    for page in PAGES:
        if pages_coll.find_one({"page_type": page["page_type"]}):
            continue
        pages_coll.insert_one(
            {
                **page,
                "user_id": user_id,
                "section_id": section_map.get(page["page_type"]),
                "is_deleted": False,
                "createdDate": now,
                "updatedDate": now,
            }
        )


def downgrade(db: "pymongo.database.Database"):
    mongo_uri = os.getenv("MONGO_URI", "")
    if "localhost" not in mongo_uri and "127.0.0.1" not in mongo_uri:
        print("Skipping test seed data rollback (not a local database)")
        return

    story_slugs = [_slugify(s["title"]) for s in STORIES]
    db["stories"].delete_many({"slug": {"$in": story_slugs}})

    project_slugs = [_slugify(p["title"]) for p in PROJECTS]
    db["projects"].delete_many({"slug": {"$in": project_slugs}})

    page_types = [p["page_type"] for p in PAGES]
    db["pages"].delete_many({"page_type": {"$in": page_types}})
