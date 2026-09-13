# MEMEASY Database Architecture (SQLite)

## 1. Storage Axiom & Role

- **Physical Storage Authority**: Local filesystem (`Photos/`, `Videos/`, `Screenshots/`, `LivePhotos/`) holds all authoritative media files and bytes.
- **Metadata Index Authority**: SQLite (`.memeasy/library.db`) stores metadata, search indexes, virtual albums, favorites, watch progress, import logs, and device mappings.
- **Zero Media in SQLite**: Raw media binaries are NEVER stored in SQLite.

---

## 2. Location & Connection Configuration

- **Path**: `<library_root>/.memeasy/library.db`
- **Engine Pragmas**:
  - `PRAGMA foreign_keys = ON;` (Referential integrity on deletes/cascades)
  - `PRAGMA journal_mode = WAL;` (Write-Ahead Logging for high-concurrency readers)
  - `PRAGMA synchronous = NORMAL;` (Optimal durability balance for SSDs)
  - `PRAGMA busy_timeout = 5000;` (5-second lock timeout)

---

## 3. Implemented Database Schema (Version 1)

### `schema_migrations`
Tracks sequential database migrations applied to the database.
```sql
CREATE TABLE schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### `libraries`
Represents the local media library root.
```sql
CREATE TABLE libraries (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    root_path TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### `devices`
Connected media devices (iPhones, external drives, cameras).
```sql
CREATE TABLE devices (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    device_type TEXT NOT NULL DEFAULT 'IPHONE',
    identifier TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### `media`
Authoritative metadata catalog for all indexed files.
```sql
CREATE TABLE media (
    id TEXT PRIMARY KEY,
    library_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    relative_path TEXT NOT NULL UNIQUE,
    media_type TEXT NOT NULL,            -- "PHOTO", "VIDEO", "SCREENSHOT", "LIVE_PHOTO", "OTHER"
    mime_type TEXT,
    extension TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    capture_date DATETIME,
    imported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    width INTEGER,
    height INTEGER,
    duration_ms INTEGER,
    hash_sha256 TEXT NOT NULL,
    thumbnail_path TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE', -- "ACTIVE", "MISSING", "TRASHED", "CORRUPT"
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (library_id) REFERENCES libraries (id) ON DELETE CASCADE
);

CREATE INDEX idx_media_capture_date ON media(capture_date);
CREATE INDEX idx_media_media_type ON media(media_type);
CREATE INDEX idx_media_size_bytes ON media(size_bytes);
CREATE INDEX idx_media_hash ON media(hash_sha256);
CREATE INDEX idx_media_status ON media(status);
CREATE INDEX idx_media_library_id ON media(library_id);
CREATE INDEX idx_media_relative_path ON media(relative_path);
```

### `imports` & `import_items`
Batch ingestion session history and individual item statuses.
```sql
CREATE TABLE imports (
    id TEXT PRIMARY KEY,
    library_id TEXT NOT NULL,
    device_id TEXT,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    total_files INTEGER DEFAULT 0,
    successful_files INTEGER DEFAULT 0,
    failed_files INTEGER DEFAULT 0,
    duplicate_files INTEGER DEFAULT 0,
    bytes_imported INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    FOREIGN KEY (library_id) REFERENCES libraries (id) ON DELETE CASCADE,
    FOREIGN KEY (device_id) REFERENCES devices (id) ON DELETE SET NULL
);

CREATE TABLE import_items (
    id TEXT PRIMARY KEY,
    import_id TEXT NOT NULL,
    media_id TEXT,
    source_path TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'SUCCESS', -- "SUCCESS", "FAILED", "SKIPPED_DUPLICATE", "SKIPPED_SPACE"
    error TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (import_id) REFERENCES imports (id) ON DELETE CASCADE,
    FOREIGN KEY (media_id) REFERENCES media (id) ON DELETE SET NULL
);
```

### `jobs`
Background job and task queue tracking.
```sql
CREATE TABLE jobs (
    id TEXT PRIMARY KEY,
    job_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'QUEUED',
    progress INTEGER DEFAULT 0,
    total INTEGER DEFAULT 0,
    completed INTEGER DEFAULT 0,
    failed INTEGER DEFAULT 0,
    error TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    started_at DATETIME,
    completed_at DATETIME
);
```

### `albums` & `album_items`
Virtual collections without file duplication on disk.
```sql
CREATE TABLE albums (
    id TEXT PRIMARY KEY,
    library_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (library_id) REFERENCES libraries (id) ON DELETE CASCADE
);

CREATE TABLE album_items (
    album_id TEXT NOT NULL,
    media_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (album_id, media_id),
    FOREIGN KEY (album_id) REFERENCES albums (id) ON DELETE CASCADE,
    FOREIGN KEY (media_id) REFERENCES media (id) ON DELETE CASCADE
);
```

### `favorites`
User-marked favorite media items.
```sql
CREATE TABLE favorites (
    media_id TEXT PRIMARY KEY,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (media_id) REFERENCES media (id) ON DELETE CASCADE
);
```

### `watch_progress`
Video playback resume position and completion state.
```sql
CREATE TABLE watch_progress (
    media_id TEXT PRIMARY KEY,
    position_ms INTEGER NOT NULL,
    duration_ms INTEGER NOT NULL,
    completed BOOLEAN DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (media_id) REFERENCES media (id) ON DELETE CASCADE
);
```

### `trash`
Soft-delete / trash bin metadata.
```sql
CREATE TABLE trash (
    id TEXT PRIMARY KEY,
    media_id TEXT NOT NULL,
    original_relative_path TEXT NOT NULL,
    deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (media_id) REFERENCES media (id) ON DELETE CASCADE
);
```

---

## 4. Repository Abstraction Pattern

All database access is encapsulated inside `app/database/repositories/`:
- `LibraryRepository`: Manage library metadata and root path bindings.
- `DeviceRepository`: Register and track connected hardware.
- `MediaRepository`: Filter, search, paginate, and track media status (`ACTIVE` vs `MISSING`).
- `ImportRepository`: Record batch imports and item audit trails.
- `AlbumRepository`: Virtual album CRUD and item associations.
- `FavoriteRepository`: Favorite toggling and listing.
- `WatchRepository`: Continue watching state and progress persistence.
- `JobRepository`: Task progress and failure recording.

---

## 5. Indexing, Rebuilding & Backup Strategy

- **`index_library()`**: Walks local media folders, computes SHA-256 hashes, reconciles with SQLite, flags missing items as `status = 'MISSING'`.
- **`rebuild_index()`**: Safely calls SQLite's online backup API (`.memeasy/library.db.bak`), re-initializes tables, re-scans media, and regenerates catalog records without modifying physical media bytes.
