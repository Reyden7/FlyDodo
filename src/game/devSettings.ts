export const DEV_START_ALTITUDE_MIN = 0;
export const DEV_START_ALTITUDE_MAX = 10_000;
export const DEV_START_ALTITUDE_STEP = 50;

const DEV_START_ALTITUDE_STORAGE_KEY = 'flydodo:dev-start-altitude:v1';

function clampStartAltitude(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEV_START_ALTITUDE_MIN;
  }

  const steppedValue =
    Math.round(value / DEV_START_ALTITUDE_STEP) * DEV_START_ALTITUDE_STEP;

  return Math.min(
    DEV_START_ALTITUDE_MAX,
    Math.max(DEV_START_ALTITUDE_MIN, steppedValue),
  );
}

export function getDevStartAltitude(): number {
  if (!import.meta.env.DEV || typeof window === 'undefined') {
    return DEV_START_ALTITUDE_MIN;
  }

  try {
    return clampStartAltitude(
      Number(window.localStorage.getItem(DEV_START_ALTITUDE_STORAGE_KEY)),
    );
  } catch {
    return DEV_START_ALTITUDE_MIN;
  }
}

export function setDevStartAltitude(altitude: number): number {
  const nextAltitude = clampStartAltitude(altitude);

  if (!import.meta.env.DEV || typeof window === 'undefined') {
    return DEV_START_ALTITUDE_MIN;
  }

  try {
    window.localStorage.setItem(
      DEV_START_ALTITUDE_STORAGE_KEY,
      String(nextAltitude),
    );
  } catch {
    // Le réglage reste simplement indisponible si le stockage local est bloqué.
  }

  return nextAltitude;
}
