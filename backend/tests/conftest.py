"""
Test configuration and fixtures
"""

import os
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import mongomock_motor
import pytest
import pytest_asyncio
from bson import ObjectId

# Set environment variables before importing handlers that check them at module load time
os.environ.setdefault("GCS_BUCKET_NAME", "test-bucket")
os.environ.setdefault("DATABASE_URL", "mongodb://localhost:27017/test")
os.environ.setdefault("GOOGLE_CLOUD_PROJECT", "test-project")
os.environ.setdefault("STORAGE_BUCKET", "test-bucket")
os.environ.setdefault("ADMIN_EMAIL", "admin@test.com")

from database import (
    get_collection,
    get_comments_collection,
    get_navlinks_collection,
    get_pages_collection,
    get_photo_essays_collection,
    get_projects_collection,
    get_reactions_collection,
    get_resumes_collection,
    get_sections_collection,
    get_users_collection,
)
from fastapi import FastAPI
from fastapi.testclient import TestClient

# Create a test app without lifespan to avoid DB connections during startup
# Import routers directly to avoid the lifespan event
from handlers.engagement import router as engagement_router
from handlers.navlinks import router as navlinks_router
from handlers.pages import router as pages_router
from handlers.photo_essays import router as photo_essays_router
from handlers.projects import router as projects_router
from handlers.resume import router as resume_router
from handlers.sections import router as sections_router
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
test_app.include_router(sections_router)
test_app.include_router(navlinks_router)
test_app.include_router(engagement_router)
test_app.include_router(photo_essays_router)
test_app.include_router(resume_router)


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
    mock.find_one_and_update = AsyncMock()
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
    1. Google token validation API (via httpx)
    2. Google userinfo API (via httpx)
    3. Users collection for get_or_create_user (via module-level patch)
    """
    from unittest.mock import patch

    from bson import ObjectId

    # Clear the token cache to ensure fresh auth state for each test
    from decorators.auth import _token_cache

    _token_cache.clear()

    # Mock user document returned from DB (using find_one_and_update for atomic upsert)
    mock_user_id = ObjectId()
    mock_users_collection.find_one_and_update.return_value = {
        "_id": mock_user_id,
        "email": "test@example.com",
        "name": "Test User",
        "role": "admin",
        "auth_providers": [],
    }

    # Create async function that returns the mock collection
    async def get_mock_users_collection():
        return mock_users_collection

    # Create mock httpx AsyncClient
    class MockResponse:
        def __init__(self, status_code, json_data):
            self.status_code = status_code
            self._json_data = json_data

        def json(self):
            return self._json_data

    class MockAsyncClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            pass

        async def get(self, url, **kwargs):
            if "tokeninfo" in url:
                return MockResponse(
                    200,
                    {
                        "scope": "https://www.googleapis.com/auth/userinfo.email",
                        "exp": 9999999999,
                        "email": "test@example.com",
                        "sub": "google-user-id-123",
                    },
                )
            elif "userinfo" in url:
                return MockResponse(
                    200,
                    {
                        "email": "test@example.com",
                        "name": "Test User",
                        "picture": "https://example.com/avatar.jpg",
                    },
                )
            return MockResponse(404, {})

    # Patch httpx.AsyncClient and get_users_collection at the module level
    with (
        patch("decorators.auth.httpx.AsyncClient", MockAsyncClient),
        patch("decorators.auth.get_users_collection", get_mock_users_collection),
    ):
        yield


@pytest.fixture
def auth_headers():
    """Standard auth headers for testing"""
    return {"Authorization": "Bearer valid_token"}


@pytest.fixture
def mock_auth_commenter(mock_users_collection):
    """Mock authentication for a non-admin (commenter) user.

    Same as mock_auth but returns role='commenter' instead of 'admin'.
    """
    from unittest.mock import patch

    from bson import ObjectId
    from decorators.auth import _token_cache

    _token_cache.clear()

    mock_user_id = ObjectId()
    mock_users_collection.find_one_and_update.return_value = {
        "_id": mock_user_id,
        "email": "commenter@example.com",
        "name": "Commenter User",
        "role": "commenter",
        "auth_providers": [],
    }

    async def get_mock_users_collection():
        return mock_users_collection

    class MockResponse:
        def __init__(self, status_code, json_data):
            self.status_code = status_code
            self._json_data = json_data

        def json(self):
            return self._json_data

    class MockAsyncClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            pass

        async def get(self, url, **kwargs):
            if "tokeninfo" in url:
                return MockResponse(
                    200,
                    {
                        "scope": "https://www.googleapis.com/auth/userinfo.email",
                        "exp": 9999999999,
                        "email": "commenter@example.com",
                        "sub": "google-commenter-id-456",
                    },
                )
            elif "userinfo" in url:
                return MockResponse(
                    200,
                    {
                        "email": "commenter@example.com",
                        "name": "Commenter User",
                        "picture": "https://example.com/avatar2.jpg",
                    },
                )
            return MockResponse(404, {})

    with (
        patch("decorators.auth.httpx.AsyncClient", MockAsyncClient),
        patch("decorators.auth.get_users_collection", get_mock_users_collection),
    ):
        yield


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
def mock_stories_collection():
    """Mock collection for stories (used by engagement target validation)"""
    mock = MagicMock()
    mock.find_one = AsyncMock()
    # Default: target exists and is published
    mock.find_one.return_value = {"_id": "507f1f77bcf86cd799439011", "is_published": True}
    return mock


@pytest.fixture
def override_engagement_database(
    mock_reactions_collection,
    mock_comments_collection,
    mock_stories_collection,
    mock_projects_collection,
):
    """Override engagement collections to use mocks"""
    from unittest.mock import patch

    async def get_mock_reactions_collection():
        return mock_reactions_collection

    async def get_mock_comments_collection():
        return mock_comments_collection

    async def get_mock_stories_collection():
        return mock_stories_collection

    async def get_mock_projects_coll():
        return mock_projects_collection

    # Default: target exists and is published
    mock_projects_collection.find_one.return_value = {
        "_id": "507f1f77bcf86cd799439011",
        "is_published": True,
    }

    test_app.dependency_overrides[get_reactions_collection] = get_mock_reactions_collection
    test_app.dependency_overrides[get_comments_collection] = get_mock_comments_collection

    # Patch module-level imports for validate_target_exists (not dependency injected)
    with (
        patch("handlers.engagement.get_collection", get_mock_stories_collection),
        patch("handlers.engagement.get_projects_collection", get_mock_projects_coll),
    ):
        yield mock_reactions_collection, mock_comments_collection

    test_app.dependency_overrides.pop(get_reactions_collection, None)
    test_app.dependency_overrides.pop(get_comments_collection, None)


@pytest_asyncio.fixture
async def engagement_async_client(override_engagement_database):
    """Async test client for engagement tests"""
    async with AsyncClient(transport=ASGITransport(app=test_app), base_url="http://test") as ac:
        yield ac


@pytest.fixture
def mock_sections_collection():
    """Mock collection for sections testing"""
    mock = MagicMock()
    mock.find_one = AsyncMock()
    mock.count_documents = AsyncMock()
    mock.insert_one = AsyncMock()
    mock.update_one = AsyncMock()
    mock.delete_one = AsyncMock()
    return mock


@pytest.fixture
def override_sections_database(mock_sections_collection):
    """Override the sections collection to use mocks"""

    async def get_mock_sections_collection():
        return mock_sections_collection

    test_app.dependency_overrides[get_sections_collection] = get_mock_sections_collection
    yield mock_sections_collection
    test_app.dependency_overrides.pop(get_sections_collection, None)


@pytest_asyncio.fixture
async def sections_async_client(override_sections_database):
    """Async test client for sections tests"""
    async with AsyncClient(transport=ASGITransport(app=test_app), base_url="http://test") as ac:
        yield ac


@pytest.fixture
def sample_section_data():
    """Sample section data for testing"""
    fixed_datetime = datetime(2025, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    return {
        "title": "Blog",
        "slug": "blog",
        "parent_id": None,
        "display_type": "feed",
        "content_type": "story",
        "nav_visibility": "main",
        "sort_order": 0,
        "is_published": True,
        "icon": "default",
        "createdDate": fixed_datetime,
        "updatedDate": fixed_datetime,
    }


@pytest.fixture
def mock_navlinks_collection():
    """Mock collection for navlinks testing"""
    mock = MagicMock()
    mock.find_one = AsyncMock()
    mock.count_documents = AsyncMock()
    mock.insert_one = AsyncMock()
    mock.update_one = AsyncMock()
    mock.delete_one = AsyncMock()
    return mock


@pytest.fixture
def override_navlinks_database(mock_navlinks_collection):
    """Override the navlinks collection to use mocks"""

    async def get_mock_navlinks_collection():
        return mock_navlinks_collection

    test_app.dependency_overrides[get_navlinks_collection] = get_mock_navlinks_collection
    yield mock_navlinks_collection
    test_app.dependency_overrides.pop(get_navlinks_collection, None)


@pytest_asyncio.fixture
async def navlinks_async_client(override_navlinks_database):
    """Async test client for navlinks tests"""
    async with AsyncClient(transport=ASGITransport(app=test_app), base_url="http://test") as ac:
        yield ac


@pytest.fixture
def sample_navlink_data():
    """Sample navlink data for testing"""
    fixed_datetime = datetime(2025, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    return {
        "label": "GitHub",
        "url": "https://github.com/example",
        "sort_order": 0,
        "is_published": True,
        "createdDate": fixed_datetime,
        "updatedDate": fixed_datetime,
    }


@pytest.fixture
def mock_photo_essays_collection():
    """Mock collection for photo essays testing"""
    mock = MagicMock()
    mock.find_one = AsyncMock()
    mock.count_documents = AsyncMock()
    mock.insert_one = AsyncMock()
    mock.update_one = AsyncMock()
    mock.delete_one = AsyncMock()
    return mock


@pytest.fixture
def override_photo_essays_database(mock_photo_essays_collection):
    """Override the photo essays collection to use mocks"""

    async def get_mock_photo_essays_collection():
        return mock_photo_essays_collection

    test_app.dependency_overrides[get_photo_essays_collection] = get_mock_photo_essays_collection
    yield mock_photo_essays_collection
    test_app.dependency_overrides.pop(get_photo_essays_collection, None)


@pytest_asyncio.fixture
async def photo_essays_async_client(override_photo_essays_database):
    """Async test client for photo essays tests"""
    async with AsyncClient(transport=ASGITransport(app=test_app), base_url="http://test") as ac:
        yield ac


@pytest.fixture
def sample_photo_essay_data():
    """Sample photo essay data for testing"""
    fixed_datetime = datetime(2025, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    return {
        "title": "Mountain Landscapes",
        "description": "A collection of mountain photography",
        "cover_image_url": "https://example.com/cover.jpg",
        "photos": [
            {
                "url": "https://example.com/photo1.jpg",
                "caption": "Summit view",
                "width": 1920,
                "height": 1080,
                "sort_order": 0,
            },
            {
                "url": "https://example.com/photo2.jpg",
                "caption": "Valley floor",
                "width": 1920,
                "height": 1280,
                "sort_order": 1,
            },
        ],
        "photo_count": 2,
        "is_published": True,
        "slug": "mountain-landscapes",
        "section_id": str(ObjectId()),
        "createdDate": fixed_datetime,
        "updatedDate": fixed_datetime,
    }


@pytest.fixture
def mock_resumes_collection():
    """Mock collection for resumes testing"""
    mock = MagicMock()
    mock.find_one = AsyncMock()
    mock.count_documents = AsyncMock()
    mock.insert_one = AsyncMock()
    mock.update_one = AsyncMock()
    mock.delete_one = AsyncMock()
    return mock


@pytest.fixture
def override_resumes_database(mock_resumes_collection):
    """Override the resumes collection to use mocks"""

    async def get_mock_resumes_collection():
        return mock_resumes_collection

    test_app.dependency_overrides[get_resumes_collection] = get_mock_resumes_collection
    yield mock_resumes_collection
    test_app.dependency_overrides.pop(get_resumes_collection, None)


@pytest_asyncio.fixture
async def resumes_async_client(override_resumes_database):
    """Async test client for resumes tests"""
    async with AsyncClient(transport=ASGITransport(app=test_app), base_url="http://test") as ac:
        yield ac


@pytest.fixture
def sample_resume_data():
    """Sample resume data for testing"""
    fixed_datetime = datetime(2025, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    return {
        "contact": {
            "full_name": "Nicholas Hillier",
            "email": "nicholas@ghostmonk.com",
            "location": "Montreal",
            "github": "https://github.com/ghostmonk",
        },
        "summary": "Full-stack developer with experience in TypeScript, Python, and cloud infrastructure.",
        "work_experience": [],
        "education": [],
        "skills": ["TypeScript", "Python", "React", "FastAPI", "MongoDB"],
        "user_id": str(ObjectId()),
        "createdDate": fixed_datetime,
        "updatedDate": fixed_datetime,
    }
