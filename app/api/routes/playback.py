from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.dependencies import AppContext, get_app_context
from app.database.models import MediaRecord, WatchProgressRecord


router = APIRouter(tags=["Playback"])


class UpdateProgressRequest(BaseModel):
    position_ms: int
    duration_ms: int
    completed: bool = False


class ContinueWatchingItem(BaseModel):
    media: MediaRecord
    progress: WatchProgressRecord


@router.get("/media/{media_id}/progress", response_model=WatchProgressRecord)
def get_media_progress(media_id: str, ctx: AppContext = Depends(get_app_context)):
    prog = ctx.watch_repo.get_progress(media_id)
    if not prog:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No playback progress recorded for this media",
        )
    return prog


@router.put("/media/{media_id}/progress", response_model=WatchProgressRecord)
def update_media_progress(
    media_id: str,
    req: UpdateProgressRequest,
    ctx: AppContext = Depends(get_app_context),
):
    media = ctx.media_repo.get_by_id(media_id)
    if not media:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Media not found",
        )
    return ctx.watch_repo.upsert_progress(
        media_id=media_id,
        position_ms=req.position_ms,
        duration_ms=req.duration_ms,
        completed=req.completed,
    )


@router.get("/playback/continue", response_model=List[ContinueWatchingItem])
def get_continue_watching(ctx: AppContext = Depends(get_app_context)):
    results = ctx.watch_repo.get_continue_watching(limit=20)
    return [
        ContinueWatchingItem(media=m, progress=wp)
        for m, wp in results
    ]
