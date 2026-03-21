"""Tests for vector store service."""

from unittest.mock import MagicMock, patch

import pytest
import services.vector_store as vector_store_mod


class TestVectorStore:
    def test_upsert_vector_returns_id(self):
        """Test that upsert returns a point ID."""
        mock_client = MagicMock()
        vector_store_mod._client = mock_client

        result = vector_store_mod.upsert_vector(
            vector=[0.1, 0.2, 0.3],
            payload={"chunk_type": "achievement", "source": "resume"},
            point_id="test-id",
        )

        assert result == "test-id"
        mock_client.upsert.assert_called_once()

    def test_upsert_vector_generates_id_if_not_provided(self):
        """Test that upsert generates a UUID if no ID given."""
        mock_client = MagicMock()
        vector_store_mod._client = mock_client

        result = vector_store_mod.upsert_vector(
            vector=[0.1, 0.2, 0.3],
            payload={"chunk_type": "achievement"},
        )

        assert result is not None
        assert len(result) > 0

    def test_search_returns_results(self):
        """Test that search returns formatted results."""
        mock_point = MagicMock()
        mock_point.id = "point-1"
        mock_point.score = 0.95
        mock_point.payload = {"chunk_type": "achievement", "text": "test"}

        mock_client = MagicMock()
        mock_client.query_points.return_value = MagicMock(points=[mock_point])
        vector_store_mod._client = mock_client

        results = vector_store_mod.search(query_vector=[0.1, 0.2, 0.3], limit=5)

        assert len(results) == 1
        assert results[0]["id"] == "point-1"
        assert results[0]["score"] == 0.95

    def test_search_with_source_filter(self):
        """Test that search applies source filter."""
        mock_client = MagicMock()
        mock_client.query_points.return_value = MagicMock(points=[])
        vector_store_mod._client = mock_client

        vector_store_mod.search(query_vector=[0.1], source_filter="resume")

        call_args = mock_client.query_points.call_args
        assert call_args.kwargs["query_filter"] is not None

    def test_raises_without_qdrant_url(self):
        """Test that missing QDRANT_URL raises ValueError."""
        vector_store_mod._client = None

        with patch.dict("os.environ", {}, clear=True):
            with pytest.raises(ValueError, match="QDRANT_URL"):
                vector_store_mod._get_client()
