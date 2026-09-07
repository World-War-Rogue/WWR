/**
 * Iron Dominion Arena, phase A (weeks 1-4): the Proving Ground.
 *
 * A daily benchmark, not head-to-head. Three attempts a day with the
 * player's saved Arena Squad (shared/arenaSquad.ts) against the Dominion
 * Warden: one enemy war machine per server per day whose six hardpoints are
 * generated from the previous day's strongest snapshot. Every attempt
 * settles at once and scores from the resolver's outputs; the day's best
 * counts, the week is the sum of the seven daily bests, and Monday 00:00
 * RST settles the week's rank rewards.
 *
 * The Warden IS the benchmark squad, worn as one machine. In the resolver
 * it is six units - that is what keeps it fair at every rank, since a
 * single unit with six units' attributes mitigates six times as hard - and
 * on screen those six units are its turret, launcher, pods and sensor mast.
 * A hardpoint knocked out is a unit broken; the machine's bar is the side's
 * strength. Nothing about the scoring changed.
 *
 * Source: docs/SEASON-1-LIVE-OPS-v1.md §Arena phase A and the reward tables
 * in docs/SEASON-1-LIVE-OPS-DESIGN-v1.md, with the 7 September rulings:
 * weekly windows are Monday 00:00 RST, module fragments pay as Credits, no
 * Tokens ever. Provisional figures the spec left open are marked below.
 *
 * Nothing here touches a player's assets: an attempt is a fight between two
 * snapshots. No damage, no repair, no march, no Fuel.
 */
import {ASSETS, type Asset, type AssetCategory} from './assets';
import type {CombatResult, CombatantSpec} from './combat';
import {ROUNDS} from './combat';
import {MODULE_FRAGMENT_AS_CREDITS, NO_REWARD, type Reward} from './season1Ops';
import {NO_PACKAGES, assetPowerWith} from './upgrades';

export const ARENA_ATTEMPTS_PER_DAY = 3;

/** Score weights (spec §Proving Ground score). Each input is clamped 0..1. */
export const SCORE = {
  enemyDamage: 6000,
  enemyEliminated: 2000,
  ownRemaining: 1500,
  roundEfficiency: 500,
  clearBonus: 2500,
} as const;

/** Paid on the first settled attempt of a day (design §Daily Arena participation reward). */
export const FIELD_CACHE: Reward = {
  credits: 70 + 1 * MODULE_FRAGMENT_AS_CREDITS,
  fuel: 110,
  steel: 90,
  munitions: 60,
  alloy: 50,
};

/** Paid when all three attempts are settled. PROVISIONAL: the spec says "small, configured" and gives no figure. */
export const FULL_ENGAGEMENT_BONUS: Reward = {...NO_REWARD, credits: 40};

/** The week's rank reward needs this many settled attempts that week. */
export const ATTEMPTS_FOR_WEEKLY_REWARD = 3;

export interface RankBand {
  /** Inclusive rank range; `to` null means "and below". */
  from: number;
  to: number | null;
  label: string;
  reward: Reward;
  /** A permanent badge name, when the band grants one (not built yet; recorded on the grant). */
  badge: string | null;
}

const frag = (n: number) => n * MODULE_FRAGMENT_AS_CREDITS;

/** Weekly individual rewards by final rank (design table; fragments as Credits). */
export const RANK_BANDS: readonly RankBand[] = [
  {from: 1, to: 1, label: '1', reward: {credits: 4000 + frag(16), fuel: 5000, steel: 5000, munitions: 3000, alloy: 2500}, badge: 'Season 1 #1 Arena'},
  {from: 2, to: 2, label: '2', reward: {credits: 3000 + frag(12), fuel: 3800, steel: 3800, munitions: 2300, alloy: 1900}, badge: 'Season 1 Top 3'},
  {from: 3, to: 3, label: '3', reward: {credits: 2400 + frag(10), fuel: 3000, steel: 3000, munitions: 1800, alloy: 1500}, badge: 'Season 1 Top 3'},
  {from: 4, to: 10, label: '4–10', reward: {credits: 1600 + frag(7), fuel: 2200, steel: 2200, munitions: 1300, alloy: 1100}, badge: 'Season 1 Top 10'},
  {from: 11, to: 20, label: '11–20', reward: {credits: 1100 + frag(5), fuel: 1600, steel: 1600, munitions: 950, alloy: 800}, badge: 'Season 1 Top 20'},
  {from: 21, to: 50, label: '21–50', reward: {credits: 750 + frag(3), fuel: 1100, steel: 1100, munitions: 650, alloy: 550}, badge: null},
  {from: 51, to: 100, label: '51–100', reward: {credits: 500 + frag(2), fuel: 750, steel: 750, munitions: 440, alloy: 380}, badge: null},
  {from: 101, to: null, label: '101+', reward: {credits: 250 + frag(1), fuel: 350, steel: 350, munitions: 200, alloy: 170}, badge: null},
];

