from pathlib import Path
from app.device.iphone import MockIPhoneDevice
from app.duplicate.detector import DuplicateDetector
from app.importer.importer import SafeImporter
from app.organizer.organizer import MediaOrganizer
from app.scanner.metadata import MediaType
from app.scanner.scanner import MediaScanner
from app.storage.manager import StorageManager


def test_safe_import_pipeline(mock_iphone_dir: Path, tmp_path: Path):
    lib_path = tmp_path / "lib"
    storage_mgr = StorageManager(lib_path, safety_reserve_bytes=1024)
    organizer = MediaOrganizer(lib_path)
    duplicate_detector = DuplicateDetector(lib_path)
    importer = SafeImporter(storage_mgr, organizer, duplicate_detector)

    device = MockIPhoneDevice(mock_iphone_dir)
    scanner = MediaScanner(device)
    items = scanner.scan()

    # Step 1: Preview
    preview = importer.preview(items)
    assert preview.total_candidates == len(items)
    assert preview.new_items_count > 0

    # Step 2: Execute Import
    summary = importer.execute_import(items, device)
    assert summary.successful_count > 0
    assert summary.failed_count == 0

    # Verify physical file existence in library
    assert (lib_path / "Photos" / "2025" / "06" / "IMG_1001.JPG").exists()
    assert (lib_path / "Photos" / "2026" / "02" / "IMG_1002.JPG").exists()
    assert (lib_path / "Videos" / "2026" / "05" / "IMG_1004.MOV").exists()
    assert (lib_path / "Screenshots" / "2026" / "07" / "Screenshot_20260720-213000.PNG").exists()

    # Verify staging area is cleaned up
    staging = storage_mgr.get_staging_directory()
    assert len(list(staging.iterdir())) == 0

    # Step 3: Re-importing same items -> All should be recognized as duplicates and skipped without copying
    reimport_summary = importer.execute_import(items, device)
    assert reimport_summary.successful_count == 0
    assert reimport_summary.duplicates_skipped_count == len(items)


def test_corrupted_staged_file_handling(mock_iphone_dir: Path, tmp_path: Path, monkeypatch):
    lib_path = tmp_path / "lib"
    storage_mgr = StorageManager(lib_path, safety_reserve_bytes=1024)
    organizer = MediaOrganizer(lib_path)
    duplicate_detector = DuplicateDetector(lib_path)
    importer = SafeImporter(storage_mgr, organizer, duplicate_detector)

    device = MockIPhoneDevice(mock_iphone_dir)
    scanner = MediaScanner(device)
    items = scanner.scan()

    # Corrupt copy_to method
    def bad_copy_to(entry, dest):
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(b"corrupted bytes")
        return 15

    monkeypatch.setattr(device, "copy_to", bad_copy_to)

    summary = importer.execute_import(items, device)
    assert summary.failed_count == len(items)
    assert summary.successful_count == 0
