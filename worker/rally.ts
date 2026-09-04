/**
 * Rendezvous points - setting the marker, and answering it.
 *
 * The whole feature is two server rules. Only a general or a lieutenant may
 * plant the marker, and answering it lands you on the nearest plot the
 * database will actually accept. Neither is checked in the browser, because a
 * client that decides where it lands is a client that lands anywhere.
 */
import {RALLY_SEARCH_RINGS, RallyPoint, rallyCooldownLeft, ringsOutward} from '../shared/rally';
import {tryPlace} from './world';

interface RallyRow {
  world_id: number;
  plot_x: number;
  plot_y: number;
  set_at: number;
  username: string;
}

/** The alliance's current marker, or null when nobody has planted one. */
export async function readRally(
  db: D1Database,
  allianceId: string | null,
): Promise<RallyPoint | null> {
  if (!allianceId) return null;
  const row = await db
    .prepare(
      `SELECT r.world_id AS world_id, r.plot_x AS plot_x, r.plot_y AS plot_y,
              r.set_at AS set_at, p.username AS username
         FROM alliance_rally r
         JOIN players p ON p.id = r.set_by
        WHERE r.alliance_id = ?1`,
    )
    .bind(allianceId)
    .first<RallyRow>();
  if (!row) return null;
  return {
    x: row.plot_x,
    y: row.plot_y,
    worldId: row.world_id,
    setBy: row.username,
    setAt: row.set_at,
  };
}

/**
 * Plant or move the marker.
 *
 * One row per alliance, replaced by upsert. Two officers pressing Set in the
 * same instant therefore produce one marker rather than a race - the second
 * write wins and everybody sees the same point, which is the only outcome that
 * makes sense for a thing whose entire purpose is agreement.
 */
export async function setRally(
  db: D1Database,
  allianceId: string,
  playerId: string,
  worldId: number,
  x: number,
  y: number,
  now: number,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO alliance_rally (alliance_id, world_id, plot_x, plot_y, set_by, set_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)
       ON CONFLICT(alliance_id)
       DO UPDATE SET world_id = excluded.world_id, plot_x = excluded.plot_x,
                     plot_y = excluded.plot_y, set_by = excluded.set_by,
                     set_at = excluded.set_at`,
    )
    .bind(allianceId, worldId, x, y, playerId, now)
    .run();
}

/**
 * The alliance's marker, guaranteed.
 *
 * An alliance ALWAYS has a rendezvous. There is no clearing it and no state
 * where the button is there but points nowhere - a rally that has to be set up
 * before it can be used is one that is not there in the minute somebody needs
 * it, which is the only minute it exists for.
 *
 * When one has not been placed yet it is put where the alliance already is:
 * the centre of its members' plots, rounded to a plot. That is the most useful
 * default there is - it is home ground, so an untouched marker still rallies
 * people somewhere they would want to be, and an officer moving it is refining
 * a real answer rather than replacing a placeholder.
 *
 * It is written, not merely returned, so the answer is stable. A default that
 * were recomputed on every read would drift every time a member moved, and a
 * rally point that wanders is worse than one in the wrong place.
 */
export async function ensureRally(
  db: D1Database,
  allianceId: string,
  worldId: number,
  now: number,
): Promise<RallyPoint | null> {
  const existing = await readRally(db, allianceId);
  if (existing) return existing;

  const centre = await db
    .prepare(
      `SELECT CAST(ROUND(AVG(p.plot_x)) AS INTEGER) AS x,
              CAST(ROUND(AVG(p.plot_y)) AS INTEGER) AS y,
              MIN(m.player_id) AS anyone
         FROM alliance_members m
         JOIN placements p ON p.player_id = m.player_id AND p.world_id = ?2
        WHERE m.alliance_id = ?1`,
    )
    .bind(allianceId, worldId)
    .first<{x: number | null; y: number | null; anyone: string | null}>();

  // An alliance with nobody placed yet has no centre to take. It gets one when
  // somebody stands somewhere; until then there is genuinely no answer, and
  // inventing a corner of the map would be worse than the button being quiet.
  if (!centre || centre.x === null || centre.y === null || !centre.anyone) return null;

  const leader = await db
    .prepare(`SELECT player_id AS id FROM alliance_members WHERE alliance_id = ?1 AND rank = 'leader'`)
    .bind(allianceId)
    .first<{id: string}>();

  await setRally(db, allianceId, leader?.id ?? centre.anyone, worldId, centre.x, centre.y, now);
  return readRally(db, allianceId);
}

/** When this player last rallied. Absent placement counts as never. */
export async function lastRalliedAt(
  db: D1Database,
  worldId: number,
  playerId: string,
): Promise<number> {
  const row = await db
    .prepare(`SELECT rallied_at FROM placements WHERE world_id = ?1 AND player_id = ?2`)
    .bind(worldId, playerId)
    .first<{rallied_at: number}>();
  return row?.rallied_at ?? 0;
}

export type RallyResult =
  | {ok: true; x: number; y: number}
  | {ok: false; reason: 'cooldown'; waitMs: number}
  | {ok: false; reason: 'full'}
  | {ok: false; reason: 'edge'};

/**
 * Answer the marker: take the nearest free plot to it.
 *
 * This walks rings outward and asks the database to place them on each in
 * turn, taking the first that succeeds. It looks like a loop of writes, and it
 * is - but it is NOT a read-then-write. Each attempt is the same unique index
 * that guards every other move, so twenty people answering one call in the same
 * second cannot land on the same square; they simply take successive rings.
 * Checking which plots looked free first and then writing would let exactly
 * that happen.
 */
export async function rallyTo(
  db: D1Database,
  worldId: number,
  extent: number,
  playerId: string,
  point: RallyPoint,
  now: number,
): Promise<RallyResult> {
  const waitMs = rallyCooldownLeft(await lastRalliedAt(db, worldId, playerId), now);
  if (waitMs > 0) return {ok: false, reason: 'cooldown', waitMs};

  let sawAnyInBounds = false;
  for (const plot of ringsOutward(point.x, point.y, RALLY_SEARCH_RINGS)) {
    if (Math.abs(plot.x) > extent || Math.abs(plot.y) > extent) continue;
    sawAnyInBounds = true;
    if (await tryPlace(db, worldId, playerId, plot.x, plot.y, now)) {
      await db
        .prepare(`UPDATE placements SET rallied_at = ?3 WHERE world_id = ?1 AND player_id = ?2`)
        .bind(worldId, playerId, now)
        .run();
      return {ok: true, x: plot.x, y: plot.y};
    }
  }

  // Every ring was either off the map or occupied. Told apart because they
  // need different advice: one is "the marker is at the edge of the world",
  // the other is "that ground is full".
  return {ok: false, reason: sawAnyInBounds ? 'full' : 'edge'};
}
