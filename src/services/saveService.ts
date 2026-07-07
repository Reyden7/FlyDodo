import { Preferences } from '@capacitor/preferences';
import type { CosmeticCategory } from '../shop/shopCatalog';
import {
  CONTROL_MASTER_COST,
  CONTROL_TALENT_MAX_LEVEL,
  cloneControlTalentState,
  createEmptyControlTalentState,
  getControlTalentDefinition,
  normalizeControlTalentState,
  type ControlTalentId,
  type ControlTalentState,
} from '../talents/controlTalents';
import {
  ENDURANCE_PHOENIX_COST,
  ENDURANCE_TALENT_MAX_LEVEL_BY_ID,
  areAllEnduranceTalentsMaxed,
  canRefundEnduranceTalentLevel,
  cloneEnduranceTalentState,
  createEmptyEnduranceTalentState,
  getEnduranceTalentDefinition,
  isEnduranceTalentUnlocked,
  normalizeEnduranceTalentState,
  type EnduranceTalentId,
  type EnduranceTalentState,
} from '../talents/enduranceTalents';
import {
  BLUE_FEAST_COST,
  BLUE_TALENT_MAX_LEVEL_BY_ID,
  areAllBlueTalentsMaxed,
  canRefundBlueTalentLevel,
  cloneBlueTalentState,
  createEmptyBlueTalentState,
  getBlueTalentDefinition,
  isBlueTalentUnlocked,
  normalizeBlueTalentState,
  type BlueTalentId,
  type BlueTalentState,
} from '../talents/blueTalents';

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
  controlTalents: ControlTalentState;
  enduranceTalents: EnduranceTalentState;
  blueTalents: BlueTalentState;
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

export type TalentPurchaseStatus =
  | 'purchased'
  | 'already-maxed'
  | 'not-enough-watermelons'
  | 'locked';

export interface TalentPurchaseResult {
  status: TalentPurchaseStatus;
  profile: PlayerProfile;
}

export type TalentRefundStatus = 'refunded' | 'not-refundable';

export interface TalentRefundResult {
  status: TalentRefundStatus;
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
    controlTalents: createEmptyControlTalentState(),
    enduranceTalents: createEmptyEnduranceTalentState(),
    blueTalents: createEmptyBlueTalentState(),
  };
}

