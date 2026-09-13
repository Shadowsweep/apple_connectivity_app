import json
import os
import shutil
import tempfile
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from app.api.dependencies import init_app_context
from app.api.main import create_app
from app.database.models import MediaRecord, utc_now


@pytest.fixture
def test_env():
    temp_dir = Path(tempfile.mkdtemp())
    library_root = temp_dir / "Library"
    library_root.mkdir(parents=True, exist_ok=True)

    app = create_app(library_root=library_root)
    ctx = init_app_context(library_root=library_root)
    client = TestClient(app)

    lib = ctx.library_repo.get_or_create(str(library_root))

    # Insert mock media
    now = utc_now()
    m1 = MediaRecord(
        id="media-1",
        library_id=lib.id,
        filename="IMG_0001.JPG",
        relative_path="Photos/2026/09/IMG_0001.JPG",
        media_type="PHOTO",
        mime_type="image/jpeg",
        extension="jpg",
        size_bytes=5_000_000,
        capture_date=now,
        imported_at=now,
        width=4032,
        height=3024,
        hash_sha256="hash_abc_1",
        status="ACTIVE",
    )
    m2 = MediaRecord(
        id="media-2",
        library_id=lib.id,
        filename="IMG_0001_copy.JPG",
        relative_path="Photos/2026/09/IMG_0001_copy.JPG",
        media_type="PHOTO",
        mime_type="image/jpeg",
        extension="jpg",
        size_bytes=5_000_000,
        capture_date=now,
        imported_at=now,
        width=4032,
        height=3024,
        hash_sha256="hash_abc_1",  # Same hash -> duplicate!
        status="ACTIVE",
    )
    m3 = MediaRecord(
        id="media-3",
        library_id=lib.id,
        filename="VIDEO_4K.MOV",
        relative_path="Videos/2026/09/VIDEO_4K.MOV",
        media_type="VIDEO",
        mime_type="video/quicktime",
        extension="mov",
        size_bytes=1_500_000_000,  # 1.5 GB
        capture_date=now,
        imported_at=now,
        width=3840,
        height=2160,
        duration_ms=120_000,
        hash_sha256="hash_vid_4k",
        status="ACTIVE",
    )

    ctx.media_repo.insert_or_update(m1)
    ctx.media_repo.insert_or_update(m2)
    ctx.media_repo.insert_or_update(m3)

    # Create dummy files on disk
    f1 = library_root / m1.relative_path
    f1.parent.mkdir(parents=True, exist_ok=True)
    f1.write_bytes(b"dummy image 1")

    f2 = library_root / m2.relative_path
    f2.parent.mkdir(parents=True, exist_ok=True)
    f2.write_bytes(b"dummy image 2")

    f3 = library_root / m3.relative_path
    f3.parent.mkdir(parents=True, exist_ok=True)
    f3.write_bytes(b"dummy video")

    yield {"client": client, "ctx": ctx, "root": library_root}

    shutil.rmtree(temp_dir, ignore_errors=True)


def test_saved_searches_crud_and_results(test_env):
    client = test_env["client"]

    # 1. Create saved search
    create_payload = {
        "name": "Large 4K Videos",
        "query": {
            "media_type": "VIDEO",
            "min_size": 1_000_000_000,
        },
    }
    res = client.post("/api/searches", json=create_payload)
    assert res.status_code == 201
    search_data = res.json()
    search_id = search_data["id"]
    assert search_data["name"] == "Large 4K Videos"

    # 2. List saved searches
    res = client.get("/api/searches")
    assert res.status_code == 200
    searches = res.json()
    assert len(searches) == 1

    # 3. Get results of saved search
    res = client.get(f"/api/searches/{search_id}/results")
    assert res.status_code == 200
    results = res.json()
    assert results["count"] == 1
    assert results["items"][0]["id"] == "media-3"

    # 4. Delete saved search
    res = client.delete(f"/api/searches/{search_id}")
    assert res.status_code == 204


def test_storage_analytics(test_env):
    client = test_env["client"]
    res = client.get("/api/analytics/storage")
    assert res.status_code == 200
    data = res.json()
    assert data["total_media_count"] == 3
    assert data["photo_count"] == 2
    assert data["video_count"] == 1
    assert len(data["by_extension"]) > 0
    assert len(data["largest_files"]) == 3
    assert data["largest_files"][0]["id"] == "media-3"


def test_timeline_hierarchy(test_env):
    client = test_env["client"]
    # Years
    res = client.get("/api/timeline/years")
    assert res.status_code == 200
    years = res.json()
    assert len(years) >= 1
    yr = years[0]["year"]

    # Months
    res = client.get(f"/api/timeline/months?year={yr}")
    assert res.status_code == 200
    months = res.json()
    assert len(months) >= 1

    # Media
    res = client.get(f"/api/timeline/media?year={yr}&limit=10")
    assert res.status_code == 200
    media_res = res.json()
    assert media_res["count"] == 3


def test_duplicates_and_trash(test_env):
    client = test_env["client"]
    # List duplicates
    res = client.get("/api/duplicates")
    assert res.status_code == 200
    groups = res.json()
    assert len(groups) == 1
    assert groups[0]["hash_sha256"] == "hash_abc_1"
    assert groups[0]["count"] == 2

    # Trash one copy
    trash_payload = {"media_ids": ["media-2"]}
    res = client.post("/api/duplicates/trash", json=trash_payload)
    assert res.status_code == 200
    assert res.json()["trashed_count"] == 1

    # Duplicates should now be empty since only 1 active item remains with that hash
    res = client.get("/api/duplicates")
    assert len(res.json()) == 0


def test_library_health_scan(test_env):
    client = test_env["client"]
    root = test_env["root"]

    # Initial health
    res = client.get("/api/library/health")
    assert res.status_code == 200
    assert res.json()["is_healthy"] is True

    # Delete a file on disk to simulate missing file
    (root / "Photos/2026/09/IMG_0001.JPG").unlink()

    # Health scan should detect missing file
    res = client.get("/api/library/health")
    assert res.json()["missing_count"] == 1
    assert res.json()["is_healthy"] is False
