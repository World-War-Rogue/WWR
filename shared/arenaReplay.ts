/**
 * Replaying a resolved Arena battle.
 *
 * The server resolves the fight and stores the result with every shot the
 * resolver applied (shared/combat.ts CombatEvent). The battle view plays
 * those shots back. Nothing here decides anything: a frame is the state
 * after the first N shots, the last frame IS the report, and skipping to
 * the result is asking for the last frame. These functions are pure so the
 * tests can prove the replay agrees with the result it was cut from.
 */
import {type Asset, ASSET_BY_ID, type AssetCategory} from './assets';
import type {CombatEvent, CombatResult, CombatantSpec} from './combat';
import type {ScoreBreakdown} from './arena';

export interface UnitState {
  /** 0-1 of the unit's own pool. */
  hp: number;
  /** Damage taken so far, in resolver units. */
  taken: number;
  /** Damage dealt so far, in resolver units. */
  dealt: number;
  shots: number;
  /** The shot that broke it, when one did. */
  brokenAt: number | null;
}

export interface ReplayState {
  attacker: UnitState[];
  defender: UnitState[];
  /** Shots applied so far. */
  cursor: number;
}

export function initialState(attacker: CombatantSpec[], defender: CombatantSpec[]): ReplayState {
  const fresh = (units: CombatantSpec[]) =>
    units.map((u) => ({hp: Math.max(0, Math.min(1, u.hpFraction ?? 1)), taken: 0, dealt: 0, shots: 0, brokenAt: null}));
  return {attacker: fresh(attacker), defender: fresh(defender), cursor: 0};
}

/** The state with one more shot applied. Returns a new object; the input is not touched. */
export function applyEvent(state: ReplayState, ev: CombatEvent, at: number): ReplayState {
  const attacker = state.attacker.map((u) => ({...u}));
  const defender = state.defender.map((u) => ({...u}));
  const shooters = ev.side === 'attacker' ? attacker : defender;
  const targets = ev.side === 'attacker' ? defender : attacker;
  const shooter = shooters[ev.shooter];
  const target = targets[ev.target];
  if (shooter) {
    shooter.dealt += ev.damage;
    shooter.shots += 1;
  }
  if (target) {
    target.taken += ev.damage;
    target.hp = ev.remaining;
    if (ev.broke && target.brokenAt === null) target.brokenAt = at;
  }
  return {attacker, defender, cursor: state.cursor + 1};
}

/** The state after the first `n` shots (all of them when n is past the end). */
export function stateAfter(attacker: CombatantSpec[], defender: CombatantSpec[], events: CombatEvent[], n: number): ReplayState {
  let state = initialState(attacker, defender);
  const upTo = Math.max(0, Math.min(events.length, n));
  for (let i = 0; i < upTo; i += 1) state = applyEvent(state, events[i], i);
  return state;
}

/** Skip to Result: the last frame. */
export function finalState(attacker: CombatantSpec[], defender: CombatantSpec[], events: CombatEvent[]): ReplayState {
  return stateAfter(attacker, defender, events, events.length);
}

/**
 * Whether a replay of `events` lands on `result`. True when every unit's
 * remaining pool after the last shot matches the result's, and the losses
 * agree. This is what the tests hold the resolver to.
 */
export function replayAgrees(attacker: CombatantSpec[], defender: CombatantSpec[], result: CombatResult, tolerance = 0.002): boolean {
  const events = result.events ?? [];
  const end = finalState(attacker, defender, events);
  const check = (states: UnitState[], units: CombatResult['attacker']['units'], specs: CombatantSpec[]) => {
    // build() skips unknown assets, so result units line up with the known specs in order.
    const known = specs.map((u, i) => ({u, i})).filter(({u}) => !!ASSET_BY_ID[u.assetId]);
    if (known.length !== units.length) return false;
    return known.every(({i}, k) => {
      const want = units[k];
      const have = states[i];
      if (!have) return false;
      if (Math.abs(have.hp - want.remaining) > tolerance) return false;
      if (want.damaged !== (have.hp <= tolerance)) return false;
      return true;
    });
  };
  return check(end.attacker, result.attacker.units, attacker) && check(end.defender, result.defender.units, defender);
}

