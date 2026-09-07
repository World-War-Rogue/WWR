/**
 * The progression registry: every permanent upgrade track, level 1 to 50,
 * in one table the whole game reads.
 *
 * ── Why ──────────────────────────────────────────────────────────────────
 *
 * Costs and effects used to be answered by a function per system, called
 * from wherever needed them - the resolver, three screens, the Trade Post.
 * They all called the same functions, so nothing disagreed, but there was no
 * one place to look at "what does level 37 of anything cost", and nothing
 * checked that every visible track actually reached 50.
 *
 * This file is that place. It is BUILT FROM the curves that already exist
 * (shared/economy.ts, shared/buildings.ts, shared/combatSystems.ts) rather
 * than restating them, so switching the game to read from here changes no
 * number. When the approved level 1-50 economy lands, the curves behind it
 * change and this table follows.
 *
 * ── What a row promises ──────────────────────────────────────────────────
 *
 * `creditCost` and `tokenCost` are the price of the step INTO that level
 * (level - 1 -> level) and are always equal: one item, one price, whichever
 * currency pays. `powerDelta` is what the step adds to the power score of the
 * thing it applies to, `cumulativePower` the sum of every step so far, and
 * `effects` the stat changes in the game's own units. Level 1 is the start:
 * cost 0, power 0, no effects.
 *
 * A track whose curve past some level is a placeholder says so in `flags`
 * rather than pretending. The buildings are that track today: rows 2-10 are
 * the designed table and 11-50 grow by a fixed ratio until the designed table
 * arrives. They still reach 50 - a screen can show every level - but nothing
 * treats those numbers as balance.
 */
import {ASSET_MAX_LEVEL, attributeAtLevel, SQUAD_NAMES} from './assets';
import {
  BUILDING_MAX_LEVEL,
  BUILDING_START_LEVEL,
  LEVELLED_BUILDINGS,
  type LevelledBuilding,
  type Resources,
  buildingBoost,
  buildingStep,
  depotCapMultiplier,
  engineerMultiplier,
  signalsLeadMs,
  tocMultiplier,
  tradingOffers,
} from './buildings';
import {
  COMBAT_SYSTEM_LANES,
  COMBAT_SYSTEM_MAX_LEVEL,
  type CombatSystemLane,
  LANE_EFFECT,
  LANE_LABEL,
  combatSystemStepCost,
  laneEffect,
} from './combatSystems';
import {packageStepCost, rankStepCost} from './economy';
import {
  INTEGRATION_MAX_POINTS,
  INTEGRATION_POINTS_PER_RANK,
  PACKAGE_ATTRIBUTE,
  PACKAGE_KEYS,
  PACKAGE_LABEL,
  PACKAGE_POINTS_PER_RANK,
  type PackageKey,
} from './upgrades';

export const PROGRESSION_MAX_LEVEL = 50;

export type ProgressionCategory =
  | 'building'
  | 'asset-rank'
  | 'package'
  | 'combat-system'
  | 'cosmetic'
  | 'queue'
  | 'other';

export interface ProgressionPrerequisite {
  /** What must be true before this level can be bought. */
  kind: 'building' | 'rank' | 'season';
  /** The building id, for kind 'building'. */
  id?: string;
  level: number;
  /** The sentence a screen shows when it is not met. */
  wording: string;
}

export interface ProgressionLevel {
  level: number;
  creditCost: number;
  tokenCost: number;
  /** Resource price, for tracks paid in Fuel / Steel / Munitions / Alloy. */
  resourceCost?: Resources;
  buildTimeSeconds: number;
  powerDelta: number;
  cumulativePower: number;
  /** Stat changes in the game's units; see the track's `effectUnits`. */
  effects: Record<string, number>;
  prerequisites: ProgressionPrerequisite[];
}

