"""API handler for resume tailoring."""

from database import get_resumes_collection
from decorators.auth import requires_auth
from fastapi import APIRouter, Depends, HTTPException, Request
from glogger import logger
from middleware.rate_limit import limiter
from models.user import UserInfo
from motor.motor_asyncio import AsyncIOMotorCollection
from pydantic import BaseModel, Field
from services.tailoring_pipeline import run_tailoring_pipeline

router = APIRouter()


class TailorRequest(BaseModel):
    job_description: str = Field(..., min_length=1, max_length=50000)


@router.post("/tailor")
@limiter.limit("5/minute")
@requires_auth
async def tailor_resume(
    request: Request,
    body: TailorRequest,
    collection: AsyncIOMotorCollection = Depends(get_resumes_collection),
):
    """Tailor a resume to a job description using the LLM pipeline."""
    user: UserInfo = request.state.user

    try:
        logger.info_with_context(
            "Starting resume tailoring",
            {"user_id": user.id, "job_desc_length": len(body.job_description)},
        )

        result = await run_tailoring_pipeline(
            job_description=body.job_description,
            user_id=user.id,
            resumes_collection=collection,
        )

        logger.info_with_context(
            "Resume tailoring complete",
            {
                "user_id": user.id,
                "overall_score": result["evaluation"].get("overall"),
                "attempts": result["attempts"],
            },
        )

        return result

    except ValueError as e:
        error_msg = str(e)
        if "No resume found" in error_msg:
            raise HTTPException(status_code=404, detail="No resume found. Create a resume first.")
        if "environment variable is required" in error_msg:
            raise HTTPException(status_code=503, detail="Tailoring service is not configured")
        raise HTTPException(status_code=500, detail="Tailoring failed")
    except HTTPException:
        raise
    except Exception as e:
        logger.exception_with_context(
            "Error during resume tailoring",
            {
                "user_id": user.id,
                "error_type": type(e).__name__,
                "error_details": str(e),
            },
        )
        raise HTTPException(status_code=500, detail="Tailoring failed")
