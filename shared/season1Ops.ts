/**
 * Season 1 live operations: the one balance file.
 *
 * Every number the season's events use lives here - lane rewards, the Cache,
 * the week multiplier, caps - so ChatGPT's revision of the live-ops design is
 * a change to constants, never to logic. Decided 2026-09-07:
 *
 *   - Every weekly window is Monday 00:00 RST; every daily window is 00:00
 *     RST. One helper (`dailyWindow`, `weeklyWindow`) answers both; nothing
 *     else may compute a reset day or a countdown of its own.
 *   - The design's "Intel" and "Module Fragment" rewards do not exist as
 *     balances yet and are paid as Command Credits for Season 1, at the rate
 *     below. The UI shows Credits; it never shows the placeholder names.
 *   - Daily Operations never grant Tokens.
 *   - Six lanes; one completed action advances exactly one lane; four lanes
 *     unlock the Cache; one Cache claim per player per day.
 *
 * Source: docs/SEASON-1-LIVE-OPS-v1.md (Daily Operations, week 1 baseline)
 * and the same-day decisions.
 */
import {GAME_OFFSET_MS, gameDayStart, gameWeekIndex, gameWeekStart} from './gametime';
import {SEASON_WEEKS, seasonWeek} from './season';

export const SEASON_1_ID = 'season_01_mech_uprising';
export const SEASON_1_NAME = 'Mech Uprising — Iron Dominion';

/* -------------------------------------------------------------------------- */
/* Windows                                                                    */
/* -------------------------------------------------------------------------- */

const DAY_MS = 24 * 3_600_000;

export interface Window {
  /** Stable key, the idempotency handle: 'd:<day index>' or 'w:<week index>'. */
  key: string;
  startsAt: number;
  /** The next reset, 00:00 RST. */
  resetAt: number;
}

/** The daily window an instant falls in. Resets 00:00 RST. */
export function dailyWindow(now: number): Window {
  const start = gameDayStart(now);
  // The day index counts RST midnights since the epoch - the same arithmetic
  // gameWeekIndex uses, so a day and its week always agree.
  return {key: `d:${Math.floor((start + GAME_OFFSET_MS) / DAY_MS)}`, startsAt: start, resetAt: start + DAY_MS};
}

/** The weekly window an instant falls in. Resets Monday 00:00 RST. */
export function weeklyWindow(now: number): Window {
  const index = gameWeekIndex(now);
  const start = gameWeekStart(index);
  return {key: `w:${index}`, startsAt: start, resetAt: gameWeekStart(index + 1)};
}

/** The season week (1..10) and phase for an instant. */
export function seasonPhase(now: number): {week: number; phase: 'pre' | 'proving_ground' | 'head_to_head' | 'offseason'} {
  const week = seasonWeek(now);
  if (week === 0) return {week, phase: 'pre'};
  if (week <= 4) return {week, phase: 'proving_ground'};
  if (week <= SEASON_WEEKS) return {week, phase: 'head_to_head'};
  return {week, phase: 'offseason'};
}

/* -------------------------------------------------------------------------- */
/* Rewards                                                                    */
/* -------------------------------------------------------------------------- */

export interface Reward {
  credits: number;
  fuel: number;
  steel: number;
  munitions: number;
  alloy: number;
}

export const NO_REWARD: Reward = {credits: 0, fuel: 0, steel: 0, munitions: 0, alloy: 0};

/**
 * What the design's placeholder currencies are worth in Command Credits for
 * Season 1. Both are unbuilt; a reward slot that named them pays this instead.
 * Change here, and only here, when they become real.
 */
export const INTEL_AS_CREDITS = 10;
export const MODULE_FRAGMENT_AS_CREDITS = 15;

/** Week-over-week growth of every Daily Operations reward: x(1 + 0.06 x (week - 1)). */
export const WEEK_MULTIPLIER = {base: 1.0, perWeek: 0.06};

export function weekMultiplier(week: number): number {
  const w = Math.max(1, Math.min(SEASON_WEEKS, week));
  return WEEK_MULTIPLIER.base + WEEK_MULTIPLIER.perWeek * (w - 1);
}

function scaled(reward: Reward, by: number): Reward {
  const out = {...NO_REWARD};
  for (const k of Object.keys(out) as Array<keyof Reward>) out[k] = Math.round(reward[k] * by);
  return out;
}

