/**
 * Base levels: the Command Center and the five asset buildings.
 *
 * Three rules, none trusted from the browser:
 *
 *   The COST is recomputed from shared/buildings.ts. A request names a
 *   building and a payment split, never a price or a level.
 *
 *   The TIMER is an absolute instant. A job is a row with completes_at; any
 *   read past that instant folds it into base_levels, once, and a job that
 *   was already applied is never applied again (settle-on-read, same shape
 *   as the wallet and resource production).
 *
 *   The QUEUE is an index. One running job per base is a partial unique
 *   index, so two tabs pressing Start at the same instant cannot both win.
 */
import {
  type BuildingLevels,
  type LevelledBuilding,
  NO_BUILDINGS,
  buildingBlock,
  buildingStep,
  isLevelledBuilding,
} from '../shared/buildings';
import {type Split, defaultSplit, splitIsValid} from '../shared/economy';
import {type Wallet, claimWallet, ledger, settleWallet} from './upgrades';

export interface BaseJob {
  id: string;
  building: LevelledBuilding;
  toLevel: number;
  startedAt: number;
  completesAt: number;
}

export interface BaseState {
  levels: BuildingLevels;
  /** The job still running, if any. */
  job: BaseJob | null;
}

/**
 * The base as it is now: finished jobs applied, the running one reported.
 *
 * Applying is a conditional UPDATE on the job row first, and the level write
 * happens only where that claim landed - so two concurrent reads past the
 * same completes_at apply the level once between them.
 */
export async function readBase(db: D1Database, playerId: string, now: number): Promise<BaseState> {
  const due = await db
    .prepare(
      `SELECT id, building, to_level AS toLevel, started_at AS startedAt, completes_at AS completesAt
         FROM base_jobs WHERE player_id = ?1 AND applied_at IS NULL`,
    )
    .bind(playerId)
    .first<BaseJob>();

  let job: BaseJob | null = due ?? null;
  if (due && due.completesAt <= now && isLevelledBuilding(due.building)) {
    const claimed = await db
      .prepare(`UPDATE base_jobs SET applied_at = ?2 WHERE id = ?1 AND applied_at IS NULL`)
      .bind(due.id, now)
      .run();
    if (claimed.meta.changes) {
      await db
        .prepare(
          `INSERT INTO base_levels (player_id, building, level) VALUES (?1, ?2, ?3)
             ON CONFLICT(player_id, building) DO UPDATE SET level = MAX(level, excluded.level)`,
        )
        .bind(playerId, due.building, due.toLevel)
        .run();
    }
    job = null;
  }

  const rows = await db
    .prepare(`SELECT building, level FROM base_levels WHERE player_id = ?1`)
    .bind(playerId)
    .all<{building: string; level: number}>();
  const levels: BuildingLevels = {...NO_BUILDINGS};
  for (const r of rows.results ?? []) {
    if (isLevelledBuilding(r.building)) levels[r.building] = r.level;
  }
  return {levels, job};
}

export type StartResult =
  | {ok: true; wallet: Wallet; base: BaseState}
  | {ok: false; error: string};

/**
 * Start a building's next level.
 *
 * Gates in the order a player wants to hear them: the season cap, the Command
 * Center ceiling, the queue, then the money. The level being built is always
 * current + 1 - there is no skipping and no request-named target.
 */
export async function startLevel(
  db: D1Database,
  playerId: string,
  buildingId: string,
  split: Split | null,
  season: number,
  now: number,
): Promise<StartResult> {
  if (!isLevelledBuilding(buildingId)) return {ok: false, error: 'That building does not level.'};
  const building = buildingId;

  const base = await readBase(db, playerId, now);
  const blocked = buildingBlock(building, base.levels, season);
  if (blocked) return {ok: false, error: blocked};
  if (base.job) {
    return {ok: false, error: 'The engineers are busy. One upgrade at a time.'};
  }

  const toLevel = base.levels[building] + 1;
  const step = buildingStep(building, toLevel);
  const wallet = await settleWallet(db, playerId, now);
  const chosen = split ?? defaultSplit(step.cost, wallet.credits);
  if (!splitIsValid(chosen, step.cost)) {
    return {ok: false, error: `That does not add up to ${step.cost}.`};
  }
  if (chosen.tokens > wallet.tokens || chosen.credits > wallet.credits) {
    return {ok: false, error: 'Not enough to cover that.'};
  }

  const id = crypto.randomUUID();
  // The job insert is guarded by the wallet claim (rev + 1) AND by the
  // one-running-job index. If the index rejects it the whole batch rolls
  // back, so the money stays.
  await db.batch([
    claimWallet(db, playerId, wallet, chosen),
    db
      .prepare(
        `INSERT INTO base_jobs (id, player_id, building, to_level, started_at, completes_at)
         SELECT ?1, ?2, ?3, ?4, ?5, ?6
          WHERE EXISTS (SELECT 1 FROM players WHERE id = ?2 AND wallet_rev = ?7)`,
      )
      .bind(id, playerId, building, toLevel, now, now + step.ms, wallet.rev + 1),
    ledger(db, playerId, 'building', chosen, building, `${building} to level ${toLevel}`, now, wallet.rev),
  ]);

  const after = await db
    .prepare(`SELECT tokens, credits, wallet_rev AS rev FROM players WHERE id = ?1`)
    .bind(playerId)
    .first<Wallet>();
  if (!after || after.rev === wallet.rev) {
    return {ok: false, error: 'Your balance changed. Try that again.'};
  }
  return {ok: true, wallet: after, base: await readBase(db, playerId, now)};
}
