import uuid
from pathlib import Path
from fastapi.testclient import TestClient
from PIL import Image

from app.api.dependencies import get_app_context
from app.api.main import create_app
from app.database.models import MediaRecord


def test_api_thumbnail_generation_and_caching(tmp_path: Path):
    lib_dir = tmp_path / "lib"
    app = create_app(lib_dir)
    client = TestClient(app)
    ctx = get_app_context()
    lib = ctx.library_repo.get_or_create(str(lib_dir))

    # Create real test image on disk
    photo_dir = lib_dir / "Photos" / "2026" / "02"
    photo_dir.mkdir(parents=True, exist_ok=True)
    photo_file = photo_dir / "sample.jpg"

    img = Image.new("RGB", (1920, 1080), color=(100, 150, 200))
    img.save(photo_file, "JPEG")

    media_id = str(uuid.uuid4())
    rec = MediaRecord(
        id=media_id,
        library_id=lib.id,
        filename="sample.jpg",
        relative_path="Photos/2026/02/sample.jpg",
        media_type="PHOTO",
        mime_type="image/jpeg",
        extension=".jpg",
        size_bytes=photo_file.stat().st_size,
        hash_sha256="sample_hash",
        status="ACTIVE",
    )
    ctx.media_repo.insert_or_update(rec)

    # 1. Fetch thumbnail (should generate and return 200 image/jpeg)
    resp = client.get(f"/api/media/{media_id}/thumbnail")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "image/jpeg"

    # 2. Check disk cache exists
    cached_thumb = lib_dir / ".memeasy" / "thumbnails" / f"{media_id}.jpg"
    assert cached_thumb.exists()

    # 3. Second fetch (serves from cache)
    resp_cached = client.get(f"/api/media/{media_id}/thumbnail")
    assert resp_cached.status_code == 200
    assert len(resp_cached.content) == cached_thumb.stat().st_size
