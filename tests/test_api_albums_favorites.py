import uuid
from datetime import datetime
from pathlib import Path
from fastapi.testclient import TestClient

from app.api.dependencies import get_app_context
from app.api.main import create_app
from app.database.models import MediaRecord


def test_api_albums_favorites_and_playback(tmp_path: Path):
    lib_dir = tmp_path / "lib"
    app = create_app(lib_dir)
    client = TestClient(app)
    ctx = get_app_context()
    lib = ctx.library_repo.get_or_create(str(lib_dir))

    media_id = str(uuid.uuid4())
    rec = MediaRecord(
        id=media_id,
        library_id=lib.id,
        filename="IMG_9999.JPG",
        relative_path="Photos/2026/01/IMG_9999.JPG",
        media_type="PHOTO",
        extension=".jpg",
        size_bytes=50000,
        hash_sha256="hash_9999",
        status="ACTIVE",
    )
    ctx.media_repo.insert_or_update(rec)

    # 1. Albums CRUD
    resp_create = client.post(
        "/api/albums",
        json={"name": "Family Trip", "description": "Summer 2026"},
    )
    assert resp_create.status_code == 201
    album_data = resp_create.json()
    album_id = album_data["id"]
    assert album_data["name"] == "Family Trip"

    # Add media to album
    resp_add = client.post(
        f"/api/albums/{album_id}/media",
        json={"media_id": media_id},
    )
    assert resp_add.status_code == 200

    # Get album details
    resp_get = client.get(f"/api/albums/{album_id}")
    assert resp_get.status_code == 200
    assert len(resp_get.json()["items"]) == 1

    # Remove media from album
    resp_rem = client.delete(f"/api/albums/{album_id}/media/{media_id}")
    assert resp_rem.status_code == 200

    # Delete album
    resp_del = client.delete(f"/api/albums/{album_id}")
    assert resp_del.status_code == 200

    # 2. Favorites
    resp_fav = client.post(f"/api/media/{media_id}/favorite")
    assert resp_fav.status_code == 200

    resp_fav_list = client.get("/api/favorites")
    assert resp_fav_list.status_code == 200
    assert len(resp_fav_list.json()) == 1

    resp_unfav = client.delete(f"/api/media/{media_id}/favorite")
    assert resp_unfav.status_code == 200
    assert len(client.get("/api/favorites").json()) == 0

    # 3. Playback / Watch Progress
    resp_put_prog = client.put(
        f"/api/media/{media_id}/progress",
        json={"position_ms": 12000, "duration_ms": 30000, "completed": False},
    )
    assert resp_put_prog.status_code == 200
    assert resp_put_prog.json()["position_ms"] == 12000

    resp_get_prog = client.get(f"/api/media/{media_id}/progress")
    assert resp_get_prog.status_code == 200
    assert resp_get_prog.json()["position_ms"] == 12000

    resp_cont = client.get("/api/playback/continue")
    assert resp_cont.status_code == 200
    assert len(resp_cont.json()) == 1
    assert resp_cont.json()[0]["media"]["id"] == media_id
