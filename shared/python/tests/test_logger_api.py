"""Tests for logger API compatibility methods."""

import pytest
from glogger.factory import DefaultLogger
from glogger.interfaces import LogLevel


class MockProvider:
    """Mock provider for testing."""

    def __init__(self):
        self.logged_entries = []

    def log(self, entry):
        self.logged_entries.append(entry)

    def close(self):
        pass


class TestLoggerCompatibilityAPI:
    """Test the *_with_context methods for backward compatibility."""

    def test_info_with_context(self):
        """Test info_with_context method."""
        provider = MockProvider()
        logger = DefaultLogger("test", provider, {})

        logger.info_with_context("Test message", {"key": "value", "request_id": "123"})

        assert len(provider.logged_entries) == 1
        entry = provider.logged_entries[0]
        assert entry.message == "Test message"
        assert entry.level == LogLevel.INFO
        assert entry.context.custom["key"] == "value"
        assert entry.context.custom["request_id"] == "123"

    def test_error_with_context(self):
        """Test error_with_context method."""
        provider = MockProvider()
        logger = DefaultLogger("test", provider, {})

        logger.error_with_context("Error occurred", {"status_code": 500, "path": "/api/test"})

        assert len(provider.logged_entries) == 1
        entry = provider.logged_entries[0]
        assert entry.message == "Error occurred"
        assert entry.level == LogLevel.ERROR
        assert entry.context.custom["status_code"] == 500
        assert entry.context.custom["path"] == "/api/test"

    def test_exception_with_context(self):
        """Test exception_with_context method."""
        provider = MockProvider()
        logger = DefaultLogger("test", provider, {})

        test_exception = ValueError("Test error")
        logger.exception_with_context(
            "Exception occurred", {"error_type": "ValueError", "request_id": "456"}
        )

        assert len(provider.logged_entries) == 1
        entry = provider.logged_entries[0]
        assert entry.message == "Exception occurred"
        assert entry.level == LogLevel.ERROR
        assert entry.context.custom["error_type"] == "ValueError"
        assert entry.context.custom["request_id"] == "456"

    def test_info_with_context_empty_dict(self):
        """Test info_with_context with empty context dict."""
        provider = MockProvider()
        logger = DefaultLogger("test", provider, {})

        logger.info_with_context("Message", {})

        assert len(provider.logged_entries) == 1
        assert provider.logged_entries[0].message == "Message"

    def test_error_with_context_merges_default_context(self):
        """Test that *_with_context methods merge with default context."""
        provider = MockProvider()
        logger = DefaultLogger("test", provider, {"default_key": "default_value"})

        logger.error_with_context("Error", {"error_key": "error_value"})

        entry = provider.logged_entries[0]
        assert entry.context.custom["default_key"] == "default_value"
        assert entry.context.custom["error_key"] == "error_value"
