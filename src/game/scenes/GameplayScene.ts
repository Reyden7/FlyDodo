import Phaser from 'phaser';
import {
  emitFallWarning,
  emitFlightHud,
  emitGameOver,
  emitWalletUpdated,
  gameEvents,
  type CosmeticEquippedDetail,
} from '../events';
import {
  addWatermelons,
  loadBestAltitude,
  loadLatestPlayerProfile,
  saveBestAltitude,
  type EquippedCosmetics,
} from '../../services/saveService';
import {
  COSMETIC_CATEGORIES,
  getCosmeticTransform,
  getShopItemById,
  getShopItemImagePath,
  getShopItemTextureKey,
  type CosmeticCategory,
  type CosmeticPose,
  type ShopItem,
} from '../../shop/shopCatalog';

const GAME_WIDTH = 390;
const GAME_HEIGHT = 844;
const WORLD_HEIGHT = 100_000;
const START_Y = 99_900;
const GROUND_Y = START_Y;
const DODO_BODY_SCALE = 0.125;
const DODO_GROUND_SCALE = 0.1;
const DODO_WING_SCALE = 0.14;
const DODO_FLIGHT_ORIGIN_Y = 0.75;
const DODO_GROUND_ORIGIN_Y = 0.77;
const DODO_FLIGHT_FEET_SCALE_X = 0.3;
const DODO_FLIGHT_FEET_SCALE_Y = 0.350;
const DODO_INDICATOR_SCALE = 0.045;

const PLAYER_SCREEN_Y_RATIO = 0.88;
const CAMERA_FALL_FOLLOW_SPEED = 1.15;
const CAMERA_MAX_FALL_CATCHUP = 360;

const GRAVITY_Y = 800;
const FLAP_UPWARD_IMPULSE = 170;
const FLAP_SIDE_IMPULSE = 30;
const MAX_HORIZONTAL_SPEED = 300;
const MAX_VERTICAL_SPEED = 450;
const VELOCITY_ALIGNMENT = 0.62;

const FLAP_TURN_IMPULSE = 112;
const MAX_TURN_RATE = 112;
const TURN_DAMPING = 5.2;
const AUTO_LEVEL_SPEED = 0;

const BASE_WING_BEATS_PER_SECOND = 2.4;
const FAST_WING_MULTIPLIER = 0;
const SLOW_WING_MULTIPLIER = 0;
const MIN_FLAP_INTERVAL_MS = 115;
const FLAP_WING_BOOST_DURATION = 0.28;
const FLAP_WING_BOOST_MULTIPLIER = 1.5;
const FLAP_LEG_ANIMATION_DURATION = 0;

const FALL_LIMIT_BELOW_CAMERA = 5;
const SIDE_LIMIT_OUTSIDE_CAMERA = 34;
const GAME_OVER_DELAY_MS = 5_000;
const PIXELS_PER_METRE_PER_SECOND = 82;
const SAFE_GROUND_TOUCH_ALTITUDE = 50;
const GROUND_DIRT_HEIGHT = 85;
const GROUND_TEXTURE_KEY = 'ground-decor';
const GROUND_TEXTURE_FRAME = 'ground-cropped';
const GROUND_TEXTURE_PATH = '/assets/Decors/ground.png';
const FOREST_TREE_1_KEY = 'forest-tree-1';
const FOREST_TREE_2_KEY = 'forest-tree-2';
const FOREST_FERN_1_KEY = 'forest-fern-1';
const FOREST_FERN_2_KEY = 'forest-fern-2';
const FOREST_BRANCH_RIGHT_SOURCE_KEY = 'forest-branch-right-source';
const FOREST_BRANCH_LEFT_SOURCE_KEY = 'forest-branch-left-source';
const FOREST_MOSQUITO_TEXTURE_PREFIX = 'forest-mosquito';
const FOREST_MOSQUITO_ANIMATION_KEY = 'forest-mosquito-fly';
const FOREST_MOSQUITO_FRAME_COUNT = 25;
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
const GROUND_RECORD_X = GAME_WIDTH / 2;
const GROUND_RECORD_Y = GROUND_Y + 60;
const GROUND_RECORD_DEPTH = -3;
const OBSTACLE_DEPTH = 6;
const OBSTACLE_ALPHA = 0.92;
const BRANCH_EDGE_OVERHANG = 20;
const MOSQUITO_CIRCLE_DURATION_MS = 1_800;

