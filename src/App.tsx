import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { GameCanvas } from './components/GameCanvas';
import {
  emitCosmeticEquipped,
  emitTalentsUpdated,
  gameEvents,
  requestGamePause,
  requestGameResume,
  requestRestart,
  type FallWarningDetail,
  type FlightHudDetail,
  type WalletUpdatedDetail,
} from './game/events';
import {
  addWatermelons,
  createEmptyPlayerProfile,
  equipShopItem,
  loadLatestPlayerProfile,
  purchaseBlueFeastTalent,
  purchaseBlueTalentLevel,
  purchaseControlMasterTalent,
  purchaseControlTalentLevel,
  purchaseEndurancePhoenixTalent,
  purchaseEnduranceTalentLevel,
  purchaseShopItem,
  refundBlueFeastTalent,
  refundBlueTalentLevel,
  refundControlMasterTalent,
  refundControlTalentLevel,
  refundEndurancePhoenixTalent,
  refundEnduranceTalentLevel,
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
import {
  CONTROL_MASTER_TALENT,
  CONTROL_TALENTS,
  CONTROL_TALENT_MAX_LEVEL,
  getControlTalentDefinition,
  type ControlTalentId,
} from './talents/controlTalents';
import {
  ENDURANCE_PHOENIX_TALENT,
  ENDURANCE_TALENTS,
  ENDURANCE_TALENT_MAX_LEVEL_BY_ID,
  areAllEnduranceTalentsMaxed,
  canRefundEnduranceTalentLevel,
  getEnduranceTalentDefinition,
  isEnduranceTalentUnlocked,
  type EnduranceTalentId,
} from './talents/enduranceTalents';
import {
  BLUE_FEAST_TALENT,
  BLUE_TALENTS,
  BLUE_TALENT_MAX_LEVEL_BY_ID,
  areAllBlueTalentsMaxed,
  canRefundBlueTalentLevel,
  getBlueTalentDefinition,
  isBlueTalentUnlocked,
  type BlueTalentId,
} from './talents/blueTalents';
import {
  BLUE_FEAST_NODE_POSITION,
  getBlueTalentNodePosition,
  type TalentNodePosition,
} from './talents/blueTalentNodePositions';
import {
  CONTROL_MASTER_NODE_POSITION,
  getControlTalentNodePosition,
} from './talents/controlTalentNodePositions';
import {
  ENDURANCE_PHOENIX_NODE_POSITION,
  getEnduranceTalentNodePosition,
} from './talents/enduranceTalentNodePositions';

type TutorialSide = 'left' | 'right' | null;
type ShopTab = 'accessories' | 'talents' | 'items';
type TalentTreeTab = 'control' | 'endurance' | 'talents';
type SelectedControlTalent =
  | {
      kind: 'talent';
      id: ControlTalentId;
      level: number;
    }
  | {
      kind: 'master';
    };
type SelectedEnduranceTalent =
  | {
      kind: 'talent';
      id: EnduranceTalentId;
      level: number;
    }
  | {
      kind: 'phoenix';
    };
type SelectedBlueTalent =
  | {
      kind: 'talent';
      id: BlueTalentId;
      level: number;
    }
  | {
      kind: 'feast';
    };

const getTalentNodePositionStyle = ({
  x,
  y,
}: TalentNodePosition): CSSProperties => ({
  left: `${x}%`,
  top: `${y}%`,
});

const IS_DEV = import.meta.env.DEV;

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
  const [pendingTalentAction, setPendingTalentAction] = useState<string | null>(
    null,
  );
  const [selectedControlTalent, setSelectedControlTalent] =
    useState<SelectedControlTalent | null>(null);
  const [isControlTalentSheetClosing, setIsControlTalentSheetClosing] =
    useState(false);
  const [selectedEnduranceTalent, setSelectedEnduranceTalent] =
    useState<SelectedEnduranceTalent | null>(null);
  const [isEnduranceTalentSheetClosing, setIsEnduranceTalentSheetClosing] =
    useState(false);
  const [selectedBlueTalent, setSelectedBlueTalent] =
    useState<SelectedBlueTalent | null>(null);
  const [isBlueTalentSheetClosing, setIsBlueTalentSheetClosing] =
    useState(false);
  const [shopNotice, setShopNotice] = useState<string | null>(null);
  const controlTalentSheetCloseTimerRef = useRef<number | null>(null);
  const enduranceTalentSheetCloseTimerRef = useRef<number | null>(null);
  const blueTalentSheetCloseTimerRef = useRef<number | null>(null);

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

  useEffect(
    () => () => {
      if (controlTalentSheetCloseTimerRef.current !== null) {
        window.clearTimeout(controlTalentSheetCloseTimerRef.current);
      }

      if (enduranceTalentSheetCloseTimerRef.current !== null) {
        window.clearTimeout(enduranceTalentSheetCloseTimerRef.current);
      }

      if (blueTalentSheetCloseTimerRef.current !== null) {
        window.clearTimeout(blueTalentSheetCloseTimerRef.current);
      }
    },
    [],
  );

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
    setSelectedControlTalent(null);
    setIsControlTalentSheetClosing(false);
    setSelectedEnduranceTalent(null);
    setIsEnduranceTalentSheetClosing(false);
    requestGamePause();
    setIsShopOpen(true);
    setPlayerProfile(await loadLatestPlayerProfile());
  };

  const closeShop = (): void => {
    setShopNotice(null);
    setSelectedControlTalent(null);
    setIsControlTalentSheetClosing(false);
    setSelectedEnduranceTalent(null);
    setIsEnduranceTalentSheetClosing(false);
    setIsShopOpen(false);

    if (!isGameOver) {
      requestGameResume();
    }
  };

  const handleDevAddWatermelons = async (): Promise<void> => {
    const profile = await addWatermelons(5);
    setPlayerProfile(profile);
    setShopNotice('+5 pasteques');
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

  const selectControlTalent = (target: SelectedControlTalent): void => {
    if (controlTalentSheetCloseTimerRef.current !== null) {
      window.clearTimeout(controlTalentSheetCloseTimerRef.current);
      controlTalentSheetCloseTimerRef.current = null;
    }

    setIsControlTalentSheetClosing(false);
    setSelectedControlTalent(target);
  };

  const dismissSelectedControlTalent = (): void => {
    if (!selectedControlTalent || isControlTalentSheetClosing) {
      return;
    }

    setIsControlTalentSheetClosing(true);
    controlTalentSheetCloseTimerRef.current = window.setTimeout(() => {
      setSelectedControlTalent(null);
      setIsControlTalentSheetClosing(false);
      controlTalentSheetCloseTimerRef.current = null;
    }, 180);
  };

  const handleControlTalentTreePointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
  ): void => {
    const target = event.target as HTMLElement;

    if (
      target.closest('.control-talent-node') ||
      target.closest('.talent-detail-sheet')
    ) {
      return;
    }

    dismissSelectedControlTalent();
  };

  const selectEnduranceTalent = (target: SelectedEnduranceTalent): void => {
    if (enduranceTalentSheetCloseTimerRef.current !== null) {
      window.clearTimeout(enduranceTalentSheetCloseTimerRef.current);
      enduranceTalentSheetCloseTimerRef.current = null;
    }

    setIsEnduranceTalentSheetClosing(false);
    setSelectedEnduranceTalent(target);
  };

  const dismissSelectedEnduranceTalent = (): void => {
    if (!selectedEnduranceTalent || isEnduranceTalentSheetClosing) {
      return;
    }

    setIsEnduranceTalentSheetClosing(true);
    enduranceTalentSheetCloseTimerRef.current = window.setTimeout(() => {
      setSelectedEnduranceTalent(null);
      setIsEnduranceTalentSheetClosing(false);
      enduranceTalentSheetCloseTimerRef.current = null;
    }, 180);
  };

  const handleEnduranceTalentTreePointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
  ): void => {
    const target = event.target as HTMLElement;

    if (
      target.closest('.endurance-talent-node') ||
      target.closest('.talent-detail-sheet')
    ) {
      return;
    }

    dismissSelectedEnduranceTalent();
  };

  const selectBlueTalent = (target: SelectedBlueTalent): void => {
    if (blueTalentSheetCloseTimerRef.current !== null) {
      window.clearTimeout(blueTalentSheetCloseTimerRef.current);
      blueTalentSheetCloseTimerRef.current = null;
    }

    setIsBlueTalentSheetClosing(false);
    setSelectedBlueTalent(target);
  };

  const dismissSelectedBlueTalent = (): void => {
    if (!selectedBlueTalent || isBlueTalentSheetClosing) {
      return;
    }

    setIsBlueTalentSheetClosing(true);
    blueTalentSheetCloseTimerRef.current = window.setTimeout(() => {
      setSelectedBlueTalent(null);
      setIsBlueTalentSheetClosing(false);
      blueTalentSheetCloseTimerRef.current = null;
    }, 180);
  };

  const handleBlueTalentTreePointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
  ): void => {
    const target = event.target as HTMLElement;

    if (
      target.closest('.blue-talent-node') ||
      target.closest('.talent-detail-sheet')
    ) {
      return;
    }

    dismissSelectedBlueTalent();
  };

  const handleControlTalentPurchase = async (
    target: SelectedControlTalent,
  ): Promise<void> => {
    if (pendingTalentAction) {
      return;
    }

    const actionId =
      target.kind === 'master' ? 'control-master' : `${target.id}-${target.level}`;
    setPendingTalentAction(actionId);
    setShopNotice(null);

    try {
      const result =
        target.kind === 'master'
          ? await purchaseControlMasterTalent()
          : await purchaseControlTalentLevel(target.id);

      setPlayerProfile(result.profile);

      if (result.status === 'not-enough-watermelons') {
        setShopNotice('Pas assez de pasteques pour cette competence.');
        return;
      }

      if (result.status === 'locked') {
        setShopNotice('Debloque tous les niveaux Controle avant Maitre.');
        return;
      }

      if (result.status === 'already-maxed') {
        setShopNotice('Cette competence est deja au maximum.');
        return;
      }

      emitTalentsUpdated();
      setShopNotice('Competence debloquee !');
    } finally {
      setPendingTalentAction(null);
    }
  };

  const handleControlTalentRefund = async (
    target: SelectedControlTalent,
  ): Promise<void> => {
    if (pendingTalentAction) {
      return;
    }

    const actionId =
      target.kind === 'master' ? 'control-master-refund' : `${target.id}-refund`;
    setPendingTalentAction(actionId);
    setShopNotice(null);

    try {
      const result =
        target.kind === 'master'
          ? await refundControlMasterTalent()
          : await refundControlTalentLevel(target.id);

      setPlayerProfile(result.profile);

      if (result.status !== 'refunded') {
        setShopNotice('Tu dois rembourser le dernier niveau achete.');
        return;
      }

      emitTalentsUpdated();
      setShopNotice('Competence remboursee.');
    } finally {
      setPendingTalentAction(null);
    }
  };

  const handleEnduranceTalentPurchase = async (
    target: SelectedEnduranceTalent,
  ): Promise<void> => {
    if (pendingTalentAction) {
      return;
    }

    const actionId =
      target.kind === 'phoenix' ? 'endurance-phoenix' : `${target.id}-${target.level}`;
    setPendingTalentAction(actionId);
    setShopNotice(null);

    try {
      const result =
        target.kind === 'phoenix'
          ? await purchaseEndurancePhoenixTalent()
          : await purchaseEnduranceTalentLevel(target.id);

      setPlayerProfile(result.profile);

      if (result.status === 'not-enough-watermelons') {
        setShopNotice('Pas assez de pasteques pour cette competence.');
        return;
      }

      if (result.status === 'locked') {
        setShopNotice('Cette competence est encore verrouillee.');
        return;
      }

      if (result.status === 'already-maxed') {
        setShopNotice('Cette competence est deja au maximum.');
        return;
      }

      emitTalentsUpdated();
      setShopNotice('Competence achetee !');
    } finally {
      setPendingTalentAction(null);
    }
  };

  const handleEnduranceTalentRefund = async (
    target: SelectedEnduranceTalent,
  ): Promise<void> => {
    if (pendingTalentAction) {
      return;
    }

    const actionId =
      target.kind === 'phoenix' ? 'endurance-phoenix' : `${target.id}-${target.level}`;
    setPendingTalentAction(actionId);
    setShopNotice(null);

    try {
      const result =
        target.kind === 'phoenix'
          ? await refundEndurancePhoenixTalent()
          : await refundEnduranceTalentLevel(target.id);

      setPlayerProfile(result.profile);

      if (result.status !== 'refunded') {
        setShopNotice('Cette competence bloque une autre competence achetee.');
        return;
      }

      emitTalentsUpdated();
      setShopNotice('Competence remboursee.');
    } finally {
      setPendingTalentAction(null);
    }
  };

  const handleBlueTalentPurchase = async (
    target: SelectedBlueTalent,
  ): Promise<void> => {
    if (pendingTalentAction) {
      return;
    }

    const actionId =
      target.kind === 'feast' ? 'blue-feast' : `blue-${target.id}-${target.level}`;
    setPendingTalentAction(actionId);
    setShopNotice(null);

    try {
      const result =
        target.kind === 'feast'
          ? await purchaseBlueFeastTalent()
          : await purchaseBlueTalentLevel(target.id);

      setPlayerProfile(result.profile);

      if (result.status === 'not-enough-watermelons') {
        setShopNotice('Pas assez de pasteques pour cette competence.');
        return;
      }

      if (result.status === 'locked') {
        setShopNotice('Cette competence est encore verrouillee.');
        return;
      }

      if (result.status === 'already-maxed') {
        setShopNotice('Cette competence est deja au maximum.');
        return;
      }

      emitTalentsUpdated();
      setShopNotice('Competence achetee !');
    } finally {
      setPendingTalentAction(null);
    }
  };

  const handleBlueTalentRefund = async (
    target: SelectedBlueTalent,
  ): Promise<void> => {
    if (pendingTalentAction) {
      return;
    }

    const actionId =
      target.kind === 'feast'
        ? 'blue-feast-refund'
        : `blue-${target.id}-${target.level}-refund`;
    setPendingTalentAction(actionId);
    setShopNotice(null);

    try {
      const result =
        target.kind === 'feast'
          ? await refundBlueFeastTalent()
          : await refundBlueTalentLevel(target.id);

      setPlayerProfile(result.profile);

      if (result.status !== 'refunded') {
        setShopNotice('Cette competence bloque une autre competence achetee.');
        return;
      }

      emitTalentsUpdated();
      setShopNotice('Competence remboursee.');
    } finally {
      setPendingTalentAction(null);
    }
  };

  const controlTalentState = playerProfile.controlTalents;
  const allControlTalentsMaxed = Object.values(controlTalentState.levels).every(
    (level) => level >= CONTROL_TALENT_MAX_LEVEL,
  );
  const selectedControlTalentDetails = selectedControlTalent
    ? (() => {
        if (selectedControlTalent.kind === 'master') {
          return {
            title: CONTROL_MASTER_TALENT.title,
            icon: CONTROL_MASTER_TALENT.icon,
            levelLabel: controlTalentState.master ? 'Ultime debloque' : 'Ultime',
            description: CONTROL_MASTER_TALENT.description,
            price: CONTROL_MASTER_TALENT.cost,
            refund: Math.floor(CONTROL_MASTER_TALENT.cost / 2),
            isOwned: controlTalentState.master,
            isRefundable: controlTalentState.master,
            canBuy: !controlTalentState.master && allControlTalentsMaxed,
          };
        }

        const definition = getControlTalentDefinition(selectedControlTalent.id);
        const currentLevel = controlTalentState.levels[selectedControlTalent.id];
        const targetLevel = selectedControlTalent.level;
        const isOwned = currentLevel >= targetLevel;
        const isRefundable =
          !controlTalentState.master && isOwned && currentLevel === targetLevel;
        const canBuy =
          !controlTalentState.master &&
          !isOwned &&
          currentLevel + 1 === targetLevel;
        const price = definition.costs[targetLevel - 1] ?? 0;

        return {
          title: definition.title,
          icon: definition.icon,
          levelLabel: `Niveau ${targetLevel}`,
          description: `${definition.description} Valeur: ${
            definition.levels[targetLevel - 1]
          }.`,
          price,
          refund: Math.floor(price / 2),
          isOwned,
          isRefundable,
          canBuy,
        };
      })()
    : null;
  const enduranceTalentState = playerProfile.enduranceTalents;
  const allEnduranceTalentsMaxed =
    areAllEnduranceTalentsMaxed(enduranceTalentState);
  const selectedEnduranceTalentDetails = selectedEnduranceTalent
    ? (() => {
        if (selectedEnduranceTalent.kind === 'phoenix') {
          return {
            title: ENDURANCE_PHOENIX_TALENT.title,
            icon: ENDURANCE_PHOENIX_TALENT.icon,
            levelLabel: enduranceTalentState.phoenix
              ? 'Ultime debloque'
              : 'Ultime',
            description: ENDURANCE_PHOENIX_TALENT.description,
            price: ENDURANCE_PHOENIX_TALENT.cost,
            refund: Math.floor(ENDURANCE_PHOENIX_TALENT.cost / 2),
            isOwned: enduranceTalentState.phoenix,
            isRefundable: enduranceTalentState.phoenix,
            canBuy: !enduranceTalentState.phoenix && allEnduranceTalentsMaxed,
          };
        }

        const definition = getEnduranceTalentDefinition(selectedEnduranceTalent.id);
        const currentLevel = enduranceTalentState.levels[selectedEnduranceTalent.id];
        const targetLevel = selectedEnduranceTalent.level;
        const isOwned = enduranceTalentState.phoenix || currentLevel >= targetLevel;
        const isRefundable =
          !enduranceTalentState.phoenix &&
          isOwned &&
          currentLevel === targetLevel &&
          canRefundEnduranceTalentLevel(
            enduranceTalentState,
            selectedEnduranceTalent.id,
          );
        const isUnlocked = isEnduranceTalentUnlocked(
          enduranceTalentState,
          definition,
        );
        const canBuy =
          !enduranceTalentState.phoenix &&
          isUnlocked &&
          !isOwned &&
          currentLevel + 1 === targetLevel;
        const price = definition.costs[targetLevel - 1] ?? 0;
        const lockedText = definition.requirement
          ? ` Requis: ${definition.requirement.label}.`
          : '';

        return {
          title: definition.title,
          icon: definition.icon,
          levelLabel: `Niveau ${targetLevel}`,
          description: `${definition.description} ${definition.statLabel}: ${
            definition.levels[targetLevel - 1]
          }.${!isUnlocked ? lockedText : ''}`,
          price,
          refund: Math.floor(price / 2),
          isOwned,
          isRefundable,
          canBuy,
        };
      })()
    : null;
  const blueTalentState = playerProfile.blueTalents;
  const allBlueTalentsMaxed = areAllBlueTalentsMaxed(blueTalentState);
  const selectedBlueTalentDetails = selectedBlueTalent
    ? (() => {
        if (selectedBlueTalent.kind === 'feast') {
          return {
            title: BLUE_FEAST_TALENT.title,
            icon: BLUE_FEAST_TALENT.icon,
            levelLabel: blueTalentState.feast ? 'Ultime debloque' : 'Ultime',
            description: BLUE_FEAST_TALENT.description,
            price: BLUE_FEAST_TALENT.cost,
            refund: Math.floor(BLUE_FEAST_TALENT.cost / 2),
            isOwned: blueTalentState.feast,
            isRefundable: blueTalentState.feast,
            canBuy: !blueTalentState.feast && allBlueTalentsMaxed,
          };
        }

        const definition = getBlueTalentDefinition(selectedBlueTalent.id);
        const currentLevel = blueTalentState.levels[selectedBlueTalent.id];
        const targetLevel = selectedBlueTalent.level;
        const isUnlocked = isBlueTalentUnlocked(blueTalentState, definition);
        const isOwned = blueTalentState.feast || currentLevel >= targetLevel;
        const isRefundable =
          !blueTalentState.feast &&
          isOwned &&
          currentLevel === targetLevel &&
          canRefundBlueTalentLevel(blueTalentState, selectedBlueTalent.id);
        const canBuy =
          !blueTalentState.feast &&
          isUnlocked &&
          !isOwned &&
          currentLevel + 1 === targetLevel;
        const price = definition.costs[targetLevel - 1] ?? 0;
        const lockText =
          !isUnlocked && definition.requirement
            ? ` ${definition.requirement.label}.`
            : '';

        return {
          title: definition.title,
          icon: definition.icon,
          levelLabel: `Niveau ${targetLevel}`,
          description: `${definition.description} ${definition.statLabel}: ${
            definition.levels[targetLevel - 1]
          }.${lockText}`,
          price,
          refund: Math.floor(price / 2),
          isOwned,
          isRefundable,
          canBuy,
        };
      })()
    : null;

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
                {IS_DEV && (
                  <button
                    type="button"
                    className="shop-dev-watermelon-button"
                    onClick={() => void handleDevAddWatermelons()}
                  >
                    +5
                  </button>
                )}
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
                  >
                    {selectedTalentTreeTab === 'control' && (
                      <div
                        className="control-talent-tree"
                        onPointerDown={handleControlTalentTreePointerDown}
                      >
                        <button
                          type="button"
                          className={`control-talent-node control-talent-node--master${
                            controlTalentState.master ? ' is-owned' : ''
                          }${!allControlTalentsMaxed ? ' is-locked' : ''}`}
                          style={getTalentNodePositionStyle(
                            CONTROL_MASTER_NODE_POSITION,
                          )}
                          onClick={() => selectControlTalent({ kind: 'master' })}
                        >
                          <img src={CONTROL_MASTER_TALENT.icon} alt="" aria-hidden="true" />
                          <span className="control-talent-node__title">
                            {CONTROL_MASTER_TALENT.title}
                          </span>
                          <span className="control-talent-node__price">
                            <img
                              src="/assets/collectable/pasteque.png"
                              alt=""
                              aria-hidden="true"
                            />
                            {CONTROL_MASTER_TALENT.cost}
                          </span>
                        </button>

                        <div className="control-talent-columns">
                          {CONTROL_TALENTS.map((talent) => {
                            const currentLevel = controlTalentState.levels[talent.id];

                            return (
                              <div className="control-talent-column" key={talent.id}>
                                {[4, 3, 2, 1].map((level) => {
                                  const isOwned =
                                    controlTalentState.master || currentLevel >= level;
                                  const isNext =
                                    !controlTalentState.master &&
                                    currentLevel + 1 === level;
                                  const isLocked =
                                    !controlTalentState.master && !isOwned && !isNext;
                                  const price = talent.costs[level - 1] ?? 0;
                                  const position = getControlTalentNodePosition(
                                    talent.id,
                                    level,
                                  );

                                  return (
                                    <button
                                      type="button"
                                      key={`${talent.id}-${level}`}
                                      className={`control-talent-node control-talent-node--level-${level}${
                                        isOwned ? ' is-owned' : ''
                                      }${isNext ? ' is-next' : ''}${
                                        isLocked ? ' is-locked' : ''
                                      }`}
                                      style={getTalentNodePositionStyle(position)}
                                      onClick={() =>
                                        selectControlTalent({
                                          kind: 'talent',
                                          id: talent.id,
                                          level,
                                        })
                                      }
                                    >
                                      <img src={talent.icon} alt="" aria-hidden="true" />
                                      <span className="control-talent-node__title">
                                        {talent.title}
                                      </span>
                                      <span className="control-talent-node__level">
                                        niv {level}
                                      </span>
                                      <span className="control-talent-node__price">
                                        <img
                                          src="/assets/collectable/pasteque.png"
                                          alt=""
                                          aria-hidden="true"
                                        />
                                        {price}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>

                        {selectedControlTalentDetails && (
                          <aside
                            className={`talent-detail-sheet${
                              isControlTalentSheetClosing ? ' is-closing' : ''
                            }`}
                            aria-live="polite"
                          >
                            <img
                              className="talent-detail-sheet__icon"
                              src={selectedControlTalentDetails.icon}
                              alt=""
                              aria-hidden="true"
                            />
                            <div className="talent-detail-sheet__copy">
                              <strong>{selectedControlTalentDetails.title}</strong>
                              <span>{selectedControlTalentDetails.levelLabel}</span>
                              <p>{selectedControlTalentDetails.description}</p>
                            </div>
                            {selectedControlTalentDetails.isRefundable ? (
                              <button
                                type="button"
                                className="talent-detail-sheet__refund"
                                disabled={pendingTalentAction !== null}
                                onClick={() =>
                                  selectedControlTalent &&
                                  handleControlTalentRefund(selectedControlTalent)
                                }
                              >
                                <span className="visually-hidden">
                                  Rembourser {selectedControlTalentDetails.refund}
                                </span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="talent-detail-sheet__buy"
                                disabled={
                                  pendingTalentAction !== null ||
                                  !selectedControlTalentDetails.canBuy
                                }
                                onClick={() =>
                                  selectedControlTalent &&
                                  handleControlTalentPurchase(selectedControlTalent)
                                }
                              >
                                <span className="visually-hidden">
                                  Acheter {selectedControlTalentDetails.price}
                                </span>
                              </button>
                            )}
                          </aside>
                        )}
                      </div>
                    )}

                    {selectedTalentTreeTab === 'endurance' && (
                      <div
                        className="endurance-talent-tree"
                        onPointerDown={handleEnduranceTalentTreePointerDown}
                      >
                        <button
                          type="button"
                          className={`endurance-talent-node endurance-talent-node--phoenix${
                            enduranceTalentState.phoenix ? ' is-owned' : ''
                          }${!allEnduranceTalentsMaxed ? ' is-locked' : ''}`}
                          style={getTalentNodePositionStyle(
                            ENDURANCE_PHOENIX_NODE_POSITION,
                          )}
                          onClick={() => selectEnduranceTalent({ kind: 'phoenix' })}
                        >
                          <img
                            src={ENDURANCE_PHOENIX_TALENT.icon}
                            alt=""
                            aria-hidden="true"
                          />
                          <span className="control-talent-node__title">
                            {ENDURANCE_PHOENIX_TALENT.title}
                          </span>
                          <span className="control-talent-node__price">
                            <img
                              src="/assets/collectable/pasteque.png"
                              alt=""
                              aria-hidden="true"
                            />
                            {ENDURANCE_PHOENIX_TALENT.cost}
                          </span>
                        </button>

                        <div className="endurance-talent-columns">
                          {ENDURANCE_TALENTS.map((talent) => {
                            const currentLevel = enduranceTalentState.levels[talent.id];
                            const maxLevel = ENDURANCE_TALENT_MAX_LEVEL_BY_ID[talent.id];
                            const isUnlocked = isEnduranceTalentUnlocked(
                              enduranceTalentState,
                              talent,
                            );
                            const levels = Array.from(
                              { length: maxLevel },
                              (_value, index) => maxLevel - index,
                            );

                            return (
                              <div
                                className={`endurance-talent-column endurance-talent-column--${talent.id}`}
                                key={talent.id}
                              >
                                {levels.map((level) => {
                                  const isOwned =
                                    enduranceTalentState.phoenix ||
                                    currentLevel >= level;
                                  const isNext =
                                    !enduranceTalentState.phoenix &&
                                    isUnlocked &&
                                    currentLevel + 1 === level;
                                  const isLocked =
                                    !enduranceTalentState.phoenix &&
                                    (!isUnlocked || (!isOwned && !isNext));
                                  const price = talent.costs[level - 1] ?? 0;
                                  const position = getEnduranceTalentNodePosition(
                                    talent.id,
                                    level,
                                  );

                                  return (
                                    <button
                                      type="button"
                                      key={`${talent.id}-${level}`}
                                      className={`endurance-talent-node endurance-talent-node--level-${level}${
                                        isOwned ? ' is-owned' : ''
                                      }${isNext ? ' is-next' : ''}${
                                        isLocked ? ' is-locked' : ''
                                      }`}
                                      style={getTalentNodePositionStyle(position)}
                                      onClick={() =>
                                        selectEnduranceTalent({
                                          kind: 'talent',
                                          id: talent.id,
                                          level,
                                        })
                                      }
                                    >
                                      <img src={talent.icon} alt="" aria-hidden="true" />
                                      <span className="control-talent-node__title">
                                        {talent.title}
                                      </span>
                                      <span className="control-talent-node__level">
                                        niv {level}
                                      </span>
                                      <span className="control-talent-node__price">
                                        <img
                                          src="/assets/collectable/pasteque.png"
                                          alt=""
                                          aria-hidden="true"
                                        />
                                        {price}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>

                        {selectedEnduranceTalentDetails && (
                          <aside
                            className={`talent-detail-sheet${
                              isEnduranceTalentSheetClosing ? ' is-closing' : ''
                            }`}
                            aria-live="polite"
                          >
                            <img
                              className="talent-detail-sheet__icon"
                              src={selectedEnduranceTalentDetails.icon}
                              alt=""
                              aria-hidden="true"
                            />
                            <div className="talent-detail-sheet__copy">
                              <strong>{selectedEnduranceTalentDetails.title}</strong>
                              <span>{selectedEnduranceTalentDetails.levelLabel}</span>
                              <p>{selectedEnduranceTalentDetails.description}</p>
                            </div>
                            {selectedEnduranceTalentDetails.isRefundable ? (
                              <button
                                type="button"
                                className="talent-detail-sheet__refund"
                                disabled={pendingTalentAction !== null}
                                onClick={() =>
                                  selectedEnduranceTalent &&
                                  handleEnduranceTalentRefund(selectedEnduranceTalent)
                                }
                              >
                                <span className="visually-hidden">
                                  Rembourser {selectedEnduranceTalentDetails.refund}
                                </span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="talent-detail-sheet__buy"
                                disabled={
                                  pendingTalentAction !== null ||
                                  !selectedEnduranceTalentDetails.canBuy
                                }
                                onClick={() =>
                                  selectedEnduranceTalent &&
                                  handleEnduranceTalentPurchase(selectedEnduranceTalent)
                                }
                              >
                                <span className="visually-hidden">
                                  Acheter {selectedEnduranceTalentDetails.price}
                                </span>
                              </button>
                            )}
                          </aside>
                        )}
                      </div>
                    )}

                    {selectedTalentTreeTab === 'talents' && (
                      <div
                        className="blue-talent-tree"
                        onPointerDown={handleBlueTalentTreePointerDown}
                      >
                        <button
                          type="button"
                          className={`blue-talent-node blue-talent-node--feast${
                            blueTalentState.feast ? ' is-owned' : ''
                          }${!allBlueTalentsMaxed ? ' is-locked' : ''}`}
                          style={getTalentNodePositionStyle(
                            BLUE_FEAST_NODE_POSITION,
                          )}
                          onClick={() => selectBlueTalent({ kind: 'feast' })}
                        >
                          <img
                            src={BLUE_FEAST_TALENT.icon}
                            alt=""
                            aria-hidden="true"
                          />
                          <span className="control-talent-node__title">
                            {BLUE_FEAST_TALENT.title}
                          </span>
                          <span className="control-talent-node__price">
                            <img
                              src="/assets/collectable/pasteque.png"
                              alt=""
                              aria-hidden="true"
                            />
                            {BLUE_FEAST_TALENT.cost}
                          </span>
                        </button>

                        {BLUE_TALENTS.flatMap((talent) => {
                          const currentLevel = blueTalentState.levels[talent.id];
                          const maxLevel = BLUE_TALENT_MAX_LEVEL_BY_ID[talent.id];
                          const isUnlocked = isBlueTalentUnlocked(
                            blueTalentState,
                            talent,
                          );
                          const levels = Array.from(
                            { length: maxLevel },
                            (_value, index) => maxLevel - index,
                          );

                          return levels.map((level) => {
                            const position = getBlueTalentNodePosition(
                              talent.id,
                              level,
                            );
                            const isOwned =
                              blueTalentState.feast || currentLevel >= level;
                            const isNext =
                              !blueTalentState.feast &&
                              isUnlocked &&
                              currentLevel + 1 === level;
                            const isLocked =
                              !blueTalentState.feast &&
                              (!isUnlocked || (!isOwned && !isNext));
                            const price = talent.costs[level - 1] ?? 0;

                            return (
                              <button
                                type="button"
                                key={`${talent.id}-${level}`}
                                className={`blue-talent-node blue-talent-node--${talent.id} blue-talent-node--level-${level}${
                                  isOwned ? ' is-owned' : ''
                                }${isNext ? ' is-next' : ''}${
                                  isLocked ? ' is-locked' : ''
                                }`}
                                style={getTalentNodePositionStyle(position)}
                                onClick={() =>
                                  selectBlueTalent({
                                    kind: 'talent',
                                    id: talent.id,
                                    level,
                                  })
                                }
                              >
                                <img src={talent.icon} alt="" aria-hidden="true" />
                                <span className="control-talent-node__title">
                                  {talent.title}
                                </span>
                                <span className="control-talent-node__level">
                                  niv {level}
                                </span>
                                <span className="control-talent-node__price">
                                  <img
                                    src="/assets/collectable/pasteque.png"
                                    alt=""
                                    aria-hidden="true"
                                  />
                                  {price}
                                </span>
                              </button>
                            );
                          });
                        })}

                        {selectedBlueTalentDetails && (
                          <aside
                            className={`talent-detail-sheet${
                              isBlueTalentSheetClosing ? ' is-closing' : ''
                            }`}
                            aria-live="polite"
                          >
                            <img
                              className="talent-detail-sheet__icon"
                              src={selectedBlueTalentDetails.icon}
                              alt=""
                              aria-hidden="true"
                            />
                            <div className="talent-detail-sheet__copy">
                              <strong>{selectedBlueTalentDetails.title}</strong>
                              <span>{selectedBlueTalentDetails.levelLabel}</span>
                              <p>{selectedBlueTalentDetails.description}</p>
                            </div>
                            {selectedBlueTalentDetails.isRefundable ? (
                              <button
                                type="button"
                                className="talent-detail-sheet__refund"
                                disabled={pendingTalentAction !== null}
                                onClick={() =>
                                  selectedBlueTalent &&
                                  handleBlueTalentRefund(selectedBlueTalent)
                                }
                              >
                                <span className="visually-hidden">
                                  Rembourser {selectedBlueTalentDetails.refund}
                                </span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="talent-detail-sheet__buy"
                                disabled={
                                  pendingTalentAction !== null ||
                                  !selectedBlueTalentDetails.canBuy
                                }
                                onClick={() =>
                                  selectedBlueTalent &&
                                  handleBlueTalentPurchase(selectedBlueTalent)
                                }
                              >
                                <span className="visually-hidden">
                                  Acheter {selectedBlueTalentDetails.price}
                                </span>
                              </button>
                            )}
                          </aside>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>
        </section>
      )}
    </main>
  );
}
