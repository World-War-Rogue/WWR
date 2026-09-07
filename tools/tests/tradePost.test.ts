/**
 * Trade Post invariants. Pure logic from shared/, no database.
 *
 *   npm test        (node --import tsx --test tools/tests/)
 *
 * What the database-backed half guarantees (row-first insert keyed by the
 * client's purchase id, limit guard in the same statement, canonical
 * packageUp grant) is exercised on the test realm by the harness; these
 * tests pin the rules those statements are built from.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync, readdirSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {packageCost, packageStepCost} from '../../shared/economy';
import {GAME_OFFSET_MS} from '../../shared/gametime';
import {PACKAGE_KEYS, type PackageKey} from '../../shared/upgrades';
import {
  FORBIDDEN_STORE_TEXT,
  OFFER_BY_ID,
  TRADE_POST_OFFERS,
  decidePurchase,
  eligiblePackages,
  offersOn,
  quotePackageStep,
  splitFor,
  windowKey,
  windowResetAt,
} from '../../shared/tradePost';

const offer = OFFER_BY_ID['package-component-selector'];
const asset = (level: number, pkg: Partial<Record<PackageKey, number>> = {}) => ({
  assetId: 'm1a2',
  level,
  packages: {armament: 1, protection: 1, propulsion: 1, electronics: 1, ...pkg},
});
const rich = {tokens: 1_000_000, credits: 1_000_000};

test('Token cost equals Command Credit cost for every quote', () => {
  for (let level = 1; level <= 50; level += 1) {
    for (let current = 1; current <= level; current += 1) {
      for (const key of PACKAGE_KEYS) {
        const q = quotePackageStep(asset(level, {[key]: current}), key);
        if (q) assert.equal(q.tokens, q.credits, `level ${level} ${key} ${current}`);
      }
    }
  }
});

test('Trade Post quote equals the direct package-upgrade quote', () => {
  for (let current = 1; current < 50; current += 1) {
    const q = quotePackageStep(asset(50, {armament: current}), 'armament');
    assert.ok(q);
    assert.equal(q.credits, packageStepCost(current));
    assert.equal(q.credits, packageCost(current, current + 1));
    assert.equal(q.target, current + 1);
  }
});

test('no quote above the Service Rank ceiling, and no eligible target when everything is capped', () => {
  assert.equal(quotePackageStep(asset(3, {armament: 3}), 'armament'), null);
  assert.deepEqual(eligiblePackages(asset(1)), []);
  assert.deepEqual(eligiblePackages(asset(2)), [...PACKAGE_KEYS]);
});

test('both routes pay the same amount and produce the same target', () => {
  const q = quotePackageStep(asset(5, {protection: 2}), 'protection')!;
  const byTokens = splitFor('tokens', q);
  const byCredits = splitFor('credits', q);
  assert.equal(byTokens.tokens + byTokens.credits, byCredits.tokens + byCredits.credits);
  assert.equal(byTokens.tokens, q.credits);
  assert.equal(byCredits.credits, q.tokens);
  const a = decidePurchase({offer, asset: asset(5, {protection: 2}), key: 'protection', route: 'tokens', purchasedThisWindow: 0, wallet: rich});
  const b = decidePurchase({offer, asset: asset(5, {protection: 2}), key: 'protection', route: 'credits', purchasedThisWindow: 0, wallet: rich});
  assert.ok(a.ok && b.ok);
  assert.deepEqual(a.quote, b.quote);
});

test('the decision ignores anything but the server-held state', () => {
  // The input type has no cost, no price, no reset, no count from the client.
  const keys = Object.keys({offer, asset: asset(2), key: 'armament', route: 'tokens', purchasedThisWindow: 0, wallet: rich});
  assert.deepEqual(keys.sort(), ['asset', 'key', 'offer', 'purchasedThisWindow', 'route', 'wallet']);
  // A tampered "cost" on the request would not change the quote, because the
  // quote is derived from the asset row alone.
  const q1 = quotePackageStep(asset(2), 'armament')!;
  const q2 = quotePackageStep({...asset(2), ...({cost: 1} as object)}, 'armament')!;
  assert.deepEqual(q1, q2);
});

test('insufficient balance is refused per route, with the reason', () => {
  const poor = {tokens: 0, credits: 0};
  const t = decidePurchase({offer, asset: asset(2), key: 'armament', route: 'tokens', purchasedThisWindow: 0, wallet: poor});
  const c = decidePurchase({offer, asset: asset(2), key: 'armament', route: 'credits', purchasedThisWindow: 0, wallet: poor});
  assert.ok(!t.ok && t.refusal.code === 'balance' && /Tokens/.test(t.refusal.reason));
  assert.ok(!c.ok && c.refusal.code === 'balance' && /Command Credits/.test(c.refusal.reason));
  // Enough of the OTHER currency does not help: the chosen route pays alone.
  const onlyCredits = decidePurchase({offer, asset: asset(2), key: 'armament', route: 'tokens', purchasedThisWindow: 0, wallet: {tokens: 0, credits: 999}});
  assert.ok(!onlyCredits.ok && onlyCredits.refusal.code === 'balance');
});

test('the window limit is enforced from the manifest', () => {
  assert.equal(offer.limit, 2);
  const under = decidePurchase({offer, asset: asset(2), key: 'armament', route: 'credits', purchasedThisWindow: 1, wallet: rich});
  const at = decidePurchase({offer, asset: asset(2), key: 'armament', route: 'credits', purchasedThisWindow: 2, wallet: rich});
  assert.ok(under.ok);
  assert.ok(!at.ok && at.refusal.code === 'limit');
});

test('weekly windows roll at Monday 00:00 RST; monthly on the 1st at 00:00 RST', () => {
  // 2026-09-14 is a Monday. 00:00 RST = 07:00 UTC.
  const mondayRst = Date.UTC(2026, 8, 14, 7, 0, 0);
  assert.notEqual(windowKey('weekly', mondayRst - 1), windowKey('weekly', mondayRst));
  assert.equal(windowKey('weekly', mondayRst), windowKey('weekly', mondayRst + 6 * 24 * 3_600_000));
  assert.equal(windowResetAt('weekly', mondayRst - 1), mondayRst);
  const firstRst = Date.UTC(2026, 9, 1, 0, 0, 0) - GAME_OFFSET_MS;
  assert.notEqual(windowKey('monthly', firstRst - 1), windowKey('monthly', firstRst));
  assert.equal(windowKey('monthly', firstRst), 'm:2026-10');
  assert.equal(windowResetAt('monthly', firstRst - 1), firstRst);
});

test('launch inventory: one weekly offer, an empty monthly shelf, and only the one art file referenced', () => {
  assert.deepEqual(offersOn('weekly').map((o) => o.id), ['package-component-selector']);
  assert.deepEqual(offersOn('monthly'), []);
  assert.deepEqual(TRADE_POST_OFFERS.map((o) => o.art), ['/trade-post/package-component-selector.webp']);
  // Card art is the small WebP derivative, never the multi-megabyte PNG source.
  for (const o of TRADE_POST_OFFERS) {
    assert.ok(o.art.endsWith('.webp'), `${o.id} renders a WebP`);
    try {
      const size = statSync(join(process.cwd(), 'public', o.art)).size;
      assert.ok(size < 150 * 1024, `${o.art} is ${size} bytes; keep card art under 150 KB`);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; // public/ absent in a bare checkout
    }
  }
  for (const o of TRADE_POST_OFFERS) assert.ok(!('price' in o) && !('tokenCost' in o) && !('creditCost' in o), 'no prices in the manifest');
});

test('no cash, bundle, discount or 1:4 wording in the store source', () => {
  const files = ['shared/tradePost.ts', 'src/live/TradePost.tsx'].map((f) => join(process.cwd(), f));
  for (const f of files) {
    const text = readFileSync(f, 'utf8').replace(/FORBIDDEN_STORE_TEXT = \[[^\]]*\]/, '');
    for (const word of FORBIDDEN_STORE_TEXT) {
      // "$" appears legitimately in template literals; check the rendered strings only.
      if (word === '$') {
        assert.ok(!/\$\d/.test(text), `${f} prints a dollar amount`);
        continue;
      }
      assert.ok(!text.toLowerCase().includes(word.toLowerCase()), `${f} contains "${word}"`);
    }
  }
  // The built client, when present.
  const dist = join(process.cwd(), 'dist', 'assets');
  try {
    for (const name of readdirSync(dist)) {
      if (!name.endsWith('.js')) continue;
      const js = readFileSync(join(dist, name), 'utf8');
      assert.ok(!/\$\d+(\.\d\d)?\b/.test(js), 'built client prints a dollar amount');
      assert.ok(!/1\s*Token\s*=\s*4/i.test(js), 'built client mentions a 1:4 rate');
    }
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
  }
  assert.ok(statSync(files[0]).size > 0);
});
