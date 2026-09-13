import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { libraryApi } from '../api/libraryApi';

export function useLibraryInfo() {
  return useQuery({
    queryKey: ['library'],
    queryFn: () => libraryApi.getLibrary(),
    staleTime: 30000,
  });
}

export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: () => libraryApi.getHealth(),
    refetchInterval: 60000,
  });
}

export function useTriggerIndex() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => libraryApi.triggerIndex(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library'] });
      queryClient.invalidateQueries({ queryKey: ['media'] });
    },
  });
}

export function useTriggerRebuild() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => libraryApi.triggerRebuildIndex(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library'] });
      queryClient.invalidateQueries({ queryKey: ['media'] });
    },
  });
}
