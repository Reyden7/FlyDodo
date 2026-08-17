import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import {
  AUDIO_CHANNELS,
  getAudioSettings,
  setAudioChannelVolume,
  subscribeAudioSettings,
  type AudioChannel,
  type AudioSettings,
} from './audio/audioSettings';
import {
  APP_LANGUAGES,
  getAppLanguage,
  setAppLanguage,
  subscribeAppLanguage,
  translate,
  type AppLanguage,
} from './i18n/i18n';
import {
  localizeShopItemTitle,
  localizeTalent,
} from './i18n/entityTranslations';
import {
  emitCosmeticEquipped,
  emitShopObjectsUpdated,
  emitTalentsUpdated,
  gameEvents,
  requestGamePause,
  requestGameResume,
  requestRewardedRevive,
  requestRestart,
  type FallWarningDetail,
  type FlightHudDetail,
  type PlayerDeathReason,
  type PlayerDiedDetail,
  type WalletUpdatedDetail,
} from './game/events';
import {
  DEV_START_ALTITUDE_MAX,
  DEV_START_ALTITUDE_MIN,
  DEV_START_ALTITUDE_STEP,
  getDevStartAltitude,
  setDevStartAltitude,
} from './game/devSettings';
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
  purchaseShopObject,
  purchaseShopItem,
  refundBlueFeastTalent,
  refundBlueTalentLevel,
  refundControlMasterTalent,
  refundControlTalentLevel,
  refundEndurancePhoenixTalent,
  refundEnduranceTalentLevel,
  unlockFullGame,
  unequipShopItem,
  type PlayerProfile,
  type ShopObjectId,
} from './services/saveService';
import {
  initializeAds,
  setForcedAdsDisabled,
  showInterstitialAd,
  showRewardedAd,
} from './services/adService';
import {
  purchaseFullGame,
  purchaseWatermelonPack,
  restoreFullGamePurchase,
  type WatermelonPackId,
} from './services/purchaseService';
import {
  getShopItemImagePath,
  getShopItemToneForPrice,
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

const loadGameCanvas = () => import('./components/GameCanvas');
const GameCanvas = lazy(async () => {
  const module = await loadGameCanvas();
  return { default: module.GameCanvas };
});

type TutorialSide = 'left' | 'right' | null;
type TutorialStep =
  | 'controls'
  | 'shop'
  | 'talents'
  | 'tree'
  | 'ultimate-control'
  | 'ultimate-endurance'
  | 'ultimate-talents'
  | null;
type MainMenuButton = 'play' | 'shop' | 'tutorial';
type ShopTab = 'accessories' | 'talents' | 'items' | 'watermelons';
type TalentTreeTab = 'control' | 'endurance' | 'talents';
interface AdAudioSnapshot {
  menuMusicWasPlaying: boolean;
  gameMusicWasPlaying: boolean;
  interfaceAudioWasRunning: boolean;
}
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
}: TalentNodePosition, centerOnPosition = false): CSSProperties => {
  const backgroundAspectRatio = 1122 / 1402;
  const horizontalOffsetInContainerHeights =
    (x - 50) * backgroundAspectRatio;

  return {
    left: `calc(50% + ${horizontalOffsetInContainerHeights}cqh)`,
    top: centerOnPosition ? `calc(${y}% - 52px)` : `${y}%`,
  };
};

const MENU_MUSIC_PATH = '/assets/menu/sounds/openMusic.mp3';
const MENU_POP_SOUND_PATH = '/assets/menu/sounds/pop.mp3';
const MENU_PLAY_SOUND_PATH = '/assets/menu/sounds/play.mp3';
const MENU_BUTTON_SOUND_PATH = '/assets/menu/sounds/button.mp3';
const STORY_INTRO_IMAGES = [
  '/assets/story/intro-panel-1.webp',
  '/assets/story/intro-panel-2.webp',
  '/assets/story/intro-panel-3.webp',
  '/assets/story/intro-panel-4.webp',
  '/assets/story/intro-panel-5.webp',
  '/assets/story/intro-panel-6.webp',
] as const;
const STORY_INTRO_STORAGE_KEY = 'flydodo.story-intro-seen.v2';
const STORY_INTRO_PANEL_COUNT = STORY_INTRO_IMAGES.length;
const END_STORY_IMAGES = [
  '/assets/story/End1.webp',
  '/assets/story/End2.webp',
  '/assets/story/End3.webp',
] as const;
const GAME_MUSIC_PATH = '/assets/sounds/musique.mp3';
const GAME_MUSIC_VOLUME = 0.5;
const SPACE_MUSIC_FILTER_START_ALTITUDE = 7_000;
const SPACE_MUSIC_FILTER_END_ALTITUDE = 7_500;
const SPACE_MUSIC_NORMAL_CUTOFF_HZ = 20_000;
const SPACE_MUSIC_MUFFLED_CUTOFF_HZ = 520;
const SPACE_MUSIC_MUFFLED_VOLUME_MULTIPLIER = 0.62;
const GAME_OVER_DEATH_IMAGES: Record<PlayerDeathReason, string> = {
  default: '/assets/ui/GameOver/deadByOther.webp',
  obstacle: '/assets/ui/GameOver/deadByOther.webp',
  mosquito: '/assets/ui/GameOver/deadByMosquito.webp',
  lava: '/assets/ui/GameOver/deadLava.webp',
  lightning: '/assets/ui/GameOver/deadLightning.webp',
  space: '/assets/dodo/SpriteDodo/degats/deadSpace.webp',
  ufo: '/assets/dodo/SpriteDodo/degats/alien.webp',
};
const MENU_POP_SOUND_DELAYS_MS = [180, 760, 1280, 1390] as const;
const MAIN_MENU_CLICK_DELAY_MS = 140;
const SHOP_MAIN_TAB_SOUND_PATH = '/assets/sounds/button3.mp3';
const SHOP_FILTER_SOUND_PATH = '/assets/sounds/button.mp3';
const SHOP_BUY_SOUND_PATH = '/assets/sounds/buy2.mp3';
const SHOP_ERROR_SOUND_PATH = '/assets/sounds/error.mp3';
const SHOP_EQUIP_SOUND_PATH = '/assets/sounds/equipe.mp3';
const TALENT_UNLOCKED_SOUND_PATH = '/assets/sounds/skillUnlocked.mp3';
const TALENT_REFUND_SOUND_PATH = '/assets/sounds/buy.mp3';

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

const SHOP_OBJECT_SLOTS: ReadonlyArray<{
  id: ShopObjectId;
  title: string;
  icon: string;
  price: number;
}> = [
  {
    id: 'life-vial',
    title: 'Fiole de vie',
    icon: '/assets/objets/fioleVie.webp',
    price: 10,
  },
  {
    id: 'watermelon-magnet',
    title: 'Aimant à pastèque',
    icon: '/assets/objets/aimant.webp',
    price: 5,
  },
] as const;

const WATERMELON_PACKS: ReadonlyArray<{
  id: WatermelonPackId;
  title: string;
  amount: string;
  price: string;
  pile: number;
  src:string;
}> = [
  { id: 'small', title: 'Petit sac', amount: '5', price: '2,29 €', pile: 1, src:"/assets/shopPasteque/petitSac.webp" },
  { id: 'medium', title: 'Sac moyen', amount: '10', price: '4,49 €', pile: 1 , src:"/assets/shopPasteque/sacMoyen.webp"},
  { id: 'large', title: 'Grand sac', amount: '15', price: '8,99 €', pile: 1, src:"/assets/shopPasteque/GrandSac.webp" },
  { id: 'chest', title: 'Coffre de pastèques', amount: '50', price: '17,99 €', pile: 1, src:"/assets/shopPasteque/Coffre.webp" },
  { id: 'barrel', title: 'Tonneau de pastèques', amount: '75', price: '32,99 €', pile: 1 , src:"/assets/shopPasteque/Tonneau.webp"},
  { id: 'mountain', title: 'Montagne de pastèques', amount: '150', price: '64,99 €', pile: 1, src:"/assets/shopPasteque/Montagne.webp" },
] as const;

function isShopObjectActive(
  profile: PlayerProfile,
  objectId: ShopObjectId,
): boolean {
  switch (objectId) {
    case 'life-vial':
      return profile.shopObjects.lifeVial;
    case 'watermelon-magnet':
      return profile.shopObjects.watermelonMagnet;
  }
}

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
      decoding="async"
      loading="lazy"
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

