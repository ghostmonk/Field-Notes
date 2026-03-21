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
            "work_experience": [
                {
                    "company": "Acme",
                    "title": "Engineer",
                    "start_date": "2020",
                    "end_date": "2023",
                    "current": False,
                    "description": "Led the platform team.\n\n- Built APIs.\n- Scaled systems.",
                    "technologies": ["Python"],
                }
            ],
        }
        chunks = chunk_resume(resume)
        summaries = [c for c in chunks if c["chunk_type"] == "role_summary"]
        assert len(summaries) == 1
        assert "Led the platform team" in summaries[0]["text"]

    def test_chunks_work_experience_bullets(self):
        """Test that bullet points become individual achievement chunks."""
        resume = {
            "contact": {"full_name": "Test User"},
            "work_experience": [
                {
                    "company": "Acme",
                    "title": "Engineer",
                    "start_date": "2020",
                    "current": True,
                    "description": "- Built APIs.\n- Scaled systems.",
                    "technologies": [],
                }
            ],
        }
        chunks = chunk_resume(resume)
        achievements = [c for c in chunks if c["chunk_type"] == "achievement"]
        assert len(achievements) == 2
        assert "Built APIs" in achievements[0]["text"]

    def test_chunks_skill_context(self):
        """Test that technologies create skill_context chunks."""
        resume = {
            "contact": {"full_name": "Test User"},
            "work_experience": [
                {
                    "company": "Acme",
                    "title": "Engineer",
                    "start_date": "2020",
                    "current": True,
                    "description": "",
                    "technologies": ["Python", "Go"],
                }
            ],
        }
        chunks = chunk_resume(resume)
        skills = [c for c in chunks if c["chunk_type"] == "skill_context"]
        assert len(skills) == 2
        assert "Python" in skills[0]["text"]

    def test_chunks_education(self):
        """Test that education entries are chunked."""
        resume = {
            "contact": {"full_name": "Test User"},
            "education": [
                {
                    "institution": "MIT",
                    "degree": "MSc",
                    "field_of_study": "CS",
                    "start_date": "2015",
                    "end_date": "2017",
                }
            ],
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
            "work_experience": [
                {
                    "company": "Acme",
                    "title": "Engineer",
                    "start_date": "2020",
                    "current": True,
                    "description": "- Built APIs.",
                    "technologies": ["Python"],
                }
            ],
        }
        chunks = chunk_resume(resume)
        achievement = [c for c in chunks if c["chunk_type"] == "achievement"][0]
        assert achievement["metadata"]["company"] == "Acme"
        assert "Python" in achievement["metadata"]["technologies"]
