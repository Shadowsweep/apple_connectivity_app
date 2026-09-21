import shutil
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Callable, List, Optional, Tuple

from app.database.connection import DatabaseConnection
from app.database.models import ImportItemRecord, ImportRecord, MediaRecord, utc_now
from app.database.repositories.device_repository import DeviceRepository
from app.database.repositories.import_repository import ImportRepository
from app.database.repositories.library_repository import LibraryRepository
from app.database.repositories.media_repository import MediaRepository
from app.device.iphone import MediaDevice
from app.duplicate.detector import DuplicateDetector, DuplicateStatus, LocalMediaRecord
from app.importer.verifier import Verifier
from app.organizer.organizer import MediaOrganizer
from app.scanner.metadata import MediaItem, MediaType
from app.storage.manager import StorageManager, StorageStats


@dataclass
class ImportPreview:
    total_candidates: int
    photos_count: int
    videos_count: int
    screenshots_count: int
    live_photos_count: int
    already_imported_count: int
    new_items_count: int
    required_bytes: int
    storage_stats: StorageStats
    items_to_import: List[MediaItem] = field(default_factory=list)
    already_imported_items: List[Tuple[MediaItem, LocalMediaRecord]] = field(default_factory=list)

    @property
    def can_fit(self) -> bool:
        return self.required_bytes <= self.storage_stats.usable_bytes

    @property
    def formatted_required(self) -> str:
        return StorageManager.format_bytes(self.required_bytes)


@dataclass
class ImportSummary:
    total_requested: int
    successful_count: int
    duplicates_skipped_count: int
    failed_count: int
    skipped_space_count: int
    bytes_imported: int
    import_id: Optional[str] = None
    imported_files: List[Tuple[MediaItem, Path]] = field(default_factory=list)
    imported_media_ids: List[str] = field(default_factory=list)
    errors: List[Tuple[MediaItem, str]] = field(default_factory=list)

    @property
    def formatted_bytes(self) -> str:
        return StorageManager.format_bytes(self.bytes_imported)


