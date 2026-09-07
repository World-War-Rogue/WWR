/**
 * Asset construction, shields and the guide's saved place.
 * ONBOARDING, SHIELDS & CONSTRUCTION v1.
 *
 * All three are small server-owned state on the player, read in one place
 * (`readSeasonState`) and changed only through the functions here.
 */
import {ASSET_BY_ID} from '../shared/assets';
import {type Resources, shortfall} from '../shared/buildings';
import {buildState} from '../shared/construction';
import {type Split, defaultSplit, splitIsValid} from '../shared/economy';
import {formatClock, gameWeekIndex} from '../shared/gametime';
import {
  type ShieldKind,
  SHIELD_COOLDOWN_MS,
  SHIELD_WORDING,
  isShielded,
  shieldOption,
} from '../shared/shields';
import {readBase, shortMessage} from './buildings';
import {type Wallet, claimWallet, ledger, settleWallet} from './upgrades';

/* -------------------------------------------------------------------------- */
/* State                                                                      */
/* -------------------------------------------------------------------------- */

export interface AssetBuildView {
  id: string;
  assetId: string;
  startedAt: number;
  completesAt: number;
}

export interface ShieldView {
  until: number | null;
  kind: ShieldKind | null;
  cooldownUntil: number | null;
  /** Free coupons still unused this week. */
  coupons: {h8: boolean; h4: boolean};
}

export interface GuideView {
  step: number;
  enabled: boolean;
  completed: boolean;
  tips: string[];
}

export interface SeasonState {
  build: AssetBuildView | null;
  shield: ShieldView;
  guide: GuideView;
}

interface PlayerRow {
  shield_until: number | null;
  shield_kind: ShieldKind | null;
  shield_cooldown_until: number | null;
  coupon_week: number;
  coupon_8_used: number;
  coupon_4_used: number;
  guide_step: number;
  guide_enabled: number;
  guide_completed: number;
  guide_tips: string;
}

/** Fold a finished build into the roster, once, and return what still runs. */
async function settleBuild(db: D1Database, playerId: string, now: number): Promise<AssetBuildView | null> {
  const row = await db
    .prepare(
      `SELECT id, asset_id AS assetId, started_at AS startedAt, completes_at AS completesAt
         FROM asset_builds WHERE player_id = ?1 AND applied_at IS NULL`,
    )
    .bind(playerId)
    .first<AssetBuildView>();
  if (!row) return null;
  if (row.completesAt > now) return row;
  const claimed = await db
    .prepare(`UPDATE asset_builds SET applied_at = ?2 WHERE id = ?1 AND applied_at IS NULL`)
    .bind(row.id, now)
    .run();
  if (claimed.meta.changes) {
    await db
      .prepare(
        `INSERT INTO player_assets (player_id, asset_id, level, acquired_at)
         VALUES (?1, ?2, 1, ?3) ON CONFLICT DO NOTHING`,
      )
      .bind(playerId, row.assetId, now)
      .run();
  }
  return null;
}

/** The week's coupons, granted lazily the first time the week is looked at. */
async function settleCoupons(db: D1Database, playerId: string, row: PlayerRow, now: number): Promise<PlayerRow> {
  const week = gameWeekIndex(now);
  if (row.coupon_week >= week) return row;
  await db
    .prepare(
      `UPDATE players SET coupon_week = ?2, coupon_8_used = 0, coupon_4_used = 0
        WHERE id = ?1 AND coupon_week < ?2`,
    )
    .bind(playerId, week)
    .run();
  return {...row, coupon_week: week, coupon_8_used: 0, coupon_4_used: 0};
}

