import { request } from './client';

export interface DatabaseIntegrity {
  is_healthy: boolean;
  messages: string[];
  database_path: string;
  size_bytes: number;
}

export interface BackupResponse {
  success: boolean;
  backup_path: string;
  size_bytes: number;
  created_at: string;
}

export interface DiagnosticsReport {
  app_name: string;
  version: string;
  os: string;
  python_version: string;
  library_root: string;
  database_status: DatabaseIntegrity;
  storage_stats: {
    total_bytes: number;
    used_bytes: number;
    free_bytes: number;
    usable_bytes: number;
    safety_reserve_bytes: number;
  };
  total_active_media: number;
  total_missing_media: number;
  total_trashed_media: number;
  active_background_jobs: number;
  thumbnail_cache_files: number;
  thumbnail_cache_bytes: number;
  active_locks: Record<string, string>;
  timestamp: string;
}

export const diagnosticsApi = {
  getIntegrity: async (): Promise<DatabaseIntegrity> => {
    return request<DatabaseIntegrity>('/database/integrity');
  },

  backupDatabase: async (): Promise<BackupResponse> => {
    return request<BackupResponse>('/database/backup', { method: 'POST' });
  },

  restoreDatabase: async (backupPath?: string): Promise<BackupResponse> => {
    return request<BackupResponse>('/database/restore', {
      method: 'POST',
      body: JSON.stringify({ backup_path: backupPath }),
    });
  },

  cleanupThumbnails: async (): Promise<{ pruned_count: number }> => {
    return request<{ pruned_count: number }>('/thumbnails/cleanup', { method: 'POST' });
  },

  getDiagnostics: async (): Promise<DiagnosticsReport> => {
    return request<DiagnosticsReport>('/diagnostics');
  },

  exportDiagnostics: async (): Promise<Record<string, unknown>> => {
    return request<Record<string, unknown>>('/diagnostics/export', { method: 'POST' });
  },
};
