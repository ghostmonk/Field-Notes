"""
Unit tests for utils module
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest
from bson import ObjectId
from models.story import StoryResponse
from utils import (
    find_many_and_convert,
    find_one_and_convert,
    generate_unique_slug,
    mongo_to_pydantic,
    slugify,
)


class MockAsyncIterator:
    """Helper class for creating async iterators in tests"""

    def __init__(self, docs):
        self.docs = list(docs)  # Make a copy to avoid mutation issues
        self.index = 0

    def __aiter__(self):
        return self

    async def __anext__(self):
        if self.index >= len(self.docs):
            raise StopAsyncIteration
        doc = self.docs[self.index]
        self.index += 1
        return doc


class MockCursor:
    """Mock MongoDB cursor that supports chaining and async iteration"""

    def __init__(self, docs):
        self.docs = list(docs)
        self.index = 0

    def sort(self, *args, **kwargs):
        """Return self for chaining"""
        return self

    def skip(self, n):
        """Return self for chaining"""
        return self

    def limit(self, n):
        """Return self for chaining"""
        return self

    async def to_list(self, length=None):
        """Return all docs as a list (motor cursor compatibility)"""
        return list(self.docs)

    def __aiter__(self):
        return self

    async def __anext__(self):
        if self.index >= len(self.docs):
            raise StopAsyncIteration
        doc = self.docs[self.index]
        self.index += 1
        return doc


class TestSlugify:
    """Test slugify function"""

    @pytest.mark.unit
    def test_slugify_basic(self):
        """Test basic slugification"""
        result = slugify("Hello World")
        assert result == "hello-world"

    @pytest.mark.unit
    def test_slugify_with_special_characters(self):
        """Test slugify removes special characters"""
        result = slugify("Hello, World! How are you?")
        assert result == "hello-world-how-are-you"

    @pytest.mark.unit
    def test_slugify_with_numbers(self):
        """Test slugify preserves numbers"""
        result = slugify("Test Story 123")
        assert result == "test-story-123"

    @pytest.mark.unit
    def test_slugify_multiple_spaces(self):
        """Test slugify handles multiple spaces"""
        result = slugify("Hello    World")
        assert result == "hello-world"

    @pytest.mark.unit
    def test_slugify_consecutive_hyphens(self):
        """Test slugify handles consecutive special characters"""
        result = slugify("Hello---World!!!")
        assert result == "hello-world"

    @pytest.mark.unit
    def test_slugify_leading_trailing_spaces(self):
        """Test slugify removes leading/trailing hyphens"""
        result = slugify("  Hello World  ")
        assert result == "hello-world"

    @pytest.mark.unit
    def test_slugify_empty_string(self):
        """Test slugify handles empty string"""
        result = slugify("")
        assert result == ""

    @pytest.mark.unit
    def test_slugify_only_special_characters(self):
        """Test slugify handles only special characters"""
        result = slugify("!@#$%^&*()")
        assert result == ""

    @pytest.mark.unit
    def test_slugify_unicode_characters(self):
        """Test slugify handles unicode characters"""
        result = slugify("Café München")
        assert result == "caf-mnchen"


class TestGenerateUniqueSlug:
    """Test generate_unique_slug function"""

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_generate_unique_slug_no_collision(self):
        """Test generate unique slug when no collision exists"""
        mock_collection = AsyncMock()
        mock_collection.find_one.return_value = None  # No existing slug

        result = await generate_unique_slug(mock_collection, "Test Story")

        assert result == "test-story"
        mock_collection.find_one.assert_called_once_with(
            {"slug": "test-story", "deleted": {"$ne": True}}
        )

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_generate_unique_slug_with_collision(self):
        """Test generate unique slug when collision exists"""
        mock_collection = AsyncMock()
        # First call returns existing document, second call returns None
        mock_collection.find_one.side_effect = [
            {"_id": ObjectId(), "slug": "test-story"},  # Collision
            None,  # No collision for test-story-2
        ]

        result = await generate_unique_slug(mock_collection, "Test Story")

        assert result == "test-story-2"
        assert mock_collection.find_one.call_count == 2

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_generate_unique_slug_multiple_collisions(self):
        """Test generate unique slug with multiple collisions"""
        mock_collection = AsyncMock()
        # Multiple collisions before finding unique slug
        mock_collection.find_one.side_effect = [
            {"_id": ObjectId(), "slug": "test-story"},  # Collision 1
            {"_id": ObjectId(), "slug": "test-story-2"},  # Collision 2
            {"_id": ObjectId(), "slug": "test-story-3"},  # Collision 3
            None,  # No collision for test-story-4
        ]

        result = await generate_unique_slug(mock_collection, "Test Story")

        assert result == "test-story-4"
        assert mock_collection.find_one.call_count == 4

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_generate_unique_slug_existing_id(self):
        """Test generate unique slug when updating existing story"""
        mock_collection = AsyncMock()
        existing_id = ObjectId()
        mock_collection.find_one.return_value = None

        result = await generate_unique_slug(mock_collection, "Test Story", existing_id=existing_id)

        assert result == "test-story"
        mock_collection.find_one.assert_called_once_with(
            {"slug": "test-story", "deleted": {"$ne": True}, "_id": {"$ne": existing_id}}
        )

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_generate_unique_slug_empty_title(self):
        """Test generate unique slug with empty title"""
        mock_collection = AsyncMock()
        mock_collection.find_one.return_value = None

        result = await generate_unique_slug(mock_collection, "")

        assert result == ""
        mock_collection.find_one.assert_called_once_with({"slug": "", "deleted": {"$ne": True}})

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_generate_unique_slug_special_characters_only(self):
        """Test generate unique slug with title containing only special characters"""
        mock_collection = AsyncMock()
        mock_collection.find_one.return_value = None

        result = await generate_unique_slug(mock_collection, "!@#$%^&*()")

        assert result == ""

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_generate_unique_slug_high_collision_count(self):
        """Test generate unique slug with high number of collisions (stress test)"""
        mock_collection = AsyncMock()
        # Simulate 10 collisions before finding unique slug
        collisions = [{"_id": ObjectId(), "slug": f"test-{i}"} for i in range(10)]
        mock_collection.find_one.side_effect = collisions + [None]

        result = await generate_unique_slug(mock_collection, "Test")

        assert result == "test-11"
        assert mock_collection.find_one.call_count == 11

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_generate_unique_slug_excludes_deleted_stories(self):
        """Test that slug generation properly excludes deleted stories in query"""
        mock_collection = AsyncMock()
        mock_collection.find_one.return_value = None

        await generate_unique_slug(mock_collection, "Test Story")

        # Verify the query includes deleted: {$ne: True}
        call_args = mock_collection.find_one.call_args[0][0]
        assert "deleted" in call_args
        assert call_args["deleted"] == {"$ne": True}

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_generate_unique_slug_update_same_slug(self):
        """Test updating a story with the same slug doesn't cause collision with itself"""
        mock_collection = AsyncMock()
        existing_id = ObjectId()
        # Simulate the story's own slug exists, but query excludes it by id
        mock_collection.find_one.return_value = None

        result = await generate_unique_slug(mock_collection, "My Story", existing_id=existing_id)

        assert result == "my-story"
        # Verify the query excludes the existing story's id
        call_args = mock_collection.find_one.call_args[0][0]
        assert "_id" in call_args
        assert call_args["_id"] == {"$ne": existing_id}


