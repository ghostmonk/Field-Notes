# Engagement System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add reactions and comments to Stories (and other content types) with real-time updates.

**Architecture:** Generic engagement system using `target_type` + `target_id` pattern. Backend stores semantic reaction tags; frontend decides display. WebSocket for real-time with configurable fallback to polling.

**Tech Stack:** FastAPI (backend), Next.js (frontend), MongoDB (storage), WebSockets (real-time), Pydantic (validation)

---

## Task 1: Backend Configuration

**Files:**
- Create: `backend/config/__init__.py`
- Create: `backend/config/engagement.py`

**Step 1: Create config directory**

```bash
mkdir -p backend/config
```

**Step 2: Create `backend/config/__init__.py`**

```python
"""Configuration module."""
```

**Step 3: Create `backend/config/engagement.py`**

```python
"""
TEMPORARY: Engagement configuration

TODO: Move to section configuration when dynamic section routing
is implemented. This file should be deleted and engagement settings
should be defined per-section in the section config system.
"""

ENGAGEMENT_ENABLED_TYPES: dict[str, dict[str, bool]] = {
    "story": {"reactions": True, "comments": True},
    "project": {"reactions": True, "comments": False},
}

ALLOWED_REACTION_TAGS: list[str] = [
    "thumbup",
    "heart",
    "surprise",
    "celebrate",
    "insightful",
]

REALTIME_STRATEGY: str = "websocket"  # or "polling" or "none"
POLLING_INTERVAL_SECONDS: int = 10
```

**Step 4: Commit**

```bash
git add backend/config/
git commit -m "feat(engagement): add backend configuration"
```

---

## Task 2: Backend Models - Reactions

**Files:**
- Create: `backend/models/reaction.py`
- Test: `backend/tests/test_engagement_models.py`

**Step 1: Write failing test for ReactionCreate model**

Create `backend/tests/test_engagement_models.py`:

```python
"""Tests for engagement models (reactions and comments)."""

import pytest
from pydantic import ValidationError


class TestReactionModels:
    """Tests for reaction Pydantic models."""

    def test_reaction_create_valid(self):
        """Test creating a valid reaction."""
        from models.reaction import ReactionCreate

        reaction = ReactionCreate(reaction_tag="thumbup")
        assert reaction.reaction_tag == "thumbup"

    def test_reaction_create_invalid_tag(self):
        """Test that invalid reaction tags are rejected."""
        from models.reaction import ReactionCreate

        with pytest.raises(ValidationError) as exc_info:
            ReactionCreate(reaction_tag="invalid_tag")
        assert "reaction_tag" in str(exc_info.value)
```

**Step 2: Run test to verify it fails**

```bash
cd backend && python -m pytest tests/test_engagement_models.py::TestReactionModels::test_reaction_create_valid -v
```

Expected: FAIL with "ModuleNotFoundError: No module named 'models.reaction'"

**Step 3: Write ReactionCreate model**

Create `backend/models/reaction.py`:

```python
"""Reaction-related Pydantic models."""

from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from config.engagement import ALLOWED_REACTION_TAGS

ReactionTag = Literal["thumbup", "heart", "surprise", "celebrate", "insightful"]


class ReactionCreate(BaseModel):
    """Model for creating/toggling a reaction."""

    reaction_tag: str = Field(..., description="The semantic reaction tag")

    @field_validator("reaction_tag")
    @classmethod
    def validate_reaction_tag(cls, v: str) -> str:
        """Validate that reaction_tag is in the allowed list."""
        if v not in ALLOWED_REACTION_TAGS:
            raise ValueError(f"Invalid reaction tag. Allowed: {ALLOWED_REACTION_TAGS}")
        return v


class ReactionResponse(BaseModel):
    """Model for a single reaction in API responses."""

    id: str
    target_type: str
    target_id: str
    user_id: str
    user_name: str
    reaction_tag: str
    created_at: datetime

    @field_validator("created_at")
    @classmethod
    def ensure_utc(cls, value: datetime) -> datetime:
        """Ensure datetime is in UTC timezone."""
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    model_config = ConfigDict(from_attributes=True)


class ReactionCounts(BaseModel):
    """Model for reaction counts by tag."""

    counts: dict[str, int] = Field(default_factory=dict)
    user_reactions: list[str] = Field(default_factory=list)
    details: dict[str, list[dict[str, str]]] = Field(default_factory=dict)


class BulkCountsRequest(BaseModel):
    """Request model for bulk counts endpoint."""

    targets: list[dict[str, str]] = Field(
        ..., description="List of {type, id} objects"
    )


class BulkCountsResponse(BaseModel):
    """Response model for bulk counts endpoint."""

    counts: dict[str, dict[str, int | dict[str, int]]] = Field(default_factory=dict)
```

**Step 4: Run tests to verify they pass**

```bash
cd backend && python -m pytest tests/test_engagement_models.py::TestReactionModels -v
```

Expected: PASS

**Step 5: Commit**

```bash
git add backend/models/reaction.py backend/tests/test_engagement_models.py
git commit -m "feat(engagement): add reaction models with validation"
```

---

## Task 3: Backend Models - Comments

**Files:**
- Modify: `backend/models/comment.py` (create)
- Modify: `backend/tests/test_engagement_models.py`

**Step 1: Add failing tests for comment models**

Append to `backend/tests/test_engagement_models.py`:

```python
class TestCommentModels:
    """Tests for comment Pydantic models."""

    def test_comment_create_valid(self):
        """Test creating a valid comment."""
        from models.comment import CommentCreate

        comment = CommentCreate(
            content="This is a test comment",
            parent_id=None,
            mentions=[],
        )
        assert comment.content == "This is a test comment"
        assert comment.parent_id is None

    def test_comment_create_with_mentions(self):
        """Test creating a comment with mentions."""
        from models.comment import CommentCreate, Mention

        mention = Mention(user_id="user123", user_name="John Doe")
        comment = CommentCreate(
            content="Hey @John Doe check this out",
            parent_id=None,
            mentions=[mention],
        )
        assert len(comment.mentions) == 1
        assert comment.mentions[0].user_name == "John Doe"

    def test_comment_create_empty_content_rejected(self):
        """Test that empty content is rejected."""
        from models.comment import CommentCreate

        with pytest.raises(ValidationError):
            CommentCreate(content="", parent_id=None, mentions=[])
```

**Step 2: Run test to verify it fails**

```bash
cd backend && python -m pytest tests/test_engagement_models.py::TestCommentModels::test_comment_create_valid -v
```

Expected: FAIL with "ModuleNotFoundError: No module named 'models.comment'"

**Step 3: Write comment models**

Create `backend/models/comment.py`:

```python
"""Comment-related Pydantic models."""

from datetime import datetime, timezone

from pydantic import BaseModel, ConfigDict, Field, field_validator


class Mention(BaseModel):
    """Model for a user mention within a comment."""

    user_id: str
    user_name: str


class CommentCreate(BaseModel):
    """Model for creating a new comment."""

    content: str = Field(..., min_length=1, max_length=5000)
    parent_id: str | None = Field(None, description="Parent comment ID for replies")
    mentions: list[Mention] = Field(default_factory=list)


class CommentResponse(BaseModel):
    """Model for comment API responses."""

    id: str
    target_type: str
    target_id: str
    parent_id: str | None
    user_id: str
    user_name: str
    user_avatar: str | None
    content: str
    mentions: list[Mention]
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None
    replies: list["CommentResponse"] = Field(default_factory=list)

    @field_validator("created_at", "updated_at")
    @classmethod
    def ensure_utc(cls, value: datetime) -> datetime:
        """Ensure datetime is in UTC timezone."""
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    model_config = ConfigDict(from_attributes=True)


# Enable forward reference for nested replies
CommentResponse.model_rebuild()
```

**Step 4: Run tests to verify they pass**

```bash
cd backend && python -m pytest tests/test_engagement_models.py::TestCommentModels -v
```

Expected: PASS

**Step 5: Commit**

```bash
git add backend/models/comment.py backend/tests/test_engagement_models.py
git commit -m "feat(engagement): add comment models with mentions support"
```

---

## Task 4: Database Collection Getters

**Files:**
- Modify: `backend/database.py`

**Step 1: Add collection getters for reactions and comments**

Add to `backend/database.py` after the existing collection getters:

```python
async def get_reactions_collection() -> AsyncIOMotorCollection:
    db = await get_db()
    return db["reactions"]


async def get_comments_collection() -> AsyncIOMotorCollection:
    db = await get_db()
    return db["comments"]
```

**Step 2: Add indexes in ensure_indexes function**

Add to the `ensure_indexes` function in `backend/database.py`:

```python
    # Reactions indexes
    reactions = db["reactions"]
    await safe_create_index(reactions, [("target_type", 1), ("target_id", 1)])
    if not await safe_create_index(
        reactions,
        [("target_type", 1), ("target_id", 1), ("user_id", 1), ("reaction_tag", 1)],
        unique=True,
        name="unique_user_reaction",
    ):
        failed_indexes.append("reactions.unique_user_reaction")

    # Comments indexes
    comments = db["comments"]
    await safe_create_index(comments, [("target_type", 1), ("target_id", 1)])
    await safe_create_index(comments, "parent_id")
```

**Step 3: Commit**

```bash
git add backend/database.py
git commit -m "feat(engagement): add reactions and comments collection getters and indexes"
```

---

## Task 5: Backend Handler - Reactions GET (Public)

**Files:**
- Create: `backend/handlers/engagement.py`
- Create: `backend/tests/test_engagement_api.py`

**Step 1: Write failing test for GET reactions**

Create `backend/tests/test_engagement_api.py`:

```python
"""Tests for engagement API endpoints."""

import pytest
from bson import ObjectId


class TestReactionsAPI:
    """Tests for reactions endpoints."""

    @pytest.mark.asyncio
    async def test_get_reactions_empty(self, engagement_async_client):
        """Test getting reactions when none exist."""
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
```

**Step 2: Add test fixtures to conftest.py**

Add to `backend/tests/conftest.py`:

```python
from database import get_reactions_collection, get_comments_collection


@pytest.fixture
def mock_reactions_collection():
    """Mock collection for reactions testing"""
    mock = MagicMock()
    mock.find_one = AsyncMock()
    mock.find = MagicMock()  # Returns cursor synchronously
    mock.count_documents = AsyncMock()
    mock.insert_one = AsyncMock()
    mock.delete_one = AsyncMock()
    return mock


@pytest.fixture
def mock_comments_collection():
    """Mock collection for comments testing"""
    mock = MagicMock()
    mock.find_one = AsyncMock()
    mock.find = MagicMock()  # Returns cursor synchronously
    mock.count_documents = AsyncMock()
    mock.insert_one = AsyncMock()
    mock.update_one = AsyncMock()
    return mock


@pytest.fixture
def override_engagement_database(mock_reactions_collection, mock_comments_collection):
    """Override engagement collections to use mocks"""

    async def get_mock_reactions_collection():
        return mock_reactions_collection

    async def get_mock_comments_collection():
        return mock_comments_collection

    test_app.dependency_overrides[get_reactions_collection] = get_mock_reactions_collection
    test_app.dependency_overrides[get_comments_collection] = get_mock_comments_collection
    yield mock_reactions_collection, mock_comments_collection
    test_app.dependency_overrides.pop(get_reactions_collection, None)
    test_app.dependency_overrides.pop(get_comments_collection, None)


@pytest_asyncio.fixture
async def engagement_async_client(override_engagement_database):
    """Async test client for engagement tests"""
    async with AsyncClient(transport=ASGITransport(app=test_app), base_url="http://test") as ac:
        yield ac
```

**Step 3: Run test to verify it fails**

```bash
cd backend && python -m pytest tests/test_engagement_api.py::TestReactionsAPI::test_get_reactions_empty -v
```

