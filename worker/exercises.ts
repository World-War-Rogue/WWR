/**
 * Daily map exercises on the server: spawn today's three, list them, and
 * settle the one a march has reached. The rules are in shared/exercises.ts.
 *
 * Personal and invisible: rows are keyed by player and read only for that
 * player; the world view never joins them. Spawn is settle-on-read - the
 * first look at the map after 00:00 RST creates the day's targets, from a
 * seed of (player, day), so every later read agrees with the first.
 *
 * The launch itself is a march (worker/march.ts launchExercise): the same
 * readiness rules, drone rule and pace as an attack, and no Fuel.
 */
import {SQUAD_NAMES, type SquadName} from '../shared/assets';
import type {CombatantSpec} from '../shared/combat';
import {
  EXERCISES,
  EXERCISES_PER_DAY,
  type ExerciseView,
  HOLD_MS,
  PATROL_POWER_RATIO,
  SPAWN_MIN_RADIUS,
  SPAWN_RADIUS,
  exerciseReward,
  generatePatrol,
  hashSeed,
  isExerciseType,
  patrolPower,
  pickDailyTypes,
  seeded,
} from '../shared/exercises';
import {droneCount} from '../shared/drones';
import {dailyWindow, seasonPhase} from '../shared/season1Ops';
import {taskForceOpen} from '../shared/season';
import {readLevels} from './buildings';
import {grantExerciseReward} from './dailyOps';
import {deltaOpen, ensureRoster, readSquads, squadPower} from './squads';

export interface ExerciseRow {
  id: string;
  player_id: string;
  world_id: number;
  day_key: string;
  type: string;
  plot_x: number;
  plot_y: number;
  state: string;
  snapshot_power: number;
  patrol: string | null;
  march_id: string | null;
  squad: string | null;
  hold_until: number | null;
  settled_at: number | null;
}

/**
 * The strongest Task Force that could march right now: open, at home, no
 * asset broken or in the shop, and carrying a drone. 0 when there is none -
 * which is the signal not to spawn a battle target today.
 */
async function highestEligiblePower(db: D1Database, playerId: string, away: Set<string>, now: number): Promise<number> {
  const [owned, board, levels] = await Promise.all([
    ensureRoster(db, playerId, now),
    readSquads(db, playerId),
    readLevels(db, playerId),
  ]);
  const roster = new Map(owned.map((o) => [o.assetId, o]));
  const delta = await deltaOpen(db, playerId, levels.command_center, now);
  let best = 0;
  for (const name of SQUAD_NAMES) {
    if (away.has(name)) continue;
    if (!taskForceOpen(name, levels.command_center, name === 'Delta' && delta)) continue;
    const ids = (board[name] ?? []).filter((id): id is string => !!id);
    if (ids.length === 0 || droneCount(ids) === 0) continue;
    const ready = ids.every((id) => {
      const o = roster.get(id);
      return o && o.hp > 0 && !(o.repairEndsAt && o.repairEndsAt > now);
    });
    if (!ready) continue;
    best = Math.max(best, squadPower(board, roster, name, levels));
  }
  return best;
}

