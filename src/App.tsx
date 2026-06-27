import { useEffect, useState } from 'react';
import { GameCanvas } from './components/GameCanvas';
import {
  gameEvents,
  requestRestart,
  type FallWarningDetail,
  type FlightHudDetail,
} from './game/events';

export default function App(): React.JSX.Element {
  const [altitude, setAltitude] = useState(0);
  const [bestAltitude, setBestAltitude] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [watermelons, setWatermelons] = useState(0);
  const [fallSeconds, setFallSeconds] = useState<number | null>(null);
  const [isGameOver, setIsGameOver] = useState(false);

  useEffect(() => {
    const onHud = (event: Event): void => {
      const hud = (event as CustomEvent<FlightHudDetail>).detail;
      setAltitude(hud.altitude);
      setBestAltitude(hud.bestAltitude);
      setSpeed(hud.speed);
      setWatermelons(hud.watermelons);
    };

    const onFallWarning = (event: Event): void => {
      const { secondsRemaining } = (event as CustomEvent<FallWarningDetail>).detail;
      setFallSeconds(secondsRemaining);
    };

    const onGameOver = (): void => {
      setIsGameOver(true);
    };

    gameEvents.addEventListener('flydodo:hud', onHud);
    gameEvents.addEventListener('flydodo:fall-warning', onFallWarning);
    gameEvents.addEventListener('flydodo:game-over', onGameOver);

    return () => {
      gameEvents.removeEventListener('flydodo:hud', onHud);
      gameEvents.removeEventListener('flydodo:fall-warning', onFallWarning);
      gameEvents.removeEventListener('flydodo:game-over', onGameOver);
    };
  }, []);

  const restart = (): void => {
    setIsGameOver(false);
    setFallSeconds(null);
    setAltitude(0);
    setSpeed(0);
    requestRestart();
  };

  return (
    <main className="app-shell">
      <GameCanvas />

      <section className="hud" aria-label="Informations de jeu">
        <div className="hud__left-column">
          <div className="hud-pill hud-pill--record">
            <span>RECORD</span>
            <strong>{bestAltitude} m</strong>
          </div>

          <div className="hud-pill hud-pill--speed">
            <span>VITESSE</span>
            <strong>{speed} m/s</strong>
          </div>
        </div>

        <div className="hud-pill hud-pill--watermelons">
          <span>PASTÈQUES</span>
          <strong>{watermelons}</strong>
        </div>

        <div className="hud-pill hud-pill--altitude">
          <span>ALTITUDE</span>
          <strong>{altitude} m</strong>
        </div>
      </section>

      <div className="controls-hint">
        Maintenez la gauche ou la droite pour incliner le Dodo
      </div>

      {fallSeconds !== null && !isGameOver && (
        <div className="fall-warning">
          Remonte ! <strong>{fallSeconds}</strong>
        </div>
      )}

      {isGameOver && (
        <section className="game-over" role="dialog" aria-modal="true">
          <div className="game-over__card">
            <p className="eyebrow">FIN DE L’ASCENSION</p>
            <h1>FlyDodo!</h1>
            <p className="game-over__score">Altitude : {altitude} m</p>
            <p>Record : {bestAltitude} m</p>
            <button type="button" onClick={restart}>
              REJOUER
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
