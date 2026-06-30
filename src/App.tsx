import { useEffect, useMemo, useRef, useState } from 'react';
import { GameCanvas } from './components/GameCanvas';
import {
  emitCosmeticEquipped,
  gameEvents,
  requestRestart,
  type FallWarningDetail,
  type FlightHudDetail,
  type WalletUpdatedDetail,
} from './game/events';
import {
  createEmptyPlayerProfile,
  equipShopItem,
  loadLatestPlayerProfile,
  purchaseShopItem,
  type PlayerProfile,
} from './services/saveService';
import {
  getShopItemImagePath,
  SHOP_CATEGORY_OPTIONS,
  SHOP_ITEMS,
  type ShopFilterCategory,
  type ShopItem,
} from './shop/shopCatalog';

type TutorialSide = 'left' | 'right' | null;

function ShopItemPreview({ item }: { item: ShopItem }): React.JSX.Element {
  const [imageFailed, setImageFailed] = useState(false);
  const imagePath = getShopItemImagePath(item);

  useEffect(() => {
    setImageFailed(false);
  }, [imagePath]);

  if (imageFailed) {
    return <span>{item.icon}</span>;
  }

  return (
    <img
      className="shop-item__accessory-image"
      src={imagePath}
      alt=""
      aria-hidden="true"
      onError={() => setImageFailed(true)}
    />
  );
}

