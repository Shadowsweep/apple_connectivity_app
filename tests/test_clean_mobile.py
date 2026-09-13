import os
import shutil
import tempfile
import time
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from app.api.dependencies import init_app_context
from app.api.main import create_app
from app.cleaner.engine import CleanableStatus
from app.database.models import MediaRecord, utc_now
from app.device.iphone import MockIPhoneDevice
from app.duplicate.detector import DuplicateDetector


@pytest.fixture
def clean_env():
    temp_dir = Path(tempfile.mkdtemp())
    library_root = temp_dir / "Library"
    mock_iphone_root = temp_dir / "MockiPhone"
    library_root.mkdir(parents=True, exist_ok=True)
    mock_iphone_root.mkdir(parents=True, exist_ok=True)

    app = create_app(library_root=library_root)
    ctx = init_app_context(library_root=library_root)
    client = TestClient(app)

    lib = ctx.library_repo.get_or_create(str(library_root))
    now = utc_now()

    # Create file on disk for Local Library
    local_photo_rel = "Photos/2026/09/IMG_1001.JPG"
    local_photo_path = library_root / local_photo_rel
    local_photo_path.parent.mkdir(parents=True, exist_ok=True)
    local_photo_bytes = b"EXACT_MATCH_IMAGE_CONTENT_12345"
    local_photo_path.write_bytes(local_photo_bytes)
    local_hash = DuplicateDetector.calculate_file_hash(local_photo_path)

    m1 = MediaRecord(
        id="local-media-1",
        library_id=lib.id,
        filename="IMG_1001.JPG",
        relative_path=local_photo_rel,
        media_type="PHOTO",
        mime_type="image/jpeg",
        extension="jpg",
        size_bytes=len(local_photo_bytes),
        capture_date=now,
        imported_at=now,
        hash_sha256=local_hash,
        status="ACTIVE",
    )
    ctx.media_repo.insert_or_update(m1)

    # Setup Mock iPhone with 3 files:
    # 1. Identical verified file
    phone_f1 = mock_iphone_root / "DCIM" / "IMG_1001.JPG"
    phone_f1.parent.mkdir(parents=True, exist_ok=True)
    phone_f1.write_bytes(local_photo_bytes)

    # 2. Collision file (same name & size, DIFFERENT hash)
    phone_f2 = mock_iphone_root / "DCIM" / "IMG_1002.JPG"
    phone_f2.write_bytes(b"DIFFERENT_CONTENT_SAME_LENGTH__")

    # Local media for 1002 with different content
    local_f2_path = library_root / "Photos/2026/09/IMG_1002.JPG"
    local_f2_path.write_bytes(b"LOCAL_CONTENT_DIFFERENT_HASH___")
    local_f2_hash = DuplicateDetector.calculate_file_hash(local_f2_path)
    m2 = MediaRecord(
        id="local-media-2",
        library_id=lib.id,
        filename="IMG_1002.JPG",
        relative_path="Photos/2026/09/IMG_1002.JPG",
        media_type="PHOTO",
        extension="jpg",
        size_bytes=len(local_photo_bytes),
        capture_date=now,
        imported_at=now,
        hash_sha256=local_f2_hash,
        status="ACTIVE",
    )
    ctx.media_repo.insert_or_update(m2)

    # 3. Not backed up file (not in local library)
    phone_f3 = mock_iphone_root / "DCIM" / "IMG_NEW.JPG"
    phone_f3.write_bytes(b"NEW_PHONE_ONLY_PHOTO_BYTES")

    mock_device = MockIPhoneDevice(mock_iphone_root, name="iPhone Test", allow_delete=True)
    ctx.set_connected_device(mock_device)

    yield {
        "client": client,
        "ctx": ctx,
        "library_root": library_root,
        "phone_root": mock_iphone_root,
        "mock_device": mock_device,
        "local_m1": m1,
    }

    shutil.rmtree(temp_dir, ignore_errors=True)


def test_clean_scan_classifies_correctly(clean_env):
    client = clean_env["client"]
    res = client.get("/api/clean/scan/results")
    assert res.status_code == 200
    data = res.json()

    assert data["total_device_media"] == 3
    assert data["verified_cleanable_count"] == 1
    assert data["unverified_candidate_count"] == 1
    assert data["not_backed_up_count"] == 1
    assert data["total_reclaimable_bytes"] > 0

    items = data["items"]
    # Verify IMG_1001.JPG is CLEANABLE
    item1 = next(i for i in items if i["filename"] == "IMG_1001.JPG")
    assert item1["status"] == "CLEANABLE"
    assert item1["verification"]["content_identity_matched"] is True

    # Verify IMG_1002.JPG is UNVERIFIED_CANDIDATE (False positive prevented!)
    item2 = next(i for i in items if i["filename"] == "IMG_1002.JPG")
    assert item2["status"] == "UNVERIFIED_CANDIDATE"
    assert item2["verification"]["content_identity_matched"] is False

    # Verify IMG_NEW.JPG is NOT_BACKED_UP
    item3 = next(i for i in items if i["filename"] == "IMG_NEW.JPG")
    assert item3["status"] == "NOT_BACKED_UP"


def test_clean_execute_deletes_device_file_leaves_local_intact(clean_env):
    client = clean_env["client"]
    phone_root = clean_env["phone_root"]
    library_root = clean_env["library_root"]

    # Initial scan
    res = client.get("/api/clean/scan/results")
    items = res.json()["items"]
    cleanable_item = next(i for i in items if i["status"] == "CLEANABLE")

    phone_target_file = phone_root / "DCIM" / "IMG_1001.JPG"
    local_target_file = library_root / "Photos/2026/09/IMG_1001.JPG"
    assert phone_target_file.exists()
    assert local_target_file.exists()

    # Execute deletion
    payload = {
        "device_unique_ids": [cleanable_item["device_unique_id"]],
        "confirmed": True,
    }
    res = client.post("/api/clean/execute", json=payload)
    assert res.status_code == 200
    job_id = res.json()["job_id"]
    max_wait = 10
    start_time = time.time()
    while time.time() - start_time < max_wait:
        resp_job = client.get(f"/api/jobs/{job_id}")
        if resp_job.status_code == 200 and resp_job.json()["status"] == "COMPLETED":
            break
        time.sleep(0.05)

    # Verify device file is DELETED
    assert not phone_target_file.exists()

    # CRITICAL: Verify local file is completely INTACT
    assert local_target_file.exists()

    # Check cleanup history
    res = client.get("/api/clean/history")
    assert res.status_code == 200
    history = res.json()
    assert len(history) == 1
    assert history[0]["deleted_items"] == 1
    assert history[0]["bytes_reclaimed"] > 0


def test_unverified_file_cannot_be_deleted(clean_env):
    client = clean_env["client"]
    res = client.get("/api/clean/scan/results")
    items = res.json()["items"]
    unverified_item = next(i for i in items if i["status"] == "UNVERIFIED_CANDIDATE")

    payload = {
        "device_unique_ids": [unverified_item["device_unique_id"]],
        "confirmed": True,
    }
    res = client.post("/api/clean/execute", json=payload)
    assert res.status_code == 400
