import os
from unittest.mock import AsyncMock, patch

import pytest
from decorators.auth import _token_cache, requires_auth
from fastapi import FastAPI, Request
from httpx import ASGITransport, AsyncClient

app = FastAPI()


@app.get("/protected")
@requires_auth
async def protected_endpoint(request: Request):
    return {
        "user_id": request.state.user.id,
        "email": request.state.user.email,
        "role": request.state.user.role,
    }


DEV_TOKEN_PREFIX = "dev-mock-"

DEV_USERS = {
    "admin": {
        "email": "dev-admin@dev.example.com",
        "name": "Dev Admin",
        "role": "admin",
    },
    "commenter": {
        "email": "dev-commenter@dev.example.com",
        "name": "Dev Commenter",
        "role": "commenter",
    },
}


@pytest.fixture(autouse=True)
def clear_token_cache():
    _token_cache.clear()
    yield
    _token_cache.clear()


@pytest.fixture
def enable_dev_auth():
    with patch.dict(os.environ, {"ALLOW_DEV_AUTH": "true"}):
        yield


@pytest.fixture
def disable_dev_auth():
    with patch.dict(os.environ, {"ALLOW_DEV_AUTH": ""}, clear=False):
        yield


@pytest.fixture
def mock_users_for_dev():
    from bson import ObjectId

    async def mock_get_collection():
        collection = AsyncMock()
        collection.find_one_and_update.return_value = {
            "_id": ObjectId(),
            "email": "dev-admin@dev.example.com",
            "name": "Dev Admin",
            "role": "admin",
            "auth_providers": [],
        }
        return collection

    with patch("decorators.auth.get_users_collection", mock_get_collection):
        yield


@pytest.mark.asyncio
async def test_dev_token_admin_accepted_when_enabled(enable_dev_auth, mock_users_for_dev):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/protected",
            headers={"Authorization": "Bearer dev-mock-admin"},
        )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "dev-admin@dev.example.com"
    assert data["role"] == "admin"


@pytest.mark.asyncio
async def test_dev_token_commenter_accepted_when_enabled(enable_dev_auth, mock_users_for_dev):
    from bson import ObjectId

    async def mock_get_collection():
        collection = AsyncMock()
        collection.find_one_and_update.return_value = {
            "_id": ObjectId(),
            "email": "dev-commenter@dev.example.com",
            "name": "Dev Commenter",
            "role": "commenter",
            "auth_providers": [],
        }
        return collection

    with patch("decorators.auth.get_users_collection", mock_get_collection):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(
                "/protected",
                headers={"Authorization": "Bearer dev-mock-commenter"},
            )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "dev-commenter@dev.example.com"
    assert data["role"] == "commenter"


@pytest.mark.asyncio
async def test_dev_token_rejected_when_disabled(disable_dev_auth):
    """Dev tokens must be rejected when ALLOW_DEV_AUTH is not set."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/protected",
            headers={"Authorization": "Bearer dev-mock-admin"},
        )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_dev_token_invalid_role_rejected(enable_dev_auth):
    """Dev tokens with unknown roles must be rejected."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/protected",
            headers={"Authorization": "Bearer dev-mock-superadmin"},
        )
    assert response.status_code == 401
