-- Phase 10: Performance and Reliability Scale Indexes
CREATE INDEX IF NOT EXISTS idx_media_status_capture_date ON media(status, capture_date DESC);
CREATE INDEX IF NOT EXISTS idx_media_lib_relpath ON media(library_id, relative_path);
CREATE INDEX IF NOT EXISTS idx_jobs_status_created_at ON jobs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_items_status ON import_items(import_id, status);
CREATE INDEX IF NOT EXISTS idx_favorites_created_at ON favorites(created_at DESC);