export function bandForRank(rank: number): RankBand {
  return RANK_BANDS.find((b) => rank >= b.from && (b.to === null || rank <= b.to)) ?? RANK_BANDS[RANK_BANDS.length - 1];
}

/* -------------------------------------------------------------------------- */
/* Scoring                                                                    */
/* -------------------------------------------------------------------------- */

export interface ScoreBreakdown {
  enemyDamagePct: number;
  enemyEliminatedPct: number;
  ownRemainingPct: number;
  roundEfficiencyPct: number;
  cleared: boolean;
  terms: {enemyDamage: number; enemyEliminated: number; ownRemaining: number; roundEfficiency: number; clearBonus: number};
  score: number;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));

/** attemptScore from a resolved fight where the player is the attacker. */
export function scoreAttempt(result: CombatResult): ScoreBreakdown {
  const enemyDamagePct = clamp01(1 - result.defender.strength);
  const enemyUnits = result.defender.units.length;
  const enemyEliminatedPct = clamp01(enemyUnits === 0 ? 0 : result.defender.losses / enemyUnits);
  const ownRemainingPct = clamp01(result.attacker.strength);
  // Fewer rounds than the resolver's maximum is efficiency; a full fight is 0.
  const used = Math.max(1, Math.min(ROUNDS, result.rounds.length));
  const roundEfficiencyPct = clamp01(ROUNDS <= 1 ? 0 : (ROUNDS - used) / (ROUNDS - 1));
  const cleared = result.outcome === 'attacker';
  const terms = {
    enemyDamage: SCORE.enemyDamage * enemyDamagePct,
    enemyEliminated: SCORE.enemyEliminated * enemyEliminatedPct,
    ownRemaining: SCORE.ownRemaining * ownRemainingPct,
    roundEfficiency: SCORE.roundEfficiency * roundEfficiencyPct,
    clearBonus: cleared ? SCORE.clearBonus : 0,
  };
  const score = Math.floor(terms.enemyDamage + terms.enemyEliminated + terms.ownRemaining + terms.roundEfficiency + terms.clearBonus);
  return {enemyDamagePct, enemyEliminatedPct, ownRemainingPct, roundEfficiencyPct, cleared, terms, score};
}

export const MAX_ATTEMPT_SCORE = SCORE.enemyDamage + SCORE.enemyEliminated + SCORE.ownRemaining + SCORE.roundEfficiency + SCORE.clearBonus;

/* -------------------------------------------------------------------------- */
/* The Benchmark Squad                                                        */
/* -------------------------------------------------------------------------- */

export const WARDEN_NAME = 'Dominion Warden';
/** The name older attempts were stored under; the same opponent. */
export const BENCHMARK_NAME = WARDEN_NAME;

/** What each benchmark unit is, on the Warden. */
export const HARDPOINT_OF: Record<AssetCategory, string> = {
  armour: 'Main gun turret',
  artillery: 'Rocket battery',
  fixed_wing: 'Missile rack',
  rotary: 'Autocannon pod',
  drone: 'Sensor mast',
  naval: 'Deck gun',
};

export interface Hardpoint {
  index: number;
  name: string;
  category: AssetCategory;
  level: number;
}

/** The Warden's hardpoints, in unit order, with duplicate names numbered. */
export function wardenHardpoints(units: CombatantSpec[]): Hardpoint[] {
  const counts = new Map<string, number>();
  const totals = new Map<string, number>();
  for (const u of units) {
    const c = ASSETS.find((a) => a.id === u.assetId)?.category ?? 'armour';
    totals.set(c, (totals.get(c) ?? 0) + 1);
  }
  return units.map((u, index) => {
    const category = ASSETS.find((a) => a.id === u.assetId)?.category ?? 'armour';
    const n = (counts.get(category) ?? 0) + 1;
    counts.set(category, n);
    const base = HARDPOINT_OF[category];
    return {index, name: (totals.get(category) ?? 1) > 1 ? `${base} ${n}` : base, category, level: u.level};
  });
}

/**
 * Lethality of a snapshot, for choosing the day's source profile. Server
 * weights, itemised here: total power carries most of it; firepower and
 * armour sums and role coverage break ties between equal-power forces.
 */
export const LETHALITY_WEIGHTS = {power: 1, firepower: 6, armour: 4, roleCoverage: 200} as const;

