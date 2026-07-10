export type BlueTalentId =
  | 'watermelonMagnet'
  | 'fruitMultiplier'
  | 'perch'
  | 'fruitDetector'
  | 'chainReaction'
  | 'powerTakeoff';

export type BlueTalentLevels = Record<BlueTalentId, number>;

export interface BlueTalentState {
  levels: BlueTalentLevels;
  feast: boolean;
}

export interface BlueTalentStats {
  watermelonMagnetLevel: number;
  watermelonBonus: number;
  branchPerch: boolean;
  fruitDetector: boolean;
  chainReaction: boolean;
  powerTakeoff: boolean;
  feast: boolean;
}

export interface BlueTalentRequirement {
  talentId: BlueTalentId;
  level: number;
  label: string;
}

export interface BlueTalentDefinition {
  id: BlueTalentId;
  title: string;
  icon: string;
  description: string;
  levels: readonly number[];
  costs: readonly number[];
  statLabel: string;
  requirement?: BlueTalentRequirement;
}

export const BLUE_TALENT_MAX_LEVEL_BY_ID = {
  watermelonMagnet: 3,
  fruitMultiplier: 3,
  perch: 1,
  fruitDetector: 1,
  chainReaction: 1,
  powerTakeoff: 1,
} as const satisfies Record<BlueTalentId, number>;

export const BLUE_FEAST_COST = 180;

export const BLUE_TALENTS: readonly BlueTalentDefinition[] = [
  {
    id: 'watermelonMagnet',
    title: 'Aimant a pasteque',
    icon: '/assets/competences/Talents/aimantPasteque.png',
    description:
      "Augmente le rayon d'attraction de l'objet aimant a pasteque.",
    levels: [150, 300, 500],
    costs: [35, 55, 80],
    statLabel: 'Rayon',
  },
  {
    id: 'fruitMultiplier',
    title: 'Multiplicateur fruite',
    icon: '/assets/competences/Talents/multiplicateurFruit.png',
    description:
      'Ajoute des pasteques bonus a chaque pasteque ramassee par le dodo.',
    levels: [1, 2, 3],
    costs: [35, 55, 80],
    statLabel: 'Bonus',
  },
  {
    id: 'perch',
    title: 'Perchoir',
    icon: '/assets/competences/Talents/perchoir.png',
    description:
      'Permet au dodo de se poser sur les branches du niveau Forest en arrivant par le dessus.',
    levels: [1],
    costs: [70],
    statLabel: 'Pose',
  },
  {
    id: 'fruitDetector',
    title: 'Detecteur de fruit',
    icon: '/assets/competences/Talents/D%C3%A9tecteur%20de%20fruit.png',
    description:
      'Ajoute un bouton qui affiche une fleche vers la prochaine pasteque.',
    levels: [1],
    costs: [65],
    statLabel: 'Radar',
  },
  {
    id: 'chainReaction',
    title: 'Reaction en chaine',
    icon: '/assets/competences/Talents/reactionEnChaine.png',
    description:
      "Multiplie les prochaines pasteques par 2 apres deux collectes d'affilee sans en manquer.",
    levels: [1],
    costs: [80],
    statLabel: 'Combo',
  },
  {
    id: 'powerTakeoff',
    title: 'Decollage puissant',
    icon: '/assets/competences/Talents/decolagepuissant.png',
    description:
      "Double la puissance du premier battement quand le dodo decolle depuis une branche.",
    levels: [1],
    costs: [90],
    statLabel: 'Depart',
    requirement: {
      talentId: 'perch',
      level: 1,
      label: 'Perchoir requis',
    },
  },
] as const;

export const BLUE_FEAST_TALENT = {
  id: 'feast',
  title: 'Festin',
  icon: '/assets/competences/Talents/festin.png',
  description:
    "Attire toutes les pasteques visibles a l'ecran directement vers le dodo.",
  cost: BLUE_FEAST_COST,
} as const;

export function createEmptyBlueTalentState(): BlueTalentState {
  return {
    levels: {
      watermelonMagnet: 0,
      fruitMultiplier: 0,
      perch: 0,
      fruitDetector: 0,
      chainReaction: 0,
      powerTakeoff: 0,
    },
    feast: false,
  };
}

export function normalizeBlueTalentState(value: unknown): BlueTalentState {
  const empty = createEmptyBlueTalentState();

  if (!value || typeof value !== 'object') {
    return empty;
  }

  const source = value as Partial<BlueTalentState>;
  const levelSource =
    source.levels && typeof source.levels === 'object' ? source.levels : {};

  const normalizeLevel = (id: BlueTalentId): number => {
    const level = (levelSource as Partial<BlueTalentLevels>)[id];
    const maxLevel = BLUE_TALENT_MAX_LEVEL_BY_ID[id];

    return typeof level === 'number' && Number.isFinite(level)
      ? Math.max(0, Math.min(maxLevel, Math.floor(level)))
      : 0;
  };

  return {
    levels: {
      watermelonMagnet: normalizeLevel('watermelonMagnet'),
      fruitMultiplier: normalizeLevel('fruitMultiplier'),
      perch: normalizeLevel('perch'),
      fruitDetector: normalizeLevel('fruitDetector'),
      chainReaction: normalizeLevel('chainReaction'),
      powerTakeoff: normalizeLevel('powerTakeoff'),
    },
    feast: source.feast === true,
  };
}

export function cloneBlueTalentState(state: BlueTalentState): BlueTalentState {
  return {
    levels: { ...state.levels },
    feast: state.feast,
  };
}

export function getBlueTalentDefinition(
  id: BlueTalentId,
): BlueTalentDefinition {
  return BLUE_TALENTS.find((talent) => talent.id === id)!;
}

export function isBlueTalentUnlocked(
  state: BlueTalentState,
  definition: BlueTalentDefinition,
): boolean {
  if (!definition.requirement) {
    return true;
  }

  return (
    state.feast ||
    state.levels[definition.requirement.talentId] >=
      definition.requirement.level
  );
}

export function areAllBlueTalentsMaxed(state: BlueTalentState): boolean {
  return BLUE_TALENTS.every(
    (talent) =>
      state.levels[talent.id] >= BLUE_TALENT_MAX_LEVEL_BY_ID[talent.id],
  );
}

export function canRefundBlueTalentLevel(
  state: BlueTalentState,
  talentId: BlueTalentId,
): boolean {
  if (state.feast || state.levels[talentId] <= 0) {
    return false;
  }

  const projected: BlueTalentState = {
    ...state,
    levels: {
      ...state.levels,
      [talentId]: state.levels[talentId] - 1,
    },
  };

  return BLUE_TALENTS.every((talent) => {
    if (projected.levels[talent.id] <= 0 || !talent.requirement) {
      return true;
    }

    return (
      projected.levels[talent.requirement.talentId] >=
      talent.requirement.level
    );
  });
}

export function getBlueTalentStats(state: BlueTalentState): BlueTalentStats {
  const getLevel = (id: BlueTalentId): number =>
    state.feast ? BLUE_TALENT_MAX_LEVEL_BY_ID[id] : state.levels[id];

  return {
    watermelonMagnetLevel: getLevel('watermelonMagnet'),
    watermelonBonus: getLevel('fruitMultiplier'),
    branchPerch: getLevel('perch') > 0,
    fruitDetector: getLevel('fruitDetector') > 0,
    chainReaction: getLevel('chainReaction') > 0,
    powerTakeoff: getLevel('powerTakeoff') > 0,
    feast: state.feast,
  };
}
