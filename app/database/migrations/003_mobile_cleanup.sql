-- MEMEASY Schema Migration 003 - Mobile Cleanup Audit Trail

CREATE TABLE IF NOT EXISTS mobile_cleanup_history (
    id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    total_items INTEGER DEFAULT 0,
    deleted_items INTEGER DEFAULT 0,
    failed_items INTEGER DEFAULT 0,
    bytes_reclaimed INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'COMPLETED'
);

CREATE TABLE IF NOT EXISTS mobile_cleanup_items (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    device_id TEXT NOT NULL,
    local_media_id TEXT,
    device_identifier TEXT NOT NULL,
    device_filename TEXT NOT NULL,
    device_size INTEGER NOT NULL,
    verification_status TEXT NOT NULL,
    cleanup_status TEXT NOT NULL,
    scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    error TEXT,
    FOREIGN KEY (session_id) REFERENCES mobile_cleanup_history (id) ON DELETE CASCADE,
    FOREIGN KEY (local_media_id) REFERENCES media (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_cleanup_items_session ON mobile_cleanup_items(session_id);
CREATE INDEX IF NOT EXISTS idx_cleanup_history_device ON mobile_cleanup_history(device_id);
