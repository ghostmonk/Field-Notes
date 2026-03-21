"""Shared Anthropic client singleton."""

import os
import threading

import anthropic

_client = None
_client_lock = threading.Lock()


class TailoringError(Exception):
    """Base exception for tailoring pipeline errors."""


class ResumeNotFoundError(TailoringError):
    """Raised when the user has no resume."""


class ServiceNotConfiguredError(TailoringError):
    """Raised when required API keys are missing."""


def get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        with _client_lock:
            if _client is None:
                api_key = os.getenv("ANTHROPIC_API_KEY")
                if not api_key:
                    raise ServiceNotConfiguredError(
                        "ANTHROPIC_API_KEY environment variable is required"
                    )
                _client = anthropic.Anthropic(api_key=api_key)
    return _client
