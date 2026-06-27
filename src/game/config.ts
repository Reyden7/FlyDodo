import Phaser from 'phaser';
import { GameplayScene } from './scenes/GameplayScene';

export const GAME_WIDTH = 390;
export const GAME_HEIGHT = 844;

export function createGameConfig(parent: HTMLElement): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.CANVAS,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#73d8ff',
    transparent: false,
    pixelArt: false,
    antialias: true,
    physics: {
      default: 'arcade',
      arcade: {
        debug: false,
      },
    },
    scale: {
      mode: Phaser.Scale.FIT,
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
