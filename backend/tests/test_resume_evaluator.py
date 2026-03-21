"""Tests for resume evaluator service."""

import json
from unittest.mock import MagicMock, patch

import pytest

from services.resume_evaluator import evaluate_resume


SAMPLE_ANALYSIS = {
    "required_skills": ["Python", "distributed systems"],
    "preferred_skills": ["Kubernetes"],
    "seniority": "staff",
    "domain": "backend",
    "culture_signals": "startup, remote",
    "key_requirements": ["led architecture of distributed systems"],
}

SAMPLE_RESUME = {
    "contact": {"full_name": "Test User"},
    "summary": "Staff backend engineer with distributed systems experience.",
    "work_experience": [],
    "skills": ["Python", "distributed systems"],
}


class TestResumeEvaluator:
    def test_returns_score_breakdown(self):
        """Test that evaluate_resume returns scores and issues."""
        mock_response = MagicMock()
        mock_response.content = [
            MagicMock(
                text=json.dumps(
                    {
                        "keyword_coverage": 0.92,
                        "relevance_ranking": 0.88,
                        "ats_compatibility": 0.90,
                        "overall": 0.90,
                        "issues": [],
                    }
                )
            )
        ]

        mock_client = MagicMock()
        mock_client.messages.create.return_value = mock_response

        with patch("services.resume_evaluator._get_client", return_value=mock_client):
            result = evaluate_resume(
                tailored_resume=SAMPLE_RESUME,
                analysis=SAMPLE_ANALYSIS,
            )

        assert result["overall"] == 0.90
        assert result["keyword_coverage"] == 0.92
        assert isinstance(result["issues"], list)
        call_kwargs = mock_client.messages.create.call_args.kwargs
        assert call_kwargs["model"] == "claude-haiku-4-5-20251001"

    def test_returns_issues_when_score_low(self):
        """Test that low-scoring evaluations include issue descriptions."""
        mock_response = MagicMock()
        mock_response.content = [
            MagicMock(
                text=json.dumps(
                    {
                        "keyword_coverage": 0.60,
                        "relevance_ranking": 0.70,
                        "ats_compatibility": 0.80,
                        "overall": 0.70,
                        "issues": [
                            "missing 'Kubernetes' keyword",
                            "summary too generic for staff role",
                        ],
                    }
                )
            )
        ]

        mock_client = MagicMock()
        mock_client.messages.create.return_value = mock_response

        with patch("services.resume_evaluator._get_client", return_value=mock_client):
            result = evaluate_resume(
                tailored_resume=SAMPLE_RESUME,
                analysis=SAMPLE_ANALYSIS,
            )

        assert result["overall"] == 0.70
        assert len(result["issues"]) == 2

    def test_handles_malformed_json(self):
        """Test that malformed JSON from LLM raises ValueError."""
        mock_response = MagicMock()
        mock_response.content = [MagicMock(text="not json")]

        mock_client = MagicMock()
        mock_client.messages.create.return_value = mock_response

        with patch("services.resume_evaluator._get_client", return_value=mock_client):
            with pytest.raises(ValueError, match="Failed to parse"):
                evaluate_resume(
                    tailored_resume=SAMPLE_RESUME,
                    analysis=SAMPLE_ANALYSIS,
                )
