import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type {
  FilterPreset,
  CreateFilterPresetRequest,
  UpdateFilterPresetRequest,
} from 'shared/types';

const QUERY_KEY = ['filter-presets'];

export const useFilterPresets = (enabled: boolean = true) => {
  return useQuery<FilterPreset[], Error>({
    queryKey: QUERY_KEY,
    queryFn: () => api.getFilterPresets(),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

type SaveFilterPresetVariables = {
  id?: number;
  body: CreateFilterPresetRequest | UpdateFilterPresetRequest;
};

export const useSaveFilterPreset = () => {
  const queryClient = useQueryClient();
  return useMutation<FilterPreset, Error, SaveFilterPresetVariables>({
    mutationFn: ({ id, body }) => {
      if (id !== undefined) {
        return api.updateFilterPreset(id, body as UpdateFilterPresetRequest);
      }
      return api.createFilterPreset(body as CreateFilterPresetRequest);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
};

export const useDeleteFilterPreset = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: (id) => api.deleteFilterPreset(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
};
