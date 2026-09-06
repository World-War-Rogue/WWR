/**
 * Rosters and squads.
 *
 * One server rule carries this file: an asset may sit in exactly one squad. It
 * is enforced by a unique index rather than by a check, because two drags in the
 * same instant would both read the asset as free and both write it.
 *
 * ── The lift budget is gone ───────────────────────────────────────────────
 *
 * A squad used to be capped by the total lift of its assets, so six Abrams did
 * not fit. Removed on Matt's call, 2026-09-06: any six assets, in any squad, in
 * any combination.
 *
 * What that gives up is worth writing down, because the argument will come back.
 * Lift was the thing that made squad-building a decision rather than a ranking -
 * with it gone, nothing stops the strongest six being the answer every time. The
 * pressure toward mixing is now entirely combat-side: the counter ring, and the
 * band-exposure penalty that punishes a squad with no answer to a band. Six
 * tanks is all close-band, so it pays that penalty - but that penalty was tuned
 * as one of two constraints and is now the only one.
 *
 * The other cost is that Motor Pool, Airfield and Barracks no longer affect
 * squads at all. Raising the lift budget was their entire purpose.
 *
 * `lift` itself stays on the asset. It still sets each asset's attribute point
 * budget, which is the whole reason bigger assets have bigger numbers.
 */
import {
  ASSET_BY_ID,
  DRAFTABLE,
  SQUAD_NAMES,
  SQUAD_SLOTS,
  type SquadName,
} from '../shared/assets';
import {type Packages, assetPowerWith, packagesFromRow} from '../shared/upgrades';

export interface OwnedAsset {
  assetId: string;
  level: number;
  /** The four fitted packages. Everything at 1 means nothing bought. */
  packages: Packages;
  /** Command Credits sunk into the packages, and so refundable on a reset. */
  packageCredits: number;
}

interface AssetRow {
  assetId: string;
  level: number;
  pkg_armament: number;
  pkg_protection: number;
  pkg_propulsion: number;
  pkg_electronics: number;
  pkg_credits: number;
}

const ROSTER_SQL = `SELECT asset_id AS assetId, level, pkg_armament, pkg_protection,
                           pkg_propulsion, pkg_electronics, pkg_credits
                      FROM player_assets WHERE player_id = ?1`;

function owned(rows: AssetRow[]): OwnedAsset[] {
  return rows.map((r) => ({
    assetId: r.assetId,
    level: r.level,
    packages: packagesFromRow(r),
    packageCredits: r.pkg_credits,
  }));
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
  const existing = await db.prepare(ROSTER_SQL).bind(playerId).all<AssetRow>();
  if ((existing.results ?? []).length > 0) return owned(existing.results ?? []);

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

  const after = await db.prepare(ROSTER_SQL).bind(playerId).all<AssetRow>();
  return owned(after.results ?? []);
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
 *
 * A squad that is away cannot be touched, and neither can the assets in it.
 * Both halves are the same rule: what marched out is what fights, and a roster
 * that could be edited mid-flight would make that a lie. The second half is
 * not redundant - because an asset lives in exactly one slot, assigning one
 * that is currently out would PULL IT OUT of the away squad, quietly emptying
 * a squad that is at that moment attacking somebody.
 */
export async function assignSlot(
  db: D1Database,
  playerId: string,
  squad: SquadName,
  slot: number,
  assetId: string | null,
  away: Set<string>,
): Promise<AssignResult> {
  if (slot < 0 || slot >= SQUAD_SLOTS) return {ok: false, error: 'No such slot.'};
  if (away.has(squad)) return {ok: false, error: `${squad} is out. Bring it home first.`};

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

  // Where this asset is now. If that is a squad in the field, it is not
  // available: taking it would edit the away squad from the other end.
  for (const name of SQUAD_NAMES) {
    if (away.has(name) && board[name].includes(assetId)) {
      return {ok: false, error: `${asset.name} is out with ${name}.`};
    }
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

/**
 * Squad power, for the header. Computed on read like every other power here.
 *
 * Takes the whole owned asset rather than a level, because packages change what
 * an asset is worth and a power figure that ignored them would disagree with
 * the resolver - the player would buy an upgrade, watch the header not move,
 * and reasonably conclude it did nothing.
 */
export function squadPower(
  board: SquadBoard,
  roster: Map<string, OwnedAsset>,
  squad: SquadName,
): number {
  return board[squad].reduce<number>((sum, id) => {
    if (!id) return sum;
    const asset = ASSET_BY_ID[id];
    if (!asset) return sum;
    const held = roster.get(id);
    return sum + assetPowerWith(asset, held?.level ?? 1, held?.packages);
  }, 0);
}

/**
 * Total lift standing in a squad.
 *
 * Nothing is refused for exceeding anything any more - this is a readout, kept
 * because the weight of a squad is still worth seeing.
 */
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
  away: Set<string>,
): Promise<AssignResult> {
  if (from.slot < 0 || from.slot >= SQUAD_SLOTS) return {ok: false, error: 'No such slot.'};
  if (to.slot < 0 || to.slot >= SQUAD_SLOTS) return {ok: false, error: 'No such slot.'};
  // Both ends. A swap edits two squads, so one of them being in the field is
  // enough to refuse the whole move.
  for (const name of [from.squad, to.squad]) {
    if (away.has(name)) return {ok: false, error: `${name} is out. Bring it home first.`};
  }
  if (from.squad === to.squad && from.slot === to.slot) return {ok: true};

  const board = await readSquads(db, playerId);
  const moving = board[from.squad]?.[from.slot] ?? null;
  if (!moving) return {ok: false, error: 'Nothing to move.'};
  const displaced = board[to.squad]?.[to.slot] ?? null;

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
