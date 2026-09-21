from datetime import datetime
from pathlib import Path
from typing import List, Literal, Optional, Set
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.api.dependencies import AppContext, get_app_context
from app.core.security import validate_safe_path
from app.device.iphone import (
    LocalFolderDevice,
    MockIPhoneDevice,
    _PROBE_ACTIONS,
    _PROBE_MESSAGES,
    _classify_afc_error,
    get_connected_iphone,
    probe_connected_iphone,
)
from app.filters.media_filter import FilterCriteria, MediaFilter
from app.scanner.metadata import MediaType
from app.scanner.scanner import MediaScanner
from app.storage.manager import StorageManager


router = APIRouter(prefix="/import", tags=["Imports"])


class DeviceProbeResponse(BaseModel):
    state: Literal["READY", "EMPTY", "DISCONNECTED", "LOCKED", "UNTRUSTED", "UNAVAILABLE"]
    provider: Optional[str] = None
    device_name: Optional[str] = None
    message: str = ""
    action: str = ""
    capabilities: dict = Field(default_factory=dict)
    last_error: Optional[str] = None


@router.get("/device-status", response_model=DeviceProbeResponse)
def get_device_status():
    """Fast bounded detection pass — no media scan, never blocks on a large Camera Roll."""
    return DeviceProbeResponse(**probe_connected_iphone())


class DeviceSummaryResponse(BaseModel):
    device_name: str
    is_connected: bool
    is_real_device: bool
    photos_count: int
    videos_count: int
    screenshots_count: int
    live_photos_count: int
    total_count: int
    total_bytes: int
    formatted_total: str
    oldest_capture_date: Optional[str] = None
    newest_capture_date: Optional[str] = None
    provider: Optional[str] = None
    connection_status: str = "READY"
    message: Optional[str] = None
    action: Optional[str] = None
    scan_id: Optional[str] = None
    scan_generation: Optional[int] = None


def _build_device_summary(device, items) -> DeviceSummaryResponse:
    photos = sum(1 for i in items if i.media_type == MediaType.PHOTO)
    videos = sum(1 for i in items if i.media_type == MediaType.VIDEO)
    screenshots = sum(1 for i in items if i.media_type == MediaType.SCREENSHOT)
    live_photos = sum(1 for i in items if i.media_type == MediaType.LIVE_PHOTO)
    total_bytes = sum(i.size_bytes for i in items)

    dates = [
        i.capture_date for i in items
        if getattr(i, "capture_date", None) is not None
    ]

    return DeviceSummaryResponse(
        device_name=device.name,
        is_connected=device.is_connected,
        is_real_device=not isinstance(device, MockIPhoneDevice),
        photos_count=photos,
        videos_count=videos,
        screenshots_count=screenshots,
        live_photos_count=live_photos,
        total_count=len(items),
        total_bytes=total_bytes,
        formatted_total=StorageManager.format_bytes(total_bytes),
        oldest_capture_date=min(dates).isoformat() if dates else None,
        newest_capture_date=max(dates).isoformat() if dates else None,
        provider=getattr(device, "provider_name", device.__class__.__name__),
        connection_status="READY" if items else "EMPTY",
        message=None if items else (
            "The iPhone is connected, but no Camera Roll media is visible. "
            "Unlock it, tap Trust/Allow, open Apple Devices once, then rescan."
        ),
        action=None if items else "Unlock the iPhone, tap Trust/Allow, then rescan.",
    )


def _stamp_scan(ctx: AppContext, device, items) -> tuple[str, int]:
    """Assign a new scan_id + generation. Every downstream request reuses this generation."""
    import uuid

    cache = ctx.active_scan_results
    generation = int(cache.get("scan_generation", 0) or 0) + 1
    scan_id = uuid.uuid4().hex
    cache["scan_id"] = scan_id
    cache["scan_generation"] = generation
    cache["scan_device_id"] = getattr(device, "name", type(device).__name__)
    return scan_id, generation


