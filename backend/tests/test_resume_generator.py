"""Tests for resume generator service."""

import json
from unittest.mock import MagicMock, patch

import pytest
from services.resume_generator import generate_tailored_resume

SAMPLE_RESUME = {
    "contact": {"full_name": "Test User", "email": "test@example.com"},
    "summary": "Experienced engineer.",
    "work_experience": [
        {
            "company": "Acme",
            "title": "Staff Engineer",
            "start_date": "2020",
            "end_date": "2024",
            "current": False,
            "description": "- Built distributed systems.\n- Led platform team.",
            "technologies": ["Python", "Go"],
        }
    ],
    "education": [],
    "skills": ["Python", "Go", "Docker"],
    "achievements": [],
}

SAMPLE_ANALYSIS = {
    "required_skills": ["Python", "distributed systems"],
    "preferred_skills": ["Kubernetes"],
    "seniority": "staff",
    "domain": "backend",
    "culture_signals": "startup, remote",
    "key_requirements": ["led architecture of distributed systems"],
}

SAMPLE_CHUNKS = [
    {"text": "Staff Engineer at Acme: Built distributed systems.", "score": 0.95},
    {"text": "Python: used at Acme as Staff Engineer", "score": 0.90},
]


class TestResumeGenerator:
    def test_returns_tailored_resume_json(self):
        """Test that generate_tailored_resume returns a resume dict."""
        tailored = {**SAMPLE_RESUME, "summary": "Tailored summary for backend role."}

        mock_response = MagicMock()
        mock_response.content = [MagicMock(text=json.dumps(tailored))]

        mock_client = MagicMock()
        mock_client.messages.create.return_value = mock_response

        with patch("services.resume_generator._get_client", return_value=mock_client):
            result = generate_tailored_resume(
                resume=SAMPLE_RESUME,
                analysis=SAMPLE_ANALYSIS,
                chunks=SAMPLE_CHUNKS,
            )

        assert result["summary"] == "Tailored summary for backend role."
        call_kwargs = mock_client.messages.create.call_args.kwargs
        assert call_kwargs["model"] == "claude-sonnet-4-6"

    def test_passes_resume_and_chunks_in_prompt(self):
        """Test that the prompt contains resume data and retrieved chunks."""
        mock_response = MagicMock()
        mock_response.content = [MagicMock(text=json.dumps(SAMPLE_RESUME))]

        mock_client = MagicMock()
        mock_client.messages.create.return_value = mock_response

        with patch("services.resume_generator._get_client", return_value=mock_client):
            generate_tailored_resume(
                resume=SAMPLE_RESUME,
                analysis=SAMPLE_ANALYSIS,
                chunks=SAMPLE_CHUNKS,
            )

        call_kwargs = mock_client.messages.create.call_args.kwargs
        user_msg = call_kwargs["messages"][0]["content"]
        assert "Acme" in user_msg
        assert "distributed systems" in user_msg

    def test_includes_evaluator_feedback_when_provided(self):
        """Test that evaluator issues are appended to the prompt on retry."""
        mock_response = MagicMock()
        mock_response.content = [MagicMock(text=json.dumps(SAMPLE_RESUME))]

        mock_client = MagicMock()
        mock_client.messages.create.return_value = mock_response

        with patch("services.resume_generator._get_client", return_value=mock_client):
            generate_tailored_resume(
                resume=SAMPLE_RESUME,
                analysis=SAMPLE_ANALYSIS,
                chunks=SAMPLE_CHUNKS,
                evaluator_feedback=["missing 'Kubernetes' keyword", "summary too generic"],
            )

        call_kwargs = mock_client.messages.create.call_args.kwargs
        user_msg = call_kwargs["messages"][0]["content"]
        assert "missing 'Kubernetes' keyword" in user_msg
        assert "summary too generic" in user_msg

    def test_handles_malformed_json(self):
        """Test that malformed JSON from LLM raises ValueError."""
        mock_response = MagicMock()
        mock_response.content = [MagicMock(text="not json")]

        mock_client = MagicMock()
        mock_client.messages.create.return_value = mock_response

        with patch("services.resume_generator._get_client", return_value=mock_client):
            with pytest.raises(ValueError, match="Failed to parse"):
                generate_tailored_resume(
                    resume=SAMPLE_RESUME,
                    analysis=SAMPLE_ANALYSIS,
                    chunks=SAMPLE_CHUNKS,
                )
