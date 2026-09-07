/**
 * Development-only progression tools for the test realm.
 *
 * One account - `qa-progression-max` - that Matt can put at any level of any
 * track in one action, so every upgrade surface can be inspected at 1, 10,
 * 20, 30, 40 and 50 without earning it. Nothing here exists on production:
 *
 *   - Every route answers 404 unless `ALLOW_DEV_PROGRESSION_SEEDS` is the
 *     string "true" in the Worker's vars. It is set only under `env.test` in
 *     wrangler.jsonc, and bindings do not inherit between environments, so a
 *     live deploy cannot pick it up by accident.
 *   - With the flag on, the routes still answer 404 to anyone who is not the
 *     owner. A QA account cannot seed itself.
 *   - The only account that can be seeded is `qa-progression-max`. Even the
 *     owner cannot point these tools at a real player.
 *
 * Every action is one `db.batch` (a D1 transaction) that ends with a row in
 * `dev_seed_log`, so the seed and its record land together or not at all.
 * Levels are clamped to 1..50 here and by the tables' CHECK constraints.
 */
import {ASSET_MAX_LEVEL, SQUAD_NAMES, isSquadName} from '../shared/assets';
import {BUILDING_MAX_LEVEL, LEVELLED_BUILDINGS, isLevelledBuilding} from '../shared/buildings';
import {COMBAT_SYSTEM_MAX_LEVEL, isCombatSystemLane} from '../shared/combatSystems';
import {PROGRESSION_TRACKS, validateRegistry} from '../shared/progression';
import {isPackageKey} from '../shared/upgrades';
import {hashPassword, newId} from './auth';
import {ensureRoster} from './squads';

export const QA_ACCOUNT = 'qa-progression-max';
export const QA_ROLE = 'qa';
export const DEV_FLAG = 'ALLOW_DEV_PROGRESSION_SEEDS';

export interface DevEnv {
  DB: D1Database;
  ALLOW_DEV_PROGRESSION_SEEDS?: string;
}

export function devSeedsEnabled(env: DevEnv): boolean {
  return env.ALLOW_DEV_PROGRESSION_SEEDS === 'true';
}

interface Target {
  id: string;
  username: string;
  role: string;
}

async function findTarget(db: D1Database): Promise<Target | null> {
  return db
    .prepare(`SELECT id, username, role FROM players WHERE username_key = ?1`)
    .bind(QA_ACCOUNT)
    .first<Target>();
}

const clamp = (n: unknown, max: number) => Math.max(1, Math.min(max, Math.floor(Number(n) || 1)));

