import threading
from pathlib import Path
from typing import Optional, Set
from PIL import Image, ImageOps

from app.core.security import validate_safe_path
from app.database.models import MediaRecord
from app.storage.manager import StorageManager


class ThumbnailService:
    """Generates and serves cached thumbnails with bounded concurrency and safety."""

    THUMBNAIL_SIZE = (384, 384)

    def __init__(self, storage_manager: StorageManager, max_concurrent: int = 4):
        self.storage_manager = storage_manager
        self.thumbnail_dir = self.storage_manager.library_root / ".memeasy" / "thumbnails"
        self.thumbnail_dir.mkdir(parents=True, exist_ok=True)
        self._semaphore = threading.Semaphore(max_concurrent)

    def get_thumbnail_path(self, media: MediaRecord) -> Optional[Path]:
        """Returns existing valid cached thumbnail or generates a new one safely."""
        cached_path = self.thumbnail_dir / f"{media.id}.jpg"
        if cached_path.exists():
            try:
                # Check for 0-byte or corrupted cached file
                if cached_path.stat().st_size > 0:
                    return cached_path
                else:
                    cached_path.unlink(missing_ok=True)
            except Exception:
                pass

        # Resolve source path safely using validate_safe_path
        try:
            source_path = validate_safe_path(
                self.storage_manager.library_root / media.relative_path,
                allowed_roots=[self.storage_manager.library_root],
                must_exist=True,
            )
        except Exception:
            return None

        # Generate thumbnail with bounded concurrency
        acquired = self._semaphore.acquire(timeout=5.0)
        if not acquired:
            return None

        try:
            with Image.open(source_path) as img:
                img = ImageOps.exif_transpose(img)
                img.thumbnail(self.THUMBNAIL_SIZE, Image.Resampling.LANCZOS)
                if img.mode in ("RGBA", "P"):
                    img = img.convert("RGB")
                temp_thumb = cached_path.with_suffix(".jpg.part")
                img.save(temp_thumb, format="JPEG", quality=85)
                temp_thumb.replace(cached_path)
                return cached_path
        except Exception:
            return None
        finally:
            self._semaphore.release()

    def cleanup_orphans(self, active_media_ids: Set[str]) -> int:
        """Removes cached thumbnails whose media records no longer exist."""
        pruned_count = 0
        if not self.thumbnail_dir.exists():
            return 0

        for file in self.thumbnail_dir.glob("*.jpg"):
            media_id = file.stem
            if media_id not in active_media_ids:
                try:
                    file.unlink(missing_ok=True)
                    pruned_count += 1
                except Exception:
                    pass
        return pruned_count
