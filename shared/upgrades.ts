/**
 * Service Rank, the four packages, and System Integration.
 *
 * Approved in docs/season-1/12-ASSET-UPGRADE-PLAN.md §3, with one clarification
 * settled afterwards:
 *
 *   Every track is available from day one and none of them gate each other,
 *   but a package can never outrank the asset it is bolted to. Service Rank is
 *   the ceiling. And Service Rank is PERMANENT - only the packages can be reset
 *   and refunded.
 *
 * That is what keeps Rank worth buying. Take the ceiling off and Rank buys
 * nothing the packages do not, and the cheapest optimal build becomes "ignore
 * Rank, max Armament" - which is exactly the flatness the counter ring was
 * fixed to remove.
 *
 * ── Shared, and why ───────────────────────────────────────────────────────
 *
 * The Worker enforces the cap and the client draws it. Two copies of "how much
 * does rank 7 cost" would eventually disagree, and the player would be shown a
 * price the server then refused. Same reason as the counter table.
 */
import {
  type Asset,
  type AssetAttributes,
  ASSET_MAX_LEVEL,
  attributeAtLevel,
  milli,
} from './assets';

/* -------------------------------------------------------------------------- */
/* The four packages                                                          */
/* -------------------------------------------------------------------------- */

export const PACKAGE_KEYS = ['armament', 'protection', 'propulsion', 'electronics'] as const;
export type PackageKey = (typeof PACKAGE_KEYS)[number];

export type Packages = Record<PackageKey, number>;

/** Everything at rank 1: bought nothing, gained nothing. */
export const NO_PACKAGES: Packages = {
  armament: 1,
  protection: 1,
  propulsion: 1,
  electronics: 1,
};

/**
 * Which attribute each package lifts.
 *
 * Range is deliberately absent. Packages SPECIALISE an asset; Service Rank
 * lifts everything it already is. If every attribute had a package there would
 * be no reason to rank up at all beyond raising the ceiling, and reach - which
 * decides whether artillery ever gets to fire past a screen - would become the
 * cheapest thing in the game to buy rather than something an asset either has
 * or does not.
 */
export const PACKAGE_ATTRIBUTE: Record<PackageKey, keyof AssetAttributes> = {
  armament: 'firepower',
  protection: 'armour',
  propulsion: 'mobility',
  electronics: 'detection',
};

export const PACKAGE_LABEL: Record<PackageKey, string> = {
  armament: 'Armament',
  protection: 'Protection',
  propulsion: 'Propulsion',
  electronics: 'Electronics',
};

/* -------------------------------------------------------------------------- */
/* What an upgrade is worth                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Attribute points added per package rank above 1.
 *
 * ADDITIVE, not multiplicative, and this matters. Service Rank is already
 * geometric - every rank multiplies every attribute by RANK_GROWTH - so
 * a package that also multiplied would stack into a number nobody could reason
 * about, and a rank-10 asset with a rank-10 Armament package would be carrying
 * 3x firepower off two purchases.
 *
 * 0.14 per the game math specification (docs/GAME-MATH-v1.md): packages matter
 * without erasing what the asset is. A maxed Season 1 package is +1.26 points
 * on one attribute. Still one named constant, still provisional until the
 * harness says otherwise.
 */
export const PACKAGE_POINTS_PER_RANK = 0.14;

/**
 * System Integration: the reward for keeping all four up.
 *
 * Derived from the LOWEST package rank, not the sum and not the average, which
 * is the only shape that satisfies "rewards maintaining all four reasonably
 * well" and cannot be gamed by one tall package. A player at 10/1/1/1 gets
 * nothing. A player at 4/4/4/4 gets the bonus for rank 4.
 *
 * Flat and additive across all five attributes, and capped, per the brief. It
 * is not a multiplier and it does not stack with itself.
 */
export const INTEGRATION_POINTS_PER_RANK = 0.1;
export const INTEGRATION_MAX_POINTS = 1.0;

export function systemIntegration(pkg: Packages): number {
  let lowest = Infinity;
  for (const key of PACKAGE_KEYS) lowest = Math.min(lowest, pkg[key]);
  if (!Number.isFinite(lowest) || lowest <= 1) return 0;
  return Math.min(INTEGRATION_MAX_POINTS, (lowest - 1) * INTEGRATION_POINTS_PER_RANK);
}

/**
 * An asset's attributes at a rank, with its packages fitted.
 *
 * Order matters and is deliberate: Service Rank scales the base attribute, and
 * the package is added AFTER. Scaling the package too would make a point of
 * Armament worth more on a rank-40 asset than a rank-4 one, which turns every
 * package into a reason to rank up first and buy later.
 */
export function attributesWith(
  asset: Asset,
  level: number,
  pkg: Packages = NO_PACKAGES,
  /**
   * The category's building boost (shared/buildings.ts), applied to the
   * ranked attribute BEFORE packages are added, for the same reason packages
   * are not scaled by rank: a point of Armament is worth one point everywhere.
   */
  boost = 1,
): AssetAttributes {
  const integration = systemIntegration(pkg);
  const out = {} as AssetAttributes;
  for (const key of ['firepower', 'armour', 'mobility', 'range', 'detection'] as const) {
    let v = attributeAtLevel(asset.attributes[key], level) * boost + integration;
    for (const p of PACKAGE_KEYS) {
      if (PACKAGE_ATTRIBUTE[p] === key) v += (pkg[p] - 1) * PACKAGE_POINTS_PER_RANK;
    }
    out[key] = milli(v);
  }
  return out;
}

/** Power contributed by one asset, packages included. The squad comparison. */
export function assetPowerWith(
  asset: Asset,
  level: number,
  pkg: Packages = NO_PACKAGES,
  boost = 1,
): number {
  const a = attributesWith(asset, level, pkg, boost);
  return Math.round((a.firepower + a.armour + a.mobility + a.range + a.detection) * 6);
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                 */
/* -------------------------------------------------------------------------- */

export function isPackageKey(value: unknown): value is PackageKey {
  return typeof value === 'string' && (PACKAGE_KEYS as readonly string[]).includes(value);
}

/** The rule, in one place: a package never outranks the asset it is on. */
export function packageCeiling(level: number): number {
  return Math.max(1, Math.min(level, ASSET_MAX_LEVEL));
}

export function packagesFromRow(row: {
  pkg_armament?: number | null;
  pkg_protection?: number | null;
  pkg_propulsion?: number | null;
  pkg_electronics?: number | null;
}): Packages {
  return {
    armament: row.pkg_armament ?? 1,
    protection: row.pkg_protection ?? 1,
    propulsion: row.pkg_propulsion ?? 1,
    electronics: row.pkg_electronics ?? 1,
  };
}
