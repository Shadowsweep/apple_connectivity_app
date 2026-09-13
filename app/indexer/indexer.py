import uuid
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Callable, List, Optional, Set

from app.database.connection import DatabaseConnection
from app.database.models import LibraryRecord, MediaRecord, utc_now
from app.database.repositories.library_repository import LibraryRepository
from app.database.repositories.media_repository import MediaRepository
from app.device.iphone import DeviceMediaEntry
from app.duplicate.detector import DuplicateDetector
from app.scanner.metadata import MetadataExtractor
from app.storage.manager import StorageManager


@dataclass
class IndexingSummary:
    total_scanned: int = 0
    new_indexed: int = 0
    updated_indexed: int = 0
    missing_flagged: int = 0
    errors: List[str] = field(default_factory=list)


class LibraryIndexer:
    """Discovers local physical media and synchronizes the authoritative SQLite index."""

    TARGET_FOLDERS = ["Photos", "Videos", "Screenshots", "LivePhotos"]

    def __init__(self, storage_manager: StorageManager, db: DatabaseConnection):
        self.storage_manager = storage_manager
        self.db = db
        self.library_repo = LibraryRepository(db)
        self.media_repo = MediaRepository(db)

    def index_library(
        self, progress_callback: Optional[Callable[[int, str], None]] = None
    ) -> IndexingSummary:
        self.db.initialize()
        lib_record = self.library_repo.get_or_create(
            str(self.storage_manager.library_root), name="MEMEASY Library"
        )

        summary = IndexingSummary()
        found_rel_paths: Set[str] = set()
        file_paths: List[Path] = []

        # 1. Discover all physical files
        for folder in self.TARGET_FOLDERS:
            target_dir = self.storage_manager.library_root / folder
            if not target_dir.exists():
                continue
            for p in target_dir.rglob("*"):
                if p.is_file() and not p.name.startswith("."):
                    file_paths.append(p)

        summary.total_scanned = len(file_paths)

        # 2. Extract and sync into SQLite
        for idx, file_path in enumerate(file_paths, start=1):
            try:
                rel_path = str(file_path.relative_to(self.storage_manager.library_root)).replace("\\", "/")
                found_rel_paths.add(rel_path)

                if progress_callback:
                    progress_callback(idx, f"Indexing {rel_path}")

                stat = file_path.stat()
                existing = self.media_repo.get_by_relative_path(rel_path)

                # Extract metadata
                dummy_entry = DeviceMediaEntry(
                    device_id="LocalLibrary",
                    unique_id=rel_path,
                    filename=file_path.name,
                    size_bytes=stat.st_size,
                    source_path=file_path,
                    created_timestamp=stat.st_ctime,
                    modified_timestamp=stat.st_mtime,
                )
                item = MetadataExtractor.extract_from_entry(dummy_entry)
                file_hash = DuplicateDetector.calculate_file_hash(file_path)

                media_id = existing.id if existing else str(uuid.uuid4())
                imported_at = existing.imported_at if existing else utc_now()

                record = MediaRecord(
                    id=media_id,
                    library_id=lib_record.id,
                    filename=file_path.name,
                    relative_path=rel_path,
                    media_type=item.media_type.value,
                    mime_type=item.mime_type,
                    extension=item.extension,
                    size_bytes=stat.st_size,
                    capture_date=item.capture_date,
                    imported_at=imported_at,
                    width=item.width,
                    height=item.height,
                    duration_ms=item.duration_ms,
                    hash_sha256=file_hash,
                    thumbnail_path=existing.thumbnail_path if existing else None,
                    status="ACTIVE",
                )

                self.media_repo.insert_or_update(record)
                if existing:
                    summary.updated_indexed += 1
                else:
                    summary.new_indexed += 1

            except Exception as err:
                summary.errors.append(f"Failed {file_path.name}: {str(err)}")

        # 3. Detect missing files
        db_paths = self.media_repo.get_all_active_relative_paths()
        for db_rel in db_paths:
            normalized_db_rel = db_rel.replace("\\", "/")
            if normalized_db_rel not in found_rel_paths:
                missing_rec = self.media_repo.get_by_relative_path(db_rel)
                if missing_rec:
                    self.media_repo.mark_status(missing_rec.id, "MISSING")
                    summary.missing_flagged += 1

        return summary

    def rebuild_index(
        self, progress_callback: Optional[Callable[[int, str], None]] = None
    ) -> IndexingSummary:
        """Backs up existing database and performs full index rebuild."""
        if self.db.db_path.exists():
            backup_path = self.db.backup()
            if progress_callback:
                progress_callback(0, f"Backed up database to {backup_path.name}")

        self.db.initialize()
        return self.index_library(progress_callback=progress_callback)
