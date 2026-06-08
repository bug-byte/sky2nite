import { antaresApi } from '../../services/antaresApi.js';
import { calculateNightWindow, calculateVisibility, calculateBestObservationTime } from '../../util/astronomy.js';
import getLogger from '../../util/getLogger.js';
import type { SearchRequest, SearchResponse, VisibleObject } from 'shared/types.js';

const log = getLogger('getTonightObjectsQuery');

const ANTARES_BATCH_SIZE = 500;
const ALERT_ACTIVITY_SAMPLE_LIMIT = 12;
const ALERT_ACTIVITY_CONCURRENCY = 4;

/** Format a Date as an ISO string, defaulting to now if falsy. */
function toDate(input: string | null | undefined): Date {
  const d = input ? new Date(input) : new Date();
  if (isNaN(d.getTime())) throw new Error('Invalid date format.');
  return d;
}

/** Build a VisibleObject from a raw ANTARES locus (no visibility info yet). */
function locusToVisibleObject(locus: Awaited<ReturnType<typeof antaresApi.fetchLociAtOffset>>['loci'][number]): VisibleObject {
  const mag = locus.properties.brightest_alert_magnitude ?? locus.properties.newest_alert_magnitude ?? 99;
  return {
    locusId: locus.locus_id,
    ra: locus.ra,
    dec: locus.dec,
    magnitude: mag,
    numAlerts: locus.properties.num_alerts ?? 0,
    tags: locus.tags,
    visibilityWindow: { start: '', end: '', duration: 0 },
    maxAltitude: 0,
    objectIds: {
      ztf: locus.properties.ztf_object_id,
      lsst: locus.properties.lsst_dia_object_id,
    },
    antaresUrl: `https://antares.noirlab.edu/loci/${locus.locus_id}`,
  };
}

// ─── Name-only search (no lat/lng required) ────────────────────────────────

async function searchByName(
  name: string,
  latitude: number | undefined,
  longitude: number | undefined,
  observationDate: Date,
  minAltitude: number,
  safePageSize: number,
): Promise<{ objects: VisibleObject[]; totalCount: number }> {
  const batch = await antaresApi.fetchLociByName(name, safePageSize);
  const objects: VisibleObject[] = [];

  for (const locus of batch.loci) {
    const obj = locusToVisibleObject(locus);

    if (typeof latitude === 'number' && typeof longitude === 'number') {
      // Location provided – calculate real visibility.
      const { sunset, sunrise } = calculateNightWindow(latitude, longitude, observationDate);
      const { isVisible, visibilityWindow, maxAltitude } = calculateVisibility(
        locus.ra,
        locus.dec,
        latitude,
        longitude,
        sunset,
        sunrise,
        minAltitude,
      );
      if (!isVisible || !visibilityWindow) continue;

      const { time: transitDate } = calculateBestObservationTime(
        locus.ra,
        locus.dec,
        latitude,
        longitude,
        sunset,
        sunrise,
      );
      obj.visibilityWindow = visibilityWindow;
      obj.maxAltitude = maxAltitude;
      obj.transitTime = transitDate.toISOString();
    } else {
      // No location – fill placeholder visibility so the object can be rendered.
      // Use a generous 24 h window centred on the observation date.
      const dayStart = new Date(observationDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);
      obj.visibilityWindow = {
        start: dayStart.toISOString(),
        end: dayEnd.toISOString(),
        duration: 24,
      };
      obj.maxAltitude = 90;
    }

    objects.push(obj);
  }

  return { objects, totalCount: batch.antaresTotalLoci };
}

// ─── Normal location-based search ──────────────────────────────────────────

async function searchByLocation(
  latitude: number,
  longitude: number,
  observationDate: Date,
  maxMagnitude: number,
  tags: string[] | undefined,
  minAltitude: number,
  minAlerts: number,
  safePageSize: number,
  safeCursor: number,
  includeAlertActivity: boolean,
): Promise<{
  objects: VisibleObject[];
  sunset: Date;
  sunrise: Date;
  antaresTotalLoci: number;
  nextCursor: number | null;
}> {
  const { sunset, sunrise } = calculateNightWindow(latitude, longitude, observationDate);
  log.info(`Night window: ${sunset.toISOString()} to ${sunrise.toISOString()}`);

  const visibleObjects: VisibleObject[] = [];
  let antaresTotalLoci = 0;
  let hasMoreFromAntares = true;
  let antaresOffset = safeCursor;
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
        const { time: transitDate } = calculateBestObservationTime(
          locus.ra,
          locus.dec,
          latitude,
          longitude,
          sunset,
          sunrise,
        );

        visibleObjects.push({
          locusId: locus.locus_id,
          ra: locus.ra,
          dec: locus.dec,
          magnitude: mag,
          numAlerts,
          tags: locus.tags,
          visibilityWindow,
          maxAltitude,
          transitTime: transitDate.toISOString(),
          objectIds: {
            ztf: locus.properties.ztf_object_id,
            lsst: locus.properties.lsst_dia_object_id,
          },
          antaresUrl: `https://antares.noirlab.edu/loci/${locus.locus_id}`,
        });

        if (visibleObjects.length >= safePageSize) {
          nextCursor = antaresOffset + i + 1;
          break outer;
        }
      }
    }

    antaresOffset += batch.loci.length;
  }

  if (nextCursor === null) {
    nextCursor = hasMoreFromAntares ? antaresOffset : null;
    if (!hasMoreFromAntares) nextCursor = null;
  }

  // Enrich with alert activity curves if requested
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

  return { objects: visibleObjects, sunset, sunrise, antaresTotalLoci, nextCursor };
}

