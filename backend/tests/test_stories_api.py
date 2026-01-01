"""
Integration tests for Stories API endpoints
"""

from datetime import datetime, timezone

import pytest
from bson import ObjectId
from httpx import AsyncClient
from tests.test_utils import MockCursor


class TestStoriesPublicEndpoints:
    """Test public story endpoints (no auth required)"""

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_get_stories_success(self, async_client: AsyncClient, override_database):
        """Test successful retrieval of published stories"""
        # Use fixed datetime for consistent testing
        now = datetime(2025, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        test_stories = [
            {
                "_id": ObjectId(),
                "title": "Published Story 1",
                "content": "Content 1",
                "is_published": True,
                "slug": "published-story-1",
                "date": now,
                "createdDate": now,
                "updatedDate": now,
                "deleted": False,
            },
            {
                "_id": ObjectId(),
                "title": "Published Story 2",
                "content": "Content 2",
                "is_published": True,
                "slug": "published-story-2",
                "date": now,
                "createdDate": now,
                "updatedDate": now,
                "deleted": False,
            },
        ]

        # Configure the mock collection provided by the fixture
        override_database.count_documents.return_value = 2
        # Use MockCursor for proper cursor chaining and async iteration
        override_database.find.return_value = MockCursor(test_stories)

        response = await async_client.get("/stories")

        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert data["total"] == 2
        assert len(data["items"]) == 2

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_get_stories_with_pagination(self, async_client: AsyncClient, override_database):
        """Test stories endpoint with pagination parameters"""
        # Configure the mock collection provided by the fixture
        override_database.count_documents.return_value = 100
        override_database.find.return_value = MockCursor([])

        response = await async_client.get("/stories?limit=5&offset=10")

        assert response.status_code == 200
        data = response.json()
        assert data["limit"] == 5
        assert data["offset"] == 10

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_get_stories_invalid_pagination(self, async_client: AsyncClient):
        """Test stories endpoint with invalid pagination parameters"""
        # Test negative limit
        response = await async_client.get("/stories?limit=-1")
        assert response.status_code == 422

        # Test limit too high
        response = await async_client.get("/stories?limit=100")
        assert response.status_code == 422

        # Test negative offset
        response = await async_client.get("/stories?offset=-1")
        assert response.status_code == 422

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_get_story_by_slug_success(self, async_client: AsyncClient, override_database):
        """Test successful retrieval of story by slug"""
        # Use fixed datetime for consistent testing
        now = datetime(2025, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        test_story = {
            "_id": ObjectId(),
            "title": "Test Story",
            "content": "Test content",
            "is_published": True,
            "slug": "test-story",
            "date": now,
            "createdDate": now,
            "updatedDate": now,
        }

        # Configure the mock collection provided by the fixture
        override_database.find_one.return_value = test_story

        response = await async_client.get("/stories/slug/test-story")

        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Test Story"
        assert data["slug"] == "test-story"

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_get_story_by_slug_not_found(self, async_client: AsyncClient, override_database):
        """Test retrieval of non-existent story by slug"""
        # Configure the mock collection provided by the fixture
        override_database.find_one.return_value = None

        response = await async_client.get("/stories/slug/non-existent")

        assert response.status_code == 404
        data = response.json()
        assert "not found" in data["detail"].lower()


class TestStoriesAuthenticatedEndpoints:
    """Test authenticated story endpoints"""

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_get_story_by_id_unauthorized(self, async_client: AsyncClient):
        """Test accessing story by ID without authorization"""
        story_id = str(ObjectId())
        response = await async_client.get(f"/stories/{story_id}")

        assert response.status_code == 401
        data = response.json()
        assert "authorization" in data["detail"].lower()

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_get_story_by_id_success(
        self, async_client: AsyncClient, override_database, mock_auth
    ):
        """Test successful retrieval of story by ID with auth"""
        # Use fixed datetime for consistent testing
        now = datetime(2025, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        story_id = ObjectId()
        test_story = {
            "_id": story_id,
            "title": "Test Story",
            "content": "Test content",
            "is_published": True,
            "slug": "test-story",
            "date": now,
            "createdDate": now,
            "updatedDate": now,
        }

        # Configure the mock collection provided by the fixture
        override_database.find_one.return_value = test_story

        response = await async_client.get(
            f"/stories/{str(story_id)}", headers={"Authorization": "Bearer valid_token"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Test Story"

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_get_story_by_id_invalid_id(
        self, async_client: AsyncClient, override_database, mock_auth
    ):
        """Test retrieval with invalid ObjectId format"""
        response = await async_client.get(
            "/stories/invalid_id", headers={"Authorization": "Bearer valid_token"}
        )

        assert response.status_code == 400
        data = response.json()
        assert "invalid" in data["detail"].lower()

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_create_story_unauthorized(self, async_client: AsyncClient):
        """Test creating story without authorization"""
        story_data = {"title": "New Story", "content": "New content", "is_published": True}

        response = await async_client.post("/stories", json=story_data)

        assert response.status_code == 401

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_create_story_success(
        self, async_client: AsyncClient, override_database, mock_auth
    ):
        """Test successful story creation with auth"""
        story_data = {"title": "New Story", "content": "New content", "is_published": True}

        # Use fixed datetime for consistent testing
        now = datetime(2025, 1, 1, 12, 0, 0, tzinfo=timezone.utc)

        created_story = {
            "_id": ObjectId(),
            "title": "New Story",
            "content": "New content",
            "is_published": True,
            "slug": "new-story",
            "date": now,
            "createdDate": now,
            "updatedDate": now,
        }

        # Configure the mock collection provided by the fixture
        override_database.find_one.return_value = None  # No existing slug
        override_database.insert_one.return_value.inserted_id = ObjectId()
        override_database.find_one.side_effect = [
            None,
            created_story,
        ]  # First None for slug check, then return story

        response = await async_client.post(
            "/stories", json=story_data, headers={"Authorization": "Bearer valid_token"}
        )

        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "New Story"

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_create_story_validation_error(
        self, async_client: AsyncClient, override_database, mock_auth
    ):
        """Test story creation with validation errors"""
        invalid_story_data = {
            "title": "",  # Empty title should fail validation
            "content": "Content",
            "is_published": True,
        }

        response = await async_client.post(
            "/stories", json=invalid_story_data, headers={"Authorization": "Bearer valid_token"}
        )

        assert response.status_code == 422

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_update_story_unauthorized(self, async_client: AsyncClient):
        """Test updating story without authorization"""
        story_id = str(ObjectId())
        story_data = {"title": "Updated Story", "content": "Updated content", "is_published": True}

        response = await async_client.put(f"/stories/{story_id}", json=story_data)

        assert response.status_code == 401

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_delete_story_unauthorized(self, async_client: AsyncClient):
        """Test deleting story without authorization"""
        story_id = str(ObjectId())

        response = await async_client.delete(f"/stories/{story_id}")

        assert response.status_code == 401

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_delete_story_success(
        self, async_client: AsyncClient, override_database, mock_auth
    ):
        """Test successful story deletion with auth"""
        story_id = ObjectId()

        # Use fixed datetime for consistent testing
        now = datetime(2025, 1, 1, 12, 0, 0, tzinfo=timezone.utc)

        existing_story = {
            "_id": story_id,
            "title": "Story to Delete",
            "content": "Content",
            "is_published": True,
            "slug": "story-to-delete",
            "date": now,
            "createdDate": now,
            "updatedDate": now,
        }

        # Configure the mock collection provided by the fixture
        override_database.find_one.return_value = existing_story
        override_database.update_one.return_value.modified_count = 1

        response = await async_client.delete(
            f"/stories/{str(story_id)}", headers={"Authorization": "Bearer valid_token"}
        )

        assert response.status_code == 204  # No content for successful deletion

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_delete_story_not_found(
        self, async_client: AsyncClient, override_database, mock_auth
    ):
        """Test deleting non-existent story"""
        story_id = ObjectId()

        # Configure the mock collection provided by the fixture
        override_database.find_one.return_value = None  # Story not found

        response = await async_client.delete(
            f"/stories/{str(story_id)}", headers={"Authorization": "Bearer valid_token"}
        )

        assert response.status_code == 404
