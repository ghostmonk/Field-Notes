"""
Test configuration and fixtures
"""

import os
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import mongomock_motor
import pytest
import pytest_asyncio

# Set environment variables before importing handlers that check them at module load time
os.environ.setdefault("GCS_BUCKET_NAME", "test-bucket")
os.environ.setdefault("DATABASE_URL", "mongodb://localhost:27017/test")
os.environ.setdefault("GOOGLE_CLOUD_PROJECT", "test-project")
os.environ.setdefault("STORAGE_BUCKET", "test-bucket")

from database import (
    get_collection,
    get_pages_collection,
    get_projects_collection,
    get_users_collection,
)
from fastapi import FastAPI
from fastapi.testclient import TestClient

# Create a test app without lifespan to avoid DB connections during startup
# Import routers directly to avoid the lifespan event
from handlers.pages import router as pages_router
from handlers.projects import router as projects_router
from handlers.stories import router as stories_router
from handlers.uploads import router as uploads_router
from handlers.users import router as users_router
from handlers.video_processing import router as video_processing_router
from httpx import ASGITransport, AsyncClient

test_app = FastAPI()
test_app.include_router(stories_router)
test_app.include_router(uploads_router)
test_app.include_router(users_router)
test_app.include_router(video_processing_router)
test_app.include_router(pages_router)
test_app.include_router(projects_router)


@pytest.fixture
def mock_database():
    """Mock database for testing"""
    mock_client = mongomock_motor.AsyncMongoMockClient()
    mock_db = mock_client.test_db
    return mock_db


@pytest.fixture
def mock_collection():
    """Mock collection for testing

    Uses MagicMock as base because MongoDB's find() returns a cursor synchronously.
    Individual methods that should be async (like find_one, count_documents) are set up as AsyncMock.
    """
    mock = MagicMock()
    # These methods need to be async
    mock.find_one = AsyncMock()
    mock.count_documents = AsyncMock()
    mock.insert_one = AsyncMock()
    mock.update_one = AsyncMock()
    mock.delete_one = AsyncMock()
    # find() returns a cursor synchronously, so it stays as MagicMock
    return mock


@pytest.fixture
def override_database(mock_collection):
    """Override the database functions to use mocks via FastAPI dependency overrides"""

    async def get_mock_collection():
        return mock_collection

    # Use FastAPI's dependency override system
    test_app.dependency_overrides[get_collection] = get_mock_collection
    yield mock_collection
    # Clear the overrides after the test
    test_app.dependency_overrides.clear()


@pytest.fixture
def client(override_database):
    """Test client for synchronous tests"""
    return TestClient(test_app)


@pytest_asyncio.fixture
async def async_client(override_database):
    """Async test client for async tests - requires override_database to mock DB"""
    async with AsyncClient(transport=ASGITransport(app=test_app), base_url="http://test") as ac:
        yield ac


