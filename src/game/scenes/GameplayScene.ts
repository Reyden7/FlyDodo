import Phaser from 'phaser';
import {
  getAudioSettings,
  subscribeAudioSettings,
  type AudioSettings,
} from '../../audio/audioSettings';
import {
  getAppLanguage,
  subscribeAppLanguage,
  translate,
  type AppLanguage,
} from '../../i18n/i18n';
import { getDevStartAltitude } from '../devSettings';
import {
  emitFallWarning,
  emitFlightHud,
  emitGameOver,
  emitMovementStarted,
  emitPlayerDied,
  emitRewardedRevived,
  emitShopObjectsUpdated,
  emitWalletUpdated,
  gameEvents,
  getLatestShopObjectInventory,
  type CosmeticEquippedDetail,
  type FlightHudDetail,
  type RestartRequestDetail,
  type ShopObjectsUpdatedDetail,
} from '../events';
import {
  addWatermelons,
  consumeLifeVial,
  consumeWatermelonMagnet,
  createEmptyShopObjectInventory,
  loadBestAltitude,
  loadLatestPlayerProfile,
  saveBestAltitude,
  type EquippedCosmetics,
  type ShopObjectInventory,
} from '../../services/saveService';
import {
  getControlTalentStats,
  type ControlTalentStats,
} from '../../talents/controlTalents';
import {
  getEnduranceTalentStats,
  type EnduranceTalentStats,
} from '../../talents/enduranceTalents';
import {
  getBlueTalentStats,
  type BlueTalentStats,
} from '../../talents/blueTalents';
import {
  COSMETIC_CATEGORIES,
  getCosmeticTransform,
  getShopItemById,
  getShopItemImagePath,
  getShopItemTextureKey,
  type CosmeticCategory,
  type CosmeticOffsetSpace,
  type CosmeticPose,
  type ShopItem,
} from '../../shop/shopCatalog';

const GAME_WIDTH = 390;
const GAME_HEIGHT = 844;
const WORLD_HEIGHT = 101_100;
const START_Y = 101_000;
const GROUND_Y = START_Y;
const DODO_BODY_SCALE = 0.125;
const DODO_GROUND_SCALE = 0.1;
const DODO_WING_SCALE = 0.14;
const DODO_HITBOX_WIDTH = 52;
const DODO_HITBOX_HEIGHT = 76;
const DODO_FLIGHT_ORIGIN_Y = 0.75;
const DODO_GROUND_ORIGIN_Y = 0.77;
const DODO_GROUND_FEET_SCALE = DODO_GROUND_SCALE;
const DODO_GROUND_FEET_OFFSET_X = 0;
const DODO_GROUND_FEET_OFFSET_Y = -15;
const DODO_FLIGHT_FEET_SCALE_X = 0.07;
const DODO_FLIGHT_FEET_SCALE_Y = 0.07;
const DODO_FLIGHT_FEET_OFFSET_X = 0;
const DODO_FLIGHT_FEET_OFFSET_Y = 15;
const DODO_INDICATOR_SCALE = 0.045;
const DODO_LIGHTNING_DEATH_TEXTURE_KEY = 'dodo-lightning-death';
const DODO_LIGHTNING_DEATH_TEXTURE_PATH = '/assets/dodo/deadLightning.png';
const DODO_LIGHTNING_DEATH_SCALE = 0.125;
const DODO_LAVA_DEATH_TEXTURE_PREFIX = 'dodo-lava-death';
const DODO_LAVA_DEATH_ANIMATION_KEY = 'dodo-lava-death-animation';
const DODO_LAVA_DEATH_FRAME_INDICES = [
  0, 4, 5, 7, 8, 9, 11, 14, 31, 32, 33, 34, 35,
] as const;
const DODO_LAVA_DEATH_FRAME_RATE = 10;
const DODO_LAVA_DEATH_SCALE = 0.28;
const DODO_LAVA_DEATH_OFFSET_Y = 48;
const DODO_LAVA_DEATH_DEPTH = 12;
const PHOENIX_REVIVAL_TEXTURE_KEY = 'dodo-phoenix-revival';
const PHOENIX_REVIVAL_TEXTURE_PATH = '/assets/dodo/pheonix.png';
const PHOENIX_REVIVAL_DEPTH = 1_003;
const PHOENIX_REVIVAL_FLASH_DEPTH = 1_001;
const PHOENIX_REVIVAL_SPARK_DEPTH = 1_002;

const PLAYER_SCREEN_Y_RATIO = 0.88;
const CAMERA_FALL_SCREEN_Y_RATIO = 0.97;
const CAMERA_FALL_FOLLOW_SPEED = 0.72;
const CAMERA_MAX_FALL_CATCHUP = 260;

const GRAVITY_Y = 800;
const BASE_FLAP_UPWARD_IMPULSE = 160;
const FLAP_SIDE_IMPULSE = 30;
const DEFAULT_FLIGHT_SPEED_MULTIPLIER = 0.5;
const MAX_HORIZONTAL_SPEED = 300 * DEFAULT_FLIGHT_SPEED_MULTIPLIER;
const MAX_VERTICAL_SPEED = 450 * DEFAULT_FLIGHT_SPEED_MULTIPLIER;
const VELOCITY_ALIGNMENT = 0.62;
const SCREEN_EDGE_BOUNCE_DAMPING = 0.68;
const SCREEN_EDGE_MIN_BOUNCE_SPEED = 60;
const SCREEN_EDGE_TURN_IMPULSE = 58;

const BASE_FLAP_TURN_IMPULSE = 50;
const MAX_TURN_RATE = 112; 
const TURN_DAMPING = 5.2; 
const BASE_AUTO_LEVEL_SPEED = 0;

const BASE_WING_BEATS_PER_SECOND = 2.4;
const FAST_WING_MULTIPLIER = 0;
const SLOW_WING_MULTIPLIER = 0;
const MIN_FLAP_INTERVAL_MS = 115;
const FLAP_WING_BOOST_DURATION = 0.28;
const FLAP_WING_BOOST_MULTIPLIER = 1.5;
const FLAP_LEG_ANIMATION_DURATION = 0;
const FLIGHT_IDLE_TIMEOUT_MS = 5_000;
const FLIGHT_IDLE_PANIC_DURATION_MS = 700;
const FLIGHT_IDLE_PANIC_WING_MULTIPLIER = 3.25;
const FLIGHT_IDLE_DROP_WING_MULTIPLIER = 0.45;
const FLIGHT_IDLE_DROP_GRAVITY_MULTIPLIER = 1.8;
const FLIGHT_IDLE_DROP_HORIZONTAL_DAMPING = 0.68;

const FALL_LIMIT_BELOW_CAMERA = 5;
const SIDE_LIMIT_OUTSIDE_CAMERA = 34;
const GAME_OVER_DELAY_MS = 2_000;
const LIGHTNING_GAME_OVER_REVEAL_DELAY_MS = 1_000;
const PIXELS_PER_METRE_PER_SECOND = 82;
const SAFE_GROUND_TOUCH_ALTITUDE = 50;
const GROUND_DIRT_HEIGHT = 85;
const GROUND_TEXTURE_KEY = 'ground-decor';
const GROUND_TEXTURE_FRAME = 'ground-cropped';
const GROUND_TEXTURE_PATH = '/assets/Decors/ground.png';
const PARALLAX_FAR_SCROLL_FACTOR = 0.2;
const PARALLAX_MID_SCROLL_FACTOR = 0.6;
const PARALLAX_NEAR_SCROLL_FACTOR = 1;
const PARALLAX_FOREGROUND_SCROLL_FACTOR = 1.12;
const BACKGROUND_GROUND_TEXTURE_KEY = 'forest-background-ground';
const BACKGROUND_GROUND_TEXTURE_PATH = '/assets/Decors/ground2.png';
const BACKGROUND_GROUND_SOURCE_WIDTH = 2_172;
const BACKGROUND_GROUND_SOURCE_SURFACE_Y = 150;
const BACKGROUND_GROUND_SCROLL_FACTOR = PARALLAX_MID_SCROLL_FACTOR;
const BACKGROUND_GROUND_SCREEN_LIFT = 0;
const BACKGROUND_GROUND_DEPTH = -4.2;
const FAR_BACKGROUND_GROUND_SCROLL_FACTOR = PARALLAX_FAR_SCROLL_FACTOR;
const FAR_BACKGROUND_GROUND_SCREEN_LIFT = 0;
const FAR_BACKGROUND_GROUND_DEPTH = -9.4;
const FOREST_VOLCANO_KEY = 'forest-volcano';
const FOREST_TREE_1_KEY = 'forest-tree-1';
const FOREST_TREE_2_KEY = 'forest-tree-2';
const FOREST_FERN_1_KEY = 'forest-fern-1';
const FOREST_FERN_2_KEY = 'forest-fern-2';
const FOREST_GRASS_1_KEY = 'forest-grass-1';
const FOREST_GRASS_2_KEY = 'forest-grass-2';
const FOREST_GRASS_3_KEY = 'forest-grass-3';
const FOREST_GRASS_4_KEY = 'forest-grass-4';
const FOREST_BRANCH_RIGHT_SOURCE_KEY = 'forest-branch-right-source';
const FOREST_BRANCH_LEFT_SOURCE_KEY = 'forest-branch-left-source';
const FOREST_MOSQUITO_TEXTURE_PREFIX = 'forest-mosquito';
const FOREST_MOSQUITO_ANIMATION_KEY = 'forest-mosquito-fly';
const FOREST_MOSQUITO_FRAME_COUNT = 25;
const PTERODACTYL_TEXTURE_PREFIX = 'low-sky-pterodactyl';
const PTERODACTYL_ANIMATION_KEY = 'low-sky-pterodactyl-fly';
const PTERODACTYL_FRAME_COUNT = 16;
const STORM_CLOUD_TEXTURE_PREFIX = 'mid-sky-storm-cloud';
const STORM_CLOUD_ANIMATION_KEY = 'mid-sky-storm-cloud-flash';
const STORM_CLOUD_FRAME_COUNT = 9;
const STORM_CLOUD_DISPLAY_WIDTHS = [130, 160, 190] as const;
const THUNDER_SOUND_KEY = 'mid-sky-thunder-sound';
const THUNDER_SOUND_PATH = '/assets/sounds/thunder.mp3';
const THUNDER_SOUND_VOLUME = 0.7;
const LIGHTNING_TEXTURE_PREFIX = 'mid-sky-lightning';
const LIGHTNING_ANIMATION_KEY = 'mid-sky-lightning-flash';
const LIGHTNING_FRAME_COUNT = 16;
const LIGHTNING_SOUND_KEY = 'mid-sky-lightning-sound';
const LIGHTNING_SOUND_PATH = '/assets/sounds/lightning.mp3';
const LIGHTNING_SOUND_VOLUME = 0.8;
const LIGHTNING_SCREEN_FLASH_COLOR = 0xeafaff;
const LIGHTNING_SCREEN_FLASH_ALPHA = 0.25;
const LIGHTNING_SCREEN_FLASH_FADE_MS = 420;
const LIGHTNING_SCREEN_FLASH_DEPTH = 1_000;
const BRANCH_CAMERA_SHAKE_DURATION_MS = 120;
const BRANCH_CAMERA_SHAKE_INTENSITY = 0.0025;
const LIGHTNING_CAMERA_SHAKE_DURATION_MS = 170;
const LIGHTNING_CAMERA_SHAKE_INTENSITY = 0.002;
const LIGHTNING_HIT_CAMERA_SHAKE_DURATION_MS = 440;
const LIGHTNING_HIT_CAMERA_SHAKE_INTENSITY = 0.012;
const SATELLITE_TEXTURE_KEY = 'space-satellite';
const ASTEROID_TEXTURE_KEY = 'space-asteroid';
const LAVA_TEXTURE_PREFIX = 'lava-flow';
const LAVA_ANIMATION_KEY = 'lava-flow-animation';
const LAVA_FRAME_COUNT = 36;
const LAVA_FRAME_RATE = 18;
const LAVA_SOURCE_HEIGHT = 864;
const LAVA_SOURCE_VISIBLE_TOP = 86;
const SKY_BACKGROUND_TEXTURE_PREFIX = 'sky-background-segment';
const SKY_BACKGROUND_TEXTURE_PATH = '/assets/Decors/bg.png';
const SKY_BACKGROUND_SEGMENT_SOURCE_HEIGHT = 2_000;
const SKY_BACKGROUND_DEPTH = -10;
const SKY_BACKGROUND_TOP_FILL_COLOR = 0x000000;
const GROUND_TEXTURE_SOURCE_WIDTH = 2172;
const GROUND_TEXTURE_SOURCE_HEIGHT = 724;
const GROUND_TEXTURE_CROP_TOP = 150;
const GROUND_TEXTURE_SURFACE_Y = 236;
const GROUND_VISUAL_Y_OFFSET = 2;
const GROUND_HORIZONTAL_OVERSCAN = 24;
const GROUND_RECORD_X = GAME_WIDTH / 2;
const GROUND_RECORD_Y = GROUND_Y + 60;
const GROUND_RECORD_DEPTH = -3;
const NEW_RECORD_LEAF_TEXTURE_KEY = 'new-record-leaf';
const NEW_RECORD_CAMERA_SHAKE_DURATION_MS = 650;
const NEW_RECORD_CAMERA_SHAKE_INTENSITY = 0.007;
const NEW_RECORD_BIRD_COUNT = 7;
const NEW_RECORD_LEAF_COUNT = 24;
const OBSTACLE_DEPTH = 6;
const OBSTACLE_ALPHA = 0.92;
const BRANCH_EDGE_OVERHANG = 20;
const MOSQUITO_CIRCLE_DURATION_MS = 1_800;
const MOSQUITO_HITBOX_WIDTH_RATIO = 0.42;
const MOSQUITO_HITBOX_HEIGHT_RATIO = 0.34;
const PTERODACTYL_PATROL_SPEED = 95;
const PTERODACTYL_TURN_DELAY_MS = 180;
const SATELLITE_DRIFT_X_RADIUS = 28;
const SATELLITE_DRIFT_Y_RADIUS = 12;
const SATELLITE_DRIFT_X_DURATION_MS = 12_000;
const SATELLITE_DRIFT_Y_DURATION_MS = 16_000;
const SATELLITE_ROTATION_SPEED_DEGREES = 2.2;
const ASTEROID_TRIGGER_DISTANCE_METRES = 100;
const ASTEROID_PASS_SPEED = 430;
const ASTEROID_PASS_VERTICAL_SPEED = 220;
const ASTEROID_ROTATION_SPEED_DEGREES = 120;
const ASTEROID_SPAWN_Y_OFFSETS = [-120, -45, 45, 120] as const;
const ASTEROID_CLUSTER_FIRST_OFFSET_METRES = 90;
const ASTEROID_CLUSTER_SPACING_MIN_METRES = 90;
const ASTEROID_CLUSTER_SPACING_MAX_METRES = 150;
const ASTEROID_CLUSTER_SIZE_MIN = 2;
const ASTEROID_CLUSTER_SIZE_MAX = 3;
const ASTEROID_CLUSTER_INNER_SPACING_MIN_METRES = 5;
const ASTEROID_CLUSTER_INNER_SPACING_MAX_METRES = 10;
const LIGHTNING_TRIGGER_DISTANCE_METRES = 28;
const LIGHTNING_HITBOX_WIDTH_RATIO = 0.58;
const LIGHTNING_HITBOX_HEIGHT_RATIO = 0.82;
const BRANCH_PERCH_TOP_TOLERANCE = 18;
const BRANCH_PERCH_PREVIOUS_BOTTOM_TOLERANCE = 6;
const BRANCH_PERCH_SETTLE_SPEED = 18;
const BRANCH_PERCH_SETTLE_EPSILON = 0.35;
const BRANCH_PERCH_Y_OFFSET = -2;
const BRANCH_TAKEOFF_COLLISION_GRACE_MS = 250;
const PLAYER_MANUAL_HITBOX_WIDTH_RATIO = 0.46;
const PLAYER_MANUAL_HITBOX_HEIGHT_RATIO = 0.58;
const PLAYER_BASE_LIVES = 1;
const PLAYER_BASE_SHIELD = 0;
const PLAYER_DAMAGE_INVULNERABILITY_MS = 900;
const PLAYER_REGENERATION_DELAY_MS = 7_000;
const PLAYER_SHIELD_RECHARGE_DELAY_MS = 10_000;
const LAVA_START_DELAY_MS = 1_000;
const LAVA_INITIAL_RISE_SPEED = 60;
const LAVA_SPEED_GAIN_PER_100_METRES = 4;
const LAVA_MAX_RISE_SPEED = 240;
const LAVA_START_Y = GROUND_Y + GROUND_DIRT_HEIGHT;
const LAVA_ALPHA = 1;
const LAVA_DEPTH = 13;
const LAVA_PLAYER_BOTTOM_CONTACT_OFFSET = 100;
const LAVA_DISPLAY_WIDTH = GAME_WIDTH;
const LAVA_DISPLAY_HEIGHT = GAME_HEIGHT;
const LAVA_VISIBLE_TOP_OFFSET =
  LAVA_SOURCE_VISIBLE_TOP * (LAVA_DISPLAY_HEIGHT / LAVA_SOURCE_HEIGHT);

interface GroundForestDecor {
  textureKey: string;
  x: number;
  scale: number;
  depth: number;
  scrollFactor: number;
  groundOffset: number;
  groundLayer?: 'background' | 'far-background';
  flipX?: boolean;
  alpha?: number;
}

type AltitudeLevelId =
  | 'forest'
  | 'lowSky'
  | 'midSky'
  | 'stratosphere'
  | 'space';

type ObstacleKindId =
  | 'branchLeft'
  | 'branchRight'
  | 'flyingInsect'
  | 'pterodactyl'
  | 'stormCloud'
  | 'lightning'
  | 'satellite'
  | 'asteroid';

type PlayerDamageReason = 'obstacle' | 'lava' | 'mosquito' | 'lightning';
type FinishGameReason = PlayerDamageReason | 'default';

interface ObstacleKind {
  id: ObstacleKindId;
  textureKey: string;
  width: number;
  height: number;
  fillColor: number;
  strokeColor: number;
  sourceTextureKey?: string;
  edge?: 'left' | 'right';
  displayWidth?: number;
  displayHeight?: number;
  animationKey?: string;
  hitbox?: {
    widthRatio: number;
    heightRatio: number;
    offsetXRatio: number;
    offsetYRatio: number;
  };
}

interface AltitudeLevelConfig {
  id: AltitudeLevelId;
  label: string;
  minAltitude: number;
  maxAltitude: number | null;
  obstacleKinds: readonly ObstacleKindId[];
  firstObstacleOffset: number;
  spacingMin: number;
  spacingMax: number;
  sideMargin: number;
}

interface ZoneTransitionConfig {
  altitude: number;
  textureKey: string;
  texturePath: string;
}

interface ZoneTransitionMarker {
  altitude: number;
  image: Phaser.GameObjects.Image;
  dispersed: boolean;
  revealStartedAt: number | null;
}

