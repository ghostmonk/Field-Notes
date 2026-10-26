"""
Platform-independent logging abstraction.

Example usage:
    from glogger import logger  # Pre-configured default logger

    # Or create component-specific loggers
    from glogger import get_component_logger
    auth_logger = get_component_logger('auth')

    logger.info("Application started", version="1.0.0")
"""

from .factory import get_logger
from .setup import auto_configure_logging

# Auto-configure logging and create default logger
_factory = auto_configure_logging()
logger = _factory.create_logger("field-notes")


def get_component_logger(component: str, **default_context):
    """Get a logger for a specific component."""
    return _factory.create_logger(component, **default_context)


def get_request_logger(request_id: str, **context):
    """Get a logger configured for a specific request."""
    return logger.with_context(request_id=request_id, **context)


__all__ = [
    "auto_configure_logging",
    "get_logger",
    "logger",
    "get_component_logger",
    "get_request_logger",
]