export function lethalityIndex(units: CombatantSpec[]): number {
  let power = 0;
  let fire = 0;
  let armour = 0;
  const roles = new Set<string>();
  for (const u of units) {
    const asset = ASSETS.find((a) => a.id === u.assetId);
    if (!asset) continue;
    power += assetPowerWith(asset, u.level, u.packages ?? NO_PACKAGES, u.boost ?? 1);
    fire += asset.attributes.firepower;
    armour += asset.attributes.armour;
    roles.add(asset.role);
  }
  return Math.round(
    LETHALITY_WEIGHTS.power * power + LETHALITY_WEIGHTS.firepower * fire + LETHALITY_WEIGHTS.armour * armour + LETHALITY_WEIGHTS.roleCoverage * roles.size,
  );
}

/**
 * Turn a player's snapshot into an anonymous Dominion squad: same category,
 * same role, same rank, packages, boost, Combat Systems and slot - a
 * different chassis of that category and role where one exists, so the
 * source's exact collection is not on display. Combat metrics are therefore
 * equivalent; the identity is not.
 */
export function anonymise(units: CombatantSpec[], roll: () => number): CombatantSpec[] {
  return units.map((u, i) => {
    const asset = ASSETS.find((a) => a.id === u.assetId);
    if (!asset) return u;
    const pool = ASSETS.filter(
      (a) => a.draftable !== false && a.category === asset.category && a.role === asset.role && a.id !== asset.id,
    );
    const pick: Asset = pool.length > 0 ? pool[Math.floor(roll() * pool.length)] : asset;
    return {...u, assetId: pick.id, slot: u.slot ?? i, squad: 'Dominion'};
  });
}

/**
 * The bootstrap benchmark for a day with no prior-day profile (the first
 * day of the season, or a dead server): the six starter chassis at the
 * week's readiness-band rank, no packages, no boost. PROVISIONAL.
 */
export const BOOTSTRAP_STARTERS = ['m1a2', 'leclerc', 'f35a', 'rq4', 'm270a2', 'mi35m'] as const;
export const READINESS_BAND_BY_WEEK = [2, 3, 4, 5, 6, 7, 8, 9, 10, 10] as const;

export function bootstrapBenchmark(week: number): CombatantSpec[] {
  const level = READINESS_BAND_BY_WEEK[Math.max(0, Math.min(READINESS_BAND_BY_WEEK.length - 1, week - 1))];
  return BOOTSTRAP_STARTERS.map((assetId, slot) => ({assetId, level, packages: NO_PACKAGES, slot, boost: 1, squad: 'Dominion'}));
}

export function squadPowerOf(units: CombatantSpec[]): number {
  return units.reduce((sum, u) => {
    const asset = ASSETS.find((a) => a.id === u.assetId);
    return sum + (asset ? assetPowerWith(asset, u.level, u.packages ?? NO_PACKAGES, u.boost ?? 1) : 0);
  }, 0);
}

/** What a player may see of the benchmark: chassis, category, rank, power. */
export function benchmarkView(units: CombatantSpec[]): Array<{assetId: string; category: AssetCategory; level: number}> {
  return units.map((u) => {
    const asset = ASSETS.find((a) => a.id === u.assetId);
    return {assetId: u.assetId, category: asset?.category ?? 'armour', level: u.level};
  });
}

/* -------------------------------------------------------------------------- */
/* Ranking                                                                    */
/* -------------------------------------------------------------------------- */

export interface WeeklyStanding {
  playerId: string;
  username: string;
  score: number;
  /** Highest single attempt this week - the first tie-break. */
  best: number;
  attempts: number;
  /** When the final score was reached - the second tie-break (earlier wins). */
  reachedAt: number;
}

/** Deterministic order: score, then best attempt, then earlier, then id. */
export function rankStandings<T extends WeeklyStanding>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) => b.score - a.score || b.best - a.best || a.reachedAt - b.reachedAt || (a.playerId < b.playerId ? -1 : a.playerId > b.playerId ? 1 : 0),
  );
}

export const ARENA_RULES = [
  'Three attempts a day, 00:00 RST reset. You fight with your saved Arena Squad.',
  'One Dominion Warden per server per day, its hardpoints built from yesterday’s strongest profile.',
  'Your best attempt of the day counts; the week is the sum of your daily bests.',
  'Ties: higher single best attempt, then who reached the score first.',
  'Nothing is damaged, spent or marched. An attempt is a fight between two snapshots.',
  'Rewards settle Monday 00:00 RST. A rank reward needs three settled attempts that week.',
];
