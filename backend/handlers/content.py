"""API handlers for content chunk retrieval."""

import asyncio
from enum import Enum
from typing import List, Optional

from decorators.auth import requires_auth
from fastapi import APIRouter, HTTPException, Query, Request
from glogger import logger
from middleware.rate_limit import limiter
from pydantic import BaseModel
from services.embedding import embed_query
from services.vector_store import search

router = APIRouter()


class ChunkType(str, Enum):
    role_summary = "role_summary"
    achievement = "achievement"
    skill_context = "skill_context"
    education = "education"
    project = "project"
    meta = "meta"


class Source(str, Enum):
    resume = "resume"
    blog = "blog"
    conversation = "conversation"
    opinion = "opinion"


class SearchResult(BaseModel):
    id: str
    score: float
    text: str
    chunk_type: str
    source: str
    company: str


class SearchResponse(BaseModel):
    results: List[SearchResult]
    query: str


@router.post("/content/search", response_model=SearchResponse)
@limiter.limit("10/minute")
@requires_auth
async def search_content(
    request: Request,
    query: str = Query(..., min_length=1),
    limit: int = Query(20, ge=1, le=50),
    source: Optional[Source] = Query(None),
    chunk_type: Optional[ChunkType] = Query(None),
):
    """Search content chunks by semantic similarity."""
    try:
        logger.info_with_context("Searching content chunks", {"query": query[:100]})

        query_embedding = await asyncio.to_thread(embed_query, query)

        results = await asyncio.to_thread(
            search,
            query_vector=query_embedding,
            limit=limit,
            source_filter=source.value if source else None,
            chunk_type_filter=chunk_type.value if chunk_type else None,
        )

        return SearchResponse(
            query=query,
            results=[
                SearchResult(
                    id=r["id"],
                    score=r["score"],
                    text=r["payload"].get("text", ""),
                    chunk_type=r["payload"].get("chunk_type", ""),
                    source=r["payload"].get("source", ""),
                    company=r["payload"].get("company", ""),
                )
                for r in results
            ],
        )

    except Exception as e:
        logger.exception_with_context(
            "Error searching content",
            {"error_type": type(e).__name__, "error_details": str(e)},
        )
        raise HTTPException(status_code=500, detail="Content search failed")
