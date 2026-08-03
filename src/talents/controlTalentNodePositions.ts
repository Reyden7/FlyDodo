import type { ControlTalentId } from './controlTalents';
import type { TalentNodePosition } from './talentNodePositions';

export const CONTROL_MASTER_NODE_POSITION: TalentNodePosition = {
  x: 50,
  y: 6.8,
};

export const CONTROL_TALENT_NODE_POSITIONS: Record<
  ControlTalentId,
  Partial<Record<number, TalentNodePosition>>
> = {
  lift: {
    4: { x: 20.95, y: 38 },
    3: { x: 20.95, y: 52 },
    2: { x: 20.95, y: 67 },
    1: { x: 20.95, y: 82 },
  },
  rotation: {
    4: { x: 38.86, y: 38 },
    3: { x: 38.86, y: 52 },
    2: { x: 38.86, y: 67 },
    1: { x: 38.86, y: 82 },
  },
  gyroscope: {
    4: { x: 58.65, y: 38 },
    3: { x: 58.65, y: 52 },
    2: { x: 58.65, y: 67 },
    1: { x: 58.65, y: 82 },
  },
  wing: {
    4: { x: 77.81, y: 38 },
    3: { x: 77.81, y: 52 },
    2: { x: 77.81, y: 67 },
    1: { x: 77.81, y: 82 },
  },
};

export function getControlTalentNodePosition(
  id: ControlTalentId,
  level: number,
): TalentNodePosition {
  return CONTROL_TALENT_NODE_POSITIONS[id][level] ?? { x: 50, y: 50 };
}