/* -------------------------------------------------------------------------- */
/* Lanes                                                                      */
/* -------------------------------------------------------------------------- */

export const LANES = ['command', 'industry', 'mobilization', 'engagement', 'readiness', 'cooperation'] as const;
export type Lane = (typeof LANES)[number];

export function isLane(value: unknown): value is Lane {
  return typeof value === 'string' && (LANES as readonly string[]).includes(value);
}

export const LANES_FOR_CACHE = 4;

/**
 * Week 1 baseline per lane (the design's table, with Intel and Module
 * Fragments converted to Credits at the rates above).
 */
export const LANE_REWARD_WEEK_1: Record<Lane, Reward> = {
  command: {...NO_REWARD, credits: 30 + 1 * INTEL_AS_CREDITS},
  industry: {...NO_REWARD, fuel: 120, steel: 100},
  mobilization: {...NO_REWARD, fuel: 90, munitions: 60},
  engagement: {...NO_REWARD, steel: 90, alloy: 60},
  readiness: {...NO_REWARD, credits: 40 + 1 * MODULE_FRAGMENT_AS_CREDITS},
  cooperation: {...NO_REWARD, credits: 30, munitions: 60},
};

/** The 4-of-6 Cache, week 1 baseline (2 Module Fragments converted). */
export const CACHE_REWARD_WEEK_1: Reward = {
  credits: 140 + 2 * MODULE_FRAGMENT_AS_CREDITS,
  fuel: 240,
  steel: 220,
  munitions: 150,
  alloy: 130,
};

export function laneReward(lane: Lane, week: number): Reward {
  return scaled(LANE_REWARD_WEEK_1[lane], weekMultiplier(week));
}

export function cacheReward(week: number): Reward {
  return scaled(CACHE_REWARD_WEEK_1, weekMultiplier(week));
}

/** One completed action advances exactly one lane: the trigger, in words. */
export const LANE_COPY: Record<Lane, {label: string; task: string; hint: string}> = {
  command: {
    label: 'Command',
    task: 'Start a building upgrade',
    hint: 'Any building, any level. Counts when the engineers begin, not when they finish.',
  },
  industry: {
    label: 'Industry',
    task: 'Let production run for one hour',
    hint: 'Your base produces while you are away; an hour of it today completes this.',
  },
  mobilization: {
    label: 'Mobilization',
    task: 'Launch a march or change a formation',
    hint: 'Send a Task Force anywhere, or move one asset between slots.',
  },
  engagement: {
    label: 'Engagement',
    task: 'Fight one battle',
    hint: 'Win or lose. A raid on a Dominion outpost counts.',
  },
  readiness: {
    label: 'Readiness',
    task: 'Upgrade or repair an asset',
    hint: 'A Service Rank, a package, a Combat System, or a repair.',
  },
  cooperation: {
    label: 'Cooperation',
    task: 'Reinforce an ally',
    hint: 'Send a Task Force to stand at an ally’s base. Solo commanders take a neutral contract against an outpost instead.',
  },
};

/** The industry lane: this much settled production time in one day. */
export const INDUSTRY_HOUR_MS = 3_600_000;

/** The reward-grant idempotency keys. One shape, so nothing pays twice. */
export const grantKey = {
  lane: (playerId: string, dayKey: string, lane: Lane) => `daily-lane:${playerId}:${dayKey}:${lane}`,
  cache: (playerId: string, dayKey: string) => `daily-cache:${playerId}:${dayKey}`,
};

export function rewardIsEmpty(r: Reward): boolean {
  return r.credits === 0 && r.fuel === 0 && r.steel === 0 && r.munitions === 0 && r.alloy === 0;
}

/** "140 Credits · 240 Fuel · 220 Steel" - the one way a reward is printed. */
export function describeReward(r: Reward): string {
  const parts: string[] = [];
  if (r.credits) parts.push(`${r.credits.toLocaleString()} Credits`);
  if (r.fuel) parts.push(`${r.fuel.toLocaleString()} Fuel`);
  if (r.steel) parts.push(`${r.steel.toLocaleString()} Steel`);
  if (r.munitions) parts.push(`${r.munitions.toLocaleString()} Munitions`);
  if (r.alloy) parts.push(`${r.alloy.toLocaleString()} Alloy`);
  return parts.join(' · ');
}
