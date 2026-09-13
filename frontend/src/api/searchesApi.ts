import { request, buildQueryString } from './client';
import { SavedSearchRecord, CreateSearchRequest, SearchResultsResponse } from '../types/savedSearch';

export const searchesApi = {
  listSavedSearches: async (): Promise<SavedSearchRecord[]> => {
    return request<SavedSearchRecord[]>('/searches');
  },

  createSavedSearch: async (req: CreateSearchRequest): Promise<SavedSearchRecord> => {
    return request<SavedSearchRecord>('/searches', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  getSavedSearch: async (id: string): Promise<SavedSearchRecord> => {
    return request<SavedSearchRecord>('/searches/' + id);
  },

  deleteSavedSearch: async (id: string): Promise<void> => {
    await request('/searches/' + id, { method: 'DELETE' });
  },

  getSearchResults: async (id: string, page: number = 1, limit: number = 50): Promise<SearchResultsResponse> => {
    const qs = buildQueryString({ page, limit });
    return request<SearchResultsResponse>('/searches/' + id + '/results' + qs);
  },
};
