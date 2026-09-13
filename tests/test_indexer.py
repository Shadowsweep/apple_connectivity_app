from pathlib import Path

from app.database.connection import DatabaseConnection
from app.database.repositories.import_repository import ImportRepository
from app.database.repositories.media_repository import MediaRepository
from app.device.iphone import MockIPhoneDevice
from app.duplicate.detector import DuplicateDetector
from app.importer.importer import SafeImporter
from app.indexer.indexer import LibraryIndexer
from app.organizer.organizer import MediaOrganizer
from app.scanner.scanner import MediaScanner
from app.storage.manager import StorageManager


def test_library_indexing_and_missing_files(tmp_path: Path, mock_iphone_dir: Path):
    lib_path = tmp_path / "lib"
    storage_mgr = StorageManager(lib_path, safety_reserve_bytes=1024)
    storage_mgr.ensure_directory_structure()

    db = DatabaseConnection(lib_path / ".memeasy" / "library.db")
    db.initialize()

    organizer = MediaOrganizer(lib_path)
    duplicate_detector = DuplicateDetector(lib_path)
    importer = SafeImporter(storage_mgr, organizer, duplicate_detector, db=db)

    device = MockIPhoneDevice(mock_iphone_dir)
    scanner = MediaScanner(device)
    items = scanner.scan()

    # Step 1: Import with SQLite tracking
    summary = importer.execute_import(items, device)
    assert summary.successful_count > 0

    media_repo = MediaRepository(db)
    import_repo = ImportRepository(db)

    assert media_repo.count_all(status="ACTIVE") == summary.successful_count
    recent_imports = import_repo.get_recent_imports()
    assert len(recent_imports) == 1
    assert recent_imports[0].status == "COMPLETED"

    # Step 2: Index library (should find everything up to date)
    indexer = LibraryIndexer(storage_mgr, db)
    idx_sum = indexer.index_library()
    assert idx_sum.total_scanned == summary.successful_count
    assert idx_sum.updated_indexed == summary.successful_count
    assert idx_sum.missing_flagged == 0

    # Step 3: Delete one physical file from disk
    first_imported = summary.imported_files[0][1]
    physical_file = lib_path / first_imported
    physical_file.unlink()

    # Re-index: should flag missing file
    idx_sum2 = indexer.index_library()
    assert idx_sum2.missing_flagged == 1

    # Verify status in database
    missing_rec = media_repo.get_by_relative_path(str(first_imported).replace("\\", "/"))
    assert missing_rec is not None
    assert missing_rec.status == "MISSING"
    db.close()


def test_rebuild_index(tmp_path: Path, mock_iphone_dir: Path):
    lib_path = tmp_path / "lib"
    storage_mgr = StorageManager(lib_path, safety_reserve_bytes=1024)
    storage_mgr.ensure_directory_structure()

    db = DatabaseConnection(lib_path / ".memeasy" / "library.db")
    organizer = MediaOrganizer(lib_path)
    duplicate_detector = DuplicateDetector(lib_path)
    importer = SafeImporter(storage_mgr, organizer, duplicate_detector, db=db)

    device = MockIPhoneDevice(mock_iphone_dir)
    scanner = MediaScanner(device)
    items = scanner.scan()
    importer.execute_import(items, device)

    # Rebuild index
    indexer = LibraryIndexer(storage_mgr, db)
    rebuild_sum = indexer.rebuild_index()

    assert rebuild_sum.total_scanned > 0
    assert (lib_path / ".memeasy" / "library.db.bak").exists()
    db.close()
