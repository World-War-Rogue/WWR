/**
 * Wallets and the upgrade path.
 *
 * Two rules carry this file, and neither is trusted from the browser.
 *
 *   The COST is always recomputed here from the catalogue. A request carries a
 *   target and a payment split, never a price. A client that names its own
 *   price is a client that ranks a squad to 10 for nothing.
 *
 *   A spend is ATOMIC across two tables. Taking the money and applying the
 *   upgrade are two statements, and the whole difficulty is making the second
 *   happen if and only if the first did. See `claimWallet` for how.
 */
import {ASSET_BY_ID, ASSET_MAX_LEVEL, maxRankForSeason} from '../shared/assets';
import {
  type Split,
  TEST_GRANTS_ON,
  TEST_TOKEN_FLOOR,
  defaultSplit,
  packageCost,
  rankCost,
  splitIsValid,
} from '../shared/economy';
import {gameWeekIndex} from '../shared/gametime';
import {
  type PackageKey,
  PACKAGE_KEYS,
  PACKAGE_LABEL,
  packageCeiling,
} from '../shared/upgrades';

export interface Wallet {
  tokens: number;
  credits: number;
  rev: number;
}

export interface AssetRow {
  asset_id: string;
  level: number;
  pkg_armament: number;
  pkg_protection: number;
  pkg_propulsion: number;
  pkg_electronics: number;
  pkg_credits: number;
}

const PACKAGE_COLUMN: Record<PackageKey, string> = {
  armament: 'pkg_armament',
  protection: 'pkg_protection',
  propulsion: 'pkg_propulsion',
  electronics: 'pkg_electronics',
};

export type UpgradeResult =
  | {ok: true; wallet: Wallet; asset: AssetRow}
  | {ok: false; error: string};

/* -------------------------------------------------------------------------- */
/* The weekly grant                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Settle the wallet on read, and top the Tokens up once a game week.
 *
 * Settle-on-read, the same shape as resource production: no cron, no background
 * job, no queue, and an account that has not been touched for a month is
 * correct the instant somebody looks at it.
 *
 * A TOP-UP rather than a payment. A player below the floor is raised to it; a
 * player above it is left alone. That means every active tester has comparable
 * spending power - which is what makes their feedback about prices worth
 * anything - and somebody who was away for a month does not come back with four
 * hundred thousand Tokens and a wallet nobody can reason about.
 *
 * The week guard is an INDEX comparison, so the grant cannot fire twice however
 * many times a player reloads, and the conditional UPDATE means two tabs asking
 * at the same instant cannot both apply it.
 */
export async function settleWallet(
  db: D1Database,
  playerId: string,
  now: number,
): Promise<Wallet> {
  const row = await db
    .prepare(
      `SELECT tokens, credits, wallet_rev AS rev, granted_week AS grantedWeek
         FROM players WHERE id = ?1`,
    )
    .bind(playerId)
    .first<{tokens: number; credits: number; rev: number; grantedWeek: number}>();
  if (!row) return {tokens: 0, credits: 0, rev: 0};

  const week = gameWeekIndex(now);
  if (!TEST_GRANTS_ON || row.grantedWeek >= week || row.tokens >= TEST_TOKEN_FLOOR) {
    // Nothing to do - but the week is still marked, so a player already above
    // the floor is not re-examined on every single read for the rest of the
    // week.
    if (TEST_GRANTS_ON && row.grantedWeek < week) {
      await db
        .prepare(`UPDATE players SET granted_week = ?2 WHERE id = ?1 AND granted_week < ?2`)
        .bind(playerId, week)
        .run();
    }
    return {tokens: row.tokens, credits: row.credits, rev: row.rev};
  }

  const added = TEST_TOKEN_FLOOR - row.tokens;
  const result = await db
    .prepare(
      `UPDATE players
          SET tokens = ?3, granted_week = ?2, wallet_rev = wallet_rev + 1
        WHERE id = ?1 AND granted_week < ?2`,
    )
    .bind(playerId, week, TEST_TOKEN_FLOOR)
    .run();

  if (!result.meta.changes) {
    // Another request got there first. Re-read rather than guess.
    const again = await db
      .prepare(`SELECT tokens, credits, wallet_rev AS rev FROM players WHERE id = ?1`)
      .bind(playerId)
      .first<Wallet>();
    return again ?? {tokens: row.tokens, credits: row.credits, rev: row.rev};
  }

  await db
    .prepare(
      `INSERT INTO wallet_ledger (player_id, kind, tokens, credits, subject, detail, created_at)
       VALUES (?1, 'grant', ?2, 0, NULL, ?3, ?4)`,
    )
    .bind(playerId, added, `weekly top-up to ${TEST_TOKEN_FLOOR}, week ${week}`, now)
    .run();

  return {tokens: TEST_TOKEN_FLOOR, credits: row.credits, rev: row.rev + 1};
}

