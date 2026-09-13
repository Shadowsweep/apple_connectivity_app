import uuid
from typing import Optional

from app.database.connection import DatabaseConnection
from app.database.models import LibraryRecord, utc_now


class LibraryRepository:
    def __init__(self, db: DatabaseConnection):
        self.db = db

    def get_or_create(self, root_path: str, name: str = "MEMEASY Library") -> LibraryRecord:
        conn = self.db.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM libraries WHERE root_path = ?", (root_path,))
        row = cursor.fetchone()
        if row:
            return LibraryRecord(**dict(row))

        lib_id = str(uuid.uuid4())
        now = utc_now()
        with self.db.transaction() as tconn:
            tconn.execute(
                "INSERT INTO libraries (id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
                (lib_id, name, root_path, now, now),
            )

        return LibraryRecord(
            id=lib_id,
            name=name,
            root_path=root_path,
            created_at=now,
            updated_at=now,
        )

    def get_by_id(self, library_id: str) -> Optional[LibraryRecord]:
        conn = self.db.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM libraries WHERE id = ?", (library_id,))
        row = cursor.fetchone()
        return LibraryRecord(**dict(row)) if row else None

    def get_by_path(self, root_path: str) -> Optional[LibraryRecord]:
        conn = self.db.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM libraries WHERE root_path = ?", (root_path,))
        row = cursor.fetchone()
        return LibraryRecord(**dict(row)) if row else None
