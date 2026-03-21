"""Index voice feedback into Qdrant for retrieval during tailoring."""

import os
from typing import Optional

from glogger import logger
from services.embedding import embed_texts
from services.vector_store import ensure_collection, upsert_vector


def index_feedback(
    text: str,
    feedback_type: str,
    job_context: str,
    user_id: str,
) -> Optional[str]:
    """Embed and upsert a feedback entry into Qdrant.

    Args:
        text: The text to embed (approved/edited text or rejected/flagged text).
        feedback_type: One of approved, rejected, edited, flagged.
        job_context: Job context label for retrieval filtering.
        user_id: The owner's user ID.

    Returns:
        The Qdrant point ID, or None if skipped.
    """
    if not os.getenv("VOYAGE_API_KEY") or not os.getenv("QDRANT_URL"):
        logger.warning_with_context(
            "Skipping feedback indexing — VOYAGE_API_KEY or QDRANT_URL not set", {}
        )
        return None

    chunk_type = "anti_pattern" if feedback_type in ("rejected", "flagged") else "voice_example"

    embeddings = embed_texts([text])
    ensure_collection()

    point_id = upsert_vector(
        vector=embeddings[0],
        payload={
            "text": text,
            "chunk_type": chunk_type,
            "source": "voice_feedback",
            "job_context": job_context,
            "feedback_type": feedback_type,
            "user_id": user_id,
        },
    )

    return point_id
