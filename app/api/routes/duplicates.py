from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.api.dependencies import AppContext, get_app_context
from app.database.models import MediaRecord

router = APIRouter(tags=["Duplicates"])


class DuplicateGroup(BaseModel):
    hash_sha256: str
    count: int
    size_bytes: int
    items: List[MediaRecord]


class TrashDuplicatesRequest(BaseModel):
    media_ids: List[str] = Field(..., min_length=1, description="List of redundant media IDs to move to trash")


class TrashDuplicatesResponse(BaseModel):
    trashed_count: int
    trashed_ids: List[str]


@router.get("/duplicates", response_model=List[DuplicateGroup])
def list_duplicate_groups(ctx: AppContext = Depends(get_app_context)):
    groups = ctx.media_repo.get_duplicate_groups()
    return groups


@router.post("/duplicates/scan")
def scan_duplicates(ctx: AppContext = Depends(get_app_context)):
    """Runs a duplicate scan job to ensure all library items have valid sha256 hashes."""
    def _run_duplicate_scan(job_id: str):
        active_items = ctx.media_repo.filter_media(limit=100000)
        total = len(active_items)
        ctx.job_repo.update_progress(job_id, progress=0, total=total)

        updated_count = 0
        for idx, media in enumerate(active_items):
            # Check if file has hash
            if not media.hash_sha256 or len(media.hash_sha256) < 10:
                abs_path = ctx.storage_manager.library_root / media.relative_path
                if abs_path.exists():
                    try:
                        h = ctx.duplicate_detector.calculate_file_hash(abs_path)
                        media.hash_sha256 = h
                        ctx.media_repo.insert_or_update(media)
                        updated_count += 1
                    except OSError:
                        pass
            if idx % 20 == 0 or idx == total - 1:
                ctx.job_repo.update_progress(job_id, progress=idx + 1, total=total)

        ctx.job_repo.mark_completed(job_id, total=total)

    job_id = ctx.job_manager.start_job(
        job_type="DUPLICATE_SCAN",
        target=_run_duplicate_scan,
    )
    return {"job_id": job_id, "status": "STARTED"}


@router.post("/duplicates/trash", response_model=TrashDuplicatesResponse)
def trash_duplicates(
    req: TrashDuplicatesRequest,
    ctx: AppContext = Depends(get_app_context),
):
    """Safely moves user-selected redundant duplicate copies to trash."""
    trashed = []
    for media_id in req.media_ids:
        record = ctx.media_repo.get_by_id(media_id)
        if record and record.status == "ACTIVE":
            ctx.media_repo.mark_status(media_id, "TRASHED")
            trashed.append(media_id)

    return TrashDuplicatesResponse(
        trashed_count=len(trashed),
        trashed_ids=trashed,
    )
