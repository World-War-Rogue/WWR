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

/**
 * What each building contributes to a player's power rating.
 *
 * Not equal, on purpose. Power is the number other players use to decide
 * whether to attack you, so it should describe how hard you are to take rather
 * than how rich you are - a refinery makes you worth attacking, a motor pool
 * makes you expensive to attack. Rating them the same would tell an attacker
 * nothing and would quietly reward turtling on economy.
 */
const POWER_WEIGHT: Record<BuildingKind, number> = {
  command_post: 60,
  motor_pool: 45,
  airfield: 45,
  barracks: 40,
  refinery: 30,
  foundry: 30,
};

/**
 * A player's total power.
 *
 * Computed from building levels every time it is asked for, never stored. A
 * stored figure is one that can drift out of step with the base it describes,
 * and a power number that disagrees with reality is worse than none - it is
 * the number people decide to attack on.
 *
 * Superlinear in level (^1.6) so the gap between a level 10 and a level 20
 * neighbour reads as the three-fold difference it actually is, rather than the
 * doubling a linear sum would suggest.
 */
export function totalPower(levels: Record<BuildingKind, number>): number {
  let power = 0;
  for (const kind of BUILDING_KINDS) {
    const level = levels[kind] ?? 0;
    if (level > 0) power += Math.round(Math.pow(level, 1.6) * POWER_WEIGHT[kind]);
  }
  return power;
}

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

/**
 * The skin catalogue lives in shared/, imported by this file and by the
 * client's renderer, so the two cannot disagree about what exists.
 *
 * It used to be declared here as well, and the copies drifted the first time a
 * skin was added: the client knew about Ravenkeep and drew it, the server did
 * not, so it was missing from Customise and an equip would have been refused.
 * Re-exported rather than imported at each use site, so nothing else in the
 * Worker had to change.
 */
export {
  SKIN_IDS,
  STARTER_SKIN_IDS,
  isSkinId,
  type Palette,
  type SkinId,
  type SkinIdentity as SkinSpec,
} from '../shared/skins';
export {SKIN_IDENTITY as SKINS} from '../shared/skins';

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
