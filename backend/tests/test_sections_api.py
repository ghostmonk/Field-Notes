"""
API tests for Sections endpoints.
"""

from unittest.mock import MagicMock

import pytest
from bson import ObjectId
from tests.test_utils import MockCursor


class TestSectionsPublicEndpoints:
    """Test public section endpoints (no auth required)"""

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_get_sections_success(
        self, sections_async_client, override_sections_database, sample_section_data
    ):
        """Test successful retrieval of published sections"""
        section_id = ObjectId()
        test_sections = [
            {**sample_section_data, "_id": section_id},
            {
                **sample_section_data,
                "_id": ObjectId(),
                "title": "Second Section",
                "slug": "second-section",
                "nav_visibility": "secondary",
            },
        ]

        override_sections_database.count_documents.return_value = 2
        override_sections_database.find.return_value = MockCursor(test_sections)

        response = await sections_async_client.get("/sections")

        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert data["total"] == 2
        assert len(data["items"]) == 2

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_get_sections_empty_list(self, sections_async_client, override_sections_database):
        """Test sections endpoint returns empty list when no sections exist"""
        override_sections_database.count_documents.return_value = 0
        override_sections_database.find.return_value = MockCursor([])

        response = await sections_async_client.get("/sections")

        assert response.status_code == 200
        data = response.json()
        assert data["items"] == []
        assert data["total"] == 0

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_get_sections_with_pagination(
        self, sections_async_client, override_sections_database
    ):
        """Test sections endpoint with pagination parameters"""
        override_sections_database.count_documents.return_value = 100
        override_sections_database.find.return_value = MockCursor([])

        response = await sections_async_client.get("/sections?limit=5&offset=10")

        assert response.status_code == 200
        data = response.json()
        assert data["limit"] == 5
        assert data["offset"] == 10

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_get_sections_filter_by_parent_id(
        self, sections_async_client, override_sections_database, sample_section_data
    ):
        """Test sections endpoint filtering by parent_id"""
        parent_id = str(ObjectId())
        child_section = {
            **sample_section_data,
            "_id": ObjectId(),
            "parent_id": parent_id,
        }
        override_sections_database.count_documents.return_value = 1
        override_sections_database.find.return_value = MockCursor([child_section])

        response = await sections_async_client.get(f"/sections?parent_id={parent_id}")

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_get_sections_filter_by_nav_visibility(
        self, sections_async_client, override_sections_database, sample_section_data
    ):
        """Test sections endpoint filtering by nav_visibility"""
        main_section = {**sample_section_data, "_id": ObjectId()}
        override_sections_database.count_documents.return_value = 1
        override_sections_database.find.return_value = MockCursor([main_section])

        response = await sections_async_client.get("/sections?nav_visibility=main")

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_get_section_by_id_success(
        self,
        sections_async_client,
        override_sections_database,
        sample_section_data,
        mock_auth,
        auth_headers,
    ):
        """Test successful retrieval of section by ID with auth"""
        section_id = ObjectId()
        override_sections_database.find_one.return_value = {
            **sample_section_data,
            "_id": section_id,
        }

        response = await sections_async_client.get(f"/sections/{section_id}", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Blog"
        assert data["slug"] == "blog"

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_get_section_by_id_unauthorized(self, sections_async_client):
        """Test accessing section by ID without authorization"""
        response = await sections_async_client.get(f"/sections/{ObjectId()}")
        assert response.status_code == 401

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_get_section_by_id_invalid_id(
        self, sections_async_client, mock_auth, auth_headers
    ):
        """Test retrieval with invalid ObjectId format"""
        response = await sections_async_client.get("/sections/invalid_id", headers=auth_headers)
        assert response.status_code == 400

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_get_section_by_id_not_found(
        self, sections_async_client, override_sections_database, mock_auth, auth_headers
    ):
        """Test 404 when section doesn't exist by ID"""
        override_sections_database.find_one.return_value = None

        response = await sections_async_client.get(f"/sections/{ObjectId()}", headers=auth_headers)

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_get_section_by_slug_success(
        self, sections_async_client, override_sections_database, sample_section_data
    ):
        """Test successful retrieval of section by slug"""
        section_id = ObjectId()
        override_sections_database.find_one.return_value = {
            **sample_section_data,
            "_id": section_id,
        }

        response = await sections_async_client.get("/sections/by-slug/blog")

        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Blog"
        assert data["slug"] == "blog"

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_get_section_by_slug_not_found(
        self, sections_async_client, override_sections_database
    ):
        """Test 404 when section doesn't exist by slug"""
        override_sections_database.find_one.return_value = None

        response = await sections_async_client.get("/sections/by-slug/non-existent")

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()


class TestCreateSection:
    """Tests for POST /sections endpoint."""

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_create_section_success(
        self,
        sections_async_client,
        override_sections_database,
        sample_section_data,
        mock_auth,
        auth_headers,
    ):
        """Test successful section creation."""
        from bson import ObjectId

        section_id = ObjectId("507f1f77bcf86cd799439011")

        # Setup mocks for slug uniqueness check, insert, and find
        override_sections_database.find_one.side_effect = [
            None,  # First call: slug uniqueness check (no existing slug)
            {
                **sample_section_data,
                "_id": section_id,
                "slug": "blog",
            },  # Second call: retrieve created section
        ]
        override_sections_database.insert_one.return_value = MagicMock(inserted_id=section_id)

        response = await sections_async_client.post(
            "/sections",
            json={
                "title": "Blog",
                "display_type": "feed",
                "content_type": "story",
                "nav_visibility": "main",
                "sort_order": 0,
            },
            headers=auth_headers,
        )

        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "Blog"
        assert data["slug"] == "blog"

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_create_section_unauthorized(
        self, sections_async_client, override_sections_database
    ):
        """Test section creation without auth."""
        response = await sections_async_client.post(
            "/sections",
            json={
                "title": "Blog",
                "display_type": "feed",
                "content_type": "story",
            },
        )

        assert response.status_code == 401

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_create_section_invalid_display_type(
        self,
        sections_async_client,
        override_sections_database,
        mock_auth,
        auth_headers,
    ):
        """Test section creation with invalid display_type."""
        response = await sections_async_client.post(
            "/sections",
            json={
                "title": "Blog",
                "display_type": "invalid",
                "content_type": "story",
            },
            headers=auth_headers,
        )

        assert response.status_code == 422
