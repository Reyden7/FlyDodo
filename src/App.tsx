import { useEffect, useMemo, useRef, useState } from 'react';
import { GameCanvas } from './components/GameCanvas';
import {
  emitCosmeticEquipped,
  gameEvents,
  requestGamePause,
  requestGameResume,
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
  unequipShopItem,
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
type ShopTab = 'accessories' | 'talents' | 'items';
type TalentTreeTab = 'control' | 'endurance' | 'talents';

const TALENT_TREE_TABS: ReadonlyArray<{
  id: TalentTreeTab;
  label: string;
}> = [
  {
    id: 'control',
    label: 'Contrôle',
  },
  {
    id: 'endurance',
    label: 'Endurance',
  },
  {
    id: 'talents',
    label: 'Talents',
  },
] as const;

const SHOP_OBJECT_SLOTS = [
  {
    id: 'extra-life',
    title: 'Vie bonus',
    icon: '/assets/ui/vie/1.png',
    price: 50,
  },
  {
    id: 'shield-charge',
    title: 'Bouclier',
    icon: '/assets/ui/bouclier/1.png',
    price: 40,
  },
  {
    id: 'coming-soon',
    title: 'Bientot',
    icon: '/assets/collectable/pasteque.png',
    price: 25,
  },
] as const;

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

function SurvivalIconRow({
  label,
  current,
  max,
  fullSrc,
  emptySrc,
}: {
  label: string;
  current: number;
  max: number;
  fullSrc: string;
  emptySrc: string;
}): React.JSX.Element | null {
  const iconCount = Math.max(0, Math.floor(max));
  const fullIconCount = Math.min(iconCount, Math.max(0, Math.floor(current)));

  if (iconCount === 0) {
    return null;
  }

  return (
    <div className="survival-icons__row" aria-label={`${label} ${current}/${max}`}>
      {Array.from({ length: iconCount }, (_value, index) => {
        const isFull = index < fullIconCount;

        return (
          <img
            key={`${label}-${index}`}
            src={isFull ? fullSrc : emptySrc}
            alt=""
            aria-hidden="true"
          />
        );
      })}
    </div>
  );
}

export default function App(): React.JSX.Element {
  const [altitude, setAltitude] = useState(0);
  const [bestAltitude, setBestAltitude] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [watermelons, setWatermelons] = useState(0);
  const [lives, setLives] = useState(1);
  const [maxLives, setMaxLives] = useState(1);
  const [shield, setShield] = useState(0);
  const [maxShield, setMaxShield] = useState(0);
  const [fallSeconds, setFallSeconds] = useState<number | null>(null);
  const [warningReason, setWarningReason] = useState<'fall' | 'side'>('fall');
  const [isGameOver, setIsGameOver] = useState(false);
  const [hasMovedThisRun, setHasMovedThisRun] = useState(false);

  const [showControlTutorial, setShowControlTutorial] = useState(true);
  const [tutorialSide, setTutorialSide] = useState<TutorialSide>(null);
  const tutorialAcknowledgedRef = useRef(false);

  const [isShopOpen, setIsShopOpen] = useState(false);
  const [selectedShopTab, setSelectedShopTab] =
    useState<ShopTab>('accessories');
  const [selectedTalentTreeTab, setSelectedTalentTreeTab] =
    useState<TalentTreeTab>('control');
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
      setLives(hud.lives);
      setMaxLives(hud.maxLives);
      setShield(hud.shield);
      setMaxShield(hud.maxShield);
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

    const onMovementStarted = (): void => {
      setHasMovedThisRun(true);
    };

    gameEvents.addEventListener('flydodo:hud', onHud);
    gameEvents.addEventListener('flydodo:wallet-updated', onWalletUpdated);
    gameEvents.addEventListener('flydodo:fall-warning', onFallWarning);
    gameEvents.addEventListener('flydodo:game-over', onGameOver);
    gameEvents.addEventListener('flydodo:movement-started', onMovementStarted);

    return () => {
      gameEvents.removeEventListener('flydodo:hud', onHud);
      gameEvents.removeEventListener('flydodo:wallet-updated', onWalletUpdated);
      gameEvents.removeEventListener('flydodo:fall-warning', onFallWarning);
      gameEvents.removeEventListener('flydodo:game-over', onGameOver);
      gameEvents.removeEventListener('flydodo:movement-started', onMovementStarted);
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
    setLives(1);
    setMaxLives(1);
    setShield(0);
    setMaxShield(0);
    setHasMovedThisRun(false);
    requestRestart();
  };

  const openShop = async (): Promise<void> => {
    setShopNotice(null);
    setSelectedShopTab('accessories');
    setSelectedTalentTreeTab('control');
    requestGamePause();
    setIsShopOpen(true);
    setPlayerProfile(await loadLatestPlayerProfile());
  };

  const closeShop = (): void => {
    setShopNotice(null);
    setIsShopOpen(false);

    if (!isGameOver) {
      requestGameResume();
    }
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

      const isEquipped = playerProfile.equipped[item.category] === item.id;

      if (isEquipped) {
        const result = await unequipShopItem(item.id, item.category);
        setPlayerProfile(result.profile);

        if (result.status === 'unequipped') {
          emitCosmeticEquipped({
            category: item.category,
            itemId: null,
          });
          setShopNotice(`${item.title} déséquipé !`);
        }

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

        <div className="survival-icons">
          <SurvivalIconRow
            label="Vie"
            current={lives}
            max={maxLives}
            fullSrc="/assets/ui/vie/1.png"
            emptySrc="/assets/ui/vie/2.png"
          />
          <SurvivalIconRow
            label="Bouclier"
            current={shield}
            max={maxShield}
            fullSrc="/assets/ui/bouclier/1.png"
            emptySrc="/assets/ui/bouclier/2.png"
          />
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

      {!isGameOver && !isShopOpen && !hasMovedThisRun && (
        <button
          type="button"
          className="floating-shop-button"
          aria-label="Ouvrir la boutique"
          onClick={() => void openShop()}
        />
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
          <div
            className={`shop-panel shop-panel--${selectedShopTab}`}
          >
            <button
              type="button"
              className="shop-back-button"
              aria-label="Retour"
              onClick={closeShop}
            />

            <header className="shop-header">
                <div className="shop-title" aria-label="Boutique">
                <img src="/assets/ui/title.png" alt="" aria-hidden="true" />
              </div>
                <div className="shop-wallet" aria-label="PastÃ¨ques disponibles">
                <strong>{playerProfile.watermelons}</strong>
                <img
                  src="/assets/collectable/pasteque.png"
                  alt=""
                  aria-hidden="true"
                />
              </div>

              <div className="shop-tabs" role="tablist" aria-label="Sections boutique">
                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedShopTab === 'accessories'}
                  className={`shop-main-tab shop-main-tab--accessories${
                    selectedShopTab === 'accessories' ? ' is-active' : ''
                  }`}
                  onClick={() => setSelectedShopTab('accessories')}
                >
                  <span className="visually-hidden">Accessoires</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedShopTab === 'items'}
                  className={`shop-main-tab shop-main-tab--items${
                    selectedShopTab === 'items' ? ' is-active' : ''
                  }`}
                  onClick={() => setSelectedShopTab('items')}
                >
                  <span className="visually-hidden">Objets</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedShopTab === 'talents'}
                  className={`shop-main-tab shop-main-tab--talents${
                    selectedShopTab === 'talents' ? ' is-active' : ''
                  }`}
                  onClick={() => setSelectedShopTab('talents')}
                >
                  <span className="visually-hidden">Arbre talents</span>
                </button>
              </div>

              <div
                className={`shop-toolbar${
                  selectedShopTab !== 'accessories' ? ' shop-toolbar--simple' : ''
                }`}
              >
                {selectedShopTab === 'accessories' && (
                  <div className="shop-filter" aria-label="Catégories">
                  
                    <div className="shop-filter__options">
                    {SHOP_CATEGORY_OPTIONS.filter(
                      (option) => option.value !== 'outfit',
                    ).map((option) => (
                      <button
                        type="button"
                        key={option.value}
                        className={`shop-filter__button shop-filter__button--${option.value}${
                          selectedCategory === option.value ? ' is-active' : ''
                        }`}
                        onClick={() => setSelectedCategory(option.value)}
                      >
                        {option.label}
                      </button>
                    ))}
                    </div>
                  </div>
                )}

                <div className="shop-wallet shop-wallet--toolbar" aria-label="Pastèques disponibles">
                  <strong>{playerProfile.watermelons}</strong>
                  <img
                    src="/assets/collectable/pasteque.png"
                    alt=""
                    aria-hidden="true"
                  />
                </div>
              </div>
            </header>

            {shopNotice && (
              <div className="shop-notice" role="status">
                {shopNotice}
              </div>
            )}

            <div
              className={`shop-content${
                selectedShopTab === 'talents' ? ' shop-content--talents' : ''
              }`}
            >
              {selectedShopTab === 'accessories' && (
                <div className="shop-grid">
                  {filteredShopItems.map((item) => {
                  const isOwned = playerProfile.ownedItemIds.includes(item.id);
                  const isEquipped =
                    playerProfile.equipped[item.category] === item.id;
                  const isPending = pendingItemId === item.id;
                  const cannotAfford =
                    !isOwned && playerProfile.watermelons < item.price;

                  const buttonLabel = isEquipped
                    ? 'DÉSÉQUIPER'
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
                        }${isOwned && !isEquipped ? ' is-owned' : ''
                        }${cannotAfford ? ' is-unaffordable' : ''}`}
                        disabled={isPending}
                        onClick={() => void handleShopItemAction(item)}
                      >
                        {isPending ? '...' : buttonLabel}
                      </button>
                    </article>
                  );
                  })}
                </div>
              )}

              {selectedShopTab === 'items' && (
                <div className="shop-object-grid" role="tabpanel">
                  {SHOP_OBJECT_SLOTS.map((item) => (
                    <article className="shop-object-card" key={item.id}>
                      <div className="shop-object-card__icon" aria-hidden="true">
                        <img src={item.icon} alt="" />
                      </div>
                      <h2>{item.title}</h2>
                      <div className="shop-object-card__price">
                        <img
                          src="/assets/collectable/pasteque.png"
                          alt=""
                          aria-hidden="true"
                        />
                        <strong>{item.price}</strong>
                      </div>
                      <button
                        type="button"
                        className="shop-object-card__button"
                        onClick={() => setShopNotice('Objet bientôt disponible')}
                      >
                        <span className="visually-hidden">Acheter</span>
                      </button>
                    </article>
                  ))}
                </div>
              )}

              {selectedShopTab === 'talents' && (
                <div className="talent-tree-panel" role="tabpanel">
                  <div
                    className="talent-tree-tabs"
                    role="tablist"
                    aria-label="Categories de talents"
                  >
                    {TALENT_TREE_TABS.map((tab) => (
                      <button
                        type="button"
                        role="tab"
                        key={tab.id}
                        aria-selected={selectedTalentTreeTab === tab.id}
                        className={`talent-tree-tab talent-tree-tab--${tab.id}${
                          selectedTalentTreeTab === tab.id ? ' is-active' : ''
                        }`}
                        onClick={() => setSelectedTalentTreeTab(tab.id)}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  <div
                    className={`talent-tree-stage talent-tree-stage--${selectedTalentTreeTab}`}
                    aria-hidden="true"
                  />
                </div>
              )}
            </div>

          </div>
        </section>
      )}
    </main>
  );
}
