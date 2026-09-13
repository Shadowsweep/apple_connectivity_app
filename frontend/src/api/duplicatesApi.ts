import { request } from './client';
import { DuplicateGroup, TrashDuplicatesRequest, TrashDuplicatesResponse } from '../types/duplicate';

export const duplicatesApi = {
  listDuplicates: async (): Promise<DuplicateGroup[]> => {
    return request<DuplicateGroup[]>('/duplicates');
  },

  scanDuplicates: async (): Promise<{ job_id: string; status: string }> => {
    return request<{ job_id: string; status: string }>('/duplicates/scan', { method: 'POST' });
  },

  trashDuplicates: async (req: TrashDuplicatesRequest): Promise<TrashDuplicatesResponse> => {
    return request<TrashDuplicatesResponse>('/duplicates/trash', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },
};
