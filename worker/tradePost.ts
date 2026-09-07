/**
 * The Trade Post, server side: what is on the shelves for this player, and a
 * purchase that records its window slot and then hands the grant to the
 * exact function the direct screen uses.
 *
 * The purchase row is written FIRST, guarded by the offer's limit in the same
 * statement, and keyed by the client's purchase id. Then the canonical grant
 * runs. If the grant refuses (balance, cap, race), the row is removed so the
 * slot is not consumed. A second confirmation with the same id hits the
 * primary key and is answered with the state already granted, not a second
 * grant. That is the whole of the duplicate protection, and it survives a
 * refresh because the id is chosen when the review opens, not when the
 * button is pressed.
 */
import {
  EMPTY_SHELF_TEXT,
  OFFER_BY_ID,
  type PackageTarget,
  type Route,
  type Shelf,
  decidePurchase,
  eligiblePackages,
  offersOn,
  quotePackageStep,
  windowKey,
  windowResetAt,
} from '../shared/tradePost';
import {ASSET_BY_ID} from '../shared/assets';
import {PACKAGE_KEYS, type PackageKey, packagesFromRow} from '../shared/upgrades';
import {type AssetRow, packageUp, readAsset, settleWallet} from './upgrades';

interface RosterRow extends AssetRow {
  asset_id: string;
}

async function roster(db: D1Database, playerId: string): Promise<PackageTarget[]> {
  const rows = await db
    .prepare(
      `SELECT asset_id, level, pkg_armament, pkg_protection, pkg_propulsion, pkg_electronics, pkg_credits
         FROM player_assets WHERE player_id = ?1`,
    )
    .bind(playerId)
    .all<RosterRow>();
  return (rows.results ?? []).map((r) => ({assetId: r.asset_id, level: r.level, packages: packagesFromRow(r)}));
}

async function purchasedCount(
  db: D1Database,
  playerId: string,
  offerId: string,
  key: string,
): Promise<number> {
  const row = await db
    .prepare(`SELECT COUNT(*) AS n FROM trade_purchases WHERE player_id = ?1 AND offer_id = ?2 AND window_key = ?3`)
    .bind(playerId, offerId, key)
    .first<{n: number}>();
  return row?.n ?? 0;
}

/* -------------------------------------------------------------------------- */
/* Read                                                                       */
/* -------------------------------------------------------------------------- */

export interface ShelfView {
  shelf: Shelf;
  resetAt: number;
  emptyText: string;
  offers: Array<{
    id: string;
    kind: string;
    name: string;
    description: string;
    art: string;
    limit: number;
    remaining: number;
  }>;
}

export interface TargetView {
  assetId: string;
  code: string;
  name: string;
  level: number;
  /** True when at least one package has a next level to buy. */
  eligible: boolean;
  /** Per package: the next-step quote, or null when at the rank ceiling. */
  packages: Record<PackageKey, {current: number; target: number; cost: number} | null>;
}

export async function readTradePost(db: D1Database, playerId: string, now: number, tokenStoreUrl: string | null) {
  const [wallet, assets] = await Promise.all([settleWallet(db, playerId, now), roster(db, playerId)]);

  const shelves: ShelfView[] = [];
  for (const shelf of ['weekly', 'monthly'] as const) {
    const key = windowKey(shelf, now);
    const offers = [];
    for (const o of offersOn(shelf)) {
      const used = await purchasedCount(db, playerId, o.id, key);
      offers.push({
        id: o.id,
        kind: o.kind,
        name: o.name,
        description: o.description,
        art: o.art,
        limit: o.limit,
        remaining: Math.max(0, o.limit - used),
      });
    }
    shelves.push({shelf, resetAt: windowResetAt(shelf, now), emptyText: EMPTY_SHELF_TEXT[shelf], offers});
  }

  // Every asset the player holds, with the live next-step quote per package.
  // Sorted so the ones with something to buy come first.
  const targets: TargetView[] = assets
    .map((a) => ({
      assetId: a.assetId,
      code: ASSET_BY_ID[a.assetId]?.code ?? a.assetId,
      name: ASSET_BY_ID[a.assetId]?.name ?? a.assetId,
      level: a.level,
      eligible: eligiblePackages(a).length > 0,
      packages: Object.fromEntries(
        PACKAGE_KEYS.map((k) => {
          const q = quotePackageStep(a, k);
          return [k, q ? {current: q.current, target: q.target, cost: q.credits} : null];
        }),
      ) as TargetView['packages'],
    }))
    .sort((x, y) => Number(y.eligible) - Number(x.eligible));

  return {
    serverTime: now,
    wallet: {tokens: wallet.tokens, credits: wallet.credits},
    // Present only when configured. The client draws no button otherwise.
    tokenStoreUrl: tokenStoreUrl && /^https:\/\//.test(tokenStoreUrl) ? tokenStoreUrl : null,
    shelves,
    targets,
  };
}

