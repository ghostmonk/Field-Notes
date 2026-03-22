"""Orchestrates the full resume tailoring pipeline."""

import asyncio
from typing import Any, Dict, List

from motor.motor_asyncio import AsyncIOMotorCollection
from services.anthropic_client import (
    RESUME_INTERNAL_FIELDS,
    SOURCE_RESUME,
    SOURCE_VOICE_FEEDBACK,
    ResumeNotFoundError,
)
from services.embedding import embed_query
from services.job_analyzer import analyze_job_description
from services.resume_evaluator import evaluate_resume
from services.resume_generator import generate_tailored_resume
from services.vector_store import search

SCORE_THRESHOLD = 0.80
MAX_RETRIES = 2

# Pricing per million tokens (as of 2026-03)
MODEL_PRICING = {
    "claude-haiku-4-5-20251001": {"input": 0.80, "output": 4.00},
    "claude-sonnet-4-6": {"input": 3.00, "output": 15.00},
}


def _calculate_cost(usage_entries: List[Dict]) -> Dict[str, Any]:
    """Calculate total cost from a list of usage dicts."""
    total_input = 0
    total_output = 0
    total_cost = 0.0

    for entry in usage_entries:
        model = entry.get("model", "")
        pricing = MODEL_PRICING.get(model, {"input": 0, "output": 0})
        input_tokens = entry.get("input_tokens", 0)
        output_tokens = entry.get("output_tokens", 0)
        total_input += input_tokens
        total_output += output_tokens
        total_cost += (
            input_tokens * pricing["input"] + output_tokens * pricing["output"]
        ) / 1_000_000

    return {
        "total_input_tokens": total_input,
        "total_output_tokens": total_output,
        "total_cost_usd": round(total_cost, 4),
        "calls": usage_entries,
    }


async def run_tailoring_pipeline(
    job_description: str,
    user_id: str,
    resumes_collection: AsyncIOMotorCollection,
) -> Dict[str, Any]:
    """Run the full tailoring pipeline: Analyze -> Retrieve -> Generate -> Evaluate.

    Returns:
        Dict with keys: analysis, tailored_resume, evaluation, attempts, usage.
    """
    resume_doc = await resumes_collection.find_one({"user_id": user_id, "deleted": {"$ne": True}})
    if not resume_doc:
        raise ResumeNotFoundError("No resume found for this user")

    resume = {k: v for k, v in resume_doc.items() if k not in RESUME_INTERNAL_FIELDS}

    usage_entries: List[Dict] = []

    (analysis, analysis_usage), query_embedding = await asyncio.gather(
        asyncio.to_thread(analyze_job_description, job_description),
        asyncio.to_thread(embed_query, job_description),
    )
    usage_entries.append(analysis_usage)

    raw_results, voice_results = await asyncio.gather(
        asyncio.to_thread(
            search,
            query_vector=query_embedding,
            limit=25,
            source_filter=SOURCE_RESUME,
            user_id_filter=user_id,
        ),
        asyncio.to_thread(
            search,
            query_vector=query_embedding,
            limit=10,
            source_filter=SOURCE_VOICE_FEEDBACK,
            user_id_filter=user_id,
        ),
    )

    chunks = [
        {"text": (r.get("payload") or {}).get("text", ""), "score": r["score"]} for r in raw_results
    ]

    voice_examples = [
        {
            "text": (r.get("payload") or {}).get("text", ""),
            "chunk_type": (r.get("payload") or {}).get("chunk_type", ""),
            "score": r["score"],
        }
        for r in voice_results
    ]

    evaluator_feedback = None
    best_result = None
    best_score = -1.0
    total_attempts = 0

    for attempt in range(1 + MAX_RETRIES):
        total_attempts = attempt + 1

        try:
            tailored, gen_usage = await asyncio.to_thread(
                generate_tailored_resume,
                resume=resume,
                analysis=analysis,
                chunks=chunks,
                evaluator_feedback=evaluator_feedback,
                voice_examples=voice_examples if voice_examples else None,
            )
            usage_entries.append(gen_usage)

            evaluation, eval_usage = await asyncio.to_thread(
                evaluate_resume,
                tailored_resume=tailored,
                analysis=analysis,
            )
            usage_entries.append(eval_usage)
        except Exception:
            if best_result is not None:
                break
            raise

        try:
            score = float(evaluation.get("overall", 0))
        except (TypeError, ValueError):
            score = 0.0

        if score > best_score:
            best_score = score
            best_result = {
                "analysis": analysis,
                "tailored_resume": tailored,
                "evaluation": evaluation,
            }

        if score >= SCORE_THRESHOLD:
            break

        evaluator_feedback = evaluation.get("issues", [])
        if not evaluator_feedback:
            evaluator_feedback = [
                f"Overall score {score:.2f} is below {SCORE_THRESHOLD}. "
                "Improve keyword coverage and relevance ranking."
            ]

    best_result["attempts"] = total_attempts
    best_result["usage"] = _calculate_cost(usage_entries)
    return best_result
