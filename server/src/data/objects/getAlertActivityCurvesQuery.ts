import { antaresApi } from '../../services/antaresApi.js';

export type GetAlertActivityCurvesRequest = {
  locusIds?: string[];
}

export type GetAlertActivityCurvesResponse = {
  curves: Record<string, number[]>;
}

export async function getAlertActivityCurvesQuery(
  request: GetAlertActivityCurvesRequest,
): Promise<GetAlertActivityCurvesResponse> {
  const locusIds = Array.isArray(request.locusIds)
    ? [...new Set(request.locusIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0))]
    : [];

  const curves = await Promise.all(
    locusIds.map(async (locusId) => {
      try {
        const curve = await antaresApi.fetchAlertActivityCurve(locusId, 12);
        return [locusId, curve] as const;
      } catch {
        return [locusId, []] as const;
      }
    }),
  );

  return {
    curves: Object.fromEntries(curves),
  };
}