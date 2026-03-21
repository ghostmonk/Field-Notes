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
