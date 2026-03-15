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
query($login: String!) {
  user(login: $login) {
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
    fetched_at = doc["fetched_at"]
    if fetched_at.tzinfo is None:
        fetched_at = fetched_at.replace(tzinfo=timezone.utc)
    elapsed = (datetime.now(timezone.utc) - fetched_at).total_seconds()
    if elapsed > CACHE_TTL_SECONDS:
        return None
    return doc["data"]


async def _fetch_from_github(token: str, username: str):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            GITHUB_GRAPHQL_URL,
            json={"query": CONTRIBUTIONS_QUERY, "variables": {"login": username}},
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
    user = result.get("data", {}).get("user")
    if not user:
        raise ValueError("GitHub user not found or token lacks read:user scope")
    calendar = user["contributionsCollection"]["contributionCalendar"]
    return calendar


@router.get("/github/contributions")
async def get_contributions():
    token = os.environ.get("GH_TOKEN")
    username = os.environ.get("GH_USERNAME")
    if not token or not username:
        raise HTTPException(status_code=503, detail="GitHub integration not configured")

    db = await get_db()

    try:
        cached = await _get_cached(db)
        if cached:
            return cached
    except Exception:
        logger.warning("Cache lookup failed, fetching from GitHub")

    try:
        data = await _fetch_from_github(token, username)
    except (httpx.HTTPError, ValueError, KeyError, TypeError) as e:
        logger.error(f"Failed to fetch GitHub contributions: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch GitHub data")

    try:
        await db["github_cache"].update_one(
            {"key": "contributions"},
            {"$set": {"data": data, "fetched_at": datetime.now(timezone.utc)}},
            upsert=True,
        )
    except Exception:
        logger.warning("Failed to write GitHub cache, returning data anyway")

    return data
