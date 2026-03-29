"""
Tests for the path resolution endpoint.
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
    db = client["test_path_resolution"]

    async def mock_get_db():
        return db

    with patch("handlers.path_resolution.get_db", mock_get_db):
        yield db


@pytest_asyncio.fixture
async def path_client(mock_db):
    """Async test client with patched database."""
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


class TestResolvePath:
    """Tests for GET /sections/resolve-path/{full_path}"""

    @pytest.mark.asyncio
    async def test_resolve_top_level_section(self, mock_db, path_client):
        section = _make_section()
        await mock_db["sections"].insert_one(section)

        response = await path_client.get("/sections/resolve-path/blog")

        assert response.status_code == 200
        data = response.json()
        assert data["type"] == "section"
        assert data["section"]["title"] == "Blog"
        assert data["section"]["path"] == "blog"
        assert data["section"]["id"] == str(section["_id"])

    @pytest.mark.asyncio
    async def test_resolve_nested_section(self, mock_db, path_client):
        parent = _make_section({"title": "Creative", "slug": "creative", "path": "creative"})
        child = _make_section(
            {
                "title": "Photos",
                "slug": "photos",
                "path": "creative/photos",
                "parent_id": str(parent["_id"]),
            }
        )
        await mock_db["sections"].insert_many([parent, child])

        response = await path_client.get("/sections/resolve-path/creative/photos")

        assert response.status_code == 200
        data = response.json()
        assert data["section"]["title"] == "Photos"
        assert data["section"]["path"] == "creative/photos"

    @pytest.mark.asyncio
    async def test_resolve_deeply_nested(self, mock_db, path_client):
        grandparent = _make_section({"title": "Creative", "slug": "creative", "path": "creative"})
        parent = _make_section(
            {
                "title": "Photos",
                "slug": "photos",
                "path": "creative/photos",
                "parent_id": str(grandparent["_id"]),
            }
        )
        child = _make_section(
            {
                "title": "Landscapes",
                "slug": "landscapes",
                "path": "creative/photos/landscapes",
                "parent_id": str(parent["_id"]),
            }
        )
        await mock_db["sections"].insert_many([grandparent, parent, child])

        response = await path_client.get("/sections/resolve-path/creative/photos/landscapes")

        assert response.status_code == 200
        data = response.json()
        assert data["section"]["title"] == "Landscapes"
        assert data["section"]["path"] == "creative/photos/landscapes"

    @pytest.mark.asyncio
    async def test_breadcrumbs_correct(self, mock_db, path_client):
        grandparent = _make_section({"title": "Creative", "slug": "creative", "path": "creative"})
        parent = _make_section(
            {
                "title": "Photos",
                "slug": "photos",
                "path": "creative/photos",
                "parent_id": str(grandparent["_id"]),
            }
        )
        child = _make_section(
            {
                "title": "Landscapes",
                "slug": "landscapes",
                "path": "creative/photos/landscapes",
                "parent_id": str(parent["_id"]),
            }
        )
        await mock_db["sections"].insert_many([grandparent, parent, child])

        response = await path_client.get("/sections/resolve-path/creative/photos/landscapes")

        assert response.status_code == 200
        data = response.json()
        breadcrumbs = data["breadcrumbs"]
        assert len(breadcrumbs) == 3
        assert breadcrumbs[0] == {"title": "Creative", "path": "creative"}
        assert breadcrumbs[1] == {"title": "Photos", "path": "creative/photos"}
        assert breadcrumbs[2] == {
            "title": "Landscapes",
            "path": "creative/photos/landscapes",
        }

    @pytest.mark.asyncio
    async def test_nonexistent_path_404(self, mock_db, path_client):
        response = await path_client.get("/sections/resolve-path/nope")

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_unpublished_section_404(self, mock_db, path_client):
        section = _make_section({"is_published": False})
        await mock_db["sections"].insert_one(section)

        response = await path_client.get("/sections/resolve-path/blog")

        assert response.status_code == 404
