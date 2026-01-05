"""
Database migrations for multi-tenancy support.
"""

import os
from datetime import datetime, timezone

from database import (
    get_collection,
    get_pages_collection,
    get_projects_collection,
    get_sections_collection,
    get_users_collection,
)
from glogger import logger

# Admin user email for data ownership (required environment variable)
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL")
if not ADMIN_EMAIL:
    raise ValueError("ADMIN_EMAIL environment variable is required")

# Initial sections matching hardcoded frontend SECTIONS array
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


async def run_migrations():
    """Run all pending migrations at startup."""
    await migrate_create_admin_user()
    await migrate_add_user_id_to_content()
    await migrate_seed_initial_sections()
    await migrate_backfill_section_id()
    logger.info("Migrations completed")


async def migrate_create_admin_user() -> str | None:
    """
    Migration: Create the admin user if not exists.
    This ensures the admin user exists before assigning content ownership.

    Returns the admin user ID if successful, None otherwise.
    """
    try:
        users_collection = await get_users_collection()

        # Check if admin user exists
        existing_admin = await users_collection.find_one({"email": ADMIN_EMAIL})

        if existing_admin:
            logger.info(f"Migration: Admin user already exists with ID {existing_admin['_id']}")
            return str(existing_admin["_id"])

        # Create admin user (name will be updated on first OAuth login)
        current_time = datetime.now(timezone.utc)
        admin_user = {
            "email": ADMIN_EMAIL,
            "name": ADMIN_EMAIL.split("@")[0],
            "avatar_url": None,
            "role": "admin",
            "auth_providers": [],  # Will be populated on first login
            "createdDate": current_time,
            "updatedDate": current_time,
        }

        result = await users_collection.insert_one(admin_user)
        logger.info(f"Migration: Created admin user with ID {result.inserted_id}")

        return str(result.inserted_id)

    except Exception:
        logger.exception("Error creating admin user")
        return None


async def migrate_add_user_id_to_content():
    """
    Migration: Add user_id to all existing content (stories, pages, projects).
    Associates all existing content with the admin user.
    """
    try:
        users_collection = await get_users_collection()

        # Get admin user ID
        admin_user = await users_collection.find_one({"email": ADMIN_EMAIL})
        if not admin_user:
            logger.error("Migration: Admin user not found, cannot assign content ownership")
            return

        admin_id = str(admin_user["_id"])

        # Migrate stories
        stories_collection = await get_collection()
        stories_result = await stories_collection.update_many(
            {"user_id": {"$exists": False}},
            {"$set": {"user_id": admin_id}},
        )
        if stories_result.modified_count > 0:
            logger.info(f"Migration: Added user_id to {stories_result.modified_count} stories")

        # Migrate pages
        pages_collection = await get_pages_collection()
        pages_result = await pages_collection.update_many(
            {"user_id": {"$exists": False}},
            {"$set": {"user_id": admin_id}},
        )
        if pages_result.modified_count > 0:
            logger.info(f"Migration: Added user_id to {pages_result.modified_count} pages")

        # Migrate projects
        projects_collection = await get_projects_collection()
        projects_result = await projects_collection.update_many(
            {"user_id": {"$exists": False}},
            {"$set": {"user_id": admin_id}},
        )
        if projects_result.modified_count > 0:
            logger.info(f"Migration: Added user_id to {projects_result.modified_count} projects")

        logger.info("Migration: Content ownership migration completed")

    except Exception:
        logger.exception("Error during content ownership migration")


async def migrate_seed_initial_sections():
    """
    Migration: Seed initial sections from hardcoded structure.
    Idempotent - skips if sections already exist.
    """
    try:
        sections_collection = await get_sections_collection()

        existing_count = await sections_collection.count_documents({"is_deleted": False})
        if existing_count > 0:
            logger.info(f"Migration: {existing_count} sections already exist, skipping seed")
            return

        current_time = datetime.now(timezone.utc)
        sections_to_insert = []
        for section in INITIAL_SECTIONS:
            section_with_timestamps = {
                **section,
                "createdDate": current_time,
                "updatedDate": current_time,
            }
            sections_to_insert.append(section_with_timestamps)

        result = await sections_collection.insert_many(sections_to_insert)
        logger.info(f"Migration: Seeded {len(result.inserted_ids)} initial sections")

    except Exception:
        logger.exception("Error seeding initial sections")


async def migrate_backfill_section_id():
    """
    Migration: Backfill section_id on existing content.
    - Stories -> blog section
    - Projects -> projects section
    - Pages -> about or contact section (based on page_type)
    """
    try:
        sections_collection = await get_sections_collection()

        # Backfill stories with blog section
        blog_section = await sections_collection.find_one({"slug": "blog", "is_deleted": False})
        if blog_section:
            stories_collection = await get_collection()
            result = await stories_collection.update_many(
                {"section_id": {"$exists": False}},
                {"$set": {"section_id": str(blog_section["_id"])}},
            )
            if result.modified_count > 0:
                logger.info(f"Migration: Backfilled section_id on {result.modified_count} stories")
        else:
            logger.warning("Migration: Blog section not found, skipping story backfill")

        # Backfill projects with projects section
        projects_section = await sections_collection.find_one(
            {"slug": "projects", "is_deleted": False}
        )
        if projects_section:
            projects_collection = await get_projects_collection()
            result = await projects_collection.update_many(
                {"section_id": {"$exists": False}},
                {"$set": {"section_id": str(projects_section["_id"])}},
            )
            if result.modified_count > 0:
                logger.info(f"Migration: Backfilled section_id on {result.modified_count} projects")
        else:
            logger.warning("Migration: Projects section not found, skipping project backfill")

        # Backfill pages by page_type
        pages_collection = await get_pages_collection()

        about_section = await sections_collection.find_one({"slug": "about", "is_deleted": False})
        if about_section:
            result = await pages_collection.update_many(
                {"page_type": "about", "section_id": {"$exists": False}},
                {"$set": {"section_id": str(about_section["_id"])}},
            )
            if result.modified_count > 0:
                logger.info(
                    f"Migration: Backfilled section_id on {result.modified_count} about pages"
                )

        contact_section = await sections_collection.find_one(
            {"slug": "contact", "is_deleted": False}
        )
        if contact_section:
            result = await pages_collection.update_many(
                {"page_type": "contact", "section_id": {"$exists": False}},
                {"$set": {"section_id": str(contact_section["_id"])}},
            )
            if result.modified_count > 0:
                logger.info(
                    f"Migration: Backfilled section_id on {result.modified_count} contact pages"
                )

        logger.info("Migration: Section ID backfill completed")

    except Exception:
        logger.exception("Error backfilling section_id")
