import { request } from './client';
import {
  DeviceStatus,
  ScanResultsResponse,
  ExecuteCleanupRequest,
  ExecuteCleanupResponse,
  CleanupHistoryItem,
} from '../types/clean';

export const cleanApi = {
  getStatus: async (): Promise<DeviceStatus> => {
    return request<DeviceStatus>('/clean/status');
  },

  triggerScan: async (): Promise<{ job_id: string; status: string }> => {
    return request<{ job_id: string; status: string }>('/clean/scan', {
      method: 'POST',
    });
  },

  getScanResults: async (): Promise<ScanResultsResponse> => {
    return request<ScanResultsResponse>('/clean/scan/results');
  },

  executeCleanup: async (req: ExecuteCleanupRequest): Promise<ExecuteCleanupResponse> => {
    return request<ExecuteCleanupResponse>('/clean/execute', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  getHistory: async (): Promise<CleanupHistoryItem[]> => {
    return request<CleanupHistoryItem[]>('/clean/history');
  },
};
