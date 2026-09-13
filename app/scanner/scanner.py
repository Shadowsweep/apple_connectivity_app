from collections import defaultdict
from pathlib import Path
from typing import List

from app.device.iphone import MediaDevice
from app.scanner.metadata import MediaItem, MediaType, MetadataExtractor


class MediaScanner:
    """Orchestrates scanning media devices and synthesizing rich metadata."""

    def __init__(self, device: MediaDevice):
        self.device = device

    def scan(self) -> List[MediaItem]:
        """Discovers all media on device and extracts standardized metadata."""
        if not self.device.is_connected:
            return []

        raw_entries = self.device.discover_media()
        items: List[MediaItem] = []

        # Extract individual metadata
        for entry in raw_entries:
            item = MetadataExtractor.extract_from_entry(entry)
            items.append(item)

        # Detect and pair Live Photos (same base stem e.g. IMG_1001.HEIC + IMG_1001.MOV)
        self._detect_live_photos(items)

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
