"""Tests for contact form Pydantic models."""

import pytest
from models.contact import ContactMessageDoc, ContactSubmission
from pydantic import ValidationError


class TestContactSubmission:
    """Tests for ContactSubmission model."""

    def test_valid_submission(self):
        data = ContactSubmission(
            name="Jane Doe",
            email="jane@example.com",
            message="Hello, this is a test message.",
            turnstile_token="tok_abc123",
            honeypot="",
            elapsed_ms=3000,
        )
        assert data.name == "Jane Doe"
        assert data.email == "jane@example.com"
        assert data.message == "Hello, this is a test message."
        assert data.turnstile_token == "tok_abc123"
        assert data.honeypot == ""
        assert data.elapsed_ms == 3000

    def test_name_too_long(self):
        with pytest.raises(ValidationError) as exc_info:
            ContactSubmission(
                name="A" * 101,
                email="jane@example.com",
                message="Hello",
                turnstile_token="tok",
                elapsed_ms=1000,
            )
        assert "name" in str(exc_info.value)

    def test_message_too_long(self):
        with pytest.raises(ValidationError) as exc_info:
            ContactSubmission(
                name="Jane",
                email="jane@example.com",
                message="A" * 2001,
                turnstile_token="tok",
                elapsed_ms=1000,
            )
        assert "message" in str(exc_info.value)

    def test_invalid_email(self):
        with pytest.raises(ValidationError) as exc_info:
            ContactSubmission(
                name="Jane",
                email="not-an-email",
                message="Hello",
                turnstile_token="tok",
                elapsed_ms=1000,
            )
        assert "email" in str(exc_info.value)

    def test_empty_name(self):
        with pytest.raises(ValidationError) as exc_info:
            ContactSubmission(
                name="",
                email="jane@example.com",
                message="Hello",
                turnstile_token="tok",
                elapsed_ms=1000,
            )
        assert "name" in str(exc_info.value)

    def test_empty_message(self):
        with pytest.raises(ValidationError) as exc_info:
            ContactSubmission(
                name="Jane",
                email="jane@example.com",
                message="",
                turnstile_token="tok",
                elapsed_ms=1000,
            )
        assert "message" in str(exc_info.value)

    def test_name_only_html_tags_rejected(self):
        with pytest.raises(ValidationError) as exc_info:
            ContactSubmission(
                name="<b></b>",
                email="jane@example.com",
                message="Hello",
                turnstile_token="tok",
                elapsed_ms=1000,
            )
        assert "name" in str(exc_info.value)

    def test_empty_turnstile_token_allowed(self):
        data = ContactSubmission(
            name="Jane",
            email="jane@example.com",
            message="Hello",
            turnstile_token="",
            elapsed_ms=1000,
        )
        assert data.turnstile_token == ""

    def test_turnstile_token_defaults_empty(self):
        data = ContactSubmission(
            name="Jane",
            email="jane@example.com",
            message="Hello",
            elapsed_ms=1000,
        )
        assert data.turnstile_token == ""

    def test_html_stripped_from_name(self):
        data = ContactSubmission(
            name="<b>Jane</b> Doe",
            email="jane@example.com",
            message="Hello",
            turnstile_token="tok",
            elapsed_ms=1000,
        )
        assert data.name == "Jane Doe"

    def test_html_stripped_from_message(self):
        data = ContactSubmission(
            name="Jane",
            email="jane@example.com",
            message="<p>Hello</p> <em>world</em>",
            turnstile_token="tok",
            elapsed_ms=1000,
        )
        assert data.message == "Hello world"

    def test_honeypot_defaults_empty(self):
        data = ContactSubmission(
            name="Jane",
            email="jane@example.com",
            message="Hello",
            turnstile_token="tok",
            elapsed_ms=1000,
        )
        assert data.honeypot == ""

    def test_elapsed_ms_negative_rejected(self):
        with pytest.raises(ValidationError):
            ContactSubmission(
                name="Jane",
                email="jane@example.com",
                message="Hello",
                turnstile_token="tok",
                elapsed_ms=-1,
            )


class TestContactMessageDoc:
    """Tests for ContactMessageDoc model."""

    def test_defaults(self):
        doc = ContactMessageDoc(
            name="Jane",
            email="jane@example.com",
            message="Hello",
            ip_hash="abc123",
        )
        assert doc.user_id is None
        assert doc.read is False
        assert doc.created_at is not None

    def test_all_fields(self):
        doc = ContactMessageDoc(
            name="Jane",
            email="jane@example.com",
            message="Hello",
            ip_hash="abc123",
            user_id="user_1",
            read=True,
        )
        assert doc.user_id == "user_1"
        assert doc.read is True
