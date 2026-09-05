/**
 * Marching.
 *
 * A squad leaves your plot, crosses the map, and arrives. The defender sees it
 * coming, which is the whole point: it is the difference between a strategy
 * game and a slot machine, and it is what makes the rendezvous point, the
 * alliance and the map itself matter.
 */

/** Seconds to cross one plot at mobility 5, the middle of the range. */
export const SECONDS_PER_PLOT = 7;

/** Nothing arrives instantly, however close or however fast. */
export const MIN_MARCH_SECONDS = 45;

/** And nothing is an evening's commitment. */
export const MAX_MARCH_SECONDS = 40 * 60;

/**
 * How long a squad takes to cross a distance.
 *
 * The SLOWEST asset sets the pace, because a column moves at the speed of its
 * slowest vehicle. That is a real cost of bringing heavy armour and a real
 * reason to build a fast squad for answering calls, without either being
 * written into a stat nobody can see.
 */
export function marchSeconds(plots: number, slowestMobility: number): number {
  const speed = Math.max(1, slowestMobility) / 5;
  const raw = (plots * SECONDS_PER_PLOT) / speed;
  return Math.round(Math.min(MAX_MARCH_SECONDS, Math.max(MIN_MARCH_SECONDS, raw)));
}

export function plotsBetween(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(bx - ax, by - ay);
}

/** Where a march has got to, 0 at departure and 1 on arrival. */
export function marchProgress(departedAt: number, arrivesAt: number, now: number): number {
  if (arrivesAt <= departedAt) return 1;
  return Math.min(1, Math.max(0, (now - departedAt) / (arrivesAt - departedAt)));
}

/**
 * What a march is for.
 *
 * A return leg is a march like any other on purpose - drawn on the map, taking
 * the same time, watched by everybody. The squad is away for the whole round
 * trip rather than only the journey out, which is most of what attacking
 * actually costs.
 */
export type MarchKind = 'attack' | 'reinforce' | 'return';

/**
 * How long a reinforcing squad stands at an ally's base before coming home.
 *
 * Long enough to actually be there when a raid lands, short enough that
 * parking a squad on somebody is a decision you revisit rather than a place
 * you leave it.
 */
export const GARRISON_HOURS = 8;

export interface MarchView {
  id: string;
  attacker: string;
  defender: string;
  squad: string;
  from: {x: number; y: number};
  to: {x: number; y: number};
  departedAt: number;
  arrivesAt: number;
  /** True when this march is one of yours. */
  mine: boolean;
  /** True when it is heading at you. */
  incoming: boolean;
  kind: MarchKind;
}
