"""
Tests for content and section move operations.
"""

from datetime import datetime, timezone
from unittest.mock import patch

import mongomock_motor
import pytest
import pytest_asyncio
from bson import ObjectId
from httpx import ASGITransport, AsyncClient
from tests.conftest import test_app


@pytest_asyncio.fixture
async def mock_db():
    """Provide a mongomock database and patch get_db to return it."""
    client = mongomock_motor.AsyncMongoMockClient()
    db = client["test_moves"]

    async def mock_get_db():
        return db

    with (
        patch("handlers.moves.get_db", mock_get_db),
        patch("handlers.path_resolution.get_db", mock_get_db),
    ):
        yield db


@pytest_asyncio.fixture
async def moves_client(mock_db, mock_auth, override_users_database):
    """Async test client with patched database and auth."""
    async with AsyncClient(transport=ASGITransport(app=test_app), base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def path_client(mock_db):
    """Async test client for path resolution (no auth needed)."""
    async with AsyncClient(transport=ASGITransport(app=test_app), base_url="http://test") as ac:
        yield ac


def _make_section(overrides=None):
    """Build a section document with sensible defaults."""
    fixed_dt = datetime(2025, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    doc = {
        "_id": ObjectId(),
        "title": "Blog",
        "slug": "blog",
        "path": "blog",
        "parent_id": None,
        "display_type": "feed",
        "content_type": "story",
        "nav_visibility": "main",
        "sort_order": 0,
        "is_published": True,
        "icon": "default",
        "createdDate": fixed_dt,
        "updatedDate": fixed_dt,
    }
    if overrides:
        doc.update(overrides)
    return doc


def _make_story(section_id, overrides=None):
    """Build a story document with sensible defaults."""
    fixed_dt = datetime(2025, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    doc = {
        "_id": ObjectId(),
        "title": "My Post",
        "slug": "my-post",
        "content": "<p>Test content</p>",
        "section_id": section_id,
        "is_published": True,
        "createdDate": fixed_dt,
        "updatedDate": fixed_dt,
    }
    if overrides:
        doc.update(overrides)
    return doc


AUTH_HEADERS = {"Authorization": "Bearer valid_token"}


class TestMoveContent:
    """Tests for PUT /content/{content_type}/{content_id}/move"""

    @pytest.mark.asyncio
    async def test_move_content_updates_section_id(self, mock_db, moves_client):
        section_a = _make_section({"title": "Blog", "slug": "blog", "path": "blog"})
        section_b = _make_section({"title": "News", "slug": "news", "path": "news"})
        story = _make_story(str(section_a["_id"]))
        await mock_db["sections"].insert_many([section_a, section_b])
        await mock_db["stories"].insert_one(story)

        response = await moves_client.put(
            f"/content/story/{story['_id']}/move",
            json={"target_section_id": str(section_b["_id"])},
            headers=AUTH_HEADERS,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["section_id"] == str(section_b["_id"])

        # Verify in DB
        updated = await mock_db["stories"].find_one({"_id": story["_id"]})
        assert updated["section_id"] == str(section_b["_id"])

    @pytest.mark.asyncio
    async def test_move_content_creates_redirect(self, mock_db, moves_client):
        section_a = _make_section({"title": "Blog", "slug": "blog", "path": "blog"})
        section_b = _make_section({"title": "News", "slug": "news", "path": "news"})
        story = _make_story(str(section_a["_id"]))
        await mock_db["sections"].insert_many([section_a, section_b])
        await mock_db["stories"].insert_one(story)

        await moves_client.put(
            f"/content/story/{story['_id']}/move",
            json={"target_section_id": str(section_b["_id"])},
            headers=AUTH_HEADERS,
        )

        redirect = await mock_db["redirects"].find_one({"old_path": "blog/my-post"})
        assert redirect is not None
        assert redirect["new_path"] == "news/my-post"
        assert redirect["content_id"] == str(story["_id"])
        assert redirect["content_type"] == "story"

    @pytest.mark.asyncio
    async def test_move_content_slug_collision_409(self, mock_db, moves_client):
        section_a = _make_section({"title": "Blog", "slug": "blog", "path": "blog"})
        section_b = _make_section({"title": "News", "slug": "news", "path": "news"})
        story_a = _make_story(str(section_a["_id"]))
        story_b = _make_story(str(section_b["_id"]))  # Same slug in target section
        await mock_db["sections"].insert_many([section_a, section_b])
        await mock_db["stories"].insert_many([story_a, story_b])

        response = await moves_client.put(
            f"/content/story/{story_a['_id']}/move",
            json={"target_section_id": str(section_b["_id"])},
            headers=AUTH_HEADERS,
        )

        assert response.status_code == 409

    @pytest.mark.asyncio
    async def test_move_content_same_section_noop(self, mock_db, moves_client):
        section = _make_section()
        story = _make_story(str(section["_id"]))
        await mock_db["sections"].insert_one(section)
        await mock_db["stories"].insert_one(story)

        response = await moves_client.put(
            f"/content/story/{story['_id']}/move",
            json={"target_section_id": str(section["_id"])},
            headers=AUTH_HEADERS,
        )

        assert response.status_code == 200

        # No redirect should be created
        redirect = await mock_db["redirects"].find_one({"old_path": "blog/my-post"})
        assert redirect is None

    @pytest.mark.asyncio
    async def test_redirect_flattening(self, mock_db, moves_client):
        section_a = _make_section({"title": "Blog", "slug": "blog", "path": "blog"})
        section_b = _make_section({"title": "News", "slug": "news", "path": "news"})
        section_c = _make_section({"title": "Archive", "slug": "archive", "path": "archive"})
        story = _make_story(str(section_a["_id"]))
        await mock_db["sections"].insert_many([section_a, section_b, section_c])
        await mock_db["stories"].insert_one(story)

        # Move A -> B
        await moves_client.put(
            f"/content/story/{story['_id']}/move",
            json={"target_section_id": str(section_b["_id"])},
            headers=AUTH_HEADERS,
        )

        # Move B -> C
        await moves_client.put(
            f"/content/story/{story['_id']}/move",
            json={"target_section_id": str(section_c["_id"])},
            headers=AUTH_HEADERS,
        )

        # Original redirect A->B should now be A->C (flattened)
        redirect_a = await mock_db["redirects"].find_one({"old_path": "blog/my-post"})
        assert redirect_a["new_path"] == "archive/my-post"

        # B->C redirect should also exist
        redirect_b = await mock_db["redirects"].find_one({"old_path": "news/my-post"})
        assert redirect_b["new_path"] == "archive/my-post"


class TestMoveSection:
    """Tests for PUT /sections/{section_id}/move"""

    @pytest.mark.asyncio
    async def test_move_section_updates_paths(self, mock_db, moves_client):
        parent_a = _make_section({"title": "Creative", "slug": "creative", "path": "creative"})
        parent_b = _make_section({"title": "Archive", "slug": "archive", "path": "archive"})
        child = _make_section(
            {
                "title": "Photos",
                "slug": "photos",
                "path": "creative/photos",
                "parent_id": str(parent_a["_id"]),
            }
        )
        grandchild = _make_section(
            {
                "title": "Landscapes",
                "slug": "landscapes",
                "path": "creative/photos/landscapes",
                "parent_id": str(child["_id"]),
            }
        )
        await mock_db["sections"].insert_many([parent_a, parent_b, child, grandchild])

        response = await moves_client.put(
            f"/sections/{child['_id']}/move",
            json={"target_parent_id": str(parent_b["_id"])},
            headers=AUTH_HEADERS,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["path"] == "archive/photos"
        assert data["parent_id"] == str(parent_b["_id"])

        # Verify grandchild cascaded
        updated_grandchild = await mock_db["sections"].find_one({"_id": grandchild["_id"]})
        assert updated_grandchild["path"] == "archive/photos/landscapes"

    @pytest.mark.asyncio
    async def test_move_section_creates_redirects(self, mock_db, moves_client):
        parent_a = _make_section({"title": "Creative", "slug": "creative", "path": "creative"})
        parent_b = _make_section({"title": "Archive", "slug": "archive", "path": "archive"})
        child = _make_section(
            {
                "title": "Photos",
                "slug": "photos",
                "path": "creative/photos",
                "parent_id": str(parent_a["_id"]),
            }
        )
        story = _make_story(
            str(child["_id"]),
            {"title": "Sunset", "slug": "sunset"},
        )
        await mock_db["sections"].insert_many([parent_a, parent_b, child])
        await mock_db["stories"].insert_one(story)

        await moves_client.put(
            f"/sections/{child['_id']}/move",
            json={"target_parent_id": str(parent_b["_id"])},
            headers=AUTH_HEADERS,
        )

        # Section redirect
        section_redirect = await mock_db["redirects"].find_one({"old_path": "creative/photos"})
        assert section_redirect is not None
        assert section_redirect["new_path"] == "archive/photos"

        # Content redirect
        content_redirect = await mock_db["redirects"].find_one(
            {"old_path": "creative/photos/sunset"}
        )
        assert content_redirect is not None
        assert content_redirect["new_path"] == "archive/photos/sunset"

    @pytest.mark.asyncio
    async def test_cycle_detection(self, mock_db, moves_client):
        parent = _make_section({"title": "Parent", "slug": "parent", "path": "parent"})
        child = _make_section(
            {
                "title": "Child",
                "slug": "child",
                "path": "parent/child",
                "parent_id": str(parent["_id"]),
            }
        )
        await mock_db["sections"].insert_many([parent, child])

        # Try to move parent into child (cycle)
        response = await moves_client.put(
            f"/sections/{parent['_id']}/move",
            json={"target_parent_id": str(child["_id"])},
            headers=AUTH_HEADERS,
        )

        assert response.status_code == 400
        assert "cycle" in response.json()["detail"].lower()


class TestResolvePathFollowsRedirect:
    """Tests for redirect resolution in resolve-path."""

    @pytest.mark.asyncio
    async def test_resolve_path_follows_redirect(self, mock_db, path_client):
        # Set up: a redirect exists from old path to new path
        section = _make_section({"title": "News", "slug": "news", "path": "news"})
        story = _make_story(str(section["_id"]), {"slug": "my-post"})
        await mock_db["sections"].insert_one(section)
        await mock_db["stories"].insert_one(story)

        # Insert a redirect (as if content was moved)
        await mock_db["redirects"].insert_one(
            {
                "old_path": "blog/my-post",
                "new_path": "news/my-post",
                "content_id": str(story["_id"]),
                "content_type": "story",
                "created_at": datetime.now(timezone.utc),
            }
        )

        response = await path_client.get(
            "/sections/resolve-path/blog/my-post",
            follow_redirects=False,
        )

        assert response.status_code == 301
        assert response.headers["location"] == "/news/my-post"
