import threading
from pathlib import Path
from typing import Optional, Set
from PIL import Image, ImageOps

# ponytail: HEIC is the default iPhone format; without this opener PIL raises on every .heic
from pillow_heif import register_heif_opener

register_heif_opener()

from app.core.security import validate_safe_path
from app.database.models import MediaRecord
from app.storage.manager import StorageManager


class ThumbnailService:
    """Generates and serves cached thumbnails with bounded concurrency and safety."""

    THUMBNAIL_SIZE = (384, 384)
    # ponytail: fixed 10%-in seek for video preview frames; real ffmpeg scrubbing if this proves too crude
    VIDEO_SEEK_RATIO = 0.10

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
            # ponytail: route by extension too — LIVE_PHOTO .mov companions aren't VIDEO type but need ffmpeg
            if media.media_type == "VIDEO" or source_path.suffix.lower() in (".mov", ".mp4", ".m4v", ".avi", ".mkv", ".3gp"):
                return self._generate_video_thumbnail(source_path, cached_path)
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

    def _generate_video_thumbnail(self, video_path: Path, cached_path: Path) -> Optional[Path]:
        """Extracts a real frame near the 10% mark via ffmpeg; falls back to first frame or play glyph tile."""
        try:
            import imageio_ffmpeg
            ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
            import subprocess

            # 1. Probe duration
            probe = subprocess.run(
                [ffmpeg, "-i", str(video_path), "-f", "null", "-"],
                capture_output=True, text=True, timeout=15,
            )
            duration_s = self._parse_duration(probe.stderr)

            # 2. Seek safely: for short clips seek to 0.1s or 0.0s
            seek = (duration_s * self.VIDEO_SEEK_RATIO) if (duration_s and duration_s > 0.5) else 0.0
            temp_thumb = cached_path.with_suffix(".jpg.part")
            extract = subprocess.run(
                [
                    ffmpeg, "-y", "-ss", f"{seek:.2f}", "-i", str(video_path),
                    "-frames:v", "1", "-vf", f"scale={self.THUMBNAIL_SIZE[0]}:-2",
                    "-q:v", "4", str(temp_thumb),
                ],
                capture_output=True, timeout=30,
            )
            if extract.returncode == 0 and temp_thumb.exists() and temp_thumb.stat().st_size > 0:
                temp_thumb.replace(cached_path)
                return cached_path

            # Fallback: grab frame 0 directly without seeking
            extract0 = subprocess.run(
                [
                    ffmpeg, "-y", "-i", str(video_path),
                    "-frames:v", "1", "-vf", f"scale={self.THUMBNAIL_SIZE[0]}:-2",
                    "-q:v", "4", str(temp_thumb),
                ],
                capture_output=True, timeout=30,
            )
            if extract0.returncode == 0 and temp_thumb.exists() and temp_thumb.stat().st_size > 0:
                temp_thumb.replace(cached_path)
                return cached_path
        except Exception:
            pass

        # Fallback: neutral dark tile with centered play triangle, cached as the
        # final {id}.jpg so orphan cleanup keeps it and the endpoint serves 200.
        # ponytail: permanent tile, not a temp — re-probing ffmpeg per request costs more
        try:
            img = Image.new("RGB", self.THUMBNAIL_SIZE, (18, 20, 28))
            from PIL import ImageDraw

            draw = ImageDraw.Draw(img)
            cx, cy = self.THUMBNAIL_SIZE[0] // 2, self.THUMBNAIL_SIZE[1] // 2
            r = 34
            draw.ellipse(
                [cx - r, cy - r, cx + r, cy + r],
                fill=(46, 124, 246),
            )
            draw.polygon([(cx - 10, cy - 16), (cx - 10, cy + 16), (cx + 18, cy)], fill=(255, 255, 255))
            temp_thumb = cached_path.with_suffix(".jpg.part")
            img.save(temp_thumb, format="JPEG", quality=85)
            temp_thumb.replace(cached_path)
            return cached_path
        except Exception:
            return None

    @staticmethod
    def _parse_duration(stderr_text: str) -> Optional[float]:
        import re

        m = re.search(r"Duration: (\d+):(\d+):(\d+)\.(\d+)", stderr_text)
        if m:
            h, mi, s, ms = map(int, m.groups())
            return h * 3600 + mi * 60 + s + ms / 100
        return None

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
