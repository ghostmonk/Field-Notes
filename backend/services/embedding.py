"""Embedding service using Voyage AI."""

import os
from typing import List

import voyageai

_client = None


def _get_client() -> voyageai.Client:
    global _client
    if _client is None:
        api_key = os.getenv("VOYAGE_API_KEY")
        if not api_key:
            raise ValueError("VOYAGE_API_KEY environment variable is required")
        _client = voyageai.Client(api_key=api_key)
    return _client


def embed_texts(texts: List[str], input_type: str = "document") -> List[List[float]]:
    """Embed a list of texts using Voyage AI.

    Args:
        texts: List of text strings to embed.
        input_type: "document" for content being stored, "query" for search queries.

    Returns:
        List of embedding vectors.
    """
    client = _get_client()
    result = client.embed(texts, model="voyage-3-lite", input_type=input_type)
    return result.embeddings


def embed_query(text: str) -> List[float]:
    """Embed a single query text."""
    return embed_texts([text], input_type="query")[0]


def embed_document(text: str) -> List[float]:
    """Embed a single document text."""
    return embed_texts([text], input_type="document")[0]
