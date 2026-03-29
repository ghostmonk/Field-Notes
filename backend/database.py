import asyncio
import os
from contextlib import asynccontextmanager

from glogger import logger
from motor.motor_asyncio import (
    AsyncIOMotorClient,
    AsyncIOMotorCollection,
    AsyncIOMotorDatabase,
)
from pymongo.errors import OperationFailure

client: AsyncIOMotorClient | None = None
_connection_lock = asyncio.Lock()


async def get_database() -> AsyncIOMotorDatabase:
    """Get database instance with optimized connection handling"""
    global client

    if not client:
        async with _connection_lock:
            if not client:  # Double-check pattern
                client = await _create_client()

    db_name = os.getenv("MONGO_DB_NAME", "ghostmonk")
    return client[db_name]


async def _create_client() -> AsyncIOMotorClient:
    """Create MongoDB client with connection pooling and optimizations.

    If MONGO_URI is set, uses it directly (for local dev or custom deployments).
    Otherwise, constructs an Atlas connection string from individual env vars.
    """
    mongo_uri = os.getenv("MONGO_URI")

    if not mongo_uri:
        user = _get_variable("MONGO_USER")
        password = _get_variable("MONGO_PASSWORD")
        cluster = _get_variable("MONGO_CLUSTER")
        app_name = _get_variable("MONGO_APP_NAME")
        host = _get_variable("MONGO_HOST")

        mongo_uri = (
            f"mongodb+srv://{user}:{password}@{cluster}.{host}/"
            f"?retryWrites=true&w=majority&appName={app_name}"
            f"&maxPoolSize=20"
            f"&minPoolSize=5"
            f"&maxIdleTimeMS=60000"
            f"&serverSelectionTimeoutMS=5000"
            f"&connectTimeoutMS=10000"
            f"&socketTimeoutMS=30000"
            f"&heartbeatFrequencyMS=10000"
        )

    try:
        new_client = AsyncIOMotorClient(mongo_uri)

        # Test the connection
        await new_client.admin.command("ping")
        logger.info("MongoDB connection established successfully")

        return new_client

    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {str(e)}")
        raise


async def get_db():
    """Legacy function for backward compatibility"""
    return await get_database()


@asynccontextmanager
async def get_database_context():
    """Context manager for database operations"""
    db = await get_database()
    try:
        yield db
    except Exception as e:
        logger.error(f"Database operation failed: {str(e)}")
        raise
    finally:
        # Connection cleanup is handled by the client pool
        pass


async def close_db_connection():
    """Close database connection gracefully"""
    global client
    if client:
        client.close()
        client = None
        logger.info("MongoDB connection closed")


async def get_collection() -> AsyncIOMotorCollection:
    db = await get_db()
    return db["stories"]


async def get_pages_collection() -> AsyncIOMotorCollection:
    db = await get_db()
    return db["pages"]


async def get_projects_collection() -> AsyncIOMotorCollection:
    db = await get_db()
    return db["projects"]


async def get_users_collection() -> AsyncIOMotorCollection:
    db = await get_db()
    return db["users"]


async def get_reactions_collection() -> AsyncIOMotorCollection:
    db = await get_db()
    return db["reactions"]


async def get_comments_collection() -> AsyncIOMotorCollection:
    db = await get_db()
    return db["comments"]


async def get_sections_collection() -> AsyncIOMotorCollection:
    db = await get_db()
    return db["sections"]


async def get_navlinks_collection() -> AsyncIOMotorCollection:
    db = await get_db()
    return db["navlinks"]


async def get_photo_essays_collection() -> AsyncIOMotorCollection:
    db = await get_db()
    return db["photo_essays"]


async def get_resumes_collection() -> AsyncIOMotorCollection:
    db = await get_db()
    return db["resumes"]


async def get_voice_feedback_collection() -> AsyncIOMotorCollection:
    db = await get_db()
    return db["voice_feedback"]


async def get_job_applications_collection() -> AsyncIOMotorCollection:
    db = await get_db()
    return db["job_applications"]


async def get_contact_messages_collection() -> AsyncIOMotorCollection:
    db = await get_db()
    return db["contact_messages"]


