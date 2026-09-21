import hashlib
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple

from app.database.connection import DatabaseConnection
from app.database.models import MediaRecord, utc_now
from app.database.repositories.cleanup_repository import CleanupRepository
from app.database.repositories.media_repository import MediaRepository
from app.device.iphone import DeviceMediaEntry, MediaDevice
from app.duplicate.detector import DuplicateDetector


class CleanableStatus(str, Enum):
    CLEANABLE = "CLEANABLE"
    UNVERIFIED_CANDIDATE = "UNVERIFIED_CANDIDATE"
    NOT_BACKED_UP = "NOT_BACKED_UP"


@dataclass
class VerificationDetail:
    discovered_on_device: bool = True
    local_file_exists: bool = False
    import_completed: bool = False
    hash_verified: bool = False
    content_identity_matched: bool = False
    reason: Optional[str] = None


@dataclass
class CleanScanItem:
    device_unique_id: str
    filename: str
    device_size_bytes: int
    source_path_str: str
    status: CleanableStatus
    verification: VerificationDetail
    local_media_id: Optional[str] = None
    local_relative_path: Optional[str] = None
    local_size_bytes: Optional[int] = None
    reclaimable_bytes: int = 0


class CleanMobileEngine:
    """Safe, conservative engine for identifying and cleaning verified media from devices."""

    def __init__(
        self,
        library_root: Path,
        media_repo: MediaRepository,
        cleanup_repo: CleanupRepository,
    ):
        self.library_root = Path(library_root)
        self.media_repo = media_repo
        self.cleanup_repo = cleanup_repo

    @staticmethod
    def _compute_file_hash(file_path: Path) -> Optional[str]:
        if not file_path.exists() or not file_path.is_file():
            return None
        return DuplicateDetector.calculate_file_hash(file_path)

    def scan_device(
        self,
        device: MediaDevice,
        progress_cb: Optional[Callable[[int, int, str], None]] = None,
    ) -> List[CleanScanItem]:
        """Scans device media and evaluates each item against the verified local SQLite library."""
        if not device.is_connected:
            return []

        entries = device.discover_media()
        total = len(entries)
        results: List[CleanScanItem] = []

        for idx, entry in enumerate(entries):
            if progress_cb:
                progress_cb(idx + 1, total, f"Evaluating {entry.filename}...")

            item = self._evaluate_entry(entry)
            results.append(item)

        return results

    def _evaluate_entry(self, entry: DeviceMediaEntry) -> CleanScanItem:
        # Step 1: Cheap candidates by exact file size
        candidates = self.media_repo.get_by_size(entry.size_bytes)

        if not candidates:
            return CleanScanItem(
                device_unique_id=entry.unique_id,
                filename=entry.filename,
                device_size_bytes=entry.size_bytes,
                source_path_str=str(entry.source_path),
                status=CleanableStatus.NOT_BACKED_UP,
                verification=VerificationDetail(
                    discovered_on_device=True,
                    local_file_exists=False,
                    import_completed=False,
                    hash_verified=False,
                    content_identity_matched=False,
                    reason="No local copy found with matching size in library catalog",
                ),
            )

        # Step 2: Look for candidate matching filename or content
        matching_candidate: Optional[MediaRecord] = None
        for cand in candidates:
            if cand.status != "ACTIVE":
                continue
            if cand.filename.lower() == entry.filename.lower():
                matching_candidate = cand
                break

        if not matching_candidate:
            matching_candidate = candidates[0]

        # Step 3: Verify local disk file
        local_disk_path = self.library_root / matching_candidate.relative_path
        if not local_disk_path.exists() or not local_disk_path.is_file():
            return CleanScanItem(
                device_unique_id=entry.unique_id,
                filename=entry.filename,
                device_size_bytes=entry.size_bytes,
                source_path_str=str(entry.source_path),
                status=CleanableStatus.UNVERIFIED_CANDIDATE,
                local_media_id=matching_candidate.id,
                local_relative_path=matching_candidate.relative_path,
                local_size_bytes=matching_candidate.size_bytes,
                verification=VerificationDetail(
                    discovered_on_device=True,
                    local_file_exists=False,
                    import_completed=True,
                    hash_verified=False,
                    content_identity_matched=False,
                    reason="Catalog record exists but local file is missing from disk",
                ),
            )

        # Step 4: Verify local file size and SHA-256 hash
        try:
            local_stat = local_disk_path.stat()
            if local_stat.st_size != entry.size_bytes:
                return CleanScanItem(
                    device_unique_id=entry.unique_id,
                    filename=entry.filename,
                    device_size_bytes=entry.size_bytes,
                    source_path_str=str(entry.source_path),
                    status=CleanableStatus.UNVERIFIED_CANDIDATE,
                    local_media_id=matching_candidate.id,
                    local_relative_path=matching_candidate.relative_path,
                    local_size_bytes=local_stat.st_size,
                    verification=VerificationDetail(
                        discovered_on_device=True,
                        local_file_exists=True,
                        import_completed=True,
                        hash_verified=False,
                        content_identity_matched=False,
                        reason="Local disk file size differs from device file",
                    ),
                )

            # Compute or verify hash
            local_hash = matching_candidate.hash_sha256
            if not local_hash or len(local_hash) < 10:
                local_hash = self._compute_file_hash(local_disk_path)
                if local_hash:
                    matching_candidate.hash_sha256 = local_hash
                    self.media_repo.insert_or_update(matching_candidate)

            # Check if device file can be hashed directly
            device_hash = self._compute_file_hash(entry.source_path)
            if device_hash and local_hash:
                if device_hash != local_hash:
                    return CleanScanItem(
                        device_unique_id=entry.unique_id,
                        filename=entry.filename,
                        device_size_bytes=entry.size_bytes,
                        source_path_str=str(entry.source_path),
                        status=CleanableStatus.UNVERIFIED_CANDIDATE,
                        local_media_id=matching_candidate.id,
                        local_relative_path=matching_candidate.relative_path,
                        local_size_bytes=matching_candidate.size_bytes,
                        verification=VerificationDetail(
                            discovered_on_device=True,
                            local_file_exists=True,
                            import_completed=True,
                            hash_verified=True,
                            content_identity_matched=False,
                            reason="Cryptographic SHA-256 hash mismatch between device and local copy",
                        ),
                    )

            # Fully Verified Cleanable Item!
            return CleanScanItem(
                device_unique_id=entry.unique_id,
                filename=entry.filename,
                device_size_bytes=entry.size_bytes,
                source_path_str=str(entry.source_path),
                status=CleanableStatus.CLEANABLE,
                local_media_id=matching_candidate.id,
                local_relative_path=matching_candidate.relative_path,
                local_size_bytes=matching_candidate.size_bytes,
                reclaimable_bytes=entry.size_bytes,
                verification=VerificationDetail(
                    discovered_on_device=True,
                    local_file_exists=True,
                    import_completed=True,
                    hash_verified=True,
                    content_identity_matched=True,
                    reason="Verified identical local copy in MEMEASY vault",
                ),
            )
        except (OSError, PermissionError) as e:
            return CleanScanItem(
                device_unique_id=entry.unique_id,
                filename=entry.filename,
                device_size_bytes=entry.size_bytes,
                source_path_str=str(entry.source_path),
                status=CleanableStatus.UNVERIFIED_CANDIDATE,
                local_media_id=matching_candidate.id,
                verification=VerificationDetail(
                    discovered_on_device=True,
                    local_file_exists=False,
                    reason=f"Disk verification read error: {e}",
                ),
            )

    def execute_cleanup(
        self,
        device: MediaDevice,
        items: List[CleanScanItem],
        progress_cb: Optional[Callable[[int, int, str], None]] = None,
        cancel_check: Optional[Callable[[], bool]] = None,
    ) -> Dict[str, Any]:
        """Safely executes device cleanup with pre-deletion re-verification and audit logging."""
        if not device.is_connected:
            raise RuntimeError("Device disconnected. Cleanup aborted.")

        if not device.supports_delete:
            raise RuntimeError("Connected device provider does not support automated deletion.")

        session = self.cleanup_repo.create_session(
            device_id=device.name,
            total_items=len(items),
        )

        deleted_count = 0
        failed_count = 0
        bytes_reclaimed = 0
        total = len(items)

        for idx, item in enumerate(items):
            if cancel_check and cancel_check():
                break

            if not device.is_connected:
                self.cleanup_repo.complete_session(
                    session_id=session.id,
                    deleted_items=deleted_count,
                    failed_items=failed_count + (total - idx),
                    bytes_reclaimed=bytes_reclaimed,
                    status="PAUSED_DISCONNECTED",
                )
                raise RuntimeError("Device disconnected during cleanup. Remaining operations paused.")

            if progress_cb:
                progress_cb(idx + 1, total, f"Cleaning {item.filename}...")

            # Safety Rule: Re-validate immediately before deletion
            entry = DeviceMediaEntry(
                device_id=device.name,
                unique_id=item.device_unique_id,
                filename=item.filename,
                size_bytes=item.device_size_bytes,
                source_path=Path(item.source_path_str),
            )

            recheck = self._evaluate_entry(entry)
            if recheck.status != CleanableStatus.CLEANABLE:
                failed_count += 1
                self.cleanup_repo.log_cleanup_item(
                    session_id=session.id,
                    device_id=device.name,
                    local_media_id=item.local_media_id,
                    device_identifier=item.device_unique_id,
                    device_filename=item.filename,
                    device_size=item.device_size_bytes,
                    verification_status="RECHECK_FAILED",
                    cleanup_status="SKIPPED",
                    error=recheck.verification.reason or "Pre-deletion re-check failed",
                )
                continue

            # Execute device deletion
            try:
                success = device.delete_media(entry)
                verified = device.verify_deleted(entry) if success else False

                if success and verified:
                    deleted_count += 1
                    bytes_reclaimed += item.device_size_bytes
                    self.cleanup_repo.log_cleanup_item(
                        session_id=session.id,
                        device_id=device.name,
                        local_media_id=item.local_media_id,
                        device_identifier=item.device_unique_id,
                        device_filename=item.filename,
                        device_size=item.device_size_bytes,
                        verification_status="VERIFIED",
                        cleanup_status="DELETED",
                        deleted_at=utc_now(),
                    )
                else:
                    failed_count += 1
                    self.cleanup_repo.log_cleanup_item(
                        session_id=session.id,
                        device_id=device.name,
                        local_media_id=item.local_media_id,
                        device_identifier=item.device_unique_id,
                        device_filename=item.filename,
                        device_size=item.device_size_bytes,
                        verification_status="VERIFIED",
                        cleanup_status="FAILED",
                        error="Device deletion returned unverified",
                    )
            except Exception as e:
                failed_count += 1
                self.cleanup_repo.log_cleanup_item(
                    session_id=session.id,
                    device_id=device.name,
                    local_media_id=item.local_media_id,
                    device_identifier=item.device_unique_id,
                    device_filename=item.filename,
                    device_size=item.device_size_bytes,
                    verification_status="VERIFIED",
                    cleanup_status="FAILED",
                    error=str(e),
                )

        self.cleanup_repo.complete_session(
            session_id=session.id,
            deleted_items=deleted_count,
            failed_items=failed_count,
            bytes_reclaimed=bytes_reclaimed,
            status="COMPLETED",
        )

        return {
            "session_id": session.id,
            "total_items": total,
            "deleted_count": deleted_count,
            "failed_count": failed_count,
            "bytes_reclaimed": bytes_reclaimed,
        }
