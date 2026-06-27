export interface FlightHudDetail {
  altitude: number;
  bestAltitude: number;
  speed: number;
  watermelons: number;
}

export interface FallWarningDetail {
  secondsRemaining: number | null;
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

export function emitGameOver(): void {
  gameEvents.dispatchEvent(new Event('flydodo:game-over'));
}

export function requestRestart(): void {
  gameEvents.dispatchEvent(new Event('flydodo:restart-request'));
}