interface AmbientCloudTextureConfig {
  sourceKey: string;
  textureKey: string;
  texturePath: string;
  crop: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface AmbientCloudPlaneConfig {
  depth: number;
  scrollFactor: number;
  widthMin: number;
  widthMax: number;
  alphaMin: number;
  alphaMax: number;
  evaporatesOnContact: boolean;
}

interface AmbientCloud {
  image: Phaser.GameObjects.Image;
  velocityX: number;
  baseAlpha: number;
  evaporatesOnContact: boolean;
  evaporated: boolean;
}

interface SkyWindStreak {
  image: Phaser.GameObjects.Image;
  velocityX: number;
  age: number;
  lifetime: number;
  maxAlpha: number;
  wobblePhase: number;
  wobbleSpeed: number;
}

interface SkyWindLevelConfig {
  force: number;
  durationMinMs: number;
  durationMaxMs: number;
}

interface MosquitoCircleMotion {
  sprite: Phaser.GameObjects.Sprite;
  homeX: number;
  homeY: number;
  radius: number;
  startAngle: number;
  direction: 1 | -1;
}

interface PterodactylPatrolMotion {
  sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  direction: 1 | -1;
  resumeAt: number;
}

interface SatelliteDriftMotion {
  sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  homeX: number;
  homeY: number;
  startPhaseX: number;
  startPhaseY: number;
  rotationDirection: 1 | -1;
}

interface AsteroidPassageMotion {
  sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  triggerAltitude: number;
  launchSide: 'left' | 'right';
  verticalDirection: 1 | -1;
  rotationDirection: 1 | -1;
  launched: boolean;
}

interface LightningFlashMotion {
  sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  triggerAltitude: number;
  flashed: boolean;
}

interface FeatherParticle {
  image: Phaser.GameObjects.Image;
  velocityX: number;
  velocityY: number;
  angularVelocity: number;
  age: number;
  lifetime: number;
  baseScale: number;
  swayPhase: number;
  swaySpeed: number;
}

interface WindStreak {
  rectangle: Phaser.GameObjects.Rectangle;
  velocityX: number;
  velocityY: number;
  age: number;
  lifetime: number;
  maxAlpha: number;
}

const GROUND_FOREST_DECOR: readonly GroundForestDecor[] = [
  {
    textureKey: FOREST_VOLCANO_KEY,
    x: GAME_WIDTH / 2,
    scale: 0.55,
    depth: -9.5,
    scrollFactor: FAR_BACKGROUND_GROUND_SCROLL_FACTOR,
    groundOffset: 50,
    groundLayer: 'far-background',
    alpha: 1,
  },
  {
    textureKey: FOREST_TREE_1_KEY,
    x: 315,
    scale: 1,
    depth: -8.7,
    scrollFactor: BACKGROUND_GROUND_SCROLL_FACTOR,
    groundOffset: 5,
    groundLayer: 'background',
    flipX: true,
    alpha: 1,
  },
  {
    textureKey: FOREST_TREE_2_KEY,
    x: -60,
    scale: 1,
    depth: -6.4,
    scrollFactor: PARALLAX_NEAR_SCROLL_FACTOR,
    groundOffset: 28,
  },
  {
    textureKey: FOREST_TREE_1_KEY,
    x: -45,
    scale: 1.2,
    depth: 2,
    scrollFactor: PARALLAX_NEAR_SCROLL_FACTOR,
    groundOffset: 1,
    flipX: true,
    alpha: 1,
  },
  {
    textureKey: FOREST_TREE_2_KEY,
    x: 380,
    scale: 0.5,
    depth: -6.2,
    scrollFactor: PARALLAX_NEAR_SCROLL_FACTOR,
    groundOffset: 9,
    flipX: true,
    alpha: 1,
  },
  {
    textureKey: FOREST_TREE_1_KEY,
    x: 424,
    scale: 1,
    depth: -6.5,
    scrollFactor: PARALLAX_MID_SCROLL_FACTOR,
    groundOffset: 8,
  },
  {
    textureKey: FOREST_TREE_2_KEY,
    x: 105,
    scale: 0.38,
    depth: 1.65,
    scrollFactor: PARALLAX_NEAR_SCROLL_FACTOR,
    groundOffset: 4,
  },
  {
    textureKey: FOREST_TREE_1_KEY,
    x: 328,
    scale: 0.42,
    depth: 1.7,
    scrollFactor: PARALLAX_NEAR_SCROLL_FACTOR,
    groundOffset: 3,
    flipX: true,
  },
  {
    textureKey: FOREST_TREE_1_KEY,
    x: -245,
    scale: 0.7,
    depth: 12,
    scrollFactor: PARALLAX_FOREGROUND_SCROLL_FACTOR,
    groundOffset: 0,
    flipX: true,
  },
  {
    textureKey: FOREST_TREE_2_KEY,
    x: 670,
    scale: 0.72,
    depth: 12,
    scrollFactor: PARALLAX_FOREGROUND_SCROLL_FACTOR,
    groundOffset: 0,
  },
  {
    textureKey: FOREST_FERN_2_KEY,
    x: 130,
    scale: 0.045,
    depth: 11,
    scrollFactor: PARALLAX_NEAR_SCROLL_FACTOR,
    groundOffset: 10,
    flipX: true,
  },
  {
    textureKey: FOREST_FERN_1_KEY,
    x: 228,
    scale: 0.053,
    depth: 11,
    scrollFactor: PARALLAX_NEAR_SCROLL_FACTOR,
    groundOffset: 10,
  },
  {
    textureKey: FOREST_GRASS_4_KEY,
    x: 72,
    scale: 0.034,
    depth: -9.25,
    scrollFactor: FAR_BACKGROUND_GROUND_SCROLL_FACTOR,
    groundOffset: 15,
    groundLayer: 'far-background',
  },
  {
    textureKey: FOREST_GRASS_2_KEY,
    x: 318,
    scale: 0.03,
    depth: -9.2,
    scrollFactor: FAR_BACKGROUND_GROUND_SCROLL_FACTOR,
    groundOffset: 15,
    groundLayer: 'far-background',
    flipX: true,
  },
  {
    textureKey: FOREST_FERN_2_KEY,
    x: 116,
    scale: 0.11,
    depth: -3.75,
    scrollFactor: BACKGROUND_GROUND_SCROLL_FACTOR,
    groundOffset: 0,
    groundLayer: 'background',
    flipX: true,
  },
  {
    textureKey: FOREST_GRASS_1_KEY,
    x: 45,
    scale: 0.052,
    depth: -3.98,
    scrollFactor: BACKGROUND_GROUND_SCROLL_FACTOR,
    groundOffset: 15,
    groundLayer: 'background',
  },
  {
    textureKey: FOREST_GRASS_3_KEY,
    x: 215,
    scale: 0.046,
    depth: -3.94,
    scrollFactor: BACKGROUND_GROUND_SCROLL_FACTOR,
    groundOffset: 15,
    groundLayer: 'background',
    flipX: true,
  },
  {
    textureKey: FOREST_GRASS_4_KEY,
    x: 355,
    scale: 0.05,
    depth: -3.9,
    scrollFactor: BACKGROUND_GROUND_SCROLL_FACTOR,
    groundOffset: 15,
    groundLayer: 'background',
  },
  {
    textureKey: FOREST_GRASS_2_KEY,
    x: 58,
    scale: 0.064,
    depth: 1.2,
    scrollFactor: PARALLAX_NEAR_SCROLL_FACTOR,
    groundOffset: 16,
  },
  {
    textureKey: FOREST_GRASS_1_KEY,
    x: 305,
    scale: 0.06,
    depth: 1.4,
    scrollFactor: PARALLAX_NEAR_SCROLL_FACTOR,
    groundOffset: 16,
    flipX: true,
  },
  {
    textureKey: FOREST_GRASS_3_KEY,
    x: 382,
    scale: 0.052,
    depth: 11,
    scrollFactor: PARALLAX_NEAR_SCROLL_FACTOR,
    groundOffset: 17,
    flipX: true,
  },
  {
    textureKey: FOREST_GRASS_1_KEY,
    x: 18,
    scale: 0.027,
    depth: -9.29,
    scrollFactor: PARALLAX_FAR_SCROLL_FACTOR,
    groundOffset: 15,
    groundLayer: 'far-background',
    flipX: true,
  },
  {
    textureKey: FOREST_GRASS_3_KEY,
    x: 138,
    scale: 0.029,
    depth: -9.24,
    scrollFactor: PARALLAX_FAR_SCROLL_FACTOR,
    groundOffset: 15,
    groundLayer: 'far-background',
  },
  {
    textureKey: FOREST_GRASS_1_KEY,
    x: 232,
    scale: 0.031,
    depth: -9.22,
    scrollFactor: PARALLAX_FAR_SCROLL_FACTOR,
    groundOffset: 15,
    groundLayer: 'far-background',
  },
  {
    textureKey: FOREST_GRASS_4_KEY,
    x: 378,
    scale: 0.028,
    depth: -9.18,
    scrollFactor: PARALLAX_FAR_SCROLL_FACTOR,
    groundOffset: 15,
    groundLayer: 'far-background',
    flipX: true,
  },
  {
    textureKey: FOREST_GRASS_2_KEY,
    x: 8,
    scale: 0.044,
    depth: -4.02,
    scrollFactor: PARALLAX_MID_SCROLL_FACTOR,
    groundOffset: 15,
    groundLayer: 'background',
  },
  {
    textureKey: FOREST_GRASS_4_KEY,
    x: 102,
    scale: 0.041,
    depth: -3.97,
    scrollFactor: PARALLAX_MID_SCROLL_FACTOR,
    groundOffset: 15,
    groundLayer: 'background',
    flipX: true,
  },
  {
    textureKey: FOREST_GRASS_2_KEY,
    x: 158,
    scale: 0.048,
    depth: -3.93,
    scrollFactor: PARALLAX_MID_SCROLL_FACTOR,
    groundOffset: 15,
    groundLayer: 'background',
  },
  {
    textureKey: FOREST_GRASS_1_KEY,
    x: 270,
    scale: 0.044,
    depth: -3.91,
    scrollFactor: PARALLAX_MID_SCROLL_FACTOR,
    groundOffset: 15,
    groundLayer: 'background',
    flipX: true,
  },
  {
    textureKey: FOREST_GRASS_3_KEY,
    x: 315,
    scale: 0.041,
    depth: -3.88,
    scrollFactor: PARALLAX_MID_SCROLL_FACTOR,
    groundOffset: 15,
    groundLayer: 'background',
  },
  {
    textureKey: FOREST_GRASS_2_KEY,
    x: 402,
    scale: 0.045,
    depth: -3.86,
    scrollFactor: PARALLAX_MID_SCROLL_FACTOR,
    groundOffset: 15,
    groundLayer: 'background',
    flipX: true,
  },
  {
    textureKey: FOREST_GRASS_4_KEY,
    x: 6,
    scale: 0.052,
    depth: 1.1,
    scrollFactor: PARALLAX_NEAR_SCROLL_FACTOR,
    groundOffset: 16,
  },
  {
    textureKey: FOREST_GRASS_1_KEY,
    x: 112,
    scale: 0.055,
    depth: 1.25,
    scrollFactor: PARALLAX_NEAR_SCROLL_FACTOR,
    groundOffset: 16,
    flipX: true,
  },
  {
    textureKey: FOREST_GRASS_3_KEY,
    x: 168,
    scale: 0.049,
    depth: 1.3,
    scrollFactor: PARALLAX_NEAR_SCROLL_FACTOR,
    groundOffset: 16,
  },
  {
    textureKey: FOREST_GRASS_4_KEY,
    x: 235,
    scale: 0.058,
    depth: 1.35,
    scrollFactor: PARALLAX_NEAR_SCROLL_FACTOR,
    groundOffset: 16,
    flipX: true,
  },
  {
    textureKey: FOREST_GRASS_2_KEY,
    x: 350,
    scale: 0.054,
    depth: 1.45,
    scrollFactor: PARALLAX_NEAR_SCROLL_FACTOR,
    groundOffset: 16,
  },
  {
    textureKey: FOREST_GRASS_1_KEY,
    x: 255,
    scale: 0.042,
    depth: 11,
    scrollFactor: PARALLAX_NEAR_SCROLL_FACTOR,
    groundOffset: 17,
    flipX: true,
  },
];

const WATERMELON_TEXTURE_KEY = 'watermelon-collectable';
const WATERMELON_TEXTURE_PATH = '/assets/collectable/pastequeN.png';
const WATERMELON_TAKE_TEXTURE_KEY = 'watermelon-collect-take';
const WATERMELON_TAKE_TEXTURE_PATH = '/assets/collectable/pastèque take.png';
const WATERMELON_SCORE_TEXTURES = [
  { amount: 1, key: 'watermelon-collect-score-1', path: '/assets/collectable/score.png' },
  { amount: 2, key: 'watermelon-collect-score-2', path: '/assets/collectable/s2.png' },
  { amount: 3, key: 'watermelon-collect-score-3', path: '/assets/collectable/s3.png' },
  { amount: 4, key: 'watermelon-collect-score-4', path: '/assets/collectable/s4.png' },
  { amount: 5, key: 'watermelon-collect-score-5', path: '/assets/collectable/s5.png' },
  { amount: 6, key: 'watermelon-collect-score-6', path: '/assets/collectable/s6.png' },
  { amount: 7, key: 'watermelon-collect-score-7', path: '/assets/collectable/s7.png' },
  { amount: 8, key: 'watermelon-collect-score-8', path: '/assets/collectable/s8.png' },
] as const;
const WATERMELON_SEEDS_TEXTURE_KEY = 'watermelon-collect-seeds';
const WATERMELON_SEEDS_TEXTURE_PATH = '/assets/collectable/pepin.png';
const WATERMELON_JUICE_TEXTURE_KEY = 'watermelon-collect-juice';
const WATERMELON_JUICE_TEXTURE_PATH = '/assets/collectable/jus.png';
const WATERMELON_FRAGMENT_TEXTURES = [
  { key: 'watermelon-fragment-1', path: '/assets/collectable/m1.png' },
  { key: 'watermelon-fragment-2', path: '/assets/collectable/m2.png' },
  { key: 'watermelon-fragment-3', path: '/assets/collectable/m3.png' },
  { key: 'watermelon-fragment-4', path: '/assets/collectable/m4.png' },
  { key: 'watermelon-fragment-5', path: '/assets/collectable/m5.png' },
] as const;
const FRUIT_DETECTOR_TEXTURE_KEY = 'fruit-detector-talent-button';
const WATERMELON_COLLECT_SOUNDS = [
  { key: 'watermelon-collect-sound-1', path: '/assets/collectable/eat1.mp3' },
  { key: 'watermelon-collect-sound-2', path: '/assets/collectable/eat2.mp3' },
  { key: 'watermelon-collect-sound-3', path: '/assets/collectable/eat3.mp3' },
] as const;
const WATERMELON_SOUND_VOLUME = 0.65;
const WATERMELON_MAGNET_BASE_RADIUS = 100;
const WATERMELON_MAGNET_RADIUS_BY_LEVEL = [100, 200, 300, 400] as const;
const WATERMELON_MAGNET_SPEED_BY_LEVEL = [350, 400, 500, 600] as const;
const POTION_SOUND_KEY = 'life-vial-consume-sound';
const POTION_SOUND_PATH = '/assets/sounds/drinkPotion.mp3';
const POTION_SOUND_VOLUME = 0.7;
const DODO_HIT_SOUND_KEYS = ['dodo-hit-sound-1', 'dodo-hit-sound-2'] as const;
const DODO_HIT_SOUND_PATHS = ['/assets/sounds/hit1.m4a', '/assets/sounds/hit2.mp3'] as const;
const DODO_HIT_SOUND_VOLUME = 0.72;

const FLIGHT_SOUND_KEY = 'dodo-flight-default-sound';
const FLIGHT_SOUND_PATH = '/assets/sounds/defaut.mp3';
const FLIGHT_SOUND_VOLUME = 0.24;
const SKY_WIND_SOUND_KEY = 'sky-wind-sound';
const SKY_WIND_SOUND_PATH = '/assets/sounds/wind.mp3';
const SKY_WIND_SOUND_MAX_VOLUME = 0.58;
const SKY_WIND_SOUND_START_FORCE = 45;

const FLAP_SOUND_KEY = 'dodo-single-flap-sound';
const FLAP_SOUND_PATH = '/assets/sounds/1Flap.mp3';
const FLAP_SOUND_VOLUME = 0.25;
const GAME_OVER_SOUND_KEY = 'game-over-sound';
const GAME_OVER_SOUND_PATH = '/assets/sounds/GO.mp3';
const GAME_OVER_SOUND_VOLUME = 1;
const ZONE_TRANSITION_SOUND_KEY = 'zone-transition-sound';
const ZONE_TRANSITION_SOUND_PATH = '/assets/sounds/transistionMusic.mp3';
const ZONE_TRANSITION_SOUND_VOLUME = 0.72;

const COSMETIC_FALLBACK_TEXTURE_KEY = 'cosmetic-runtime-placeholder';
const COSMETIC_TRIM_ALPHA_THRESHOLD = 64;
const FEATHER_POOL_SIZE = 18;
const WIND_STREAK_POOL_SIZE = 16;
const FEATHER_TEXTURES = [
  {
    key: 'dodo-feather-small',
    path: '/assets/dodo/feather-small.png',
    scale: 0.04,
  },
  {
    key: 'dodo-feather-medium',
    path: '/assets/dodo/feather-medium.png',
    scale: 0.026,
  },
  {
    key: 'dodo-feather-large',
    path: '/assets/dodo/feather-large.png',
    scale: 0.019,
  },
] as const;

const WATERMELON_SCALE = 0.075;
const WATERMELON_DEPTH = 4;
const WATERMELON_GLOW_TEXTURE_KEY = 'watermelon-attraction-glow';
const WATERMELON_GLOW_SIZE = 112;
const WATERMELON_ROTATION_DURATION_MIN_MS = 4_500;
const WATERMELON_ROTATION_DURATION_MAX_MS = 6_500;
const WATERMELON_SIDE_MARGIN = 55;
const WATERMELON_FIRST_OFFSET_Y = 750;
const WATERMELON_MIN_SPACING_Y = 520;
const WATERMELON_MAX_SPACING_Y = 860;
const WATERMELON_TOP_MARGIN = 400;
const MAX_OBSTACLE_ALTITUDE = Math.floor((START_Y - WATERMELON_TOP_MARGIN) / 10);

const OBSTACLE_KINDS: readonly ObstacleKind[] = [
  {
    id: 'branchLeft',
    textureKey: 'obstacle-branch-left',
    sourceTextureKey: FOREST_BRANCH_LEFT_SOURCE_KEY,
    edge: 'left',
    width: 215,
    height: 86,
    displayWidth: 215,
    hitbox: {
      widthRatio: 0.88,
      heightRatio: 0.3,
      offsetXRatio: 0.06,
      offsetYRatio: 0.45,
    },
    fillColor: 0x7b4322,
    strokeColor: 0x3c1e10,
  },
  {
    id: 'branchRight',
    textureKey: 'obstacle-branch-right',
    sourceTextureKey: FOREST_BRANCH_RIGHT_SOURCE_KEY,
    edge: 'right',
    width: 215,
    height: 86,
    displayWidth: 215,
    hitbox: {
      widthRatio: 0.88,
      heightRatio: 0.27,
      offsetXRatio: 0.06,
      offsetYRatio: 0.29,
    },
    fillColor: 0x7b4322,
    strokeColor: 0x3c1e10,
  },
  {
    id: 'flyingInsect',
    textureKey: `${FOREST_MOSQUITO_TEXTURE_PREFIX}-01`,
    width: 80,
    height: 80,
    displayWidth: 80,
    animationKey: FOREST_MOSQUITO_ANIMATION_KEY,
    fillColor: 0xe1c542,
    strokeColor: 0x5f4f13,
  },
  {
    id: 'pterodactyl',
    textureKey: `${PTERODACTYL_TEXTURE_PREFIX}-000`,
    width: 96,
    height: 70,
    displayWidth: 96,
    animationKey: PTERODACTYL_ANIMATION_KEY,
    fillColor: 0x8a6b5b,
    strokeColor: 0x3a2a23,
  },
  {
    id: 'stormCloud',
    textureKey: `${STORM_CLOUD_TEXTURE_PREFIX}-000`,
    width: 220,
    height: 220,
    displayWidth: 220,
    animationKey: STORM_CLOUD_ANIMATION_KEY,
    fillColor: 0x273449,
    strokeColor: 0x101721,
  },
  {
    id: 'lightning',
    textureKey: `${LIGHTNING_TEXTURE_PREFIX}-000`,
    width: 100,
    height: 500,
    displayWidth: 100,
    displayHeight: GAME_HEIGHT,
    animationKey: LIGHTNING_ANIMATION_KEY,
    fillColor: 0xffda39,
    strokeColor: 0x8f6a00,
  },
  {
    id: 'satellite',
    textureKey: SATELLITE_TEXTURE_KEY,
    width: 200,
    height: 200,
    displayWidth: 200,
    fillColor: 0xc2c6d2,
    strokeColor: 0x545b6d,
  },
  {
    id: 'asteroid',
    textureKey: ASTEROID_TEXTURE_KEY,
    width: 180,
    height: 180,
    displayWidth: 180,
    fillColor: 0x8c8178,
    strokeColor: 0x3c3632,
  },
];

const ALTITUDE_LEVELS: readonly AltitudeLevelConfig[] = [
  {
    id: 'forest',
    label: 'Forest',
    minAltitude: 0,
    maxAltitude: 100,
    obstacleKinds: ['branchLeft', 'branchRight', 'flyingInsect'],
    firstObstacleOffset: 35,
    spacingMin: 35,
    spacingMax: 55,
    sideMargin: 34,
  },
  {
    id: 'forest',
    label: 'Forest',
    minAltitude: 100,
    maxAltitude: 250,
    obstacleKinds: ['flyingInsect'],
    firstObstacleOffset: 25,
    spacingMin: 55,
    spacingMax: 85,
    sideMargin: 34,
  },
  {
    id: 'lowSky',
    label: 'LowSky',
    minAltitude: 250,
    maxAltitude: 600,
    obstacleKinds: ['pterodactyl'],
    firstObstacleOffset: 55,
    spacingMin: 90,
    spacingMax: 135,
    sideMargin: 42,
  },
  {
    id: 'midSky',
    label: 'MidSky',
    minAltitude: 600,
    maxAltitude: 1_000,
    obstacleKinds: ['pterodactyl', 'stormCloud', 'lightning'],
    firstObstacleOffset: 45,
    spacingMin: 85,
    spacingMax: 125,
    sideMargin: 48,
  },
  {
    id: 'midSky',
    label: 'CloudExit',
    minAltitude: 1_000,
    maxAltitude: 1_200,
    obstacleKinds: ['lightning'],
    firstObstacleOffset: 45,
    spacingMin: 95,
    spacingMax: 135,
    sideMargin: 34,
  },
  {
    id: 'stratosphere',
    label: 'UpperAtmosphere',
    minAltitude: 1_200,
    maxAltitude: 7_000,
    obstacleKinds: [],
    firstObstacleOffset: 180,
    spacingMin: 240,
    spacingMax: 360,
    sideMargin: 34,
  },
  {
    id: 'stratosphere',
    label: 'SpaceEdge',
    minAltitude: 7_000,
    maxAltitude: 8_000,
    obstacleKinds: ['satellite'],
    firstObstacleOffset: 180,
    spacingMin: 300,
    spacingMax: 480,
    sideMargin: 44,
  },
  {
    id: 'space',
    label: 'Space',
    minAltitude: 8_000,
    maxAltitude: 10_000,
    obstacleKinds: ['satellite', 'asteroid'],
    firstObstacleOffset: 160,
    spacingMin: 280,
    spacingMax: 430,
    sideMargin: 44,
  },
];

const ZONE_TRANSITIONS: readonly ZoneTransitionConfig[] = [
  {
    altitude: 200,
    textureKey: 'zone-transition-200',
    texturePath: '/assets/Decors/t1.png',
  },
  {
    altitude: 800,
    textureKey: 'zone-transition-800',
    texturePath: '/assets/Decors/t2.png',
  },
  {
    altitude: 1_200,
    textureKey: 'zone-transition-1200',
    texturePath: '/assets/Decors/t3.png',
  },
  {
    altitude: 1_800,
    textureKey: 'zone-transition-1800',
    texturePath: '/assets/Decors/t4.png',
  },
];
const ZONE_TRANSITION_SCROLL_FACTOR = PARALLAX_FAR_SCROLL_FACTOR;
const ZONE_TRANSITION_DEPTH = 20;
const ZONE_TRANSITION_SCREEN_Y_RATIO = 0.43;
const ZONE_TRANSITION_CLOUD_TEXTURE_KEY = 'zone-transition-cloud-puff';
const ZONE_TRANSITION_CLOUD_PUFF_COUNT = 24;
const AMBIENT_CLOUD_MIN_ALTITUDE = 100;
const AMBIENT_CLOUD_LAYER_ALTITUDE = 250;
const AMBIENT_CLOUD_STORM_MIN_ALTITUDE = 600;
const AMBIENT_CLOUD_STORM_MAX_ALTITUDE = 1_000;
const AMBIENT_CLOUD_MAX_ALTITUDE = 1_200;
const AMBIENT_CLOUD_COUNT = 32;
const AMBIENT_CLOUD_FIRST_LAYER_COUNT = 4;
const AMBIENT_CLOUD_TEXTURES: readonly AmbientCloudTextureConfig[] = [
  {
    sourceKey: 'ambient-cloud-1-source',
    textureKey: 'ambient-cloud-1',
    texturePath: '/assets/Decors/nuage1.png',
    crop: { x: 78, y: 320, width: 640, height: 370 },
  },
  {
    sourceKey: 'ambient-cloud-2-source',
    textureKey: 'ambient-cloud-2',
    texturePath: '/assets/Decors/nuage2.png',
    crop: { x: 92, y: 300, width: 570, height: 380 },
  },
  {
    sourceKey: 'ambient-cloud-3-source',
    textureKey: 'ambient-cloud-3',
    texturePath: '/assets/Decors/nuage3.png',
    crop: { x: 105, y: 375, width: 1_245, height: 365 },
  },
];
const AMBIENT_CLOUD_PLANES: readonly AmbientCloudPlaneConfig[] = [
  {
    depth: -6.5,
    scrollFactor: 0.25,
    widthMin: 105,
    widthMax: 175,
    alphaMin: 0.4,
    alphaMax: 0.58,
    evaporatesOnContact: false,
  },
  {
    depth: 5,
    scrollFactor: 0.55,
    widthMin: 135,
    widthMax: 225,
    alphaMin: 0.55,
    alphaMax: 0.72,
    evaporatesOnContact: false,
  },
  {
    depth: 9,
    scrollFactor: 1,
    widthMin: 165,
    widthMax: 270,
    alphaMin: 0.68,
    alphaMax: 0.86,
    evaporatesOnContact: true,
  },
  {
    depth: 18,
    scrollFactor: 1.12,
    widthMin: 220,
    widthMax: 350,
    alphaMin: 0.58,
    alphaMax: 0.76,
    evaporatesOnContact: false,
  },
];
const AMBIENT_CLOUD_TINTS = [
  0xffffff,
  0xedf1f4,
  0xdde3e7,
  0xcdd5da,
  0xbec8cf,
  0xd9dee7,
] as const;
const SKY_WIND_TEXTURE_KEY = 'sky-wind-streak';
const SKY_WIND_STREAK_POOL_SIZE = 18;
const SKY_WIND_MIN_ALTITUDE = AMBIENT_CLOUD_MIN_ALTITUDE;
const SKY_WIND_MAX_ALTITUDE = AMBIENT_CLOUD_MAX_ALTITUDE;
const SKY_WIND_MAX_FORCE = 123;
const SKY_WIND_LEVELS: readonly SkyWindLevelConfig[] = [
  { force: 0, durationMinMs: 3_500, durationMaxMs: 7_000 },
  { force: 34, durationMinMs: 4_500, durationMaxMs: 8_500 },
  { force: 72, durationMinMs: 3_800, durationMaxMs: 7_000 },
  { force: 123, durationMinMs: 2_800, durationMaxMs: 5_200 },
];

const LEFT_WING_FRAMES = [
  'dodo-wing-left-1',
  'dodo-wing-left-2',
  'dodo-wing-left-3',
  'dodo-wing-left-4',
  'dodo-wing-left-5',
  'dodo-wing-left-6',
  'dodo-wing-left-7',
  'dodo-wing-left-8',
  'dodo-wing-left-9',
  'dodo-wing-left-10',
  'dodo-wing-left-11',
  'dodo-wing-left-12',
  'dodo-wing-left-13',
  'dodo-wing-left-14',
  'dodo-wing-left-13',
  'dodo-wing-left-12',
  'dodo-wing-left-11',
  'dodo-wing-left-10',
  'dodo-wing-left-9',
  'dodo-wing-left-8',
  'dodo-wing-left-7',
  'dodo-wing-left-6',
  'dodo-wing-left-5',
  'dodo-wing-left-4',
  'dodo-wing-left-3',
  'dodo-wing-left-2',
];

const RIGHT_WING_FRAMES = [
  'dodo-wing-right-1',
  'dodo-wing-right-2',
  'dodo-wing-right-3',
  'dodo-wing-right-4',
  'dodo-wing-right-5',
  'dodo-wing-right-6',
  'dodo-wing-right-7',
  'dodo-wing-right-8',
  'dodo-wing-right-9',
  'dodo-wing-right-10',
  'dodo-wing-right-11',
  'dodo-wing-right-12',
  'dodo-wing-right-13',
  'dodo-wing-right-14',
  'dodo-wing-right-13',
  'dodo-wing-right-12',
  'dodo-wing-right-11',
  'dodo-wing-right-10',
  'dodo-wing-right-9',
  'dodo-wing-right-8',
  'dodo-wing-right-7',
  'dodo-wing-right-6',
  'dodo-wing-right-5',
  'dodo-wing-right-4',
  'dodo-wing-right-3',
  'dodo-wing-right-2',
];

const LEG_FRAMES = [
  'dodo-flight-legs-1',
  'dodo-flight-legs-2',
  'dodo-flight-legs-3',
  'dodo-flight-legs-4',
  'dodo-flight-legs-5',
  'dodo-flight-legs-6',
  'dodo-flight-legs-7',
  'dodo-flight-legs-8',
  'dodo-flight-legs-9',
  'dodo-flight-legs-10',
  'dodo-flight-legs-11',
  'dodo-flight-legs-12',
  'dodo-flight-legs-13',
  'dodo-flight-legs-14',
  'dodo-flight-legs-15',
  'dodo-flight-legs-16',
  'dodo-flight-legs-17',
  'dodo-flight-legs-18',
  'dodo-flight-legs-19',
  'dodo-flight-legs-20',
  'dodo-flight-legs-21',
  'dodo-flight-legs-22',
  'dodo-flight-legs-23',
  'dodo-flight-legs-24',
  'dodo-flight-legs-25',
  'dodo-flight-legs-26',
  'dodo-flight-legs-27',
  'dodo-flight-legs-28',
  'dodo-flight-legs-29',
  'dodo-flight-legs-30',
  'dodo-flight-legs-31',
  'dodo-flight-legs-32',
  'dodo-flight-legs-33',
  'dodo-flight-legs-34',
];

export class GameplayScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Image;
  private leftWing!: Phaser.GameObjects.Image;
  private rightWing!: Phaser.GameObjects.Image;
  private groundFeet!: Phaser.GameObjects.Image;
  private flightFeet!: Phaser.GameObjects.Image;
  private lavaDeathSprite!: Phaser.GameObjects.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private watermelonCollectables!: Phaser.Physics.Arcade.StaticGroup;
  private obstacleGroup!: Phaser.Physics.Arcade.Group;
  private mosquitoCircleMotions: MosquitoCircleMotion[] = [];
  private pterodactylPatrols: PterodactylPatrolMotion[] = [];
  private satelliteDriftMotions: SatelliteDriftMotion[] = [];
  private asteroidPassageMotions: AsteroidPassageMotion[] = [];
  private lightningFlashMotions: LightningFlashMotion[] = [];
  private stormCloudObstacles: Phaser.Physics.Arcade.Sprite[] = [];
  private lightningScreenFlash!: Phaser.GameObjects.Rectangle;
  private ambientClouds: AmbientCloud[] = [];
  private skyWindStreaks: SkyWindStreak[] = [];
  private skyWindForce = 0;
  private skyWindTargetForce = 0;
  private skyWindNextChangeAt = 0;
  private skyWindConsecutiveActivePhases = 0;
  private skyWindSpawnAccumulator = 0;
  private skyWindBaseVolume = 0;
  private audioSettings: AudioSettings = getAudioSettings();
  private unsubscribeAudioSettings?: () => void;
  private language: AppLanguage = getAppLanguage();
  private unsubscribeAppLanguage?: () => void;
  private flightSound?:
    | Phaser.Sound.WebAudioSound
    | Phaser.Sound.HTML5AudioSound;
  private skyWindSound?:
    | Phaser.Sound.WebAudioSound
    | Phaser.Sound.HTML5AudioSound;
  private featherParticles: FeatherParticle[] = [];
  private windStreaks: WindStreak[] = [];
  private windStreakSpawnAccumulator = 0;
  private cosmeticImages = new Map<
    CosmeticCategory,
    Phaser.GameObjects.Image
  >();

  private cosmeticFallbackTexts = new Map<
    CosmeticCategory,
    Phaser.GameObjects.Text
  >();

  private equippedCosmeticIds: EquippedCosmetics = {
    hat: null,
    glasses: null,
    scarf: null,
    shoes: null,
    outfit: null,
  };

  private cosmeticImageReady = new Map<string, boolean>();
  private cosmeticLoadPromises = new Map<string, Promise<boolean>>();
  private cosmeticRequestVersions = new Map<CosmeticCategory, number>();

  private heldPointerSides = new Map<number, -1 | 1>();
  private angularVelocity = 0;
  private leftWingPhase = 0;
  private rightWingPhase = 0;
  private leftWingBoostTime = 0;
  private rightWingBoostTime = 0;
  private lastAcceptedFlapTime = Number.NEGATIVE_INFINITY;
  private idleFlightState: 'active' | 'panic' | 'dropping' = 'active';
  private idleFlightPanicStartedAt = 0;
  private legAnimationTime = 0;

  private startAltitudeY = START_Y;
  private bestAltitude = 0;
  private currentAltitude = 0;
  private currentSpeed = 0;
  private recordToBeat = 0;
  private bestScoreReady = false;
  private newRecordCelebrated = false;
  private zoneTransitionMarkers: ZoneTransitionMarker[] = [];
  private watermelons = 0;
  private playerMaxLives = PLAYER_BASE_LIVES;
  private playerLives = PLAYER_BASE_LIVES;
  private playerMaxShield = PLAYER_BASE_SHIELD;
  private playerShield = PLAYER_BASE_SHIELD;
  private controlStats: ControlTalentStats = {
    flapUpwardImpulse: BASE_FLAP_UPWARD_IMPULSE,
    lift: 0,
    autoLevelSpeed: BASE_AUTO_LEVEL_SPEED,
    flapTurnImpulse: BASE_FLAP_TURN_IMPULSE,
  };
  private enduranceStats: EnduranceTalentStats = {
    maxLives: PLAYER_BASE_LIVES,
    maxShield: PLAYER_BASE_SHIELD,
    mosquitoShield: false,
    regeneration: false,
    shieldRecharge: false,
    phoenix: false,
  };
  private blueTalentStats: BlueTalentStats = {
    watermelonMagnetLevel: 0,
    watermelonBonus: 0,
    branchPerch: false,
    fruitDetector: false,
    chainReaction: false,
    powerTakeoff: false,
    feast: false,
  };
  private shopObjectInventory: ShopObjectInventory =
    createEmptyShopObjectInventory();
  private watermelonCollectStreak = 0;
  private fruitDetectorButton?: Phaser.GameObjects.Image;
  private fruitDetectorArrow?: Phaser.GameObjects.Graphics;
  private fruitDetectorActive = false;
  private perchedBranch: Phaser.Physics.Arcade.Image | null = null;
  private perchTargetX: number | null = null;
  private isPerchSettling = false;
  private perchCollisionGraceBranch: Phaser.Physics.Arcade.Image | null = null;
  private perchCollisionGraceUntil = 0;
  private pendingPowerTakeoff = false;
  private lastPlayerDamageTime = Number.NEGATIVE_INFINITY;
  private nextLifeRegenerationAt: number | null = null;
  private nextShieldRechargeAt: number | null = null;
  private hasUsedPhoenix = false;
  private hasUsedRewardedRevive = false;
  private hasEmittedMovementStarted = false;
  private maxAltitudeSinceTakeoff = 0;
  private isGrounded = true;

  private gameOver = false;
  private deathReason: FinishGameReason | null = null;
  private gamePaused = false;
  private outOfScreenSince: number | null = null;
  private lastWarningSecond: number | null = null;
  private lastWarningReason: 'fall' | 'side' | null = null;
  private lastHudSnapshot: FlightHudDetail | null = null;
  private lastDodoPose: CosmeticPose | 'lava' | 'lightning' | null = null;
  private offscreenIndicator!: Phaser.GameObjects.Container;
  private offscreenIndicatorBody!: Phaser.GameObjects.Image;
  private groundRecordValue!: Phaser.GameObjects.Text;
  private lava!: Phaser.GameObjects.Sprite;
  private lavaTopY = LAVA_START_Y;
  private runStartTime = 0;

  constructor() {
    super('GameplayScene');
  }

