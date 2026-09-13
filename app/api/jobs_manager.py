import uuid
import threading
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from typing import Callable, Optional, Set

from app.database.models import JobRecord, utc_now
from app.database.repositories.job_repository import JobRepository


class JobManager:
    """Manages asynchronous background jobs (imports, indexing, rebuilds) backed by SQLite."""

    def __init__(self, job_repo: JobRepository, max_workers: int = 4):
        self.job_repo = job_repo
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        self._cancelled_jobs: Set[str] = set()
        self._lock = threading.Lock()

    def recover_stale_jobs(self) -> int:
        """
        Marks any dangling jobs with status 'RUNNING' or 'QUEUED' as 'INTERRUPTED'
        upon server startup.
        """
        recovered = 0
        try:
            active_jobs = self.job_repo.list_active_jobs()
            for job in active_jobs:
                job.status = "INTERRUPTED"
                job.error = "Operation was interrupted by application shutdown"
                job.completed_at = utc_now()
                self.job_repo.update_job(job)
                recovered += 1
        except Exception:
            pass
        return recovered

    def cancel_job(self, job_id: str) -> bool:
        """Flags a job for cooperative cancellation."""
        with self._lock:
            self._cancelled_jobs.add(job_id)
        job = self.job_repo.get_job(job_id)
        if job and job.status in ("QUEUED", "RUNNING"):
            job.status = "CANCELLED"
            job.completed_at = utc_now()
            self.job_repo.update_job(job)
            return True
        return False

    def is_cancelled(self, job_id: str) -> bool:
        with self._lock:
            return job_id in self._cancelled_jobs

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
            if self.is_cancelled(job_id):
                job.status = "CANCELLED"
                job.completed_at = utc_now()
                self.job_repo.update_job(job)
                return

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
                if not self.is_cancelled(job_id):
                    job.status = "COMPLETED"
                    job.progress = 100
                    job.completed_at = utc_now()
                    self.job_repo.update_job(job)
            except Exception as e:
                job.status = "FAILED"
                job.error = str(e)
                job.completed_at = utc_now()
                self.job_repo.update_job(job)
            finally:
                with self._lock:
                    self._cancelled_jobs.discard(job_id)

        self.executor.submit(runner)
        return job

    def shutdown(self):
        self.executor.shutdown(wait=False)