interface GroundForestDecor {
  textureKey: string;
  x: number;
  scale: number;
  depth: number;
  scrollFactor: number;
  groundOffset: number;
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
  | 'bird'
  | 'stormCloud'
  | 'storm'
  | 'lightning'
  | 'strongWind'
  | 'satellite'
  | 'meteor'
  | 'asteroid';

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
  animationKey?: string;
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

const GROUND_FOREST_DECOR: readonly GroundForestDecor[] = [
  {
    textureKey: FOREST_TREE_2_KEY,
    x: 120,
    scale: 0.42,
    depth: -9,
    scrollFactor: 0.82,
    groundOffset: 10,
    alpha: 1,
  },
  {
    textureKey: FOREST_TREE_1_KEY,
    x: 315,
    scale: 0.30,
    depth: -8.7,
    scrollFactor: 0.78,
    groundOffset: 9,
    flipX: true,
    alpha: 1,
  },
  {
    textureKey: FOREST_TREE_2_KEY,
    x: 306,
    scale: 0.36,
    depth: -8.2,
    scrollFactor: 0.84,
    groundOffset: 11,
    flipX: true,
    alpha: 1,
  },
  {
    textureKey: FOREST_TREE_2_KEY,
    x: -60,
    scale: 1,
    depth: -6.4,
    scrollFactor: 0.9,
    groundOffset: 8,
  },
  {
    textureKey: FOREST_TREE_1_KEY,
    x: 15,
    scale: 1.5,
    depth: -6.1,
    scrollFactor: 0.94,
    groundOffset: 7,
    flipX: true,
    alpha: 1,
  },
  {
    textureKey: FOREST_TREE_2_KEY,
    x: 340,
    scale: 1,
    depth: -6.2,
    scrollFactor: 0.91,
    groundOffset: 9,
    flipX: true,
    alpha: 1,
  },
  {
    textureKey: FOREST_TREE_1_KEY,
    x: 424,
    scale: 0.5,
    depth: -6.5,
    scrollFactor: 0.88,
    groundOffset: 8,
  },
  {
    textureKey: FOREST_FERN_1_KEY,
    x: 200,
    scale: 0.12,
    depth: 1,
    scrollFactor: 0.98,
    groundOffset: -1,
  },
  {
    textureKey: FOREST_FERN_2_KEY,
    x: 130,
    scale: 0.045,
    depth: 11,
    scrollFactor: 1,
    groundOffset: 30,
    flipX: true,
  },
  {
    textureKey: FOREST_FERN_1_KEY,
    x: 228,
    scale: 0.053,
    depth: 11,
    scrollFactor: 1,
    groundOffset: 30,
  },
  {
    textureKey: FOREST_FERN_2_KEY,
    x: 116,
    scale: 0.11,
    depth: -3.75,
    scrollFactor: 0.99,
    groundOffset: 0,
    flipX: true,
  },
  {
    textureKey: FOREST_FERN_1_KEY,
    x: 270,
    scale: 0.105,
    depth: -3.82,
    scrollFactor: 0.985,
    groundOffset: 0,
    flipX: true,
  },
  {
    textureKey: FOREST_FERN_2_KEY,
    x: 386,
    scale: 0.12,
    depth: -3.78,
    scrollFactor: 0.98,
    groundOffset: -1,
  },
];

const WATERMELON_TEXTURE_KEY = 'watermelon-collectable';
const WATERMELON_TEXTURE_PATH = '/assets/collectable/pasteque.png';
const WATERMELON_SOUND_KEY = 'watermelon-collect-sound';
const WATERMELON_SOUND_PATH = '/assets/sounds/pasteque.mp3';
const WATERMELON_SOUND_VOLUME = 0.65;

const FLIGHT_SOUND_KEY = 'dodo-flight-default-sound';
const FLIGHT_SOUND_PATH = '/assets/sounds/defaut.mp3';
const FLIGHT_SOUND_VOLUME = 0.24;

const FLAP_SOUND_KEY = 'dodo-single-flap-sound';
const FLAP_SOUND_PATH = '/assets/sounds/1Flap.mp3';
const FLAP_SOUND_VOLUME = 0.25;

const COSMETIC_FALLBACK_TEXTURE_KEY = 'cosmetic-runtime-placeholder';
const COSMETIC_TRIM_ALPHA_THRESHOLD = 64;

const WATERMELON_SCALE = 0.075;
const WATERMELON_DEPTH = 4;
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
    textureKey: 'obstacle-pterodactyl-placeholder',
    width: 58,
    height: 38,
    fillColor: 0x8a6b5b,
    strokeColor: 0x3a2a23,
  },
  {
    id: 'bird',
    textureKey: 'obstacle-bird-placeholder',
    width: 38,
    height: 38,
    fillColor: 0xefe2bd,
    strokeColor: 0x846d42,
  },
  {
    id: 'stormCloud',
    textureKey: 'obstacle-storm-cloud-placeholder',
    width: 62,
    height: 42,
    fillColor: 0x273449,
    strokeColor: 0x101721,
  },
  {
    id: 'storm',
    textureKey: 'obstacle-storm-placeholder',
    width: 70,
    height: 50,
    fillColor: 0x4b5267,
    strokeColor: 0x161a28,
  },
  {
    id: 'lightning',
    textureKey: 'obstacle-lightning-placeholder',
    width: 34,
    height: 62,
    fillColor: 0xffda39,
    strokeColor: 0x8f6a00,
  },
  {
    id: 'strongWind',
    textureKey: 'obstacle-strong-wind-placeholder',
    width: 76,
    height: 30,
    fillColor: 0xbff8ff,
    strokeColor: 0x4caebc,
  },
  {
    id: 'satellite',
    textureKey: 'obstacle-satellite-placeholder',
    width: 58,
    height: 34,
    fillColor: 0xc2c6d2,
    strokeColor: 0x545b6d,
  },
  {
    id: 'meteor',
    textureKey: 'obstacle-meteor-placeholder',
    width: 42,
    height: 42,
    fillColor: 0xff7a24,
    strokeColor: 0x7a2f0c,
  },
  {
    id: 'asteroid',
    textureKey: 'obstacle-asteroid-placeholder',
    width: 52,
    height: 52,
    fillColor: 0x8c8178,
    strokeColor: 0x3c3632,
  },
];

