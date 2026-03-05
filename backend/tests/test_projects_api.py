"""
API tests for Projects endpoints.
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from bson import ObjectId
from tests.test_utils import MockCursor


class TestProjectsPublicEndpoints:
    """Test public project endpoints (no auth required)"""

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_get_projects_success(
        self, projects_async_client, override_projects_database, sample_project_data
    ):
        """Test successful retrieval of published projects"""
        project_id = ObjectId()
        test_projects = [
            {**sample_project_data, "_id": project_id},
            {
                **sample_project_data,
                "_id": ObjectId(),
                "title": "Second Project",
                "slug": "second-project",
                "is_featured": False,
            },
        ]

        override_projects_database.count_documents.return_value = 2
        override_projects_database.find.return_value = MockCursor(test_projects)

        response = await projects_async_client.get("/projects")

        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert data["total"] == 2
        assert len(data["items"]) == 2

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_get_projects_with_pagination(
        self, projects_async_client, override_projects_database
    ):
        """Test projects endpoint with pagination parameters"""
        override_projects_database.count_documents.return_value = 100
        override_projects_database.find.return_value = MockCursor([])

        response = await projects_async_client.get("/projects?limit=5&offset=10")

        assert response.status_code == 200
        data = response.json()
        assert data["limit"] == 5
        assert data["offset"] == 10

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_get_projects_filtered_by_section_id(
        self, projects_async_client, override_projects_database
    ):
        """Test filtering projects by section_id"""
        section_id = ObjectId()
        test_projects = [
            {
                "_id": ObjectId(),
                "title": "Project in section",
                "slug": "project-in-section",
                "summary": "Summary",
                "technologies": ["Python"],
                "image_url": None,
                "github_url": None,
                "live_url": None,
                "is_featured": False,
                "is_published": True,
                "deleted": False,
                "section_id": str(section_id),
            },
        ]

        override_projects_database.count_documents.return_value = 1
        override_projects_database.find.return_value = MockCursor(test_projects)

        response = await projects_async_client.get(f"/projects?section_id={str(section_id)}")
        assert response.status_code == 200

        call_args = override_projects_database.find.call_args
        query = call_args[0][0] if call_args[0] else call_args[1].get("filter", {})
        assert query.get("section_id") == str(section_id)

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_get_projects_featured_only(
        self, projects_async_client, override_projects_database, sample_project_data
    ):
        """Test projects endpoint filtering by featured"""
        featured_project = {**sample_project_data, "_id": ObjectId()}
        override_projects_database.count_documents.return_value = 1
        override_projects_database.find.return_value = MockCursor([featured_project])

        response = await projects_async_client.get("/projects?featured_only=true")

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_get_project_by_slug_success(
        self, projects_async_client, override_projects_database, sample_project_data
    ):
        """Test successful retrieval of project by slug"""
        project_id = ObjectId()
        override_projects_database.find_one.return_value = {
            **sample_project_data,
            "_id": project_id,
        }

        response = await projects_async_client.get("/projects/slug/my-awesome-project")

        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "My Awesome Project"
        assert data["slug"] == "my-awesome-project"

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_get_project_by_slug_not_found(
        self, projects_async_client, override_projects_database
    ):
        """Test 404 when project doesn't exist"""
        override_projects_database.find_one.return_value = None

        response = await projects_async_client.get("/projects/slug/non-existent")

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()


