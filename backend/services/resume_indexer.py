"""Index resume content into Qdrant for vector search."""

import hashlib
import os

from glogger import logger
from services.chunking import chunk_resume
from services.embedding import embed_texts
from services.vector_store import ensure_collection, upsert_vector


def _chunk_id(user_id: str, chunk_type: str, source: str, index: int) -> str:
    """Generate a deterministic point ID for a chunk."""
    key = f"{user_id}:{source}:{chunk_type}:{index}"
    return hashlib.sha256(key.encode()).hexdigest()[:32]


def index_resume(resume_data: dict, user_id: str) -> int:
    """Chunk, embed, and upsert a resume into Qdrant.

    Args:
        resume_data: Resume dict (the content fields, not MongoDB metadata).
        user_id: The owner's user ID, stored in Qdrant for retrieval filtering.

    Returns:
        Number of vectors upserted.
    """
    if not os.getenv("VOYAGE_API_KEY") or not os.getenv("QDRANT_URL"):
        logger.warning_with_context(
            "Skipping resume indexing — VOYAGE_API_KEY or QDRANT_URL not set", {}
        )
        return 0

    chunks = chunk_resume(resume_data)
    if not chunks:
        return 0

    texts = [c["text"] for c in chunks]
    embeddings = embed_texts(texts)

    ensure_collection()
    for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
        point_id = _chunk_id(user_id, chunk["chunk_type"], chunk["source"], i)
        upsert_vector(
            vector=embedding,
            point_id=point_id,
            payload={
                "chunk_type": chunk["chunk_type"],
                "source": chunk["source"],
                "company": chunk.get("metadata", {}).get("company", ""),
                "text": chunk["text"],
                "user_id": user_id,
            },
        )

    return len(chunks)
