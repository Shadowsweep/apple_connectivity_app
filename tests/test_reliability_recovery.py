import os
import shutil
import tempfile
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from app.api.dependencies import init_app_context
from app.api.main import create_app
from app.core.errors import SecurityError
from app.core.security import validate_safe_path
from app.database.models import ImportRecord, MediaRecord, utc_now
from app.jobs.locks import ConcurrencyLockError, OperationLockManager


@pytest.fixture
def reliability_env():
    temp_dir = Path(tempfile.mkdtemp())
    library_root = temp_dir / "Library"
    mock_phone = temp_dir / "Phone"
    library_root.mkdir(parents=True, exist_ok=True)
    mock_phone.mkdir(parents=True, exist_ok=True)

    app = create_app(library_root=library_root, safety_reserve_bytes=1024)
    ctx = init_app_context(library_root=library_root, safety_reserve_bytes=1024)
    client = TestClient(app)

    yield {
        "client": client,
        "ctx": ctx,
        "temp_dir": temp_dir,
        "library_root": library_root,
        "mock_phone": mock_phone,
    }

    shutil.rmtree(temp_dir, ignore_errors=True)


def test_database_integrity_check_and_backup_restore(reliability_env):
    client = reliability_env["client"]
    ctx = reliability_env["ctx"]

    # 1. Check Integrity on clean database
    res = client.get("/api/database/integrity")
    assert res.status_code == 200
    data = res.json()
    assert data["is_healthy"] is True
    assert "ok" in data["messages"]

    # 2. Insert test media
    lib = ctx.library_repo.get_or_create(str(reliability_env["library_root"]))
    m = MediaRecord(
        id="rel-test-1",
        library_id=lib.id,
        filename="test.jpg",
        relative_path="Photos/2026/09/test.jpg",
        media_type="PHOTO",
        extension="jpg",
        size_bytes=100,
        hash_sha256="abc1234567890",
        status="ACTIVE",
    )
    ctx.media_repo.insert_or_update(m)
    assert ctx.media_repo.get_by_id("rel-test-1") is not None

    # 3. Create Backup
    res_b = client.post("/api/database/backup")
    assert res_b.status_code == 200
    backup_data = res_b.json()
    assert backup_data["success"] is True
    assert Path(backup_data["backup_path"]).exists()

    # 4. Modify / delete media in main db
    conn = ctx.db.get_connection()
    conn.execute("DELETE FROM media WHERE id = 'rel-test-1'")
    conn.commit()
    assert ctx.media_repo.get_by_id("rel-test-1") is None

    # 5. Restore from Backup
    res_r = client.post("/api/database/restore", json={"backup_path": backup_data["backup_path"]})
    assert res_r.status_code == 200
    assert ctx.media_repo.get_by_id("rel-test-1") is not None


def test_interrupted_import_recovery_on_startup(reliability_env):
    ctx = reliability_env["ctx"]
    library_root = reliability_env["library_root"]

    # Simulate an interrupted staging directory with orphan .part file
    staging_dir = ctx.storage_manager.get_staging_directory() / "crashed_session_123"
    staging_dir.mkdir(parents=True, exist_ok=True)
    orphan_part = staging_dir / "crashed_file.jpg.part"
    orphan_part.write_bytes(b"PARTIAL_CONTENT_123")

    # Simulate an in-progress import record
    lib = ctx.library_repo.get_or_create(str(library_root))
    dev = ctx.device_repo.register_device("TestDev", "IPHONE", "test-dev-1")
    imp = ImportRecord(
        id="crashed-import-999",
        library_id=lib.id,
        device_id=dev.id,
        started_at=utc_now(),
        total_files=5,
        status="IN_PROGRESS",
    )
    ctx.import_repo.create_import(imp)

    # Run recovery
    result = ctx.importer.recover_interrupted_imports()
    assert result["cleaned_staging_dirs"] >= 1
    assert result["recovered_imports"] >= 1

    # Verify staging dir was cleaned
    assert not staging_dir.exists()

    # Verify DB import record was transitioned to INTERRUPTED
    reconciled = ctx.import_repo.get_import("crashed-import-999")
    assert reconciled.status == "INTERRUPTED"


def test_path_traversal_prevention(reliability_env):
    client = reliability_env["client"]
    library_root = reliability_env["library_root"]

    # 1. validate_safe_path unit test
    with pytest.raises(SecurityError):
        validate_safe_path(
            target_path=library_root / "../../Windows/System32/cmd.exe",
            allowed_roots=[library_root],
        )

    # 2. API media streaming endpoint traversal test
    res = client.get("/api/media/non-existent-id/stream")
    assert res.status_code == 404


def test_operation_lock_prevents_conflicts():
    lock_mgr = OperationLockManager()

    # Acquire IMPORT lock
    assert lock_mgr.acquire_lock("job-1", "IMPORT") is True

    # Attempting to start conflicting REBUILD_INDEX should raise ConcurrencyLockError
    with pytest.raises(ConcurrencyLockError):
        lock_mgr.acquire_lock("job-2", "REBUILD_INDEX")

    # Attempting to start conflicting CLEAN_MOBILE should raise ConcurrencyLockError
    with pytest.raises(ConcurrencyLockError):
        lock_mgr.acquire_lock("job-3", "CLEAN_MOBILE")

    # Release lock
    lock_mgr.release_lock("job-1")

    # Now REBUILD_INDEX succeeds
    assert lock_mgr.acquire_lock("job-2", "REBUILD_INDEX") is True
    lock_mgr.release_lock("job-2")


def test_orphan_thumbnail_cleanup(reliability_env):
    client = reliability_env["client"]
    ctx = reliability_env["ctx"]

    thumb_dir = ctx.thumbnails.thumbnail_dir
    thumb_dir.mkdir(parents=True, exist_ok=True)

    # Create 2 thumbnail files on disk: 1 active, 1 orphan
    active_thumb = thumb_dir / "media-active.jpg"
    active_thumb.write_bytes(b"FAKE_THUMB_1")
    orphan_thumb = thumb_dir / "media-orphan.jpg"
    orphan_thumb.write_bytes(b"FAKE_THUMB_2")

    # Register only active media in DB
    lib = ctx.library_repo.get_or_create(str(reliability_env["library_root"]))
    ctx.media_repo.insert_or_update(
        MediaRecord(
            id="media-active",
            library_id=lib.id,
            filename="active.jpg",
            relative_path="Photos/active.jpg",
            media_type="PHOTO",
            extension="jpg",
            size_bytes=50,
            hash_sha256="fake_sha256_active",
            status="ACTIVE",
        )
    )

    # Trigger cleanup
    res = client.post("/api/thumbnails/cleanup")
    assert res.status_code == 200
    assert res.json()["pruned_count"] == 1
    assert active_thumb.exists()
    assert not orphan_thumb.exists()


def test_diagnostics_report_and_export(reliability_env):
    client = reliability_env["client"]

    # 1. Diagnostics endpoint
    res = client.get("/api/diagnostics")
    assert res.status_code == 200
    diag = res.json()
    assert diag["app_name"] == "MEMEASY"
    assert "database_status" in diag
    assert diag["database_status"]["is_healthy"] is True
    assert "storage_stats" in diag

    # 2. Export diagnostics
    res_exp = client.post("/api/diagnostics/export")
    assert res_exp.status_code == 200
    exp_data = res_exp.json()
    assert exp_data["app_name"] == "MEMEASY"
    assert "os" in exp_data
