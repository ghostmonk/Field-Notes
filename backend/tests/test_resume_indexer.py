"""Tests for resume indexer service."""

from unittest.mock import patch

from services.resume_indexer import index_resume

SAMPLE_RESUME = {
    "contact": {"full_name": "Test User"},
    "summary": "Experienced engineer.",
    "work_experience": [
        {
            "company": "Acme",
            "title": "Staff Engineer",
            "start_date": "2020",
            "end_date": "2024",
            "current": False,
            "description": "Built systems.\n\n- Led platform team.\n- Shipped v2.",
            "technologies": ["Python"],
        }
    ],
    "education": [],
    "skills": ["Python", "Go"],
    "achievements": ["Won hackathon"],
}


class TestResumeIndexer:
    @patch.dict(
        "os.environ",
        {"VOYAGE_API_KEY": "test-key", "QDRANT_URL": "http://localhost:6333"},
    )
    def test_indexes_resume_chunks(self):
        """Test that index_resume chunks, embeds, and upserts."""
        mock_embeddings = [[0.1] * 512] * 10

        with (
            patch(
                "services.resume_indexer.embed_texts", return_value=mock_embeddings
            ) as mock_embed,
            patch("services.resume_indexer.ensure_collection"),
            patch("services.resume_indexer.upsert_vector") as mock_upsert,
        ):
            count = index_resume(SAMPLE_RESUME, "user-1")

        assert count > 0
        mock_embed.assert_called_once()
        assert mock_upsert.call_count == count
        # Verify user_id in payload and deterministic point_id
        first_call = mock_upsert.call_args_list[0]
        assert first_call.kwargs["payload"]["user_id"] == "user-1"
        assert first_call.kwargs["point_id"] is not None

    @patch.dict("os.environ", {"VOYAGE_API_KEY": "", "QDRANT_URL": ""}, clear=False)
    def test_skips_when_env_vars_missing(self):
        """Test that indexing is skipped when API keys are not set."""
        count = index_resume(SAMPLE_RESUME, "user-1")
        assert count == 0

    @patch.dict(
        "os.environ",
        {"VOYAGE_API_KEY": "test-key", "QDRANT_URL": "http://localhost:6333"},
    )
    def test_returns_zero_for_empty_resume(self):
        """Test that empty resume produces no vectors."""
        count = index_resume({}, "user-1")
        assert count == 0
