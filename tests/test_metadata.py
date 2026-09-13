from datetime import datetime
from pathlib import Path
from app.device.iphone import MockIPhoneDevice
from app.scanner.metadata import MediaType, MetadataExtractor
from app.scanner.scanner import MediaScanner


def test_exif_metadata_extraction(mock_iphone_dir: Path):
    device = MockIPhoneDevice(mock_iphone_dir)
    entries = device.discover_media()
    entry_map = {e.filename: e for e in entries}

    item1 = MetadataExtractor.extract_from_entry(entry_map["IMG_1001.JPG"])
    assert item1.media_type == MediaType.PHOTO
    assert item1.capture_date is not None
    assert item1.capture_date.year == 2025
    assert item1.capture_date.month == 6
    assert item1.capture_date.day == 15
    assert item1.capture_date_source == "EXIF"
    assert item1.width == 800
    assert item1.height == 600


def test_quicktime_metadata_extraction(mock_iphone_dir: Path):
    device = MockIPhoneDevice(mock_iphone_dir)
    entries = device.discover_media()
    entry_map = {e.filename: e for e in entries}

    item = MetadataExtractor.extract_from_entry(entry_map["IMG_1004.MOV"])
    assert item.media_type == MediaType.VIDEO
    assert item.capture_date is not None
    assert item.capture_date.year == 2026
    assert item.capture_date.month == 5
    assert item.capture_date.day == 10
    assert item.capture_date_source == "QUICKTIME"
    assert item.duration_ms == 15000


def test_filename_fallback_and_screenshot(mock_iphone_dir: Path):
    device = MockIPhoneDevice(mock_iphone_dir)
    entries = device.discover_media()
    entry_map = {e.filename: e for e in entries}

    scr_entry = entry_map["Screenshot_20260720-213000.PNG"]
    item = MetadataExtractor.extract_from_entry(scr_entry)
    assert item.media_type == MediaType.SCREENSHOT
    assert item.capture_date is not None
    assert item.capture_date.year == 2026
    assert item.capture_date.month == 7
    assert item.capture_date.day == 20
    assert item.capture_date_source == "FILENAME"


def test_live_photo_pairing(mock_iphone_dir: Path):
    device = MockIPhoneDevice(mock_iphone_dir)
    scanner = MediaScanner(device)
    items = scanner.scan()
    item_map = {it.filename: it for it in items}

    assert item_map["IMG_1003.JPG"].media_type == MediaType.LIVE_PHOTO
    assert item_map["IMG_1003.MOV"].media_type == MediaType.LIVE_PHOTO
