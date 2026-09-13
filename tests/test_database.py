import uuid
from datetime import datetime
from pathlib import Path

from app.database.connection import DatabaseConnection
from app.database.models import DeviceRecord, JobRecord, LibraryRecord, MediaRecord
from app.database.repositories.device_repository import DeviceRepository
from app.database.repositories.job_repository import JobRepository
from app.database.repositories.library_repository import LibraryRepository
from app.database.repositories.media_repository import MediaRepository


def test_database_initialization_and_wal(tmp_path: Path):
    db_file = tmp_path / ".memeasy" / "library.db"
    db = DatabaseConnection(db_file)
    db.initialize()

    conn = db.get_connection()
    cursor = conn.cursor()

    # Check WAL mode
    cursor.execute("PRAGMA journal_mode")
    mode = cursor.fetchone()[0]
    assert mode.lower() == "wal"

    # Check foreign keys
    cursor.execute("PRAGMA foreign_keys")
    fk = cursor.fetchone()[0]
    assert fk == 1

    # Check schema migrations table
    cursor.execute("SELECT version FROM schema_migrations")
    versions = [row[0] for row in cursor.fetchall()]
    assert 1 in versions
    db.close()


def test_library_and_device_repositories(tmp_path: Path):
    db = DatabaseConnection(tmp_path / "lib.db")
    db.initialize()

    lib_repo = LibraryRepository(db)
    lib = lib_repo.get_or_create(str(tmp_path), name="Test Lib")
    assert lib.name == "Test Lib"

    # Fetch existing
    lib2 = lib_repo.get_or_create(str(tmp_path))
    assert lib2.id == lib.id

    dev_repo = DeviceRepository(db)
    dev = dev_repo.register_device("iPhone 15 Pro", identifier="SN12345")
    assert dev.identifier == "SN12345"

    all_devs = dev_repo.get_all()
    assert len(all_devs) == 1
    assert all_devs[0].name == "iPhone 15 Pro"
    db.close()


def test_media_crud_and_status(tmp_path: Path):
    db = DatabaseConnection(tmp_path / "lib.db")
    db.initialize()

    lib_repo = LibraryRepository(db)
    lib = lib_repo.get_or_create(str(tmp_path))

    media_repo = MediaRepository(db)
    mid = str(uuid.uuid4())
    rec = MediaRecord(
        id=mid,
        library_id=lib.id,
        filename="IMG_0001.JPG",
        relative_path="Photos/2026/02/IMG_0001.JPG",
        media_type="PHOTO",
        extension=".jpg",
        size_bytes=1048576,
        capture_date=datetime(2026, 2, 14, 10, 0, 0),
        hash_sha256="abc123hash",
        status="ACTIVE",
    )
    media_repo.insert_or_update(rec)

    fetched = media_repo.get_by_id(mid)
    assert fetched is not None
    assert fetched.filename == "IMG_0001.JPG"
    assert fetched.size_bytes == 1048576

    media_repo.mark_status(mid, "MISSING")
    fetched_missing = media_repo.get_by_id(mid)
    assert fetched_missing.status == "MISSING"
    db.close()


def test_job_repository(tmp_path: Path):
    db = DatabaseConnection(tmp_path / "lib.db")
    db.initialize()

    job_repo = JobRepository(db)
    jid = str(uuid.uuid4())
    job = JobRecord(
        id=jid,
        job_type="INDEX_SCAN",
        status="RUNNING",
        progress=50,
        total=100,
    )
    job_repo.create_job(job)

    fetched = job_repo.get_by_id(jid)
    assert fetched is not None
    assert fetched.progress == 50

    job.status = "COMPLETED"
    job.progress = 100
    job.completed = 100
    job_repo.update_job(job)

    updated = job_repo.get_by_id(jid)
    assert updated.status == "COMPLETED"
    assert updated.completed == 100
    db.close()
