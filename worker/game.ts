/**
 * Server-side game rules.
 *
 * Everything in this file is authoritative. The client may render these numbers
 * but never computes them: any value the browser can calculate, a player can
 * edit. Keeping the rules here is what makes the difference between a game and
 * a screenshot of one.
 */

export type ResourceKind = 'fuel' | 'steel' | 'munitions' | 'alloy';

export type BuildingKind =
  | 'command_post'
  | 'motor_pool'
  | 'airfield'
  | 'refinery'
  | 'foundry'
  | 'barracks';

export interface BuildingSpec {
  kind: BuildingKind;
  name: string;
  blurb: string;
  maxLevel: number;
  /** Levels of command_post required before this building may reach a level. */
  gatedByCommandPost: boolean;
}

export const BUILDINGS: Record<BuildingKind, BuildingSpec> = {
  command_post: {
    kind: 'command_post',
    name: 'Command Post',
    blurb: 'Raises the ceiling on every other structure in the base.',
    maxLevel: 30,
    gatedByCommandPost: false,
  },
  motor_pool: {
    kind: 'motor_pool',
    name: 'Motor Pool',
    blurb: 'Services armour. Unlocks heavier tracked vehicles.',
    maxLevel: 30,
    gatedByCommandPost: true,
  },
  airfield: {
    kind: 'airfield',
    name: 'Airfield',
    blurb: 'Rotary and fixed wing. Sorties need runway length.',
    maxLevel: 30,
    gatedByCommandPost: true,
  },
  refinery: {
    kind: 'refinery',
    name: 'Refinery',
    blurb: 'Produces fuel continuously while it stands.',
    maxLevel: 30,
    gatedByCommandPost: true,
  },
  foundry: {
    kind: 'foundry',
    name: 'Foundry',
    blurb: 'Produces steel continuously while it stands.',
    maxLevel: 30,
    gatedByCommandPost: true,
  },
  barracks: {
    kind: 'barracks',
    name: 'Barracks',
    blurb: 'Houses crews. Larger garrisons need more bunks.',
    maxLevel: 30,
    gatedByCommandPost: true,
  },
};

export const BUILDING_KINDS = Object.keys(BUILDINGS) as BuildingKind[];

export function isBuildingKind(value: string): value is BuildingKind {
  return Object.prototype.hasOwnProperty.call(BUILDINGS, value);
}

/** Cost to take a building from `level` to `level + 1`. */
export function upgradeCost(kind: BuildingKind, level: number): Record<ResourceKind, number> {
  const next = level + 1;
  const scale = Math.pow(1.55, level);
  const base = kind === 'command_post' ? 260 : 140;
  return {
    fuel: Math.floor(base * scale),
    steel: Math.floor(base * 1.2 * scale),
    munitions: Math.floor((base / 4) * scale),
    alloy: next >= 10 ? Math.floor((base / 20) * scale) : 0,
  };
}

/** Wall-clock duration in milliseconds to take a building from `level` to `level + 1`. */
export function upgradeDurationMs(kind: BuildingKind, level: number): number {
  const seconds = Math.floor(30 * Math.pow(1.62, level) * (kind === 'command_post' ? 1.5 : 1));
  return Math.min(seconds, 60 * 60 * 24 * 3) * 1000;
}

/**
 * The Command Post gates everything: no other building may exceed its level.
 * This single rule is what turns a list of upgrades into a progression.
 */
export function maxAllowedLevel(kind: BuildingKind, commandPostLevel: number): number {
  const spec = BUILDINGS[kind];
  return spec.gatedByCommandPost ? Math.min(spec.maxLevel, commandPostLevel) : spec.maxLevel;
}

/** Resources produced per hour at a given building level. */
export function productionPerHour(levels: Record<BuildingKind, number>): Record<ResourceKind, number> {
  const perLevel = (level: number) => (level === 0 ? 0 : Math.floor(60 * Math.pow(1.35, level - 1)));
  return {
    fuel: perLevel(levels.refinery),
    steel: perLevel(levels.foundry),
    munitions: Math.floor(perLevel(levels.barracks) / 4),
    alloy: 0,
  };
}

export const STORAGE_CAP = (commandPostLevel: number) =>
  Math.floor(5000 * Math.pow(1.5, Math.max(0, commandPostLevel - 1)));
