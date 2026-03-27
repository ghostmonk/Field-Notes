"""Tests for Gmail SMTP email service."""

import smtplib
from unittest.mock import MagicMock, patch

from services.email_service import send_contact_notification


class TestSendContactNotification:
    """Tests for send_contact_notification."""

    @patch("services.email_service.smtplib.SMTP_SSL")
    @patch.dict(
        "os.environ",
        {
            "SMTP_USER": "test@gmail.com",
            "SMTP_APP_PASSWORD": "app-password-123",
            "CONTACT_NOTIFY_EMAIL": "notify@example.com",
        },
    )
    def test_sends_email_with_correct_content(self, mock_smtp_cls):
        mock_server = MagicMock()
        mock_smtp_cls.return_value.__enter__ = MagicMock(return_value=mock_server)
        mock_smtp_cls.return_value.__exit__ = MagicMock(return_value=False)

        send_contact_notification(
            name="Alice Smith",
            email="alice@example.com",
            message="Hello, I have a question.",
        )

        mock_smtp_cls.assert_called_once_with("smtp.gmail.com", 465)
        mock_server.login.assert_called_once_with("test@gmail.com", "app-password-123")
        mock_server.sendmail.assert_called_once()

        call_args = mock_server.sendmail.call_args
        from_addr = call_args[0][0]
        to_addr = call_args[0][1]
        msg_str = call_args[0][2]

        assert from_addr == "test@gmail.com"
        assert to_addr == "notify@example.com"
        assert "Alice Smith" in msg_str
        assert "alice@example.com" in msg_str
        assert "Hello, I have a question." in msg_str
        assert "Subject: Contact form: Alice Smith" in msg_str

    @patch("services.email_service.smtplib.SMTP_SSL")
    @patch.dict("os.environ", {}, clear=True)
    def test_skips_silently_when_smtp_not_configured(self, mock_smtp_cls):
        send_contact_notification(
            name="Bob",
            email="bob@example.com",
            message="Test message",
        )

        mock_smtp_cls.assert_not_called()

    @patch("services.email_service.smtplib.SMTP_SSL")
    @patch.dict(
        "os.environ",
        {
            "SMTP_USER": "test@gmail.com",
            "SMTP_APP_PASSWORD": "bad-password",
            "CONTACT_NOTIFY_EMAIL": "notify@example.com",
        },
    )
    def test_does_not_raise_on_smtp_auth_error(self, mock_smtp_cls):
        mock_server = MagicMock()
        mock_server.login.side_effect = smtplib.SMTPAuthenticationError(
            535, b"Authentication failed"
        )
        mock_smtp_cls.return_value.__enter__ = MagicMock(return_value=mock_server)
        mock_smtp_cls.return_value.__exit__ = MagicMock(return_value=False)

        # Must not raise
        send_contact_notification(
            name="Charlie",
            email="charlie@example.com",
            message="This should not raise.",
        )
