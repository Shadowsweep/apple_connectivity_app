import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { albumsApi } from '../api/albumsApi';
import { CreateAlbumRequest } from '../types/album';

export function useAlbums() {
  return useQuery({
    queryKey: ['albums'],
    queryFn: () => albumsApi.listAlbums(),
  });
}

export function useAlbum(albumId: string | null) {
  return useQuery({
    queryKey: ['albums', albumId],
    queryFn: () => (albumId ? albumsApi.getAlbum(albumId) : null),
    enabled: !!albumId,
  });
}

export function useCreateAlbum() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: CreateAlbumRequest) => albumsApi.createAlbum(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['albums'] });
    },
  });
}

export function useAddToAlbum() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ albumId, mediaIds }: { albumId: string; mediaIds: string[] }) =>
      albumsApi.addMediaToAlbum(albumId, mediaIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['albums', variables.albumId] });
      queryClient.invalidateQueries({ queryKey: ['albums'] });
    },
  });
}

export function useRemoveFromAlbum() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ albumId, mediaId }: { albumId: string; mediaId: string }) =>
      albumsApi.removeMediaFromAlbum(albumId, mediaId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['albums', variables.albumId] });
      queryClient.invalidateQueries({ queryKey: ['albums'] });
    },
  });
}

export function useDeleteAlbum() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (albumId: string) => albumsApi.deleteAlbum(albumId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['albums'] });
    },
  });
}
