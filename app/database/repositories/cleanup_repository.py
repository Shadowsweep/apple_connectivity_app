import uuid
from datetime import datetime
from typing import List, Optional

from app.database.connection import DatabaseConnection
from app.database.models import CleanupHistoryRecord, CleanupItemRecord, utc_now


class CleanupRepository:
    def __init__(self, db: DatabaseConnection):
        self.db = db

    def create_session(self, device_id: str, total_items: int = 0) -> CleanupHistoryRecord:
        now = utc_now()
        session_id = str(uuid.uuid4())
        record = CleanupHistoryRecord(
            id=session_id,
            device_id=device_id,
            started_at=now,
            total_items=total_items,
            status="IN_PROGRESS",
        )
        with self.db.transaction() as conn:
            conn.execute(
                """
                INSERT INTO mobile_cleanup_history (
                    id, device_id, started_at, total_items, status
                ) VALUES (?, ?, ?, ?, ?)
                """,
                (record.id, record.device_id, record.started_at, record.total_items, record.status),
            )
        return record

    def complete_session(
        self,
        session_id: str,
        deleted_items: int,
        failed_items: int,
        bytes_reclaimed: int,
        status: str = "COMPLETED",
    ) -> Optional[CleanupHistoryRecord]:
        now = utc_now()
        with self.db.transaction() as conn:
            conn.execute(
                """
                UPDATE mobile_cleanup_history
                SET completed_at = ?, deleted_items = ?, failed_items = ?,
                    bytes_reclaimed = ?, status = ?
                WHERE id = ?
                """,
                (now, deleted_items, failed_items, bytes_reclaimed, status, session_id),
            )
        return self.get_session_by_id(session_id)

    def log_cleanup_item(
        self,
        session_id: str,
        device_id: str,
        local_media_id: Optional[str],
        device_identifier: str,
        device_filename: str,
        device_size: int,
        verification_status: str,
        cleanup_status: str,
        deleted_at: Optional[datetime] = None,
        error: Optional[str] = None,
    ) -> CleanupItemRecord:
        now = utc_now()
        item_id = str(uuid.uuid4())
        record = CleanupItemRecord(
            id=item_id,
            session_id=session_id,
            device_id=device_id,
            local_media_id=local_media_id,
            device_identifier=device_identifier,
            device_filename=device_filename,
            device_size=device_size,
            verification_status=verification_status,
            cleanup_status=cleanup_status,
            scanned_at=now,
            deleted_at=deleted_at,
            error=error,
        )
        with self.db.transaction() as conn:
            conn.execute(
                """
                INSERT INTO mobile_cleanup_items (
                    id, session_id, device_id, local_media_id, device_identifier,
                    device_filename, device_size, verification_status, cleanup_status,
                    scanned_at, deleted_at, error
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    record.id, record.session_id, record.device_id, record.local_media_id,
                    record.device_identifier, record.device_filename, record.device_size,
                    record.verification_status, record.cleanup_status, record.scanned_at,
                    record.deleted_at, record.error,
                ),
            )
        return record

    def get_session_by_id(self, session_id: str) -> Optional[CleanupHistoryRecord]:
        conn = self.db.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM mobile_cleanup_history WHERE id = ?", (session_id,))
        row = cursor.fetchone()
        return CleanupHistoryRecord(**dict(row)) if row else None

    def list_history(self, limit: int = 50) -> List[CleanupHistoryRecord]:
        conn = self.db.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM mobile_cleanup_history ORDER BY started_at DESC LIMIT ?", (limit,))
        return [CleanupHistoryRecord(**dict(row)) for row in cursor.fetchall()]
