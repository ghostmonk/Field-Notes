"""Shared Anthropic client singleton and utilities."""

import asyncio
import json
import os
import re
import threading
from typing import Any, Coroutine, Dict, Set

import anthropic

# Chunk type constants
CHUNK_TYPE_VOICE_EXAMPLE = "voice_example"
CHUNK_TYPE_ANTI_PATTERN = "anti_pattern"

# Source constants
SOURCE_RESUME = "resume"
SOURCE_VOICE_FEEDBACK = "voice_feedback"

# Fields to strip from MongoDB resume documents before passing to LLM
RESUME_INTERNAL_FIELDS = (
    "_id",
    "user_id",
    "createdDate",
    "updatedDate",
    "deleted",
    "original_resume",
)

# Background task management
_background_tasks: Set[asyncio.Task] = set()


def schedule_background(coro: Coroutine) -> None:
    """Schedule a coroutine as a background task with retained reference."""
    task = asyncio.create_task(coro)
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)


def vector_services_configured() -> bool:
    """Check if Voyage AI and Qdrant environment variables are set."""
    return bool(os.getenv("VOYAGE_API_KEY") and os.getenv("QDRANT_URL"))


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
                if not api_key or not api_key.strip():
                    raise ServiceNotConfiguredError("ANTHROPIC_API_KEY must be set and non-empty")
                _client = anthropic.Anthropic(api_key=api_key.strip())
    return _client


def extract_usage(response, model: str) -> Dict[str, Any]:
    """Extract token usage from an Anthropic API response."""
    return {
        "input_tokens": response.usage.input_tokens,
        "output_tokens": response.usage.output_tokens,
        "model": model,
    }


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
