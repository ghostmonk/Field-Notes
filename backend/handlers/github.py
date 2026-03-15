"""
API handler for GitHub contribution data with MongoDB caching.
"""

import os
from datetime import datetime, timezone

import httpx
from database import get_db
from fastapi import APIRouter, HTTPException
from glogger import logger
from motor.motor_asyncio import AsyncIOMotorDatabase

router = APIRouter()

GITHUB_GRAPHQL_URL = "https://api.github.com/graphql"
CACHE_TTL_SECONDS = 3600

CONTRIBUTIONS_QUERY = """
query {
  user(login: "ghostmonk") {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            date
            contributionCount
            contributionLevel
          }
        }
      }
    }
  }
}
"""


async def _get_cached(db: AsyncIOMotorDatabase):
    doc = await db["github_cache"].find_one({"key": "contributions"})
    if not doc:
        return None
    elapsed = (datetime.now(timezone.utc) - doc["fetched_at"]).total_seconds()
    if elapsed > CACHE_TTL_SECONDS:
        return None
    return doc["data"]


async def _fetch_from_github(token: str):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            GITHUB_GRAPHQL_URL,
            json={"query": CONTRIBUTIONS_QUERY},
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            timeout=10.0,
        )
    response.raise_for_status()
    result = response.json()
    if "errors" in result:
        raise ValueError(result["errors"])
    calendar = result["data"]["user"]["contributionsCollection"]["contributionCalendar"]
    return calendar


@router.get("/github/contributions")
async def get_contributions():
    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        raise HTTPException(status_code=503, detail="GitHub integration not configured")

    db = await get_db()

    cached = await _get_cached(db)
    if cached:
        return cached

    try:
        data = await _fetch_from_github(token)
    except Exception as e:
        logger.error(f"Failed to fetch GitHub contributions: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch GitHub data")

    await db["github_cache"].update_one(
        {"key": "contributions"},
        {"$set": {"key": "contributions", "data": data, "fetched_at": datetime.now(timezone.utc)}},
        upsert=True,
    )

    return data