function cloneProfile(profile: PlayerProfile): PlayerProfile {
  return {
    watermelons: profile.watermelons,
    ownedItemIds: [...profile.ownedItemIds],
    equipped: { ...profile.equipped },
    controlTalents: cloneControlTalentState(profile.controlTalents),
    enduranceTalents: cloneEnduranceTalentState(profile.enduranceTalents),
    blueTalents: cloneBlueTalentState(profile.blueTalents),
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
    controlTalents: normalizeControlTalentState(source.controlTalents),
    enduranceTalents: normalizeEnduranceTalentState(source.enduranceTalents),
    blueTalents: normalizeBlueTalentState(source.blueTalents),
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

export function purchaseControlTalentLevel(
  talentId: ControlTalentId,
): Promise<TalentPurchaseResult> {
  return enqueueProfileMutation(async () => {
    const current = await loadPlayerProfile();

    if (current.controlTalents.master) {
      return {
        status: 'already-maxed',
        profile: cloneProfile(current),
      };
    }

    const currentLevel = current.controlTalents.levels[talentId];

    if (currentLevel >= CONTROL_TALENT_MAX_LEVEL) {
      return {
        status: 'already-maxed',
        profile: cloneProfile(current),
      };
    }

    const definition = getControlTalentDefinition(talentId);
    const price = definition.costs[currentLevel] ?? 0;

    if (current.watermelons < price) {
      return {
        status: 'not-enough-watermelons',
        profile: cloneProfile(current),
      };
    }

    const next: PlayerProfile = {
      ...current,
      watermelons: current.watermelons - price,
      controlTalents: {
        ...current.controlTalents,
        levels: {
          ...current.controlTalents.levels,
          [talentId]: currentLevel + 1,
        },
      },
    };

    await persistProfile(next);

    return {
      status: 'purchased',
      profile: cloneProfile(next),
    };
  });
}

export function purchaseControlMasterTalent(): Promise<TalentPurchaseResult> {
  return enqueueProfileMutation(async () => {
    const current = await loadPlayerProfile();

    if (current.controlTalents.master) {
      return {
        status: 'already-maxed',
        profile: cloneProfile(current),
      };
    }

    const hasAllControlLevels = Object.values(current.controlTalents.levels).every(
      (level) => level >= CONTROL_TALENT_MAX_LEVEL,
    );

    if (!hasAllControlLevels) {
      return {
        status: 'locked',
        profile: cloneProfile(current),
      };
    }

    if (current.watermelons < CONTROL_MASTER_COST) {
      return {
        status: 'not-enough-watermelons',
        profile: cloneProfile(current),
      };
    }

    const next: PlayerProfile = {
      ...current,
      watermelons: current.watermelons - CONTROL_MASTER_COST,
      controlTalents: {
        ...current.controlTalents,
        master: true,
      },
    };

    await persistProfile(next);

    return {
      status: 'purchased',
      profile: cloneProfile(next),
    };
  });
}

export function refundControlTalentLevel(
  talentId: ControlTalentId,
): Promise<TalentRefundResult> {
  return enqueueProfileMutation(async () => {
    const current = await loadPlayerProfile();

    if (current.controlTalents.master) {
      return {
        status: 'not-refundable',
        profile: cloneProfile(current),
      };
    }

    const currentLevel = current.controlTalents.levels[talentId];

    if (currentLevel <= 0) {
      return {
        status: 'not-refundable',
        profile: cloneProfile(current),
      };
    }

    const definition = getControlTalentDefinition(talentId);
    const refund = Math.floor((definition.costs[currentLevel - 1] ?? 0) / 2);

    const next: PlayerProfile = {
      ...current,
      watermelons: current.watermelons + refund,
      controlTalents: {
        ...current.controlTalents,
        levels: {
          ...current.controlTalents.levels,
          [talentId]: currentLevel - 1,
        },
      },
    };

    await persistProfile(next);

    return {
      status: 'refunded',
      profile: cloneProfile(next),
    };
  });
}

export function refundControlMasterTalent(): Promise<TalentRefundResult> {
  return enqueueProfileMutation(async () => {
    const current = await loadPlayerProfile();

    if (!current.controlTalents.master) {
      return {
        status: 'not-refundable',
        profile: cloneProfile(current),
      };
    }

    const next: PlayerProfile = {
      ...current,
      watermelons: current.watermelons + Math.floor(CONTROL_MASTER_COST / 2),
      controlTalents: {
        ...current.controlTalents,
        master: false,
      },
    };

    await persistProfile(next);

    return {
      status: 'refunded',
      profile: cloneProfile(next),
    };
  });
}

export function purchaseEnduranceTalentLevel(
  talentId: EnduranceTalentId,
): Promise<TalentPurchaseResult> {
  return enqueueProfileMutation(async () => {
    const current = await loadPlayerProfile();

    if (current.enduranceTalents.phoenix) {
      return {
        status: 'already-maxed',
        profile: cloneProfile(current),
      };
    }

    const currentLevel = current.enduranceTalents.levels[talentId];
    const maxLevel = ENDURANCE_TALENT_MAX_LEVEL_BY_ID[talentId];

    if (currentLevel >= maxLevel) {
      return {
        status: 'already-maxed',
        profile: cloneProfile(current),
      };
    }

    const definition = getEnduranceTalentDefinition(talentId);

    if (!isEnduranceTalentUnlocked(current.enduranceTalents, definition)) {
      return {
        status: 'locked',
        profile: cloneProfile(current),
      };
    }

    const price = definition.costs[currentLevel] ?? 0;

    if (current.watermelons < price) {
      return {
        status: 'not-enough-watermelons',
        profile: cloneProfile(current),
      };
    }

    const next: PlayerProfile = {
      ...current,
      watermelons: current.watermelons - price,
      enduranceTalents: {
        ...current.enduranceTalents,
        levels: {
          ...current.enduranceTalents.levels,
          [talentId]: currentLevel + 1,
        },
      },
    };

    await persistProfile(next);

    return {
      status: 'purchased',
      profile: cloneProfile(next),
    };
  });
}

export function purchaseEndurancePhoenixTalent(): Promise<TalentPurchaseResult> {
  return enqueueProfileMutation(async () => {
    const current = await loadPlayerProfile();

    if (current.enduranceTalents.phoenix) {
      return {
        status: 'already-maxed',
        profile: cloneProfile(current),
      };
    }

    if (!areAllEnduranceTalentsMaxed(current.enduranceTalents)) {
      return {
        status: 'locked',
        profile: cloneProfile(current),
      };
    }

    if (current.watermelons < ENDURANCE_PHOENIX_COST) {
      return {
        status: 'not-enough-watermelons',
        profile: cloneProfile(current),
      };
    }

    const next: PlayerProfile = {
      ...current,
      watermelons: current.watermelons - ENDURANCE_PHOENIX_COST,
      enduranceTalents: {
        ...current.enduranceTalents,
        phoenix: true,
      },
    };

    await persistProfile(next);

    return {
      status: 'purchased',
      profile: cloneProfile(next),
    };
  });
}

export function refundEnduranceTalentLevel(
  talentId: EnduranceTalentId,
): Promise<TalentRefundResult> {
  return enqueueProfileMutation(async () => {
    const current = await loadPlayerProfile();

    if (!canRefundEnduranceTalentLevel(current.enduranceTalents, talentId)) {
      return {
        status: 'not-refundable',
        profile: cloneProfile(current),
      };
    }

    const currentLevel = current.enduranceTalents.levels[talentId];
    const definition = getEnduranceTalentDefinition(talentId);
    const refund = Math.floor((definition.costs[currentLevel - 1] ?? 0) / 2);

    const next: PlayerProfile = {
      ...current,
      watermelons: current.watermelons + refund,
      enduranceTalents: {
        ...current.enduranceTalents,
        levels: {
          ...current.enduranceTalents.levels,
          [talentId]: currentLevel - 1,
        },
      },
    };

    await persistProfile(next);

    return {
      status: 'refunded',
      profile: cloneProfile(next),
    };
  });
}

export function refundEndurancePhoenixTalent(): Promise<TalentRefundResult> {
  return enqueueProfileMutation(async () => {
    const current = await loadPlayerProfile();

    if (!current.enduranceTalents.phoenix) {
      return {
        status: 'not-refundable',
        profile: cloneProfile(current),
      };
    }

    const next: PlayerProfile = {
      ...current,
      watermelons: current.watermelons + Math.floor(ENDURANCE_PHOENIX_COST / 2),
      enduranceTalents: {
        ...current.enduranceTalents,
        phoenix: false,
      },
    };

    await persistProfile(next);

    return {
      status: 'refunded',
      profile: cloneProfile(next),
    };
  });
}

export function purchaseBlueTalentLevel(
  talentId: BlueTalentId,
): Promise<TalentPurchaseResult> {
  return enqueueProfileMutation(async () => {
    const current = await loadPlayerProfile();

    if (current.blueTalents.feast) {
      return {
        status: 'already-maxed',
        profile: cloneProfile(current),
      };
    }

    const currentLevel = current.blueTalents.levels[talentId];
    const maxLevel = BLUE_TALENT_MAX_LEVEL_BY_ID[talentId];

    if (currentLevel >= maxLevel) {
      return {
        status: 'already-maxed',
        profile: cloneProfile(current),
      };
    }

    const definition = getBlueTalentDefinition(talentId);

    if (!isBlueTalentUnlocked(current.blueTalents, definition)) {
      return {
        status: 'locked',
        profile: cloneProfile(current),
      };
    }

    const price = definition.costs[currentLevel] ?? 0;

    if (current.watermelons < price) {
      return {
        status: 'not-enough-watermelons',
        profile: cloneProfile(current),
      };
    }

    const next: PlayerProfile = {
      ...current,
      watermelons: current.watermelons - price,
      blueTalents: {
        ...current.blueTalents,
        levels: {
          ...current.blueTalents.levels,
          [talentId]: currentLevel + 1,
        },
      },
    };

    await persistProfile(next);

    return {
      status: 'purchased',
      profile: cloneProfile(next),
    };
  });
}

export function purchaseBlueFeastTalent(): Promise<TalentPurchaseResult> {
  return enqueueProfileMutation(async () => {
    const current = await loadPlayerProfile();

    if (current.blueTalents.feast) {
      return {
        status: 'already-maxed',
        profile: cloneProfile(current),
      };
    }

    if (!areAllBlueTalentsMaxed(current.blueTalents)) {
      return {
        status: 'locked',
        profile: cloneProfile(current),
      };
    }

    if (current.watermelons < BLUE_FEAST_COST) {
      return {
        status: 'not-enough-watermelons',
        profile: cloneProfile(current),
      };
    }

    const next: PlayerProfile = {
      ...current,
      watermelons: current.watermelons - BLUE_FEAST_COST,
      blueTalents: {
        ...current.blueTalents,
        feast: true,
      },
    };

    await persistProfile(next);

    return {
      status: 'purchased',
      profile: cloneProfile(next),
    };
  });
}

export function refundBlueTalentLevel(
  talentId: BlueTalentId,
): Promise<TalentRefundResult> {
  return enqueueProfileMutation(async () => {
    const current = await loadPlayerProfile();

    if (!canRefundBlueTalentLevel(current.blueTalents, talentId)) {
      return {
        status: 'not-refundable',
        profile: cloneProfile(current),
      };
    }

    const currentLevel = current.blueTalents.levels[talentId];
    const definition = getBlueTalentDefinition(talentId);
    const refund = Math.floor((definition.costs[currentLevel - 1] ?? 0) / 2);

    const next: PlayerProfile = {
      ...current,
      watermelons: current.watermelons + refund,
      blueTalents: {
        ...current.blueTalents,
        levels: {
          ...current.blueTalents.levels,
          [talentId]: currentLevel - 1,
        },
      },
    };

    await persistProfile(next);

    return {
      status: 'refunded',
      profile: cloneProfile(next),
    };
  });
}

export function refundBlueFeastTalent(): Promise<TalentRefundResult> {
  return enqueueProfileMutation(async () => {
    const current = await loadPlayerProfile();

    if (!current.blueTalents.feast) {
      return {
        status: 'not-refundable',
        profile: cloneProfile(current),
      };
    }

    const next: PlayerProfile = {
      ...current,
      watermelons: current.watermelons + Math.floor(BLUE_FEAST_COST / 2),
      blueTalents: {
        ...current.blueTalents,
        feast: false,
      },
    };

    await persistProfile(next);

    return {
      status: 'refunded',
      profile: cloneProfile(next),
    };
  });
}
