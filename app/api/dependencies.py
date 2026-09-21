from pathlib import Path
import sys
import uuid
from typing import Optional

from app.api.jobs_manager import JobManager
from app.api.thumbnails import ThumbnailService
from app.cleaner.engine import CleanMobileEngine
from app.database.connection import DatabaseConnection
from app.database.repositories.album_repository import AlbumRepository
from app.database.repositories.cleanup_repository import CleanupRepository
from app.database.repositories.device_repository import DeviceRepository
from app.database.repositories.favorite_repository import FavoriteRepository
from app.database.repositories.import_repository import ImportRepository
from app.database.repositories.job_repository import JobRepository
from app.database.repositories.library_repository import LibraryRepository
from app.database.repositories.media_repository import MediaRepository
from app.database.repositories.saved_search_repository import SavedSearchRepository
from app.database.repositories.watch_repository import WatchRepository
from app.device.iphone import MediaDevice, get_connected_iphone
from app.duplicate.detector import DuplicateDetector
from app.importer.importer import SafeImporter
from app.indexer.indexer import LibraryIndexer
from app.organizer.organizer import MediaOrganizer
from app.storage.manager import StorageManager


from app.core.logging import setup_logging
from app.jobs.locks import OperationLockManager


class AppContext:
    """Dependency container holding configured singletons for the API process."""

    def __init__(self, library_root: Path, safety_reserve_bytes: Optional[int] = None):
        self.library_root = Path(library_root).resolve()
        log_dir = self.library_root / ".memeasy" / "logs"
        self.logger = setup_logging(log_dir=log_dir)

        if safety_reserve_bytes is not None:
            self.storage_manager = StorageManager(
                self.library_root, safety_reserve_bytes=safety_reserve_bytes
            )
        else:
            self.storage_manager = StorageManager(self.library_root)

        self.db = DatabaseConnection(self.library_root / ".memeasy" / "library.db")
        self.db.initialize()

        self.lock_manager = OperationLockManager()

        self.media_repo = MediaRepository(self.db)
        self.saved_search_repo = SavedSearchRepository(self.db)
        self.cleanup_repo = CleanupRepository(self.db)
        self.library_repo = LibraryRepository(self.db)
        self.device_repo = DeviceRepository(self.db)
        self.import_repo = ImportRepository(self.db)
        self.album_repo = AlbumRepository(self.db)
        self.fav_repo = FavoriteRepository(self.db)
        self.watch_repo = WatchRepository(self.db)
        self.job_repo = JobRepository(self.db)

        self.organizer = MediaOrganizer(self.library_root)
        self.duplicate_detector = DuplicateDetector(self.library_root)
        self.importer = SafeImporter(
            self.storage_manager, self.organizer, self.duplicate_detector, db=self.db
        )
        self.indexer = LibraryIndexer(self.storage_manager, self.db)
        self.thumbnails = ThumbnailService(self.storage_manager)
        self.job_manager = JobManager(self.job_repo)

        # Production Startup Recoveries
        self.job_manager.recover_stale_jobs()
        self.importer.recover_interrupted_imports()

        self.cleaner_engine = CleanMobileEngine(
            library_root=self.library_root,
            media_repo=self.media_repo,
            cleanup_repo=self.cleanup_repo,
        )
        self.active_scan_results: dict = {}
        self._connected_device: Optional[MediaDevice] = None

    def get_connected_device(self) -> MediaDevice:
        """Returns explicitly-set device first, then real USB iPhone, then mock fallback."""
        if self._connected_device is not None and self._connected_device.is_connected:
            return self._connected_device
        real = get_connected_iphone()
        if real is not None:
            self._connected_device = real
            return real
        # Default fallback: mock device folder
        mock_path = self.library_root.parent / "MockiPhone"
        mock_path.mkdir(parents=True, exist_ok=True)
        from app.device.iphone import MockIPhoneDevice

        self._connected_device = MockIPhoneDevice(mock_path, name="iPhone 15 Pro (Connected)")
        return self._connected_device

    def set_connected_device(self, device: Optional[MediaDevice]):
        self._connected_device = device


_GLOBAL_CONTEXT: Optional[AppContext] = None


def init_app_context(
    library_root: Optional[Path] = None,
    safety_reserve_bytes: Optional[int] = None,
) -> AppContext:
    global _GLOBAL_CONTEXT
    if library_root is None:
        from app.core.app_settings import load_settings
        # ponytail: frozen exe must not use the PyInstaller temp extraction dir
        configured = load_settings().get("default_library_path")
        configured_root = Path(configured).resolve() if configured else None
        if configured_root and configured_root.exists() and configured_root.is_dir():
            # A remembered removable-drive vault can exist but still be inaccessible.
            # Probe it before logging/database initialization so startup can recover.
            probe = configured_root / f".memeasy_probe_{uuid.uuid4().hex}"
            try:
                probe.write_text("ok", encoding="utf-8")
                probe.unlink(missing_ok=True)
                library_root = configured_root
            except OSError:
                library_root = None

        if library_root is None:
            base_dir = Path.home() / "MEMEASY" if getattr(sys, "frozen", False) else Path(__file__).resolve().parent.parent.parent
            library_root = base_dir / "Library"

    _GLOBAL_CONTEXT = AppContext(
        library_root, safety_reserve_bytes=safety_reserve_bytes
    )
    return _GLOBAL_CONTEXT


def get_app_context() -> AppContext:
    global _GLOBAL_CONTEXT
    if _GLOBAL_CONTEXT is None:
        _GLOBAL_CONTEXT = init_app_context()
    return _GLOBAL_CONTEXT
