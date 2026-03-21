"""Tests for embedding service."""

from unittest.mock import MagicMock, patch

import pytest


class TestEmbeddingService:
    def test_embed_texts_calls_voyage_client(self):
        """Test that embed_texts calls the Voyage AI client correctly."""
        import services.embedding as mod

        mod._client = None  # Reset singleton

        mock_client = MagicMock()
        mock_client.embed.return_value = MagicMock(
            embeddings=[[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]]
        )

        with patch.dict("os.environ", {"VOYAGE_API_KEY": "test-key"}):
            with patch("services.embedding.voyageai.Client", return_value=mock_client):
                mod._client = None
                result = mod.embed_texts(["hello", "world"])

        assert len(result) == 2
        assert result[0] == [0.1, 0.2, 0.3]
        mock_client.embed.assert_called_once_with(
            ["hello", "world"], model="voyage-3-lite", input_type="document"
        )

    def test_embed_query_uses_query_input_type(self):
        """Test that embed_query passes input_type='query'."""
        import services.embedding as mod

        mock_client = MagicMock()
        mock_client.embed.return_value = MagicMock(embeddings=[[0.1, 0.2, 0.3]])
        mod._client = mock_client

        result = mod.embed_query("search text")

        assert result == [0.1, 0.2, 0.3]
        mock_client.embed.assert_called_with(
            ["search text"], model="voyage-3-lite", input_type="query"
        )

    def test_embed_texts_raises_without_api_key(self):
        """Test that missing VOYAGE_API_KEY raises ValueError."""
        import services.embedding as mod

        mod._client = None

        with patch.dict("os.environ", {}, clear=True):
            with pytest.raises(ValueError, match="VOYAGE_API_KEY"):
                mod.embed_texts(["test"])
