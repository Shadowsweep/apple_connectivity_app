from pathlib import Path
import pytest
from app.device.iphone import MockIPhoneDevice
from app.duplicate.detector import DuplicateDetector
from app.importer.importer import SafeImporter
from app.organizer.organizer import MediaOrganizer
from app.scanner.metadata import MediaItem, MediaType
from app.scanner.scanner import MediaScanner
from app.storage.manager import StorageManager


def test_interrupted_staging_cleanup(tmp_path: Path):
    lib_path = tmp_path / "lib"
    storage_mgr = StorageManager(lib_path)
    storage_mgr.ensure_directory_structure()

    # Create dummy leftover temp files in staging
    staging = storage_mgr.get_staging_directory()
    leftover = staging / "orphaned_session_file.tmp"
    leftover.write_text("abandoned transfer data")
    assert leftover.exists()

    # Clean staging area
    storage_mgr.clean_staging_area()
    assert not leftover.exists()


def test_insufficient_storage_reserve(mock_iphone_dir: Path, tmp_path: Path):
    lib_path = tmp_path / "lib"
    # Artificially huge safety reserve to force space exhaustion
    huge_reserve = 1000 * 1024 * 1024 * 1024 * 1024  # 1000 TB
    storage_mgr = StorageManager(lib_path, safety_reserve_bytes=huge_reserve)
    organizer = MediaOrganizer(lib_path)
    duplicate_detector = DuplicateDetector(lib_path)
    importer = SafeImporter(storage_mgr, organizer, duplicate_detector)

    device = MockIPhoneDevice(mock_iphone_dir)
    scanner = MediaScanner(device)
    items = scanner.scan()

    preview = importer.preview(items)
    assert preview.can_fit is False

    summary = importer.execute_import(items, device)
    assert summary.successful_count == 0
    assert summary.skipped_space_count == len(items)


def test_filename_collision_with_different_content_disambiguation(tmp_path: Path):
    lib_path = tmp_path / "lib"
    storage_mgr = StorageManager(lib_path, safety_reserve_bytes=1024)
    organizer = MediaOrganizer(lib_path)
    duplicate_detector = DuplicateDetector(lib_path)
    importer = SafeImporter(storage_mgr, organizer, duplicate_detector)

    # Pre-create an existing file at target path
    existing_dest = lib_path / "Photos" / "2026" / "02" / "IMG_1002.JPG"
    existing_dest.parent.mkdir(parents=True, exist_ok=True)
    existing_dest.write_bytes(b"existing file with identical name but different content")

    # Create dummy source item with same name but different bytes
    source_dir = tmp_path / "src"
    source_dir.mkdir()
    src_file = source_dir / "IMG_1002.JPG"
    src_file.write_bytes(b"new different content")

    from app.device.iphone import DeviceMediaEntry
    from app.scanner.metadata import MetadataExtractor

    entry = DeviceMediaEntry(
        device_id="TestDev",
        unique_id="IMG_1002.JPG",
        filename="IMG_1002.JPG",
        size_bytes=len(src_file.read_bytes()),
        source_path=src_file,
    )
    item = MetadataExtractor.extract_from_entry(entry)

    from datetime import datetime
    item.capture_date = datetime(2026, 2, 14, 10, 0, 0)
    item.media_type = MediaType.PHOTO

    summary = importer.execute_import([item], MockIPhoneDevice(source_dir))
    assert summary.successful_count == 1

    # Should have disambiguated to IMG_1002_1.JPG without overwriting the original
    disambiguated = lib_path / "Photos" / "2026" / "02" / "IMG_1002_1.JPG"
    assert existing_dest.exists()
    assert disambiguated.exists()
    assert disambiguated.read_bytes() == b"new different content"
