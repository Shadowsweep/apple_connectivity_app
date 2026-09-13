from typing import List

from app.database.connection import DatabaseConnection
from app.database.models import FavoriteRecord, MediaRecord, utc_now


class FavoriteRepository:
    def __init__(self, db: DatabaseConnection):
        self.db = db

    def add_favorite(self, media_id: str) -> FavoriteRecord:
        now = utc_now()
        with self.db.transaction() as tconn:
            tconn.execute(
                "INSERT OR IGNORE INTO favorites (media_id, created_at) VALUES (?, ?)",
                (media_id, now),
            )
        return FavoriteRecord(media_id=media_id, created_at=now)

    def remove_favorite(self, media_id: str):
        with self.db.transaction() as tconn:
            tconn.execute("DELETE FROM favorites WHERE media_id = ?", (media_id,))

    def is_favorite(self, media_id: str) -> bool:
        conn = self.db.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1 FROM favorites WHERE media_id = ?", (media_id,))
        return cursor.fetchone() is not None

    def get_favorites(self, limit: int = 100) -> List[MediaRecord]:
        conn = self.db.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT m.* FROM media m
            INNER JOIN favorites f ON m.id = f.media_id
            WHERE m.status = 'ACTIVE'
            ORDER BY f.created_at DESC
            LIMIT ?
            """,
            (limit,),
        )
        return [MediaRecord(**dict(row)) for row in cursor.fetchall()]
