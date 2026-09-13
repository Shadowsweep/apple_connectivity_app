# MEMEASY State & Memory Architecture

This document specifies the **application runtime state and persistence model** for MEMEASY.

---

## 1. State Categorization

```text
┌────────────────────────────────────────────────────────┐
│                   MEMEASY State Matrix                  │
├────────────────────────────┬───────────────────────────┤
│ Durable / Persistent       │ Ephemeral / Rebuildable   │
├────────────────────────────┼───────────────────────────┤
│ • Library root destination │ • In-flight import jobs   │
│ • User configuration       │ • Temporary copy files    │
│ • Catalog metadata (DB)    │ • Thumbnails & cache      │
│ • Virtual albums           │ • Device scan sessions    │
│ • User favorites           │ • Search index cache      │
│ • Video playback progress  │ • Duplicate scan buffers  │
│ • Import history log       │ • In-memory filter params │
└────────────────────────────┴───────────────────────────┘
```

---

## 2. Persistent Storage Specification

### `config/settings.json` (Global App Config)
```json
{
  "default_library_path": "D:\\MEMEASY_Library",
  "safety_reserve_bytes": 10737418240,
  "allowed_photo_extensions": [".jpg", ".jpeg", ".heic", ".png", ".raw", ".dng", ".gif", ".webp"],
  "allowed_video_extensions": [".mov", ".mp4", ".m4v", ".avi", ".mkv"],
  "log_level": "INFO"
}
```

### `.memeasy/library.db` (Per-Library Metadata Database)
Stores catalog records, album mappings, favorites, and watch progress.

---

## 3. Ephemeral State & Lifecycle

1. **Import Session State**:
   - In-memory object graph holding discovered items, filtered items, and verification status.
   - Cleared on import completion or explicit cancellation.
2. **Staging Directory (`.memeasy/tmp/`)**:
   - Holds partially downloaded or unverified media chunks.
   - On application startup or abnormal abort recovery, any orphaned files older than 1 hour in `.memeasy/tmp/` are purged safely.
3. **Thumbnail Generation**:
   - Lazily created when media is rendered or imported.
   - If missing from `.memeasy/thumbnails/`, regenerated on-the-fly from the authoritative media file.
