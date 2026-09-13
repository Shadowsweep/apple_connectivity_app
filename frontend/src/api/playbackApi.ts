import { request } from './client';
import { WatchProgressRecord, ContinueWatchingItem, UpdateProgressRequest } from '../types/playback';

export const playbackApi = {
  getContinueWatching: async (): Promise<ContinueWatchingItem[]> => {
    return request<ContinueWatchingItem[]>('/playback/continue');
  },

  getProgress: async (mediaId: string): Promise<WatchProgressRecord> => {
    return request<WatchProgressRecord>('/media/' + mediaId + '/progress');
  },

  updateProgress: async (mediaId: string, req: UpdateProgressRequest): Promise<WatchProgressRecord> => {
    return request<WatchProgressRecord>('/media/' + mediaId + '/progress', {
      method: 'PUT',
      body: JSON.stringify(req),
    });
  },
};
