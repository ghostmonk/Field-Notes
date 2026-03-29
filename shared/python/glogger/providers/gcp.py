"""
Google Cloud Platform logging provider.

This provider integrates with GCP Cloud Logging and handles GCP-specific
log formatting, trace context, and service metadata.
"""

import logging
import os
import sys
from typing import Any, Dict

from ..interfaces import LogEntry, LogLevel, LogProvider

try:
    from google.cloud import logging as cloud_logging

    GCP_AVAILABLE = True
except ImportError:
    GCP_AVAILABLE = False
    cloud_logging = None


class GCPLogProvider(LogProvider):
    """
    Google Cloud Platform logging provider.

    Integrates with GCP Cloud Logging and formats logs according to
    GCP conventions. Falls back to console logging if GCP is not available.
    """

    def __init__(self, project_id: str | None = None, fallback_to_console: bool = True):
        """
        Initialize GCP logging provider.

        Args:
            project_id: GCP project ID (defaults to environment variable)
            fallback_to_console: If True, fall back to console logging when GCP unavailable
        """
        self.project_id = project_id or os.getenv("GOOGLE_CLOUD_PROJECT")
        self.fallback_to_console = fallback_to_console
        self.client: cloud_logging.Client | None = None
        self.handler: cloud_logging.handlers.CloudLoggingHandler | None = None
        self.is_cloud_run = bool(os.getenv("K_SERVICE"))
        self.initialized = False
        self.using_fallback = False

    def initialize(self, config: Dict[str, Any]) -> bool:
        """Initialize the GCP logging provider."""
        if not GCP_AVAILABLE:
            if self.fallback_to_console:
                print("GCP Cloud Logging not available, falling back to console", file=sys.stderr)
                self.using_fallback = True
                self.initialized = True
                return True
            else:
                print("GCP Cloud Logging not available and fallback disabled", file=sys.stderr)
                return False

        try:
            # Override defaults with config
            self.project_id = config.get("project_id", self.project_id)
            self.fallback_to_console = config.get("fallback_to_console", self.fallback_to_console)

            # Only set up Cloud Logging if running in Cloud Run or explicitly configured
            if self.is_cloud_run or config.get("force_cloud_logging", False):
                self.client = cloud_logging.Client(project=self.project_id)

                # Create handler with service metadata
                service_name = os.getenv("K_SERVICE", "unknown-service")
                labels = {
                    "service": service_name,
                    "revision": os.getenv("K_REVISION", "unknown"),
                    "configuration": os.getenv("K_CONFIGURATION", "unknown"),
                }

                self.handler = cloud_logging.handlers.CloudLoggingHandler(
                    self.client, name=service_name, labels=labels
                )

                print(
                    f"GCP Cloud Logging initialized for project: {self.project_id}", file=sys.stderr
                )
            else:
                if self.fallback_to_console:
                    print("Not in Cloud Run environment, falling back to console", file=sys.stderr)
                    self.using_fallback = True
                else:
                    return False

            self.initialized = True
            return True

        except Exception as e:
            print(f"Failed to initialize GCP Cloud Logging: {e}", file=sys.stderr)
            if self.fallback_to_console:
                print("Falling back to console logging", file=sys.stderr)
                self.using_fallback = True
                self.initialized = True
                return True
            return False

    def log(self, entry: LogEntry) -> bool:
        """Log an entry using GCP Cloud Logging or console fallback."""
        if not self.initialized:
            return False

        try:
            if self.using_fallback or not self.handler:
                self._log_console_fallback(entry)
            else:
                self._log_cloud_logging(entry)
            return True
        except Exception as e:
            print(f"GCP logging error: {e}", file=sys.stderr)
            # Always try console fallback on error
            try:
                self._log_console_fallback(entry)
                return True
            except Exception:
                return False

    def _log_cloud_logging(self, entry: LogEntry) -> None:
        """Log using GCP Cloud Logging."""
        # Create GCP-specific structured log
        log_dict = {
            "severity": entry.level.value,
            "message": entry.message,
            "timestamp": entry.timestamp.isoformat(),
            "labels": self._build_labels(entry.context),
        }

        # Add source location for GCP
        if entry.source_file:
            log_dict["logging.googleapis.com/sourceLocation"] = {
                "file": entry.source_file,
                "line": str(entry.source_line) if entry.source_line else "unknown",
                "function": entry.source_function or "unknown",
            }

        # Add trace context if available (for request correlation)
        trace_header = os.getenv("HTTP_X_CLOUD_TRACE_CONTEXT")
        if trace_header:
            log_dict["logging.googleapis.com/trace"] = trace_header

        # Add context data
        context_dict = entry.context.to_dict()
        if context_dict:
            log_dict["context"] = context_dict

        # Add exception information
        if entry.exception:
            log_dict["exception"] = {
                "type": type(entry.exception).__name__,
                "message": str(entry.exception),
            }
            if entry.stack_trace:
                log_dict["exception"]["stack_trace"] = entry.stack_trace

        # Add HTTP request information
        if entry.http_method:
            log_dict["httpRequest"] = {
                "requestMethod": entry.http_method,
                "requestUrl": entry.http_url,
                "status": entry.http_status,
                "latency": f"{entry.http_latency_ms}ms" if entry.http_latency_ms else None,
                "responseSize": entry.http_response_size,
                "userAgent": entry.http_user_agent,
                "referer": entry.http_referer,
            }
            # Remove None values
            log_dict["httpRequest"] = {
                k: v for k, v in log_dict["httpRequest"].items() if v is not None
            }

        log_level = self._convert_log_level(entry.level)
        logger_name = entry.context.component if entry.context else "app"
        self.handler.emit(
            logging.LogRecord(
                name=logger_name,
                level=log_level,
                pathname="",
                lineno=0,
                msg=log_dict,
                args=(),
                exc_info=None,
            )
        )

    def _log_console_fallback(self, entry: LogEntry) -> None:
        """Log to console when Cloud Logging is not available."""
        timestamp = entry.timestamp.strftime("%Y-%m-%d %H:%M:%S")
        level = entry.level.value
        component = getattr(entry.context, "component", "unknown")

        message = f"[{timestamp}] [{level}] [{component}] {entry.message}"

        # Add context
        context_dict = entry.context.to_dict()
        if context_dict:
            context_items = [f"{k}={v}" for k, v in context_dict.items() if k != "component"]
            if context_items:
                message += f" | {', '.join(context_items)}"

        # Use stderr for errors, stdout for others
        output = sys.stderr if entry.level in [LogLevel.ERROR, LogLevel.CRITICAL] else sys.stdout
        print(message, file=output)

        if entry.exception and entry.stack_trace:
            print(f"  {entry.stack_trace}", file=output)

    def _build_labels(self, context) -> Dict[str, str]:
        """Build GCP-specific labels from context."""
        labels = {
            "component": context.component,
        }

        if context.environment:
            labels["environment"] = context.environment
        if context.service_name:
            labels["service"] = context.service_name
        if context.service_version:
            labels["version"] = context.service_version

        return labels

    def _convert_log_level(self, level: LogLevel) -> int:
        """Convert our LogLevel to Python logging level."""

        mapping = {
            LogLevel.DEBUG: logging.DEBUG,
            LogLevel.INFO: logging.INFO,
            LogLevel.WARNING: logging.WARNING,
            LogLevel.ERROR: logging.ERROR,
            LogLevel.CRITICAL: logging.CRITICAL,
        }
        return mapping.get(level, logging.INFO)

    def flush(self) -> None:
        """Flush pending logs."""
        if self.handler:
            self.handler.flush()
        else:
            sys.stdout.flush()
            sys.stderr.flush()

    def close(self) -> None:
        """Close GCP logging resources."""
        if self.handler:
            self.handler.close()
        if self.client:
            # Cloud Logging client doesn't need explicit closing
            pass

    @property
    def name(self) -> str:
        """Return provider name."""
        return "gcp" if not self.using_fallback else "gcp-console-fallback"

    @property
    def supports_structured_logging(self) -> bool:
        """GCP supports structured logging."""
        return not self.using_fallback
