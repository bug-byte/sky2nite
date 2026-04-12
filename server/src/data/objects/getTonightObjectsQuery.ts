import { antaresApi } from '../../services/antaresApi.js';
import { calculateNightWindow, calculateVisibility } from '../../utils/astronomy.js';
import getLogger from '../../util/getLogger.js';
import type { VisibleObject } from '../../types/index.js';

const log = getLogger('getTonightObjectsQuery');

export interface TonightResult {
  location: { latitude: number; longitude: number };
  date: string;
  nightWindow: { sunset: string; sunrise: string };
  objects: VisibleObject[];
  count: number;
}

export async function getTonightObjectsQuery(
  latitude: number,
  longitude: number,
  date: Date,
  maxMagnitude: number,
  tags?: string[]
): Promise<TonightResult> {
  if (typeof latitude !== 'number' || latitude < -90 || latitude > 90) {
    throw new Error('Invalid latitude. Must be between -90 and 90.');
  }
  if (typeof longitude !== 'number' || longitude < -180 || longitude > 180) {
    throw new Error('Invalid longitude. Must be between -180 and 180.');
  }

  log.info(`Searching for objects visible from (${latitude}, ${longitude}) on ${date.toISOString()}`);

  const { sunset, sunrise } = calculateNightWindow(latitude, longitude, date);
  log.info(`Night window: ${sunset.toISOString()} to ${sunrise.toISOString()}`);

  log.info(`Querying ANTARES for objects with magnitude <= ${maxMagnitude}`);
  const loci = await antaresApi.searchBrightObjects(maxMagnitude, tags);
  log.info(`Found ${loci.length} objects from ANTARES`);

  const visibleObjects: VisibleObject[] = [];

  for (const locus of loci) {
    const { isVisible, visibilityWindow, maxAltitude } = calculateVisibility(
      locus.ra,
      locus.dec,
      latitude,
      longitude,
      sunset,
      sunrise,
      15
    );

    if (isVisible && visibilityWindow) {
      visibleObjects.push({
        locusId: locus.locus_id,
        ra: locus.ra,
        dec: locus.dec,
        magnitude:
          locus.properties.brightest_alert_magnitude ??
          locus.properties.newest_alert_magnitude ??
          99,
        tags: locus.tags,
        visibilityWindow,
        maxAltitude,
        objectIds: {
          ztf: locus.properties.ztf_object_id,
          lsst: locus.properties.lsst_dia_object_id,
        },
        antaresUrl: `https://antares.noirlab.edu/loci/${locus.locus_id}`,
      });
    }
  }

  visibleObjects.sort((a, b) => b.visibilityWindow.duration - a.visibilityWindow.duration);

  log.info(`${visibleObjects.length} objects are visible tonight`);

  return {
    location: { latitude, longitude },
    date: date.toISOString(),
    nightWindow: {
      sunset: sunset.toISOString(),
      sunrise: sunrise.toISOString(),
    },
    objects: visibleObjects,
    count: visibleObjects.length,
  };
}
