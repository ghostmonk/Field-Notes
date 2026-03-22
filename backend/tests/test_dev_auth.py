import os
from unittest.mock import AsyncMock, patch

import pytest
from bson import ObjectId
from decorators.auth import _DEV_USERS, DEV_TOKEN_PREFIX, _token_cache, requires_auth
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
    admin = _DEV_USERS["admin"]

    async def mock_get_collection():
        collection = AsyncMock()
        collection.find_one_and_update.return_value = {
            "_id": ObjectId(),
            "email": admin["email"],
            "name": admin["name"],
            "role": "admin",
            "auth_providers": [],
        }
        return collection

    with patch("decorators.auth.get_users_collection", mock_get_collection):
        yield


@pytest.mark.asyncio
async def test_dev_token_admin_accepted_when_enabled(enable_dev_auth, mock_users_for_dev):
    admin = _DEV_USERS["admin"]
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/protected",
            headers={"Authorization": f"Bearer {DEV_TOKEN_PREFIX}admin"},
        )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == admin["email"]
    assert data["role"] == "admin"


@pytest.mark.asyncio
async def test_dev_token_commenter_accepted_when_enabled(enable_dev_auth, mock_users_for_dev):
    commenter = _DEV_USERS["commenter"]

    async def mock_get_collection():
        collection = AsyncMock()
        collection.find_one_and_update.return_value = {
            "_id": ObjectId(),
            "email": commenter["email"],
            "name": commenter["name"],
            "role": "commenter",
            "auth_providers": [],
        }
        return collection

    with patch("decorators.auth.get_users_collection", mock_get_collection):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(
                "/protected",
                headers={"Authorization": f"Bearer {DEV_TOKEN_PREFIX}commenter"},
            )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == commenter["email"]
    assert data["role"] == "commenter"


@pytest.mark.asyncio
async def test_dev_token_rejected_when_disabled(disable_dev_auth):
    """Dev tokens must be rejected when ALLOW_DEV_AUTH is not set."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/protected",
            headers={"Authorization": f"Bearer {DEV_TOKEN_PREFIX}admin"},
        )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_dev_token_invalid_role_rejected(enable_dev_auth):
    """Dev tokens with unknown roles must be rejected."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/protected",
            headers={"Authorization": f"Bearer {DEV_TOKEN_PREFIX}superadmin"},
        )
    assert response.status_code == 401
