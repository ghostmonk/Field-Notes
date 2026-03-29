"""
Redirect writing utilities for path changes.
"""

from datetime import datetime, timezone


async def write_redirect(
    db, old_path: str, new_path: str, content_id: str = None, content_type: str = None
):
    """Write a redirect and flatten any existing chains."""
    if old_path == new_path:
        return

    now = datetime.now(timezone.utc)

    await db["redirects"].update_one(
        {"old_path": old_path},
        {
            "$set": {
                "new_path": new_path,
                "content_id": content_id,
                "content_type": content_type,
            },
            "$setOnInsert": {
                "created_at": now,
            },
        },
        upsert=True,
    )

    # Flatten: update any existing redirects that pointed to old_path
    await db["redirects"].update_many(
        {"new_path": old_path},
        {"$set": {"new_path": new_path}},
    )

    # Clean up any self-redirects created by flattening
    await db["redirects"].delete_many({"$expr": {"$eq": ["$old_path", "$new_path"]}})
