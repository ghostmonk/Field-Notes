"""
API tests for Photo Essays endpoints.
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from bson import ObjectId
from tests.test_utils import MockCursor


class TestPhotoEssaysPublicEndpoints:
    """Test public photo essay endpoints (no auth required)"""

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_get_photo_essays_by_section_success(
        self, photo_essays_async_client, override_photo_essays_database, sample_photo_essay_data
    ):
        """Test successful retrieval of published photo essays for a section"""
        section_id = sample_photo_essay_data["section_id"]
        essay_id = ObjectId()
        test_essays = [
            {**sample_photo_essay_data, "_id": essay_id},
            {
                **sample_photo_essay_data,
                "_id": ObjectId(),
                "title": "Ocean Waves",
                "slug": "ocean-waves",
            },
        ]

        override_photo_essays_database.count_documents.return_value = 2
        override_photo_essays_database.find.return_value = MockCursor(test_essays)

        response = await photo_essays_async_client.get(f"/photo-essays/section/{section_id}")

        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert data["total"] == 2
        assert len(data["items"]) == 2

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_get_photo_essays_by_section_returns_only_published(
        self, photo_essays_async_client, override_photo_essays_database
    ):
        """Test that listing only returns published essays"""
        section_id = str(ObjectId())
        override_photo_essays_database.count_documents.return_value = 0
        override_photo_essays_database.find.return_value = MockCursor([])

        response = await photo_essays_async_client.get(f"/photo-essays/section/{section_id}")

        assert response.status_code == 200

        # Verify the query filters for is_published=True
        call_args = override_photo_essays_database.count_documents.call_args
        query = call_args[0][0]
        assert query["is_published"] is True
        assert query["deleted"] == {"$ne": True}

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_get_photo_essays_by_section_with_pagination(
        self, photo_essays_async_client, override_photo_essays_database
    ):
        """Test photo essays listing with pagination parameters"""
        section_id = str(ObjectId())
        override_photo_essays_database.count_documents.return_value = 100
        override_photo_essays_database.find.return_value = MockCursor([])

        response = await photo_essays_async_client.get(
            f"/photo-essays/section/{section_id}?limit=5&offset=10"
        )

        assert response.status_code == 200
        data = response.json()
        assert data["limit"] == 5
        assert data["offset"] == 10

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_get_photo_essay_by_id_success(
        self, photo_essays_async_client, override_photo_essays_database, sample_photo_essay_data
    ):
        """Test successful retrieval of a single photo essay with photos"""
        essay_id = ObjectId()
        override_photo_essays_database.find_one.return_value = {
            **sample_photo_essay_data,
            "_id": essay_id,
        }

        response = await photo_essays_async_client.get(f"/photo-essays/{essay_id}")

        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Mountain Landscapes"
        assert "photos" in data
        assert len(data["photos"]) == 2

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_get_photo_essay_by_id_not_found(
        self, photo_essays_async_client, override_photo_essays_database
    ):
        """Test 404 when photo essay doesn't exist"""
        essay_id = ObjectId()
        override_photo_essays_database.find_one.return_value = None

        response = await photo_essays_async_client.get(f"/photo-essays/{essay_id}")

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_get_photo_essay_invalid_id(
        self, photo_essays_async_client, override_photo_essays_database
    ):
        """Test 400 when essay ID is invalid"""
        response = await photo_essays_async_client.get("/photo-essays/invalid_id")
        assert response.status_code == 400


