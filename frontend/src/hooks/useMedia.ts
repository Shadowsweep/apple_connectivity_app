import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mediaApi } from '../api/mediaApi';
import { MediaFilterParams } from '../types/media';

export function useMediaList(params?: MediaFilterParams) {
  return useQuery({
    queryKey: ['media', params],
    queryFn: () => mediaApi.listMedia(params),
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
