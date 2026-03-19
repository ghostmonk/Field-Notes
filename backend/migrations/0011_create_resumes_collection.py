"""Create resumes collection with unique user_id index (excluding soft-deleted)."""

name = "0011_create_resumes_collection"
dependencies = ["0010_add_icon_to_sections"]


def upgrade(db):
    if "resumes" not in db.list_collection_names():
        db.create_collection("resumes")
    db.resumes.create_index(
        "user_id",
        unique=True,
        partialFilterExpression={"deleted": {"$ne": True}},
        name="resumes_user_id_unique_active",
    )


def downgrade(db):
    db.resumes.drop_index("resumes_user_id_unique_active")
    db.drop_collection("resumes")
