from datetime import datetime, timezone

from database import get_db
from pymongo.errors import DuplicateKeyError


async def save_version(
    content_id: str,
    content_type: str,
    title: str,
    content: str,
    user_id: str,
    metadata: dict | None = None,
):
    """Save a new version snapshot. Called from story/project update handlers.

    Uses a retry loop to handle race conditions on the unique compound index
    (content_id, version). If two concurrent updates read the same latest
    version, one insert will fail with DuplicateKeyError, and the retry
    will re-read and increment.
    """
    db = await get_db()
    max_attempts = 3

    for attempt in range(max_attempts):
        latest = await db.content_versions.find_one(
            {"content_id": content_id, "content_type": content_type},
            sort=[("version", -1)],
        )
        version_num = (latest["version"] + 1) if latest else 1

        try:
            await db.content_versions.insert_one(
                {
                    "content_id": content_id,
                    "content_type": content_type,
                    "version": version_num,
                    "title": title,
                    "content": content,
                    "metadata": metadata or {},
                    "created_by": user_id,
                    "created_at": datetime.now(timezone.utc),
                }
            )
            return version_num
        except DuplicateKeyError:
            if attempt == max_attempts - 1:
                raise
