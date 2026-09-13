from typing import List, Optional, Tuple

from app.database.connection import DatabaseConnection
from app.database.models import MediaRecord, WatchProgressRecord, utc_now


class WatchRepository:
    def __init__(self, db: DatabaseConnection):
        self.db = db

    def upsert_progress(
        self, media_id: str, position_ms: int, duration_ms: int, completed: bool = False
    ) -> WatchProgressRecord:
        now = utc_now()
        with self.db.transaction() as tconn:
            tconn.execute(
                """
                INSERT INTO watch_progress (media_id, position_ms, duration_ms, completed, updated_at)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(media_id) DO UPDATE SET
                    position_ms = excluded.position_ms,
                    duration_ms = excluded.duration_ms,
                    completed = excluded.completed,
                    updated_at = excluded.updated_at
                """,
                (media_id, position_ms, duration_ms, 1 if completed else 0, now),
            )
        return WatchProgressRecord(
            media_id=media_id,
            position_ms=position_ms,
            duration_ms=duration_ms,
            completed=completed,
            updated_at=now,
        )

    def get_progress(self, media_id: str) -> Optional[WatchProgressRecord]:
        conn = self.db.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM watch_progress WHERE media_id = ?", (media_id,))
        row = cursor.fetchone()
        return WatchProgressRecord(**dict(row)) if row else None

    def get_continue_watching(self, limit: int = 20) -> List[Tuple[MediaRecord, WatchProgressRecord]]:
        conn = self.db.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT m.*, wp.media_id AS wp_media_id, wp.position_ms, wp.duration_ms AS wp_duration_ms,
                   wp.completed, wp.updated_at AS wp_updated_at
            FROM media m
            INNER JOIN watch_progress wp ON m.id = wp.media_id
            WHERE m.status = 'ACTIVE' AND wp.completed = 0 AND wp.position_ms > 0
            ORDER BY wp.updated_at DESC
            LIMIT ?
            """,
            (limit,),
        )
        results = []
        for row in cursor.fetchall():
            row_dict = dict(row)
            m_record = MediaRecord(
                id=row_dict["id"],
                library_id=row_dict["library_id"],
                filename=row_dict["filename"],
                relative_path=row_dict["relative_path"],
                media_type=row_dict["media_type"],
                mime_type=row_dict.get("mime_type"),
                extension=row_dict["extension"],
                size_bytes=row_dict["size_bytes"],
                capture_date=row_dict.get("capture_date"),
                imported_at=row_dict.get("imported_at"),
                width=row_dict.get("width"),
                height=row_dict.get("height"),
                duration_ms=row_dict.get("duration_ms"),
                hash_sha256=row_dict["hash_sha256"],
                thumbnail_path=row_dict.get("thumbnail_path"),
                status=row_dict["status"],
                created_at=row_dict.get("created_at"),
                updated_at=row_dict.get("updated_at"),
            )
            wp_record = WatchProgressRecord(
                media_id=row_dict["wp_media_id"],
                position_ms=row_dict["position_ms"],
                duration_ms=row_dict["wp_duration_ms"],
                completed=bool(row_dict["completed"]),
                updated_at=row_dict["wp_updated_at"],
            )
            results.append((m_record, wp_record))
        return results
