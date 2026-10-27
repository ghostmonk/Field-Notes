"""
API handler for GitHub contribution data with MongoDB caching.
"""

import os
from datetime import datetime, timedelta, timezone

import httpx
from database import get_db
from fastapi import APIRouter, HTTPException
from glogger import logger
from motor.motor_asyncio import AsyncIOMotorDatabase

router = APIRouter()

GITHUB_GRAPHQL_URL = "https://api.github.com/graphql"
CACHE_TTL_SECONDS = 3600

CONTRIBUTIONS_QUERY = """
query($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    contributionsCollection(from: $from, to: $to) {
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

LANGUAGES_QUERY = """
query($login: String!) {
  user(login: $login) {
    repositories(first: 20, ownerAffiliations: OWNER, orderBy: {field: PUSHED_AT, direction: DESC}, isFork: false) {
      nodes {
        languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
          edges {
            size
            node { name color }
          }
        }
      }
    }
  }
}
"""


async def _get_cached(db: AsyncIOMotorDatabase):
    return await _get_cached_by_key(db, "contributions")


async def _fetch_from_github(token: str, username: str):
    now = datetime.now(timezone.utc)
    date_from = (now - timedelta(days=365)).isoformat()
    date_to = now.isoformat()
    async with httpx.AsyncClient() as client:
        response = await client.post(
            GITHUB_GRAPHQL_URL,
            json={
                "query": CONTRIBUTIONS_QUERY,
                "variables": {"login": username, "from": date_from, "to": date_to},
            },
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


async def _get_cached_by_key(db: AsyncIOMotorDatabase, key: str):
    doc = await db["github_cache"].find_one({"key": key})
    if not doc:
        return None
    fetched_at = doc["fetched_at"]
    if fetched_at.tzinfo is None:
        fetched_at = fetched_at.replace(tzinfo=timezone.utc)
    elapsed = (datetime.now(timezone.utc) - fetched_at).total_seconds()
    if elapsed > CACHE_TTL_SECONDS:
        return None
    return doc["data"]


async def _fetch_languages(token: str, username: str):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            GITHUB_GRAPHQL_URL,
            json={
                "query": LANGUAGES_QUERY,
                "variables": {"login": username},
            },
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
        raise ValueError("GitHub user not found")
    totals: dict[str, dict] = {}
    for repo in user["repositories"]["nodes"]:
        for edge in repo["languages"]["edges"]:
            name = edge["node"]["name"]
            if name not in totals:
                totals[name] = {"name": name, "color": edge["node"]["color"], "size": 0}
            totals[name]["size"] += edge["size"]
    sorted_langs = sorted(totals.values(), key=lambda x: x["size"], reverse=True)
    total_size = sum(lang["size"] for lang in sorted_langs)
    if total_size == 0:
        return []
    return [
        {"name": lang["name"], "color": lang["color"], "percentage": round(lang["size"] / total_size * 100, 1)}
        for lang in sorted_langs[:8]
    ]


@router.get("/github/languages")
async def get_languages():
    token = os.environ.get("GH_TOKEN")
    username = os.environ.get("GH_USERNAME")
    if not token or not username:
        raise HTTPException(status_code=503, detail="GitHub integration not configured")

    db = await get_db()

    try:
        cached = await _get_cached_by_key(db, "languages")
        if cached:
            return cached
    except Exception:
        logger.warning("Cache lookup failed, fetching languages from GitHub")

    try:
        data = await _fetch_languages(token, username)
    except (httpx.HTTPError, ValueError, KeyError, TypeError) as e:
        logger.error(f"Failed to fetch GitHub languages: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch GitHub data")

    try:
        await db["github_cache"].update_one(
            {"key": "languages"},
            {"$set": {"data": data, "fetched_at": datetime.now(timezone.utc)}},
            upsert=True,
        )
    except Exception:
        logger.warning("Failed to write languages cache")

    return data


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