function log(db: D1Database, actorId: string, targetId: string, action: string, params: unknown, now: number) {
  return db
    .prepare(
      `INSERT INTO dev_seed_log (id, actor_id, target_id, action, params, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
    )
    .bind(newId(), actorId, targetId, action, JSON.stringify(params ?? {}), now);
}

export type DevResult = {ok: true; message: string; [k: string]: unknown} | {ok: false; error: string};

/** What the dev page shows: the flag, the account, the registry's health, the log. */
export async function devStatus(db: D1Database): Promise<Record<string, unknown>> {
  const [target, recent] = await Promise.all([
    findTarget(db),
    db
      .prepare(`SELECT action, params, created_at AS at FROM dev_seed_log ORDER BY created_at DESC LIMIT 20`)
      .all<{action: string; params: string; at: number}>(),
  ]);
  return {
    account: target ? {username: target.username, id: target.id, role: target.role} : null,
    tracks: PROGRESSION_TRACKS.map((t) => ({id: t.id, displayName: t.displayName, category: t.category, placeholderFrom: t.placeholderFrom ?? null})),
    registryProblems: validateRegistry(),
    recent: recent.results ?? [],
    buildings: LEVELLED_BUILDINGS,
    squads: SQUAD_NAMES,
  };
}

/**
 * Create the QA account if it does not exist. The password is chosen by the
 * caller and never stored anywhere but the hash - it is shown once.
 */
export async function createQaAccount(
  db: D1Database,
  password: string,
  seedBase: (playerId: string, username: string, now: number) => Promise<void>,
  actorId: string,
  now: number,
): Promise<DevResult> {
  if (typeof password !== 'string' || password.length < 8) return {ok: false, error: 'Password must be at least 8 characters.'};
  const existing = await findTarget(db);
  if (existing) {
    // Re-keying is allowed: the account is for one person and the old
    // password may simply have been lost.
    await db.batch([
      db.prepare(`UPDATE players SET password_hash = ?2 WHERE id = ?1`).bind(existing.id, await hashPassword(password)),
      log(db, actorId, existing.id, 'rekey', {}, now),
    ]);
    return {ok: true, message: `${QA_ACCOUNT} already existed; password replaced.`, username: QA_ACCOUNT};
  }
  const playerId = newId();
  await db
    .prepare(
      `INSERT INTO players (id, username, username_key, password_hash, created_at, last_seen_at,
                            email, email_key, country, locale, approved_at, role, shield_until, shield_kind)
       VALUES (?1, ?2, ?3, ?4, ?5, ?5, NULL, NULL, 'US', 'en', ?5, ?6, NULL, NULL)`,
    )
    .bind(playerId, QA_ACCOUNT, QA_ACCOUNT, await hashPassword(password), now, QA_ROLE)
    .run();
  await seedBase(playerId, QA_ACCOUNT, now);
  await ensureRoster(db, playerId, now);
  await log(db, actorId, playerId, 'create', {}, now).run();
  return {ok: true, message: `${QA_ACCOUNT} created.`, username: QA_ACCOUNT};
}

/** The statements that put every track of the target at one level. */
function setAllStatements(db: D1Database, targetId: string, level: number): D1PreparedStatement[] {
  const b = Math.min(level, BUILDING_MAX_LEVEL);
  const a = Math.min(level, ASSET_MAX_LEVEL);
  const c = Math.min(level, COMBAT_SYSTEM_MAX_LEVEL);
  return [
    // Every levelled building, whether or not it has a row yet.
    ...LEVELLED_BUILDINGS.map((building) =>
      db
        .prepare(
          `INSERT INTO base_levels (player_id, building, level) VALUES (?1, ?2, ?3)
           ON CONFLICT (player_id, building) DO UPDATE SET level = excluded.level`,
        )
        .bind(targetId, building, b),
    ),
    // Any job in flight would fold a stale level over the seed on the next read.
    db.prepare(`UPDATE base_jobs SET applied_at = ?2 WHERE player_id = ?1 AND applied_at IS NULL`).bind(targetId, Date.now()),
    // Every owned asset: rank and all four packages (packages may not exceed rank).
    db
      .prepare(
        `UPDATE player_assets
            SET level = ?2, pkg_armament = ?2, pkg_protection = ?2, pkg_propulsion = ?2, pkg_electronics = ?2,
                pkg_credits = 0, hp_fraction = 1, repair_ends_at = NULL
          WHERE player_id = ?1`,
      )
      .bind(targetId, a),
    // Every Task Force's three lanes.
    ...SQUAD_NAMES.map((squad) =>
      db
        .prepare(
          `INSERT INTO squad_systems (player_id, squad, fire_control, survivability, sustainment)
           VALUES (?1, ?2, ?3, ?3, ?3)
           ON CONFLICT (player_id, squad) DO UPDATE
             SET fire_control = excluded.fire_control, survivability = excluded.survivability, sustainment = excluded.sustainment`,
        )
        .bind(targetId, squad, c),
    ),
  ];
}

export async function devAction(
  db: D1Database,
  actorId: string,
  body: Record<string, unknown>,
  now: number,
): Promise<DevResult> {
  const target = await findTarget(db);
  if (!target) return {ok: false, error: `${QA_ACCOUNT} does not exist yet. Create it first.`};
  if (target.role !== QA_ROLE) return {ok: false, error: `${QA_ACCOUNT} is not a QA account.`};
  const action = typeof body.action === 'string' ? body.action : '';

  switch (action) {
    case 'reset': {
      await db.batch([
        ...setAllStatements(db, target.id, 1),
        db.prepare(`DELETE FROM squad_systems WHERE player_id = ?1`).bind(target.id),
        db.prepare(`UPDATE players SET delta_at = NULL, second_team_at = NULL WHERE id = ?1`).bind(target.id),
        log(db, actorId, target.id, 'reset', {}, now),
      ]);
      return {ok: true, message: 'Every track reset to level 1. Wallet untouched.'};
    }
    case 'set-all': {
      const level = clamp(body.level, 50);
      await db.batch([...setAllStatements(db, target.id, level), log(db, actorId, target.id, 'set-all', {level}, now)]);
      return {ok: true, message: `Every building, asset, package lane and Combat System set to level ${level}.`};
    }
    case 'max-one': {
      const level = clamp(body.level ?? 50, 50);
      const kind = body.kind;
      const id = typeof body.id === 'string' ? body.id : '';
      if (kind === 'building') {
        if (!isLevelledBuilding(id)) return {ok: false, error: 'No such building.'};
        await db.batch([
          db
            .prepare(
              `INSERT INTO base_levels (player_id, building, level) VALUES (?1, ?2, ?3)
               ON CONFLICT (player_id, building) DO UPDATE SET level = excluded.level`,
            )
            .bind(target.id, id, level),
          log(db, actorId, target.id, 'max-one', {kind, id, level}, now),
        ]);
        return {ok: true, message: `${id} set to level ${level}.`};
      }
      if (kind === 'asset') {
        const r = await db.batch([
          // Rank up or down; packages are pulled down to the new rank if above it.
          db
            .prepare(
              `UPDATE player_assets
                  SET level = ?3,
                      pkg_armament = MIN(pkg_armament, ?3), pkg_protection = MIN(pkg_protection, ?3),
                      pkg_propulsion = MIN(pkg_propulsion, ?3), pkg_electronics = MIN(pkg_electronics, ?3)
                WHERE player_id = ?1 AND asset_id = ?2`,
            )
            .bind(target.id, id, level),
          log(db, actorId, target.id, 'max-one', {kind, id, level}, now),
        ]);
        if (!r[0].meta.changes) return {ok: false, error: 'The QA account does not hold that asset.'};
        return {ok: true, message: `${id} Service Rank set to ${level}.`};
      }
      if (kind === 'package') {
        const pkg = body.package;
        if (!isPackageKey(pkg)) return {ok: false, error: 'No such package.'};
        const r = await db.batch([
          // A package never outranks its asset: raise the rank to meet it.
          db
            .prepare(
              `UPDATE player_assets SET level = MAX(level, ?3), pkg_${pkg} = ?3
                WHERE player_id = ?1 AND asset_id = ?2`,
            )
            .bind(target.id, id, level),
          log(db, actorId, target.id, 'max-one', {kind, id, package: pkg, level}, now),
        ]);
        if (!r[0].meta.changes) return {ok: false, error: 'The QA account does not hold that asset.'};
        return {ok: true, message: `${id} ${pkg} set to ${level} (rank raised to match if needed).`};
      }
      if (kind === 'combat-system') {
        const squad = typeof body.squad === 'string' ? body.squad : '';
        const lane = body.lane;
        if (!isSquadName(squad)) return {ok: false, error: 'No such Task Force.'};
        if (!isCombatSystemLane(lane)) return {ok: false, error: 'No such Combat System.'};
        await db.batch([
          db
            .prepare(
              `INSERT INTO squad_systems (player_id, squad, ${lane}) VALUES (?1, ?2, ?3)
               ON CONFLICT (player_id, squad) DO UPDATE SET ${lane} = excluded.${lane}`,
            )
            .bind(target.id, squad, level),
          log(db, actorId, target.id, 'max-one', {kind, squad, lane, level}, now),
        ]);
        return {ok: true, message: `Task Force ${squad} ${lane} set to ${level}.`};
      }
      if (kind === 'livery') {
        return {ok: false, error: 'Per-asset liveries are not built yet; there is nothing to max.'};
      }
      return {ok: false, error: 'kind must be building, asset, package, combat-system or livery.'};
    }
    case 'grant': {
      const tokens = Math.max(0, Math.floor(Number(body.tokens) || 0));
      const credits = Math.max(0, Math.floor(Number(body.credits) || 0));
      if (tokens === 0 && credits === 0) return {ok: false, error: 'Nothing to grant.'};
      await db.batch([
        db
          .prepare(`UPDATE players SET tokens = tokens + ?2, credits = credits + ?3, wallet_rev = wallet_rev + 1 WHERE id = ?1`)
          .bind(target.id, tokens, credits),
        db
          .prepare(
            `INSERT INTO wallet_ledger (player_id, kind, tokens, credits, subject, detail, created_at)
             VALUES (?1, 'grant', ?2, ?3, 'dev', 'test grant', ?4)`,
          )
          .bind(target.id, tokens, credits, now),
        log(db, actorId, target.id, 'grant', {tokens, credits}, now),
      ]);
      return {ok: true, message: `Granted ${tokens.toLocaleString()} Tokens and ${credits.toLocaleString()} Credits.`};
    }
    case 'clear-limits': {
      await db.batch([
        db.prepare(`DELETE FROM depot_purchases WHERE player_id = ?1`).bind(target.id),
        db.prepare(`DELETE FROM trade_purchases WHERE player_id = ?1`).bind(target.id),
        db
          .prepare(`UPDATE players SET coupon_week = -1, coupon_8_used = 0, coupon_4_used = 0, shield_cooldown_until = NULL WHERE id = ?1`)
          .bind(target.id),
        log(db, actorId, target.id, 'clear-limits', {}, now),
      ]);
      return {ok: true, message: 'Depot daily caps, Trade Post windows, shield coupons and cooldown cleared.'};
    }
    case 'drop-shields': {
      // Every fresh account - bots included - carries the 48-hour new-player
      // shield, so a freshly minted test realm has nothing attackable for two
      // days. This clears every shield on the realm (not just the QA
      // account's), which is why it exists only behind the test-realm flag.
      const r = await db.batch([
        db
          .prepare(`UPDATE players SET shield_until = NULL, shield_kind = NULL, shield_cooldown_until = NULL WHERE shield_until IS NOT NULL`),
        log(db, actorId, target.id, 'drop-shields', {scope: 'realm'}, now),
      ]);
      return {ok: true, message: `Dropped ${r[0].meta.changes ?? 0} shields across the realm. Every base can be attacked now.`};
    }
    case 'seed-liveries': {
      // Base skins are already all equippable while ALL_SKINS_UNLOCKED is on
      // (worker/game.ts); per-asset liveries do not exist yet. Recorded so the
      // log shows the attempt.
      await log(db, actorId, target.id, 'seed-liveries', {note: 'not built'}, now).run();
      return {ok: false, error: 'Per-asset liveries are not built yet. Base skins are already all unlocked on this build.'};
    }
    default:
      return {ok: false, error: 'action must be reset, set-all, max-one, grant, clear-limits, drop-shields or seed-liveries.'};
  }
}