/* -------------------------------------------------------------------------- */
/* Reading                                                                    */
/* -------------------------------------------------------------------------- */

export async function readAsset(
  db: D1Database,
  playerId: string,
  assetId: string,
): Promise<AssetRow | null> {
  return await db
    .prepare(
      `SELECT asset_id, level, pkg_armament, pkg_protection, pkg_propulsion,
              pkg_electronics, pkg_credits
         FROM player_assets WHERE player_id = ?1 AND asset_id = ?2`,
    )
    .bind(playerId, assetId)
    .first<AssetRow>();
}

/* -------------------------------------------------------------------------- */
/* Spending                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * The two statements every purchase is made of.
 *
 * The wallet update CLAIMS a specific revision. Only one request can claim a
 * given revision, so it is the single decisive act of the whole purchase - and
 * the upgrade statement then applies only where that exact claim landed, by
 * checking for `rev + 1`.
 *
 * That closes the case that a balance guard on its own does not: two tabs
 * pressing Rank Up read the same balance, both pass `tokens >= cost`, and
 * without this the player is charged twice for one rank. Here the loser claims
 * a revision that has already moved on, changes nothing, and its upgrade
 * statement sees the wrong revision and changes nothing either.
 *
 * Both statements go in one `db.batch`, which D1 runs as a transaction.
 */
function claimWallet(
  db: D1Database,
  playerId: string,
  wallet: Wallet,
  split: Split,
): D1PreparedStatement {
  return db
    .prepare(
      `UPDATE players
          SET tokens = tokens - ?2, credits = credits - ?3, wallet_rev = wallet_rev + 1
        WHERE id = ?1 AND wallet_rev = ?4 AND tokens >= ?2 AND credits >= ?3`,
    )
    .bind(playerId, split.tokens, split.credits, wallet.rev);
}

function ledger(
  db: D1Database,
  playerId: string,
  kind: string,
  split: Split,
  subject: string,
  detail: string,
  now: number,
  rev: number,
): D1PreparedStatement {
  // Signed out of the wallet, and written only if the claim landed - a ledger
  // that records spends which did not happen is worse than no ledger.
  return db
    .prepare(
      `INSERT INTO wallet_ledger (player_id, kind, tokens, credits, subject, detail, created_at)
       SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7
        WHERE EXISTS (SELECT 1 FROM players WHERE id = ?1 AND wallet_rev = ?8)`,
    )
    .bind(playerId, kind, -split.tokens, -split.credits, subject, detail, now, rev + 1);
}