  preload(): void {
    this.load.audio(THUNDER_SOUND_KEY, THUNDER_SOUND_PATH);
    this.load.audio(LIGHTNING_SOUND_KEY, LIGHTNING_SOUND_PATH);
    this.load.audio(GAME_OVER_SOUND_KEY, GAME_OVER_SOUND_PATH);
    this.load.audio(SKY_WIND_SOUND_KEY, SKY_WIND_SOUND_PATH);
    this.load.audio(
      ZONE_TRANSITION_SOUND_KEY,
      ZONE_TRANSITION_SOUND_PATH,
    );
    this.load.image(
      DODO_LIGHTNING_DEATH_TEXTURE_KEY,
      DODO_LIGHTNING_DEATH_TEXTURE_PATH,
    );
    this.load.image(
      PHOENIX_REVIVAL_TEXTURE_KEY,
      PHOENIX_REVIVAL_TEXTURE_PATH,
    );
    for (const frameIndex of DODO_LAVA_DEATH_FRAME_INDICES) {
      const paddedIndex = frameIndex.toString().padStart(3, '0');
      this.load.image(
        `${DODO_LAVA_DEATH_TEXTURE_PREFIX}-${paddedIndex}`,
        `/assets/dodo/sprite-max-px-frames-36-rows-6-cols-6-frames/frame_${paddedIndex}.png`,
      );
    }
    this.load.image(GROUND_TEXTURE_KEY, GROUND_TEXTURE_PATH);
    this.load.image(
      BACKGROUND_GROUND_TEXTURE_KEY,
      BACKGROUND_GROUND_TEXTURE_PATH,
    );
    for (const transition of ZONE_TRANSITIONS) {
      this.load.image(transition.textureKey, transition.texturePath);
    }
    for (const cloudTexture of AMBIENT_CLOUD_TEXTURES) {
      this.load.image(cloudTexture.sourceKey, cloudTexture.texturePath);
    }
    this.load.image(FOREST_VOLCANO_KEY, '/assets/Decors/volcan.png');
    this.load.image(FOREST_TREE_1_KEY, '/assets/Decors/arbre1.png');
    this.load.image(FOREST_TREE_2_KEY, '/assets/Decors/arbre2.png');
    this.load.image(FOREST_FERN_1_KEY, '/assets/Decors/fougere1.png');
    this.load.image(FOREST_FERN_2_KEY, '/assets/Decors/fougère2.png');
    this.load.image(FOREST_GRASS_1_KEY, '/assets/Decors/h1.png');
    this.load.image(FOREST_GRASS_2_KEY, '/assets/Decors/h2.png');
    this.load.image(FOREST_GRASS_3_KEY, '/assets/Decors/h3.png');
    this.load.image(FOREST_GRASS_4_KEY, '/assets/Decors/h4.png');
    this.load.image(
      FOREST_BRANCH_RIGHT_SOURCE_KEY,
      '/assets/obstacles/forest/branche-d.png',
    );
    this.load.image(
      FOREST_BRANCH_LEFT_SOURCE_KEY,
      '/assets/obstacles/forest/branche-g.png',
    );
    for (let index = 1; index <= FOREST_MOSQUITO_FRAME_COUNT; index += 1) {
      const paddedIndex = index.toString().padStart(2, '0');
      this.load.image(
        `${FOREST_MOSQUITO_TEXTURE_PREFIX}-${paddedIndex}`,
        `/assets/obstacles/forest/moustik/${paddedIndex}.png`,
      );
    }
    for (let index = 0; index < PTERODACTYL_FRAME_COUNT; index += 1) {
      const paddedIndex = index.toString().padStart(3, '0');
      this.load.image(
        `${PTERODACTYL_TEXTURE_PREFIX}-${paddedIndex}`,
        `/assets/obstacles/lowSky/pterodactyl/frame_${paddedIndex}.png`,
      );
    }
    for (let index = 0; index < STORM_CLOUD_FRAME_COUNT; index += 1) {
      const paddedIndex = index.toString().padStart(3, '0');
      this.load.image(
        `${STORM_CLOUD_TEXTURE_PREFIX}-${paddedIndex}`,
        `/assets/obstacles/midSky/nuage/frame_${paddedIndex}.png`,
      );
    }
    for (let index = 0; index < LIGHTNING_FRAME_COUNT; index += 1) {
      const paddedIndex = index.toString().padStart(3, '0');
      this.load.image(
        `${LIGHTNING_TEXTURE_PREFIX}-${paddedIndex}`,
        `/assets/obstacles/midSky/eclaire/frame_${paddedIndex}.png`,
      );
    }
    this.load.image(SATELLITE_TEXTURE_KEY, '/assets/obstacles/space/satelite.png');
    this.load.image(ASTEROID_TEXTURE_KEY, '/assets/obstacles/space/asteroide.png');
    for (let index = 0; index < LAVA_FRAME_COUNT; index += 1) {
      const paddedIndex = index.toString().padStart(3, '0');
      this.load.image(
        `${LAVA_TEXTURE_PREFIX}-${paddedIndex}`,
        `/assets/obstacles/lave/frame_${paddedIndex}.png`,
      );
    }
    this.load.image(
      FRUIT_DETECTOR_TEXTURE_KEY,
      '/assets/competences/Talents/D%C3%A9tecteur%20de%20fruit.png',
    );
    this.load.image('dodo-body-flight', '/assets/dodo/optimized/flight_refined/body_flight.png');
    this.load.image('dodo-pose-flight', '/assets/dodo/optimized/flight.png');
    this.load.image('dodo-pose-ground', '/assets/dodo/optimized/flight_refined/ground.png');
    this.load.image('dodo-ground-feet', '/assets/dodo/optimized/foot-ground.png');
    FEATHER_TEXTURES.forEach(({ key, path }) => {
      this.load.image(key, path);
    });
    this.load.image(
      'dodo-flight-feet-default',
      '/assets/dodo/optimized/animation/flight_feet.png',
    );
    this.load.image(WATERMELON_TEXTURE_KEY, WATERMELON_TEXTURE_PATH);
    this.load.image(WATERMELON_TAKE_TEXTURE_KEY, WATERMELON_TAKE_TEXTURE_PATH);
    WATERMELON_SCORE_TEXTURES.forEach(({ key, path }) => {
      this.load.image(key, path);
    });
    this.load.image(WATERMELON_SEEDS_TEXTURE_KEY, WATERMELON_SEEDS_TEXTURE_PATH);
    this.load.image(WATERMELON_JUICE_TEXTURE_KEY, WATERMELON_JUICE_TEXTURE_PATH);
    WATERMELON_FRAGMENT_TEXTURES.forEach(({ key, path }) => {
      this.load.image(key, path);
    });
    WATERMELON_COLLECT_SOUNDS.forEach(({ key, path }) => {
      this.load.audio(key, path);
    });
    this.load.audio(POTION_SOUND_KEY, POTION_SOUND_PATH);
    DODO_HIT_SOUND_KEYS.forEach((key, index) => {
      this.load.audio(key, DODO_HIT_SOUND_PATHS[index]);
    });
    this.load.audio(FLIGHT_SOUND_KEY, FLIGHT_SOUND_PATH);
    this.load.audio(FLAP_SOUND_KEY, FLAP_SOUND_PATH);

    for (let index = 1; index <= 14; index += 1) {
      this.load.image(
        `dodo-wing-left-${index}`,
        `/assets/dodo/optimized/flight_refined/wing_left_${index}.png`,
      );
      this.load.image(
        `dodo-wing-right-${index}`,
        `/assets/dodo/optimized/flight_refined/wing_right_${index}.png`,
      );
    }

    for (let index = 1; index <= 34; index += 1) {
      this.load.image(
        LEG_FRAMES[index - 1],
        `/assets/dodo/optimized/flight_refined/legs_${index}.png`,
      );
    }
  }

  create(data?: { startPaused?: boolean }): void {
    this.unsubscribeAudioSettings?.();
    this.audioSettings = getAudioSettings();
    this.unsubscribeAudioSettings = subscribeAudioSettings((settings) => {
      this.audioSettings = settings;
      this.applyAudioSettings();
    });
    this.unsubscribeAppLanguage?.();
    this.language = getAppLanguage();
    this.unsubscribeAppLanguage = subscribeAppLanguage((language) => {
      this.language = language;
      this.updateGroundRecordText();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribeAudioSettings?.();
      this.unsubscribeAudioSettings = undefined;
      this.unsubscribeAppLanguage?.();
      this.unsubscribeAppLanguage = undefined;
    });

    this.resetRuntimeState();
    const devStartAltitude = getDevStartAltitude();
    const playerStartY = START_Y - devStartAltitude * 10;
    this.createFlightSounds();

    this.physics.world.setBounds(0, 0, GAME_WIDTH, WORLD_HEIGHT);
    this.physics.world.gravity.y = 0;

    this.createPlaceholderTextures();
    this.createObstaclePlaceholderTextures();
    this.createNewRecordLeafTexture();
    this.createObstacleAnimations();
    this.createSkyDecor();
    this.createZoneTransitionMarkers();
    this.createAmbientClouds();
    this.createGroundDecor();
    this.createFarBackgroundGround();
    this.createBackgroundGround();
    this.createGroundForestDecor();
    this.createGroundRecord();
    this.createLava();
    this.createLightningScreenFlash();

    this.leftWing = this.add.image(
      GAME_WIDTH / 2,
      playerStartY,
      LEFT_WING_FRAMES[0],
    );
    this.rightWing = this.add.image(
      GAME_WIDTH / 2,
      playerStartY,
      RIGHT_WING_FRAMES[0],
    );
    this.leftWing.setOrigin(0.5, 0.92).setScale(DODO_WING_SCALE).setDepth(8);
    this.rightWing.setOrigin(0.5, 0.92).setScale(DODO_WING_SCALE).setDepth(8);

    this.player = this.physics.add.image(
      GAME_WIDTH / 2,
      playerStartY,
      devStartAltitude > 0 ? 'dodo-pose-flight' : 'dodo-pose-ground',
    );
    this.player.setOrigin(0.2, DODO_GROUND_ORIGIN_Y);
    this.player.setScale(DODO_GROUND_SCALE);
    this.player.setDepth(10);
    this.player.setCollideWorldBounds(false);
    this.player.setVelocity(0, 0);
    this.player.setMaxVelocity(MAX_HORIZONTAL_SPEED, MAX_VERTICAL_SPEED);
    this.configurePlayerHitbox();

    this.groundFeet = this.add.image(
      GAME_WIDTH / 2,
      playerStartY,
      'dodo-ground-feet',
    );
    this.groundFeet
      .setOrigin(0.5, DODO_GROUND_ORIGIN_Y)
      .setScale(DODO_GROUND_FEET_SCALE)
      .setDepth(9)
      .setVisible(devStartAltitude === 0);

    this.flightFeet = this.add.image(
      GAME_WIDTH / 2,
      playerStartY,
      'dodo-flight-feet-default',
    );
    this.flightFeet
      .setOrigin(0.5, DODO_FLIGHT_ORIGIN_Y)
      .setScale(DODO_FLIGHT_FEET_SCALE_X, DODO_FLIGHT_FEET_SCALE_Y)
      .setDepth(9)
      .setVisible(devStartAltitude > 0);

    this.lavaDeathSprite = this.add
      .sprite(
        GAME_WIDTH / 2,
        playerStartY,
        `${DODO_LAVA_DEATH_TEXTURE_PREFIX}-000`,
      )
      .setOrigin(0.5, DODO_FLIGHT_ORIGIN_Y)
      .setScale(DODO_LAVA_DEATH_SCALE)
      .setDepth(DODO_LAVA_DEATH_DEPTH)
      .setVisible(false);

    this.createDodoJuicePools();
    this.createSkyWindPool();
    this.createCosmeticDisplayObjects();

    this.createWatermelonCollectables();
    this.createAltitudeObstacles();
    this.physics.add.overlap(
      this.player,
      this.watermelonCollectables,
      this.handleWatermelonCollected,
      undefined,
      this,
    );
    this.physics.add.overlap(
      this.player,
      this.obstacleGroup,
      this.handleObstacleHit,
      this.shouldProcessNonBranchOverlap,
      this,
    );
    this.physics.add.collider(
      this.player,
      this.obstacleGroup,
      this.handleObstacleHit,
      this.shouldProcessBranchCollision,
      this,
    );

    this.createOffscreenIndicator();

    const camera = this.cameras.main;
    camera.roundPixels = false;
    camera.setBounds(0, 0, GAME_WIDTH, WORLD_HEIGHT);
    camera.setScroll(0, playerStartY - GAME_HEIGHT * PLAYER_SCREEN_Y_RATIO);
    camera.setBackgroundColor('#73d8ff');

    if (devStartAltitude > 0) {
      this.currentAltitude = devStartAltitude;
      this.maxAltitudeSinceTakeoff = devStartAltitude;
      this.isGrounded = false;
      this.lastAcceptedFlapTime = this.time.now;
      this.zoneTransitionMarkers.forEach((marker) => {
        if (marker.altitude <= devStartAltitude) {
          marker.dispersed = true;
          marker.image.setAlpha(0).setVisible(false);
        }
      });
    }

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keyA = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D);

    this.input.on('pointerdown', this.handlePointerDown, this);
    this.input.on('pointermove', this.handlePointerMove, this);
    this.input.on('pointerup', this.handlePointerUp, this);
    this.input.on('pointerupoutside', this.handlePointerUp, this);

    gameEvents.addEventListener('flydodo:restart-request', this.handleRestartRequest);
    gameEvents.addEventListener(
      'flydodo:rewarded-revive-request',
      this.handleRewardedReviveRequest,
    );
    gameEvents.addEventListener('flydodo:pause-request', this.handlePauseRequest);
    gameEvents.addEventListener('flydodo:resume-request', this.handleResumeRequest);
    gameEvents.addEventListener(
      'flydodo:cosmetic-equipped',
      this.handleCosmeticEquipped,
    );
    gameEvents.addEventListener('flydodo:talents-updated', this.handleTalentsUpdated);
    gameEvents.addEventListener(
      'flydodo:shop-objects-updated',
      this.handleShopObjectsUpdated,
    );
    this.events.on(
      Phaser.Scenes.Events.POST_UPDATE,
      this.syncDodoVisualsBeforeRender,
      this,
    );

    void this.initializeBestScore();
    void this.initializePlayerState();
    this.updateDodoVisuals(0);
    this.runStartTime = this.time.now;

