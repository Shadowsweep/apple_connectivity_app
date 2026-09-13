import os
import shutil
import sqlite3
import threading
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Generator, List, Optional, Tuple

from app.database.migrations.runner import MigrationRunner


def _adapt_datetime_iso(val: datetime) -> str:
    return val.isoformat()


def _convert_datetime_iso(val: bytes) -> Optional[datetime]:
    try:
        return datetime.fromisoformat(val.decode("utf-8"))
    except Exception:
        return None


sqlite3.register_adapter(datetime, _adapt_datetime_iso)
sqlite3.register_converter("DATETIME", _convert_datetime_iso)


class DatabaseConnection:
    """Manages thread-safe SQLite connections, WAL mode, foreign keys, and backups."""

    def __init__(self, db_path: Path):
        self.db_path = Path(db_path).resolve()
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._local = threading.local()

    def get_connection(self) -> sqlite3.Connection:
        conn = getattr(self._local, "connection", None)
        if conn is None:
            conn = sqlite3.connect(
                str(self.db_path),
                timeout=15.0,
                check_same_thread=False,
                detect_types=sqlite3.PARSE_DECLTYPES | sqlite3.PARSE_COLNAMES,
            )
            conn.row_factory = sqlite3.Row
            # Enable key SQLite pragmas
            conn.execute("PRAGMA foreign_keys = ON;")
            conn.execute("PRAGMA journal_mode = WAL;")
            conn.execute("PRAGMA synchronous = NORMAL;")
            conn.execute("PRAGMA busy_timeout = 5000;")
            self._local.connection = conn

        return conn

    def initialize(self):
        """Runs pending database schema migrations."""
        conn = self.get_connection()
        runner = MigrationRunner(conn)
        runner.run_migrations()

    @contextmanager
    def transaction(self) -> Generator[sqlite3.Connection, None, None]:
        """Provides an atomic transaction scope with auto-commit and rollback."""
        conn = self.get_connection()
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise

    def backup(self, backup_path: Optional[Path] = None) -> Path:
        """Safely creates a consistent SQLite backup using SQLite's online backup API."""
        if backup_path is None:
            backup_path = self.db_path.with_suffix(".db.bak")
        else:
            backup_path = Path(backup_path).resolve()

        backup_path.parent.mkdir(parents=True, exist_ok=True)

        if not self.db_path.exists():
            return backup_path

        src_conn = self.get_connection()
        dst_conn = sqlite3.connect(str(backup_path))
        try:
            with dst_conn:
                src_conn.backup(dst_conn)
        finally:
            dst_conn.close()

        return backup_path

    def check_integrity(self) -> Tuple[bool, List[str]]:
        """Runs SQLite integrity checks and returns (is_healthy, messages)."""
        if not self.db_path.exists():
            return True, ["Database file does not exist yet."]

        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("PRAGMA quick_check;")
            rows = cursor.fetchall()
            messages = [r[0] for r in rows if r]
            is_healthy = messages == ["ok"]
            if not is_healthy:
                cursor.execute("PRAGMA integrity_check;")
                full_rows = cursor.fetchall()
                messages = [r[0] for r in full_rows if r]
                is_healthy = messages == ["ok"]
            return is_healthy, messages
        except Exception as e:
            return False, [f"Integrity check failed with error: {str(e)}"]

    def restore(self, backup_path: Path) -> bool:
        """Safely restores SQLite database from backup file."""
        backup_path = Path(backup_path).resolve()
        if not backup_path.exists():
            raise FileNotFoundError(f"Backup file not found: {backup_path}")

        self.close()
        # Restore via online backup API from backup into main db
        dst_conn = sqlite3.connect(str(self.db_path))
        src_conn = sqlite3.connect(str(backup_path))
        try:
            with dst_conn:
                src_conn.backup(dst_conn)
            return True
        finally:
            src_conn.close()
            dst_conn.close()

    def close(self):
        conn = getattr(self._local, "connection", None)
        if conn is not None:
            try:
                conn.close()
            except Exception:
                pass
            self._local.connection = None
