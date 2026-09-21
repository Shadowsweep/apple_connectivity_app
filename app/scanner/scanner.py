from collections import defaultdict
from pathlib import Path
from typing import Callable, List, Optional

from app.device.iphone import MediaDevice
from app.scanner.metadata import MediaItem, MediaType, MetadataExtractor, judge_screenshots


class MediaScanner:
    """Orchestrates scanning media devices and synthesizing rich metadata."""

    def __init__(self, device: MediaDevice):
        self.device = device

    def scan(self) -> List[MediaItem]:
        """Discovers all media on device and extracts standardized metadata."""
        return self.scan_with_progress()

    def scan_with_progress(self, progress_cb: Optional[Callable[[int, int], None]] = None) -> List[MediaItem]:
        """Same as scan() but reports (completed, total) during metadata extraction."""
        if not self.device.is_connected:
            return []

        raw_entries = self.device.discover_media()
        items: List[MediaItem] = []
        total = len(raw_entries)

        # Extract individual metadata
        for idx, entry in enumerate(raw_entries, start=1):
            item = MetadataExtractor.extract_from_entry(entry)
            items.append(item)
            if progress_cb is not None and (idx % 25 == 0 or idx == total):
                progress_cb(idx, total)

        # Detect and pair Live Photos (same base stem e.g. IMG_1001.HEIC + IMG_1001.MOV)
        self._detect_live_photos(items)

        # ponytail: one batched Jev call re-checks non-camera-pattern PHOTO names
        # (localized screenshots); no key/offline = no-op, never raises.
        try:
            hits = judge_screenshots([
                it.filename for it in items
                if it.media_type == MediaType.PHOTO and it.extension in MetadataExtractor.PHOTO_EXTENSIONS
            ])
        except Exception:
            hits = set()
        for it in items:
            if it.filename in hits:
                it.media_type = MediaType.SCREENSHOT

        if progress_cb is not None and total:
            progress_cb(total, total)
        return items

    def _detect_live_photos(self, items: List[MediaItem]):
        # Group by directory and base stem
        grouped = defaultdict(list)
        for item in items:
            stem = Path(item.filename).stem.upper()
            parent = item.source_entry.source_path.parent if item.source_entry else Path("")
            grouped[(parent, stem)].append(item)

        for (parent, stem), group in grouped.items():
            if len(group) == 2:
                extensions = {it.extension.lower() for it in group}
                # Standard Apple Live Photo pair: HEIC/JPG + MOV
                if (".heic" in extensions or ".jpg" in extensions) and ".mov" in extensions:
                    for it in group:
                        it.media_type = MediaType.LIVE_PHOTO
