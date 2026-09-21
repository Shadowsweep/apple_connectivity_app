import { request } from './client';
import { ImportFilterParams, ImportPreviewResponse, ImportStartResponse, JobRecord } from '../types/import';

export interface DeviceSummary {
  device_name: string;
  is_connected: boolean;
  is_real_device: boolean;
  photos_count: number;
  videos_count: number;
  screenshots_count: number;
  live_photos_count: number;
  total_count: number;
  total_bytes: number;
  formatted_total: string;
  oldest_capture_date: string | null;
  newest_capture_date: string | null;
  provider?: string | null;
  connection_status: 'READY' | 'EMPTY' | 'NEEDS_ATTENTION' | 'DISCONNECTED' | 'LOCKED' | 'UNTRUSTED' | 'UNAVAILABLE';
  message?: string | null;
  action?: string | null;
}

export interface DeviceProbe {
  state: 'READY' | 'EMPTY' | 'DISCONNECTED' | 'LOCKED' | 'UNTRUSTED' | 'UNAVAILABLE';
  provider?: string | null;
  device_name?: string | null;
  message: string;
  action: string;
  capabilities: Record<string, boolean>;
  last_error?: string | null;
}

export interface DeviceScanStatus {
  state: 'IDLE' | 'SCANNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  scan_id?: string | null;
  scan_generation?: number | null;
  job_id?: string | null;
  job_status?: string | null;
  items_discovered: number;
  total_bytes: number;
  elapsed_seconds: number;
  months: Record<string, number>;
  device_name?: string | null;
  provider?: string | null;
}

export interface DeviceScanStart {
  job_id?: string | null;
  scan_id?: string | null;
  scan_generation?: number | null;
  status: string;
  reused_cache: boolean;
}

export const importApi = {
  getDeviceStatus: async (): Promise<DeviceProbe> => {
    return request<DeviceProbe>('/import/device-status');
  },

  startScan: async (refresh = true): Promise<DeviceScanStart> => {
    return request<DeviceScanStart>('/import/scan', {
      method: 'POST',
      body: JSON.stringify({ refresh }),
    });
  },

  getScanStatus: async (): Promise<DeviceScanStatus> => {
    return request<DeviceScanStatus>('/import/scan-status');
  },

  getDeviceSummary: async (refresh = false): Promise<DeviceSummary> => {
    return request<DeviceSummary>('/import/device-summary' + (refresh ? '?refresh=true' : ''));
  },

  getPreview: async (params: ImportFilterParams): Promise<ImportPreviewResponse> => {
    return request<ImportPreviewResponse>('/import/preview', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  startImport: async (params: ImportFilterParams): Promise<ImportStartResponse> => {
    return request<ImportStartResponse>('/import/start', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  getJobStatus: async (jobId: string): Promise<JobRecord> => {
    return request<JobRecord>('/jobs/' + jobId);
  },

  cancelJob: async (jobId: string): Promise<JobRecord> => {
    return request<JobRecord>('/jobs/' + jobId + '/cancel', { method: 'POST' });
  },
};
