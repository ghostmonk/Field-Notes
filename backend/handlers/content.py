"""API handlers for content chunk retrieval."""

import asyncio
from enum import Enum
from typing import List, Optional

from decorators.auth import requires_auth
from fastapi import APIRouter, HTTPException, Request
from glogger import logger
from middleware.rate_limit import limiter
from pydantic import BaseModel, Field
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


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000)
    limit: int = Field(20, ge=1, le=50)
    source: Optional[Source] = None
    chunk_type: Optional[ChunkType] = None


class SearchResult(BaseModel):
    id: str
    score: float
    text: str
    chunk_type: str
    source: str
    company: Optional[str] = None


class SearchResponse(BaseModel):
    results: List[SearchResult]
    query: str


@router.post("/content/search", response_model=SearchResponse)
@limiter.limit("10/minute")
@requires_auth
async def search_content(
    request: Request,
    body: SearchRequest,
):
    """Search content chunks by semantic similarity."""
    try:
        logger.info_with_context("Searching content chunks", {"query": body.query[:100]})

        query_embedding = await asyncio.to_thread(embed_query, body.query)

        results = await asyncio.to_thread(
            search,
            query_vector=query_embedding,
            limit=body.limit,
            source_filter=body.source.value if body.source else None,
            chunk_type_filter=body.chunk_type.value if body.chunk_type else None,
        )

        return SearchResponse(
            query=body.query,
            results=[
                SearchResult(
                    id=r["id"],
                    score=r["score"],
                    text=r["payload"].get("text", ""),
                    chunk_type=r["payload"].get("chunk_type", ""),
                    source=r["payload"].get("source", ""),
                    company=r["payload"].get("company") or None,
                )
                for r in results
            ],
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception_with_context(
            "Error searching content",
            {"error_type": type(e).__name__, "error_details": str(e)},
        )
        raise HTTPException(status_code=500, detail="Content search failed")
