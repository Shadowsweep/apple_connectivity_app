from pathlib import Path
from typing import Optional

from app.api.jobs_manager import JobManager
from app.api.thumbnails import ThumbnailService
from app.database.connection import DatabaseConnection
from app.database.repositories.album_repository import AlbumRepository
from app.database.repositories.device_repository import DeviceRepository
from app.database.repositories.favorite_repository import FavoriteRepository
from app.database.repositories.import_repository import ImportRepository
from app.database.repositories.job_repository import JobRepository
from app.database.repositories.library_repository import LibraryRepository
from app.database.repositories.media_repository import MediaRepository
from app.database.repositories.saved_search_repository import SavedSearchRepository
from app.database.repositories.watch_repository import WatchRepository
from app.duplicate.detector import DuplicateDetector
from app.importer.importer import SafeImporter
from app.indexer.indexer import LibraryIndexer
from app.organizer.organizer import MediaOrganizer
from app.storage.manager import StorageManager


class AppContext:
    """Dependency container holding configured singletons for the API process."""

    def __init__(self, library_root: Path, safety_reserve_bytes: Optional[int] = None):
        self.library_root = Path(library_root).resolve()
        if safety_reserve_bytes is not None:
            self.storage_manager = StorageManager(
                self.library_root, safety_reserve_bytes=safety_reserve_bytes
            )
        else:
            self.storage_manager = StorageManager(self.library_root)

        self.db = DatabaseConnection(self.library_root / ".memeasy" / "library.db")
        self.db.initialize()

        self.media_repo = MediaRepository(self.db)
        self.saved_search_repo = SavedSearchRepository(self.db)
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


_GLOBAL_CONTEXT: Optional[AppContext] = None


def init_app_context(
    library_root: Optional[Path] = None,
    safety_reserve_bytes: Optional[int] = None,
) -> AppContext:
    global _GLOBAL_CONTEXT
    if library_root is None:
        base_dir = Path(__file__).resolve().parent.parent.parent
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
