import { antaresApi } from '../../services/antaresApi.js';
import { calculateNightWindow, calculateVisibility } from '../../utils/astronomy.js';
import getLogger from '../../util/getLogger.js';
import type { SearchResponsePagination, VisibleObject } from '../../types/index.js';

const log = getLogger('getTonightObjectsQuery');

const ANTARES_BATCH_SIZE = 500;

export interface TonightResult {
  location: { latitude: number; longitude: number };
  date: string;
  nightWindow: { sunset: string; sunrise: string };
  objects: VisibleObject[];
  count: number;
  pagination: SearchResponsePagination;
}

export async function getTonightObjectsQuery(
  latitude: number,
  longitude: number,
  date: Date,
  maxMagnitude: number,
  tags?: string[],
  cursor: number = 0,
  pageSize: number = 500,
  minAltitude: number = 15,
): Promise<TonightResult> {
  if (typeof latitude !== 'number' || latitude < -90 || latitude > 90) {
    throw new Error('Invalid latitude. Must be between -90 and 90.');
  }
  if (typeof longitude !== 'number' || longitude < -180 || longitude > 180) {
    throw new Error('Invalid longitude. Must be between -180 and 180.');
  }

  const safePageSize = Math.max(1, Math.min(500, Math.floor(pageSize)));
  const safeCursor = Math.max(0, Math.floor(cursor));

  log.info(`Searching for objects visible from (${latitude}, ${longitude}) on ${date.toISOString()}`);

  const { sunset, sunrise } = calculateNightWindow(latitude, longitude, date);
  log.info(`Night window: ${sunset.toISOString()} to ${sunrise.toISOString()}`);

  log.info(`Querying ANTARES for objects with magnitude <= ${maxMagnitude}, starting at cursor ${safeCursor}`);

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

  log.info(`${visibleObjects.length} objects are visible tonight (cursor ${safeCursor} → next ${nextCursor ?? 'end'})`);

  return {
    location: { latitude, longitude },
    date: date.toISOString(),
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
