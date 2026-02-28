"""
Create admin user if not exists.
"""

import os
from datetime import datetime, timezone

import pymongo

name = "0001_create_admin_user"
dependencies = []

ADMIN_EMAIL = os.getenv("ADMIN_EMAIL")


def upgrade(db: "pymongo.database.Database"):
    if not ADMIN_EMAIL:
        raise ValueError("ADMIN_EMAIL environment variable is required")

    users = db["users"]
    existing = users.find_one({"email": ADMIN_EMAIL})
    if existing:
        return

    current_time = datetime.now(timezone.utc)
    users.insert_one(
        {
            "email": ADMIN_EMAIL,
            "name": ADMIN_EMAIL.split("@")[0],
            "avatar_url": None,
            "role": "admin",
            "auth_providers": [],
            "createdDate": current_time,
            "updatedDate": current_time,
        }
    )


def downgrade(db: "pymongo.database.Database"):
    if not ADMIN_EMAIL:
        return
    db["users"].delete_one({"email": ADMIN_EMAIL})
