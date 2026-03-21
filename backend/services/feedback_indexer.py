"""Index voice feedback into Qdrant for retrieval during tailoring."""

from typing import Optional

from glogger import logger
from services.anthropic_client import (
    CHUNK_TYPE_ANTI_PATTERN,
    CHUNK_TYPE_VOICE_EXAMPLE,
    SOURCE_VOICE_FEEDBACK,
    vector_services_configured,
)
from services.embedding import embed_texts
from services.vector_store import ensure_collection, upsert_vector


def index_feedback(
    text: str,
    feedback_type: str,
    job_context: str,
    user_id: str,
) -> Optional[str]:
    """Embed and upsert a feedback entry into Qdrant.

    Returns:
        The Qdrant point ID, or None if skipped.
    """
    if not vector_services_configured():
        logger.warning_with_context(
            "Skipping feedback indexing — vector services not configured", {}
        )
        return None

    chunk_type = (
        CHUNK_TYPE_ANTI_PATTERN
        if feedback_type in ("rejected", "flagged")
        else CHUNK_TYPE_VOICE_EXAMPLE
    )

    embeddings = embed_texts([text])
    ensure_collection()

    return upsert_vector(
        vector=embeddings[0],
        payload={
            "text": text,
            "chunk_type": chunk_type,
            "source": SOURCE_VOICE_FEEDBACK,
            "job_context": job_context,
            "feedback_type": feedback_type,
            "user_id": user_id,
        },
    )
