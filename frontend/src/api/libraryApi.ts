import { request } from './client';
import { LibraryInfo, JobCreatedResponse, HealthStatus } from '../types/library';

export const libraryApi = {
  getLibrary: async (): Promise<LibraryInfo> => {
    return request<LibraryInfo>('/library');
  },

  triggerIndex: async (): Promise<JobCreatedResponse> => {
    return request<JobCreatedResponse>('/library/index', { method: 'POST' });
  },

  triggerRebuildIndex: async (): Promise<JobCreatedResponse> => {
    return request<JobCreatedResponse>('/library/rebuild-index', { method: 'POST' });
  },

  getHealth: async (): Promise<HealthStatus> => {
    return request<HealthStatus>('/health');
  },

  setLibraryPath: async (path: string): Promise<LibraryInfo> => {
    return request<LibraryInfo>('/library/path', {
      method: 'POST',
      body: JSON.stringify({ path }),
    });
  },

  setAccent: async (accent: string, hover: string): Promise<void> => {
    await request('/ui/accent', {
      method: 'PUT',
      body: JSON.stringify({ accent, hover }),
    });
  },

  getVaultFolders: async (): Promise<{ vault_root: string; folders: { name: string; relative_path: string }[] }> => {
    return request('/vault/folders');
  },

  createVaultFolder: async (name: string, parent = ''): Promise<{ name: string; relative_path: string }> => {
    return request('/vault/folders', {
      method: 'POST',
      body: JSON.stringify({ parent, name }),
    });
  },

  moveMediaToVaultFolder: async (
    media_ids: string[],
    target_folder = '',
    copy_media = false
  ): Promise<{ moved_count: number; moved_ids: string[]; target_folder: string }> => {
    return request('/vault/move-media', {
      method: 'POST',
      body: JSON.stringify({ media_ids, target_folder, copy_media }),
    });
  },
};
