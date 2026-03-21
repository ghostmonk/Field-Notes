# Resume Tailoring Phase 1: Vector Pipeline Implementation Plan

**Goal:** Build the embedding pipeline that chunks resume content, embeds it via Voyage AI, stores vectors in Qdrant Cloud, and retrieves relevant chunks given a job description.

**Architecture:** Python services in the backend handle chunking, embedding, and retrieval. Qdrant Cloud (free tier) stores vectors. Voyage AI generates embeddings. MongoDB stores source content chunks with metadata. A seed script populates the system from existing resume data.

**Tech Stack:** Python, FastAPI, Voyage AI (voyageai), Qdrant (qdrant-client), MongoDB (motor), pytest

---

### Task 1: Add Python dependencies

**Files:**
- Modify: `backend/requirements.in`
- Modify: `backend/requirements.txt` (regenerate)

**Step 1: Add new dependencies to requirements.in**

Add to `backend/requirements.in`:
```
voyageai
qdrant-client
```

**Step 2: Regenerate requirements.txt**

```bash
cd backend && pip-compile requirements.in -o requirements.txt
```

**Step 3: Install in venv**

```bash
source ~/Documents/venvs/field-notes/bin/activate && pip install voyageai qdrant-client
```

**Step 4: Commit**

```bash
git add backend/requirements.in backend/requirements.txt
git commit -m "chore: add voyageai and qdrant-client dependencies"
```

---

### Task 2: Content chunks model

**Files:**
- Create: `backend/models/content_chunk.py`
- Modify: `backend/database.py`

**Step 1: Create the Pydantic models**

`backend/models/content_chunk.py`:
```python
"""Content chunk models for vector search pipeline."""

from datetime import datetime, timezone
from typing import Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ChunkMetadata(BaseModel):
    company: Optional[str] = None
    role: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    technologies: List[str] = Field(default_factory=list)


class ContentChunkCreate(BaseModel):
    chunk_type: str = Field(
        ...,
        pattern="^(role_summary|achievement|skill_context|education|project|meta)$",
    )
    source: str = Field(default="resume", pattern="^(resume|blog|conversation|opinion)$")
    text: str = Field(..., min_length=1, max_length=10000)
    metadata: ChunkMetadata = Field(default_factory=ChunkMetadata)


class ContentChunkResponse(ContentChunkCreate):
    id: str
    qdrant_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    @field_validator("created_at", "updated_at")
    def ensure_utc(cls, value: datetime | None) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    model_config = ConfigDict(from_attributes=True)
```

**Step 2: Add collection helper to database.py**

Add to `backend/database.py` after `get_resumes_collection`:
```python
async def get_content_chunks_collection() -> AsyncIOMotorCollection:
    db = await get_db()
    return db["content_chunks"]
```

Add indexes in `ensure_indexes()`:
```python
    # Content chunks indexes
    content_chunks = db["content_chunks"]
    await safe_create_index(content_chunks, "chunk_type")
    await safe_create_index(content_chunks, "source")
    await safe_create_index(content_chunks, "qdrant_id", unique=True, name="content_chunks_qdrant_id")
```

**Step 3: Run tests to verify nothing broke**

```bash
cd backend && python -m pytest -v 2>&1 | tail -5
```

**Step 4: Commit**

```bash
git add backend/models/content_chunk.py backend/database.py
git commit -m "feat: add content chunks model and collection"
```

---

### Task 3: Embedding service

**Files:**
- Create: `backend/services/embedding.py`
- Create: `backend/tests/test_embedding_service.py`

**Step 1: Write the embedding service**

`backend/services/embedding.py`:
```python
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
```

**Step 2: Write tests**

