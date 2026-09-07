/**
 * Recording Warfront Score. One function, called by the handlers AFTER the
 * scoring action has committed - the same contract as noteDailyProgress.
 *
 * Idempotency is structural: the point row's id is the caller's key
 * (INSERT OR IGNORE), and the day tally moves only where a point row with
 * this id and THIS call's timestamp exists. A retry finds the row already
 * there with another timestamp and moves nothing.
 *
 * Which alliance the points count for is decided here, at earn time: the
 * member's alliance if they have been in it 48 continuous hours, else none.
 * That is the design's rule ("only members who have been in the alliance
 * for at least 48 continuous hours can contribute score") and it is what
 * stops a roster being rented for reset day.
 *
 * This module deliberately imports nothing from dailyOps.ts, which calls
 * it; the settlement and the screen live in warfront.ts.
 */
import {POINTS, type PointSource, membershipEligible} from '../shared/warfront';
import {dailyWindow, weeklyWindow} from '../shared/season1Ops';

export async function noteWarfront(db: D1Database, playerId: string, source: PointSource, key: string, detail: string, now: number): Promise<boolean> {
  const spec = POINTS[source];
  const home = await db
    .prepare(
      `SELECT b.home_world_id AS worldId, m.alliance_id AS allianceId, m.joined_at AS joinedAt
         FROM bases b
         LEFT JOIN alliance_members m ON m.player_id = b.player_id
        WHERE b.player_id = ?1`,
    )
    .bind(playerId)
    .first<{worldId: number; allianceId: string | null; joinedAt: number | null}>();
  if (!home) return false;
  const allianceKey = home.allianceId && home.joinedAt !== null && membershipEligible(home.joinedAt, now) ? home.allianceId : '';
  const day = dailyWindow(now);
  const week = weeklyWindow(now);
  const id = `wf:${key}`;
  // The metric is a column name; it comes from the POINTS table, never from input.
  const column = spec.metric;
  const results = await db.batch([
    db
      .prepare(
        `INSERT OR IGNORE INTO warfront_points
           (id, player_id, world_id, day_key, week_key, alliance_key, metric, points, source, detail, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)`,
      )
      .bind(id, playerId, home.worldId, day.key, week.key, allianceKey, spec.metric, spec.points, source, detail, now),
    db
      .prepare(
        `INSERT OR IGNORE INTO warfront_days (player_id, day_key, alliance_key, world_id, week_key, assault, operations, support, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 0, 0, 0, ?6)`,
      )
      .bind(playerId, day.key, allianceKey, home.worldId, week.key, now),
    db
      .prepare(
        `UPDATE warfront_days SET ${column} = ${column} + ?4, updated_at = ?6
          WHERE player_id = ?1 AND day_key = ?2 AND alliance_key = ?3
            AND EXISTS (SELECT 1 FROM warfront_points p WHERE p.id = ?5 AND p.created_at = ?6)`,
      )
      .bind(playerId, day.key, allianceKey, spec.points, id, now),
  ]);
  return (results[0].meta.changes ?? 0) > 0;
}
