export interface LibraryInfo {
  id: string;
  name: string;
  root_path: string;
  total_bytes: number;
  free_bytes: number;
  usable_bytes: number;
  safety_reserve_bytes: number;
  formatted_total: string;
  formatted_free: string;
  formatted_usable: string;
  total_media_count: number;
}

export interface JobCreatedResponse {
  job_id: string;
  status: string;
  job_type: string;
}

export interface HealthStatus {
  status: string;
  service: string;
  library_path: string;
  database: string;
}
