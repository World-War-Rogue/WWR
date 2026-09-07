/**
 * Dominion Warfront: the weekly alliance-versus-alliance competition on each
 * server. Monday 00:00 RST to the next Monday 00:00 RST.
 *
 * Source: docs/SEASON-1-LIVE-OPS-DESIGN-v1.md §Dominion Warfront and
 * docs/SEASON-1-LIVE-OPS-v1.md §Warfront, with the 7 September rulings
 * (Monday resets, module fragments paid as Credits, no Tokens ever).
 *
 * The shape that matters: every member earns Warfront Score in three metrics
 * - Assault, Operations, Support - each capped per day, and the three
 * together capped at 1,000 a day. The alliance's week is the sum of its
 * eligible members' capped days, plus a bonus per active member, plus a
 * bonus per coordinated operation. One nonstop premium player cannot carry
 * a roster; several ordinary active members outscore them.
 *
 * Eligibility is the same 48-hour continuous-membership clock the Trade
 * Post uses: points earned before that mark count for no alliance, and a
 * player who leaves is not paid for the week however much they contributed.
 */
import {MODULE_FRAGMENT_AS_CREDITS, type Reward} from './season1Ops';

export const WARFRONT_METRICS = ['assault', 'operations', 'support'] as const;
export type WarfrontMetric = (typeof WARFRONT_METRICS)[number];

export function isWarfrontMetric(value: unknown): value is WarfrontMetric {
  return typeof value === 'string' && (WARFRONT_METRICS as readonly string[]).includes(value);
}

export const METRIC_LABEL: Record<WarfrontMetric, string> = {
  assault: 'Assault',
  operations: 'Operations',
  support: 'Support',
};

export const METRIC_BLURB: Record<WarfrontMetric, string> = {
  assault: 'Battles: Factory Probes, Mech Patrols, the Arena.',
  operations: 'Daily Operations lanes and Cache, relays, convoys, silos, contracts.',
  support: 'Reinforcing an ally, and alliance-operation support roles.',
};

/** Server configuration (design §warfront). */
export const WARFRONT = {
  perPlayerDailyCap: 1000,
  metricDailyCap: {assault: 450, operations: 350, support: 300} as Record<WarfrontMetric, number>,
  /** A member with at least this much valid score in the week is "active". */
  activeMemberThreshold: 500,
  activeMemberBonus: 350,
  activeMemberBonusCap: 60,
  coordinatedOperationScore: 500,
  coordinatedOperationWeeklyCap: 10,
  /** Continuous membership before points count and before a payout. */
  membershipHoursForEligibility: 48,
  /** Personal weekly score a member needs for the week's reward... */
  memberRewardThreshold: 1500,
  /** ...except in the registered-participant tier. */
  participantRewardThreshold: 500,
} as const;

export const MEMBERSHIP_ELIGIBILITY_MS = WARFRONT.membershipHoursForEligibility * 3600 * 1000;

/**
 * What each action is worth (design table). Values the table does not list
 * are PROVISIONAL and marked. One action, one metric.
 */
export const POINTS = {
  dailyLane: {metric: 'operations' as WarfrontMetric, points: 35, label: 'Complete one Daily Operations lane'},
  dailyCache: {metric: 'operations' as WarfrontMetric, points: 100, label: 'Claim the Daily Operations Cache'},
  contract: {metric: 'operations' as WarfrontMetric, points: 90, label: 'Win a neutral contract'},
  arenaDay: {metric: 'assault' as WarfrontMetric, points: 80, label: 'Complete three Arena attempts in a day'},
  /** PROVISIONAL: the design lists exercises by metric but gives no figure. */
  exerciseBattle: {metric: 'assault' as WarfrontMetric, points: 60, label: 'Win a map exercise battle (Factory Probe, Mech Patrol)'},
  exerciseHold: {metric: 'operations' as WarfrontMetric, points: 45, label: 'Hold a map exercise target (Relay, Convoy, Silo)'},
  /** PROVISIONAL: reinforcement is the one Support action that exists today. */
  reinforce: {metric: 'support' as WarfrontMetric, points: 60, label: 'Reinforce an ally'},
  allianceOperation: {metric: 'support' as WarfrontMetric, points: 120, label: 'Complete an alliance operation objective'},
} as const;

export type PointSource = keyof typeof POINTS;

/** A member's raw metric totals for one day. */
export interface DayMetrics {
  assault: number;
  operations: number;
  support: number;
}

export const NO_METRICS: DayMetrics = {assault: 0, operations: 0, support: 0};

/** The design's cap formula: each metric to its cap, then the day to 1,000. */
export function cappedDayScore(m: DayMetrics): number {
  const perMetric = WARFRONT_METRICS.reduce((sum, k) => sum + Math.min(Math.max(0, m[k]), WARFRONT.metricDailyCap[k]), 0);
  return Math.min(WARFRONT.perPlayerDailyCap, perMetric);
}

export function cappedMetric(k: WarfrontMetric, earned: number): number {
  return Math.min(Math.max(0, earned), WARFRONT.metricDailyCap[k]);
}

/* -------------------------------------------------------------------------- */
/* The alliance's week                                                        */
/* -------------------------------------------------------------------------- */

export interface MemberWeek {
  playerId: string;
  username: string;
  /** Sum of capped daily scores this week, counted for this alliance. */
  score: number;
  /** When the member's score last rose. */
  reachedAt: number;
}

export interface AllianceScore {
  memberSum: number;
  contributors: number;
  activeMembers: number;
  activeBonus: number;
  coordinatedOps: number;
  coordinatedBonus: number;
  total: number;
  /** Earliest instant the alliance held its final score (the last rise). */
  reachedAt: number;
}

