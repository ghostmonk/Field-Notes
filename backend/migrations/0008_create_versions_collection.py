"""Create content_versions collection with indexes."""

name = "0008_create_versions_collection"
dependencies = ["0007_add_text_indexes"]


def upgrade(db):
    db.create_collection("content_versions")
    db.content_versions.create_index(
        [("content_id", 1), ("version", -1)],
        name="content_versions_lookup",
    )
    db.content_versions.create_index(
        [("content_type", 1), ("content_id", 1)],
        name="content_versions_by_type",
    )


def downgrade(db):
    db.content_versions.drop()
