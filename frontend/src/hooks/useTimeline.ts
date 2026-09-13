import { useQuery } from '@tanstack/react-query';
import { timelineApi } from '../api/timelineApi';

export function useTimelineYears() {
  return useQuery({
    queryKey: ['timeline', 'years'],
    queryFn: () => timelineApi.getYears(),
  });
}

export function useTimelineMonths(year: string | null) {
  return useQuery({
    queryKey: ['timeline', 'months', year],
    queryFn: () => (year ? timelineApi.getMonths(year) : []),
    enabled: !!year,
  });
}

export function useTimelineMedia(year: string | null, month?: string | null, page: number = 1) {
  return useQuery({
    queryKey: ['timeline', 'media', year, month, page],
    queryFn: () => (year ? timelineApi.getMedia(year, month || undefined, page, 60) : null),
    enabled: !!year,
  });
}
