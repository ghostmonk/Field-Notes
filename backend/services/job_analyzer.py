"""Job description analysis using Claude Haiku."""

from typing import Any, Dict, Tuple

from services.anthropic_client import extract_usage, get_client, parse_json_response

ANALYSIS_SYSTEM_PROMPT = """You are a job description analyst. Extract structured information from the job description.

Return ONLY a JSON object with these exact keys:
- required_skills: list of strings — hard requirements explicitly stated
- preferred_skills: list of strings — nice-to-haves or "bonus" items
- seniority: string — one of "junior", "mid", "senior", "staff", "principal", "director"
- domain: string — short label like "backend", "frontend", "fullstack", "data", "ml", "devops", "ai_backend"
- culture_signals: string — comma-separated culture indicators (e.g. "startup, remote, fast-paced")
- key_requirements: list of strings — the 3-7 most important qualifications, rephrased as what the ideal candidate has done

Do not include any text outside the JSON object. No markdown fences."""


def analyze_job_description(job_description: str) -> Tuple[Dict[str, Any], Dict[str, int]]:
    """Analyze a job description and extract structured requirements.

    Returns:
        Tuple of (analysis dict, usage dict with input_tokens and output_tokens).
    """
    client = get_client()

    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1024,
        timeout=60.0,
        system=ANALYSIS_SYSTEM_PROMPT,
        messages=[
            {"role": "user", "content": job_description},
        ],
    )

    if not response.content:
        raise ValueError("Empty response from job analysis model")

    return (
        parse_json_response(response.content[0].text, "job analysis response"),
        extract_usage(response, "claude-haiku-4-5-20251001"),
    )
