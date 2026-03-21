"""Tests for the tailor endpoint."""

from unittest.mock import AsyncMock, patch

import pytest

SAMPLE_PIPELINE_RESULT = {
    "analysis": {
        "required_skills": ["Python"],
        "preferred_skills": [],
        "seniority": "staff",
        "domain": "backend",
        "culture_signals": "startup",
        "key_requirements": ["distributed systems"],
    },
    "tailored_resume": {
        "contact": {"full_name": "Test User"},
        "summary": "Tailored summary.",
        "work_experience": [],
        "education": [],
        "skills": ["Python"],
        "achievements": [],
    },
    "evaluation": {
        "keyword_coverage": 0.95,
        "relevance_ranking": 0.90,
        "ats_compatibility": 0.92,
        "overall": 0.92,
        "issues": [],
    },
    "attempts": 1,
}


class TestTailorEndpoint:
    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_tailor_requires_auth(self, resumes_async_client):
        """Test POST /tailor without auth returns 401."""
        response = await resumes_async_client.post("/tailor", json={"job_description": "test"})
        assert response.status_code == 401

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_tailor_returns_tailored_resume(
        self, resumes_async_client, mock_auth, auth_headers
    ):
        """Test POST /tailor returns tailored resume with scores."""
        with patch(
            "handlers.tailor.run_tailoring_pipeline",
            new_callable=AsyncMock,
            return_value=SAMPLE_PIPELINE_RESULT,
        ):
            response = await resumes_async_client.post(
                "/tailor",
                json={"job_description": "We need a staff backend engineer..."},
                headers=auth_headers,
            )

        assert response.status_code == 200
        data = response.json()
        assert data["tailored_resume"]["summary"] == "Tailored summary."
        assert data["evaluation"]["overall"] == 0.92
        assert data["attempts"] == 1

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_tailor_validates_empty_job_description(
        self, resumes_async_client, mock_auth, auth_headers
    ):
        """Test POST /tailor rejects empty job description."""
        response = await resumes_async_client.post(
            "/tailor",
            json={"job_description": ""},
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_tailor_returns_503_without_api_keys(
        self, resumes_async_client, mock_auth, auth_headers
    ):
        """Test POST /tailor returns 503 when API keys not configured."""
        with patch.dict("os.environ", {"ANTHROPIC_API_KEY": "", "QDRANT_URL": ""}, clear=False):
            with patch(
                "handlers.tailor.run_tailoring_pipeline",
                new_callable=AsyncMock,
                side_effect=ValueError("ANTHROPIC_API_KEY environment variable is required"),
            ):
                response = await resumes_async_client.post(
                    "/tailor",
                    json={"job_description": "some job"},
                    headers=auth_headers,
                )
        assert response.status_code == 503

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_tailor_returns_404_when_no_resume(
        self, resumes_async_client, mock_auth, auth_headers
    ):
        """Test POST /tailor returns 404 when user has no resume."""
        with patch(
            "handlers.tailor.run_tailoring_pipeline",
            new_callable=AsyncMock,
            side_effect=ValueError("No resume found for this user"),
        ):
            response = await resumes_async_client.post(
                "/tailor",
                json={"job_description": "some job"},
                headers=auth_headers,
            )
        assert response.status_code == 404
