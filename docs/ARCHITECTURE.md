# MEMEASY System Architecture

## 1. Architectural Philosophy

MEMEASY is a **local-first personal media platform** designed for Windows 10/11. The core architectural axiom is:

> **The filesystem is authoritative for media bytes. SQLite is only an index/catalog.**

```text
                     MEMEASY
                        │
         ┌──────────────┴──────────────┐
         ▼                             ▼
   Metadata Index                Actual Storage
    SQLite (.db)                   Local Disk
         │                             │
         │                        Photos/YYYY/MM/
         │                        Videos/YYYY/MM/
         ▼                             ▼
   Search / Filter               Source of Truth
```

---

## 2. Component Hierarchy & Phased Evolution

```text
[ Desktop App Layer ] (Phase 5-6)
       │ Tauri Windows Shell (Rust)
       ▼
[ Client Interface ] (Phase 4-6)
       │ React 18 + Vite + Tailwind CSS (Netflix-style Virtualized Grid)
       ▼
[ Application API ] (Phase 3)
       │ FastAPI (Localhost-bound ASGI, WebSockets for Job Progress)
       ▼
[ Core Engine Services ] (Phase 1-2)
       ├── Device Integration (MediaDevice / WPD / PTP / Local Mock)
       ├── Scanner & Metadata (EXIF, QuickTime/MP4, PIL, ffprobe)
       ├── Filter Engine (Date, Media Type, Video Size, Storage Quota)
       ├── Duplicate Detector (2-Tier Fast Size + SHA-256 Crypto Hash)
       ├── Storage Manager (Path Normalization, Free Space & 10GB Safety Buffer)
       └── Safe Importer & Verifier (Staged Atomic Ingestion)
```

---

## 3. iPhone Integration on Windows: Reality vs Assumption

### The Problem
On Windows 10/11, connected iOS devices do **not** mount as standard drive letters (like `E:\`) unless configured in limited PTP camera mode. Instead, iOS exposes photos via **WPD (Windows Portable Devices)** over MTP, handled by the Windows Shell subsystem (`shell:::{...}` or `PortableDeviceApiLib`).

### The MEMEASY Solution
1. **Abstract `MediaDevice` Protocol**:
   All scanning and transfer logic operates against a high-level `MediaDevice` interface.
2. **Device Implementations**:
   - `MockMediaDevice`: Synthetic source directory used for automated unit/integration testing and CLI dry-runs.
   - `LocalFolderDevice`: Scans any mounted folder or backup directory.
   - `WindowsWPDDevice` (Future Phase): Uses Windows COM / `pywin32` WPD interfaces or a bundled lightweight CLI helper to stream files from MTP devices into `.memeasy/tmp/`.
3. **No DCIM Assumption**: Never assume rigid directory naming such as `DCIM\100APPLE`. Media is enumerated by device capabilities and object stream handles.

---

## 4. Safe Copy & Atomic Ingestion Pipeline

```text
[Device Source]
      │
      ▼
1. DISCOVER & SCAN (Metadata extraction in memory)
      │
      ▼
2. FILTER & DEDUPLICATE (Check local library index & candidate hash)
      │
      ▼
3. STORAGE CHECK (Verify destination has file_size + 10GB reserve)
      │
      ▼
4. STAGE COPY (Copy raw stream into .memeasy/tmp/<session_id>/<temp_file>)
      │
      ▼
5. VERIFY (Compute SHA-256 / size of staged file against source)
      │
      ▼ (If valid)
6. ATOMIC MOVE (Move from .memeasy/tmp/ to Photos/YYYY/MM/IMG_xxxx.ext)
      │
      ▼
7. RECORD & INDEX (Update catalog)
```

### Failure Handling
- **Interrupted Transfer**: `.memeasy/tmp/` is scanned on engine startup and any incomplete temp files are purged.
- **Corrupted Source / Hash Mismatch**: Staged file is discarded immediately; error is logged, and the file is reported as failed without modifying the library structure.
- **Disk Full / Safety Threshold Reached**: Transfer halts gracefully; remaining queued items are marked skipped.

---

## 5. Process Communication & Packaging Strategy

- **Local-Only**: The FastAPI backend binds exclusively to `127.0.0.1` with ephemeral port negotiation or a local token.
- **No Python Runtime Requirement**: In Phase 5, the Python backend will be compiled using PyInstaller/Nuitka into a self-contained executable sidecar managed by the Tauri Rust lifecycle.
