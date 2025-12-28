"""Test that README examples are valid."""

import pytest
from glogger import get_component_logger, logger


def test_readme_basic_usage():
    """Test basic usage examples from README."""
    # Standard API
    logger.info("User logged in", user_id="12345", ip_address="192.168.1.1")
    logger.error("Database connection failed", error_code="DB_001", retry_count=3)

    # Compatibility API
    logger.info_with_context("Request started", {"method": "GET", "path": "/api/users"})
    logger.error_with_context("Request failed", {"status_code": 500, "error": "Internal error"})


def test_readme_context_logger():
    """Test context logger examples from README."""
    request_logger = logger.with_context(request_id="abc-123", user_id="user-456")
    request_logger.info("Processing request")
    request_logger.error("Request failed")


def test_readme_component_logger():
    """Test component logger examples from README."""
    auth_logger = get_component_logger("auth-service")
    auth_logger.info("User authentication started")
    auth_logger.error("Authentication failed")
