"""
Backfill section_id on existing content.
- Stories -> blog section
- Projects -> projects section
- Pages -> about or contact section (based on page_type)
"""

import pymongo

name = "0004_backfill_section_id"
dependencies = ["0003_seed_initial_sections"]


def upgrade(db: "pymongo.database.Database"):
    sections = db["sections"]

    # Stories -> blog
    blog = sections.find_one({"slug": "blog", "is_deleted": False})
    if blog:
        db["stories"].update_many(
            {"section_id": {"$exists": False}},
            {"$set": {"section_id": str(blog["_id"])}},
        )

    # Projects -> projects
    projects_section = sections.find_one({"slug": "projects", "is_deleted": False})
    if projects_section:
        db["projects"].update_many(
            {"section_id": {"$exists": False}},
            {"$set": {"section_id": str(projects_section["_id"])}},
        )

    # Pages -> about/contact by page_type
    about = sections.find_one({"slug": "about", "is_deleted": False})
    if about:
        db["pages"].update_many(
            {"page_type": "about", "section_id": {"$exists": False}},
            {"$set": {"section_id": str(about["_id"])}},
        )

    contact = sections.find_one({"slug": "contact", "is_deleted": False})
    if contact:
        db["pages"].update_many(
            {"page_type": "contact", "section_id": {"$exists": False}},
            {"$set": {"section_id": str(contact["_id"])}},
        )


def downgrade(db: "pymongo.database.Database"):
    db["stories"].update_many({}, {"$unset": {"section_id": ""}})
    db["projects"].update_many({}, {"$unset": {"section_id": ""}})
    db["pages"].update_many({}, {"$unset": {"section_id": ""}})
