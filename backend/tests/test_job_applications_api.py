"""Tests for job application endpoints."""

import pytest

SAMPLE_APPLICATION = {
    "company": "Acme Corp",
    "job_title": "Staff Backend Engineer",
    "job_url": "https://acme.com/careers/123",
    "job_description": "We need a staff backend engineer with distributed systems experience...",
    "tailored_resume": {
        "contact": {"full_name": "Test User"},
        "summary": "Tailored summary.",
        "work_experience": [],
        "education": [],
        "skills": ["Python"],
        "achievements": [],
    },
    "evaluation_score": {
        "keyword_coverage": 0.92,
        "relevance_ranking": 0.88,
        "ats_compatibility": 0.90,
        "overall": 0.90,
    },
    "status": "saved",
}


class TestJobApplicationsEndpoint:
    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_create_requires_auth(self, resumes_async_client):
        """Test POST /applications without auth returns 401."""
        response = await resumes_async_client.post("/applications", json=SAMPLE_APPLICATION)
        assert response.status_code == 401

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_create_application(self, resumes_async_client, mock_auth, auth_headers):
        """Test POST /applications creates and returns application."""
        response = await resumes_async_client.post(
            "/applications", json=SAMPLE_APPLICATION, headers=auth_headers
        )
        assert response.status_code == 201
        data = response.json()
        assert data["company"] == "Acme Corp"
        assert data["status"] == "saved"
        assert "id" in data

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_list_applications(self, resumes_async_client, mock_auth, auth_headers):
        """Test GET /applications returns user's applications."""
        await resumes_async_client.post(
            "/applications", json=SAMPLE_APPLICATION, headers=auth_headers
        )
        response = await resumes_async_client.get("/applications", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert data[0]["company"] == "Acme Corp"

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_update_application_status(self, resumes_async_client, mock_auth, auth_headers):
        """Test PUT /applications/:id updates status."""
        create_resp = await resumes_async_client.post(
            "/applications", json=SAMPLE_APPLICATION, headers=auth_headers
        )
        app_id = create_resp.json()["id"]

        response = await resumes_async_client.put(
            f"/applications/{app_id}",
            json={"status": "applied"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["status"] == "applied"

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_delete_application(self, resumes_async_client, mock_auth, auth_headers):
        """Test DELETE /applications/:id removes application."""
        create_resp = await resumes_async_client.post(
            "/applications", json=SAMPLE_APPLICATION, headers=auth_headers
        )
        app_id = create_resp.json()["id"]

        response = await resumes_async_client.delete(
            f"/applications/{app_id}", headers=auth_headers
        )
        assert response.status_code == 204

        # Verify it's gone
        list_resp = await resumes_async_client.get("/applications", headers=auth_headers)
        assert len(list_resp.json()) == 0

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_update_nonexistent_returns_404(
        self, resumes_async_client, mock_auth, auth_headers
    ):
        """Test PUT /applications/:id with bad ID returns 404."""
        response = await resumes_async_client.put(
            "/applications/000000000000000000000000",
            json={"status": "applied"},
            headers=auth_headers,
        )
        assert response.status_code == 404
