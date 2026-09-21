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


@router.post("/{job_id}/cancel", response_model=JobRecord)
def cancel_job(job_id: str, ctx: AppContext = Depends(get_app_context)):
    """Cooperative cancel — the worker drops its result; a cancelled scan keeps the last good generation."""
    job = ctx.job_repo.get_by_id(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job '{job_id}' not found",
        )
    ctx.job_manager.cancel_job(job_id)
    updated = ctx.job_repo.get_by_id(job_id)
    return updated if updated else job
