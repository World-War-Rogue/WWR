/**
 * Daily map exercises: five kinds of Dominion target a player finds on the
 * map each day, personal to them, resolved through ordinary marches.
 *
 * Decided 2026-09-07 (docs/SEASON-1-LIVE-OPS-v1.md §Daily map exercises plus
 * the same-day rulings):
 *
 *   - Three targets per player per RST day, on empty plots near their base,
 *     visible to nobody else. Nothing can be stolen.
 *   - Exercise marches cost ZERO Fuel. They are Daily Operations, not attacks.
 *   - Two kinds are short NPC battles and advance the Engagement lane; three
 *     are march-and-hold and advance Mobilization. One exercise, one lane.
 *   - A battle target's patrol is sized at daily spawn from the player's
 *     strongest drone-qualified Task Force at home - ceil(0.70 x its power) -
 *     and stored. It never rescales to the force sent, so a deliberately weak
 *     force meets the same patrol. No eligible Task Force: no battle target is
 *     spawned; a hold target takes its place.
 *   - The drone rule applies. A lost battle is a normal battle report, grants
 *     nothing, and the player may take another target that day.
 *
 * Reward amounts are PROVISIONAL week-1 figures in the categories the design
 * named (Intel paid as Credits per the Season 1 ruling), scaled by the same
 * week multiplier as Daily Operations. They live here so ChatGPT's finalized
 * table is a constants change.
 */
import {ASSETS, type Asset, SQUAD_NAMES} from './assets';
import type {CombatantSpec} from './combat';
import {INTEL_AS_CREDITS, type Lane, NO_REWARD, type Reward, weekMultiplier} from './season1Ops';
import {NO_PACKAGES, assetPowerWith} from './upgrades';

export const EXERCISE_TYPES = ['signal_relay', 'abandoned_convoy', 'fuel_silo', 'factory_probe', 'disabled_mech_patrol'] as const;
export type ExerciseType = (typeof EXERCISE_TYPES)[number];

export function isExerciseType(value: unknown): value is ExerciseType {
  return typeof value === 'string' && (EXERCISE_TYPES as readonly string[]).includes(value);
}

export type ExerciseKind = 'hold' | 'battle';
export type WarfrontMetric = 'assault' | 'operations' | 'support';

export interface ExerciseSpec {
  type: ExerciseType;
  kind: ExerciseKind;
  lane: Lane;
  metric: WarfrontMetric;
  name: string;
  /** What the Task Force does there, in the design's words. */
  action: string;
  /** One line for the map sheet. */
  blurb: string;
  reward: Reward;
}

export const EXERCISES: Record<ExerciseType, ExerciseSpec> = {
  signal_relay: {
    type: 'signal_relay',
    kind: 'hold',
    lane: 'mobilization',
    metric: 'operations',
    name: 'Dominion Signal Relay',
    action: 'Scout, hold, upload route data',
    blurb: 'A Dominion relay still broadcasting. Hold it long enough to pull its route data.',
    reward: {...NO_REWARD, credits: 40 + 1 * INTEL_AS_CREDITS},
  },
  abandoned_convoy: {
    type: 'abandoned_convoy',
    kind: 'hold',
    lane: 'mobilization',
    metric: 'operations',
    name: 'Abandoned Convoy',
    action: 'Search and extract supplies',
    blurb: 'Trucks left where their crews ran. Whatever is in them is yours if you get there.',
    reward: {...NO_REWARD, fuel: 150, steel: 120, alloy: 60},
  },
  fuel_silo: {
    type: 'fuel_silo',
    kind: 'hold',
    lane: 'mobilization',
    metric: 'operations',
    name: 'Fuel Silo',
    action: 'Secure and siphon the cache',
    blurb: 'An unguarded silo on the flats. Secure it and siphon what is left.',
    reward: {...NO_REWARD, fuel: 300, credits: 20},
  },
  factory_probe: {
    type: 'factory_probe',
    kind: 'battle',
    lane: 'engagement',
    metric: 'assault',
    name: 'Factory Probe',
    action: 'Short battle, withdraw with data',
    blurb: 'A Dominion fabrication site with a light guard. Hit it, take the data, get out.',
    reward: {...NO_REWARD, munitions: 120, credits: 1 * INTEL_AS_CREDITS},
  },
  disabled_mech_patrol: {
    type: 'disabled_mech_patrol',
    kind: 'battle',
    lane: 'engagement',
    metric: 'assault',
    name: 'Disabled Mech Patrol',
    action: 'Defeat a small patrol',
    blurb: 'A patrol stranded by a breakdown, still armed. Finish it before it is recovered.',
    reward: {...NO_REWARD, munitions: 100, alloy: 60},
  },
};

/** Targets a player receives at each daily reset. */
export const EXERCISES_PER_DAY = 3;
/** How long a hold target is held before the column turns for home. */
export const HOLD_MS = 4 * 60_000;
/** Patrol power as a share of the strongest eligible Task Force at spawn. */
export const PATROL_POWER_RATIO = 0.7;
/** Targets spawn this many plots from the base, at most. */
export const SPAWN_RADIUS = 6;
export const SPAWN_MIN_RADIUS = 2;

