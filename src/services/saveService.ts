import { Preferences } from '@capacitor/preferences';

const BEST_ALTITUDE_KEY = 'flydodo_best_altitude';

export async function loadBestAltitude(): Promise<number> {
  try {
    const { value } = await Preferences.get({ key: BEST_ALTITUDE_KEY });
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
  } catch (error) {
    console.error('Impossible de charger le meilleur score.', error);
    return 0;
  }
}

export async function saveBestAltitude(altitude: number): Promise<void> {
  try {
    await Preferences.set({
      key: BEST_ALTITUDE_KEY,
      value: String(Math.max(0, Math.floor(altitude))),
    });
  } catch (error) {
    console.error('Impossible de sauvegarder le meilleur score.', error);
  }
}
