"""Index resume content into Qdrant for vector search."""

import os

from glogger import logger
from services.chunking import chunk_resume
from services.embedding import embed_texts
from services.vector_store import ensure_collection, upsert_vector


def index_resume(resume_data: dict) -> int:
    """Chunk, embed, and upsert a resume into Qdrant.

    Args:
        resume_data: Resume dict (the content fields, not MongoDB metadata).

    Returns:
        Number of vectors upserted.

    Raises:
        ValueError: If required API keys are missing.
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
    for chunk, embedding in zip(chunks, embeddings):
        upsert_vector(
            vector=embedding,
            payload={
                "chunk_type": chunk["chunk_type"],
                "source": chunk["source"],
                "company": chunk.get("metadata", {}).get("company", ""),
                "text": chunk["text"],
            },
        )

    return len(chunks)