class SafeImporter:
    """Orchestrates staged, atomic, storage-aware media import and SQLite indexing."""

    def __init__(
        self,
        storage_manager: StorageManager,
        organizer: MediaOrganizer,
        duplicate_detector: DuplicateDetector,
        db: Optional[DatabaseConnection] = None,
    ):
        self.storage_manager = storage_manager
        self.organizer = organizer
        self.duplicate_detector = duplicate_detector
        self.db = db

        if self.db:
            self.library_repo = LibraryRepository(self.db)
            self.device_repo = DeviceRepository(self.db)
            self.media_repo = MediaRepository(self.db)
            self.import_repo = ImportRepository(self.db)
        else:
            self.library_repo = None
            self.device_repo = None
            self.media_repo = None
            self.import_repo = None

    def preview(self, items: List[MediaItem], device=None) -> ImportPreview:
        """Generates a non-destructive import preview calculating space and duplicates."""
        photos = 0
        videos = 0
        screenshots = 0
        live_photos = 0

        to_import: List[MediaItem] = []
        already_imported: List[Tuple[MediaItem, LocalMediaRecord]] = []
        required_bytes = 0

        for item in items:
            if item.media_type == MediaType.PHOTO:
                photos += 1
            elif item.media_type == MediaType.VIDEO:
                videos += 1
            elif item.media_type == MediaType.SCREENSHOT:
                screenshots += 1
            elif item.media_type == MediaType.LIVE_PHOTO:
                live_photos += 1

            status, existing_record = self.duplicate_detector.check_item(item, device=device, fast=True)
            if status == DuplicateStatus.ALREADY_IMPORTED and existing_record is not None:
                already_imported.append((item, existing_record))
            else:
                to_import.append(item)
                required_bytes += item.size_bytes

        stats = self.storage_manager.get_storage_stats()

        return ImportPreview(
            total_candidates=len(items),
            photos_count=photos,
            videos_count=videos,
            screenshots_count=screenshots,
            live_photos_count=live_photos,
            already_imported_count=len(already_imported),
            new_items_count=len(to_import),
            required_bytes=required_bytes,
            storage_stats=stats,
            items_to_import=to_import,
            already_imported_items=already_imported,
        )

    def execute_import(
        self,
        items: List[MediaItem],
        device: MediaDevice,
        progress_callback: Optional[Callable[[int, int, MediaItem, str], None]] = None,
        destination_prefix: Optional[Path] = None,
    ) -> ImportSummary:
        """Executes the safe copy, verify, organize, and SQLite index registration pipeline."""
        self.storage_manager.ensure_directory_structure()
        staging_dir = self.storage_manager.get_staging_directory()

        import_id = str(uuid.uuid4())
        summary = ImportSummary(
            total_requested=len(items),
            successful_count=0,
            duplicates_skipped_count=0,
            failed_count=0,
            skipped_space_count=0,
            bytes_imported=0,
            import_id=import_id,
        )

        lib_record = None
        dev_record = None
        imp_record = None

        if self.db:
            self.db.initialize()
            lib_record = self.library_repo.get_or_create(
                str(self.storage_manager.library_root), name="MEMEASY Library"
            )
            dev_record = self.device_repo.register_device(
                name=device.name, device_type="IPHONE", identifier=device.name
            )
            imp_record = ImportRecord(
                id=import_id,
                library_id=lib_record.id,
                device_id=dev_record.id,
                started_at=utc_now(),
                total_files=len(items),
                status="IN_PROGRESS",
            )
            self.import_repo.create_import(imp_record)

        session_id = uuid.uuid4().hex[:8]
        session_staging = staging_dir / session_id
        session_staging.mkdir(parents=True, exist_ok=True)

        # ponytail: batch DB writes per ~100 files — one txn, progress still per-file
        pending_media: List[MediaRecord] = []
        pending_items: List[ImportItemRecord] = []

        def flush() -> None:
            if self.db and imp_record:
                if pending_media:
                    self.media_repo.insert_or_update_many(pending_media)
                    pending_media.clear()
                if pending_items:
                    self.import_repo.add_import_items_many(pending_items)
                    pending_items.clear()

        def buf_item(rec: ImportItemRecord) -> None:
            pending_items.append(rec)
            if len(pending_items) + len(pending_media) >= 100:
                flush()

        try:
            for idx, item in enumerate(items, start=1):
                if progress_callback:
                    progress_callback(idx, len(items), item, "Checking space...")

                # 1. Storage reserve check (no USB hash pre-copy — exact dedup at step 4b)
                if not self.storage_manager.can_fit_bytes(item.size_bytes):
                    summary.skipped_space_count += 1
                    err_msg = "Insufficient disk space (respecting 10 GB safety reserve)"
                    summary.errors.append((item, err_msg))
                    if self.db and imp_record:
                        buf_item(ImportItemRecord(
                            id=str(uuid.uuid4()),
                            import_id=import_id,
                            media_id=None,
                            source_path=str(item.source_entry.source_path if item.source_entry else item.filename),
                            status="SKIPPED_SPACE",
                            error=err_msg,
                        ))

                    if progress_callback:
                        progress_callback(idx, len(items), item, "Skipped (Safety space limit reached)")
                    continue

                # 2. Staged copy with .part extension
                if progress_callback:
                    progress_callback(idx, len(items), item, "Copying to staging...")

                temp_filename = f"{uuid.uuid4().hex}_{item.filename}.part"
                temp_path = session_staging / temp_filename

                try:
                    if item.source_entry:
                        device.copy_to(item.source_entry, temp_path)
                    else:
                        raise ValueError("No source entry available for item")
                except Exception as copy_err:
                    summary.failed_count += 1
                    err_msg = f"Copy failed: {str(copy_err)}"
                    summary.errors.append((item, err_msg))
                    if self.db and imp_record:
                        buf_item(ImportItemRecord(
                            id=str(uuid.uuid4()),
                            import_id=import_id,
                            media_id=None,
                            source_path=str(item.source_entry.source_path if item.source_entry else item.filename),
                            status="FAILED",
                            error=err_msg,
                        ))

                    if temp_path.exists():
                        temp_path.unlink(missing_ok=True)
                    continue

                # 3. Single staged hash + size verify (zero USB re-reads)
                if progress_callback:
                    progress_callback(idx, len(items), item, "Verifying integrity...")

                staged_size = temp_path.stat().st_size
                if staged_size != item.size_bytes:
                    summary.failed_count += 1
                    err_msg = f"Size mismatch: expected {item.size_bytes}B, got {staged_size}B"
                    summary.errors.append((item, err_msg))
                    if self.db and imp_record:
                        buf_item(ImportItemRecord(
                            id=str(uuid.uuid4()),
                            import_id=import_id,
                            media_id=None,
                            source_path=str(item.source_entry.source_path if item.source_entry else item.filename),
                            status="FAILED",
                            error=err_msg,
                        ))
                    if temp_path.exists():
                        temp_path.unlink(missing_ok=True)
                    continue

                # ponytail: one disk read — staged hash is the truth, no source re-hash
                item.hash_sha256 = Verifier.compute_sha256(temp_path)

                # 4b. Exact dedup at copy time (in-memory index + DB fallback)
                dup = self.duplicate_detector.lookup_by_hash(item.hash_sha256)
                if dup is None and self.db and self.media_repo:
                    try:
                        if self.media_repo.get_by_hash(item.hash_sha256):
                            dup = LocalMediaRecord(
                                relative_path=Path(""),
                                absolute_path=Path(""),
                                size_bytes=item.size_bytes,
                                filename=item.filename,
                                hash_sha256=item.hash_sha256,
                            )
                    except Exception:
                        pass
                if dup is not None:
                    summary.duplicates_skipped_count += 1
                    if self.db and imp_record:
                        buf_item(ImportItemRecord(
                            id=str(uuid.uuid4()),
                            import_id=import_id,
                            media_id=None,
                            source_path=str(item.source_entry.source_path if item.source_entry else item.filename),
                            status="SKIPPED_DUPLICATE",
                        ))
                    if progress_callback:
                        progress_callback(idx, len(items), item, "Already imported (skipped)")
                    if temp_path.exists():
                        temp_path.unlink(missing_ok=True)
                    continue

                # 5. Determine destination & Atomic Move with .part and replace
                if progress_callback:
                    progress_callback(idx, len(items), item, "Organizing into library...")

                final_rel_path = self.organizer.resolve_destination(
                    item, destination_prefix=destination_prefix
                )
                final_abs_path = self.storage_manager.library_root / final_rel_path
                final_abs_path.parent.mkdir(parents=True, exist_ok=True)

                part_dest = final_abs_path.with_name(final_abs_path.name + ".part")
                # Move staged file to .part destination, then atomic replace
                shutil.move(str(temp_path), str(part_dest))
                part_dest.replace(final_abs_path)

                # 6. Register into duplicate cache
                self.duplicate_detector.register_imported(item, final_rel_path)

                # 7. Extract rich metadata from imported local file (EXIF, dimensions, video duration)
                try:
                    from app.device.iphone import DeviceMediaEntry
                    from app.scanner.metadata import MetadataExtractor
                    local_entry = DeviceMediaEntry(
                        device_id="local",
                        unique_id=str(final_abs_path),
                        filename=final_abs_path.name,
                        size_bytes=final_abs_path.stat().st_size,
                        source_path=final_abs_path,
                        created_timestamp=final_abs_path.stat().st_ctime,
                        modified_timestamp=final_abs_path.stat().st_mtime,
                    )
                    local_meta = MetadataExtractor.extract_from_entry(local_entry)
                    if local_meta.capture_date:
                        item.capture_date = local_meta.capture_date
                    if local_meta.width and local_meta.height:
                        item.width = local_meta.width
                        item.height = local_meta.height
                    if local_meta.duration_ms:
                        item.duration_ms = local_meta.duration_ms
                except Exception:
                    pass

                # 8. Register in SQLite database (buffered, flushed per ~100)
                media_id = str(uuid.uuid4())
                if self.db and lib_record and imp_record:
                    pending_media.append(MediaRecord(
                        id=media_id,
                        library_id=lib_record.id,
                        filename=item.filename,
                        relative_path=str(final_rel_path).replace("\\", "/"),
                        media_type=item.media_type.value,
                        mime_type=item.mime_type,
                        extension=item.extension,
                        size_bytes=final_abs_path.stat().st_size if final_abs_path.exists() else item.size_bytes,
                        capture_date=item.capture_date,
                        imported_at=utc_now(),
                        width=item.width,
                        height=item.height,
                        duration_ms=item.duration_ms,
                        hash_sha256=item.hash_sha256,
                        status="ACTIVE",
                    ))

                    buf_item(ImportItemRecord(
                        id=str(uuid.uuid4()),
                        import_id=import_id,
                        media_id=media_id,
                        source_path=str(item.source_entry.source_path if item.source_entry else item.filename),
                        status="SUCCESS",
                    ))
                    summary.imported_media_ids.append(media_id)

                summary.successful_count += 1
                summary.bytes_imported += item.size_bytes
                summary.imported_files.append((item, final_rel_path))

                if progress_callback:
                    progress_callback(idx, len(items), item, f"Imported -> {final_rel_path}")

            flush()
            if self.db and imp_record:
                imp_record.completed_at = utc_now()
                imp_record.successful_files = summary.successful_count
                imp_record.duplicate_files = summary.duplicates_skipped_count
                imp_record.failed_files = summary.failed_count + summary.skipped_space_count
                imp_record.bytes_imported = summary.bytes_imported
                imp_record.status = "COMPLETED"
                self.import_repo.update_import(imp_record)

        except Exception as e:
            try:
                flush()
            except Exception:
                pass
            if self.db and imp_record:
                imp_record.completed_at = utc_now()
                imp_record.status = "FAILED"
                self.import_repo.update_import(imp_record)
            raise e

        finally:
            # Clean up session staging directory
            shutil.rmtree(session_staging, ignore_errors=True)

        return summary

    def recover_interrupted_imports(self) -> dict:
        """
        Scans staging directories and library storage on startup to clean leftover
        .part files and reconcile uncompleted import jobs in SQLite.
        """
        staging_dir = self.storage_manager.get_staging_directory()
        cleaned_parts = 0
        cleaned_staging_dirs = 0

        # 1. Clean staging subdirectories
        if staging_dir.exists():
            for child in staging_dir.iterdir():
                try:
                    if child.is_dir():
                        shutil.rmtree(child, ignore_errors=True)
                        cleaned_staging_dirs += 1
                    elif child.is_file():
                        child.unlink(missing_ok=True)
                        cleaned_parts += 1
                except Exception:
                    pass

        # 2. Reconcile in-progress imports in database
        recovered_imports = 0
        if self.db and self.import_repo:
            try:
                conn = self.db.get_connection()
                cursor = conn.cursor()
                cursor.execute("SELECT id FROM imports WHERE status = 'IN_PROGRESS'")
                in_prog = cursor.fetchall()
                for row in in_prog:
                    imp_id = row[0]
                    cursor.execute(
                        "UPDATE imports SET status = 'INTERRUPTED', completed_at = ? WHERE id = ?",
                        (utc_now(), imp_id),
                    )
                    recovered_imports += 1
                conn.commit()
            except Exception:
                pass

        return {
            "cleaned_staging_dirs": cleaned_staging_dirs,
            "cleaned_parts": cleaned_parts,
            "recovered_imports": recovered_imports,
        }
