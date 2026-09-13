import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { importApi } from '../api/importApi';
import { ImportFilterParams } from '../types/import';

export function useImportPreview(params: ImportFilterParams, enabled = false) {
  return useQuery({
    queryKey: ['import', 'preview', params],
    queryFn: () => importApi.getPreview(params),
    enabled,
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
