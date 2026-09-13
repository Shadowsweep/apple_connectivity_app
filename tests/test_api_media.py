import uuid
from datetime import datetime
from pathlib import Path
from fastapi.testclient import TestClient

from app.api.dependencies import get_app_context
from app.api.main import create_app
from app.database.models import MediaRecord


def test_api_media_listing_filtering_and_pagination(tmp_path: Path):
    lib_dir = tmp_path / "lib"
    app = create_app(lib_dir)
    client = TestClient(app)
    ctx = get_app_context()
    lib = ctx.library_repo.get_or_create(str(lib_dir))

    # Insert sample media records
    records = [
        MediaRecord(
            id=str(uuid.uuid4()),
            library_id=lib.id,
            filename=f"IMG_{i:04d}.JPG",
            relative_path=f"Photos/2026/01/IMG_{i:04d}.JPG",
            media_type="PHOTO",
            extension=".jpg",
            size_bytes=100_000 * i,
            capture_date=datetime(2026, 1, (i % 28) + 1, 10, 0, 0),
            hash_sha256=f"hash_{i}",
            status="ACTIVE",
        )
        for i in range(1, 65)
    ]
    for r in records:
        ctx.media_repo.insert_or_update(r)

    # 1. Default pagination (page 1, limit 50)
    resp = client.get("/api/media")
    assert resp.status_code == 200
    data = resp.json()
    assert data["page"] == 1
    assert data["limit"] == 50
    assert data["count"] == 50
    assert len(data["items"]) == 50

    # 2. Page 2 (remaining 14 items)
    resp_p2 = client.get("/api/media?page=2&limit=50")
    assert resp_p2.status_code == 200
    data_p2 = resp_p2.json()
    assert data_p2["page"] == 2
    assert data_p2["count"] == 14

    # 3. Filter by size
    resp_size = client.get("/api/media?min_size=6000000")  # 6 MB (items 60..64)
    assert resp_size.status_code == 200
    data_size = resp_size.json()
    assert data_size["count"] == 5

    # 4. Search query
    resp_search = client.get("/api/media?search=IMG_0005")
    assert resp_search.status_code == 200
    assert resp_search.json()["count"] == 1

    # 5. Media Detail endpoint
    target_id = records[0].id
    resp_det = client.get(f"/api/media/{target_id}")
    assert resp_det.status_code == 200
    assert resp_det.json()["id"] == target_id

    # 6. Non-existent media detail 404
    resp_404 = client.get("/api/media/non_existent_id")
    assert resp_404.status_code == 404
