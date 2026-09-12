/**
 * Prices.
 *
 * Every number here is PROVISIONAL and every one of them is a named constant
 * for that reason. The cost simulation that settles them is still owed; what
 * this file guarantees is that settling them is a constant change and never a
 * migration or a schema change.
 *
 * ── The two currencies ────────────────────────────────────────────────────
 *
 * Command Credits are earned. Tokens are bought. Both spend on the same things,
 * a player chooses the split, and the server NEVER spends Tokens first - a
 * default that quietly drains the paid currency is the single most resented
 * thing a game of this shape can do.
 *
 * ── Where the curve came from ─────────────────────────────────────────────
 *
 * Brief 08 priced a full 24-asset draft to Rank 10 at 7,800 Command Credits:
 *
 *     24 x (4 x 25 + 5 x 45) = 24 x 325
 *
 * So four rank steps at 25 and five at 45 across Season 1. That is reproduced
 * exactly below, and extended past Season 1 by the same ratio rather than by a
 * second hand-written table.
 *
 * The packages then use the same curve per track, which puts a fully-fitted
 * asset at 4 x 325 = 1,300 Credits of package spend - which is precisely the
 * per-asset target the medal economy was sized against. That is not a
 * coincidence anybody arranged; it is the check that the two documents agree.
 */
import {ASSET_MAX_LEVEL, RANKS_PER_SEASON} from './assets';

/* -------------------------------------------------------------------------- */
/* Test grants                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Free Tokens, weekly, while the game is closed.
 *
 * Checkout does not exist yet, and a tester who cannot buy Tokens cannot test
 * anything Tokens are for. This is the stand-in. It is a TOP-UP rather than a
 * payment: a player below the figure is raised to it once a week, and a player
 * above it is left alone, so every active tester has comparable spending power
 * and nobody who was away for a month comes back with four hundred thousand.
 *
 * Turning this off at launch is this one flag. Nothing else changes, no data is
 * migrated, and balances players already hold are theirs.
 */
export const TEST_GRANTS_ON = true;
export const TEST_TOKEN_FLOOR = 100_000;

/* -------------------------------------------------------------------------- */
/* Service Rank                                                               */
/* -------------------------------------------------------------------------- */

/** Cost of the first four rank steps of a season. */
export const RANK_STEP_BASE = 25;
/** Cost of the remaining steps, as a multiple of the base. 25 -> 45. */
export const RANK_STEP_GROWTH = 1.8;

/**
 * What it costs to go from `from` to `from + 1`.
 *
 * Season 1 reproduces brief 08 exactly: 25 for steps out of ranks 1-4, and 45
 * for steps out of ranks 5-9. Past that the same 1.8 ratio applies per band of
 * five, so a season is always worth roughly the same proportion of a player's
 * income and no band is a cliff.
 */
export function rankStepCost(from: number): number {
  if (from < 1 || from >= ASSET_MAX_LEVEL) return 0;
  const band = Math.floor(from / 5);
  return Math.round(RANK_STEP_BASE * RANK_STEP_GROWTH ** band);
}

/** Total cost of moving an asset from one rank to another. */
export function rankCost(from: number, to: number): number {
  let total = 0;
  for (let i = from; i < to; i += 1) total += rankStepCost(i);
  return total;
}

/* -------------------------------------------------------------------------- */
/* Packages                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * A package rank costs what the Service Rank step at that level costs.
 *
 * One curve rather than two. It makes the per-asset package sink 4x the rank
 * sink, which is what closes the Season 1 economy hole - Service Rank alone was
 * only ever going to absorb 7,800 Credits of a season that pays out far more.
 */
export function packageStepCost(from: number): number {
  return rankStepCost(from);
}

export function packageCost(from: number, to: number): number {
  let total = 0;
  for (let i = from; i < to; i += 1) total += packageStepCost(i);
  return total;
}

/* -------------------------------------------------------------------------- */
/* Season totals, so the sink can be checked against the income               */
/* -------------------------------------------------------------------------- */

/** What one asset costs to take to a season cap and fit out completely. */
export function fullAssetCost(cap: number): number {
  return rankCost(1, cap) + 4 * packageCost(1, cap);
}

/** The whole draft, fully fitted, at a season cap. The season's total sink. */
export function fullDraftCost(cap: number, draftSize = 24): number {
  return fullAssetCost(cap) * draftSize;
}

export const SEASON_1_CAP = RANKS_PER_SEASON;

/* -------------------------------------------------------------------------- */
/* Spending                                                                   */
/* -------------------------------------------------------------------------- */

export interface Split {
  tokens: number;
  credits: number;
}

/**
 * Whether a split is one the server will accept.
 *
 * The request carries only a target and a split; the COST is always recomputed
 * server-side from the catalogue, so a client that lies about the price is
 * rejected rather than obeyed. This checks the shape and the arithmetic; the
 * balances are checked by the conditional UPDATE, which is the only place two
 * tabs cannot both pass.
 */
export function splitIsValid(split: Split, cost: number): boolean {
  if (!Number.isInteger(split.tokens) || !Number.isInteger(split.credits)) return false;
  if (split.tokens < 0 || split.credits < 0) return false;
  return split.tokens + split.credits === cost;
}

/**
 * The split to use when the client did not choose one.
 *
 * Credits first, always, and Tokens only for what Credits cannot cover. This is
 * the rule from brief 08 §8 written down as code so no call site can forget it.
 */
export function defaultSplit(cost: number, credits: number): Split {
  const fromCredits = Math.min(cost, Math.max(0, credits));
  return {credits: fromCredits, tokens: cost - fromCredits};
}
