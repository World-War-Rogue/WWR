/**
 * Combat Systems: three upgrade lanes per Task Force.
 *
 * Decided 2026-09-07 (ChatGPT design, Matt's approval): per TASK FORCE, not
 * per asset. Every Task Force owns three independent lanes, level 1 to 50,
 * capped by the Command Center like Service Rank. Level 1 is the default and
 * costs nothing; purchases run from level 2.
 *
 *   Fire-Control   +0.5% Task Force damage per level above 1
 *   Survivability  +0.6% Task Force hit points per level above 1
 *   Sustainment    -0.8% repair time per level above 1
 *
 * Only stats the resolver already has. Fire-Control multiplies every shot the
 * Task Force fires (shared/combat.ts `shot`), Survivability multiplies every
 * unit's HP pool (`build`), Sustainment shortens `repairBill` timers for the
 * Task Force an asset sits in when repair starts (worker/repair.ts).
 *
 * The cost curve is the v1 one from the same decision, replacing GAME-MATH's
 * 200 x 1.17^(L-1), which came to roughly three million per lane against
 * 55,605 for a whole Service Rank track: ceil(50 x 1.10^(L-2)). Level 2 = 50,
 * level 10 = 108, level 50 = 4,851, a lane 2->50 = 52,883, three lanes =
 * 158,649. (The decision's prose quoted 5,336 / 52,860, which is the same
 * curve read with exponent L-1; the formula it gave is what is built.)
 * Tokens and Command Credits are the same number, always.
 *
 * Every number here is read by the progression registry
 * (shared/progression.ts); nothing else may restate them.
 */
import type {SquadName} from './assets';

export const COMBAT_SYSTEM_LANES = ['fire_control', 'survivability', 'sustainment'] as const;
export type CombatSystemLane = (typeof COMBAT_SYSTEM_LANES)[number];

export type CombatSystems = Record<CombatSystemLane, number>;

/** Every lane at level 1: bought nothing, gained nothing. */
export const NO_SYSTEMS: CombatSystems = {fire_control: 1, survivability: 1, sustainment: 1};

export const COMBAT_SYSTEM_MIN_LEVEL = 1;
export const COMBAT_SYSTEM_MAX_LEVEL = 50;
export const COMBAT_SYSTEM_COST_BASE = 50;
export const COMBAT_SYSTEM_COST_GROWTH = 1.1;

export const LANE_LABEL: Record<CombatSystemLane, string> = {
  fire_control: 'Fire-Control',
  survivability: 'Survivability',
  sustainment: 'Sustainment',
};

/** What each lane does, per level above 1, as a fraction. */
export const LANE_EFFECT: Record<CombatSystemLane, {stat: string; perLevel: number; wording: string}> = {
  fire_control: {stat: 'damage', perLevel: 0.005, wording: 'Task Force damage'},
  survivability: {stat: 'hp', perLevel: 0.006, wording: 'Task Force hit points'},
  sustainment: {stat: 'repairTime', perLevel: -0.008, wording: 'repair time'},
};

export function isCombatSystemLane(value: unknown): value is CombatSystemLane {
  return typeof value === 'string' && (COMBAT_SYSTEM_LANES as readonly string[]).includes(value);
}

/**
 * Cost of the step from `level - 1` to `level`. 0 outside 2..50, so a caller
 * that asks for a level that does not exist pays nothing and gets nothing -
 * the server refuses the level, not the price.
 */
export function combatSystemStepCost(level: number): number {
  if (!Number.isInteger(level) || level < 2 || level > COMBAT_SYSTEM_MAX_LEVEL) return 0;
  return Math.ceil(COMBAT_SYSTEM_COST_BASE * COMBAT_SYSTEM_COST_GROWTH ** (level - 2));
}

/** Total cost of taking one lane from `from` to `to`. */
export function combatSystemCost(from: number, to: number): number {
  let total = 0;
  for (let l = from + 1; l <= to; l += 1) total += combatSystemStepCost(l);
  return total;
}

/** The lane's total effect at a level, as a signed fraction (+0.055 = +5.5%). */
export function laneEffect(lane: CombatSystemLane, level: number): number {
  const l = Math.max(COMBAT_SYSTEM_MIN_LEVEL, Math.min(COMBAT_SYSTEM_MAX_LEVEL, level));
  return LANE_EFFECT[lane].perLevel * (l - 1);
}

export function fireControlMultiplier(level: number): number {
  return 1 + laneEffect('fire_control', level);
}

export function survivabilityMultiplier(level: number): number {
  return 1 + laneEffect('survivability', level);
}

export function sustainmentMultiplier(level: number): number {
  return 1 + laneEffect('sustainment', level);
}

/** "+5.5%" / "-8.0%", for cards and reports. */
export function effectPercent(lane: CombatSystemLane, level: number): string {
  const pct = laneEffect(lane, level) * 100;
  const sign = pct > 0 ? '+' : pct < 0 ? '−' : '';
  return `${sign}${Math.abs(pct).toFixed(1)}%`;
}

/**
 * The lines a battle report prints for a Task Force's systems - one per lane
 * above level 1, nothing for a lane at 1. The report must itemise every
 * modifier that took part; a bonus nobody can see is a bonus nobody trusts.
 */
export function describeSystems(squad: SquadName | string, systems: CombatSystems): string[] {
  const out: string[] = [];
  for (const lane of COMBAT_SYSTEM_LANES) {
    if (lane === 'sustainment') continue; // not a battle stat
    const level = systems[lane];
    if (level > 1) {
      out.push(`Task Force ${squad} ${LANE_LABEL[lane]} ${level}: ${effectPercent(lane, level)} ${LANE_EFFECT[lane].wording}.`);
    }
  }
  return out;
}

export function systemsFromRow(row: {
  fire_control?: number | null;
  survivability?: number | null;
  sustainment?: number | null;
} | null | undefined): CombatSystems {
  return {
    fire_control: row?.fire_control ?? 1,
    survivability: row?.survivability ?? 1,
    sustainment: row?.sustainment ?? 1,
  };
}
