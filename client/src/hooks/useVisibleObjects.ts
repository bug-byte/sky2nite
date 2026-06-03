import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import type { SearchRequest, SearchResponse } from 'shared/types';

export const useVisibleObjects = (
  request: SearchRequest | null,
  enabled: boolean = true
) => {
  return useQuery<SearchResponse, Error>({
    queryKey: ['visible-objects', request],
    queryFn: () => {
      if (!request) {
        throw new Error('Search request is required');
      }
      return api.searchVisibleObjects(request);
    },
    enabled: enabled && request !== null,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
};

export const useAvailableTags = (enabled: boolean = true) => {
  return useQuery<string[], Error>({
    queryKey: ['available-tags'],
    queryFn: () => api.getAvailableTags(),
    enabled,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    retry: 2,
  });
};

export const useAlertActivityCurves = (
  locusIds: string[],
  enabled: boolean = true,
) => {
  return useQuery<Record<string, number[]>, Error>({
    queryKey: ['alert-activity-curves', locusIds],
    queryFn: () => api.getAlertActivityCurves(locusIds),
    enabled: enabled && locusIds.length > 0,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
};
