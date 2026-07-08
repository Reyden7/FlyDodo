import type { ControlTalentId } from './controlTalents';
import type { TalentNodePosition } from './talentNodePositions';

export const CONTROL_MASTER_NODE_POSITION: TalentNodePosition = {
  x: 48,
  y: 3,
};

export const CONTROL_TALENT_NODE_POSITIONS: Record<
  ControlTalentId,
  Partial<Record<number, TalentNodePosition>>
> = {
  lift: {
    4: { x: 8, y: 38 },
    3: { x: 8, y: 52 },
    2: { x: 8, y: 65 },
    1: { x: 8, y: 82 },
  },
  rotation: {
    4: { x: 34, y: 38 },
    3: { x: 34, y: 52 },
    2: { x: 34, y: 65 },
    1: { x: 34, y: 82 },
  },
  gyroscope: {
    4: { x: 62, y: 38 },
    3: { x: 62, y: 52 },
    2: { x: 62, y: 65 },
    1: { x: 62, y: 82 },
  },
  wing: {
    4: { x: 91, y: 38 },
    3: { x: 91, y: 52 },
    2: { x: 91, y: 65 },
    1: { x: 91, y: 82 },
  },
};

export function getControlTalentNodePosition(
  id: ControlTalentId,
  level: number,
): TalentNodePosition {
  return CONTROL_TALENT_NODE_POSITIONS[id][level] ?? { x: 50, y: 50 };
}
