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
const START_Y = 98_800;
const GROUND_Y = START_Y;

const PLAYER_SCREEN_Y_RATIO = 0.79;
const CAMERA_FOLLOW_SPEED = 4.2;

const GRAVITY_Y = 500;
const FLAP_UPWARD_IMPULSE = 155;
const FLAP_SIDE_IMPULSE = 20;
const MAX_HORIZONTAL_SPEED = 300;
const MAX_VERTICAL_SPEED = 450;
const VELOCITY_ALIGNMENT = 0.62;

const FLAP_TURN_IMPULSE = 112;
const MAX_TURN_RATE = 112;
const TURN_DAMPING = 5.2;
const AUTO_LEVEL_SPEED = 0.52;

const BASE_WING_BEATS_PER_SECOND = 4.8;
const FAST_WING_MULTIPLIER = 1.85;
const SLOW_WING_MULTIPLIER = 0.78;
const FLAP_WING_BOOST_DURATION = 0.22;
const FLAP_WING_BOOST_MULTIPLIER = 3.4;

const FALL_LIMIT_BELOW_CAMERA = 55;
const GAME_OVER_DELAY_MS = 5_000;
const PIXELS_PER_METRE_PER_SECOND = 82;
const SAFE_GROUND_TOUCH_ALTITUDE = 20;

