import { request } from './client';
import { AlbumRecord, AlbumDetailResponse, CreateAlbumRequest } from '../types/album';

export const albumsApi = {
  listAlbums: async (): Promise<AlbumRecord[]> => {
    return request<AlbumRecord[]>('/albums');
  },

  createAlbum: async (req: CreateAlbumRequest): Promise<AlbumRecord> => {
    return request<AlbumRecord>('/albums', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  getAlbum: async (albumId: string): Promise<AlbumDetailResponse> => {
    return request<AlbumDetailResponse>('/albums/' + albumId);
  },

  addMediaToAlbum: async (albumId: string, mediaId: string): Promise<{ status: string }> => {
    return request('/albums/' + albumId + '/media', {
      method: 'POST',
      body: JSON.stringify({ media_id: mediaId }),
    });
  },

  removeMediaFromAlbum: async (albumId: string, mediaId: string): Promise<{ status: string }> => {
    return request('/albums/' + albumId + '/media/' + mediaId, {
      method: 'DELETE',
    });
  },

  deleteAlbum: async (albumId: string): Promise<{ status: string }> => {
    return request('/albums/' + albumId, {
      method: 'DELETE',
    });
  },
};
