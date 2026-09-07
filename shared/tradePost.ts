/**
 * The Trade Post: a permanent, non-upgradeable storefront behind a Command
 * Center door. Weekly and monthly shelves of curated, limited offers.
 *
 * Nothing here has a price. Every offer maps to an existing canonical
 * purchase, and its cost is resolved from shared/economy.ts for the exact
 * target the player picks - the same number the direct screen would show,
 * and the same number in Tokens and in Command Credits. The Trade Post is a
 * storefront with window limits, never a second price list, never an
 * exchange rate. Approved 2026-09-07.
 *
 * Data only: imported by the Worker and the client. No DOM, no Worker APIs.
 */
import {packageStepCost} from './economy';
import {GAME_OFFSET_MS, gameWeekIndex, gameWeekStart} from './gametime';
import {PACKAGE_KEYS, PACKAGE_LABEL, type PackageKey, type Packages, packageCeiling} from './upgrades';

export type Shelf = 'weekly' | 'monthly';

/**
 * What an offer grants. Each kind names an existing grant path in the Worker;
 * adding a kind means adding a branch there, never a new way to pay.
 */
export type OfferKind = 'package-step';

export interface TradePostOffer {
  id: string;
  shelf: Shelf;
  kind: OfferKind;
  name: string;
  /** Plain-language exact effect. */
  description: string;
  /** Purchases allowed per player per window. */
  limit: number;
  /**
   * Under public/. The card renders the 512px WebP derivative (about 50 KB);
   * the designer's PNG sits beside it, untouched, as the source.
   */
  art: string;
}

/**
 * The manifest. Tune limits and wording here; prices live in economy.ts.
 *
 * The monthly shelf is intentionally empty at launch: the shelf exists, the
 * server reports it, and the client draws its empty state. Offers join it
 * only once the system they grant into exists and the definition is locked.
 */
export const TRADE_POST_OFFERS: readonly TradePostOffer[] = [
  {
    id: 'package-component-selector',
    shelf: 'weekly',
    kind: 'package-step',
    name: 'Package Component Selector',
    description:
      'Fit the next level of Armament, Protection, Propulsion or Electronics on an asset you hold. Identical to the upgrade screen: same level, same cost, same result.',
    limit: 2,
    art: '/trade-post/package-component-selector.webp',
  },
];

export const OFFER_BY_ID: Readonly<Record<string, TradePostOffer>> = Object.fromEntries(
  TRADE_POST_OFFERS.map((o) => [o.id, o]),
);

export function offersOn(shelf: Shelf): TradePostOffer[] {
  return TRADE_POST_OFFERS.filter((o) => o.shelf === shelf);
}

/** Copy the client shows for a shelf with nothing on it. Server-provided, so it can change without a build. */
export const EMPTY_SHELF_TEXT: Record<Shelf, string> = {
  weekly: 'No weekly stock is assigned.',
  monthly: 'No monthly stock is assigned.',
};

/* -------------------------------------------------------------------------- */
/* Windows                                                                    */
/* -------------------------------------------------------------------------- */

const DAY_MS = 24 * 3_600_000;

/**
 * Which window an instant is in, as a key purchases are counted under.
 *
 * Weekly: Monday 00:00 RST, the same index the coupon and Token grants use.
 * Monthly: the 1st at 00:00 RST. Both are read off game time, never local.
 */
