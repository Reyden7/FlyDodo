import type { EnduranceTalentId } from './enduranceTalents';
import type { TalentNodePosition } from './talentNodePositions';

export const ENDURANCE_PHOENIX_NODE_POSITION: TalentNodePosition = {
  x: 48,
  y: 3,
};

export const ENDURANCE_TALENT_NODE_POSITIONS: Record<
  EnduranceTalentId,
  Partial<Record<number, TalentNodePosition>>
> = {
  heart: {
    3: { x: 6.5, y: 40 },
    2: { x: 6.5, y: 60 },
    1: { x: 6.5, y: 80 },
  },
  regeneration: {
    1: { x: 33.5, y: 53 },
  },
  shield: {
    1: { x: 63, y: 44 },
  },
  recharge: {
    1: { x: 91, y: 53 },
  },
};

export function getEnduranceTalentNodePosition(
  id: EnduranceTalentId,
  level: number,
): TalentNodePosition {
  return ENDURANCE_TALENT_NODE_POSITIONS[id][level] ?? { x: 50, y: 50 };
}
