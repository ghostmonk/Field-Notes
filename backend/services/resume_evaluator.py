"""Resume evaluation using Claude Haiku."""

import json
from typing import Any, Dict, Tuple

from services.anthropic_client import get_client, parse_json_response

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


def evaluate_resume(
    tailored_resume: Dict[str, Any],
    analysis: Dict[str, Any],
) -> Tuple[Dict[str, Any], Dict[str, int]]:
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
    client = get_client()

    user_content = f"""Job Requirements:
{json.dumps(analysis, indent=2)}

Tailored Resume:
{json.dumps(tailored_resume, indent=2)}

Evaluate this resume against the job requirements."""

    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=2048,
        timeout=60.0,
        system=EVALUATION_SYSTEM_PROMPT,
        messages=[
            {"role": "user", "content": user_content},
        ],
    )

    if not response.content:
        raise ValueError("Empty response from evaluation model")

    usage = {
        "input_tokens": response.usage.input_tokens,
        "output_tokens": response.usage.output_tokens,
        "model": "claude-haiku-4-5-20251001",
    }

    return parse_json_response(response.content[0].text, "evaluation response"), usage
