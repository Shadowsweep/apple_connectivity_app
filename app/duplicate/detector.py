import hashlib
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional, Set

from app.scanner.metadata import MediaItem


class DuplicateStatus(str, Enum):
    NEW = "NEW"
    ALREADY_IMPORTED = "ALREADY_IMPORTED"
    NAME_COLLISION = "NAME_COLLISION"


@dataclass
class LocalMediaRecord:
    relative_path: Path
    absolute_path: Path
    size_bytes: int
    filename: str
    hash_sha256: Optional[str] = None


Tuple_Result = tuple[DuplicateStatus, Optional[LocalMediaRecord]]


class DuplicateDetector:
    """Two-tier duplicate & already-imported media detector."""

    CHUNK_SIZE = 64 * 1024  # 64 KB streaming hash chunks

    def __init__(self, library_root: Path):
        self.library_root = Path(library_root)
        # Fast lookup indexes
        self.size_index: Dict[int, List[LocalMediaRecord]] = {}
        self.filename_index: Dict[str, List[LocalMediaRecord]] = {}
        self.hash_index: Dict[str, LocalMediaRecord] = {}
        self._indexed = False

    @classmethod
    def calculate_stream_hash(cls, stream) -> str:
        """Computes SHA-256 hash from a readable binary stream."""
        hasher = hashlib.sha256()
        while chunk := stream.read(cls.CHUNK_SIZE):
            hasher.update(chunk)
        return hasher.hexdigest()

    @classmethod
    def calculate_file_hash(cls, file_path: Path) -> str:
        """Computes SHA-256 hash using chunked streaming."""
        hasher = hashlib.sha256()
        with open(file_path, "rb") as f:
            while chunk := f.read(cls.CHUNK_SIZE):
                hasher.update(chunk)
        return hasher.hexdigest()

    def index_library(self):
        """Scans local library structure to populate fast lookup caches."""
        self.size_index.clear()
        self.filename_index.clear()
        self.hash_index.clear()

        if not self.library_root.exists():
            self._indexed = True
            return

        # Imports may live under a user-selected vault prefix such as
        # Trips/Photos/2026/09, so index the whole vault rather than only the
        # four legacy top-level folders.
        media_extensions = {
            ".jpg", ".jpeg", ".heic", ".png", ".gif", ".webp", ".tif", ".tiff", ".dng",
            ".mov", ".mp4", ".m4v", ".avi", ".mkv", ".3gp",
        }
        for p in self.library_root.rglob("*"):
            if not p.is_file() or p.name.startswith(".") or p.suffix.lower() not in media_extensions:
                continue
            try:
                rel = p.relative_to(self.library_root)
                if any(part.startswith(".") for part in rel.parts) or "Thumbnails" in rel.parts:
                    continue
                sz = p.stat().st_size
                record = LocalMediaRecord(
                    relative_path=rel,
                    absolute_path=p,
                    size_bytes=sz,
                    filename=p.name,
                )
                self.size_index.setdefault(sz, []).append(record)
                self.filename_index.setdefault(p.name.lower(), []).append(record)
            except OSError:
                continue

        self._indexed = True

    def check_item(self, item: MediaItem, device=None, fast: bool = False) -> Tuple_Result:
        """Evaluates an item against the existing library. Computes hash ONLY if candidates exist."""
        if not self._indexed:
            self.index_library()

        # Tier 1: Cheap size check
        size_candidates = self.size_index.get(item.size_bytes, [])
        name_candidates = self.filename_index.get(item.filename.lower(), [])

        # If no matching size or filename anywhere in library, definitely NEW
        if not size_candidates and not name_candidates:
            return DuplicateStatus.NEW, None

        # ponytail: preview fast-path — size+filename only, zero USB/disk bytes.
        # Exact content match is confirmed once at copy time via staged hash.
        if fast:
            return DuplicateStatus.NEW, None

        # Compute source item hash for verification against candidates.
        # Device entries (e.g. iPhone over AFC) are virtual paths — stream via the device.
        if not item.hash_sha256 and item.source_entry:
            source_path = item.source_entry.source_path
            if source_path.exists():
                item.hash_sha256 = self.calculate_file_hash(source_path)
            elif device is not None:
                stream = device.open_stream(item.source_entry)
                try:
                    item.hash_sha256 = self.calculate_stream_hash(stream)
                finally:
                    stream.close()
            else:
                raise FileNotFoundError(
                    f"Cannot hash device item '{item.filename}' without a device provider"
                )

        # Check for exact content match (Already Imported)
        for cand in size_candidates:
            if not cand.hash_sha256:
                cand.hash_sha256 = self.calculate_file_hash(cand.absolute_path)
                self.hash_index[cand.hash_sha256] = cand

            if cand.hash_sha256 == item.hash_sha256:
                return DuplicateStatus.ALREADY_IMPORTED, cand

        # Check for filename collision with DIFFERENT content
        if name_candidates:
            for cand in name_candidates:
                if not cand.hash_sha256:
                    cand.hash_sha256 = self.calculate_file_hash(cand.absolute_path)
                    self.hash_index[cand.hash_sha256] = cand
                if cand.hash_sha256 != item.hash_sha256:
                    return DuplicateStatus.NAME_COLLISION, cand

        return DuplicateStatus.NEW, None

    def lookup_by_hash(self, staged_hash: str) -> Optional[LocalMediaRecord]:
        """Exact content lookup after staged hash is known (copy-time dedup)."""
        if not staged_hash:
            return None
        if not self._indexed:
            self.index_library()
        return self.hash_index.get(staged_hash)

    def register_imported(self, item: MediaItem, final_rel_path: Path):
        """Register newly imported item into active duplicate index."""
        abs_path = self.library_root / final_rel_path
        record = LocalMediaRecord(
            relative_path=final_rel_path,
            absolute_path=abs_path,
            size_bytes=item.size_bytes,
            filename=item.filename,
            hash_sha256=item.hash_sha256,
        )
        self.size_index.setdefault(item.size_bytes, []).append(record)
        self.filename_index.setdefault(item.filename.lower(), []).append(record)
        if item.hash_sha256:
            self.hash_index[item.hash_sha256] = record

