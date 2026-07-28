export type EnduranceTalentId = 'heart' | 'shield' | 'regeneration' | 'recharge';

export type EnduranceTalentLevels = Record<EnduranceTalentId, number>;

export interface EnduranceTalentState {
  levels: EnduranceTalentLevels;
  phoenix: boolean;
}

export interface EnduranceTalentStats {
  maxLives: number;
  maxShield: number;
  mosquitoShield: boolean;
  regeneration: boolean;
  shieldRecharge: boolean;
  phoenix: boolean;
}

export interface EnduranceTalentRequirement {
  talentId: EnduranceTalentId;
  level: number;
  label: string;
}

export interface EnduranceTalentDefinition {
  id: EnduranceTalentId;
  title: string;
  icon: string;
  description: string;
  levels: readonly number[];
  costs: readonly number[];
  statLabel: string;
  requirement?: EnduranceTalentRequirement;
}

export const ENDURANCE_TALENT_MAX_LEVEL_BY_ID = {
  heart: 3,
  shield: 1,
  regeneration: 1,
  recharge: 1,
} as const satisfies Record<EnduranceTalentId, number>;

export const ENDURANCE_PHOENIX_COST = 100;

export const ENDURANCE_TALENTS: readonly EnduranceTalentDefinition[] = [
  {
    id: 'heart',
    title: 'Coeur',
    icon: '/assets/competences/Endurance/coeur.webp',
    description: 'Ajoute une vie au dodo pour survivre plus longtemps.',
    levels: [2, 3, 4],
    costs: [10, 25, 40],
    statLabel: 'Vies',
  },
  {
    id: 'regeneration',
    title: 'Regeneration',
    icon: '/assets/competences/Endurance/Regen.webp',
    description:
      'Regagne une vie apres 7 secondes sans subir de degats.',
    levels: [1],
    costs: [50],
    statLabel: 'Soin',
    requirement: {
      talentId: 'heart',
      level: 1,
      label: '2 vies requises',
    },
  },
  {
    id: 'shield',
    title: 'Bouclier',
    icon: '/assets/competences/Endurance/bouclier.webp',
    description:
      'Ajoute un bouclier qui bloque les moustiques du niveau Forest.',
    levels: [1],
    costs: [30],
    statLabel: 'Bouclier',
    requirement: {
      talentId: 'heart',
      level: 2,
      label: '3 vies requises',
    },
  },
  {
    id: 'recharge',
    title: 'Recharge',
    icon: '/assets/competences/Endurance/Recharge.webp',
    description:
      'Repare le bouclier 10 secondes apres sa destruction.',
    levels: [1],
    costs: [55],
    statLabel: 'Recharge',
    requirement: {
      talentId: 'shield',
      level: 1,
      label: 'Bouclier requis',
    },
  },
] as const;

export const ENDURANCE_PHOENIX_TALENT = {
  id: 'phoenix',
  title: 'Phoenix',
  icon: '/assets/competences/Endurance/phoenix.webp',
  description:
    'Une fois par partie, le dodo renait la ou il est mort avec ses vies et son bouclier.',
  cost: ENDURANCE_PHOENIX_COST,
} as const;

export function createEmptyEnduranceTalentState(): EnduranceTalentState {
  return {
    levels: {
      heart: 0,
      shield: 0,
      regeneration: 0,
      recharge: 0,
    },
    phoenix: false,
  };
}

export function normalizeEnduranceTalentState(
  value: unknown,
): EnduranceTalentState {
  const empty = createEmptyEnduranceTalentState();

  if (!value || typeof value !== 'object') {
    return empty;
  }

  const source = value as Partial<EnduranceTalentState>;
  const levelSource =
    source.levels && typeof source.levels === 'object' ? source.levels : {};

  const normalizeLevel = (id: EnduranceTalentId): number => {
    const level = (levelSource as Partial<EnduranceTalentLevels>)[id];
    const maxLevel = ENDURANCE_TALENT_MAX_LEVEL_BY_ID[id];

    return typeof level === 'number' && Number.isFinite(level)
      ? Math.max(0, Math.min(maxLevel, Math.floor(level)))
      : 0;
  };

  return {
    levels: {
      heart: normalizeLevel('heart'),
      shield: normalizeLevel('shield'),
      regeneration: normalizeLevel('regeneration'),
      recharge: normalizeLevel('recharge'),
    },
    phoenix: source.phoenix === true,
  };
}

export function cloneEnduranceTalentState(
  state: EnduranceTalentState,
): EnduranceTalentState {
  return {
    levels: { ...state.levels },
    phoenix: state.phoenix,
  };
}

export function getEnduranceTalentDefinition(
  id: EnduranceTalentId,
): EnduranceTalentDefinition {
  return ENDURANCE_TALENTS.find((talent) => talent.id === id)!;
}

export function isEnduranceTalentUnlocked(
  state: EnduranceTalentState,
  definition: EnduranceTalentDefinition,
): boolean {
  if (!definition.requirement) {
    return true;
  }

  return (
    state.phoenix ||
    state.levels[definition.requirement.talentId] >= definition.requirement.level
  );
}

export function areAllEnduranceTalentsMaxed(
  state: EnduranceTalentState,
): boolean {
  return ENDURANCE_TALENTS.every(
    (talent) =>
      state.levels[talent.id] >= ENDURANCE_TALENT_MAX_LEVEL_BY_ID[talent.id],
  );
}

export function canRefundEnduranceTalentLevel(
  state: EnduranceTalentState,
  talentId: EnduranceTalentId,
): boolean {
  if (state.phoenix || state.levels[talentId] <= 0) {
    return false;
  }

  const projected: EnduranceTalentState = {
    ...state,
    levels: {
      ...state.levels,
      [talentId]: state.levels[talentId] - 1,
    },
  };

  return ENDURANCE_TALENTS.every((talent) => {
    if (projected.levels[talent.id] <= 0 || !talent.requirement) {
      return true;
    }

    return (
      projected.levels[talent.requirement.talentId] >= talent.requirement.level
    );
  });
}

export function getEnduranceTalentStats(
  state: EnduranceTalentState,
): EnduranceTalentStats {
  const heartLevel = state.phoenix
    ? ENDURANCE_TALENT_MAX_LEVEL_BY_ID.heart
    : state.levels.heart;
  const shieldLevel = state.phoenix ? 1 : state.levels.shield;

  return {
    maxLives: 1 + heartLevel,
    maxShield: shieldLevel > 0 ? 1 : 0,
    mosquitoShield: shieldLevel > 0,
    regeneration: state.phoenix || state.levels.regeneration > 0,
    shieldRecharge: state.phoenix || state.levels.recharge > 0,
    phoenix: state.phoenix,
  };
}