`backend/tests/test_embedding_service.py`:
```python
"""Tests for embedding service."""

from unittest.mock import MagicMock, patch

import pytest


class TestEmbeddingService:
    def test_embed_texts_calls_voyage_client(self):
        """Test that embed_texts calls the Voyage AI client correctly."""
        import services.embedding as mod

        mod._client = None  # Reset singleton

        mock_client = MagicMock()
        mock_client.embed.return_value = MagicMock(
            embeddings=[[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]]
        )

        with patch.dict("os.environ", {"VOYAGE_API_KEY": "test-key"}):
            with patch("services.embedding.voyageai.Client", return_value=mock_client):
                mod._client = None
                result = mod.embed_texts(["hello", "world"])

        assert len(result) == 2
        assert result[0] == [0.1, 0.2, 0.3]
        mock_client.embed.assert_called_once_with(
            ["hello", "world"], model="voyage-3-lite", input_type="document"
        )

    def test_embed_query_uses_query_input_type(self):
        """Test that embed_query passes input_type='query'."""
        import services.embedding as mod

        mock_client = MagicMock()
        mock_client.embed.return_value = MagicMock(embeddings=[[0.1, 0.2, 0.3]])
        mod._client = mock_client

        result = mod.embed_query("search text")

        assert result == [0.1, 0.2, 0.3]
        mock_client.embed.assert_called_with(
            ["search text"], model="voyage-3-lite", input_type="query"
        )

    def test_embed_texts_raises_without_api_key(self):
        """Test that missing VOYAGE_API_KEY raises ValueError."""
        import services.embedding as mod

        mod._client = None

        with patch.dict("os.environ", {}, clear=True):
            with pytest.raises(ValueError, match="VOYAGE_API_KEY"):
                mod.embed_texts(["test"])
```

**Step 3: Run tests**

```bash
cd backend && python -m pytest tests/test_embedding_service.py -v
```

**Step 4: Commit**

```bash
git add backend/services/embedding.py backend/tests/test_embedding_service.py
git commit -m "feat: add Voyage AI embedding service with tests"
```

---

### Task 4: Qdrant vector store service

**Files:**
- Create: `backend/services/vector_store.py`
- Create: `backend/tests/test_vector_store.py`

**Step 1: Write the vector store service**

`backend/services/vector_store.py`:
```python
"""Vector store service using Qdrant Cloud."""

import os
import uuid
from typing import Dict, List, Optional

from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    MatchValue,
    PointStruct,
    VectorParams,
)

COLLECTION_NAME = "content"
VECTOR_SIZE = 512  # voyage-3-lite output dimension

_client = None


def _get_client() -> QdrantClient:
    global _client
    if _client is None:
        url = os.getenv("QDRANT_URL")
        api_key = os.getenv("QDRANT_API_KEY")
        if not url:
            raise ValueError("QDRANT_URL environment variable is required")
        _client = QdrantClient(url=url, api_key=api_key)
    return _client


def ensure_collection() -> None:
    """Create the content collection if it doesn't exist."""
    client = _get_client()
    collections = [c.name for c in client.get_collections().collections]
    if COLLECTION_NAME not in collections:
        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
        )


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
) -> List[Dict]:
    """Search for similar vectors in Qdrant.

    Returns list of dicts with 'id', 'score', and 'payload'.
    """
    client = _get_client()

    conditions = []
    if source_filter:
        conditions.append(
            FieldCondition(key="source", match=MatchValue(value=source_filter))
        )
    if chunk_type_filter:
        conditions.append(
            FieldCondition(key="chunk_type", match=MatchValue(value=chunk_type_filter))
        )

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
    """Delete a vector from Qdrant by ID."""
    client = _get_client()
    client.delete(
        collection_name=COLLECTION_NAME,
        points_selector=[point_id],
    )
```

**Step 2: Write tests**

