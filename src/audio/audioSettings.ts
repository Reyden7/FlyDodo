export const AUDIO_CHANNELS = [
  { id: 'music', label: 'Musique' },
  { id: 'wings', label: 'Ailes' },
  { id: 'wind', label: 'Vent' },
  { id: 'thunder', label: 'Tonnerre' },
  { id: 'lightning', label: 'Éclairs' },
  { id: 'watermelon', label: 'Pastèques' },
  { id: 'damage', label: 'Dégâts' },
  { id: 'items', label: 'Objets' },
  { id: 'transition', label: 'Transitions' },
  { id: 'gameOver', label: 'Game Over' },
  { id: 'interface', label: 'Interface' },
] as const;

export type AudioChannel = (typeof AUDIO_CHANNELS)[number]['id'];
export type AudioSettings = Record<AudioChannel, number>;

const AUDIO_SETTINGS_STORAGE_KEY = 'flydodo:audio-settings:v1';
const audioSettingsEvents = new EventTarget();

const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  music: 1,
  wings: 1,
  wind: 1,
  thunder: 1,
  lightning: 1,
  watermelon: 1,
  damage: 1,
  items: 1,
  transition: 1,
  gameOver: 1,
  interface: 1,
};

function clampVolume(value: unknown, fallback = 1): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(1, Math.max(0, value))
    : fallback;
}

function readStoredAudioSettings(): AudioSettings {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_AUDIO_SETTINGS };
  }

  try {
    const stored = JSON.parse(
      window.localStorage.getItem(AUDIO_SETTINGS_STORAGE_KEY) ?? '{}',
    ) as Partial<AudioSettings>;

    return AUDIO_CHANNELS.reduce<AudioSettings>(
      (settings, { id }) => {
        settings[id] = clampVolume(stored[id], DEFAULT_AUDIO_SETTINGS[id]);
        return settings;
      },
      { ...DEFAULT_AUDIO_SETTINGS },
    );
  } catch {
    return { ...DEFAULT_AUDIO_SETTINGS };
  }
}

let currentAudioSettings = readStoredAudioSettings();

export function getAudioSettings(): AudioSettings {
  return { ...currentAudioSettings };
}

export function setAudioChannelVolume(
  channel: AudioChannel,
  volume: number,
): AudioSettings {
  currentAudioSettings = {
    ...currentAudioSettings,
    [channel]: clampVolume(volume),
  };

  try {
    window.localStorage.setItem(
      AUDIO_SETTINGS_STORAGE_KEY,
      JSON.stringify(currentAudioSettings),
    );
  } catch {
    // Le jeu continue avec le réglage en mémoire si le stockage est indisponible.
  }

  const snapshot = getAudioSettings();
  audioSettingsEvents.dispatchEvent(
    new CustomEvent<AudioSettings>('change', { detail: snapshot }),
  );
  return snapshot;
}

export function subscribeAudioSettings(
  listener: (settings: AudioSettings) => void,
): () => void {
  const onChange = (event: Event): void => {
    listener((event as CustomEvent<AudioSettings>).detail);
  };

  audioSettingsEvents.addEventListener('change', onChange);
  return () => audioSettingsEvents.removeEventListener('change', onChange);
}
