/**
 * Worlds, placement and movement.
 *
 * The rule that everything here protects: a plot holds one base. Movement is
 * therefore never a read-then-write - two players pressing Move on the same
 * square in the same instant would both see it free. The unique index on
 * (world_id, plot_x, plot_y) decides, and the loser is told to pick again.
 */
import {WORLD_EXTENT, candidatePlots} from './game';

export interface WorldRow {
  id: number;
  name: string;
  kind: string;
  capacity: number;
  extent: number;
  closes_at: number | null;
}

export interface PlacedBase {
  x: number;
  y: number;
  skin: string;
  username: string;
  level: number;
  worldId: number;
  /**
   * The world this player calls home, which is not the world they are standing
   * in. In an event world eight home worlds share one map, and this is the only
   * thing that distinguishes a neighbour from an invader.
   */
  homeWorldId: number | null;
  /** Whose colours they fly. Null when they belong to no alliance. */
  allianceId: string | null;
  banner: string;
  emblem: string;
  lights: string;
  decal: string;
}

/** Home world for a new player: the newest one under capacity, else a new one. */
export async function assignHomeWorld(db: D1Database, now: number): Promise<number> {
  const open = await db
    .prepare(
      `SELECT w.id AS id
         FROM worlds w
         LEFT JOIN bases b ON b.home_world_id = w.id
        WHERE w.kind = 'home'
        GROUP BY w.id, w.capacity
       HAVING COUNT(b.player_id) < w.capacity
        ORDER BY w.id DESC
        LIMIT 1`,
    )
    .first<{id: number}>();
  if (open) return open.id;

  const latest = await db.prepare(`SELECT MAX(id) AS id FROM worlds`).first<{id: number | null}>();
  const nextId = (latest?.id ?? 1000) + 1;
  await db
    .prepare(
      `INSERT INTO worlds (id, name, kind, capacity, extent, opened_at)
       VALUES (?1, ?2, 'home', 1000, ?3, ?4)`,
    )
    .bind(nextId, `Theatre ${nextId}`, WORLD_EXTENT, now)
    .run();
  return nextId;
}

export async function getWorld(db: D1Database, worldId: number): Promise<WorldRow | null> {
  return db
    .prepare(`SELECT id, name, kind, capacity, extent, closes_at FROM worlds WHERE id = ?1`)
    .bind(worldId)
    .first<WorldRow>();
}

/** Worlds this player may currently stand in: their home, plus any open event admitting it. */
export async function reachableWorlds(
  db: D1Database,
  playerId: string,
  now: number,
): Promise<WorldRow[]> {
  const rows = await db
    .prepare(
      `SELECT w.id AS id, w.name AS name, w.kind AS kind, w.capacity AS capacity,
              w.extent AS extent, w.closes_at AS closes_at
         FROM bases b
         JOIN worlds w ON w.id = b.home_world_id
        WHERE b.player_id = ?1
        UNION
       SELECT w.id, w.name, w.kind, w.capacity, w.extent, w.closes_at
         FROM bases b
         JOIN world_admissions a ON a.home_world_id = b.home_world_id
         JOIN worlds w ON w.id = a.event_world_id
        WHERE b.player_id = ?1
          AND w.kind = 'event'
          AND (w.closes_at IS NULL OR w.closes_at > ?2)`,
    )
    .bind(playerId, now)
    .all<WorldRow>();
  return rows.results ?? [];
}

/** Places a player on a free plot, trying candidates until the index accepts one. */
export async function placeSomewhereFree(
  db: D1Database,
  worldId: number,
  playerId: string,
  extent: number,
  now: number,
): Promise<{x: number; y: number} | null> {
  const row = await db
    .prepare(`SELECT COUNT(*) AS n FROM placements WHERE world_id = ?1`)
    .bind(worldId)
    .first<{n: number}>();

  for (const plot of candidatePlots(row?.n ?? 0, 24)) {
    if (Math.abs(plot.x) > extent || Math.abs(plot.y) > extent) continue;
    const ok = await tryPlace(db, worldId, playerId, plot.x, plot.y, now);
    if (ok) return plot;
  }
  return null;
}

/**
 * Claims one specific plot, replacing any plot this player already holds in
 * the same world. Returns false when the plot is taken.
 */
export async function tryPlace(
  db: D1Database,
  worldId: number,
  playerId: string,
  x: number,
  y: number,
  now: number,
): Promise<boolean> {
  try {
    await db
      .prepare(
        `INSERT INTO placements (world_id, player_id, plot_x, plot_y, placed_at)
         VALUES (?1, ?2, ?3, ?4, ?5)
         ON CONFLICT(world_id, player_id)
         DO UPDATE SET plot_x = excluded.plot_x, plot_y = excluded.plot_y,
                       placed_at = excluded.placed_at`,
      )
      .bind(worldId, playerId, x, y, now)
      .run();
    return true;
  } catch {
    // The (world_id, plot_x, plot_y) index rejected it: somebody is standing there.
    return false;
  }
}

/** Every base inside a rectangle of plots, bounded by the viewport rather than the population. */
export async function basesInViewport(
  db: D1Database,
  worldId: number,
  x: number,
  y: number,
  w: number,
  h: number,
): Promise<PlacedBase[]> {
  const rows = await db
    .prepare(
      `SELECT pl.plot_x AS x, pl.plot_y AS y, b.skin AS skin, p.username AS username,
              COALESCE(bd.level, 1) AS level, pl.world_id AS worldId,
              b.banner AS banner, b.emblem AS emblem, b.lights AS lights, b.decal AS decal,
              b.home_world_id AS homeWorldId, am.alliance_id AS allianceId
         FROM placements pl
         JOIN players p ON p.id = pl.player_id
         JOIN bases b ON b.player_id = pl.player_id
         LEFT JOIN buildings bd ON bd.player_id = pl.player_id AND bd.kind = 'command_post'
         LEFT JOIN alliance_members am ON am.player_id = pl.player_id
        WHERE pl.world_id = ?1
          AND pl.plot_x BETWEEN ?2 AND ?3
          AND pl.plot_y BETWEEN ?4 AND ?5
        LIMIT 2000`,
    )
    .bind(worldId, x, x + w, y, y + h)
    .all<PlacedBase>();
  return rows.results ?? [];
}