export interface ProgressionTrack {
  id: string;
  displayName: string;
  category: ProgressionCategory;
  maxLevel: typeof PROGRESSION_MAX_LEVEL;
  /** What the track applies to: one asset, one Task Force, or the base. */
  appliesTo: 'asset' | 'task-force' | 'base';
  /** What `effects` keys mean, for a screen or a report. */
  effectUnits: Record<string, string>;
  /** Anything a reader must know before trusting a number. */
  flags: string[];
  /** The first level whose numbers are a placeholder, if any. */
  placeholderFrom?: number;
  levels: ProgressionLevel[];
}

/* -------------------------------------------------------------------------- */
/* Building the tracks                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Power of a nominal asset by rank, packages absent, boost 1.
 *
 * Every asset spends exactly 30 attribute points and rank scales all five the
 * same way, so an asset's rank power is the same for every chassis; this is
 * that number. shared/upgrades.ts assetPowerWith.
 */
export const NOMINAL_ATTRIBUTE_POINTS = 30;
export const POWER_PER_POINT = 6;

export function rankPower(level: number): number {
  return Math.round(POWER_PER_POINT * NOMINAL_ATTRIBUTE_POINTS * attributeAtLevel(1, level));
}

function levels(build: (level: number, prev: ProgressionLevel | null) => Omit<ProgressionLevel, 'level' | 'cumulativePower'>): ProgressionLevel[] {
  const out: ProgressionLevel[] = [];
  let prev: ProgressionLevel | null = null;
  for (let level = 1; level <= PROGRESSION_MAX_LEVEL; level += 1) {
    const partial = build(level, prev);
    const row: ProgressionLevel = {
      level,
      ...partial,
      cumulativePower: (prev?.cumulativePower ?? 0) + partial.powerDelta,
    };
    out.push(row);
    prev = row;
  }
  return out;
}

const seasonOf = (level: number) => Math.ceil(level / 10);

function seasonPrerequisite(level: number): ProgressionPrerequisite[] {
  const season = seasonOf(level);
  return season > 1
    ? [{kind: 'season', level: season, wording: `Opens in Season ${season}`}]
    : [];
}

function serviceRankTrack(): ProgressionTrack {
  return {
    id: 'service-rank',
    displayName: 'Service Rank',
    category: 'asset-rank',
    maxLevel: PROGRESSION_MAX_LEVEL,
    appliesTo: 'asset',
    effectUnits: {
      attributeMultiplier: 'multiplier on all five attributes (firepower, armour, mobility, range, detection)',
      milestone: '1 when this rank is a milestone (double step, new art)',
    },
    flags: [],
    levels: levels((level) => {
      const cost = level === 1 ? 0 : rankStepCost(level - 1);
      const mult = attributeAtLevel(1, level);
      return {
        creditCost: cost,
        tokenCost: cost,
        buildTimeSeconds: 0,
        powerDelta: level === 1 ? 0 : rankPower(level) - rankPower(level - 1),
        effects: {attributeMultiplier: mult, milestone: level % 10 === 0 ? 1 : 0},
        prerequisites: [
          ...seasonPrerequisite(level),
          ...(level > 1
            ? [{kind: 'building', id: 'command_center', level, wording: `Command Center must reach level ${level} first`} as ProgressionPrerequisite]
            : []),
        ],
      };
    }),
  };
}

function packageTrack(key: PackageKey): ProgressionTrack {
  const attribute = PACKAGE_ATTRIBUTE[key];
  return {
    id: `package-${key}`,
    displayName: `${PACKAGE_LABEL[key]} package`,
    category: 'package',
    maxLevel: PROGRESSION_MAX_LEVEL,
    appliesTo: 'asset',
    effectUnits: {
      [attribute]: 'attribute points added after rank and building boost',
      integrationPoints: `points added to all five attributes if this is the lowest package (System Integration, capped at ${INTEGRATION_MAX_POINTS})`,
    },
    flags: ['power delta counts the package points only; System Integration depends on the other three packages and is not included'],
    levels: levels((level) => {
      const cost = level === 1 ? 0 : packageStepCost(level - 1);
      return {
        creditCost: cost,
        tokenCost: cost,
        buildTimeSeconds: 0,
        powerDelta: level === 1 ? 0 : POWER_PER_POINT * PACKAGE_POINTS_PER_RANK,
        effects: {
          [attribute]: (level - 1) * PACKAGE_POINTS_PER_RANK,
          integrationPoints: Math.min(INTEGRATION_MAX_POINTS, (level - 1) * INTEGRATION_POINTS_PER_RANK),
        },
        prerequisites: level > 1 ? [{kind: 'rank', level, wording: `Raise Service Rank past ${level - 1} first`}] : [],
      };
    }),
  };
}

