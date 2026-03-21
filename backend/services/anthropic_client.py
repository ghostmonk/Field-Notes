"""Shared Anthropic client singleton and utilities."""

import json
import os
import re
import threading
from typing import Any, Dict

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


def parse_json_response(raw_text: str, context: str) -> Dict[str, Any]:
    """Parse a JSON response from an LLM, stripping markdown fences if present.

    Args:
        raw_text: Raw text from the LLM response.
        context: Description of what was being parsed (for error messages).

    Returns:
        Parsed JSON as a dict.

    Raises:
        ValueError: If the response cannot be parsed as JSON.
    """
    text = raw_text.strip()
    text = re.sub(r"^```(?:json)?\s*\n", "", text)
    text = re.sub(r"\n```\s*$", "", text)
    text = text.strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        raise ValueError(f"Failed to parse {context}: {e}\nRaw: {text[:500]}")