`backend/tests/test_vector_store.py`:
```python
"""Tests for vector store service."""

from unittest.mock import MagicMock, patch

import pytest


class TestVectorStore:
    def test_upsert_vector_returns_id(self):
        """Test that upsert returns a point ID."""
        import services.vector_store as mod

        mock_client = MagicMock()
        mod._client = mock_client

        result = mod.upsert_vector(
            vector=[0.1, 0.2, 0.3],
            payload={"chunk_type": "achievement", "source": "resume"},
            point_id="test-id",
        )

        assert result == "test-id"
        mock_client.upsert.assert_called_once()

    def test_upsert_vector_generates_id_if_not_provided(self):
        """Test that upsert generates a UUID if no ID given."""
        import services.vector_store as mod

        mock_client = MagicMock()
        mod._client = mock_client

        result = mod.upsert_vector(
            vector=[0.1, 0.2, 0.3],
            payload={"chunk_type": "achievement"},
        )

        assert result is not None
        assert len(result) > 0

    def test_search_returns_results(self):
        """Test that search returns formatted results."""
        import services.vector_store as mod

        mock_point = MagicMock()
        mock_point.id = "point-1"
        mock_point.score = 0.95
        mock_point.payload = {"chunk_type": "achievement", "text": "test"}

        mock_client = MagicMock()
        mock_client.query_points.return_value = MagicMock(points=[mock_point])
        mod._client = mock_client

        results = mod.search(query_vector=[0.1, 0.2, 0.3], limit=5)

        assert len(results) == 1
        assert results[0]["id"] == "point-1"
        assert results[0]["score"] == 0.95

    def test_search_with_source_filter(self):
        """Test that search applies source filter."""
        import services.vector_store as mod

        mock_client = MagicMock()
        mock_client.query_points.return_value = MagicMock(points=[])
        mod._client = mock_client

        mod.search(query_vector=[0.1], source_filter="resume")

        call_args = mock_client.query_points.call_args
        assert call_args.kwargs["query_filter"] is not None

    def test_raises_without_qdrant_url(self):
        """Test that missing QDRANT_URL raises ValueError."""
        import services.vector_store as mod

        mod._client = None

        with patch.dict("os.environ", {}, clear=True):
            with pytest.raises(ValueError, match="QDRANT_URL"):
                mod._get_client()

    def test_delete_vector(self):
        """Test that delete calls client correctly."""
        import services.vector_store as mod

        mock_client = MagicMock()
        mod._client = mock_client

        mod.delete_vector("point-1")

        mock_client.delete.assert_called_once()
```

**Step 3: Run tests**

```bash
cd backend && python -m pytest tests/test_vector_store.py -v
```

**Step 4: Commit**

```bash
git add backend/services/vector_store.py backend/tests/test_vector_store.py
git commit -m "feat: add Qdrant vector store service with tests"
```

---

### Task 5: Chunking service

**Files:**
- Create: `backend/services/chunking.py`
- Create: `backend/tests/test_chunking.py`

**Step 1: Write the chunking service**

`backend/services/chunking.py`:
```python
"""Service to chunk resume data into embeddable content pieces."""

from typing import Dict, List


def chunk_resume(resume: Dict) -> List[Dict]:
    """Split a resume document into content chunks for embedding.

    Each chunk has: text, chunk_type, source, metadata.
    """
    chunks = []
    contact = resume.get("contact", {})
    name = contact.get("full_name", "")

    # Summary chunk
    summary = resume.get("summary", "")
    if summary:
        chunks.append({
            "text": f"{name}: {summary}",
            "chunk_type": "meta",
            "source": "resume",
            "metadata": {},
        })

    # Work experience chunks
    for job in resume.get("work_experience", []):
        company = job.get("company", "")
        title = job.get("title", "")
        start = job.get("start_date", "")
        end = "Present" if job.get("current") else job.get("end_date", "")
        techs = job.get("technologies", [])

        meta = {
            "company": company,
            "role": title,
            "start_date": start,
            "end_date": end,
            "technologies": techs,
        }

        # Role summary chunk
        desc = job.get("description", "")
        intro_lines = [l for l in desc.split("\n") if l.strip() and not l.strip().startswith("- ")]
        if intro_lines:
            chunks.append({
                "text": f"{title} at {company} ({start} - {end}): {' '.join(intro_lines)}",
                "chunk_type": "role_summary",
                "source": "resume",
                "metadata": meta,
            })

        # Individual achievement chunks (bullet points)
        bullets = [l.strip()[2:] for l in desc.split("\n") if l.strip().startswith("- ")]
        for bullet in bullets:
            chunks.append({
                "text": f"{title} at {company}: {bullet}",
                "chunk_type": "achievement",
                "source": "resume",
                "metadata": meta,
            })

        # Skill context chunks
        for tech in techs:
            chunks.append({
                "text": f"{tech}: used at {company} as {title} ({start} - {end})",
                "chunk_type": "skill_context",
                "source": "resume",
                "metadata": meta,
            })

    # Education chunks
    for edu in resume.get("education", []):
        institution = edu.get("institution", "")
        degree = edu.get("degree", "")
        field = edu.get("field_of_study", "")
        start = edu.get("start_date", "")
        end = edu.get("end_date", "")

        text = f"{degree}"
        if field:
            text += f" in {field}"
        text += f" from {institution} ({start} - {end})"

        chunks.append({
            "text": text,
            "chunk_type": "education",
            "source": "resume",
            "metadata": {
                "company": institution,
                "role": degree,
                "start_date": start,
                "end_date": end,
            },
        })

    # Achievement chunks (standalone)
    for achievement in resume.get("achievements", []):
        chunks.append({
            "text": achievement,
            "chunk_type": "achievement",
            "source": "resume",
            "metadata": {},
        })

    # Skills as a single meta chunk
    skills = resume.get("skills", [])
    if skills:
        chunks.append({
            "text": f"Technical skills: {', '.join(skills)}",
            "chunk_type": "meta",
            "source": "resume",
            "metadata": {},
        })

    return chunks
```

