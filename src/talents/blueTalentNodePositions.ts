import type { BlueTalentId } from './blueTalents';
import type { TalentNodePosition } from './talentNodePositions';

export type { TalentNodePosition } from './talentNodePositions';

export const BLUE_FEAST_NODE_POSITION: TalentNodePosition = {
  x: 49,
  y: 3,
};

export const BLUE_TALENT_NODE_POSITIONS: Record<
  BlueTalentId,
  Partial<Record<number, TalentNodePosition>>
> = {
  watermelonMagnet: {
    3: { x: 10, y: 28 },
    2: { x: 10, y: 50 },
    1: { x: 10, y: 72 },
  },
  fruitMultiplier: {
    3: { x: 49, y: 28 },
    2: { x: 49, y: 50 },
    1: { x: 49, y: 72 },
  },
  powerTakeoff: {
    1: { x: 86, y: 38 },
  },
  chainReaction: {
    1: { x: 86, y: 51 },
  },
  fruitDetector: {
    1: { x: 86, y: 64 },
  },
  perch: {
    1: { x: 86, y: 77 },
  },
};

export function getBlueTalentNodePosition(
  id: BlueTalentId,
  level: number,
): TalentNodePosition {
  return BLUE_TALENT_NODE_POSITIONS[id][level] ?? { x: 50, y: 50 };
}
