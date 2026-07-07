import type { EnduranceTalentId } from './enduranceTalents';
import type { TalentNodePosition } from './talentNodePositions';

export const ENDURANCE_PHOENIX_NODE_POSITION: TalentNodePosition = {
  x: 50,
  y: 4,
};

export const ENDURANCE_TALENT_NODE_POSITIONS: Record<
  EnduranceTalentId,
  Partial<Record<number, TalentNodePosition>>
> = {
  heart: {
    3: { x: 15, y: 26 },
    2: { x: 15, y: 50 },
    1: { x: 15, y: 73 },
  },
  regeneration: {
    1: { x: 38, y: 53 },
  },
  shield: {
    1: { x: 62, y: 43 },
  },
  recharge: {
    1: { x: 86, y: 53 },
  },
};

export function getEnduranceTalentNodePosition(
  id: EnduranceTalentId,
  level: number,
): TalentNodePosition {
  return ENDURANCE_TALENT_NODE_POSITIONS[id][level] ?? { x: 50, y: 50 };
}