**Step 2: Write tests**

`backend/tests/test_chunking.py`:
```python
"""Tests for chunking service."""

from services.chunking import chunk_resume


class TestChunking:
    def test_chunks_summary(self):
        """Test that summary is chunked as meta type."""
        resume = {
            "contact": {"full_name": "Test User"},
            "summary": "Experienced engineer.",
        }
        chunks = chunk_resume(resume)
        meta_chunks = [c for c in chunks if c["chunk_type"] == "meta"]
        assert any("Experienced engineer" in c["text"] for c in meta_chunks)

    def test_chunks_work_experience_role_summary(self):
        """Test that role intro text is chunked as role_summary."""
        resume = {
            "contact": {"full_name": "Test User"},
            "work_experience": [{
                "company": "Acme",
                "title": "Engineer",
                "start_date": "2020",
                "end_date": "2023",
                "current": False,
                "description": "Led the platform team.\n\n- Built APIs.\n- Scaled systems.",
                "technologies": ["Python"],
            }],
        }
        chunks = chunk_resume(resume)
        summaries = [c for c in chunks if c["chunk_type"] == "role_summary"]
        assert len(summaries) == 1
        assert "Led the platform team" in summaries[0]["text"]

    def test_chunks_work_experience_bullets(self):
        """Test that bullet points become individual achievement chunks."""
        resume = {
            "contact": {"full_name": "Test User"},
            "work_experience": [{
                "company": "Acme",
                "title": "Engineer",
                "start_date": "2020",
                "current": True,
                "description": "- Built APIs.\n- Scaled systems.",
                "technologies": [],
            }],
        }
        chunks = chunk_resume(resume)
        achievements = [c for c in chunks if c["chunk_type"] == "achievement"]
        assert len(achievements) == 2
        assert "Built APIs" in achievements[0]["text"]

    def test_chunks_skill_context(self):
        """Test that technologies create skill_context chunks."""
        resume = {
            "contact": {"full_name": "Test User"},
            "work_experience": [{
                "company": "Acme",
                "title": "Engineer",
                "start_date": "2020",
                "current": True,
                "description": "",
                "technologies": ["Python", "Go"],
            }],
        }
        chunks = chunk_resume(resume)
        skills = [c for c in chunks if c["chunk_type"] == "skill_context"]
        assert len(skills) == 2
        assert "Python" in skills[0]["text"]

    def test_chunks_education(self):
        """Test that education entries are chunked."""
        resume = {
            "contact": {"full_name": "Test User"},
            "education": [{
                "institution": "MIT",
                "degree": "MSc",
                "field_of_study": "CS",
                "start_date": "2015",
                "end_date": "2017",
            }],
        }
        chunks = chunk_resume(resume)
        edu = [c for c in chunks if c["chunk_type"] == "education"]
        assert len(edu) == 1
        assert "MIT" in edu[0]["text"]

    def test_chunks_standalone_achievements(self):
        """Test that achievements list items are chunked."""
        resume = {
            "contact": {"full_name": "Test User"},
            "achievements": ["Won hackathon", "Published paper"],
        }
        chunks = chunk_resume(resume)
        achievements = [c for c in chunks if c["chunk_type"] == "achievement"]
        assert len(achievements) == 2

    def test_empty_resume_returns_empty_list(self):
        """Test that empty resume produces no chunks."""
        assert chunk_resume({}) == []

    def test_metadata_includes_company_and_technologies(self):
        """Test that chunk metadata carries company and tech info."""
        resume = {
            "contact": {"full_name": "Test User"},
            "work_experience": [{
                "company": "Acme",
                "title": "Engineer",
                "start_date": "2020",
                "current": True,
                "description": "- Built APIs.",
                "technologies": ["Python"],
            }],
        }
        chunks = chunk_resume(resume)
        achievement = [c for c in chunks if c["chunk_type"] == "achievement"][0]
        assert achievement["metadata"]["company"] == "Acme"
        assert "Python" in achievement["metadata"]["technologies"]
```

