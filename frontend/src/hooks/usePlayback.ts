import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { playbackApi } from '../api/playbackApi';
import { UpdateProgressRequest } from '../types/playback';

export function useContinueWatching() {
  return useQuery({
    queryKey: ['playback', 'continue'],
    queryFn: () => playbackApi.getContinueWatching(),
  });
}

export function useUpdateProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ mediaId, req }: { mediaId: string; req: UpdateProgressRequest }) =>
      playbackApi.updateProgress(mediaId, req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playback', 'continue'] });
    },
  });
}
