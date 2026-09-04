/**
 * Rosters and squads.
 *
 * Two server rules carry this file. An asset may sit in exactly one squad, and
 * a squad may not exceed its lift budget. Both are checked here and neither is
 * trusted from the browser: a client that decides what fits is a client that
 * fields six Abrams.
 */
import {
  ASSET_BY_ID,
  DRAFTABLE,
  SQUAD_NAMES,
  SQUAD_SLOTS,
  type SquadName,
  assetPower,
  squadLiftBudget,
} from '../shared/assets';

export interface OwnedAsset {
  assetId: string;
  level: number;
}

export type SquadBoard = Record<SquadName, Array<string | null>>;

function emptyBoard(): SquadBoard {
  return Object.fromEntries(
    SQUAD_NAMES.map((name) => [name, Array<string | null>(SQUAD_SLOTS).fill(null)]),
  ) as SquadBoard;
}

/**
 * Everything this player holds, granting the catalogue on first look.
 *
 * There is no draft yet, so the roster is handed over whole the first time it
 * is asked for. Granting on read rather than at signup means the accounts that
 * already exist get theirs too, without a backfill script that has to be run
 * once and then remembered about forever.
 */
export async function ensureRoster(
  db: D1Database,
  playerId: string,
  now: number,
): Promise<OwnedAsset[]> {
  const existing = await db
    .prepare(`SELECT asset_id AS assetId, level FROM player_assets WHERE player_id = ?1`)
    .bind(playerId)
    .all<OwnedAsset>();
  if ((existing.results ?? []).length > 0) return existing.results ?? [];

  await db.batch(
    DRAFTABLE.map((asset) =>
      db
        .prepare(
          `INSERT INTO player_assets (player_id, asset_id, level, acquired_at)
           VALUES (?1, ?2, 1, ?3) ON CONFLICT DO NOTHING`,
        )
        .bind(playerId, asset.id, now),
    ),
  );

  const after = await db
    .prepare(`SELECT asset_id AS assetId, level FROM player_assets WHERE player_id = ?1`)
    .bind(playerId)
    .all<OwnedAsset>();
  return after.results ?? [];
}

export async function readSquads(db: D1Database, playerId: string): Promise<SquadBoard> {
  const rows = await db
    .prepare(`SELECT squad, slot, asset_id AS assetId FROM squad_slots WHERE player_id = ?1`)
    .bind(playerId)
    .all<{squad: string; slot: number; assetId: string}>();

  const board = emptyBoard();
  for (const row of rows.results ?? []) {
    const squad = row.squad as SquadName;
    if (!board[squad]) continue;
    if (row.slot < 0 || row.slot >= SQUAD_SLOTS) continue;
    board[squad][row.slot] = row.assetId;
  }
  return board;
}

/** Lift already committed to a squad, ignoring one slot being changed. */
function liftOfSquad(board: SquadBoard, squad: SquadName, ignoreSlot: number): number {
  return board[squad].reduce<number>((sum, id, index) => {
    if (index === ignoreSlot || !id) return sum;
    return sum + (ASSET_BY_ID[id]?.lift ?? 0);
  }, 0);
}

export type AssignResult = {ok: true} | {ok: false; error: string};

/**
 * Put an asset in a slot, or clear the slot.
 *
 * The lift check happens against the board as it will be AFTER the change, not
 * as it is now, so swapping a heavy asset for a lighter one in a full squad is
 * allowed rather than being refused for a state that is about to stop existing.
 *
 * Moving an asset that is already in another squad moves it, rather than
 * failing. That is what a player means by dragging it, and the alternative is
 * making them clear the old slot first for no reason - the unique index still
 * guarantees it only ever sits in one place.
 */
export async function assignSlot(
  db: D1Database,
  playerId: string,
  squad: SquadName,
  slot: number,
  assetId: string | null,
  buildingLevels: {motor_pool: number; airfield: number; barracks: number},
): Promise<AssignResult> {
  if (slot < 0 || slot >= SQUAD_SLOTS) return {ok: false, error: 'No such slot.'};

  if (assetId === null) {
    await db
      .prepare(`DELETE FROM squad_slots WHERE player_id = ?1 AND squad = ?2 AND slot = ?3`)
      .bind(playerId, squad, slot)
      .run();
    return {ok: true};
  }

  const asset = ASSET_BY_ID[assetId];
  if (!asset) return {ok: false, error: 'No such asset.'};

  const owned = await db
    .prepare(`SELECT 1 AS ok FROM player_assets WHERE player_id = ?1 AND asset_id = ?2`)
    .bind(playerId, assetId)
    .first<{ok: number}>();
  if (!owned) return {ok: false, error: 'You do not hold that asset.'};

  const board = await readSquads(db, playerId);
  const budget = squadLiftBudget(buildingLevels);
  const wouldUse = liftOfSquad(board, squad, slot) + asset.lift;
  if (wouldUse > budget) {
    return {
      ok: false,
      error: `${asset.name} needs ${asset.lift} lift and ${squad} has ${budget - liftOfSquad(board, squad, slot)} left. Raise the Motor Pool, Airfield or Barracks.`,
    };
  }

  // Two writes, one batch: take the asset out of wherever it was, then put it
  // in. Done in the other order the unique index rejects the insert against
  // the row that is about to be removed.
  await db.batch([
    db
      .prepare(`DELETE FROM squad_slots WHERE player_id = ?1 AND asset_id = ?2`)
      .bind(playerId, assetId),
    db
      .prepare(
        `INSERT INTO squad_slots (player_id, squad, slot, asset_id)
         VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(player_id, squad, slot) DO UPDATE SET asset_id = excluded.asset_id`,
      )
      .bind(playerId, squad, slot, assetId),
  ]);
  return {ok: true};
}

