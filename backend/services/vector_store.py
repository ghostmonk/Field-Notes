"""Vector store service using Qdrant Cloud."""

import os
import threading
import uuid
from typing import Dict, List, Optional

from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    MatchValue,
    PayloadSchemaType,
    PointStruct,
    VectorParams,
)

COLLECTION_NAME = "content"
VECTOR_SIZE = 512  # voyage-3-lite output dimension

_client = None
_client_lock = threading.Lock()


def _get_client() -> QdrantClient:
    global _client
    if _client is None:
        with _client_lock:
            if _client is None:
                url = os.getenv("QDRANT_URL")
                api_key = os.getenv("QDRANT_API_KEY")
                if not url:
                    raise ValueError("QDRANT_URL environment variable is required")
                _client = QdrantClient(url=url, api_key=api_key)
    return _client


_collection_ensured = False


def ensure_collection() -> None:
    """Create the content collection and payload indexes if they don't exist.

    Cached per process — only hits Qdrant on the first call.
    """
    global _collection_ensured
    if _collection_ensured:
        return

    client = _get_client()
    collections = [c.name for c in client.get_collections().collections]
    if COLLECTION_NAME not in collections:
        try:
            client.create_collection(
                collection_name=COLLECTION_NAME,
                vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
            )
        except Exception as e:
            if "already exists" in str(e).lower():
                pass
            else:
                raise

    for field in ("source", "chunk_type", "user_id"):
        try:
            client.create_payload_index(COLLECTION_NAME, field, PayloadSchemaType.KEYWORD)
        except Exception:
            pass

    _collection_ensured = True


def upsert_vector(
    vector: List[float],
    payload: Dict,
    point_id: Optional[str] = None,
) -> str:
    """Upsert a single vector with payload into Qdrant.

    Returns the point ID (generated if not provided).
    """
    client = _get_client()
    if point_id is None:
        point_id = str(uuid.uuid4())

    client.upsert(
        collection_name=COLLECTION_NAME,
        points=[
            PointStruct(
                id=point_id,
                vector=vector,
                payload=payload,
            )
        ],
    )
    return point_id


def search(
    query_vector: List[float],
    limit: int = 20,
    source_filter: Optional[str] = None,
    chunk_type_filter: Optional[str] = None,
    user_id_filter: Optional[str] = None,
) -> List[Dict]:
    """Search for similar vectors in Qdrant.

    Returns list of dicts with 'id', 'score', and 'payload'.
    """
    client = _get_client()

    conditions = []
    if source_filter:
        conditions.append(FieldCondition(key="source", match=MatchValue(value=source_filter)))
    if chunk_type_filter:
        conditions.append(
            FieldCondition(key="chunk_type", match=MatchValue(value=chunk_type_filter))
        )
    if user_id_filter:
        conditions.append(FieldCondition(key="user_id", match=MatchValue(value=user_id_filter)))

    query_filter = Filter(must=conditions) if conditions else None

    results = client.query_points(
        collection_name=COLLECTION_NAME,
        query=query_vector,
        limit=limit,
        query_filter=query_filter,
    )

    return [
        {
            "id": str(point.id),
            "score": point.score,
            "payload": point.payload,
        }
        for point in results.points
    ]


def delete_vector(point_id: str) -> None:
    """Delete a vector from Qdrant by point ID."""
    client = _get_client()
    client.delete(
        collection_name=COLLECTION_NAME,
        points_selector=[point_id],
    )


def update_payload(point_id: str, payload: Dict) -> None:
    """Update payload fields on an existing Qdrant point."""
    client = _get_client()
    client.set_payload(
        collection_name=COLLECTION_NAME,
        payload=payload,
        points=[point_id],
    )
