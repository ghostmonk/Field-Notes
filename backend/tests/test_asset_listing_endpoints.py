"""Integration tests for asset listing endpoints."""

import os
import tempfile
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
    """Provide a mongomock database and patch get_db calls."""
    client = mongomock_motor.AsyncMongoMockClient()
    db = client["test_asset_listing"]

    async def mock_get_collection():
        return db["stories"]

    async def mock_get_projects():
        return db["projects"]

    async def mock_get_photo_essays():
        return db["photo_essays"]

    with (
        patch("handlers.asset_listing.get_collection", mock_get_collection),
        patch("handlers.asset_listing.get_projects_collection", mock_get_projects),
        patch("handlers.asset_listing.get_photo_essays_collection", mock_get_photo_essays),
    ):
        yield db


@pytest.fixture
def storage_dir():
    """Create a temporary storage directory with sample asset files."""
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create image variants for one asset
        asset_id = "20260329_143022_a7f3b2c1"
        for variant in ["originals", "large", "medium", "thumbnails"]:
            variant_dir = os.path.join(tmpdir, "uploads", "images", variant)
            os.makedirs(variant_dir)
            with open(os.path.join(variant_dir, f"{asset_id}.webp"), "wb") as f:
                f.write(
                    b"x"
                    * (100 * (4 - ["originals", "large", "medium", "thumbnails"].index(variant)))
                )

        # Create a second asset
        asset_id2 = "20260101_120000_deadbeef"
        originals_dir = os.path.join(tmpdir, "uploads", "images", "originals")
        with open(os.path.join(originals_dir, f"{asset_id2}.webp"), "wb") as f:
            f.write(b"y" * 200)

        yield tmpdir


@pytest_asyncio.fixture
async def asset_client(mock_db, storage_dir, mock_auth):
    """Async client with mocked DB, storage, and auth."""
    with patch("handlers.asset_listing.LOCAL_STORAGE_PATH", storage_dir):
        async with AsyncClient(
            transport=ASGITransport(app=app_fixture), base_url="http://test"
        ) as ac:
            yield ac


@pytest_asyncio.fixture
async def unauth_client(mock_db, storage_dir):
    """Async client without auth for testing 401 responses."""
    with patch("handlers.asset_listing.LOCAL_STORAGE_PATH", storage_dir):
        async with AsyncClient(
            transport=ASGITransport(app=app_fixture), base_url="http://test"
        ) as ac:
            yield ac


AUTH_HEADERS = {"Authorization": "Bearer valid_token"}


