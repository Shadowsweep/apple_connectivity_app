import { request } from './client';

export interface FsEntry {
  name: string;
  path: string;
}

export interface FsBrowseResponse {
  current: string;
  parent: string | null;
  drives: string[];
  entries: FsEntry[];
}

export const fsApi = {
  browse: (path: string): Promise<FsBrowseResponse> =>
    request<FsBrowseResponse>('/fs/browse' + (path ? '?path=' + encodeURIComponent(path) : '')),
  mkdir: (parent: string, name: string): Promise<FsBrowseResponse> =>
    request<FsBrowseResponse>('/fs/mkdir', {
      method: 'POST',
      body: JSON.stringify({ parent, name }),
    }),
};
