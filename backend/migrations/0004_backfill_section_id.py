"""
Backfill section_id on existing content.
- Stories -> blog section
- Projects -> projects section
- Pages -> about or contact section (based on page_type)
"""

import pymongo

name = "0004_backfill_section_id"
dependencies = ["0003_seed_initial_sections"]

REQUIRED_SECTIONS = ["blog", "projects", "about", "contact"]


def _get_section(sections_coll, slug: str):
    """Look up a section by slug. Raises ValueError if not found."""
    section = sections_coll.find_one({"slug": slug, "is_deleted": False})
    if not section:
        raise ValueError(
            f"Required section '{slug}' not found. "
            "Run migration 0003_seed_initial_sections first."
        )
    return section


def upgrade(db: "pymongo.database.Database"):
    sections = db["sections"]

    blog = _get_section(sections, "blog")
    projects_section = _get_section(sections, "projects")
    about = _get_section(sections, "about")
    contact = _get_section(sections, "contact")

    # Stories -> blog (store as ObjectId for native MongoDB indexing)
    db["stories"].update_many(
        {"section_id": {"$exists": False}},
        {"$set": {"section_id": blog["_id"]}},
    )

    # Projects -> projects
    db["projects"].update_many(
        {"section_id": {"$exists": False}},
        {"$set": {"section_id": projects_section["_id"]}},
    )

    # Pages -> about/contact by page_type
    db["pages"].update_many(
        {"page_type": "about", "section_id": {"$exists": False}},
        {"$set": {"section_id": about["_id"]}},
    )

    db["pages"].update_many(
        {"page_type": "contact", "section_id": {"$exists": False}},
        {"$set": {"section_id": contact["_id"]}},
    )


def downgrade(db: "pymongo.database.Database"):
    db["stories"].update_many({}, {"$unset": {"section_id": ""}})
    db["projects"].update_many({}, {"$unset": {"section_id": ""}})
    db["pages"].update_many({}, {"$unset": {"section_id": ""}})
