import { MediaType } from './media';

export interface MediaFilters {
  mediaType?: MediaType | 'ALL';
  startDate?: string;
  endDate?: string;
  importStartDate?: string;
  importEndDate?: string;
  minSize?: number;
  maxSize?: number;
  minDuration?: number;
  maxDuration?: number;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  extension?: string;
  favorite?: boolean;
  albumId?: string;
  status?: string;
  search?: string;
  sort?: 'newest' | 'oldest' | 'imported_newest' | 'imported_oldest' | 'size_desc' | 'size_asc' | 'duration_desc' | 'name_asc' | 'name_desc';
  page?: number;
  limit?: number;
}

export function filtersToParams(filters: MediaFilters): Record<string, string> {
  const params: Record<string, string> = {};

  if (filters.mediaType && filters.mediaType !== 'ALL') params.type = filters.mediaType;
  if (filters.startDate) params.start_date = filters.startDate;
  if (filters.endDate) params.end_date = filters.endDate;
  if (filters.importStartDate) params.import_start_date = filters.importStartDate;
  if (filters.importEndDate) params.import_end_date = filters.importEndDate;
  if (filters.minSize !== undefined && filters.minSize > 0) params.min_size = String(filters.minSize);
  if (filters.maxSize !== undefined && filters.maxSize > 0) params.max_size = String(filters.maxSize);
  if (filters.minDuration !== undefined && filters.minDuration > 0) params.min_duration = String(filters.minDuration);
  if (filters.maxDuration !== undefined && filters.maxDuration > 0) params.max_duration = String(filters.maxDuration);
  if (filters.minWidth !== undefined && filters.minWidth > 0) params.min_width = String(filters.minWidth);
  if (filters.maxWidth !== undefined && filters.maxWidth > 0) params.max_width = String(filters.maxWidth);
  if (filters.minHeight !== undefined && filters.minHeight > 0) params.min_height = String(filters.minHeight);
  if (filters.maxHeight !== undefined && filters.maxHeight > 0) params.max_height = String(filters.maxHeight);
  if (filters.extension) params.extension = filters.extension;
  if (filters.favorite !== undefined) params.favorite = String(filters.favorite);
  if (filters.albumId) params.album_id = filters.albumId;
  if (filters.status) params.status = filters.status;
  if (filters.search) params.search = filters.search;
  if (filters.sort) params.sort = filters.sort;
  if (filters.page) params.page = String(filters.page);
  if (filters.limit) params.limit = String(filters.limit);

  return params;
}

export function paramsToFilters(searchParams: URLSearchParams): MediaFilters {
  const filters: MediaFilters = {};

  const type = searchParams.get('type') || searchParams.get('mediaType');
  if (type) filters.mediaType = type as any;

  const start = searchParams.get('start_date') || searchParams.get('startDate');
  if (start) filters.startDate = start;

  const end = searchParams.get('end_date') || searchParams.get('endDate');
  if (end) filters.endDate = end;

  const minSz = searchParams.get('min_size') || searchParams.get('minSize');
  if (minSz) filters.minSize = parseInt(minSz, 10);

  const maxSz = searchParams.get('max_size') || searchParams.get('maxSize');
  if (maxSz) filters.maxSize = parseInt(maxSz, 10);

  const ext = searchParams.get('extension');
  if (ext) filters.extension = ext;

  const fav = searchParams.get('favorite');
  if (fav !== null) filters.favorite = fav === 'true';

  const album = searchParams.get('album_id') || searchParams.get('albumId');
  if (album) filters.albumId = album;

  const s = searchParams.get('search');
  if (s) filters.search = s;

  const sort = searchParams.get('sort');
  if (sort) filters.sort = sort as any;

  const page = searchParams.get('page');
  if (page) filters.page = parseInt(page, 10);

  return filters;
}
