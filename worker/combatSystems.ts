/**
 * Combat Systems on the server: one row per (player, Task Force), three lane
 * levels on it, bought with the same wallet claim every other upgrade uses.
 *
 * The rules are in shared/combatSystems.ts and the registry; this file only
 * enforces them against the database. Cap = min(season cap, Command Center),
 * exactly as Service Rank; the row's CHECK constraints hold 1..50 whatever a
 * future code path does.
 */
import {SQUAD_NAMES, type SquadName, isSquadName, maxRankForSeason} from '../shared/assets';
import {
  COMBAT_SYSTEM_MAX_LEVEL,
  type CombatSystemLane,
  type CombatSystems,
  LANE_LABEL,
  NO_SYSTEMS,
  combatSystemCost,
  systemsFromRow,
} from '../shared/combatSystems';
import {type Split, defaultSplit, splitIsValid} from '../shared/economy';
import {type Wallet, claimWallet, ledger, settleWallet} from './upgrades';

/**
 * The Arena Squad has its own three lanes under this key: it fights as its
 * own force, so it is fitted as its own force. Same rows, same prices.
 */
export const ARENA_SYSTEMS_KEY = 'Arena';
export type SystemsKey = SquadName | typeof ARENA_SYSTEMS_KEY;
export type SquadSystems = Record<SystemsKey, CombatSystems>;

export function isSystemsKey(value: unknown): value is SystemsKey {
  return value === ARENA_SYSTEMS_KEY || isSquadName(value);
}

interface Row {
  squad: string;
  fire_control: number;
  survivability: number;
  sustainment: number;
}

const COLUMN: Record<CombatSystemLane, string> = {
  fire_control: 'fire_control',
  survivability: 'survivability',
  sustainment: 'sustainment',
};

/** Every Task Force's lanes. A Task Force with no row is at 1/1/1. */
export async function readSystems(db: D1Database, playerId: string): Promise<SquadSystems> {
  const rows = await db
    .prepare(`SELECT squad, fire_control, survivability, sustainment FROM squad_systems WHERE player_id = ?1`)
    .bind(playerId)
    .all<Row>();
  const out = Object.fromEntries([...SQUAD_NAMES, ARENA_SYSTEMS_KEY].map((s) => [s, {...NO_SYSTEMS}])) as SquadSystems;
  for (const r of rows.results ?? []) {
    if (isSystemsKey(r.squad)) out[r.squad] = systemsFromRow(r);
  }
  return out;
}

export type SystemUpResult =
  | {ok: true; wallet: Wallet; systems: SquadSystems}
  | {ok: false; error: string};

/**
 * Raise one lane of one Task Force to `target`.
 *
 * Any number of levels at once (the sum of the steps), the same as Service
 * Rank. Row-first: the Task Force's row is created at 1/1/1 if it does not
 * exist, then the wallet claim and the level update land together.
 */
export async function systemUp(
  db: D1Database,
  playerId: string,
  squad: string,
  lane: CombatSystemLane,
  target: number,
  split: Split | null,
  season: number,
  now: number,
  /** The Command Center's ceiling (shared/buildings.ts rankCeiling). */
  ceiling = COMBAT_SYSTEM_MAX_LEVEL,
): Promise<SystemUpResult> {
  if (!isSystemsKey(squad)) return {ok: false, error: 'No such Task Force.'};
  if (!Number.isInteger(target)) return {ok: false, error: 'Pick a level.'};

  await db
    .prepare(`INSERT OR IGNORE INTO squad_systems (player_id, squad) VALUES (?1, ?2)`)
    .bind(playerId, squad)
    .run();

  const all = await readSystems(db, playerId);
  const current = all[squad][lane];
  if (target <= current) return {ok: false, error: 'Already at that level.'};

  const cap = Math.min(COMBAT_SYSTEM_MAX_LEVEL, maxRankForSeason(season));
  if (target > cap) return {ok: false, error: `Season ${season} caps ${LANE_LABEL[lane]} at ${cap}.`};
  if (target > ceiling) return {ok: false, error: `Command Center must reach level ${target} first.`};

  const cost = combatSystemCost(current, target);
  const wallet = await settleWallet(db, playerId, now);
  const chosen = split ?? defaultSplit(cost, wallet.credits);
  if (!splitIsValid(chosen, cost)) return {ok: false, error: `That does not add up to ${cost}.`};
  if (chosen.tokens > wallet.tokens || chosen.credits > wallet.credits) {
    return {ok: false, error: 'Not enough to cover that.'};
  }

  const column = COLUMN[lane];
  await db.batch([
    claimWallet(db, playerId, wallet, chosen),
    db
      .prepare(
        `UPDATE squad_systems SET ${column} = ?3
          WHERE player_id = ?1 AND squad = ?2 AND ${column} = ?4
            AND EXISTS (SELECT 1 FROM players WHERE id = ?1 AND wallet_rev = ?5)`,
      )
      .bind(playerId, squad, target, current, wallet.rev + 1),
    ledger(
      db,
      playerId,
      'combat-system',
      chosen,
      `${squad}:${lane}`,
      `${squad === ARENA_SYSTEMS_KEY ? 'Arena Squad' : `Task Force ${squad}`} ${LANE_LABEL[lane]} ${current} to ${target}`,
      now,
      wallet.rev,
    ),
  ]);

  const [after, systems] = await Promise.all([
    db
      .prepare(`SELECT tokens, credits, wallet_rev AS rev FROM players WHERE id = ?1`)
      .bind(playerId)
      .first<Wallet>(),
    readSystems(db, playerId),
  ]);
  if (!after) return {ok: false, error: 'Could not read that back.'};
  if (after.rev === wallet.rev) return {ok: false, error: 'Your balance changed. Try that again.'};
  return {ok: true, wallet: after, systems};
}
