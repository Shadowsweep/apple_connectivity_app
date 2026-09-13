from pathlib import Path
from typing import Optional
from PIL import Image, ImageOps

from app.database.models import MediaRecord
from app.storage.manager import StorageManager


class ThumbnailService:
    """Generates and serves cached thumbnails for library media."""

    THUMBNAIL_SIZE = (384, 384)

    def __init__(self, storage_manager: StorageManager):
        self.storage_manager = storage_manager
        self.thumbnail_dir = self.storage_manager.library_root / ".memeasy" / "thumbnails"
        self.thumbnail_dir.mkdir(parents=True, exist_ok=True)

    def get_thumbnail_path(self, media: MediaRecord) -> Optional[Path]:
        """Returns existing cached thumbnail or generates a new one."""
        cached_path = self.thumbnail_dir / f"{media.id}.jpg"
        if cached_path.exists():
            return cached_path

        # Resolve source path safely
        source_path = (self.storage_manager.library_root / media.relative_path).resolve()
        if not source_path.exists():
            return None

        # Verify path containment (Path traversal defense)
        if not str(source_path).startswith(str(self.storage_manager.library_root.resolve())):
            return None

        # Generate thumbnail for supported image formats
        try:
            with Image.open(source_path) as img:
                # Transpose according to EXIF orientation
                img = ImageOps.exif_transpose(img)
                img.thumbnail(self.THUMBNAIL_SIZE, Image.Resampling.LANCZOS)
                # Convert RGBA to RGB for JPEG saving
                if img.mode in ("RGBA", "P"):
                    img = img.convert("RGB")
                img.save(cached_path, format="JPEG", quality=85)
                return cached_path
        except Exception:
            return None