class TestMongoToPydantic:
    """Test mongo_to_pydantic function"""

    @pytest.mark.unit
    def test_mongo_to_pydantic_success(self):
        """Test successful conversion of MongoDB document to Pydantic model"""
        fixed_datetime = datetime(2025, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        object_id = ObjectId()
        mongo_doc = {
            "_id": object_id,
            "title": "Test Story",
            "content": "Test content",
            "is_published": True,
            "slug": "test-story",
            "date": fixed_datetime,
            "createdDate": fixed_datetime,
            "updatedDate": fixed_datetime,
        }

        result = mongo_to_pydantic(mongo_doc, StoryResponse)

        assert isinstance(result, StoryResponse)
        assert result.id == str(object_id)
        assert result.title == "Test Story"
        assert result.content == "Test content"
        assert result.is_published is True
        assert result.slug == "test-story"

    @pytest.mark.unit
    def test_mongo_to_pydantic_none_document(self):
        """Test mongo_to_pydantic with None document"""
        result = mongo_to_pydantic(None, StoryResponse)
        assert result is None

    @pytest.mark.unit
    def test_mongo_to_pydantic_no_id_field(self):
        """Test mongo_to_pydantic with document missing _id field"""
        fixed_datetime = datetime(2025, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        mongo_doc = {
            "title": "Test Story",
            "content": "Test content",
            "is_published": True,
            "slug": "test-story",
            "date": fixed_datetime,
            "createdDate": fixed_datetime,
            "updatedDate": fixed_datetime,
        }

        # This should fail since id is required in StoryResponse
        with pytest.raises(Exception):  # Pydantic validation error
            mongo_to_pydantic(mongo_doc, StoryResponse)


class TestFindOneAndConvert:
    """Test find_one_and_convert function"""

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_find_one_and_convert_success(self):
        """Test successful find and convert"""
        fixed_datetime = datetime(2025, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        object_id = ObjectId()
        mock_doc = {
            "_id": object_id,
            "title": "Test Story",
            "content": "Test content",
            "is_published": True,
            "slug": "test-story",
            "date": fixed_datetime,
            "createdDate": fixed_datetime,
            "updatedDate": fixed_datetime,
        }

        mock_collection = AsyncMock()
        mock_collection.find_one.return_value = mock_doc

        result = await find_one_and_convert(mock_collection, {"_id": object_id}, StoryResponse)

        assert isinstance(result, StoryResponse)
        assert result.title == "Test Story"
        mock_collection.find_one.assert_called_once_with({"_id": object_id})

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_find_one_and_convert_not_found(self):
        """Test find and convert when document not found"""
        mock_collection = AsyncMock()
        mock_collection.find_one.return_value = None

        result = await find_one_and_convert(mock_collection, {"_id": ObjectId()}, StoryResponse)

        assert result is None


class TestFindManyAndConvert:
    """Test find_many_and_convert function"""

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_find_many_and_convert_success(self):
        """Test successful find many and convert"""
        fixed_datetime = datetime(2025, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        mock_docs = [
            {
                "_id": ObjectId(),
                "title": "Story 1",
                "content": "Content 1",
                "is_published": True,
                "slug": "story-1",
                "date": fixed_datetime,
                "createdDate": fixed_datetime,
                "updatedDate": fixed_datetime,
            },
            {
                "_id": ObjectId(),
                "title": "Story 2",
                "content": "Content 2",
                "is_published": False,
                "slug": "story-2",
                "date": fixed_datetime,
                "createdDate": fixed_datetime,
                "updatedDate": fixed_datetime,
            },
        ]

        mock_cursor = MagicMock()
        mock_cursor.__aiter__ = lambda self: MockAsyncIterator(mock_docs)
        mock_cursor.sort.return_value = mock_cursor
        mock_cursor.skip.return_value = mock_cursor
        mock_cursor.limit.return_value = mock_cursor

        mock_collection = MagicMock()
        mock_collection.find.return_value = mock_cursor

        result = await find_many_and_convert(
            mock_collection,
            {"is_published": True},
            StoryResponse,
            sort={"createdDate": -1},
            limit=10,
            skip=5,
        )

        assert len(result) == 2
        assert all(isinstance(story, StoryResponse) for story in result)
        assert result[0].title == "Story 1"
        assert result[1].title == "Story 2"

        mock_collection.find.assert_called_once_with({"is_published": True}, None)
        mock_cursor.sort.assert_called_once_with({"createdDate": -1})
        mock_cursor.skip.assert_called_once_with(5)
        mock_cursor.limit.assert_called_once_with(10)

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_find_many_and_convert_empty_result(self):
        """Test find many and convert with empty result"""
        mock_cursor = MagicMock()
        mock_cursor.__aiter__ = lambda self: MockAsyncIterator([])

        mock_collection = MagicMock()
        mock_collection.find.return_value = mock_cursor

        result = await find_many_and_convert(mock_collection, {"is_published": True}, StoryResponse)

        assert result == []

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_find_many_and_convert_with_projection(self):
        """Test find many and convert with projection parameter"""
        fixed_datetime = datetime(2025, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        mock_docs = [
            {
                "_id": ObjectId(),
                "title": "Story 1",
                "content": "Content 1",
                "is_published": True,
                "slug": "story-1",
                "date": fixed_datetime,
                "createdDate": fixed_datetime,
                "updatedDate": fixed_datetime,
            },
        ]

        mock_cursor = MagicMock()
        mock_cursor.__aiter__ = lambda self: MockAsyncIterator(mock_docs)

        mock_collection = MagicMock()
        mock_collection.find.return_value = mock_cursor

        projection = {"title": 1, "slug": 1}
        result = await find_many_and_convert(
            mock_collection,
            {"is_published": True},
            StoryResponse,
            projection=projection,
        )

        assert len(result) == 1
        mock_collection.find.assert_called_once_with({"is_published": True}, projection)

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_find_many_and_convert_skip_zero_not_called(self):
        """Test that skip is not called when skip=0 (default)"""
        fixed_datetime = datetime(2025, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        mock_docs = [
            {
                "_id": ObjectId(),
                "title": "Story 1",
                "content": "Content 1",
                "is_published": True,
                "slug": "story-1",
                "date": fixed_datetime,
                "createdDate": fixed_datetime,
                "updatedDate": fixed_datetime,
            },
        ]

        mock_cursor = MagicMock()
        mock_cursor.__aiter__ = lambda self: MockAsyncIterator(mock_docs)

        mock_collection = MagicMock()
        mock_collection.find.return_value = mock_cursor

        # Call with skip=0 (default)
        await find_many_and_convert(
            mock_collection,
            {"is_published": True},
            StoryResponse,
        )

        # skip should not be called when skip=0 due to the `if skip:` check
        mock_cursor.skip.assert_not_called()
