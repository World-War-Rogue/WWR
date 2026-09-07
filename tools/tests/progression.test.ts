/**
 * Progression registry invariants. Pure logic from shared/, no database.
 *
 *   npm test        (node --import tsx --test tools/tests/)
 *
 * Every permanent track has exactly levels 1-50, Tokens and Credits price
 * every step the same, cumulative power is the sum of its steps, the registry
 * agrees with the functions the server prices with, nothing quotes a level
 * above 50, and the Combat Systems lanes do in the resolver what the registry
 * says they do.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {ASSET_MAX_LEVEL, ASSETS, maxRankForSeason} from '../../shared/assets';
import {buildingStep, LEVELLED_BUILDINGS} from '../../shared/buildings';
import {resolve} from '../../shared/combat';
import {
  COMBAT_SYSTEM_LANES,
  COMBAT_SYSTEM_MAX_LEVEL,
  NO_SYSTEMS,
  combatSystemCost,
  combatSystemStepCost,
  describeSystems,
  fireControlMultiplier,
  laneEffect,
  survivabilityMultiplier,
  sustainmentMultiplier,
} from '../../shared/combatSystems';
import {packageStepCost, rankCost, rankStepCost} from '../../shared/economy';
import {
  PROGRESSION_MAX_LEVEL,
  PROGRESSION_TRACKS,
  REGISTRY_EXPECTATIONS,
  TRACK_BY_ID,
  cumulativeCost,
  levelRow,
  rankPower,
  stepCost,
  validateRegistry,
} from '../../shared/progression';
import {PACKAGE_KEYS, assetPowerWith, NO_PACKAGES} from '../../shared/upgrades';
import {OFFER_BY_ID, quotePackageStep} from '../../shared/tradePost';

const PROBE_LEVELS = [1, 10, 20, 30, 40, 50];

test('every active permanent track has exactly levels 1-50 and validates clean', () => {
  assert.deepEqual(validateRegistry(), []);
  for (const t of PROGRESSION_TRACKS) {
    assert.equal(t.levels.length, PROGRESSION_MAX_LEVEL, t.id);
    t.levels.forEach((row, i) => assert.equal(row.level, i + 1, `${t.id} row ${i}`));
  }
  // The set is complete: rank, four packages, three lanes, sixteen buildings.
  assert.equal(PROGRESSION_TRACKS.length, 1 + PACKAGE_KEYS.length + COMBAT_SYSTEM_LANES.length + LEVELLED_BUILDINGS.length);
});

test('Token cost equals Command Credit cost for every level of every track', () => {
  for (const t of PROGRESSION_TRACKS) {
    for (const row of t.levels) assert.equal(row.tokenCost, row.creditCost, `${t.id} ${row.level}`);
  }
});

test('cumulative power equals the sum of level effects', () => {
  for (const t of PROGRESSION_TRACKS) {
    let sum = 0;
    for (const row of t.levels) {
      sum += row.powerDelta;
      assert.ok(Math.abs(sum - row.cumulativePower) < 1e-9, `${t.id} ${row.level}`);
    }
  }
});

test('the registry quotes what the server prices with (rank, packages, Combat Systems, buildings)', () => {
  for (let level = 2; level <= 50; level += 1) {
    assert.equal(stepCost('service-rank', level), rankStepCost(level - 1), `rank ${level}`);
    for (const key of PACKAGE_KEYS) {
      assert.equal(stepCost(`package-${key}`, level), packageStepCost(level - 1), `${key} ${level}`);
    }
    for (const lane of COMBAT_SYSTEM_LANES) {
      assert.equal(stepCost(`combat-system-${lane.replace('_', '-')}`, level), combatSystemStepCost(level), `${lane} ${level}`);
    }
    for (const b of LEVELLED_BUILDINGS) {
      const row = levelRow(`building-${b.replace(/_/g, '-')}`, level);
      assert.ok(row);
      assert.deepEqual(row.resourceCost, buildingStep(b, level).cost, `${b} ${level}`);
      assert.equal(row.buildTimeSeconds, buildingStep(b, level).ms / 1000, `${b} ${level} time`);
    }
  }
  assert.equal(cumulativeCost('service-rank', 1, 50), rankCost(1, 50));
  assert.equal(cumulativeCost('service-rank', 1, 50), REGISTRY_EXPECTATIONS.serviceRankTo50);
  assert.equal(cumulativeCost('package-armament', 1, 50), REGISTRY_EXPECTATIONS.packageTo50);
  assert.equal(cumulativeCost('combat-system-fire-control', 1, 50), REGISTRY_EXPECTATIONS.combatSystemLaneTo50);
  assert.equal(combatSystemCost(1, 50), REGISTRY_EXPECTATIONS.combatSystemLaneTo50);
});

test('the Trade Post quotes the registry figure, not one of its own', () => {
  const offer = OFFER_BY_ID['package-component-selector'];
  assert.ok(offer);
  for (let current = 1; current < 50; current += 1) {
    const q = quotePackageStep(
      {assetId: 'm1a2', level: 50, packages: {...NO_PACKAGES, armament: current}},
      'armament',
    );
    assert.ok(q);
    assert.equal(q.credits, stepCost('package-armament', current + 1));
    assert.equal(q.tokens, q.credits);
  }
});

test('rank power in the registry is the power every chassis actually has', () => {
  for (const level of PROBE_LEVELS) {
    assert.equal(rankPower(level), REGISTRY_EXPECTATIONS.rankPowerAt[level]);
    assert.equal(levelRow('service-rank', level)?.cumulativePower, rankPower(level) - rankPower(1));
    for (const asset of ASSETS) {
      if (asset.draftable === false) continue;
      assert.equal(assetPowerWith(asset, level), rankPower(level), `${asset.id} ${level}`);
    }
  }
});

test('nothing quotes or allows a level above 50', () => {
  for (const t of PROGRESSION_TRACKS) {
    assert.equal(levelRow(t.id, 51), null, t.id);
    assert.equal(levelRow(t.id, 0), null, t.id);
    assert.equal(stepCost(t.id, 51), 0, t.id);
  }
  assert.equal(rankStepCost(ASSET_MAX_LEVEL), 0);
  assert.equal(combatSystemStepCost(COMBAT_SYSTEM_MAX_LEVEL + 1), 0);
  assert.equal(combatSystemStepCost(1), 0);
  assert.equal(laneEffect('fire_control', 99), laneEffect('fire_control', 50));
  assert.equal(maxRankForSeason(5), 50);
  assert.equal(maxRankForSeason(9), 50);
});

test('Combat Systems v1 curve: the decision\'s figures at 2, 10, 20, 30, 40, 50', () => {
  assert.equal(combatSystemStepCost(2), 50);
  assert.equal(combatSystemStepCost(10), Math.ceil(50 * 1.1 ** 8));
  assert.equal(combatSystemStepCost(50), Math.ceil(50 * 1.1 ** 48));
  for (let level = 3; level <= 50; level += 1) {
    assert.ok(combatSystemStepCost(level) > combatSystemStepCost(level - 1), `monotonic at ${level}`);
  }
  assert.equal(fireControlMultiplier(1), 1);
  assert.equal(fireControlMultiplier(50), 1 + 0.005 * 49);
  assert.equal(survivabilityMultiplier(50), 1 + 0.006 * 49);
  assert.ok(Math.abs(sustainmentMultiplier(50) - (1 - 0.008 * 49)) < 1e-12);
});

test('Combat Systems change the fight exactly as the registry says, and the report names them', () => {
  const units = (systems = NO_SYSTEMS) =>
    ['m1a2', 'leclerc', 'f35a', 'rq4', 'm270a2', 'mi35m'].map((assetId, slot) => ({
      assetId,
      level: 10,
      slot,
      systems,
      squad: 'Alpha',
    }));
  const plain = resolve({name: 'A', units: units()}, {name: 'D', units: units()}, 7);
  const armed = resolve(
    {name: 'A', units: units({fire_control: 50, survivability: 50, sustainment: 1})},
    {name: 'D', units: units()},
    7,
  );
  // Same seed, same rolls: the only difference is the lanes.
  const dmg = (r: typeof plain) => r.rounds.reduce((s, x) => s + x.attackerDamage, 0);
  assert.ok(dmg(armed) > dmg(plain), 'Fire-Control raised the attacker\'s damage');
  assert.ok(armed.attacker.strength > plain.attacker.strength, 'Survivability left more of the attacker standing');
  assert.deepEqual(plain.attacker.modifiers, []);
  assert.deepEqual(plain.notes.filter((n) => n.includes('Fire-Control')), []);
  assert.deepEqual(armed.attacker.modifiers, describeSystems('Alpha', {fire_control: 50, survivability: 50, sustainment: 1}));
  assert.ok(armed.notes.some((n) => n.startsWith('Task Force Alpha Fire-Control 50: +24.5%')));
  assert.ok(armed.notes.some((n) => n.startsWith('Task Force Alpha Survivability 50: +29.4%')));
  // Sustainment is not a battle stat and never appears in a battle report.
  assert.ok(!armed.notes.some((n) => n.includes('Sustainment')));
});

test('a Task Force with no lanes above 1 adds no report line', () => {
  assert.deepEqual(describeSystems('Bravo', NO_SYSTEMS), []);
});

test('a track flagged as placeholder past a level says so rather than hiding it', () => {
  for (const b of LEVELLED_BUILDINGS) {
    const t = TRACK_BY_ID[`building-${b.replace(/_/g, '-')}`];
    assert.equal(t.placeholderFrom, 11, b);
    assert.ok(t.flags.some((f) => f.includes('placeholder')), b);
  }
  assert.equal(TRACK_BY_ID['service-rank'].placeholderFrom, undefined);
});
