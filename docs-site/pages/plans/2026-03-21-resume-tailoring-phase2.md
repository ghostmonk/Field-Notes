# Resume Tailoring Phase 2: LLM Pipeline Implementation Plan

**Goal:** Build the 4-step LLM tailoring pipeline (Analyze → Retrieve → Generate → Evaluate) that takes a job description and produces a tailored resume using Claude API, with a single POST endpoint.

**Architecture:** Three Anthropic API calls (Haiku for analysis + evaluation, Sonnet for generation) orchestrated by a pipeline service. The retrieval step uses the existing Voyage AI embedding + Qdrant vector search from Phase 1. The pipeline reads the user's current resume from MongoDB as structural scaffolding, retrieves relevant content chunks from Qdrant, and assembles a tailored resume JSON. A retry loop re-generates if evaluation score is below threshold.

**Tech Stack:** Python, FastAPI, anthropic SDK, Voyage AI (existing), Qdrant (existing), MongoDB (existing), pytest

---

### Task 1: Add anthropic dependency

**Files:**
- Modify: `backend/requirements.in`
- Regenerate: `backend/requirements.txt`

**Step 1: Add anthropic to requirements.in**

Add `anthropic` to the end of `backend/requirements.in`.

**Step 2: Regenerate requirements.txt**

```bash
cd backend && pip-compile requirements.in -o requirements.txt
```

**Step 3: Install in venv**

```bash
source ~/Documents/venvs/field-notes/bin/activate && pip install anthropic
```

**Step 4: Commit**

```bash
git add backend/requirements.in backend/requirements.txt
git commit -m "chore: add anthropic SDK dependency"
```

---

### Task 2: Job analysis service (Haiku)

**Files:**
- Create: `backend/services/job_analyzer.py`
- Create: `backend/tests/test_job_analyzer.py`

**Step 1: Write the failing test**

`backend/tests/test_job_analyzer.py`:
```python
"""Tests for job analysis service."""

import json
from unittest.mock import MagicMock, patch

import pytest

from services.job_analyzer import analyze_job_description


class TestJobAnalyzer:
    def test_returns_structured_analysis(self):
        """Test that analyze_job_description returns structured extraction."""
        mock_response = MagicMock()
        mock_response.content = [
            MagicMock(
                text=json.dumps(
                    {
                        "required_skills": ["Python", "distributed systems"],
                        "preferred_skills": ["Kubernetes"],
                        "seniority": "staff",
                        "domain": "backend",
                        "culture_signals": "startup, remote",
                        "key_requirements": [
                            "led architecture of distributed systems",
                        ],
                    }
                )
            )
        ]

        mock_client = MagicMock()
        mock_client.messages.create.return_value = mock_response

        with patch("services.job_analyzer._get_client", return_value=mock_client):
            result = analyze_job_description("We need a staff backend engineer...")

        assert result["required_skills"] == ["Python", "distributed systems"]
        assert result["seniority"] == "staff"
        mock_client.messages.create.assert_called_once()
        call_kwargs = mock_client.messages.create.call_args.kwargs
        assert call_kwargs["model"] == "claude-haiku-4-5-20251001"

    def test_raises_without_api_key(self):
        """Test that missing ANTHROPIC_API_KEY raises ValueError."""
        from services import job_analyzer

        job_analyzer._client = None

        with patch.dict("os.environ", {}, clear=True):
            with pytest.raises(ValueError, match="ANTHROPIC_API_KEY"):
                job_analyzer._get_client()

    def test_handles_malformed_json_response(self):
        """Test that malformed JSON from LLM raises ValueError."""
        mock_response = MagicMock()
        mock_response.content = [MagicMock(text="not valid json")]

        mock_client = MagicMock()
        mock_client.messages.create.return_value = mock_response

        with patch("services.job_analyzer._get_client", return_value=mock_client):
            with pytest.raises(ValueError, match="Failed to parse"):
                analyze_job_description("some job description")
```

**Step 2: Run test to verify it fails**

```bash
cd backend && python -m pytest tests/test_job_analyzer.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'services.job_analyzer'`

**Step 3: Write the implementation**

