/**
 * Daily Operations on the server.
 *
 * Six lanes, four for the Cache, one claim a day. The rules and every number
 * are in shared/season1Ops.ts; this file only applies them to the database.
 *
 * Idempotency is structural, not checked: a lane is a PRIMARY KEY row
 * (player, RST day, lane) written with INSERT OR IGNORE, and every reward is a
 * PRIMARY KEY row in event_reward_grants written with INSERT OR IGNORE in the
 * same batch as the wallet and stock updates - which apply only where that
 * insert landed. Two tabs, a retry, a refresh: the second one changes nothing.
 *
 * `noteDailyProgress` is called by the handlers AFTER their action has
 * committed, never before, and never twice for one action.
 */
import {type BuildingLevels, NO_BUILDINGS, type Resources, capFor, isLevelledBuilding} from '../shared/buildings';
import {
  INDUSTRY_HOUR_MS,
  LANES,
  LANES_FOR_CACHE,
  type Lane,
  type Reward,
  cacheReward,
  dailyWindow,
  describeReward,
  grantKey,
  laneReward,
  rewardIsEmpty,
  seasonPhase,
} from '../shared/season1Ops';

/**
 * The Warehouse levels, for the stock caps. A local read rather than
 * worker/buildings.ts readLevels because that module calls into this one
 * (the Industry meter) and a cycle is a worse trade than eight lines.
 */
async function levelsOf(db: D1Database, playerId: string): Promise<BuildingLevels> {
  const rows = await db
    .prepare(`SELECT building, level FROM base_levels WHERE player_id = ?1`)
    .bind(playerId)
    .all<{building: string; level: number}>();
  const levels: BuildingLevels = {...NO_BUILDINGS};
  for (const r of rows.results ?? []) {
    if (isLevelledBuilding(r.building)) levels[r.building] = Math.max(NO_BUILDINGS[r.building], r.level);
  }
  return levels;
}

const SEASON = 1;

/**
 * The statements that pay a reward, once. The grant row is the lock: the
 * wallet and stock updates apply only where a row with this id and THIS
 * call's timestamp exists, so a replay that finds the row already there
 * (different created_at) pays nothing.
 *
 * Stock is clamped to the Warehouse cap the way production is: a reward never
 * pushes a stock above the cap, and a stock already above it is left alone.
 */
async function grantStatements(
  db: D1Database,
  playerId: string,
  id: string,
  source: string,
  dayKey: string,
  reward: Reward,
  detail: string,
  now: number,
): Promise<D1PreparedStatement[]> {
  const {week} = seasonPhase(now);
  const levels = await levelsOf(db, playerId);
  const cap = (k: keyof Resources) => {
    const c = capFor(k, levels);
    return Number.isFinite(c) ? c : 1e15;
  };
  const guard = `AND EXISTS (SELECT 1 FROM event_reward_grants g WHERE g.id = ?2 AND g.created_at = ?3)`;
  return [
    db
      .prepare(
        `INSERT OR IGNORE INTO event_reward_grants
           (id, player_id, source, season, week, day_key, credits, fuel, steel, munitions, alloy, detail, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)`,
      )
      .bind(id, playerId, source, SEASON, week, dayKey, reward.credits, reward.fuel, reward.steel, reward.munitions, reward.alloy, detail, now),
    db
      .prepare(`UPDATE players SET credits = credits + ?4, wallet_rev = wallet_rev + 1 WHERE id = ?1 ${guard}`)
      .bind(playerId, id, now, reward.credits),
    db
      .prepare(
        `UPDATE bases
            SET fuel = fuel + ?4,
                steel = CASE WHEN steel >= ?8 THEN steel ELSE MIN(?8, steel + ?5) END,
                munitions = CASE WHEN munitions >= ?9 THEN munitions ELSE MIN(?9, munitions + ?6) END,
                alloy = CASE WHEN alloy >= ?10 THEN alloy ELSE MIN(?10, alloy + ?7) END,
                stock_rev = stock_rev + 1
          WHERE player_id = ?1 ${guard}`,
      )
      .bind(playerId, id, now, reward.fuel, reward.steel, reward.munitions, reward.alloy, cap('steel'), cap('munitions'), cap('alloy')),
    db
      .prepare(
        `INSERT INTO wallet_ledger (player_id, kind, tokens, credits, subject, detail, created_at)
         SELECT ?1, 'reward', 0, ?4, ?5, ?6, ?3
          WHERE ?4 > 0 ${guard}`,
      )
      .bind(playerId, id, now, reward.credits, source, detail),
  ];
}

/**
 * Record that a lane's action happened today. Returns true when this call
 * completed the lane (and paid its reward), false when it was already done.
 *
 * Call it after the action committed. A failed action must never reach here.
 */
export async function noteDailyProgress(db: D1Database, playerId: string, lane: Lane, now: number): Promise<boolean> {
  const day = dailyWindow(now);
  const done = await db
    .prepare(`INSERT OR IGNORE INTO daily_ops (player_id, day_key, lane, done_at) VALUES (?1, ?2, ?3, ?4)`)
    .bind(playerId, day.key, lane, now)
    .run();
  if (!done.meta.changes) return false;
  const reward = laneReward(lane, seasonPhase(now).week);
  if (rewardIsEmpty(reward)) return true;
  await db.batch(
    await grantStatements(db, playerId, grantKey.lane(playerId, day.key, lane), `daily-lane:${lane}`, day.key, reward, `Daily Operations · ${lane} · ${describeReward(reward)}`, now),
  );
  return true;
}

/**
 * The Industry lane: settled production time accumulates per day; at one
 * hour the lane completes. Called from the base settle with the elapsed
 * time it just folded in. Time before today's reset is not counted twice:
 * the caller passes only what fell inside this window.
 */
