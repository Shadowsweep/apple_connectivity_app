import { request, buildQueryString } from './client';
import { TimelineYearItem, TimelineMonthItem, TimelineMediaResponse } from '../types/timeline';

export const timelineApi = {
  getYears: async (): Promise<TimelineYearItem[]> => {
    return request<TimelineYearItem[]>('/timeline/years');
  },

  getMonths: async (year: string): Promise<TimelineMonthItem[]> => {
    const qs = buildQueryString({ year });
    return request<TimelineMonthItem[]>('/timeline/months' + qs);
  },

  getMedia: async (year: string, month?: string, page: number = 1, limit: number = 50): Promise<TimelineMediaResponse> => {
    const qs = buildQueryString({ year, month, page, limit });
    return request<TimelineMediaResponse>('/timeline/media' + qs);
  },
};