/* -------------------------------------------------------------------------- */
/* Timeline                                                                   */
/* -------------------------------------------------------------------------- */

export type WeaponKind = 'gun' | 'rocket' | 'missile' | 'burst' | 'strike';

/** What a category fires, for the replay's tracer or trail. */
export const WEAPON_OF: Record<AssetCategory, WeaponKind> = {
  armour: 'gun',
  artillery: 'rocket',
  fixed_wing: 'missile',
  rotary: 'burst',
  drone: 'strike',
  naval: 'gun',
};

export function weaponOf(assetId: string): WeaponKind {
  const asset: Asset | undefined = ASSET_BY_ID[assetId];
  return asset ? WEAPON_OF[asset.category] : 'gun';
}

export interface TimelineLine {
  index: number;
  round: number;
  side: 'attacker' | 'defender';
  text: string;
}

/** The report's simple timeline: one line per shot, in order. */
export function timeline(events: CombatEvent[], attackerNames: string[], defenderNames: string[]): TimelineLine[] {
  const name = (side: 'attacker' | 'defender', i: number) => (side === 'attacker' ? attackerNames : defenderNames)[i] ?? `#${i + 1}`;
  return events.map((ev, index) => {
    const other = ev.side === 'attacker' ? 'defender' : 'attacker';
    const shooter = name(ev.side, ev.shooter);
    const target = name(other, ev.target);
    const pct = Math.round(ev.remaining * 100);
    const text = ev.broke
      ? `${shooter} hits ${target} for ${ev.damage}: ${target} is out.`
      : ev.damage <= 0
        ? `${shooter} fires at ${target}: no damage.`
        : `${shooter} hits ${target} for ${ev.damage} (${pct}% left).`;
    return {index, round: ev.round, side: ev.side, text};
  });
}

/** Total damage dealt by a side across the fight. */
export function totalDealt(events: CombatEvent[], side: 'attacker' | 'defender'): number {
  return events.filter((e) => e.side === side).reduce((sum, e) => sum + e.damage, 0);
}

/* -------------------------------------------------------------------------- */
/* Storage                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * What an attempt row stores beyond the score: the opponent snapshot,
 * every shot, both sides' results and the seed - so a report re-opened
 * later shows the fight as it was, whatever the assets have become since.
 */
export interface StoredBattle {
  opponent: string;
  benchmark: CombatantSpec[];
  events: CombatEvent[];
  rounds: CombatResult['rounds'];
  notes: string[];
  attacker: CombatResult['attacker'];
  defender: CombatResult['defender'];
  seed: number;
}

export function storedBattle(result: CombatResult, opponent: string, benchmark: CombatantSpec[], seed: number): StoredBattle {
  return {opponent, benchmark, events: result.events ?? [], rounds: result.rounds, notes: result.notes, attacker: result.attacker, defender: result.defender, seed};
}

/**
 * Read a stored attempt's JSON back into its score and its battle. Rows
 * written before replays existed have the score and no battle; the report
 * still opens, without a replay.
 */
export function parseStoredAttempt(raw: string, fallbackOpponent: string, fallbackSeed: number): {breakdown: ScoreBreakdown | null; battle: StoredBattle | null} {
  let parsed: (ScoreBreakdown & Partial<StoredBattle>) | null = null;
  try {
    parsed = JSON.parse(raw) as ScoreBreakdown & Partial<StoredBattle>;
  } catch {
    parsed = null;
  }
  if (!parsed || typeof parsed !== 'object') return {breakdown: null, battle: null};
  const {opponent, benchmark, events, rounds, notes, attacker, defender, seed, ...score} = parsed;
  const battle: StoredBattle | null =
    attacker && defender
      ? {
          opponent: opponent ?? fallbackOpponent,
          benchmark: benchmark ?? [],
          events: events ?? [],
          rounds: rounds ?? [],
          notes: notes ?? [],
          attacker,
          defender,
          seed: seed ?? fallbackSeed,
        }
      : null;
  return {breakdown: 'terms' in score ? (score as ScoreBreakdown) : null, battle};
}
