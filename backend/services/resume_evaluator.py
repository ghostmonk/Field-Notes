"""Resume evaluation using Claude Haiku."""

import json
import os
import threading
from typing import Any, Dict

import anthropic

_client = None
_client_lock = threading.Lock()

EVALUATION_SYSTEM_PROMPT = """You are a resume evaluation expert. Score a tailored resume against the original job requirements.

Return ONLY a JSON object with these exact keys:
- keyword_coverage: float 0-1 — what fraction of required_skills appear in the resume
- relevance_ranking: float 0-1 — are the most relevant experiences listed first
- ats_compatibility: float 0-1 — will a standard ATS parser extract this correctly
- overall: float 0-1 — weighted average (keyword_coverage 0.4, relevance_ranking 0.3, ats_compatibility 0.3)
- issues: list of strings — specific, actionable problems to fix (empty if overall >= 0.80)

Be strict. A generic summary that doesn't mention the specific role or domain scores low on relevance.
A resume missing 2+ required skills scores below 0.80 on keyword_coverage.

No markdown fences, no commentary outside the JSON."""


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


def evaluate_resume(
    tailored_resume: Dict[str, Any],
    analysis: Dict[str, Any],
) -> Dict[str, Any]:
    """Evaluate a tailored resume against job requirements.

    Args:
        tailored_resume: The generated resume JSON.
        analysis: Structured job analysis from analyze_job_description().

    Returns:
        Dict with keyword_coverage, relevance_ranking, ats_compatibility,
        overall, and issues.

    Raises:
        ValueError: If LLM response cannot be parsed as JSON.
    """
    client = _get_client()

    user_content = f"""Job Requirements:
{json.dumps(analysis, indent=2)}

Tailored Resume:
{json.dumps(tailored_resume, indent=2)}

Evaluate this resume against the job requirements."""

    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1024,
        timeout=60.0,
        system=EVALUATION_SYSTEM_PROMPT,
        messages=[
            {"role": "user", "content": user_content},
        ],
    )

    raw_text = response.content[0].text.strip()

    if raw_text.startswith("```"):
        lines = raw_text.split("\n")
        raw_text = "\n".join(lines[1:-1])

    try:
        return json.loads(raw_text)
    except json.JSONDecodeError as e:
        raise ValueError(f"Failed to parse evaluation response: {e}\nRaw: {raw_text}")
