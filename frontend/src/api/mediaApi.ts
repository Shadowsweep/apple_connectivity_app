import { request, buildQueryString } from './client';
import { MediaRecord, MediaListResponse, MediaFilterParams } from '../types/media';

export const mediaApi = {
  listMedia: async (params?: MediaFilterParams): Promise<MediaListResponse> => {
    const qs = params ? buildQueryString(params) : '';
    return request<MediaListResponse>('/media' + qs);
  },

  getMediaDetail: async (mediaId: string): Promise<MediaRecord> => {
    return request<MediaRecord>('/media/' + mediaId);
  },

  getThumbnailUrl: (mediaId: string): string => {
    return '/api/media/' + mediaId + '/thumbnail';
  },

  getStreamUrl: (mediaId: string): string => {
    return '/api/media/' + mediaId + '/stream';
  },

  listFavorites: async (): Promise<MediaRecord[]> => {
    return request<MediaRecord[]>('/favorites');
  },

  addFavorite: async (mediaId: string): Promise<{ status: string; media_id: string }> => {
    return request('/media/' + mediaId + '/favorite', { method: 'POST' });
  },

  removeFavorite: async (mediaId: string): Promise<{ status: string; media_id: string }> => {
    return request('/media/' + mediaId + '/favorite', { method: 'DELETE' });
  },

  trashMedia: async (
    mediaIds: string[],
  ): Promise<{ trashed_count: number; trashed_ids: string[] }> => {
    return request('/media/trash', {
      method: 'POST',
      body: JSON.stringify({ media_ids: mediaIds }),
    });
  },

  backfillDurations: async (): Promise<{ scanned: number; updated: number; failed: number }> => {
    return request('/media/backfill-durations', { method: 'POST' });
  },
};
