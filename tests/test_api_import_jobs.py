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
