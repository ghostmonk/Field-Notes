import re
from typing import List, Type, TypeVar

from motor.motor_asyncio import AsyncIOMotorCollection
from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)


def slugify(text: str) -> str:
    """
    Convert a string to a URL-friendly slug.
    - Convert to lowercase
    - Replace spaces with hyphens
    - Remove special characters
    - Handle consecutive hyphens
    """
    # Convert to lowercase
    text = text.lower()
    # Replace spaces with hyphens
    text = re.sub(r"\s+", "-", text)
    # Remove special characters (keep alphanumeric and hyphens)
    text = re.sub(r"[^a-z0-9-]", "", text)
    # Replace consecutive hyphens with a single hyphen
    text = re.sub(r"-+", "-", text)
    # Remove leading and trailing hyphens
    text = text.strip("-")
    return text


async def generate_unique_slug(collection, title: str, existing_id=None) -> str:
    """
    Generate a unique slug from a title. If the slug already exists,
    append a number to make it unique.
    """
    base_slug = slugify(title)
    slug = base_slug
    count = 1

    while True:
        # If we're updating an existing story, we don't want to compare with its own slug
        query = {"slug": slug, "deleted": {"$ne": True}}
        if existing_id:
            query["_id"] = {"$ne": existing_id}

        existing = await collection.find_one(query)
        if not existing:
            return slug

        # Slug exists, try with a number suffix
        count += 1
        slug = f"{base_slug}-{count}"


def mongo_to_pydantic(doc: dict, model_class: Type[T]) -> T:
    """
    Convert a MongoDB document to a Pydantic model.
    Handles ObjectId conversion to string for the id field.
    """
    if doc is None:
        return None

    if "_id" in doc and doc["_id"] is not None:
        doc["id"] = str(doc["_id"])
        del doc["_id"]

    return model_class.model_validate(doc)


async def find_one_and_convert(
    collection: AsyncIOMotorCollection, query: dict, model_class: Type[T]
) -> T:
    """
    Find one document and convert it to a Pydantic model.
    """
    doc = await collection.find_one(query)
    return mongo_to_pydantic(doc, model_class)


async def find_many_and_convert(
    collection: AsyncIOMotorCollection,
    query: dict,
    model_class: Type[T],
    sort: list = None,
    limit: int = None,
    skip: int = 0,
    projection: dict = None,
) -> List[T]:
    """
    Find many documents and convert them to Pydantic models.
    Supports pagination with limit and skip, and field projection for optimization.
    """
    cursor = collection.find(query, projection)
    if sort:
        cursor = cursor.sort(sort)

    if skip:
        cursor = cursor.skip(skip)

    if limit:
        cursor = cursor.limit(limit)

    return [mongo_to_pydantic(doc, model_class) async for doc in cursor]