export default function App(): React.JSX.Element {
  const [altitude, setAltitude] = useState(0);
  const [bestAltitude, setBestAltitude] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [watermelons, setWatermelons] = useState(0);
  const [fallSeconds, setFallSeconds] = useState<number | null>(null);
  const [warningReason, setWarningReason] = useState<'fall' | 'side'>('fall');
  const [isGameOver, setIsGameOver] = useState(false);

  const [showControlTutorial, setShowControlTutorial] = useState(true);
  const [tutorialSide, setTutorialSide] = useState<TutorialSide>(null);
  const tutorialAcknowledgedRef = useRef(false);

  const [isShopOpen, setIsShopOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] =
    useState<ShopFilterCategory>('all');
  const [playerProfile, setPlayerProfile] = useState<PlayerProfile>(
    createEmptyPlayerProfile(),
  );
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);
  const [shopNotice, setShopNotice] = useState<string | null>(null);

  const filteredShopItems = useMemo(
    () =>
      selectedCategory === 'all'
        ? SHOP_ITEMS
        : SHOP_ITEMS.filter((item) => item.category === selectedCategory),
    [selectedCategory],
  );

  useEffect(() => {
    void loadLatestPlayerProfile().then(setPlayerProfile);

    const onHud = (event: Event): void => {
      const hud = (event as CustomEvent<FlightHudDetail>).detail;
      setAltitude(hud.altitude);
      setBestAltitude(hud.bestAltitude);
      setSpeed(hud.speed);
      setWatermelons(hud.watermelons);
    };

    const onWalletUpdated = (event: Event): void => {
      const { watermelons: wallet } = (
        event as CustomEvent<WalletUpdatedDetail>
      ).detail;

      setPlayerProfile((current) => ({
        ...current,
        watermelons: wallet,
      }));
    };

    const onFallWarning = (event: Event): void => {
      const { reason = 'fall', secondsRemaining } = (
        event as CustomEvent<FallWarningDetail>
      ).detail;
      setFallSeconds(secondsRemaining);
      setWarningReason(reason);
    };

    const onGameOver = (): void => {
      setIsGameOver(true);
    };

    gameEvents.addEventListener('flydodo:hud', onHud);
    gameEvents.addEventListener('flydodo:wallet-updated', onWalletUpdated);
    gameEvents.addEventListener('flydodo:fall-warning', onFallWarning);
    gameEvents.addEventListener('flydodo:game-over', onGameOver);

    return () => {
      gameEvents.removeEventListener('flydodo:hud', onHud);
      gameEvents.removeEventListener('flydodo:wallet-updated', onWalletUpdated);
      gameEvents.removeEventListener('flydodo:fall-warning', onFallWarning);
      gameEvents.removeEventListener('flydodo:game-over', onGameOver);
    };
  }, []);

  useEffect(() => {
    if (!showControlTutorial) {
      return;
    }

    let hideTimer: number | undefined;

    const acknowledgeTutorial = (side: Exclude<TutorialSide, null>): void => {
      if (tutorialAcknowledgedRef.current) {
        return;
      }

      tutorialAcknowledgedRef.current = true;
      setTutorialSide(side);

      hideTimer = window.setTimeout(() => {
        setShowControlTutorial(false);
      }, 750);
    };

    const onPointerDown = (event: PointerEvent): void => {
      const middle = window.innerWidth / 2;
      const neutralZone = Math.min(36, window.innerWidth * 0.08);

      if (event.clientX < middle - neutralZone) {
        acknowledgeTutorial('left');
      } else if (event.clientX > middle + neutralZone) {
        acknowledgeTutorial('right');
      }
    };

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.code === 'ArrowLeft' || event.code === 'KeyA') {
        acknowledgeTutorial('left');
      }

      if (event.code === 'ArrowRight' || event.code === 'KeyD') {
        acknowledgeTutorial('right');
      }
    };

    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('keydown', onKeyDown, true);

    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('keydown', onKeyDown, true);

      if (hideTimer !== undefined) {
        window.clearTimeout(hideTimer);
      }
    };
  }, [showControlTutorial]);

  useEffect(() => {
    if (!shopNotice) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setShopNotice(null);
    }, 2200);

    return () => window.clearTimeout(timeout);
  }, [shopNotice]);

  const restart = (): void => {
    setIsShopOpen(false);
    setIsGameOver(false);
    setFallSeconds(null);
    setWarningReason('fall');
    setAltitude(0);
    setSpeed(0);
    setWatermelons(0);
    requestRestart();
  };

  const openShop = async (): Promise<void> => {
    setShopNotice(null);
    setIsShopOpen(true);
    setPlayerProfile(await loadLatestPlayerProfile());
  };

  const closeShop = (): void => {
    setShopNotice(null);
    setIsShopOpen(false);
  };

  const handleShopItemAction = async (item: ShopItem): Promise<void> => {
    if (pendingItemId) {
      return;
    }

    setPendingItemId(item.id);
    setShopNotice(null);

    try {
      const isOwned = playerProfile.ownedItemIds.includes(item.id);

      if (!isOwned) {
        const result = await purchaseShopItem(item.id, item.price);
        setPlayerProfile(result.profile);

        if (result.status === 'not-enough-watermelons') {
          setShopNotice('Pas assez de pastèques pour cet accessoire.');
          return;
        }

        setShopNotice(`${item.title} acheté !`);
        return;
      }

      const result = await equipShopItem(item.id, item.category);
      setPlayerProfile(result.profile);

      if (result.status === 'equipped') {
        emitCosmeticEquipped({
          category: item.category,
          itemId: item.id,
        });
        setShopNotice(`${item.title} équipé !`);
      }
    } finally {
      setPendingItemId(null);
    }
  };

  return (
    <main className="app-shell">
      <GameCanvas />

      <section className="hud" aria-label="Informations de jeu">
        <div className="hud__left-column">
          <div className="hud-pill hud-pill--speed">
            <span>VITESSE</span>
            <strong>{speed} m/s</strong>
          </div>

          <div className="hud-pill hud-pill--altitude">
            <span>ALTITUDE</span>
            <strong>{altitude} m</strong>
          </div>
        </div>

        <div className="hud-pill hud-pill--watermelons">
          <span>PASTÈQUES</span>
          <strong>{watermelons}</strong>
        </div>
      </section>

      {showControlTutorial && !isGameOver && (
        <section
          className={`control-tutorial${
            tutorialSide !== null
              ? ` control-tutorial--confirmed-${tutorialSide}`
              : ''
          }`}
          aria-label="Tutoriel des commandes"
        >
          <div className="control-tutorial__heading">
            <strong>TOUCHE UN CÔTÉ</strong>
            <span>Une pression fait battre une aile</span>
          </div>

          <div className="control-tutorial__buttons">
            <div
              className={`control-button control-button--left${
                tutorialSide === 'left' ? ' is-active' : ''
              }`}
            >
              <span className="control-button__tap" aria-hidden="true">
                <span className="control-button__finger">●</span>
              </span>
              <span className="control-button__arrow" aria-hidden="true">
                ←
              </span>
              <strong>GAUCHE</strong>
              <small>Le Dodo tourne à gauche</small>
            </div>

            <div
              className={`control-button control-button--right${
                tutorialSide === 'right' ? ' is-active' : ''
              }`}
            >
              <span className="control-button__tap" aria-hidden="true">
                <span className="control-button__finger">●</span>
              </span>
              <span className="control-button__arrow" aria-hidden="true">
                →
              </span>
              <strong>DROITE</strong>
              <small>Le Dodo tourne à droite</small>
            </div>
          </div>
        </section>
      )}

      {fallSeconds !== null && !isGameOver && (
        <div className="fall-warning">
          {warningReason === 'side' ? 'Reviens' : 'Remonte'} !{' '}
          <strong>{fallSeconds}</strong>
        </div>
      )}

      {isGameOver && !isShopOpen && (
        <section className="game-over" role="dialog" aria-modal="true">
          <div className="game-over__card">
            <p className="eyebrow">FIN DE L’ASCENSION</p>
            <h1>FlyDodo!</h1>
            <p className="game-over__score">Altitude : {altitude} m</p>
            <p>Record : {bestAltitude} m</p>

            <div className="game-over__actions">
              <button type="button" onClick={restart}>
                REJOUER
              </button>
              <button
                type="button"
                className="game-over__shop-button"
                onClick={() => void openShop()}
              >
                SHOP
              </button>
            </div>
          </div>
        </section>
      )}

      {isShopOpen && (
        <section className="shop-overlay" role="dialog" aria-modal="true">
          <div className="shop-panel">
            <header className="shop-header">
              <p className="shop-header__eyebrow">PERSONNALISE TON DODO</p>
              <h1>BOUTIQUE</h1>

              <div className="shop-toolbar">
                <label className="shop-filter">
                  <span>CATÉGORIE</span>
                  <select
                    value={selectedCategory}
                    onChange={(event) =>
                      setSelectedCategory(
                        event.target.value as ShopFilterCategory,
                      )
                    }
                  >
                    {SHOP_CATEGORY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="shop-wallet" aria-label="Pastèques disponibles">
                  <img
                    src="/assets/collectable/pasteque.png"
                    alt=""
                    aria-hidden="true"
                  />
                  <div>
                    <span>MES PASTÈQUES</span>
                    <strong>{playerProfile.watermelons}</strong>
                  </div>
                </div>
              </div>
            </header>

            {shopNotice && (
              <div className="shop-notice" role="status">
                {shopNotice}
              </div>
            )}

            <div className="shop-content">
              <div className="shop-grid">
                {filteredShopItems.map((item) => {
                  const isOwned = playerProfile.ownedItemIds.includes(item.id);
                  const isEquipped =
                    playerProfile.equipped[item.category] === item.id;
                  const isPending = pendingItemId === item.id;
                  const cannotAfford =
                    !isOwned && playerProfile.watermelons < item.price;

                  const buttonLabel = isEquipped
                    ? 'ÉQUIPÉ'
                    : isOwned
                      ? 'ÉQUIPER'
                      : 'ACHETER';

                  return (
                    <article
                      className={`shop-item${
                        isEquipped ? ' shop-item--equipped' : ''
                      }`}
                      key={item.id}
                    >
                      <div
                        className={`shop-item__icon shop-item__icon--${item.tone}`}
                        aria-hidden="true"
                      >
                        <ShopItemPreview item={item} />
                      </div>

                      {isEquipped && (
                        <span className="shop-item__equipped-badge">
                          ÉQUIPÉ
                        </span>
                      )}

                      <h2>{item.title}</h2>

                      <div className="shop-item__price">
                        <img
                          src="/assets/collectable/pasteque.png"
                          alt=""
                          aria-hidden="true"
                        />
                        <strong>{item.price}</strong>
                      </div>

                      <button
                        type="button"
                        className={`shop-item__button${
                          isEquipped ? ' is-equipped' : ''
                        }${cannotAfford ? ' is-unaffordable' : ''}`}
                        disabled={isEquipped || isPending}
                        onClick={() => void handleShopItemAction(item)}
                      >
                        {isPending ? '...' : buttonLabel}
                      </button>
                    </article>
                  );
                })}
              </div>
            </div>

            <footer className="shop-footer">
              <button type="button" onClick={closeShop}>
                ← RETOUR
              </button>
            </footer>
          </div>
        </section>
      )}
    </main>
  );
}
