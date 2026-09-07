/**
 * Damage lands on the roster after a battle; repairs restore it, for a
 * price and a wait. GAME-MATH v1 §5.
 */
import {ASSET_BY_ID} from '../shared/assets';
import {type Resources, categoryBoost, shortfall} from '../shared/buildings';
import {packagesFromRow} from '../shared/upgrades';
import {repairBill} from '../shared/repair';
import {readBase, shortMessage} from './buildings';

/** Finished repairs become whole assets, once. */
export async function settleRepairs(db: D1Database, playerId: string, now: number): Promise<void> {
  await db
    .prepare(
      `UPDATE player_assets SET hp_fraction = 1, repair_ends_at = NULL
        WHERE player_id = ?1 AND repair_ends_at IS NOT NULL AND repair_ends_at <= ?2`,
    )
    .bind(playerId, now)
    .run();
}

/**
 * Write what each asset had left when the fight ended. Damage only goes
 * down here; a repair in flight is untouched (the asset was not fighting).
 */
export async function applyDamage(
  db: D1Database,
  hits: Array<{playerId: string; assetId: string; remaining: number}>,
): Promise<void> {
  if (hits.length === 0) return;
  await db.batch(
    hits.map((h) =>
      db
        .prepare(
          `UPDATE player_assets SET hp_fraction = MIN(hp_fraction, ?3)
            WHERE player_id = ?1 AND asset_id = ?2 AND repair_ends_at IS NULL`,
        )
        .bind(h.playerId, h.assetId, Math.max(0, Math.min(1, h.remaining))),
    ),
  );
}

export type RepairResult = {ok: true; ms: number; cost: Resources} | {ok: false; error: string};

/**
 * Repair one asset, or every damaged asset ('all'), for resources. One bill,
 * one debit; every asset in the bill gets its own timer. An asset already
 * under repair is skipped. Marching assets cannot be repaired - they are not
 * here.
 */
export async function startRepair(
  db: D1Database,
  playerId: string,
  target: string,
  away: Set<string>,
  now: number,
  name: (b: string) => string,
): Promise<RepairResult> {
  await settleRepairs(db, playerId, now);
  const [rows, base, slots] = await Promise.all([
    db
      .prepare(
        `SELECT asset_id AS assetId, level, hp_fraction AS hp, repair_ends_at AS ends,
                pkg_armament, pkg_protection, pkg_propulsion, pkg_electronics
           FROM player_assets WHERE player_id = ?1 AND hp_fraction < 1 AND repair_ends_at IS NULL`,
      )
      .bind(playerId)
      .all<{
        assetId: string;
        level: number;
        hp: number;
        ends: number | null;
        pkg_armament: number | null;
        pkg_protection: number | null;
        pkg_propulsion: number | null;
        pkg_electronics: number | null;
      }>(),
    readBase(db, playerId, now),
    db
      .prepare(`SELECT squad, asset_id AS assetId FROM squad_slots WHERE player_id = ?1`)
      .bind(playerId)
      .all<{squad: string; assetId: string}>(),
  ]);
  const squadOf = new Map((slots.results ?? []).map((s) => [s.assetId, s.squad]));
  const wanted = (rows.results ?? []).filter((r) => {
    if (target !== 'all' && r.assetId !== target) return false;
    const squad = squadOf.get(r.assetId);
    return !(squad && away.has(squad));
  });
  if (wanted.length === 0) {
    return {ok: false, error: target === 'all' ? 'Nothing needs repair.' : 'That asset does not need repair, or is away.'};
  }

  const cost: Resources = {fuel: 0, steel: 0, munitions: 0, alloy: 0};
  const timers: Array<{assetId: string; ms: number}> = [];
  for (const r of wanted) {
    const asset = ASSET_BY_ID[r.assetId];
    if (!asset) continue;
    const bill = repairBill(asset, r.level, packagesFromRow(r), categoryBoost(base.levels, asset.category), r.hp);
    cost.fuel += bill.fuel;
    cost.steel += bill.steel;
    cost.munitions += bill.munitions;
    timers.push({assetId: r.assetId, ms: bill.ms});
  }
  const short = shortfall(base.resources, cost);
  if (Object.keys(short).length > 0) return {ok: false, error: shortMessage(short, name as never)};

  const result = await db.batch([
    db
      .prepare(
        `UPDATE bases
            SET fuel = fuel - ?2, steel = steel - ?3, munitions = munitions - ?4, stock_rev = stock_rev + 1
          WHERE player_id = ?1 AND stock_rev = ?5 AND fuel >= ?2 AND steel >= ?3 AND munitions >= ?4`,
      )
      .bind(playerId, cost.fuel, cost.steel, cost.munitions, base.stockRev),
    ...timers.map((t) =>
      db
        .prepare(
          `UPDATE player_assets SET repair_ends_at = ?3
            WHERE player_id = ?1 AND asset_id = ?2 AND repair_ends_at IS NULL
              AND EXISTS (SELECT 1 FROM bases WHERE player_id = ?1 AND stock_rev = ?4)`,
        )
        .bind(playerId, t.assetId, now + t.ms, base.stockRev + 1),
    ),
  ]);
  if (!result[0].meta.changes) return {ok: false, error: 'Your stock changed. Try that again.'};
  return {ok: true, ms: Math.max(...timers.map((t) => t.ms)), cost};
}