export async function meterProduction(db: D1Database, playerId: string, elapsedMs: number, now: number): Promise<void> {
  if (elapsedMs <= 0) return;
  const day = dailyWindow(now);
  const counted = Math.min(elapsedMs, now - day.startsAt);
  if (counted <= 0) return;
  const row = await db
    .prepare(
      `INSERT INTO daily_meter (player_id, day_key, produced_ms) VALUES (?1, ?2, ?3)
       ON CONFLICT (player_id, day_key) DO UPDATE SET produced_ms = produced_ms + excluded.produced_ms
       RETURNING produced_ms`,
    )
    .bind(playerId, day.key, Math.round(counted))
    .first<{produced_ms: number}>();
  if ((row?.produced_ms ?? 0) >= INDUSTRY_HOUR_MS) await noteDailyProgress(db, playerId, 'industry', now);
}

/**
 * A map exercise's reward: paid once per target (the target id is the key),
 * then its lane ticked. Two grants, one transaction each, both idempotent -
 * a replay pays nothing and the lane row is INSERT OR IGNORE.
 */
export async function grantExerciseReward(
  db: D1Database,
  playerId: string,
  exerciseId: string,
  type: string,
  lane: Lane,
  reward: Reward,
  detail: string,
  now: number,
): Promise<void> {
  const day = dailyWindow(now);
  if (!rewardIsEmpty(reward)) {
    await db.batch(await grantStatements(db, playerId, `exercise:${exerciseId}`, `exercise:${type}`, day.key, reward, `Map exercise · ${detail} · ${describeReward(reward)}`, now));
  }
  await noteDailyProgress(db, playerId, lane, now);
}

export interface DailyView {
  season: number;
  week: number;
  dayKey: string;
  resetAt: number;
  lanes: Array<{lane: Lane; done: boolean; doneAt: number | null; reward: Reward}>;
  doneCount: number;
  lanesForCache: number;
  cache: {reward: Reward; claimable: boolean; claimedAt: number | null};
  /** Settled production time today, for the Industry lane's progress bar. */
  industryMs: number;
}

export async function readDaily(db: D1Database, playerId: string, now: number): Promise<DailyView> {
  const day = dailyWindow(now);
  const {week} = seasonPhase(now);
  const [rows, claim, meter] = await Promise.all([
    db
      .prepare(`SELECT lane, done_at AS doneAt FROM daily_ops WHERE player_id = ?1 AND day_key = ?2`)
      .bind(playerId, day.key)
      .all<{lane: string; doneAt: number}>(),
    db
      .prepare(`SELECT created_at AS at FROM event_reward_grants WHERE id = ?1`)
      .bind(grantKey.cache(playerId, day.key))
      .first<{at: number}>(),
    db
      .prepare(`SELECT produced_ms AS ms FROM daily_meter WHERE player_id = ?1 AND day_key = ?2`)
      .bind(playerId, day.key)
      .first<{ms: number}>(),
  ]);
  const doneAt = new Map((rows.results ?? []).map((r) => [r.lane, r.doneAt]));
  const lanes = LANES.map((lane) => ({
    lane,
    done: doneAt.has(lane),
    doneAt: doneAt.get(lane) ?? null,
    reward: laneReward(lane, week),
  }));
  const doneCount = lanes.filter((l) => l.done).length;
  return {
    season: SEASON,
    week,
    dayKey: day.key,
    resetAt: day.resetAt,
    lanes,
    doneCount,
    lanesForCache: LANES_FOR_CACHE,
    cache: {reward: cacheReward(week), claimable: doneCount >= LANES_FOR_CACHE && !claim, claimedAt: claim?.at ?? null},
    industryMs: meter?.ms ?? 0,
  };
}

export type ClaimResult = {ok: true; reward: Reward} | {ok: false; error: string};

/** Claim today's Cache. Once. */
export async function claimCache(db: D1Database, playerId: string, now: number): Promise<ClaimResult> {
  const view = await readDaily(db, playerId, now);
  if (view.cache.claimedAt !== null) return {ok: false, error: 'Today’s Cache is already claimed. It resets at 00:00 RST.'};
  if (view.doneCount < LANES_FOR_CACHE) {
    return {ok: false, error: `Complete ${LANES_FOR_CACHE - view.doneCount} more lane${LANES_FOR_CACHE - view.doneCount === 1 ? '' : 's'} first.`};
  }
  const reward = view.cache.reward;
  const id = grantKey.cache(playerId, view.dayKey);
  const results = await db.batch(
    await grantStatements(db, playerId, id, 'daily-cache', view.dayKey, reward, `Daily Operations Cache · ${describeReward(reward)}`, now),
  );
  // The insert is the claim. If it changed nothing, another request beat this
  // one to the same day and the wallet updates guarded on it did nothing.
  if (!results[0].meta.changes) return {ok: false, error: 'Today’s Cache is already claimed.'};
  return {ok: true, reward};
}

export interface GrantRow {
  id: string;
  source: string;
  season: number;
  week: number;
  dayKey: string;
  credits: number;
  fuel: number;
  steel: number;
  munitions: number;
  alloy: number;
  detail: string;
  createdAt: number;
}

/** Reward history for the Reports screen. Straight from the grant table. */
export async function listGrants(db: D1Database, playerId: string, limit = 60): Promise<GrantRow[]> {
  const rows = await db
    .prepare(
      `SELECT id, source, season, week, day_key AS dayKey, credits, fuel, steel, munitions, alloy, detail, created_at AS createdAt
         FROM event_reward_grants WHERE player_id = ?1 ORDER BY created_at DESC LIMIT ?2`,
    )
    .bind(playerId, limit)
    .all<GrantRow>();
  return rows.results ?? [];
}
