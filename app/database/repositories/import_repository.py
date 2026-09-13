from typing import List, Optional

from app.database.connection import DatabaseConnection
from app.database.models import ImportItemRecord, ImportRecord, utc_now


class ImportRepository:
    def __init__(self, db: DatabaseConnection):
        self.db = db

    def create_import(self, imp: ImportRecord) -> ImportRecord:
        if not imp.started_at:
            imp.started_at = utc_now()

        with self.db.transaction() as tconn:
            tconn.execute(
                """
                INSERT INTO imports (
                    id, library_id, device_id, started_at, completed_at,
                    total_files, successful_files, failed_files, duplicate_files,
                    bytes_imported, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    imp.id, imp.library_id, imp.device_id, imp.started_at,
                    imp.completed_at, imp.total_files, imp.successful_files,
                    imp.failed_files, imp.duplicate_files, imp.bytes_imported,
                    imp.status,
                ),
            )
        return imp

    def update_import(self, imp: ImportRecord) -> ImportRecord:
        with self.db.transaction() as tconn:
            tconn.execute(
                """
                UPDATE imports SET
                    completed_at = ?, total_files = ?, successful_files = ?,
                    failed_files = ?, duplicate_files = ?, bytes_imported = ?, status = ?
                WHERE id = ?
                """,
                (
                    imp.completed_at, imp.total_files, imp.successful_files,
                    imp.failed_files, imp.duplicate_files, imp.bytes_imported,
                    imp.status, imp.id,
                ),
            )
        return imp

    def add_import_item(self, item: ImportItemRecord) -> ImportItemRecord:
        now = utc_now()
        if not item.created_at:
            item.created_at = now
        item.updated_at = now

        with self.db.transaction() as tconn:
            tconn.execute(
                """
                INSERT INTO import_items (
                    id, import_id, media_id, source_path, status, error, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    item.id, item.import_id, item.media_id, item.source_path,
                    item.status, item.error, item.created_at, item.updated_at,
                ),
            )
        return item

    def get_import_by_id(self, import_id: str) -> Optional[ImportRecord]:
        conn = self.db.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM imports WHERE id = ?", (import_id,))
        row = cursor.fetchone()
        return ImportRecord(**dict(row)) if row else None

    def get_recent_imports(self, limit: int = 10) -> List[ImportRecord]:
        conn = self.db.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM imports ORDER BY started_at DESC LIMIT ?", (limit,))
        return [ImportRecord(**dict(row)) for row in cursor.fetchall()]