class TestPhotoEssaysAuthenticatedEndpoints:
    """Test authenticated photo essay endpoints"""

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_create_photo_essay_unauthorized(self, photo_essays_async_client):
        """Test creating photo essay without authorization"""
        response = await photo_essays_async_client.post(
            "/photo-essays",
            json={
                "title": "New Essay",
                "cover_image_url": "https://example.com/cover.jpg",
                "photos": [],
            },
        )
        assert response.status_code == 401

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_create_photo_essay_success(
        self,
        photo_essays_async_client,
        override_photo_essays_database,
        sample_photo_essay_data,
        mock_auth,
        auth_headers,
    ):
        """Test successful photo essay creation with auth"""
        essay_id = ObjectId()
        created_essay = {
            **sample_photo_essay_data,
            "_id": essay_id,
            "title": "New Essay",
            "slug": "new-essay",
        }

        override_photo_essays_database.find_one.side_effect = [None, created_essay]
        override_photo_essays_database.insert_one.return_value = MagicMock(inserted_id=essay_id)

        # Mock get_db for section lookup fallback
        section_id = ObjectId()
        mock_db = AsyncMock()
        mock_sections = AsyncMock()
        mock_sections.find_one = AsyncMock(
            return_value={"_id": section_id, "content_type": "photo_essay"}
        )
        mock_db.__getitem__ = lambda self, key: mock_sections

        with patch("handlers.photo_essays.get_db", return_value=mock_db):
            response = await photo_essays_async_client.post(
                "/photo-essays",
                json={
                    "title": "New Essay",
                    "cover_image_url": "https://example.com/cover.jpg",
                    "photos": [
                        {
                            "url": "https://example.com/p1.jpg",
                            "width": 800,
                            "height": 600,
                            "sort_order": 0,
                        }
                    ],
                },
                headers=auth_headers,
            )

        assert response.status_code == 201
        assert response.json()["title"] == "New Essay"

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_create_photo_essay_validation_error(
        self, photo_essays_async_client, mock_auth, auth_headers
    ):
        """Test photo essay creation with validation errors"""
        response = await photo_essays_async_client.post(
            "/photo-essays",
            json={"title": "", "cover_image_url": "https://example.com/cover.jpg"},
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_update_photo_essay_unauthorized(self, photo_essays_async_client):
        """Test updating photo essay without authorization"""
        response = await photo_essays_async_client.put(
            f"/photo-essays/{ObjectId()}", json={"title": "Updated"}
        )
        assert response.status_code == 401

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_update_photo_essay_success(
        self,
        photo_essays_async_client,
        override_photo_essays_database,
        sample_photo_essay_data,
        mock_auth,
        auth_headers,
    ):
        """Test successful photo essay update with auth"""
        essay_id = ObjectId()
        existing = {**sample_photo_essay_data, "_id": essay_id}
        updated = {
            **sample_photo_essay_data,
            "_id": essay_id,
            "title": "Updated Title",
            "slug": "updated-title",
        }

        # Order: 1) check exists, 2) slug check for generate_unique_slug, 3) fetch updated
        override_photo_essays_database.find_one.side_effect = [existing, None, updated]
        override_photo_essays_database.update_one.return_value = MagicMock(
            modified_count=1, matched_count=1
        )

        response = await photo_essays_async_client.put(
            f"/photo-essays/{essay_id}",
            json={"title": "Updated Title"},
            headers=auth_headers,
        )

        assert response.status_code == 200
        assert response.json()["title"] == "Updated Title"

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_update_photo_essay_not_found(
        self, photo_essays_async_client, override_photo_essays_database, mock_auth, auth_headers
    ):
        """Test updating non-existent photo essay"""
        override_photo_essays_database.find_one.return_value = None

        response = await photo_essays_async_client.put(
            f"/photo-essays/{ObjectId()}",
            json={"title": "Updated"},
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_delete_photo_essay_unauthorized(self, photo_essays_async_client):
        """Test deleting photo essay without authorization"""
        response = await photo_essays_async_client.delete(f"/photo-essays/{ObjectId()}")
        assert response.status_code == 401

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_delete_photo_essay_success(
        self,
        photo_essays_async_client,
        override_photo_essays_database,
        sample_photo_essay_data,
        mock_auth,
        auth_headers,
    ):
        """Test successful photo essay deletion with auth"""
        essay_id = ObjectId()
        override_photo_essays_database.find_one.return_value = {
            **sample_photo_essay_data,
            "_id": essay_id,
        }
        override_photo_essays_database.update_one.return_value = MagicMock(modified_count=1)

        response = await photo_essays_async_client.delete(
            f"/photo-essays/{essay_id}", headers=auth_headers
        )
        assert response.status_code == 204

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_delete_photo_essay_not_found(
        self, photo_essays_async_client, override_photo_essays_database, mock_auth, auth_headers
    ):
        """Test deleting non-existent photo essay"""
        override_photo_essays_database.find_one.return_value = None

        response = await photo_essays_async_client.delete(
            f"/photo-essays/{ObjectId()}", headers=auth_headers
        )
        assert response.status_code == 404