Expected: FAIL (handler doesn't exist)

**Step 4: Create engagement handler with GET reactions**

Create `backend/handlers/engagement.py`:

```python
"""Engagement handlers for reactions and comments."""

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request

from config.engagement import ENGAGEMENT_ENABLED_TYPES
from database import get_reactions_collection, get_comments_collection
from glogger import logger
from models.reaction import ReactionCounts
from motor.motor_asyncio import AsyncIOMotorCollection

router = APIRouter(prefix="/api/engagement")


def validate_target_type(target_type: str, feature: str) -> None:
    """Validate that target_type has the feature enabled."""
    if target_type not in ENGAGEMENT_ENABLED_TYPES:
        raise HTTPException(
            status_code=422,
            detail={"error": "invalid_target_type", "message": f"Unknown target type: {target_type}"},
        )
    if not ENGAGEMENT_ENABLED_TYPES[target_type].get(feature, False):
        raise HTTPException(
            status_code=422,
            detail={"error": "feature_disabled", "message": f"{feature} disabled for {target_type}"},
        )


@router.get("/{target_type}/{target_id}/reactions")
async def get_reactions(
    request: Request,
    target_type: str,
    target_id: str,
    reactions_collection: AsyncIOMotorCollection = Depends(get_reactions_collection),
) -> ReactionCounts:
    """Get reactions for a target. Public endpoint."""
    validate_target_type(target_type, "reactions")

    if not ObjectId.is_valid(target_id):
        raise HTTPException(status_code=400, detail="Invalid target ID format")

    logger.info_with_context(
        "Fetching reactions",
        {"target_type": target_type, "target_id": target_id},
    )

    # Get all reactions for this target
    cursor = reactions_collection.find(
        {"target_type": target_type, "target_id": target_id}
    )
    reactions = await cursor.to_list(length=1000)

    # Build counts and details
    counts: dict[str, int] = {}
    details: dict[str, list[dict[str, str]]] = {}

    for reaction in reactions:
        tag = reaction["reaction_tag"]
        counts[tag] = counts.get(tag, 0) + 1
        if tag not in details:
            details[tag] = []
        details[tag].append({
            "user_id": reaction["user_id"],
            "user_name": reaction["user_name"],
        })

    # Get current user's reactions if authenticated
    user_reactions: list[str] = []
    if hasattr(request.state, "user") and request.state.user:
        user_id = request.state.user.id
        user_reactions = [r["reaction_tag"] for r in reactions if r["user_id"] == user_id]

    return ReactionCounts(counts=counts, user_reactions=user_reactions, details=details)
```

**Step 5: Register router in app.py**

Add to `backend/app.py` imports:

```python
from handlers.engagement import router as engagement_router
```

Add to router registration:

```python
app.include_router(engagement_router)
```

**Step 6: Add router to test_app in conftest.py**

Add to `backend/tests/conftest.py`:

```python
from handlers.engagement import router as engagement_router
test_app.include_router(engagement_router)
```

**Step 7: Run tests to verify they pass**

```bash
cd backend && python -m pytest tests/test_engagement_api.py::TestReactionsAPI -v
```

Expected: PASS

**Step 8: Commit**

```bash
git add backend/handlers/engagement.py backend/app.py backend/tests/test_engagement_api.py backend/tests/conftest.py
git commit -m "feat(engagement): add GET reactions endpoint (public)"
```

---

## Task 6: Backend Handler - Reactions POST (Auth Required)

**Files:**
- Modify: `backend/handlers/engagement.py`
- Modify: `backend/tests/test_engagement_api.py`

**Step 1: Add failing test for POST reactions**

Add to `backend/tests/test_engagement_api.py`:

```python
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
```

**Step 2: Run test to verify it fails**

```bash
cd backend && python -m pytest tests/test_engagement_api.py::TestReactionsAPI::test_toggle_reaction_add -v
```

Expected: FAIL (endpoint doesn't exist)

**Step 3: Add POST reactions endpoint**

Add to `backend/handlers/engagement.py`:

```python
from datetime import datetime, timezone
from decorators.auth import requires_auth
from models.reaction import ReactionCreate
from models.user import UserInfo


@router.post("/{target_type}/{target_id}/reactions")
@requires_auth
async def toggle_reaction(
    request: Request,
    target_type: str,
    target_id: str,
    reaction: ReactionCreate,
    reactions_collection: AsyncIOMotorCollection = Depends(get_reactions_collection),
) -> dict:
    """Toggle a reaction (add if missing, remove if exists). Requires auth."""
    validate_target_type(target_type, "reactions")

    if not ObjectId.is_valid(target_id):
        raise HTTPException(status_code=400, detail="Invalid target ID format")

    user: UserInfo = request.state.user

    logger.info_with_context(
        "Toggling reaction",
        {
            "target_type": target_type,
            "target_id": target_id,
            "user_id": user.id,
            "reaction_tag": reaction.reaction_tag,
        },
    )

    # Check if reaction already exists
    existing = await reactions_collection.find_one({
        "target_type": target_type,
        "target_id": target_id,
        "user_id": user.id,
        "reaction_tag": reaction.reaction_tag,
    })

    if existing:
        # Remove the reaction
        await reactions_collection.delete_one({"_id": existing["_id"]})
        logger.info_with_context("Reaction removed", {"reaction_id": str(existing["_id"])})
        return {"added": False, "reaction_tag": reaction.reaction_tag}
    else:
        # Add the reaction
        doc = {
            "target_type": target_type,
            "target_id": target_id,
            "user_id": user.id,
            "user_name": user.name,
            "reaction_tag": reaction.reaction_tag,
            "created_at": datetime.now(timezone.utc),
        }
        result = await reactions_collection.insert_one(doc)
        logger.info_with_context("Reaction added", {"reaction_id": str(result.inserted_id)})
        return {"added": True, "reaction_tag": reaction.reaction_tag}
```

**Step 4: Run tests to verify they pass**

```bash
cd backend && python -m pytest tests/test_engagement_api.py::TestReactionsAPI -v
```

Expected: PASS

**Step 5: Commit**

```bash
git add backend/handlers/engagement.py backend/tests/test_engagement_api.py
git commit -m "feat(engagement): add POST reactions endpoint (toggle)"
```

---

## Task 7: Backend Handler - Comments GET (Public)

**Files:**
- Modify: `backend/handlers/engagement.py`
- Modify: `backend/tests/test_engagement_api.py`

**Step 1: Add failing test for GET comments**

Add to `backend/tests/test_engagement_api.py`:

```python
class TestCommentsAPI:
    """Tests for comments endpoints."""

    @pytest.mark.asyncio
    async def test_get_comments_empty(self, engagement_async_client, mock_comments_collection):
        """Test getting comments when none exist."""
        mock_comments_collection.find.return_value = MockAsyncCursor([])

        response = await engagement_async_client.get(
            "/api/engagement/story/507f1f77bcf86cd799439011/comments"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["comments"] == []

    @pytest.mark.asyncio
    async def test_get_comments_with_replies(
        self, engagement_async_client, mock_comments_collection
    ):
        """Test getting comments with nested replies."""
        target_id = "507f1f77bcf86cd799439011"
        parent_id = ObjectId()
        reply_id = ObjectId()

        mock_comments_collection.find.return_value = MockAsyncCursor([
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

        response = await engagement_async_client.get(
            f"/api/engagement/story/{target_id}/comments"
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["comments"]) == 1  # Only top-level
        assert len(data["comments"][0]["replies"]) == 1  # One reply
```

**Step 2: Run test to verify it fails**

```bash
cd backend && python -m pytest tests/test_engagement_api.py::TestCommentsAPI::test_get_comments_empty -v
```

Expected: FAIL (endpoint doesn't exist)

**Step 3: Add GET comments endpoint**

Add to `backend/handlers/engagement.py`:

```python
from models.comment import CommentResponse


@router.get("/{target_type}/{target_id}/comments")
async def get_comments(
    request: Request,
    target_type: str,
    target_id: str,
    comments_collection: AsyncIOMotorCollection = Depends(get_comments_collection),
) -> dict:
    """Get comments for a target with nested replies. Public endpoint."""
    validate_target_type(target_type, "comments")

    if not ObjectId.is_valid(target_id):
        raise HTTPException(status_code=400, detail="Invalid target ID format")

    logger.info_with_context(
        "Fetching comments",
        {"target_type": target_type, "target_id": target_id},
    )

    # Get all non-deleted comments for this target
    cursor = comments_collection.find({
        "target_type": target_type,
        "target_id": target_id,
        "deleted_at": None,
    }).sort("created_at", 1)

    all_comments = await cursor.to_list(length=1000)

    # Build nested structure
    comments_by_id: dict[str, dict] = {}
    top_level: list[dict] = []

    for comment in all_comments:
        comment_dict = {
            "id": str(comment["_id"]),
            "target_type": comment["target_type"],
            "target_id": comment["target_id"],
            "parent_id": comment.get("parent_id"),
            "user_id": comment["user_id"],
            "user_name": comment["user_name"],
            "user_avatar": comment.get("user_avatar"),
            "content": comment["content"],
            "mentions": comment.get("mentions", []),
            "created_at": comment["created_at"].isoformat(),
            "updated_at": comment["updated_at"].isoformat(),
            "deleted_at": None,
            "replies": [],
        }
        comments_by_id[str(comment["_id"])] = comment_dict

        if comment.get("parent_id") is None:
            top_level.append(comment_dict)

    # Attach replies to parents
    for comment in all_comments:
        parent_id = comment.get("parent_id")
        if parent_id and parent_id in comments_by_id:
            comments_by_id[parent_id]["replies"].append(
                comments_by_id[str(comment["_id"])]
            )

    return {"comments": top_level}
```

**Step 4: Run tests to verify they pass**

```bash
cd backend && python -m pytest tests/test_engagement_api.py::TestCommentsAPI -v
```

Expected: PASS

**Step 5: Commit**

```bash
git add backend/handlers/engagement.py backend/tests/test_engagement_api.py
git commit -m "feat(engagement): add GET comments endpoint with nested replies"
```

---

## Task 8: Backend Handler - Comments POST (Auth Required)

**Files:**
- Modify: `backend/handlers/engagement.py`
- Modify: `backend/tests/test_engagement_api.py`

**Step 1: Add failing test for POST comments**

Add to `backend/tests/test_engagement_api.py`:

```python
    @pytest.mark.asyncio
    async def test_create_comment(
        self, engagement_async_client, mock_comments_collection, mock_auth, auth_headers
    ):
        """Test creating a new comment."""
        target_id = "507f1f77bcf86cd799439011"
        new_comment_id = ObjectId()

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
    async def test_create_comment_unauthorized(self, engagement_async_client):
        """Test that unauthenticated users cannot comment."""
        response = await engagement_async_client.post(
            "/api/engagement/story/507f1f77bcf86cd799439011/comments",
            json={"content": "test", "parent_id": None, "mentions": []},
        )
        assert response.status_code == 401
```

**Step 2: Run test to verify it fails**

```bash
cd backend && python -m pytest tests/test_engagement_api.py::TestCommentsAPI::test_create_comment -v
```

Expected: FAIL (endpoint doesn't exist)

**Step 3: Add POST comments endpoint**

Add to `backend/handlers/engagement.py`:

```python
from models.comment import CommentCreate


@router.post("/{target_type}/{target_id}/comments", status_code=201)
@requires_auth
async def create_comment(
    request: Request,
    target_type: str,
    target_id: str,
    comment: CommentCreate,
    comments_collection: AsyncIOMotorCollection = Depends(get_comments_collection),
) -> dict:
    """Create a new comment. Requires auth."""
    validate_target_type(target_type, "comments")

    if not ObjectId.is_valid(target_id):
        raise HTTPException(status_code=400, detail="Invalid target ID format")

    # Validate parent_id if provided (must be a top-level comment)
    if comment.parent_id:
        if not ObjectId.is_valid(comment.parent_id):
            raise HTTPException(status_code=400, detail="Invalid parent ID format")
        parent = await comments_collection.find_one({
            "_id": ObjectId(comment.parent_id),
            "target_type": target_type,
            "target_id": target_id,
            "parent_id": None,  # Must be top-level
            "deleted_at": None,
        })
        if not parent:
            raise HTTPException(status_code=404, detail="Parent comment not found")

    user: UserInfo = request.state.user
    now = datetime.now(timezone.utc)

    logger.info_with_context(
        "Creating comment",
        {
            "target_type": target_type,
            "target_id": target_id,
            "user_id": user.id,
            "has_parent": comment.parent_id is not None,
        },
    )

    doc = {
        "target_type": target_type,
        "target_id": target_id,
        "parent_id": comment.parent_id,
        "user_id": user.id,
        "user_name": user.name,
        "user_avatar": getattr(user, "avatar_url", None),
        "content": comment.content,
        "mentions": [m.model_dump() for m in comment.mentions],
        "created_at": now,
        "updated_at": now,
        "deleted_at": None,
    }

    result = await comments_collection.insert_one(doc)
    created = await comments_collection.find_one({"_id": result.inserted_id})

    logger.info_with_context("Comment created", {"comment_id": str(result.inserted_id)})

    return {
        "id": str(created["_id"]),
        "target_type": created["target_type"],
        "target_id": created["target_id"],
        "parent_id": created.get("parent_id"),
        "user_id": created["user_id"],
        "user_name": created["user_name"],
        "user_avatar": created.get("user_avatar"),
        "content": created["content"],
        "mentions": created.get("mentions", []),
        "created_at": created["created_at"].isoformat(),
        "updated_at": created["updated_at"].isoformat(),
        "deleted_at": None,
        "replies": [],
    }
```

**Step 4: Run tests to verify they pass**

```bash
cd backend && python -m pytest tests/test_engagement_api.py::TestCommentsAPI -v
```

Expected: PASS

**Step 5: Commit**

```bash
git add backend/handlers/engagement.py backend/tests/test_engagement_api.py
git commit -m "feat(engagement): add POST comments endpoint"
```

---

## Task 9: Backend Handler - Comments DELETE (Auth Required)

**Files:**
- Modify: `backend/handlers/engagement.py`
- Modify: `backend/tests/test_engagement_api.py`

**Step 1: Add failing test for DELETE comment**

Add to `backend/tests/test_engagement_api.py`:

```python
    @pytest.mark.asyncio
    async def test_delete_own_comment(
        self, engagement_async_client, mock_comments_collection, mock_auth, auth_headers
    ):
        """Test soft-deleting own comment."""
        comment_id = ObjectId()

        # Mock: comment exists and belongs to user
        mock_comments_collection.find_one.return_value = {
            "_id": comment_id,
            "user_id": str(ObjectId()),  # Will match mocked user
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
        self, engagement_async_client, mock_comments_collection, mock_auth, auth_headers
    ):
        """Test that users cannot delete others' comments."""
        comment_id = ObjectId()

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
```

**Step 2: Run test to verify it fails**

```bash
cd backend && python -m pytest tests/test_engagement_api.py::TestCommentsAPI::test_delete_own_comment -v
```

Expected: FAIL (endpoint doesn't exist)

**Step 3: Add DELETE comment endpoint**

Add to `backend/handlers/engagement.py`:

```python
@router.delete("/comments/{comment_id}", status_code=204)
@requires_auth
async def delete_comment(
    request: Request,
    comment_id: str,
    comments_collection: AsyncIOMotorCollection = Depends(get_comments_collection),
):
    """Soft delete a comment. Users can only delete their own comments."""
    if not ObjectId.is_valid(comment_id):
        raise HTTPException(status_code=400, detail="Invalid comment ID format")

    user: UserInfo = request.state.user

    comment = await comments_collection.find_one({
        "_id": ObjectId(comment_id),
        "deleted_at": None,
    })

    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    # Users can only delete their own comments (for now)
    if comment["user_id"] != user.id:
        raise HTTPException(
            status_code=403,
            detail={"error": "forbidden", "message": "You can only delete your own comments"},
        )

    logger.info_with_context(
        "Soft deleting comment",
        {"comment_id": comment_id, "user_id": user.id},
    )

    await comments_collection.update_one(
        {"_id": ObjectId(comment_id)},
        {"$set": {"deleted_at": datetime.now(timezone.utc)}},
    )

    logger.info_with_context("Comment soft deleted", {"comment_id": comment_id})
```

**Step 4: Run tests to verify they pass**

```bash
cd backend && python -m pytest tests/test_engagement_api.py::TestCommentsAPI -v
```

Expected: PASS

**Step 5: Commit**

```bash
git add backend/handlers/engagement.py backend/tests/test_engagement_api.py
git commit -m "feat(engagement): add DELETE comment endpoint (soft delete)"
```

---

## Task 10: Backend Handler - Bulk Counts

**Files:**
- Modify: `backend/handlers/engagement.py`
- Modify: `backend/tests/test_engagement_api.py`

**Step 1: Add failing test for bulk counts**

Add to `backend/tests/test_engagement_api.py`:

```python
class TestBulkCountsAPI:
    """Tests for bulk counts endpoint."""

    @pytest.mark.asyncio
    async def test_bulk_counts(
        self, engagement_async_client, mock_reactions_collection, mock_comments_collection
    ):
        """Test getting counts for multiple targets."""
        # Mock reactions aggregation
        mock_reactions_collection.aggregate.return_value = MockAsyncCursor([
            {"_id": {"target_type": "story", "target_id": "id1", "reaction_tag": "thumbup"}, "count": 5},
            {"_id": {"target_type": "story", "target_id": "id1", "reaction_tag": "heart"}, "count": 3},
        ])

        # Mock comments count
        mock_comments_collection.count_documents.return_value = 10

        response = await engagement_async_client.post(
            "/api/engagement/bulk/counts",
            json={"targets": [{"type": "story", "id": "id1"}]},
        )
        assert response.status_code == 200
        data = response.json()
        assert "story:id1" in data["counts"]
```

**Step 2: Run test to verify it fails**

```bash
cd backend && python -m pytest tests/test_engagement_api.py::TestBulkCountsAPI -v
```

Expected: FAIL (endpoint doesn't exist)

**Step 3: Add bulk counts endpoint**

Add to `backend/handlers/engagement.py`:

```python
from models.reaction import BulkCountsRequest, BulkCountsResponse


@router.post("/bulk/counts")
async def get_bulk_counts(
    request: Request,
    body: BulkCountsRequest,
    reactions_collection: AsyncIOMotorCollection = Depends(get_reactions_collection),
    comments_collection: AsyncIOMotorCollection = Depends(get_comments_collection),
) -> BulkCountsResponse:
    """Get reaction counts and comment counts for multiple targets. Public endpoint."""
    result: dict[str, dict] = {}

    for target in body.targets:
        target_type = target.get("type", "")
        target_id = target.get("id", "")

        if not target_type or not target_id:
            continue

        key = f"{target_type}:{target_id}"

        # Get reaction counts
        reaction_counts: dict[str, int] = {}
        if ENGAGEMENT_ENABLED_TYPES.get(target_type, {}).get("reactions", False):
            pipeline = [
                {"$match": {"target_type": target_type, "target_id": target_id}},
                {"$group": {"_id": "$reaction_tag", "count": {"$sum": 1}}},
            ]
            async for doc in reactions_collection.aggregate(pipeline):
                reaction_counts[doc["_id"]] = doc["count"]

        # Get comment count
        comment_count = 0
        if ENGAGEMENT_ENABLED_TYPES.get(target_type, {}).get("comments", False):
            comment_count = await comments_collection.count_documents({
                "target_type": target_type,
                "target_id": target_id,
                "deleted_at": None,
            })

        result[key] = {
            "reactions": reaction_counts,
            "comment_count": comment_count,
        }

    return BulkCountsResponse(counts=result)
```

**Step 4: Run tests to verify they pass**

```bash
cd backend && python -m pytest tests/test_engagement_api.py::TestBulkCountsAPI -v
```

Expected: PASS

**Step 5: Commit**

```bash
git add backend/handlers/engagement.py backend/tests/test_engagement_api.py
git commit -m "feat(engagement): add bulk counts endpoint for feed"
```

---

## Task 11: Frontend Types

**Files:**
- Modify: `frontend/src/types/api.ts`

**Step 1: Add engagement types**

Add to `frontend/src/types/api.ts`:

```typescript
/**
 * Engagement types for reactions and comments
 */

export type ReactionTag = 'thumbup' | 'heart' | 'surprise' | 'celebrate' | 'insightful';

export interface Mention {
  user_id: string;
  user_name: string;
}

export interface ReactionCounts {
  counts: Record<string, number>;
  user_reactions: string[];
  details: Record<string, Array<{ user_id: string; user_name: string }>>;
}

export interface ToggleReactionRequest {
  reaction_tag: ReactionTag;
}

export interface ToggleReactionResponse {
  added: boolean;
  reaction_tag: string;
}

export interface Comment {
  id: string;
  target_type: string;
  target_id: string;
  parent_id: string | null;
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  content: string;
  mentions: Mention[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  replies: Comment[];
}

export interface CreateCommentRequest {
  content: string;
  parent_id: string | null;
  mentions: Mention[];
}

export interface CommentsResponse {
  comments: Comment[];
}

export interface BulkCountsRequest {
  targets: Array<{ type: string; id: string }>;
}

export interface BulkCountsResponse {
  counts: Record<string, { reactions: Record<string, number>; comment_count: number }>;
}
```

**Step 2: Commit**

```bash
git add frontend/src/types/api.ts
git commit -m "feat(engagement): add frontend TypeScript types"
```

---

## Task 12: Frontend API Client

**Files:**
- Modify: `frontend/src/lib/api-client.ts`

**Step 1: Add engagement methods to API client**

Add imports at top of `frontend/src/lib/api-client.ts`:

```typescript
import {
  // ... existing imports
  ReactionCounts,
  ToggleReactionRequest,
  ToggleReactionResponse,
  CommentsResponse,
  CreateCommentRequest,
  Comment,
  BulkCountsRequest,
  BulkCountsResponse,
} from '@/types/api';
```

Add to `apiRoutes`:

```typescript
  engagement: {
    reactions: (targetType: string, targetId: string) =>
      `/api/engagement/${targetType}/${targetId}/reactions`,
    comments: (targetType: string, targetId: string) =>
      `/api/engagement/${targetType}/${targetId}/comments`,
    deleteComment: (commentId: string) =>
      `/api/engagement/comments/${commentId}`,
    bulkCounts: () => '/api/engagement/bulk/counts',
  },
```

Add to `apiClient`:

```typescript
  /**
   * Engagement methods (reactions and comments)
   */
  engagement: {
    getReactions: (targetType: string, targetId: string, token?: string) =>
      fetchApi<ReactionCounts>(apiRoutes.engagement.reactions(targetType, targetId), { token }),

    toggleReaction: (targetType: string, targetId: string, data: ToggleReactionRequest, token: string) =>
      fetchApi<ToggleReactionResponse, ToggleReactionRequest>(
        apiRoutes.engagement.reactions(targetType, targetId),
        { method: 'POST', body: data, token }
      ),

    getComments: (targetType: string, targetId: string) =>
      fetchApi<CommentsResponse>(apiRoutes.engagement.comments(targetType, targetId)),

    createComment: (targetType: string, targetId: string, data: CreateCommentRequest, token: string) =>
      fetchApi<Comment, CreateCommentRequest>(
        apiRoutes.engagement.comments(targetType, targetId),
        { method: 'POST', body: data, token }
      ),

    deleteComment: (commentId: string, token: string) =>
      fetchApi<void>(apiRoutes.engagement.deleteComment(commentId), {
        method: 'DELETE',
        token
      }),

    getBulkCounts: (data: BulkCountsRequest) =>
      fetchApi<BulkCountsResponse, BulkCountsRequest>(
        apiRoutes.engagement.bulkCounts(),
        { method: 'POST', body: data }
      ),
  },
```

**Step 2: Commit**

```bash
git add frontend/src/lib/api-client.ts
git commit -m "feat(engagement): add engagement methods to API client"
```

---

## Task 13: Frontend Configuration

**Files:**
- Create: `frontend/src/config/engagement.config.ts`

**Step 1: Create engagement config**

```bash
mkdir -p frontend/src/config
```

Create `frontend/src/config/engagement.config.ts`:

```typescript
/**
 * TEMPORARY: Engagement configuration
 *
 * TODO: Move to section configuration when dynamic section routing
 * is implemented. This file should be deleted and engagement settings
 * should be defined per-section in the section config system.
 */

export type RealtimeStrategy = 'websocket' | 'polling' | 'none';

export interface EngagementTypeConfig {
  reactions: boolean;
  comments: boolean;
}

export const engagementConfig = {
  /** Real-time update strategy */
  realtime: 'websocket' as RealtimeStrategy,

  /** Polling interval in ms (used if realtime is 'polling') */
  pollingInterval: 10000,

  /** Which content types have engagement enabled */
  enabledTypes: {
    story: { reactions: true, comments: true },
    project: { reactions: true, comments: false },
  } as Record<string, EngagementTypeConfig>,

  /** Available reaction tags (order matters for display) */
  reactionTags: ['thumbup', 'heart', 'surprise', 'celebrate', 'insightful'] as const,
};

export type ReactionTag = (typeof engagementConfig.reactionTags)[number];
```

**Step 2: Commit**

```bash
git add frontend/src/config/engagement.config.ts
git commit -m "feat(engagement): add frontend configuration"
```

---

## Task 14: Next.js API Proxy Routes

**Files:**
- Create: `frontend/src/pages/api/engagement/[...path].ts`

**Step 1: Create catch-all proxy route**

```bash
mkdir -p frontend/src/pages/api/engagement
```

Create `frontend/src/pages/api/engagement/[...path].ts`:

```typescript
import { NextApiRequest, NextApiResponse } from 'next';
import { createProxyHandler } from '@/proxy';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { path } = req.query;
  const pathArray = Array.isArray(path) ? path : [path];
  const backendPath = `/api/engagement/${pathArray.join('/')}`;

  return createProxyHandler(backendPath)(req, res);
}
```

**Step 2: Commit**

```bash
git add frontend/src/pages/api/engagement/
git commit -m "feat(engagement): add Next.js API proxy routes"
```

---

## Task 15: Frontend Hook - useEngagement

**Files:**
- Create: `frontend/src/hooks/useEngagement.ts`

**Step 1: Create engagement hook**

Create `frontend/src/hooks/useEngagement.ts`:

```typescript
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import apiClient from '@/lib/api-client';
import { ReactionCounts, Comment, ReactionTag } from '@/types/api';
import { engagementConfig } from '@/config/engagement.config';

interface UseEngagementOptions {
  targetType: string;
  targetId: string;
  enableRealtime?: boolean;
}

interface UseEngagementReturn {
  reactions: ReactionCounts | null;
  comments: Comment[];
  isLoading: boolean;
  error: Error | null;
  toggleReaction: (tag: ReactionTag) => Promise<void>;
  addComment: (content: string, parentId?: string | null, mentions?: Array<{ user_id: string; user_name: string }>) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useEngagement({
  targetType,
  targetId,
  enableRealtime = true,
}: UseEngagementOptions): UseEngagementReturn {
  const { data: session } = useSession();
  const [reactions, setReactions] = useState<ReactionCounts | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const token = (session as { accessToken?: string })?.accessToken;

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const config = engagementConfig.enabledTypes[targetType];
      if (!config) {
        setIsLoading(false);
        return;
      }

      const promises: Promise<void>[] = [];

      if (config.reactions) {
        promises.push(
          apiClient.engagement.getReactions(targetType, targetId, token).then((data) => {
            setReactions(data);
          })
        );
      }

      if (config.comments) {
        promises.push(
          apiClient.engagement.getComments(targetType, targetId).then((data) => {
            setComments(data.comments);
          })
        );
      }

      await Promise.all(promises);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch engagement data'));
    } finally {
      setIsLoading(false);
    }
  }, [targetType, targetId, token]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!enableRealtime || engagementConfig.realtime !== 'websocket') {
      return;
    }

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/api/engagement/${targetType}/${targetId}/live`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.event === 'reaction_update') {
          fetchData(); // Refetch for simplicity
        } else if (message.event === 'comment_added' || message.event === 'comment_deleted') {
          fetchData();
        }
      };

      ws.onerror = () => {
        console.warn('WebSocket error, falling back to polling');
      };

      return () => {
        ws.close();
        wsRef.current = null;
      };
    } catch {
      console.warn('WebSocket not available');
    }
  }, [targetType, targetId, enableRealtime, fetchData]);

  const toggleReaction = useCallback(
    async (tag: ReactionTag) => {
      if (!token) {
        throw new Error('Must be logged in to react');
      }

      await apiClient.engagement.toggleReaction(targetType, targetId, { reaction_tag: tag }, token);
      await fetchData();
    },
    [targetType, targetId, token, fetchData]
  );

  const addComment = useCallback(
    async (content: string, parentId?: string | null, mentions: Array<{ user_id: string; user_name: string }> = []) => {
      if (!token) {
        throw new Error('Must be logged in to comment');
      }

      await apiClient.engagement.createComment(
        targetType,
        targetId,
        { content, parent_id: parentId ?? null, mentions },
        token
      );
      await fetchData();
    },
    [targetType, targetId, token, fetchData]
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      if (!token) {
        throw new Error('Must be logged in to delete comments');
      }

      await apiClient.engagement.deleteComment(commentId, token);
      await fetchData();
    },
    [token, fetchData]
  );

  return {
    reactions,
    comments,
    isLoading,
    error,
    toggleReaction,
    addComment,
    deleteComment,
    refresh: fetchData,
  };
}
```

**Step 2: Commit**

```bash
git add frontend/src/hooks/useEngagement.ts
git commit -m "feat(engagement): add useEngagement React hook"
```

---

## Task 16: Frontend Component - ReactionBar

**Files:**
- Create: `frontend/src/components/engagement/ReactionBar.tsx`
- Create: `frontend/src/components/engagement/index.ts`

**Step 1: Create ReactionBar component**

```bash
mkdir -p frontend/src/components/engagement
```

Create `frontend/src/components/engagement/ReactionBar.tsx`:

```tsx
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { ReactionCounts, ReactionTag } from '@/types/api';
import { engagementConfig } from '@/config/engagement.config';

