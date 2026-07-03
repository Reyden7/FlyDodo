export type ControlTalentId = 'wing' | 'lift' | 'gyroscope' | 'rotation';

export type ControlTalentLevels = Record<ControlTalentId, number>;

export interface ControlTalentState {
  levels: ControlTalentLevels;
  master: boolean;
}

export interface ControlTalentStats {
  flapUpwardImpulse: number;
  lift: number;
  autoLevelSpeed: number;
  flapTurnImpulse: number;
}

export interface ControlTalentDefinition {
  id: ControlTalentId;
  title: string;
  icon: string;
  description: string;
  levels: readonly number[];
  costs: readonly number[];
  statLabel: string;
}

export const CONTROL_TALENT_MAX_LEVEL = 4;

export const CONTROL_TALENT_LEVEL_COSTS = [20, 35, 55, 80] as const;

export const CONTROL_MASTER_COST = 150;

export const CONTROL_MASTER_VALUES: ControlTalentStats = {
  flapUpwardImpulse: 210,
  lift: 180,
  autoLevelSpeed: 1,
  flapTurnImpulse: 112,
};

export const CONTROL_TALENTS: readonly ControlTalentDefinition[] = [
  {
    id: 'lift',
    title: 'Portance',
    icon: '/assets/competences/Controle/portance.png',
    description:
      'Ralentit la chute libre du dodo quand le joueur relache les commandes.',
    levels: [45, 75, 110, 145],
    costs: CONTROL_TALENT_LEVEL_COSTS,
    statLabel: 'Portance',
  },
  {
    id: 'rotation',
    title: 'Rotation',
    icon: '/assets/competences/Controle/Rotation.png',
    description:
      'Augmente la vitesse de rotation produite par chaque battement lateral.',
    levels: [70, 80, 90, 100],
    costs: CONTROL_TALENT_LEVEL_COSTS,
    statLabel: 'Rotation',
  },
  {
    id: 'gyroscope',
    title: 'Gyroscope',
    icon: '/assets/competences/Controle/gyroscope.png',
    description:
      'Accelere le retour naturel du dodo vers une posture stable.',
    levels: [0.25, 0.4, 0.65, 0.85],
    costs: CONTROL_TALENT_LEVEL_COSTS,
    statLabel: 'Stabilisation',
  },
  {
    id: 'wing',
    title: 'Aile',
    icon: '/assets/competences/Controle/aile.png',
    description:
      'Augmente la puissance verticale d un battement d aile.',
    levels: [165, 170, 180, 190],
    costs: CONTROL_TALENT_LEVEL_COSTS,
    statLabel: 'Impulsion',
  },
] as const;

export const CONTROL_MASTER_TALENT = {
  id: 'master',
  title: 'Maitre',
  icon: '/assets/competences/Controle/Maître.png',
  description:
    'Debloque le meilleur controle possible pour toutes les competences.',
  cost: CONTROL_MASTER_COST,
} as const;

export function createEmptyControlTalentState(): ControlTalentState {
  return {
    levels: {
      wing: 0,
      lift: 0,
      gyroscope: 0,
      rotation: 0,
    },
    master: false,
  };
}

export function normalizeControlTalentState(value: unknown): ControlTalentState {
  const empty = createEmptyControlTalentState();

  if (!value || typeof value !== 'object') {
    return empty;
  }

  const source = value as Partial<ControlTalentState>;
  const levelSource =
    source.levels && typeof source.levels === 'object' ? source.levels : {};

  const normalizeLevel = (id: ControlTalentId): number => {
    const level = (levelSource as Partial<ControlTalentLevels>)[id];
    return typeof level === 'number' && Number.isFinite(level)
      ? Math.max(0, Math.min(CONTROL_TALENT_MAX_LEVEL, Math.floor(level)))
      : 0;
  };

  return {
    levels: {
      wing: normalizeLevel('wing'),
      lift: normalizeLevel('lift'),
      gyroscope: normalizeLevel('gyroscope'),
      rotation: normalizeLevel('rotation'),
    },
    master: source.master === true,
  };
}

export function cloneControlTalentState(
  state: ControlTalentState,
): ControlTalentState {
  return {
    levels: { ...state.levels },
    master: state.master,
  };
}

export function getControlTalentStats(
  state: ControlTalentState,
): ControlTalentStats {
  if (state.master) {
    return CONTROL_MASTER_VALUES;
  }

  const findTalent = (id: ControlTalentId): ControlTalentDefinition =>
    CONTROL_TALENTS.find((talent) => talent.id === id)!;

  const getLevelValue = (id: ControlTalentId, defaultValue: number): number => {
    const level = state.levels[id];
    return level > 0 ? findTalent(id).levels[level - 1] : defaultValue;
  };

  return {
    flapUpwardImpulse: getLevelValue('wing', 160),
    lift: getLevelValue('lift', 0),
    autoLevelSpeed: getLevelValue('gyroscope', 0),
    flapTurnImpulse: getLevelValue('rotation', 50),
  };
}

export function getControlTalentDefinition(
  id: ControlTalentId,
): ControlTalentDefinition {
  return CONTROL_TALENTS.find((talent) => talent.id === id)!;
}
