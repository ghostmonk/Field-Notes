"""Tests for vector store service."""

from unittest.mock import MagicMock, patch

import pytest


class TestVectorStore:
    def test_upsert_vector_returns_id(self):
        """Test that upsert returns a point ID."""
        import services.vector_store as mod

        mock_client = MagicMock()
        mod._client = mock_client

        result = mod.upsert_vector(
            vector=[0.1, 0.2, 0.3],
            payload={"chunk_type": "achievement", "source": "resume"},
            point_id="test-id",
        )

        assert result == "test-id"
        mock_client.upsert.assert_called_once()

    def test_upsert_vector_generates_id_if_not_provided(self):
        """Test that upsert generates a UUID if no ID given."""
        import services.vector_store as mod

        mock_client = MagicMock()
        mod._client = mock_client

        result = mod.upsert_vector(
            vector=[0.1, 0.2, 0.3],
            payload={"chunk_type": "achievement"},
        )

        assert result is not None
        assert len(result) > 0

    def test_search_returns_results(self):
        """Test that search returns formatted results."""
        import services.vector_store as mod

        mock_point = MagicMock()
        mock_point.id = "point-1"
        mock_point.score = 0.95
        mock_point.payload = {"chunk_type": "achievement", "text": "test"}

        mock_client = MagicMock()
        mock_client.query_points.return_value = MagicMock(points=[mock_point])
        mod._client = mock_client

        results = mod.search(query_vector=[0.1, 0.2, 0.3], limit=5)

        assert len(results) == 1
        assert results[0]["id"] == "point-1"
        assert results[0]["score"] == 0.95

    def test_search_with_source_filter(self):
        """Test that search applies source filter."""
        import services.vector_store as mod

        mock_client = MagicMock()
        mock_client.query_points.return_value = MagicMock(points=[])
        mod._client = mock_client

        mod.search(query_vector=[0.1], source_filter="resume")

        call_args = mock_client.query_points.call_args
        assert call_args.kwargs["query_filter"] is not None

    def test_raises_without_qdrant_url(self):
        """Test that missing QDRANT_URL raises ValueError."""
        import services.vector_store as mod

        mod._client = None

        with patch.dict("os.environ", {}, clear=True):
            with pytest.raises(ValueError, match="QDRANT_URL"):
                mod._get_client()
