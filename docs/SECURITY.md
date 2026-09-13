# MEMEASY Security Architecture

## 1. Local-Only Trust Model

- **No Cloud Telemetry or Media Upload**: Media never leaves the user's local machine or local storage drives.
- **Localhost Binding**: FastAPI server (Phase 3+) binds exclusively to `127.0.0.1` / `[::1]`. It does not listen on `0.0.0.0` or expose public network ports.

---

## 2. Filesystem & Path Traversal Protections

1. **Path Normalization & Confinement**:
   - All destination paths are verified to strictly resolve within the designated Library Root directory.
   - Any path containing `..`, symlink loops, or Windows alternate data streams (`::$DATA`) is rejected.
2. **Atomic Ingestion**:
   - Files are written to `.memeasy/tmp/` with unique temporary names before atomic rename to avoid partial writes or race conditions.
3. **Safe Deletion ("Clean Mobile") Rules**:
   - Device files are never deleted automatically during import.
   - Deletion is an explicit, secondary workflow requiring 4 preconditions:
     1. Local file exists.
     2. Copy was completed.
     3. Verification (SHA-256 hash & size) passed.
     4. Explicit user confirmation dialog.

---

## 3. Metadata Privacy

- EXIF GPS location data and camera serial numbers are preserved locally in the media metadata index for search, but are never transmitted externally.