/** Empty plots in a ring around the base, in a seeded order. */
async function freePlots(
  db: D1Database,
  worldId: number,
  home: {x: number; y: number},
  extent: number,
  roll: () => number,
  count: number,
): Promise<Array<{x: number; y: number}>> {
  const r = SPAWN_RADIUS;
  const taken = await db
    .prepare(
      `SELECT plot_x AS x, plot_y AS y FROM placements
        WHERE world_id = ?1 AND plot_x BETWEEN ?2 AND ?3 AND plot_y BETWEEN ?4 AND ?5`,
    )
    .bind(worldId, home.x - r, home.x + r, home.y - r, home.y + r)
    .all<{x: number; y: number}>();
  const used = new Set((taken.results ?? []).map((p) => `${p.x},${p.y}`));
  const candidates: Array<{x: number; y: number}> = [];
  for (let dx = -r; dx <= r; dx += 1) {
    for (let dy = -r; dy <= r; dy += 1) {
      const d = Math.max(Math.abs(dx), Math.abs(dy));
      if (d < SPAWN_MIN_RADIUS || d > r) continue;
      const x = home.x + dx;
      const y = home.y + dy;
      // World plots run from -extent to +extent on both axes (worker/index.ts handleMove).
      if (Math.abs(x) > extent || Math.abs(y) > extent) continue;
      if (used.has(`${x},${y}`)) continue;
      candidates.push({x, y});
    }
  }
  // Seeded shuffle, then take the first `count` that are not on the same
  // plot as each other (they cannot be - candidates are distinct plots).
  for (let i = candidates.length - 1; i > 0; i -= 1) {
    const j = Math.floor(roll() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  return candidates.slice(0, count);
}

/**
 * Today's targets, spawning them if this is the first look of the day.
 * Returns nothing when the player has no base on this world yet.
 */
export async function ensureExercises(
  db: D1Database,
  playerId: string,
  worldId: number,
  home: {x: number; y: number} | null,
  extent: number,
  /** Task Forces currently away (worker/march.ts marchingSquads), from the caller. */
  away: Set<string>,
  now: number,
): Promise<ExerciseRow[]> {
  const day = dailyWindow(now);
  const existing = await db
    .prepare(`SELECT * FROM map_exercises WHERE player_id = ?1 AND day_key = ?2 ORDER BY created_at`)
    .bind(playerId, day.key)
    .all<ExerciseRow>();
  if ((existing.results ?? []).length > 0 || !home) return existing.results ?? [];

  const roll = seeded(hashSeed(`${playerId}:${day.key}`));
  const power = await highestEligiblePower(db, playerId, away, now);
  const types = pickDailyTypes(roll, power > 0);
  const plots = await freePlots(db, worldId, home, extent, roll, EXERCISES_PER_DAY);
  if (plots.length === 0) return [];

  const rows: D1PreparedStatement[] = [];
  types.slice(0, plots.length).forEach((type, i) => {
    const spec = EXERCISES[type];
    const patrol = spec.kind === 'battle' ? generatePatrol(Math.ceil(power * PATROL_POWER_RATIO), roll) : null;
    rows.push(
      db
        .prepare(
          `INSERT OR IGNORE INTO map_exercises
             (id, player_id, world_id, day_key, type, plot_x, plot_y, state, snapshot_power, patrol, created_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'available', ?8, ?9, ?10)`,
        )
        .bind(`ex:${playerId}:${day.key}:${i}`, playerId, worldId, day.key, type, plots[i].x, plots[i].y, power, patrol ? JSON.stringify(patrol) : null, now),
    );
  });
  // Ids are deterministic per (player, day, index), so two first looks at
  // once insert the same rows and INSERT OR IGNORE keeps one set.
  await db.batch(rows);
  const made = await db
    .prepare(`SELECT * FROM map_exercises WHERE player_id = ?1 AND day_key = ?2 ORDER BY created_at`)
    .bind(playerId, day.key)
    .all<ExerciseRow>();
  return made.results ?? [];
}

export function viewOf(row: ExerciseRow, week: number): ExerciseView | null {
  if (!isExerciseType(row.type)) return null;
  const spec = EXERCISES[row.type];
  let patrol: CombatantSpec[] | null = null;
  if (row.patrol) {
    try {
      patrol = JSON.parse(row.patrol) as CombatantSpec[];
    } catch {
      patrol = null;
    }
  }
  return {
    id: row.id,
    type: row.type,
    kind: spec.kind,
    name: spec.name,
    action: spec.action,
    blurb: spec.blurb,
    lane: spec.lane,
    x: row.plot_x,
    y: row.plot_y,
    state: row.state as ExerciseView['state'],
    reward: exerciseReward(row.type, week),
    patrolPower: patrol ? patrolPower(patrol) : null,
    holdUntil: row.hold_until,
    squad: row.squad,
  };
}

export async function readExercise(db: D1Database, playerId: string, id: string): Promise<ExerciseRow | null> {
  return db.prepare(`SELECT * FROM map_exercises WHERE id = ?1 AND player_id = ?2`).bind(id, playerId).first<ExerciseRow>();
}

/** Mark a target as taken by a march. Only an available target of today. */
export async function markMarching(db: D1Database, id: string, marchId: string, squad: SquadName, now: number): Promise<boolean> {
  const r = await db
    .prepare(
      `UPDATE map_exercises SET state = 'marching', march_id = ?2, squad = ?3
        WHERE id = ?1 AND state = 'available' AND day_key = ?4`,
    )
    .bind(id, marchId, squad, dailyWindow(now).key)
    .run();
  return (r.meta.changes ?? 0) > 0;
}

/**
 * The march has arrived. A hold target settles now and the column stands
 * for HOLD_MS before turning home; a battle target settles on the outcome the
 * caller resolved. Pays the reward and ticks the lane exactly once, through
 * the grant table.
 */
export async function settleExercise(
  db: D1Database,
  row: ExerciseRow,
  won: boolean,
  now: number,
): Promise<{holdUntil: number | null}> {
  if (!isExerciseType(row.type)) return {holdUntil: null};
  const spec = EXERCISES[row.type];
  const holdUntil = spec.kind === 'hold' ? now + HOLD_MS : null;
  const state = won ? 'settled' : 'failed';
  const r = await db
    .prepare(`UPDATE map_exercises SET state = ?2, hold_until = ?3, settled_at = ?4 WHERE id = ?1 AND state = 'marching'`)
    .bind(row.id, state, holdUntil, now)
    .run();
  // Settled once: a second arrival for the same target (there cannot be one,
  // but a replayed settle could try) pays nothing.
  if (!(r.meta.changes ?? 0) || !won) return {holdUntil};
  const {week} = seasonPhase(now);
  await grantExerciseReward(db, row.player_id, row.id, row.type, spec.lane, exerciseReward(row.type, week), `${spec.name} · ${spec.action}`, now);
  return {holdUntil};
}


