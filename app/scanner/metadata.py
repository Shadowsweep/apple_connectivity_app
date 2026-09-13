import os
import re
import struct
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import BinaryIO, Optional, Tuple
from PIL import Image, ExifTags
from pydantic import BaseModel, ConfigDict

from app.device.iphone import DeviceMediaEntry


class MediaType(str, Enum):
    PHOTO = "PHOTO"
    VIDEO = "VIDEO"
    SCREENSHOT = "SCREENSHOT"
    LIVE_PHOTO = "LIVE_PHOTO"
    OTHER = "OTHER"


class MediaItem(BaseModel):
    """Normalized media metadata representation."""
    model_config = ConfigDict(arbitrary_types_allowed=True)

    filename: str
    extension: str
    media_type: MediaType
    mime_type: Optional[str] = None
    size_bytes: int
    capture_date: Optional[datetime] = None
    capture_date_source: str = "UNKNOWN"
    width: Optional[int] = None
    height: Optional[int] = None
    duration_ms: Optional[int] = None
    orientation: Optional[int] = None
    hash_sha256: Optional[str] = None
    source_entry: Optional[DeviceMediaEntry] = None

    @property
    def formatted_date(self) -> str:
        if self.capture_date:
            return self.capture_date.strftime("%Y-%m-%d %H:%M:%S")
        return "Unknown"


