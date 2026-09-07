/**
 * Season 1: when it started, which week it is, and what each week unlocks.
 *
 * Weeks change at 00:00 RST on Mondays. The schedule is
 * docs/SEASON-1-ASSET-SCHEDULE-v2.md: six starters at signup, six new assets
 * a week from week 2. An asset before its week is visible everywhere and
 * usable nowhere - the overlay says "Unlocks week N".
 */
import {gameDayStart} from './gametime';
import type {SquadName} from './assets';

/** Monday 2026-09-07 00:00 RST (UTC-7). */
export const SEASON_1_START = Date.UTC(2026, 8, 7, 7, 0, 0);
export const SEASON_WEEKS = 10;

const WEEK_MS = 7 * 24 * 3_600_000;

/** 1-based week of the season; 0 before it starts, held at the last week after. */
export function seasonWeek(now: number, start = SEASON_1_START): number {
  if (now < start) return 0;
  // Count whole game days from the start so the boundary is a Monday 00:00
  // RST whatever the clock offset of the instant asked about.
  const days = Math.floor((gameDayStart(now) - gameDayStart(start)) / (24 * 3_600_000));
  return Math.min(SEASON_WEEKS, Math.floor(days / 7) + 1);
}

/** The instant week N begins. */
export function weekStart(week: number, start = SEASON_1_START): number {
  return start + Math.max(0, week - 1) * WEEK_MS;
}

/** The six every player is handed at signup, in Task Force Alpha slots 0-5. */
export const STARTER_ASSETS = ['m1a2', 'leclerc', 'f35a', 'rq4', 'm270a2', 'mi35m'] as const;

/** Unlock week per asset. Starters are week 1. */
export const UNLOCK_WEEK: Record<string, number> = {
  m1a2: 1, leclerc: 1, f35a: 1, rq4: 1, m270a2: 1, mi35m: 1,
  akinci: 2, ch47f: 2, f15ex: 2, k2: 2, phl191: 2, su57: 2,
  aw101: 3, f22: 3, k9: 3, merkava: 3, mq9a: 3, pzh2000: 3,
  ch5: 4, herontp: 4, leopard2a7: 4, smerch: 4, tiger: 4, typhoon: 4,
  ah64e: 5, ka52m: 5, strv122: 5, su34: 5, tb2: 5, tos1a: 5,
  a10c: 6, ah1z: 6, challenger3: 6, harop: 6, himars: 6, type10: 6,
  ariete: 7, fa18e: 7, k239: 7, lancet3: 7, mi28nm: 7, puls: 7,
  ac130j: 8, mq1c: 8, rm70: 8, switchblade: 8, t129: 8, t90m: 8,
  altay: 9, astros: 9, gripen: 9, rooivalk: 9, uh60m: 9, wingloong2: 9,
  archer: 10, kf21: 10, orbiter4: 10, pt91: 10, rafale: 10, z10me: 10,
};

/** Naval and anything unscheduled: not this season. */
export function unlockWeekOf(assetId: string): number | null {
  return UNLOCK_WEEK[assetId] ?? null;
}

/**
 * An asset's tier opens when EITHER the season week reaches it or the
 * player's Command Center does - owner's decision 2026-09-07: a base that
 * levels fast gets its assets early, and the weekly drip still carries
 * everyone else. Tier N = the schedule's week N.
 */
export function isUnlocked(assetId: string, now: number, commandCenter = 1): boolean {
  const w = unlockWeekOf(assetId);
  return w !== null && Math.max(seasonWeek(now), commandCenter) >= w;
}

/** Task Forces open by Command Center level: Bravo 5, Charlie 10, Delta 25. */
export const TASK_FORCE_UNLOCK: Record<SquadName, number> = {
  Alpha: 1,
  Bravo: 5,
  Charlie: 10,
  Delta: 25,
};

export function taskForceOpen(squad: SquadName, commandCenter: number): boolean {
  return commandCenter >= TASK_FORCE_UNLOCK[squad];
}