async function finish(
  db: D1Database,
  playerId: string,
  assetId: string,
  rev: number,
): Promise<UpgradeResult> {
  const [wallet, asset] = await Promise.all([
    db
      .prepare(`SELECT tokens, credits, wallet_rev AS rev FROM players WHERE id = ?1`)
      .bind(playerId)
      .first<Wallet>(),
    readAsset(db, playerId, assetId),
  ]);
  if (!wallet || !asset) return {ok: false, error: 'Could not read that back.'};
  if (wallet.rev === rev) {
    // The claim did not land. Somebody else spent from this wallet between the
    // read and the write, which is a retry rather than an error.
    return {ok: false, error: 'Your balance changed. Try that again.'};
  }
  return {ok: true, wallet, asset};
}

/* -------------------------------------------------------------------------- */
/* Service Rank                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Raise an asset's Service Rank.
 *
 * Permanent, and deliberately so. Rank is the ceiling every package is measured
 * against, and a refundable ceiling would let a player fit four packages, reset
 * the rank underneath them and keep the fitting - which is the one hole the cap
 * exists to close.
 */
export async function rankUp(
  db: D1Database,
  playerId: string,
  assetId: string,
  target: number,
  split: Split | null,
  season: number,
  now: number,
): Promise<UpgradeResult> {
  if (!ASSET_BY_ID[assetId]) return {ok: false, error: 'No such asset.'};
  if (!Number.isInteger(target)) return {ok: false, error: 'Pick a rank.'};

  const asset = await readAsset(db, playerId, assetId);
  if (!asset) return {ok: false, error: 'You do not hold that asset.'};
  if (target <= asset.level) return {ok: false, error: 'Already at that rank.'};

  // The cap comes from the season record on the server, never from the request.
  const cap = Math.min(ASSET_MAX_LEVEL, maxRankForSeason(season));
  if (target > cap) {
    return {ok: false, error: `Season ${season} caps Service Rank at ${cap}.`};
  }

  const cost = rankCost(asset.level, target);
  const wallet = await settleWallet(db, playerId, now);
  // Credits first when the client did not choose. Tokens are never spent by
  // default - brief 08 §8, and the one default a paying player never forgives.
  const chosen = split ?? defaultSplit(cost, wallet.credits);

  if (!splitIsValid(chosen, cost)) {
    return {ok: false, error: `That does not add up to ${cost}.`};
  }
  if (chosen.tokens > wallet.tokens || chosen.credits > wallet.credits) {
    return {ok: false, error: 'Not enough to cover that.'};
  }

  await db.batch([
    claimWallet(db, playerId, wallet, chosen),
    db
      .prepare(
        `UPDATE player_assets SET level = ?2
          WHERE player_id = ?1 AND asset_id = ?3 AND level = ?4
            AND EXISTS (SELECT 1 FROM players WHERE id = ?1 AND wallet_rev = ?5)`,
      )
      .bind(playerId, target, assetId, asset.level, wallet.rev + 1),
    ledger(
      db,
      playerId,
      'rank',
      chosen,
      assetId,
      `Service Rank ${asset.level} to ${target}`,
      now,
      wallet.rev,
    ),
  ]);

  return finish(db, playerId, assetId, wallet.rev);
}

/* -------------------------------------------------------------------------- */
/* Packages                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Fit a package to a higher rank.
 *
 * The ceiling is checked here AND by a CHECK constraint on the row, which is
 * not belt and braces: the constraint is the one that holds when somebody adds
 * a second code path in six months and forgets this function exists.
 *
 * Only the Command Credits spent are recorded on the row, because only Credits
 * are refunded on a reset.
 */
