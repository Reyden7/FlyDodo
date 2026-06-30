import Phaser from 'phaser';
import {
  emitFallWarning,
  emitFlightHud,
  emitGameOver,
  gameEvents,
} from '../events';
import { loadBestAltitude, saveBestAltitude } from '../../services/saveService';

const GAME_WIDTH = 390;
const GAME_HEIGHT = 844;
const WORLD_HEIGHT = 100_000;
const START_Y = 99_800;
const GROUND_Y = START_Y;
const DODO_BODY_SCALE = 0.125;
const DODO_GROUND_SCALE = 0.1;
const DODO_WING_SCALE = 0.14;
const DODO_FLIGHT_ORIGIN_Y = 0.75;
const DODO_GROUND_ORIGIN_Y = 0.58;
const DODO_FLIGHT_FEET_SCALE_X = 0.3;
const DODO_FLIGHT_FEET_SCALE_Y = 0.350;
const DODO_INDICATOR_SCALE = 0.045;

const PLAYER_SCREEN_Y_RATIO = 0.88;
const CAMERA_FOLLOW_SPEED = 4.2;
const CAMERA_FALL_FOLLOW_SPEED = 1.15;
const CAMERA_MAX_FALL_CATCHUP = 360;

const GRAVITY_Y = 800;
const FLAP_UPWARD_IMPULSE = 155;
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
const GROUND_TEXTURE_SOURCE_WIDTH = 2172;
const GROUND_TEXTURE_SOURCE_HEIGHT = 724;
const GROUND_TEXTURE_CROP_TOP = 150;
const GROUND_TEXTURE_SURFACE_Y = 236;
const GROUND_VISUAL_Y_OFFSET = 2;

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

  private pendingLeftFlap = false;
  private pendingRightFlap = false;
  private angularVelocity = 0;
  private leftWingPhase = 0;
  private rightWingPhase = 0;
  private leftWingBoostTime = 0;
  private rightWingBoostTime = 0;
  private legAnimationTime = 0;

  private startAltitudeY = START_Y;
  private bestAltitude = 0;
  private currentAltitude = 0;
  private currentSpeed = 0;
  private watermelons = 0;
  private maxAltitudeSinceTakeoff = 0;
  private isGrounded = true;

  private gameOver = false;
  private outOfScreenSince: number | null = null;
  private lastWarningSecond: number | null = null;
  private lastWarningReason: 'fall' | 'side' | null = null;
  private lastHudSignature = '';
  private backgroundClouds: Phaser.GameObjects.Arc[] = [];
  private offscreenIndicator!: Phaser.GameObjects.Container;
  private offscreenIndicatorBody!: Phaser.GameObjects.Image;

  constructor() {
    super('GameplayScene');
  }

  preload(): void {
    this.load.image(GROUND_TEXTURE_KEY, GROUND_TEXTURE_PATH);
    this.load.image('dodo-body', '/assets/dodo/optimized/body.png');
    this.load.image('dodo-body-flight', '/assets/dodo/optimized/flight_refined/body_flight.png');
    this.load.image('dodo-pose-flight', '/assets/dodo/optimized/flight.png');
    this.load.image('dodo-pose-ground', '/assets/dodo/optimized/flight_refined/ground.png');

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

    this.physics.world.setBounds(0, 0, GAME_WIDTH, WORLD_HEIGHT);
    this.physics.world.gravity.y = 0;

    this.createPlaceholderTextures();
    this.createSkyDecor();
    this.createGroundDecor();

    this.leftWing = this.add.image(GAME_WIDTH / 2, START_Y, LEFT_WING_FRAMES[0]);
    this.rightWing = this.add.image(GAME_WIDTH / 2, START_Y, RIGHT_WING_FRAMES[0]);
    this.leftWing.setOrigin(0.5, 0.92).setScale(DODO_WING_SCALE).setDepth(8);
    this.rightWing.setOrigin(0.5, 0.92).setScale(DODO_WING_SCALE).setDepth(8);

    this.player = this.physics.add.image(GAME_WIDTH / 2, START_Y, 'dodo-pose-ground');
    this.player.setOrigin(0.5, DODO_GROUND_ORIGIN_Y);
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

    this.createOffscreenIndicator();

    const camera = this.cameras.main;
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

    void this.initializeBestScore();
    this.updateDodoVisuals(0);
  }

  update(time: number, delta: number): void {
    const deltaSeconds = Math.min(delta / 1000, 0.034);

    if (this.gameOver) {
      this.updateDodoVisuals(deltaSeconds);
      this.updateOffscreenIndicator();
      return;
    }

    const direction = this.consumeFlapDirection();
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
    this.input.off('pointerdown', this.handlePointerDown, this);
    this.input.off('pointermove', this.handlePointerMove, this);
    this.input.off('pointerup', this.handlePointerUp, this);
    this.input.off('pointerupoutside', this.handlePointerUp, this);
    gameEvents.removeEventListener('flydodo:restart-request', this.handleRestartRequest);
  }

  private resetRuntimeState(): void {
    this.gameOver = false;
    this.outOfScreenSince = null;
    this.lastWarningSecond = null;
    this.lastWarningReason = null;
    this.currentAltitude = 0;
    this.currentSpeed = 0;
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
    this.legAnimationTime = 0;
  }

  private async initializeBestScore(): Promise<void> {
    this.bestAltitude = await loadBestAltitude();
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

  private createSkyDecor(): void {
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
    ground.setOrigin(0.5, 0);
    ground.setScale(groundScaleX, groundScaleY);
    ground.setDepth(-4);
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

  private consumeFlapDirection(): number {
    if (this.pendingLeftFlap || this.pendingRightFlap) {
      const direction = this.getDirectionFromSides(
        this.pendingLeftFlap,
        this.pendingRightFlap,
      );
      this.pendingLeftFlap = false;
      this.pendingRightFlap = false;
      return direction;
    }

    const leftPressed =
      Phaser.Input.Keyboard.JustDown(this.cursors.left) ||
      Phaser.Input.Keyboard.JustDown(this.keyA);
    const rightPressed =
      Phaser.Input.Keyboard.JustDown(this.cursors.right) ||
      Phaser.Input.Keyboard.JustDown(this.keyD);

    return this.getDirectionFromSides(leftPressed, rightPressed);
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
      this.leftWingPhase += Math.PI * 0.28;
      this.rightWingPhase = this.leftWingPhase;
    }

    // Tourner à droite = l'aile gauche bat plus vite.
    if (direction === 1) {
      this.leftWingBoostTime = FLAP_WING_BOOST_DURATION;
      this.legAnimationTime = FLAP_LEG_ANIMATION_DURATION;
      this.leftWingPhase += Math.PI * 0.34;
      rightMultiplier = SLOW_WING_MULTIPLIER;
    }

    // Tourner à gauche = l'aile droite bat plus vite.
    if (direction < 0) {
      leftMultiplier = SLOW_WING_MULTIPLIER;
      this.rightWingBoostTime = FLAP_WING_BOOST_DURATION;
      this.legAnimationTime = FLAP_LEG_ANIMATION_DURATION;
      this.rightWingPhase += Math.PI * 0.34;
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
      sprite: Phaser.GameObjects.Image,
      localX: number,
      localY: number,
      localRotation = 0,
    ): void => {
      sprite.setPosition(
        this.player.x + localX * cosine - localY * sine,
        this.player.y + localX * sine + localY * cosine,
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

    // La camera suit vite la montee, puis redescend doucement pour laisser une recuperation.
    const followSpeed =
      clampedDesiredScrollY < camera.scrollY ? CAMERA_FOLLOW_SPEED : CAMERA_FALL_FOLLOW_SPEED;
    const smoothing = 1 - Math.exp(-followSpeed * deltaSeconds);
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
    this.angularVelocity = 180;
    this.player.setAcceleration(0, GRAVITY_Y * 1.4);
    this.player.setTint(0xff7777);
    this.leftWing.setTint(0xff7777);
    this.rightWing.setTint(0xff7777);
    this.flightFeet.setTint(0xff7777);
    emitFallWarning({ secondsRemaining: null });
    emitGameOver();
    await saveBestAltitude(this.bestAltitude);
  }

  private handleRestartRequest = (): void => {
    this.scene.restart();
  };
}
