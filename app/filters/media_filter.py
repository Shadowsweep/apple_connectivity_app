from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional, Set, Tuple
from pydantic import BaseModel

from app.scanner.metadata import MediaItem, MediaType


class FilterCriteria(BaseModel):
    """Configurable user filter criteria for media import."""
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    allowed_types: Set[MediaType] = {
        MediaType.PHOTO,
        MediaType.VIDEO,
        MediaType.SCREENSHOT,
        MediaType.LIVE_PHOTO,
    }
    min_video_size_bytes: Optional[int] = None
    max_video_size_bytes: Optional[int] = None
    max_total_import_bytes: Optional[int] = None


@dataclass
class FilterResult:
    accepted: List[MediaItem] = field(default_factory=list)
    rejected: List[Tuple[MediaItem, str]] = field(default_factory=list)

    @property
    def total_accepted_bytes(self) -> int:
        return sum(item.size_bytes for item in self.accepted)

    @property
    def total_accepted_count(self) -> int:
        return len(self.accepted)

    @property
    def total_rejected_count(self) -> int:
        return len(self.rejected)


class MediaFilter:
    """Evaluates media items against criteria without disk modification."""

    def __init__(self, criteria: FilterCriteria):
        self.criteria = criteria

    def apply(self, items: List[MediaItem]) -> FilterResult:
        result = FilterResult()
        current_cumulative_bytes = 0

        for item in items:
            # 1. Type filter
            if item.media_type not in self.criteria.allowed_types:
                result.rejected.append((item, f"Media type {item.media_type.value} not selected"))
                continue

            # 2. Date filter
            if self.criteria.date_from and item.capture_date:
                if item.capture_date < self.criteria.date_from:
                    result.rejected.append((item, f"Capture date {item.formatted_date} before range"))
                    continue

            if self.criteria.date_to and item.capture_date:
                if item.capture_date > self.criteria.date_to:
                    result.rejected.append((item, f"Capture date {item.formatted_date} after range"))
                    continue

            # 3. Video size bounds
            if item.media_type == MediaType.VIDEO:
                if self.criteria.min_video_size_bytes and item.size_bytes < self.criteria.min_video_size_bytes:
                    result.rejected.append((item, f"Video size {item.size_bytes}B below minimum {self.criteria.min_video_size_bytes}B"))
                    continue
                if self.criteria.max_video_size_bytes and item.size_bytes > self.criteria.max_video_size_bytes:
                    result.rejected.append((item, f"Video size {item.size_bytes}B exceeds maximum {self.criteria.max_video_size_bytes}B"))
                    continue

            # 4. Storage Quota Limit check
            if self.criteria.max_total_import_bytes:
                if current_cumulative_bytes + item.size_bytes > self.criteria.max_total_import_bytes:
                    result.rejected.append((item, "Exceeds total import storage budget"))
                    continue

            # Accepted
            current_cumulative_bytes += item.size_bytes
            result.accepted.append(item)

        return result
