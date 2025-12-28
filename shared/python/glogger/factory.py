"""
Logger factory implementation that manages provider selection and logger creation.
"""

import os
import sys
import traceback
from datetime import datetime, timezone
from typing import Any, Dict

from .interfaces import (
    LogContext,
    LogEntry,
    Logger,
    LoggerFactory,
    LogLevel,
    LogProvider,
)


class DefaultLogger(Logger):
    """
    Default logger implementation that works with any LogProvider.

    This logger provides the application-facing API and delegates actual
    logging to the configured provider.
    """

    def __init__(self, component: str, provider: LogProvider, default_context: Dict[str, Any]):
        self.component = component
        self.provider = provider
        self.default_context = default_context

    def with_context(self, **context_fields) -> Logger:
        """Create a new logger with additional context."""
        merged_context = {**self.default_context, **context_fields}
        return DefaultLogger(self.component, self.provider, merged_context)

    def _create_log_entry(
        self, level: LogLevel, message: str, exception: Exception | None = None, **context
    ) -> LogEntry:
        """Create a log entry with source location and context."""
        # Get caller information
        frame = sys._getframe(2)  # Skip this method and the calling log method

        # Merge all context
        merged_context = {**self.default_context, **context}

        log_context = LogContext(
            component=self.component,
            environment=os.getenv("NODE_ENV") or os.getenv("ENVIRONMENT", "development"),
            service_name=os.getenv("K_SERVICE") or os.getenv("SERVICE_NAME"),
            service_version=os.getenv("K_REVISION") or os.getenv("SERVICE_VERSION"),
            custom=merged_context,
        )

        entry = LogEntry(
            level=level,
            message=message,
            timestamp=datetime.now(timezone.utc),
            context=log_context,
            exception=exception,
            stack_trace=traceback.format_exc() if exception else None,
            source_file=frame.f_code.co_filename,
            source_line=frame.f_lineno,
            source_function=frame.f_code.co_name,
        )

        return entry

    def debug(self, message: str, **context) -> None:
        """Log a debug message."""
        entry = self._create_log_entry(LogLevel.DEBUG, message, **context)
        self.provider.log(entry)

    def info(self, message: str, **context) -> None:
        """Log an info message."""
        entry = self._create_log_entry(LogLevel.INFO, message, **context)
        self.provider.log(entry)

    def warning(self, message: str, **context) -> None:
        """Log a warning message."""
        entry = self._create_log_entry(LogLevel.WARNING, message, **context)
        self.provider.log(entry)

    def error(self, message: str, exception: Exception | None = None, **context) -> None:
        """Log an error message."""
        entry = self._create_log_entry(LogLevel.ERROR, message, exception, **context)
        self.provider.log(entry)

    def critical(self, message: str, exception: Exception | None = None, **context) -> None:
        """Log a critical message."""
        entry = self._create_log_entry(LogLevel.CRITICAL, message, exception, **context)
        self.provider.log(entry)

    def info_with_context(self, message: str, context: Dict[str, Any]) -> None:
        """Log an info message with context dict (compatibility method)."""
        self.info(message, **context)

    def error_with_context(self, message: str, context: Dict[str, Any]) -> None:
        """Log an error message with context dict (compatibility method)."""
        self.error(message, **context)

    def exception_with_context(self, message: str, context: Dict[str, Any]) -> None:
        """Log an exception with context dict (compatibility method)."""
        self.error(message, **context)

    def warning_with_context(self, message: str, context: Dict[str, Any]) -> None:
        """Log a warning message with context dict (compatibility method)."""
        self.warning(message, **context)

    def log_request_response(self, request: Any, error: Exception | None = None, **context) -> None:
        """Log request/response information (compatibility method)."""
        method = getattr(request, "method", "UNKNOWN")
        url = str(getattr(request, "url", "unknown"))
        if error:
            self.error(f"Request failed: {method} {url}", exception=error, **context)
        else:
            self.info(f"Request: {method} {url}", **context)

    def log_request(
        self,
        method: str,
        url: str,
        status: int | None = None,
        latency_ms: float | None = None,
        response_size: int | None = None,
        user_agent: str | None = None,
        referer: str | None = None,
        **context,
    ) -> None:
        """Log HTTP request information."""
        level = (
            LogLevel.ERROR
            if status and status >= 500
            else LogLevel.WARNING if status and status >= 400 else LogLevel.INFO
        )

        message = f"{method} {url}"
        if status:
            message += f" -> {status}"

        entry = self._create_log_entry(level, message, **context)
        entry.http_method = method
        entry.http_url = url
        entry.http_status = status
        entry.http_latency_ms = latency_ms
        entry.http_response_size = response_size
        entry.http_user_agent = user_agent
        entry.http_referer = referer

        self.provider.log(entry)


class DefaultLoggerFactory(LoggerFactory):
    """
    Default logger factory implementation.

    Manages provider selection and creates logger instances.
    """

    def __init__(self, provider: LogProvider):
        self.provider = provider

    def create_logger(self, component: str, **default_context) -> Logger:
        """Create a logger for a specific component."""
        return DefaultLogger(component, self.provider, default_context)

    def set_provider(self, provider: LogProvider) -> None:
        """Set the logging provider."""
        if self.provider:
            self.provider.close()
        self.provider = provider

    def get_provider(self) -> LogProvider:
        """Get the current provider."""
        return self.provider


# Global factory instance
_logger_factory: LoggerFactory | None = None


def create_logger_factory(provider: LogProvider) -> LoggerFactory:
    """
    Create a logger factory with the specified provider.

    This is typically called once during application startup.
    """
    global _logger_factory
    factory = DefaultLoggerFactory(provider)
    _logger_factory = factory
    return factory


def get_logger(component: str, **default_context) -> Logger:
    """
    Get a logger for the specified component.

    This is the main entry point for application code to get loggers.
    """
    if _logger_factory is None:
        raise RuntimeError("Logger factory not initialized. Call create_logger_factory() first.")

    return _logger_factory.create_logger(component, **default_context)


def set_provider(provider: LogProvider) -> None:
    """Set the global logging provider."""
    if _logger_factory is None:
        raise RuntimeError("Logger factory not initialized. Call create_logger_factory() first.")

    _logger_factory.set_provider(provider)
