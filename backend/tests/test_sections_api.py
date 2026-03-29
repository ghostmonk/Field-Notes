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
    async def test_get_sections_invalid_nav_visibility(
        self, sections_async_client, override_sections_database
    ):
        """Test sections endpoint rejects invalid nav_visibility"""
        response = await sections_async_client.get("/sections?nav_visibility=invalid")
        assert response.status_code == 400
        assert "nav_visibility" in response.json()["detail"].lower()

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_get_sections_invalid_parent_id(
        self, sections_async_client, override_sections_database
    ):
        """Test sections endpoint rejects invalid parent_id format"""
        response = await sections_async_client.get("/sections?parent_id=not-an-objectid")
        assert response.status_code == 400
        assert "parent_id" in response.json()["detail"].lower()

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_get_sections_parent_id_null_allowed(
        self, sections_async_client, override_sections_database
    ):
        """Test sections endpoint accepts parent_id=null for root sections"""
        override_sections_database.count_documents.return_value = 0
        override_sections_database.find.return_value = MockCursor([])

        response = await sections_async_client.get("/sections?parent_id=null")
        assert response.status_code == 200

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
    async def test_get_section_by_id_no_auth_required(
        self, sections_async_client, override_sections_database
    ):
        """Test GET /sections/{id} is public (no auth required), returns 404 for missing"""
        override_sections_database.find_one.return_value = None
        response = await sections_async_client.get(f"/sections/{ObjectId()}")
        assert response.status_code == 404

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_get_section_by_id_invalid_id(self, sections_async_client):
        """Test retrieval with invalid ObjectId format"""
        response = await sections_async_client.get("/sections/invalid_id")
        assert response.status_code == 400

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_get_section_by_id_not_found(
        self, sections_async_client, override_sections_database
    ):
        """Test 404 when section doesn't exist by ID"""
        override_sections_database.find_one.return_value = None

        response = await sections_async_client.get(f"/sections/{ObjectId()}")

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
            },
            headers=auth_headers,
        )

        assert response.status_code == 422

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_create_section_with_icon(
        self,
        sections_async_client,
        override_sections_database,
        sample_section_data,
        mock_auth,
        auth_headers,
    ):
        """Test section creation with icon field."""
        section_id = ObjectId("507f1f77bcf86cd799439011")
        override_sections_database.find_one.side_effect = [
            None,
            {**sample_section_data, "_id": section_id, "slug": "photos", "icon": "camera"},
        ]
        override_sections_database.insert_one.return_value = MagicMock(inserted_id=section_id)

        response = await sections_async_client.post(
            "/sections",
            json={
                "title": "Photos",
                "display_type": "gallery",
                "icon": "camera",
            },
            headers=auth_headers,
        )

        assert response.status_code == 201
        assert response.json()["icon"] == "camera"

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_create_section_invalid_icon(
        self,
        sections_async_client,
        override_sections_database,
        mock_auth,
        auth_headers,
    ):
        """Test section creation rejects invalid icon value."""
        response = await sections_async_client.post(
            "/sections",
            json={
                "title": "Photos",
                "display_type": "gallery",
                "icon": "nonexistent-icon",
            },
            headers=auth_headers,
        )

        assert response.status_code == 422

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_create_section_default_icon(
        self,
        sections_async_client,
        override_sections_database,
        sample_section_data,
        mock_auth,
        auth_headers,
    ):
        """Test section creation defaults icon to 'default' when omitted."""
        section_id = ObjectId("507f1f77bcf86cd799439011")
        override_sections_database.find_one.side_effect = [
            None,
            {**sample_section_data, "_id": section_id, "slug": "blog", "icon": "default"},
        ]
        override_sections_database.insert_one.return_value = MagicMock(inserted_id=section_id)

        response = await sections_async_client.post(
            "/sections",
            json={
                "title": "Blog",
                "display_type": "feed",
            },
            headers=auth_headers,
        )

        assert response.status_code == 201
        assert response.json()["icon"] == "default"


class TestUpdateSection:
    """Tests for PUT /sections/{section_id} endpoint."""

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_update_section_success(
        self,
        sections_async_client,
        override_sections_database,
        sample_section_data,
        mock_auth,
        auth_headers,
    ):
        """Test successful section update."""
        section_id = ObjectId("507f1f77bcf86cd799439011")
        sample_doc = {
            "_id": section_id,
            **sample_section_data,
            "user_id": "mock_user_id",
        }
        # First find_one for checking section exists, second for returning updated
        override_sections_database.find_one.side_effect = [
            sample_doc,  # Existing section check
            None,  # Slug uniqueness check
            {**sample_doc, "title": "Updated Blog", "slug": "updated-blog"},  # Updated section
        ]
        override_sections_database.update_one.return_value = MagicMock(modified_count=1)

        response = await sections_async_client.put(
            "/sections/507f1f77bcf86cd799439011",
            json={"title": "Updated Blog"},
            headers=auth_headers,
        )

        assert response.status_code == 200

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_update_section_not_found(
        self,
        sections_async_client,
        override_sections_database,
        mock_auth,
        auth_headers,
    ):
        """Test updating non-existent section."""
        override_sections_database.find_one.return_value = None

        response = await sections_async_client.put(
            "/sections/507f1f77bcf86cd799439011",
            json={"title": "Updated Blog"},
            headers=auth_headers,
        )

        assert response.status_code == 404

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_update_section_unauthorized(
        self,
        sections_async_client,
        override_sections_database,
    ):
        """Test section update without auth."""
        response = await sections_async_client.put(
            "/sections/507f1f77bcf86cd799439011",
            json={"title": "Updated Blog"},
        )

        assert response.status_code == 401