/** Squad power, for the header. Computed on read like every other power in the game. */
export function squadPower(board: SquadBoard, levels: Map<string, number>, squad: SquadName): number {
  return board[squad].reduce<number>((sum, id) => {
    if (!id) return sum;
    const asset = ASSET_BY_ID[id];
    if (!asset) return sum;
    return sum + assetPower(asset, levels.get(id) ?? 1);
  }, 0);
}

export function squadLiftUsed(board: SquadBoard, squad: SquadName): number {
  return board[squad].reduce<number>(
    (sum, id) => sum + (id ? ASSET_BY_ID[id]?.lift ?? 0 : 0),
    0,
  );
}

/**
 * Move an asset to another slot, swapping with whatever is already there.
 *
 * A swap has to be ONE operation, not two assignments. Done as two, the middle
 * state has both assets in the same slot or neither in any, and the unique
 * index rejects it - so the obvious implementation fails and the workaround
 * for it is a window where a player's squads are wrong. Both rows are written
 * in a single batch instead.
 *
 * Lift is checked on both squads as they will be AFTER the swap. Dragging a
 * heavy asset into a full squad and a light one back out can leave both legal
 * even though the intermediate state is not, and refusing that would be
 * refusing the exact move a player makes to fix an over-committed squad.
 */
export async function moveSlot(
  db: D1Database,
  playerId: string,
  from: {squad: SquadName; slot: number},
  to: {squad: SquadName; slot: number},
  buildingLevels: {motor_pool: number; airfield: number; barracks: number},
): Promise<AssignResult> {
  if (from.slot < 0 || from.slot >= SQUAD_SLOTS) return {ok: false, error: 'No such slot.'};
  if (to.slot < 0 || to.slot >= SQUAD_SLOTS) return {ok: false, error: 'No such slot.'};
  if (from.squad === to.squad && from.slot === to.slot) return {ok: true};

  const board = await readSquads(db, playerId);
  const moving = board[from.squad]?.[from.slot] ?? null;
  if (!moving) return {ok: false, error: 'Nothing to move.'};
  const displaced = board[to.squad]?.[to.slot] ?? null;

  // Within one squad a swap changes nothing about its lift, so only a move
  // between squads needs checking - and then both ends do.
  if (from.squad !== to.squad) {
    const budget = squadLiftBudget(buildingLevels);
    const movingLift = ASSET_BY_ID[moving]?.lift ?? 0;
    const displacedLift = displaced ? ASSET_BY_ID[displaced]?.lift ?? 0 : 0;

    const toAfter = squadLiftUsed(board, to.squad) - displacedLift + movingLift;
    if (toAfter > budget) {
      return {ok: false, error: `${to.squad} cannot carry that. ${toAfter} of ${budget} lift.`};
    }
    const fromAfter = squadLiftUsed(board, from.squad) - movingLift + displacedLift;
    if (fromAfter > budget) {
      return {ok: false, error: `${from.squad} cannot carry that. ${fromAfter} of ${budget} lift.`};
    }
  }

  // Clear both rows first, then write both. The unique index on
  // (player_id, asset_id) means an asset cannot briefly exist in two slots, so
  // the deletes have to land before the inserts inside the same batch.
  const writes: D1PreparedStatement[] = [
    db
      .prepare(`DELETE FROM squad_slots WHERE player_id = ?1 AND squad = ?2 AND slot = ?3`)
      .bind(playerId, from.squad, from.slot),
    db
      .prepare(`DELETE FROM squad_slots WHERE player_id = ?1 AND squad = ?2 AND slot = ?3`)
      .bind(playerId, to.squad, to.slot),
    db
      .prepare(
        `INSERT INTO squad_slots (player_id, squad, slot, asset_id) VALUES (?1, ?2, ?3, ?4)`,
      )
      .bind(playerId, to.squad, to.slot, moving),
  ];
  if (displaced) {
    writes.push(
      db
        .prepare(
          `INSERT INTO squad_slots (player_id, squad, slot, asset_id) VALUES (?1, ?2, ?3, ?4)`,
        )
        .bind(playerId, from.squad, from.slot, displaced),
    );
  }

  await db.batch(writes);
  return {ok: true};
}
