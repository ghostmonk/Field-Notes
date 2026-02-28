"""
API tests for NavLinks endpoints.
"""

from unittest.mock import MagicMock

import pytest
from bson import ObjectId
from tests.test_utils import MockCursor


class TestNavLinksPublicEndpoints:
    """Test public navlink endpoints (no auth required)"""

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_get_navlinks_success(
        self, navlinks_async_client, override_navlinks_database, sample_navlink_data
    ):
        """Test successful retrieval of published navlinks"""
        navlink_id = ObjectId()
        test_navlinks = [
            {**sample_navlink_data, "_id": navlink_id},
            {
                **sample_navlink_data,
                "_id": ObjectId(),
                "label": "Twitter",
                "url": "https://twitter.com/example",
                "sort_order": 1,
            },
        ]

        override_navlinks_database.count_documents.return_value = 2
        override_navlinks_database.find.return_value = MockCursor(test_navlinks)

        response = await navlinks_async_client.get("/navlinks")

        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert data["total"] == 2
        assert len(data["items"]) == 2

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_get_navlinks_empty_list(self, navlinks_async_client, override_navlinks_database):
        """Test navlinks endpoint returns empty list when no navlinks exist"""
        override_navlinks_database.count_documents.return_value = 0
        override_navlinks_database.find.return_value = MockCursor([])

        response = await navlinks_async_client.get("/navlinks")

        assert response.status_code == 200
        data = response.json()
        assert data["items"] == []
        assert data["total"] == 0

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_get_navlinks_with_pagination(
        self, navlinks_async_client, override_navlinks_database
    ):
        """Test navlinks endpoint with pagination parameters"""
        override_navlinks_database.count_documents.return_value = 100
        override_navlinks_database.find.return_value = MockCursor([])

        response = await navlinks_async_client.get("/navlinks?limit=5&offset=10")

        assert response.status_code == 200
        data = response.json()
        assert data["limit"] == 5
        assert data["offset"] == 10

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_get_navlink_by_id_success(
        self, navlinks_async_client, override_navlinks_database, sample_navlink_data
    ):
        """Test successful retrieval of navlink by ID"""
        navlink_id = ObjectId()
        override_navlinks_database.find_one.return_value = {
            **sample_navlink_data,
            "_id": navlink_id,
        }

        response = await navlinks_async_client.get(f"/navlinks/{navlink_id}")

        assert response.status_code == 200
        data = response.json()
        assert data["label"] == "GitHub"
        assert data["url"] == "https://github.com/example"

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_get_navlink_by_id_invalid_id(self, navlinks_async_client):
        """Test retrieval with invalid ObjectId format"""
        response = await navlinks_async_client.get("/navlinks/invalid_id")
        assert response.status_code == 400

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_get_navlink_by_id_not_found(
        self, navlinks_async_client, override_navlinks_database
    ):
        """Test 404 when navlink doesn't exist by ID"""
        override_navlinks_database.find_one.return_value = None

        response = await navlinks_async_client.get(f"/navlinks/{ObjectId()}")

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()


class TestCreateNavLink:
    """Tests for POST /navlinks endpoint."""

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_create_navlink_success(
        self,
        navlinks_async_client,
        override_navlinks_database,
        sample_navlink_data,
        mock_auth,
        auth_headers,
    ):
        """Test successful navlink creation."""
        navlink_id = ObjectId("507f1f77bcf86cd799439011")

        # Setup mocks for insert and find
        override_navlinks_database.find_one.return_value = {
            **sample_navlink_data,
            "_id": navlink_id,
        }
        override_navlinks_database.insert_one.return_value = MagicMock(inserted_id=navlink_id)

        response = await navlinks_async_client.post(
            "/navlinks",
            json={
                "label": "GitHub",
                "url": "https://github.com/example",
                "sort_order": 0,
            },
            headers=auth_headers,
        )

        assert response.status_code == 201
        data = response.json()
        assert data["label"] == "GitHub"
        assert data["url"] == "https://github.com/example"

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_create_navlink_unauthorized(
        self, navlinks_async_client, override_navlinks_database
    ):
        """Test navlink creation without auth."""
        response = await navlinks_async_client.post(
            "/navlinks",
            json={
                "label": "GitHub",
                "url": "https://github.com/example",
            },
        )

        assert response.status_code == 401


