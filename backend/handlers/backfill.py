from database import get_collection
from glogger import logger
from utils import generate_unique_slug


async def backfill_published_flag():
    """
    Set is_published=True for all existing stories that don't have this field.
    Runs once at application startup.
    """
    try:
        collection = await get_collection()
        cursor = collection.find({"is_published": {"$exists": False}})
        update_count = 0

        async for doc in cursor:
            result = await collection.update_one(
                {"_id": doc["_id"]}, {"$set": {"is_published": True}}
            )
            if result.modified_count:
                update_count += 1

        if update_count > 0:
            logger.info(f"Backfill: Updated {update_count} stories to set is_published=True")
        else:
            logger.info("Backfill: No stories needed is_published flag update")

        # Run the date fields backfill
        await backfill_date_fields()

        # Run the slug backfill
        await backfill_slugs()

        return update_count
    except Exception as e:
        logger.error("Error during backfill operation", exception=e)
        return 0


async def backfill_date_fields():
    """
    Add createdDate and updatedDate fields to existing stories.
    For existing stories, set both fields to the current date field value.
    Runs once at application startup.
    """
    try:
        collection = await get_collection()
        # Find stories that have a date field but no createdDate or updatedDate
        cursor = collection.find(
            {
                "date": {"$exists": True},
                "$or": [{"createdDate": {"$exists": False}}, {"updatedDate": {"$exists": False}}],
            }
        )
        update_count = 0

        async for doc in cursor:
            # Use the existing date field for both createdDate and updatedDate
            result = await collection.update_one(
                {"_id": doc["_id"]},
                {"$set": {"createdDate": doc.get("date"), "updatedDate": doc.get("date")}},
            )
            if result.modified_count:
                update_count += 1

        if update_count > 0:
            logger.info(
                f"Backfill: Updated {update_count} stories to add createdDate and updatedDate fields"
            )
        else:
            logger.info("Backfill: No stories needed date fields update")

        return update_count
    except Exception as e:
        logger.error("Error during date fields backfill operation", exception=e)
        return 0


async def backfill_slugs():
    """
    Generate and add slugs for all stories that don't have them.
    For existing stories, the slug is generated from the title.
    Runs once at application startup.
    """
    try:
        collection = await get_collection()
        # Find stories that don't have a slug field
        cursor = collection.find({"slug": {"$exists": False}, "deleted": {"$ne": True}})
        update_count = 0

        async for doc in cursor:
            # Generate a unique slug from the title
            slug = await generate_unique_slug(collection, doc.get("title", "untitled"))

            # Update the story with the new slug
            result = await collection.update_one({"_id": doc["_id"]}, {"$set": {"slug": slug}})

            if result.modified_count:
                update_count += 1
                logger.info(f"Backfill: Added slug '{slug}' to story '{doc.get('title')}'")

        if update_count > 0:
            logger.info(f"Backfill: Updated {update_count} stories to add slugs")
        else:
            logger.info("Backfill: No stories needed slugs")

        return update_count
    except Exception as e:
        logger.error("Error during slug backfill operation", exception=e)
        return 0
