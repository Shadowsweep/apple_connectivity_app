import uuid
from datetime import datetime
from pathlib import Path

from app.database.connection import DatabaseConnection
from app.database.models import MediaRecord
from app.database.repositories.album_repository import AlbumRepository
from app.database.repositories.favorite_repository import FavoriteRepository
from app.database.repositories.library_repository import LibraryRepository
from app.database.repositories.media_repository import MediaRepository
from app.database.repositories.watch_repository import WatchRepository


def _create_sample_media(db: DatabaseConnection, lib_id: str) -> list[MediaRecord]:
    media_repo = MediaRepository(db)
    items = [
        MediaRecord(
            id=str(uuid.uuid4()),
            library_id=lib_id,
            filename="IMG_2025_01.JPG",
            relative_path="Photos/2025/01/IMG_2025_01.JPG",
            media_type="PHOTO",
            extension=".jpg",
            size_bytes=500_000,
            capture_date=datetime(2025, 1, 15, 12, 0, 0),
            hash_sha256="hash_photo_1",
            status="ACTIVE",
        ),
        MediaRecord(
            id=str(uuid.uuid4()),
            library_id=lib_id,
            filename="VID_2026_02.MOV",
            relative_path="Videos/2026/02/VID_2026_02.MOV",
            media_type="VIDEO",
            extension=".mov",
            size_bytes=100_000_000,
            capture_date=datetime(2026, 2, 20, 15, 30, 0),
            duration_ms=45000,
            hash_sha256="hash_video_2",
            status="ACTIVE",
        ),
        MediaRecord(
            id=str(uuid.uuid4()),
            library_id=lib_id,
            filename="Screenshot_2026.PNG",
            relative_path="Screenshots/2026/03/Screenshot_2026.PNG",
            media_type="SCREENSHOT",
            extension=".png",
            size_bytes=2_000_000,
            capture_date=datetime(2026, 3, 10, 8, 0, 0),
            hash_sha256="hash_screen_3",
            status="ACTIVE",
        ),
    ]
    for it in items:
        media_repo.insert_or_update(it)
    return items


def test_media_queries_and_filters(tmp_path: Path):
    db = DatabaseConnection(tmp_path / "lib.db")
    db.initialize()
    lib_repo = LibraryRepository(db)
    lib = lib_repo.get_or_create(str(tmp_path))
    media_repo = MediaRepository(db)

    items = _create_sample_media(db, lib.id)

    # Filter by type
    photos = media_repo.get_photos()
    assert len(photos) == 1
    assert photos[0].filename == "IMG_2025_01.JPG"

    # Filter by date
    year_2026 = media_repo.filter_media(start_date=datetime(2026, 1, 1))
    assert len(year_2026) == 2

    # Filter by size
    large_videos = media_repo.filter_media(media_type="VIDEO", min_size=50_000_000)
    assert len(large_videos) == 1
    assert large_videos[0].filename == "VID_2026_02.MOV"

    # Search query
    search_res = media_repo.filter_media(search_query="Screenshot")
    assert len(search_res) == 1
    db.close()


def test_virtual_albums(tmp_path: Path):
    db = DatabaseConnection(tmp_path / "lib.db")
    db.initialize()
    lib_repo = LibraryRepository(db)
    lib = lib_repo.get_or_create(str(tmp_path))
    items = _create_sample_media(db, lib.id)

    album_repo = AlbumRepository(db)
    album = album_repo.create_album(lib.id, "Vacation 2026", description="Summer Trip")
    assert album.name == "Vacation 2026"

    # Link media items
    album_repo.add_media_to_album(album.id, items[0].id)
    album_repo.add_media_to_album(album.id, items[1].id)

    album_media = album_repo.get_album_media(album.id)
    assert len(album_media) == 2

    # Remove one item
    album_repo.remove_media_from_album(album.id, items[0].id)
    album_media_after = album_repo.get_album_media(album.id)
    assert len(album_media_after) == 1

    # Delete album (should NOT delete the physical media record)
    album_repo.delete_album(album.id)
    media_repo = MediaRepository(db)
    assert media_repo.get_by_id(items[0].id) is not None
    assert media_repo.get_by_id(items[1].id) is not None
    db.close()


def test_favorites_and_watch_progress(tmp_path: Path):
    db = DatabaseConnection(tmp_path / "lib.db")
    db.initialize()
    lib_repo = LibraryRepository(db)
    lib = lib_repo.get_or_create(str(tmp_path))
    items = _create_sample_media(db, lib.id)

    # Favorites
    fav_repo = FavoriteRepository(db)
    assert not fav_repo.is_favorite(items[0].id)

    fav_repo.add_favorite(items[0].id)
    assert fav_repo.is_favorite(items[0].id)
    assert len(fav_repo.get_favorites()) == 1

    fav_repo.remove_favorite(items[0].id)
    assert not fav_repo.is_favorite(items[0].id)

    # Watch progress
    watch_repo = WatchRepository(db)
    vid_id = items[1].id
    watch_repo.upsert_progress(vid_id, position_ms=15000, duration_ms=45000, completed=False)

    prog = watch_repo.get_progress(vid_id)
    assert prog is not None
    assert prog.position_ms == 15000

    continue_list = watch_repo.get_continue_watching()
    assert len(continue_list) == 1
    media_rec, wp_rec = continue_list[0]
    assert media_rec.id == vid_id
    assert wp_rec.position_ms == 15000

    # Mark completed
    watch_repo.upsert_progress(vid_id, position_ms=45000, duration_ms=45000, completed=True)
    assert len(watch_repo.get_continue_watching()) == 0
    db.close()
