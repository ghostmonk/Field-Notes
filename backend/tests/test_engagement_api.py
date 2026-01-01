"""Tests for engagement API endpoints."""

import pytest
from bson import ObjectId


class MockAsyncCursor:
    """Mock async cursor for MongoDB find operations."""

    def __init__(self, items):
        self.items = items
        self.index = 0

    def __aiter__(self):
        return self

    async def __anext__(self):
        if self.index >= len(self.items):
            raise StopAsyncIteration
        item = self.items[self.index]
        self.index += 1
        return item

    async def to_list(self, length=None):
        return self.items


class TestReactionsAPI:
    """Tests for reactions endpoints."""

    @pytest.mark.asyncio
    async def test_get_reactions_empty(self, engagement_async_client, mock_reactions_collection):
        """Test getting reactions when none exist."""
        # Mock find to return empty cursor
        mock_cursor = MockAsyncCursor([])
        mock_reactions_collection.find.return_value = mock_cursor

        response = await engagement_async_client.get(
            "/api/engagement/story/507f1f77bcf86cd799439011/reactions"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["counts"] == {}
        assert data["user_reactions"] == []
        assert data["details"] == {}

    @pytest.mark.asyncio
    async def test_get_reactions_with_data(
        self, engagement_async_client, mock_reactions_collection
    ):
        """Test getting reactions when some exist."""
        target_id = "507f1f77bcf86cd799439011"

        # Mock find to return reactions
        mock_cursor = MockAsyncCursor(
            [
                {
                    "_id": ObjectId(),
                    "target_type": "story",
                    "target_id": target_id,
                    "user_id": "user1",
                    "user_name": "Alice",
                    "reaction_tag": "thumbup",
                },
                {
                    "_id": ObjectId(),
                    "target_type": "story",
                    "target_id": target_id,
                    "user_id": "user2",
                    "user_name": "Bob",
                    "reaction_tag": "thumbup",
                },
            ]
        )
        mock_reactions_collection.find.return_value = mock_cursor

        response = await engagement_async_client.get(
            f"/api/engagement/story/{target_id}/reactions"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["counts"]["thumbup"] == 2
