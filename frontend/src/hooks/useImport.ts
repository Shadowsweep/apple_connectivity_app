import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { importApi } from '../api/importApi';
import { ImportFilterParams } from '../types/import';

export function useDeviceSummary() {
  return useQuery({
    queryKey: ['deviceSummary'],
    queryFn: () => importApi.getDeviceSummary(),
    staleTime: 60000,
    // ponytail: no auto-retries — each attempt boots COM on a flaky device
    retry: false,
  });
}

export function useRefreshDeviceSummary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => importApi.getDeviceSummary(true),
    onSuccess: (data) => {
      queryClient.setQueryData(['deviceSummary'], data);
    },
  });
}

export function useStartScan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (refresh: boolean = true) => importApi.startScan(refresh),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deviceScan'] });
    },
  });
}

export function useScanStatus(enabled = true) {
  return useQuery({
    queryKey: ['deviceScan'],
    queryFn: () => importApi.getScanStatus(),
    enabled,
    retry: false,
    refetchInterval: (query) => {
      const state = (query.state.data as { state?: string } | undefined)?.state;
      return state === 'SCANNING' ? 1000 : false;
    },
  });
}

export function useImportPreview(params: ImportFilterParams, enabled = false) {
  return useQuery({
    queryKey: ['import', 'preview', params],
    queryFn: () => importApi.getPreview(params),
    enabled,
    retry: false,
  });
}

export function useStartImport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: ImportFilterParams) => importApi.startImport(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library'] });
      queryClient.invalidateQueries({ queryKey: ['media'] });
    },
  });
}

export function useJobStatus(jobId: string | null) {
  return useQuery({
    queryKey: ['jobs', jobId],
    queryFn: () => (jobId ? importApi.getJobStatus(jobId) : null),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 1000;
      if (data.status === 'COMPLETED' || data.status === 'FAILED' || data.status === 'CANCELLED') {
        return false;
      }
      return 1000;
    },
  });
}
