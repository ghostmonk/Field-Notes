# Ghostmonk AI — System Design

**Goal:** Build a persistent AI presence on ghostmonk.com that knows Nicholas's professional history, writing voice, and opinions. Starts as infrastructure for resume tailoring, evolves into a conversational agent for visitors, and ultimately an authenticated tool that acts on Nicholas's behalf.

**Principle:** One continuous evolution, not separate projects. Each phase compounds on the last. The resume tailoring system is the first consumer of shared infrastructure.

---

## The Ghost Engine

The Ghost Engine is the core intelligence layer. Every feature — resume tailoring, visitor conversation, authenticated actions — is a consumer of the same underlying system.

### Components

```
┌─────────────────────────────────────────────────┐
│                  Ghost Engine                    │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │  Memory   │  │ Retrieval │  │   Generation  │  │
│  │  (Qdrant) │──│ Pipeline  │──│   Pipeline    │  │
│  └──────────┘  └──────────┘  └───────────────┘  │
│       │                            │             │
│  ┌──────────┐              ┌───────────────┐     │
│  │ Indexing  │              │  Evaluation   │     │
│  │ Pipeline  │              │  Pipeline     │     │
│  └──────────┘              └───────────────┘     │
│                                                  │
└──────────────────────┬──────────────────────────┘
                       │
          ┌────────────┼────────────┐
          │            │            │
    ┌─────┴─────┐ ┌───┴────┐ ┌────┴─────┐
    │  Resume   │ │  Chat  │ │  Agent   │
    │ Tailoring │ │ (Ghost)│ │ (Owner)  │
    └───────────┘ └────────┘ └──────────┘
```

**Memory** — Qdrant vector store. Everything the system knows. Chunks tagged with source, type, and purpose metadata. Source-agnostic: resume facts, blog posts, opinions, conversation history, voice examples, feedback.

**Indexing Pipeline** — Takes raw content (resume save, blog publish, manual entry), chunks it, embeds via Voyage AI, upserts to Qdrant with metadata. Already partially built (resume indexer).

**Retrieval Pipeline** — Takes a query (job description, visitor question, owner command), embeds it, searches Qdrant with filters appropriate to the use case. Returns ranked chunks with scores.

**Generation Pipeline** — Takes retrieved chunks + use-case-specific system prompt, calls Claude (model selected by use case), returns structured or conversational output.

**Evaluation Pipeline** — Scores generated output against criteria. Drives retry loops. Feeds back into memory as approved/rejected examples.

### Consumers

Each consumer configures the engine differently:

| Consumer | Retrieval Filter | Model | Output Format | Evaluation |
|----------|-----------------|-------|---------------|------------|
| Resume Tailoring | source: resume, chunk_type: all | Sonnet (generate), Haiku (analyze/evaluate) | Resume JSON | Score threshold + retry |
| Chat (Ghost) | source: all, purpose: personality + facts | Sonnet | Conversational text | Boundary check (would Nicholas say this?) |
| Agent (Owner) | source: all | Sonnet | Structured actions | Authorization + confirmation |

---

## Memory Model

### Current State (Phase 1-2)

Every vector in Qdrant carries a payload:

```json
{
  "text": "Architected diagnostics platform enabling tens of thousands of at-home blood tests",
  "chunk_type": "achievement",
  "source": "resume",
  "company": "Ro"
}
```

### Target State

Three metadata dimensions for filtering and curation:

**source** — where the content originated
- `resume` — professional history, skills, education
- `blog` — published writing on ghostmonk.com
- `opinion` — curated views on topics (manually entered)
- `conversation` — approved past exchanges
- `voice_feedback` — corrections and approvals from feedback loop

**chunk_type** — structural category
- `achievement` — specific accomplishment with context
- `role_summary` — overview of a position
- `skill_context` — technology + where/how it was used
- `education` — degrees, institutions
- `meta` — summary, skills list, profile overview
- `voice_example` — curated tone anchor
- `anti_pattern` — "do not write like this"

**purpose** — how to use the content (new dimension)
- `facts` — verifiable professional history, dates, titles, technologies
- `personality` — voice, tone, opinions, communication style
- `strategy` — rules and heuristics for specific outputs (ATS optimization, keyword density)