export function windowKey(shelf: Shelf, now: number): string {
  if (shelf === 'weekly') return `w:${gameWeekIndex(now)}`;
  const d = new Date(now + GAME_OFFSET_MS);
  return `m:${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** The instant the current window ends and the next begins. */
export function windowResetAt(shelf: Shelf, now: number): number {
  if (shelf === 'weekly') return gameWeekStart(gameWeekIndex(now) + 1);
  const d = new Date(now + GAME_OFFSET_MS);
  const next = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
  return next - GAME_OFFSET_MS;
}

/** True when the second instant falls in a later window than the first. */
export function windowRolled(shelf: Shelf, then: number, now: number): boolean {
  return windowKey(shelf, then) !== windowKey(shelf, now);
}

/* -------------------------------------------------------------------------- */
/* Quotes                                                                     */
/* -------------------------------------------------------------------------- */

export interface PackageTarget {
  assetId: string;
  level: number;
  packages: Packages;
}

export interface Quote {
  /** Identical by construction; both are reported so the client never derives one from the other. */
  tokens: number;
  credits: number;
  current: number;
  target: number;
}

/**
 * The cost of fitting the next level of one package on one asset.
 *
 * Exactly `packageStepCost(current)` - the same function the upgrade screen
 * and `packageUp` use - or null when the package is already at the asset's
 * Service Rank and there is no next level to buy.
 */
export function quotePackageStep(asset: PackageTarget, key: PackageKey): Quote | null {
  const current = asset.packages[key];
  const target = current + 1;
  if (target > packageCeiling(asset.level)) return null;
  const cost = packageStepCost(current);
  return {tokens: cost, credits: cost, current, target};
}

/** Every (package) with a next level on this asset. */
export function eligiblePackages(asset: PackageTarget): PackageKey[] {
  return PACKAGE_KEYS.filter((k) => quotePackageStep(asset, k) !== null);
}

export function hasEligibleTarget(assets: readonly PackageTarget[]): boolean {
  return assets.some((a) => eligiblePackages(a).length > 0);
}

/* -------------------------------------------------------------------------- */
/* Routes                                                                     */
/* -------------------------------------------------------------------------- */

export type Route = 'tokens' | 'credits';

export function isRoute(value: unknown): value is Route {
  return value === 'tokens' || value === 'credits';
}

/** The payment split a route produces. One currency pays the whole quote. */
export function splitFor(route: Route, quote: Quote): {tokens: number; credits: number} {
  return route === 'tokens' ? {tokens: quote.tokens, credits: 0} : {tokens: 0, credits: quote.credits};
}

/* -------------------------------------------------------------------------- */
/* Decisions                                                                  */
/* -------------------------------------------------------------------------- */

export type Refusal =
  | {code: 'no-offer'; reason: string}
  | {code: 'no-target'; reason: string}
  | {code: 'capped'; reason: string}
  | {code: 'limit'; reason: string}
  | {code: 'balance'; reason: string};

/**
 * Whether a purchase may proceed, from server-held state only.
 *
 * Nothing the client sent beyond its choices (offer, asset, package, route)
 * is consulted: cost comes from the quote, the limit from the manifest, the
 * count from the purchase table, the balance from the wallet.
 */
export function decidePurchase(input: {
  offer: TradePostOffer | undefined;
  asset: PackageTarget | undefined;
  key: PackageKey;
  route: Route;
  purchasedThisWindow: number;
  wallet: {tokens: number; credits: number};
}): {ok: true; quote: Quote; split: {tokens: number; credits: number}} | {ok: false; refusal: Refusal} {
  const {offer, asset, key, route, purchasedThisWindow, wallet} = input;
  if (!offer) return {ok: false, refusal: {code: 'no-offer', reason: 'That offer is not on the shelf.'}};
  if (!asset) return {ok: false, refusal: {code: 'no-target', reason: 'You do not hold that asset.'}};
  const quote = quotePackageStep(asset, key);
  if (!quote) {
    return {
      ok: false,
      refusal: {
        code: 'capped',
        reason: `${PACKAGE_LABEL[key]} is already at Service Rank ${asset.level}. Raise the rank first.`,
      },
    };
  }
  if (purchasedThisWindow >= offer.limit) {
    const when = offer.shelf === 'weekly' ? 'Monday 00:00 RST' : 'the 1st at 00:00 RST';
    return {ok: false, refusal: {code: 'limit', reason: `${offer.shelf === 'weekly' ? 'Weekly' : 'Monthly'} limit reached (${offer.limit}). Resets ${when}.`}};
  }
  const split = splitFor(route, quote);
  if (split.tokens > wallet.tokens) {
    return {ok: false, refusal: {code: 'balance', reason: `Not enough Tokens. This costs ${quote.tokens} Tokens.`}};
  }
  if (split.credits > wallet.credits) {
    return {ok: false, refusal: {code: 'balance', reason: `Not enough Command Credits. This costs ${quote.credits} Command Credits.`}};
  }
  return {ok: true, quote, split};
}

/**
 * Words the game must never print in a store. Checked by the tests against
 * the built client and every string in this file.
 */
export const FORBIDDEN_STORE_TEXT = ['$', 'USD', 'bundle', 'discount', '% off', 'checkout', 'pack of', '1:4', '4 Command Credits'];
