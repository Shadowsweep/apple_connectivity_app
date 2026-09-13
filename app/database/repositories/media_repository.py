from datetime import datetime
from typing import List, Optional, Set

from app.database.connection import DatabaseConnection
from app.database.models import MediaRecord, utc_now


class MediaRepository:
    def __init__(self, db: DatabaseConnection):
        self.db = db

    def insert_or_update(self, media: MediaRecord) -> MediaRecord:
        now = utc_now()
        if not media.created_at:
            media.created_at = now
        media.updated_at = now

        conn = self.db.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM media WHERE id = ?", (media.id,))
        exists = cursor.fetchone()

        with self.db.transaction() as tconn:
            if exists:
                tconn.execute(
                    """
                    UPDATE media SET
                        library_id = ?, filename = ?, relative_path = ?, media_type = ?,
                        mime_type = ?, extension = ?, size_bytes = ?, capture_date = ?,
                        imported_at = ?, width = ?, height = ?, duration_ms = ?,
                        hash_sha256 = ?, thumbnail_path = ?, status = ?, updated_at = ?
                    WHERE id = ?
                    """,
                    (
                        media.library_id, media.filename, media.relative_path, media.media_type,
                        media.mime_type, media.extension, media.size_bytes, media.capture_date,
                        media.imported_at, media.width, media.height, media.duration_ms,
                        media.hash_sha256, media.thumbnail_path, media.status, media.updated_at,
                        media.id,
                    ),
                )
            else:
                tconn.execute(
                    """
                    INSERT INTO media (
                        id, library_id, filename, relative_path, media_type, mime_type,
                        extension, size_bytes, capture_date, imported_at, width, height,
                        duration_ms, hash_sha256, thumbnail_path, status, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        media.id, media.library_id, media.filename, media.relative_path,
                        media.media_type, media.mime_type, media.extension, media.size_bytes,
                        media.capture_date, media.imported_at, media.width, media.height,
                        media.duration_ms, media.hash_sha256, media.thumbnail_path,
                        media.status, media.created_at, media.updated_at,
                    ),
                )

        return media

    def get_by_id(self, media_id: str) -> Optional[MediaRecord]:
        conn = self.db.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM media WHERE id = ?", (media_id,))
        row = cursor.fetchone()
        return MediaRecord(**dict(row)) if row else None

    def get_by_relative_path(self, relative_path: str) -> Optional[MediaRecord]:
        conn = self.db.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM media WHERE relative_path = ?", (relative_path,))
        row = cursor.fetchone()
        return MediaRecord(**dict(row)) if row else None

    def get_by_hash(self, hash_sha256: str) -> List[MediaRecord]:
        conn = self.db.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM media WHERE hash_sha256 = ?", (hash_sha256,))
        return [MediaRecord(**dict(row)) for row in cursor.fetchall()]

    def get_by_size(self, size_bytes: int) -> List[MediaRecord]:
        conn = self.db.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM media WHERE size_bytes = ?", (size_bytes,))
        return [MediaRecord(**dict(row)) for row in cursor.fetchall()]

    def filter_media(
        self,
        media_type: Optional[str] = None,
        min_size: Optional[int] = None,
        max_size: Optional[int] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        search_query: Optional[str] = None,
        status: str = "ACTIVE",
        limit: int = 100,
        offset: int = 0,
    ) -> List[MediaRecord]:
        query = "SELECT * FROM media WHERE 1=1"
        params = []

        if status:
            query += " AND status = ?"
            params.append(status)

        if media_type:
            query += " AND media_type = ?"
            params.append(media_type.upper())

        if min_size is not None:
            query += " AND size_bytes >= ?"
            params.append(min_size)

        if max_size is not None:
            query += " AND size_bytes <= ?"
            params.append(max_size)

        if start_date is not None:
            query += " AND capture_date >= ?"
            params.append(start_date)

        if end_date is not None:
            query += " AND capture_date <= ?"
            params.append(end_date)

        if search_query:
            query += " AND (filename LIKE ? OR relative_path LIKE ?)"
            params.extend([f"%{search_query}%", f"%{search_query}%"])

        query += " ORDER BY COALESCE(capture_date, created_at) DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        conn = self.db.get_connection()
        cursor = conn.cursor()
        cursor.execute(query, tuple(params))
        return [MediaRecord(**dict(row)) for row in cursor.fetchall()]

    def get_recent_media(self, limit: int = 50) -> List[MediaRecord]:
        return self.filter_media(limit=limit)

    def get_photos(self, limit: int = 100) -> List[MediaRecord]:
        return self.filter_media(media_type="PHOTO", limit=limit)

    def get_videos(self, limit: int = 100) -> List[MediaRecord]:
        return self.filter_media(media_type="VIDEO", limit=limit)

    def get_all_active_relative_paths(self) -> Set[str]:
        conn = self.db.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT relative_path FROM media WHERE status = 'ACTIVE'")
        return {row[0] for row in cursor.fetchall()}

    def mark_status(self, media_id: str, status: str):
        with self.db.transaction() as tconn:
            tconn.execute(
                "UPDATE media SET status = ?, updated_at = ? WHERE id = ?",
                (status, utc_now(), media_id),
            )

    def count_all(self, status: str = "ACTIVE") -> int:
        conn = self.db.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM media WHERE status = ?", (status,))
        row = cursor.fetchone()
        return row[0] if row else 0
