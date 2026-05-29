import { createRequire } from 'module';
import type { VisibilityWindow } from 'shared/types.js';

// astronomy-engine is a CJS package without "type":"module", so named ESM imports
// fail under Node's static analysis. Load the CJS build directly via createRequire.
const _require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const astro: any = _require('astronomy-engine');
const { Observer, SearchRiseSet, Body, MakeTime, Horizon } = astro;

// Calculate sunset and sunrise times for a given location and date
export function calculateNightWindow(
  latitude: number,
  longitude: number,
  date: Date
): { sunset: Date; sunrise: Date } {
  const observer = new Observer(latitude, longitude, 0);

  // Find sunset on the given date
  const sunset = SearchRiseSet(
    Body.Sun,
    observer,
    -1, // -1 for set
    date,
    1 // Search within 1 day
  );

  if (!sunset) {
    throw new Error('Could not calculate sunset time');
  }

  // Find sunrise after sunset
  const sunrise = SearchRiseSet(
    Body.Sun,
    observer,
    +1, // +1 for rise
    sunset.date,
    1 // Search within 1 day
  );

  if (!sunrise) {
    throw new Error('Could not calculate sunrise time');
  }

  return {
    sunset: sunset.date,
    sunrise: sunrise.date,
  };
}

// Calculate altitude and azimuth for a celestial object at a given time
export function calculateAltAz(
  ra: number, // Right Ascension in degrees
  dec: number, // Declination in degrees
  latitude: number,
  longitude: number,
  time: Date
): { altitude: number; azimuth: number } {
  const observer = new Observer(latitude, longitude, 0);
  const astroTime = MakeTime(time);

  // Convert to horizontal coordinates
  const horizontal = Horizon(astroTime, observer, ra / 15, dec, 'normal');

  return {
    altitude: horizontal.altitude,
    azimuth: horizontal.azimuth,
  };
}

// Check if an object is visible during the night
// Returns visibility window and max altitude if visible, null otherwise
export function calculateVisibility(
  ra: number,
  dec: number,
  latitude: number,
  longitude: number,
  sunset: Date,
  sunrise: Date,
  minAltitude: number = 15 // Minimum altitude in degrees for observation
): {
  isVisible: boolean;
  visibilityWindow: VisibilityWindow | null;
  maxAltitude: number;
} {
  const nightDuration = sunrise.getTime() - sunset.getTime();
  const steps = 24; // Check every 30 minutes
  const stepSize = nightDuration / steps;

  let firstVisible: Date | null = null;
  let lastVisible: Date | null = null;
  let maxAlt = -90;

  for (let i = 0; i <= steps; i++) {
    const time = new Date(sunset.getTime() + i * stepSize);
    const { altitude } = calculateAltAz(ra, dec, latitude, longitude, time);

    if (altitude > maxAlt) {
      maxAlt = altitude;
    }

    if (altitude >= minAltitude) {
      if (!firstVisible) {
        firstVisible = time;
      }
      lastVisible = time;
    }
  }

  const isVisible = firstVisible !== null && lastVisible !== null;

  if (!isVisible) {
    return {
      isVisible: false,
      visibilityWindow: null,
      maxAltitude: maxAlt,
    };
  }

  const duration = ((lastVisible!.getTime() - firstVisible!.getTime()) / 3600000);

  return {
    isVisible: true,
    visibilityWindow: {
      start: firstVisible!.toISOString(),
      end: lastVisible!.toISOString(),
      duration: parseFloat(duration.toFixed(2)),
    },
    maxAltitude: parseFloat(maxAlt.toFixed(1)),
  };
}

// Calculate best observation time (when object is highest in sky)
export function calculateBestObservationTime(
  ra: number,
  dec: number,
  latitude: number,
  longitude: number,
  sunset: Date,
  sunrise: Date
): { time: Date; altitude: number } {
  const nightDuration = sunrise.getTime() - sunset.getTime();
  const steps = 48; // Check every 15 minutes
  const stepSize = nightDuration / steps;

  let bestTime = sunset;
  let bestAltitude = -90;

  for (let i = 0; i <= steps; i++) {
    const time = new Date(sunset.getTime() + i * stepSize);
    const { altitude } = calculateAltAz(ra, dec, latitude, longitude, time);

    if (altitude > bestAltitude) {
      bestAltitude = altitude;
      bestTime = time;
    }
  }

  return {
    time: bestTime,
    altitude: parseFloat(bestAltitude.toFixed(1)),
  };
}

// Convert Modified Julian Date to JavaScript Date
export function mjdToDate(mjd: number): Date {
  const JD = mjd + 2400000.5;
  return new Date((JD - 2440587.5) * 86400000);
}

// Convert JavaScript Date to Modified Julian Date
export function dateToMJD(date: Date): number {
  const JD = date.getTime() / 86400000 + 2440587.5;
  return JD - 2400000.5;
}

// Format time for display (e.g., "8:30 PM")
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
