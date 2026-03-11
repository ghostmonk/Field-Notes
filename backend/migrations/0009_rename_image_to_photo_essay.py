"""Rename content_type 'image' to 'photo_essay' in sections collection."""

name = "0009_rename_image_to_photo_essay"
dependencies = ["0008_create_versions_collection"]


def upgrade(db):
    db.sections.update_many(
        {"content_type": "image"},
        {"$set": {"content_type": "photo_essay"}},
    )


def downgrade(db):
    db.sections.update_many(
        {"content_type": "photo_essay"},
        {"$set": {"content_type": "image"}},
    )
