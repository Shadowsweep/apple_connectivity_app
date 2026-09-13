export type CleanableStatus = 'CLEANABLE' | 'UNVERIFIED_CANDIDATE' | 'NOT_BACKED_UP';

export interface DeviceStatus {
  name: string;
  is_connected: boolean;
  supports_delete: boolean;
  last_scanned_at?: string;
}

export interface VerificationDetail {
  discovered_on_device: boolean;
  local_file_exists: boolean;
  import_completed: boolean;
  hash_verified: boolean;
  content_identity_matched: boolean;
  reason?: string | null;
}

export interface CleanItem {
  device_unique_id: string;
  filename: string;
  device_size_bytes: number;
  source_path_str: string;
  status: CleanableStatus;
  verification: VerificationDetail;
  local_media_id?: string | null;
  local_relative_path?: string | null;
  local_size_bytes?: number | null;
  reclaimable_bytes: number;
}

export interface ScanResultsResponse {
  device_name: string;
  total_device_media: number;
  verified_cleanable_count: number;
  unverified_candidate_count: number;
  not_backed_up_count: number;
  total_reclaimable_bytes: number;
  items: CleanItem[];
}

export interface ExecuteCleanupRequest {
  device_unique_ids: string[];
  confirmed: boolean;
}

export interface ExecuteCleanupResponse {
  job_id: string;
  status: string;
  total_targets: number;
}

export interface CleanupHistoryItem {
  id: string;
  device_id: string;
  started_at: string;
  completed_at?: string | null;
  total_items: number;
  deleted_items: number;
  failed_items: number;
  bytes_reclaimed: number;
  status: string;
}
