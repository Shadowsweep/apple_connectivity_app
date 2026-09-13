import uuid
from pathlib import Path
from fastapi.testclient import TestClient

from app.api.dependencies import get_app_context
from app.api.main import create_app
from app.database.models import MediaRecord


def test_api_video_streaming_and_range_requests(tmp_path: Path):
    lib_dir = tmp_path / "lib"
    app = create_app(lib_dir)
    client = TestClient(app)
    ctx = get_app_context()
    lib = ctx.library_repo.get_or_create(str(lib_dir))

    # Create dummy 1000-byte video file on disk
    video_dir = lib_dir / "Videos" / "2026" / "05"
    video_dir.mkdir(parents=True, exist_ok=True)
    video_file = video_dir / "test_video.mov"
    dummy_bytes = bytes([i % 256 for i in range(1000)])
    video_file.write_bytes(dummy_bytes)

    media_id = str(uuid.uuid4())
    rec = MediaRecord(
        id=media_id,
        library_id=lib.id,
        filename="test_video.mov",
        relative_path="Videos/2026/05/test_video.mov",
        media_type="VIDEO",
        mime_type="video/quicktime",
        extension=".mov",
        size_bytes=1000,
        hash_sha256="test_video_hash",
        status="ACTIVE",
    )
    ctx.media_repo.insert_or_update(rec)

    # 1. Full stream without Range header (200 OK)
    resp_full = client.get(f"/api/media/{media_id}/stream")
    assert resp_full.status_code == 200
    assert resp_full.content == dummy_bytes
    assert resp_full.headers["content-length"] == "1000"
    assert resp_full.headers["accept-ranges"] == "bytes"

    # 2. Range slice: first 100 bytes (0-99)
    resp_slice = client.get(
        f"/api/media/{media_id}/stream", headers={"Range": "bytes=0-99"}
    )
    assert resp_slice.status_code == 206
    assert resp_slice.content == dummy_bytes[:100]
    assert resp_slice.headers["content-length"] == "100"
    assert resp_slice.headers["content-range"] == "bytes 0-99/1000"

    # 3. Range slice from byte 500 to end (500-)
    resp_suffix = client.get(
        f"/api/media/{media_id}/stream", headers={"Range": "bytes=500-"}
    )
    assert resp_suffix.status_code == 206
    assert resp_suffix.content == dummy_bytes[500:]
    assert resp_suffix.headers["content-length"] == "500"
    assert resp_suffix.headers["content-range"] == "bytes 500-999/1000"

    # 4. Out-of-bounds Range -> 416
    resp_oob = client.get(
        f"/api/media/{media_id}/stream", headers={"Range": "bytes=5000-6000"}
    )
    assert resp_oob.status_code == 416


def test_path_traversal_attempt_rejection(tmp_path: Path):
    lib_dir = tmp_path / "lib"
    app = create_app(lib_dir)
    client = TestClient(app)
    ctx = get_app_context()
    lib = ctx.library_repo.get_or_create(str(lib_dir))

    # Malicious record pointing outside library
    malicious_id = str(uuid.uuid4())
    malicious_rec = MediaRecord(
        id=malicious_id,
        library_id=lib.id,
        filename="passwd",
        relative_path="../../etc/passwd",
        media_type="OTHER",
        extension="",
        size_bytes=100,
        hash_sha256="malicious_hash",
        status="ACTIVE",
    )
    ctx.media_repo.insert_or_update(malicious_rec)

    # Attempt to stream malicious path
    resp = client.get(f"/api/media/{malicious_id}/stream")
    assert resp.status_code == 403
