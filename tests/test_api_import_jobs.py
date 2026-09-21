import time
from pathlib import Path
from fastapi.testclient import TestClient

from app.api.main import create_app


def test_api_import_preview_and_start_job(tmp_path: Path, mock_iphone_dir: Path):
    lib_dir = tmp_path / "lib"
    app = create_app(lib_dir, safety_reserve_bytes=1024)
    client = TestClient(app)

    # 1. Preview
    resp_prev = client.post(
        "/api/import/preview",
        json={"source_path": str(mock_iphone_dir)},
    )
    assert resp_prev.status_code == 200
    prev_data = resp_prev.json()
    assert prev_data["total_candidates"] > 0
    assert prev_data["can_fit"] is True

    # 2. Start import job
    resp_start = client.post(
        "/api/import/start",
        json={"source_path": str(mock_iphone_dir)},
    )
    assert resp_start.status_code == 200
    job_info = resp_start.json()
    assert "job_id" in job_info
    job_id = job_info["job_id"]

    # 3. Poll job status
    max_wait = 10
    start_time = time.time()
    completed = False
    while time.time() - start_time < max_wait:
        resp_job = client.get(f"/api/jobs/{job_id}")
        assert resp_job.status_code == 200
        job_data = resp_job.json()
        if job_data["status"] == "COMPLETED":
            completed = True
            break
        time.sleep(0.1)

    assert completed is True


def test_api_library_index_jobs(tmp_path: Path):
    lib_dir = tmp_path / "lib"
    app = create_app(lib_dir)
    client = TestClient(app)

    # Trigger index job
    resp_idx = client.post("/api/library/index")
    assert resp_idx.status_code == 200
    job_id = resp_idx.json()["job_id"]

    # Trigger rebuild job
    resp_reb = client.post("/api/library/rebuild-index")
    assert resp_reb.status_code == 200
    job_id2 = resp_reb.json()["job_id"]

    time.sleep(0.3)
    resp_status = client.get(f"/api/jobs/{job_id}")
    assert resp_status.status_code == 200
    assert resp_status.json()["status"] in ("RUNNING", "COMPLETED")


def test_selective_import_into_vault_folder_and_group(tmp_path: Path, mock_iphone_dir: Path):
    lib_dir = tmp_path / "lib"
    target_dir = lib_dir / "Trips"
    target_dir.mkdir(parents=True)
    app = create_app(lib_dir, safety_reserve_bytes=1024)
    client = TestClient(app)

    preview = client.post(
        "/api/import/preview", json={"source_path": str(mock_iphone_dir)}
    )
    assert preview.status_code == 200
    items = preview.json()["items"]
    assert items and all("month_key" in item for item in items)

    selected_id = items[0]["id"]
    started = client.post(
        "/api/import/start",
        json={
            "source_path": str(mock_iphone_dir),
            "selected_ids": [selected_id],
            "target_folder": "Trips",
            "group_name": "September Picks",
        },
    )
    assert started.status_code == 200
    job_id = started.json()["job_id"]

    deadline = time.time() + 10
    while time.time() < deadline:
        job = client.get(f"/api/jobs/{job_id}").json()
        if job["status"] in ("COMPLETED", "FAILED"):
            break
        time.sleep(0.05)
    assert job["status"] == "COMPLETED", job.get("error")

    media = client.get("/api/media").json()["items"]
    assert len(media) == 1
    assert media[0]["relative_path"].startswith("Trips/")

    albums = client.get("/api/albums").json()
    album = next(item for item in albums if item["name"] == "September Picks")
    album_detail = client.get(f"/api/albums/{album['id']}").json()
    assert [item["id"] for item in album_detail["items"]] == [media[0]["id"]]


def test_import_rejects_target_outside_vault(tmp_path: Path, mock_iphone_dir: Path):
    app = create_app(tmp_path / "lib", safety_reserve_bytes=1024)
    client = TestClient(app)
    response = client.post(
        "/api/import/start",
        json={"source_path": str(mock_iphone_dir), "target_folder": "../escape"},
    )
    assert response.status_code == 400


def test_background_scan_job_reused_generation(tmp_path: Path, mock_iphone_dir: Path):
    # ponytail: Phase 2 — scan runs in background, summary reuses the same generation
    app = create_app(tmp_path / "lib", safety_reserve_bytes=1024)
    client = TestClient(app)

    started = client.post("/api/import/scan", json={"refresh": True, "source_path": str(mock_iphone_dir)})
    assert started.status_code == 200
    assert started.json()["status"] == "SCANNING"
    job_id = started.json()["job_id"]
    assert job_id

    deadline = time.time() + 15
    state = {}
    while time.time() < deadline:
        state = client.get("/api/import/scan-status").json()
        if state["state"] in ("COMPLETED", "FAILED", "CANCELLED"):
            break
        time.sleep(0.1)
    assert state["state"] == "COMPLETED", state
    assert state["items_discovered"] > 0
    assert state["months"]
    assert state["scan_id"]
    assert state["scan_generation"] == 1

    summary = client.get("/api/import/device-summary").json()
    assert summary["scan_id"] == state["scan_id"]
    assert summary["scan_generation"] == 1
    assert summary["total_count"] == state["items_discovered"]

    # Second call without refresh reuses the cached generation — no rescan.
    reused = client.post("/api/import/scan", json={"refresh": False, "source_path": str(mock_iphone_dir)})
    assert reused.json()["reused_cache"] is True
    assert reused.json()["status"] == "COMPLETED"


def test_job_cancel_endpoint(tmp_path: Path, mock_iphone_dir: Path):
    app = create_app(tmp_path / "lib", safety_reserve_bytes=1024)
    client = TestClient(app)

    assert client.post("/api/jobs/does-not-exist/cancel").status_code == 404

    started = client.post("/api/import/scan", json={"refresh": True, "source_path": str(mock_iphone_dir)}).json()
    deadline = time.time() + 15
    while time.time() < deadline:
        if client.get("/api/import/scan-status").json()["state"] == "COMPLETED":
            break
        time.sleep(0.1)
    resp = client.post(f"/api/jobs/{started['job_id']}/cancel")
    assert resp.status_code == 200
    assert resp.json()["id"] == started["job_id"]