    if (data?.startPaused) {
      this.handlePauseRequest();
    }
  }

  update(time: number, delta: number): void {
    const deltaSeconds = Math.min(delta / 1000, 0.034);

    if (this.gameOver) {
      this.updateDodoJuiceParticles(deltaSeconds);
      this.updateDodoVisuals(deltaSeconds);
      this.updateOffscreenIndicator();
      return;
    }

    if (this.gamePaused) {
      this.updateDodoVisuals(deltaSeconds);
      this.updateOffscreenIndicator();
      return;
    }

    const direction = this.consumeFlapDirection(time);
    this.updateIdleFlightState(time);
    this.updateMosquitoCircleMotions(time);
    this.updatePterodactylPatrols(time);
    this.updateSatelliteDrifts(time, deltaSeconds);
    this.updateAsteroidPassages(deltaSeconds);
    this.updateLightningFlashes();
    this.updateFlight(direction, deltaSeconds);
    this.updateSkyWind(deltaSeconds);
    this.updateHorizontalScreenBounds();
    this.updateGroundContact();
    this.updateWingBeats(direction, deltaSeconds);
    this.updateDodoJuice(deltaSeconds);
    this.updateWatermelonMisses();
    this.updateWatermelonMagnetAttraction(deltaSeconds);
    this.updateFeastAttraction(deltaSeconds);
    this.updateFruitDetectorArrow();
    this.updateEnduranceTimers(time);
    this.updateOffscreenIndicator();
    this.updateAltitudeAndHud();
    this.updateLava(time, deltaSeconds);
    this.updateFallState(time);
  }

  shutdown(): void {
    this.unsubscribeAppLanguage?.();
    this.unsubscribeAppLanguage = undefined;
    this.heldPointerSides.clear();
    this.destroyFlightSounds();
    this.sound.stopByKey(THUNDER_SOUND_KEY);
    this.sound.stopByKey(LIGHTNING_SOUND_KEY);
    this.sound.stopByKey(GAME_OVER_SOUND_KEY);
    this.sound.stopByKey(ZONE_TRANSITION_SOUND_KEY);
    this.destroyFruitDetectorButton();
    this.events.off(
      Phaser.Scenes.Events.POST_UPDATE,
      this.syncDodoVisualsBeforeRender,
      this,
    );

    this.input.off('pointerdown', this.handlePointerDown, this);
    this.input.off('pointermove', this.handlePointerMove, this);
    this.input.off('pointerup', this.handlePointerUp, this);
    this.input.off('pointerupoutside', this.handlePointerUp, this);
    gameEvents.removeEventListener('flydodo:restart-request', this.handleRestartRequest);
    gameEvents.removeEventListener(
      'flydodo:rewarded-revive-request',
      this.handleRewardedReviveRequest,
    );
    gameEvents.removeEventListener('flydodo:pause-request', this.handlePauseRequest);
    gameEvents.removeEventListener('flydodo:resume-request', this.handleResumeRequest);
    gameEvents.removeEventListener(
      'flydodo:cosmetic-equipped',
      this.handleCosmeticEquipped,
    );
    gameEvents.removeEventListener('flydodo:talents-updated', this.handleTalentsUpdated);
    gameEvents.removeEventListener(
      'flydodo:shop-objects-updated',
      this.handleShopObjectsUpdated,
    );
  }

  private createCosmeticDisplayObjects(): void {
    if (!this.textures.exists(COSMETIC_FALLBACK_TEXTURE_KEY)) {
      const graphics = this.add.graphics();
      graphics.fillStyle(0xffffff, 0);
      graphics.fillRect(0, 0, 2, 2);
      graphics.generateTexture(COSMETIC_FALLBACK_TEXTURE_KEY, 2, 2);
      graphics.destroy();
    }

    for (const category of COSMETIC_CATEGORIES) {
      const image = this.add
        .image(
          GAME_WIDTH / 2,
          START_Y,
          COSMETIC_FALLBACK_TEXTURE_KEY,
        )
        .setOrigin(0.5)
        .setVisible(false);

      const fallbackText = this.add
        .text(GAME_WIDTH / 2, START_Y, '', {
          fontFamily: 'Arial, sans-serif',
          fontSize: '40px',
          align: 'center',
        })
        .setOrigin(0.5)
        .setVisible(false);

      this.cosmeticImages.set(category, image);
      this.cosmeticFallbackTexts.set(category, fallbackText);
      this.cosmeticImageReady.set(
        this.getCosmeticPoseKey(category, 'ground'),
        false,
      );
      this.cosmeticImageReady.set(
        this.getCosmeticPoseKey(category, 'flight'),
        false,
      );
      this.cosmeticRequestVersions.set(category, 0);
    }
  }

  private async initializePlayerState(): Promise<void> {
    const profile = await loadLatestPlayerProfile();

    if (!this.scene.isActive()) {
      return;
    }

    this.controlStats = getControlTalentStats(profile.controlTalents);
    this.applyEnduranceStats(getEnduranceTalentStats(profile.enduranceTalents));
    this.applyBlueTalentStats(getBlueTalentStats(profile.blueTalents));
    this.applyShopObjectInventory(
      getLatestShopObjectInventory() ?? profile.shopObjects,
    );

    await Promise.all(
      COSMETIC_CATEGORIES.map((category) =>
        this.applyCosmetic(category, profile.equipped[category]),
      ),
    );

    if (this.scene.isActive()) {
      this.updateDodoVisuals(0);
    }
  }

  private configurePlayerHitbox(): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const scaleX = Math.max(Math.abs(this.player.scaleX), Number.EPSILON);
    const scaleY = Math.max(Math.abs(this.player.scaleY), Number.EPSILON);

    // Arcade Physics interprète setSize dans les pixels source, puis applique
    // l'échelle du sprite. Cette conversion conserve donc toujours une hitbox
    // réelle de 52 × 76 pixels, quelle que soit la pose ou le cosmétique.
    body.updateFromGameObject();
    body.setSize(
      DODO_HITBOX_WIDTH / scaleX,
      DODO_HITBOX_HEIGHT / scaleY,
      true,
    );
    body.updateFromGameObject();
  }

  private async initializeTalents(): Promise<void> {
    const profile = await loadLatestPlayerProfile();

    if (!this.scene.isActive()) {
      return;
    }

    this.controlStats = getControlTalentStats(profile.controlTalents);
    this.applyEnduranceStats(getEnduranceTalentStats(profile.enduranceTalents));
    this.applyBlueTalentStats(getBlueTalentStats(profile.blueTalents));
  }

  private async initializeShopObjects(): Promise<void> {
    const latestInventory = getLatestShopObjectInventory();

    if (latestInventory) {
      this.applyShopObjectInventory(latestInventory);
      return;
    }

    const profile = await loadLatestPlayerProfile();

    if (!this.scene.isActive()) {
      return;
    }

    this.applyShopObjectInventory(profile.shopObjects);
  }

  private applyBlueTalentStats(nextStats: BlueTalentStats): void {
    this.blueTalentStats = nextStats;

    if (nextStats.fruitDetector) {
      this.createFruitDetectorButton();
    } else {
      this.destroyFruitDetectorButton();
    }
  }

  private applyShopObjectInventory(nextInventory: ShopObjectInventory): void {
    this.shopObjectInventory = { ...nextInventory };
    this.refreshPlayerSurvivalStats();
  }

  private refreshPlayerSurvivalStats(): void {
    const previousMaxLives = this.playerMaxLives;
    const previousMaxShield = this.playerMaxShield;
    const nextMaxLives = this.enduranceStats.maxLives;
    const nextMaxShield = this.enduranceStats.maxShield;

    this.playerMaxLives = nextMaxLives;
    this.playerMaxShield = nextMaxShield;

    if (nextMaxLives > previousMaxLives && this.playerLives === previousMaxLives) {
      this.playerLives = this.playerMaxLives;
    } else {
      this.playerLives = Math.min(this.playerLives, this.playerMaxLives);
    }

    if (nextMaxShield > previousMaxShield && this.playerShield === previousMaxShield) {
      this.playerShield = this.playerMaxShield;
    } else {
      this.playerShield = Math.min(this.playerShield, this.playerMaxShield);
    }

    if (this.playerLives >= this.playerMaxLives || !this.enduranceStats.regeneration) {
      this.nextLifeRegenerationAt = null;
    } else if (this.nextLifeRegenerationAt === null) {
      this.nextLifeRegenerationAt =
        this.time.now + PLAYER_REGENERATION_DELAY_MS;
    }

    if (this.playerShield >= this.playerMaxShield || !this.enduranceStats.shieldRecharge) {
      this.nextShieldRechargeAt = null;
    } else if (this.nextShieldRechargeAt === null) {
      this.nextShieldRechargeAt =
        this.time.now + PLAYER_SHIELD_RECHARGE_DELAY_MS;
    }

    this.emitHud();
  }

  private applyEnduranceStats(nextStats: EnduranceTalentStats): void {
    this.enduranceStats = nextStats;
    this.refreshPlayerSurvivalStats();
  }

  private createTrimmedCosmeticCanvas(image: HTMLImageElement): HTMLCanvasElement {
    const sourceCanvas = document.createElement('canvas');
    sourceCanvas.width = image.naturalWidth;
    sourceCanvas.height = image.naturalHeight;

    const sourceContext = sourceCanvas.getContext('2d', {
      willReadFrequently: true,
    });

    if (!sourceContext) {
      return sourceCanvas;
    }

    sourceContext.drawImage(image, 0, 0);

    const { data, width, height } = sourceContext.getImageData(
      0,
      0,
      sourceCanvas.width,
      sourceCanvas.height,
    );
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const alpha = data[(y * width + x) * 4 + 3];

        if (alpha <= COSMETIC_TRIM_ALPHA_THRESHOLD) {
          continue;
        }

        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }

    if (maxX < minX || maxY < minY) {
      return sourceCanvas;
    }

    const trimmedCanvas = document.createElement('canvas');
    trimmedCanvas.width = maxX - minX + 1;
    trimmedCanvas.height = maxY - minY + 1;
    trimmedCanvas
      .getContext('2d')
      ?.drawImage(
        sourceCanvas,
        minX,
        minY,
        trimmedCanvas.width,
        trimmedCanvas.height,
        0,
        0,
        trimmedCanvas.width,
        trimmedCanvas.height,
      );

    return trimmedCanvas;
  }

  private getCosmeticPoseKey(
    category: CosmeticCategory,
    pose: CosmeticPose,
  ): string {
    return `${category}-${pose}`;
  }

  private async ensureCosmeticTexture(
    item: ShopItem,
    pose: CosmeticPose,
  ): Promise<boolean> {
    const textureKey = getShopItemTextureKey(item, pose);

    if (this.textures.exists(textureKey)) {
      return true;
    }

    const existingPromise = this.cosmeticLoadPromises.get(textureKey);

    if (existingPromise) {
      return existingPromise;
    }

    const loadPromise = new Promise<boolean>((resolve) => {
      const image = new Image();

      image.onload = (): void => {
        if (!this.textures.exists(textureKey)) {
          this.textures.addCanvas(
            textureKey,
            this.createTrimmedCosmeticCanvas(image),
          );
        }

        resolve(true);
      };

      image.onerror = (): void => {
        // Le PNG peut ne pas encore exister. L'équipement reste sauvegardé
        // et un emoji temporaire est affiché sans bloquer le jeu.
        resolve(false);
      };

      image.decoding = 'async';
      image.src = getShopItemImagePath(item, pose);
    });

    this.cosmeticLoadPromises.set(textureKey, loadPromise);
    return loadPromise;
  }

  private async applyCosmetic(
    category: CosmeticCategory,
    itemId: string | null,
  ): Promise<void> {
    this.equippedCosmeticIds[category] = itemId;

    const image = this.cosmeticImages.get(category);
    const fallbackText = this.cosmeticFallbackTexts.get(category);

    image?.setVisible(false);
    fallbackText?.setVisible(false);
    this.cosmeticImageReady.set(
      this.getCosmeticPoseKey(category, 'ground'),
      false,
    );
    this.cosmeticImageReady.set(
      this.getCosmeticPoseKey(category, 'flight'),
      false,
    );

    const requestVersion =
      (this.cosmeticRequestVersions.get(category) ?? 0) + 1;
    this.cosmeticRequestVersions.set(category, requestVersion);

    if (!itemId || !image || !fallbackText) {
      return;
    }

    const item = getShopItemById(itemId);

    if (!item || item.category !== category) {
      return;
    }

    const [groundImageLoaded, flightImageLoaded] = await Promise.all([
      this.ensureCosmeticTexture(item, 'ground'),
      this.ensureCosmeticTexture(item, 'flight'),
    ]);

    if (
      !this.scene.isActive() ||
      this.cosmeticRequestVersions.get(category) !== requestVersion ||
      this.equippedCosmeticIds[category] !== itemId
    ) {
      return;
    }

    this.cosmeticImageReady.set(
      this.getCosmeticPoseKey(category, 'ground'),
      groundImageLoaded,
    );
    this.cosmeticImageReady.set(
      this.getCosmeticPoseKey(category, 'flight'),
      flightImageLoaded,
    );

    if (groundImageLoaded || flightImageLoaded) {
      image.setVisible(true);
      fallbackText.setVisible(false);
    } else {
      image.setVisible(false);
      fallbackText
        .setText(item.icon)
        .setVisible(true);
    }

    if (this.gameOver) {
      image.setTint(0xff7777);
      fallbackText.setTint(0xff7777);
    } else {
      image.clearTint();
      fallbackText.clearTint();
    }

    this.updateDodoVisuals(0);
  }

  private handleCosmeticEquipped = (event: Event): void => {
    const { category, itemId } = (
      event as CustomEvent<CosmeticEquippedDetail>
    ).detail;

    void this.applyCosmetic(category, itemId);
  };

  private handleTalentsUpdated = (): void => {
    void this.initializeTalents();
  };

  private handleShopObjectsUpdated = (event: Event): void => {
    const detail = (event as CustomEvent<ShopObjectsUpdatedDetail>).detail;

    if (detail?.shopObjects) {
      this.applyShopObjectInventory(detail.shopObjects);
      return;
    }

    void this.initializeShopObjects();
  };

  private syncDodoVisualsBeforeRender = (_time: number, delta: number): void => {
    // Arcade Physics copies the body's final position to the Game Object during
    // POST_UPDATE. Following the player any earlier leaves the camera one frame
    // behind at high speed and creates a visible trailing / double-image effect.
    if (!this.gamePaused) {
      this.updateCamera(Math.min(delta / 1000, 0.034));
      this.updateStormCloudSounds();
    }

    this.updateZoneTransitionMarkers();
    this.updateAmbientClouds(Math.min(delta / 1000, 0.034));
    this.updateDodoVisuals(0);
  };

  private updateCosmeticVisuals(
    pose: CosmeticPose,
    placeSprite: (
      sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Text,
      localX: number,
      localY: number,
      localRotation?: number,
      offsetSpace?: CosmeticOffsetSpace,
    ) => void,
  ): void {
    for (const category of COSMETIC_CATEGORIES) {
      const itemId = this.equippedCosmeticIds[category];
      const image = this.cosmeticImages.get(category);
      const fallbackText = this.cosmeticFallbackTexts.get(category);

      if (!itemId || !image || !fallbackText) {
        image?.setVisible(false);
        fallbackText?.setVisible(false);
        continue;
      }

      const item = getShopItemById(itemId);

      if (!item) {
        image.setVisible(false);
        fallbackText.setVisible(false);
        continue;
      }

      const transform = getCosmeticTransform(item, pose);
      const localRotation = Phaser.Math.DegToRad(
        transform.rotationDegrees,
      );
      const poseImageReady = Boolean(
        this.cosmeticImageReady.get(this.getCosmeticPoseKey(category, pose)),
      );

      if (poseImageReady) {
        image
          .setTexture(getShopItemTextureKey(item, pose))
          .setOrigin(transform.originX, transform.originY)
          .setScale(transform.scaleX, transform.scaleY)
          .setDepth(transform.depth)
          .setVisible(true);

        fallbackText.setVisible(false);

        placeSprite(
          image,
          transform.offsetX,
          transform.offsetY,
          localRotation,
          transform.offsetSpace,
        );
      } else {
        image.setVisible(false);

        fallbackText
          .setFontSize(transform.fallbackFontSize)
          .setDepth(transform.depth)
          .setVisible(true);

        placeSprite(
          fallbackText,
          transform.offsetX,
          transform.offsetY,
          localRotation,
          transform.offsetSpace,
        );
      }
    }
  }

  private createFlightSounds(): void {
    this.flightSound = this.sound.add(
      FLIGHT_SOUND_KEY,
      {
        loop: true,
        volume: FLIGHT_SOUND_VOLUME * this.audioSettings.wings,
      },
    ) as Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound;
    this.skyWindSound = this.sound.add(SKY_WIND_SOUND_KEY, {
      loop: true,
      volume: 0,
    }) as Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound;
  }

  private applyAudioSettings(): void {
    this.flightSound?.setVolume(
      FLIGHT_SOUND_VOLUME * this.audioSettings.wings,
    );
    this.skyWindSound?.setVolume(
      this.skyWindBaseVolume * this.audioSettings.wind,
    );
  }

  private startFlightSound(): void {
    if (this.flightSound && !this.flightSound.isPlaying) {
      this.flightSound.play();
    }

  }

  private playFlapSound(): void {
    /*
     * Phaser crée une nouvelle instance temporaire à chaque appel.
     * Le son déjà en cours continue donc de jouer pendant que le nouveau démarre.
     */
    this.sound.play(FLAP_SOUND_KEY, {
      volume: FLAP_SOUND_VOLUME * this.audioSettings.wings,
    });
  }

  private stopFlightSounds(): void {
    if (this.flightSound?.isPlaying) {
      this.flightSound.stop();
    }
    if (this.skyWindSound?.isPlaying) {
      this.skyWindSound.stop();
    }

    // Coupe toutes les copies de 1Flap éventuellement encore en cours.
    this.sound.stopByKey(FLAP_SOUND_KEY);
  }

  private destroyFlightSounds(): void {
    this.stopFlightSounds();
    this.flightSound?.destroy();
    this.flightSound = undefined;
    this.skyWindSound?.destroy();
    this.skyWindSound = undefined;
  }

  private resetRuntimeState(): void {
    this.gameOver = false;
    this.deathReason = null;
    this.gamePaused = false;
    this.outOfScreenSince = null;
    this.lastWarningSecond = null;
    this.lastWarningReason = null;
    this.currentAltitude = 0;
    this.currentSpeed = 0;
    this.recordToBeat = 0;
    this.bestScoreReady = false;
    this.newRecordCelebrated = false;
    this.zoneTransitionMarkers = [];
    this.ambientClouds = [];
    this.skyWindStreaks = [];
    this.skyWindForce = 0;
    this.skyWindTargetForce = 0;
    this.skyWindNextChangeAt = 0;
    this.skyWindConsecutiveActivePhases = 0;
    this.skyWindSpawnAccumulator = 0;
    this.skyWindBaseVolume = 0;
    this.watermelons = 0;
    this.playerMaxLives = PLAYER_BASE_LIVES;
    this.playerLives = PLAYER_BASE_LIVES;
    this.playerMaxShield = PLAYER_BASE_SHIELD;
    this.playerShield = PLAYER_BASE_SHIELD;
    this.enduranceStats = {
      maxLives: PLAYER_BASE_LIVES,
      maxShield: PLAYER_BASE_SHIELD,
      mosquitoShield: false,
      regeneration: false,
      shieldRecharge: false,
      phoenix: false,
    };
    this.blueTalentStats = {
      watermelonMagnetLevel: 0,
      watermelonBonus: 0,
      branchPerch: false,
      fruitDetector: false,
      chainReaction: false,
      powerTakeoff: false,
      feast: false,
    };
    this.shopObjectInventory = createEmptyShopObjectInventory();
    this.watermelonCollectStreak = 0;
    this.fruitDetectorActive = false;
    this.perchedBranch = null;
    this.perchTargetX = null;
    this.isPerchSettling = false;
    this.perchCollisionGraceBranch = null;
    this.perchCollisionGraceUntil = 0;
    this.pendingPowerTakeoff = false;
    this.fruitDetectorArrow?.clear();
    this.lastPlayerDamageTime = Number.NEGATIVE_INFINITY;
    this.nextLifeRegenerationAt = null;
    this.nextShieldRechargeAt = null;
    this.hasUsedPhoenix = false;
    this.hasUsedRewardedRevive = false;
    this.hasEmittedMovementStarted = false;
    this.maxAltitudeSinceTakeoff = 0;
    this.isGrounded = true;
    this.lastHudSnapshot = null;
    this.lastDodoPose = null;
    this.heldPointerSides.clear();
    this.angularVelocity = 0;
    this.leftWingPhase = 0;
    this.rightWingPhase = 0;
    this.leftWingBoostTime = 0;
    this.rightWingBoostTime = 0;
    this.lastAcceptedFlapTime = Number.NEGATIVE_INFINITY;
    this.idleFlightState = 'active';
    this.idleFlightPanicStartedAt = 0;
    this.legAnimationTime = 0;
    this.featherParticles = [];
    this.windStreaks = [];
    this.windStreakSpawnAccumulator = 0;
    this.mosquitoCircleMotions = [];
    this.pterodactylPatrols = [];
    this.satelliteDriftMotions = [];
    this.asteroidPassageMotions = [];
    this.lightningFlashMotions = [];
    this.stormCloudObstacles = [];
    this.lavaTopY = LAVA_START_Y;
    this.runStartTime = 0;
  }

  private createDodoJuicePools(): void {
    for (let index = 0; index < FEATHER_POOL_SIZE; index += 1) {
      const texture = FEATHER_TEXTURES[index % FEATHER_TEXTURES.length];
      const image = this.add
        .image(0, 0, texture.key)
        .setOrigin(0.5)
        .setDepth(12)
        .setVisible(false);

      this.featherParticles.push({
        image,
        velocityX: 0,
        velocityY: 0,
        angularVelocity: 0,
        age: 0,
        lifetime: 0,
        baseScale: texture.scale,
        swayPhase: 0,
        swaySpeed: 0,
      });
    }

    for (let index = 0; index < WIND_STREAK_POOL_SIZE; index += 1) {
      const rectangle = this.add
        .rectangle(0, 0, 2, 18, 0xe8fbff, 0)
        .setDepth(7)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setVisible(false);

      this.windStreaks.push({
        rectangle,
        velocityX: 0,
        velocityY: 0,
        age: 0,
        lifetime: 0,
        maxAlpha: 0,
      });
    }
  }

  private createSkyWindPool(): void {
    this.createSkyWindTexture();

    for (let index = 0; index < SKY_WIND_STREAK_POOL_SIZE; index += 1) {
      const image = this.add
        .image(0, 0, SKY_WIND_TEXTURE_KEY)
        .setOrigin(0.5)
        .setDepth(index % 3 === 0 ? 12 : 7)
        .setScrollFactor(0)
        .setVisible(false);

      this.skyWindStreaks.push({
        image,
        velocityX: 0,
        age: 0,
        lifetime: 0,
        maxAlpha: 0,
        wobblePhase: 0,
        wobbleSpeed: 0,
      });
    }
  }

  private createSkyWindTexture(): void {
    if (this.textures.exists(SKY_WIND_TEXTURE_KEY)) {
      return;
    }

    const texture = this.textures.createCanvas(
      SKY_WIND_TEXTURE_KEY,
      240,
      52,
    );

    if (!texture) {
      return;
    }

    const context = texture.getContext();
    const gradient = context.createLinearGradient(0, 0, 240, 0);
    gradient.addColorStop(0, 'rgba(225, 248, 255, 0)');
    gradient.addColorStop(0.18, 'rgba(235, 251, 255, 0.9)');
    gradient.addColorStop(0.76, 'rgba(245, 253, 255, 1)');
    gradient.addColorStop(1, 'rgba(225, 248, 255, 0)');
    context.clearRect(0, 0, 240, 52);
    context.strokeStyle = gradient;
    context.lineCap = 'round';
    context.shadowColor = 'rgba(190, 235, 248, 0.65)';
    context.shadowBlur = 5;

    const windLines = [
      { y: 12, width: 3.1, bend: -5 },
      { y: 27, width: 3.8, bend: 6 },
      { y: 41, width: 2.6, bend: -4 },
    ];

    for (const line of windLines) {
      context.beginPath();
      context.lineWidth = line.width;
      context.moveTo(8, line.y);
      context.bezierCurveTo(
        72,
        line.y + line.bend,
        160,
        line.y - line.bend,
        232,
        line.y,
      );
      context.stroke();
    }

    texture.refresh();
  }

  private updateSkyWind(deltaSeconds: number): void {
    const fadeIn = Phaser.Math.Clamp(
      (this.currentAltitude - SKY_WIND_MIN_ALTITUDE) / 80,
      0,
      1,
    );
    const fadeOut = Phaser.Math.Clamp(
      (SKY_WIND_MAX_ALTITUDE - this.currentAltitude) / 100,
      0,
      1,
    );
    const zoneStrength = Math.min(fadeIn, fadeOut);

    if (zoneStrength <= 0) {
      this.skyWindTargetForce = 0;
      this.skyWindNextChangeAt = 0;
      this.skyWindConsecutiveActivePhases = 0;
    } else if (
      this.skyWindNextChangeAt === 0 ||
      this.time.now >= this.skyWindNextChangeAt
    ) {
      this.scheduleNextSkyWind();
    }

    const targetForce = this.skyWindTargetForce * zoneStrength;
    const responseSpeed = targetForce === 0 ? 1.2 : 0.82;
    const smoothing = 1 - Math.exp(-responseSpeed * deltaSeconds);
    this.skyWindForce = Phaser.Math.Linear(
      this.skyWindForce,
      targetForce,
      smoothing,
    );
    this.updateSkyWindSound();

    if (!this.isGrounded && zoneStrength > 0) {
      const body = this.player.body as Phaser.Physics.Arcade.Body;
      body.velocity.x += this.skyWindForce * deltaSeconds;
    }

    const gustStrength = Phaser.Math.Clamp(
      Math.abs(this.skyWindForce) / SKY_WIND_MAX_FORCE,
      0,
      1,
    );
    this.skyWindSpawnAccumulator +=
      deltaSeconds * zoneStrength * (3 + gustStrength * 11);

    while (this.skyWindSpawnAccumulator >= 1) {
      this.skyWindSpawnAccumulator -= 1;
      this.spawnSkyWindStreak(gustStrength);
    }

    for (const streak of this.skyWindStreaks) {
      if (!streak.image.visible) {
        continue;
      }

      streak.age += deltaSeconds;

      if (streak.age >= streak.lifetime) {
        streak.image.setVisible(false);
        continue;
      }

      const progress = streak.age / streak.lifetime;
      streak.wobblePhase += streak.wobbleSpeed * deltaSeconds;
      streak.image.x += streak.velocityX * deltaSeconds;
      streak.image.y +=
        Math.sin(streak.wobblePhase) * 4.5 * deltaSeconds;
      streak.image.setAlpha(
        Math.sin(progress * Math.PI) *
          streak.maxAlpha *
          Math.max(0.25, zoneStrength),
      );
    }
  }

  private scheduleNextSkyWind(): void {
    const roll = Phaser.Math.Between(0, 99);
    const levelIndex =
      this.skyWindConsecutiveActivePhases >= 2 || roll < 30
        ? 0
        : roll < 62
          ? 1
          : roll < 87
            ? 2
            : 3;
    const level = SKY_WIND_LEVELS[levelIndex];
    const direction = level.force === 0 ? 0 : Phaser.Math.RND.sign();

    this.skyWindConsecutiveActivePhases =
      level.force === 0
        ? 0
        : this.skyWindConsecutiveActivePhases + 1;
    this.skyWindTargetForce = level.force * direction;
    this.skyWindNextChangeAt =
      this.time.now +
      Phaser.Math.Between(level.durationMinMs, level.durationMaxMs);
  }

  private updateSkyWindSound(): void {
    if (!this.skyWindSound) {
      return;
    }

    const volumeProgress = Phaser.Math.Clamp(
      (Math.abs(this.skyWindForce) - SKY_WIND_SOUND_START_FORCE) /
        (SKY_WIND_MAX_FORCE - SKY_WIND_SOUND_START_FORCE),
      0,
      1,
    );
    const volume = volumeProgress * SKY_WIND_SOUND_MAX_VOLUME;
    this.skyWindBaseVolume = volume;

    if (volume > 0.01) {
      if (!this.skyWindSound.isPlaying) {
        this.skyWindSound.play();
      }
      this.skyWindSound.setVolume(volume * this.audioSettings.wind);
    } else if (this.skyWindSound.isPlaying) {
      this.skyWindSound.stop();
    }
  }

  private spawnSkyWindStreak(gustStrength: number): void {
    const streak = this.skyWindStreaks.find(
      ({ image }) => !image.visible,
    );

    if (!streak) {
      return;
    }

    const direction = this.skyWindForce >= 0 ? 1 : -1;
    const speed =
      Phaser.Math.FloatBetween(135, 215) * (0.75 + gustStrength * 0.55);
    streak.age = 0;
    streak.lifetime =
      (GAME_WIDTH + 360) / Math.max(1, speed);
    streak.velocityX = speed * direction;
    streak.maxAlpha = Phaser.Math.FloatBetween(0.44, 0.72);
    streak.wobblePhase = Phaser.Math.FloatBetween(0, Math.PI * 2);
    streak.wobbleSpeed = Phaser.Math.FloatBetween(1.1, 2.1);

    streak.image
      .setPosition(
        direction > 0 ? -150 : GAME_WIDTH + 150,
        Phaser.Math.Between(95, GAME_HEIGHT - 85),
      )
      .setFlipX(direction < 0)
      .setScale(
        Phaser.Math.FloatBetween(0.72, 1.22),
        Phaser.Math.FloatBetween(0.7, 1.1),
      )
      .setAlpha(0)
      .setVisible(true);
  }

  private updateDodoJuice(deltaSeconds: number): void {
    this.updateDodoJuiceParticles(deltaSeconds);

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const ascentRatio = this.isGrounded
      ? 0
      : Phaser.Math.Clamp((-body.velocity.y - 20) / 180, 0, 1);

    this.updateWindStreakEmission(ascentRatio, deltaSeconds);
  }

  private updateWindStreakEmission(
    ascentRatio: number,
    deltaSeconds: number,
  ): void {
    if (ascentRatio <= 0) {
      this.windStreakSpawnAccumulator = 0;
      return;
    }

    this.windStreakSpawnAccumulator +=
      deltaSeconds * (4 + ascentRatio * 16);

    while (this.windStreakSpawnAccumulator >= 1) {
      this.windStreakSpawnAccumulator -= 1;
      this.spawnWindStreak();
    }
  }

  private spawnWindStreak(): void {
    const streak = this.windStreaks.find(
      ({ rectangle }) => !rectangle.visible,
    );

    if (!streak) {
      return;
    }

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    streak.age = 0;
    streak.lifetime = Phaser.Math.FloatBetween(0.38, 0.62);
    streak.maxAlpha = Phaser.Math.FloatBetween(0.12, 0.28);
    streak.velocityX =
      body.velocity.x * 0.08 + Phaser.Math.Between(-18, 18);
    streak.velocityY =
      body.velocity.y * 0.08 + Phaser.Math.Between(95, 165);

    streak.rectangle
      .setPosition(
        this.player.x + Phaser.Math.Between(-58, 58),
        this.player.y + Phaser.Math.Between(32, 92),
      )
      .setRotation(
        this.player.rotation + Phaser.Math.FloatBetween(-0.14, 0.14),
      )
      .setScale(
        Phaser.Math.FloatBetween(0.55, 1.15),
        Phaser.Math.FloatBetween(0.65, 1.3),
      )
      .setAlpha(0)
      .setVisible(true);
  }

  private spawnFeatherBurst(direction: number, count: number): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const cosine = Math.cos(this.player.rotation);
    const sine = Math.sin(this.player.rotation);

    for (let index = 0; index < count; index += 1) {
      const feather = this.featherParticles.find(({ image }) => !image.visible);

      if (!feather) {
        return;
      }

      const wingSide =
        direction === 1
          ? -1
          : direction === -1
            ? 1
            : Phaser.Math.RND.sign();
      const localX = wingSide * Phaser.Math.Between(24, 34);
      const localY = Phaser.Math.Between(-30, -14);
      const spawnX =
        this.player.x + localX * cosine - localY * sine;
      const spawnY =
        this.player.y + localX * sine + localY * cosine;

      feather.age = 0;
      feather.lifetime = Phaser.Math.FloatBetween(0.75, 1.25);
      feather.velocityX =
        body.velocity.x * 0.18 +
        wingSide * Phaser.Math.Between(18, 44) +
        Phaser.Math.Between(-16, 16);
      feather.velocityY =
        body.velocity.y * 0.14 + Phaser.Math.Between(24, 64);
      feather.angularVelocity = Phaser.Math.FloatBetween(-4.5, 4.5);
      feather.swayPhase = Phaser.Math.FloatBetween(0, Math.PI * 2);
      feather.swaySpeed = Phaser.Math.FloatBetween(5, 9);

      feather.image
        .setPosition(spawnX, spawnY)
        .setRotation(Phaser.Math.FloatBetween(-Math.PI, Math.PI))
        .setScale(
          feather.baseScale * Phaser.Math.FloatBetween(0.78, 1.12),
        )
        .setAlpha(Phaser.Math.FloatBetween(0.78, 1))
        .setVisible(true);
    }
  }

  private updateDodoJuiceParticles(deltaSeconds: number): void {
    for (const feather of this.featherParticles) {
      if (!feather.image.visible) {
        continue;
      }

      feather.age += deltaSeconds;

      if (feather.age >= feather.lifetime) {
        feather.image.setVisible(false);
        continue;
      }

      const progress = feather.age / feather.lifetime;
      feather.swayPhase += feather.swaySpeed * deltaSeconds;
      feather.velocityX *= Math.exp(-1.1 * deltaSeconds);
      feather.velocityY += 38 * deltaSeconds;
      feather.image.x +=
        (feather.velocityX + Math.sin(feather.swayPhase) * 18) *
        deltaSeconds;
      feather.image.y += feather.velocityY * deltaSeconds;
      feather.image.rotation += feather.angularVelocity * deltaSeconds;
      feather.image.setAlpha(
        progress < 0.58 ? 1 : 1 - (progress - 0.58) / 0.42,
      );
    }

    for (const streak of this.windStreaks) {
      if (!streak.rectangle.visible) {
        continue;
      }

      streak.age += deltaSeconds;

      if (streak.age >= streak.lifetime) {
        streak.rectangle.setVisible(false);
        continue;
      }

      const progress = streak.age / streak.lifetime;
      streak.rectangle.x += streak.velocityX * deltaSeconds;
      streak.rectangle.y += streak.velocityY * deltaSeconds;
      streak.rectangle.setAlpha(
        Math.sin(progress * Math.PI) * streak.maxAlpha,
      );
    }

  }

  private async initializeBestScore(): Promise<void> {
    const savedBestAltitude = await loadBestAltitude();
    this.recordToBeat = savedBestAltitude;
    this.bestAltitude = Math.max(savedBestAltitude, this.currentAltitude);
    this.bestScoreReady = true;
    this.updateGroundRecordText();
    if (this.currentAltitude > this.recordToBeat) {
      this.playNewRecordCelebration();
    }
    this.emitHud();
  }

  private createNewRecordLeafTexture(): void {
    if (this.textures.exists(NEW_RECORD_LEAF_TEXTURE_KEY)) {
      return;
    }

    const graphics = this.make.graphics({ x: 0, y: 0 });
    graphics.fillStyle(0xffffff, 1);
    graphics.fillEllipse(9, 6, 16, 9);
    graphics.lineStyle(1.5, 0x6f8a2b, 0.9);
    graphics.lineBetween(2, 8, 16, 4);
    graphics.generateTexture(NEW_RECORD_LEAF_TEXTURE_KEY, 18, 12);
    graphics.destroy();
  }

  private createPlaceholderTextures(): void {
    if (this.textures.exists('dodo-pose-flight')) {
      return;
    }

    const graphics = this.make.graphics({ x: 0, y: 0 });

    // Corps vu de face.
    graphics.fillStyle(0x6f472d, 1);
    graphics.fillEllipse(38, 59, 43, 55);
    graphics.fillStyle(0x8f5d38, 1);
    graphics.fillCircle(38, 26, 24);
    graphics.fillStyle(0xf2dfbf, 1);
    graphics.fillEllipse(38, 62, 24, 35);

    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(29, 22, 7);
    graphics.fillCircle(47, 22, 7);
    graphics.fillStyle(0x151515, 1);
    graphics.fillCircle(30, 23, 3);
    graphics.fillCircle(46, 23, 3);

    graphics.fillStyle(0xf0c74a, 1);
    graphics.fillTriangle(30, 32, 46, 32, 38, 44);
    graphics.fillRect(26, 84, 8, 3);
    graphics.fillRect(42, 84, 8, 3);
    graphics.generateTexture('dodo-body-front', 76, 90);
    graphics.clear();

    // Aile gauche, attachée par son bord droit.
    graphics.fillStyle(0x5d3925, 1);
    graphics.fillTriangle(40, 7, 40, 30, 4, 20);
    graphics.fillStyle(0x7f5030, 1);
    graphics.fillTriangle(38, 11, 38, 27, 10, 19);
    graphics.generateTexture('dodo-wing-left', 42, 36);
    graphics.clear();

    // Aile droite, attachée par son bord gauche.
    graphics.fillStyle(0x5d3925, 1);
    graphics.fillTriangle(2, 7, 2, 30, 38, 20);
    graphics.fillStyle(0x7f5030, 1);
    graphics.fillTriangle(4, 11, 4, 27, 32, 19);
    graphics.generateTexture('dodo-wing-right', 42, 36);
    graphics.destroy();
  }

  private createObstaclePlaceholderTextures(): void {
    for (const obstacleKind of OBSTACLE_KINDS) {
      if (this.textures.exists(obstacleKind.textureKey)) {
        continue;
      }

      if (obstacleKind.sourceTextureKey) {
        const sourceImage = this.textures
          .get(obstacleKind.sourceTextureKey)
          .getSourceImage() as HTMLImageElement;

        this.textures.addCanvas(
          obstacleKind.textureKey,
          this.createTrimmedCosmeticCanvas(sourceImage),
        );
        continue;
      }

      const graphics = this.make.graphics({ x: 0, y: 0 });
      graphics.fillStyle(obstacleKind.fillColor, 1);
      graphics.fillRect(0, 0, obstacleKind.width, obstacleKind.height);
      graphics.lineStyle(3, obstacleKind.strokeColor, 1);
      graphics.strokeRect(1.5, 1.5, obstacleKind.width - 3, obstacleKind.height - 3);
      graphics.generateTexture(
        obstacleKind.textureKey,
        obstacleKind.width,
        obstacleKind.height,
      );
      graphics.destroy();
    }
  }

  private createObstacleAnimations(): void {
    if (!this.anims.exists(FOREST_MOSQUITO_ANIMATION_KEY)) {
      this.anims.create({
        key: FOREST_MOSQUITO_ANIMATION_KEY,
        frames: Array.from({ length: FOREST_MOSQUITO_FRAME_COUNT }, (_value, index) => {
          const paddedIndex = (index + 1).toString().padStart(2, '0');
          return {
            key: `${FOREST_MOSQUITO_TEXTURE_PREFIX}-${paddedIndex}`,
          };
        }),
        frameRate: 18,
        repeat: -1,
      });
    }

    if (!this.anims.exists(PTERODACTYL_ANIMATION_KEY)) {
      this.anims.create({
        key: PTERODACTYL_ANIMATION_KEY,
        frames: Array.from({ length: PTERODACTYL_FRAME_COUNT }, (_value, index) => {
          const paddedIndex = index.toString().padStart(3, '0');
          return {
            key: `${PTERODACTYL_TEXTURE_PREFIX}-${paddedIndex}`,
          };
        }),
        frameRate: 14,
        repeat: -1,
      });
    }

    if (!this.anims.exists(STORM_CLOUD_ANIMATION_KEY)) {
      this.anims.create({
        key: STORM_CLOUD_ANIMATION_KEY,
        frames: Array.from({ length: STORM_CLOUD_FRAME_COUNT }, (_value, index) => {
          const paddedIndex = index.toString().padStart(3, '0');
          return {
            key: `${STORM_CLOUD_TEXTURE_PREFIX}-${paddedIndex}`,
          };
        }),
        frameRate: 10,
        repeat: -1,
      });
    }

    if (!this.anims.exists(LIGHTNING_ANIMATION_KEY)) {
      this.anims.create({
        key: LIGHTNING_ANIMATION_KEY,
        frames: Array.from({ length: LIGHTNING_FRAME_COUNT }, (_value, index) => {
          const paddedIndex = index.toString().padStart(3, '0');
          return {
            key: `${LIGHTNING_TEXTURE_PREFIX}-${paddedIndex}`,
          };
        }),
        frameRate: 34,
        repeat: 0,
      });
    }

    if (!this.anims.exists(LAVA_ANIMATION_KEY)) {
      this.anims.create({
        key: LAVA_ANIMATION_KEY,
        frames: Array.from({ length: LAVA_FRAME_COUNT }, (_value, index) => {
          const paddedIndex = index.toString().padStart(3, '0');
          return {
            key: `${LAVA_TEXTURE_PREFIX}-${paddedIndex}`,
          };
        }),
        frameRate: LAVA_FRAME_RATE,
        repeat: -1,
      });
    }

    if (!this.anims.exists(DODO_LAVA_DEATH_ANIMATION_KEY)) {
      this.anims.create({
        key: DODO_LAVA_DEATH_ANIMATION_KEY,
        frames: DODO_LAVA_DEATH_FRAME_INDICES.map((frameIndex) => ({
          key: `${DODO_LAVA_DEATH_TEXTURE_PREFIX}-${frameIndex
            .toString()
            .padStart(3, '0')}`,
        })),
        frameRate: DODO_LAVA_DEATH_FRAME_RATE,
        repeat: 0,
      });
    }
  }

  private createSkyDecor(): void {
    this.createSkyBackground();
  }

  private createZoneTransitionMarkers(): void {
    this.createZoneTransitionCloudTexture();

    const initialCameraScrollY =
      START_Y - GAME_HEIGHT * PLAYER_SCREEN_Y_RATIO;
    const screenCenterY = GAME_HEIGHT * ZONE_TRANSITION_SCREEN_Y_RATIO;
    const maxDisplayWidth = GAME_WIDTH * 0.92;

    for (const transition of ZONE_TRANSITIONS) {
      const cameraScrollYAtTransition =
        initialCameraScrollY - transition.altitude * 10;
      const worldY =
        screenCenterY +
        cameraScrollYAtTransition * ZONE_TRANSITION_SCROLL_FACTOR;
      const image = this.add
        .image(GAME_WIDTH / 2, worldY, transition.textureKey)
        .setOrigin(0.5)
        .setDepth(ZONE_TRANSITION_DEPTH)
        .setScrollFactor(ZONE_TRANSITION_SCROLL_FACTOR)
        .setAlpha(0)
        .setVisible(false);
      const scale = maxDisplayWidth / image.width;

      image.setScale(scale);
      this.zoneTransitionMarkers.push({
        altitude: transition.altitude,
        image,
        dispersed: false,
        revealStartedAt: null,
      });
    }
  }

  private createZoneTransitionCloudTexture(): void {
    if (this.textures.exists(ZONE_TRANSITION_CLOUD_TEXTURE_KEY)) {
      return;
    }

    const texture = this.textures.createCanvas(
      ZONE_TRANSITION_CLOUD_TEXTURE_KEY,
      72,
      58,
    );

    if (!texture) {
      return;
    }

    const context = texture.getContext();
    const cloudBlobs = [
      { x: 21, y: 34, radius: 19 },
      { x: 37, y: 23, radius: 23 },
      { x: 54, y: 35, radius: 18 },
      { x: 38, y: 39, radius: 20 },
    ];

    context.clearRect(0, 0, 72, 58);

    for (const blob of cloudBlobs) {
      const gradient = context.createRadialGradient(
        blob.x,
        blob.y,
        blob.radius * 0.12,
        blob.x,
        blob.y,
        blob.radius,
      );
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.96)');
      gradient.addColorStop(0.58, 'rgba(238, 248, 255, 0.72)');
      gradient.addColorStop(1, 'rgba(222, 241, 250, 0)');
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(blob.x, blob.y, blob.radius, 0, Math.PI * 2);
      context.fill();
    }

    texture.refresh();
  }

  private createAmbientClouds(): void {
    this.createAmbientCloudTextures();

    const initialCameraScrollY =
      START_Y - GAME_HEIGHT * PLAYER_SCREEN_Y_RATIO;
    for (let index = 0; index < AMBIENT_CLOUD_COUNT; index += 1) {
      const plane =
        AMBIENT_CLOUD_PLANES[
          Phaser.Math.Between(0, AMBIENT_CLOUD_PLANES.length - 1)
        ];
      const texture =
        AMBIENT_CLOUD_TEXTURES[
          Phaser.Math.Between(0, AMBIENT_CLOUD_TEXTURES.length - 1)
        ];
      const isFirstCloudLayer = index < AMBIENT_CLOUD_FIRST_LAYER_COUNT;
      const layerIndex = isFirstCloudLayer
        ? index
        : index - AMBIENT_CLOUD_FIRST_LAYER_COUNT;
      const layerCount = isFirstCloudLayer
        ? AMBIENT_CLOUD_FIRST_LAYER_COUNT
        : AMBIENT_CLOUD_COUNT - AMBIENT_CLOUD_FIRST_LAYER_COUNT;
      const altitudeMin = isFirstCloudLayer
        ? AMBIENT_CLOUD_MIN_ALTITUDE
        : AMBIENT_CLOUD_LAYER_ALTITUDE;
      const altitudeMax = isFirstCloudLayer
        ? AMBIENT_CLOUD_LAYER_ALTITUDE
        : AMBIENT_CLOUD_MAX_ALTITUDE;
      const altitudeProgress =
        layerCount <= 1 ? 0 : layerIndex / (layerCount - 1);
      const altitude = Phaser.Math.Clamp(
        altitudeMin +
          (altitudeMax - altitudeMin) * altitudeProgress +
          Phaser.Math.Between(-28, 28),
        altitudeMin,
        altitudeMax,
      );
      const cameraScrollYAtAltitude =
        initialCameraScrollY - altitude * 10;
      const targetScreenY = Phaser.Math.Between(
        -60,
        GAME_HEIGHT + 60,
      );
      const worldY =
        targetScreenY +
        cameraScrollYAtAltitude * plane.scrollFactor;
      const desiredWidth = Phaser.Math.Between(
        plane.widthMin,
        plane.widthMax,
      );
      const isStormLayer =
        altitude >= AMBIENT_CLOUD_STORM_MIN_ALTITUDE &&
        altitude <= AMBIENT_CLOUD_STORM_MAX_ALTITUDE;
      const availableTints = isStormLayer
        ? AMBIENT_CLOUD_TINTS.slice(2)
        : AMBIENT_CLOUD_TINTS;
      const image = this.add
        .image(
          Phaser.Math.Between(-45, GAME_WIDTH + 45),
          worldY,
          texture.textureKey,
        )
        .setOrigin(0.5)
        .setDepth(plane.depth)
        .setScrollFactor(plane.scrollFactor)
        .setAlpha(0)
        .setTint(
          availableTints[
            Phaser.Math.Between(0, availableTints.length - 1)
          ],
        );
      const scale = desiredWidth / image.width;

      image.setScale(
        Phaser.Math.RND.sign() * scale,
        scale * Phaser.Math.FloatBetween(0.88, 1.08),
      );

      this.ambientClouds.push({
        image,
        velocityX:
          Phaser.Math.RND.sign() * Phaser.Math.FloatBetween(1.4, 4.8),
        baseAlpha: Phaser.Math.FloatBetween(
          plane.alphaMin,
          plane.alphaMax,
        ),
        evaporatesOnContact: plane.evaporatesOnContact,
        evaporated: false,
      });
    }
  }

  private createAmbientCloudTextures(): void {
    for (const cloudTexture of AMBIENT_CLOUD_TEXTURES) {
      if (this.textures.exists(cloudTexture.textureKey)) {
        continue;
      }

      const sourceImage = this.textures
        .get(cloudTexture.sourceKey)
        .getSourceImage() as CanvasImageSource;
      const canvas = document.createElement('canvas');
      canvas.width = cloudTexture.crop.width;
      canvas.height = cloudTexture.crop.height;
      const context = canvas.getContext('2d');

      context?.drawImage(
        sourceImage,
        cloudTexture.crop.x,
        cloudTexture.crop.y,
        cloudTexture.crop.width,
        cloudTexture.crop.height,
        0,
        0,
        canvas.width,
        canvas.height,
      );
      this.textures.addCanvas(cloudTexture.textureKey, canvas);
    }
  }

  private updateAmbientClouds(deltaSeconds: number): void {
    const camera = this.cameras.main;
    const playerScreenX = this.player.x - camera.scrollX;
    const playerScreenY = this.player.y - camera.scrollY;
    const fadeIn = Phaser.Math.Clamp(
      (this.currentAltitude - AMBIENT_CLOUD_MIN_ALTITUDE) / 50,
      0,
      1,
    );
    const fadeOut = Phaser.Math.Clamp(
      (AMBIENT_CLOUD_MAX_ALTITUDE - this.currentAltitude) / 50,
      0,
      1,
    );
    const altitudeAlpha = Math.min(fadeIn, fadeOut);

    for (const cloud of this.ambientClouds) {
      if (cloud.evaporated) {
        continue;
      }

      const { image } = cloud;
      const horizontalMargin = image.displayWidth * 0.55;
      image.x += cloud.velocityX * deltaSeconds;

      if (image.x < -horizontalMargin) {
        image.x = GAME_WIDTH + horizontalMargin;
      } else if (image.x > GAME_WIDTH + horizontalMargin) {
        image.x = -horizontalMargin;
      }

      const screenX =
        image.x - camera.scrollX * image.scrollFactorX;
      const screenY =
        image.y - camera.scrollY * image.scrollFactorY;
      const isNearViewport =
        screenY > -image.displayHeight &&
        screenY < GAME_HEIGHT + image.displayHeight;
      const alpha = cloud.baseAlpha * altitudeAlpha;

      image
        .setAlpha(alpha)
        .setVisible(isNearViewport && alpha > 0.01);

      if (
        !cloud.evaporatesOnContact ||
        alpha < 0.45 ||
        !isNearViewport
      ) {
        continue;
      }

      const overlapsDodo =
        Math.abs(playerScreenX - screenX) <
          image.displayWidth * 0.42 + this.player.displayWidth * 0.18 &&
        Math.abs(playerScreenY - screenY) <
          image.displayHeight * 0.34 + this.player.displayHeight * 0.22;

      if (overlapsDodo) {
        this.evaporateAmbientCloud(cloud, screenX, screenY);
      }
    }
  }

  private evaporateAmbientCloud(
    cloud: AmbientCloud,
    screenX: number,
    screenY: number,
  ): void {
    cloud.evaporated = true;
    const { image } = cloud;

    this.tweens.add({
      targets: image,
      alpha: 0,
      scaleX: image.scaleX * 1.08,
      scaleY: image.scaleY * 1.14,
      duration: 320,
      ease: 'Cubic.easeOut',
      onComplete: () => image.setVisible(false),
    });

    for (let index = 0; index < 16; index += 1) {
      const angle =
        (index / 16) * Math.PI * 2 +
        Phaser.Math.FloatBetween(-0.35, 0.35);
      const startX =
        screenX +
        Phaser.Math.FloatBetween(
          -image.displayWidth * 0.32,
          image.displayWidth * 0.32,
        );
      const startY =
        screenY +
        Phaser.Math.FloatBetween(
          -image.displayHeight * 0.25,
          image.displayHeight * 0.25,
        );
      const distance = Phaser.Math.FloatBetween(35, 85);
      const puff = this.add
        .image(startX, startY, ZONE_TRANSITION_CLOUD_TEXTURE_KEY)
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(image.depth + 1)
        .setScale(Phaser.Math.FloatBetween(0.18, 0.42))
        .setAlpha(Phaser.Math.FloatBetween(0.5, 0.82));

      this.tweens.add({
        targets: puff,
        x: startX + Math.cos(angle) * distance,
        y:
          startY +
          Math.sin(angle) * distance -
          Phaser.Math.FloatBetween(14, 42),
        alpha: 0,
        scale: Phaser.Math.FloatBetween(0.7, 1.18),
        delay: Phaser.Math.Between(0, 90),
        duration: Phaser.Math.Between(520, 780),
        ease: 'Cubic.easeOut',
        onComplete: () => puff.destroy(),
      });
    }
  }

  private updateZoneTransitionMarkers(): void {
    const camera = this.cameras.main;
    const playerScreenX = this.player.x - camera.scrollX;
    const playerScreenY = this.player.y - camera.scrollY;

    for (const marker of this.zoneTransitionMarkers) {
      if (marker.dispersed) {
        continue;
      }

      if (marker.revealStartedAt === null) {
        if (this.currentAltitude < marker.altitude) {
          marker.image.setAlpha(0).setVisible(false);
          continue;
        }

        marker.revealStartedAt = this.time.now;
        this.sound.play(ZONE_TRANSITION_SOUND_KEY, {
          volume:
            ZONE_TRANSITION_SOUND_VOLUME * this.audioSettings.transition,
        });
      }

      const screenY =
        marker.image.y -
        camera.scrollY * ZONE_TRANSITION_SCROLL_FACTOR;
      const fadeProgress = Phaser.Math.Clamp(
        (this.time.now - marker.revealStartedAt) / 520,
        0,
        1,
      );
      const smoothAlpha =
        fadeProgress * fadeProgress * (3 - 2 * fadeProgress);
      const playerCrossesText =
        smoothAlpha > 0.7 &&
        Math.abs(playerScreenX - marker.image.x) <
          marker.image.displayWidth * 0.52 &&
        Math.abs(playerScreenY - screenY) <
          marker.image.displayHeight * 0.42;

      marker.image
        .setAlpha(smoothAlpha)
        .setVisible(smoothAlpha > 0.01);

      if (playerCrossesText) {
        this.disperseZoneTransition(marker, screenY);
      }
    }
  }

  private disperseZoneTransition(
    marker: ZoneTransitionMarker,
    screenY: number,
  ): void {
    marker.dispersed = true;
    const image = marker.image;
    const spreadWidth = image.displayWidth * 0.46;
    const spreadHeight = image.displayHeight * 0.28;

    this.tweens.add({
      targets: image,
      alpha: 0,
      scaleX: image.scaleX * 1.06,
      scaleY: image.scaleY * 1.12,
      duration: 360,
      ease: 'Cubic.easeOut',
      onComplete: () => image.setVisible(false),
    });

    for (
      let index = 0;
      index < ZONE_TRANSITION_CLOUD_PUFF_COUNT;
      index += 1
    ) {
      const startX =
        GAME_WIDTH / 2 + Phaser.Math.FloatBetween(-spreadWidth, spreadWidth);
      const startY =
        screenY + Phaser.Math.FloatBetween(-spreadHeight, spreadHeight);
      const radialAngle = Math.atan2(
        startY - screenY,
        startX - GAME_WIDTH / 2,
      );
      const swirlDirection = index % 2 === 0 ? 1 : -1;
      const swirlAngle =
        radialAngle +
        swirlDirection * Phaser.Math.FloatBetween(0.45, 1.05);
      const travelDistance = Phaser.Math.FloatBetween(45, 105);
      const puff = this.add
        .image(startX, startY, ZONE_TRANSITION_CLOUD_TEXTURE_KEY)
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(ZONE_TRANSITION_DEPTH + 1)
        .setScale(Phaser.Math.FloatBetween(0.24, 0.54))
        .setAlpha(Phaser.Math.FloatBetween(0.58, 0.9));

      this.tweens.add({
        targets: puff,
        x: startX + Math.cos(swirlAngle) * travelDistance,
        y:
          startY +
          Math.sin(swirlAngle) * travelDistance -
          Phaser.Math.FloatBetween(18, 52),
        alpha: 0,
        scale: Phaser.Math.FloatBetween(0.9, 1.5),
        rotation:
          puff.rotation +
          swirlDirection * Phaser.Math.FloatBetween(0.5, 1.4),
        delay: Phaser.Math.Between(0, 130),
        duration: Phaser.Math.Between(620, 920),
        ease: 'Cubic.easeOut',
        onComplete: () => puff.destroy(),
      });
    }
  }

  private createSkyBackground(): void {
    const image = new Image();

    image.onload = (): void => {
      if (!this.scene.isActive()) {
        return;
      }

      const sourceWidth = image.naturalWidth;
      const sourceHeight = image.naturalHeight;
      const renderScale = GAME_WIDTH / sourceWidth;
      const segmentCount = Math.ceil(sourceHeight / SKY_BACKGROUND_SEGMENT_SOURCE_HEIGHT);

      for (let index = 0; index < segmentCount; index += 1) {
        const textureKey = `${SKY_BACKGROUND_TEXTURE_PREFIX}-${index}`;

        if (this.textures.exists(textureKey)) {
          continue;
        }

        const sourceY = index * SKY_BACKGROUND_SEGMENT_SOURCE_HEIGHT;
        const sourceHeight = Math.min(
          SKY_BACKGROUND_SEGMENT_SOURCE_HEIGHT,
          image.naturalHeight - sourceY,
        );
        const canvas = document.createElement('canvas');
        // Store the very tall background at its actual in-game resolution. The
        // source is wider than the 390 px canvas, and retaining every segment at
        // source size wastes tens of MB of GPU memory on mobile.
        canvas.width = GAME_WIDTH;
        canvas.height = Math.max(
          1,
          Math.round((sourceY + sourceHeight) * renderScale) -
            Math.round(sourceY * renderScale),
        );
        canvas
          .getContext('2d')
          ?.drawImage(
            image,
            0,
            sourceY,
            sourceWidth,
            sourceHeight,
            0,
            0,
            canvas.width,
            canvas.height,
          );

        this.textures.addCanvas(textureKey, canvas);
      }

      this.addSkyBackgroundSegments(segmentCount, sourceWidth, sourceHeight);
    };

    image.decoding = 'async';
    image.src = SKY_BACKGROUND_TEXTURE_PATH;
  }

  private addSkyBackgroundSegments(
    segmentCount: number,
    sourceWidth: number,
    sourceHeight: number,
  ): void {
    const scale = GAME_WIDTH / sourceWidth;
    const backgroundBottomY = GROUND_Y + GROUND_DIRT_HEIGHT;
    const backgroundTopY = backgroundBottomY - Math.round(sourceHeight * scale);
    const initialCameraScrollY = START_Y - GAME_HEIGHT * PLAYER_SCREEN_Y_RATIO;
    const farLayerOffsetY =
      initialCameraScrollY * (1 - PARALLAX_FAR_SCROLL_FACTOR);
    const parallaxBackgroundTopY = backgroundTopY - farLayerOffsetY;

    this.add
      .rectangle(
        0,
        parallaxBackgroundTopY - WORLD_HEIGHT,
        GAME_WIDTH,
        WORLD_HEIGHT,
        SKY_BACKGROUND_TOP_FILL_COLOR,
        1,
      )
      .setOrigin(0, 0)
      .setDepth(SKY_BACKGROUND_DEPTH)
      .setScrollFactor(PARALLAX_FAR_SCROLL_FACTOR);

    for (let index = 0; index < segmentCount; index += 1) {
      const textureKey = `${SKY_BACKGROUND_TEXTURE_PREFIX}-${index}`;

      if (!this.textures.exists(textureKey)) {
        continue;
      }

      const sourceY = index * SKY_BACKGROUND_SEGMENT_SOURCE_HEIGHT;

      this.add
        .image(
          GAME_WIDTH / 2,
          parallaxBackgroundTopY + Math.round(sourceY * scale),
          textureKey,
        )
        .setOrigin(0.5, 0)
        .setDepth(SKY_BACKGROUND_DEPTH)
        .setScrollFactor(PARALLAX_FAR_SCROLL_FACTOR);
    }
  }

  private createGroundDecor(): void {
    const sourceHeight = GROUND_TEXTURE_SOURCE_HEIGHT - GROUND_TEXTURE_CROP_TOP;
    const texture = this.textures.get(GROUND_TEXTURE_KEY);

    if (!texture.getFrameNames().includes(GROUND_TEXTURE_FRAME)) {
      texture.add(
        GROUND_TEXTURE_FRAME,
        0,
        0,
        GROUND_TEXTURE_CROP_TOP,
        GROUND_TEXTURE_SOURCE_WIDTH,
        sourceHeight,
      );
    }

    const groundScaleX =
      (GAME_WIDTH + GROUND_HORIZONTAL_OVERSCAN * 2) /
      GROUND_TEXTURE_SOURCE_WIDTH;
    const groundScaleY =
      GROUND_DIRT_HEIGHT / (GROUND_TEXTURE_SOURCE_HEIGHT - GROUND_TEXTURE_SURFACE_Y);
    const surfaceOffset = (GROUND_TEXTURE_SURFACE_Y - GROUND_TEXTURE_CROP_TOP) * groundScaleY;

    const ground = this.add.image(
      GAME_WIDTH / 2,
      GROUND_Y - surfaceOffset + GROUND_VISUAL_Y_OFFSET,
      GROUND_TEXTURE_KEY,
      GROUND_TEXTURE_FRAME,
    );
    ground.setOrigin(0.5, -0.13);
    ground.setScale(groundScaleX, groundScaleY);
    ground.setDepth(-4);
  }

  private createBackgroundGround(): void {
    const initialCameraScrollY = START_Y - GAME_HEIGHT * PLAYER_SCREEN_Y_RATIO;
    const groundScreenY = GROUND_Y - initialCameraScrollY;
    const scaleX = GAME_WIDTH / BACKGROUND_GROUND_SOURCE_WIDTH;
    const scaleY =
      GROUND_DIRT_HEIGHT / (GROUND_TEXTURE_SOURCE_HEIGHT - GROUND_TEXTURE_SURFACE_Y);
    const surfaceY =
      groundScreenY -
      BACKGROUND_GROUND_SCREEN_LIFT +
      initialCameraScrollY * BACKGROUND_GROUND_SCROLL_FACTOR;
    const imageTopY =
      surfaceY - BACKGROUND_GROUND_SOURCE_SURFACE_Y * scaleY;

    this.add
      .image(
        GAME_WIDTH / 2,
        imageTopY,
        BACKGROUND_GROUND_TEXTURE_KEY,
      )
      .setOrigin(0.5, 0)
      .setScale(scaleX, scaleY)
      .setDepth(BACKGROUND_GROUND_DEPTH)
      .setScrollFactor(BACKGROUND_GROUND_SCROLL_FACTOR);
  }

  private createFarBackgroundGround(): void {
    const initialCameraScrollY = START_Y - GAME_HEIGHT * PLAYER_SCREEN_Y_RATIO;
    const groundScreenY = GROUND_Y - initialCameraScrollY;
    const scaleX = GAME_WIDTH / BACKGROUND_GROUND_SOURCE_WIDTH;
    const scaleY =
      GROUND_DIRT_HEIGHT / (GROUND_TEXTURE_SOURCE_HEIGHT - GROUND_TEXTURE_SURFACE_Y);
    const surfaceY =
      groundScreenY -
      FAR_BACKGROUND_GROUND_SCREEN_LIFT +
      initialCameraScrollY * FAR_BACKGROUND_GROUND_SCROLL_FACTOR;
    const imageTopY =
      surfaceY - BACKGROUND_GROUND_SOURCE_SURFACE_Y * scaleY;

    this.add
      .image(
        GAME_WIDTH / 2,
        imageTopY,
        BACKGROUND_GROUND_TEXTURE_KEY,
      )
      .setOrigin(0.5, 0)
      .setScale(scaleX, scaleY)
      .setDepth(FAR_BACKGROUND_GROUND_DEPTH)
      .setScrollFactor(FAR_BACKGROUND_GROUND_SCROLL_FACTOR);
  }

  private createGroundForestDecor(): void {
    const initialCameraScrollY = START_Y - GAME_HEIGHT * PLAYER_SCREEN_Y_RATIO;
    const groundScreenY = GROUND_Y - initialCameraScrollY;
    const backgroundGroundSurfaceY =
      groundScreenY -
      BACKGROUND_GROUND_SCREEN_LIFT +
      initialCameraScrollY * BACKGROUND_GROUND_SCROLL_FACTOR;
    const farBackgroundGroundSurfaceY =
      groundScreenY -
      FAR_BACKGROUND_GROUND_SCREEN_LIFT +
      initialCameraScrollY * FAR_BACKGROUND_GROUND_SCROLL_FACTOR;

    for (const decor of GROUND_FOREST_DECOR) {
      const groundSurfaceY =
        decor.groundLayer === 'background'
          ? backgroundGroundSurfaceY
          : decor.groundLayer === 'far-background'
            ? farBackgroundGroundSurfaceY
            : groundScreenY + initialCameraScrollY * decor.scrollFactor;
      const y = groundSurfaceY + decor.groundOffset;
      const scaleX = decor.flipX ? -decor.scale : decor.scale;

      this.add
        .image(decor.x, y, decor.textureKey)
        .setOrigin(0.5, 1)
        .setScale(scaleX, decor.scale)
        .setDepth(decor.depth)
        .setScrollFactor(decor.scrollFactor)
        .setAlpha(decor.alpha ?? 1);
    }
  }

  private createGroundRecord(): void {
    const fontFamily = 'Arial Rounded MT Bold, Arial, sans-serif';

    // Un seul objet texte, totalement opaque, sans backgroundColor,
    // sans ombre et sans stroke : aucun rectangle ne peut être dessiné.
    this.groundRecordValue = this.add.text(
      GROUND_RECORD_X,
      GROUND_RECORD_Y,
      translate('phaser.record', { value: 0 }, this.language),
      {
        fontFamily,
        fontSize: '25px',
        fontStyle: 'bold',
        color: '#30170c',
        align: 'center',
        stroke: '#97604a',
        strokeThickness: 1,
        
      },
    );

    this.groundRecordValue
      .setOrigin(0.5)
      .setAngle(-1)
      .setDepth(GROUND_RECORD_DEPTH)
      .setAlpha(1);

    this.updateGroundRecordText();
  }

  private updateGroundRecordText(): void {
    this.groundRecordValue?.setText(
      translate('phaser.record', { value: this.bestAltitude }, this.language),
    );
  }

  private playNewRecordCelebration(): void {
    if (this.newRecordCelebrated || !this.bestScoreReady) {
      return;
    }

    this.newRecordCelebrated = true;
    this.groundRecordValue
      .setColor('#ffd75a')
      .setStroke('#7f4300', 2);

    this.tweens.add({
      targets: this.groundRecordValue,
      scaleX: 1.14,
      scaleY: 1.14,
      duration: 240,
      yoyo: true,
      repeat: 2,
      ease: 'Sine.easeInOut',
    });

    this.cameras.main.shake(
      NEW_RECORD_CAMERA_SHAKE_DURATION_MS,
      NEW_RECORD_CAMERA_SHAKE_INTENSITY,
    );

    const announcement = this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT + 55,
        translate('phaser.newRecord', undefined, this.language),
        {
        fontFamily: 'Arial Rounded MT Bold, Arial, sans-serif',
        fontSize: '43px',
        fontStyle: 'bold',
        color: '#fff3a3',
        align: 'center',
        stroke: '#6d3500',
        strokeThickness: 8,
        shadow: {
          color: '#ffbd18',
          blur: 18,
          fill: true,
          offsetX: 0,
          offsetY: 3,
        },
        },
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2_100)
      .setScale(0.72, 0.16)
      .setAlpha(0);

    this.tweens.add({
      targets: announcement,
      y: GAME_HEIGHT * 0.61,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 620,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: announcement,
          y: GAME_HEIGHT * 0.55,
          alpha: 0,
          delay: 1_150,
          duration: 600,
          ease: 'Quad.easeIn',
          onComplete: () => announcement.destroy(),
        });
      },
    });

    this.launchNewRecordBirds();
    this.launchNewRecordLeaves();
  }

  private launchNewRecordBirds(): void {
    for (let index = 0; index < NEW_RECORD_BIRD_COUNT; index += 1) {
      const bird = this.add.graphics();
      bird.lineStyle(3, 0x3b2514, 0.9);
      bird.beginPath();
      bird.moveTo(-12, 2);
      bird.lineTo(-6, -4);
      bird.lineTo(0, 1);
      bird.lineTo(6, -4);
      bird.lineTo(12, 2);
      bird.strokePath();

      const side = index % 2 === 0 ? -1 : 1;
      const startX = GAME_WIDTH / 2 + side * Phaser.Math.Between(15, 90);
      const startY = GAME_HEIGHT * 0.78 + Phaser.Math.Between(-20, 45);

      bird
        .setPosition(startX, startY)
        .setScrollFactor(0)
        .setDepth(2_020)
        .setScale(Phaser.Math.FloatBetween(0.65, 1.05))
        .setAlpha(0);

      this.tweens.add({
        targets: bird,
        x: startX + side * Phaser.Math.Between(115, 240),
        y: Phaser.Math.Between(70, 190),
        scaleX: Phaser.Math.FloatBetween(0.3, 0.55),
        scaleY: Phaser.Math.FloatBetween(0.2, 0.45),
        angle: side * Phaser.Math.Between(8, 22),
        alpha: { from: 0.95, to: 0 },
        delay: index * 75,
        duration: Phaser.Math.Between(1_050, 1_450),
        ease: 'Cubic.easeOut',
        onComplete: () => bird.destroy(),
      });
    }
  }

  private launchNewRecordLeaves(): void {
    const leafTints = [0x88bd36, 0xb7d84a, 0xe3b735, 0xd8792b, 0x6f9d2d];

    for (let index = 0; index < NEW_RECORD_LEAF_COUNT; index += 1) {
      const startX = GAME_WIDTH / 2 + Phaser.Math.Between(-75, 75);
      const startY = GAME_HEIGHT * 0.67 + Phaser.Math.Between(-15, 35);
      const leaf = this.add
        .image(startX, startY, NEW_RECORD_LEAF_TEXTURE_KEY)
        .setTint(leafTints[index % leafTints.length])
        .setScrollFactor(0)
        .setDepth(2_050)
        .setScale(Phaser.Math.FloatBetween(0.55, 1.05))
        .setAngle(Phaser.Math.Between(0, 360));

      const targetX = startX + Phaser.Math.Between(-210, 210);
      const riseY = startY - Phaser.Math.Between(65, 175);

      this.tweens.add({
        targets: leaf,
        x: targetX,
        y: riseY,
        angle: leaf.angle + Phaser.Math.Between(-240, 240),
        duration: Phaser.Math.Between(380, 620),
        delay: Phaser.Math.Between(0, 180),
        ease: 'Cubic.easeOut',
        onComplete: () => {
          this.tweens.add({
            targets: leaf,
            x: targetX + Phaser.Math.Between(-35, 35),
            y: GAME_HEIGHT + 35,
            angle: leaf.angle + Phaser.Math.Between(180, 520),
            alpha: 0,
            duration: Phaser.Math.Between(800, 1_250),
            ease: 'Sine.easeIn',
            onComplete: () => leaf.destroy(),
          });
        },
      });
    }
  }

  private createLava(): void {
    this.lavaTopY = LAVA_START_Y;
    this.lava = this.add
      .sprite(
        GAME_WIDTH / 2,
        this.lavaTopY - LAVA_VISIBLE_TOP_OFFSET,
        `${LAVA_TEXTURE_PREFIX}-000`,
      )
      .setOrigin(0.5, 0)
      .setDisplaySize(LAVA_DISPLAY_WIDTH, LAVA_DISPLAY_HEIGHT)
      .setDepth(LAVA_DEPTH)
      .setAlpha(LAVA_ALPHA)
      .play(LAVA_ANIMATION_KEY);
    this.renderLava();
  }

  private createLightningScreenFlash(): void {
    this.lightningScreenFlash = this.add
      .rectangle(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2,
        GAME_WIDTH,
        GAME_HEIGHT,
        LIGHTNING_SCREEN_FLASH_COLOR,
        1,
      )
      .setScrollFactor(0)
      .setDepth(LIGHTNING_SCREEN_FLASH_DEPTH)
      .setAlpha(0)
      .setVisible(false);
  }

  private playLightningScreenFlash(): void {
    this.tweens.killTweensOf(this.lightningScreenFlash);
    this.lightningScreenFlash
      .setVisible(true)
      .setAlpha(LIGHTNING_SCREEN_FLASH_ALPHA);

    this.tweens.add({
      targets: this.lightningScreenFlash,
      alpha: 0,
      duration: LIGHTNING_SCREEN_FLASH_FADE_MS,
      ease: 'Quad.easeOut',
      onComplete: () => this.lightningScreenFlash.setVisible(false),
    });
  }

  private updateLava(time: number, deltaSeconds: number): void {
    if (time - this.runStartTime < LAVA_START_DELAY_MS) {
      this.renderLava();
      return;
    }

    this.lavaTopY = Math.max(0, this.lavaTopY - this.getLavaRiseSpeed() * deltaSeconds);
    this.renderLava();

    if (this.player.getBounds().bottom - LAVA_PLAYER_BOTTOM_CONTACT_OFFSET >= this.lavaTopY) {
      void this.finishGame('lava', false);
    }
  }

  private renderLava(): void {
    this.lava.setPosition(
      GAME_WIDTH / 2,
      this.lavaTopY - LAVA_VISIBLE_TOP_OFFSET,
    );
  }

  private getLavaRiseSpeed(): number {
    const altitudeStepCount = Math.floor(
      Math.max(this.currentAltitude, this.maxAltitudeSinceTakeoff) / 100,
    );

    return Math.min(
      LAVA_MAX_RISE_SPEED,
      LAVA_INITIAL_RISE_SPEED + altitudeStepCount * LAVA_SPEED_GAIN_PER_100_METRES,
    );
  }

  private createAltitudeObstacles(): void {
    this.obstacleGroup = this.physics.add.group({
      allowGravity: false,
      immovable: true,
    });

    for (const level of ALTITUDE_LEVELS) {
      if (level.obstacleKinds.length === 0) {
        continue;
      }

      const maxAltitude = level.maxAltitude ?? MAX_OBSTACLE_ALTITUDE;
      let altitude = level.minAltitude + level.firstObstacleOffset;
      let previousX = GAME_WIDTH / 2;

      while (altitude < maxAltitude) {
        const obstacleKind = this.pickObstacleKind(level);
        const x = this.getObstacleX(obstacleKind, level, previousX);

        const y = this.altitudeToWorldY(altitude);
        if (obstacleKind.id === 'flyingInsect') {
          this.createMosquitoObstacle(obstacleKind, level, x, y, altitude);
          previousX = x;
          altitude += Phaser.Math.Between(level.spacingMin, level.spacingMax);
          continue;
        }

        const obstacle = this.physics.add.sprite(
          x,
          y,
          obstacleKind.textureKey,
        );
        this.obstacleGroup.add(obstacle);
        const displayWidth =
          obstacleKind.id === 'stormCloud'
            ? STORM_CLOUD_DISPLAY_WIDTHS[
                Phaser.Math.Between(
                  0,
                  STORM_CLOUD_DISPLAY_WIDTHS.length - 1,
                )
              ]
            : obstacleKind.displayWidth ?? obstacleKind.width;
        const displayHeight =
          obstacleKind.displayHeight ?? displayWidth * (obstacle.height / obstacle.width);
        const originX =
          obstacleKind.edge === 'left' ? 0 : obstacleKind.edge === 'right' ? 1 : 0.5;

        obstacle
          .setOrigin(originX, 0.5)
          .setDisplaySize(displayWidth, displayHeight)
          .setDepth(OBSTACLE_DEPTH)
          .setAlpha(OBSTACLE_ALPHA)
          .setAngle(obstacleKind.edge ? 0 : Phaser.Math.Between(-10, 10))
          .setData('level', level.id)
          .setData('levelLabel', level.label)
          .setData('kind', obstacleKind.id)
          .setData('altitude', Math.round(altitude));

        if (obstacleKind.id === 'stormCloud') {
          obstacle.setData('thunderPlayed', false);
          this.stormCloudObstacles.push(obstacle);
        }
        if (obstacleKind.animationKey && obstacleKind.id !== 'lightning') {
          obstacle.play(obstacleKind.animationKey);
        }
        obstacle.body.setAllowGravity(false);
        obstacle.body.setImmovable(true);
        obstacle.body.setVelocity(0, 0);

        if (obstacleKind.hitbox) {
          const { widthRatio, heightRatio, offsetXRatio, offsetYRatio } =
            obstacleKind.hitbox;

          obstacle.body.setSize(
            obstacle.width * widthRatio,
            obstacle.height * heightRatio,
            false,
          );
          obstacle.body.setOffset(
            obstacle.width * offsetXRatio,
            obstacle.height * offsetYRatio,
          );
        }

        obstacle.body.reset(obstacle.x, obstacle.y);

        if (obstacleKind.id === 'pterodactyl') {
          this.registerPterodactylPatrol(obstacle);
        }

        if (obstacleKind.id === 'satellite') {
          this.registerSatelliteDrift(obstacle);
        }

        if (obstacleKind.id === 'lightning') {
          this.registerLightningFlash(obstacle, altitude);
        }

        if (obstacleKind.id === 'asteroid') {
          this.registerAsteroidPassage(obstacle, altitude);
        }

        previousX = x;
        altitude += Phaser.Math.Between(level.spacingMin, level.spacingMax);
      }

      if (level.id === 'space') {
        this.createAsteroidClusters(level, maxAltitude);
      }
    }
  }

  private createAsteroidClusters(level: AltitudeLevelConfig, maxAltitude: number): void {
    const asteroidKind = OBSTACLE_KINDS.find(
      (obstacleKind) => obstacleKind.id === 'asteroid',
    );

    if (!asteroidKind) {
      return;
    }

    let clusterAltitude = level.minAltitude + ASTEROID_CLUSTER_FIRST_OFFSET_METRES;

    while (clusterAltitude < maxAltitude) {
      const clusterSize = Phaser.Math.Between(
        ASTEROID_CLUSTER_SIZE_MIN,
        ASTEROID_CLUSTER_SIZE_MAX,
      );
      let asteroidAltitude = clusterAltitude;

      for (let index = 0; index < clusterSize && asteroidAltitude < maxAltitude; index += 1) {
        this.createAsteroidObstacle(asteroidKind, level, asteroidAltitude);
        asteroidAltitude += Phaser.Math.Between(
          ASTEROID_CLUSTER_INNER_SPACING_MIN_METRES,
          ASTEROID_CLUSTER_INNER_SPACING_MAX_METRES,
        );
      }

      clusterAltitude += Phaser.Math.Between(
        ASTEROID_CLUSTER_SPACING_MIN_METRES,
        ASTEROID_CLUSTER_SPACING_MAX_METRES,
      );
    }
  }

  private createAsteroidObstacle(
    obstacleKind: ObstacleKind,
    level: AltitudeLevelConfig,
    altitude: number,
  ): void {
    const asteroid = this.physics.add.sprite(
      GAME_WIDTH / 2,
      this.altitudeToWorldY(altitude),
      obstacleKind.textureKey,
    );
    this.obstacleGroup.add(asteroid);

    const displayWidth = obstacleKind.displayWidth ?? obstacleKind.width;
    const displayHeight = displayWidth * (asteroid.height / asteroid.width);

    asteroid
      .setOrigin(0.5)
      .setDisplaySize(displayWidth, displayHeight)
      .setDepth(OBSTACLE_DEPTH)
      .setAlpha(OBSTACLE_ALPHA)
      .setAngle(Phaser.Math.Between(-10, 10))
      .setData('level', level.id)
      .setData('levelLabel', level.label)
      .setData('kind', obstacleKind.id)
      .setData('altitude', Math.round(altitude));

    asteroid.body.setAllowGravity(false);
    asteroid.body.setImmovable(true);
    asteroid.body.setVelocity(0, 0);
    asteroid.body.reset(asteroid.x, asteroid.y);

    this.registerAsteroidPassage(asteroid, altitude);
  }

  private createMosquitoObstacle(
    obstacleKind: ObstacleKind,
    level: AltitudeLevelConfig,
    x: number,
    y: number,
    altitude: number,
  ): void {
    const mosquito = this.add.sprite(x, y, obstacleKind.textureKey);
    const displayWidth = obstacleKind.displayWidth ?? obstacleKind.width;
    const displayHeight = displayWidth * (mosquito.height / mosquito.width);

    mosquito
      .setOrigin(0.5)
      .setDisplaySize(displayWidth, displayHeight)
      .setDepth(OBSTACLE_DEPTH)
      .setAlpha(OBSTACLE_ALPHA)
      .setData('level', level.id)
      .setData('levelLabel', level.label)
      .setData('kind', obstacleKind.id)
      .setData('altitude', Math.round(altitude));

    if (obstacleKind.animationKey) {
      mosquito.play(obstacleKind.animationKey);
    }

    this.registerMosquitoCircleMotion(mosquito, x, y);
  }

  private registerMosquitoCircleMotion(
    mosquito: Phaser.GameObjects.Sprite,
    homeX: number,
    homeY: number,
  ): void {
    this.mosquitoCircleMotions.push({
      sprite: mosquito,
      homeX,
      homeY,
      radius: Math.max(mosquito.displayWidth, mosquito.displayHeight),
      startAngle: Phaser.Math.FloatBetween(0, Math.PI * 2),
      direction: Phaser.Math.Between(0, 1) === 0 ? -1 : 1,
    });
  }

  private updateMosquitoCircleMotions(time: number): void {
    const circleProgress =
      ((time % MOSQUITO_CIRCLE_DURATION_MS) / MOSQUITO_CIRCLE_DURATION_MS) *
      Math.PI *
      2;
    const view = this.cameras.main.worldView;

    for (const motion of this.mosquitoCircleMotions) {
      const { sprite } = motion;

      if (!sprite.active) {
        continue;
      }

      if (
        motion.homeY + motion.radius < view.top - GAME_HEIGHT ||
        motion.homeY - motion.radius > view.bottom + GAME_HEIGHT
      ) {
        continue;
      }

      const angle = motion.startAngle + circleProgress * motion.direction;
      sprite.setPosition(
        motion.homeX + Math.cos(angle) * motion.radius,
        motion.homeY + Math.sin(angle) * motion.radius,
      );

      if (
        !this.gameOver &&
        this.centeredHitboxesOverlap(
          this.player,
          PLAYER_MANUAL_HITBOX_WIDTH_RATIO,
          PLAYER_MANUAL_HITBOX_HEIGHT_RATIO,
          sprite,
          MOSQUITO_HITBOX_WIDTH_RATIO,
          MOSQUITO_HITBOX_HEIGHT_RATIO,
        )
      ) {
        void this.damagePlayer(1, 'mosquito');
      }
    }
  }

  private registerPterodactylPatrol(
    pterodactyl: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody,
  ): void {
    const direction: 1 | -1 = Phaser.Math.Between(0, 1) === 0 ? 1 : -1;
    const startX =
      direction === 1
        ? -pterodactyl.displayWidth / 2
        : GAME_WIDTH + pterodactyl.displayWidth / 2;

    pterodactyl.setPosition(startX, pterodactyl.y);
    pterodactyl.setFlipX(direction === -1);
    pterodactyl.body.reset(pterodactyl.x, pterodactyl.y);
    pterodactyl.body.setVelocityX(direction * PTERODACTYL_PATROL_SPEED);

    this.pterodactylPatrols.push({
      sprite: pterodactyl,
      direction,
      resumeAt: 0,
    });
  }

  private updatePterodactylPatrols(time: number): void {
    for (const patrol of this.pterodactylPatrols) {
      const { sprite } = patrol;

      if (!sprite.active) {
        continue;
      }

      if (patrol.resumeAt > time) {
        sprite.body.setVelocityX(0);
        continue;
      }

      if (patrol.resumeAt !== 0) {
        patrol.resumeAt = 0;
        sprite.body.setVelocityX(patrol.direction * PTERODACTYL_PATROL_SPEED);
      }

      const halfWidth = sprite.displayWidth / 2;
      const isOutOnRight = patrol.direction === 1 && sprite.x - halfWidth > GAME_WIDTH;
      const isOutOnLeft = patrol.direction === -1 && sprite.x + halfWidth < 0;

      if (!isOutOnRight && !isOutOnLeft) {
        continue;
      }

      patrol.direction = patrol.direction === 1 ? -1 : 1;
      patrol.resumeAt = time + PTERODACTYL_TURN_DELAY_MS;
      sprite.setFlipX(patrol.direction === -1);
      sprite.body.setVelocityX(0);
      sprite.body.reset(sprite.x, sprite.y);
    }
  }

  private registerSatelliteDrift(
    satellite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody,
  ): void {
    this.satelliteDriftMotions.push({
      sprite: satellite,
      homeX: satellite.x,
      homeY: satellite.y,
      startPhaseX: Phaser.Math.FloatBetween(0, Math.PI * 2),
      startPhaseY: Phaser.Math.FloatBetween(0, Math.PI * 2),
      rotationDirection: Phaser.Math.Between(0, 1) === 0 ? -1 : 1,
    });
  }

  private updateSatelliteDrifts(time: number, deltaSeconds: number): void {
    const xProgress =
      ((time % SATELLITE_DRIFT_X_DURATION_MS) / SATELLITE_DRIFT_X_DURATION_MS) *
      Math.PI *
      2;
    const yProgress =
      ((time % SATELLITE_DRIFT_Y_DURATION_MS) / SATELLITE_DRIFT_Y_DURATION_MS) *
      Math.PI *
      2;
    const view = this.cameras.main.worldView;

    for (const motion of this.satelliteDriftMotions) {
      const { sprite } = motion;

      if (!sprite.active) {
        continue;
      }

      if (
        motion.homeY + SATELLITE_DRIFT_Y_RADIUS < view.top - GAME_HEIGHT ||
        motion.homeY - SATELLITE_DRIFT_Y_RADIUS > view.bottom + GAME_HEIGHT
      ) {
        continue;
      }

      sprite.setPosition(
        motion.homeX + Math.sin(xProgress + motion.startPhaseX) * SATELLITE_DRIFT_X_RADIUS,
        motion.homeY + Math.sin(yProgress + motion.startPhaseY) * SATELLITE_DRIFT_Y_RADIUS,
      );
      sprite.setAngle(
        sprite.angle +
          SATELLITE_ROTATION_SPEED_DEGREES *
            motion.rotationDirection *
            deltaSeconds,
      );
      sprite.body.reset(sprite.x, sprite.y);
    }
  }

  private registerAsteroidPassage(
    asteroid: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody,
    altitude: number,
  ): void {
    const launchSide: 'left' | 'right' =
      Phaser.Math.Between(0, 1) === 0 ? 'left' : 'right';
    const startX =
      launchSide === 'left'
        ? -asteroid.displayWidth / 2
        : GAME_WIDTH + asteroid.displayWidth / 2;
    const yOffset =
      ASTEROID_SPAWN_Y_OFFSETS[
        Phaser.Math.Between(0, ASTEROID_SPAWN_Y_OFFSETS.length - 1)
      ];

    asteroid.setPosition(startX, asteroid.y + yOffset);
    asteroid.setVisible(false);
    asteroid.body.reset(asteroid.x, asteroid.y);
    asteroid.disableBody(false, true);

    this.asteroidPassageMotions.push({
      sprite: asteroid,
      triggerAltitude: Math.round(altitude) - ASTEROID_TRIGGER_DISTANCE_METRES,
      launchSide,
      verticalDirection: Phaser.Math.Between(0, 1) === 0 ? -1 : 1,
      rotationDirection: Phaser.Math.Between(0, 1) === 0 ? -1 : 1,
      launched: false,
    });
  }

  private updateAsteroidPassages(deltaSeconds: number): void {
    for (const motion of this.asteroidPassageMotions) {
      const { sprite } = motion;

      if (!sprite.active) {
        continue;
      }

      if (!motion.launched) {
        if (this.currentAltitude < motion.triggerAltitude) {
          continue;
        }

        motion.launched = true;
        sprite.enableBody(true, sprite.x, sprite.y, true, true);
        sprite.body.setVelocity(
          motion.launchSide === 'left' ? ASTEROID_PASS_SPEED : -ASTEROID_PASS_SPEED,
          motion.verticalDirection * ASTEROID_PASS_VERTICAL_SPEED,
        );
      }

      sprite.setAngle(
        sprite.angle +
          ASTEROID_ROTATION_SPEED_DEGREES *
            motion.rotationDirection *
            deltaSeconds,
      );

      const margin = Math.max(sprite.displayWidth, sprite.displayHeight);
      const isOutOnRight =
        motion.launchSide === 'left' && sprite.x - sprite.displayWidth / 2 > GAME_WIDTH + margin;
      const isOutOnLeft =
        motion.launchSide === 'right' && sprite.x + sprite.displayWidth / 2 < -margin;

      if (isOutOnRight || isOutOnLeft) {
        sprite.disableBody(true, true);
      }
    }
  }

  private registerLightningFlash(
    lightning: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody,
    altitude: number,
  ): void {
    lightning.setVisible(false);
    lightning.body.setSize(
      lightning.width * LIGHTNING_HITBOX_WIDTH_RATIO,
      lightning.height * LIGHTNING_HITBOX_HEIGHT_RATIO,
      true,
    );
    lightning.body.reset(lightning.x, lightning.y);
    lightning.disableBody(false, true);

    lightning.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      lightning.disableBody(true, true);
    });

    this.lightningFlashMotions.push({
      sprite: lightning,
      triggerAltitude: Math.round(altitude) - LIGHTNING_TRIGGER_DISTANCE_METRES,
      flashed: false,
    });
  }

  private updateLightningFlashes(): void {
    for (const motion of this.lightningFlashMotions) {
      const { sprite } = motion;

      if (!sprite.active || motion.flashed) {
        continue;
      }

      if (this.currentAltitude < motion.triggerAltitude) {
        continue;
      }

      motion.flashed = true;
      sprite.enableBody(true, sprite.x, sprite.y, true, true);
      sprite.play(LIGHTNING_ANIMATION_KEY);
      this.sound.play(LIGHTNING_SOUND_KEY, {
        volume: LIGHTNING_SOUND_VOLUME * this.audioSettings.lightning,
      });
      this.playLightningScreenFlash();
      this.cameras.main.shake(
        LIGHTNING_CAMERA_SHAKE_DURATION_MS,
        LIGHTNING_CAMERA_SHAKE_INTENSITY,
      );
    }
  }

  private centeredHitboxesOverlap(
    first: Phaser.GameObjects.Components.Transform &
      Phaser.GameObjects.Components.ComputedSize,
    firstWidthRatio: number,
    firstHeightRatio: number,
    second: Phaser.GameObjects.Components.Transform &
      Phaser.GameObjects.Components.ComputedSize,
    secondWidthRatio: number,
    secondHeightRatio: number,
  ): boolean {
    const firstHalfWidth = (first.displayWidth * firstWidthRatio) / 2;
    const firstHalfHeight = (first.displayHeight * firstHeightRatio) / 2;
    const secondHalfWidth = (second.displayWidth * secondWidthRatio) / 2;
    const secondHalfHeight = (second.displayHeight * secondHeightRatio) / 2;

    return (
      Math.abs(first.x - second.x) <= firstHalfWidth + secondHalfWidth &&
      Math.abs(first.y - second.y) <= firstHalfHeight + secondHalfHeight
    );
  }

  private getObstacleX(
    obstacleKind: ObstacleKind,
    level: AltitudeLevelConfig,
    previousX: number,
  ): number {
    if (obstacleKind.edge === 'left') {
      return -BRANCH_EDGE_OVERHANG;
    }

    if (obstacleKind.edge === 'right') {
      return GAME_WIDTH + BRANCH_EDGE_OVERHANG;
    }

    const halfWidth = obstacleKind.width / 2;
    const minX = level.sideMargin + halfWidth;
    const maxX = GAME_WIDTH - level.sideMargin - halfWidth;
    let x = Phaser.Math.Between(minX, maxX);

    if (Math.abs(x - previousX) < 76) {
      x =
        previousX < GAME_WIDTH / 2
          ? Phaser.Math.Between(GAME_WIDTH / 2 + 28, maxX)
          : Phaser.Math.Between(minX, GAME_WIDTH / 2 - 28);
    }

    return x;
  }

  private pickObstacleKind(level: AltitudeLevelConfig): ObstacleKind {
    const kindId =
      level.obstacleKinds[
        Phaser.Math.Between(0, level.obstacleKinds.length - 1)
      ];

    return (
      OBSTACLE_KINDS.find((obstacleKind) => obstacleKind.id === kindId) ??
      OBSTACLE_KINDS[0]
    );
  }

  private altitudeToWorldY(altitude: number): number {
    return START_Y - altitude * 10;
  }

  private createWatermelonCollectables(): void {
    this.createWatermelonGlowTexture();
    this.watermelonCollectables = this.physics.add.staticGroup();

    let y = START_Y - WATERMELON_FIRST_OFFSET_Y;
    let previousX = GAME_WIDTH / 2;

    while (y > WATERMELON_TOP_MARGIN) {
      let x = Phaser.Math.Between(
        WATERMELON_SIDE_MARGIN,
        GAME_WIDTH - WATERMELON_SIDE_MARGIN,
      );

      // Evite une longue colonne toute droite : les pastèques alternent davantage
      // entre la gauche et la droite de l'écran.
      if (Math.abs(x - previousX) < 75) {
        x =
          previousX < GAME_WIDTH / 2
            ? Phaser.Math.Between(GAME_WIDTH / 2 + 20, GAME_WIDTH - WATERMELON_SIDE_MARGIN)
            : Phaser.Math.Between(WATERMELON_SIDE_MARGIN, GAME_WIDTH / 2 - 20);
      }

      const watermelon = this.watermelonCollectables.create(
        x,
        y,
        WATERMELON_TEXTURE_KEY,
      ) as Phaser.Physics.Arcade.Image;

      watermelon
        .setScale(WATERMELON_SCALE)
        .setDepth(WATERMELON_DEPTH)
        .setAngle(Phaser.Math.Between(-18, 18));
      watermelon.refreshBody();
      this.addWatermelonAttractionEffect(watermelon);

      previousX = x;
      y -= Phaser.Math.Between(WATERMELON_MIN_SPACING_Y, WATERMELON_MAX_SPACING_Y);
    }
  }

  private createWatermelonGlowTexture(): void {
    if (this.textures.exists(WATERMELON_GLOW_TEXTURE_KEY)) {
      return;
    }

    const texture = this.textures.createCanvas(
      WATERMELON_GLOW_TEXTURE_KEY,
      128,
      128,
    );

    if (!texture) {
      return;
    }

    const context = texture.getContext();
    const glow = context.createRadialGradient(64, 64, 4, 64, 64, 64);
    glow.addColorStop(0, 'rgba(255, 255, 205, 0.95)');
    glow.addColorStop(0.28, 'rgba(255, 234, 72, 0.72)');
    glow.addColorStop(0.62, 'rgba(255, 199, 18, 0.34)');
    glow.addColorStop(1, 'rgba(255, 176, 0, 0)');
    context.clearRect(0, 0, 128, 128);
    context.fillStyle = glow;
    context.fillRect(0, 0, 128, 128);
    texture.refresh();
  }

  private addWatermelonAttractionEffect(
    watermelon: Phaser.Physics.Arcade.Image,
  ): void {
    const glow = this.add
      .image(watermelon.x, watermelon.y, WATERMELON_GLOW_TEXTURE_KEY)
      .setDisplaySize(WATERMELON_GLOW_SIZE, WATERMELON_GLOW_SIZE)
      .setDepth(WATERMELON_DEPTH - 0.2)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.58);
    const glowScaleX = glow.scaleX;
    const glowScaleY = glow.scaleY;
    const rotationDirection = Phaser.Math.RND.sign();

    watermelon.setData('attractionGlow', glow);

    this.tweens.add({
      targets: glow,
      scaleX: glowScaleX * 1.16,
      scaleY: glowScaleY * 1.16,
      alpha: 0.86,
      duration: Phaser.Math.Between(650, 900),
      delay: Phaser.Math.Between(0, 450),
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });

    this.tweens.add({
      targets: watermelon,
      angle: watermelon.angle + rotationDirection * 360,
      duration: Phaser.Math.Between(
        WATERMELON_ROTATION_DURATION_MIN_MS,
        WATERMELON_ROTATION_DURATION_MAX_MS,
      ),
      ease: 'Linear',
      repeat: -1,
    });
  }

  private destroyWatermelonAttractionEffect(
    watermelon: Phaser.Physics.Arcade.Image,
  ): void {
    const glow = watermelon.getData(
      'attractionGlow',
    ) as Phaser.GameObjects.Image | undefined;

    this.tweens.killTweensOf(watermelon);

    if (glow) {
      this.tweens.killTweensOf(glow);
      glow.destroy();
      watermelon.setData('attractionGlow', undefined);
    }
  }

  private handleWatermelonCollected: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (
    _playerObject,
    watermelonObject,
  ): void => {
    const watermelon = watermelonObject as Phaser.Physics.Arcade.Image;

    if (!watermelon.active) {
      return;
    }

    const collectedX = watermelon.x;
    const collectedY = watermelon.y;
    const collectedScaleX = watermelon.scaleX;
    const collectedScaleY = watermelon.scaleY;
    const collectedAngle = watermelon.angle;

    this.destroyWatermelonAttractionEffect(watermelon);
    watermelon.disableBody(true, true);

    const collectSound =
      WATERMELON_COLLECT_SOUNDS[
        Phaser.Math.Between(0, WATERMELON_COLLECT_SOUNDS.length - 1)
      ];
    this.sound.play(collectSound.key, {
      volume: WATERMELON_SOUND_VOLUME * this.audioSettings.watermelon,
    });

    const baseAmount = 1 + this.blueTalentStats.watermelonBonus;
    const chainMultiplier =
      this.blueTalentStats.chainReaction && this.watermelonCollectStreak >= 2
        ? 2
        : 1;
    const collectedAmount = baseAmount * chainMultiplier;

    this.watermelonCollectStreak += 1;
    this.watermelons += collectedAmount;
    this.emitHud();

    // Chaque pastèque récoltée alimente immédiatement le portefeuille persistant.
    void addWatermelons(collectedAmount).then((profile) => {
      emitWalletUpdated({ watermelons: profile.watermelons });
    });

    this.playWatermelonCollectEffect(
      collectedX,
      collectedY,
      collectedScaleX,
      collectedScaleY,
      collectedAngle,
      collectedAmount,
    );
  };

  private playWatermelonCollectEffect(
    x: number,
    y: number,
    scaleX: number,
    scaleY: number,
    angle: number,
    collectedAmount: number,
  ): void {
    const juice = this.add
      .image(x, y + 5, WATERMELON_JUICE_TEXTURE_KEY)
      .setScale(0.035)
      .setAlpha(0.92)
      .setDepth(WATERMELON_DEPTH + 1);

    this.tweens.add({
      targets: juice,
      scaleX: 0.1,
      scaleY: 0.1,
      alpha: 0,
      duration: 440,
      ease: 'Cubic.easeOut',
      onComplete: () => juice.destroy(),
    });

    const take = this.add
      .image(x, y, WATERMELON_TAKE_TEXTURE_KEY)
      .setScale(scaleX * 0.88, scaleY * 0.88)
      .setAngle(angle)
      .setDepth(WATERMELON_DEPTH + 4);

    this.tweens.add({
      targets: take,
      scaleX: scaleX * 1.18,
      scaleY: scaleY * 1.18,
      alpha: 0,
      duration: 170,
      ease: 'Back.easeOut',
      onComplete: () => take.destroy(),
    });

    WATERMELON_FRAGMENT_TEXTURES.forEach(({ key }, index) => {
      const direction = (Math.PI * 2 * index) / WATERMELON_FRAGMENT_TEXTURES.length;
      const distance = Phaser.Math.Between(45, 78);
      const fragmentScale = Phaser.Math.FloatBetween(0.032, 0.05);
      const fragment = this.add
        .image(x, y, key)
        .setScale(fragmentScale * 0.45)
        .setAngle(Phaser.Math.Between(-35, 35))
        .setDepth(WATERMELON_DEPTH + 3);

      this.tweens.add({
        targets: fragment,
        x: x + Math.cos(direction) * distance,
        y: y + Math.sin(direction) * distance - Phaser.Math.Between(8, 28),
        angle: fragment.angle + Phaser.Math.Between(-150, 150),
        scaleX: fragmentScale,
        scaleY: fragmentScale,
        alpha: 0,
        duration: Phaser.Math.Between(480, 650),
        ease: 'Cubic.easeOut',
        onComplete: () => fragment.destroy(),
      });
    });

    const seeds = this.add
      .image(x, y, WATERMELON_SEEDS_TEXTURE_KEY)
      .setScale(0.025)
      .setAngle(Phaser.Math.Between(-20, 20))
      .setDepth(WATERMELON_DEPTH + 3);

    this.tweens.add({
      targets: seeds,
      scaleX: 0.085,
      scaleY: 0.085,
      angle: seeds.angle + Phaser.Math.Between(-45, 45),
      alpha: 0,
      duration: 560,
      ease: 'Quad.easeOut',
      onComplete: () => seeds.destroy(),
    });

    const scoreTexture = WATERMELON_SCORE_TEXTURES.find(
      ({ amount }) => amount === collectedAmount,
    );
    const score = scoreTexture
      ? this.add
          .image(x, y - 25, scoreTexture.key)
          .setScale(0.035)
          .setDepth(WATERMELON_DEPTH + 5)
      : this.add
          .text(x, y - 25, `+${collectedAmount}`, {
            color: '#b7ff1f',
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '52px',
            fontStyle: 'bold',
            stroke: '#075e18',
            strokeThickness: 8,
            shadow: {
              color: '#ffd82e',
              blur: 10,
              fill: true,
              offsetX: 0,
              offsetY: 0,
            },
          })
          .setOrigin(0.5)
          .setScale(0.55)
          .setDepth(WATERMELON_DEPTH + 5);

    this.tweens.add({
      targets: score,
      y: y - 68,
      scaleX: scoreTexture ? 0.078 : 1,
      scaleY: scoreTexture ? 0.078 : 1,
      duration: 420,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: score,
          y: y - 92,
          alpha: 0,
          delay: 600,
          duration: 500,
          ease: 'Quad.easeIn',
          onComplete: () => score.destroy(),
        });
      },
    });
  }

  private shouldProcessNonBranchOverlap: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (
    _playerObject,
    obstacleObject,
  ): boolean => {
    const obstacle = obstacleObject as Phaser.Physics.Arcade.Image;
    const obstacleKind = obstacle.getData('kind') as ObstacleKindId | undefined;

    return obstacleKind !== 'branchLeft' && obstacleKind !== 'branchRight';
  };

  private shouldProcessBranchCollision: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (
    _playerObject,
    obstacleObject,
  ): boolean => {
    const obstacle = obstacleObject as Phaser.Physics.Arcade.Image;
    const obstacleKind = obstacle.getData('kind') as ObstacleKindId | undefined;

    return obstacleKind === 'branchLeft' || obstacleKind === 'branchRight';
  };

  private handleObstacleHit: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (
    _playerObject,
    obstacleObject,
  ): void => {
    if (this.gameOver) {
      return;
    }

    const obstacle = obstacleObject as Phaser.Physics.Arcade.Image;

    if (!obstacle.active) {
      return;
    }

    const obstacleKind = obstacle.getData('kind') as ObstacleKindId | undefined;

    if (obstacleKind === 'lightning') {
      this.cameras.main.shake(
        LIGHTNING_HIT_CAMERA_SHAKE_DURATION_MS,
        LIGHTNING_HIT_CAMERA_SHAKE_INTENSITY,
        true,
      );
      void this.finishGame('lightning', false);
      return;
    }

    const isBranch =
      obstacleKind === 'branchLeft' || obstacleKind === 'branchRight';
    const isCurrentPerch =
      isBranch && this.isGrounded && this.perchedBranch === obstacle;
    const isProtectedTakeoff =
      isBranch &&
      this.perchCollisionGraceBranch === obstacle &&
      this.time.now < this.perchCollisionGraceUntil;

    if (isCurrentPerch || isProtectedTakeoff) {
      return;
    }

    if (this.canPerchOnBranch(obstacle, obstacleKind)) {
      this.perchOnBranch(obstacle);
      return;
    }

    if (
      isBranch &&
      this.time.now - this.lastPlayerDamageTime >=
        PLAYER_DAMAGE_INVULNERABILITY_MS
    ) {
      this.cameras.main.shake(
        BRANCH_CAMERA_SHAKE_DURATION_MS,
        BRANCH_CAMERA_SHAKE_INTENSITY,
      );
    }

    void this.damagePlayer(
      1,
      obstacleKind === 'flyingInsect' ? 'mosquito' : 'obstacle',
    );
  };

  private canPerchOnBranch(
    obstacle: Phaser.Physics.Arcade.Image,
    obstacleKind: ObstacleKindId | undefined,
  ): boolean {
    if (
      this.isGrounded ||
      !this.blueTalentStats.branchPerch ||
      (obstacleKind !== 'branchLeft' && obstacleKind !== 'branchRight')
    ) {
      return false;
    }

    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    const obstacleBody = obstacle.body as Phaser.Physics.Arcade.Body;
    const previousBottom = playerBody.prev.y + playerBody.height;
    const feetCenterX = playerBody.center.x;

    return (
      playerBody.velocity.y >= 0 &&
      previousBottom <=
        obstacleBody.top + BRANCH_PERCH_PREVIOUS_BOTTOM_TOLERANCE &&
      playerBody.bottom <= obstacleBody.top + BRANCH_PERCH_TOP_TOLERANCE &&
      playerBody.center.y < obstacleBody.top &&
      feetCenterX >= obstacleBody.left &&
      feetCenterX <= obstacleBody.right
    );
  }

  private perchOnBranch(branch: Phaser.Physics.Arcade.Image): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const branchBody = branch.body as Phaser.Physics.Arcade.Body;
    const playerCenterOffsetX = this.player.x - body.center.x;
    const minCenterX = branchBody.left + body.halfWidth;
    const maxCenterX = branchBody.right - body.halfWidth;
    const targetCenterX =
      minCenterX <= maxCenterX
        ? Phaser.Math.Clamp(body.center.x, minCenterX, maxCenterX)
        : branchBody.center.x;

    this.perchedBranch = branch;
    this.perchCollisionGraceBranch = null;
    this.perchCollisionGraceUntil = 0;
    this.perchTargetX = targetCenterX + playerCenterOffsetX;
    this.isPerchSettling = true;
    this.pendingPowerTakeoff = this.blueTalentStats.powerTakeoff;
    this.isGrounded = true;
    this.angularVelocity = 0;
    body.reset(this.player.x, this.player.y);
    body.setVelocity(0, 0);
    body.setAcceleration(0, 0);
    this.stopFlightSounds();
  }

  private updateWatermelonMisses(): void {
    const cameraBottom = this.cameras.main.worldView.bottom;

    for (const child of this.watermelonCollectables.getChildren()) {
      const watermelon = child as Phaser.Physics.Arcade.Image;
      const glow = watermelon.getData(
        'attractionGlow',
      ) as Phaser.GameObjects.Image | undefined;

      if (watermelon.active && glow?.active) {
        glow.setPosition(watermelon.x, watermelon.y);
      }

      if (
        watermelon.active &&
        !watermelon.getData('missed') &&
        watermelon.y > cameraBottom + 20
      ) {
        watermelon.setData('missed', true);
        this.watermelonCollectStreak = 0;
      }
    }
  }

  private updateWatermelonMagnetAttraction(deltaSeconds: number): void {
    if (!this.shopObjectInventory.watermelonMagnet) {
      return;
    }

    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    const targetX = playerBody.center.x;
    const targetY = playerBody.center.y;
    const magnetLevel = Phaser.Math.Clamp(
      this.blueTalentStats.watermelonMagnetLevel,
      0,
      WATERMELON_MAGNET_RADIUS_BY_LEVEL.length - 1,
    );
    const attractionRadius =
      WATERMELON_MAGNET_RADIUS_BY_LEVEL[magnetLevel] ??
      WATERMELON_MAGNET_BASE_RADIUS;
    const attractionSpeed =
      (WATERMELON_MAGNET_SPEED_BY_LEVEL[magnetLevel] ??
        WATERMELON_MAGNET_SPEED_BY_LEVEL[0]) * deltaSeconds;

    for (const child of this.watermelonCollectables.getChildren()) {
      const watermelon = child as Phaser.Physics.Arcade.Image;

      if (!watermelon.active) {
        continue;
      }

      const watermelonBody = watermelon.body as Phaser.Physics.Arcade.StaticBody;
      const watermelonX = watermelonBody.center.x;
      const watermelonY = watermelonBody.center.y;
      const offsetX = targetX - watermelonX;
      const offsetY = targetY - watermelonY;
      const distanceSquared = offsetX * offsetX + offsetY * offsetY;

      if (distanceSquared > attractionRadius * attractionRadius) {
        continue;
      }

      const distance = Math.sqrt(distanceSquared);

      if (distance <= 24) {
        this.handleWatermelonCollected(
          this.player as Phaser.Types.Physics.Arcade.GameObjectWithBody,
          watermelon as Phaser.Types.Physics.Arcade.GameObjectWithBody,
        );
        continue;
      }

      const step = Math.min(attractionSpeed, distance);
      watermelon.setPosition(
        watermelon.x + (offsetX / distance) * step,
        watermelon.y + (offsetY / distance) * step,
      );
      watermelon.refreshBody();
    }
  }

  private updateFeastAttraction(deltaSeconds: number): void {
    if (!this.blueTalentStats.feast) {
      return;
    }

    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    const targetX = playerBody.center.x;
    const targetY = playerBody.center.y;
    const view = this.cameras.main.worldView;
    const attractionSpeed = 430 * deltaSeconds;

    for (const child of this.watermelonCollectables.getChildren()) {
      const watermelon = child as Phaser.Physics.Arcade.Image;

      if (!watermelon.active) {
        continue;
      }

      if (
        watermelon.x < view.left - 30 ||
        watermelon.x > view.right + 30 ||
        watermelon.y < view.top - 30 ||
        watermelon.y > view.bottom + 30
      ) {
        continue;
      }

      const watermelonBody = watermelon.body as Phaser.Physics.Arcade.StaticBody;
      const watermelonX = watermelonBody.center.x;
      const watermelonY = watermelonBody.center.y;
      const distance = Phaser.Math.Distance.Between(
        watermelonX,
        watermelonY,
        targetX,
        targetY,
      );

      if (distance <= 24) {
        this.handleWatermelonCollected(
          this.player as Phaser.Types.Physics.Arcade.GameObjectWithBody,
          watermelon as Phaser.Types.Physics.Arcade.GameObjectWithBody,
        );
        continue;
      }

      const step = Math.min(attractionSpeed, distance);
      const angle = Phaser.Math.Angle.Between(
        watermelonX,
        watermelonY,
        targetX,
        targetY,
      );

      watermelon.setPosition(
        watermelon.x + Math.cos(angle) * step,
        watermelon.y + Math.sin(angle) * step,
      );
      watermelon.refreshBody();
    }
  }

  private createFruitDetectorButton(): void {
    if (this.fruitDetectorButton) {
      return;
    }

    this.fruitDetectorButton = this.add
      .image(GAME_WIDTH - 43, GAME_HEIGHT - 150, FRUIT_DETECTOR_TEXTURE_KEY)
      .setOrigin(0.5)
      .setScale(0.046)
      .setDepth(70)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });

    this.fruitDetectorButton.on(
      'pointerdown',
      (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        event.stopPropagation();
        this.activateFruitDetector();
      },
    );
  }

  private destroyFruitDetectorButton(): void {
    this.fruitDetectorButton?.destroy();
    this.fruitDetectorArrow?.destroy();
    this.fruitDetectorButton = undefined;
    this.fruitDetectorArrow = undefined;
    this.fruitDetectorActive = false;
  }

  private activateFruitDetector(): void {
    if (!this.blueTalentStats.fruitDetector) {
      return;
    }

    this.fruitDetectorActive = true;

    if (!this.fruitDetectorArrow) {
      this.fruitDetectorArrow = this.add
        .graphics()
        .setDepth(69)
        .setScrollFactor(0);
    }

    this.updateFruitDetectorArrow();
  }

  private findNextWatermelon(): Phaser.Physics.Arcade.Image | null {
    let selected: Phaser.Physics.Arcade.Image | null = null;
    let selectedDistance = Number.POSITIVE_INFINITY;

    for (const child of this.watermelonCollectables.getChildren()) {
      const watermelon = child as Phaser.Physics.Arcade.Image;

      if (!watermelon.active) {
        continue;
      }

      const offsetX = watermelon.x - this.player.x;
      const offsetY = watermelon.y - this.player.y;
      const distance = offsetX * offsetX + offsetY * offsetY;

      if (distance < selectedDistance) {
        selected = watermelon;
        selectedDistance = distance;
      }
    }

    return selected;
  }

  private updateFruitDetectorArrow(): void {
    if (!this.fruitDetectorActive || !this.fruitDetectorArrow) {
      return;
    }

    const target = this.findNextWatermelon();
    this.fruitDetectorArrow.clear();

    if (!target) {
      return;
    }

    const camera = this.cameras.main;
    const startX = this.fruitDetectorButton?.x ?? GAME_WIDTH - 43;
    const startY = this.fruitDetectorButton?.y ?? GAME_HEIGHT - 150;
    const targetX = Phaser.Math.Clamp(target.x - camera.scrollX, 24, GAME_WIDTH - 24);
    const targetY = Phaser.Math.Clamp(target.y - camera.scrollY, 88, GAME_HEIGHT - 88);
    const angle = Phaser.Math.Angle.Between(startX, startY, targetX, targetY);
    const arrowLength = 34;
    const endX = startX + Math.cos(angle) * arrowLength;
    const endY = startY + Math.sin(angle) * arrowLength;

    this.fruitDetectorArrow.lineStyle(4, 0xfff18a, 0.95);
    this.fruitDetectorArrow.beginPath();
    this.fruitDetectorArrow.moveTo(startX, startY);
    this.fruitDetectorArrow.lineTo(endX, endY);
    this.fruitDetectorArrow.strokePath();
    this.fruitDetectorArrow.fillStyle(0xfff18a, 0.95);
    this.fruitDetectorArrow.fillTriangle(
      endX,
      endY,
      endX - Math.cos(angle - 0.55) * 11,
      endY - Math.sin(angle - 0.55) * 11,
      endX - Math.cos(angle + 0.55) * 11,
      endY - Math.sin(angle + 0.55) * 11,
    );
  }

  private createOffscreenIndicator(): void {
    const bubble = this.add.circle(0, 0, 30, 0x163a62, 0.84);
    bubble.setStrokeStyle(3, 0xffffff, 0.86);

    this.offscreenIndicatorBody = this.add
      .image(0, 0, 'dodo-pose-flight')
      .setOrigin(0.5, 0.58)
      .setScale(DODO_INDICATOR_SCALE);

    this.offscreenIndicator = this.add.container(0, 0, [
      bubble,
      this.offscreenIndicatorBody,
    ]);
    this.offscreenIndicator.setDepth(30);
    this.offscreenIndicator.setScrollFactor(0);
    this.offscreenIndicator.setVisible(false);
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.gameOver || this.gamePaused) {
      return;
    }

    this.heldPointerSides.set(pointer.id, this.getPointerSide(pointer));
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (!pointer.isDown || !this.heldPointerSides.has(pointer.id)) {
      return;
    }

    this.heldPointerSides.set(pointer.id, this.getPointerSide(pointer));
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    this.heldPointerSides.delete(pointer.id);
  }

  private getPointerSide(pointer: Phaser.Input.Pointer): -1 | 1 {
    return pointer.x < GAME_WIDTH / 2 ? -1 : 1;
  }

  private consumeFlapDirection(time: number): number {
    const acceptDirection = (direction: number): number => {
      if (direction === 0) {
        return 0;
      }

      if (time - this.lastAcceptedFlapTime < MIN_FLAP_INTERVAL_MS) {
        return 0;
      }

      this.lastAcceptedFlapTime = time;
      this.idleFlightState = 'active';
      this.idleFlightPanicStartedAt = 0;
      this.emitMovementStartedOnce();
      return direction;
    };

    let leftHeld = false;
    let rightHeld = false;

    for (const side of this.heldPointerSides.values()) {
      leftHeld ||= side === -1;
      rightHeld ||= side === 1;

      if (leftHeld && rightHeld) {
        break;
      }
    }

    leftHeld ||= this.cursors.left.isDown || this.keyA.isDown;
    rightHeld ||= this.cursors.right.isDown || this.keyD.isDown;

    return acceptDirection(this.getDirectionFromSides(leftHeld, rightHeld));
  }

  private updateIdleFlightState(time: number): void {
    if (this.isGrounded) {
      this.idleFlightState = 'active';
      this.idleFlightPanicStartedAt = 0;
      return;
    }

    const idleDuration = time - this.lastAcceptedFlapTime;

    if (idleDuration < FLIGHT_IDLE_TIMEOUT_MS) {
      return;
    }

    if (this.idleFlightState === 'active') {
      this.idleFlightState = 'panic';
      this.idleFlightPanicStartedAt = time;
      return;
    }

    if (
      this.idleFlightState !== 'panic' ||
      time - this.idleFlightPanicStartedAt < FLIGHT_IDLE_PANIC_DURATION_MS
    ) {
      return;
    }

    const body = this.player.body as Phaser.Physics.Arcade.Body;

    this.idleFlightState = 'dropping';
    body.setVelocity(
      body.velocity.x * FLIGHT_IDLE_DROP_HORIZONTAL_DAMPING,
      MAX_VERTICAL_SPEED,
    );
  }

  private getDirectionFromSides(leftPressed: boolean, rightPressed: boolean): number {
    if (leftPressed && rightPressed) {
      return 2;
    }

    if (leftPressed) {
      return -1;
    }

    if (rightPressed) {
      return 1;
    }

    return 0;
  }

  private emitMovementStartedOnce(): void {
    if (this.hasEmittedMovementStarted) {
      return;
    }

    this.hasEmittedMovementStarted = true;
    emitMovementStarted();
  }

  private updateFlight(direction: number, deltaSeconds: number): void {
    const hasFlap = direction !== 0;
    const hasBalancedFlap = direction === 2;
    let flapImpulseMultiplier = 1;

    if (direction === -1 || direction === 1) {
      this.angularVelocity += direction * this.controlStats.flapTurnImpulse;
    }

    this.angularVelocity *= Math.exp(-TURN_DAMPING * deltaSeconds);
    this.player.angle *= Math.exp(-this.controlStats.autoLevelSpeed * deltaSeconds);

    this.angularVelocity = Phaser.Math.Clamp(
      this.angularVelocity,
      -MAX_TURN_RATE,
      MAX_TURN_RATE,
    );

    this.player.angle += this.angularVelocity * deltaSeconds;

    const headingX = Math.sin(this.player.rotation);
    const headingY = -Math.cos(this.player.rotation);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const speed = body.velocity.length();

    if (this.isGrounded) {
      if (this.perchedBranch?.active) {
        const branchBody = this.perchedBranch.body as Phaser.Physics.Arcade.Body;
        const targetX = this.perchTargetX ?? this.player.x;
        const targetY = branchBody.top + BRANCH_PERCH_Y_OFFSET;

        if (this.isPerchSettling) {
          const smoothing =
            1 - Math.exp(-BRANCH_PERCH_SETTLE_SPEED * deltaSeconds);
          this.player.x = Phaser.Math.Linear(
            this.player.x,
            targetX,
            smoothing,
          );
          this.player.y = Phaser.Math.Linear(
            this.player.y,
            targetY,
            smoothing,
          );

          if (
            Math.abs(this.player.x - targetX) <=
              BRANCH_PERCH_SETTLE_EPSILON &&
            Math.abs(this.player.y - targetY) <=
              BRANCH_PERCH_SETTLE_EPSILON
          ) {
            this.player.setPosition(targetX, targetY);
            this.player.setAngle(0);
            this.isPerchSettling = false;
          }
        } else {
          this.player.setPosition(targetX, targetY);
        }

        body.reset(this.player.x, this.player.y);
      } else {
        this.perchedBranch = null;
        this.perchTargetX = null;
        this.isPerchSettling = false;
        this.pendingPowerTakeoff = false;
        this.player.y = GROUND_Y;
      }

      body.setVelocity(0, 0);
      body.setAcceleration(0, 0);

      if (!hasFlap) {
        return;
      }

      flapImpulseMultiplier = this.pendingPowerTakeoff ? 2 : 1;
      this.pendingPowerTakeoff = false;
      this.perchCollisionGraceBranch = this.perchedBranch;
      this.perchCollisionGraceUntil =
        this.perchedBranch === null
          ? 0
          : this.time.now + BRANCH_TAKEOFF_COLLISION_GRACE_MS;
      this.perchedBranch = null;
      this.perchTargetX = null;
      this.isPerchSettling = false;
      this.isGrounded = false;
      this.maxAltitudeSinceTakeoff = 0;
      this.startFlightSound();
    }

    if (hasFlap) {
      this.playFlapSound();
    }

    // La poussée est orientée dans la direction vers laquelle le Dodo regarde.
    body.setAcceleration(
      0,
      this.idleFlightState === 'dropping'
        ? GRAVITY_Y * FLIGHT_IDLE_DROP_GRAVITY_MULTIPLIER
        : GRAVITY_Y,
    );
    const flapImpulse = this.controlStats.flapUpwardImpulse * flapImpulseMultiplier;

    if (hasBalancedFlap) {
      body.velocity.x += headingX * flapImpulse;
      body.velocity.y += headingY * flapImpulse * 1.12;
    } else if (hasFlap) {
      body.velocity.x +=
        headingX * flapImpulse + direction * FLAP_SIDE_IMPULSE;
      body.velocity.y += headingY * flapImpulse;
    } else if (
      this.idleFlightState !== 'dropping' &&
      body.velocity.y > 0 &&
      this.controlStats.lift > 0
    ) {
      body.setAcceleration(0, Math.max(0, GRAVITY_Y - this.controlStats.lift));
    }

    // Plus il va vite, plus son inertie tend à aligner sa trajectoire sur son orientation.
    if (speed > 35 && this.idleFlightState !== 'dropping') {
      const alignment = Phaser.Math.Clamp(
        (speed / MAX_VERTICAL_SPEED) * VELOCITY_ALIGNMENT * deltaSeconds,
        0,
        0.075,
      );
      const desiredVelocityX = headingX * speed;
      const desiredVelocityY = headingY * speed;

      body.velocity.x = Phaser.Math.Linear(body.velocity.x, desiredVelocityX, alignment);
      body.velocity.y = Phaser.Math.Linear(
        body.velocity.y,
        desiredVelocityY,
        alignment * 0.42,
      );
    }
  }

  private updateGroundContact(): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const altitude = Math.max(0, (this.startAltitudeY - this.player.y) / 10);

    this.maxAltitudeSinceTakeoff = Math.max(this.maxAltitudeSinceTakeoff, altitude);

    if (this.player.y < GROUND_Y || body.velocity.y < 0) {
      return;
    }

    this.player.y = GROUND_Y;
    body.setVelocity(0, 0);
    body.setAcceleration(0, 0);
    this.stopFlightSounds();

    if (this.maxAltitudeSinceTakeoff > SAFE_GROUND_TOUCH_ALTITUDE) {
      void this.finishGame();
      return;
    }

    this.isGrounded = true;
    this.perchedBranch = null;
    this.perchTargetX = null;
    this.isPerchSettling = false;
    this.perchCollisionGraceBranch = null;
    this.perchCollisionGraceUntil = 0;
    this.pendingPowerTakeoff = false;
    this.maxAltitudeSinceTakeoff = 0;
    this.angularVelocity = 0;
    this.player.angle = 0;
  }

  private updateHorizontalScreenBounds(): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const playerToBodyCenterOffset = this.player.x - body.center.x;
    const minimumPlayerX = body.halfWidth + playerToBodyCenterOffset;
    const maximumPlayerX =
      GAME_WIDTH - body.halfWidth + playerToBodyCenterOffset;
    let bounceDirection: -1 | 0 | 1 = 0;

    if (this.player.x < minimumPlayerX) {
      this.player.setX(minimumPlayerX);
      bounceDirection = 1;
    } else if (this.player.x > maximumPlayerX) {
      this.player.setX(maximumPlayerX);
      bounceDirection = -1;
    }

    if (bounceDirection === 0) {
      return;
    }

    body.updateFromGameObject();

    const isMovingOutside =
      (bounceDirection === 1 && body.velocity.x < 0) ||
      (bounceDirection === -1 && body.velocity.x > 0);

    if (!isMovingOutside) {
      return;
    }

    const bounceSpeed = Math.max(
      Math.abs(body.velocity.x) * SCREEN_EDGE_BOUNCE_DAMPING,
      SCREEN_EDGE_MIN_BOUNCE_SPEED,
    );

    body.setVelocityX(bounceDirection * bounceSpeed);
    this.angularVelocity += bounceDirection * SCREEN_EDGE_TURN_IMPULSE;
  }

  private updateWingBeats(direction: number, deltaSeconds: number): void {
    if (this.isGrounded) {
      this.leftWingBoostTime = 0;
      this.rightWingBoostTime = 0;
      this.legAnimationTime = 0;
      this.leftWingPhase = 0;
      this.rightWingPhase = 0;
      return;
    }

    let leftMultiplier = 1;
    let rightMultiplier = 1;

    if (direction === 2) {
      this.leftWingBoostTime = FLAP_WING_BOOST_DURATION;
      this.rightWingBoostTime = FLAP_WING_BOOST_DURATION;
      this.legAnimationTime = FLAP_LEG_ANIMATION_DURATION;
    }

    // Tourner à droite = l'aile gauche bat plus vite.
    if (direction === 1) {
      this.leftWingBoostTime = FLAP_WING_BOOST_DURATION;
      this.legAnimationTime = FLAP_LEG_ANIMATION_DURATION;
      rightMultiplier = SLOW_WING_MULTIPLIER;
    }

    // Tourner à gauche = l'aile droite bat plus vite.
    if (direction < 0) {
      leftMultiplier = SLOW_WING_MULTIPLIER;
      this.rightWingBoostTime = FLAP_WING_BOOST_DURATION;
      this.legAnimationTime = FLAP_LEG_ANIMATION_DURATION;
    }

    if (this.leftWingBoostTime > 0) {
      const boostRatio = this.leftWingBoostTime / FLAP_WING_BOOST_DURATION;
      leftMultiplier = Math.max(
        leftMultiplier,
        FAST_WING_MULTIPLIER + boostRatio * FLAP_WING_BOOST_MULTIPLIER,
      );
      this.leftWingBoostTime = Math.max(0, this.leftWingBoostTime - deltaSeconds);
    }

    if (this.rightWingBoostTime > 0) {
      const boostRatio = this.rightWingBoostTime / FLAP_WING_BOOST_DURATION;
      rightMultiplier = Math.max(
        rightMultiplier,
        FAST_WING_MULTIPLIER + boostRatio * FLAP_WING_BOOST_MULTIPLIER,
      );
      this.rightWingBoostTime = Math.max(0, this.rightWingBoostTime - deltaSeconds);
    }

    if (this.idleFlightState === 'panic') {
      leftMultiplier = Math.max(
        leftMultiplier,
        FLIGHT_IDLE_PANIC_WING_MULTIPLIER,
      );
      rightMultiplier = Math.max(
        rightMultiplier,
        FLIGHT_IDLE_PANIC_WING_MULTIPLIER,
      );
    } else if (this.idleFlightState === 'dropping') {
      leftMultiplier = FLIGHT_IDLE_DROP_WING_MULTIPLIER;
      rightMultiplier = FLIGHT_IDLE_DROP_WING_MULTIPLIER;
    }

    const radiansPerSecond = BASE_WING_BEATS_PER_SECOND * Math.PI * 2;
    this.leftWingPhase += radiansPerSecond * leftMultiplier * deltaSeconds;
    this.rightWingPhase += radiansPerSecond * rightMultiplier * deltaSeconds;
    this.legAnimationTime = Math.max(0, this.legAnimationTime - deltaSeconds);
  }

  private getAnimationFrame(phase: number, frames: string[]): string {
    const normalizedPhase = Phaser.Math.Wrap(phase, 0, Math.PI * 2);
    const frameIndex = Math.floor((normalizedPhase / (Math.PI * 2)) * frames.length);
    return frames[Phaser.Math.Clamp(frameIndex, 0, frames.length - 1)];
  }

  private updateDodoVisuals(_deltaSeconds: number): void {
    const rotation = this.player.rotation;
    const cosine = Math.cos(rotation);
    const sine = Math.sin(rotation);
    const hasEquippedShoes = Boolean(this.equippedCosmeticIds.shoes);

    const placeSprite = (
      sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Text,
      localX: number,
      localY: number,
      localRotation = 0,
      offsetSpace: CosmeticOffsetSpace = 'dodo',
    ): void => {
      if (offsetSpace === 'world') {
        sprite.setPosition(
          this.player.x + localX,
          this.player.y + localY,
        );
      } else {
        sprite.setPosition(
          this.player.x + localX * cosine - localY * sine,
          this.player.y + localX * sine + localY * cosine,
        );
      }
      sprite.setRotation(rotation + localRotation);
    };

    if (this.deathReason === 'lava') {
      if (this.lastDodoPose !== 'lava') {
        this.player.setVisible(false);
        this.leftWing.setVisible(false);
        this.rightWing.setVisible(false);
        this.groundFeet.setVisible(false);
        this.flightFeet.setVisible(false);
        this.lastDodoPose = 'lava';
      }
      this.lavaDeathSprite
        .setPosition(
          this.player.x,
          this.player.y + DODO_LAVA_DEATH_OFFSET_Y,
        )
        .setRotation(0)
        .setVisible(true);

      for (const image of this.cosmeticImages.values()) {
        image.setVisible(false);
      }

      for (const fallbackText of this.cosmeticFallbackTexts.values()) {
        fallbackText.setVisible(false);
      }

      return;
    }

    if (this.deathReason === 'lightning') {
      if (this.lastDodoPose !== 'lightning') {
        this.player
          .setTexture(DODO_LIGHTNING_DEATH_TEXTURE_KEY)
          .setOrigin(0.5, DODO_FLIGHT_ORIGIN_Y)
          .setScale(DODO_LIGHTNING_DEATH_SCALE)
          .clearTint();
        this.leftWing.setVisible(false);
        this.rightWing.setVisible(false);
        this.groundFeet.setVisible(false);
        this.flightFeet.setVisible(false);
        this.lastDodoPose = 'lightning';
      }

      for (const image of this.cosmeticImages.values()) {
        image.setVisible(false);
      }

      for (const fallbackText of this.cosmeticFallbackTexts.values()) {
        fallbackText.setVisible(false);
      }

      return;
    }

    if (this.isGrounded && !this.isPerchSettling) {
      if (this.lastDodoPose !== 'ground') {
        this.player.setTexture('dodo-pose-ground');
        this.player.setOrigin(0.5, DODO_GROUND_ORIGIN_Y);
        this.player.setScale(DODO_GROUND_SCALE);
        this.configurePlayerHitbox();
        this.leftWing.setVisible(false);
        this.rightWing.setVisible(false);
        this.flightFeet.setVisible(false);
        this.lastDodoPose = 'ground';
      }
      this.groundFeet.setVisible(!hasEquippedShoes);
      placeSprite(
        this.groundFeet,
        DODO_GROUND_FEET_OFFSET_X,
        DODO_GROUND_FEET_OFFSET_Y,
      );

      this.updateCosmeticVisuals('ground', placeSprite);
      return;
    }

    if (this.lastDodoPose !== 'flight') {
      this.player.setTexture('dodo-body-flight');
      this.player.setOrigin(0.5, DODO_FLIGHT_ORIGIN_Y);
      this.player.setScale(DODO_BODY_SCALE);
      this.configurePlayerHitbox();
      this.leftWing.setVisible(true);
      this.rightWing.setVisible(true);
      this.groundFeet.setVisible(false);
      this.lastDodoPose = 'flight';
    }
    this.flightFeet.setVisible(!hasEquippedShoes);

    const leftWingFrame = this.getAnimationFrame(this.leftWingPhase, LEFT_WING_FRAMES);
    const rightWingFrame = this.getAnimationFrame(this.rightWingPhase, RIGHT_WING_FRAMES);

    this.leftWing.setTexture(leftWingFrame);
    this.rightWing.setTexture(rightWingFrame);

    placeSprite(this.leftWing, 0, -20);
    placeSprite(this.rightWing, 0, -20);
    placeSprite(
      this.flightFeet,
      DODO_FLIGHT_FEET_OFFSET_X,
      DODO_FLIGHT_FEET_OFFSET_Y,
    );

    this.updateCosmeticVisuals('flight', placeSprite);
  }

  private updateCamera(deltaSeconds: number): void {
    const camera = this.cameras.main;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const playerScreenYRatio =
      body.velocity.y > 0
        ? CAMERA_FALL_SCREEN_Y_RATIO
        : PLAYER_SCREEN_Y_RATIO;
    const desiredScrollY = this.player.y - GAME_HEIGHT * playerScreenYRatio;
    const lowestAllowedScrollY = Math.min(
      GROUND_Y - GAME_HEIGHT * PLAYER_SCREEN_Y_RATIO,
      camera.scrollY + CAMERA_MAX_FALL_CATCHUP,
    );
    const clampedDesiredScrollY = Phaser.Math.Clamp(
      desiredScrollY,
      0,
      lowestAllowedScrollY,
    );

    if (clampedDesiredScrollY < camera.scrollY) {
      camera.scrollY = clampedDesiredScrollY;
      return;
    }

    // La camera redescend doucement pour laisser une recuperation.
    const smoothing = 1 - Math.exp(-CAMERA_FALL_FOLLOW_SPEED * deltaSeconds);
    camera.scrollY = Phaser.Math.Linear(camera.scrollY, clampedDesiredScrollY, smoothing);
  }

  private updateOffscreenIndicator(): void {
    const outsideLeft = this.player.x < 0;
    const outsideRight = this.player.x > GAME_WIDTH;

    if (!outsideLeft && !outsideRight) {
      this.offscreenIndicator.setVisible(false);
      return;
    }

    const camera = this.cameras.main;
    const edgeX = outsideLeft ? 34 : GAME_WIDTH - 34;
    const screenY = Phaser.Math.Clamp(
      this.player.y - camera.scrollY,
      86,
      GAME_HEIGHT - 86,
    );

    this.offscreenIndicator.setPosition(edgeX, screenY);
    this.offscreenIndicator.setVisible(true);

    this.offscreenIndicatorBody.setRotation(this.player.rotation);
  }

  private updateAltitudeAndHud(): void {
    const altitude = Math.max(0, Math.floor((this.startAltitudeY - this.player.y) / 10));
    const velocity = (this.player.body as Phaser.Physics.Arcade.Body).velocity;
    const speed = Math.max(
      0,
      Math.round(Math.hypot(velocity.x, velocity.y) / PIXELS_PER_METRE_PER_SECOND),
    );

    this.currentAltitude = altitude;
    this.currentSpeed = speed;

    if (altitude > this.bestAltitude) {
      this.bestAltitude = altitude;
      this.updateGroundRecordText();
    }

    if (
      this.bestScoreReady &&
      !this.newRecordCelebrated &&
      altitude > this.recordToBeat
    ) {
      this.playNewRecordCelebration();
    }

    this.emitHud();
  }

  private emitHud(): void {
    const previous = this.lastHudSnapshot;

    if (
      previous?.altitude === this.currentAltitude &&
      previous.bestAltitude === this.bestAltitude &&
      previous.newRecord === this.newRecordCelebrated &&
      previous.speed === this.currentSpeed &&
      previous.watermelons === this.watermelons &&
      previous.maxLives === this.playerMaxLives &&
      previous.lives === this.playerLives &&
      previous.lifeVialActive === this.shopObjectInventory.lifeVial &&
      previous.maxShield === this.playerMaxShield &&
      previous.shield === this.playerShield
    ) {
      return;
    }

    const detail: FlightHudDetail = {
      altitude: this.currentAltitude,
      bestAltitude: this.bestAltitude,
      newRecord: this.newRecordCelebrated,
      speed: this.currentSpeed,
      watermelons: this.watermelons,
      lives: this.playerLives,
      maxLives: this.playerMaxLives,
      lifeVialActive: this.shopObjectInventory.lifeVial,
      shield: this.playerShield,
      maxShield: this.playerMaxShield,
    };
    this.lastHudSnapshot = detail;
    emitFlightHud(detail);
  }

  private updateStormCloudSounds(): void {
    if (this.gameOver) {
      return;
    }

    const cameraView = this.cameras.main.worldView;

    for (const obstacle of this.stormCloudObstacles) {
      if (
        !obstacle.active ||
        obstacle.getData('thunderPlayed') === true ||
        obstacle.y + obstacle.displayHeight / 2 < cameraView.top ||
        obstacle.y - obstacle.displayHeight / 2 > cameraView.bottom ||
        !Phaser.Geom.Intersects.RectangleToRectangle(cameraView, obstacle.getBounds())
      ) {
        continue;
      }

      obstacle.setData('thunderPlayed', true);
      this.sound.play(THUNDER_SOUND_KEY, {
        volume: THUNDER_SOUND_VOLUME * this.audioSettings.thunder,
      });
    }
  }

  private updateFallState(time: number): void {
    const cameraBottom = this.cameras.main.worldView.bottom;
    const playerIsBelowScreen = this.player.y > cameraBottom + FALL_LIMIT_BELOW_CAMERA;
    const playerIsOutsideSide =
      this.player.x < -SIDE_LIMIT_OUTSIDE_CAMERA ||
      this.player.x > GAME_WIDTH + SIDE_LIMIT_OUTSIDE_CAMERA;
    const warningReason = playerIsOutsideSide ? 'side' : 'fall';

    if (!playerIsBelowScreen && !playerIsOutsideSide) {
      if (this.outOfScreenSince !== null) {
        this.outOfScreenSince = null;
        this.lastWarningSecond = null;
        this.lastWarningReason = null;
        emitFallWarning({ secondsRemaining: null });
      }
      return;
    }

    if (this.outOfScreenSince === null) {
      this.outOfScreenSince = time;
    }

    const elapsed = time - this.outOfScreenSince;
    const secondsRemaining = Math.max(0, Math.ceil((GAME_OVER_DELAY_MS - elapsed) / 1000));

    if (
      secondsRemaining !== this.lastWarningSecond ||
      warningReason !== this.lastWarningReason
    ) {
      this.lastWarningSecond = secondsRemaining;
      this.lastWarningReason = warningReason;
      emitFallWarning({ reason: warningReason, secondsRemaining });
    }

    if (elapsed >= GAME_OVER_DELAY_MS) {
      void this.finishGame();
    }
  }

  private updateEnduranceTimers(time: number): void {
    if (
      this.enduranceStats.regeneration &&
      this.playerLives > 0 &&
      this.playerLives < this.playerMaxLives
    ) {
      if (this.nextLifeRegenerationAt === null) {
        this.nextLifeRegenerationAt = time + PLAYER_REGENERATION_DELAY_MS;
      } else if (time >= this.nextLifeRegenerationAt) {
        this.playerLives = Math.min(this.playerMaxLives, this.playerLives + 1);
        this.nextLifeRegenerationAt =
          this.playerLives < this.playerMaxLives
            ? time + PLAYER_REGENERATION_DELAY_MS
            : null;
        this.emitHud();
      }
    } else {
      this.nextLifeRegenerationAt = null;
    }

    if (
      this.enduranceStats.shieldRecharge &&
      this.playerMaxShield > 0 &&
      this.playerShield < this.playerMaxShield
    ) {
      if (this.nextShieldRechargeAt === null) {
        this.nextShieldRechargeAt = time + PLAYER_SHIELD_RECHARGE_DELAY_MS;
      } else if (time >= this.nextShieldRechargeAt) {
        this.playerShield = this.playerMaxShield;
        this.nextShieldRechargeAt = null;
        this.emitHud();
      }
    } else {
      this.nextShieldRechargeAt = null;
    }
  }

  private canLifeVialAbsorbDamage(reason: PlayerDamageReason): boolean {
    return reason === 'obstacle' || reason === 'mosquito';
  }

  private async consumeActiveLifeVial(): Promise<void> {
    this.sound.play(POTION_SOUND_KEY, {
      volume: POTION_SOUND_VOLUME * this.audioSettings.items,
    });

    this.shopObjectInventory = {
      ...this.shopObjectInventory,
      lifeVial: false,
    };
    this.refreshPlayerSurvivalStats();
    const profile = await consumeLifeVial();
    emitShopObjectsUpdated({ shopObjects: profile.shopObjects });
    this.applyShopObjectInventory(profile.shopObjects);
  }

  private async consumeActiveWatermelonMagnet(): Promise<void> {
    this.shopObjectInventory = {
      ...this.shopObjectInventory,
      watermelonMagnet: false,
    };
    this.emitHud();
    const profile = await consumeWatermelonMagnet();
    emitShopObjectsUpdated({ shopObjects: profile.shopObjects });
    this.applyShopObjectInventory(profile.shopObjects);
  }

  private playRandomHitSound(): void {
    const soundKey =
      DODO_HIT_SOUND_KEYS[
        Phaser.Math.Between(0, DODO_HIT_SOUND_KEYS.length - 1)
      ];

    this.sound.play(soundKey, {
      volume: DODO_HIT_SOUND_VOLUME * this.audioSettings.damage,
    });
  }

  private async damagePlayer(
    amount = 1,
    reason: PlayerDamageReason = 'obstacle',
  ): Promise<void> {
    if (this.gameOver) {
      return;
    }

    const now = this.time.now;

    if (now - this.lastPlayerDamageTime < PLAYER_DAMAGE_INVULNERABILITY_MS) {
      return;
    }

    this.lastPlayerDamageTime = now;
    let remainingDamage = Math.max(0, Math.floor(amount));

    if (remainingDamage === 0) {
      return;
    }

    const previousShield = this.playerShield;
    const previousLives = this.playerLives;
    this.playRandomHitSound();

    const absorbedDamage = Math.min(this.playerShield, remainingDamage);
    this.playerShield -= absorbedDamage;
    remainingDamage -= absorbedDamage;

    if (absorbedDamage > 0) {
      if (this.enduranceStats.shieldRecharge && this.playerShield < this.playerMaxShield) {
        this.nextShieldRechargeAt = now + PLAYER_SHIELD_RECHARGE_DELAY_MS;
      }

      if (reason === 'mosquito' && this.enduranceStats.mosquitoShield) {
        remainingDamage = 0;
      }
    }

    if (
      remainingDamage > 0 &&
      this.shopObjectInventory.lifeVial &&
      this.canLifeVialAbsorbDamage(reason)
    ) {
      remainingDamage -= 1;
      await this.consumeActiveLifeVial();
    }

    if (remainingDamage > 0) {
      this.playerLives = Math.max(0, this.playerLives - remainingDamage);
      this.nextLifeRegenerationAt =
        this.enduranceStats.regeneration && this.playerLives > 0
          ? now + PLAYER_REGENERATION_DELAY_MS
          : null;
    }

    const appliedDamage =
      previousShield -
      this.playerShield +
      (previousLives - this.playerLives);

    if (appliedDamage > 0) {
      this.spawnFeatherBurst(
        Phaser.Math.RND.sign(),
        Math.min(7, 3 + appliedDamage * 2),
      );
    }

    this.emitHud();

    if (this.playerLives <= 0) {
      if (this.tryPhoenixRevival()) {
        return;
      }

      await this.finishGame(reason);
    }
  }

  private tryPhoenixRevival(): boolean {
    if (!this.enduranceStats.phoenix || this.hasUsedPhoenix) {
      return false;
    }

    this.hasUsedPhoenix = true;
    this.playerLives = this.playerMaxLives;
    this.playerShield = this.playerMaxShield;
    this.lastPlayerDamageTime = this.time.now;
    this.nextLifeRegenerationAt = null;
    this.nextShieldRechargeAt = null;
    this.outOfScreenSince = null;
    this.lastWarningSecond = null;
    this.lastWarningReason = null;
    this.lastAcceptedFlapTime = this.time.now;
    this.idleFlightState = 'active';
    this.idleFlightPanicStartedAt = 0;

    this.player.clearTint();
    this.leftWing.clearTint();
    this.rightWing.clearTint();
    this.groundFeet.clearTint();
    this.flightFeet.clearTint();

    this.playPhoenixRevivalEffect();

    this.tweens.add({
      targets: [
        this.player,
        this.leftWing,
        this.rightWing,
        this.groundFeet,
        this.flightFeet,
      ],
      alpha: 0.45,
      yoyo: true,
      repeat: 3,
      duration: 120,
      onComplete: () => {
        this.player.setAlpha(1);
        this.leftWing.setAlpha(1);
        this.rightWing.setAlpha(1);
        this.groundFeet.setAlpha(1);
        this.flightFeet.setAlpha(1);
      },
    });

    this.emitHud();
    emitFallWarning({ secondsRemaining: null });
    return true;
  }

  private playPhoenixRevivalEffect(): void {
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;
    const warmFlash = this.add
      .rectangle(
        centerX,
        centerY,
        GAME_WIDTH,
        GAME_HEIGHT,
        0xff8a00,
        1,
      )
      .setScrollFactor(0)
      .setDepth(PHOENIX_REVIVAL_FLASH_DEPTH)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.68);
    const fireHalo = this.add
      .circle(centerX, centerY, 115, 0xffc428, 0.72)
      .setScrollFactor(0)
      .setDepth(PHOENIX_REVIVAL_SPARK_DEPTH)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.18);

    this.cameras.main.flash(180, 255, 208, 72);

    this.tweens.add({
      targets: warmFlash,
      alpha: 0,
      duration: 720,
      ease: 'Quad.easeOut',
      onComplete: () => warmFlash.destroy(),
    });

    this.tweens.add({
      targets: fireHalo,
      alpha: 0,
      scale: 3.2,
      duration: 760,
      ease: 'Cubic.easeOut',
      onComplete: () => fireHalo.destroy(),
    });

    const phoenix = this.add
      .image(centerX, centerY, PHOENIX_REVIVAL_TEXTURE_KEY)
      .setScrollFactor(0)
      .setDepth(PHOENIX_REVIVAL_DEPTH)
      .setAlpha(0);
    const phoenixScale = Math.min(
      (GAME_WIDTH * 0.88) / phoenix.width,
      (GAME_HEIGHT * 0.52) / phoenix.height,
    );

    phoenix.setScale(phoenixScale * 0.18);

    this.tweens.add({
      targets: phoenix,
      alpha: 1,
      scale: phoenixScale,
      duration: 360,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.time.delayedCall(420, () => {
          this.tweens.add({
            targets: phoenix,
            alpha: 0,
            scale: phoenixScale * 1.12,
            y: centerY - 24,
            duration: 460,
            ease: 'Sine.easeIn',
            onComplete: () => phoenix.destroy(),
          });
        });
      },
    });

    const sparkColors = [0xffdc57, 0xff9d24, 0xff5b13] as const;

    for (let index = 0; index < 18; index += 1) {
      const startX = centerX + Phaser.Math.Between(-145, 145);
      const startY = centerY + Phaser.Math.Between(70, 185);
      const spark = this.add
        .circle(
          startX,
          startY,
          Phaser.Math.Between(2, 6),
          sparkColors[index % sparkColors.length],
          Phaser.Math.FloatBetween(0.6, 0.95),
        )
        .setScrollFactor(0)
        .setDepth(PHOENIX_REVIVAL_SPARK_DEPTH)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(0.35);

      this.tweens.add({
        targets: spark,
        x: startX + Phaser.Math.Between(-38, 38),
        y: startY - Phaser.Math.Between(170, 330),
        alpha: 0,
        scale: Phaser.Math.FloatBetween(1.1, 1.8),
        delay: Phaser.Math.Between(0, 180),
        duration: Phaser.Math.Between(620, 1_050),
        ease: 'Cubic.easeOut',
        onComplete: () => spark.destroy(),
      });
    }
  }

  private async finishGame(
    reason: FinishGameReason = 'default',
    allowRevival = true,
  ): Promise<void> {
    if (this.gameOver) {
      return;
    }

    if (allowRevival && this.tryPhoenixRevival()) {
      return;
    }

    this.gameOver = true;
    this.deathReason = reason;
    this.heldPointerSides.clear();
    this.playerLives = 0;
    this.emitHud();
    this.stopFlightSounds();
    emitPlayerDied(reason);
    this.sound.play(GAME_OVER_SOUND_KEY, {
      volume: GAME_OVER_SOUND_VOLUME * this.audioSettings.gameOver,
    });
    this.updateDodoVisuals(0);
    const lavaDeathAnimation =
      reason === 'lava' ? this.playLavaDeathAnimation() : null;

    if (this.shopObjectInventory.watermelonMagnet) {
      await this.consumeActiveWatermelonMagnet();
    }
    this.angularVelocity = 180;
    if (reason === 'lava') {
      this.player.setVelocity(0, 0);
      this.player.setAcceleration(0, 0);
    } else {
      this.player.setAcceleration(0, GRAVITY_Y * 1.4);
    }
    const tintColor =
      reason === 'lava' ? 0x3a1a0f : reason === 'lightning' ? 0x8eeeff : 0xff7777;
    if (reason !== 'lightning') {
      this.player.setTint(tintColor);
      this.leftWing.setTint(tintColor);
      this.rightWing.setTint(tintColor);
      this.groundFeet.setTint(tintColor);
      this.flightFeet.setTint(tintColor);
    }

    for (const image of this.cosmeticImages.values()) {
      if (image.visible) {
        image.setTint(tintColor);
      }
    }

    for (const fallbackText of this.cosmeticFallbackTexts.values()) {
      if (fallbackText.visible) {
        fallbackText.setTint(tintColor);
      }
    }

    emitFallWarning({ secondsRemaining: null });

    if (lavaDeathAnimation) {
      await lavaDeathAnimation;
    } else if (reason === 'lightning') {
      await new Promise<void>((resolve) => {
        this.time.delayedCall(LIGHTNING_GAME_OVER_REVEAL_DELAY_MS, resolve);
      });
    }

    emitGameOver();
    await saveBestAltitude(this.bestAltitude);
  }

  private playLavaDeathAnimation(): Promise<void> {
    return new Promise((resolve) => {
      this.lavaDeathSprite.once(
        Phaser.Animations.Events.ANIMATION_COMPLETE,
        resolve,
      );
      this.lavaDeathSprite.play(DODO_LAVA_DEATH_ANIMATION_KEY);
    });
  }

  private handleRestartRequest = (event: Event): void => {
    const { startPaused = false } =
      (event as CustomEvent<RestartRequestDetail>).detail ?? {};

    this.tweens.resumeAll();
    this.physics.world.resume();
    this.sound.stopAll();
    this.scene.restart({ startPaused });
  };

  private handleRewardedReviveRequest = (): void => {
    if (!this.gameOver || this.hasUsedRewardedRevive) {
      return;
    }

    this.hasUsedRewardedRevive = true;
    this.gameOver = false;
    this.deathReason = null;
    this.gamePaused = true;
    this.playerLives = 1;
    this.playerShield = 0;
    this.outOfScreenSince = null;
    this.lastWarningSecond = null;
    this.lastWarningReason = null;
    this.lastPlayerDamageTime = this.time.now;
    this.nextLifeRegenerationAt =
      this.enduranceStats.regeneration && this.playerMaxLives > 1
        ? this.time.now + PLAYER_REGENERATION_DELAY_MS
        : null;
    this.nextShieldRechargeAt =
      this.enduranceStats.shieldRecharge && this.playerMaxShield > 0
        ? this.time.now + PLAYER_SHIELD_RECHARGE_DELAY_MS
        : null;
    this.perchedBranch = null;
    this.perchTargetX = null;
    this.isPerchSettling = false;
    this.perchCollisionGraceBranch = null;
    this.perchCollisionGraceUntil = 0;
    this.pendingPowerTakeoff = false;
    this.heldPointerSides.clear();
    this.angularVelocity = 0;
    this.isGrounded = false;
    this.lastDodoPose = null;
    this.lastAcceptedFlapTime = this.time.now;
    this.idleFlightState = 'active';
    this.idleFlightPanicStartedAt = 0;

    const camera = this.cameras.main;
    const safeX = GAME_WIDTH / 2;
    const safeY = Math.max(
      80,
      Math.min(
        camera.scrollY + GAME_HEIGHT * 0.55,
        this.lavaTopY - LAVA_PLAYER_BOTTOM_CONTACT_OFFSET - 100,
        GROUND_Y - 160,
      ),
    );

    this.lavaDeathSprite.stop().setVisible(false);
    this.player
      .setVisible(true)
      .setAlpha(1)
      .setPosition(safeX, safeY)
      .setRotation(0)
      .clearTint();
    this.player.body?.reset(safeX, safeY);
    this.player.setVelocity(0, -90).setAcceleration(0, GRAVITY_Y);
    this.leftWing.setAlpha(1).clearTint();
    this.rightWing.setAlpha(1).clearTint();
    this.groundFeet.setAlpha(1).clearTint();
    this.flightFeet.setAlpha(1).clearTint();

    for (const image of this.cosmeticImages.values()) {
      image.setAlpha(1).clearTint();
    }

    for (const fallbackText of this.cosmeticFallbackTexts.values()) {
      fallbackText.setAlpha(1).clearTint();
    }

    this.sound.stopByKey(GAME_OVER_SOUND_KEY);
    this.physics.world.pause();
    this.tweens.pauseAll();
    this.sound.pauseAll();
    this.updateDodoVisuals(0);
    this.updateOffscreenIndicator();
    this.emitHud();
    emitFallWarning({ secondsRemaining: null });
    emitRewardedRevived();
  };

  private handlePauseRequest = (): void => {
    if (this.gamePaused) {
      return;
    }

    this.gamePaused = true;
    this.heldPointerSides.clear();
    this.physics.world.pause();
    this.tweens.pauseAll();
    this.sound.pauseAll();
  };

  private handleResumeRequest = (): void => {
    if (this.gameOver || !this.gamePaused) {
      return;
    }

    this.gamePaused = false;
    void this.initializeShopObjects();
    this.physics.world.resume();
    this.tweens.resumeAll();
    this.sound.resumeAll();

    if (!this.isGrounded) {
      this.startFlightSound();
    }
  };
}
