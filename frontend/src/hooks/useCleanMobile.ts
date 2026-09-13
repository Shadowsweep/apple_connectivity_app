import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cleanApi } from '../api/cleanApi';

export function useCleanStatus() {
  return useQuery({
    queryKey: ['cleanStatus'],
    queryFn: () => cleanApi.getStatus(),
    refetchInterval: 10000,
  });
}

export function useCleanScanResults() {
  return useQuery({
    queryKey: ['cleanScanResults'],
    queryFn: () => cleanApi.getScanResults(),
  });
}

export function useTriggerCleanScan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => cleanApi.triggerScan(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleanStatus'] });
      queryClient.invalidateQueries({ queryKey: ['cleanScanResults'] });
    },
  });
}

export function useExecuteCleanup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (uniqueIds: string[]) =>
      cleanApi.executeCleanup({
        device_unique_ids: uniqueIds,
        confirmed: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleanScanResults'] });
      queryClient.invalidateQueries({ queryKey: ['cleanHistory'] });
      queryClient.invalidateQueries({ queryKey: ['cleanStatus'] });
    },
  });
}

export function useCleanHistory() {
  return useQuery({
    queryKey: ['cleanHistory'],
    queryFn: () => cleanApi.getHistory(),
  });
}
