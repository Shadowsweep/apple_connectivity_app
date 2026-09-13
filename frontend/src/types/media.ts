export type MediaType = 'PHOTO' | 'VIDEO' | 'SCREENSHOT' | 'LIVE_PHOTO' | 'OTHER';
export type MediaStatus = 'ACTIVE' | 'MISSING' | 'TRASHED' | 'CORRUPT';

export interface MediaRecord {
  id: string;
  library_id: string;
  filename: string;
  relative_path: string;
  media_type: MediaType;
  mime_type?: string | null;
  extension: string;
  size_bytes: number;
  capture_date?: string | null;
  imported_at?: string | null;
  width?: number | null;
  height?: number | null;
  duration_ms?: number | null;
  hash_sha256: string;
  thumbnail_path?: string | null;
  status: MediaStatus;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface MediaListResponse {
  items: MediaRecord[];
  page: number;
  limit: number;
  count: number;
  total?: number;
}

export interface MediaFilterParams {
  type?: MediaType | 'ALL';
  start_date?: string;
  end_date?: string;
  import_start_date?: string;
  import_end_date?: string;
  min_size?: number;
  max_size?: number;
  min_duration?: number;
  max_duration?: number;
  min_width?: number;
  max_width?: number;
  min_height?: number;
  max_height?: number;
  extension?: string;
  favorite?: boolean | string;
  album_id?: string;
  search?: string;
  status?: string;
  sort?: string;
  page?: number;
  limit?: number;
}
