import type { CosmeticCategory } from '../shop/shopCatalog';
import type { ShopObjectInventory } from '../services/saveService';

export interface FlightHudDetail {
  altitude: number;
  bestAltitude: number;
  speed: number;
  watermelons: number;
  lives: number;
  maxLives: number;
  lifeVialActive: boolean;
  shield: number;
  maxShield: number;
}

export interface FallWarningDetail {
  secondsRemaining: number | null;
  reason?: 'fall' | 'side';
}

export interface WalletUpdatedDetail {
  watermelons: number;
}

export type PlayerDeathReason =
  | 'default'
  | 'obstacle'
  | 'mosquito'
  | 'lava'
  | 'lightning';

export interface PlayerDiedDetail {
  reason: PlayerDeathReason;
}

export interface CosmeticEquippedDetail {
  category: CosmeticCategory;
  itemId: string | null;
}

export interface ShopObjectsUpdatedDetail {
  shopObjects: ShopObjectInventory;
}

export const gameEvents = new EventTarget();
const SHOP_OBJECT_INVENTORY_GLOBAL_KEY = '__flydodoShopObjectInventory';

function getGlobalShopObjectInventory(): ShopObjectInventory | null {
  const value = (globalThis as Record<string, unknown>)[
    SHOP_OBJECT_INVENTORY_GLOBAL_KEY
  ];

  if (!value || typeof value !== 'object') {
    return null;
  }

  const inventory = value as Partial<ShopObjectInventory>;
  return {
    lifeVial: inventory.lifeVial === true,
    watermelonMagnet: inventory.watermelonMagnet === true,
  };
}

function setGlobalShopObjectInventory(inventory: ShopObjectInventory): void {
  (globalThis as Record<string, unknown>)[SHOP_OBJECT_INVENTORY_GLOBAL_KEY] = {
    ...inventory,
  };
}

export function emitFlightHud(detail: FlightHudDetail): void {
  gameEvents.dispatchEvent(new CustomEvent<FlightHudDetail>('flydodo:hud', { detail }));
}

export function emitFallWarning(detail: FallWarningDetail): void {
  gameEvents.dispatchEvent(
    new CustomEvent<FallWarningDetail>('flydodo:fall-warning', { detail }),
  );
}

export function emitWalletUpdated(detail: WalletUpdatedDetail): void {
  gameEvents.dispatchEvent(
    new CustomEvent<WalletUpdatedDetail>('flydodo:wallet-updated', { detail }),
  );
}

export function emitCosmeticEquipped(detail: CosmeticEquippedDetail): void {
  gameEvents.dispatchEvent(
    new CustomEvent<CosmeticEquippedDetail>('flydodo:cosmetic-equipped', {
      detail,
    }),
  );
}

export function emitTalentsUpdated(): void {
  gameEvents.dispatchEvent(new Event('flydodo:talents-updated'));
}

export function emitShopObjectsUpdated(
  detail?: ShopObjectsUpdatedDetail,
): void {
  if (detail) {
    setGlobalShopObjectInventory(detail.shopObjects);
  }

  gameEvents.dispatchEvent(
    detail
      ? new CustomEvent<ShopObjectsUpdatedDetail>(
          'flydodo:shop-objects-updated',
          { detail },
        )
      : new Event('flydodo:shop-objects-updated'),
  );
}

export function getLatestShopObjectInventory(): ShopObjectInventory | null {
  const inventory = getGlobalShopObjectInventory();
  return inventory ? { ...inventory } : null;
}

export function emitGameOver(): void {
  gameEvents.dispatchEvent(new Event('flydodo:game-over'));
}

export function emitPlayerDied(reason: PlayerDeathReason): void {
  gameEvents.dispatchEvent(
    new CustomEvent<PlayerDiedDetail>('flydodo:player-died', {
      detail: { reason },
    }),
  );
}

export function emitMovementStarted(): void {
  gameEvents.dispatchEvent(new Event('flydodo:movement-started'));
}

export function requestRestart(): void {
  gameEvents.dispatchEvent(new Event('flydodo:restart-request'));
}

export function requestRewardedRevive(): void {
  gameEvents.dispatchEvent(new Event('flydodo:rewarded-revive-request'));
}

export function emitRewardedRevived(): void {
  gameEvents.dispatchEvent(new Event('flydodo:rewarded-revived'));
}

export function requestGamePause(): void {
  gameEvents.dispatchEvent(new Event('flydodo:pause-request'));
}

export function requestGameResume(): void {
  gameEvents.dispatchEvent(new Event('flydodo:resume-request'));
}
