import { request } from './client';
import { LibraryHealthResponse } from '../types/health';

export const healthApi = {
  getLibraryHealth: async (): Promise<LibraryHealthResponse> => {
    return request<LibraryHealthResponse>('/library/health');
  },

  scanHealth: async (): Promise<{ job_id: string; status: string }> => {
    return request<{ job_id: string; status: string }>('/library/health/scan', { method: 'POST' });
  },

  indexUnindexed: async (): Promise<{ job_id: string; status: string }> => {
    return request<{ job_id: string; status: string }>('/library/index-unindexed', { method: 'POST' });
  },
};