function combatSystemTrack(lane: CombatSystemLane): ProgressionTrack {
  const effect = LANE_EFFECT[lane];
  return {
    id: `combat-system-${lane.replace('_', '-')}`,
    displayName: LANE_LABEL[lane],
    category: 'combat-system',
    maxLevel: PROGRESSION_MAX_LEVEL,
    appliesTo: 'task-force',
    effectUnits: {[effect.stat]: `${effect.wording}, as a fraction (+0.05 = +5%)`},
    flags: ['Task Force-wide multiplier; it has no power score of its own and powerDelta is 0'],
    levels: levels((level) => {
      const cost = combatSystemStepCost(level);
      return {
        creditCost: cost,
        tokenCost: cost,
        buildTimeSeconds: 0,
        powerDelta: 0,
        effects: {[effect.stat]: laneEffect(lane, level)},
        prerequisites: [
          ...seasonPrerequisite(level),
          ...(level > 1
            ? [{kind: 'building', id: 'command_center', level, wording: `Command Center must reach level ${level} first`} as ProgressionPrerequisite]
            : []),
        ],
      };
    }),
  };
}

const BUILDING_NAME: Record<LevelledBuilding, string> = {
  command_center: 'Command Center',
  armour_hub: 'Armour Building',
  artillery_hub: 'Missile Building',
  fixed_wing_hub: 'Fixed-Wing Building',
  rotary_hub: 'Helicopter Building',
  drone_hub: 'Drone Building',
  tactical_operations_center: 'Tactical Operations Center',
  signals_center: 'Signals Center',
  fuel_point: 'Bulk Fuel Point',
  fabrication_shop: 'Base Fabrication Shop',
  garrison_barracks: 'Arsenal',
  recovery_yard: 'Materials Recovery Yard',
  quartermaster_warehouse: 'Quartermaster Warehouse',
  engineer_support_yard: 'Engineer Support Yard',
  depot: 'Depot',
  alliance_trading_post: 'Alliance Trading Post',
};

const HUBS = new Set<LevelledBuilding>(['armour_hub', 'artillery_hub', 'fixed_wing_hub', 'rotary_hub', 'drone_hub']);

/** The designed building table ends here; past it the curve is a placeholder. */
export const BUILDING_DESIGNED_TO = 10;

function buildingEffects(building: LevelledBuilding, level: number): Record<string, number> {
  if (HUBS.has(building)) return {categoryBoost: buildingBoost(level)};
  switch (building) {
    case 'command_center':
      return {rankCeiling: level, homeGroundDamage: Math.min(0.25, (level - 1) * 0.015)};
    case 'tactical_operations_center':
      return {marchSpeed: tocMultiplier(level)};
    case 'engineer_support_yard':
      return {buildTimer: engineerMultiplier(level)};
    case 'depot':
      return {dailyCap: depotCapMultiplier(level)};
    case 'signals_center':
      return {inboundLeadSeconds: signalsLeadMs(level) / 1000};
    case 'alliance_trading_post':
      return {openOffers: tradingOffers(level)};
    default:
      // Producers and the Warehouse: their tables are read through the
      // level record (productionPerHour / storageCap take the whole set), so
      // the row records the level and a screen asks those functions directly.
      return {level};
  }
}

