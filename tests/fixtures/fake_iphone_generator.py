import os
import struct
from datetime import datetime
from pathlib import Path
from PIL import Image, ExifTags


def create_mock_iphone_fixture(base_path: Path):
    """Generates deterministic mock iPhone media files (images with EXIF, MP4s with atoms, etc.)."""
    base = Path(base_path)
    base.mkdir(parents=True, exist_ok=True)

    dcim = base / "DCIM" / "100APPLE"
    dcim.mkdir(parents=True, exist_ok=True)

    # 1. Standard Photo with EXIF Date (2025-06-15)
    img1_path = dcim / "IMG_1001.JPG"
    if not img1_path.exists():
        img = Image.new("RGB", (800, 600), color=(73, 109, 137))
        exif = img.getexif()
        exif[0x9003] = "2025:06:15 14:30:00"  # DateTimeOriginal
        img.save(img1_path, exif=exif)

    # 2. Another Photo with EXIF Date (2026-02-14)
    img2_path = dcim / "IMG_1002.JPG"
    if not img2_path.exists():
        img = Image.new("RGB", (1024, 768), color=(140, 200, 100))
        exif = img.getexif()
        exif[0x9003] = "2026:02:14 09:15:00"
        img.save(img2_path, exif=exif)

    # 3. Live Photo Pair (IMG_1003.JPG + IMG_1003.MOV)
    img3_path = dcim / "IMG_1003.JPG"
    mov3_path = dcim / "IMG_1003.MOV"
    if not img3_path.exists():
        img = Image.new("RGB", (640, 480), color=(200, 100, 140))
        exif = img.getexif()
        exif[0x9003] = "2026:03:01 18:00:00"
        img.save(img3_path, exif=exif)
    if not mov3_path.exists():
        _create_mock_quicktime_file(mov3_path, creation_dt=datetime(2026, 3, 1, 18, 0, 0), duration_ms=2500)

    # 4. Standalone Video (2026-05-10, 5 MB simulated)
    mov4_path = dcim / "IMG_1004.MOV"
    if not mov4_path.exists():
        _create_mock_quicktime_file(mov4_path, creation_dt=datetime(2026, 5, 10, 11, 20, 0), duration_ms=15000, extra_payload_size=50000)

    # 5. Screenshot (Filename fallback timestamp)
    scr_path = dcim / "Screenshot_20260720-213000.PNG"
    if not scr_path.exists():
        img = Image.new("RGB", (1170, 2532), color=(30, 30, 30))
        img.save(scr_path)

    # 6. Duplicate Content with Different Filename (IMG_9999.JPG is exact copy of IMG_1001.JPG)
    dup_path = dcim / "IMG_9999.JPG"
    if not dup_path.exists() and img1_path.exists():
        dup_path.write_bytes(img1_path.read_bytes())


def _create_mock_quicktime_file(path: Path, creation_dt: datetime, duration_ms: int = 1000, extra_payload_size: int = 1024):
    """Writes binary MP4 header with `ftyp`, `moov`, `mvhd` boxes for metadata parser testing."""
    QT_EPOCH_DIFF = 2082844800
    creation_time = int(creation_dt.timestamp()) + QT_EPOCH_DIFF
    time_scale = 1000
    duration = duration_ms

    # ftyp atom
    ftyp_data = b"ftypqt  \x00\x00\x02\x00qt  "
    ftyp_atom = struct.pack(">I4s", len(ftyp_data) + 8, b"ftyp") + ftyp_data

    # mvhd atom
    # version=0, creation_time, mod_time, time_scale, duration
    mvhd_payload = struct.pack(">BIII I", 0, creation_time, creation_time, time_scale, duration)
    # Pad to 108 bytes standard mvhd
    mvhd_payload += b"\x00" * (108 - len(mvhd_payload))
    mvhd_atom = struct.pack(">I4s", len(mvhd_payload) + 8, b"mvhd") + mvhd_payload

    # moov atom wrapping mvhd
    moov_atom = struct.pack(">I4s", len(mvhd_atom) + 8, b"moov") + mvhd_atom

    # mdat atom with arbitrary payload
    mdat_payload = b"\x00" * extra_payload_size
    mdat_atom = struct.pack(">I4s", len(mdat_payload) + 8, b"mdat") + mdat_payload

    path.write_bytes(ftyp_atom + moov_atom + mdat_atom)
