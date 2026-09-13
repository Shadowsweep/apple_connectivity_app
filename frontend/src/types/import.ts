export interface ImportFilterParams {
  source_path?: string;
  date_from?: string;
  date_to?: string;
  allowed_types?: string[];
  min_video_size_bytes?: number;
  max_video_size_bytes?: number;
  max_total_import_bytes?: number;
}

export interface ImportPreviewResponse {
  total_candidates: number;
  photos_count: number;
  videos_count: number;
  screenshots_count: number;
  live_photos_count: number;
  already_imported_count: number;
  new_items_count: number;
  required_bytes: number;
  formatted_required: string;
  available_bytes: number;
  usable_bytes: number;
  safety_reserve_bytes: number;
  can_fit: boolean;
}

export type JobStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface JobRecord {
  id: string;
  job_type: string;
  status: JobStatus;
  progress: number;
  total: number;
  completed: number;
  failed: number;
  error?: string | null;
  created_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
}

export interface ImportStartResponse {
  job_id: string;
  status: string;
  total_candidates: number;
}