class TestDeleteSection:
    """Tests for DELETE /sections/{section_id} endpoint."""

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_delete_section_success(
        self,
        sections_async_client,
        override_sections_database,
        sample_section_data,
        mock_auth,
        auth_headers,
    ):
        """Test successful section deletion."""
        section_id = ObjectId("507f1f77bcf86cd799439011")
        sample_doc = {
            "_id": section_id,
            **sample_section_data,
            "user_id": "mock_user_id",
        }
        override_sections_database.find_one.return_value = sample_doc
        override_sections_database.update_one.return_value = MagicMock(modified_count=1)

        response = await sections_async_client.delete(
            "/sections/507f1f77bcf86cd799439011",
            headers=auth_headers,
        )

        assert response.status_code == 204

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_delete_section_not_found(
        self,
        sections_async_client,
        override_sections_database,
        mock_auth,
        auth_headers,
    ):
        """Test deleting non-existent section."""
        override_sections_database.find_one.return_value = None

        response = await sections_async_client.delete(
            "/sections/507f1f77bcf86cd799439011",
            headers=auth_headers,
        )

        assert response.status_code == 404

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_delete_section_unauthorized(
        self,
        sections_async_client,
        override_sections_database,
    ):
        """Test section delete without auth."""
        response = await sections_async_client.delete(
            "/sections/507f1f77bcf86cd799439011",
        )

        assert response.status_code == 401


class TestSectionPath:
    """Tests for section path computation."""

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_create_top_level_section_path_equals_slug(
        self,
        sections_async_client,
        override_sections_database,
        sample_section_data,
        mock_auth,
        auth_headers,
    ):
        """Top-level section path equals its slug."""
        section_id = ObjectId("507f1f77bcf86cd799439011")
        override_sections_database.find_one.side_effect = [
            None,  # slug uniqueness check
            {**sample_section_data, "_id": section_id, "slug": "notes", "path": "notes"},
        ]
        override_sections_database.insert_one.return_value = MagicMock(inserted_id=section_id)

        response = await sections_async_client.post(
            "/sections",
            json={
                "title": "Notes",
                "display_type": "feed",
            },
            headers=auth_headers,
        )

        assert response.status_code == 201
        data = response.json()
        assert data["path"] == "notes"

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_create_child_section_path_includes_parent(
        self,
        sections_async_client,
        override_sections_database,
        sample_section_data,
        mock_auth,
        auth_headers,
    ):
        """Child section path = parent.path/child.slug."""
        parent_id = ObjectId("507f1f77bcf86cd799439011")
        child_id = ObjectId("507f1f77bcf86cd799439012")

        parent_doc = {
            **sample_section_data,
            "_id": parent_id,
            "slug": "blog",
            "path": "blog",
        }

        override_sections_database.find_one.side_effect = [
            None,  # slug uniqueness check
            parent_doc,  # parent lookup
            {
                **sample_section_data,
                "_id": child_id,
                "slug": "tech",
                "path": "blog/tech",
                "parent_id": str(parent_id),
            },
        ]
        override_sections_database.insert_one.return_value = MagicMock(inserted_id=child_id)

        response = await sections_async_client.post(
            "/sections",
            json={
                "title": "Tech",
                "display_type": "feed",
                "parent_id": str(parent_id),
            },
            headers=auth_headers,
        )

        assert response.status_code == 201
        data = response.json()
        assert data["path"] == "blog/tech"

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_create_child_section_invalid_parent_returns_400(
        self,
        sections_async_client,
        override_sections_database,
        mock_auth,
        auth_headers,
    ):
        """Creating a child with a nonexistent parent_id returns 400."""
        parent_id = ObjectId("507f1f77bcf86cd799439011")

        override_sections_database.find_one.side_effect = [
            None,  # slug uniqueness check
            None,  # parent lookup returns nothing
        ]

        response = await sections_async_client.post(
            "/sections",
            json={
                "title": "Orphan",
                "display_type": "feed",
                "parent_id": str(parent_id),
            },
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "parent" in response.json()["detail"].lower()

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_section_response_includes_path(
        self,
        sections_async_client,
        override_sections_database,
        sample_section_data,
    ):
        """Section response includes path field."""
        section_id = ObjectId()
        override_sections_database.find_one.return_value = {
            **sample_section_data,
            "_id": section_id,
        }

        response = await sections_async_client.get(f"/sections/{section_id}")

        assert response.status_code == 200
        data = response.json()
        assert "path" in data
        assert data["path"] == "blog"

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_section_response_does_not_include_content_type(
        self,
        sections_async_client,
        override_sections_database,
        sample_section_data,
    ):
        """Section response must not include content_type."""
        section_id = ObjectId()
        override_sections_database.find_one.return_value = {
            **sample_section_data,
            "_id": section_id,
        }

        response = await sections_async_client.get(f"/sections/{section_id}")

        assert response.status_code == 200
        data = response.json()
        assert "content_type" not in data
