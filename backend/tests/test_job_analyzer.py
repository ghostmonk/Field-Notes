"""Tests for job analysis service."""

import json
from unittest.mock import MagicMock, patch

import pytest
from services import anthropic_client
from services.anthropic_client import ServiceNotConfiguredError
from services.job_analyzer import analyze_job_description


class TestJobAnalyzer:
    def test_returns_structured_analysis(self):
        """Test that analyze_job_description returns structured extraction."""
        mock_response = MagicMock()
        mock_response.content = [
            MagicMock(
                text=json.dumps(
                    {
                        "required_skills": ["Python", "distributed systems"],
                        "preferred_skills": ["Kubernetes"],
                        "seniority": "staff",
                        "domain": "backend",
                        "culture_signals": "startup, remote",
                        "key_requirements": [
                            "led architecture of distributed systems",
                        ],
                    }
                )
            )
        ]

        mock_client = MagicMock()
        mock_client.messages.create.return_value = mock_response

        with patch("services.job_analyzer.get_client", return_value=mock_client):
            result, usage = analyze_job_description("We need a staff backend engineer...")

        assert result["required_skills"] == ["Python", "distributed systems"]
        assert result["seniority"] == "staff"
        assert "input_tokens" in usage
        mock_client.messages.create.assert_called_once()
        call_kwargs = mock_client.messages.create.call_args.kwargs
        assert call_kwargs["model"] == "claude-haiku-4-5-20251001"

    def test_raises_without_api_key(self):
        """Test that missing ANTHROPIC_API_KEY raises ServiceNotConfiguredError."""
        anthropic_client._client = None

        with patch.dict("os.environ", {}, clear=True):
            with pytest.raises(ServiceNotConfiguredError, match="ANTHROPIC_API_KEY"):
                anthropic_client.get_client()

    def test_handles_malformed_json_response(self):
        """Test that malformed JSON from LLM raises ValueError."""
        mock_response = MagicMock()
        mock_response.content = [MagicMock(text="not valid json")]

        mock_client = MagicMock()
        mock_client.messages.create.return_value = mock_response

        with patch("services.job_analyzer.get_client", return_value=mock_client):
            with pytest.raises(ValueError, match="Failed to parse"):
                analyze_job_description("some job description")