const ALTITUDE_LEVELS: readonly AltitudeLevelConfig[] = [
  {
    id: 'forest',
    label: 'Forest',
    minAltitude: 0,
    maxAltitude: 200,
    obstacleKinds: ['branchLeft', 'branchRight', 'flyingInsect'],
    firstObstacleOffset: 75,
    spacingMin: 45,
    spacingMax: 70,
    sideMargin: 34,
  },
  {
    id: 'lowSky',
    label: 'LowSky',
    minAltitude: 200,
    maxAltitude: 800,
    obstacleKinds: ['pterodactyl', 'bird', 'stormCloud'],
    firstObstacleOffset: 45,
    spacingMin: 80,
    spacingMax: 125,
    sideMargin: 42,
  },
  {
    id: 'midSky',
    label: 'MidSky',
    minAltitude: 800,
    maxAltitude: 1800,
    obstacleKinds: ['storm', 'lightning'],
    firstObstacleOffset: 65,
    spacingMin: 105,
    spacingMax: 165,
    sideMargin: 48,
  },
  {
    id: 'stratosphere',
    label: 'Stratosphere',
    minAltitude: 1800,
    maxAltitude: 3000,
    obstacleKinds: ['strongWind'],
    firstObstacleOffset: 80,
    spacingMin: 135,
    spacingMax: 210,
    sideMargin: 34,
  },
  {
    id: 'space',
    label: 'Space',
    minAltitude: 3000,
    maxAltitude: null,
    obstacleKinds: ['satellite', 'meteor', 'asteroid'],
    firstObstacleOffset: 120,
    spacingMin: 280,
    spacingMax: 430,
    sideMargin: 44,
  },
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
  private flightFeet!: Phaser.GameObjects.Image;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private watermelonCollectables!: Phaser.Physics.Arcade.StaticGroup;
  private obstacleGroup!: Phaser.Physics.Arcade.Group;
  private flightSound?: Phaser.Sound.BaseSound;
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

  private cosmeticImageReady = new Map<CosmeticCategory, boolean>();
  private cosmeticLoadPromises = new Map<string, Promise<boolean>>();
  private cosmeticRequestVersions = new Map<CosmeticCategory, number>();

  private pendingLeftFlap = false;
  private pendingRightFlap = false;
  private angularVelocity = 0;
  private leftWingPhase = 0;
  private rightWingPhase = 0;
  private leftWingBoostTime = 0;
  private rightWingBoostTime = 0;
  private lastAcceptedFlapTime = Number.NEGATIVE_INFINITY;
  private legAnimationTime = 0;

  private startAltitudeY = START_Y;
  private bestAltitude = 0;
  private currentAltitude = 0;
  private currentSpeed = 0;
  private watermelons = 0;
  private maxAltitudeSinceTakeoff = 0;
  private isGrounded = true;

  private gameOver = false;
  private gamePaused = false;
  private outOfScreenSince: number | null = null;
  private lastWarningSecond: number | null = null;
  private lastWarningReason: 'fall' | 'side' | null = null;
  private lastHudSignature = '';
  private backgroundClouds: Phaser.GameObjects.Arc[] = [];
  private offscreenIndicator!: Phaser.GameObjects.Container;
  private offscreenIndicatorBody!: Phaser.GameObjects.Image;
  private groundRecordValue!: Phaser.GameObjects.Text;

  constructor() {
    super('GameplayScene');
  }

  preload(): void {
    this.load.image(GROUND_TEXTURE_KEY, GROUND_TEXTURE_PATH);
    this.load.image(FOREST_TREE_1_KEY, '/assets/Decors/arbre1.png');
    this.load.image(FOREST_TREE_2_KEY, '/assets/Decors/arbre2.png');
    this.load.image(FOREST_FERN_1_KEY, '/assets/Decors/fougere1.png');
    this.load.image(FOREST_FERN_2_KEY, '/assets/Decors/fougère2.png');
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
    this.load.image('dodo-body', '/assets/dodo/optimized/body.png');
    this.load.image('dodo-body-flight', '/assets/dodo/optimized/flight_refined/body_flight.png');
    this.load.image('dodo-pose-flight', '/assets/dodo/optimized/flight.png');
    this.load.image('dodo-pose-ground', '/assets/dodo/optimized/flight_refined/ground.png');
    this.load.image(WATERMELON_TEXTURE_KEY, WATERMELON_TEXTURE_PATH);
    this.load.audio(WATERMELON_SOUND_KEY, WATERMELON_SOUND_PATH);
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
        `dodo-flight-legs-${index}`,
        `/assets/dodo/optimized/flight_refined/legs_${index}.png`,
      );
    }
  }

  create(): void {
    this.resetRuntimeState();
    this.createFlightSounds();

    this.physics.world.setBounds(0, 0, GAME_WIDTH, WORLD_HEIGHT);
    this.physics.world.gravity.y = 0;

    this.createPlaceholderTextures();
    this.createObstaclePlaceholderTextures();
    this.createObstacleAnimations();
    this.createSkyDecor();
    this.createGroundDecor();
    this.createGroundForestDecor();
    this.createGroundRecord();

    this.leftWing = this.add.image(GAME_WIDTH / 2, START_Y, LEFT_WING_FRAMES[0]);
    this.rightWing = this.add.image(GAME_WIDTH / 2, START_Y, RIGHT_WING_FRAMES[0]);
    this.leftWing.setOrigin(0.5, 0.92).setScale(DODO_WING_SCALE).setDepth(8);
    this.rightWing.setOrigin(0.5, 0.92).setScale(DODO_WING_SCALE).setDepth(8);

    this.player = this.physics.add.image(GAME_WIDTH / 2, START_Y, 'dodo-pose-ground');
    this.player.setOrigin(0.2, DODO_GROUND_ORIGIN_Y);
    this.player.setScale(DODO_GROUND_SCALE);
    this.player.setDepth(10);
    this.player.setCollideWorldBounds(false);
    this.player.setVelocity(0, 0);
    this.player.setMaxVelocity(MAX_HORIZONTAL_SPEED, MAX_VERTICAL_SPEED);
    this.player.body?.setSize(42, 62, true);

    this.flightFeet = this.add.image(GAME_WIDTH / 2, START_Y, LEG_FRAMES[0]);
    this.flightFeet
      .setOrigin(0.5, 0.92)
      .setScale(DODO_FLIGHT_FEET_SCALE_X, DODO_FLIGHT_FEET_SCALE_Y)
      .setDepth(9)
      .setVisible(false);

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
      undefined,
      this,
    );

    this.createOffscreenIndicator();

    const camera = this.cameras.main;
    camera.roundPixels = true;
    camera.setBounds(0, 0, GAME_WIDTH, WORLD_HEIGHT);
    camera.setScroll(0, START_Y - GAME_HEIGHT * PLAYER_SCREEN_Y_RATIO);
    camera.setBackgroundColor('#73d8ff');

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keyA = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D);

    this.input.on('pointerdown', this.handlePointerDown, this);
    this.input.on('pointermove', this.handlePointerMove, this);
    this.input.on('pointerup', this.handlePointerUp, this);
    this.input.on('pointerupoutside', this.handlePointerUp, this);

    gameEvents.addEventListener('flydodo:restart-request', this.handleRestartRequest);
    gameEvents.addEventListener('flydodo:pause-request', this.handlePauseRequest);
    gameEvents.addEventListener('flydodo:resume-request', this.handleResumeRequest);
    gameEvents.addEventListener(
      'flydodo:cosmetic-equipped',
      this.handleCosmeticEquipped,
    );

    void this.initializeBestScore();
    void this.initializeEquippedCosmetics();
    this.updateDodoVisuals(0);
  }

  update(time: number, delta: number): void {
    const deltaSeconds = Math.min(delta / 1000, 0.034);

    if (this.gameOver) {
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
    this.updateFlight(direction, deltaSeconds);
    this.updateGroundContact();
    this.updateWingBeats(direction, deltaSeconds);
    this.updateDodoVisuals(deltaSeconds);
    this.updateCamera(deltaSeconds);
    this.updateOffscreenIndicator();
    this.updateAltitudeAndHud();
    this.updateCloudVisibility();
    this.updateFallState(time);
  }

  shutdown(): void {
    this.destroyFlightSounds();

    this.input.off('pointerdown', this.handlePointerDown, this);
    this.input.off('pointermove', this.handlePointerMove, this);
    this.input.off('pointerup', this.handlePointerUp, this);
    this.input.off('pointerupoutside', this.handlePointerUp, this);
    gameEvents.removeEventListener('flydodo:restart-request', this.handleRestartRequest);
    gameEvents.removeEventListener('flydodo:pause-request', this.handlePauseRequest);
    gameEvents.removeEventListener('flydodo:resume-request', this.handleResumeRequest);
    gameEvents.removeEventListener(
      'flydodo:cosmetic-equipped',
      this.handleCosmeticEquipped,
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
      this.cosmeticImageReady.set(category, false);
      this.cosmeticRequestVersions.set(category, 0);
    }
  }

  private async initializeEquippedCosmetics(): Promise<void> {
    const profile = await loadLatestPlayerProfile();

    if (!this.scene.isActive()) {
      return;
    }

    await Promise.all(
      COSMETIC_CATEGORIES.map((category) =>
        this.applyCosmetic(category, profile.equipped[category]),
      ),
    );

    this.updateDodoVisuals(0);
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

  private async ensureCosmeticTexture(item: ShopItem): Promise<boolean> {
    const textureKey = getShopItemTextureKey(item);

    if (this.textures.exists(textureKey)) {
      return true;
    }

    const existingPromise = this.cosmeticLoadPromises.get(item.id);

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
      image.src = getShopItemImagePath(item);
    });

    this.cosmeticLoadPromises.set(item.id, loadPromise);
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
    this.cosmeticImageReady.set(category, false);

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

    const imageLoaded = await this.ensureCosmeticTexture(item);

    if (
      !this.scene.isActive() ||
      this.cosmeticRequestVersions.get(category) !== requestVersion ||
      this.equippedCosmeticIds[category] !== itemId
    ) {
      return;
    }

    if (imageLoaded) {
      image
        .setTexture(getShopItemTextureKey(item))
        .setVisible(true);

      fallbackText.setVisible(false);
      this.cosmeticImageReady.set(category, true);
    } else {
      image.setVisible(false);
      fallbackText
        .setText(item.icon)
        .setVisible(true);

      this.cosmeticImageReady.set(category, false);
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

  private updateCosmeticVisuals(
    pose: CosmeticPose,
    placeSprite: (
      sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Text,
      localX: number,
      localY: number,
      localRotation?: number,
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

      if (this.cosmeticImageReady.get(category)) {
        image
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
        );
      }
    }
  }

  private createFlightSounds(): void {
    this.flightSound = this.sound.add(FLIGHT_SOUND_KEY, {
      loop: true,
      volume: FLIGHT_SOUND_VOLUME,
    });

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
      volume: FLAP_SOUND_VOLUME,
    });
  }

  private stopFlightSounds(): void {
    if (this.flightSound?.isPlaying) {
      this.flightSound.stop();
    }

    // Coupe toutes les copies de 1Flap éventuellement encore en cours.
    this.sound.stopByKey(FLAP_SOUND_KEY);
  }

  private destroyFlightSounds(): void {
    this.stopFlightSounds();
    this.flightSound?.destroy();
    this.flightSound = undefined;
  }

  private resetRuntimeState(): void {
    this.gameOver = false;
    this.gamePaused = false;
    this.outOfScreenSince = null;
    this.lastWarningSecond = null;
    this.lastWarningReason = null;
    this.currentAltitude = 0;
    this.currentSpeed = 0;
    this.watermelons = 0;
    this.maxAltitudeSinceTakeoff = 0;
    this.isGrounded = true;
    this.lastHudSignature = '';
    this.pendingLeftFlap = false;
    this.pendingRightFlap = false;
    this.angularVelocity = 0;
    this.leftWingPhase = 0;
    this.rightWingPhase = 0;
    this.leftWingBoostTime = 0;
    this.rightWingBoostTime = 0;
    this.lastAcceptedFlapTime = Number.NEGATIVE_INFINITY;
    this.legAnimationTime = 0;
  }

  private async initializeBestScore(): Promise<void> {
    this.bestAltitude = await loadBestAltitude();
    this.updateGroundRecordText();
    this.emitHud();
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
    if (this.anims.exists(FOREST_MOSQUITO_ANIMATION_KEY)) {
      return;
    }

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

  private createSkyDecor(): void {
    this.createSkyBackground();
    this.backgroundClouds = [];

    for (let index = 0; index < 80; index += 1) {
      const y = START_Y - index * 900 - Phaser.Math.Between(80, 600);
      const x = Phaser.Math.Between(25, GAME_WIDTH - 25);
      const radius = Phaser.Math.Between(18, 42);
      const cloud = this.add.circle(x, y, radius, 0xffffff, 0.28);
      cloud.setScrollFactor(0.82);
      cloud.setDepth(-5);
      this.backgroundClouds.push(cloud);
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
        canvas.width = sourceWidth;
        canvas.height = sourceHeight;
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
            sourceWidth,
            sourceHeight,
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
    const backgroundTopY = backgroundBottomY - sourceHeight * scale;

    if (backgroundTopY > 0) {
      this.add
        .rectangle(
          0,
          0,
          GAME_WIDTH,
          backgroundTopY,
          SKY_BACKGROUND_TOP_FILL_COLOR,
          1,
        )
        .setOrigin(0, 0)
        .setDepth(SKY_BACKGROUND_DEPTH);
    }

    for (let index = 0; index < segmentCount; index += 1) {
      const textureKey = `${SKY_BACKGROUND_TEXTURE_PREFIX}-${index}`;

      if (!this.textures.exists(textureKey)) {
        continue;
      }

      const sourceY = index * SKY_BACKGROUND_SEGMENT_SOURCE_HEIGHT;

      this.add
        .image(GAME_WIDTH / 2, backgroundTopY + sourceY * scale, textureKey)
        .setOrigin(0.5, 0)
        .setScale(scale)
        .setDepth(SKY_BACKGROUND_DEPTH);
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

    const groundScaleX = GAME_WIDTH / GROUND_TEXTURE_SOURCE_WIDTH;
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

  private createGroundForestDecor(): void {
    const initialCameraScrollY = START_Y - GAME_HEIGHT * PLAYER_SCREEN_Y_RATIO;
    const groundScreenY = GROUND_Y - initialCameraScrollY;

    for (const decor of GROUND_FOREST_DECOR) {
      const y =
        groundScreenY +
        initialCameraScrollY * decor.scrollFactor +
        decor.groundOffset;
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
      'RECORD : 0 m',
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
    this.groundRecordValue?.setText(`RECORD : ${this.bestAltitude} m`);
  }

  private createAltitudeObstacles(): void {
    this.obstacleGroup = this.physics.add.group({
      allowGravity: false,
      immovable: true,
    });

    for (const level of ALTITUDE_LEVELS) {
      const maxAltitude = level.maxAltitude ?? MAX_OBSTACLE_ALTITUDE;
      let altitude = level.minAltitude + level.firstObstacleOffset;
      let previousX = GAME_WIDTH / 2;

      while (altitude < maxAltitude) {
        const obstacleKind = this.pickObstacleKind(level);
        const x = this.getObstacleX(obstacleKind, level, previousX);

        const y = this.altitudeToWorldY(altitude);
        const obstacle = this.physics.add.sprite(
          x,
          y,
          obstacleKind.textureKey,
        );
        this.obstacleGroup.add(obstacle);
        const displayWidth = obstacleKind.displayWidth ?? obstacleKind.width;
        const displayHeight = displayWidth * (obstacle.height / obstacle.width);
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
        obstacle.body.setAllowGravity(false);
        obstacle.body.setImmovable(true);
        obstacle.body.setVelocity(0, 0);
        if (obstacleKind.animationKey) {
          obstacle.play(obstacleKind.animationKey);
        }

        if (obstacleKind.id === 'flyingInsect') {
          this.startMosquitoCircle(obstacle, x, y);
        }

        obstacle.body.reset(obstacle.x, obstacle.y);

        previousX = x;
        altitude += Phaser.Math.Between(level.spacingMin, level.spacingMax);
      }
    }
  }

  private startMosquitoCircle(
    mosquito: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody,
    homeX: number,
    homeY: number,
  ): void {
    if (!this.scene.isActive() || !mosquito.active) {
      return;
    }

    const radius = Math.max(mosquito.displayWidth, mosquito.displayHeight);
    const startAngle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const direction = Phaser.Math.Between(0, 1) === 0 ? -1 : 1;
    const circleProgress = { value: 0 };

    this.tweens.add({
      targets: circleProgress,
      value: Math.PI * 2,
      duration: MOSQUITO_CIRCLE_DURATION_MS,
      ease: 'Linear',
      repeat: -1,
      onUpdate: () => {
        const angle = startAngle + circleProgress.value * direction;
        mosquito.setPosition(
          homeX + Math.cos(angle) * radius,
          homeY + Math.sin(angle) * radius,
        );
        mosquito.body.reset(mosquito.x, mosquito.y);
      },
    });
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

      previousX = x;
      y -= Phaser.Math.Between(WATERMELON_MIN_SPACING_Y, WATERMELON_MAX_SPACING_Y);
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

    watermelon.disableBody(true, true);

    this.sound.play(WATERMELON_SOUND_KEY, {
      volume: WATERMELON_SOUND_VOLUME,
    });

    this.watermelons += 1;
    this.emitHud();

    // Chaque pastèque récoltée alimente immédiatement le portefeuille persistant.
    void addWatermelons(1).then((profile) => {
      emitWalletUpdated({ watermelons: profile.watermelons });
    });

    // Petit retour visuel au ramassage.
    const collectedEffect = this.add
      .image(collectedX, collectedY, WATERMELON_TEXTURE_KEY)
      .setScale(collectedScaleX, collectedScaleY)
      .setDepth(WATERMELON_DEPTH + 1);

    this.tweens.add({
      targets: collectedEffect,
      y: collectedY - 35,
      scaleX: collectedScaleX * 1.35,
      scaleY: collectedScaleY * 1.35,
      alpha: 0,
      duration: 240,
      ease: 'Quad.easeOut',
      onComplete: () => collectedEffect.destroy(),
    });
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

    void this.finishGame();
  };

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
    if (!this.gameOver) {
      this.queueFlapFromPointer(pointer);
    }
  }

  private handlePointerMove(): void {
    // Maintenir ou glisser le doigt ne dirige pas le Dodo.
  }

  private handlePointerUp(): void {
    // Le controle se fait au tap : rien a relacher.
  }

  private queueFlapFromPointer(pointer: Phaser.Input.Pointer): void {
    const neutralZone = 18;

    if (pointer.x < GAME_WIDTH / 2 - neutralZone) {
      this.pendingLeftFlap = true;
    } else if (pointer.x > GAME_WIDTH / 2 + neutralZone) {
      this.pendingRightFlap = true;
    }
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
      return direction;
    };

    if (this.pendingLeftFlap || this.pendingRightFlap) {
      const direction = this.getDirectionFromSides(
        this.pendingLeftFlap,
        this.pendingRightFlap,
      );
      this.pendingLeftFlap = false;
      this.pendingRightFlap = false;
      return acceptDirection(direction);
    }

    const leftPressed =
      Phaser.Input.Keyboard.JustDown(this.cursors.left) ||
      Phaser.Input.Keyboard.JustDown(this.keyA);
    const rightPressed =
      Phaser.Input.Keyboard.JustDown(this.cursors.right) ||
      Phaser.Input.Keyboard.JustDown(this.keyD);

    return acceptDirection(this.getDirectionFromSides(leftPressed, rightPressed));
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

  private updateFlight(direction: number, deltaSeconds: number): void {
    const hasFlap = direction !== 0;
    const hasBalancedFlap = direction === 2;

    if (direction === -1 || direction === 1) {
      this.angularVelocity += direction * FLAP_TURN_IMPULSE;
    }

    this.angularVelocity *= Math.exp(-TURN_DAMPING * deltaSeconds);
    this.player.angle *= Math.exp(-AUTO_LEVEL_SPEED * deltaSeconds);

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
      this.player.y = GROUND_Y;
      body.setVelocity(0, 0);
      body.setAcceleration(0, 0);

      if (!hasFlap) {
        return;
      }

      this.isGrounded = false;
      this.maxAltitudeSinceTakeoff = 0;
      this.startFlightSound();
    }

    if (hasFlap) {
      this.playFlapSound();
    }

    // La poussée est orientée dans la direction vers laquelle le Dodo regarde.
    body.setAcceleration(0, GRAVITY_Y);

    if (hasBalancedFlap) {
      body.velocity.x += headingX * FLAP_UPWARD_IMPULSE;
      body.velocity.y += headingY * FLAP_UPWARD_IMPULSE * 1.12;
    } else if (hasFlap) {
      body.velocity.x += headingX * FLAP_UPWARD_IMPULSE + direction * FLAP_SIDE_IMPULSE;
      body.velocity.y += headingY * FLAP_UPWARD_IMPULSE;
    }

    // Plus il va vite, plus son inertie tend à aligner sa trajectoire sur son orientation.
    if (speed > 35) {
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
    this.maxAltitudeSinceTakeoff = 0;
    this.angularVelocity = 0;
    this.player.angle = 0;
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

    const placeSprite = (
      sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Text,
      localX: number,
      localY: number,
      localRotation = 0,
    ): void => {
      sprite.setPosition(
        Math.round(this.player.x + localX * cosine - localY * sine),
        Math.round(this.player.y + localX * sine + localY * cosine),
      );
      sprite.setRotation(rotation + localRotation);
    };

    if (this.isGrounded) {
      this.player.setTexture('dodo-pose-ground');
      this.player.setOrigin(0.5, DODO_GROUND_ORIGIN_Y);
      this.player.setScale(DODO_GROUND_SCALE);
      this.leftWing.setVisible(false);
      this.rightWing.setVisible(false);
      this.flightFeet.setVisible(false);

      this.updateCosmeticVisuals('ground', placeSprite);
      return;
    }

    this.player.setTexture('dodo-body-flight');
    this.player.setOrigin(0.5, DODO_FLIGHT_ORIGIN_Y);
    this.player.setScale(DODO_BODY_SCALE);
    this.leftWing.setVisible(true);
    this.rightWing.setVisible(true);
    this.flightFeet.setVisible(true);

    const leftWingFrame = this.getAnimationFrame(this.leftWingPhase, LEFT_WING_FRAMES);
    const rightWingFrame = this.getAnimationFrame(this.rightWingPhase, RIGHT_WING_FRAMES);

    this.leftWing.setTexture(leftWingFrame);
    this.rightWing.setTexture(rightWingFrame);
    const legFrame =
      this.legAnimationTime > 0
        ? this.getAnimationFrame((this.leftWingPhase + this.rightWingPhase) * 0.5, LEG_FRAMES)
        : LEG_FRAMES[0];
    this.flightFeet.setTexture(legFrame);

    placeSprite(this.leftWing, 0, -20);
    placeSprite(this.rightWing, 0, -20);
    placeSprite(this.flightFeet, 0, 6);

    this.updateCosmeticVisuals('flight', placeSprite);
  }

  private updateCamera(deltaSeconds: number): void {
    const camera = this.cameras.main;
    const desiredScrollY = this.player.y - GAME_HEIGHT * PLAYER_SCREEN_Y_RATIO;
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

    this.emitHud();
  }

  private emitHud(): void {
    const signature = [
      this.currentAltitude,
      this.bestAltitude,
      this.currentSpeed,
      this.watermelons,
    ].join(':');

    if (signature === this.lastHudSignature) {
      return;
    }

    this.lastHudSignature = signature;
    emitFlightHud({
      altitude: this.currentAltitude,
      bestAltitude: this.bestAltitude,
      speed: this.currentSpeed,
      watermelons: this.watermelons,
    });
  }

  private updateCloudVisibility(): void {
    const cameraTop = this.cameras.main.worldView.top;
    const cameraBottom = this.cameras.main.worldView.bottom;

    for (const cloud of this.backgroundClouds) {
      cloud.setVisible(cloud.y > cameraTop - 200 && cloud.y < cameraBottom + 200);
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

  private async finishGame(): Promise<void> {
    if (this.gameOver) {
      return;
    }

    this.gameOver = true;
    this.stopFlightSounds();
    this.angularVelocity = 180;
    this.player.setAcceleration(0, GRAVITY_Y * 1.4);
    this.player.setTint(0xff7777);
    this.leftWing.setTint(0xff7777);
    this.rightWing.setTint(0xff7777);
    this.flightFeet.setTint(0xff7777);

    for (const image of this.cosmeticImages.values()) {
      if (image.visible) {
        image.setTint(0xff7777);
      }
    }

    for (const fallbackText of this.cosmeticFallbackTexts.values()) {
      if (fallbackText.visible) {
        fallbackText.setTint(0xff7777);
      }
    }

    emitFallWarning({ secondsRemaining: null });
    emitGameOver();
    await saveBestAltitude(this.bestAltitude);
  }

  private handleRestartRequest = (): void => {
    this.tweens.resumeAll();
    this.physics.world.resume();
    this.scene.restart();
  };

  private handlePauseRequest = (): void => {
    this.gamePaused = true;
    this.physics.world.pause();
    this.tweens.pauseAll();
    this.stopFlightSounds();
  };

  private handleResumeRequest = (): void => {
    if (this.gameOver) {
      return;
    }

    this.gamePaused = false;
    this.physics.world.resume();
    this.tweens.resumeAll();

    if (!this.isGrounded) {
      this.startFlightSound();
    }
  };
}