def _scan_connected_iphone(ctx: AppContext, refresh: bool = False):
    cache = ctx.active_scan_results
    if not refresh:
        cached_device = cache.get("iphone_device")
        cached_items = cache.get("iphone_items")
        if cached_device is not None and cached_items is not None:
            try:
                if cached_device.is_connected:
                    return cached_device, cached_items
            except Exception:
                pass
            # Stale/failed provider — close and drop so the next pass re-detects.
            try:
                cached_device.close()
            except Exception:
                pass
            cache.pop("iphone_device", None)
            cache.pop("iphone_items", None)

    old_device = cache.get("iphone_device")
    if refresh and old_device is not None:
        try:
            old_device.close()
        except Exception:
            pass
        cache.pop("iphone_device", None)
        cache.pop("iphone_items", None)

    device = get_connected_iphone()
    if device is None:
        return None, []
    try:
        items = MediaScanner(device).scan()
    except Exception:
        try:
            device.close()
        except Exception:
            pass
        cache.pop("iphone_device", None)
        cache.pop("iphone_items", None)
        raise
    cache["iphone_device"] = device
    cache["iphone_items"] = items
    _stamp_scan(ctx, device, items)
    cache.pop("device_summary", None)  # summary must rebuild from the new generation
    # ponytail: counts and provider only — never filenames or device paths
    ctx.logger.info("iphone scan provider=%s items=%d bytes=%d", getattr(device, "provider_name", type(device).__name__), len(items), sum(i.size_bytes for i in items))
    return device, items


class ScanStartRequest(BaseModel):
    refresh: bool = True
    source_path: Optional[str] = None


class ScanStartResponse(BaseModel):
    job_id: Optional[str] = None
    scan_id: Optional[str] = None
    scan_generation: Optional[int] = None
    status: str  # SCANNING | COMPLETED (cache hit) | FAILED
    reused_cache: bool = False


class ScanStatusResponse(BaseModel):
    state: str  # IDLE | SCANNING | COMPLETED | FAILED | CANCELLED
    scan_id: Optional[str] = None
    scan_generation: Optional[int] = None
    job_id: Optional[str] = None
    job_status: Optional[str] = None
    items_discovered: int = 0
    total_bytes: int = 0
    elapsed_seconds: float = 0.0
    months: dict = Field(default_factory=dict)
    device_name: Optional[str] = None
    provider: Optional[str] = None


def _scan_months(items) -> dict:
    months: dict[str, int] = {}
    for item in items:
        key = item.capture_date.strftime("%Y-%m") if getattr(item, "capture_date", None) else "unknown"
        months[key] = months.get(key, 0) + 1
    return months


@router.post("/scan", response_model=ScanStartResponse)
def start_device_scan(body: ScanStartRequest, ctx: AppContext = Depends(get_app_context)):
    """Background Camera Roll scan. Poll GET /import/scan-status; summary/preview reuse the cached generation."""
    import time

    cache = ctx.active_scan_results
    # Reuse a running scan instead of enumerating the phone twice.
    running_job_id = cache.get("scan_job_id")
    if running_job_id and not body.refresh:
        job = ctx.job_repo.get_by_id(running_job_id)
        if job and job.status in ("QUEUED", "RUNNING"):
            return ScanStartResponse(job_id=running_job_id, scan_id=cache.get("scan_id"), scan_generation=cache.get("scan_generation"), status="SCANNING", reused_cache=True)
    if running_job_id:
        old = ctx.job_repo.get_by_id(running_job_id)
        if old and old.status in ("QUEUED", "RUNNING"):
            if body.refresh:
                ctx.job_manager.cancel_job(running_job_id)
            else:
                return ScanStartResponse(job_id=running_job_id, scan_id=cache.get("scan_id"), scan_generation=cache.get("scan_generation"), status="SCANNING", reused_cache=True)
    # Fast path: completed generation already cached.
    if not body.refresh and cache.get("iphone_items") is not None and cache.get("scan_id"):
        return ScanStartResponse(job_id=cache.get("scan_job_id"), scan_id=cache.get("scan_id"), scan_generation=cache.get("scan_generation"), status="COMPLETED", reused_cache=True)

    import uuid

    scan_id = uuid.uuid4().hex
    cache["scan_id"] = scan_id
    cache["scan_state"] = "SCANNING"
    cache["scan_partial"] = {"discovered": 0, "total": 0, "bytes": 0, "months": {}}
    cache["scan_started_at"] = time.time()
    cache.pop("scan_completed_at", None)

    src_path = body.source_path

    def scan_task(progress_cb):
        t0 = time.time()
        if src_path:
            src = Path(src_path).resolve()
            if not src.exists() or not src.is_dir():
                raise ValueError(f"Source path '{src_path}' does not exist or is not a directory")
            device = LocalFolderDevice(src, name="Custom Source")
        else:
            device = get_connected_iphone()
            if device is None:
                raise ValueError("No iPhone detected over USB")
        # Close any previously cached provider before replacing it.
        old = cache.get("iphone_device")
        if old is not None and old is not device:
            try:
                old.close()
            except Exception:
                pass

        def wrapped(completed: int, total: int):
            progress_cb(completed, total)
            cache["scan_partial"] = {"discovered": completed, "total": total, "bytes": 0, "months": {}}
            cache["scan_elapsed"] = time.time() - t0

        items = MediaScanner(device).scan_with_progress(wrapped)
        # A cancelled scan leaves the previous good generation untouched.
        if ctx.job_manager.is_cancelled(cache.get("scan_job_id", "")):
            try:
                device.close()
            except Exception:
                pass
            return
        cache["iphone_device"] = device
        cache["iphone_items"] = items
        cache["scan_id"] = scan_id
        cache["scan_generation"] = int(cache.get("scan_generation", 0) or 0) + 1
        cache["scan_device_id"] = getattr(device, "name", type(device).__name__)
        cache["scan_partial"] = {"discovered": len(items), "total": len(items), "bytes": sum(i.size_bytes for i in items), "months": _scan_months(items)}
        cache["scan_state"] = "COMPLETED"
        cache["scan_completed_at"] = time.time()
        cache.pop("device_summary", None)
        ctx.logger.info("iphone background scan scan_id=%s items=%d bytes=%d elapsed=%.1fs", scan_id, len(items), sum(i.size_bytes for i in items), time.time() - t0)

    job = ctx.job_manager.submit_job("DEVICE_SCAN", scan_task)
    cache["scan_job_id"] = job.id
    return ScanStartResponse(job_id=job.id, scan_id=scan_id, scan_generation=cache.get("scan_generation"), status="SCANNING", reused_cache=False)


