import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mediaApi } from '../api/mediaApi';
import { MediaFilterParams } from '../types/media';

export function useMediaList(params?: MediaFilterParams) {
  return useQuery({
    queryKey: ['media', params],
    queryFn: () => mediaApi.listMedia(params),
  });
}

export function useInfiniteMediaList(params?: MediaFilterParams) {
  return useInfiniteQuery({
    queryKey: ['media', 'infinite', params],
    queryFn: ({ pageParam = 1 }) =>
      mediaApi.listMedia({ ...params, page: pageParam as number, limit: params?.limit || 100 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const total = lastPage.total ?? 0;
      const limit = lastPage.limit || 100;
      const totalPages = Math.ceil(total / limit);
      return lastPage.page < totalPages ? lastPage.page + 1 : undefined;
    },
  });
}

export function useMediaDetail(mediaId: string | null) {
  return useQuery({
    queryKey: ['media', 'detail', mediaId],
    queryFn: () => (mediaId ? mediaApi.getMediaDetail(mediaId) : null),
    enabled: !!mediaId,
  });
}

export function useFavorites() {
  return useQuery({
    queryKey: ['favorites'],
    queryFn: () => mediaApi.listFavorites(),
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ mediaId, isFavorite }: { mediaId: string; isFavorite: boolean }) => {
      if (isFavorite) {
        return mediaApi.removeFavorite(mediaId);
      } else {
        return mediaApi.addFavorite(mediaId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      queryClient.invalidateQueries({ queryKey: ['media'] });
    },
  });
}

export function useTrashMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (mediaIds: string[]) => mediaApi.trashMedia(mediaIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });
}

export function useBackfillDurations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => mediaApi.backfillDurations(),
    onSuccess: (res) => {
      if (res.updated > 0) {
        queryClient.invalidateQueries({ queryKey: ['media'] });
      }
    },
  });
}
