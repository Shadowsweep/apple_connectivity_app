from datetime import datetime
from typing import Optional

from app.database.connection import DatabaseConnection
from app.database.models import JobRecord


class JobRepository:
    def __init__(self, db: DatabaseConnection):
        self.db = db

    def create_job(self, job: JobRecord) -> JobRecord:
        now = datetime.now()
        if not job.created_at:
            job.created_at = now

        with self.db.transaction() as tconn:
            tconn.execute(
                """
                INSERT INTO jobs (
                    id, job_type, status, progress, total, completed, failed,
                    error, created_at, started_at, completed_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    job.id, job.job_type, job.status, job.progress, job.total,
                    job.completed, job.failed, job.error, job.created_at,
                    job.started_at, job.completed_at,
                ),
            )
        return job

    def update_job(self, job: JobRecord) -> JobRecord:
        with self.db.transaction() as tconn:
            tconn.execute(
                """
                UPDATE jobs SET
                    status = ?, progress = ?, total = ?, completed = ?,
                    failed = ?, error = ?, started_at = ?, completed_at = ?
                WHERE id = ?
                """,
                (
                    job.status, job.progress, job.total, job.completed,
                    job.failed, job.error, job.started_at, job.completed_at,
                    job.id,
                ),
            )
        return job

    def get_job_by_id(self, job_id: str) -> Optional[JobRecord]:
        conn = self.db.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM jobs WHERE id = ?", (job_id,))
        row = cursor.fetchone()
        return JobRecord(**dict(row)) if row else None

    # Alias for uniform interface
    get_by_id = get_job_by_id