class TestListAssets:
    """Tests for GET /assets/list"""

    @pytest.mark.asyncio
    async def test_returns_grouped_assets(self, asset_client):
        response = await asset_client.get("/assets/list", headers=AUTH_HEADERS)
        assert response.status_code == 200
        data = response.json()
        assert data["total_count"] == 2
        assert len(data["items"]) == 2
        # Newest first
        assert data["items"][0]["asset_id"] == "20260329_143022_a7f3b2c1"
        assert data["items"][0]["type"] == "image"
        assert len(data["items"][0]["variants"]) == 4

    @pytest.mark.asyncio
    async def test_filters_by_prefix(self, asset_client):
        response = await asset_client.get(
            "/assets/list", params={"prefix": "images"}, headers=AUTH_HEADERS
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total_count"] >= 1

    @pytest.mark.asyncio
    async def test_rejects_invalid_prefix(self, asset_client):
        response = await asset_client.get(
            "/assets/list", params={"prefix": "../../etc"}, headers=AUTH_HEADERS
        )
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_pagination(self, asset_client):
        response = await asset_client.get("/assets/list", params={"limit": 1}, headers=AUTH_HEADERS)
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 1
        assert data["next_cursor"] is not None
        assert data["total_count"] == 2

        # Fetch next page
        response2 = await asset_client.get(
            "/assets/list",
            params={"limit": 1, "cursor": data["next_cursor"]},
            headers=AUTH_HEADERS,
        )
        assert response2.status_code == 200
        data2 = response2.json()
        assert len(data2["items"]) == 1
        assert data2["next_cursor"] is None

    @pytest.mark.asyncio
    async def test_invalid_cursor_returns_400(self, asset_client):
        response = await asset_client.get(
            "/assets/list", params={"cursor": "abc"}, headers=AUTH_HEADERS
        )
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_rejects_limit_over_100(self, asset_client):
        response = await asset_client.get(
            "/assets/list", params={"limit": 101}, headers=AUTH_HEADERS
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_unauthenticated_returns_401(self, unauth_client):
        response = await unauth_client.get("/assets/list")
        assert response.status_code == 401


class TestListAssetsBySection:
    """Tests for GET /assets/by-section/{section_id}"""

    @pytest.mark.asyncio
    async def test_returns_referenced_assets(self, mock_db, asset_client):
        section_id = str(ObjectId())
        asset_id = "20260329_143022_a7f3b2c1"
        await mock_db["stories"].insert_one(
            {
                "_id": ObjectId(),
                "title": "Test Story",
                "content": f'<img src="/uploads/images/originals/{asset_id}.webp">',
                "section_id": section_id,
                "is_published": True,
                "createdDate": datetime(2025, 1, 1, tzinfo=timezone.utc),
                "updatedDate": datetime(2025, 1, 1, tzinfo=timezone.utc),
            }
        )

        response = await asset_client.get(f"/assets/by-section/{section_id}", headers=AUTH_HEADERS)
        assert response.status_code == 200
        data = response.json()
        assert data["total_count"] == 1
        assert data["items"][0]["asset_id"] == asset_id
        assert data["items"][0]["referenced_by"][0]["content_type"] == "story"
        assert data["items"][0]["referenced_by"][0]["title"] == "Test Story"

    @pytest.mark.asyncio
    async def test_empty_section_returns_empty(self, mock_db, asset_client):
        section_id = str(ObjectId())
        response = await asset_client.get(f"/assets/by-section/{section_id}", headers=AUTH_HEADERS)
        assert response.status_code == 200
        data = response.json()
        assert data["total_count"] == 0
        assert data["items"] == []

    @pytest.mark.asyncio
    async def test_unauthenticated_returns_401(self, unauth_client):
        response = await unauth_client.get(f"/assets/by-section/{ObjectId()}")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_project_image_url_referenced(self, mock_db, asset_client):
        section_id = str(ObjectId())
        asset_id = "20260329_143022_a7f3b2c1"
        await mock_db["projects"].insert_one(
            {
                "_id": ObjectId(),
                "title": "Test Project",
                "content": "",
                "image_url": f"/uploads/images/originals/{asset_id}.webp",
                "section_id": section_id,
                "is_published": True,
                "createdDate": datetime(2025, 1, 1, tzinfo=timezone.utc),
                "updatedDate": datetime(2025, 1, 1, tzinfo=timezone.utc),
            }
        )

        response = await asset_client.get(f"/assets/by-section/{section_id}", headers=AUTH_HEADERS)
        assert response.status_code == 200
        data = response.json()
        assert data["total_count"] == 1
        assert data["items"][0]["referenced_by"][0]["content_type"] == "project"

    @pytest.mark.asyncio
    async def test_photo_essay_assets_referenced(self, mock_db, asset_client):
        section_id = str(ObjectId())
        asset_id = "20260329_143022_a7f3b2c1"
        await mock_db["photo_essays"].insert_one(
            {
                "_id": ObjectId(),
                "title": "Test Essay",
                "cover_image_url": f"/uploads/images/originals/{asset_id}.webp",
                "photos": [{"url": f"/uploads/images/originals/{asset_id}.webp", "sort_order": 0}],
                "section_id": section_id,
                "is_published": True,
                "createdDate": datetime(2025, 1, 1, tzinfo=timezone.utc),
                "updatedDate": datetime(2025, 1, 1, tzinfo=timezone.utc),
            }
        )

        response = await asset_client.get(f"/assets/by-section/{section_id}", headers=AUTH_HEADERS)
        assert response.status_code == 200
        data = response.json()
        assert data["total_count"] == 1
        assert data["items"][0]["referenced_by"][0]["content_type"] == "photo_essay"

    @pytest.mark.asyncio
    async def test_pagination_with_cursor(self, mock_db, asset_client, storage_dir):
        section_id = str(ObjectId())
        # Reference both assets
        await mock_db["stories"].insert_many(
            [
                {
                    "_id": ObjectId(),
                    "title": f"Story {i}",
                    "content": f'<img src="/uploads/images/originals/{aid}.webp">',
                    "section_id": section_id,
                    "is_published": True,
                    "createdDate": datetime(2025, 1, 1, tzinfo=timezone.utc),
                    "updatedDate": datetime(2025, 1, 1, tzinfo=timezone.utc),
                }
                for i, aid in enumerate(["20260329_143022_a7f3b2c1", "20260101_120000_deadbeef"])
            ]
        )

        response = await asset_client.get(
            f"/assets/by-section/{section_id}",
            params={"limit": 1},
            headers=AUTH_HEADERS,
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 1
        assert data["next_cursor"] is not None