**Step 3: Run tests**

```bash
cd backend && python -m pytest tests/test_chunking.py -v
```

**Step 4: Commit**

```bash
git add backend/services/chunking.py backend/tests/test_chunking.py
git commit -m "feat: add resume chunking service with tests"
```

---

### Task 6: Seed script — embed and upsert

**Files:**
- Create: `seed-content.py` (at worktree root, gitignored)

**Step 1: Write the seed script**

`seed-content.py`:
```python
#!/usr/bin/env python3
"""Seed content chunks from existing resume into MongoDB + Qdrant. NOT committed."""

import asyncio
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

from dotenv import load_dotenv

load_dotenv()

from datetime import datetime, timezone


async def seed():
    from motor.motor_asyncio import AsyncIOMotorClient
    from services.chunking import chunk_resume
    from services.embedding import embed_texts
    from services.vector_store import ensure_collection, upsert_vector

    mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/ghostmonk")
    db_name = os.getenv("MONGO_DB_NAME", "ghostmonk")

    client = AsyncIOMotorClient(mongo_uri)
    db = client[db_name]

    # Get existing resume
    resume_doc = await db.resumes.find_one({"deleted": {"$ne": True}})
    if not resume_doc:
        print("No resume found. Seed resume first.")
        return

    print(f"Found resume for: {resume_doc['contact']['full_name']}")

    # Chunk the resume
    chunks = chunk_resume(resume_doc)
    print(f"Generated {len(chunks)} chunks")

    # Embed all chunks
    texts = [c["text"] for c in chunks]
    print("Embedding chunks via Voyage AI...")
    embeddings = embed_texts(texts, input_type="document")
    print(f"Got {len(embeddings)} embeddings (dimension: {len(embeddings[0])})")

    # Ensure Qdrant collection exists
    ensure_collection()
    print("Qdrant collection ready")

    # Clear existing content chunks
    await db.content_chunks.delete_many({"source": "resume"})
    print("Cleared existing resume chunks from MongoDB")

    # Upsert to both MongoDB and Qdrant
    now = datetime.now(timezone.utc)
    for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
        # Upsert to Qdrant
        qdrant_id = upsert_vector(
            vector=embedding,
            payload={
                "chunk_type": chunk["chunk_type"],
                "source": chunk["source"],
                "company": chunk["metadata"].get("company", ""),
                "text": chunk["text"],
            },
        )

        # Save to MongoDB
        await db.content_chunks.insert_one({
            **chunk,
            "qdrant_id": qdrant_id,
            "created_at": now,
            "updated_at": now,
        })

        print(f"  [{i+1}/{len(chunks)}] {chunk['chunk_type']}: {chunk['text'][:60]}...")

    print(f"\nSeeded {len(chunks)} chunks to MongoDB and Qdrant")
    client.close()


if __name__ == "__main__":
    asyncio.run(seed())
```

**Step 2: Add to .gitignore**

```bash
echo "seed-content.py" >> .gitignore
```

**Step 3: Set up Qdrant Cloud**

1. Go to cloud.qdrant.io and create a free cluster
2. Get the URL and API key
3. Add to `.env`:
```
QDRANT_URL=https://your-cluster.qdrant.io:6333
QDRANT_API_KEY=your-api-key
VOYAGE_API_KEY=your-voyage-key
```

**Step 4: Run the seed script locally**

```bash
source ~/Documents/venvs/field-notes/bin/activate
python seed-content.py
```

Expected: chunks created in both MongoDB and Qdrant.

**Step 5: Commit .gitignore change**

```bash
git add .gitignore
git commit -m "chore: add seed-content.py to gitignore"
```

---

### Task 7: Retrieval endpoint

**Files:**
- Create: `backend/handlers/content.py`
- Modify: `backend/app.py`
- Create: `backend/tests/test_content_api.py`

**Step 1: Write the content handler**