class TestNavLinkUrlValidation:
    """Tests for NavLink URL validation."""

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_create_navlink_with_internal_path(
        self,
        navlinks_async_client,
        override_navlinks_database,
        sample_navlink_data,
        mock_auth,
        auth_headers,
    ):
        """Internal paths (starting with /) should be accepted."""
        navlink_id = ObjectId()
        override_navlinks_database.find_one.return_value = {
            **sample_navlink_data,
            "_id": navlink_id,
            "url": "/about",
        }
        override_navlinks_database.insert_one.return_value = MagicMock(inserted_id=navlink_id)

        response = await navlinks_async_client.post(
            "/navlinks",
            json={"label": "About", "url": "/about"},
            headers=auth_headers,
        )
        assert response.status_code == 201

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_create_navlink_rejects_javascript_url(
        self,
        navlinks_async_client,
        override_navlinks_database,
        mock_auth,
        auth_headers,
    ):
        """javascript: URLs should be rejected."""
        response = await navlinks_async_client.post(
            "/navlinks",
            json={"label": "XSS", "url": "javascript:alert(1)"},
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_create_navlink_rejects_data_url(
        self,
        navlinks_async_client,
        override_navlinks_database,
        mock_auth,
        auth_headers,
    ):
        """data: URLs should be rejected."""
        response = await navlinks_async_client.post(
            "/navlinks",
            json={"label": "Data", "url": "data:text/html,<h1>hi</h1>"},
            headers=auth_headers,
        )
        assert response.status_code == 422


class TestUpdateNavLink:
    """Tests for PUT /navlinks/{navlink_id} endpoint."""

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_update_navlink_success(
        self,
        navlinks_async_client,
        override_navlinks_database,
        sample_navlink_data,
        mock_auth,
        auth_headers,
    ):
        """Test successful navlink update."""
        navlink_id = ObjectId("507f1f77bcf86cd799439011")
        sample_doc = {
            "_id": navlink_id,
            **sample_navlink_data,
        }
        # First find_one for checking navlink exists, second for returning updated
        override_navlinks_database.find_one.side_effect = [
            sample_doc,  # Existing navlink check
            {**sample_doc, "label": "Updated GitHub"},  # Updated navlink
        ]
        override_navlinks_database.update_one.return_value = MagicMock(modified_count=1)

        response = await navlinks_async_client.put(
            "/navlinks/507f1f77bcf86cd799439011",
            json={"label": "Updated GitHub"},
            headers=auth_headers,
        )

        assert response.status_code == 200

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_update_navlink_not_found(
        self,
        navlinks_async_client,
        override_navlinks_database,
        mock_auth,
        auth_headers,
    ):
        """Test updating non-existent navlink."""
        override_navlinks_database.find_one.return_value = None

        response = await navlinks_async_client.put(
            "/navlinks/507f1f77bcf86cd799439011",
            json={"label": "Updated GitHub"},
            headers=auth_headers,
        )

        assert response.status_code == 404

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_update_navlink_unauthorized(
        self,
        navlinks_async_client,
        override_navlinks_database,
    ):
        """Test navlink update without auth."""
        response = await navlinks_async_client.put(
            "/navlinks/507f1f77bcf86cd799439011",
            json={"label": "Updated GitHub"},
        )

        assert response.status_code == 401

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_update_navlink_forbidden_for_commenter(
        self,
        navlinks_async_client,
        override_navlinks_database,
        mock_auth_commenter,
        auth_headers,
    ):
        """Non-admin users should get 403 on navlink update."""
        response = await navlinks_async_client.put(
            "/navlinks/507f1f77bcf86cd799439011",
            json={"label": "Updated"},
            headers=auth_headers,
        )
        assert response.status_code == 403


class TestDeleteNavLink:
    """Tests for DELETE /navlinks/{navlink_id} endpoint."""

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_delete_navlink_success(
        self,
        navlinks_async_client,
        override_navlinks_database,
        sample_navlink_data,
        mock_auth,
        auth_headers,
    ):
        """Test successful navlink deletion (hard delete)."""
        navlink_id = ObjectId("507f1f77bcf86cd799439011")
        sample_doc = {
            "_id": navlink_id,
            **sample_navlink_data,
        }
        override_navlinks_database.find_one.return_value = sample_doc
        override_navlinks_database.delete_one.return_value = MagicMock(deleted_count=1)

        response = await navlinks_async_client.delete(
            "/navlinks/507f1f77bcf86cd799439011",
            headers=auth_headers,
        )

        assert response.status_code == 204

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_delete_navlink_not_found(
        self,
        navlinks_async_client,
        override_navlinks_database,
        mock_auth,
        auth_headers,
    ):
        """Test deleting non-existent navlink."""
        override_navlinks_database.find_one.return_value = None

        response = await navlinks_async_client.delete(
            "/navlinks/507f1f77bcf86cd799439011",
            headers=auth_headers,
        )

        assert response.status_code == 404

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_delete_navlink_unauthorized(
        self,
        navlinks_async_client,
        override_navlinks_database,
    ):
        """Test navlink delete without auth."""
        response = await navlinks_async_client.delete(
            "/navlinks/507f1f77bcf86cd799439011",
        )

        assert response.status_code == 401

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_delete_navlink_forbidden_for_commenter(
        self,
        navlinks_async_client,
        override_navlinks_database,
        mock_auth_commenter,
        auth_headers,
    ):
        """Non-admin users should get 403 on navlink delete."""
        response = await navlinks_async_client.delete(
            "/navlinks/507f1f77bcf86cd799439011",
            headers=auth_headers,
        )
        assert response.status_code == 403
