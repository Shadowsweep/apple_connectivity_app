import { request } from './client';
import { ImportFilterParams, ImportPreviewResponse, ImportStartResponse, JobRecord } from '../types/import';

export const importApi = {
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
};
