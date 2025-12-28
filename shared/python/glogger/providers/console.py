"""
Console logging provider for development and simple deployments.

This provider outputs structured logs to stdout/stderr using standard
console formatting, making it suitable for development environments
and platforms that capture stdout/stderr logs.
"""

import json
import sys
from typing import Any, Dict

from ..interfaces import LogEntry, LogLevel, LogProvider


class ConsoleLogProvider(LogProvider):
    """
    Console-based logging provider.

    Outputs logs to stdout/stderr with optional JSON formatting.
    This is ideal for development environments and platforms that
    capture and process stdout logs (like Heroku, Railway, etc.).
    """

    def __init__(self, json_format: bool = False, include_source: bool = True):
        """
        Initialize console provider.

        Args:
            json_format: If True, output logs as JSON lines
            include_source: If True, include source file/line information
        """
        self.json_format = json_format
        self.include_source = include_source
        self.initialized = False

    def initialize(self, config: Dict[str, Any]) -> bool:
        """Initialize the console provider."""
        # Override defaults with config
        self.json_format = config.get("json_format", self.json_format)
        self.include_source = config.get("include_source", self.include_source)

        self.initialized = True
        return True

    def log(self, entry: LogEntry) -> bool:
        """Log an entry to console."""
        if not self.initialized:
            return False

        try:
            if self.json_format:
                self._log_json(entry)
            else:
                self._log_formatted(entry)
            return True
        except Exception as e:
            # Fallback to basic print to avoid logging loops
            print(f"Console logging error: {e}", file=sys.stderr)
            return False

    def _log_json(self, entry: LogEntry) -> None:
        """Output log entry as JSON."""
        log_dict = {
            "timestamp": entry.timestamp.isoformat(),
            "level": entry.level.value,
            "message": entry.message,
            "component": entry.context.component,
        }

        # Add context
        context_dict = entry.context.to_dict()
        if context_dict:
            log_dict["context"] = context_dict

        # Add source location if enabled
        if self.include_source and entry.source_file:
            log_dict["source"] = {
                "file": entry.source_file,
                "line": entry.source_line,
                "function": entry.source_function,
            }

        # Add exception info
        if entry.exception:
            log_dict["error"] = {
                "type": type(entry.exception).__name__,
                "message": str(entry.exception),
            }
            if entry.stack_trace:
                log_dict["error"]["stack_trace"] = entry.stack_trace

        # Add HTTP request info
        if entry.http_method:
            log_dict["http"] = {
                "method": entry.http_method,
                "url": entry.http_url,
                "status": entry.http_status,
                "latency_ms": entry.http_latency_ms,
                "response_size": entry.http_response_size,
                "user_agent": entry.http_user_agent,
                "referer": entry.http_referer,
            }
            # Remove None values
            log_dict["http"] = {k: v for k, v in log_dict["http"].items() if v is not None}

        # Use stderr for errors, stdout for everything else
        output = sys.stderr if entry.level in [LogLevel.ERROR, LogLevel.CRITICAL] else sys.stdout
        print(json.dumps(log_dict), file=output)

    def _log_formatted(self, entry: LogEntry) -> None:
        """Output log entry with human-readable formatting."""
        timestamp = entry.timestamp.strftime("%Y-%m-%d %H:%M:%S")
        level = entry.level.value
        component = entry.context.component

        # Base message
        message = f"[{timestamp}] [{level}] [{component}] {entry.message}"

        # Add context if present
        context_dict = entry.context.to_dict()
        if context_dict:
            context_items = []
            for key, value in context_dict.items():
                if key not in ["component"]:  # Skip already displayed fields
                    context_items.append(f"{key}={value}")
            if context_items:
                message += f" | {', '.join(context_items)}"

        # Add source if enabled
        if self.include_source and entry.source_file:
            source = f"{entry.source_file}:{entry.source_line}:{entry.source_function}"
            message += f" | {source}"

        # Use stderr for errors, stdout for everything else
        output = sys.stderr if entry.level in [LogLevel.ERROR, LogLevel.CRITICAL] else sys.stdout
        print(message, file=output)

        # Print exception details on separate lines
        if entry.exception:
            print(f"  Error: {type(entry.exception).__name__}: {entry.exception}", file=output)
            if entry.stack_trace:
                # Print stack trace with indentation
                for line in entry.stack_trace.strip().split("\n"):
                    print(f"  {line}", file=output)

    def flush(self) -> None:
        """Flush console output."""
        sys.stdout.flush()
        sys.stderr.flush()

    def close(self) -> None:
        """Close console provider (no-op)."""
        pass

    @property
    def name(self) -> str:
        """Return provider name."""
        return "console"

    @property
    def supports_structured_logging(self) -> bool:
        """Console supports structured logging via JSON format."""
        return self.json_format
