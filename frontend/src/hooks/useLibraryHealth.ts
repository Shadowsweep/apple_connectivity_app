import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { healthApi } from '../api/healthApi';

export function useLibraryHealth() {
  return useQuery({
    queryKey: ['libraryHealth'],
    queryFn: () => healthApi.getLibraryHealth(),
  });
}

export function useScanHealth() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => healthApi.scanHealth(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['libraryHealth'] });
      queryClient.invalidateQueries({ queryKey: ['media'] });
    },
  });
}

export function useIndexUnindexed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => healthApi.indexUnindexed(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['libraryHealth'] });
      queryClient.invalidateQueries({ queryKey: ['library'] });
      queryClient.invalidateQueries({ queryKey: ['media'] });
    },
  });
}
