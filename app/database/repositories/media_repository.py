import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

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

    def _build_filter_clauses(
        self,
        media_type: Optional[str] = None,
        min_size: Optional[int] = None,
        max_size: Optional[int] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        import_start_date: Optional[datetime] = None,
        import_end_date: Optional[datetime] = None,
        min_duration: Optional[int] = None,
        max_duration: Optional[int] = None,
        min_width: Optional[int] = None,
        max_width: Optional[int] = None,
        min_height: Optional[int] = None,
        max_height: Optional[int] = None,
        extension: Optional[str] = None,
        favorite: Optional[bool] = None,
        album_id: Optional[str] = None,
        search_query: Optional[str] = None,
        status: Optional[str] = "ACTIVE",
    ) -> Tuple[str, List[Any], str]:
        """Constructs WHERE clauses and JOINs for dynamic structured media queries."""
        joins = []
        where_clauses = ["1=1"]
        params = []

        if favorite is True:
            joins.append("INNER JOIN favorites f ON m.id = f.media_id")
        elif favorite is False:
            where_clauses.append("m.id NOT IN (SELECT media_id FROM favorites)")

        if album_id:
            joins.append("INNER JOIN album_items ai ON m.id = ai.media_id")
            where_clauses.append("ai.album_id = ?")
            params.append(album_id)

        if status:
            where_clauses.append("m.status = ?")
            params.append(status)

        if media_type and media_type.upper() != "ALL":
            where_clauses.append("m.media_type = ?")
            params.append(media_type.upper())

        if min_size is not None:
            where_clauses.append("m.size_bytes >= ?")
            params.append(min_size)

        if max_size is not None:
            where_clauses.append("m.size_bytes <= ?")
            params.append(max_size)

        if start_date is not None:
            where_clauses.append("m.capture_date >= ?")
            params.append(start_date)

        if end_date is not None:
            where_clauses.append("m.capture_date <= ?")
            params.append(end_date)

        if import_start_date is not None:
            where_clauses.append("m.imported_at >= ?")
            params.append(import_start_date)

        if import_end_date is not None:
            where_clauses.append("m.imported_at <= ?")
            params.append(import_end_date)

        if min_duration is not None:
            where_clauses.append("m.duration_ms >= ?")
            params.append(min_duration)

        if max_duration is not None:
            where_clauses.append("m.duration_ms <= ?")
            params.append(max_duration)

        if min_width is not None:
            where_clauses.append("m.width >= ?")
            params.append(min_width)

        if max_width is not None:
            where_clauses.append("m.width <= ?")
            params.append(max_width)

        if min_height is not None:
            where_clauses.append("m.height >= ?")
            params.append(min_height)

        if max_height is not None:
            where_clauses.append("m.height <= ?")
            params.append(max_height)

        if extension:
            ext_clean = extension.lstrip(".").lower()
            where_clauses.append("LOWER(m.extension) = ?")
            params.append(ext_clean)

        if search_query:
            where_clauses.append("(m.filename LIKE ? OR m.relative_path LIKE ?)")
            params.extend([f"%{search_query}%", f"%{search_query}%"])

        join_sql = " ".join(joins)
        where_sql = " AND ".join(where_clauses)
        return join_sql, params, where_sql

    def filter_media(
        self,
        media_type: Optional[str] = None,
        min_size: Optional[int] = None,
        max_size: Optional[int] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        import_start_date: Optional[datetime] = None,
        import_end_date: Optional[datetime] = None,
        min_duration: Optional[int] = None,
        max_duration: Optional[int] = None,
        min_width: Optional[int] = None,
        max_width: Optional[int] = None,
        min_height: Optional[int] = None,
        max_height: Optional[int] = None,
        extension: Optional[str] = None,
        favorite: Optional[bool] = None,
        album_id: Optional[str] = None,
        search_query: Optional[str] = None,
        status: Optional[str] = "ACTIVE",
        sort: Optional[str] = "newest",
        limit: int = 100,
        offset: int = 0,
    ) -> List[MediaRecord]:
        join_sql, params, where_sql = self._build_filter_clauses(
            media_type=media_type,
            min_size=min_size,
            max_size=max_size,
            start_date=start_date,
            end_date=end_date,
            import_start_date=import_start_date,
            import_end_date=import_end_date,
            min_duration=min_duration,
            max_duration=max_duration,
            min_width=min_width,
            max_width=max_width,
            min_height=min_height,
            max_height=max_height,
            extension=extension,
            favorite=favorite,
            album_id=album_id,
            search_query=search_query,
            status=status,
        )

        order_sql = "ORDER BY COALESCE(m.capture_date, m.imported_at) DESC"
        if sort == "oldest":
            order_sql = "ORDER BY COALESCE(m.capture_date, m.imported_at) ASC"
        elif sort == "imported_newest":
            order_sql = "ORDER BY m.imported_at DESC"
        elif sort == "imported_oldest":
            order_sql = "ORDER BY m.imported_at ASC"
        elif sort == "size_desc":
            order_sql = "ORDER BY m.size_bytes DESC"
        elif sort == "size_asc":
            order_sql = "ORDER BY m.size_bytes ASC"
        elif sort == "duration_desc":
            order_sql = "ORDER BY COALESCE(m.duration_ms, 0) DESC"
        elif sort == "name_asc":
            order_sql = "ORDER BY m.filename ASC"
        elif sort == "name_desc":
            order_sql = "ORDER BY m.filename DESC"

        query = f"SELECT m.* FROM media m {join_sql} WHERE {where_sql} {order_sql} LIMIT ? OFFSET ?"
        exec_params = list(params) + [limit, offset]

        conn = self.db.get_connection()
        cursor = conn.cursor()
        cursor.execute(query, tuple(exec_params))
        return [MediaRecord(**dict(row)) for row in cursor.fetchall()]

    def count_filtered_media(
        self,
        media_type: Optional[str] = None,
        min_size: Optional[int] = None,
        max_size: Optional[int] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        import_start_date: Optional[datetime] = None,
        import_end_date: Optional[datetime] = None,
        min_duration: Optional[int] = None,
        max_duration: Optional[int] = None,
        min_width: Optional[int] = None,
        max_width: Optional[int] = None,
        min_height: Optional[int] = None,
        max_height: Optional[int] = None,
        extension: Optional[str] = None,
        favorite: Optional[bool] = None,
        album_id: Optional[str] = None,
        search_query: Optional[str] = None,
        status: Optional[str] = "ACTIVE",
    ) -> int:
        join_sql, params, where_sql = self._build_filter_clauses(
            media_type=media_type,
            min_size=min_size,
            max_size=max_size,
            start_date=start_date,
            end_date=end_date,
            import_start_date=import_start_date,
            import_end_date=import_end_date,
            min_duration=min_duration,
            max_duration=max_duration,
            min_width=min_width,
            max_width=max_width,
            min_height=min_height,
            max_height=max_height,
            extension=extension,
            favorite=favorite,
            album_id=album_id,
            search_query=search_query,
            status=status,
        )

        query = f"SELECT COUNT(m.id) FROM media m {join_sql} WHERE {where_sql}"
        conn = self.db.get_connection()
        cursor = conn.cursor()
        cursor.execute(query, tuple(params))
        row = cursor.fetchone()
        return row[0] if row else 0

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

    def get_storage_analytics(self, library_root: Optional[Path] = None) -> Dict[str, Any]:
        """Calculates fast offline aggregated storage metrics from SQLite."""
        conn = self.db.get_connection()
        cursor = conn.cursor()

        # Overall summary
        cursor.execute(
            """
            SELECT
                COUNT(*) as total_count,
                COALESCE(SUM(size_bytes), 0) as total_bytes,
                COALESCE(AVG(size_bytes), 0) as avg_bytes
            FROM media WHERE status = 'ACTIVE'
            """
        )
        total_row = cursor.fetchone()
        total_count = total_row["total_count"] if total_row else 0
        total_bytes = total_row["total_bytes"] if total_row else 0
        avg_bytes = total_row["avg_bytes"] if total_row else 0

        # Photo summary
        cursor.execute(
            """
            SELECT COUNT(*) as count, COALESCE(SUM(size_bytes), 0) as bytes
            FROM media
            WHERE status = 'ACTIVE' AND media_type IN ('PHOTO', 'SCREENSHOT', 'LIVE_PHOTO')
            """
        )
        photo_row = cursor.fetchone()
        photo_count = photo_row["count"] if photo_row else 0
        photo_bytes = photo_row["bytes"] if photo_row else 0

        # Video summary
        cursor.execute(
            """
            SELECT COUNT(*) as count, COALESCE(SUM(size_bytes), 0) as bytes
            FROM media
            WHERE status = 'ACTIVE' AND media_type = 'VIDEO'
            """
        )
        video_row = cursor.fetchone()
        video_count = video_row["count"] if video_row else 0
        video_bytes = video_row["bytes"] if video_row else 0

        # Other summary
        other_count = max(0, total_count - photo_count - video_count)
        other_bytes = max(0, total_bytes - photo_bytes - video_bytes)

        # Thumbnail cache disk bytes
        thumbnail_bytes = 0
        if library_root:
            thumb_dir = library_root / ".memeasy" / "thumbnails"
            if thumb_dir.exists():
                for p in thumb_dir.rglob("*"):
                    if p.is_file():
                        try:
                            thumbnail_bytes += p.stat().st_size
                        except OSError:
                            pass

        # Breakdown by extension
        cursor.execute(
            """
            SELECT LOWER(extension) as ext, COUNT(*) as count, SUM(size_bytes) as total_size
            FROM media
            WHERE status = 'ACTIVE'
            GROUP BY ext
            ORDER BY total_size DESC
            LIMIT 15
            """
        )
        by_extension = [
            {"extension": row["ext"], "count": row["count"], "size_bytes": row["total_size"]}
            for row in cursor.fetchall()
        ]

        # Breakdown by year
        cursor.execute(
            """
            SELECT
                COALESCE(strftime('%Y', capture_date), strftime('%Y', imported_at), 'Unknown') as yr,
                COUNT(*) as count,
                SUM(size_bytes) as total_size
            FROM media
            WHERE status = 'ACTIVE'
            GROUP BY yr
            ORDER BY yr DESC
            """
        )
        by_year = [
            {"year": row["yr"], "count": row["count"], "size_bytes": row["total_size"]}
            for row in cursor.fetchall()
        ]

        # Breakdown by size ranges: <10MB, 10-100MB, 100MB-1GB, >1GB
        ranges = [
            ("< 10 MB", 0, 10 * 1024 * 1024),
            ("10 MB – 100 MB", 10 * 1024 * 1024, 100 * 1024 * 1024),
            ("100 MB – 1 GB", 100 * 1024 * 1024, 1024 * 1024 * 1024),
            ("> 1 GB", 1024 * 1024 * 1024, 1024 * 1024 * 1024 * 1024),
        ]
        by_size_range = []
        for label, min_b, max_b in ranges:
            cursor.execute(
                """
                SELECT COUNT(*) as count, COALESCE(SUM(size_bytes), 0) as total_size
                FROM media
                WHERE status = 'ACTIVE' AND size_bytes >= ? AND size_bytes < ?
                """,
                (min_b, max_b),
            )
            r = cursor.fetchone()
            by_size_range.append({
                "label": label,
                "count": r["count"] if r else 0,
                "size_bytes": r["total_size"] if r else 0,
            })

        # Top 20 Largest files
        cursor.execute(
            """
            SELECT * FROM media
            WHERE status = 'ACTIVE'
            ORDER BY size_bytes DESC
            LIMIT 20
            """
        )
        largest_files = [MediaRecord(**dict(row)) for row in cursor.fetchall()]

        return {
            "total_media_count": total_count,
            "total_media_bytes": total_bytes,
            "avg_file_size_bytes": int(avg_bytes),
            "photo_count": photo_count,
            "photo_bytes": photo_bytes,
            "video_count": video_count,
            "video_bytes": video_bytes,
            "other_count": other_count,
            "other_bytes": other_bytes,
            "thumbnail_bytes": thumbnail_bytes,
            "by_extension": by_extension,
            "by_year": by_year,
            "by_size_range": by_size_range,
            "largest_files": largest_files,
        }

    def get_timeline_years(self) -> List[Dict[str, Any]]:
        """Returns list of years with media count."""
        conn = self.db.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT
                COALESCE(strftime('%Y', capture_date), strftime('%Y', imported_at), 'Unknown') as yr,
                COUNT(*) as count
            FROM media
            WHERE status = 'ACTIVE'
            GROUP BY yr
            ORDER BY yr DESC
            """
        )
        return [{"year": row["yr"], "count": row["count"]} for row in cursor.fetchall()]

    def get_timeline_months(self, year: str) -> List[Dict[str, Any]]:
        """Returns list of months with media count for a given year."""
        conn = self.db.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT
                COALESCE(strftime('%m', capture_date), strftime('%m', imported_at), '00') as mo,
                COUNT(*) as count
            FROM media
            WHERE status = 'ACTIVE' AND (
                strftime('%Y', capture_date) = ? OR
                (capture_date IS NULL AND strftime('%Y', imported_at) = ?)
            )
            GROUP BY mo
            ORDER BY mo DESC
            """,
            (year, year),
        )
        return [{"month": row["mo"], "count": row["count"]} for row in cursor.fetchall()]

    def get_timeline_media(self, year: str, month: Optional[str] = None, limit: int = 100, offset: int = 0) -> List[MediaRecord]:
        """Returns media records filtered by year and month."""
        conn = self.db.get_connection()
        cursor = conn.cursor()

        if month:
            cursor.execute(
                """
                SELECT * FROM media
                WHERE status = 'ACTIVE' AND (
                    (strftime('%Y', capture_date) = ? AND strftime('%m', capture_date) = ?) OR
                    (capture_date IS NULL AND strftime('%Y', imported_at) = ? AND strftime('%m', imported_at) = ?)
                )
                ORDER BY COALESCE(capture_date, imported_at) DESC
                LIMIT ? OFFSET ?
                """,
                (year, month, year, month, limit, offset),
            )
        else:
            cursor.execute(
                """
                SELECT * FROM media
                WHERE status = 'ACTIVE' AND (
                    strftime('%Y', capture_date) = ? OR
                    (capture_date IS NULL AND strftime('%Y', imported_at) = ?)
                )
                ORDER BY COALESCE(capture_date, imported_at) DESC
                LIMIT ? OFFSET ?
                """,
                (year, year, limit, offset),
            )
        return [MediaRecord(**dict(row)) for row in cursor.fetchall()]

    def get_duplicate_groups(self) -> List[Dict[str, Any]]:
        """Identifies duplicate groups by matching cryptographic hash."""
        conn = self.db.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT hash_sha256, COUNT(*) as cnt, SUM(size_bytes) as total_bytes
            FROM media
            WHERE status = 'ACTIVE' AND hash_sha256 IS NOT NULL AND hash_sha256 != ''
            GROUP BY hash_sha256
            HAVING cnt > 1
            ORDER BY total_bytes DESC
            """
        )
        duplicate_hashes = cursor.fetchall()
        groups = []
        for row in duplicate_hashes:
            h = row["hash_sha256"]
            cursor.execute("SELECT * FROM media WHERE hash_sha256 = ? AND status = 'ACTIVE' ORDER BY created_at ASC", (h,))
            items = [MediaRecord(**dict(r)) for r in cursor.fetchall()]
            if len(items) > 1:
                groups.append({
                    "hash_sha256": h,
                    "count": len(items),
                    "size_bytes": items[0].size_bytes,
                    "items": items,
                })
        return groups

    def scan_library_health(self, library_root: Path) -> Dict[str, Any]:
        """Scans disk integrity to discover missing DB records and unindexed filesystem files."""
        conn = self.db.get_connection()
        cursor = conn.cursor()

        # 1. Check missing files
        cursor.execute("SELECT * FROM media WHERE status = 'ACTIVE'")
        active_media = [MediaRecord(**dict(r)) for r in cursor.fetchall()]
        missing_records = []
        for m in active_media:
            fpath = library_root / m.relative_path
            if not fpath.exists():
                self.mark_status(m.id, "MISSING")
                m.status = "MISSING"
                missing_records.append(m)

        # 2. Check unindexed files on disk
        cursor.execute("SELECT relative_path FROM media WHERE status != 'TRASHED'")
        known_rel_paths = {row[0].replace("/", os.sep).replace("\\", os.sep) for row in cursor.fetchall()}

        unindexed_files = []
        target_dirs = ["Photos", "Videos", "Screenshots", "LivePhotos"]
        for tdir in target_dirs:
            pdir = library_root / tdir
            if not pdir.exists():
                continue
            for p in pdir.rglob("*"):
                if p.is_file() and not p.name.startswith("."):
                    rel = str(p.relative_to(library_root)).replace("/", os.sep).replace("\\", os.sep)
                    if rel not in known_rel_paths:
                        try:
                            sz = p.stat().st_size
                            unindexed_files.append({
                                "relative_path": str(p.relative_to(library_root)).replace("\\", "/"),
                                "filename": p.name,
                                "size_bytes": sz,
                            })
                        except OSError:
                            continue

        return {
            "total_active": len(active_media) - len(missing_records),
            "missing_count": len(missing_records),
            "missing_items": missing_records,
            "unindexed_count": len(unindexed_files),
            "unindexed_items": unindexed_files,
            "is_healthy": len(missing_records) == 0,
        }
