from datetime import datetime
from pathlib import Path
from app.device.iphone import MockIPhoneDevice
from app.filters.media_filter import FilterCriteria, MediaFilter
from app.scanner.metadata import MediaType
from app.scanner.scanner import MediaScanner


def test_date_range_filtering(mock_iphone_dir: Path):
    device = MockIPhoneDevice(mock_iphone_dir)
    scanner = MediaScanner(device)
    items = scanner.scan()

    # Filter to only items in 2026
    criteria = FilterCriteria(
        date_from=datetime(2026, 1, 1),
        date_to=datetime(2026, 12, 31, 23, 59, 59),
    )
    res = MediaFilter(criteria).apply(items)

    filenames = [it.filename for it in res.accepted]
    assert "IMG_1001.JPG" not in filenames  # From 2025
    assert "IMG_1002.JPG" in filenames      # Feb 2026
    assert "IMG_1004.MOV" in filenames      # May 2026


def test_media_type_filtering(mock_iphone_dir: Path):
    device = MockIPhoneDevice(mock_iphone_dir)
    scanner = MediaScanner(device)
    items = scanner.scan()

    # Filter photos only
    criteria = FilterCriteria(allowed_types={MediaType.PHOTO})
    res = MediaFilter(criteria).apply(items)
    for it in res.accepted:
        assert it.media_type == MediaType.PHOTO


def test_video_size_filtering(mock_iphone_dir: Path):
    device = MockIPhoneDevice(mock_iphone_dir)
    scanner = MediaScanner(device)
    items = scanner.scan()

    # Require videos >= 10,000 bytes
    criteria = FilterCriteria(
        allowed_types={MediaType.VIDEO},
        min_video_size_bytes=10000,
    )
    res = MediaFilter(criteria).apply(items)
    for it in res.accepted:
        assert it.media_type == MediaType.VIDEO
        assert it.size_bytes >= 10000


def test_storage_quota_budget(mock_iphone_dir: Path):
    device = MockIPhoneDevice(mock_iphone_dir)
    scanner = MediaScanner(device)
    items = scanner.scan()

    # Set very low budget
    criteria = FilterCriteria(max_total_import_bytes=1000)
    res = MediaFilter(criteria).apply(items)
    assert res.total_accepted_bytes <= 1000