interface ReactionBarProps {
  reactions: ReactionCounts | null;
  onToggle: (tag: ReactionTag) => Promise<void>;
  compact?: boolean;
}

const REACTION_ICONS: Record<string, string> = {
  thumbup: '👍',
  heart: '❤️',
  surprise: '😮',
  celebrate: '🎉',
  insightful: '💡',
};

export function ReactionBar({ reactions, onToggle, compact = false }: ReactionBarProps) {
  const { data: session } = useSession();
  const [showPicker, setShowPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async (tag: ReactionTag) => {
    if (!session) return;
    setIsLoading(true);
    try {
      await onToggle(tag);
    } finally {
      setIsLoading(false);
      setShowPicker(false);
    }
  };

  const userReactions = reactions?.user_reactions || [];
  const counts = reactions?.counts || {};

  // In compact mode, show only counts
  if (compact) {
    const totalReactions = Object.values(counts).reduce((a, b) => a + b, 0);
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        {totalReactions > 0 && (
          <span className="flex items-center gap-1">
            {Object.entries(counts)
              .slice(0, 3)
              .map(([tag]) => (
                <span key={tag}>{REACTION_ICONS[tag]}</span>
              ))}
            <span>{totalReactions}</span>
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="relative flex items-center gap-2">
      {/* Show existing reactions with counts */}
      {Object.entries(counts).map(([tag, count]) => (
        <button
          key={tag}
          onClick={() => handleToggle(tag as ReactionTag)}
          disabled={isLoading || !session}
          className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm transition-colors ${
            userReactions.includes(tag)
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
          title={
            reactions?.details[tag]
              ?.map((u) => u.user_name)
              .join(', ') || ''
          }
        >
          <span>{REACTION_ICONS[tag]}</span>
          <span>{count}</span>
        </button>
      ))}

      {/* Add reaction button */}
      {session && (
        <div className="relative">
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="px-2 py-1 rounded-full bg-gray-100 hover:bg-gray-200 text-sm"
          >
            +
          </button>

          {showPicker && (
            <div className="absolute bottom-full left-0 mb-2 p-2 bg-white rounded-lg shadow-lg border flex gap-1">
              {engagementConfig.reactionTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleToggle(tag)}
                  disabled={isLoading}
                  className="p-2 hover:bg-gray-100 rounded"
                >
                  {REACTION_ICONS[tag]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

Create `frontend/src/components/engagement/index.ts`:

```typescript
export { ReactionBar } from './ReactionBar';
```

**Step 2: Commit**

```bash
git add frontend/src/components/engagement/
git commit -m "feat(engagement): add ReactionBar component"
```

---

## Task 17: Frontend Component - CommentSection

**Files:**
- Create: `frontend/src/components/engagement/CommentSection.tsx`
- Create: `frontend/src/components/engagement/CommentThread.tsx`
- Modify: `frontend/src/components/engagement/index.ts`

**Step 1: Create CommentThread component**

Create `frontend/src/components/engagement/CommentThread.tsx`:

```tsx
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Comment } from '@/types/api';

interface CommentThreadProps {
  comment: Comment;
  onReply: (content: string, parentId: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
}

export function CommentThread({ comment, onReply, onDelete }: CommentThreadProps) {
  const { data: session } = useSession();
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const user = session?.user;
  const isOwner = user?.email && comment.user_id === user.email;

  const handleReply = async () => {
    if (!replyContent.trim()) return;
    setIsSubmitting(true);
    try {
      await onReply(replyContent, comment.id);
      setReplyContent('');
      setShowReplyInput(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this comment?')) return;
    await onDelete(comment.id);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="border-l-2 border-gray-200 pl-4 py-2">
      <div className="flex items-start gap-3">
        {comment.user_avatar ? (
          <img
            src={comment.user_avatar}
            alt={comment.user_name}
            className="w-8 h-8 rounded-full"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
            {comment.user_name[0]}
          </div>
        )}

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{comment.user_name}</span>
            <span className="text-gray-500 text-sm">{formatDate(comment.created_at)}</span>
          </div>

          <p className="mt-1 text-gray-800">{comment.content}</p>

          <div className="mt-2 flex items-center gap-4 text-sm">
            {session && !comment.parent_id && (
              <button
                onClick={() => setShowReplyInput(!showReplyInput)}
                className="text-gray-500 hover:text-gray-700"
              >
                Reply
              </button>
            )}
            {isOwner && (
              <button
                onClick={handleDelete}
                className="text-red-500 hover:text-red-700"
              >
                Delete
              </button>
            )}
          </div>

          {showReplyInput && (
            <div className="mt-3">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                className="w-full p-2 border rounded-lg resize-none"
                rows={2}
              />
              <div className="mt-2 flex gap-2">
                <button
                  onClick={handleReply}
                  disabled={isSubmitting || !replyContent.trim()}
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Posting...' : 'Reply'}
                </button>
                <button
                  onClick={() => setShowReplyInput(false)}
                  className="px-3 py-1 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Replies */}
      {comment.replies.length > 0 && (
        <div className="mt-3 ml-4">
          {comment.replies.map((reply) => (
            <CommentThread
              key={reply.id}
              comment={reply}
              onReply={onReply}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Create CommentSection component**

Create `frontend/src/components/engagement/CommentSection.tsx`:

```tsx
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Comment } from '@/types/api';
import { CommentThread } from './CommentThread';

interface CommentSectionProps {
  comments: Comment[];
  onAddComment: (content: string, parentId?: string | null) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  isLoading?: boolean;
}

export function CommentSection({
  comments,
  onAddComment,
  onDeleteComment,
  isLoading = false,
}: CommentSectionProps) {
  const { data: session } = useSession();
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    setIsSubmitting(true);
    try {
      await onAddComment(newComment);
      setNewComment('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = async (content: string, parentId: string) => {
    await onAddComment(content, parentId);
  };

  if (isLoading) {
    return <div className="py-4 text-gray-500">Loading comments...</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">
        Comments {comments.length > 0 && `(${comments.length})`}
      </h3>

      {/* New comment input */}
      {session ? (
        <div className="space-y-2">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            className="w-full p-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
          />
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !newComment.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Posting...' : 'Post Comment'}
          </button>
        </div>
      ) : (
        <p className="text-gray-500">Sign in to leave a comment</p>
      )}

      {/* Comments list */}
      <div className="space-y-4 mt-6">
        {comments.length === 0 ? (
          <p className="text-gray-500">No comments yet. Be the first to comment!</p>
        ) : (
          comments.map((comment) => (
            <CommentThread
              key={comment.id}
              comment={comment}
              onReply={handleReply}
              onDelete={onDeleteComment}
            />
          ))
        )}
      </div>
    </div>
  );
}
```

**Step 3: Update index.ts**

Update `frontend/src/components/engagement/index.ts`:

```typescript
export { ReactionBar } from './ReactionBar';
export { CommentSection } from './CommentSection';
export { CommentThread } from './CommentThread';
```

**Step 4: Commit**

```bash
git add frontend/src/components/engagement/
git commit -m "feat(engagement): add CommentSection and CommentThread components"
```

---

## Task 18: Frontend Component - EngagementProvider

**Files:**
- Create: `frontend/src/components/engagement/EngagementProvider.tsx`
- Modify: `frontend/src/components/engagement/index.ts`

**Step 1: Create EngagementProvider component**

Create `frontend/src/components/engagement/EngagementProvider.tsx`:

```tsx
import { createContext, useContext, ReactNode } from 'react';
import { useEngagement } from '@/hooks/useEngagement';
import { ReactionCounts, Comment, ReactionTag } from '@/types/api';

interface EngagementContextValue {
  targetType: string;
  targetId: string;
  reactions: ReactionCounts | null;
  comments: Comment[];
  isLoading: boolean;
  error: Error | null;
  toggleReaction: (tag: ReactionTag) => Promise<void>;
  addComment: (content: string, parentId?: string | null) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const EngagementContext = createContext<EngagementContextValue | null>(null);

interface EngagementProviderProps {
  targetType: string;
  targetId: string;
  children: ReactNode;
}

export function EngagementProvider({ targetType, targetId, children }: EngagementProviderProps) {
  const engagement = useEngagement({ targetType, targetId });

  return (
    <EngagementContext.Provider value={{ targetType, targetId, ...engagement }}>
      {children}
    </EngagementContext.Provider>
  );
}

export function useEngagementContext() {
  const context = useContext(EngagementContext);
  if (!context) {
    throw new Error('useEngagementContext must be used within an EngagementProvider');
  }
  return context;
}
```

**Step 2: Update index.ts**

Update `frontend/src/components/engagement/index.ts`:

```typescript
export { ReactionBar } from './ReactionBar';
export { CommentSection } from './CommentSection';
export { CommentThread } from './CommentThread';
export { EngagementProvider, useEngagementContext } from './EngagementProvider';
```

**Step 3: Commit**

```bash
git add frontend/src/components/engagement/
git commit -m "feat(engagement): add EngagementProvider context component"
```

---

## Task 19: Integrate with Story Page

**Files:**
- Modify: Story detail page (locate existing file)

**Step 1: Find and read the story detail page**

```bash
find frontend/src -name "*.tsx" | xargs grep -l "StoryResponse\|story.content" | head -5
```

**Step 2: Add engagement to story page**

Add imports:

```tsx
import { EngagementProvider, ReactionBar, CommentSection, useEngagementContext } from '@/components/engagement';
```

Wrap the story content with EngagementProvider and add components:

```tsx
// At the end of the story content
<EngagementProvider targetType="story" targetId={story.id}>
  <div className="mt-8 border-t pt-8">
    <ReactionBar
      reactions={/* from context */}
      onToggle={/* from context */}
    />
  </div>
  <div className="mt-8">
    <CommentSection
      comments={/* from context */}
      onAddComment={/* from context */}
      onDeleteComment={/* from context */}
    />
  </div>
</EngagementProvider>
```

**Step 3: Commit**

```bash
git add frontend/src/
git commit -m "feat(engagement): integrate engagement with story page"
```

---

## Task 20: Run All Tests

**Step 1: Run backend tests**

```bash
cd backend && python -m pytest tests/ -v
```

Expected: All tests pass

**Step 2: Run frontend lint**

```bash
cd frontend && npm run lint
```

Expected: No errors

**Step 3: Test manually**

```bash
make dev-backend  # In one terminal
make dev-frontend # In another terminal
```

1. Open a story page
2. Verify reactions and comments appear
3. Test adding/removing reactions (when logged in)
4. Test adding/deleting comments (when logged in)
5. Verify unauthenticated users can view but not interact

**Step 4: Final commit**

```bash
git add .
git commit -m "feat(engagement): complete engagement system implementation"
```

---

## Summary

This plan implements the full engagement system as designed in ADR-0004:

1. **Backend**: Models, handlers, configuration, tests
2. **Frontend**: Types, API client, hooks, components, configuration
3. **Integration**: Connected to story pages

The system is:
- Generic (works with any target type)
- Configurable (via config files)
- Extensible (designed for future features)
- Test-covered (backend unit tests)

WebSocket real-time is included in the hook but the backend WebSocket endpoint is left as a future enhancement (polling fallback is available).