/* -------------------------------------------------------------------------- */
/* Buy                                                                        */
/* -------------------------------------------------------------------------- */

export type BuyResult =
  | {ok: true; duplicate: boolean; wallet: {tokens: number; credits: number}; asset: AssetRow; remaining: number}
  | {ok: false; code: string; error: string};

const PURCHASE_ID = /^[A-Za-z0-9_-]{16,64}$/;

export async function buyFromTradePost(
  db: D1Database,
  playerId: string,
  input: {purchaseId: string; offerId: string; assetId: string; key: PackageKey; route: Route},
  now: number,
): Promise<BuyResult> {
  if (!PURCHASE_ID.test(input.purchaseId)) return {ok: false, code: 'bad-request', error: 'Missing purchase key.'};
  const offer = OFFER_BY_ID[input.offerId];
  if (!offer) return {ok: false, code: 'no-offer', error: 'That offer is not on the shelf.'};
  if (offer.kind !== 'package-step') return {ok: false, code: 'no-offer', error: 'That offer cannot be bought yet.'};

  // Already granted under this key? Answer with what stands, grant nothing.
  const prior = await db
    .prepare(`SELECT player_id, offer_id, asset_id FROM trade_purchases WHERE id = ?1`)
    .bind(input.purchaseId)
    .first<{player_id: string; offer_id: string; asset_id: string | null}>();
  if (prior) {
    if (prior.player_id !== playerId) return {ok: false, code: 'bad-request', error: 'That purchase key is not yours.'};
    return await standing(db, playerId, offer.id, prior.asset_id ?? input.assetId, now, true);
  }

  const key = windowKey(offer.shelf, now);
  const [row, used, wallet] = await Promise.all([
    readAsset(db, playerId, input.assetId),
    purchasedCount(db, playerId, offer.id, key),
    settleWallet(db, playerId, now),
  ]);
  const asset: PackageTarget | undefined = row
    ? {assetId: row.asset_id, level: row.level, packages: packagesFromRow(row)}
    : undefined;

  const decision = decidePurchase({offer, asset, key: input.key, route: input.route, purchasedThisWindow: used, wallet});
  if (!decision.ok) return {ok: false, code: decision.refusal.code, error: decision.refusal.reason};

  // Take the window slot. The COUNT in the same statement is the limit guard:
  // two requests racing for the last slot are serialised by the database and
  // the second inserts nothing.
  const slot = await db
    .prepare(
      `INSERT INTO trade_purchases (id, player_id, offer_id, window_key, asset_id, package, route, cost, created_at)
       SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9
        WHERE (SELECT COUNT(*) FROM trade_purchases WHERE player_id = ?2 AND offer_id = ?3 AND window_key = ?4) < ?10`,
    )
    .bind(input.purchaseId, playerId, offer.id, key, input.assetId, input.key, input.route, decision.quote.credits, now, offer.limit)
    .run();
  if (!slot.meta.changes) {
    return {ok: false, code: 'limit', error: `Limit reached for this window (${offer.limit}).`};
  }

  // The canonical grant. Same function, same arguments, as the upgrade screen.
  const granted = await packageUp(db, playerId, input.assetId, input.key, decision.quote.target, decision.split, now);
  if (!granted.ok) {
    await db.prepare(`DELETE FROM trade_purchases WHERE id = ?1`).bind(input.purchaseId).run();
    return {ok: false, code: 'refused', error: granted.error};
  }
  const remaining = Math.max(0, offer.limit - (used + 1));
  return {ok: true, duplicate: false, wallet: {tokens: granted.wallet.tokens, credits: granted.wallet.credits}, asset: granted.asset, remaining};
}

async function standing(
  db: D1Database,
  playerId: string,
  offerId: string,
  assetId: string,
  now: number,
  duplicate: boolean,
): Promise<BuyResult> {
  const offer = OFFER_BY_ID[offerId];
  const [wallet, asset, used] = await Promise.all([
    settleWallet(db, playerId, now),
    readAsset(db, playerId, assetId),
    offer ? purchasedCount(db, playerId, offerId, windowKey(offer.shelf, now)) : Promise.resolve(0),
  ]);
  if (!asset) return {ok: false, code: 'no-target', error: 'You do not hold that asset.'};
  return {
    ok: true,
    duplicate,
    wallet: {tokens: wallet.tokens, credits: wallet.credits},
    asset,
    remaining: offer ? Math.max(0, offer.limit - used) : 0,
  };
}
