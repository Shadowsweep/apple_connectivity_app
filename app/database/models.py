from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


def utc_now() -> datetime:
    """Returns naive UTC datetime object."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class LibraryRecord(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    root_path: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class DeviceRecord(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    device_type: str = "IPHONE"
    identifier: Optional[str] = None
    created_at: Optional[datetime] = None
    last_seen_at: Optional[datetime] = None


class MediaRecord(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    library_id: str
    filename: str
    relative_path: str
    media_type: str  # "PHOTO", "VIDEO", "SCREENSHOT", "LIVE_PHOTO", "OTHER"
    mime_type: Optional[str] = None
    extension: str
    size_bytes: int
    capture_date: Optional[datetime] = None
    imported_at: Optional[datetime] = None
    width: Optional[int] = None
    height: Optional[int] = None
    duration_ms: Optional[int] = None
    hash_sha256: str
    thumbnail_path: Optional[str] = None
    status: str = "ACTIVE"  # "ACTIVE", "MISSING", "TRASHED", "CORRUPT"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class ImportRecord(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    library_id: str
    device_id: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    total_files: int = 0
    successful_files: int = 0
    failed_files: int = 0
    duplicate_files: int = 0
    bytes_imported: int = 0
    status: str = "IN_PROGRESS"  # "IN_PROGRESS", "COMPLETED", "FAILED", "CANCELLED"


class ImportItemRecord(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    import_id: str
    media_id: Optional[str] = None
    source_path: str
    status: str = "SUCCESS"  # "SUCCESS", "FAILED", "SKIPPED_DUPLICATE", "SKIPPED_SPACE"
    error: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class JobRecord(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    job_type: str
    status: str = "QUEUED"  # "QUEUED", "RUNNING", "COMPLETED", "FAILED", "CANCELLED"
    progress: int = 0
    total: int = 0
    completed: int = 0
    failed: int = 0
    error: Optional[str] = None
    created_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class AlbumRecord(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    library_id: str
    name: str
    description: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class AlbumItemRecord(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    album_id: str
    media_id: str
    created_at: Optional[datetime] = None


class FavoriteRecord(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    media_id: str
    created_at: Optional[datetime] = None


class WatchProgressRecord(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    media_id: str
    position_ms: int
    duration_ms: int
    completed: bool = False
    updated_at: Optional[datetime] = None


class TrashRecord(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    media_id: str
    original_relative_path: str
    deleted_at: Optional[datetime] = None


class SavedSearchRecord(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    query_json: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class CleanupHistoryRecord(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    device_id: str
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    total_items: int = 0
    deleted_items: int = 0
    failed_items: int = 0
    bytes_reclaimed: int = 0
    status: str = "COMPLETED"


class CleanupItemRecord(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    session_id: str
    device_id: str
    local_media_id: Optional[str] = None
    device_identifier: str
    device_filename: str
    device_size: int
    verification_status: str
    cleanup_status: str
    scanned_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None
    error: Optional[str] = None


