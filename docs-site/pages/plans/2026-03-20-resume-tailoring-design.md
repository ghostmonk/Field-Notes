# AI Resume Tailoring System — Design

**Goal:** Build an AI-powered resume tailoring system that takes a job description, retrieves relevant professional history from a vector store, and uses Claude Sonnet to assemble a role-specific resume in your voice. Includes a job application tracker and a feedback loop that improves output quality over time.

**Secondary goal:** Establish the vector store, embedding pipeline, and generator-evaluator architecture as shared infrastructure for a future conversational personality LLM.

---

## Architecture Overview

```
Job Description (paste)
    → ANALYZE (Haiku): extract requirements, keywords, seniority, culture
    → RETRIEVE (Qdrant): search weighted by extracted requirements
    → GENERATE (Sonnet): write tailored resume using strategy + voice + content
    → EVALUATE (Haiku): score against extracted requirements checklist
    → If below threshold: REGENERATE with evaluator feedback
    → Present to user with score breakdown
    → User approves/edits/rejects → feedback loop
    → Save to job application tracker
    → Download PDF/DOCX (existing generators)
```

## Infrastructure

| Component | Choice | Cost |
|-----------|--------|------|
| Vector DB | Qdrant Cloud (free tier) | $0 |
| Embeddings | Voyage AI | ~$0/mo at volume |
| LLM — writer | Claude Sonnet (Anthropic API) | ~$0.02 per resume |
| LLM — analyzer/evaluator | Claude Haiku (Anthropic API) | ~$0.01 per resume |
| Content/tracker storage | Existing MongoDB Atlas | $0 |
| Compute | Existing Cloud Run | $0 |

**Total per tailored resume: ~$0.03-0.05**

---

## Data Model

### MongoDB Collections

**`content_chunks`** — source text with metadata, referenced by Qdrant vector IDs

