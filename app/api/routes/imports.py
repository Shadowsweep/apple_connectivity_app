from datetime import datetime
from pathlib import Path
from typing import List, Optional, Set
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.api.dependencies import AppContext, get_app_context
from app.device.iphone import LocalFolderDevice, MockIPhoneDevice
from app.filters.media_filter import FilterCriteria, MediaFilter
from app.scanner.metadata import MediaType
from app.scanner.scanner import MediaScanner
from app.storage.manager import StorageManager


router = APIRouter(prefix="/import", tags=["Imports"])


class ImportFilterParams(BaseModel):
    source_path: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    allowed_types: Optional[Set[MediaType]] = None
    min_video_size_bytes: Optional[int] = None
    max_video_size_bytes: Optional[int] = None
    max_total_import_bytes: Optional[int] = None


class ImportPreviewResponse(BaseModel):
    total_candidates: int
    photos_count: int
    videos_count: int
    screenshots_count: int
    live_photos_count: int
    already_imported_count: int
    new_items_count: int
    required_bytes: int
    formatted_required: str
    available_bytes: int
    usable_bytes: int
    safety_reserve_bytes: int
    can_fit: bool


class ImportStartResponse(BaseModel):
    job_id: str
    status: str
    total_candidates: int


def _get_device_and_filtered_items(params: ImportFilterParams, ctx: AppContext):
    if params.source_path:
        src_path = Path(params.source_path).resolve()
        if not src_path.exists() or not src_path.is_dir():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Source path '{params.source_path}' does not exist or is not a directory",
            )
        device = LocalFolderDevice(src_path, name="Custom Source")
    else:
        mock_path = ctx.storage_manager.library_root.parent / "tests" / "fixtures" / "fake_iphone"
        if not mock_path.exists():
            from tests.fixtures.fake_iphone_generator import create_mock_iphone_fixture
            create_mock_iphone_fixture(mock_path)
        device = MockIPhoneDevice(mock_path)

    scanner = MediaScanner(device)
    scanned_items = scanner.scan()

    criteria = FilterCriteria(
        date_from=params.date_from,
        date_to=params.date_to,
        allowed_types=params.allowed_types or {
            MediaType.PHOTO,
            MediaType.VIDEO,
            MediaType.SCREENSHOT,
            MediaType.LIVE_PHOTO,
        },
        min_video_size_bytes=params.min_video_size_bytes,
        max_video_size_bytes=params.max_video_size_bytes,
        max_total_import_bytes=params.max_total_import_bytes,
    )
    filter_res = MediaFilter(criteria).apply(scanned_items)
    return device, filter_res.accepted


@router.post("/preview", response_model=ImportPreviewResponse)
def get_import_preview(
    params: ImportFilterParams, ctx: AppContext = Depends(get_app_context)
):
    _, filtered_items = _get_device_and_filtered_items(params, ctx)
    preview = ctx.importer.preview(filtered_items)

    return ImportPreviewResponse(
        total_candidates=preview.total_candidates,
        photos_count=preview.photos_count,
        videos_count=preview.videos_count,
        screenshots_count=preview.screenshots_count,
        live_photos_count=preview.live_photos_count,
        already_imported_count=preview.already_imported_count,
        new_items_count=preview.new_items_count,
        required_bytes=preview.required_bytes,
        formatted_required=preview.formatted_required,
        available_bytes=preview.storage_stats.free_bytes,
        usable_bytes=preview.storage_stats.usable_bytes,
        safety_reserve_bytes=preview.storage_stats.safety_reserve_bytes,
        can_fit=preview.can_fit,
    )


@router.post("/start", response_model=ImportStartResponse)
def start_import(
    params: ImportFilterParams, ctx: AppContext = Depends(get_app_context)
):
    device, filtered_items = _get_device_and_filtered_items(params, ctx)
    preview = ctx.importer.preview(filtered_items)

    if not preview.can_fit:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot start import: required space exceeds usable disk space (respecting 10 GB reserve)",
        )

    def import_task(progress_cb):
        def pcb(current, total, item, msg):
            progress_cb(current, total)
        ctx.importer.execute_import(filtered_items, device, progress_callback=pcb)

    job = ctx.job_manager.submit_job("MEDIA_IMPORT", import_task)

    return ImportStartResponse(
        job_id=job.id,
        status=job.status,
        total_candidates=len(filtered_items),
    )
