from bson import ObjectId
from database import get_db
from fastapi import APIRouter, HTTPException, Request

router = APIRouter()


async def build_breadcrumbs(db, section: dict) -> list:
    """Walk ancestors to build breadcrumb chain."""
    crumbs = []
    current = section
    while current:
        crumbs.append({"title": current["title"], "path": current["path"]})
        if current.get("parent_id"):
            current = await db["sections"].find_one(
                {
                    "_id": ObjectId(current["parent_id"]),
                    "deleted": {"$ne": True},
                }
            )
        else:
            current = None
    crumbs.reverse()
    return crumbs


def _section_to_dict(section: dict) -> dict:
    """Convert MongoDB section document to API response dict."""
    result = dict(section)
    if "_id" in result:
        result["id"] = str(result.pop("_id"))
    # Convert ObjectId fields to strings
    for key in ["parent_id", "user_id"]:
        if isinstance(result.get(key), ObjectId):
            result[key] = str(result[key])
    return result


@router.get("/sections/resolve-path/{full_path:path}")
async def resolve_path(request: Request, full_path: str):
    """Resolve a URL path to a section or content item."""
    db = await get_db()
    path = full_path.strip("/")

    if not path:
        raise HTTPException(status_code=404, detail="Path not found")

    # Try full path as a section
    section = await db["sections"].find_one(
        {
            "path": path,
            "is_published": True,
            "deleted": {"$ne": True},
        }
    )

    if section:
        section_dict = _section_to_dict(section)
        breadcrumbs = await build_breadcrumbs(db, section)
        return {
            "type": "section",
            "section": section_dict,
            "breadcrumbs": breadcrumbs,
        }

    # Phase 2.2 will add content item resolution here
    # Phase 4 will add redirect resolution here

    raise HTTPException(status_code=404, detail="Path not found")
