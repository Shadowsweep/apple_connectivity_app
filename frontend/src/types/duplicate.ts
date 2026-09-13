import { MediaRecord } from './media';

export interface DuplicateGroup {
  hash_sha256: string;
  count: number;
  size_bytes: number;
  items: MediaRecord[];
}

export interface TrashDuplicatesRequest {
  media_ids: string[];
}

export interface TrashDuplicatesResponse {
  trashed_count: number;
  trashed_ids: string[];
}
