import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type { SavedObservation, SaveObservationRequest, UpdateObservationRequest } from 'shared/types';

const QUERY_KEY = ['saved-observations'];

export const useSavedObservations = (enabled: boolean = true) => {
  return useQuery<SavedObservation[], Error>({
    queryKey: QUERY_KEY,
    queryFn: () => api.getObservations(),
    enabled,
    staleTime: 60 * 1000, // 1 minute
  });
};

export const useSaveObservation = () => {
  const queryClient = useQueryClient();
  return useMutation<SavedObservation, Error, SaveObservationRequest>({
    mutationFn: (body) => api.saveObservation(body),
    onMutate: async (body) => {
      // Cancel any in-flight refetches so they don't overwrite the optimistic update
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previous = queryClient.getQueryData<SavedObservation[]>(QUERY_KEY);
      // Optimistically mark this locusId as saved with a placeholder entry
      queryClient.setQueryData<SavedObservation[]>(QUERY_KEY, (old = []) => {
        // If already present (upsert case), don't duplicate
        if (old.some((o) => o.locusId === body.locusId)) return old;
        const placeholder: SavedObservation = {
          id: -1,
          userId: -1,
          locusId: body.locusId,
          ra: body.ra,
          dec: body.dec,
          magnitude: body.magnitude,
          tags: body.tags,
          visibilityWindow: body.visibilityWindow,
          maxAltitude: body.maxAltitude,
          objectIds: body.objectIds ?? {},
          antaresUrl: body.antaresUrl,
          notes: body.notes ?? '',
          savedAt: new Date().toISOString(),
        };
        return [placeholder, ...old];
      });
      return { previous };
    },
    onError: (_err, _body, context) => {
      // Roll back on failure
      const ctx = context as { previous?: SavedObservation[] } | undefined;
      if (ctx?.previous !== undefined) {
        queryClient.setQueryData(QUERY_KEY, ctx.previous);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
};

export const useDeleteObservation = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: (id) => api.deleteObservation(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
};

export const useUpdateObservation = () => {
  const queryClient = useQueryClient();
  return useMutation<SavedObservation, Error, { id: number; body: UpdateObservationRequest }>({
    mutationFn: ({ id, body }) => api.updateObservation(id, body),
    onSuccess: (updated) => {
      queryClient.setQueryData<SavedObservation[]>(QUERY_KEY, (old = []) =>
        old.map((o) => (o.id === updated.id ? updated : o)),
      );
    },
  });
};
