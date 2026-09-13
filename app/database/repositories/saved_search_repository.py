import uuid
from datetime import datetime
from typing import List, Optional

from app.database.connection import DatabaseConnection
from app.database.models import SavedSearchRecord, utc_now


class SavedSearchRepository:
    def __init__(self, db: DatabaseConnection):
        self.db = db

    def create(self, name: str, query_json: str) -> SavedSearchRecord:
        now = utc_now()
        search_id = str(uuid.uuid4())
        record = SavedSearchRecord(
            id=search_id,
            name=name,
            query_json=query_json,
            created_at=now,
            updated_at=now,
        )
        with self.db.transaction() as conn:
            conn.execute(
                """
                INSERT INTO saved_searches (id, name, query_json, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (record.id, record.name, record.query_json, record.created_at, record.updated_at),
            )
        return record

    def list_all(self) -> List[SavedSearchRecord]:
        conn = self.db.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM saved_searches ORDER BY created_at DESC")
        return [SavedSearchRecord(**dict(row)) for row in cursor.fetchall()]

    def get_by_id(self, search_id: str) -> Optional[SavedSearchRecord]:
        conn = self.db.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM saved_searches WHERE id = ?", (search_id,))
        row = cursor.fetchone()
        return SavedSearchRecord(**dict(row)) if row else None

    def update(self, search_id: str, name: Optional[str] = None, query_json: Optional[str] = None) -> Optional[SavedSearchRecord]:
        existing = self.get_by_id(search_id)
        if not existing:
            return None

        now = utc_now()
        new_name = name if name is not None else existing.name
        new_query = query_json if query_json is not None else existing.query_json

        with self.db.transaction() as conn:
            conn.execute(
                """
                UPDATE saved_searches
                SET name = ?, query_json = ?, updated_at = ?
                WHERE id = ?
                """,
                (new_name, new_query, now, search_id),
            )
        return self.get_by_id(search_id)

    def delete(self, search_id: str) -> bool:
        with self.db.transaction() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM saved_searches WHERE id = ?", (search_id,))
            return cursor.rowcount > 0
