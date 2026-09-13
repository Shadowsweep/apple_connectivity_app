import { request } from './client';
import { StorageAnalyticsResponse } from '../types/analytics';

export const analyticsApi = {
  getStorageAnalytics: async (): Promise<StorageAnalyticsResponse> => {
    return request<StorageAnalyticsResponse>('/analytics/storage');
  },
};
