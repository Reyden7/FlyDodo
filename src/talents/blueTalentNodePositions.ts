import type { BlueTalentId } from './blueTalents';
import type { TalentNodePosition } from './talentNodePositions';

export type { TalentNodePosition } from './talentNodePositions';

export const BLUE_FEAST_NODE_POSITION: TalentNodePosition = {
  x: 50,
  y: 6.8,
};

export const BLUE_TALENT_NODE_POSITIONS: Record<
  BlueTalentId,
  Partial<Record<number, TalentNodePosition>>
> = {
  watermelonMagnet: {
    3: { x: 24.06, y: 28 },
    2: { x: 24.06, y: 50 },
    1: { x: 24.06, y: 72 },
  },
  fruitMultiplier: {
    3: { x: 49.47, y: 28 },
    2: { x: 49.47, y: 50 },
    1: { x: 49.47, y: 72 },
  },
  powerTakeoff: {
    1: { x: 74.51, y: 38 },
  },
  chainReaction: {
    1: { x: 74.51, y: 51 },
  },
  fruitDetector: {
    1: { x: 74.51, y: 64 },
  },
  perch: {
    1: { x: 74.51, y: 77 },
  },
};

export function getBlueTalentNodePosition(
  id: BlueTalentId,
  level: number,
): TalentNodePosition {
  return BLUE_TALENT_NODE_POSITIONS[id][level] ?? { x: 50, y: 50 };
}
