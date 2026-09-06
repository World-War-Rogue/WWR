/**
 * Base buildings that level: the Command Center and the five asset buildings.
 *
 * Decided in docs/ASSET-BUILDING-UPGRADES-v1.md and the owner's ruling on top
 * of it: the Command Center is the ceiling for everything. Nothing in the base
 * - a building level, a Service Rank, a package - may stand above the Command
 * Center's level, and the Command Center must FINISH level N before anything
 * else may START level N.
 *
 * Each asset building lifts every attribute of every asset in its category
 * by BUILDING_STEP per level, compounding: level 10 is x1.219. That sits on
 * top of Service Rank (x1.045 per rank) and under packages (added after),
 * so a package point is worth the same on a level-0 base as a level-10 one.
 *
 * Costs are one price payable in any mix of Tokens and Command Credits, like
 * every other purchase. Timers are absolute instants and cannot be bought
 * down. Levels carry across seasons; the season only raises the cap.
 */
import type {AssetCategory} from './assets';

export const LEVELLED_BUILDINGS = [
  'command_center',
  'armour_hub',
  'artillery_hub',
  'fixed_wing_hub',
  'rotary_hub',
  'drone_hub',
] as const;
export type LevelledBuilding = (typeof LEVELLED_BUILDINGS)[number];

/** The asset building for a category; naval has none until Season 3. */
export const HUB_OF_CATEGORY: Record<AssetCategory, LevelledBuilding | null> = {
  armour: 'armour_hub',
  artillery: 'artillery_hub',
  fixed_wing: 'fixed_wing_hub',
  rotary: 'rotary_hub',
  drone: 'drone_hub',
  naval: null,
};

export const CATEGORY_OF_HUB: Partial<Record<LevelledBuilding, AssetCategory>> = {
  armour_hub: 'armour',
  artillery_hub: 'artillery',
  fixed_wing_hub: 'fixed_wing',
  rotary_hub: 'rotary',
  drone_hub: 'drone',
};

export function isLevelledBuilding(id: string): id is LevelledBuilding {
  return (LEVELLED_BUILDINGS as readonly string[]).includes(id);
}

/** Per level, on every attribute of the category. Level 10 = x1.218994. */
export const BUILDING_STEP = 1.02;

/** Ten levels a season: 10, 20, 30, 40, 50. */
export const BUILDING_LEVELS_PER_SEASON = 10;
export const BUILDING_MAX_LEVEL = 50;

export function buildingCapForSeason(season: number): number {
  return Math.min(BUILDING_MAX_LEVEL, Math.max(0, season) * BUILDING_LEVELS_PER_SEASON);
}

/** The multiplier a category's assets get from its building at this level. */
export function buildingBoost(level: number): number {
  return BUILDING_STEP ** Math.max(0, Math.floor(level));
}

/**
 * What it costs to reach a level, and how long it takes. Indexed by the level
 * being built (1..10 for Season 1). Beyond ten the last row repeats with the
 * same ratio as the last step, until a later season's table replaces it.
 */
const ASSET_BUILDING_TABLE: ReadonlyArray<{cost: number; minutes: number}> = [
  {cost: 40, minutes: 20},
  {cost: 60, minutes: 45},
  {cost: 90, minutes: 90},
  {cost: 130, minutes: 180},
  {cost: 180, minutes: 360},
  {cost: 240, minutes: 540},
  {cost: 320, minutes: 720},
  {cost: 420, minutes: 1080},
  {cost: 540, minutes: 1440},
  {cost: 700, minutes: 2160},
];

/**
 * The Command Center unlocks five buildings' worth of progress, so its rows
 * are the asset-building rows at x1.5. A placeholder until the designer
 * publishes the Command Center's own table.
 */
export const COMMAND_CENTER_FACTOR = 1.5;

export function buildingStep(
  building: LevelledBuilding,
  toLevel: number,
): {cost: number; ms: number} {
  const idx = Math.min(ASSET_BUILDING_TABLE.length, Math.max(1, toLevel)) - 1;
  let {cost, minutes} = ASSET_BUILDING_TABLE[idx];
  if (toLevel > ASSET_BUILDING_TABLE.length) {
    const extra = toLevel - ASSET_BUILDING_TABLE.length;
    cost = Math.round(cost * 1.3 ** extra);
    minutes = Math.round(minutes * 1.5 ** extra);
  }
  if (building === 'command_center') {
    cost = Math.round(cost * COMMAND_CENTER_FACTOR);
    minutes = Math.round(minutes * COMMAND_CENTER_FACTOR);
  }
  return {cost, ms: minutes * 60_000};
}

export interface BuildingLevels {
  command_center: number;
  armour_hub: number;
  artillery_hub: number;
  fixed_wing_hub: number;
  rotary_hub: number;
  drone_hub: number;
}

export const NO_BUILDINGS: BuildingLevels = {
  command_center: 0,
  armour_hub: 0,
  artillery_hub: 0,
  fixed_wing_hub: 0,
  rotary_hub: 0,
  drone_hub: 0,
};

/** The boost a category's assets get, given the base's building levels. */
export function categoryBoost(levels: BuildingLevels, category: AssetCategory): number {
  const hub = HUB_OF_CATEGORY[category];
  return hub ? buildingBoost(levels[hub]) : 1;
}

/**
 * Why a building may not start its next level, or null if it may.
 *
 * The rules, in the order a player would want to hear them: the season cap,
 * then the Command Center ceiling. The one-job-at-a-time rule is the queue's,
 * checked by the server against live jobs, not here.
 */
export function buildingBlock(
  building: LevelledBuilding,
  levels: BuildingLevels,
  season: number,
): string | null {
  const next = levels[building] + 1;
  const cap = buildingCapForSeason(season);
  if (next > cap) return `Season ${season} caps buildings at level ${cap}.`;
  if (building !== 'command_center' && next > levels.command_center) {
    return `Command Center must reach level ${next} first.`;
  }
  return null;
}

/**
 * The ceiling the Command Center puts on a Service Rank. A rank may not stand
 * above the Command Center's level; at level 0 a fresh base still holds its
 * starters at rank 1.
 */
export function rankCeiling(levels: BuildingLevels): number {
  return Math.max(1, levels.command_center);
}
