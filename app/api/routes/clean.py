from datetime import datetime
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.api.dependencies import AppContext, get_app_context
from app.cleaner.engine import CleanScanItem, CleanableStatus

router = APIRouter(tags=["Clean Mobile"])


class DeviceStatusResponse(BaseModel):
    name: str
    is_connected: bool
    supports_delete: bool
    last_scanned_at: Optional[datetime] = None


class VerificationDetailModel(BaseModel):
    discovered_on_device: bool
    local_file_exists: bool
    import_completed: bool
    hash_verified: bool
    content_identity_matched: bool
    reason: Optional[str] = None


class CleanItemModel(BaseModel):
    device_unique_id: str
    filename: str
    device_size_bytes: int
    source_path_str: str
    status: str
    verification: VerificationDetailModel
    local_media_id: Optional[str] = None
    local_relative_path: Optional[str] = None
    local_size_bytes: Optional[int] = None
    reclaimable_bytes: int


class ScanResultsResponse(BaseModel):
    device_name: str
    total_device_media: int
    verified_cleanable_count: int
    unverified_candidate_count: int
    not_backed_up_count: int
    total_reclaimable_bytes: int
    items: List[CleanItemModel]


class ExecuteCleanupRequest(BaseModel):
    device_unique_ids: List[str] = Field(
        ...,
        min_length=1,
        description="List of verified device unique IDs to clean from iPhone",
    )
    confirmed: bool = Field(
        ...,
        description="Explicit user confirmation for destructive device deletion",
    )


class CleanupHistoryItemResponse(BaseModel):
    id: str
    device_id: str
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    total_items: int
    deleted_items: int
    failed_items: int
    bytes_reclaimed: int
    status: str


@router.get("/clean/status", response_model=DeviceStatusResponse)
def get_clean_status(ctx: AppContext = Depends(get_app_context)):
    device = ctx.get_connected_device()
    return DeviceStatusResponse(
        name=device.name,
        is_connected=device.is_connected,
        supports_delete=device.supports_delete,
    )


@router.post("/clean/scan")
def trigger_clean_scan(ctx: AppContext = Depends(get_app_context)):
    """Triggers a background job to discover and evaluate all media on connected device."""
    device = ctx.get_connected_device()
    if not device.is_connected:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No device currently connected",
        )

    def scan_task(progress_callback):
        def cb(curr, total, msg):
            progress_callback(curr, total)

        items = ctx.cleaner_engine.scan_device(device, progress_cb=cb)
        ctx.active_scan_results[device.name] = items

    job = ctx.job_manager.submit_job(
        job_type="CLEAN_MOBILE_SCAN",
        task_fn=scan_task,
    )
    return {"job_id": job.id, "status": job.status}


@router.get("/clean/scan/results", response_model=ScanResultsResponse)
def get_scan_results(ctx: AppContext = Depends(get_app_context)):
    device = ctx.get_connected_device()
    items = ctx.active_scan_results.get(device.name, [])

    # If no scan in memory, perform quick scan
    if not items and device.is_connected:
        items = ctx.cleaner_engine.scan_device(device)
        ctx.active_scan_results[device.name] = items

    cleanable_count = sum(1 for i in items if i.status == CleanableStatus.CLEANABLE)
    unverified_count = sum(1 for i in items if i.status == CleanableStatus.UNVERIFIED_CANDIDATE)
    not_backed_up_count = sum(1 for i in items if i.status == CleanableStatus.NOT_BACKED_UP)
    reclaimable_bytes = sum(i.reclaimable_bytes for i in items if i.status == CleanableStatus.CLEANABLE)

    serialized_items = [
        CleanItemModel(
            device_unique_id=i.device_unique_id,
            filename=i.filename,
            device_size_bytes=i.device_size_bytes,
            source_path_str=i.source_path_str,
            status=i.status.value,
            verification=VerificationDetailModel(
                discovered_on_device=i.verification.discovered_on_device,
                local_file_exists=i.verification.local_file_exists,
                import_completed=i.verification.import_completed,
                hash_verified=i.verification.hash_verified,
                content_identity_matched=i.verification.content_identity_matched,
                reason=i.verification.reason,
            ),
            local_media_id=i.local_media_id,
            local_relative_path=i.local_relative_path,
            local_size_bytes=i.local_size_bytes,
            reclaimable_bytes=i.reclaimable_bytes,
        )
        for i in items
    ]

    return ScanResultsResponse(
        device_name=device.name,
        total_device_media=len(items),
        verified_cleanable_count=cleanable_count,
        unverified_candidate_count=unverified_count,
        not_backed_up_count=not_backed_up_count,
        total_reclaimable_bytes=reclaimable_bytes,
        items=serialized_items,
    )


@router.post("/clean/execute")
def execute_cleanup(
    req: ExecuteCleanupRequest,
    ctx: AppContext = Depends(get_app_context),
):
    """Executes destructive cleanup on connected device after safety validation."""
    if not req.confirmed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Explicit user confirmation is required for device cleanup",
        )

    device = ctx.get_connected_device()
    if not device.is_connected:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Connected device is not accessible",
        )

    if not device.supports_delete:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Connected device does not support safe deletion",
        )

    # Filter items to execute
    all_scanned = ctx.active_scan_results.get(device.name, [])
    if not all_scanned:
        all_scanned = ctx.cleaner_engine.scan_device(device)
        ctx.active_scan_results[device.name] = all_scanned

    requested_set = set(req.device_unique_ids)
    target_items = [
        i for i in all_scanned
        if i.device_unique_id in requested_set and i.status == CleanableStatus.CLEANABLE
    ]

    if not target_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No verified cleanable items matched the selection",
        )

    def cleanup_task(progress_callback):
        def cb(curr, total, msg):
            progress_callback(curr, total)

        summary = ctx.cleaner_engine.execute_cleanup(
            device=device,
            items=target_items,
            progress_cb=cb,
        )
        # Clear scan cache to force fresh scan
        ctx.active_scan_results.pop(device.name, None)

    job = ctx.job_manager.submit_job(
        job_type="CLEAN_MOBILE_EXECUTE",
        task_fn=cleanup_task,
    )
    return {
        "job_id": job.id,
        "status": job.status,
        "total_targets": len(target_items),
    }


@router.get("/clean/history", response_model=List[CleanupHistoryItemResponse])
def get_cleanup_history(ctx: AppContext = Depends(get_app_context)):
    records = ctx.cleanup_repo.list_history()
    return [
        CleanupHistoryItemResponse(
            id=r.id,
            device_id=r.device_id,
            started_at=r.started_at,
            completed_at=r.completed_at,
            total_items=r.total_items,
            deleted_items=r.deleted_items,
            failed_items=r.failed_items,
            bytes_reclaimed=r.bytes_reclaimed,
            status=r.status,
        )
        for r in records
    ]
