from pathlib import Path
from app.storage.manager import StorageManager


def test_storage_validation_and_structure(tmp_path: Path):
    target = tmp_path / "test_media_vault"
    mgr = StorageManager(target, safety_reserve_bytes=10 * 1024 * 1024 * 1024)

    valid, msg = mgr.validate_destination()
    assert valid is True

    mgr.ensure_directory_structure()
    assert (target / "Photos").is_dir()
    assert (target / "Videos").is_dir()
    assert (target / "Screenshots").is_dir()
    assert (target / "LivePhotos").is_dir()
    assert (target / "Thumbnails").is_dir()
    assert (target / ".memeasy" / "tmp").is_dir()


def test_storage_stats_and_reserve(tmp_path: Path):
    mgr = StorageManager(tmp_path, safety_reserve_bytes=10 * 1024 * 1024 * 1024)
    stats = mgr.get_storage_stats()

    assert stats.total_bytes > 0
    assert stats.free_bytes > 0
    assert stats.safety_reserve_bytes == 10 * 1024 * 1024 * 1024
    assert stats.usable_bytes == max(0, stats.free_bytes - stats.safety_reserve_bytes)


def test_format_bytes():
    assert StorageManager.format_bytes(500) == "500 B"
    assert StorageManager.format_bytes(1024) == "1.0 KB"
    assert StorageManager.format_bytes(1024 * 1024 * 50) == "50.0 MB"
    assert StorageManager.format_bytes(1024 * 1024 * 1024 * 12) == "12.0 GB"
