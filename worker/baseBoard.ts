/**
 * The base board: where buildings stand.
 *
 * Reads resolve stored rows over the defaults. Writes are the one interesting
 * part. A move onto an occupied pad displaces the occupant to the nearest open
 * pad - as decided, no confirmation, the dropped building takes the spot - and
 * only when every pad is full do the two swap. Either way two rows change
 * under a unique (player, pad) index, which cannot be done as two plain
 * updates because the first one collides. So the mover parks first, inside
 * one batch, which D1 runs atomically: everything moved or nothing did.
 */
import {
  BOARD_BUILDING_BY_ID,
  BOARD_H,
  BOARD_W,
  PADS,
  PAD_BY_ID,
  type Placement,
  defaultPlacements,
  padTakesBuildings,
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
  if (building.fixed) return {ok: false, error: `${building.name} stays on the runway.`};
  if (!PAD_BY_ID[padId]) return {ok: false, error: 'No such pad.'};
  if (!padTakesBuildings(padId)) return {ok: false, error: 'That pad is not for buildings.'};

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

  const from = current.find((p) => p.buildingId === buildingId)?.padId ?? building.defaultPad;
  if (from === padId) return {ok: true, placements: current};
  const occupant = current.find((p) => p.padId === padId)?.buildingId ?? null;

  const move = (id: string, pad: string) =>
    db
      .prepare(`UPDATE base_placements SET pad_id = ?3 WHERE player_id = ?1 AND building_id = ?2`)
      .bind(playerId, id, pad);

  if (occupant === null) {
    await move(buildingId, padId).run();
  } else {
    // Where the occupant goes: the nearest pad nobody stands on, measured
    // from the pad it is losing. The mover's old pad is free by then, so a
    // drop onto a neighbour is a plain swap and a drop across the base sends
    // the occupant to whatever is closest to home.
    const taken = new Set(current.filter((p) => p.buildingId !== buildingId).map((p) => p.padId));
    const target = PAD_BY_ID[padId];
    let to = from;
    let best = Infinity;
    for (const pad of PADS) {
      if (!padTakesBuildings(pad.id) || pad.id === padId || taken.has(pad.id)) continue;
      const d = Math.hypot((pad.x - target.x) * BOARD_W, (pad.y - target.y) * BOARD_H);
      if (d < best) {
        best = d;
        to = pad.id;
      }
    }
    await db.batch([move(buildingId, PARKING), move(occupant, to), move(buildingId, padId)]);
  }

  return {ok: true, placements: await readPlacements(db, playerId)};
}