export async function packageUp(
  db: D1Database,
  playerId: string,
  assetId: string,
  key: PackageKey,
  target: number,
  split: Split | null,
  now: number,
): Promise<UpgradeResult> {
  if (!ASSET_BY_ID[assetId]) return {ok: false, error: 'No such asset.'};
  if (!Number.isInteger(target)) return {ok: false, error: 'Pick a rank.'};

  const asset = await readAsset(db, playerId, assetId);
  if (!asset) return {ok: false, error: 'You do not hold that asset.'};

  const column = PACKAGE_COLUMN[key];
  const current = asset[column as keyof AssetRow] as number;
  if (target <= current) return {ok: false, error: 'Already fitted to that rank.'};

  const ceiling = packageCeiling(asset.level);
  if (target > ceiling) {
    return {
      ok: false,
      error: `${PACKAGE_LABEL[key]} cannot pass Service Rank ${asset.level}. Raise the rank first.`,
    };
  }

  const cost = packageCost(current, target);
  const wallet = await settleWallet(db, playerId, now);
  const chosen = split ?? defaultSplit(cost, wallet.credits);

  if (!splitIsValid(chosen, cost)) {
    return {ok: false, error: `That does not add up to ${cost}.`};
  }
  if (chosen.tokens > wallet.tokens || chosen.credits > wallet.credits) {
    return {ok: false, error: 'Not enough to cover that.'};
  }

  await db.batch([
    claimWallet(db, playerId, wallet, chosen),
    db
      .prepare(
        `UPDATE player_assets
            SET ${column} = ?2, pkg_credits = pkg_credits + ?6
          WHERE player_id = ?1 AND asset_id = ?3 AND ${column} = ?4 AND ?2 <= level
            AND EXISTS (SELECT 1 FROM players WHERE id = ?1 AND wallet_rev = ?5)`,
      )
      .bind(playerId, target, assetId, current, wallet.rev + 1, chosen.credits),
    ledger(
      db,
      playerId,
      'package',
      chosen,
      assetId,
      `${PACKAGE_LABEL[key]} ${current} to ${target}`,
      now,
      wallet.rev,
    ),
  ]);

  return finish(db, playerId, assetId, wallet.rev);
}

/**
 * Strip every package off an asset and refund the Credits.
 *
 * Full value of the Command Credits spent, and no Tokens - decision 13, and the
 * clarification that followed it. The Credits total is read off the row rather
 * than summed from the ledger so a refund can never depend on a scan that a
 * later ledger change might quietly alter.
 *
 * Service Rank is untouched. Only the fittings come off.
 */
export async function resetPackages(
  db: D1Database,
  playerId: string,
  assetId: string,
  now: number,
): Promise<UpgradeResult> {
  const asset = await readAsset(db, playerId, assetId);
  if (!asset) return {ok: false, error: 'You do not hold that asset.'};

  const fitted = PACKAGE_KEYS.some(
    (k) => (asset[PACKAGE_COLUMN[k] as keyof AssetRow] as number) > 1,
  );
  if (!fitted) return {ok: false, error: 'Nothing fitted to strip.'};

  const refund = asset.pkg_credits;
  const wallet = await settleWallet(db, playerId, now);

  await db.batch([
    db
      .prepare(
        `UPDATE players SET credits = credits + ?2, wallet_rev = wallet_rev + 1
          WHERE id = ?1 AND wallet_rev = ?3`,
      )
      .bind(playerId, refund, wallet.rev),
    db
      .prepare(
        `UPDATE player_assets
            SET pkg_armament = 1, pkg_protection = 1, pkg_propulsion = 1,
                pkg_electronics = 1, pkg_credits = 0
          WHERE player_id = ?1 AND asset_id = ?2
            AND EXISTS (SELECT 1 FROM players WHERE id = ?1 AND wallet_rev = ?3)`,
      )
      .bind(playerId, assetId, wallet.rev + 1),
    db
      .prepare(
        `INSERT INTO wallet_ledger (player_id, kind, tokens, credits, subject, detail, created_at)
         SELECT ?1, 'reset', 0, ?2, ?3, ?4, ?5
          WHERE EXISTS (SELECT 1 FROM players WHERE id = ?1 AND wallet_rev = ?6)`,
      )
      .bind(
        playerId,
        refund,
        assetId,
        'packages stripped, Credits refunded in full',
        now,
        wallet.rev + 1,
      ),
  ]);

  return finish(db, playerId, assetId, wallet.rev);
}
