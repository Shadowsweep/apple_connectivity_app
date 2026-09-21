import struct
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api.dependencies import AppContext, get_app_context

router = APIRouter(tags=["MediaMaintenance"])


from app.scanner.metadata import MetadataExtractor


def _parse_mvhd_duration_ms(file_path: Path) -> Optional[int]:
    """QuickTime/MP4 mvhd box -> duration in ms. Delegates to MetadataExtractor with ffmpeg fallback."""
    try:
        _, duration_ms = MetadataExtractor._extract_quicktime_metadata(file_path)
        return duration_ms
    except Exception:
        return None


class DurationBackfillResponse(BaseModel):
    scanned: int
    updated: int
    failed: int


@router.post("/media/backfill-durations", response_model=DurationBackfillResponse)
def backfill_durations(ctx: AppContext = Depends(get_app_context)):
    """Fills in missing durations for videos by reading their MP4/QuickTime headers."""
    videos = ctx.media_repo.filter_media(media_type="VIDEO", status="ACTIVE", limit=100000)
    missing = [v for v in videos if not v.duration_ms]

    updated = 0
    failed = 0
    for record in missing:
        file_path = ctx.storage_manager.library_root / record.relative_path
        duration_ms = _parse_mvhd_duration_ms(file_path)
        if duration_ms:
            record.duration_ms = duration_ms
            ctx.media_repo.insert_or_update(record)
            updated += 1
        else:
            failed += 1

    return DurationBackfillResponse(scanned=len(missing), updated=updated, failed=failed)
