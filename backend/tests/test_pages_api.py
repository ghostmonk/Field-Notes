"""
API tests for Pages endpoints.
"""

from unittest.mock import MagicMock

import pytest
from bson import ObjectId


class TestGetPage:
    """Test GET /pages/{page_type} endpoint"""

    @pytest.mark.asyncio
    async def test_get_about_page_success(
        self, pages_async_client, override_pages_database, sample_page_data
    ):
        """Test successfully retrieving the about page"""
        override_pages_database.find_one.return_value = {**sample_page_data, "_id": ObjectId()}

        response = await pages_async_client.get("/pages/about")

        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "About Me"
        assert data["page_type"] == "about"
        assert data["is_published"] is True

    @pytest.mark.asyncio
    async def test_get_contact_page_success(
        self, pages_async_client, override_pages_database, sample_page_data
    ):
        """Test successfully retrieving the contact page"""
        contact_page = {**sample_page_data, "_id": ObjectId(), "page_type": "contact", "title": "Contact"}
        override_pages_database.find_one.return_value = contact_page

        response = await pages_async_client.get("/pages/contact")

        assert response.status_code == 200
        assert response.json()["page_type"] == "contact"

    @pytest.mark.asyncio
    async def test_get_page_not_found(
        self, pages_async_client, override_pages_database
    ):
        """Test 404 when page doesn't exist"""
        override_pages_database.find_one.return_value = None

        response = await pages_async_client.get("/pages/about")

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_get_page_invalid_type(self, pages_async_client):
        """Test 422 for invalid page type"""
        response = await pages_async_client.get("/pages/invalid")
        assert response.status_code == 422


class TestUpsertPage:
    """Test PUT /pages/{page_type} endpoint"""

    @pytest.mark.asyncio
    async def test_create_new_page(
        self, pages_async_client, override_pages_database, sample_page_data,
        mock_auth, auth_headers
    ):
        """Test creating a new page when it doesn't exist"""
        page_id = ObjectId()
        created_page = {**sample_page_data, "_id": page_id}

        override_pages_database.find_one.side_effect = [None, created_page]
        override_pages_database.insert_one.return_value = MagicMock(inserted_id=page_id)

        response = await pages_async_client.put(
            "/pages/about",
            json={"title": "About Me", "content": "<p>Content here.</p>"},
            headers=auth_headers,
        )

        assert response.status_code == 200
        assert response.json()["title"] == "About Me"

    @pytest.mark.asyncio
    async def test_update_existing_page(
        self, pages_async_client, override_pages_database, sample_page_data,
        mock_auth, auth_headers
    ):
        """Test updating an existing page"""
        page_id = ObjectId()
        existing = {**sample_page_data, "_id": page_id}
        updated = {**sample_page_data, "_id": page_id, "title": "Updated About"}

        override_pages_database.find_one.side_effect = [existing, updated]
        override_pages_database.update_one.return_value = MagicMock(modified_count=1, matched_count=1)

        response = await pages_async_client.put(
            "/pages/about",
            json={"title": "Updated About"},
            headers=auth_headers,
        )

        assert response.status_code == 200
        assert response.json()["title"] == "Updated About"

    @pytest.mark.asyncio
    async def test_create_page_missing_required_fields(
        self, pages_async_client, override_pages_database, mock_auth, auth_headers
    ):
        """Test 400 when creating page without required fields"""
        override_pages_database.find_one.return_value = None

        response = await pages_async_client.put(
            "/pages/about",
            json={"title": "About"},  # Missing content
            headers=auth_headers,
        )

        assert response.status_code == 400


class TestDeletePage:
    """Test DELETE /pages/{page_type} endpoint"""

    @pytest.mark.asyncio
    async def test_delete_page_success(
        self, pages_async_client, override_pages_database, sample_page_data,
        mock_auth, auth_headers
    ):
        """Test soft deleting a page"""
        override_pages_database.find_one.return_value = {**sample_page_data, "_id": ObjectId()}
        override_pages_database.update_one.return_value = MagicMock(modified_count=1)

        response = await pages_async_client.delete("/pages/about", headers=auth_headers)

        assert response.status_code == 204

    @pytest.mark.asyncio
    async def test_delete_page_not_found(
        self, pages_async_client, override_pages_database, mock_auth, auth_headers
    ):
        """Test 404 when deleting non-existent page"""
        override_pages_database.find_one.return_value = None

        response = await pages_async_client.delete("/pages/about", headers=auth_headers)

        assert response.status_code == 404