`backend/services/job_analyzer.py`:
```python
"""Job description analysis using Claude Haiku."""

import json
import os
import threading
from typing import Any, Dict

import anthropic

_client = None
_client_lock = threading.Lock()

ANALYSIS_SYSTEM_PROMPT = """You are a job description analyst. Extract structured information from the job description.

Return ONLY a JSON object with these exact keys:
- required_skills: list of strings — hard requirements explicitly stated
- preferred_skills: list of strings — nice-to-haves or "bonus" items
- seniority: string — one of "junior", "mid", "senior", "staff", "principal", "director"
- domain: string — short label like "backend", "frontend", "fullstack", "data", "ml", "devops", "ai_backend"
- culture_signals: string — comma-separated culture indicators (e.g. "startup, remote, fast-paced")
- key_requirements: list of strings — the 3-7 most important qualifications, rephrased as what the ideal candidate has done

Do not include any text outside the JSON object. No markdown fences."""


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        with _client_lock:
            if _client is None:
                api_key = os.getenv("ANTHROPIC_API_KEY")
                if not api_key:
                    raise ValueError(
                        "ANTHROPIC_API_KEY environment variable is required"
                    )
                _client = anthropic.Anthropic(api_key=api_key)
    return _client


def analyze_job_description(job_description: str) -> Dict[str, Any]:
    """Analyze a job description and extract structured requirements.

    Args:
        job_description: Raw job description text.

    Returns:
        Dict with required_skills, preferred_skills, seniority, domain,
        culture_signals, and key_requirements.

    Raises:
        ValueError: If LLM response cannot be parsed as JSON.
    """
    client = _get_client()

    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1024,
        system=ANALYSIS_SYSTEM_PROMPT,
        messages=[
            {"role": "user", "content": job_description},
        ],
    )

    raw_text = response.content[0].text.strip()

    # Strip markdown fences if present
    if raw_text.startswith("```"):
        lines = raw_text.split("\n")
        raw_text = "\n".join(lines[1:-1])

    try:
        return json.loads(raw_text)
    except json.JSONDecodeError as e:
        raise ValueError(f"Failed to parse job analysis response: {e}\nRaw: {raw_text}")
```

**Step 4: Run tests**

```bash
cd backend && python -m pytest tests/test_job_analyzer.py -v
```

Expected: 3 passed

**Step 5: Commit**

```bash
git add backend/services/job_analyzer.py backend/tests/test_job_analyzer.py
git commit -m "feat: add job description analyzer using Claude Haiku"
```

---

### Task 3: Resume generator service (Sonnet)

**Files:**
- Create: `backend/services/resume_generator.py`
- Create: `backend/tests/test_resume_generator.py`

**Step 1: Write the failing test**

`backend/tests/test_resume_generator.py`:
```python
"""Tests for resume generator service."""

import json
from unittest.mock import MagicMock, patch

import pytest

from services.resume_generator import generate_tailored_resume

SAMPLE_RESUME = {
    "contact": {"full_name": "Test User", "email": "test@example.com"},
    "summary": "Experienced engineer.",
    "work_experience": [
        {
            "company": "Acme",
            "title": "Staff Engineer",
            "start_date": "2020",
            "end_date": "2024",
            "current": False,
            "description": "- Built distributed systems.\n- Led platform team.",
            "technologies": ["Python", "Go"],
        }
    ],
    "education": [],
    "skills": ["Python", "Go", "Docker"],
    "achievements": [],
}

SAMPLE_ANALYSIS = {
    "required_skills": ["Python", "distributed systems"],
    "preferred_skills": ["Kubernetes"],
    "seniority": "staff",
    "domain": "backend",
    "culture_signals": "startup, remote",
    "key_requirements": ["led architecture of distributed systems"],
}

SAMPLE_CHUNKS = [
    {"text": "Staff Engineer at Acme: Built distributed systems.", "score": 0.95},
    {"text": "Python: used at Acme as Staff Engineer", "score": 0.90},
]


class TestResumeGenerator:
    def test_returns_tailored_resume_json(self):
        """Test that generate_tailored_resume returns a resume dict."""
        tailored = {**SAMPLE_RESUME, "summary": "Tailored summary for backend role."}

        mock_response = MagicMock()
        mock_response.content = [MagicMock(text=json.dumps(tailored))]

        mock_client = MagicMock()
        mock_client.messages.create.return_value = mock_response

        with patch("services.resume_generator._get_client", return_value=mock_client):
            result = generate_tailored_resume(
                resume=SAMPLE_RESUME,
                analysis=SAMPLE_ANALYSIS,
                chunks=SAMPLE_CHUNKS,
            )

        assert result["summary"] == "Tailored summary for backend role."
        call_kwargs = mock_client.messages.create.call_args.kwargs
        assert call_kwargs["model"] == "claude-sonnet-4-6"

    def test_passes_resume_and_chunks_in_prompt(self):
        """Test that the prompt contains resume data and retrieved chunks."""
        mock_response = MagicMock()
        mock_response.content = [MagicMock(text=json.dumps(SAMPLE_RESUME))]

        mock_client = MagicMock()
        mock_client.messages.create.return_value = mock_response

        with patch("services.resume_generator._get_client", return_value=mock_client):
            generate_tailored_resume(
                resume=SAMPLE_RESUME,
                analysis=SAMPLE_ANALYSIS,
                chunks=SAMPLE_CHUNKS,
            )

        call_kwargs = mock_client.messages.create.call_args.kwargs
        user_msg = call_kwargs["messages"][0]["content"]
        assert "Acme" in user_msg
        assert "distributed systems" in user_msg

    def test_includes_evaluator_feedback_when_provided(self):
        """Test that evaluator issues are appended to the prompt on retry."""
        mock_response = MagicMock()
        mock_response.content = [MagicMock(text=json.dumps(SAMPLE_RESUME))]

        mock_client = MagicMock()
        mock_client.messages.create.return_value = mock_response

        with patch("services.resume_generator._get_client", return_value=mock_client):
            generate_tailored_resume(
                resume=SAMPLE_RESUME,
                analysis=SAMPLE_ANALYSIS,
                chunks=SAMPLE_CHUNKS,
                evaluator_feedback=["missing 'Kubernetes' keyword", "summary too generic"],
            )

        call_kwargs = mock_client.messages.create.call_args.kwargs
        user_msg = call_kwargs["messages"][0]["content"]
        assert "missing 'Kubernetes' keyword" in user_msg
        assert "summary too generic" in user_msg

    def test_handles_malformed_json(self):
        """Test that malformed JSON from LLM raises ValueError."""
        mock_response = MagicMock()
        mock_response.content = [MagicMock(text="not json")]

        mock_client = MagicMock()
        mock_client.messages.create.return_value = mock_response

        with patch("services.resume_generator._get_client", return_value=mock_client):
            with pytest.raises(ValueError, match="Failed to parse"):
                generate_tailored_resume(
                    resume=SAMPLE_RESUME,
                    analysis=SAMPLE_ANALYSIS,
                    chunks=SAMPLE_CHUNKS,
                )
