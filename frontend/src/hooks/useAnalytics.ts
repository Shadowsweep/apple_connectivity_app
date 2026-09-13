import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../api/analyticsApi';

export function useStorageAnalytics() {
  return useQuery({
    queryKey: ['storageAnalytics'],
    queryFn: () => analyticsApi.getStorageAnalytics(),
  });
}
