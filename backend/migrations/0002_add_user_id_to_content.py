"""
Add user_id to all existing content (stories, pages, projects).
Associates existing content with the admin user.
"""

import os

import pymongo

name = "0002_add_user_id_to_content"
dependencies = ["0001_create_admin_user"]

ADMIN_EMAIL = os.getenv("ADMIN_EMAIL")


def upgrade(db: "pymongo.database.Database"):
    if not ADMIN_EMAIL:
        raise ValueError("ADMIN_EMAIL environment variable is required")

    admin = db["users"].find_one({"email": ADMIN_EMAIL})
    if not admin:
        raise ValueError("Admin user not found")

    admin_id = str(admin["_id"])

    db["stories"].update_many(
        {"user_id": {"$exists": False}},
        {"$set": {"user_id": admin_id}},
    )

    db["pages"].update_many(
        {"user_id": {"$exists": False}},
        {"$set": {"user_id": admin_id}},
    )

    db["projects"].update_many(
        {"user_id": {"$exists": False}},
        {"$set": {"user_id": admin_id}},
    )


def downgrade(db: "pymongo.database.Database"):
    db["stories"].update_many({}, {"$unset": {"user_id": ""}})
    db["pages"].update_many({}, {"$unset": {"user_id": ""}})
    db["projects"].update_many({}, {"$unset": {"user_id": ""}})