```

**Step 2: Run test to verify it fails**

```bash
cd backend && python -m pytest tests/test_resume_generator.py -v
```

Expected: FAIL — `ModuleNotFoundError`

**Step 3: Write the implementation**

`backend/services/resume_generator.py`:
```python
"""Resume generation using Claude Sonnet."""

import json
import os
import threading
from typing import Any, Dict, List, Optional

import anthropic

_client = None
_client_lock = threading.Lock()

STRATEGY_PROMPT = """You are a resume optimization expert. Follow these rules:
- Mirror keywords from the job description in bullet points (ATS optimization)
- Lead bullets with action verbs, not passive constructions
- Quantify impact where possible (numbers, percentages, scale)
- Front-load the most relevant experience in each section
- Match the job description's language register (startup vs enterprise)
- Ensure the top 5-7 keywords from the job description appear naturally
- Never fabricate experience, companies, titles, or dates
- Reorder and prioritize content by relevance to the job description
- Same facts, different framing — rewrite bullets to emphasize applicable skills
- Keep the summary to 2-3 sentences, specific to this role
- Do not use inflated language like "spearheaded", "synergized", "leveraged"
- Write in direct, active voice

Return ONLY a valid JSON object matching the exact Resume schema provided. No markdown fences, no commentary."""


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        with _client_lock:
            if _client is None:
                api_key = os.getenv("ANTHROPIC_API_KEY")
                if not api_key:
                    raise ValueError(
                        "ANTHROPIC_API_KEY environment variable is required"
                    )
                _client = anthropic.Anthropic(api_key=api_key)
    return _client


def generate_tailored_resume(
    resume: Dict[str, Any],
    analysis: Dict[str, Any],
    chunks: List[Dict[str, Any]],
    evaluator_feedback: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """Generate a tailored resume using Claude Sonnet.

    Args:
        resume: Current resume JSON (structural scaffolding — companies, titles, dates are fixed).
        analysis: Structured job analysis from analyze_job_description().
        chunks: Retrieved content chunks from Qdrant with relevance scores.
        evaluator_feedback: Optional list of issues from a previous evaluation (retry loop).

    Returns:
        Tailored resume as a dict matching the Resume schema.

    Raises:
        ValueError: If LLM response cannot be parsed as JSON.
    """
    client = _get_client()

    # Build the user prompt with all context
    chunks_text = "\n".join(
        f"- [{c.get('score', 0):.2f}] {c['text']}" for c in chunks
    )

    user_content = f"""Job Description Analysis:
{json.dumps(analysis, indent=2)}

Available Content (ranked by relevance to this job):
{chunks_text}

Current Resume (dates, companies, titles are fixed — do not change these):
{json.dumps(resume, indent=2)}

Return a complete Resume JSON with:
- Tailored summary specific to this role
- Rewritten bullet points emphasizing relevant experience
- Skills reordered by relevance to the job
- Same structure, same companies/titles/dates — different framing"""

    if evaluator_feedback:
        feedback_text = "\n".join(f"- {issue}" for issue in evaluator_feedback)
        user_content += f"""

IMPORTANT — Previous evaluation found these issues. Fix them:
{feedback_text}"""

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        system=STRATEGY_PROMPT,
        messages=[
            {"role": "user", "content": user_content},
        ],
    )

    raw_text = response.content[0].text.strip()

    if raw_text.startswith("```"):
        lines = raw_text.split("\n")
        raw_text = "\n".join(lines[1:-1])

    try:
        return json.loads(raw_text)
    except json.JSONDecodeError as e:
        raise ValueError(f"Failed to parse generated resume: {e}\nRaw: {raw_text[:500]}")