export async function readSeasonState(db: D1Database, playerId: string, now: number): Promise<SeasonState> {
  const [build, raw] = await Promise.all([
    settleBuild(db, playerId, now),
    db
      .prepare(
        `SELECT shield_until, shield_kind, shield_cooldown_until, coupon_week, coupon_8_used, coupon_4_used,
                guide_step, guide_enabled, guide_completed, guide_tips
           FROM players WHERE id = ?1`,
      )
      .bind(playerId)
      .first<PlayerRow>(),
  ]);
  const row = await settleCoupons(
    db,
    playerId,
    raw ?? {
      shield_until: null,
      shield_kind: null,
      shield_cooldown_until: null,
      coupon_week: -1,
      coupon_8_used: 0,
      coupon_4_used: 0,
      guide_step: 1,
      guide_enabled: 1,
      guide_completed: 0,
      guide_tips: '[]',
    },
    now,
  );
  let tips: string[] = [];
  try {
    const parsed = JSON.parse(row.guide_tips) as unknown;
    if (Array.isArray(parsed)) tips = parsed.filter((t): t is string => typeof t === 'string');
  } catch {
    tips = [];
  }
  return {
    build,
    shield: {
      until: isShielded(row.shield_until, now) ? row.shield_until : null,
      kind: isShielded(row.shield_until, now) ? row.shield_kind : null,
      cooldownUntil: row.shield_cooldown_until && row.shield_cooldown_until > now ? row.shield_cooldown_until : null,
      coupons: {h8: !row.coupon_8_used, h4: !row.coupon_4_used},
    },
    guide: {
      step: row.guide_step,
      enabled: row.guide_enabled === 1,
      completed: row.guide_completed === 1,
      tips,
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Construction                                                               */
/* -------------------------------------------------------------------------- */

export type BuildResult = {ok: true} | {ok: false; error: string};

export async function startBuild(
  db: D1Database,
  playerId: string,
  assetId: string,
  now: number,
  name: (b: string) => string,
): Promise<BuildResult> {
  const asset = ASSET_BY_ID[assetId];
  if (!asset) return {ok: false, error: 'No such asset.'};
  const owned = await db
    .prepare(`SELECT 1 AS ok FROM player_assets WHERE player_id = ?1 AND asset_id = ?2`)
    .bind(playerId, assetId)
    .first<{ok: number}>();
  if (owned) return {ok: false, error: 'You already hold that asset.'};

  const state = await readSeasonState(db, playerId, now);
  if (state.build) {
    return {ok: false, error: `${ASSET_BY_ID[state.build.assetId]?.name ?? 'An asset'} is already under construction. One at a time.`};
  }
  const base = await readBase(db, playerId, now);
  const can = buildState(assetId, base.levels, now);
  if (can.kind === 'locked') return {ok: false, error: `Opens week ${can.week}. Blueprint not yet available.`};
  if (can.kind === 'needs_level') return {ok: false, error: `Requires ${name(can.building)} level ${can.level}.`};
  if (can.kind === 'unbuildable') return {ok: false, error: 'Not this season.'};

  const cost: Resources = can.spec.cost;
  const short = shortfall(base.resources, cost);
  if (Object.keys(short).length > 0) return {ok: false, error: shortMessage(short, name as never)};

  const result = await db.batch([
    db
      .prepare(
        `UPDATE bases
            SET fuel = fuel - ?2, steel = steel - ?3, munitions = munitions - ?4, alloy = alloy - ?5,
                stock_rev = stock_rev + 1
          WHERE player_id = ?1 AND stock_rev = ?6
            AND fuel >= ?2 AND steel >= ?3 AND munitions >= ?4 AND alloy >= ?5`,
      )
      .bind(playerId, cost.fuel, cost.steel, cost.munitions, cost.alloy, base.stockRev),
    db
      .prepare(
        `INSERT INTO asset_builds (id, player_id, asset_id, started_at, completes_at)
         SELECT ?1, ?2, ?3, ?4, ?5
          WHERE EXISTS (SELECT 1 FROM bases WHERE player_id = ?2 AND stock_rev = ?6)`,
      )
      .bind(crypto.randomUUID(), playerId, assetId, now, now + can.spec.ms, base.stockRev + 1),
  ]);
  if (!result[0].meta.changes || !result[1].meta.changes) {
    return {ok: false, error: 'Your stock changed. Try that again.'};
  }
  return {ok: true};
}

/* -------------------------------------------------------------------------- */
/* Shields                                                                    */
/* -------------------------------------------------------------------------- */

export type ShieldResult = {ok: true; wallet: Wallet} | {ok: false; error: string};

export async function applyShield(
  db: D1Database,
  playerId: string,
  kind: string,
  split: Split | null,
  now: number,
): Promise<ShieldResult> {
  const option = shieldOption(kind);
  if (!option) return {ok: false, error: 'No such shield.'};
  const state = await readSeasonState(db, playerId, now);
  if (state.shield.until) return {ok: false, error: SHIELD_WORDING.active};
  if (state.shield.cooldownUntil) {
    return {ok: false, error: SHIELD_WORDING.cooldown(`${formatClock(state.shield.cooldownUntil)} RST`)};
  }
  if (option.kind === 'coupon8' && !state.shield.coupons.h8) return {ok: false, error: 'That free shield is used this week.'};
  if (option.kind === 'coupon4' && !state.shield.coupons.h4) return {ok: false, error: 'That free shield is used this week.'};

  // Not while anything hostile is in the air either way.
  const inbound = await db
    .prepare(`SELECT 1 AS ok FROM marches WHERE defender_id = ?1 AND attacker_id != ?1 AND kind = 'attack' AND battle_id IS NULL LIMIT 1`)
    .bind(playerId)
    .first<{ok: number}>();
  if (inbound) return {ok: false, error: SHIELD_WORDING.inbound};
  const outbound = await db
    .prepare(`SELECT 1 AS ok FROM marches WHERE attacker_id = ?1 AND kind = 'attack' AND battle_id IS NULL LIMIT 1`)
    .bind(playerId)
    .first<{ok: number}>();
  if (outbound) return {ok: false, error: SHIELD_WORDING.outbound};

  const wallet = await settleWallet(db, playerId, now);
  const until = now + option.ms;
  const couponColumn = option.kind === 'coupon8' ? 'coupon_8_used' : option.kind === 'coupon4' ? 'coupon_4_used' : null;

  if (option.price === 0) {
    const r = await db
      .prepare(
        `UPDATE players SET shield_until = ?2, shield_kind = ?3${couponColumn ? `, ${couponColumn} = 1` : ''}
          WHERE id = ?1 AND (shield_until IS NULL OR shield_until <= ?4)${couponColumn ? ` AND ${couponColumn} = 0` : ''}`,
      )
      .bind(playerId, until, option.kind, now)
      .run();
    if (!r.meta.changes) return {ok: false, error: 'That did not go through. Try again.'};
    return {ok: true, wallet};
  }

  const chosen = split ?? defaultSplit(option.price, wallet.credits);
  if (!splitIsValid(chosen, option.price)) return {ok: false, error: `That does not add up to ${option.price}.`};
  if (chosen.tokens > wallet.tokens || chosen.credits > wallet.credits) return {ok: false, error: 'Not enough to cover that.'};
  await db.batch([
    claimWallet(db, playerId, wallet, chosen),
    db
      .prepare(
        `UPDATE players SET shield_until = ?2, shield_kind = ?3
          WHERE id = ?1 AND wallet_rev = ?4 AND (shield_until IS NULL OR shield_until <= ?5)`,
      )
      .bind(playerId, until, option.kind, wallet.rev + 1, now),
    ledger(db, playerId, 'shield', chosen, option.kind, option.label, now, wallet.rev),
  ]);
  const after = await db
    .prepare(`SELECT tokens, credits, wallet_rev AS rev, shield_until AS until FROM players WHERE id = ?1`)
    .bind(playerId)
    .first<Wallet & {until: number | null}>();
  if (!after || after.rev === wallet.rev) return {ok: false, error: 'Your balance changed. Try that again.'};
  return {ok: true, wallet: after};
}

/* -------------------------------------------------------------------------- */
/* The guide                                                                  */
/* -------------------------------------------------------------------------- */

export async function saveGuide(
  db: D1Database,
  playerId: string,
  patch: {step?: number; enabled?: boolean; completed?: boolean; tip?: string},
): Promise<void> {
  const sets: string[] = [];
  const binds: unknown[] = [playerId];
  if (typeof patch.step === 'number' && Number.isInteger(patch.step) && patch.step >= 1 && patch.step <= 99) {
    binds.push(patch.step);
    // Only ever forward: a tap on an earlier control must not rewind the walkthrough.
    sets.push(`guide_step = MAX(guide_step, ?${binds.length})`);
  }
  if (typeof patch.enabled === 'boolean') {
    binds.push(patch.enabled ? 1 : 0);
    sets.push(`guide_enabled = ?${binds.length}`);
  }
  if (patch.completed === true) sets.push(`guide_completed = 1`);
  if (typeof patch.tip === 'string' && patch.tip.length <= 40) {
    binds.push(JSON.stringify(patch.tip));
    sets.push(
      `guide_tips = CASE WHEN EXISTS (SELECT 1 FROM json_each(guide_tips) WHERE value = json_extract(?${binds.length}, '$'))
                         THEN guide_tips ELSE json_insert(guide_tips, '$[#]', json_extract(?${binds.length}, '$')) END`,
    );
  }
  if (sets.length === 0) return;
  await db.prepare(`UPDATE players SET ${sets.join(', ')} WHERE id = ?1`).bind(...binds).run();
}