A single chunk can serve multiple purposes. "Built distributed systems at Ro" is a fact when populating a resume and personality context when the ghost describes Nicholas's background in conversation.

---

## Phases

All phases are defined in the [resume tailoring design doc](./2026-03-20-resume-tailoring-design). The Ghost Engine reframes them as layers of a single system:

### Layer 1: Infrastructure (Phase 1-2) — DONE

- Vector pipeline: chunking, embedding, Qdrant storage, retrieval
- Resume tailoring: analyze, retrieve, generate, evaluate with retry
- Auto-indexing on resume create/update
- `POST /tailor` endpoint

### Layer 2: Memory Visibility (Phase 3) — NEXT

Admin UI and API to inspect and manage what the Ghost Engine knows.

**API Endpoints:**
- `GET /content/chunks` — list chunks with filtering (source, chunk_type, purpose)
- `GET /content/chunks/:id` — single chunk detail
- `POST /content/chunks` — add new content (auto-embeds)
- `PUT /content/chunks/:id` — update chunk (re-embeds)
- `DELETE /content/chunks/:id` — remove from MongoDB + Qdrant
- `GET /content/stats` — counts by source, chunk_type, purpose
- `POST /content/search-preview` — run a query, see ranked results with scores

**Frontend — `/admin/memory`:**
- Browse chunks: filterable table (source, type, purpose)
- Chunk detail: full text, metadata, edit/delete
- Search preview: paste a query, see what the engine would retrieve
- Stats dashboard: vector counts, coverage by source/type
- Bulk operations: re-index all, clear by source

This is the training interface. You can't trust the system until you can see what it knows.

### Layer 3: Voice and Feedback (Phase 3-4)

The feedback loop from the design doc. When you review tailored output:

- **Approve** — output becomes a voice example in memory
- **Reject** — output becomes an anti-pattern
- **Edit** — diff pair stored, teaches the engine your corrections
- **Flag** — specific phrase marked as problematic

Voice examples and feedback are just chunks with specific `chunk_type` values (voice_example, anti_pattern) and `source: voice_feedback`. They live in the same Qdrant collection, retrieved at generation time alongside content chunks.

### Layer 4: Job Application Tracker (Phase 4)

Lightweight ATS as defined in the design doc. MongoDB `job_applications` collection. Links job descriptions to tailored resumes, evaluation scores, and application status.

### Layer 5: The Ghost (Phase 5)

Conversational presence on ghostmonk.com. Visitors interact with an LLM that retrieves from the full memory store — resume facts, blog content, opinions, approved conversation patterns.

**Key differences from resume tailoring:**
- Retrieval pulls from all sources, filtered by `purpose: personality + facts`
- Generation uses conversational prompts, not structured JSON output
- Evaluation checks boundaries: "would Nicholas actually say this?"
- Session memory: short-term context within a conversation
- Rate limiting and content safety appropriate for public-facing use

### Layer 6: The Owner (Phase 6)

When the system confirms Nicholas is authenticated:
- Elevated permissions — the ghost can take actions, not just converse
- Site management: publish content, respond to comments, update settings
- Operational commands: "re-index my resume", "show me recent applications"
- The conversational interface becomes a command interface

Authentication is already in place (Google OAuth, admin role). The escalation is in what the ghost is allowed to do, not in identity verification.

---

## Shared Infrastructure Decisions

**Single Qdrant collection** — all content types in one `content` collection, filtered at query time by payload metadata. No collection-per-source.

**Single embedding model** — Voyage AI `voyage-3-lite` for all content. Consistent vector space means cross-source retrieval works (a job description query can surface both resume achievements and blog posts about the same technology).

**Single Anthropic client** — `services/anthropic_client.py` shared singleton. All consumers use the same connection pool.

**Background indexing** — content changes trigger async indexing. Failures are logged but never block the API response. The source of truth is MongoDB; Qdrant is a derived index that can be rebuilt.

**Metadata over collections** — prefer adding metadata fields to chunks over creating new MongoDB collections. The `content_chunks` collection + Qdrant payloads should be the single store for all knowledge, with `source`, `chunk_type`, and `purpose` as the organizing taxonomy.
