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
    """Create MongoDB client with connection pooling and optimizations"""

    user = _get_variable("MONGO_USER")
    password = _get_variable("MONGO_PASSWORD")
    cluster = _get_variable("MONGO_CLUSTER")
    app_name = _get_variable("MONGO_APP_NAME")
    host = _get_variable("MONGO_HOST")

    # Optimized connection string with connection pooling
    mongo_uri = (
        f"mongodb+srv://{user}:{password}@{cluster}.{host}/"
        f"?retryWrites=true&w=majority&appName={app_name}"
        f"&maxPoolSize=20"  # Max connections in pool
        f"&minPoolSize=5"  # Min connections to maintain
        f"&maxIdleTimeMS=60000"  # Close connections after 1 minute idle
        f"&serverSelectionTimeoutMS=5000"  # 5 second timeout
        f"&connectTimeoutMS=10000"  # 10 second connection timeout
        f"&socketTimeoutMS=30000"  # 30 second socket timeout
        f"&heartbeatFrequencyMS=10000"  # Heartbeat every 10 seconds
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

    # Projects indexes
    projects = db["projects"]
    if not await safe_create_index(projects, "slug", unique=True):
        failed_indexes.append("projects.slug")
    await safe_create_index(projects, [("is_published", 1), ("is_featured", -1)])
    await safe_create_index(projects, [("is_published", 1), ("createdDate", -1)])
    await safe_create_index(projects, "user_id")

    # Stories indexes
    stories = db["stories"]
    if not await safe_create_index(stories, "slug", unique=True):
        failed_indexes.append("stories.slug")
    await safe_create_index(stories, [("is_published", 1), ("date", -1)])
    await safe_create_index(stories, "user_id")

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
    if not await safe_create_index(sections, "slug", unique=True):
        failed_indexes.append("sections.slug")
    await safe_create_index(sections, "parent_id")
    await safe_create_index(sections, [("nav_visibility", 1), ("sort_order", 1)])
    await safe_create_index(sections, [("is_published", 1), ("sort_order", 1)])

    # NavLinks indexes
    navlinks = db["navlinks"]
    await safe_create_index(navlinks, [("sort_order", 1)])
    await safe_create_index(navlinks, "is_published")

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
