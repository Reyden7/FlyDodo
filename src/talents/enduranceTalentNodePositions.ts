import type { EnduranceTalentId } from './enduranceTalents';
import type { TalentNodePosition } from './talentNodePositions';

export const ENDURANCE_PHOENIX_NODE_POSITION: TalentNodePosition = {
  x: 50,
  y: 6.8,
};

export const ENDURANCE_TALENT_NODE_POSITIONS: Record<
  EnduranceTalentId,
  Partial<Record<number, TalentNodePosition>>
> = {
  heart: {
    3: { x: 20.95, y: 40 },
    2: { x: 20.95, y: 60 },
    1: { x: 20.95, y: 80 },
  },
  regeneration: {
    1: { x: 38.86, y: 53 },
  },
  shield: {
    1: { x: 58.65, y: 44 },
  },
  recharge: {
    1: { x: 77.81, y: 53 },
  },
};

export function getEnduranceTalentNodePosition(
  id: EnduranceTalentId,
  level: number,
): TalentNodePosition {
  return ENDURANCE_TALENT_NODE_POSITIONS[id][level] ?? { x: 50, y: 50 };
}