@pytest.fixture
def sample_story_data():
    """Sample story data for testing"""
    # Use fixed datetime for consistent testing
    fixed_datetime = datetime(2025, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    return {
        "title": "Test Story",
        "content": "<p>This is a test story content.</p>",
        "is_published": True,
        "slug": "test-story",
        "createdDate": fixed_datetime,
        "updatedDate": fixed_datetime,
    }


@pytest.fixture
def sample_unpublished_story_data():
    """Sample unpublished story data for testing"""
    # Use fixed datetime for consistent testing
    fixed_datetime = datetime(2025, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    return {
        "title": "Draft Story",
        "content": "<p>This is a draft story content.</p>",
        "is_published": False,
        "slug": "draft-story",
        "createdDate": fixed_datetime,
        "updatedDate": fixed_datetime,
    }


@pytest.fixture
def mock_google_storage():
    """Mock Google Cloud Storage for testing"""
    mock_storage = MagicMock()
    mock_bucket = MagicMock()
    mock_blob = MagicMock()

    mock_storage.bucket.return_value = mock_bucket
    mock_bucket.blob.return_value = mock_blob
    mock_blob.upload_from_file.return_value = None
    mock_blob.public_url = "https://storage.googleapis.com/test-bucket/test-file.jpg"

    return mock_storage


@pytest.fixture
def mock_logger():
    """Mock logger for testing"""
    return MagicMock()


@pytest.fixture(autouse=True)
def setup_test_environment():
    """Test environment is set up at module load time via os.environ.setdefault"""
    pass


@pytest.fixture
def mock_pages_collection():
    """Mock collection for pages testing"""
    mock = MagicMock()
    mock.find_one = AsyncMock()
    mock.count_documents = AsyncMock()
    mock.insert_one = AsyncMock()
    mock.update_one = AsyncMock()
    mock.delete_one = AsyncMock()
    return mock


@pytest.fixture
def mock_projects_collection():
    """Mock collection for projects testing"""
    mock = MagicMock()
    mock.find_one = AsyncMock()
    mock.count_documents = AsyncMock()
    mock.insert_one = AsyncMock()
    mock.update_one = AsyncMock()
    mock.delete_one = AsyncMock()
    return mock


@pytest.fixture
def override_pages_database(mock_pages_collection):
    """Override the pages collection to use mocks"""

    async def get_mock_pages_collection():
        return mock_pages_collection

    test_app.dependency_overrides[get_pages_collection] = get_mock_pages_collection
    yield mock_pages_collection
    test_app.dependency_overrides.pop(get_pages_collection, None)


@pytest.fixture
def override_projects_database(mock_projects_collection):
    """Override the projects collection to use mocks"""

    async def get_mock_projects_collection():
        return mock_projects_collection

    test_app.dependency_overrides[get_projects_collection] = get_mock_projects_collection
    yield mock_projects_collection
    test_app.dependency_overrides.pop(get_projects_collection, None)


@pytest_asyncio.fixture
async def pages_async_client(override_pages_database):
    """Async test client for pages tests"""
    async with AsyncClient(transport=ASGITransport(app=test_app), base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def projects_async_client(override_projects_database):
    """Async test client for projects tests"""
    async with AsyncClient(transport=ASGITransport(app=test_app), base_url="http://test") as ac:
        yield ac


@pytest.fixture
def sample_page_data():
    """Sample page data for testing"""
    fixed_datetime = datetime(2025, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    return {
        "title": "About Me",
        "content": "<p>This is the about page content.</p>",
        "page_type": "about",
        "is_published": True,
        "createdDate": fixed_datetime,
        "updatedDate": fixed_datetime,
    }


@pytest.fixture
def sample_project_data():
    """Sample project data for testing"""
    fixed_datetime = datetime(2025, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    return {
        "title": "My Awesome Project",
        "summary": "A brief summary of the project",
        "content": "<p>Detailed project description.</p>",
        "technologies": ["Python", "FastAPI", "MongoDB"],
        "github_url": "https://github.com/user/project",
        "live_url": "https://project.example.com",
        "image_url": "https://example.com/image.jpg",
        "is_published": True,
        "is_featured": True,
        "sort_order": 0,
        "slug": "my-awesome-project",
        "createdDate": fixed_datetime,
        "updatedDate": fixed_datetime,
    }


@pytest.fixture
def mock_users_collection():
    """Mock collection for users testing"""
    mock = MagicMock()
    mock.find_one = AsyncMock()
    mock.count_documents = AsyncMock()
    mock.insert_one = AsyncMock()
    mock.update_one = AsyncMock()
    mock.delete_one = AsyncMock()
    return mock


@pytest.fixture
def override_users_database(mock_users_collection):
    """Override the users collection to use mocks"""

    async def get_mock_users_collection():
        return mock_users_collection

    test_app.dependency_overrides[get_users_collection] = get_mock_users_collection
    yield mock_users_collection
    test_app.dependency_overrides.pop(get_users_collection, None)


@pytest.fixture
def mock_auth(mock_users_collection):
    """Mock authentication decorator for testing authenticated endpoints.

    This mocks:
    1. Google token validation API
    2. Google userinfo API
    3. Users collection for get_or_create_user (via module-level patch)
    """
    from unittest.mock import MagicMock, patch

    from bson import ObjectId

    # Mock user document returned from DB
    mock_user_id = ObjectId()
    mock_users_collection.find_one.return_value = {
        "_id": mock_user_id,
        "email": "test@example.com",
        "name": "Test User",
        "role": "admin",
        "auth_providers": [],
    }

    # Create async function that returns the mock collection
    async def get_mock_users_collection():
        return mock_users_collection

    # Patch both requests.get and get_users_collection at the module level
    with (
        patch("decorators.auth.requests.get") as mock_requests,
        patch("decorators.auth.get_users_collection", get_mock_users_collection),
    ):

        def mock_get(url, **kwargs):
            response = MagicMock()
            response.status_code = 200
            if "tokeninfo" in url:
                response.json.return_value = {
                    "scope": "https://www.googleapis.com/auth/userinfo.email",
                    "exp": 9999999999,
                    "email": "test@example.com",
                    "sub": "google-user-id-123",
                }
            elif "userinfo" in url:
                response.json.return_value = {
                    "email": "test@example.com",
                    "name": "Test User",
                    "picture": "https://example.com/avatar.jpg",
                }
            return response

        mock_requests.side_effect = mock_get
        yield mock_requests


@pytest.fixture
def auth_headers():
    """Standard auth headers for testing"""
    return {"Authorization": "Bearer valid_token"}