```json
{
  "_id": "ObjectId",
  "chunk_type": "achievement | role_summary | skill_context | education | project | meta",
  "source": "resume | blog | conversation | opinion",
  "text": "Architected diagnostics platform enabling tens of thousands of at-home blood tests",
  "metadata": {
    "company": "Ro",
    "role": "Staff Engineer",
    "start_date": "Jan 2021",
    "end_date": "Apr 2025",
    "technologies": ["Python", "Django", "Medplum"]
  },
  "qdrant_id": "uuid-string",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

**`voice_examples`** — curated tone anchors

```json
{
  "text": "Led design, development, and maintenance of systems improving healthcare accessibility.",
  "context": "role_summary | achievement | summary",
  "source": "linkedin | manual | generated",
  "quality": "anchor | approved",
  "job_context": "staff_backend_ai",
  "created_at": "datetime"
}
```

**`voice_feedback`** — corrections and approvals from the feedback loop

```json
{
  "original_text": "Spearheaded cross-functional initiatives...",
  "final_text": "Led the clinical platform team...",
  "feedback_type": "approved | rejected | edited | flagged",
  "job_context": "staff_backend_ai",
  "note": "Too corporate. Keep it direct.",
  "job_application_id": "ObjectId",
  "qdrant_id": "uuid-string",
  "created_at": "datetime"
}
```

**`job_applications`** — tracker / lightweight ATS

```json
{
  "_id": "ObjectId",
  "user_id": "string",
  "company": "Quo",
  "job_title": "Staff Backend Engineer (AI)",
  "job_url": "https://...",
  "job_description": "full text",
  "tailored_resume": { "...Resume JSON..." },
  "evaluation_score": {
    "keyword_coverage": 0.92,
    "voice_match": 0.85,
    "relevance_ranking": 0.88,
    "overall": 0.88
  },
  "status": "saved | applied | interviewing | offered | rejected",
  "notes": "string",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### Qdrant

**Collection: `content`**

- Vectors: Voyage AI embeddings (1024 dimensions)
- Payload: `chunk_type`, `source`, `company`, `technologies`, `feedback_type`
- Filtering: by `source` (resume vs blog vs conversation), by `chunk_type`, by `feedback_type`

All content types (professional chunks, voice examples, voice feedback) go into the same collection. Filtered at query time by payload metadata.

---

## Prompt Architecture — Three Layers

### Layer 1: Strategy (static, expert knowledge)

Stored as a document in MongoDB `resume_strategy` collection. Editable without code changes.

```
You are a resume optimization expert. Follow these rules:
- Mirror keywords from the job description in bullet points (ATS optimization)
- Lead bullets with action verbs, not passive constructions
- Quantify impact where possible (numbers, percentages, scale)
- Front-load the most relevant experience in each section
- Match the job description's language register (startup vs enterprise)
- Ensure the top 5-7 keywords from the job description appear naturally
- Never fabricate experience, companies, titles, or dates
- Reorder and prioritize content by relevance to the job description
- Same facts, different framing — rewrite bullets to emphasize applicable skills
```

### Layer 2: Voice (dynamic, from feedback system)

Retrieved from Qdrant at tailoring time. Three sub-layers:

- **Anchor examples** (Layer 1 voice) — "This is how Nicholas writes"
- **Approved past output** — "These are examples Nicholas has approved for similar roles"
- **Anti-patterns** — "Do NOT write in this style" (rejected/flagged feedback)
- **Edit diffs** — "When you produce [original], adjust toward [edited]"

### Layer 3: Content (dynamic, from vector search)

- Retrieved chunks ranked by relevance to the job description
- Existing resume JSON as structural scaffolding (companies, titles, dates)

---

## Tailoring Pipeline — Four LLM Calls

### Step 1: ANALYZE (Haiku)

```
Input: raw job description text
Output: structured extraction
{
  "required_skills": ["distributed systems", "LLM orchestration", ...],
  "preferred_skills": ["Kubernetes", "event-driven", ...],
  "seniority": "staff",
  "domain": "ai_backend",
  "culture_signals": "startup, fast-moving, remote",
  "key_requirements": [
    "led architecture around LLM-powered systems",
    "low-latency real-time systems",
    "prompt engineering and evaluation"
  ]
}
```

### Step 2: RETRIEVE (Qdrant)

1. Embed the job description via Voyage AI
2. Search Qdrant with filters: `source in ["resume", "voice_feedback"]`
3. Boost results matching extracted `required_skills` and `domain`
4. Return top 20-30 chunks
5. Separately retrieve voice examples and relevant feedback (approved + rejected for similar `job_context`)

### Step 3: GENERATE (Sonnet)

Full system prompt assembled from strategy + voice + content:

```
[Strategy rules]
[Voice anchor examples]
[Approved examples for similar roles]
[Anti-pattern examples: "Do not write like this"]
[Edit diffs: "When you produce X, adjust toward Y"]

Job Description Analysis:
[structured extraction from Step 1]

Available Content (ranked by relevance):
[retrieved chunks with scores]

Current Resume Structure (dates/companies/titles — do not change):
[existing resume JSON]

Return a complete Resume JSON with tailored summary, reordered skills,
and rewritten bullet points optimized for this role.
```

### Step 4: EVALUATE (Haiku)

```
Input: tailored resume + job analysis from Step 1
Output: score breakdown
{
  "keyword_coverage": 0.92,    // % of required skills addressed
  "voice_match": 0.85,         // similarity to approved examples
  "relevance_ranking": 0.88,   // are most relevant items first?
  "ats_compatibility": 0.90,   // will a parser extract correctly?
  "overall": 0.89,
  "issues": ["missing 'prompt engineering' keyword", "summary could be more specific to AI"]
}
```

If `overall < 0.80`, regenerate with evaluator issues appended to the prompt. Max 2 retries.

---

## Feedback Loop

When the user reviews a tailored resume:

**Approve** — all differing bullets saved as voice examples with `quality: "approved"`, embedded in Qdrant

**Reject** — original output saved with `feedback_type: "rejected"`, embedded as anti-example

**Edit** — both original and edited versions saved as a diff pair, embedded with `feedback_type: "edited"`

**Flag** — specific phrase marked as problematic, embedded with `feedback_type: "flagged"`

All feedback is embedded in Qdrant and retrieved for future tailoring based on job similarity.

---

## API Endpoints

### Tailoring
- `POST /tailor` — accepts job description, runs the pipeline, returns tailored resume + scores

### Job Applications
- `GET /applications` — list all applications
- `POST /applications` — save application (job desc + tailored resume + scores)
- `PUT /applications/:id` — update status/notes
- `DELETE /applications/:id` — remove application

### Voice / Feedback
- `GET /voice/examples` — list voice examples
- `POST /voice/examples` — add manual voice example
- `POST /voice/feedback` — submit feedback on tailored output
- `GET /voice/feedback` — list feedback for curation
- `PUT /voice/feedback/:id` — reclassify feedback
- `DELETE /voice/feedback/:id` — remove feedback

### Content Management
- `GET /content/chunks` — list content chunks
- `POST /content/chunks` — add new content (auto-embeds)
- `PUT /content/chunks/:id` — update chunk (re-embeds)
- `DELETE /content/chunks/:id` — remove chunk from MongoDB + Qdrant
- `POST /content/seed` — seed from existing resume data

---

## Frontend — `/admin/tailor`

**Three tabs:**

### Tailor Tab
- Textarea: paste job description
- "Analyze & Tailor" button
- Loading state with step indicator (Analyzing → Retrieving → Generating → Evaluating)
- Score breakdown display (keyword coverage, voice match, relevance, ATS)
- Tailored resume preview (same layout as public `/resume` page)
- Download PDF / Download DOCX buttons (existing generators, fed tailored data)
- Feedback buttons: Approve / Edit / Reject / Flag
- Inline editing of bullets before approval

### Applications Tab
- Table: company, title, status, date, score
- Click to expand: full job description, tailored resume, notes
- Status dropdown: saved → applied → interviewing → offered → rejected
- Notes field

### Voice Tab
- Browse voice examples (anchor + approved)
- Browse feedback (approved, rejected, edited, flagged)
- Add new anchor examples manually
- Reclassify or delete entries
- Edit notes on any entry

---

## Seeding Pipeline

Python script (not committed) that:
1. Reads existing resume from MongoDB
2. Splits each role into chunks: one role_summary + one chunk per bullet
3. Creates skill_context chunks: each skill + where/how it was used
4. Creates education and meta chunks
5. Embeds all chunks via Voyage AI
6. Upserts to MongoDB `content_chunks` and Qdrant `content` collection
7. Seeds initial voice examples from LinkedIn descriptions

---

## Future: Personality LLM (shared infrastructure)

Same architecture, different filters and prompts:

```
Qdrant content collection:
  source: "resume"        → professional history (resume tailoring)
  source: "blog"          → published writing (both)
  source: "opinion"       → curated views on topics (personality)
  source: "conversation"  → approved past exchanges (personality)
  source: "voice_feedback" → style calibration (both)
```

The personality LLM adds:
- An evaluator that checks boundaries (is this something Nicholas would say?)
- Conversation memory (short-term context within a session)
- Content ingestion from blog posts and manually curated opinions

The resume tailoring project validates the full pipeline before the personality LLM needs it.

---

## Environment Variables (new)

```
ANTHROPIC_API_KEY     — Claude API access
VOYAGE_API_KEY        — Voyage AI embeddings
QDRANT_URL            — Qdrant Cloud endpoint
QDRANT_API_KEY        — Qdrant Cloud auth
```
