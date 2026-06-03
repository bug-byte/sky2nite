import { antaresApi } from '../../services/antaresApi.js';
import { calculateNightWindow, calculateVisibility } from '../../util/astronomy.js';
import getLogger from '../../util/getLogger.js';
import type { SearchRequest, SearchResponse, SearchResponsePagination, VisibleObject } from 'shared/types.js';

const log = getLogger('getTonightObjectsQuery');

const ANTARES_BATCH_SIZE = 500;
const ALERT_ACTIVITY_SAMPLE_LIMIT = 12;
const ALERT_ACTIVITY_CONCURRENCY = 4;

export async function getTonightObjectsQuery(request: SearchRequest): Promise<SearchResponse> {
  const { latitude, longitude, filters = {}, pagination = {} } = request;

  if (typeof latitude !== 'number' || latitude < -90 || latitude > 90) {
    throw new Error('Invalid latitude. Must be between -90 and 90.');
  }
  if (typeof longitude !== 'number' || longitude < -180 || longitude > 180) {
    throw new Error('Invalid longitude. Must be between -180 and 180.');
  }

  const observationDate = request.date ? new Date(request.date) : new Date();
  if (isNaN(observationDate.getTime())) {
    throw new Error('Invalid date format.');
  }

  const maxMagnitude = filters.maxMagnitude ?? 14;
  const tags = filters.objectTypes;
  const minAltitude = filters.minAltitude ?? 15;
  const minAlerts = Math.max(0, Math.floor(filters.minAlerts ?? 5));
  const safePageSize = Math.max(1, Math.min(500, Math.floor(typeof pagination.pageSize === 'number' ? pagination.pageSize : 500)));
  const safeCursor = Math.max(0, Math.floor(typeof pagination.cursor === 'number' ? pagination.cursor : 0));
  const includeAlertActivity = request.includeAlertActivity === true;

  log.info(`Searching for objects visible from (${latitude}, ${longitude}) on ${observationDate.toISOString()}`);

  const { sunset, sunrise } = calculateNightWindow(latitude, longitude, observationDate);
  log.info(`Night window: ${sunset.toISOString()} to ${sunrise.toISOString()}`);

  log.info(`Querying ANTARES for objects with magnitude <= ${maxMagnitude}, alerts >= ${minAlerts}, starting at cursor ${safeCursor}`);

  const visibleObjects: VisibleObject[] = [];
  let antaresTotalLoci = 0;
  let hasMoreFromAntares = true;
  let antaresOffset = safeCursor;
  // nextCursor tracks the exact ANTARES offset the next page should start from.
  let nextCursor: number | null = null;

  outer: while (visibleObjects.length < safePageSize && hasMoreFromAntares) {
    const batch = await antaresApi.fetchLociAtOffset(antaresOffset, ANTARES_BATCH_SIZE);
    antaresTotalLoci = batch.antaresTotalLoci;
    hasMoreFromAntares = batch.hasNextPage;

    for (let i = 0; i < batch.loci.length; i++) {
      const locus = batch.loci[i];

      // Magnitude filter (API sorts but doesn't filter by value)
      const mag = locus.properties.brightest_alert_magnitude ?? locus.properties.newest_alert_magnitude;
      if (mag === undefined || mag > maxMagnitude) continue;

      const numAlerts = locus.properties.num_alerts ?? 0;
      if (numAlerts < minAlerts) continue;

      // Tag filter — the ANTARES API filter[tag] is not exclusive, so enforce it here.
      // A locus must contain ALL of the requested tags.
      if (tags && tags.length > 0 && !tags.every(t => locus.tags.includes(t))) continue;

      const { isVisible, visibilityWindow, maxAltitude } = calculateVisibility(
        locus.ra,
        locus.dec,
        latitude,
        longitude,
        sunset,
        sunrise,
        minAltitude,
      );

      if (isVisible && visibilityWindow) {
        visibleObjects.push({
          locusId: locus.locus_id,
          ra: locus.ra,
          dec: locus.dec,
          magnitude: mag,
          numAlerts,
          tags: locus.tags,
          visibilityWindow,
          maxAltitude,
          objectIds: {
            ztf: locus.properties.ztf_object_id,
            lsst: locus.properties.lsst_dia_object_id,
          },
          antaresUrl: `https://antares.noirlab.edu/loci/${locus.locus_id}`,
        });

        if (visibleObjects.length >= safePageSize) {
          // Record exact offset of the item after the one that filled the page.
          nextCursor = antaresOffset + i + 1;
          break outer;
        }
      }
    }

    // Finished processing this entire batch — advance to the next.
    antaresOffset += batch.loci.length;
  }

  // If we exhausted ANTARES before filling the page, there is no next page.
  if (nextCursor === null) {
    nextCursor = hasMoreFromAntares ? antaresOffset : null;
    if (!hasMoreFromAntares) nextCursor = null;
  }

  const hasNextPage = nextCursor !== null;

  visibleObjects.sort((a, b) => b.visibilityWindow.duration - a.visibilityWindow.duration);

  if (includeAlertActivity && visibleObjects.length > 0) {
    const enrichedObjects: VisibleObject[] = [];

    for (let index = 0; index < visibleObjects.length; index += ALERT_ACTIVITY_CONCURRENCY) {
      const chunk = visibleObjects.slice(index, index + ALERT_ACTIVITY_CONCURRENCY);
      const chunkResults = await Promise.all(
        chunk.map(async (object) => {
          try {
            return {
              ...object,
              alertActivityCurve: await antaresApi.fetchAlertActivityCurve(
                object.locusId,
                Math.max(1, Math.min(ALERT_ACTIVITY_SAMPLE_LIMIT, object.numAlerts ?? ALERT_ACTIVITY_SAMPLE_LIMIT)),
              ),
            };
          } catch (error) {
            log.warn(`Failed to fetch alert activity curve for ${object.locusId}: ${error instanceof Error ? error.message : String(error)}`);
            return object;
          }
        }),
      );

      enrichedObjects.push(...chunkResults);
    }

    visibleObjects.splice(0, visibleObjects.length, ...enrichedObjects);
  }

  log.info(`${visibleObjects.length} objects are visible tonight (cursor ${safeCursor} → next ${nextCursor ?? 'end'})`);

  return {
    location: { latitude, longitude },
    date: observationDate.toISOString(),
    nightWindow: {
      sunset: sunset.toISOString(),
      sunrise: sunrise.toISOString(),
    },
    objects: visibleObjects,
    count: visibleObjects.length,
    pagination: {
      pageSize: safePageSize,
      hasNextPage,
      nextCursor,
      antaresTotalLoci,
    },
  };
}
