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
};
