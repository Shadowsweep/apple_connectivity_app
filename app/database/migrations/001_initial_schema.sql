-- MEMEASY Schema Migration 001 - Initial Baseline

CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS libraries (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    root_path TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    device_type TEXT NOT NULL DEFAULT 'IPHONE',
    identifier TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS media (
    id TEXT PRIMARY KEY,
    library_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    relative_path TEXT NOT NULL UNIQUE,
    media_type TEXT NOT NULL,
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
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (library_id) REFERENCES libraries (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_media_capture_date ON media(capture_date);
CREATE INDEX IF NOT EXISTS idx_media_media_type ON media(media_type);
CREATE INDEX IF NOT EXISTS idx_media_size_bytes ON media(size_bytes);
CREATE INDEX IF NOT EXISTS idx_media_hash ON media(hash_sha256);
CREATE INDEX IF NOT EXISTS idx_media_status ON media(status);
CREATE INDEX IF NOT EXISTS idx_media_library_id ON media(library_id);
CREATE INDEX IF NOT EXISTS idx_media_relative_path ON media(relative_path);

CREATE TABLE IF NOT EXISTS imports (
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

CREATE TABLE IF NOT EXISTS import_items (
    id TEXT PRIMARY KEY,
    import_id TEXT NOT NULL,
    media_id TEXT,
    source_path TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'SUCCESS',
    error TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (import_id) REFERENCES imports (id) ON DELETE CASCADE,
    FOREIGN KEY (media_id) REFERENCES media (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS jobs (
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

CREATE TABLE IF NOT EXISTS albums (
    id TEXT PRIMARY KEY,
    library_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (library_id) REFERENCES libraries (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS album_items (
    album_id TEXT NOT NULL,
    media_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (album_id, media_id),
    FOREIGN KEY (album_id) REFERENCES albums (id) ON DELETE CASCADE,
    FOREIGN KEY (media_id) REFERENCES media (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS favorites (
    media_id TEXT PRIMARY KEY,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (media_id) REFERENCES media (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS watch_progress (
    media_id TEXT PRIMARY KEY,
    position_ms INTEGER NOT NULL,
    duration_ms INTEGER NOT NULL,
    completed BOOLEAN DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (media_id) REFERENCES media (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS trash (
    id TEXT PRIMARY KEY,
    media_id TEXT NOT NULL,
    original_relative_path TEXT NOT NULL,
    deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (media_id) REFERENCES media (id) ON DELETE CASCADE
);
