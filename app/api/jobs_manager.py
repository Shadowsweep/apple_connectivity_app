import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from typing import Callable, Optional

from app.database.models import JobRecord, utc_now
from app.database.repositories.job_repository import JobRepository


class JobManager:
    """Manages asynchronous background jobs (imports, indexing, rebuilds) backed by SQLite."""

    def __init__(self, job_repo: JobRepository, max_workers: int = 2):
        self.job_repo = job_repo
        self.executor = ThreadPoolExecutor(max_workers=max_workers)

    def submit_job(
        self,
        job_type: str,
        task_fn: Callable[[Callable[[int, int], None]], None],
    ) -> JobRecord:
        job_id = str(uuid.uuid4())
        job = JobRecord(
            id=job_id,
            job_type=job_type,
            status="QUEUED",
            progress=0,
            total=100,
            completed=0,
            failed=0,
            created_at=utc_now(),
        )
        self.job_repo.create_job(job)

        def runner():
            job.status = "RUNNING"
            job.started_at = utc_now()
            self.job_repo.update_job(job)

            def progress_callback(completed: int, total: int):
                job.completed = completed
                job.total = total
                if total > 0:
                    job.progress = min(100, int((completed / total) * 100))
                self.job_repo.update_job(job)

            try:
                task_fn(progress_callback)
                job.status = "COMPLETED"
                job.progress = 100
                job.completed_at = utc_now()
                self.job_repo.update_job(job)
            except Exception as e:
                job.status = "FAILED"
                job.error = str(e)
                job.completed_at = utc_now()
                self.job_repo.update_job(job)

        self.executor.submit(runner)
        return job

    def shutdown(self):
        self.executor.shutdown(wait=False)