function AudioOptionsPanel({
  settings,
  language,
  onClose,
}: {
  settings: AudioSettings;
  language: AppLanguage;
  onClose: () => void;
}): React.JSX.Element {
  const [devStartAltitude, setDevStartAltitudeState] =
    useState(getDevStartAltitude);
  const t = (
    key: string,
    variables?: Record<string, string | number>,
  ): string => translate(key, variables, language);
  const lastAudibleVolumeRef = useRef<Record<AudioChannel, number>>(
    AUDIO_CHANNELS.reduce<Record<AudioChannel, number>>(
      (volumes, { id }) => {
        volumes[id] = settings[id] > 0 ? settings[id] : 1;
        return volumes;
      },
      {} as Record<AudioChannel, number>,
    ),
  );

  const updateVolume = (channel: AudioChannel, volume: number): void => {
    if (volume > 0) {
      lastAudibleVolumeRef.current[channel] = volume;
    }
    setAudioChannelVolume(channel, volume);
  };

  const toggleMute = (channel: AudioChannel): void => {
    const currentVolume = settings[channel];
    updateVolume(
      channel,
      currentVolume > 0
        ? 0
        : Math.max(0.05, lastAudibleVolumeRef.current[channel] ?? 1),
    );
  };

  return (
    <section
      className="audio-options"
      role="dialog"
      aria-modal="true"
      aria-labelledby="audio-options-title"
      onClick={onClose}
    >
      <div
        className="audio-options__panel"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="audio-options__header">
          <span className="audio-options__gear" aria-hidden="true">
            ⚙
          </span>
          <h2 id="audio-options-title">{t('options.title')}</h2>
          <button
            type="button"
            className="audio-options__close"
            aria-label={t('options.close')}
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div className="audio-options__channels">
          <div className="audio-options__language">
            <label htmlFor="app-language">{t('options.language')}</label>
            <select
              id="app-language"
              value={language}
              onChange={(event) =>
                setAppLanguage(event.currentTarget.value as AppLanguage)
              }
            >
              {APP_LANGUAGES.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {import.meta.env.DEV && (
            <div className="audio-options__dev-altitude">
              <label htmlFor="dev-start-altitude">
                {t('options.devStartAltitude')}
              </label>
              <input
                id="dev-start-altitude"
                type="range"
                min={DEV_START_ALTITUDE_MIN}
                max={DEV_START_ALTITUDE_MAX}
                step={DEV_START_ALTITUDE_STEP}
                value={devStartAltitude}
                style={
                  {
                    '--dev-altitude':
                      `${(devStartAltitude / DEV_START_ALTITUDE_MAX) * 100}%`,
                  } as CSSProperties
                }
                aria-valuetext={`${devStartAltitude} m`}
                onChange={(event) => {
                  const altitude = setDevStartAltitude(
                    Number(event.currentTarget.value),
                  );
                  setDevStartAltitudeState(altitude);
                }}
              />
              <output>{devStartAltitude} m</output>
              <small>{t('options.devStartAltitudeHint')}</small>
            </div>
          )}

          {AUDIO_CHANNELS.map(({ id }) => {
            const label = t(`audio.${id}`);
            const volume = settings[id];
            const isMuted = volume <= 0;

            return (
              <div className="audio-options__channel" key={id}>
                <label htmlFor={`audio-volume-${id}`}>{label}</label>
                <button
                  type="button"
                  className={`audio-options__mute${
                    isMuted ? ' is-muted' : ''
                  }`}
                  aria-label={t(isMuted ? 'audio.unmute' : 'audio.mute', {
                    label,
                  })}
                  aria-pressed={isMuted}
                  onClick={() => toggleMute(id)}
                >
                  <img
                    src={
                      isMuted
                        ? '/assets/ui/volume-barré.webp'
                        : '/assets/ui/volume.webp'
                    }
                    alt=""
                    aria-hidden="true"
                  />
                </button>
                <input
                  id={`audio-volume-${id}`}
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  style={{ '--audio-volume': `${volume * 100}%` } as CSSProperties}
                  aria-label={t('audio.volume', { label })}
                  aria-valuetext={`${Math.round(volume * 100)} %`}
                  onChange={(event) =>
                    updateVolume(id, Number(event.currentTarget.value))
                  }
                />
                <output>{Math.round(volume * 100)}%</output>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default function App(): React.JSX.Element {
  const [isStoryIntroOpen, setIsStoryIntroOpen] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.localStorage.getItem(STORY_INTRO_STORAGE_KEY) !== 'true',
  );
  const [storyIntroPanel, setStoryIntroPanel] = useState(0);
  const [shouldStartTutorialAfterStory, setShouldStartTutorialAfterStory] =
    useState(
      () =>
        typeof window !== 'undefined' &&
        window.localStorage.getItem(STORY_INTRO_STORAGE_KEY) !== 'true',
    );
  const [isEndStoryOpen, setIsEndStoryOpen] = useState(false);
  const [endStoryPanel, setEndStoryPanel] = useState(0);
  const [isMainMenuOpen, setIsMainMenuOpen] = useState(true);
  const [isGameSceneReady, setIsGameSceneReady] = useState(false);
  const [clickedMainMenuButton, setClickedMainMenuButton] =
    useState<MainMenuButton | null>(null);
  const [altitude, setAltitude] = useState(0);
  const [bestAltitude, setBestAltitude] = useState(0);
  const [newRecord, setNewRecord] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [watermelons, setWatermelons] = useState(0);
  const [lives, setLives] = useState(1);
  const [maxLives, setMaxLives] = useState(1);
  const [lifeVialActive, setLifeVialActive] = useState(false);
  const [shield, setShield] = useState(0);
  const [maxShield, setMaxShield] = useState(0);
  const [fallSeconds, setFallSeconds] = useState<number | null>(null);
  const [warningReason, setWarningReason] = useState<'fall' | 'side'>('fall');
  const [isGameOver, setIsGameOver] = useState(false);
  const [isAudioOptionsOpen, setIsAudioOptionsOpen] = useState(false);
  const [audioSettings, setAudioSettings] =
    useState<AudioSettings>(getAudioSettings);
  const [language, setLanguage] = useState<AppLanguage>(getAppLanguage);
  const [playerDeathReason, setPlayerDeathReason] =
    useState<PlayerDeathReason>('default');
  const [hasMovedThisRun, setHasMovedThisRun] = useState(false);
  const [isGamePaused, setIsGamePaused] = useState(false);
  const [hasUsedRewardedRevive, setHasUsedRewardedRevive] = useState(false);
  const [rewardedReviveError, setRewardedReviveError] = useState(false);
  const [pendingRewardedAd, setPendingRewardedAd] = useState<
    'revive' | 'watermelons' | null
  >(null);
  const [isInterstitialPending, setIsInterstitialPending] = useState(false);
  const deathsSinceInterstitialRef = useRef(0);
  const nextInterstitialDeathRef = useRef(Math.random() < 0.5 ? 5 : 6);
  const interstitialDueRef = useRef(false);

  const [showControlTutorial, setShowControlTutorial] = useState(true);
  const [tutorialSide, setTutorialSide] = useState<TutorialSide>(null);
  const [tutorialStep, setTutorialStep] = useState<TutorialStep>(null);
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
  const [pendingShopObjectId, setPendingShopObjectId] =
    useState<ShopObjectId | null>(null);
  const [pendingWatermelonPackId, setPendingWatermelonPackId] =
    useState<WatermelonPackId | null>(null);
  const [isFullGamePurchasePending, setIsFullGamePurchasePending] =
    useState(false);
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
  const menuMusicRef = useRef<HTMLAudioElement | null>(null);
  const gameMusicRef = useRef<HTMLAudioElement | null>(null);
  const gameMusicSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const gameMusicFilterRef = useRef<BiquadFilterNode | null>(null);
  const bossFightActiveRef = useRef(false);
  const audioSettingsRef = useRef(audioSettings);
  const menuPopTimersRef = useRef<number[]>([]);
  const mainMenuActionTimerRef = useRef<number | null>(null);
  const interfaceAudioContextRef = useRef<AudioContext | null>(null);
  const reversedEquipSoundBufferRef = useRef<AudioBuffer | null>(null);
  const t = (
    key: string,
    variables?: Record<string, string | number>,
  ): string => translate(key, variables, language);

  const filteredShopItems = useMemo(
    () =>
      selectedCategory === 'all'
        ? SHOP_ITEMS
        : SHOP_ITEMS.filter((item) => item.category === selectedCategory),
    [selectedCategory],
  );
  const visibleHeartMax = maxLives;
  const visibleHeartCount = Math.min(lives, visibleHeartMax);

  const playInterfaceSound = (src: string, volume = 1): void => {
    const sound = new Audio(src);
    sound.volume = volume * audioSettingsRef.current.interface;
    void sound.play().catch(() => undefined);
  };

  const getSpaceMusicEffect = (
    currentAltitude: number,
  ): { cutoff: number; volumeMultiplier: number } => {
    const rawProgress =
      (currentAltitude - SPACE_MUSIC_FILTER_START_ALTITUDE) /
      (SPACE_MUSIC_FILTER_END_ALTITUDE -
        SPACE_MUSIC_FILTER_START_ALTITUDE);
    const progress = Math.max(0, Math.min(1, rawProgress));
    const smoothProgress = progress * progress * (3 - 2 * progress);
    const cutoff =
      SPACE_MUSIC_NORMAL_CUTOFF_HZ *
      Math.pow(
        SPACE_MUSIC_MUFFLED_CUTOFF_HZ /
          SPACE_MUSIC_NORMAL_CUTOFF_HZ,
        smoothProgress,
      );

    return {
      cutoff,
      volumeMultiplier:
        1 -
        smoothProgress * (1 - SPACE_MUSIC_MUFFLED_VOLUME_MULTIPLIER),
    };
  };

  const ensureGameMusicFilter = (
    music: HTMLAudioElement,
  ): BiquadFilterNode | null => {
    if (gameMusicFilterRef.current) {
      return gameMusicFilterRef.current;
    }

    try {
      const context = getInterfaceAudioContext();
      const source = context.createMediaElementSource(music);
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.value = 0.85;
      source.connect(filter);
      filter.connect(context.destination);
      gameMusicSourceRef.current = source;
      gameMusicFilterRef.current = filter;
      return filter;
    } catch {
      return null;
    }
  };

  const applySpaceMusicEffect = (
    music: HTMLAudioElement,
    currentAltitude: number,
  ): void => {
    const { cutoff, volumeMultiplier } =
      getSpaceMusicEffect(currentAltitude);
    music.volume =
      GAME_MUSIC_VOLUME *
      audioSettingsRef.current.music *
      volumeMultiplier;

    const filter = ensureGameMusicFilter(music);
    const context = interfaceAudioContextRef.current;

    if (!filter || !context) {
      return;
    }

    filter.frequency.cancelScheduledValues(context.currentTime);
    filter.frequency.setTargetAtTime(cutoff, context.currentTime, 0.18);
  };

  const startGameMusic = (): void => {
    let music = gameMusicRef.current;

    if (!music) {
      music = new Audio(GAME_MUSIC_PATH);
      music.loop = true;
      music.preload = 'auto';
      gameMusicRef.current = music;
    }

    applySpaceMusicEffect(music, altitude);
    const context = interfaceAudioContextRef.current;
    if (context?.state === 'suspended') {
      void context.resume().catch(() => undefined);
    }
    music.pause();
    music.currentTime = 0;
    void music.play().catch(() => undefined);
  };

  const pauseAppAudioForAd = async (): Promise<AdAudioSnapshot> => {
    const menuMusic = menuMusicRef.current;
    const gameMusic = gameMusicRef.current;
    const audioContext = interfaceAudioContextRef.current;
    const snapshot: AdAudioSnapshot = {
      menuMusicWasPlaying: Boolean(menuMusic && !menuMusic.paused),
      gameMusicWasPlaying: Boolean(gameMusic && !gameMusic.paused),
      interfaceAudioWasRunning: audioContext?.state === 'running',
    };

    menuMusic?.pause();
    gameMusic?.pause();

    if (snapshot.interfaceAudioWasRunning && audioContext) {
      await audioContext.suspend().catch(() => undefined);
    }

    return snapshot;
  };

  const resumeAppAudioAfterAd = async (
    snapshot: AdAudioSnapshot,
    restoreMusic: boolean,
  ): Promise<void> => {
    const audioContext = interfaceAudioContextRef.current;

    if (
      snapshot.interfaceAudioWasRunning &&
      audioContext?.state === 'suspended'
    ) {
      await audioContext.resume().catch(() => undefined);
    }

    if (!restoreMusic) {
      return;
    }

    if (snapshot.menuMusicWasPlaying) {
      void menuMusicRef.current?.play().catch(() => undefined);
    }

    if (snapshot.gameMusicWasPlaying) {
      void gameMusicRef.current?.play().catch(() => undefined);
    }
  };

  const getInterfaceAudioContext = (): AudioContext => {
    const AudioContextConstructor =
      window.AudioContext ||
      (
        window as typeof window & {
          webkitAudioContext?: typeof AudioContext;
        }
      ).webkitAudioContext;

    if (!AudioContextConstructor) {
      throw new Error('Web Audio is not supported.');
    }

    if (!interfaceAudioContextRef.current) {
      interfaceAudioContextRef.current = new AudioContextConstructor();
    }

    return interfaceAudioContextRef.current;
  };

  const playReversedEquipSound = async (): Promise<void> => {
    try {
      const context = getInterfaceAudioContext();

      if (context.state === 'suspended') {
        await context.resume();
      }

      if (!reversedEquipSoundBufferRef.current) {
        const response = await fetch(SHOP_EQUIP_SOUND_PATH);
        const audioData = await response.arrayBuffer();
        const decodedBuffer = await context.decodeAudioData(audioData);
        const reversedBuffer = context.createBuffer(
          decodedBuffer.numberOfChannels,
          decodedBuffer.length,
          decodedBuffer.sampleRate,
        );

        for (let channel = 0; channel < decodedBuffer.numberOfChannels; channel += 1) {
          const sourceData = decodedBuffer.getChannelData(channel);
          const reversedData = reversedBuffer.getChannelData(channel);

          for (let index = 0; index < sourceData.length; index += 1) {
            reversedData[index] = sourceData[sourceData.length - 1 - index];
          }
        }

        reversedEquipSoundBufferRef.current = reversedBuffer;
      }

      const source = context.createBufferSource();
      const gain = context.createGain();
      gain.gain.value = audioSettingsRef.current.interface;
      source.buffer = reversedEquipSoundBufferRef.current;
      source.connect(gain);
      gain.connect(context.destination);
      source.start();
    } catch {
      playInterfaceSound(SHOP_EQUIP_SOUND_PATH);
    }
  };

  useEffect(() => {
    const preloadTimer = window.setTimeout(() => {
      void loadGameCanvas();
    }, 400);

    return () => window.clearTimeout(preloadTimer);
  }, []);

  useEffect(
    () =>
      subscribeAudioSettings((settings) => {
        audioSettingsRef.current = settings;
        setAudioSettings(settings);
      }),
    [],
  );

  useEffect(
    () =>
      subscribeAppLanguage((nextLanguage) => {
        setLanguage(nextLanguage);
      }),
    [],
  );

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    audioSettingsRef.current = audioSettings;

    if (menuMusicRef.current) {
      menuMusicRef.current.volume = 0.72 * audioSettings.music;
    }

    if (gameMusicRef.current) {
      applySpaceMusicEffect(gameMusicRef.current, altitude);
    }
  }, [altitude, audioSettings]);

  useEffect(() => {
    void (async () => {
      let profile = await loadLatestPlayerProfile();
      setForcedAdsDisabled(profile.adsRemoved);

      if (!profile.adsRemoved && (await restoreFullGamePurchase())) {
        profile = await unlockFullGame();
        setForcedAdsDisabled(true);
      }

      setPlayerProfile(profile);
      emitShopObjectsUpdated({ shopObjects: profile.shopObjects });

      if (!profile.adsRemoved) {
        void initializeAds();
      }
    })();

    const onHud = (event: Event): void => {
      const hud = (event as CustomEvent<FlightHudDetail>).detail;
      setAltitude(hud.altitude);
      setBestAltitude(hud.bestAltitude);
      setNewRecord(hud.newRecord);
      setSpeed(hud.speed);
      setWatermelons(hud.watermelons);
      setLives(hud.lives);
      setMaxLives(hud.maxLives);
      setLifeVialActive(hud.lifeVialActive);
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

    const onPlayerDied = (event: Event): void => {
      const { reason } = (event as CustomEvent<PlayerDiedDetail>).detail;
      bossFightActiveRef.current = false;
      setPlayerDeathReason(reason);
      setIsGamePaused(false);

      if (reason === 'ufo') {
        setEndStoryPanel(0);
        setIsEndStoryOpen(true);
      }

      const gameMusic = gameMusicRef.current;

      if (gameMusic) {
        gameMusic.pause();
        gameMusic.currentTime = 0;
      }
    };

    const onGameOver = (): void => {
      setIsGameOver(true);
      deathsSinceInterstitialRef.current += 1;

      if (
        deathsSinceInterstitialRef.current >= nextInterstitialDeathRef.current
      ) {
        interstitialDueRef.current = true;
      }
    };

    const onRewardedRevived = (): void => {
      setIsGameOver(false);
      setIsGamePaused(true);
      setPlayerDeathReason('default');
      setFallSeconds(null);
      setRewardedReviveError(false);
    };

    const onMovementStarted = (): void => {
      setHasMovedThisRun(true);
    };

    const onBossFightStarted = (): void => {
      bossFightActiveRef.current = true;
      gameMusicRef.current?.pause();
    };

    const onBossFightEnded = (): void => {
      bossFightActiveRef.current = false;
      const gameMusic = gameMusicRef.current;

      if (gameMusic) {
        void gameMusic.play().catch(() => undefined);
      }
    };

    const onGameSceneReady = (): void => {
      setIsGameSceneReady(true);
    };

    gameEvents.addEventListener('flydodo:hud', onHud);
    gameEvents.addEventListener('flydodo:scene-ready', onGameSceneReady);
    gameEvents.addEventListener('flydodo:wallet-updated', onWalletUpdated);
    gameEvents.addEventListener('flydodo:fall-warning', onFallWarning);
    gameEvents.addEventListener('flydodo:player-died', onPlayerDied);
    gameEvents.addEventListener('flydodo:game-over', onGameOver);
    gameEvents.addEventListener('flydodo:rewarded-revived', onRewardedRevived);
    gameEvents.addEventListener('flydodo:movement-started', onMovementStarted);
    gameEvents.addEventListener('flydodo:boss-fight-started', onBossFightStarted);
    gameEvents.addEventListener('flydodo:boss-fight-ended', onBossFightEnded);

    return () => {
      gameEvents.removeEventListener('flydodo:hud', onHud);
      gameEvents.removeEventListener('flydodo:scene-ready', onGameSceneReady);
      gameEvents.removeEventListener('flydodo:wallet-updated', onWalletUpdated);
      gameEvents.removeEventListener('flydodo:fall-warning', onFallWarning);
      gameEvents.removeEventListener('flydodo:player-died', onPlayerDied);
      gameEvents.removeEventListener('flydodo:game-over', onGameOver);
      gameEvents.removeEventListener(
        'flydodo:rewarded-revived',
        onRewardedRevived,
      );
      gameEvents.removeEventListener('flydodo:movement-started', onMovementStarted);
      gameEvents.removeEventListener(
        'flydodo:boss-fight-started',
        onBossFightStarted,
      );
      gameEvents.removeEventListener(
        'flydodo:boss-fight-ended',
        onBossFightEnded,
      );
    };
  }, []);

  useEffect(() => {
    if (!isMainMenuOpen) {
      return;
    }

    const music = new Audio(MENU_MUSIC_PATH);
    const popSound = new Audio(MENU_POP_SOUND_PATH);
    let isDisposed = false;
    let unlockListenersQueued = false;

    music.loop = false;
    music.preload = 'auto';
    music.volume = 0.72 * audioSettingsRef.current.music;
    popSound.preload = 'auto';
    popSound.volume = audioSettingsRef.current.interface;
    menuMusicRef.current = music;

    const clearPopTimers = (): void => {
      menuPopTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      menuPopTimersRef.current = [];
    };

    const removeUnlockListeners = (): void => {
      window.removeEventListener('pointerdown', unlockMenuAudio, true);
      window.removeEventListener('keydown', unlockMenuAudio, true);
      unlockListenersQueued = false;
    };

    const playPopSound = (): void => {
      const pop = popSound.cloneNode(true) as HTMLAudioElement;
      pop.volume = audioSettingsRef.current.interface;
      pop.currentTime = 0;
      void pop.play().catch(() => undefined);
    };

    const schedulePopSounds = (): void => {
      if (isDisposed) {
        return;
      }

      clearPopTimers();
      menuPopTimersRef.current = MENU_POP_SOUND_DELAYS_MS.map((delay) =>
        window.setTimeout(playPopSound, delay),
      );
    };

    const startMenuAudio = (): void => {
      void music.play().then(schedulePopSounds).catch(queueAudioUnlock);
    };

    const unlockMenuAudio = (): void => {
      removeUnlockListeners();
      startMenuAudio();
    };

    function queueAudioUnlock(): void {
      if (unlockListenersQueued || isDisposed) {
        return;
      }

      unlockListenersQueued = true;
      window.addEventListener('pointerdown', unlockMenuAudio, true);
      window.addEventListener('keydown', unlockMenuAudio, true);
    }

    startMenuAudio();

    return () => {
      isDisposed = true;
      removeUnlockListeners();
      clearPopTimers();
      music.pause();
      music.currentTime = 0;
      music.removeAttribute('src');
      music.load();
      menuMusicRef.current = null;
    };
  }, [isMainMenuOpen]);

  useEffect(() => {
    if (!showControlTutorial || isMainMenuOpen) {
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
        requestGamePause();
        setFallSeconds(null);
        setShowControlTutorial(false);
        setTutorialStep('shop');
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
  }, [isMainMenuOpen, showControlTutorial]);

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

      if (mainMenuActionTimerRef.current !== null) {
        window.clearTimeout(mainMenuActionTimerRef.current);
      }

      const gameMusic = gameMusicRef.current;

      if (gameMusic) {
        gameMusic.pause();
        gameMusicSourceRef.current?.disconnect();
        gameMusicFilterRef.current?.disconnect();
        gameMusicSourceRef.current = null;
        gameMusicFilterRef.current = null;
        gameMusic.removeAttribute('src');
        gameMusic.load();
        gameMusicRef.current = null;
      }

      void interfaceAudioContextRef.current?.close();
      interfaceAudioContextRef.current = null;
      reversedEquipSoundBufferRef.current = null;
    },
    [],
  );

  const resetRunState = (): void => {
    bossFightActiveRef.current = false;
    setIsShopOpen(false);
    setIsGameOver(false);
    setIsEndStoryOpen(false);
    setEndStoryPanel(0);
    setPlayerDeathReason('default');
    setFallSeconds(null);
    setWarningReason('fall');
    setAltitude(0);
    setSpeed(0);
    setWatermelons(0);
    setLives(1);
    setMaxLives(1);
    setLifeVialActive(false);
    setShield(0);
    setMaxShield(0);
    setHasMovedThisRun(false);
    setIsGamePaused(false);
    setHasUsedRewardedRevive(false);
    setRewardedReviveError(false);
  };

  const startGame = (withTutorial = false): void => {
    resetRunState();
    setIsGameSceneReady(false);
    tutorialAcknowledgedRef.current = !withTutorial;
    setTutorialSide(null);
    setShowControlTutorial(withTutorial);
    setTutorialStep(withTutorial ? 'controls' : null);
    setIsMainMenuOpen(false);
  };

  const handleMainMenuButtonClick = (
    button: MainMenuButton,
    action: () => void | Promise<void>,
  ): void => {
    if (mainMenuActionTimerRef.current !== null) {
      return;
    }

    playInterfaceSound(
      button === 'play'
        ? MENU_PLAY_SOUND_PATH
        : button === 'shop'
          ? SHOP_MAIN_TAB_SOUND_PATH
          : MENU_BUTTON_SOUND_PATH,
    );

    if (button === 'play') {
      startGameMusic();
    }

    setClickedMainMenuButton(button);
    mainMenuActionTimerRef.current = window.setTimeout(() => {
      mainMenuActionTimerRef.current = null;
      setClickedMainMenuButton(null);
      void action();
    }, MAIN_MENU_CLICK_DELAY_MS);
  };

  const openAudioOptions = (): void => {
    playInterfaceSound(MENU_BUTTON_SOUND_PATH);
    setIsAudioOptionsOpen(true);
  };

  const closeAudioOptions = (): void => {
    playInterfaceSound(MENU_BUTTON_SOUND_PATH, 0.7);
    setIsAudioOptionsOpen(false);
  };

  const selectShopTab = (tab: ShopTab): void => {
    playInterfaceSound(SHOP_MAIN_TAB_SOUND_PATH);
    setSelectedShopTab(tab);

    if (tab === 'talents' && tutorialStep === 'talents') {
      setTutorialStep('tree');
    }
  };

  const selectShopCategory = (category: ShopFilterCategory): void => {
    playInterfaceSound(SHOP_FILTER_SOUND_PATH);
    setSelectedCategory(category);
  };

  const selectTalentTreeTab = (tab: TalentTreeTab): void => {
    playInterfaceSound(SHOP_FILTER_SOUND_PATH);
    setSelectedTalentTreeTab(tab);
  };

  const restart = async (): Promise<void> => {
    if (isInterstitialPending || pendingRewardedAd) {
      return;
    }

    let shouldStartPaused = false;

    if (interstitialDueRef.current) {
      setIsInterstitialPending(true);
      requestGamePause();
      const audioSnapshot = await pauseAppAudioForAd();
      let wasShown = false;

      try {
        wasShown = await showInterstitialAd();
      } finally {
        await resumeAppAudioAfterAd(audioSnapshot, false);
        setIsInterstitialPending(false);
      }

      if (wasShown) {
        shouldStartPaused = true;
        interstitialDueRef.current = false;
        deathsSinceInterstitialRef.current = 0;
        nextInterstitialDeathRef.current = Math.random() < 0.5 ? 5 : 6;
      }
    }

    if (!shouldStartPaused) {
      startGameMusic();
    }

    resetRunState();
    setIsGamePaused(shouldStartPaused);
    requestRestart(shouldStartPaused);
  };

  const openShop = async (playSound = true): Promise<void> => {
    if (playSound) {
      playInterfaceSound(SHOP_MAIN_TAB_SOUND_PATH);
    }

    setShopNotice(null);
    setSelectedShopTab('accessories');
    setSelectedTalentTreeTab('control');
    setSelectedControlTalent(null);
    setIsControlTalentSheetClosing(false);
    setSelectedEnduranceTalent(null);
    setIsEnduranceTalentSheetClosing(false);
    if (!isMainMenuOpen) {
      requestGamePause();
    }

    setIsShopOpen(true);

    if (tutorialStep === 'shop') {
      setTutorialStep('talents');
    }

    const profile = await loadLatestPlayerProfile();
    setPlayerProfile(profile);
    emitShopObjectsUpdated({ shopObjects: profile.shopObjects });
  };

  const closeShop = (): void => {
    playInterfaceSound(SHOP_MAIN_TAB_SOUND_PATH);
    setShopNotice(null);
    setSelectedControlTalent(null);
    setIsControlTalentSheetClosing(false);
    setSelectedEnduranceTalent(null);
    setIsEnduranceTalentSheetClosing(false);
    setIsShopOpen(false);

    if (
      tutorialStep === 'talents' ||
      tutorialStep === 'tree' ||
      tutorialStep === 'ultimate-control' ||
      tutorialStep === 'ultimate-endurance' ||
      tutorialStep === 'ultimate-talents'
    ) {
      setTutorialStep('shop');
    }

    if (!isGameOver && !isMainMenuOpen) {
      requestGameResume();
    }
  };

  const pauseGame = (): void => {
    if (isGamePaused || isGameOver || isShopOpen || isMainMenuOpen) {
      return;
    }

    playInterfaceSound(SHOP_MAIN_TAB_SOUND_PATH);
    gameMusicRef.current?.pause();
    requestGamePause();
    setIsGamePaused(true);
  };

  const resumeGame = (): void => {
    if (!isGamePaused || isGameOver || isShopOpen || isMainMenuOpen) {
      return;
    }

    playInterfaceSound(SHOP_MAIN_TAB_SOUND_PATH);
    requestGameResume();
    setIsGamePaused(false);

    const gameMusic = gameMusicRef.current;

    if (gameMusic && !bossFightActiveRef.current) {
      void gameMusic.play().catch(() => undefined);
    } else if (!gameMusic && !bossFightActiveRef.current) {
      startGameMusic();
    }
  };

  const handleRewardedRevive = async (): Promise<void> => {
    if (pendingRewardedAd || hasUsedRewardedRevive) {
      return;
    }

    setPendingRewardedAd('revive');
    setRewardedReviveError(false);

    try {
      requestGamePause();
      const audioSnapshot = await pauseAppAudioForAd();
      let rewardEarned = false;

      try {
        rewardEarned = await showRewardedAd();
      } finally {
        await resumeAppAudioAfterAd(audioSnapshot, false);
      }

      if (!rewardEarned) {
        setRewardedReviveError(true);
        return;
      }

      setHasUsedRewardedRevive(true);
      requestRewardedRevive();
    } finally {
      setPendingRewardedAd(null);
    }
  };

  const handleRewardedWatermelons = async (): Promise<void> => {
    if (pendingRewardedAd) {
      return;
    }

    setPendingRewardedAd('watermelons');
    setShopNotice(null);

    try {
      if (!isMainMenuOpen) {
        requestGamePause();
      }
      const audioSnapshot = await pauseAppAudioForAd();
      let rewardEarned = false;

      try {
        rewardEarned = await showRewardedAd();
      } finally {
        await resumeAppAudioAfterAd(audioSnapshot, true);
      }

      if (!rewardEarned) {
        playInterfaceSound(SHOP_ERROR_SOUND_PATH);
        setShopNotice(t('notice.watchAd'));
        return;
      }

      const profile = await addWatermelons(5);
      setPlayerProfile(profile);
      playInterfaceSound(SHOP_BUY_SOUND_PATH);
      setShopNotice(t('notice.watermelons5'));
    } finally {
      setPendingRewardedAd(null);
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
        if (playerProfile.watermelons < item.price) {
          playInterfaceSound(SHOP_ERROR_SOUND_PATH);
          setShopNotice(t('notice.notEnoughAccessory'));
          return;
        }

        playInterfaceSound(SHOP_BUY_SOUND_PATH);
        const result = await purchaseShopItem(item.id, item.price);
        setPlayerProfile(result.profile);

        if (result.status === 'not-enough-watermelons') {
          setShopNotice(t('notice.notEnoughAccessory'));
          return;
        }

        setShopNotice(t('notice.itemBought', {
          name: localizeShopItemTitle(item.id, item.title, language),
        }));
        return;
      }

      const isEquipped = playerProfile.equipped[item.category] === item.id;

      if (isEquipped) {
        const result = await unequipShopItem(item.id, item.category);
        setPlayerProfile(result.profile);

        if (result.status === 'unequipped') {
          void playReversedEquipSound();
          emitCosmeticEquipped({
            category: item.category,
            itemId: null,
          });
          setShopNotice(t('notice.itemUnequipped', {
            name: localizeShopItemTitle(item.id, item.title, language),
          }));
        }

        return;
      }

      const result = await equipShopItem(item.id, item.category);
      setPlayerProfile(result.profile);

      if (result.status === 'equipped') {
        playInterfaceSound(SHOP_EQUIP_SOUND_PATH);
        emitCosmeticEquipped({
          category: item.category,
          itemId: item.id,
        });
        setShopNotice(t('notice.itemEquipped', {
          name: localizeShopItemTitle(item.id, item.title, language),
        }));
      }
    } finally {
      setPendingItemId(null);
    }
  };

  const handleShopObjectAction = async (
    item: (typeof SHOP_OBJECT_SLOTS)[number],
  ): Promise<void> => {
    if (pendingShopObjectId) {
      return;
    }

    setPendingShopObjectId(item.id);
    setShopNotice(null);

    try {
      if (!isShopObjectActive(playerProfile, item.id)) {
        if (playerProfile.watermelons < item.price) {
          playInterfaceSound(SHOP_ERROR_SOUND_PATH);
          setShopNotice(t('notice.notEnoughObject'));
          return;
        }

        playInterfaceSound(SHOP_BUY_SOUND_PATH);
      }

      const result = await purchaseShopObject(item.id, item.price);
      setPlayerProfile(result.profile);

      if (result.status === 'not-enough-watermelons') {
        setShopNotice(t('notice.notEnoughObject'));
        return;
      }

      if (result.status === 'already-owned') {
        emitShopObjectsUpdated({ shopObjects: result.profile.shopObjects });
        setShopNotice(t('notice.objectActive', {
          name: t(`shop.object.${item.id}`),
        }));
        return;
      }

      emitShopObjectsUpdated({ shopObjects: result.profile.shopObjects });
      setShopNotice(t('notice.itemBought', {
        name: t(`shop.object.${item.id}`),
      }));
    } finally {
      setPendingShopObjectId(null);
    }
  };

  const handleWatermelonPackAction = async (
    pack: (typeof WATERMELON_PACKS)[number],
  ): Promise<void> => {
    if (pendingWatermelonPackId) {
      return;
    }

    setPendingWatermelonPackId(pack.id);
    setShopNotice(null);

    try {
      const result = await purchaseWatermelonPack(pack.id);

      if (result.status === 'cancelled') {
        setShopNotice(t('shop.paymentCancelled'));
        return;
      }

      if (result.status === 'unavailable') {
        playInterfaceSound(SHOP_ERROR_SOUND_PATH);
        setShopNotice(t('shop.paymentUnavailable'));
        return;
      }

      if (result.status === 'failed') {
        playInterfaceSound(SHOP_ERROR_SOUND_PATH);
        setShopNotice(t('shop.paymentFailed'));
        return;
      }

      const profile = await addWatermelons(Number(pack.amount));
      setPlayerProfile(profile);
      playInterfaceSound(SHOP_BUY_SOUND_PATH);
      setShopNotice(
        t(
          result.simulated
            ? 'shop.paymentSimulated'
            : 'shop.paymentSuccessful',
          { amount: pack.amount },
        ),
      );
    } finally {
      setPendingWatermelonPackId(null);
    }
  };

  const handleFullGamePurchase = async (): Promise<void> => {
    if (isFullGamePurchasePending || playerProfile.adsRemoved) {
      return;
    }

    setIsFullGamePurchasePending(true);
    setShopNotice(null);

    try {
      const result = await purchaseFullGame();

      if (result.status === 'cancelled') {
        setShopNotice(t('shop.paymentCancelled'));
        return;
      }

      if (result.status === 'unavailable') {
        playInterfaceSound(SHOP_ERROR_SOUND_PATH);
        setShopNotice(t('shop.paymentUnavailable'));
        return;
      }

      if (result.status === 'failed') {
        playInterfaceSound(SHOP_ERROR_SOUND_PATH);
        setShopNotice(t('shop.paymentFailed'));
        return;
      }

      const profile = await unlockFullGame();
      setPlayerProfile(profile);
      setForcedAdsDisabled(true);
      playInterfaceSound(SHOP_BUY_SOUND_PATH);
      setShopNotice(
        t(
          result.simulated
            ? 'shop.fullGameSimulated'
            : 'shop.fullGamePurchased',
        ),
      );
    } finally {
      setIsFullGamePurchasePending(false);
    }
  };

  const selectControlTalent = (target: SelectedControlTalent): void => {
    playInterfaceSound(SHOP_FILTER_SOUND_PATH);

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
    playInterfaceSound(SHOP_FILTER_SOUND_PATH);

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
    playInterfaceSound(SHOP_FILTER_SOUND_PATH);

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
        setShopNotice(t('notice.notEnoughTalent'));
        return;
      }

      if (result.status === 'locked') {
        setShopNotice(t('notice.unlockControl'));
        return;
      }

      if (result.status === 'already-maxed') {
        setShopNotice(t('notice.talentMax'));
        return;
      }

      playInterfaceSound(TALENT_UNLOCKED_SOUND_PATH);
      emitTalentsUpdated();
      setShopNotice(t('notice.talentUnlocked'));
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
    playInterfaceSound(TALENT_REFUND_SOUND_PATH);

    try {
      const result =
        target.kind === 'master'
          ? await refundControlMasterTalent()
          : await refundControlTalentLevel(target.id);

      setPlayerProfile(result.profile);

      if (result.status !== 'refunded') {
        setShopNotice(t('notice.refundLast'));
        return;
      }

      emitTalentsUpdated();
      setShopNotice(t('notice.talentRefunded'));
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
        setShopNotice(t('notice.notEnoughTalent'));
        return;
      }

      if (result.status === 'locked') {
        setShopNotice(t('notice.talentLocked'));
        return;
      }

      if (result.status === 'already-maxed') {
        setShopNotice(t('notice.talentMax'));
        return;
      }

      playInterfaceSound(TALENT_UNLOCKED_SOUND_PATH);
      emitTalentsUpdated();
      setShopNotice(t('notice.talentBought'));
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
    playInterfaceSound(TALENT_REFUND_SOUND_PATH);

    try {
      const result =
        target.kind === 'phoenix'
          ? await refundEndurancePhoenixTalent()
          : await refundEnduranceTalentLevel(target.id);

      setPlayerProfile(result.profile);

      if (result.status !== 'refunded') {
        setShopNotice(t('notice.talentBlocks'));
        return;
      }

      emitTalentsUpdated();
      setShopNotice(t('notice.talentRefunded'));
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
        setShopNotice(t('notice.notEnoughTalent'));
        return;
      }

      if (result.status === 'locked') {
        setShopNotice(t('notice.talentLocked'));
        return;
      }

      if (result.status === 'already-maxed') {
        setShopNotice(t('notice.talentMax'));
        return;
      }

      playInterfaceSound(TALENT_UNLOCKED_SOUND_PATH);
      emitTalentsUpdated();
      setShopNotice(t('notice.talentBought'));
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
    playInterfaceSound(TALENT_REFUND_SOUND_PATH);

    try {
      const result =
        target.kind === 'feast'
          ? await refundBlueFeastTalent()
          : await refundBlueTalentLevel(target.id);

      setPlayerProfile(result.profile);

      if (result.status !== 'refunded') {
        setShopNotice(t('notice.talentBlocks'));
        return;
      }

      emitTalentsUpdated();
      setShopNotice(t('notice.talentRefunded'));
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
          const copy = localizeTalent(
            'control',
            'master',
            CONTROL_MASTER_TALENT,
            language,
          );
          return {
            title: copy.title,
            icon: CONTROL_MASTER_TALENT.icon,
            levelLabel: t(
              controlTalentState.master
                ? 'common.ultimateUnlocked'
                : 'common.ultimate',
            ),
            description: copy.description,
            price: CONTROL_MASTER_TALENT.cost,
            refund: Math.floor(CONTROL_MASTER_TALENT.cost / 2),
            isOwned: controlTalentState.master,
            isRefundable: controlTalentState.master,
            canBuy: !controlTalentState.master && allControlTalentsMaxed,
          };
        }

        const definition = getControlTalentDefinition(selectedControlTalent.id);
        const copy = localizeTalent(
          'control',
          definition.id,
          definition,
          language,
        );
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
          title: copy.title,
          icon: definition.icon,
          levelLabel: t('common.level', { value: targetLevel }),
          description: `${copy.description} ${t('common.value', {
            value: definition.levels[targetLevel - 1],
          })}`,
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
          const copy = localizeTalent(
            'endurance',
            'phoenix',
            ENDURANCE_PHOENIX_TALENT,
            language,
          );
          return {
            title: copy.title,
            icon: ENDURANCE_PHOENIX_TALENT.icon,
            levelLabel: t(
              enduranceTalentState.phoenix
                ? 'common.ultimateUnlocked'
                : 'common.ultimate',
            ),
            description: copy.description,
            price: ENDURANCE_PHOENIX_TALENT.cost,
            refund: Math.floor(ENDURANCE_PHOENIX_TALENT.cost / 2),
            isOwned: enduranceTalentState.phoenix,
            isRefundable: enduranceTalentState.phoenix,
            canBuy: !enduranceTalentState.phoenix && allEnduranceTalentsMaxed,
          };
        }

        const definition = getEnduranceTalentDefinition(selectedEnduranceTalent.id);
        const copy = localizeTalent(
          'endurance',
          definition.id,
          definition,
          language,
        );
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
          ? ` ${t('common.required', {
              value: definition.requirement.label,
            })}`
          : '';

        return {
          title: copy.title,
          icon: definition.icon,
          levelLabel: t('common.level', { value: targetLevel }),
          description: `${copy.description} ${definition.statLabel}: ${
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
          const copy = localizeTalent(
            'blue',
            'feast',
            BLUE_FEAST_TALENT,
            language,
          );
          return {
            title: copy.title,
            icon: BLUE_FEAST_TALENT.icon,
            levelLabel: t(
              blueTalentState.feast
                ? 'common.ultimateUnlocked'
                : 'common.ultimate',
            ),
            description: copy.description,
            price: BLUE_FEAST_TALENT.cost,
            refund: Math.floor(BLUE_FEAST_TALENT.cost / 2),
            isOwned: blueTalentState.feast,
            isRefundable: blueTalentState.feast,
            canBuy: !blueTalentState.feast && allBlueTalentsMaxed,
          };
        }

        const definition = getBlueTalentDefinition(selectedBlueTalent.id);
        const copy = localizeTalent(
          'blue',
          definition.id,
          definition,
          language,
        );
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
          title: copy.title,
          icon: definition.icon,
          levelLabel: t('common.level', { value: targetLevel }),
          description: `${copy.description} ${definition.statLabel}: ${
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

  const ultimateTutorial =
    tutorialStep === 'ultimate-control'
      ? {
          step: '1 / 3',
          tree: t('talent.tab.control').toUpperCase(),
          title: localizeTalent(
            'control',
            'master',
            CONTROL_MASTER_TALENT,
            language,
          ).title,
          icon: CONTROL_MASTER_TALENT.icon,
          description: t('talent.ultimateControlHelp'),
          buttonLabel: t('talent.seePhoenix'),
        }
      : tutorialStep === 'ultimate-endurance'
        ? {
            step: '2 / 3',
            tree: t('talent.tab.endurance').toUpperCase(),
            title: localizeTalent(
              'endurance',
              'phoenix',
              ENDURANCE_PHOENIX_TALENT,
              language,
            ).title,
            icon: ENDURANCE_PHOENIX_TALENT.icon,
            description: t('talent.ultimateEnduranceHelp'),
            buttonLabel: t('talent.seeFeast'),
          }
        : tutorialStep === 'ultimate-talents'
          ? {
              step: '3 / 3',
              tree: t('talent.tab.talents').toUpperCase(),
              title: localizeTalent(
                'blue',
                'feast',
                BLUE_FEAST_TALENT,
                language,
              ).title,
              icon: BLUE_FEAST_TALENT.icon,
              description: t('talent.ultimateRewardHelp'),
              buttonLabel: t('talent.finish'),
            }
          : null;

  const advanceUltimateTutorial = (): void => {
    if (tutorialStep === 'ultimate-control') {
      setSelectedTalentTreeTab('endurance');
      setTutorialStep('ultimate-endurance');
      return;
    }

    if (tutorialStep === 'ultimate-endurance') {
      setSelectedTalentTreeTab('talents');
      setTutorialStep('ultimate-talents');
      return;
    }

    setTutorialStep(null);
  };

  const finishStoryIntro = (): void => {
    window.localStorage.setItem(STORY_INTRO_STORAGE_KEY, 'true');
    setIsStoryIntroOpen(false);

    if (shouldStartTutorialAfterStory) {
      setShouldStartTutorialAfterStory(false);
      startGame(true);
    }
  };

  const startTutorialWithStory = (): void => {
    setStoryIntroPanel(0);
    setShouldStartTutorialAfterStory(true);
    setIsStoryIntroOpen(true);
  };

  const advanceStoryIntro = (): void => {
    if (storyIntroPanel >= STORY_INTRO_PANEL_COUNT - 1) {
      finishStoryIntro();
      return;
    }

    setStoryIntroPanel((currentPanel) => currentPanel + 1);
  };

  const finishEndStory = (): void => {
    setIsEndStoryOpen(false);
  };

  const advanceEndStory = (): void => {
    if (endStoryPanel >= END_STORY_IMAGES.length - 1) {
      finishEndStory();
      return;
    }

    setEndStoryPanel((currentPanel) => currentPanel + 1);
  };

  return (
    <main className="app-shell">
      {!isMainMenuOpen && (
        <Suspense fallback={null}>
          <GameCanvas />
        </Suspense>
      )}

      {!isMainMenuOpen && (
        <div
          className={`game-loading-backdrop${
            isGameSceneReady ? ' is-ready' : ''
          }`}
          aria-hidden="true"
        />
      )}

      {isMainMenuOpen && (
        <section className="main-menu" aria-label={t('main.menu')}>
          <div className="main-menu__title" aria-label="FlyDodo!" />

          <button
            type="button"
            className={`main-menu__button main-menu__button--play${
              clickedMainMenuButton === 'play' ? ' is-clicked' : ''
            }`}
            aria-label={t('main.play')}
            onClick={() => handleMainMenuButtonClick('play', () => startGame(false))}
          />

          <div className="main-menu__secondary-actions">
            <button
              type="button"
              className={`main-menu__button main-menu__button--shop${
                clickedMainMenuButton === 'shop' ? ' is-clicked' : ''
              }`}
              aria-label={t('main.shop')}
              onClick={() =>
                handleMainMenuButtonClick('shop', () => openShop(false))
              }
            />
            <button
              type="button"
              className={`main-menu__button main-menu__button--tutorial${
                clickedMainMenuButton === 'tutorial' ? ' is-clicked' : ''
              }`}
              aria-label={t('main.tutorial')}
              onClick={() =>
                handleMainMenuButtonClick('tutorial', startTutorialWithStory)
              }
            />
          </div>

          <button
            type="button"
            className="main-menu__options-button"
            aria-label={t('options.open')}
            onClick={openAudioOptions}
          >
            <span aria-hidden="true">⚙</span>
          </button>
        </section>
      )}

      {isStoryIntroOpen && (
        <section
          className="story-intro"
          role="dialog"
          aria-modal="true"
          aria-label={t('story.title')}
          onClick={advanceStoryIntro}
        >
          <div className="story-intro__ambient-glow" aria-hidden="true" />

          <header className="story-intro__header">
            <p>{t('story.eyebrow')}</p>
            <h1>{t('story.title')}</h1>
          </header>

          <button
            type="button"
            className="story-intro__skip"
            onClick={(event) => {
              event.stopPropagation();
              finishStoryIntro();
            }}
          >
            {t('story.skip')}
          </button>

          <div
            className="story-intro__panel"
            key={storyIntroPanel}
            role="img"
            aria-label={t('story.panel', {
              current: storyIntroPanel + 1,
              total: STORY_INTRO_PANEL_COUNT,
            })}
          >
            <img
              className="story-intro__panel-art"
              src={STORY_INTRO_IMAGES[storyIntroPanel]}
              alt=""
              aria-hidden="true"
              draggable="false"
            />
            <div className="story-intro__shine" aria-hidden="true" />
          </div>

          <div className="story-intro__footer">
            <div className="story-intro__progress" aria-hidden="true">
              {Array.from({ length: STORY_INTRO_PANEL_COUNT }, (_, index) => (
                <span
                  className={
                    index < storyIntroPanel
                      ? 'is-complete'
                      : index === storyIntroPanel
                        ? 'is-active'
                        : ''
                  }
                  key={index}
                />
              ))}
            </div>

            <p>{t('story.tap')}</p>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                advanceStoryIntro();
              }}
            >
              {t(
                storyIntroPanel === STORY_INTRO_PANEL_COUNT - 1
                  ? 'story.start'
                  : 'story.next',
              )}
            </button>
          </div>
        </section>
      )}

      {isEndStoryOpen && !isStoryIntroOpen && (
        <section
          className="story-intro story-ending"
          role="dialog"
          aria-modal="true"
          aria-label={t('story.endTitle')}
          onClick={advanceEndStory}
        >
          <div className="story-intro__ambient-glow" aria-hidden="true" />

          <header className="story-intro__header">
            <p>{t('story.endEyebrow')}</p>
            <h1>{t('story.endTitle')}</h1>
          </header>

          <button
            type="button"
            className="story-intro__skip"
            onClick={(event) => {
              event.stopPropagation();
              finishEndStory();
            }}
          >
            {t('story.skip')}
          </button>

          <div
            className="story-intro__panel story-ending__panel"
            key={endStoryPanel}
            role="img"
            aria-label={t('story.panel', {
              current: endStoryPanel + 1,
              total: END_STORY_IMAGES.length,
            })}
          >
            <img
              className="story-ending__image"
              src={END_STORY_IMAGES[endStoryPanel]}
              alt=""
              aria-hidden="true"
            />
            <div className="story-intro__shine" aria-hidden="true" />
          </div>

          <div className="story-intro__footer">
            <div className="story-intro__progress" aria-hidden="true">
              {END_STORY_IMAGES.map((image, index) => (
                <span
                  className={
                    index < endStoryPanel
                      ? 'is-complete'
                      : index === endStoryPanel
                        ? 'is-active'
                        : ''
                  }
                  key={image}
                />
              ))}
            </div>

            <p>{t('story.tap')}</p>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                advanceEndStory();
              }}
            >
              {t(
                endStoryPanel === END_STORY_IMAGES.length - 1
                  ? 'story.seeEnding'
                  : 'story.next',
              )}
            </button>
          </div>
        </section>
      )}

      {!isMainMenuOpen && (
        <section className="hud" aria-label={t('hud.gameInfo')}>
          <div className="hud__left-column">
            <div className="hud-pill hud-pill--speed">
              <span>{t('hud.speed')}</span>
              <strong>{speed.toFixed(1)} m/s</strong>
            </div>

            <div
              className={`hud-pill hud-pill--altitude${
                newRecord ? ' hud-pill--new-record' : ''
              }`}
            >
              <span>
                {t(newRecord ? 'hud.newRecord' : 'hud.altitude')}
              </span>
              <strong>{altitude} m</strong>
            </div>

          </div>

          <div
            className="hud-pill hud-pill--watermelons"
            aria-label={`${t('hud.watermelons')} : ${watermelons}`}
          >
            <img
              className="hud-pill__watermelon-icon"
              src="/assets/collectable/pastequeN.webp"
              alt=""
              aria-hidden="true"
            />
            <strong key={watermelons} className="hud-pill__watermelon-count">
              {watermelons}
            </strong>
          </div>

          <div className="survival-icons">
            <div className="survival-icons__life-row">
              <SurvivalIconRow
                label={t('common.life')}
                current={visibleHeartCount}
                max={visibleHeartMax}
                fullSrc="/assets/ui/vie/1.webp"
                emptySrc="/assets/ui/vie/2.webp"
              />
              {lifeVialActive && (
                <img
                  className="survival-icons__life-vial"
                  src="/assets/objets/fioleVie.webp"
                  alt=""
                  aria-hidden="true"
                />
              )}
            </div>
            <SurvivalIconRow
              label={t('common.shield')}
              current={shield}
              max={maxShield}
              fullSrc="/assets/ui/bouclier/1.webp"
              emptySrc="/assets/ui/bouclier/2.webp"
            />
          </div>
        </section>
      )}

      {showControlTutorial && !isMainMenuOpen && !isGameOver && (
        <section
          className={`control-tutorial${
            tutorialSide !== null
              ? ` control-tutorial--confirmed-${tutorialSide}`
              : ''
          }`}
          aria-label={t('tutorial.controls')}
        >
          <div className="control-tutorial__heading">
            <strong>{t('tutorial.holdSide')}</strong>
            <span>{t('tutorial.holdBoth')}</span>
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
              <strong>{t('tutorial.left')}</strong>
              <small>{t('tutorial.leftHelp')}</small>
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
              <strong>{t('tutorial.right')}</strong>
              <small>{t('tutorial.rightHelp')}</small>
            </div>
          </div>
        </section>
      )}

      {tutorialStep === 'shop' &&
        !isMainMenuOpen &&
        !isGameOver &&
        !isShopOpen && (
          <section className="shop-tutorial-prompt" aria-live="polite">
            <div className="shop-tutorial-prompt__card">
              <span>{t('tutorial.step2')}</span>
              <strong>{t('tutorial.discoverShop')}</strong>
              <p>{t('tutorial.shopHelp')}</p>
            </div>
            <span className="shop-tutorial-prompt__arrow" aria-hidden="true">
              ↘
            </span>
          </section>
        )}

      {fallSeconds !== null && !isMainMenuOpen && !isGameOver && (
        <div className="fall-warning">
          {t(warningReason === 'side' ? 'warning.return' : 'warning.climb')} !{' '}
          <strong>{fallSeconds}</strong>
        </div>
      )}

      {!isMainMenuOpen &&
        !isGameOver &&
        !isShopOpen &&
        tutorialStep !== 'controls' &&
        (!hasMovedThisRun || tutorialStep === 'shop') && (
          <button
            type="button"
            className={`floating-shop-button${
              tutorialStep === 'shop' ? ' is-tutorial-target' : ''
            }`}
            aria-label={t('game.openShop')}
            onClick={() => void openShop()}
          />
        )}

      {!isMainMenuOpen &&
        !isGameOver &&
        !isShopOpen &&
        hasMovedThisRun &&
        tutorialStep === null &&
        !isGamePaused && (
          <button
            type="button"
            className="floating-pause-button"
            aria-label={t('game.pause')}
            onClick={pauseGame}
          />
        )}

      {!isMainMenuOpen && !isGameOver && !isShopOpen && isGamePaused && (
        <section
          className="game-pause"
          role="dialog"
          aria-modal="true"
          onClick={resumeGame}
        >
          <div className="game-pause__card">
            <span className="game-pause__icon" aria-hidden="true" />
            <h2>{t('pause.title')}</h2>
            <p>{t('pause.help')}</p>
            <button type="button">{t('pause.continue')}</button>
          </div>
        </section>
      )}

      {!isMainMenuOpen && isGameOver && !isShopOpen && !isEndStoryOpen && (
        <section
          className={`game-over${
            playerDeathReason === 'space' ? ' game-over--space' : ''
          }`}
          role="dialog"
          aria-modal="true"
        >
          <div className="game-over__card">
            <button
              type="button"
              className="game-over__options-button"
              aria-label={t('options.open')}
              onClick={openAudioOptions}
            >
              <span aria-hidden="true">⚙</span>
            </button>
            <h1
              className={
                playerDeathReason === 'ufo'
                  ? 'game-over__victory-title'
                  : undefined
              }
            >
              {t(
                playerDeathReason === 'ufo'
                  ? 'gameOver.victoryTitle'
                  : 'gameOver.title',
              )}
            </h1>

            <img
              className={`game-over__death-visual game-over__death-visual--${playerDeathReason}`}
              src={GAME_OVER_DEATH_IMAGES[playerDeathReason]}
              alt=""
              aria-hidden="true"
            />

            <div className="game-over__stats">
              <p className="game-over__score">
                <span>{t('gameOver.altitude')}</span>
                <strong>{altitude}</strong>
                <span>m</span>
              </p>
              <p className="game-over__record">
                {t('gameOver.record', { value: bestAltitude })}
              </p>
              {playerDeathReason === 'space' && (
                <p className="game-over__tip">{t('gameOver.spaceTip')}</p>
              )}
            </div>

            <div className="game-over__actions">
              {!hasUsedRewardedRevive &&
                playerDeathReason !== 'space' &&
                playerDeathReason !== 'ufo' && (
                <button
                  type="button"
                  className="game-over__revive-button"
                  disabled={pendingRewardedAd !== null || isInterstitialPending}
                  onClick={() => void handleRewardedRevive()}
                >
                  <span>
                    {pendingRewardedAd === 'revive'
                      ? t('gameOver.ad')
                      : rewardedReviveError
                        ? t('gameOver.adUnavailable')
                        : t('gameOver.revive')}
                  </span>
                </button>
              )}
              <button
                type="button"
                className="game-over__replay-button"
                disabled={pendingRewardedAd !== null || isInterstitialPending}
                onClick={() => void restart()}
              >
                <span>
                  {t(isInterstitialPending ? 'gameOver.ad' : 'gameOver.replay')}
                </span>
              </button>
              <button
                type="button"
                className="game-over__shop-button"
                disabled={pendingRewardedAd !== null || isInterstitialPending}
                onClick={() => void openShop()}
              >
                <span>{t('common.shop')}</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {isAudioOptionsOpen && (
        <AudioOptionsPanel
          settings={audioSettings}
          language={language}
          onClose={closeAudioOptions}
        />
      )}

      {isShopOpen && (
        <section className="shop-overlay" role="dialog" aria-modal="true">
          <div
            className={`shop-panel shop-panel--${selectedShopTab}${
              tutorialStep === 'talents'
                ? ' shop-panel--tutorial-talents'
                : ''
            }`}
          >
            <button
              type="button"
              className="shop-back-button"
              aria-label={t('common.back')}
              onClick={closeShop}
            />

            <header className="shop-header">
              <h1 className="shop-title">{t('main.shop')}</h1>
                <div className="shop-wallet" aria-label={t('shop.wallet')}>
                <strong>{playerProfile.watermelons}</strong>
                <img
                  src="/assets/collectable/pasteque.webp"
                  alt=""
                  aria-hidden="true"
                />
                {selectedShopTab === 'watermelons' && (
                  <button
                    type="button"
                    className="shop-reward-watermelon-button"
                    aria-label={t('shop.watchAd')}
                    disabled={pendingRewardedAd !== null}
                    onClick={() => void handleRewardedWatermelons()}
                  >
                    {pendingRewardedAd === 'watermelons' ? '...' : '+5'}
                  </button>
                )}
              </div>

              <div className="shop-tabs" role="tablist" aria-label={t('shop.sections')}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedShopTab === 'accessories'}
                  className={`shop-main-tab shop-main-tab--accessories${
                    selectedShopTab === 'accessories' ? ' is-active' : ''
                  }`}
                  onClick={() => selectShopTab('accessories')}
                >
                  <span className="shop-main-tab__label">
                    {t('shop.accessories')}
                  </span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedShopTab === 'items'}
                  className={`shop-main-tab shop-main-tab--items${
                    selectedShopTab === 'items' ? ' is-active' : ''
                  }`}
                  onClick={() => selectShopTab('items')}
                >
                  <span className="shop-main-tab__label">{t('shop.items')}</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedShopTab === 'talents'}
                  className={`shop-main-tab shop-main-tab--talents${
                    selectedShopTab === 'talents' ? ' is-active' : ''
                  }${
                    tutorialStep === 'talents' ? ' is-tutorial-target' : ''
                  }`}
                  onClick={() => selectShopTab('talents')}
                >
                  <span className="shop-main-tab__label">
                    {t('shop.skillTree')}
                  </span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-label={t('shop.watermelons')}
                  aria-selected={selectedShopTab === 'watermelons'}
                  className={`shop-main-tab shop-main-tab--watermelons${
                    selectedShopTab === 'watermelons' ? ' is-active' : ''
                  }`}
                  onClick={() => selectShopTab('watermelons')}
                >
                  <img
                    src="/assets/collectable/pasteque.webp"
                    alt=""
                    aria-hidden="true"
                  />
                  <span>{t('shop.watermelons')}</span>
                </button>
              </div>

              <div
                className={`shop-toolbar${
                  selectedShopTab !== 'accessories' ? ' shop-toolbar--simple' : ''
                }`}
              >
                {selectedShopTab === 'accessories' && (
                  <div className="shop-filter" aria-label={t('shop.categories')}>
                  
                    <div className="shop-filter__options">
                    {SHOP_CATEGORY_OPTIONS.map((option) => (
                      <button
                        type="button"
                        key={option.value}
                        aria-pressed={selectedCategory === option.value}
                        className={`shop-filter__button shop-filter__button--${option.value}${
                          selectedCategory === option.value ? ' is-active' : ''
                        }`}
                        onClick={() => selectShopCategory(option.value)}
                      >
                        {t(`shop.category.${option.value}`)}
                      </button>
                    ))}
                    </div>
                  </div>
                )}

                <div className="shop-wallet shop-wallet--toolbar" aria-label={t('shop.wallet')}>
                  <strong>{playerProfile.watermelons}</strong>
                  <img
                    src="/assets/collectable/pasteque.webp"
                    alt=""
                    aria-hidden="true"
                  />
                </div>
              </div>
            </header>

            {tutorialStep === 'talents' && (
              <section className="talent-tutorial-prompt" aria-live="polite">
                <span>{t('tutorial.step3')}</span>
                <strong>{t('tutorial.openSkills')}</strong>
                <p>{t('tutorial.skillsHelp')}</p>
                <span className="talent-tutorial-prompt__arrow" aria-hidden="true">
                  ↑
                </span>
              </section>
            )}

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
                  const localizedTitle = localizeShopItemTitle(
                    item.id,
                    item.title,
                    language,
                  );
                  const titleLengthClass =
                    localizedTitle.length > 24
                      ? ' is-very-long'
                      : localizedTitle.length > 16
                        ? ' is-long'
                        : '';

                  const buttonLabel = isEquipped
                    ? t('common.unequip')
                    : isOwned
                      ? t('common.equip')
                      : t('common.buy');

                  return (
                    <article
                      className={`shop-item${
                        isEquipped ? ' shop-item--equipped' : ''
                      }`}
                      key={item.id}
                    >
                      <div
                        className={`shop-item__icon shop-item__icon--${getShopItemToneForPrice(
                          item.price,
                        )}`}
                        aria-hidden="true"
                      >
                        <ShopItemPreview item={item} />
                      </div>

                      {isEquipped && (
                        <span className="shop-item__equipped-badge">
                          {t('common.equipped')}
                        </span>
                      )}

                      <h2 className={titleLengthClass}>{localizedTitle}</h2>

                      <div className="shop-item__price">
                        <img
                          src="/assets/collectable/pasteque.webp"
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
                  {SHOP_OBJECT_SLOTS.map((item) => {
                    const isActive = isShopObjectActive(playerProfile, item.id);
                    const isPending = pendingShopObjectId === item.id;
                    const isUnaffordable =
                      !isActive && playerProfile.watermelons < item.price;

                    return (
                      <article
                        className={`shop-object-card${
                          isActive ? ' shop-object-card--owned' : ''
                        }`}
                        key={item.id}
                      >
                        <div className="shop-object-card__icon" aria-hidden="true">
                          <img src={item.icon} alt="" />
                        </div>
                        <h2>{t(`shop.object.${item.id}`)}</h2>
                        <div className="shop-object-card__price">
                          <img
                            src="/assets/collectable/pasteque.webp"
                            alt=""
                            aria-hidden="true"
                          />
                          <strong>{item.price}</strong>
                        </div>
                        <button
                          type="button"
                          className={`shop-object-card__button${
                            isActive ? ' is-owned' : ''
                          }${isUnaffordable ? ' is-unaffordable' : ''}`}
                          disabled={isPending}
                          onClick={() => void handleShopObjectAction(item)}
                        >
                          <span className="visually-hidden">
                            {t(isActive ? 'common.owned' : 'common.buy')}
                          </span>
                        </button>
                      </article>
                    );
                  })}
                </div>
              )}

              {selectedShopTab === 'watermelons' && (
                <div className="watermelon-shop" role="tabpanel">
                  <header className="watermelon-shop__hero">
                    <h2>
                      <img
                        src="/assets/collectable/pasteque.webp"
                        alt=""
                        aria-hidden="true"
                      />
                      {t('shop.watermelons')}
                    </h2>
                    <p>{t('shop.buyAdventure')}</p>
                  </header>

                  <div className="watermelon-pack-grid">
                    {WATERMELON_PACKS.map((pack) => (
                      <article className="watermelon-pack-card" key={pack.id}>
                        <h3>{t(`shop.pack.${pack.id}`)}</h3>
                        <div
                          className={`watermelon-pack-card__pile watermelon-pack-card__pile--${pack.id}`}
                          aria-hidden="true"
                        >
                          {Array.from({ length: pack.pile }, (_value, index) => (
                            <img
                              key={`${pack.id}-${index}`}
                              src={pack.src}
                              alt=""
                            />
                          ))}
                        </div>
                        <div className="watermelon-pack-card__amount">
                          <img
                            src="/assets/collectable/pasteque.webp"
                            alt=""
                            aria-hidden="true"
                          />
                          <strong>{pack.amount}</strong>
                        </div>
                        <button
                          type="button"
                          className="watermelon-pack-card__button"
                          aria-label={`${t('common.buy')} ${pack.amount} ${t('shop.watermelons')}`}
                          disabled={pendingWatermelonPackId !== null}
                          onClick={() => void handleWatermelonPackAction(pack)}
                        >
                          {pendingWatermelonPackId === pack.id ? '...' : pack.price}
                        </button>
                      </article>
                    ))}
                  </div>

                  <p className="watermelon-shop__note">
                    <img
                      src="/assets/collectable/pasteque.webp"
                      alt=""
                      aria-hidden="true"
                    />
                    {t('shop.watermelonUse')}
                  </p>

                  <section
                    className={`full-game-offer${
                      playerProfile.adsRemoved ? ' is-owned' : ''
                    }`}
                  >
                    <div className="full-game-offer__icon" aria-hidden="true">
                      ★
                    </div>
                    <div className="full-game-offer__copy">
                      <strong>{t('shop.fullGameTitle')}</strong>
                      <span>{t('shop.fullGameDescription')}</span>
                    </div>
                    <button
                      type="button"
                      disabled={
                        isFullGamePurchasePending || playerProfile.adsRemoved
                      }
                      onClick={() => void handleFullGamePurchase()}
                    >
                      {isFullGamePurchasePending
                        ? '...'
                        : playerProfile.adsRemoved
                          ? t('shop.fullGameOwned')
                          : '4,99 €'}
                    </button>
                  </section>
                </div>
              )}

              {selectedShopTab === 'talents' && (
                <div className="talent-tree-panel" role="tabpanel">
                  <div
                    className="talent-tree-tabs"
                    role="tablist"
                    aria-label={t('shop.talentCategories')}
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
                        onClick={() => selectTalentTreeTab(tab.id)}
                      >
                        {t(`talent.tab.${tab.id}`)}
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
                          }${!allControlTalentsMaxed ? ' is-locked' : ''}${
                            tutorialStep === 'ultimate-control'
                              ? ' is-tutorial-ultimate'
                              : ''
                          }`}
                          style={getTalentNodePositionStyle(
                            CONTROL_MASTER_NODE_POSITION,
                            true,
                          )}
                          onClick={() => selectControlTalent({ kind: 'master' })}
                          aria-label={localizeTalent(
                            'control',
                            'master',
                            CONTROL_MASTER_TALENT,
                            language,
                          ).title}
                        >
                          <img src={CONTROL_MASTER_TALENT.icon} alt="" aria-hidden="true" />
                          <span className="control-talent-node__title">
                            {localizeTalent(
                              'control',
                              'master',
                              CONTROL_MASTER_TALENT,
                              language,
                            ).title}
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
                                      aria-label={`${localizeTalent(
                                        'control',
                                        talent.id,
                                        talent,
                                        language,
                                      ).title}, ${t('common.level', { value: level })}`}
                                    >
                                      <img src={talent.icon} alt="" aria-hidden="true" />
                                      <span className="control-talent-node__title">
                                        {localizeTalent(
                                          'control',
                                          talent.id,
                                          talent,
                                          language,
                                        ).title}{' '}
                                        {t('common.levelShort', { value: level })}
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
                              <span>
                                {selectedControlTalentDetails.levelLabel} ·{' '}
                                {t('common.buyPrice', {
                                  value: selectedControlTalentDetails.price,
                                })}
                                <img
                                  src="/assets/collectable/pasteque.webp"
                                  alt=""
                                  aria-hidden="true"
                                />
                              </span>
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
                                  {t('common.refund', {
                                    value: selectedControlTalentDetails.refund,
                                  })}
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
                                  {t('common.buyPrice', {
                                    value: selectedControlTalentDetails.price,
                                  })}
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
                          }${!allEnduranceTalentsMaxed ? ' is-locked' : ''}${
                            tutorialStep === 'ultimate-endurance'
                              ? ' is-tutorial-ultimate'
                              : ''
                          }`}
                          style={getTalentNodePositionStyle(
                            ENDURANCE_PHOENIX_NODE_POSITION,
                            true,
                          )}
                          onClick={() => selectEnduranceTalent({ kind: 'phoenix' })}
                          aria-label={localizeTalent(
                            'endurance',
                            'phoenix',
                            ENDURANCE_PHOENIX_TALENT,
                            language,
                          ).title}
                        >
                          <img
                            src={ENDURANCE_PHOENIX_TALENT.icon}
                            alt=""
                            aria-hidden="true"
                          />
                          <span className="control-talent-node__title">
                            {localizeTalent(
                              'endurance',
                              'phoenix',
                              ENDURANCE_PHOENIX_TALENT,
                              language,
                            ).title}
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
                                      aria-label={`${localizeTalent(
                                        'endurance',
                                        talent.id,
                                        talent,
                                        language,
                                      ).title}, ${t('common.level', { value: level })}`}
                                    >
                                      <img src={talent.icon} alt="" aria-hidden="true" />
                                      <span className="control-talent-node__title">
                                        {localizeTalent(
                                          'endurance',
                                          talent.id,
                                          talent,
                                          language,
                                        ).title}{' '}
                                        {t('common.levelShort', { value: level })}
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
                              <span>
                                {selectedEnduranceTalentDetails.levelLabel} ·{' '}
                                {t('common.buyPrice', {
                                  value: selectedEnduranceTalentDetails.price,
                                })}
                                <img
                                  src="/assets/collectable/pasteque.webp"
                                  alt=""
                                  aria-hidden="true"
                                />
                              </span>
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
                                  {t('common.refund', {
                                    value: selectedEnduranceTalentDetails.refund,
                                  })}
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
                                  {t('common.buyPrice', {
                                    value: selectedEnduranceTalentDetails.price,
                                  })}
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
                          }${!allBlueTalentsMaxed ? ' is-locked' : ''}${
                            tutorialStep === 'ultimate-talents'
                              ? ' is-tutorial-ultimate'
                              : ''
                          }`}
                          style={getTalentNodePositionStyle(
                            BLUE_FEAST_NODE_POSITION,
                            true,
                          )}
                          onClick={() => selectBlueTalent({ kind: 'feast' })}
                          aria-label={localizeTalent(
                            'blue',
                            'feast',
                            BLUE_FEAST_TALENT,
                            language,
                          ).title}
                        >
                          <img
                            src={BLUE_FEAST_TALENT.icon}
                            alt=""
                            aria-hidden="true"
                          />
                          <span className="control-talent-node__title">
                            {localizeTalent(
                              'blue',
                              'feast',
                              BLUE_FEAST_TALENT,
                              language,
                            ).title}
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
                                aria-label={`${localizeTalent(
                                  'blue',
                                  talent.id,
                                  talent,
                                  language,
                                ).title}, ${t('common.level', { value: level })}`}
                              >
                                <img src={talent.icon} alt="" aria-hidden="true" />
                                <span className="control-talent-node__title">
                                  {localizeTalent(
                                    'blue',
                                    talent.id,
                                    talent,
                                    language,
                                  ).title}{' '}
                                  {t('common.levelShort', { value: level })}
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
                              <span>
                                {selectedBlueTalentDetails.levelLabel} ·{' '}
                                {t('common.buyPrice', {
                                  value: selectedBlueTalentDetails.price,
                                })}
                                <img
                                  src="/assets/collectable/pasteque.webp"
                                  alt=""
                                  aria-hidden="true"
                                />
                              </span>
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
                                  {t('common.refund', {
                                    value: selectedBlueTalentDetails.refund,
                                  })}
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
                                  {t('common.buyPrice', {
                                    value: selectedBlueTalentDetails.price,
                                  })}
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

            {tutorialStep === 'tree' && selectedShopTab === 'talents' && (
              <section
                className="talent-tree-tutorial"
                role="dialog"
                aria-label={t('talent.treeTutorial')}
              >
                <div className="talent-tree-tutorial__card">
                  <span className="talent-tree-tutorial__eyebrow">
                    {t('talent.treeEyebrow')}
                  </span>
                  <h2>{t('talent.growDodo')}</h2>
                  <p>{t('talent.spend')}</p>
                  <ul>
                    <li>
                      <strong>{t('talent.tab.control')}</strong>{' '}
                      {t('talent.controlHelp')}
                    </li>
                    <li>
                      <strong>{t('talent.tab.endurance')}</strong>{' '}
                      {t('talent.enduranceHelp')}
                    </li>
                    <li>
                      <strong>{t('talent.tab.talents')}</strong>{' '}
                      {t('talent.rewardHelp')}
                    </li>
                  </ul>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTalentTreeTab('control');
                      setTutorialStep('ultimate-control');
                    }}
                  >
                    {t('talent.seeUltimates')}
                  </button>
                </div>
              </section>
            )}

            {ultimateTutorial && selectedShopTab === 'talents' && (
              <section
                className="ultimate-tutorial"
                role="dialog"
                aria-label={t('talent.ultimateTutorial', {
                  title: ultimateTutorial.title,
                })}
              >
                <div className="ultimate-tutorial__card">
                  <img
                    src={ultimateTutorial.icon}
                    alt=""
                    aria-hidden="true"
                  />
                  <div className="ultimate-tutorial__copy">
                    <span>
                      ULTIME {ultimateTutorial.tree} · {ultimateTutorial.step}
                    </span>
                    <h2>{ultimateTutorial.title}</h2>
                    <p>{ultimateTutorial.description}</p>
                    <small>
                      {t('talent.unlockTree')}
                    </small>
                  </div>
                  <button type="button" onClick={advanceUltimateTutorial}>
                    {ultimateTutorial.buttonLabel}
                  </button>
                </div>
              </section>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
