from fastapi import APIRouter, Depends, HTTPException, status

from app.api.dependencies import AppContext, get_app_context
from app.database.models import JobRecord


router = APIRouter(prefix="/jobs", tags=["Jobs"])


@router.get("/{job_id}", response_model=JobRecord)
def get_job_status(job_id: str, ctx: AppContext = Depends(get_app_context)):
    job = ctx.job_repo.get_by_id(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job '{job_id}' not found",
        )
    return job