function buildingTrack(building: LevelledBuilding): ProgressionTrack {
  const effectUnits: Record<string, string> = HUBS.has(building)
    ? {categoryBoost: "multiplier on every attribute of the building's asset category"}
    : building === 'command_center'
      ? {rankCeiling: 'highest Service Rank and Combat System level allowed', homeGroundDamage: 'defender damage bonus at home, as a fraction'}
      : building === 'tactical_operations_center'
        ? {marchSpeed: 'multiplier on march speed (with Drone Network, capped at 1.5)'}
        : building === 'engineer_support_yard'
          ? {buildTimer: 'multiplier on new building timers'}
          : building === 'depot'
            ? {dailyCap: 'multiplier on the daily Depot purchase caps'}
            : building === 'signals_center'
              ? {inboundLeadSeconds: 'how long before it lands an inbound march is shown'}
              : building === 'alliance_trading_post'
                ? {openOffers: 'barter offers open at once (barter not built)'}
                : {level: 'level; production and storage read from shared/buildings.ts tables'};
  const flags = [
    `levels ${BUILDING_DESIGNED_TO + 1}-50 are a placeholder extrapolation (cost x1.3, time x1.5 per level) until the designed table lands`,
    'paid in resources, not currency; creditCost/tokenCost are 0 and resourceCost carries the price',
  ];
  if (['tactical_operations_center', 'engineer_support_yard', 'depot'].includes(building)) {
    flags.push('effect is clamped at level 10; levels 11-50 add nothing until designed');
  }
  return {
    id: `building-${building.replace(/_/g, '-')}`,
    displayName: BUILDING_NAME[building],
    category: 'building',
    maxLevel: PROGRESSION_MAX_LEVEL,
    appliesTo: 'base',
    effectUnits,
    flags,
    placeholderFrom: BUILDING_DESIGNED_TO + 1,
    levels: levels((level) => {
      const step = level === BUILDING_START_LEVEL ? null : buildingStep(building, level);
      return {
        creditCost: 0,
        tokenCost: 0,
        resourceCost: step?.cost ?? {fuel: 0, steel: 0, munitions: 0, alloy: 0},
        buildTimeSeconds: step ? step.ms / 1000 : 0,
        powerDelta: 0,
        effects: buildingEffects(building, level),
        prerequisites: [
          ...seasonPrerequisite(level),
          ...(level > 1 && building !== 'command_center'
            ? [{kind: 'building', id: 'command_center', level, wording: `Command Center must reach level ${level} first`} as ProgressionPrerequisite]
            : []),
        ],
      };
    }),
  };
}

/* -------------------------------------------------------------------------- */
/* The registry                                                               */
/* -------------------------------------------------------------------------- */

export const PROGRESSION_TRACKS: readonly ProgressionTrack[] = [
  serviceRankTrack(),
  ...PACKAGE_KEYS.map(packageTrack),
  ...COMBAT_SYSTEM_LANES.map(combatSystemTrack),
  ...LEVELLED_BUILDINGS.map(buildingTrack),
];

export const TRACK_BY_ID: Record<string, ProgressionTrack> = Object.fromEntries(
  PROGRESSION_TRACKS.map((t) => [t.id, t]),
);

export function track(id: string): ProgressionTrack {
  const t = TRACK_BY_ID[id];
  if (!t) throw new Error(`No progression track "${id}"`);
  return t;
}

/** The row for a level, or null outside 1..50. */
export function levelRow(id: string, level: number): ProgressionLevel | null {
  const t = TRACK_BY_ID[id];
  if (!t || !Number.isInteger(level) || level < 1 || level > t.maxLevel) return null;
  return t.levels[level - 1];
}

/** Price of the step into `level` (currency tracks). 0 outside the track. */
export function stepCost(id: string, level: number): number {
  return levelRow(id, level)?.creditCost ?? 0;
}

/** Total currency from `from` to `to`. */
export function cumulativeCost(id: string, from: number, to: number): number {
  let total = 0;
  for (let l = from + 1; l <= to; l += 1) total += stepCost(id, l);
  return total;
}