// ─── Main entry point ──────────────────────────────────────────────────────

export async function getTonightObjectsQuery(request: SearchRequest): Promise<SearchResponse> {
  const { latitude, longitude, filters = {}, pagination = {} } = request;
  const locusName = filters.locusName?.trim();
  const observationDate = toDate(request.date);

  const maxMagnitude = filters.maxMagnitude ?? 14;
  const tags = filters.objectTypes;
  const minAltitude = filters.minAltitude ?? 15;
  const minAlerts = Math.max(0, Math.floor(filters.minAlerts ?? 5));
  const safePageSize = Math.max(1, Math.min(500, Math.floor(typeof pagination.pageSize === 'number' ? pagination.pageSize : 500)));
  const safeCursor = Math.max(0, Math.floor(typeof pagination.cursor === 'number' ? pagination.cursor : 0));
  const includeAlertActivity = request.includeAlertActivity === true;

  // ── Name-search mode (lat/lng optional) ────────────────────────────────
  if (locusName) {
    // Validate lat/lng only if they were actually provided
    if (latitude !== undefined) {
      if (typeof latitude !== 'number' || latitude < -90 || latitude > 90) {
        throw new Error('Invalid latitude. Must be between -90 and 90.');
      }
    }
    if (longitude !== undefined) {
      if (typeof longitude !== 'number' || longitude < -180 || longitude > 180) {
        throw new Error('Invalid longitude. Must be between -180 and 180.');
      }
    }

    log.info(`Searching by name "${locusName}" (lat=${latitude}, lng=${longitude})`);

    const { objects, totalCount } = await searchByName(
      locusName,
      latitude,
      longitude,
      observationDate,
      minAltitude,
      safePageSize,
    );

    const responseLat = typeof latitude === 'number' ? latitude : 0;
    const responseLng = typeof longitude === 'number' ? longitude : 0;

    return {
      location: { latitude: responseLat, longitude: responseLng },
      date: observationDate.toISOString(),
      nightWindow: {
        sunset: observationDate.toISOString(),
        sunrise: observationDate.toISOString(),
      },
      objects,
      count: objects.length,
      pagination: {
        pageSize: safePageSize,
        hasNextPage: false,
        nextCursor: null,
        antaresTotalLoci: totalCount,
      },
    };
  }

  // ── Standard location-based search ─────────────────────────────────────
  if (typeof latitude !== 'number' || latitude < -90 || latitude > 90) {
    throw new Error('Invalid latitude. Must be between -90 and 90.');
  }
  if (typeof longitude !== 'number' || longitude < -180 || longitude > 180) {
    throw new Error('Invalid longitude. Must be between -180 and 180.');
  }

  log.info(`Searching for objects visible from (${latitude}, ${longitude}) on ${observationDate.toISOString()}`);
  log.info(`Querying ANTARES for objects with magnitude <= ${maxMagnitude}, alerts >= ${minAlerts}, starting at cursor ${safeCursor}`);

  const result = await searchByLocation(
    latitude,
    longitude,
    observationDate,
    maxMagnitude,
    tags,
    minAltitude,
    minAlerts,
    safePageSize,
    safeCursor,
    includeAlertActivity,
  );

  log.info(`${result.objects.length} objects are visible tonight (cursor ${safeCursor} → next ${result.nextCursor ?? 'end'})`);

  return {
    location: { latitude, longitude },
    date: observationDate.toISOString(),
    nightWindow: {
      sunset: result.sunset.toISOString(),
      sunrise: result.sunrise.toISOString(),
    },
    objects: result.objects,
    count: result.objects.length,
    pagination: {
      pageSize: safePageSize,
      hasNextPage: result.nextCursor !== null,
      nextCursor: result.nextCursor,
      antaresTotalLoci: result.antaresTotalLoci,
    },
  };
}
