"""Tests for content search endpoint."""

from unittest.mock import patch

import pytest


class TestContentSearch:
    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_search_requires_auth(self, async_client):
        """Test POST /content/search without auth returns 401."""
        response = await async_client.post("/content/search", json={"query": "test"})
        assert response.status_code == 401

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_search_returns_results(self, async_client, mock_auth, auth_headers):
        """Test POST /content/search returns search results."""
        mock_results = [
            {
                "id": "point-1",
                "score": 0.95,
                "payload": {
                    "text": "Built distributed systems",
                    "chunk_type": "achievement",
                    "source": "resume",
                    "company": "Ro",
                },
            }
        ]

        with (
            patch("handlers.content.embed_query", return_value=[0.1, 0.2]),
            patch("handlers.content.search", return_value=mock_results),
        ):
            response = await async_client.post(
                "/content/search",
                json={"query": "distributed systems"},
                headers=auth_headers,
            )

        assert response.status_code == 200
        data = response.json()
        assert len(data["results"]) == 1
        assert data["results"][0]["text"] == "Built distributed systems"
        assert data["results"][0]["score"] == 0.95
