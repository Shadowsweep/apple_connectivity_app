import uuid
from typing import List, Optional

from app.database.connection import DatabaseConnection
from app.database.models import DeviceRecord, utc_now


class DeviceRepository:
    def __init__(self, db: DatabaseConnection):
        self.db = db

    def register_device(
        self, name: str, device_type: str = "IPHONE", identifier: Optional[str] = None
    ) -> DeviceRecord:
        conn = self.db.get_connection()
        cursor = conn.cursor()
        now = utc_now()

        if identifier:
            cursor.execute("SELECT * FROM devices WHERE identifier = ?", (identifier,))
            row = cursor.fetchone()
            if row:
                dev = DeviceRecord(**dict(row))
                with self.db.transaction() as tconn:
                    tconn.execute(
                        "UPDATE devices SET name = ?, last_seen_at = ? WHERE id = ?",
                        (name, now, dev.id),
                    )
                dev.name = name
                dev.last_seen_at = now
                return dev

        dev_id = str(uuid.uuid4())
        with self.db.transaction() as tconn:
            tconn.execute(
                "INSERT INTO devices (id, name, device_type, identifier, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?)",
                (dev_id, name, device_type, identifier, now, now),
            )

        return DeviceRecord(
            id=dev_id,
            name=name,
            device_type=device_type,
            identifier=identifier,
            created_at=now,
            last_seen_at=now,
        )

    def get_by_identifier(self, identifier: str) -> Optional[DeviceRecord]:
        conn = self.db.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM devices WHERE identifier = ?", (identifier,))
        row = cursor.fetchone()
        return DeviceRecord(**dict(row)) if row else None

    def get_all(self) -> List[DeviceRecord]:
        conn = self.db.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM devices ORDER BY last_seen_at DESC")
        return [DeviceRecord(**dict(row)) for row in cursor.fetchall()]
