"""Orchestrates the full resume tailoring pipeline."""

import asyncio
from typing import Any, Dict

from motor.motor_asyncio import AsyncIOMotorCollection
from services.anthropic_client import ResumeNotFoundError
from services.embedding import embed_query
from services.job_analyzer import analyze_job_description
from services.resume_evaluator import evaluate_resume
from services.resume_generator import generate_tailored_resume
from services.vector_store import search

SCORE_THRESHOLD = 0.80
MAX_RETRIES = 2


async def run_tailoring_pipeline(
    job_description: str,
    user_id: str,
    resumes_collection: AsyncIOMotorCollection,
) -> Dict[str, Any]:
    """Run the full tailoring pipeline: Analyze -> Retrieve -> Generate -> Evaluate.

    Args:
        job_description: Raw job description text.
        user_id: The authenticated user's ID.
        resumes_collection: MongoDB resumes collection.

    Returns:
        Dict with keys: analysis, tailored_resume, evaluation, attempts.

    Raises:
        ValueError: If user has no resume.
    """
    # Fetch current resume
    resume_doc = await resumes_collection.find_one({"user_id": user_id, "deleted": {"$ne": True}})
    if not resume_doc:
        raise ResumeNotFoundError("No resume found for this user")

    # Strip MongoDB internal fields for the LLM
    resume = {
        k: v
        for k, v in resume_doc.items()
        if k not in ("_id", "user_id", "createdDate", "updatedDate", "deleted")
    }

    # Step 1 + 2: Analyze and embed concurrently (no data dependency)
    analysis, query_embedding = await asyncio.gather(
        asyncio.to_thread(analyze_job_description, job_description),
        asyncio.to_thread(embed_query, job_description),
    )

    raw_results = await asyncio.to_thread(
        search,
        query_vector=query_embedding,
        limit=25,
        source_filter="resume",
    )

    chunks = [{"text": r["payload"].get("text", ""), "score": r["score"]} for r in raw_results]

    # Step 3 + 4: Generate and Evaluate with retry loop
    evaluator_feedback = None
    best_result = None
    best_score = -1.0
    total_attempts = 0

    for attempt in range(1 + MAX_RETRIES):
        total_attempts = attempt + 1

        try:
            tailored = await asyncio.to_thread(
                generate_tailored_resume,
                resume=resume,
                analysis=analysis,
                chunks=chunks,
                evaluator_feedback=evaluator_feedback,
            )

            evaluation = await asyncio.to_thread(
                evaluate_resume,
                tailored_resume=tailored,
                analysis=analysis,
            )
        except ValueError:
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
    return best_result