export function allianceScore(members: MemberWeek[], coordinatedOps: number): AllianceScore {
  const memberSum = members.reduce((sum, m) => sum + m.score, 0);
  const contributors = members.filter((m) => m.score > 0).length;
  const activeMembers = Math.min(WARFRONT.activeMemberBonusCap, members.filter((m) => m.score >= WARFRONT.activeMemberThreshold).length);
  const activeBonus = activeMembers * WARFRONT.activeMemberBonus;
  const ops = Math.min(WARFRONT.coordinatedOperationWeeklyCap, Math.max(0, coordinatedOps));
  const coordinatedBonus = ops * WARFRONT.coordinatedOperationScore;
  const reachedAt = members.reduce((latest, m) => Math.max(latest, m.reachedAt), 0);
  return {memberSum, contributors, activeMembers, activeBonus, coordinatedOps: ops, coordinatedBonus, total: memberSum + activeBonus + coordinatedBonus, reachedAt};
}

export interface AllianceStanding {
  allianceId: string;
  tag: string;
  name: string;
  score: AllianceScore;
  /** Featured weekly objective completions - none exist yet; the tie-break slot is kept. */
  featured: number;
}

/** Deterministic order: score, distinct contributors, featured objectives, earlier, id. */
export function rankAlliances<T extends AllianceStanding>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) =>
      b.score.total - a.score.total ||
      b.score.contributors - a.score.contributors ||
      b.featured - a.featured ||
      a.score.reachedAt - b.score.reachedAt ||
      (a.allianceId < b.allianceId ? -1 : a.allianceId > b.allianceId ? 1 : 0),
  );
}

/* -------------------------------------------------------------------------- */
/* Divisions and rewards                                                      */
/* -------------------------------------------------------------------------- */

const frag = (n: number) => n * MODULE_FRAGMENT_AS_CREDITS;

export interface Division {
  from: number;
  to: number | null;
  name: string;
  label: string;
  /** Deposited to the alliance's Operations Treasury. Null: milestone pool only. */
  pool: Reward | null;
  member: Reward;
  /** Personal weekly score a member needs to be paid. */
  memberThreshold: number;
}

/** Design table §Warfront divisions and rewards; fragments as Credits. */
export const DIVISIONS: readonly Division[] = [
  {
    from: 1,
    to: 1,
    name: 'Dominion Breakers',
    label: '1',
    pool: {credits: 10_000 + frag(60), fuel: 16_000, steel: 16_000, munitions: 10_000, alloy: 10_000},
    member: {credits: 700 + frag(6), fuel: 900, steel: 900, munitions: 550, alloy: 550},
    memberThreshold: WARFRONT.memberRewardThreshold,
  },
  {
    from: 2,
    to: 3,
    name: 'Iron Vanguard',
    label: '2–3',
    pool: {credits: 7000 + frag(42), fuel: 11_000, steel: 11_000, munitions: 7000, alloy: 7000},
    member: {credits: 520 + frag(4), fuel: 700, steel: 700, munitions: 430, alloy: 430},
    memberThreshold: WARFRONT.memberRewardThreshold,
  },
  {
    from: 4,
    to: 10,
    name: 'Factory Raiders',
    label: '4–10',
    pool: {credits: 4500 + frag(28), fuel: 7000, steel: 7000, munitions: 4500, alloy: 4500},
    member: {credits: 360 + frag(3), fuel: 520, steel: 520, munitions: 320, alloy: 320},
    memberThreshold: WARFRONT.memberRewardThreshold,
  },
  {
    from: 11,
    to: 25,
    name: 'Scrapland Companies',
    label: '11–25',
    pool: {credits: 2500 + frag(14), fuel: 4000, steel: 4000, munitions: 2500, alloy: 2500},
    member: {credits: 220 + frag(2), fuel: 330, steel: 330, munitions: 200, alloy: 200},
    memberThreshold: WARFRONT.memberRewardThreshold,
  },
  {
    from: 26,
    to: null,
    name: 'Registered participants',
    label: '26+',
    pool: null,
    member: {credits: 120 + frag(1), fuel: 180, steel: 180, munitions: 110, alloy: 110},
    memberThreshold: WARFRONT.participantRewardThreshold,
  },
];

export function divisionForRank(rank: number): Division {
  return DIVISIONS.find((d) => rank >= d.from && (d.to === null || rank <= d.to)) ?? DIVISIONS[DIVISIONS.length - 1];
}

/** Whether a membership that began at `joinedAt` is eligible at `instant`. */
export function membershipEligible(joinedAt: number, instant: number): boolean {
  return instant - joinedAt >= MEMBERSHIP_ELIGIBILITY_MS;
}

export const WARFRONT_RULES = [
  'Runs Monday 00:00 RST to Monday 00:00 RST. Every server ranks its alliances by Warfront Score.',
  'Each member can contribute at most 1,000 a day: Assault to 450, Operations to 350, Support to 300.',
  'Alliance score = the sum of members’ capped days + 350 per active member (500+ that week, up to 60) + 500 per coordinated operation (up to 10).',
  'Points count for an alliance only after 48 continuous hours of membership. Leave, and the week is not paid.',
  'Ties: distinct contributors, then featured objectives, then who reached the score first.',
  'The alliance pool goes to the Operations Treasury with an open ledger; it can fund posted alliance operations only.',
  'A member reward needs 1,500 personal score that week (500 in the registered tier) and 48 hours of membership at settlement.',
];
