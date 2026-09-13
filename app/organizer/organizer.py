from pathlib import Path
from typing import Optional

from app.scanner.metadata import MediaItem, MediaType


class MediaOrganizer:
    """Computes standardized relative library paths according to capture date & media type."""

    FOLDER_MAPPING = {
        MediaType.PHOTO: "Photos",
        MediaType.VIDEO: "Videos",
        MediaType.SCREENSHOT: "Screenshots",
        MediaType.LIVE_PHOTO: "LivePhotos",
        MediaType.OTHER: "Photos",
    }

    def __init__(self, library_root: Path):
        self.library_root = Path(library_root)

    def determine_relative_path(self, item: MediaItem, disambiguation_index: int = 0) -> Path:
        """Generates relative path e.g. Photos/2026/02/IMG_1024.HEIC."""
        top_folder = self.FOLDER_MAPPING.get(item.media_type, "Photos")

        if item.capture_date:
            year_str = f"{item.capture_date.year:04d}"
            month_str = f"{item.capture_date.month:02d}"
            date_dir = Path(year_str) / month_str
        else:
            date_dir = Path("Unknown")

        target_dir = Path(top_folder) / date_dir

        filename = item.filename
        if disambiguation_index > 0:
            stem = Path(filename).stem
            suffix = Path(filename).suffix
            filename = f"{stem}_{disambiguation_index}{suffix}"

        return target_dir / filename

    def resolve_destination(self, item: MediaItem) -> Path:
        """Finds a non-colliding destination path if a different file with same name exists."""
        disambig = 0
        while True:
            rel_path = self.determine_relative_path(item, disambig)
            abs_path = self.library_root / rel_path
            if not abs_path.exists():
                return rel_path
            disambig += 1
