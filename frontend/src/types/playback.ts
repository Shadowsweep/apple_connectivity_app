import type { MediaRecord } from './media';

export interface WatchProgressRecord {
  media_id: string;
  position_ms: number;
  duration_ms: number;
  completed: boolean;
  updated_at?: string | null;
}

export interface ContinueWatchingItem {
  media: MediaRecord;
  progress: WatchProgressRecord;
}

export interface UpdateProgressRequest {
  position_ms: number;
  duration_ms: number;
  completed?: boolean;
}
