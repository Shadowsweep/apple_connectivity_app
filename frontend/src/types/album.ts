import type { MediaRecord } from './media';

export interface AlbumRecord {
  id: string;
  library_id: string;
  name: string;
  description?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface AlbumDetailResponse {
  album: AlbumRecord;
  items: MediaRecord[];
}

export interface CreateAlbumRequest {
  name: string;
  description?: string;
}