class MetadataExtractor:
    """Robust extractor for images and videos with fallback hierarchy."""

    PHOTO_EXTENSIONS = {".jpg", ".jpeg", ".heic", ".png", ".raw", ".dng", ".gif", ".webp", ".tif", ".tiff"}
    VIDEO_EXTENSIONS = {".mov", ".mp4", ".m4v", ".avi", ".mkv", ".3gp"}

    # Common filename date patterns (e.g. IMG_20260214_153000, 2026-02-14-15-30-00, Screenshot_20260214-153000)
    DATE_PATTERNS = [
        re.compile(r"(\d{4})[-_]?(\d{2})[-_]?(\d{2})[-_T ](\d{2})[-_]?(\d{2})[-_]?(\d{2})"),
        re.compile(r"(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})"),
        re.compile(r"(\d{4})[-_](\d{2})[-_](\d{2})"),
    ]

    @classmethod
    def classify_media_type(cls, filename: str, ext: str, width: Optional[int] = None, height: Optional[int] = None) -> MediaType:
        ext_lower = ext.lower()
        fn_lower = filename.lower()

        if "screenshot" in fn_lower:
            return MediaType.SCREENSHOT

        if ext_lower in cls.PHOTO_EXTENSIONS:
            return MediaType.PHOTO
        elif ext_lower in cls.VIDEO_EXTENSIONS:
            return MediaType.VIDEO
        return MediaType.OTHER

    @classmethod
    def extract_from_entry(cls, entry: DeviceMediaEntry) -> MediaItem:
        ext = Path(entry.filename).suffix.lower()
        capture_date = None
        capture_source = "UNKNOWN"
        width = None
        height = None
        orientation = None
        duration_ms = None
        mime_type = cls._guess_mime_type(ext)

        # 1. Try Image EXIF if image
        if ext in cls.PHOTO_EXTENSIONS:
            exif_date, exif_w, exif_h, exif_ori = cls._extract_image_exif(entry.source_path)
            if exif_date:
                capture_date = exif_date
                capture_source = "EXIF"
            if exif_w and exif_h:
                width, height = exif_w, exif_h
            if exif_ori:
                orientation = exif_ori

        # 2. Try Video QuickTime / MP4 container metadata
        elif ext in cls.VIDEO_EXTENSIONS:
            vid_date, vid_duration = cls._extract_quicktime_metadata(entry.source_path)
            if vid_date:
                capture_date = vid_date
                capture_source = "QUICKTIME"
            if vid_duration:
                duration_ms = vid_duration

        # 3. Try Filename Regex Pattern if no embedded metadata
        if not capture_date:
            fn_date = cls._extract_from_filename(entry.filename)
            if fn_date:
                capture_date = fn_date
                capture_source = "FILENAME"

        # 4. Fallback to filesystem timestamp
        if not capture_date and entry.created_timestamp:
            try:
                # Use earlier of ctime or mtime if available
                ts = entry.created_timestamp
                if entry.modified_timestamp and entry.modified_timestamp < ts:
                    ts = entry.modified_timestamp
                capture_date = datetime.fromtimestamp(ts, tz=timezone.utc).replace(tzinfo=None)
                capture_source = "FILESYSTEM"
            except Exception:
                pass

        media_type = cls.classify_media_type(entry.filename, ext, width, height)

        return MediaItem(
            filename=entry.filename,
            extension=ext,
            media_type=media_type,
            mime_type=mime_type,
            size_bytes=entry.size_bytes,
            capture_date=capture_date,
            capture_date_source=capture_source,
            width=width,
            height=height,
            duration_ms=duration_ms,
            orientation=orientation,
            source_entry=entry,
        )

    @classmethod
    def _guess_mime_type(cls, ext: str) -> str:
        mapping = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".heic": "image/heic",
            ".png": "image/png",
            ".gif": "image/gif",
            ".webp": "image/webp",
            ".mov": "video/quicktime",
            ".mp4": "video/mp4",
            ".m4v": "video/x-m4v",
        }
        return mapping.get(ext.lower(), "application/octet-stream")

    @classmethod
    def _extract_image_exif(cls, file_path: Path) -> Tuple[Optional[datetime], Optional[int], Optional[int], Optional[int]]:
        try:
            with Image.open(file_path) as img:
                w, h = img.size
                exif_data = img.getexif()
                if not exif_data:
                    return None, w, h, None

                orientation = exif_data.get(0x0112)

                # Look for DateTimeOriginal (0x9003), DateTimeDigitized (0x9004), DateTime (0x0132)
                date_str = None
                if 0x9003 in exif_data:
                    date_str = exif_data[0x9003]
                elif 0x0132 in exif_data:
                    date_str = exif_data[0x0132]

                # Check Exif IFD if not found in root
                if not date_str:
                    try:
                        exif_ifd = exif_data.get_ifd(0x8769)
                        if exif_ifd:
                            date_str = exif_ifd.get(0x9003) or exif_ifd.get(0x9004)
                    except Exception:
                        pass

                if date_str and isinstance(date_str, str):
                    parsed_dt = cls._parse_exif_date(date_str)
                    return parsed_dt, w, h, orientation

                return None, w, h, orientation
        except Exception:
            return None, None, None, None

    @classmethod
    def _parse_exif_date(cls, date_str: str) -> Optional[datetime]:
        date_str = date_str.strip()
        # EXIF standard format: YYYY:MM:DD HH:MM:SS
        formats = [
            "%Y:%m:%d %H:%M:%S",
            "%Y-%m-%d %H:%M:%S",
            "%Y:%m:%d %H:%M",
            "%Y-%m-%dT%H:%M:%S",
        ]
        for fmt in formats:
            try:
                return datetime.strptime(date_str[:19], fmt)
            except ValueError:
                continue
        return None

    @classmethod
    def _extract_quicktime_metadata(cls, file_path: Path) -> Tuple[Optional[datetime], Optional[int]]:
        """Parses QuickTime/MP4 header box ('mvhd') to extract creation timestamp & duration."""
        try:
            with open(file_path, "rb") as f:
                return cls._parse_mp4_atoms(f)
        except Exception:
            return None, None

    @classmethod
    def _parse_mp4_atoms(cls, f: BinaryIO) -> Tuple[Optional[datetime], Optional[int]]:
        # QuickTime epoch starts Jan 1, 1904 UTC
        QT_EPOCH_DIFF = 2082844800

        while True:
            header = f.read(8)
            if len(header) < 8:
                break
            atom_size, atom_type = struct.unpack(">I4s", header)
            if atom_size == 1:
                extended_size = f.read(8)
                if len(extended_size) < 8:
                    break
                atom_size = struct.unpack(">Q", extended_size)[0]
                content_size = atom_size - 16
            else:
                content_size = atom_size - 8

            if content_size < 0:
                break

            if atom_type == b"moov":
                # Sub-traverse moov container
                continue
            elif atom_type == b"mvhd":
                mvhd_data = f.read(min(content_size, 32))
                if len(mvhd_data) >= 20:
                    version = mvhd_data[0]
                    if version == 0:
                        _, creation_time, _, time_scale, duration = struct.unpack(">BIII I", mvhd_data[:17])
                    elif version == 1 and len(mvhd_data) >= 32:
                        _, creation_time, _, time_scale, duration = struct.unpack(">BQQ I Q", mvhd_data[:29])
                    else:
                        break

                    parsed_dt = None
                    if creation_time > QT_EPOCH_DIFF:
                        unix_ts = creation_time - QT_EPOCH_DIFF
                        parsed_dt = datetime.fromtimestamp(unix_ts, tz=timezone.utc).replace(tzinfo=None)

                    duration_ms = None
                    if time_scale > 0 and duration > 0:
                        duration_ms = int((duration / time_scale) * 1000)

                    return parsed_dt, duration_ms
                break
            else:
                f.seek(content_size, os.SEEK_CUR)

        return None, None

    @classmethod
    def _extract_from_filename(cls, filename: str) -> Optional[datetime]:
        for pattern in cls.DATE_PATTERNS:
            match = pattern.search(filename)
            if match:
                groups = match.groups()
                try:
                    if len(groups) >= 6:
                        y, m, d, h, mi, s = map(int, groups[:6])
                        return datetime(y, m, d, h, mi, s)
                    elif len(groups) == 3:
                        y, m, d = map(int, groups[:3])
                        return datetime(y, m, d, 0, 0, 0)
                except ValueError:
                    continue
        return None
