/**
 * Alliance Convoy rules: the join window, guard validation, the leadership
 * gate, the formation order, the Token-only contract price, and the total
 * absence of any Season 1 attack surface.
 *
 *   node --import tsx --test tools/tests/allianceConvoy.test.ts
 *
 * The atomic first-come truck capacity and the switch-only-if-room guard are
 * SQL statements (worker/allianceConvoy.ts) tested on the deployed realm; the
 * shapes and rules that decide them live here.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import {
  CONTRACT_CONVOY_TOKENS,
  CONVOY_GUARD_SLOTS,
  CONVOY_JOIN_MS,
  CONVOY_MIN_MEMBERS,
  CONVOY_TRUCKS,
  CONVOY_TRUCK_CAPACITY,
  GUARD_SLOTS,
  REAR_SLOTS,
  VANGUARD_SLOTS,
  type GuardCandidate,
  dailyWindow,
  guardIsConfigured,
  isLeadership,
  locksAt,
  stateOf,
  validateGuard,
} from '../../shared/allianceConvoy';
import {CONVOY_TRUCK_URLS, convoyTruckUrl} from '../../shared/allianceConvoyVisuals';
import {gameDayStart} from '../../shared/gametime';

test('the spec constants', () => {
  assert.equal(CONVOY_TRUCKS, 5);
  assert.equal(CONVOY_TRUCK_CAPACITY, 20);
  assert.equal(CONVOY_MIN_MEMBERS, 50);
  assert.equal(CONVOY_GUARD_SLOTS, 6);
  assert.equal(CONVOY_JOIN_MS, 2 * 60 * 60 * 1000);
});

test('the join window is exactly two hours from 00:00 RST', () => {
  const noon = 1_800_000_000_000;
  const win = dailyWindow(noon);
  assert.equal(win.startsAt, gameDayStart(noon));
  assert.equal(win.locksAt - win.startsAt, CONVOY_JOIN_MS);
  assert.equal(locksAt(win.startsAt), win.locksAt);
  // Joining right up to the lock, launched at and after it.
  assert.equal(stateOf(win.startsAt, win.startsAt), 'joining');
  assert.equal(stateOf(win.startsAt, win.locksAt - 1), 'joining');
  assert.equal(stateOf(win.startsAt, win.locksAt), 'launched');
  assert.equal(stateOf(win.startsAt, win.locksAt + 1), 'launched');
});

test('only leadership may run a Convoy or set its Guardian', () => {
  assert.equal(isLeadership('leader'), true);
  assert.equal(isLeadership('officer'), true);
  assert.equal(isLeadership('member'), false);
  assert.equal(isLeadership(null), false);
  assert.equal(isLeadership('qa'), false);
});

const roster = (over: Record<string, Partial<GuardCandidate>> = {}) => {
  const base: Record<string, GuardCandidate> = {};
  for (const id of ['m1a2', 'leclerc', 'f35a', 'rq4', 'm270a2', 'mi35m', 'k2']) base[id] = {hp: 1, repairEndsAt: null, away: false};
  const m = new Map(Object.entries(base));
  for (const [id, o] of Object.entries(over)) m.set(id, {...(m.get(id) ?? {hp: 1, repairEndsAt: null, away: false}), ...o});
  return m;
};
const has = (id: string) => roster().has(id);
const code = (id: string) => id.toUpperCase();
const six = (ids: string[]) => GUARD_SLOTS.map((slot, i) => ({slot, assetId: ids[i]}));
const NOW = 1_800_000_000_000;

test('a valid six-asset escort, and every way it can be wrong', () => {
  const ids = ['m1a2', 'leclerc', 'f35a', 'rq4', 'm270a2', 'mi35m'];
  assert.equal(validateGuard(six(ids), roster(), has, code, NOW).ok, true);

  assert.equal(validateGuard(six(ids).slice(0, 5), roster(), has, code, NOW).ok, false, 'five slots');
  assert.equal(validateGuard('nope', roster(), has, code, NOW).ok, false, 'not a list');

  const dup = validateGuard(six(['m1a2', 'm1a2', 'f35a', 'rq4', 'm270a2', 'mi35m']), roster(), has, code, NOW);
  assert.equal(dup.ok, false);
  assert.match(!dup.ok ? dup.error : '', /twice/);

  const unheld = validateGuard(six(['m1a2', 'leclerc', 'f35a', 'rq4', 'm270a2', 'nothanks']), roster(), has, code, NOW);
  assert.equal(unheld.ok, false);

  const repairing = validateGuard(six(ids), roster({m1a2: {repairEndsAt: NOW + 1000}}), has, code, NOW);
  assert.equal(repairing.ok, false);
  assert.match(!repairing.ok ? repairing.error : '', /repair/);

  const disabled = validateGuard(six(ids), roster({f35a: {hp: 0}}), has, code, NOW);
  assert.equal(disabled.ok, false);
  assert.match(!disabled.ok ? disabled.error : '', /disabled/i);

  const away = validateGuard(six(ids), roster({rq4: {away: true}}), has, code, NOW);
  assert.equal(away.ok, false);
  assert.match(!away.ok ? away.error : '', /Task Force/);

  const badSlot = validateGuard([{slot: 'wing_1', assetId: 'm1a2'}, ...six(ids).slice(1)], roster(), has, code, NOW);
  assert.equal(badSlot.ok, false);
});

test('guardIsConfigured is the six-slots-filled test the replace rule uses', () => {
  assert.equal(guardIsConfigured(null), false);
  assert.equal(guardIsConfigured(six(['m1a2', 'leclerc', 'f35a', 'rq4', 'm270a2', 'mi35m'])), true);
  assert.equal(guardIsConfigured(six(['m1a2', 'leclerc', 'f35a', 'rq4', 'm270a2', 'mi35m']).slice(0, 5)), false);
});

test('the formation is Vanguard 1-3, five trucks, Rear Guard 1-3', () => {
  assert.deepEqual(VANGUARD_SLOTS, ['vanguard_1', 'vanguard_2', 'vanguard_3']);
  assert.deepEqual(REAR_SLOTS, ['rear_1', 'rear_2', 'rear_3']);
  assert.deepEqual(GUARD_SLOTS, ['vanguard_1', 'vanguard_2', 'vanguard_3', 'rear_1', 'rear_2', 'rear_3']);
  // Five distinct static truck files, in column order.
  assert.equal(CONVOY_TRUCK_URLS.length, 5);
  assert.equal(new Set(CONVOY_TRUCK_URLS).size, 5);
  for (let i = 0; i < 5; i += 1) assert.equal(convoyTruckUrl(i), `/assets/alliance-convoy/convoy-truck-0${i + 1}.webp`);
});

test('a Contract Convoy is Tokens only, no dollar or Credits alternative in game', () => {
  assert.ok(Number.isInteger(CONTRACT_CONVOY_TOKENS) && CONTRACT_CONVOY_TOKENS > 0);
  // The worker pays it as tokens with credits: 0. No source string mentions a dollar price or Credits option.
  const worker = fs.readFileSync(new URL('../../worker/allianceConvoy.ts', import.meta.url), 'utf8');
  assert.match(worker, /tokens: CONTRACT_CONVOY_TOKENS, credits: 0/);
  assert.doesNotMatch(worker, /\$\d/);
  const screen = fs.readFileSync(new URL('../../src/live/Convoy.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(screen, /\$\d|USD|dollar/i);
  assert.doesNotMatch(screen, /Credits/);
});

test('no Season 1 attack surface exists anywhere in the Convoy code', () => {
  // No attack ROUTE on the server (prose disclaimers are fine; a route is not).
  const index = fs.readFileSync(new URL('../../worker/index.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(index, /convoy\/(attack|raid|intercept|target|loot)/i);
  // No attack HANDLER exported by the Convoy worker.
  const worker = fs.readFileSync(new URL('../../worker/allianceConvoy.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(worker, /export (async )?function \w*(attack|raid|intercept|loot)/i);
  // No attack CONTROL in the screen. Ignore DOM `.target` accesses and the
  // "cannot be attacked" disclaimer; catch any real attack/raid/intercept
  // control or an attacker-reward / target-marker / loss affordance.
  const screen = fs
    .readFileSync(new URL('../../src/live/Convoy.tsx', import.meta.url), 'utf8')
    .replace(/\.target/g, '')
    .replace(/cannot be attacked[^.\n]*/gi, '')
    .replace(/nothing to attack[^.\n]*/gi, '');
  assert.doesNotMatch(screen, /\bAttack\b|\bIntercept\b|\bRaid\b|target marker|attacker reward|\bloss state\b/i);
  // No attack COLUMN or table in the schema.
  const sql = fs.readFileSync(new URL('../../migrations/0038_alliance_convoy.sql', import.meta.url), 'utf8');
  assert.doesNotMatch(sql, /CREATE TABLE[^;]*(attack|raid|target)/i);
  assert.doesNotMatch(sql, /\b\w*(attack|attacker|raid|loot)\w*\s+(TEXT|INTEGER|REAL)/i);
});