```

**Step 4: Run tests**

```bash
cd backend && python -m pytest tests/test_resume_generator.py -v
```

Expected: 4 passed

**Step 5: Commit**

```bash
git add backend/services/resume_generator.py backend/tests/test_resume_generator.py
git commit -m "feat: add resume generator using Claude Sonnet"
```

---

### Task 4: Resume evaluator service (Haiku)

**Files:**
- Create: `backend/services/resume_evaluator.py`
- Create: `backend/tests/test_resume_evaluator.py`

**Step 1: Write the failing test**

`backend/tests/test_resume_evaluator.py`:
```python
"""Tests for resume evaluator service."""

import json
from unittest.mock import MagicMock, patch

import pytest

from services.resume_evaluator import evaluate_resume


SAMPLE_ANALYSIS = {
    "required_skills": ["Python", "distributed systems"],
    "preferred_skills": ["Kubernetes"],
    "seniority": "staff",
    "domain": "backend",
    "culture_signals": "startup, remote",
    "key_requirements": ["led architecture of distributed systems"],
}

SAMPLE_RESUME = {
    "contact": {"full_name": "Test User"},
    "summary": "Staff backend engineer with distributed systems experience.",
    "work_experience": [],
    "skills": ["Python", "distributed systems"],
}


class TestResumeEvaluator:
    def test_returns_score_breakdown(self):
        """Test that evaluate_resume returns scores and issues."""
        mock_response = MagicMock()
        mock_response.content = [
            MagicMock(
                text=json.dumps(
                    {
                        "keyword_coverage": 0.92,
                        "relevance_ranking": 0.88,
                        "ats_compatibility": 0.90,
                        "overall": 0.90,
                        "issues": [],
                    }
                )
            )
        ]

        mock_client = MagicMock()
        mock_client.messages.create.return_value = mock_response

        with patch("services.resume_evaluator._get_client", return_value=mock_client):
            result = evaluate_resume(
                tailored_resume=SAMPLE_RESUME,
                analysis=SAMPLE_ANALYSIS,
            )

        assert result["overall"] == 0.90
        assert result["keyword_coverage"] == 0.92
        assert isinstance(result["issues"], list)
        call_kwargs = mock_client.messages.create.call_args.kwargs
        assert call_kwargs["model"] == "claude-haiku-4-5-20251001"

    def test_returns_issues_when_score_low(self):
        """Test that low-scoring evaluations include issue descriptions."""
        mock_response = MagicMock()
        mock_response.content = [
            MagicMock(
                text=json.dumps(
                    {
                        "keyword_coverage": 0.60,
                        "relevance_ranking": 0.70,
                        "ats_compatibility": 0.80,
                        "overall": 0.70,
                        "issues": [
                            "missing 'Kubernetes' keyword",
                            "summary too generic for staff role",
                        ],
                    }
                )
            )
        ]

        mock_client = MagicMock()
        mock_client.messages.create.return_value = mock_response

        with patch("services.resume_evaluator._get_client", return_value=mock_client):
            result = evaluate_resume(
                tailored_resume=SAMPLE_RESUME,
                analysis=SAMPLE_ANALYSIS,
            )

        assert result["overall"] == 0.70
        assert len(result["issues"]) == 2

    def test_handles_malformed_json(self):
        """Test that malformed JSON from LLM raises ValueError."""
        mock_response = MagicMock()
        mock_response.content = [MagicMock(text="not json")]

        mock_client = MagicMock()
        mock_client.messages.create.return_value = mock_response

        with patch("services.resume_evaluator._get_client", return_value=mock_client):
            with pytest.raises(ValueError, match="Failed to parse"):
                evaluate_resume(
                    tailored_resume=SAMPLE_RESUME,
                    analysis=SAMPLE_ANALYSIS,
                )
```

**Step 2: Run test to verify it fails**

```bash
cd backend && python -m pytest tests/test_resume_evaluator.py -v
```

Expected: FAIL — `ModuleNotFoundError`

**Step 3: Write the implementation**

`backend/services/resume_evaluator.py`:
```python
"""Resume evaluation using Claude Haiku."""

import json
import os
import threading
from typing import Any, Dict

import anthropic

_client = None
_client_lock = threading.Lock()

EVALUATION_SYSTEM_PROMPT = """You are a resume evaluation expert. Score a tailored resume against the original job requirements.

Return ONLY a JSON object with these exact keys:
- keyword_coverage: float 0-1 — what fraction of required_skills appear in the resume
- relevance_ranking: float 0-1 — are the most relevant experiences listed first
- ats_compatibility: float 0-1 — will a standard ATS parser extract this correctly
- overall: float 0-1 — weighted average (keyword_coverage 0.4, relevance_ranking 0.3, ats_compatibility 0.3)
- issues: list of strings — specific, actionable problems to fix (empty if overall >= 0.80)

Be strict. A generic summary that doesn't mention the specific role or domain scores low on relevance.
A resume missing 2+ required skills scores below 0.80 on keyword_coverage.

No markdown fences, no commentary outside the JSON."""


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        with _client_lock:
            if _client is None:
                api_key = os.getenv("ANTHROPIC_API_KEY")
                if not api_key:
                    raise ValueError(
                        "ANTHROPIC_API_KEY environment variable is required"
                    )
                _client = anthropic.Anthropic(api_key=api_key)
    return _client


