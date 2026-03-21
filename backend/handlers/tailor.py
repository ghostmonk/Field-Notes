"""API handler for resume tailoring."""

from database import get_resumes_collection
from decorators.auth import requires_auth
from fastapi import APIRouter, Depends, HTTPException, Request
from glogger import logger
from middleware.rate_limit import limiter
from models.user import UserInfo
from motor.motor_asyncio import AsyncIOMotorCollection
from pydantic import BaseModel, Field
from services.anthropic_client import ResumeNotFoundError, ServiceNotConfiguredError
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

    except ResumeNotFoundError:
        raise HTTPException(status_code=404, detail="No resume found. Create a resume first.")
    except ServiceNotConfiguredError:
        raise HTTPException(status_code=503, detail="Tailoring service is not configured")
    except HTTPException:
        raise
    except Exception as e:
        error_detail = str(e)
        # Extract response body from HTTP errors (Qdrant, Voyage, Anthropic)
        if hasattr(e, "response"):
            try:
                error_detail += f" | Response: {e.response.text[:500]}"
            except Exception:
                pass
        logger.exception_with_context(
            "Error during resume tailoring",
            {
                "user_id": user.id,
                "error_type": type(e).__name__,
                "error_details": error_detail,
            },
        )
        raise HTTPException(status_code=500, detail="Tailoring failed")
