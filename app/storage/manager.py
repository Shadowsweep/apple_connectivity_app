import os
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Tuple


@dataclass
class StorageStats:
    total_bytes: int
    free_bytes: int
    safety_reserve_bytes: int
    usable_bytes: int

    @property
    def formatted_total(self) -> str:
        return StorageManager.format_bytes(self.total_bytes)

    @property
    def formatted_free(self) -> str:
        return StorageManager.format_bytes(self.free_bytes)

    @property
    def formatted_usable(self) -> str:
        return StorageManager.format_bytes(self.usable_bytes)

    @property
    def formatted_reserve(self) -> str:
        return StorageManager.format_bytes(self.safety_reserve_bytes)


class StorageManager:
    """Manages physical disk space, directory layout, and safe storage limits."""

    DEFAULT_SAFETY_RESERVE_BYTES = 10 * 1024 * 1024 * 1024  # 10 GB

    def __init__(self, library_root: Path, safety_reserve_bytes: int = DEFAULT_SAFETY_RESERVE_BYTES):
        self.library_root = Path(library_root).resolve()
        self.safety_reserve_bytes = safety_reserve_bytes

    @classmethod
    def format_bytes(cls, size_bytes: int) -> str:
        """Converts raw bytes to human-readable string (e.g. 47.2 GB)."""
        if size_bytes < 0:
            return "0 B"
        units = ["B", "KB", "MB", "GB", "TB", "PB"]
        val = float(size_bytes)
        unit_idx = 0
        while val >= 1024.0 and unit_idx < len(units) - 1:
            val /= 1024.0
            unit_idx += 1
        return f"{val:.1f} {units[unit_idx]}" if unit_idx > 0 else f"{int(val)} B"

    def validate_destination(self) -> Tuple[bool, str]:
        """Validates that destination directory is writable and accessible."""
        try:
            self.library_root.mkdir(parents=True, exist_ok=True)
            # Test write access with a dummy probe file
            probe_file = self.library_root / ".probe_write_test"
            probe_file.write_text("ok", encoding="utf-8")
            probe_file.unlink(missing_ok=True)
            return True, "Storage location is valid and writable"
        except Exception as e:
            return False, f"Invalid storage destination: {str(e)}"

    def get_storage_stats(self) -> StorageStats:
        """Calculates total, free, reserve, and usable disk space."""
        # Find closest existing parent for disk_usage query
        check_path = self.library_root
        while not check_path.exists() and check_path.parent != check_path:
            check_path = check_path.parent

        usage = shutil.disk_usage(check_path)
        usable = max(0, usage.free - self.safety_reserve_bytes)

        return StorageStats(
            total_bytes=usage.total,
            free_bytes=usage.free,
            safety_reserve_bytes=self.safety_reserve_bytes,
            usable_bytes=usable,
        )

    def can_fit_bytes(self, required_bytes: int) -> bool:
        stats = self.get_storage_stats()
        return required_bytes <= stats.usable_bytes

    def ensure_directory_structure(self):
        """Creates authoritative physical structure for media library."""
        folders = [
            self.library_root / "Photos",
            self.library_root / "Videos",
            self.library_root / "Screenshots",
            self.library_root / "LivePhotos",
            self.library_root / "Thumbnails",
            self.library_root / ".memeasy" / "tmp",
        ]
        for f in folders:
            f.mkdir(parents=True, exist_ok=True)

    def get_staging_directory(self) -> Path:
        staging = self.library_root / ".memeasy" / "tmp"
        staging.mkdir(parents=True, exist_ok=True)
        return staging

    def clean_staging_area(self):
        """Cleans orphaned temporary files from interrupted imports."""
        staging = self.library_root / ".memeasy" / "tmp"
        if staging.exists():
            for item in staging.iterdir():
                try:
                    if item.is_file():
                        item.unlink(missing_ok=True)
                    elif item.is_dir():
                        shutil.rmtree(item, ignore_errors=True)
                except OSError:
                    pass