def evaluate_resume(
    tailored_resume: Dict[str, Any],
    analysis: Dict[str, Any],
) -> Dict[str, Any]:
    """Evaluate a tailored resume against job requirements.

    Args:
        tailored_resume: The generated resume JSON.
        analysis: Structured job analysis from analyze_job_description().

    Returns:
        Dict with keyword_coverage, relevance_ranking, ats_compatibility,
        overall, and issues.

    Raises:
        ValueError: If LLM response cannot be parsed as JSON.
    """
    client = _get_client()

    user_content = f"""Job Requirements:
{json.dumps(analysis, indent=2)}

Tailored Resume:
{json.dumps(tailored_resume, indent=2)}

Evaluate this resume against the job requirements."""

    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1024,
        system=EVALUATION_SYSTEM_PROMPT,
        messages=[
            {"role": "user", "content": user_content},
        ],
    )

    raw_text = response.content[0].text.strip()

    if raw_text.startswith("```"):
        lines = raw_text.split("\n")
        raw_text = "\n".join(lines[1:-1])

    try:
        return json.loads(raw_text)
    except json.JSONDecodeError as e:
        raise ValueError(f"Failed to parse evaluation response: {e}\nRaw: {raw_text}")
```

**Step 4: Run tests**

```bash
cd backend && python -m pytest tests/test_resume_evaluator.py -v
```

Expected: 3 passed

**Step 5: Commit**

```bash
git add backend/services/resume_evaluator.py backend/tests/test_resume_evaluator.py
git commit -m "feat: add resume evaluator using Claude Haiku"
```

---

### Task 5: Tailoring pipeline orchestrator

**Files:**
- Create: `backend/services/tailoring_pipeline.py`
- Create: `backend/tests/test_tailoring_pipeline.py`

This is the orchestrator that wires Analyze → Retrieve → Generate → Evaluate into a single flow with retry logic.

**Step 1: Write the failing test**

`backend/tests/test_tailoring_pipeline.py`:
```python
"""Tests for the tailoring pipeline orchestrator."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from services.tailoring_pipeline import run_tailoring_pipeline


SAMPLE_RESUME_DOC = {
    "_id": "abc123",
    "contact": {"full_name": "Test User", "email": "test@example.com"},
    "summary": "Experienced engineer.",
    "work_experience": [
        {
            "company": "Acme",
            "title": "Staff Engineer",
            "start_date": "2020",
            "end_date": "2024",
            "current": False,
            "description": "- Built distributed systems.",
            "technologies": ["Python"],
        }
    ],
    "education": [],
    "skills": ["Python"],
    "achievements": [],
    "user_id": "user-1",
}

SAMPLE_ANALYSIS = {
    "required_skills": ["Python"],
    "preferred_skills": [],
    "seniority": "staff",
    "domain": "backend",
    "culture_signals": "startup",
    "key_requirements": ["distributed systems"],
}

SAMPLE_CHUNKS = [
    {
        "id": "pt-1",
        "score": 0.95,
        "payload": {
            "text": "Built distributed systems.",
            "chunk_type": "achievement",
            "source": "resume",
            "company": "Acme",
        },
    }
]

SAMPLE_TAILORED = {
    "contact": {"full_name": "Test User", "email": "test@example.com"},
    "summary": "Tailored summary.",
    "work_experience": SAMPLE_RESUME_DOC["work_experience"],
    "education": [],
    "skills": ["Python"],
    "achievements": [],
}

GOOD_EVALUATION = {
    "keyword_coverage": 0.95,
    "relevance_ranking": 0.90,
    "ats_compatibility": 0.92,
    "overall": 0.92,
    "issues": [],
}


class TestTailoringPipeline:
    @pytest.mark.asyncio
    async def test_full_pipeline_success(self):
        """Test the full pipeline returns tailored resume and scores."""
        mock_collection = MagicMock()
        mock_collection.find_one = AsyncMock(return_value=SAMPLE_RESUME_DOC)

        with (
            patch(
                "services.tailoring_pipeline.analyze_job_description",
                return_value=SAMPLE_ANALYSIS,
            ),
            patch(
                "services.tailoring_pipeline.embed_query",
                return_value=[0.1, 0.2],
            ),
            patch(
                "services.tailoring_pipeline.search",
                return_value=SAMPLE_CHUNKS,
            ),
            patch(
                "services.tailoring_pipeline.generate_tailored_resume",
                return_value=SAMPLE_TAILORED,
            ),
            patch(
                "services.tailoring_pipeline.evaluate_resume",
                return_value=GOOD_EVALUATION,
            ),
        ):
            result = await run_tailoring_pipeline(
                job_description="Staff backend engineer needed...",
                user_id="user-1",
                resumes_collection=mock_collection,
            )

        assert result["tailored_resume"]["summary"] == "Tailored summary."
        assert result["evaluation"]["overall"] == 0.92
        assert result["analysis"]["seniority"] == "staff"

    @pytest.mark.asyncio
    async def test_retries_when_score_below_threshold(self):
        """Test that pipeline retries generation when evaluation score < 0.80."""
        mock_collection = MagicMock()
        mock_collection.find_one = AsyncMock(return_value=SAMPLE_RESUME_DOC)

        low_eval = {
            "keyword_coverage": 0.60,
            "relevance_ranking": 0.65,
            "ats_compatibility": 0.70,
            "overall": 0.65,
            "issues": ["missing keyword X"],
        }

        generate_mock = MagicMock(return_value=SAMPLE_TAILORED)
        evaluate_mock = MagicMock(side_effect=[low_eval, GOOD_EVALUATION])

        with (
            patch(
                "services.tailoring_pipeline.analyze_job_description",
                return_value=SAMPLE_ANALYSIS,
            ),
            patch(
                "services.tailoring_pipeline.embed_query",
                return_value=[0.1, 0.2],
            ),
            patch(
                "services.tailoring_pipeline.search",
                return_value=SAMPLE_CHUNKS,
            ),
            patch(
                "services.tailoring_pipeline.generate_tailored_resume",
                generate_mock,
            ),
            patch(
                "services.tailoring_pipeline.evaluate_resume",
                evaluate_mock,
            ),
        ):
            result = await run_tailoring_pipeline(
                job_description="job desc",
                user_id="user-1",
                resumes_collection=mock_collection,
            )

        assert generate_mock.call_count == 2
        assert evaluate_mock.call_count == 2
        # Second generate call should include feedback
        second_call = generate_mock.call_args_list[1]
        assert second_call.kwargs["evaluator_feedback"] == ["missing keyword X"]

    @pytest.mark.asyncio
    async def test_stops_retrying_after_max_attempts(self):
        """Test that pipeline stops after max_retries even if score stays low."""
        mock_collection = MagicMock()
        mock_collection.find_one = AsyncMock(return_value=SAMPLE_RESUME_DOC)

        low_eval = {
            "keyword_coverage": 0.50,
            "relevance_ranking": 0.50,
            "ats_compatibility": 0.50,
            "overall": 0.50,
            "issues": ["everything is wrong"],
        }

        with (
            patch(
                "services.tailoring_pipeline.analyze_job_description",
                return_value=SAMPLE_ANALYSIS,
            ),
            patch(
                "services.tailoring_pipeline.embed_query",
                return_value=[0.1, 0.2],
            ),
            patch(
                "services.tailoring_pipeline.search",
                return_value=SAMPLE_CHUNKS,
            ),
            patch(
                "services.tailoring_pipeline.generate_tailored_resume",
                return_value=SAMPLE_TAILORED,
            ),
            patch(
                "services.tailoring_pipeline.evaluate_resume",
                return_value=low_eval,
            ),
        ):
            result = await run_tailoring_pipeline(
                job_description="job desc",
                user_id="user-1",
                resumes_collection=mock_collection,
            )

        # Returns best attempt even if below threshold
        assert result["evaluation"]["overall"] == 0.50

    @pytest.mark.asyncio
    async def test_raises_when_no_resume_found(self):
        """Test that pipeline raises 404-style error when user has no resume."""
        mock_collection = MagicMock()
        mock_collection.find_one = AsyncMock(return_value=None)

        with pytest.raises(ValueError, match="No resume found"):
            await run_tailoring_pipeline(
                job_description="job desc",
                user_id="user-1",
                resumes_collection=mock_collection,
            )
```

**Step 2: Run test to verify it fails**

```bash
cd backend && python -m pytest tests/test_tailoring_pipeline.py -v
```

Expected: FAIL — `ModuleNotFoundError`

**Step 3: Write the implementation**

`backend/services/tailoring_pipeline.py`:
```python
"""Orchestrates the full resume tailoring pipeline."""

import asyncio
from typing import Any, Dict

from motor.motor_asyncio import AsyncIOMotorCollection

from services.embedding import embed_query
from services.job_analyzer import analyze_job_description
from services.resume_evaluator import evaluate_resume
from services.resume_generator import generate_tailored_resume
from services.vector_store import search

SCORE_THRESHOLD = 0.80
MAX_RETRIES = 2


async def run_tailoring_pipeline(
    job_description: str,
    user_id: str,
    resumes_collection: AsyncIOMotorCollection,
) -> Dict[str, Any]:
    """Run the full tailoring pipeline: Analyze → Retrieve → Generate → Evaluate.

    Args:
        job_description: Raw job description text.
        user_id: The authenticated user's ID.
        resumes_collection: MongoDB resumes collection.

    Returns:
        Dict with keys: analysis, tailored_resume, evaluation, attempts.

    Raises:
        ValueError: If user has no resume.
    """
    # Fetch current resume
    resume_doc = await resumes_collection.find_one(
        {"user_id": user_id, "deleted": {"$ne": True}}
    )
    if not resume_doc:
        raise ValueError("No resume found for this user")

    # Strip MongoDB internal fields for the LLM
    resume = {
        k: v
        for k, v in resume_doc.items()
        if k not in ("_id", "user_id", "createdDate", "updatedDate", "deleted")
    }

    # Step 1: Analyze job description (sync call, run in thread)
    analysis = await asyncio.to_thread(analyze_job_description, job_description)

    # Step 2: Retrieve relevant chunks
    query_embedding = await asyncio.to_thread(embed_query, job_description)
    raw_results = await asyncio.to_thread(
        search,
        query_vector=query_embedding,
        limit=25,
        source_filter="resume",
    )

    chunks = [
        {"text": r["payload"].get("text", ""), "score": r["score"]}
        for r in raw_results
    ]

    # Step 3 + 4: Generate and Evaluate with retry loop
    evaluator_feedback = None
    best_result = None

    for attempt in range(1 + MAX_RETRIES):
        tailored = await asyncio.to_thread(
            generate_tailored_resume,
            resume=resume,
            analysis=analysis,
            chunks=chunks,
            evaluator_feedback=evaluator_feedback,
        )

        evaluation = await asyncio.to_thread(
            evaluate_resume,
            tailored_resume=tailored,
            analysis=analysis,
        )

        best_result = {
            "analysis": analysis,
            "tailored_resume": tailored,
            "evaluation": evaluation,
            "attempts": attempt + 1,
        }

        if evaluation.get("overall", 0) >= SCORE_THRESHOLD:
            break

        evaluator_feedback = evaluation.get("issues", [])

    return best_result
```

**Step 4: Run tests**

```bash
cd backend && python -m pytest tests/test_tailoring_pipeline.py -v
```

Expected: 4 passed

**Step 5: Commit**

```bash
git add backend/services/tailoring_pipeline.py backend/tests/test_tailoring_pipeline.py
git commit -m "feat: add tailoring pipeline orchestrator with retry loop"
```

---

### Task 6: POST /tailor endpoint

**Files:**
- Create: `backend/handlers/tailor.py`
- Modify: `backend/app.py` — register router
- Modify: `backend/tests/conftest.py` — register router in test_app
- Create: `backend/tests/test_tailor_api.py`

**Step 1: Write the failing test**

`backend/tests/test_tailor_api.py`:
```python
"""Tests for the tailor endpoint."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest


