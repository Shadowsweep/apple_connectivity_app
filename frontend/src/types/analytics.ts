import { MediaRecord } from './media';

export interface ExtensionBreakdown {
  extension: string;
  count: number;
  size_bytes: number;
}

export interface YearBreakdown {
  year: string;
  count: number;
  size_bytes: number;
}

export interface SizeRangeBreakdown {
  label: string;
  count: number;
  size_bytes: number;
}

export interface StorageAnalyticsResponse {
  total_media_count: number;
  total_media_bytes: number;
  avg_file_size_bytes: number;
  photo_count: number;
  photo_bytes: number;
  video_count: number;
  video_bytes: number;
  other_count: number;
  other_bytes: number;
  thumbnail_bytes: number;
  by_extension: ExtensionBreakdown[];
  by_year: YearBreakdown[];
  by_size_range: SizeRangeBreakdown[];
  largest_files: MediaRecord[];
}
