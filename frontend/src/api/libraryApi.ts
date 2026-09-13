import { request } from './client';
import { LibraryInfo, JobCreatedResponse, HealthStatus } from '../types/library';

export const libraryApi = {
  getLibrary: async (): Promise<LibraryInfo> => {
    return request<LibraryInfo>('/library');
  },

  triggerIndex: async (): Promise<JobCreatedResponse> => {
    return request<JobCreatedResponse>('/library/index', { method: 'POST' });
  },

  triggerRebuildIndex: async (): Promise<JobCreatedResponse> => {
    return request<JobCreatedResponse>('/library/rebuild-index', { method: 'POST' });
  },

  getHealth: async (): Promise<HealthStatus> => {
    return request<HealthStatus>('/health');
  },
};
