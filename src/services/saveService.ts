import { Preferences } from '@capacitor/preferences';
import type { CosmeticCategory } from '../shop/shopCatalog';

const BEST_ALTITUDE_KEY = 'flydodo_best_altitude';
const PLAYER_PROFILE_KEY = 'flydodo_player_profile_v1';

export interface EquippedCosmetics {
  hat: string | null;
  glasses: string | null;
  scarf: string | null;
  shoes: string | null;
  outfit: string | null;
}

export interface PlayerProfile {
  watermelons: number;
  ownedItemIds: string[];
  equipped: EquippedCosmetics;
}

export type PurchaseStatus =
  | 'purchased'
  | 'already-owned'
  | 'not-enough-watermelons';

export interface PurchaseResult {
  status: PurchaseStatus;
  profile: PlayerProfile;
}

export type EquipStatus = 'equipped' | 'not-owned';

export interface EquipResult {
  status: EquipStatus;
  profile: PlayerProfile;
}

export type UnequipStatus = 'unequipped' | 'already-unequipped';

export interface UnequipResult {
  status: UnequipStatus;
  profile: PlayerProfile;
}

let profileCache: PlayerProfile | null = null;
let profileLoadPromise: Promise<PlayerProfile> | null = null;
let profileMutationQueue: Promise<void> = Promise.resolve();

function createEmptyEquippedCosmetics(): EquippedCosmetics {
  return {
    hat: null,
    glasses: null,
    scarf: null,
    shoes: null,
    outfit: null,
  };
}

export function createEmptyPlayerProfile(): PlayerProfile {
  return {
    watermelons: 0,
    ownedItemIds: [],
    equipped: createEmptyEquippedCosmetics(),
  };
}

function cloneProfile(profile: PlayerProfile): PlayerProfile {
  return {
    watermelons: profile.watermelons,
    ownedItemIds: [...profile.ownedItemIds],
    equipped: { ...profile.equipped },
  };
}

function normalizeProfile(value: unknown): PlayerProfile {
  if (!value || typeof value !== 'object') {
    return createEmptyPlayerProfile();
  }

  const source = value as Partial<PlayerProfile>;
  const equippedSource =
    source.equipped && typeof source.equipped === 'object'
      ? source.equipped
      : createEmptyEquippedCosmetics();

  const normalizeEquippedId = (itemId: unknown): string | null =>
    typeof itemId === 'string' && itemId.length > 0 ? itemId : null;

  return {
    watermelons:
      typeof source.watermelons === 'number' &&
      Number.isFinite(source.watermelons) &&
      source.watermelons > 0
        ? Math.floor(source.watermelons)
        : 0,
    ownedItemIds: Array.isArray(source.ownedItemIds)
      ? [...new Set(source.ownedItemIds.filter((id): id is string => typeof id === 'string'))]
      : [],
    equipped: {
      hat: normalizeEquippedId(equippedSource.hat),
      glasses: normalizeEquippedId(equippedSource.glasses),
      scarf: normalizeEquippedId(equippedSource.scarf),
      shoes: normalizeEquippedId(equippedSource.shoes),
      outfit: normalizeEquippedId(equippedSource.outfit),
    },
  };
}

async function persistProfile(profile: PlayerProfile): Promise<void> {
  profileCache = normalizeProfile(profile);

  try {
    await Preferences.set({
      key: PLAYER_PROFILE_KEY,
      value: JSON.stringify(profileCache),
    });
  } catch (error) {
    console.error('Impossible de sauvegarder le profil du joueur.', error);
  }
}

function enqueueProfileMutation<T>(operation: () => Promise<T>): Promise<T> {
  const result = profileMutationQueue.then(operation, operation);

  profileMutationQueue = result.then(
    () => undefined,
    () => undefined,
  );

  return result;
}

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

export async function loadPlayerProfile(): Promise<PlayerProfile> {
  if (profileCache) {
    return cloneProfile(profileCache);
  }

  if (!profileLoadPromise) {
    profileLoadPromise = (async () => {
      try {
        const { value } = await Preferences.get({ key: PLAYER_PROFILE_KEY });
        const parsed = value ? (JSON.parse(value) as unknown) : null;
        profileCache = normalizeProfile(parsed);
      } catch (error) {
        console.error('Impossible de charger le profil du joueur.', error);
        profileCache = createEmptyPlayerProfile();
      }

      return cloneProfile(profileCache);
    })();
  }

  return cloneProfile(await profileLoadPromise);
}

export async function loadLatestPlayerProfile(): Promise<PlayerProfile> {
  await profileMutationQueue;
  return loadPlayerProfile();
}

export function addWatermelons(amount: number): Promise<PlayerProfile> {
  const safeAmount = Math.max(0, Math.floor(amount));

  return enqueueProfileMutation(async () => {
    const current = await loadPlayerProfile();
    const next: PlayerProfile = {
      ...current,
      watermelons: current.watermelons + safeAmount,
    };

    await persistProfile(next);
    return cloneProfile(next);
  });
}

export function purchaseShopItem(
  itemId: string,
  price: number,
): Promise<PurchaseResult> {
  const safePrice = Math.max(0, Math.floor(price));

  return enqueueProfileMutation(async () => {
    const current = await loadPlayerProfile();

    if (current.ownedItemIds.includes(itemId)) {
      return {
        status: 'already-owned',
        profile: cloneProfile(current),
      };
    }

    if (current.watermelons < safePrice) {
      return {
        status: 'not-enough-watermelons',
        profile: cloneProfile(current),
      };
    }

    const next: PlayerProfile = {
      ...current,
      watermelons: current.watermelons - safePrice,
      ownedItemIds: [...current.ownedItemIds, itemId],
    };

    await persistProfile(next);

    return {
      status: 'purchased',
      profile: cloneProfile(next),
    };
  });
}

export function equipShopItem(
  itemId: string,
  category: CosmeticCategory,
): Promise<EquipResult> {
  return enqueueProfileMutation(async () => {
    const current = await loadPlayerProfile();

    if (!current.ownedItemIds.includes(itemId)) {
      return {
        status: 'not-owned',
        profile: cloneProfile(current),
      };
    }

    const next: PlayerProfile = {
      ...current,
      equipped: {
        ...current.equipped,
        [category]: itemId,
      },
    };

    await persistProfile(next);

    return {
      status: 'equipped',
      profile: cloneProfile(next),
    };
  });
}

export function unequipShopItem(
  itemId: string,
  category: CosmeticCategory,
): Promise<UnequipResult> {
  return enqueueProfileMutation(async () => {
    const current = await loadPlayerProfile();

    if (current.equipped[category] !== itemId) {
      return {
        status: 'already-unequipped',
        profile: cloneProfile(current),
      };
    }

    const next: PlayerProfile = {
      ...current,
      equipped: {
        ...current.equipped,
        [category]: null,
      },
    };

    await persistProfile(next);

    return {
      status: 'unequipped',
      profile: cloneProfile(next),
    };
  });
}
