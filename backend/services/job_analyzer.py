"""Job description analysis using Claude Haiku."""

import json
import os
import threading
from typing import Any, Dict

import anthropic

_client = None
_client_lock = threading.Lock()

ANALYSIS_SYSTEM_PROMPT = """You are a job description analyst. Extract structured information from the job description.

Return ONLY a JSON object with these exact keys:
- required_skills: list of strings — hard requirements explicitly stated
- preferred_skills: list of strings — nice-to-haves or "bonus" items
- seniority: string — one of "junior", "mid", "senior", "staff", "principal", "director"
- domain: string — short label like "backend", "frontend", "fullstack", "data", "ml", "devops", "ai_backend"
- culture_signals: string — comma-separated culture indicators (e.g. "startup, remote, fast-paced")
- key_requirements: list of strings — the 3-7 most important qualifications, rephrased as what the ideal candidate has done

Do not include any text outside the JSON object. No markdown fences."""


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        with _client_lock:
            if _client is None:
                api_key = os.getenv("ANTHROPIC_API_KEY")
                if not api_key:
                    raise ValueError("ANTHROPIC_API_KEY environment variable is required")
                _client = anthropic.Anthropic(api_key=api_key)
    return _client


def analyze_job_description(job_description: str) -> Dict[str, Any]:
    """Analyze a job description and extract structured requirements.

    Args:
        job_description: Raw job description text.

    Returns:
        Dict with required_skills, preferred_skills, seniority, domain,
        culture_signals, and key_requirements.

    Raises:
        ValueError: If LLM response cannot be parsed as JSON.
    """
    client = _get_client()

    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1024,
        system=ANALYSIS_SYSTEM_PROMPT,
        messages=[
            {"role": "user", "content": job_description},
        ],
    )

    raw_text = response.content[0].text.strip()

    # Strip markdown fences if present
    if raw_text.startswith("```"):
        lines = raw_text.split("\n")
        raw_text = "\n".join(lines[1:-1])

    try:
        return json.loads(raw_text)
    except json.JSONDecodeError as e:
        raise ValueError(f"Failed to parse job analysis response: {e}\nRaw: {raw_text}")
