"""
API tests for Resume endpoints.
"""

from unittest.mock import MagicMock

import pytest
from bson import ObjectId


class TestResumeEndpoints:
    """Test resume endpoints"""

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_get_resume_requires_auth(self, resumes_async_client):
        """Test GET /resume without authorization returns 401"""
        response = await resumes_async_client.get("/resume")
        assert response.status_code == 401

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_get_resume_not_found(
        self, resumes_async_client, override_resumes_database, mock_auth, auth_headers
    ):
        """Test GET /resume returns 404 when no resume exists"""
        override_resumes_database.find_one.return_value = None

        response = await resumes_async_client.get("/resume", headers=auth_headers)

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_get_resume_success(
        self,
        resumes_async_client,
        override_resumes_database,
        sample_resume_data,
        mock_auth,
        auth_headers,
    ):
        """Test GET /resume returns resume when it exists"""
        resume_id = ObjectId()
        override_resumes_database.find_one.return_value = {
            **sample_resume_data,
            "_id": resume_id,
        }

        response = await resumes_async_client.get("/resume", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["contact"]["full_name"] == "Nicholas Hillier"
        assert "TypeScript" in data["skills"]

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_create_resume_requires_auth(self, resumes_async_client):
        """Test POST /resume without authorization returns 401"""
        response = await resumes_async_client.post(
            "/resume",
            json={
                "contact": {
                    "full_name": "Test User",
                    "email": "test@example.com",
                },
            },
        )
        assert response.status_code == 401

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_create_resume_success(
        self,
        resumes_async_client,
        override_resumes_database,
        sample_resume_data,
        mock_auth,
        auth_headers,
    ):
        """Test POST /resume creates resume successfully"""
        resume_id = ObjectId()
        created_resume = {
            **sample_resume_data,
            "_id": resume_id,
        }

        # find_one calls: 1) single existence check (None), 2) retrieve created
        override_resumes_database.find_one.side_effect = [None, created_resume]
        override_resumes_database.insert_one.return_value = MagicMock(inserted_id=resume_id)

        response = await resumes_async_client.post(
            "/resume",
            json={
                "contact": {
                    "full_name": "Nicholas Hillier",
                    "email": "nicholas@ghostmonk.com",
                    "location": "Montreal",
                    "github": "https://github.com/ghostmonk",
                },
                "summary": "Full-stack developer with experience in TypeScript, Python, and cloud infrastructure.",
                "skills": ["TypeScript", "Python", "React", "FastAPI", "MongoDB"],
            },
            headers=auth_headers,
        )

        assert response.status_code == 201
        data = response.json()
        assert data["contact"]["full_name"] == "Nicholas Hillier"

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_create_resume_duplicate(
        self,
        resumes_async_client,
        override_resumes_database,
        sample_resume_data,
        mock_auth,
        auth_headers,
    ):
        """Test POST /resume rejects duplicate resume (409)"""
        resume_id = ObjectId()
        override_resumes_database.find_one.return_value = {
            **sample_resume_data,
            "_id": resume_id,
        }

        response = await resumes_async_client.post(
            "/resume",
            json={
                "contact": {
                    "full_name": "Nicholas Hillier",
                    "email": "nicholas@ghostmonk.com",
                },
            },
            headers=auth_headers,
        )

        assert response.status_code == 409
        assert "already exists" in response.json()["detail"].lower()

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_update_resume_requires_auth(self, resumes_async_client):
        """Test PUT /resume without authorization returns 401"""
        response = await resumes_async_client.put(
            "/resume",
            json={"summary": "Updated summary"},
        )
        assert response.status_code == 401

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_update_resume_success(
        self,
        resumes_async_client,
        override_resumes_database,
        sample_resume_data,
        mock_auth,
        auth_headers,
    ):
        """Test PUT /resume updates resume successfully"""
        resume_id = ObjectId()
        updated = {
            **sample_resume_data,
            "_id": resume_id,
            "summary": "Updated summary",
        }

        # find_one called once: after update to return the updated doc
        override_resumes_database.find_one.return_value = updated
        override_resumes_database.update_one.return_value = MagicMock(
            modified_count=1, matched_count=1
        )

        response = await resumes_async_client.put(
            "/resume",
            json={"summary": "Updated summary"},
            headers=auth_headers,
        )

        assert response.status_code == 200
        assert response.json()["summary"] == "Updated summary"

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_update_resume_not_found(
        self, resumes_async_client, override_resumes_database, mock_auth, auth_headers
    ):
        """Test PUT /resume returns 404 when no resume exists"""
        override_resumes_database.update_one.return_value = MagicMock(
            modified_count=0, matched_count=0
        )

        response = await resumes_async_client.put(
            "/resume",
            json={"summary": "Updated summary"},
            headers=auth_headers,
        )

        assert response.status_code == 404

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_delete_resume_requires_auth(self, resumes_async_client):
        """Test DELETE /resume without authorization returns 401"""
        response = await resumes_async_client.delete("/resume")
        assert response.status_code == 401

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_delete_resume_success(
        self,
        resumes_async_client,
        override_resumes_database,
        mock_auth,
        auth_headers,
    ):
        """Test DELETE /resume soft deletes successfully"""
        override_resumes_database.update_one.return_value = MagicMock(
            modified_count=1, matched_count=1
        )

        response = await resumes_async_client.delete("/resume", headers=auth_headers)

        assert response.status_code == 204

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_delete_resume_not_found(
        self, resumes_async_client, override_resumes_database, mock_auth, auth_headers
    ):
        """Test DELETE /resume returns 404 when not found"""
        override_resumes_database.update_one.return_value = MagicMock(
            modified_count=0, matched_count=0
        )

        response = await resumes_async_client.delete("/resume", headers=auth_headers)

        assert response.status_code == 404
