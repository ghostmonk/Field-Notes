"""
Database migrations for multi-tenancy support.
"""

import os
from datetime import datetime, timezone

from database import (
    get_collection,
    get_pages_collection,
    get_projects_collection,
    get_users_collection,
)
from glogger import logger

# Admin user email for data ownership (required environment variable)
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL")
if not ADMIN_EMAIL:
    raise ValueError("ADMIN_EMAIL environment variable is required")


async def run_migrations():
    """Run all pending migrations at startup."""
    await migrate_create_admin_user()
    await migrate_add_user_id_to_content()
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
