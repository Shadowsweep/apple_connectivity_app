import { MediaRecord } from './media';

export interface TimelineYearItem {
  year: string;
  count: number;
}

export interface TimelineMonthItem {
  month: string;
  count: number;
}

export interface TimelineMediaResponse {
  year: string;
  month?: string | null;
  items: MediaRecord[];
  count: number;
}
