/**
 * Arena Squad rules and the battle replay.
 *
 *   node --import tsx --test tools/tests/arena.test.ts
 *
 * The squad checks are the ones the server runs on save and on entry; the
 * replay checks hold the resolver's event log to its own result, so the
 * battle view can only ever show what the server decided.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {ASSETS, SQUAD_SLOTS} from '../../shared/assets';
import {ARENA_SQUAD_NAME, type ArenaRosterEntry, validateArenaEntry, validateArenaSlots} from '../../shared/arenaSquad';
import {BOOTSTRAP_STARTERS, WARDEN_NAME, bootstrapBenchmark, scoreAttempt, wardenHardpoints} from '../../shared/arena';
import {finalState, parseStoredAttempt, replayAgrees, stateAfter, storedBattle, timeline, totalDealt} from '../../shared/arenaReplay';
import {type CombatantSpec, resolve} from '../../shared/combat';
import {NO_PACKAGES} from '../../shared/upgrades';

const STARTERS = [...BOOTSTRAP_STARTERS];
const owned = new Set<string>(STARTERS);
const whole: ArenaRosterEntry = {hp: 1, repairEndsAt: null};
const roster = (overrides: Record<string, Partial<ArenaRosterEntry>> = {}) =>
  new Map(STARTERS.map((id) => [id, {...whole, ...(overrides[id] ?? {})}]));
const NOW = 1_800_000_000_000;

test('a squad must be six slots of held assets, none twice', () => {
  assert.equal(validateArenaSlots([...STARTERS], owned).ok, true);
  assert.equal(validateArenaSlots([...STARTERS.slice(0, 3), null, null, null], owned).ok, true);
  assert.equal(validateArenaSlots(STARTERS.slice(0, 5), owned).ok, false, 'five slots');
  assert.equal(validateArenaSlots('m1a2', owned).ok, false, 'not a list');
  const bogus = validateArenaSlots(['not-a-chassis', null, null, null, null, null], owned);
  assert.equal(bogus.ok, false);
  assert.match(!bogus.ok ? bogus.error : '', /No such asset/);
  const unowned = ASSETS.find((a) => a.draftable !== false && !owned.has(a.id))!;
  const notMine = validateArenaSlots([unowned.id, null, null, null, null, null], owned);
  assert.equal(notMine.ok, false);
  assert.match(!notMine.ok ? notMine.error : '', /do not hold/);
  const twice = validateArenaSlots(['m1a2', 'm1a2', null, null, null, null], owned);
  assert.equal(twice.ok, false);
  assert.match(!twice.ok ? twice.error : '', /twice/);
  assert.equal(SQUAD_SLOTS, 6);
  assert.equal(ARENA_SQUAD_NAME, 'Arena Squad');
});

test('entering needs every asset available and a drone', () => {
  const slots = [...STARTERS];
  assert.equal(validateArenaEntry(slots, roster(), new Set(), NOW).ok, true);

  const empty = validateArenaEntry([null, null, null, null, null, null], roster(), new Set(), NOW);
  assert.equal(empty.ok, false);
  assert.match(!empty.ok ? empty.error : '', /empty/);

  const repairing = validateArenaEntry(slots, roster({m1a2: {repairEndsAt: NOW + 60_000}}), new Set(), NOW);
  assert.equal(repairing.ok, false);
  assert.match(!repairing.ok ? repairing.error : '', /under repair/);
  // A repair that has finished is not a repair.
  assert.equal(validateArenaEntry(slots, roster({m1a2: {repairEndsAt: NOW - 1}}), new Set(), NOW).ok, true);

  const disabled = validateArenaEntry(slots, roster({leclerc: {hp: 0}}), new Set(), NOW);
  assert.equal(disabled.ok, false);
  assert.match(!disabled.ok ? disabled.error : '', /disabled/);
  // Damaged but standing fights damaged, like a Task Force.
  assert.equal(validateArenaEntry(slots, roster({leclerc: {hp: 0.4}}), new Set(), NOW).ok, true);

  const away = validateArenaEntry(slots, roster(), new Set(['f35a']), NOW);
  assert.equal(away.ok, false);
  assert.match(!away.ok ? away.error : '', /out with a Task Force/);

  const noDrone = validateArenaEntry(
    slots.filter((id) => id !== 'rq4').concat([null]),
    roster(),
    new Set(),
    NOW,
  );
  assert.equal(noDrone.ok, false);
  assert.match(!noDrone.ok ? noDrone.error : '', /drone/);
});

function starters(level: number): CombatantSpec[] {
  return STARTERS.map((assetId, slot) => ({assetId, level, packages: NO_PACKAGES, slot, boost: 1}));
}

test('the resolver logs every shot, and replaying the log lands on the result', () => {
  let shots = 0;
  for (let seed = 1; seed <= 40; seed += 1) {
    const mine = starters(3 + (seed % 5));
    const warden = bootstrapBenchmark(1 + (seed % 4));
    const result = resolve({name: 'me', units: mine}, {name: WARDEN_NAME, units: warden}, seed);
    const events = result.events ?? [];
    assert.ok(events.length > 0, 'a fight has shots');
    shots += events.length;
    // In order, rounds never go backwards, every shot names a real unit.
    let round = -1;
    for (const ev of events) {
      assert.ok(ev.round >= round);
      round = ev.round;
      assert.ok(ev.damage >= 0);
      assert.ok(ev.remaining >= 0 && ev.remaining <= 1);
      const shooters = ev.side === 'attacker' ? mine : warden;
      const targets = ev.side === 'attacker' ? warden : mine;
      assert.ok(shooters[ev.shooter], 'shooter exists');
      assert.ok(targets[ev.target], 'target exists');
    }
    assert.equal(replayAgrees(mine, warden, result), true, `seed ${seed}`);
    // The side totals in the round summaries are the same shots.
    const dealt = totalDealt(events, 'attacker');
    const summed = result.rounds.reduce((s, r) => s + r.attackerDamage, 0);
    assert.ok(Math.abs(dealt - summed) <= result.rounds.length, 'round totals are the rounded shots');
  }
  assert.ok(shots > 40 * 6);
});

test('skipping to the result is the same frame the replay ends on', () => {
  const mine = starters(6);
  const warden = bootstrapBenchmark(2);
  const result = resolve({name: 'me', units: mine}, {name: WARDEN_NAME, units: warden}, 7);
  const events = result.events ?? [];
  const end = finalState(mine, warden, events);
  assert.deepEqual(stateAfter(mine, warden, events, events.length), end);
  assert.deepEqual(stateAfter(mine, warden, events, events.length + 50), end, 'past the end is the end');
  // Every intermediate frame only ever moves a bar down.
  let prev = stateAfter(mine, warden, events, 0);
  for (let n = 1; n <= events.length; n += 1) {
    const cur = stateAfter(mine, warden, events, n);
    cur.attacker.forEach((u, i) => assert.ok(u.hp <= prev.attacker[i].hp + 1e-9));
    cur.defender.forEach((u, i) => assert.ok(u.hp <= prev.defender[i].hp + 1e-9));
    prev = cur;
  }
  // And the last frame is the report.
  result.attacker.units.forEach((u, i) => assert.ok(Math.abs(u.remaining - end.attacker[i].hp) < 0.002));
  result.defender.units.forEach((u, i) => assert.ok(Math.abs(u.remaining - end.defender[i].hp) < 0.002));
  assert.equal(end.cursor, events.length);
});

test('a stored attempt re-opens with the same fight', () => {
  const mine = starters(4);
  const warden = bootstrapBenchmark(1);
  const seed = 12345;
  const result = resolve({name: 'me', units: mine}, {name: WARDEN_NAME, units: warden}, seed);
  const breakdown = scoreAttempt(result);
  const stored = storedBattle(result, WARDEN_NAME, warden, seed);
  const raw = JSON.stringify({...breakdown, ...stored});
  const back = parseStoredAttempt(raw, WARDEN_NAME, 0);
  assert.ok(back.battle);
  assert.ok(back.breakdown);
  assert.equal(back.breakdown!.score, breakdown.score);
  assert.deepEqual(back.battle!.events, result.events);
  assert.deepEqual(back.battle!.benchmark, warden);
  assert.equal(back.battle!.seed, seed);
  assert.equal(back.battle!.opponent, WARDEN_NAME);
  // The replay of the re-opened report agrees with the stored result too.
  assert.equal(replayAgrees(mine, back.battle!.benchmark, {...result, events: back.battle!.events}), true);
  // The timeline has one line per shot and names the Warden's hardpoints.
  const names = wardenHardpoints(warden).map((h) => h.name);
  const lines = timeline(back.battle!.events, mine.map((u) => u.assetId), names);
  assert.equal(lines.length, back.battle!.events.length);
  assert.ok(lines.some((l) => names.some((n) => l.text.includes(n))));
  // A row from before replays existed still opens: score, no battle.
  const old = parseStoredAttempt(JSON.stringify({...breakdown, rounds: result.rounds, notes: result.notes, benchmark: warden}), WARDEN_NAME, 0);
  assert.equal(old.battle, null);
  assert.equal(old.breakdown!.score, breakdown.score);
  assert.deepEqual(parseStoredAttempt('not json', WARDEN_NAME, 0), {breakdown: null, battle: null});
});

test('the Warden has one hardpoint per benchmark unit, numbered when a category repeats', () => {
  const hp = wardenHardpoints(bootstrapBenchmark(1));
  assert.equal(hp.length, 6);
  assert.deepEqual(
    hp.map((h) => h.name),
    ['Main gun turret 1', 'Main gun turret 2', 'Missile rack', 'Sensor mast', 'Rocket battery', 'Autocannon pod'],
  );
});