@router.get("/scan-status", response_model=ScanStatusResponse)
def get_scan_status(ctx: AppContext = Depends(get_app_context)):
    """Current scan generation + live progress. Partial months fill in on completion."""
    import time

    cache = ctx.active_scan_results
    job_id = cache.get("scan_job_id")
    job_status = None
    if job_id:
        job = ctx.job_repo.get_by_id(job_id)
        job_status = job.status if job else None
    state = cache.get("scan_state", "IDLE")
    if job_status in ("CANCELLED", "FAILED", "INTERRUPTED") and state == "SCANNING":
        state = "CANCELLED" if job_status == "CANCELLED" else "FAILED"
        cache["scan_state"] = state
    partial = cache.get("scan_partial") or {}
    started = cache.get("scan_started_at")
    completed = cache.get("scan_completed_at")
    elapsed = (completed - started) if (started and completed) else ((time.time() - started) if started else 0.0)
    device = cache.get("iphone_device")
    return ScanStatusResponse(
        state=state,
        scan_id=cache.get("scan_id"),
        scan_generation=cache.get("scan_generation"),
        job_id=job_id,
        job_status=job_status,
        items_discovered=int(partial.get("discovered", 0) or 0),
        total_bytes=int(partial.get("bytes", 0) or 0),
        elapsed_seconds=round(float(elapsed or 0.0), 1),
        months=dict(partial.get("months", {}) or {}),
        device_name=getattr(device, "name", None) if device is not None else cache.get("scan_device_id"),
        provider=getattr(device, "provider_name", None) if device is not None else None,
    )


