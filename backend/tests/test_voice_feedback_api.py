"""Tests for voice feedback endpoints."""

from unittest.mock import patch

import pytest

SAMPLE_FEEDBACK = {
    "original_text": "Led cross-functional initiatives across teams",
    "final_text": None,
    "feedback_type": "approved",
    "job_context": "staff_backend",
    "note": None,
    "section_type": "achievement",
}


class TestVoiceFeedbackEndpoint:
    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_submit_feedback_requires_auth(self, resumes_async_client):
        """Test POST /voice/feedback without auth returns 401."""
        response = await resumes_async_client.post("/voice/feedback", json=SAMPLE_FEEDBACK)
        assert response.status_code == 401

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_submit_feedback_creates_entry(
        self, resumes_async_client, mock_auth, auth_headers
    ):
        """Test POST /voice/feedback creates and returns feedback."""
        with patch("handlers.voice_feedback.index_feedback"):
            response = await resumes_async_client.post(
                "/voice/feedback",
                json=SAMPLE_FEEDBACK,
                headers=auth_headers,
            )

        assert response.status_code == 201
        data = response.json()
        assert data["original_text"] == SAMPLE_FEEDBACK["original_text"]
        assert data["feedback_type"] == "approved"
        assert data["job_context"] == "staff_backend"
        assert "id" in data
        assert "user_id" in data

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_submit_feedback_rejects_invalid_type(
        self, resumes_async_client, mock_auth, auth_headers
    ):
        """Test POST /voice/feedback rejects invalid feedback_type."""
        bad_feedback = {**SAMPLE_FEEDBACK, "feedback_type": "invalid"}
        response = await resumes_async_client.post(
            "/voice/feedback",
            json=bad_feedback,
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_list_feedback_requires_auth(self, resumes_async_client):
        """Test GET /voice/feedback without auth returns 401."""
        response = await resumes_async_client.get("/voice/feedback")
        assert response.status_code == 401

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_list_feedback_returns_entries(
        self, resumes_async_client, mock_auth, auth_headers
    ):
        """Test GET /voice/feedback returns user's feedback."""
        # Create a feedback entry first
        with patch("handlers.voice_feedback.index_feedback"):
            await resumes_async_client.post(
                "/voice/feedback",
                json=SAMPLE_FEEDBACK,
                headers=auth_headers,
            )

        response = await resumes_async_client.get(
            "/voice/feedback",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert data[0]["feedback_type"] == "approved"

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_submit_edited_feedback_uses_final_text(
        self, resumes_async_client, mock_auth, auth_headers
    ):
        """Test that edited feedback includes final_text."""
        edited = {
            **SAMPLE_FEEDBACK,
            "feedback_type": "edited",
            "final_text": "Led the clinical platform team",
            "note": "Too corporate, keep it direct",
        }
        with patch("handlers.voice_feedback.index_feedback"):
            response = await resumes_async_client.post(
                "/voice/feedback",
                json=edited,
                headers=auth_headers,
            )

        assert response.status_code == 201
        data = response.json()
        assert data["final_text"] == "Led the clinical platform team"
        assert data["note"] == "Too corporate, keep it direct"
