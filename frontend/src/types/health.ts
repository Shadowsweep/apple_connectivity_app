export interface UnindexedItem {
  relative_path: string;
  filename: string;
  size_bytes: number;
}

export interface LibraryHealthResponse {
  total_active: number;
  missing_count: number;
  missing_items: any[];
  unindexed_count: number;
  unindexed_items: UnindexedItem[];
  is_healthy: boolean;
}