class TestProjectsAuthenticatedEndpoints:
    """Test authenticated project endpoints"""

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_get_project_by_id_unauthorized(self, projects_async_client):
        """Test accessing project by ID without authorization"""
        response = await projects_async_client.get(f"/projects/{ObjectId()}")
        assert response.status_code == 401

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_get_project_by_id_success(
        self,
        projects_async_client,
        override_projects_database,
        sample_project_data,
        mock_auth,
        auth_headers,
    ):
        """Test successful retrieval of project by ID with auth"""
        project_id = ObjectId()
        override_projects_database.find_one.return_value = {
            **sample_project_data,
            "_id": project_id,
        }

        response = await projects_async_client.get(f"/projects/{project_id}", headers=auth_headers)

        assert response.status_code == 200
        assert response.json()["title"] == "My Awesome Project"

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_get_project_by_id_invalid_id(
        self, projects_async_client, mock_auth, auth_headers
    ):
        """Test retrieval with invalid ObjectId format"""
        response = await projects_async_client.get("/projects/invalid_id", headers=auth_headers)
        assert response.status_code == 400

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_create_project_unauthorized(self, projects_async_client):
        """Test creating project without authorization"""
        response = await projects_async_client.post(
            "/projects",
            json={"title": "New", "summary": "Summary", "content": "Content"},
        )
        assert response.status_code == 401

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_create_project_success(
        self,
        projects_async_client,
        override_projects_database,
        sample_project_data,
        mock_auth,
        auth_headers,
    ):
        """Test successful project creation with auth"""
        project_id = ObjectId()
        created_project = {
            **sample_project_data,
            "_id": project_id,
            "title": "New Project",
            "slug": "new-project",
        }

        override_projects_database.find_one.side_effect = [None, created_project]
        override_projects_database.insert_one.return_value = MagicMock(inserted_id=project_id)

        # Mock get_db for section lookup fallback
        section_id = ObjectId()
        mock_db = AsyncMock()
        mock_sections = AsyncMock()
        mock_sections.find_one = AsyncMock(
            return_value={"_id": section_id, "content_type": "project"}
        )
        mock_db.__getitem__ = lambda self, key: mock_sections

        with patch("handlers.projects.get_db", return_value=mock_db):
            response = await projects_async_client.post(
                "/projects",
                json={
                    "title": "New Project",
                    "summary": "A new project summary",
                    "content": "Detailed content here",
                    "technologies": ["Python"],
                },
                headers=auth_headers,
            )

        assert response.status_code == 201
        assert response.json()["title"] == "New Project"

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_create_project_validation_error(
        self, projects_async_client, mock_auth, auth_headers
    ):
        """Test project creation with validation errors"""
        response = await projects_async_client.post(
            "/projects",
            json={"title": "", "summary": "Summary", "content": "Content"},
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_update_project_unauthorized(self, projects_async_client):
        """Test updating project without authorization"""
        response = await projects_async_client.put(
            f"/projects/{ObjectId()}", json={"title": "Updated"}
        )
        assert response.status_code == 401

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_update_project_success(
        self,
        projects_async_client,
        override_projects_database,
        sample_project_data,
        mock_auth,
        auth_headers,
    ):
        """Test successful project update with auth"""
        project_id = ObjectId()
        existing = {**sample_project_data, "_id": project_id}
        updated = {
            **sample_project_data,
            "_id": project_id,
            "title": "Updated Title",
            "slug": "updated-title",
        }

        # Order: 1) check project exists, 2) slug check for generate_unique_slug, 3) fetch updated project
        override_projects_database.find_one.side_effect = [existing, None, updated]
        override_projects_database.update_one.return_value = MagicMock(
            modified_count=1, matched_count=1
        )

        response = await projects_async_client.put(
            f"/projects/{project_id}",
            json={"title": "Updated Title"},
            headers=auth_headers,
        )

        assert response.status_code == 200
        assert response.json()["title"] == "Updated Title"

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_update_project_not_found(
        self, projects_async_client, override_projects_database, mock_auth, auth_headers
    ):
        """Test updating non-existent project"""
        override_projects_database.find_one.return_value = None

        response = await projects_async_client.put(
            f"/projects/{ObjectId()}",
            json={"title": "Updated"},
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_delete_project_unauthorized(self, projects_async_client):
        """Test deleting project without authorization"""
        response = await projects_async_client.delete(f"/projects/{ObjectId()}")
        assert response.status_code == 401

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_delete_project_success(
        self,
        projects_async_client,
        override_projects_database,
        sample_project_data,
        mock_auth,
        auth_headers,
    ):
        """Test successful project deletion with auth"""
        project_id = ObjectId()
        override_projects_database.find_one.return_value = {
            **sample_project_data,
            "_id": project_id,
        }
        override_projects_database.update_one.return_value = MagicMock(modified_count=1)

        response = await projects_async_client.delete(
            f"/projects/{project_id}", headers=auth_headers
        )
        assert response.status_code == 204

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_delete_project_not_found(
        self, projects_async_client, override_projects_database, mock_auth, auth_headers
    ):
        """Test deleting non-existent project"""
        override_projects_database.find_one.return_value = None

        response = await projects_async_client.delete(
            f"/projects/{ObjectId()}", headers=auth_headers
        )
        assert response.status_code == 404