async def get_tags_collection() -> AsyncIOMotorCollection:
    db = await get_db()
    return db["tags"]


async def ensure_indexes() -> None:
    """Create database indexes for optimal query performance.

    Indexes are created with background=True to avoid blocking.
    Unique index creation may fail if duplicates exist - this is logged as an error
    and tracked, but does not prevent application startup.
    """
    db = await get_database()
    failed_indexes: list[str] = []

    async def safe_create_index(collection, keys, **kwargs) -> bool:
        """Create index, returning success status.

        Handles specific error cases:
        - Index already exists (code 85/86): Returns True (idempotent success)
        - Duplicate key errors: Returns False, logs error (data issue)
        - Other OperationFailure: Re-raised (permission issues, connection problems)

        Returns:
            True if index was created or already exists, False if creation failed.
        """
        index_name = kwargs.get("name", str(keys))
        try:
            await collection.create_index(keys, background=True, **kwargs)
            return True
        except OperationFailure as e:
            # Error codes: 85 = IndexOptionsConflict, 86 = IndexKeySpecsConflict
            # These mean index already exists with same/different options - not fatal
            if e.code in (85, 86):
                logger.debug(f"Index {index_name} already exists on {collection.name}")
                return True
            # Error code 11000 = DuplicateKey - data integrity issue
            elif e.code == 11000:
                logger.error(
                    f"FAILED to create unique index {index_name} on {collection.name}: "
                    f"duplicate values exist. Data must be fixed before index can be created."
                )
                return False
            else:
                # Connection issues, permission errors, etc. - re-raise
                logger.error(f"Failed to create index {index_name} on {collection.name}: {e}")
                raise
        except Exception as e:
            # Unexpected errors - log and re-raise
            logger.error(f"Unexpected error creating index {index_name} on {collection.name}: {e}")
            raise

    # Pages indexes
    pages = db["pages"]
    if not await safe_create_index(pages, "page_type", unique=True):
        failed_indexes.append("pages.page_type")
    await safe_create_index(pages, "is_published")
    await safe_create_index(pages, "user_id")
    await safe_create_index(pages, "section_id")
    await safe_create_index(pages, "tags")

    # Projects indexes
    projects = db["projects"]
    if not await safe_create_index(projects, "slug", unique=True):
        failed_indexes.append("projects.slug")
    if not await safe_create_index(
        projects, [("section_id", 1), ("slug", 1)], unique=True, sparse=True
    ):
        failed_indexes.append("projects.section_id_slug")
    await safe_create_index(projects, [("is_published", 1), ("is_featured", -1)])
    await safe_create_index(projects, [("is_published", 1), ("createdDate", -1)])
    await safe_create_index(projects, "user_id")
    await safe_create_index(projects, "section_id")
    await safe_create_index(projects, "tags")

    # Stories indexes
    stories = db["stories"]
    if not await safe_create_index(stories, "slug", unique=True):
        failed_indexes.append("stories.slug")
    if not await safe_create_index(
        stories, [("section_id", 1), ("slug", 1)], unique=True, sparse=True
    ):
        failed_indexes.append("stories.section_id_slug")
    await safe_create_index(stories, [("is_published", 1), ("date", -1)])
    await safe_create_index(stories, "user_id")
    await safe_create_index(stories, "section_id")
    await safe_create_index(stories, "tags")

    # Users indexes
    users = db["users"]
    if not await safe_create_index(users, "email", unique=True):
        failed_indexes.append("users.email")
    await safe_create_index(
        users,
        [("auth_providers.provider", 1), ("auth_providers.provider_user_id", 1)],
        name="auth_provider_lookup",
    )

    # Reactions indexes
    reactions = db["reactions"]
    await safe_create_index(reactions, [("target_type", 1), ("target_id", 1)])
    if not await safe_create_index(
        reactions,
        [("target_type", 1), ("target_id", 1), ("user_id", 1), ("reaction_tag", 1)],
        unique=True,
        name="unique_user_reaction",
    ):
        failed_indexes.append("reactions.unique_user_reaction")

    # Comments indexes
    comments = db["comments"]
    await safe_create_index(comments, [("target_type", 1), ("target_id", 1)])
    await safe_create_index(comments, "parent_id")

    # Sections indexes
    sections = db["sections"]
    if not await safe_create_index(sections, [("path", 1)], unique=True, sparse=True):
        failed_indexes.append("sections.path")
    if not await safe_create_index(sections, [("parent_id", 1), ("slug", 1)], unique=True):
        failed_indexes.append("sections.parent_id_slug")
    await safe_create_index(sections, [("nav_visibility", 1), ("sort_order", 1)])
    await safe_create_index(sections, [("parent_id", 1), ("sort_order", 1)])
    await safe_create_index(sections, [("is_published", 1), ("sort_order", 1)])

    # NavLinks indexes
    navlinks = db["navlinks"]
    await safe_create_index(navlinks, [("sort_order", 1)])
    await safe_create_index(navlinks, "is_published")

    # Photo essays indexes
    photo_essays = db["photo_essays"]
    if not await safe_create_index(photo_essays, "slug", unique=True):
        failed_indexes.append("photo_essays.slug")
    if not await safe_create_index(
        photo_essays, [("section_id", 1), ("slug", 1)], unique=True, sparse=True
    ):
        failed_indexes.append("photo_essays.section_id_slug")
    await safe_create_index(
        photo_essays,
        [("section_id", 1), ("is_published", 1), ("deleted", 1), ("createdDate", -1)],
        name="photo_essays_section_listing",
    )
    await safe_create_index(photo_essays, "user_id")
    await safe_create_index(photo_essays, "tags")

    # Resumes indexes
    resumes = db["resumes"]
    if not await safe_create_index(resumes, "user_id", unique=True):
        failed_indexes.append("resumes.user_id")

    # Content versions indexes
    content_versions = db["content_versions"]
    if not await safe_create_index(
        content_versions,
        [("content_id", 1), ("version", -1)],
        unique=True,
        name="content_versions_lookup",
    ):
        failed_indexes.append("content_versions.content_versions_lookup")
    await safe_create_index(
        content_versions,
        [("content_type", 1), ("content_id", 1)],
        name="content_versions_by_type",
    )

    # GitHub cache indexes
    github_cache = db["github_cache"]
    if not await safe_create_index(github_cache, "key", unique=True):
        failed_indexes.append("github_cache.key")

    # Content chunks indexes (collection populated by seed script)
    content_chunks = db["content_chunks"]
    await safe_create_index(content_chunks, "chunk_type")
    await safe_create_index(content_chunks, "source")
    await safe_create_index(
        content_chunks, "qdrant_id", unique=True, sparse=True, name="content_chunks_qdrant_id"
    )

    # Job applications indexes
    job_applications = db["job_applications"]
    await safe_create_index(job_applications, "user_id")
    await safe_create_index(job_applications, "status")
    await safe_create_index(
        job_applications,
        [("user_id", 1), ("created_at", -1)],
        name="user_id_created_at",
    )

    # Contact messages indexes
    contact_messages = db["contact_messages"]
    await safe_create_index(contact_messages, "ip_hash")
    await safe_create_index(
        contact_messages,
        [("created_at", -1)],
        name="contact_messages_created_at",
    )

    # Voice feedback indexes
    voice_feedback = db["voice_feedback"]
    await safe_create_index(voice_feedback, "user_id")
    await safe_create_index(voice_feedback, "feedback_type")
    await safe_create_index(voice_feedback, "job_context")

    # Tags indexes
    tags = db["tags"]
    if not await safe_create_index(tags, "name", unique=True, name="tags_name_unique"):
        failed_indexes.append("tags.name")

    if failed_indexes:
        logger.error(
            f"Database startup completed with {len(failed_indexes)} failed index(es): "
            f"{', '.join(failed_indexes)}. Application may have degraded performance or "
            f"data integrity issues until these are resolved."
        )
    else:
        logger.info("Database indexes ensured")


def _get_variable(key: str) -> str:
    output = os.getenv(key)
    if not output:
        raise ValueError(f"{key} environment variable is not set.")
    return output
