"""Add icon field to sections, backfilling from known slug mappings."""

name = "0010_add_icon_to_sections"
dependencies = ["0009_rename_image_to_photo_essay"]

SLUG_TO_ICON = {
    "blog": "home",
    "about": "user",
    "projects": "folder",
    "contact": "mail",
}


def upgrade(db):
    # Backfill known slugs with their mapped icons
    for slug, icon in SLUG_TO_ICON.items():
        db.sections.update_many(
            {"slug": slug, "icon": {"$exists": False}},
            {"$set": {"icon": icon}},
        )
    # Set all remaining sections without an icon to "default"
    db.sections.update_many(
        {"icon": {"$exists": False}},
        {"$set": {"icon": "default"}},
    )


def downgrade(db):
    db.sections.update_many(
        {},
        {"$unset": {"icon": ""}},
    )
