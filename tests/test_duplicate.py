from pathlib import Path
from app.device.iphone import MockIPhoneDevice
from app.duplicate.detector import DuplicateDetector, DuplicateStatus
from app.scanner.scanner import MediaScanner


def test_duplicate_detection_empty_library(mock_iphone_dir: Path, tmp_path: Path):
    lib_path = tmp_path / "lib"
    lib_path.mkdir()

    detector = DuplicateDetector(lib_path)
    device = MockIPhoneDevice(mock_iphone_dir)
    scanner = MediaScanner(device)
    items = scanner.scan()

    for item in items:
        status, cand = detector.check_item(item)
        assert status == DuplicateStatus.NEW


def test_duplicate_already_imported_detection(mock_iphone_dir: Path, tmp_path: Path):
    lib_path = tmp_path / "lib"
    photos_dir = lib_path / "Photos" / "2025" / "06"
    photos_dir.mkdir(parents=True, exist_ok=True)

    # Put exact copy of IMG_1001.JPG in library
    source_img1 = mock_iphone_dir / "DCIM" / "100APPLE" / "IMG_1001.JPG"
    local_copy = photos_dir / "IMG_1001.JPG"
    local_copy.write_bytes(source_img1.read_bytes())

    detector = DuplicateDetector(lib_path)
    device = MockIPhoneDevice(mock_iphone_dir)
    scanner = MediaScanner(device)
    items = scanner.scan()
    item_map = {it.filename: it for it in items}

    # IMG_1001.JPG should be recognized as ALREADY_IMPORTED
    status, record = detector.check_item(item_map["IMG_1001.JPG"])
    assert status == DuplicateStatus.ALREADY_IMPORTED
    assert record is not None
    assert record.filename == "IMG_1001.JPG"

    # IMG_9999.JPG (different filename, identical content) should ALSO be recognized as ALREADY_IMPORTED
    status_dup, record_dup = detector.check_item(item_map["IMG_9999.JPG"])
    assert status_dup == DuplicateStatus.ALREADY_IMPORTED
    assert record_dup is not None


def test_name_collision_different_content(mock_iphone_dir: Path, tmp_path: Path):
    lib_path = tmp_path / "lib"
    photos_dir = lib_path / "Photos" / "2025" / "06"
    photos_dir.mkdir(parents=True, exist_ok=True)

    # Put a DIFFERENT file with name IMG_1001.JPG in library
    local_copy = photos_dir / "IMG_1001.JPG"
    local_copy.write_bytes(b"completely different byte stream for collision test")

    detector = DuplicateDetector(lib_path)
    device = MockIPhoneDevice(mock_iphone_dir)
    scanner = MediaScanner(device)
    items = scanner.scan()
    item_map = {it.filename: it for it in items}

    status, record = detector.check_item(item_map["IMG_1001.JPG"])
    assert status == DuplicateStatus.NAME_COLLISION


def test_custom_prefix_duplicate_survives_restart(mock_iphone_dir: Path, tmp_path: Path):
    # ponytail: regression for vault subfolders like Trips/Photos/2026/09
    lib_path = tmp_path / "lib"
    custom_dir = lib_path / "Trips" / "Photos" / "2026" / "09"
    custom_dir.mkdir(parents=True, exist_ok=True)
    source = mock_iphone_dir / "DCIM" / "100APPLE" / "IMG_1001.JPG"
    (custom_dir / "IMG_1001.JPG").write_bytes(source.read_bytes())

    device = MockIPhoneDevice(mock_iphone_dir)
    items = {it.filename: it for it in MediaScanner(device).scan()}
    # fresh instance = app restart, must still find custom-prefix copy
    status, _ = DuplicateDetector(lib_path).check_item(items["IMG_1001.JPG"])
    assert status == DuplicateStatus.ALREADY_IMPORTED
