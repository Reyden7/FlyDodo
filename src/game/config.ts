import Phaser from 'phaser';
import { GameplayScene } from './scenes/GameplayScene';

export const GAME_WIDTH = 390;
export const GAME_HEIGHT = 844;

export function createGameConfig(parent: HTMLElement): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.WEBGL,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#73d8ff',
    transparent: false,
    pixelArt: false,
    antialias: true,
    roundPixels: true,
    physics: {
      default: 'arcade',
      arcade: {
        debug: false,
      },
    },
    scale: {
      /*
       * FIT laissait des bandes lorsque le ratio du téléphone ne correspondait
       * pas exactement au format logique 390 × 844.
       *
       * ENVELOP conserve les proportions du jeu mais agrandit le canvas jusqu'à
       * couvrir entièrement l'écran. Seule une petite partie hors cadre est
       * rognée sur les téléphones dont le ratio diffère.
       */
      mode: Phaser.Scale.ENVELOP,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
    },
    input: {
      activePointers: 3,
      touch: {
        capture: true,
      },
    },
    scene: [GameplayScene],
  };
}
