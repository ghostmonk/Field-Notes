"""
Add indexes for nested routing support.

- Backfills `path` field on existing sections (top-level sections get path = slug)
- Drops old global `slug` unique index on sections
- Creates unique index on `path` for sections
- Creates compound unique index on `(parent_id, slug)` for sections
- Creates compound unique index on `(section_id, slug)` for content collections
"""

import logging

name = "0016_nested_routing_indexes"
dependencies = ["0015_reorganize_assets_by_type"]

logger = logging.getLogger(__name__)


def upgrade(db):
    sections = db["sections"]

    # Backfill path on existing sections (all top-level, so path = slug)
    backfilled = 0
    for doc in sections.find({"path": {"$exists": False}}):
        slug = doc.get("slug", "")
        sections.update_one({"_id": doc["_id"]}, {"$set": {"path": slug}})
        backfilled += 1

    if backfilled:
        print(f"Backfilled path on {backfilled} sections")
        logger.info(f"Backfilled path on {backfilled} sections")

    # Drop old global slug unique index
    try:
        sections.drop_index("slug_1")
        print("Dropped old slug_1 unique index on sections")
        logger.info("Dropped old slug_1 unique index on sections")
    except Exception:
        print("No slug_1 index to drop on sections (already removed or never existed)")
        logger.info("No slug_1 index to drop on sections")

    # Create new indexes on sections
    sections.create_index([("path", 1)], unique=True)
    print("Created unique index on sections.path")
    logger.info("Created unique index on sections.path")

    sections.create_index([("parent_id", 1), ("slug", 1)], unique=True)
    print("Created unique compound index on sections.(parent_id, slug)")
    logger.info("Created unique compound index on sections.(parent_id, slug)")

    # Content collection indexes
    for coll_name in ["stories", "projects", "photo_essays"]:
        db[coll_name].create_index([("section_id", 1), ("slug", 1)], unique=True, sparse=True)
        print(f"Created unique compound index on {coll_name}.(section_id, slug)")
        logger.info(f"Created unique compound index on {coll_name}.(section_id, slug)")

    print("Migration 0016 complete")
    logger.info("Migration 0016 complete")


def downgrade(db):
    sections = db["sections"]

    # Drop new indexes
    try:
        sections.drop_index("path_1")
    except Exception:
        pass

    try:
        sections.drop_index("parent_id_1_slug_1")
    except Exception:
        pass

    # Restore old global slug unique index
    sections.create_index([("slug", 1)], unique=True)

    # Drop content collection compound indexes
    for coll_name in ["stories", "projects", "photo_essays"]:
        try:
            db[coll_name].drop_index("section_id_1_slug_1")
        except Exception:
            pass

    # Remove path field from sections
    sections.update_many({}, {"$unset": {"path": ""}})

    print("Migration 0016 downgraded")
    logger.info("Migration 0016 downgraded")
