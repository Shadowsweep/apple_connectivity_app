import sqlite3
from pathlib import Path
from typing import List


class MigrationRunner:
    """Manages SQLite schema versioning and sequential migration execution."""

    def __init__(self, conn: sqlite3.Connection):
        self.conn = conn
        self.migrations_dir = Path(__file__).parent

    def get_applied_versions(self) -> List[int]:
        cursor = self.conn.cursor()
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'"
        )
        if not cursor.fetchone():
            return []

        cursor.execute("SELECT version FROM schema_migrations ORDER BY version ASC")
        return [row[0] for row in cursor.fetchall()]

    def run_migrations(self):
        applied = set(self.get_applied_versions())

        # Collect .sql migration files
        sql_files = sorted(self.migrations_dir.glob("*.sql"))

        for sql_file in sql_files:
            try:
                ver_num = int(sql_file.name.split("_")[0])
            except ValueError:
                continue

            if ver_num not in applied:
                sql_content = sql_file.read_text(encoding="utf-8")
                cursor = self.conn.cursor()
                cursor.executescript(sql_content)
                cursor.execute(
                    "INSERT INTO schema_migrations (version) VALUES (?)",
                    (ver_num,),
                )
                self.conn.commit()
