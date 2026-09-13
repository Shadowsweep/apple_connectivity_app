import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { duplicatesApi } from '../api/duplicatesApi';

export function useDuplicates() {
  return useQuery({
    queryKey: ['duplicates'],
    queryFn: () => duplicatesApi.listDuplicates(),
  });
}

export function useTrashDuplicates() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mediaIds: string[]) => duplicatesApi.trashDuplicates({ media_ids: mediaIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['duplicates'] });
      queryClient.invalidateQueries({ queryKey: ['media'] });
      queryClient.invalidateQueries({ queryKey: ['storageAnalytics'] });
    },
  });
}

export function useScanDuplicates() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => duplicatesApi.scanDuplicates(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['duplicates'] });
    },
  });
}
