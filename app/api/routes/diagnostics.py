import os
import platform
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.dependencies import AppContext, get_app_context
from app.database.models import utc_now
from app.storage.manager import StorageManager

router = APIRouter(tags=["Diagnostics & Reliability"])


class DatabaseIntegrityResponse(BaseModel):
    is_healthy: bool
    messages: List[str]
    database_path: str
    size_bytes: int


class BackupResponse(BaseModel):
    success: bool
    backup_path: str
    size_bytes: int
    created_at: datetime


class RestoreRequest(BaseModel):
    backup_path: Optional[str] = None


class DiagnosticsReport(BaseModel):
    app_name: str = "MEMEASY"
    version: str = "1.0.0"
    os: str
    python_version: str
    library_root: str
    database_status: DatabaseIntegrityResponse
    storage_stats: Dict[str, Any]
    total_active_media: int
    total_missing_media: int
    total_trashed_media: int
    active_background_jobs: int
    thumbnail_cache_files: int
    thumbnail_cache_bytes: int
    active_locks: Dict[str, str]
    timestamp: datetime


@router.get("/database/integrity", response_model=DatabaseIntegrityResponse)
def check_database_integrity(ctx: AppContext = Depends(get_app_context)):
    """Runs SQLite quick_check and full integrity_check."""
    is_healthy, msgs = ctx.db.check_integrity()
    db_size = ctx.db.db_path.stat().st_size if ctx.db.db_path.exists() else 0
    return DatabaseIntegrityResponse(
        is_healthy=is_healthy,
        messages=msgs,
        database_path=str(ctx.db.db_path),
        size_bytes=db_size,
    )


@router.post("/database/backup", response_model=BackupResponse)
def backup_database(ctx: AppContext = Depends(get_app_context)):
    """Creates a consistent online SQLite backup (.db.bak)."""
    backup_file = ctx.db.backup()
    size = backup_file.stat().st_size if backup_file.exists() else 0
    return BackupResponse(
        success=True,
        backup_path=str(backup_file),
        size_bytes=size,
        created_at=utc_now(),
    )


@router.post("/database/restore", response_model=BackupResponse)
def restore_database(
    req: Optional[RestoreRequest] = None,
    ctx: AppContext = Depends(get_app_context),
):
    """Restores database from backup snapshot with operation lock."""
    backup_path = Path(req.backup_path).resolve() if req and req.backup_path else ctx.db.db_path.with_suffix(".db.bak")
    if not backup_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Backup file not found at '{backup_path}'",
        )

    with ctx.lock_manager.guard("db_restore", "RESTORE_DB"):
        success = ctx.db.restore(backup_path)

    size = ctx.db.db_path.stat().st_size if ctx.db.db_path.exists() else 0
    return BackupResponse(
        success=success,
        backup_path=str(backup_path),
        size_bytes=size,
        created_at=utc_now(),
    )


@router.post("/thumbnails/cleanup")
def cleanup_orphan_thumbnails(ctx: AppContext = Depends(get_app_context)):
    """Scans and deletes cached thumbnails for deleted/missing media."""
    conn = ctx.db.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM media WHERE status = 'ACTIVE'")
    active_ids = {row[0] for row in cursor.fetchall()}

    pruned = ctx.thumbnails.cleanup_orphans(active_ids)
    return {"pruned_count": pruned}


@router.get("/diagnostics", response_model=DiagnosticsReport)
def get_diagnostics_report(ctx: AppContext = Depends(get_app_context)):
    """Compiles complete health and runtime diagnostics report."""
    is_healthy, msgs = ctx.db.check_integrity()
    db_size = ctx.db.db_path.stat().st_size if ctx.db.db_path.exists() else 0

    storage_stats = ctx.storage_manager.get_storage_stats()

    # Query status distributions
    conn = ctx.db.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT status, count(*) FROM media GROUP BY status")
    status_counts = dict(cursor.fetchall())

    # Count thumbnails
    thumb_dir = ctx.thumbnails.thumbnail_dir
    thumb_count = 0
    thumb_bytes = 0
    if thumb_dir.exists():
        for f in thumb_dir.glob("*.jpg"):
            thumb_count += 1
            thumb_bytes += f.stat().st_size

    active_jobs = len(ctx.job_repo.list_active_jobs())
    active_locks = ctx.lock_manager.get_active_operations()

    return DiagnosticsReport(
        app_name="MEMEASY",
        version="1.0.0",
        os=f"{platform.system()} {platform.release()} ({platform.version()})",
        python_version=platform.python_version(),
        library_root=str(ctx.storage_manager.library_root),
        database_status=DatabaseIntegrityResponse(
            is_healthy=is_healthy,
            messages=msgs,
            database_path=str(ctx.db.db_path),
            size_bytes=db_size,
        ),
        storage_stats={
            "total_bytes": storage_stats.total_bytes,
            "used_bytes": max(0, storage_stats.total_bytes - storage_stats.free_bytes),
            "free_bytes": storage_stats.free_bytes,
            "usable_bytes": storage_stats.usable_bytes,
            "safety_reserve_bytes": storage_stats.safety_reserve_bytes,
        },
        total_active_media=status_counts.get("ACTIVE", 0),
        total_missing_media=status_counts.get("MISSING", 0),
        total_trashed_media=status_counts.get("TRASHED", 0),
        active_background_jobs=active_jobs,
        thumbnail_cache_files=thumb_count,
        thumbnail_cache_bytes=thumb_bytes,
        active_locks=active_locks,
        timestamp=utc_now(),
    )


@router.post("/diagnostics/export")
def export_diagnostics(ctx: AppContext = Depends(get_app_context)):
    report = get_diagnostics_report(ctx)
    return report.model_dump()
