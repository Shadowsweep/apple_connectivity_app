import shutil
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, List, Optional, Tuple

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
    imported_files: List[Tuple[MediaItem, Path]] = field(default_factory=list)
    errors: List[Tuple[MediaItem, str]] = field(default_factory=list)

    @property
    def formatted_bytes(self) -> str:
        return StorageManager.format_bytes(self.bytes_imported)


class SafeImporter:
    """Orchestrates staged, atomic, storage-aware media import."""

    def __init__(
        self,
        storage_manager: StorageManager,
        organizer: MediaOrganizer,
        duplicate_detector: DuplicateDetector,
    ):
        self.storage_manager = storage_manager
        self.organizer = organizer
        self.duplicate_detector = duplicate_detector

    def preview(self, items: List[MediaItem]) -> ImportPreview:
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

            status, existing_record = self.duplicate_detector.check_item(item)
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
    ) -> ImportSummary:
        """Executes the safe copy, verify, and organize pipeline."""
        self.storage_manager.ensure_directory_structure()
        staging_dir = self.storage_manager.get_staging_directory()

        summary = ImportSummary(
            total_requested=len(items),
            successful_count=0,
            duplicates_skipped_count=0,
            failed_count=0,
            skipped_space_count=0,
            bytes_imported=0,
        )

        session_id = uuid.uuid4().hex[:8]
        session_staging = staging_dir / session_id
        session_staging.mkdir(parents=True, exist_ok=True)

        try:
            for idx, item in enumerate(items, start=1):
                if progress_callback:
                    progress_callback(idx, len(items), item, "Checking duplicates & space...")

                # 1. Duplicate check
                status, existing_record = self.duplicate_detector.check_item(item)
                if status == DuplicateStatus.ALREADY_IMPORTED:
                    summary.duplicates_skipped_count += 1
                    if progress_callback:
                        progress_callback(idx, len(items), item, "Already imported (skipped)")
                    continue

                # 2. Storage reserve check
                if not self.storage_manager.can_fit_bytes(item.size_bytes):
                    summary.skipped_space_count += 1
                    summary.errors.append((item, "Insufficient disk space (respecting 10 GB safety reserve)"))
                    if progress_callback:
                        progress_callback(idx, len(items), item, "Skipped (Safety space limit reached)")
                    continue

                # 3. Staged copy
                if progress_callback:
                    progress_callback(idx, len(items), item, "Copying to staging...")

                temp_filename = f"{uuid.uuid4().hex}_{item.filename}"
                temp_path = session_staging / temp_filename

                try:
                    if item.source_entry:
                        device.copy_to(item.source_entry, temp_path)
                    else:
                        raise ValueError("No source entry available for item")
                except Exception as copy_err:
                    summary.failed_count += 1
                    summary.errors.append((item, f"Copy failed: {str(copy_err)}"))
                    if temp_path.exists():
                        temp_path.unlink(missing_ok=True)
                    continue

                # 4. Verification
                if progress_callback:
                    progress_callback(idx, len(items), item, "Verifying integrity...")

                v_res = Verifier.verify(
                    source_path=item.source_entry.source_path,
                    staged_path=temp_path,
                    expected_hash=item.hash_sha256,
                )

                if not v_res.is_valid:
                    summary.failed_count += 1
                    summary.errors.append((item, f"Verification failed: {v_res.error_message}"))
                    if temp_path.exists():
                        temp_path.unlink(missing_ok=True)
                    continue

                # Store verified hash
                item.hash_sha256 = v_res.staged_hash

                # 5. Determine destination & Atomic Move
                if progress_callback:
                    progress_callback(idx, len(items), item, "Organizing into library...")

                final_rel_path = self.organizer.resolve_destination(item)
                final_abs_path = self.storage_manager.library_root / final_rel_path
                final_abs_path.parent.mkdir(parents=True, exist_ok=True)

                # Move staged file to final path
                shutil.move(str(temp_path), str(final_abs_path))

                # 6. Register into duplicate cache
                self.duplicate_detector.register_imported(item, final_rel_path)

                summary.successful_count += 1
                summary.bytes_imported += item.size_bytes
                summary.imported_files.append((item, final_rel_path))

                if progress_callback:
                    progress_callback(idx, len(items), item, f"Imported -> {final_rel_path}")

        finally:
            # Clean up session staging directory
            shutil.rmtree(session_staging, ignore_errors=True)

        return summary