export function exerciseReward(type: ExerciseType, week: number): Reward {
  const base = EXERCISES[type].reward;
  const by = weekMultiplier(week);
  return {
    credits: Math.round(base.credits * by),
    fuel: Math.round(base.fuel * by),
    steel: Math.round(base.steel * by),
    munitions: Math.round(base.munitions * by),
    alloy: Math.round(base.alloy * by),
  };
}

/* -------------------------------------------------------------------------- */
/* Choosing the day's three                                                    */
/* -------------------------------------------------------------------------- */

/** A small deterministic generator, so a day's targets are the same on every read. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Which three types a player gets today. With an eligible Task Force: one or
 * two battle targets and the rest holds, shuffled. Without one: three holds.
 * Never the same type twice in a day.
 */
export function pickDailyTypes(roll: () => number, canBattle: boolean): ExerciseType[] {
  const holds: ExerciseType[] = ['signal_relay', 'abandoned_convoy', 'fuel_silo'];
  const battles: ExerciseType[] = ['factory_probe', 'disabled_mech_patrol'];
  const shuffle = <T,>(xs: T[]) => {
    const out = [...xs];
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(roll() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };
  if (!canBattle) return shuffle(holds).slice(0, EXERCISES_PER_DAY);
  const battleCount = roll() < 0.5 ? 1 : 2;
  const chosen = [...shuffle(battles).slice(0, battleCount), ...shuffle(holds).slice(0, EXERCISES_PER_DAY - battleCount)];
  return shuffle(chosen);
}

/* -------------------------------------------------------------------------- */
/* The patrol                                                                 */
/* -------------------------------------------------------------------------- */

/** The chassis a Dominion patrol is drawn from: draftable, no naval. */
const PATROL_POOL: Asset[] = ASSETS.filter((a) => a.draftable !== false && a.category !== 'naval');

/**
 * A patrol worth about `targetPower`, built from four to six draftable
 * chassis at one Service Rank, no packages, no building boost. Rank is the
 * largest at which the patrol stays at or under the target; the count then
 * fills toward it. Every asset has the same rank power, so the arithmetic is
 * exact and the composition is only flavour - which is what a patrol is.
 */
export function generatePatrol(targetPower: number, roll: () => number): CombatantSpec[] {
  const want = Math.max(1, Math.ceil(targetPower));
  const unit = (level: number) => assetPowerWith(PATROL_POOL[0], level, NO_PACKAGES, 1);
  let count = 4;
  let level = 1;
  // A very small target (a two-unit starter force) gets a smaller patrol,
  // down to a single vehicle - never a patrol stronger than the rule allows.
  while (count > 1 && count * unit(1) > want) count -= 1;
  // Grow rank while the patrol at that rank fits under the target.
  while (level < 50 && count * unit(level + 1) <= want) level += 1;
  // Then add units while they fit, up to six.
  while (count < 6 && (count + 1) * unit(level) <= want) count += 1;
  // Chassis at rank 50 with nothing else top out below what a fully fitted,
  // building-boosted Task Force reaches. Once rank is maxed, the patrol's
  // attribute boost closes the gap - the same lever a category building is -
  // so a maxed player still meets a patrol at 70%, never a soft one.
  const plain = count * unit(level);
  const boost = level === 50 && plain < want ? Math.min(4, want / plain) : 1;
  const picked: CombatantSpec[] = [];
  const pool = [...PATROL_POOL];
  for (let i = 0; i < count; i += 1) {
    const j = Math.floor(roll() * pool.length);
    const asset = pool.splice(j, 1)[0] ?? PATROL_POOL[0];
    picked.push({assetId: asset.id, level, packages: NO_PACKAGES, slot: i, boost, squad: 'Dominion'});
  }
  return picked;
}

export function patrolPower(units: CombatantSpec[]): number {
  return units.reduce((sum, u) => {
    const asset = ASSETS.find((a) => a.id === u.assetId);
    return sum + (asset ? assetPowerWith(asset, u.level, u.packages ?? NO_PACKAGES, u.boost ?? 1) : 0);
  }, 0);
}

export const PATROL_NAME = 'Dominion Patrol';

export type ExerciseState = 'available' | 'marching' | 'settled' | 'failed';

export interface ExerciseView {
  id: string;
  type: ExerciseType;
  kind: ExerciseKind;
  name: string;
  action: string;
  blurb: string;
  lane: Lane;
  x: number;
  y: number;
  state: ExerciseState;
  reward: Reward;
  /** The stored patrol's power, for battle targets. */
  patrolPower: number | null;
  /** When the hold ends and the column turns home, while marching/holding. */
  holdUntil: number | null;
  squad: string | null;
}

export const EXERCISE_SQUADS = SQUAD_NAMES;
