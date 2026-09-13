# MEMEASY Database Architecture (SQLite)

## 1. Why SQLite?

- **Zero Administration**: Embedded in-process database, requiring no background service, daemon, or external credentials.
- **ACID Compliance**: Ensures atomic transactions during batch imports and indexing.
- **Speed**: In-memory and local disk SQLite operations handle 1,000,000+ metadata rows with sub-millisecond query response times.
- **Portability**: Library database lives inside `.memeasy/library.db` within the root library folder.

---

## 2. Schema Specification (Phase 2 Design)

```sql
-- Core Library Table
CREATE TABLE IF NOT EXISTS libraries (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    root_path TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Media Catalog (Authoritative Index)
CREATE TABLE IF NOT EXISTS media (
    id TEXT PRIMARY KEY,
    library_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    relative_path TEXT NOT NULL UNIQUE,  -- e.g. "Photos/2026/02/IMG_1024.HEIC"
    media_type TEXT NOT NULL,            -- "PHOTO", "VIDEO", "SCREENSHOT", "LIVE_PHOTO"
    mime_type TEXT,
    extension TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    capture_date DATETIME,
    imported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    width INTEGER,
    height INTEGER,
    duration_ms INTEGER,
    orientation INTEGER,
    hash_sha256 TEXT NOT NULL,           -- Authoritative content hash
    thumbnail_path TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'MISSING', 'ARCHIVED', 'CORRUPT'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(library_id) REFERENCES libraries(id)
);

CREATE INDEX IF NOT EXISTS idx_media_hash ON media(hash_sha256);
CREATE INDEX IF NOT EXISTS idx_media_capture_date ON media(capture_date);
CREATE INDEX IF NOT EXISTS idx_media_type ON media(media_type);
CREATE INDEX IF NOT EXISTS idx_media_relative_path ON media(relative_path);

-- Import Batch Records
CREATE TABLE IF NOT EXISTS imports (
    id TEXT PRIMARY KEY,
    device_id TEXT,
    device_name TEXT,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    total_discovered INTEGER DEFAULT 0,
    total_imported INTEGER DEFAULT 0,
    total_duplicates INTEGER DEFAULT 0,
    total_skipped INTEGER DEFAULT 0,
    total_failed INTEGER DEFAULT 0,
    bytes_imported INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'IN_PROGRESS' -- 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED'
);

-- Virtual Albums (Zero disk duplication)
CREATE TABLE IF NOT EXISTS albums (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    cover_media_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(cover_media_id) REFERENCES media(id)
);

CREATE TABLE IF NOT EXISTS album_items (
    album_id TEXT NOT NULL,
    media_id TEXT NOT NULL,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    position INTEGER DEFAULT 0,
    PRIMARY KEY(album_id, media_id),
    FOREIGN KEY(album_id) REFERENCES albums(id) ON DELETE CASCADE,
    FOREIGN KEY(media_id) REFERENCES media(id) ON DELETE CASCADE
);

-- User Favorites
CREATE TABLE IF NOT EXISTS favorites (
    media_id TEXT PRIMARY KEY,
    favorited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(media_id) REFERENCES media(id) ON DELETE CASCADE
);

-- Video Watch Progress (Netflix-style continue watching)
CREATE TABLE IF NOT EXISTS watch_progress (
    media_id TEXT PRIMARY KEY,
    position_ms INTEGER NOT NULL,
    duration_ms INTEGER NOT NULL,
    completed BOOLEAN DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(media_id) REFERENCES media(id) ON DELETE CASCADE
);
```

---

## 3. Rebuild Index Strategy

If `library.db` is damaged or deleted, MEMEASY can execute a **Full Index Rebuild**:
1. Crawl all files under `Photos/`, `Videos/`, `Screenshots/`, and `LivePhotos/`.
2. Extract EXIF / metadata from every media file.
3. Compute cryptographic hashes.
4. Repopulate the `media` table.
5. Generate fresh thumbnails in `.memeasy/thumbnails/`.
