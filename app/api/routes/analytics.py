from typing import Any, Dict, List
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api.dependencies import AppContext, get_app_context
from app.database.models import MediaRecord

router = APIRouter(tags=["Storage Analytics"])


class ExtensionBreakdown(BaseModel):
    extension: str
    count: int
    size_bytes: int


class YearBreakdown(BaseModel):
    year: str
    count: int
    size_bytes: int


class SizeRangeBreakdown(BaseModel):
    label: str
    count: int
    size_bytes: int


class StorageAnalyticsResponse(BaseModel):
    total_media_count: int
    total_media_bytes: int
    avg_file_size_bytes: int
    photo_count: int
    photo_bytes: int
    video_count: int
    video_bytes: int
    other_count: int
    other_bytes: int
    thumbnail_bytes: int
    by_extension: List[ExtensionBreakdown]
    by_year: List[YearBreakdown]
    by_size_range: List[SizeRangeBreakdown]
    largest_files: List[MediaRecord]


@router.get("/analytics/storage", response_model=StorageAnalyticsResponse)
def get_storage_analytics(ctx: AppContext = Depends(get_app_context)):
    analytics = ctx.media_repo.get_storage_analytics(library_root=ctx.storage_manager.library_root)
    return StorageAnalyticsResponse(**analytics)
