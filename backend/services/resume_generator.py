"""Resume generation using Claude Sonnet."""

import json
from typing import Any, Dict, List, Optional

from services.anthropic_client import get_client, parse_json_response

STRATEGY_PROMPT = """You are a resume optimization expert. Follow these rules:
- Mirror keywords from the job description in bullet points (ATS optimization)
- Lead bullets with action verbs, not passive constructions
- Quantify impact where possible (numbers, percentages, scale)
- Front-load the most relevant experience in each section
- Match the job description's language register (startup vs enterprise)
- Ensure the top 5-7 keywords from the job description appear naturally
- Never fabricate experience, companies, titles, or dates
- Reorder and prioritize content by relevance to the job description
- Same facts, different framing — rewrite bullets to emphasize applicable skills
- Keep the summary to 2-3 sentences, specific to this role
- Do not use inflated language like "spearheaded", "synergized", "leveraged"
- Write in direct, active voice

Return ONLY a valid JSON object matching the exact Resume schema provided. No markdown fences, no commentary."""


def generate_tailored_resume(
    resume: Dict[str, Any],
    analysis: Dict[str, Any],
    chunks: List[Dict[str, Any]],
    evaluator_feedback: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """Generate a tailored resume using Claude Sonnet.

    Args:
        resume: Current resume JSON (structural scaffolding — companies, titles, dates are fixed).
        analysis: Structured job analysis from analyze_job_description().
        chunks: Retrieved content chunks from Qdrant with relevance scores.
        evaluator_feedback: Optional list of issues from a previous evaluation (retry loop).

    Returns:
        Tailored resume as a dict matching the Resume schema.

    Raises:
        ValueError: If LLM response cannot be parsed as JSON.
    """
    client = get_client()

    # Build the user prompt with all context
    chunks_text = "\n".join(f"- [{c.get('score', 0):.2f}] {c['text']}" for c in chunks)

    user_content = f"""Job Description Analysis:
{json.dumps(analysis, indent=2)}

Available Content (ranked by relevance to this job):
{chunks_text}

Current Resume (dates, companies, titles are fixed — do not change these):
{json.dumps(resume, indent=2)}

Return a complete Resume JSON with:
- Tailored summary specific to this role
- Rewritten bullet points emphasizing relevant experience
- Skills reordered by relevance to the job
- Same structure, same companies/titles/dates — different framing"""

    if evaluator_feedback:
        feedback_text = "\n".join(f"- {issue}" for issue in evaluator_feedback)
        user_content += f"""

IMPORTANT — Previous evaluation found these issues. Fix them:
{feedback_text}"""

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        timeout=120.0,
        system=STRATEGY_PROMPT,
        messages=[
            {"role": "user", "content": user_content},
        ],
    )

    if not response.content:
        raise ValueError("Empty response from resume generation model")

    return parse_json_response(response.content[0].text, "generated resume")
