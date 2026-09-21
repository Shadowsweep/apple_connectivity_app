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

### `%USERPROFILE%\MEMEASY\settings.json` (Global App Config)
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

---

## 4. Current Runtime Checkpoint (2026-09-15)

- `AppContext.active_scan_results` caches the active iPhone provider and normalized scan results as `iphone_device` and `iphone_items`. Preview and start reuse this scan so the 11k-item phone is not enumerated twice.
- A refresh closes the cached AFC provider before reconnecting. Application shutdown also closes the cached device.
- Device scan state remains ephemeral; reconnect/rescan rebuilds it from the phone.
- Import selection is frontend page state (`Set<string>` of device `unique_id` values). It is intentionally not durable across navigation or restart.
- Import destinations are durable filesystem paths beneath the active vault. The request stores a relative `target_folder`; path validation rejects traversal outside the vault.
- Groups are durable SQLite albums. `group_name` is resolved case-insensitively after import; a missing group is created, then successful imported media IDs are linked through `album_items`.
- Physical organization under a custom destination remains deterministic:
  `<target_folder>/<media type>/<year>/<month>/<filename>`.
- The global settings file persists the selected vault, but startup probes it for write access. If a remembered removable drive is unavailable/inaccessible, runtime falls back to the default local `Library` instead of failing startup.

### Paused-state evidence

- Real device: Apple iPhone over the Apple Devices pairing service.
- Read-only scan: 11,632 items, 29 month buckets, zero unknown-date entries, approximately 28.4 seconds.
- Last complete backend run before the final checkpoint change: 55 passed.
- New selective-import/WPD tests: 8 targeted tests passed.
- Frontend TypeScript and Vite production build passed.
- Full backend suite and packaged real-device smoke import are the next validations; see `docs/HANDOFF.md`.