@router.get("/device-summary", response_model=DeviceSummaryResponse)
def get_device_summary(refresh: bool = False, ctx: AppContext = Depends(get_app_context)):
    """What's on the connected device right now. Rebuilt per request — non-blocking."""
    cache = ctx.active_scan_results

    # 1. If background scan is actively running, report SCANNING immediately
    if not refresh and cache.get("scan_state") == "SCANNING":
        partial = cache.get("scan_partial") or {}
        discovered = int(partial.get("discovered", 0) or 0)
        return DeviceSummaryResponse(
            device_name=cache.get("scan_device_id", "iPhone"),
            is_connected=True,
            is_real_device=True,
            photos_count=0,
            videos_count=0,
            screenshots_count=0,
            live_photos_count=0,
            total_count=discovered,
            total_bytes=int(partial.get("bytes", 0) or 0),
            formatted_total=StorageManager.format_bytes(int(partial.get("bytes", 0) or 0)),
            provider=cache.get("scan_provider"),
            connection_status="SCANNING",
            message="Scanning iPhone Camera Roll over USB...",
            action="Keep your iPhone unlocked.",
            scan_id=cache.get("scan_id"),
            scan_generation=cache.get("scan_generation"),
        )

    # 2. Fast cache hit
    if not refresh:
        cached_device = cache.get("iphone_device")
        cached_items = cache.get("iphone_items")
        if cached_device is not None and cached_items is not None:
            try:
                if cached_device.is_connected:
                    summary = _build_device_summary(cached_device, cached_items)
                    summary.scan_id = cache.get("scan_id")
                    summary.scan_generation = cache.get("scan_generation")
                    return summary
            except Exception:
                pass

    # 3. Quick probe (50ms) to avoid hanging on locked/disconnected device
    probe = probe_connected_iphone()
    probe_state = probe.get("state", "DISCONNECTED")

    if probe_state != "READY":
        import os
        if os.getenv("USE_MOCK_IPHONE") == "1":
            mock_path = ctx.storage_manager.library_root.parent / "tests" / "fixtures" / "fake_iphone"
            if not mock_path.exists():
                from tests.fixtures.fake_iphone_generator import create_mock_iphone_fixture
                create_mock_iphone_fixture(mock_path)
            device = MockIPhoneDevice(mock_path)
            items = MediaScanner(device).scan()
            summary = _build_device_summary(device, items)
            summary.scan_id = cache.get("scan_id")
            summary.scan_generation = cache.get("scan_generation")
            return summary

        return DeviceSummaryResponse(
            device_name=probe.get("device_name") or "No iPhone Detected",
            is_connected=probe_state in ("READY", "EMPTY"),
            is_real_device=probe_state != "DISCONNECTED",
            photos_count=0,
            videos_count=0,
            screenshots_count=0,
            live_photos_count=0,
            total_count=0,
            total_bytes=0,
            formatted_total="0 B",
            provider=probe.get("provider"),
            connection_status=probe_state,
            message=probe.get("message"),
            action=probe.get("action"),
        )

    # 4. Device is READY over USB — launch background scan without blocking the HTTP worker
    start_device_scan(ScanStartRequest(refresh=refresh), ctx=ctx)
    return DeviceSummaryResponse(
        device_name=probe.get("device_name") or "iPhone",
        is_connected=True,
        is_real_device=True,
        photos_count=0,
        videos_count=0,
        screenshots_count=0,
        live_photos_count=0,
        total_count=0,
        total_bytes=0,
        formatted_total="0 B",
        provider=probe.get("provider"),
        connection_status="SCANNING",
        message="Reading Camera Roll over USB. Keep iPhone unlocked.",
        action="Scanning in progress.",
        scan_id=cache.get("scan_id"),
        scan_generation=cache.get("scan_generation"),
    )


class ImportFilterParams(BaseModel):
    source_path: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    allowed_types: Optional[Set[MediaType]] = None
    min_video_size_bytes: Optional[int] = None
    max_video_size_bytes: Optional[int] = None
    max_total_import_bytes: Optional[int] = None
    limit: Optional[int] = None
    selected_ids: Optional[Set[str]] = None
    target_folder: Optional[str] = None
    group_name: Optional[str] = Field(default=None, max_length=120)


class ImportMediaItemResponse(BaseModel):
    id: str
    filename: str
    media_type: MediaType
    size_bytes: int
    formatted_size: str
    capture_date: Optional[str] = None
    month_key: str
    already_imported: bool = False


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
    items: List[ImportMediaItemResponse] = Field(default_factory=list)


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
        scanned_items = MediaScanner(device).scan()
    else:
        # ponytail: same typed-failure rule as device-summary — 503 with an
        # action, never a bare 500 (usually phone locked mid-scan).
        try:
            device, scanned_items = _scan_connected_iphone(ctx)
            if device is None:
                import os
                if os.getenv("USE_MOCK_IPHONE") == "1":
                    mock_path = ctx.storage_manager.library_root.parent / "tests" / "fixtures" / "fake_iphone"
                    if not mock_path.exists():
                        from tests.fixtures.fake_iphone_generator import create_mock_iphone_fixture
                        create_mock_iphone_fixture(mock_path)
                    device = MockIPhoneDevice(mock_path)
                else:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="No iPhone detected over USB. Please connect your iPhone via USB cable, unlock the screen, and tap 'Trust This Computer' if prompted.",
                    )
                scanned_items = MediaScanner(device).scan()
        except HTTPException:
            raise
        except Exception as exc:  # noqa: BLE001
            state = _classify_afc_error(exc)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"{_PROBE_MESSAGES.get(state, 'iPhone unavailable.')} {_PROBE_ACTIONS.get(state, '')}".strip(),
            )

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
        limit=params.limit,
    )
    filter_res = MediaFilter(criteria).apply(scanned_items)
    filtered_items = filter_res.accepted
    if params.selected_ids is not None:
        filtered_items = [
            item
            for item in filtered_items
            if item.source_entry and item.source_entry.unique_id in params.selected_ids
        ]
    return device, filtered_items


