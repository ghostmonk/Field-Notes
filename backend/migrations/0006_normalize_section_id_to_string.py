"""
Convert any ObjectId section_id values to strings.

Migration 0004 originally stored section_id as ObjectId. The application
models expect strings. This migration normalizes all section_id fields
to strings for consistency. Idempotent — safe to run regardless of
whether 0004 ran before or after the fix.
"""

import pymongo

name = "0006_normalize_section_id_to_string"
dependencies = ["0004_backfill_section_id"]

COLLECTIONS = ["stories", "projects", "pages"]


def upgrade(db: "pymongo.database.Database"):
    for coll_name in COLLECTIONS:
        coll = db[coll_name]
        cursor = coll.find({"section_id": {"$type": "objectId"}})
        count = 0
        for doc in cursor:
            coll.update_one(
                {"_id": doc["_id"]},
                {"$set": {"section_id": str(doc["section_id"])}},
            )
            count += 1
        if count:
            print(f"Converted {count} ObjectId section_id values in {coll_name}")


def downgrade(db: "pymongo.database.Database"):
    # No rollback — string section_id is the correct format going forward
    pass