SAMPLE_PIPELINE_RESULT = {
    "analysis": {
        "required_skills": ["Python"],
        "preferred_skills": [],
        "seniority": "staff",
        "domain": "backend",
        "culture_signals": "startup",
        "key_requirements": ["distributed systems"],
    },
    "tailored_resume": {
        "contact": {"full_name": "Test User"},
        "summary": "Tailored summary.",
        "work_experience": [],
        "education": [],
        "skills": ["Python"],
        "achievements": [],
    },
    "evaluation": {
        "keyword_coverage": 0.95,
        "relevance_ranking": 0.90,
        "ats_compatibility": 0.92,
        "overall": 0.92,
        "issues": [],
    },
    "attempts": 1,
}


class TestTailorEndpoint:
    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_tailor_requires_auth(self, async_client):
        """Test POST /tailor without auth returns 401."""
        response = await async_client.post(
            "/tailor", json={"job_description": "test"}
        )
        assert response.status_code == 401

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_tailor_returns_tailored_resume(
        self, async_client, override_database, mock_auth, auth_headers
    ):
        """Test POST /tailor returns tailored resume with scores."""
        with patch(
            "handlers.tailor.run_tailoring_pipeline",
            new_callable=AsyncMock,
            return_value=SAMPLE_PIPELINE_RESULT,
        ):
            response = await async_client.post(
                "/tailor",
                json={"job_description": "We need a staff backend engineer..."},
                headers=auth_headers,
            )

        assert response.status_code == 200
        data = response.json()
        assert data["tailored_resume"]["summary"] == "Tailored summary."
        assert data["evaluation"]["overall"] == 0.92
        assert data["attempts"] == 1

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_tailor_validates_empty_job_description(
        self, async_client, override_database, mock_auth, auth_headers
    ):
        """Test POST /tailor rejects empty job description."""
        response = await async_client.post(
            "/tailor",
            json={"job_description": ""},
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_tailor_returns_503_without_api_keys(
        self, async_client, override_database, mock_auth, auth_headers
    ):
        """Test POST /tailor returns 503 when API keys not configured."""
        with patch.dict("os.environ", {"ANTHROPIC_API_KEY": "", "QDRANT_URL": ""}, clear=False):
            with patch(
                "handlers.tailor.run_tailoring_pipeline",
                new_callable=AsyncMock,
                side_effect=ValueError("ANTHROPIC_API_KEY environment variable is required"),
            ):
                response = await async_client.post(
                    "/tailor",
                    json={"job_description": "some job"},
                    headers=auth_headers,
                )
        assert response.status_code == 503

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_tailor_returns_404_when_no_resume(
        self, async_client, override_database, mock_auth, auth_headers
    ):
        """Test POST /tailor returns 404 when user has no resume."""
        with patch(
            "handlers.tailor.run_tailoring_pipeline",
            new_callable=AsyncMock,
            side_effect=ValueError("No resume found for this user"),
        ):
            response = await async_client.post(
                "/tailor",
                json={"job_description": "some job"},
                headers=auth_headers,
            )
        assert response.status_code == 404
```

**Step 2: Run test to verify it fails**

```bash
cd backend && python -m pytest tests/test_tailor_api.py -v
```

Expected: FAIL — `ModuleNotFoundError`

**Step 3: Write the handler**

`backend/handlers/tailor.py`:
```python
"""API handler for resume tailoring."""

from database import get_resumes_collection
from decorators.auth import requires_auth
from fastapi import APIRouter, Depends, HTTPException, Request
from glogger import logger
from middleware.rate_limit import limiter
from models.user import UserInfo
from motor.motor_asyncio import AsyncIOMotorCollection
from pydantic import BaseModel, Field
from services.tailoring_pipeline import run_tailoring_pipeline

router = APIRouter()


class TailorRequest(BaseModel):
    job_description: str = Field(..., min_length=1, max_length=50000)


@router.post("/tailor")
@limiter.limit("5/minute")
@requires_auth
async def tailor_resume(
    request: Request,
    body: TailorRequest,
    collection: AsyncIOMotorCollection = Depends(get_resumes_collection),
):
    """Tailor a resume to a job description using the LLM pipeline."""
    user: UserInfo = request.state.user

    try:
        logger.info_with_context(
            "Starting resume tailoring",
            {"user_id": user.id, "job_desc_length": len(body.job_description)},
        )

        result = await run_tailoring_pipeline(
            job_description=body.job_description,
            user_id=user.id,
            resumes_collection=collection,
        )

        logger.info_with_context(
            "Resume tailoring complete",
            {
                "user_id": user.id,
                "overall_score": result["evaluation"].get("overall"),
                "attempts": result["attempts"],
            },
        )

        return result

    except ValueError as e:
        error_msg = str(e)
        if "No resume found" in error_msg:
            raise HTTPException(status_code=404, detail="No resume found. Create a resume first.")
        if "environment variable is required" in error_msg:
            raise HTTPException(status_code=503, detail="Tailoring service is not configured")
        raise HTTPException(status_code=500, detail="Tailoring failed")
    except HTTPException:
        raise
    except Exception as e:
        logger.exception_with_context(
            "Error during resume tailoring",
            {
                "user_id": user.id,
                "error_type": type(e).__name__,
                "error_details": str(e),
            },
        )
        raise HTTPException(status_code=500, detail="Tailoring failed")
```

**Step 4: Register router in app.py**

Add to `backend/app.py` imports:
```python
from handlers.tailor import router as tailor_router
```

Add to router includes (after `content_router`):
```python
app.include_router(tailor_router)
```

**Step 5: Register router in test conftest**

Add to `backend/tests/conftest.py` imports:
```python
from handlers.tailor import router as tailor_router
```

Add to test_app includes:
```python
test_app.include_router(tailor_router)
```

**Step 6: Run tests**

```bash
cd backend && python -m pytest tests/test_tailor_api.py -v
```

Expected: 5 passed

**Step 7: Run full test suite**

```bash
cd backend && python -m pytest -v
```

Expected: all existing tests still pass

**Step 8: Format and commit**

```bash
make format
git add backend/handlers/tailor.py backend/app.py backend/tests/conftest.py backend/tests/test_tailor_api.py
git commit -m "feat: add POST /tailor endpoint for resume tailoring"
```

---

### Task 7: Add ANTHROPIC_API_KEY to deploy config

**Files:**
- Modify: `.github/workflows/deploy.yml`

**Step 1: Add the secret to deploy.yml**

Find the backend `--set-env-vars` line and add `ANTHROPIC_API_KEY=${{ secrets.ANTHROPIC_API_KEY }}`.

**Step 2: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "chore: add ANTHROPIC_API_KEY to Cloud Run deploy config"
```

---

### Task 8: Add GitHub contribution graph plan + update _meta.ts

**Files:**
- Already present: `docs-site/pages/plans/2026-03-15-github-contribution-graph.md`
- Modify: `docs-site/pages/plans/_meta.ts`

**Step 1: Update _meta.ts**

Add entry for the contribution graph plan and this phase 2 plan:
```
'2026-03-21-resume-tailoring-phase2': 'Resume Tailoring Phase 2',
'2026-03-15-github-contribution-graph': 'GitHub Contribution Graph',
```

**Step 2: Commit**

```bash
git add docs-site/pages/plans/2026-03-15-github-contribution-graph.md docs-site/pages/plans/2026-03-21-resume-tailoring-phase2.md docs-site/pages/plans/_meta.ts
git commit -m "docs: add contribution graph plan and tailoring phase 2 plan"
```

---

### Task 9: Format check and full verification

**Step 1: Format**

```bash
make format
```

**Step 2: Run all backend tests**

```bash
make test
```

Expected: all tests pass (existing + new)

**Step 3: Run frontend tests**

```bash
make test-frontend-unit
```

Expected: all pass (no frontend changes in this phase)

**Step 4: Final commit if format made changes**

```bash
git add -A && git commit -m "chore: format"
```

(Skip if format made no changes.)