export class GameplayScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Image;
  private leftWing!: Phaser.GameObjects.Image;
  private rightWing!: Phaser.GameObjects.Image;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;

  private pendingFlapDirection = 0;
  private angularVelocity = 0;
  private leftWingPhase = 0;
  private rightWingPhase = Math.PI;
  private leftWingBoostTime = 0;
  private rightWingBoostTime = 0;

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
  private lastHudSignature = '';
  private backgroundClouds: Phaser.GameObjects.Arc[] = [];

  constructor() {
    super('GameplayScene');
  }

  create(): void {
    this.resetRuntimeState();

    this.physics.world.setBounds(0, 0, GAME_WIDTH, WORLD_HEIGHT);
    this.physics.world.gravity.y = 0;

    this.createPlaceholderTextures();
    this.createSkyDecor();

    this.leftWing = this.add.image(GAME_WIDTH / 2, START_Y, 'dodo-wing-left');
    this.rightWing = this.add.image(GAME_WIDTH / 2, START_Y, 'dodo-wing-right');
    this.leftWing.setOrigin(1, 0.5).setDepth(9);
    this.rightWing.setOrigin(0, 0.5).setDepth(9);

    this.player = this.physics.add.image(GAME_WIDTH / 2, START_Y, 'dodo-body-front');
    this.player.setDepth(10);
    this.player.setCollideWorldBounds(true);
    this.player.setVelocity(0, 0);
    this.player.setMaxVelocity(MAX_HORIZONTAL_SPEED, MAX_VERTICAL_SPEED);
    this.player.body?.setSize(38, 58, true);

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
      return;
    }

    const direction = this.consumeFlapDirection();
    this.updateFlight(direction, deltaSeconds);
    this.updateGroundContact();
    this.updateWingBeats(direction, deltaSeconds);
    this.updateDodoVisuals(deltaSeconds);
    this.updateCamera(deltaSeconds);
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
    this.currentAltitude = 0;
    this.currentSpeed = 0;
    this.maxAltitudeSinceTakeoff = 0;
    this.isGrounded = true;
    this.lastHudSignature = '';
    this.pendingFlapDirection = 0;
    this.angularVelocity = 0;
    this.leftWingPhase = 0;
    this.rightWingPhase = Math.PI;
    this.leftWingBoostTime = 0;
    this.rightWingBoostTime = 0;
  }

  private async initializeBestScore(): Promise<void> {
    this.bestAltitude = await loadBestAltitude();
    this.emitHud();
  }

  private createPlaceholderTextures(): void {
    if (this.textures.exists('dodo-body-front')) {
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
      this.pendingFlapDirection = -1;
    } else if (pointer.x > GAME_WIDTH / 2 + neutralZone) {
      this.pendingFlapDirection = 1;
    } else {
      this.pendingFlapDirection = 0;
    }
  }

  private consumeFlapDirection(): number {
    if (this.pendingFlapDirection !== 0) {
      const direction = this.pendingFlapDirection;
      this.pendingFlapDirection = 0;
      return direction;
    }

    if (
      Phaser.Input.Keyboard.JustDown(this.cursors.left) ||
      Phaser.Input.Keyboard.JustDown(this.keyA)
    ) {
      return -1;
    }

    if (
      Phaser.Input.Keyboard.JustDown(this.cursors.right) ||
      Phaser.Input.Keyboard.JustDown(this.keyD)
    ) {
      return 1;
    }

    return 0;
  }

  private updateFlight(direction: number, deltaSeconds: number): void {
    if (direction !== 0) {
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

      if (direction === 0) {
        return;
      }

      this.isGrounded = false;
      this.maxAltitudeSinceTakeoff = 0;
    }

    // La poussée est orientée dans la direction vers laquelle le Dodo regarde.
    body.setAcceleration(0, GRAVITY_Y);

    if (direction !== 0) {
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
  }

  private updateWingBeats(direction: number, deltaSeconds: number): void {
    let leftMultiplier = 1;
    let rightMultiplier = 1;

    // Tourner à droite = l'aile gauche bat plus vite.
    if (direction > 0) {
      this.leftWingBoostTime = FLAP_WING_BOOST_DURATION;
      this.leftWingPhase += Math.PI * 0.34;
      rightMultiplier = SLOW_WING_MULTIPLIER;
    }

    // Tourner à gauche = l'aile droite bat plus vite.
    if (direction < 0) {
      leftMultiplier = SLOW_WING_MULTIPLIER;
      this.rightWingBoostTime = FLAP_WING_BOOST_DURATION;
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
  }

  private updateDodoVisuals(_deltaSeconds: number): void {
    const rotation = this.player.rotation;
    const cosine = Math.cos(rotation);
    const sine = Math.sin(rotation);

    const placeWing = (
      wing: Phaser.GameObjects.Image,
      localX: number,
      localY: number,
      localRotation: number,
    ): void => {
      wing.setPosition(
        this.player.x + localX * cosine - localY * sine,
        this.player.y + localX * sine + localY * cosine,
      );
      wing.setRotation(rotation + localRotation);
    };

    const leftFlap = Math.sin(this.leftWingPhase);
    const rightFlap = Math.sin(this.rightWingPhase);

    placeWing(
      this.leftWing,
      -20,
      6,
      Phaser.Math.DegToRad(8 + leftFlap * 28),
    );
    placeWing(
      this.rightWing,
      20,
      6,
      Phaser.Math.DegToRad(-8 - rightFlap * 28),
    );
  }

  private updateCamera(deltaSeconds: number): void {
    const camera = this.cameras.main;
    const desiredScrollY = this.player.y - GAME_HEIGHT * PLAYER_SCREEN_Y_RATIO;

    // La caméra peut monter, mais elle ne redescend jamais avec le Dodo.
    if (desiredScrollY < camera.scrollY) {
      const smoothing = 1 - Math.exp(-CAMERA_FOLLOW_SPEED * deltaSeconds);
      camera.scrollY = Phaser.Math.Linear(camera.scrollY, desiredScrollY, smoothing);
    }
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

    if (!playerIsBelowScreen) {
      if (this.outOfScreenSince !== null) {
        this.outOfScreenSince = null;
        this.lastWarningSecond = null;
        emitFallWarning({ secondsRemaining: null });
      }
      return;
    }

    if (this.outOfScreenSince === null) {
      this.outOfScreenSince = time;
    }

    const elapsed = time - this.outOfScreenSince;
    const secondsRemaining = Math.max(0, Math.ceil((GAME_OVER_DELAY_MS - elapsed) / 1000));

    if (secondsRemaining !== this.lastWarningSecond) {
      this.lastWarningSecond = secondsRemaining;
      emitFallWarning({ secondsRemaining });
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
    emitFallWarning({ secondsRemaining: null });
    emitGameOver();
    await saveBestAltitude(this.bestAltitude);
  }

  private handleRestartRequest = (): void => {
    this.scene.restart();
  };
}
