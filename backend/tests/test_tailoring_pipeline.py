"""Tests for the tailoring pipeline orchestrator."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from services.tailoring_pipeline import run_tailoring_pipeline

SAMPLE_RESUME_DOC = {
    "_id": "abc123",
    "contact": {"full_name": "Test User", "email": "test@example.com"},
    "summary": "Experienced engineer.",
    "work_experience": [
        {
            "company": "Acme",
            "title": "Staff Engineer",
            "start_date": "2020",
            "end_date": "2024",
            "current": False,
            "description": "- Built distributed systems.",
            "technologies": ["Python"],
        }
    ],
    "education": [],
    "skills": ["Python"],
    "achievements": [],
    "user_id": "user-1",
}

SAMPLE_ANALYSIS = {
    "required_skills": ["Python"],
    "preferred_skills": [],
    "seniority": "staff",
    "domain": "backend",
    "culture_signals": "startup",
    "key_requirements": ["distributed systems"],
}

SAMPLE_CHUNKS = [
    {
        "id": "pt-1",
        "score": 0.95,
        "payload": {
            "text": "Built distributed systems.",
            "chunk_type": "achievement",
            "source": "resume",
            "company": "Acme",
        },
    }
]

SAMPLE_TAILORED = {
    "contact": {"full_name": "Test User", "email": "test@example.com"},
    "summary": "Tailored summary.",
    "work_experience": SAMPLE_RESUME_DOC["work_experience"],
    "education": [],
    "skills": ["Python"],
    "achievements": [],
}

GOOD_EVALUATION = {
    "keyword_coverage": 0.95,
    "relevance_ranking": 0.90,
    "ats_compatibility": 0.92,
    "overall": 0.92,
    "issues": [],
}


class TestTailoringPipeline:
    @pytest.mark.asyncio
    async def test_full_pipeline_success(self):
        """Test the full pipeline returns tailored resume and scores."""
        mock_collection = MagicMock()
        mock_collection.find_one = AsyncMock(return_value=SAMPLE_RESUME_DOC)

        with (
            patch(
                "services.tailoring_pipeline.analyze_job_description",
                return_value=SAMPLE_ANALYSIS,
            ),
            patch(
                "services.tailoring_pipeline.embed_query",
                return_value=[0.1, 0.2],
            ),
            patch(
                "services.tailoring_pipeline.search",
                return_value=SAMPLE_CHUNKS,
            ),
            patch(
                "services.tailoring_pipeline.generate_tailored_resume",
                return_value=SAMPLE_TAILORED,
            ),
            patch(
                "services.tailoring_pipeline.evaluate_resume",
                return_value=GOOD_EVALUATION,
            ),
        ):
            result = await run_tailoring_pipeline(
                job_description="Staff backend engineer needed...",
                user_id="user-1",
                resumes_collection=mock_collection,
            )

        assert result["tailored_resume"]["summary"] == "Tailored summary."
        assert result["evaluation"]["overall"] == 0.92
        assert result["analysis"]["seniority"] == "staff"

    @pytest.mark.asyncio
    async def test_retries_when_score_below_threshold(self):
        """Test that pipeline retries generation when evaluation score < 0.80."""
        mock_collection = MagicMock()
        mock_collection.find_one = AsyncMock(return_value=SAMPLE_RESUME_DOC)

        low_eval = {
            "keyword_coverage": 0.60,
            "relevance_ranking": 0.65,
            "ats_compatibility": 0.70,
            "overall": 0.65,
            "issues": ["missing keyword X"],
        }

        generate_mock = MagicMock(return_value=SAMPLE_TAILORED)
        evaluate_mock = MagicMock(side_effect=[low_eval, GOOD_EVALUATION])

        with (
            patch(
                "services.tailoring_pipeline.analyze_job_description",
                return_value=SAMPLE_ANALYSIS,
            ),
            patch(
                "services.tailoring_pipeline.embed_query",
                return_value=[0.1, 0.2],
            ),
            patch(
                "services.tailoring_pipeline.search",
                return_value=SAMPLE_CHUNKS,
            ),
            patch(
                "services.tailoring_pipeline.generate_tailored_resume",
                generate_mock,
            ),
            patch(
                "services.tailoring_pipeline.evaluate_resume",
                evaluate_mock,
            ),
        ):
            await run_tailoring_pipeline(
                job_description="job desc",
                user_id="user-1",
                resumes_collection=mock_collection,
            )

        assert generate_mock.call_count == 2
        assert evaluate_mock.call_count == 2
        # Second generate call should include feedback
        second_call = generate_mock.call_args_list[1]
        assert second_call.kwargs["evaluator_feedback"] == ["missing keyword X"]

    @pytest.mark.asyncio
    async def test_stops_retrying_after_max_attempts(self):
        """Test that pipeline stops after max_retries even if score stays low."""
        mock_collection = MagicMock()
        mock_collection.find_one = AsyncMock(return_value=SAMPLE_RESUME_DOC)

        low_eval = {
            "keyword_coverage": 0.50,
            "relevance_ranking": 0.50,
            "ats_compatibility": 0.50,
            "overall": 0.50,
            "issues": ["everything is wrong"],
        }

        generate_mock = MagicMock(return_value=SAMPLE_TAILORED)
        evaluate_mock = MagicMock(return_value=low_eval)

        with (
            patch(
                "services.tailoring_pipeline.analyze_job_description",
                return_value=SAMPLE_ANALYSIS,
            ),
            patch(
                "services.tailoring_pipeline.embed_query",
                return_value=[0.1, 0.2],
            ),
            patch(
                "services.tailoring_pipeline.search",
                return_value=SAMPLE_CHUNKS,
            ),
            patch(
                "services.tailoring_pipeline.generate_tailored_resume",
                generate_mock,
            ),
            patch(
                "services.tailoring_pipeline.evaluate_resume",
                evaluate_mock,
            ),
        ):
            result = await run_tailoring_pipeline(
                job_description="job desc",
                user_id="user-1",
                resumes_collection=mock_collection,
            )

        # Returns best attempt even if below threshold
        assert result["evaluation"]["overall"] == 0.50
        # Verify all retry attempts were made (1 initial + MAX_RETRIES)
        assert generate_mock.call_count == 3
        assert evaluate_mock.call_count == 3

    @pytest.mark.asyncio
    async def test_raises_when_no_resume_found(self):
        """Test that pipeline raises 404-style error when user has no resume."""
        mock_collection = MagicMock()
        mock_collection.find_one = AsyncMock(return_value=None)

        with pytest.raises(ValueError, match="No resume found"):
            await run_tailoring_pipeline(
                job_description="job desc",
                user_id="user-1",
                resumes_collection=mock_collection,
            )