def _preview_item(item, already_imported_ids: set[str]) -> ImportMediaItemResponse:
    source_id = item.source_entry.unique_id if item.source_entry else item.filename
    return ImportMediaItemResponse(
        id=source_id,
        filename=item.filename,
        media_type=item.media_type,
        size_bytes=item.size_bytes,
        formatted_size=StorageManager.format_bytes(item.size_bytes),
        capture_date=item.capture_date.isoformat() if item.capture_date else None,
        month_key=item.capture_date.strftime("%Y-%m") if item.capture_date else "unknown",
        already_imported=source_id in already_imported_ids,
    )


def _destination_prefix(params: ImportFilterParams, ctx: AppContext) -> Optional[Path]:
    value = (params.target_folder or "").strip().lstrip("/\\")
    if not value:
        return None
    raw = Path(value)
    if raw.is_absolute():
        raise HTTPException(status_code=400, detail="Target folder must be inside the active vault")
    try:
        target = validate_safe_path(
            ctx.storage_manager.library_root / raw,
            allowed_roots=[ctx.storage_manager.library_root],
            must_exist=True,
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid target folder: {exc}")
    if not target.is_dir():
        raise HTTPException(status_code=400, detail="Target folder is not a directory")
    return target.relative_to(ctx.storage_manager.library_root)


def _preview_or_503(ctx: AppContext, filtered_items, device):
    """Runs importer.preview; a transient USB failure mid-preview is 503 with an action, never a 500."""
    try:
        return ctx.importer.preview(filtered_items, device=device)
    except Exception as exc:  # noqa: BLE001
        state = _classify_afc_error(exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"{_PROBE_MESSAGES.get(state, 'iPhone unavailable.')} {_PROBE_ACTIONS.get(state, '')}".strip(),
        )


@router.post("/preview", response_model=ImportPreviewResponse)
def get_import_preview(
    params: ImportFilterParams, ctx: AppContext = Depends(get_app_context)
):
    device, filtered_items = _get_device_and_filtered_items(params, ctx)
    preview = _preview_or_503(ctx, filtered_items, device)
    duplicate_ids = {
        item.source_entry.unique_id
        for item, _ in preview.already_imported_items
        if item.source_entry
    }

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
        items=[_preview_item(item, duplicate_ids) for item in filtered_items],
    )


@router.post("/start", response_model=ImportStartResponse)
def start_import(
    params: ImportFilterParams, ctx: AppContext = Depends(get_app_context)
):
    device, filtered_items = _get_device_and_filtered_items(params, ctx)
    preview = _preview_or_503(ctx, filtered_items, device)
    destination_prefix = _destination_prefix(params, ctx)

    if not filtered_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Select at least one photo or video to import",
        )

    if not preview.can_fit:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot start import: required space exceeds usable disk space (respecting 10 GB reserve)",
        )

    def import_task(progress_cb):
        def pcb(current, total, item, msg):
            progress_cb(current, total)
        summary = ctx.importer.execute_import(
            filtered_items,
            device,
            progress_callback=pcb,
            destination_prefix=destination_prefix,
        )
        group_name = (params.group_name or "").strip()
        if group_name and summary.imported_media_ids:
            library = ctx.library_repo.get_or_create(str(ctx.storage_manager.library_root))
            album = ctx.album_repo.get_album_by_name(library.id, group_name)
            if album is None:
                album = ctx.album_repo.create_album(
                    library.id,
                    group_name,
                    description="Created during iPhone import",
                )
            for media_id in summary.imported_media_ids:
                ctx.album_repo.add_media_to_album(album.id, media_id)

    job = ctx.job_manager.submit_job("MEDIA_IMPORT", import_task)

    return ImportStartResponse(
        job_id=job.id,
        status=job.status,
        total_candidates=len(filtered_items),
    )
