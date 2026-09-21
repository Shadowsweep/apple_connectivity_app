import uuid
from typing import List, Optional

from app.database.connection import DatabaseConnection
from app.database.models import AlbumRecord, MediaRecord, utc_now


class AlbumRepository:
    def __init__(self, db: DatabaseConnection):
        self.db = db

    def create_album(
        self, library_id: str, name: str, description: Optional[str] = None
    ) -> AlbumRecord:
        album_id = str(uuid.uuid4())
        now = utc_now()
        with self.db.transaction() as tconn:
            tconn.execute(
                """
                INSERT INTO albums (id, library_id, name, description, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (album_id, library_id, name, description, now, now),
            )
        return AlbumRecord(
            id=album_id,
            library_id=library_id,
            name=name,
            description=description,
            created_at=now,
            updated_at=now,
        )

    def get_album_by_id(self, album_id: str) -> Optional[AlbumRecord]:
        conn = self.db.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM albums WHERE id = ?", (album_id,))
        row = cursor.fetchone()
        return AlbumRecord(**dict(row)) if row else None

    def get_album_by_name(
        self, library_id: str, name: str
    ) -> Optional[AlbumRecord]:
        conn = self.db.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM albums WHERE library_id = ? AND name = ? COLLATE NOCASE LIMIT 1",
            (library_id, name.strip()),
        )
        row = cursor.fetchone()
        return AlbumRecord(**dict(row)) if row else None

    def list_albums(self, library_id: Optional[str] = None) -> List[AlbumRecord]:
        conn = self.db.get_connection()
        cursor = conn.cursor()
        if library_id:
            cursor.execute("SELECT * FROM albums WHERE library_id = ? ORDER BY name ASC", (library_id,))
        else:
            cursor.execute("SELECT * FROM albums ORDER BY name ASC")
        return [AlbumRecord(**dict(row)) for row in cursor.fetchall()]

    def add_media_to_album(self, album_id: str, media_id: str):
        now = utc_now()
        with self.db.transaction() as tconn:
            tconn.execute(
                """
                INSERT OR IGNORE INTO album_items (album_id, media_id, created_at)
                VALUES (?, ?, ?)
                """,
                (album_id, media_id, now),
            )

    def remove_media_from_album(self, album_id: str, media_id: str):
        with self.db.transaction() as tconn:
            tconn.execute(
                "DELETE FROM album_items WHERE album_id = ? AND media_id = ?",
                (album_id, media_id),
            )

    def get_album_media(self, album_id: str) -> List[MediaRecord]:
        conn = self.db.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT m.* FROM media m
            INNER JOIN album_items ai ON m.id = ai.media_id
            WHERE ai.album_id = ? AND m.status = 'ACTIVE'
            ORDER BY COALESCE(m.capture_date, m.created_at) DESC
            """,
            (album_id,),
        )
        return [MediaRecord(**dict(row)) for row in cursor.fetchall()]

    def delete_album(self, album_id: str):
        with self.db.transaction() as tconn:
            tconn.execute("DELETE FROM albums WHERE id = ?", (album_id,))
