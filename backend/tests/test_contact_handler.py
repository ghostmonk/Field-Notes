"""Tests for POST /contact endpoint."""

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio
from database import get_contact_messages_collection
from httpx import ASGITransport, AsyncClient
from middleware.rate_limit import limiter
from tests.conftest import test_app


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    """Reset the rate limiter storage between tests."""
    limiter.reset()
    yield


@pytest.fixture
def mock_contact_collection():
    mock = MagicMock()
    mock.insert_one = AsyncMock()
    return mock


@pytest.fixture
def override_contact_database(mock_contact_collection):
    async def get_mock():
        return mock_contact_collection

    test_app.dependency_overrides[get_contact_messages_collection] = get_mock
    yield mock_contact_collection
    test_app.dependency_overrides.pop(get_contact_messages_collection, None)


@pytest_asyncio.fixture
async def contact_client(override_contact_database):
    async with AsyncClient(transport=ASGITransport(app=test_app), base_url="http://test") as ac:
        yield ac


@pytest.fixture
def mock_turnstile_success():
    mock_response = MagicMock()
    mock_response.json.return_value = {"success": True}

    mock_client_instance = AsyncMock()
    mock_client_instance.post = AsyncMock(return_value=mock_response)
    mock_client_instance.__aenter__ = AsyncMock(return_value=mock_client_instance)
    mock_client_instance.__aexit__ = AsyncMock(return_value=None)

    with patch("handlers.contact.httpx.AsyncClient", return_value=mock_client_instance):
        with patch.dict("os.environ", {"TURNSTILE_SECRET_KEY": "test-secret"}):
            yield


@pytest.fixture
def mock_turnstile_failure():
    mock_response = MagicMock()
    mock_response.json.return_value = {
        "success": False,
        "error-codes": ["invalid-input-response"],
    }

    mock_client_instance = AsyncMock()
    mock_client_instance.post = AsyncMock(return_value=mock_response)
    mock_client_instance.__aenter__ = AsyncMock(return_value=mock_client_instance)
    mock_client_instance.__aexit__ = AsyncMock(return_value=None)

    with patch("handlers.contact.httpx.AsyncClient", return_value=mock_client_instance):
        with patch.dict("os.environ", {"TURNSTILE_SECRET_KEY": "test-secret"}):
            yield


@pytest.fixture
def mock_email():
    with patch("handlers.contact.send_contact_notification") as m:
        yield m


@pytest.fixture
def valid_payload():
    return {
        "name": "Jane Doe",
        "email": "jane@example.com",
        "message": "Hello, I have a question.",
        "turnstile_token": "valid-token",
        "honeypot": "",
        "elapsed_ms": 5000,
    }


class TestContactEndpoint:
    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_successful_submission(
        self, contact_client, mock_turnstile_success, mock_email, valid_payload
    ):
        response = await contact_client.post("/contact", json=valid_payload)
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}
        # Email is fire-and-forget via create_task — yield to let it complete
        await asyncio.sleep(0.1)
        mock_email.assert_called_once_with(
            "Jane Doe",
            "jane@example.com",
            "Hello, I have a question.",
        )

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_honeypot_filled_rejected(
        self, contact_client, mock_turnstile_success, mock_email, valid_payload
    ):
        valid_payload["honeypot"] = "spam-bot-filled-this"
        response = await contact_client.post("/contact", json=valid_payload)
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}
        mock_email.assert_not_called()

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_timing_too_fast_rejected(
        self, contact_client, mock_turnstile_success, mock_email, valid_payload
    ):
        valid_payload["elapsed_ms"] = 1000
        response = await contact_client.post("/contact", json=valid_payload)
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}
        mock_email.assert_not_called()

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_turnstile_failure_rejected(
        self, contact_client, mock_turnstile_failure, mock_email, valid_payload
    ):
        response = await contact_client.post("/contact", json=valid_payload)
        assert response.status_code == 400
        assert "verification failed" in response.json()["detail"].lower()
        mock_email.assert_not_called()

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_html_stripped_from_message(
        self, contact_client, mock_turnstile_success, mock_email, valid_payload
    ):
        valid_payload["message"] = "<script>alert('xss')</script>Hello there"
        response = await contact_client.post("/contact", json=valid_payload)
        assert response.status_code == 200
        await asyncio.sleep(0.1)
        mock_email.assert_called_once()
        call_args = mock_email.call_args[0]
        assert "<script>" not in call_args[2]
        assert "Hello there" in call_args[2]

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_missing_required_fields(self, contact_client):
        response = await contact_client.post("/contact", json={})
        assert response.status_code == 422