`backend/handlers/content.py`:
```python
"""API handlers for content chunk retrieval."""

from typing import List, Optional

from decorators.auth import requires_auth
from fastapi import APIRouter, HTTPException, Query, Request
from glogger import logger
from pydantic import BaseModel
from services.embedding import embed_query
from services.vector_store import search

router = APIRouter()


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
@requires_auth
async def search_content(
    request: Request,
    query: str,
    limit: int = Query(20, ge=1, le=50),
    source: Optional[str] = Query(None),
    chunk_type: Optional[str] = Query(None),
):
    """Search content chunks by semantic similarity."""
    try:
        logger.info_with_context("Searching content chunks", {"query": query[:100]})

        query_embedding = embed_query(query)

        results = search(
            query_vector=query_embedding,
            limit=limit,
            source_filter=source,
            chunk_type_filter=chunk_type,
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
```

**Step 2: Register in app.py**

Add import:
```python
from handlers.content import router as content_router
```

Add include:
```python
app.include_router(content_router)
```

**Step 3: Write tests**

`backend/tests/test_content_api.py`:
```python
"""Tests for content search endpoint."""

from unittest.mock import MagicMock, patch

import pytest


class TestContentSearch:
    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_search_requires_auth(self, async_client):
        """Test POST /content/search without auth returns 401."""
        response = await async_client.post(
            "/content/search", params={"query": "test"}
        )
        assert response.status_code == 401

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_search_returns_results(
        self, async_client, mock_auth, auth_headers
    ):
        """Test POST /content/search returns search results."""
        mock_results = [
            {
                "id": "point-1",
                "score": 0.95,
                "payload": {
                    "text": "Built distributed systems",
                    "chunk_type": "achievement",
                    "source": "resume",
                    "company": "Ro",
                },
            }
        ]

        with (
            patch("handlers.content.embed_query", return_value=[0.1, 0.2]),
            patch("handlers.content.search", return_value=mock_results),
        ):
            response = await async_client.post(
                "/content/search",
                params={"query": "distributed systems"},
                headers=auth_headers,
            )

        assert response.status_code == 200
        data = response.json()
        assert len(data["results"]) == 1
        assert data["results"][0]["text"] == "Built distributed systems"
        assert data["results"][0]["score"] == 0.95
```

**Step 4: Register content_router in test conftest**

Add to `backend/tests/conftest.py` imports:
```python
from handlers.content import router as content_router
```

Add to test_app includes:
```python
test_app.include_router(content_router)
```

**Step 5: Run tests**

```bash
cd backend && python -m pytest tests/test_content_api.py -v
```

**Step 6: Run full test suite**

```bash
cd backend && python -m pytest -v
```

**Step 7: Format and commit**

```bash
make format
git add backend/handlers/content.py backend/app.py backend/tests/test_content_api.py backend/tests/conftest.py
git commit -m "feat: add content search endpoint with vector retrieval"
```

---

### Task 8: Environment variables for deploy

**Files:**
- Modify: `.github/workflows/deploy.yml`
- Modify: `backend/Dockerfile` (if needed for new deps)

**Step 1: Add GitHub variables**

```bash
gh variable set QDRANT_URL --body "https://your-cluster.qdrant.io:6333"
gh secret set QDRANT_API_KEY
gh secret set VOYAGE_API_KEY
```

**Step 2: Update deploy.yml backend env vars**

Find the backend `--set-env-vars` line and add:
```
QDRANT_URL=${{ vars.QDRANT_URL }},QDRANT_API_KEY=${{ secrets.QDRANT_API_KEY }},VOYAGE_API_KEY=${{ secrets.VOYAGE_API_KEY }}
```

**Step 3: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "chore: add Qdrant and Voyage AI env vars to deploy config"
```

---

### Task 9: Verify end-to-end locally

**Step 1: Start local dev environment**

```bash
make dev-local
```

**Step 2: Run seed script**

```bash
source ~/Documents/venvs/field-notes/bin/activate
python seed-content.py
```

**Step 3: Test search via curl**

```bash
# Get auth token by logging in via browser, then:
curl -X POST "http://localhost:5001/content/search?query=distributed+systems" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Verify results return ranked chunks relevant to "distributed systems".

**Step 4: Run all tests**

```bash
make test
make test-frontend-unit
```

**Step 5: Format check**

```bash
make format
```

**Step 6: Final commit if needed**

```bash
git add -A
git commit -m "chore: phase 1 complete — vector pipeline verified end-to-end"
```
