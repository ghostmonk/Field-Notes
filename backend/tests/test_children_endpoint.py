"""
Tests for the children endpoint.
"""

from datetime import datetime, timezone
from unittest.mock import patch

import mongomock_motor
import pytest
import pytest_asyncio
from bson import ObjectId
from httpx import ASGITransport, AsyncClient
from tests.conftest import app_fixture


@pytest_asyncio.fixture
async def mock_db():
    """Provide a mongomock database and patch get_db to return it."""
    client = mongomock_motor.AsyncMongoMockClient()
    db = client["test_children"]

    async def mock_get_db():
        return db

    with patch("handlers.children.get_db", mock_get_db):
        yield db


@pytest_asyncio.fixture
async def children_client(mock_db):
    """Async test client with patched database."""
    async with AsyncClient(transport=ASGITransport(app=app_fixture), base_url="http://test") as ac:
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


def _make_project(section_id, overrides=None):
    """Build a project document with sensible defaults."""
    fixed_dt = datetime(2025, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    doc = {
        "_id": ObjectId(),
        "title": "My Project",
        "slug": "my-project",
        "summary": "A project summary",
        "content": "<p>Project content</p>",
        "technologies": ["Python", "FastAPI"],
        "section_id": section_id,
        "is_published": True,
        "is_featured": False,
        "createdDate": fixed_dt,
        "updatedDate": fixed_dt,
    }
    if overrides:
        doc.update(overrides)
    return doc


class TestGetChildren:
    """Tests for GET /sections/{section_id}/children"""

    @pytest.mark.asyncio
    async def test_returns_child_sections_and_content(self, mock_db, children_client):
        parent = _make_section()
        child_section = _make_section(
            {
                "title": "Tutorials",
                "slug": "tutorials",
                "path": "blog/tutorials",
                "parent_id": str(parent["_id"]),
                "sort_order": 0,
            }
        )
        story = _make_story(str(parent["_id"]))
        await mock_db["sections"].insert_many([parent, child_section])
        await mock_db["stories"].insert_one(story)

        response = await children_client.get(f"/sections/{parent['_id']}/children")

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 2
        items = data["items"]
        # Sections come first
        assert items[0]["item_type"] == "section"
        assert items[0]["title"] == "Tutorials"
        # Content second
        assert items[1]["item_type"] == "content"
        assert items[1]["content_type"] == "story"
        assert items[1]["title"] == "My Post"

    @pytest.mark.asyncio
    async def test_mixed_content_types(self, mock_db, children_client):
        parent = _make_section()
        story = _make_story(str(parent["_id"]), {"title": "A Story", "slug": "a-story"})
        project = _make_project(str(parent["_id"]))
        await mock_db["sections"].insert_one(parent)
        await mock_db["stories"].insert_one(story)
        await mock_db["projects"].insert_one(project)

        response = await children_client.get(f"/sections/{parent['_id']}/children")

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 2
        content_types = {item["content_type"] for item in data["items"]}
        assert "story" in content_types
        assert "project" in content_types

    @pytest.mark.asyncio
    async def test_pagination(self, mock_db, children_client):
        parent = _make_section()
        await mock_db["sections"].insert_one(parent)
        # Insert 5 stories
        for i in range(5):
            story = _make_story(
                str(parent["_id"]),
                {
                    "title": f"Story {i}",
                    "slug": f"story-{i}",
                    "createdDate": datetime(2025, 1, i + 1, tzinfo=timezone.utc),
                },
            )
            await mock_db["stories"].insert_one(story)

        response = await children_client.get(f"/sections/{parent['_id']}/children?limit=2&offset=0")

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 5
        assert len(data["items"]) == 2
        assert data["limit"] == 2
        assert data["offset"] == 0

    @pytest.mark.asyncio
    async def test_featured_only(self, mock_db, children_client):
        parent = _make_section()
        featured_story = _make_story(
            str(parent["_id"]),
            {"title": "Featured", "slug": "featured", "is_featured": True},
        )
        regular_story = _make_story(
            str(parent["_id"]),
            {"title": "Regular", "slug": "regular", "is_featured": False},
        )
        await mock_db["sections"].insert_one(parent)
        await mock_db["stories"].insert_many([featured_story, regular_story])

        response = await children_client.get(
            f"/sections/{parent['_id']}/children?featured_only=true"
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["title"] == "Featured"
        assert data["items"][0]["is_featured"] is True

    @pytest.mark.asyncio
    async def test_subtree_query(self, mock_db, children_client):
        parent = _make_section({"title": "Blog", "slug": "blog", "path": "blog"})
        child = _make_section(
            {
                "title": "Tutorials",
                "slug": "tutorials",
                "path": "blog/tutorials",
                "parent_id": str(parent["_id"]),
            }
        )
        # Story in child section, not directly in parent
        story_in_child = _make_story(
            str(child["_id"]),
            {"title": "Tutorial Post", "slug": "tutorial-post"},
        )
        await mock_db["sections"].insert_many([parent, child])
        await mock_db["stories"].insert_one(story_in_child)

        # Without subtree: only child section appears (no content in parent)
        response = await children_client.get(f"/sections/{parent['_id']}/children")
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["item_type"] == "section"

        # With subtree: child section + content from child section
        response = await children_client.get(f"/sections/{parent['_id']}/children?subtree=true")
        data = response.json()
        assert data["total"] == 2
        titles = {item["title"] for item in data["items"]}
        assert "Tutorials" in titles
        assert "Tutorial Post" in titles

    @pytest.mark.asyncio
    async def test_subtree_excludes_unpublished_subsection_content(self, mock_db, children_client):
        parent = _make_section({"title": "Blog", "slug": "blog", "path": "blog"})
        published_child = _make_section(
            {
                "title": "Tutorials",
                "slug": "tutorials",
                "path": "blog/tutorials",
                "parent_id": str(parent["_id"]),
                "is_published": True,
            }
        )
        unpublished_child = _make_section(
            {
                "title": "Drafts",
                "slug": "drafts",
                "path": "blog/drafts",
                "parent_id": str(parent["_id"]),
                "is_published": False,
            }
        )
        story_in_published = _make_story(
            str(published_child["_id"]),
            {"title": "Published Tutorial", "slug": "published-tutorial"},
        )
        story_in_unpublished = _make_story(
            str(unpublished_child["_id"]),
            {"title": "Draft Post", "slug": "draft-post"},
        )
        await mock_db["sections"].insert_many([parent, published_child, unpublished_child])
        await mock_db["stories"].insert_many([story_in_published, story_in_unpublished])

        response = await children_client.get(
            f"/sections/{parent['_id']}/children?subtree=true&include_unpublished=false"
        )

        assert response.status_code == 200
        data = response.json()
        titles = {item["title"] for item in data["items"]}
        assert "Published Tutorial" in titles
        assert "Draft Post" not in titles
        assert "Drafts" not in titles

    @pytest.mark.asyncio
    async def test_nonexistent_section_404(self, mock_db, children_client):
        fake_id = str(ObjectId())
        response = await children_client.get(f"/sections/{fake_id}/children")

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_invalid_section_id_404(self, mock_db, children_client):
        response = await children_client.get("/sections/not-an-objectid/children")

        assert response.status_code == 404
