from pathlib import Path
from fastapi.testclient import TestClient

from app.api.main import create_app


def test_api_health_endpoint(tmp_path: Path):
    app = create_app(tmp_path / "lib")
    client = TestClient(app)

    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["app"] == "MEMEASY"
    assert data["version"] == "1.0.0"
    assert data["database_ok"] is True


def test_api_library_info(tmp_path: Path):
    app = create_app(tmp_path / "lib")
    client = TestClient(app)

    response = client.get("/api/library")
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert "total_bytes" in data
    assert "usable_bytes" in data
    assert data["total_media_count"] == 0
