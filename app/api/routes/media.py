from datetime import datetime
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel

from app.api.dependencies import AppContext, get_app_context
from app.api.streaming import RangeStreamer
from app.database.models import MediaRecord


router = APIRouter(tags=["Media"])


class MediaListResponse(BaseModel):
    items: List[MediaRecord]
    page: int
    limit: int
    count: int
    total: int


@router.get("/media", response_model=MediaListResponse)
def list_media(
    type: Optional[str] = Query(None, description="Media type (PHOTO, VIDEO, SCREENSHOT, LIVE_PHOTO, ALL)"),
    start_date: Optional[datetime] = Query(None, description="Start capture date"),
    end_date: Optional[datetime] = Query(None, description="End capture date"),
    import_start_date: Optional[datetime] = Query(None, description="Start import date"),
    import_end_date: Optional[datetime] = Query(None, description="End import date"),
    min_size: Optional[int] = Query(None, description="Minimum size in bytes"),
    max_size: Optional[int] = Query(None, description="Maximum size in bytes"),
    min_duration: Optional[int] = Query(None, description="Minimum duration in milliseconds"),
    max_duration: Optional[int] = Query(None, description="Maximum duration in milliseconds"),
    min_width: Optional[int] = Query(None, description="Minimum width in pixels"),
    max_width: Optional[int] = Query(None, description="Maximum width in pixels"),
    min_height: Optional[int] = Query(None, description="Minimum height in pixels"),
    max_height: Optional[int] = Query(None, description="Maximum height in pixels"),
    extension: Optional[str] = Query(None, description="File extension (e.g. mov, heic, jpg)"),
    favorite: Optional[bool] = Query(None, description="Filter by starred favorite"),
    album_id: Optional[str] = Query(None, description="Filter by album ID"),
    search: Optional[str] = Query(None, description="Search term across filename and path"),
    status: str = Query("ACTIVE", description="Media status (ACTIVE, MISSING, TRASHED)"),
    sort: str = Query("newest", description="Sort order (newest, oldest, imported_newest, imported_oldest, size_desc, size_asc, duration_desc, name_asc, name_desc)"),
    page: int = Query(1, ge=1, description="1-indexed page number"),
    limit: int = Query(50, ge=1, le=200, description="Items per page (max 200)"),
    ctx: AppContext = Depends(get_app_context),
):
    offset = (page - 1) * limit
    items = ctx.media_repo.filter_media(
        media_type=type,
        min_size=min_size,
        max_size=max_size,
        start_date=start_date,
        end_date=end_date,
        import_start_date=import_start_date,
        import_end_date=import_end_date,
        min_duration=min_duration,
        max_duration=max_duration,
        min_width=min_width,
        max_width=max_width,
        min_height=min_height,
        max_height=max_height,
        extension=extension,
        favorite=favorite,
        album_id=album_id,
        search_query=search,
        status=status,
        sort=sort,
        limit=limit,
        offset=offset,
    )
    total = ctx.media_repo.count_filtered_media(
        media_type=type,
        min_size=min_size,
        max_size=max_size,
        start_date=start_date,
        end_date=end_date,
        import_start_date=import_start_date,
        import_end_date=import_end_date,
        min_duration=min_duration,
        max_duration=max_duration,
        min_width=min_width,
        max_width=max_width,
        min_height=min_height,
        max_height=max_height,
        extension=extension,
        favorite=favorite,
        album_id=album_id,
        search_query=search,
        status=status,
    )
    return MediaListResponse(
        items=items,
        page=page,
        limit=limit,
        count=len(items),
        total=total,
    )


@router.get("/media/{media_id}", response_model=MediaRecord)
def get_media_detail(media_id: str, ctx: AppContext = Depends(get_app_context)):
    record = ctx.media_repo.get_by_id(media_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Media with id '{media_id}' not found",
        )
    return record


@router.get("/media/{media_id}/thumbnail")
def get_media_thumbnail(media_id: str, ctx: AppContext = Depends(get_app_context)):
    record = ctx.media_repo.get_by_id(media_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Media not found",
        )

    thumb_path = ctx.thumbnails.get_thumbnail_path(record)
    if not thumb_path or not thumb_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Thumbnail unavailable for this media item",
        )

    return FileResponse(
        path=str(thumb_path),
        media_type="image/jpeg",
        filename=f"{record.id}_thumb.jpg",
    )


@router.get("/media/{media_id}/stream")
def stream_media(
    media_id: str,
    range: Optional[str] = Header(None),
    ctx: AppContext = Depends(get_app_context),
):
    record = ctx.media_repo.get_by_id(media_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Media not found",
        )

    file_path = ctx.storage_manager.library_root / record.relative_path
    content_type = record.mime_type or "application/octet-stream"

    return RangeStreamer.create_response(
        file_path=file_path,
        library_root=ctx.storage_manager.library_root,
        range_header=range,
        content_type=content_type,
    )
