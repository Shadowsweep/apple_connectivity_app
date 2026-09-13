import { MediaRecord } from './media';
import { MediaFilters } from './filters';

export interface SavedSearchRecord {
  id: string;
  name: string;
  query: MediaFilters;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CreateSearchRequest {
  name: string;
  query: MediaFilters;
}

export interface SearchResultsResponse {
  search: SavedSearchRecord;
  items: MediaRecord[];
  count: number;
  total: number;
}
