import type { CosmeticCategory } from '../shop/shopCatalog';

export interface FlightHudDetail {
  altitude: number;
  bestAltitude: number;
  speed: number;
  watermelons: number;
  lives: number;
  maxLives: number;
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

export interface CosmeticEquippedDetail {
  category: CosmeticCategory;
  itemId: string | null;
}

export const gameEvents = new EventTarget();

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

export function emitGameOver(): void {
  gameEvents.dispatchEvent(new Event('flydodo:game-over'));
}

export function emitMovementStarted(): void {
  gameEvents.dispatchEvent(new Event('flydodo:movement-started'));
}

export function requestRestart(): void {
  gameEvents.dispatchEvent(new Event('flydodo:restart-request'));
}

export function requestGamePause(): void {
  gameEvents.dispatchEvent(new Event('flydodo:pause-request'));
}

export function requestGameResume(): void {
  gameEvents.dispatchEvent(new Event('flydodo:resume-request'));
}
