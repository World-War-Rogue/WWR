/**
 * Battle reports.
 *
 * Combat does not exist yet. This is the shape a battle has to be recorded in
 * when it does, written now because deciding what a report must show is the
 * cheap half of combat and doing it first means the combat code has a target
 * rather than a blank page.
 *
 * The rule it is built around: a report is written once, when the battle
 * resolves, and never recomputed. A report that re-derives itself from current
 * base state would change every time anybody upgraded anything, and a battle
 * whose story changes after the fact is worse than no report at all.
 */

export type BattleOutcome = 'attacker' | 'defender' | 'draw';
export type BattleSide = 'attacker' | 'defender';

/** The row a report list is built from. Everything here is denormalised. */
export interface BattleSummary {
  id: string;
  foughtAt: number;
  worldId: number;
  x: number;
  y: number;
  outcome: BattleOutcome;
  /** Which side the viewer was on, so the list can say won or lost, not who won. */
  yourSide: BattleSide;
  attacker: {name: string; alliance: string | null; power: number; losses: number};
  defender: {name: string; alliance: string | null; power: number; losses: number};
  loot: Loot;
}

export interface Loot {
  fuel: number;
  steel: number;
  munitions: number;
  alloy: number;
}

export const EMPTY_LOOT: Loot = {fuel: 0, steel: 0, munitions: 0, alloy: 0};

/**
 * The blow-by-blow, stored as JSON in one column.
 *
 * Deliberately not a table. The shape of a combat log will change every time
 * combat is tuned, and a schema that tracks it means a migration each time a
 * number moves. Nothing queries inside a log - reports are found by who fought
 * and when, both of which are real columns.
 */
export interface BattleDetail {
  /** Bumped when the shape changes, so an old report can still be rendered. */
  version: 1;
  rounds: BattleRound[];
  /** Per-squad outcome, in the order they were committed. */
  squads: SquadResult[];
  /** Free-text notes the resolver wants to surface - terrain, surprise, retreat. */
  notes: string[];
}

export interface BattleRound {
  index: number;
  /** What happened, already phrased for a player: "Bravo broke the north flank." */
  summary: string;
  attackerDamage: number;
  defenderDamage: number;
}

export interface SquadResult {
  side: BattleSide;
  squad: string;
  /** Hero ids committed, so the report can show what was actually fielded. */
  heroes: string[];
  losses: number;
  survived: boolean;
}

export const EMPTY_DETAIL: BattleDetail = {version: 1, rounds: [], squads: [], notes: []};

export function parseDetail(raw: string): BattleDetail {
  try {
    const value = JSON.parse(raw) as Partial<BattleDetail>;
    if (value?.version !== 1) return EMPTY_DETAIL;
    return {
      version: 1,
      rounds: Array.isArray(value.rounds) ? value.rounds : [],
      squads: Array.isArray(value.squads) ? value.squads : [],
      notes: Array.isArray(value.notes) ? value.notes : [],
    };
  } catch {
    return EMPTY_DETAIL;
  }
}

/** Won, lost or drew - from the viewer's side, which is the only framing that reads. */
export function verdictFor(outcome: BattleOutcome, side: BattleSide): 'won' | 'lost' | 'drew' {
  if (outcome === 'draw') return 'drew';
  return outcome === side ? 'won' : 'lost';
}

/** How many reports one page of the list holds. */
export const REPORTS_PER_PAGE = 25;

/** Reports older than this are dropped, the same way chat messages are. */
export const REPORT_RETENTION_DAYS = 30;
