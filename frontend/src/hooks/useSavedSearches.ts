import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { searchesApi } from '../api/searchesApi';
import { CreateSearchRequest } from '../types/savedSearch';

export function useSavedSearches() {
  return useQuery({
    queryKey: ['savedSearches'],
    queryFn: () => searchesApi.listSavedSearches(),
  });
}

export function useCreateSavedSearch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: CreateSearchRequest) => searchesApi.createSavedSearch(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedSearches'] });
    },
  });
}

export function useDeleteSavedSearch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => searchesApi.deleteSavedSearch(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedSearches'] });
    },
  });
}