/** What the game needs to know before it trusts the table. */
export const SEASON_CAP_NOTE = `Every track is capped at 10 x the current season (Season 1: 10) and by the Command Center; the table lists all 50 so screens can show the road ahead.`;

/* -------------------------------------------------------------------------- */
/* Validation                                                                 */
/* -------------------------------------------------------------------------- */

export interface RegistryProblem {
  track: string;
  level?: number;
  problem: string;
}

/**
 * Every visible track has levels 1..50 with no gap, no missing cost or power
 * entry, equal Token and Credit prices, and cumulative power that is the sum
 * of its steps. Run by the tests and by the dev tools page.
 */
export function validateRegistry(tracks: readonly ProgressionTrack[] = PROGRESSION_TRACKS): RegistryProblem[] {
  const problems: RegistryProblem[] = [];
  const seen = new Set<string>();
  for (const t of tracks) {
    if (seen.has(t.id)) problems.push({track: t.id, problem: 'duplicate track id'});
    seen.add(t.id);
    if (t.maxLevel !== PROGRESSION_MAX_LEVEL) problems.push({track: t.id, problem: `maxLevel is ${t.maxLevel}, not ${PROGRESSION_MAX_LEVEL}`});
    if (t.levels.length !== PROGRESSION_MAX_LEVEL) problems.push({track: t.id, problem: `${t.levels.length} levels, not ${PROGRESSION_MAX_LEVEL}`});
    let cumulative = 0;
    t.levels.forEach((row, i) => {
      const level = i + 1;
      if (row.level !== level) problems.push({track: t.id, level, problem: `row ${i} says level ${row.level}`});
      for (const key of ['creditCost', 'tokenCost', 'buildTimeSeconds', 'powerDelta', 'cumulativePower'] as const) {
        const v = row[key];
        if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) problems.push({track: t.id, level, problem: `${key} is ${String(v)}`});
      }
      if (row.creditCost !== row.tokenCost) problems.push({track: t.id, level, problem: `Token cost ${row.tokenCost} != Credit cost ${row.creditCost}`});
      if (level === 1 && (row.creditCost !== 0 || row.powerDelta !== 0)) problems.push({track: t.id, level, problem: 'level 1 must cost and add nothing'});
      if (level > 1 && row.creditCost === 0 && !row.resourceCost) problems.push({track: t.id, level, problem: 'no price'});
      if (level > 1 && row.resourceCost && row.creditCost === 0) {
        const total = row.resourceCost.fuel + row.resourceCost.steel + row.resourceCost.munitions + row.resourceCost.alloy;
        if (total <= 0) problems.push({track: t.id, level, problem: 'no resource price'});
      }
      cumulative += row.powerDelta;
      if (Math.abs(cumulative - row.cumulativePower) > 1e-6) problems.push({track: t.id, level, problem: `cumulativePower ${row.cumulativePower} != sum ${cumulative}`});
      if (!row.effects || Object.keys(row.effects).length === 0) problems.push({track: t.id, level, problem: 'no effects'});
    });
  }
  return problems;
}

/** Sanity constants the tests pin, so a drift in a curve is caught by name. */
export const REGISTRY_EXPECTATIONS = {
  serviceRankTo50: 55_605,
  packageTo50: 55_605,
  // ceil(50 x 1.10^(L-2)) summed over 2..50. The decision's prose said
  // "about 52,860" and quoted per-level figures from a 1.10^(L-1) reading;
  // the formula it gave is the one implemented, and this is its exact sum.
  combatSystemLaneTo50: 52_883,
  rankPowerAt: {1: 180, 10: 280, 20: 454, 30: 736, 40: 1195, 50: 1939} as Record<number, number>,
  assetMax: ASSET_MAX_LEVEL,
  buildingMax: BUILDING_MAX_LEVEL,
  combatSystemMax: COMBAT_SYSTEM_MAX_LEVEL,
  taskForces: SQUAD_NAMES.length,
};
