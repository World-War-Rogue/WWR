/**
 * The base board: where buildings stand.
 *
 * Reads resolve stored rows over the defaults. Writes are the one interesting
 * part - a move onto an occupied pad is a swap, and a swap under a unique
 * (player, pad) index cannot be done as two updates, because the first one
 * collides. So it goes through a parking pad inside one batch, which D1 runs
 * atomically: either both buildings moved or neither did.
 */
import {
  BOARD_BUILDING_BY_ID,
  CENTRE_PAD,
  PAD_BY_ID,
  type Placement,
  defaultPlacements,
  resolvePlacements,
} from '../shared/base';

const PARKING = '__moving__';

export async function readPlacements(db: D1Database, playerId: string): Promise<Placement[]> {
  const rows = await db
    .prepare(`SELECT building_id, pad_id FROM base_placements WHERE player_id = ?1`)
    .bind(playerId)
    .all<{building_id: string; pad_id: string}>();
  return resolvePlacements(
    (rows.results ?? []).map((r) => ({buildingId: r.building_id, padId: r.pad_id})),
  );
}

export type ArrangeResult = {ok: true; placements: Placement[]} | {ok: false; error: string};

export async function arrange(
  db: D1Database,
  playerId: string,
  buildingId: string,
  padId: string,
): Promise<ArrangeResult> {
  const building = BOARD_BUILDING_BY_ID[buildingId];
  if (!building) return {ok: false, error: 'No such building.'};
  if (!building.movable) return {ok: false, error: `${building.name} cannot be moved.`};
  if (!PAD_BY_ID[padId]) return {ok: false, error: 'No such pad.'};
  if (padId === CENTRE_PAD) return {ok: false, error: 'That pad is reserved for the Command Center.'};

  // Materialise the defaults for anything not yet stored, so the swap below
  // can reason about every building by row. INSERT OR IGNORE keeps rows the
  // player already moved. Done as one batch so it cannot half-land.
  const current = await readPlacements(db, playerId);
  await db.batch(
    defaultPlacements().map((d) =>
      db
        .prepare(
          `INSERT OR IGNORE INTO base_placements (player_id, building_id, pad_id) VALUES (?1, ?2, ?3)`,
        )
        .bind(playerId, d.buildingId, current.find((p) => p.buildingId === d.buildingId)?.padId ?? d.padId),
    ),
  );

  const from = current.find((p) => p.buildingId === buildingId)?.padId;
  if (from === padId) return {ok: true, placements: current};
  const occupant = current.find((p) => p.padId === padId)?.buildingId ?? null;

  const move = (id: string, pad: string) =>
    db
      .prepare(`UPDATE base_placements SET pad_id = ?3 WHERE player_id = ?1 AND building_id = ?2`)
      .bind(playerId, id, pad);

  if (occupant === null) {
    await move(buildingId, padId).run();
  } else {
    if (!BOARD_BUILDING_BY_ID[occupant]?.movable) {
      return {ok: false, error: 'That building cannot be moved.'};
    }
    await db.batch([
      move(buildingId, PARKING),
      move(occupant, from ?? building.defaultPad),
      move(buildingId, padId),
    ]);
  }

  return {ok: true, placements: await readPlacements(db, playerId)};
}
