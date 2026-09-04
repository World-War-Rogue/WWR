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

/* ------------------------------------------------------------------ world */

/** A base occupies a 4x4 block of world tiles. */
export const PLOT_TILES = 4;

/** Hard population limit for a single server. */
export const SERVER_CAPACITY = 1000;

/** How many servers the world must still be navigable after merging. */
export const MERGE_FACTOR = 8;

/**
 * Share of plots occupied inside the settled area.
 *
 * This is the number that decides how the world feels. Too high and there is
 * no room to manoeuvre between bases; too low and players never see a
 * neighbour, which is the whole point of a shared map. At 12% a full server
 * settles a disc about 51 plots across, and eight merged servers reach 146.
 */
export const TARGET_OCCUPANCY = 0.12;

/**
 * Half-width of the world in plots: the world runs -EXTENT..EXTENT on both
 * axes. Sized to hold a full 8-server merge at the target occupancy with room
 * left over, so a merge never forces players into each other's laps.
 */
export const WORLD_EXTENT = 200;

/**
 * Radius of the salt flats at the centre of the world, in plots. Kept clear of
 * bases so the middle of the map stays contested ground rather than somebody's
 * back garden.
 */
export const INNER_BAND_RADIUS = Math.round(WORLD_EXTENT * 0.1);

/** Radius in plots that a given population settles at the target occupancy. */
export function settledRadius(population: number): number {
  return Math.sqrt(Math.max(1, population) / (TARGET_OCCUPANCY * Math.PI));
}

export type SkinId =
  | 'desert_fob'
  | 'arctic_station'
  | 'jungle_outpost'
  | 'urban_garrison'
  | 'custom_one'
  | 'custom_two'
  | 'signature_one';

export interface SkinSpec {
  id: SkinId;
  name: string;
  blurb: string;
  /** Ground, structure and accent colours the map renderer draws with. */
  palette: {ground: string; structure: string; accent: string};
  /**
   * A one-of-one commission. At most one account in the game may ever hold it,
   * and that is enforced by a unique index rather than by remembering not to
   * sell it twice - see migrations/0006_exclusive.sql.
   */
  exclusive?: boolean;
}

export const SKINS: Record<SkinId, SkinSpec> = {
  desert_fob: {
    id: 'desert_fob',
    name: 'Desert FOB',
    blurb: 'HESCO barriers and sand berms. Built fast, holds hard.',
    palette: {ground: '#b08248', structure: '#d9c39a', accent: '#e07a29'},
  },
  arctic_station: {
    id: 'arctic_station',
    name: 'Arctic Station',
    blurb: 'Radar domes above the treeline. Nothing crosses unseen.',
    palette: {ground: '#9fb6c6', structure: '#e8f1f6', accent: '#3fa9d6'},
  },
  jungle_outpost: {
    id: 'jungle_outpost',
    name: 'Jungle Outpost',
    blurb: 'Camouflage netting and raised platforms. Hard to find.',
    palette: {ground: '#4e6b3a', structure: '#7b8f5c', accent: '#9fd356'},
  },
  urban_garrison: {
    id: 'urban_garrison',
    name: 'Urban Garrison',
    blurb: 'Blast walls and concrete. A city block turned strongpoint.',
    palette: {ground: '#6b6b6b', structure: '#9aa0a6', accent: '#d64545'},
  },
  // Not offered at signup. Reserved for the two custom skins under test.
  custom_one: {
    id: 'custom_one',
    name: 'Custom I',
    blurb: 'Awaiting reference art.',
    palette: {ground: '#5b4b6e', structure: '#b9a7d0', accent: '#c084fc'},
  },
  custom_two: {
    id: 'custom_two',
    name: 'Custom II',
    blurb: 'Awaiting reference art.',
    palette: {ground: '#6e5b3a', structure: '#d6c08a', accent: '#facc15'},
  },
  // The flagship commission. Sold once, to one player, and never again.
  signature_one: {
    id: 'signature_one',
    name: 'Shadow Empress',
    blurb: 'She reigns in silence. One of one, and never sold again.',
    palette: {ground: '#1c1712', structure: '#c9a227', accent: '#f0b429'},
    exclusive: true,
  },
};

/**
 * Open testing: every base skin is selectable by everyone.
 *
 * Set while a handful of invited testers are trying the game and each of them
 * wants a different base. It bypasses the ownership check on skins ONLY -
 * accessory ownership and the one-of-one index are untouched, so flipping this
 * back to false restores exclusivity without anything to undo.
 *
 * One thing to do when it goes back to false: a tester left wearing a skin
 * they do not own keeps wearing it, because ownership is checked when a skin
 * is equipped rather than on every read. Reset those bases in the same change.
 */
export const ALL_SKINS_UNLOCKED = true;

/** Only these are selectable by a new player. */
export const STARTER_SKIN_IDS: SkinId[] = [
  'desert_fob',
  'arctic_station',
  'jungle_outpost',
  'urban_garrison',
];

export const SKIN_IDS = Object.keys(SKINS) as SkinId[];

export function isSkinId(value: unknown): value is SkinId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(SKINS, value);
}

/**
 * Candidate plots for a new arrival.
 *
 * The settled area grows with the square root of the population, so players
 * cluster into a recognisable world instead of scattering across an empty
 * grid. Candidates are random rather than scanned in order, so two players
 * registering at the same instant rarely contend for the same plot.
 */
export function candidatePlots(population: number, attempts: number): Array<{x: number; y: number}> {
  // Nobody is placed on the salt flats. Players settle in a ring around them,
  // which leaves the centre of the world as open contested ground that
  // everyone borders and nobody owns - the natural site for events and, later,
  // for whatever is worth marching across it for.
  const inner = INNER_BAND_RADIUS + 2;
  const outer = Math.min(
    WORLD_EXTENT,
    Math.max(inner + 6, Math.sqrt(inner * inner + settledRadius(population + 1) ** 2)),
  );
  const out: Array<{x: number; y: number}> = [];
  for (let i = 0; i < attempts; i += 1) {
    // Sampling the square of the radius spreads arrivals evenly over the
    // annulus rather than piling them against its inner edge.
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.sqrt(inner * inner + Math.random() * (outer * outer - inner * inner));
    out.push({
      x: Math.round(Math.cos(angle) * distance),
      y: Math.round(Math.sin(angle) * distance),
    });
  }
  return out;
}
