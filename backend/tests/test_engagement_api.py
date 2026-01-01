"""Tests for engagement API endpoints."""

from datetime import datetime, timezone

import pytest
from bson import ObjectId
from unittest.mock import MagicMock


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

    @pytest.mark.asyncio
    async def test_toggle_reaction_add(
        self, engagement_async_client, mock_reactions_collection, mock_auth, auth_headers
    ):
        """Test adding a new reaction."""
        target_id = "507f1f77bcf86cd799439011"

        # Mock: reaction doesn't exist yet
        mock_reactions_collection.find_one.return_value = None
        mock_reactions_collection.insert_one.return_value = MagicMock(
            inserted_id=ObjectId()
        )

        response = await engagement_async_client.post(
            f"/api/engagement/story/{target_id}/reactions",
            json={"reaction_tag": "thumbup"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["added"] is True

    @pytest.mark.asyncio
    async def test_toggle_reaction_remove(
        self, engagement_async_client, mock_reactions_collection, mock_auth, auth_headers
    ):
        """Test removing an existing reaction."""
        target_id = "507f1f77bcf86cd799439011"

        # Mock: reaction already exists
        mock_reactions_collection.find_one.return_value = {
            "_id": ObjectId(),
            "reaction_tag": "thumbup",
        }
        mock_reactions_collection.delete_one.return_value = MagicMock(deleted_count=1)

        response = await engagement_async_client.post(
            f"/api/engagement/story/{target_id}/reactions",
            json={"reaction_tag": "thumbup"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["added"] is False

    @pytest.mark.asyncio
    async def test_toggle_reaction_unauthorized(self, engagement_async_client):
        """Test that unauthenticated users cannot react."""
        response = await engagement_async_client.post(
            "/api/engagement/story/507f1f77bcf86cd799439011/reactions",
            json={"reaction_tag": "thumbup"},
        )
        assert response.status_code == 401


class TestCommentsAPI:
    """Tests for comments endpoints."""

    @pytest.mark.asyncio
    async def test_get_comments_empty(self, engagement_async_client, override_engagement_database):
        """Test getting comments when none exist."""
        mock_comments_collection = override_engagement_database[1]
        mock_cursor = MockAsyncCursor([])
        mock_cursor.sort = MagicMock(return_value=mock_cursor)
        mock_comments_collection.find.return_value = mock_cursor

        response = await engagement_async_client.get(
            "/api/engagement/story/507f1f77bcf86cd799439011/comments"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["comments"] == []

    @pytest.mark.asyncio
    async def test_get_comments_with_replies(
        self, engagement_async_client, override_engagement_database
    ):
        """Test getting comments with nested replies."""
        mock_comments_collection = override_engagement_database[1]
        target_id = "507f1f77bcf86cd799439011"
        parent_id = ObjectId()
        reply_id = ObjectId()

        mock_cursor = MockAsyncCursor([
            {
                "_id": parent_id,
                "target_type": "story",
                "target_id": target_id,
                "parent_id": None,
                "user_id": "user1",
                "user_name": "Alice",
                "user_avatar": None,
                "content": "Great post!",
                "mentions": [],
                "created_at": datetime(2025, 1, 1, tzinfo=timezone.utc),
                "updated_at": datetime(2025, 1, 1, tzinfo=timezone.utc),
                "deleted_at": None,
            },
            {
                "_id": reply_id,
                "target_type": "story",
                "target_id": target_id,
                "parent_id": str(parent_id),
                "user_id": "user2",
                "user_name": "Bob",
                "user_avatar": None,
                "content": "Thanks!",
                "mentions": [],
                "created_at": datetime(2025, 1, 1, tzinfo=timezone.utc),
                "updated_at": datetime(2025, 1, 1, tzinfo=timezone.utc),
                "deleted_at": None,
            },
        ])
        mock_cursor.sort = MagicMock(return_value=mock_cursor)
        mock_comments_collection.find.return_value = mock_cursor

        response = await engagement_async_client.get(
            f"/api/engagement/story/{target_id}/comments"
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["comments"]) == 1  # Only top-level
        assert len(data["comments"][0]["replies"]) == 1  # One reply

    @pytest.mark.asyncio
    async def test_create_comment(
        self, engagement_async_client, mock_auth, auth_headers, override_engagement_database
    ):
        """Test creating a new comment."""
        target_id = "507f1f77bcf86cd799439011"
        new_comment_id = ObjectId()

        # Get mock_comments_collection from override_engagement_database
        mock_comments_collection = override_engagement_database[1]

        mock_comments_collection.insert_one.return_value = MagicMock(
            inserted_id=new_comment_id
        )
        mock_comments_collection.find_one.return_value = {
            "_id": new_comment_id,
            "target_type": "story",
            "target_id": target_id,
            "parent_id": None,
            "user_id": "user1",
            "user_name": "Test User",
            "user_avatar": None,
            "content": "This is my comment",
            "mentions": [],
            "created_at": datetime(2025, 1, 1, tzinfo=timezone.utc),
            "updated_at": datetime(2025, 1, 1, tzinfo=timezone.utc),
            "deleted_at": None,
        }

        response = await engagement_async_client.post(
            f"/api/engagement/story/{target_id}/comments",
            json={"content": "This is my comment", "parent_id": None, "mentions": []},
            headers=auth_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["content"] == "This is my comment"

    @pytest.mark.asyncio
    async def test_create_comment_unauthorized(self, engagement_async_client, override_engagement_database):
        """Test that unauthenticated users cannot comment."""
        response = await engagement_async_client.post(
            "/api/engagement/story/507f1f77bcf86cd799439011/comments",
            json={"content": "test", "parent_id": None, "mentions": []},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_delete_own_comment(
        self, engagement_async_client, mock_auth, auth_headers, override_engagement_database, mock_users_collection
    ):
        """Test soft-deleting own comment."""
        comment_id = ObjectId()

        # Get mock from override fixture
        mock_comments_collection = override_engagement_database[1]

        # The mock_auth fixture sets up mock_users_collection.find_one_and_update.return_value
        # with the user document. The user.id is str(user_doc["_id"])
        mock_user_doc = mock_users_collection.find_one_and_update.return_value
        mock_user_id = str(mock_user_doc["_id"])

        # Mock: comment exists and belongs to the authenticated user
        mock_comments_collection.find_one.return_value = {
            "_id": comment_id,
            "user_id": mock_user_id,
            "deleted_at": None,
        }
        mock_comments_collection.update_one.return_value = MagicMock(modified_count=1)

        response = await engagement_async_client.delete(
            f"/api/engagement/comments/{comment_id}",
            headers=auth_headers,
        )
        assert response.status_code == 204

    @pytest.mark.asyncio
    async def test_delete_others_comment_forbidden(
        self, engagement_async_client, mock_auth, auth_headers, override_engagement_database
    ):
        """Test that users cannot delete others' comments."""
        comment_id = ObjectId()

        # Get mock from override fixture
        mock_comments_collection = override_engagement_database[1]

        # Mock: comment belongs to different user
        mock_comments_collection.find_one.return_value = {
            "_id": comment_id,
            "user_id": "different_user_id",
            "deleted_at": None,
        }

        response = await engagement_async_client.delete(
            f"/api/engagement/comments/{comment_id}",
            headers=auth_headers,
        )
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_delete_comment_unauthorized(self, engagement_async_client, override_engagement_database):
        """Test that unauthenticated users cannot delete comments."""
        comment_id = ObjectId()
        response = await engagement_async_client.delete(
            f"/api/engagement/comments/{comment_id}",
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_delete_comment_not_found(
        self, engagement_async_client, mock_auth, auth_headers, override_engagement_database
    ):
        """Test deleting a non-existent comment returns 404."""
        comment_id = ObjectId()

        # Get mock from override fixture
        mock_comments_collection = override_engagement_database[1]

        # Mock: comment doesn't exist
        mock_comments_collection.find_one.return_value = None

        response = await engagement_async_client.delete(
            f"/api/engagement/comments/{comment_id}",
            headers=auth_headers,
        )
        assert response.status_code == 404
