import type { ControlTalentId } from './controlTalents';
import type { TalentNodePosition } from './talentNodePositions';

export const CONTROL_MASTER_NODE_POSITION: TalentNodePosition = {
  x: 50,
  y: 4,
};

export const CONTROL_TALENT_NODE_POSITIONS: Record<
  ControlTalentId,
  Partial<Record<number, TalentNodePosition>>
> = {
  lift: {
    4: { x: 15, y: 18 },
    3: { x: 15, y: 40 },
    2: { x: 15, y: 61 },
    1: { x: 15, y: 82 },
  },
  rotation: {
    4: { x: 38, y: 18 },
    3: { x: 38, y: 40 },
    2: { x: 38, y: 61 },
    1: { x: 38, y: 82 },
  },
  gyroscope: {
    4: { x: 62, y: 18 },
    3: { x: 62, y: 40 },
    2: { x: 62, y: 61 },
    1: { x: 62, y: 82 },
  },
  wing: {
    4: { x: 86, y: 18 },
    3: { x: 86, y: 40 },
    2: { x: 86, y: 61 },
    1: { x: 86, y: 82 },
  },
};

export function getControlTalentNodePosition(
  id: ControlTalentId,
  level: number,
): TalentNodePosition {
  return CONTROL_TALENT_NODE_POSITIONS[id][level] ?? { x: 50, y: 50 };
}
