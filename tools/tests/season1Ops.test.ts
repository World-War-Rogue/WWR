/**
 * Season 1 Daily Operations invariants. Pure logic from shared/, no database.
 *
 *   npm test        (node --import tsx --test tools/tests/)
 *
 * The database half - one lane row per (player, day, lane), one grant per
 * key, the Cache paid once - is structural (PRIMARY KEYs and INSERT OR IGNORE
 * in worker/dailyOps.ts) and exercised on the test realm with the
 * qa-progression-max account. These tests pin the rules those statements are
 * built from.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {GAME_OFFSET_MS} from '../../shared/gametime';
import {
  CACHE_REWARD_WEEK_1,
  INTEL_AS_CREDITS,
  LANES,
  LANES_FOR_CACHE,
  LANE_COPY,
  LANE_REWARD_WEEK_1,
  MODULE_FRAGMENT_AS_CREDITS,
  cacheReward,
  dailyWindow,
  describeReward,
  grantKey,
  laneReward,
  seasonPhase,
  weekMultiplier,
  weeklyWindow,
} from '../../shared/season1Ops';

const DAY = 24 * 3_600_000;
// Monday 2026-09-07 00:00 RST = 07:00 UTC.
const SEASON_START = Date.UTC(2026, 8, 7, 7, 0, 0);

test('daily windows reset at 00:00 RST, whatever the UTC hour', () => {
  const justBefore = SEASON_START - 1;
  const justAfter = SEASON_START;
  assert.notEqual(dailyWindow(justBefore).key, dailyWindow(justAfter).key);
  assert.equal(dailyWindow(justAfter).startsAt, SEASON_START);
  assert.equal(dailyWindow(justAfter).resetAt, SEASON_START + DAY);
  // 23:59 RST and 00:01 RST the next day are different windows; 00:01 and 23:59 the same.
  assert.equal(dailyWindow(SEASON_START + 60_000).key, dailyWindow(SEASON_START + DAY - 60_000).key);
  assert.notEqual(dailyWindow(SEASON_START + DAY - 60_000).key, dailyWindow(SEASON_START + DAY + 60_000).key);
  // The key counts RST midnights, so a window's key is stable across the window.
  assert.equal(dailyWindow(SEASON_START).key, `d:${Math.floor((SEASON_START + GAME_OFFSET_MS) / DAY)}`);
});

test('weekly windows reset Monday 00:00 RST and never on Sunday', () => {
  const w = weeklyWindow(SEASON_START + 3 * DAY); // Thursday
  assert.equal(w.startsAt, SEASON_START, 'the week the season started in begins on its Monday');
  assert.equal(w.resetAt, SEASON_START + 7 * DAY, 'and rolls the next Monday');
  const sunday = SEASON_START + 6 * DAY + 12 * 3_600_000;
  assert.equal(weeklyWindow(sunday).key, w.key, 'Sunday is still the same week');
  assert.notEqual(weeklyWindow(SEASON_START + 7 * DAY).key, w.key, 'Monday 00:00 RST is the next');
});

test('the season phase follows the week: Proving Ground 1-4, Head-to-Head 5-10', () => {
  assert.equal(seasonPhase(SEASON_START - 1).phase, 'pre');
  assert.deepEqual(seasonPhase(SEASON_START), {week: 1, phase: 'proving_ground'});
  assert.deepEqual(seasonPhase(SEASON_START + 27 * DAY).phase, 'proving_ground');
  assert.deepEqual(seasonPhase(SEASON_START + 28 * DAY), {week: 5, phase: 'head_to_head'});
  assert.equal(seasonPhase(SEASON_START + 69 * DAY).week, 10);
});

test('six lanes, four for the Cache, every lane has player-facing copy', () => {
  assert.equal(LANES.length, 6);
  assert.equal(LANES_FOR_CACHE, 4);
  for (const lane of LANES) {
    assert.ok(LANE_COPY[lane].label && LANE_COPY[lane].task && LANE_COPY[lane].hint, lane);
  }
});

test('no reward ever grants Tokens, and the placeholder currencies are paid as Credits', () => {
  for (const lane of LANES) {
    const r = laneReward(lane, 1);
    assert.ok(!('tokens' in r), lane);
    assert.ok(r.credits >= 0 && r.fuel >= 0 && r.steel >= 0 && r.munitions >= 0 && r.alloy >= 0);
  }
  // Command: 30 Credits + 1 Intel; Readiness: 40 Credits + 1 Module Fragment; Cache: 140 + 2 Fragments.
  assert.equal(LANE_REWARD_WEEK_1.command.credits, 30 + INTEL_AS_CREDITS);
  assert.equal(LANE_REWARD_WEEK_1.readiness.credits, 40 + MODULE_FRAGMENT_AS_CREDITS);
  assert.equal(CACHE_REWARD_WEEK_1.credits, 140 + 2 * MODULE_FRAGMENT_AS_CREDITS);
  // The words a player sees never name the placeholders.
  const text = [describeReward(cacheReward(1)), ...LANES.map((l) => describeReward(laneReward(l, 1)))].join(' ');
  assert.ok(!/intel|fragment|token/i.test(text), text);
  assert.ok(!/intel|fragment/i.test(JSON.stringify(LANE_COPY)));
});

test('rewards grow 6% a week from week 1 and are integers', () => {
  assert.equal(weekMultiplier(1), 1);
  assert.ok(Math.abs(weekMultiplier(10) - 1.54) < 1e-9);
  assert.equal(weekMultiplier(0), 1, 'before week 1 pays week 1');
  assert.equal(weekMultiplier(99), weekMultiplier(10), 'past week 10 holds');
  for (let week = 1; week <= 10; week += 1) {
    const c = cacheReward(week);
    for (const v of Object.values(c)) assert.ok(Number.isInteger(v));
    assert.ok(c.credits >= cacheReward(Math.max(1, week - 1)).credits, `week ${week} not below week ${week - 1}`);
  }
  assert.equal(cacheReward(10).fuel, Math.round(240 * 1.54));
});

test('grant keys are one per player per day per thing', () => {
  const day = dailyWindow(SEASON_START).key;
  assert.equal(grantKey.cache('p1', day), `daily-cache:p1:${day}`);
  assert.equal(grantKey.lane('p1', day, 'command'), `daily-lane:p1:${day}:command`);
  assert.notEqual(grantKey.lane('p1', day, 'command'), grantKey.lane('p1', day, 'industry'));
  assert.notEqual(grantKey.cache('p1', day), grantKey.cache('p1', dailyWindow(SEASON_START + DAY).key));
});

test('the server never pays Tokens or reads a client figure for a Daily Operations reward', () => {
  const src = readFileSync(new URL('../../worker/dailyOps.ts', import.meta.url), 'utf8');
  assert.ok(!/SET tokens/.test(src), 'no Token grant in dailyOps.ts');
  assert.ok(/INSERT OR IGNORE INTO event_reward_grants/.test(src), 'grants are idempotent inserts');
  assert.ok(/INSERT OR IGNORE INTO daily_ops/.test(src), 'lanes are idempotent inserts');
  assert.ok(!/body\./.test(src), 'no request body is read here - amounts come from shared/season1Ops.ts');
});

/* -------------------------------------------------------------------------- */
/* Daily map exercises (shared/exercises.ts)                                   */
/* -------------------------------------------------------------------------- */

import {
  EXERCISES,
  EXERCISES_PER_DAY,
  EXERCISE_TYPES,
  PATROL_POWER_RATIO,
  exerciseReward,
  generatePatrol,
  hashSeed,
  patrolPower,
  pickDailyTypes,
  seeded,
} from '../../shared/exercises';

test('five exercise types: two battles on Engagement, three holds on Mobilization, one lane each', () => {
  assert.equal(EXERCISE_TYPES.length, 5);
  const battles = EXERCISE_TYPES.filter((t) => EXERCISES[t].kind === 'battle');
  const holds = EXERCISE_TYPES.filter((t) => EXERCISES[t].kind === 'hold');
  assert.deepEqual(battles.sort(), ['disabled_mech_patrol', 'factory_probe']);
  assert.deepEqual(holds.sort(), ['abandoned_convoy', 'fuel_silo', 'signal_relay']);
  for (const t of battles) assert.equal(EXERCISES[t].lane, 'engagement');
  for (const t of holds) assert.equal(EXERCISES[t].lane, 'mobilization');
  for (const t of EXERCISE_TYPES) assert.ok(!['cooperation', 'readiness'].includes(EXERCISES[t].lane));
});

test('a day is three distinct targets; no battle target without an eligible Task Force; same seed, same day', () => {
  for (let seed = 1; seed < 200; seed += 1) {
    const withForce = pickDailyTypes(seeded(seed), true);
    const without = pickDailyTypes(seeded(seed), false);
    assert.equal(withForce.length, EXERCISES_PER_DAY);
    assert.equal(new Set(withForce).size, EXERCISES_PER_DAY, 'distinct');
    assert.ok(withForce.some((t) => EXERCISES[t].kind === 'battle'), 'at least one battle with a force');
    assert.ok(without.every((t) => EXERCISES[t].kind === 'hold'), 'holds only without a force');
    assert.deepEqual(pickDailyTypes(seeded(seed), true), withForce, 'deterministic');
  }
  assert.equal(hashSeed('p1:d:1'), hashSeed('p1:d:1'));
  assert.notEqual(hashSeed('p1:d:1'), hashSeed('p1:d:2'));
});

test('the patrol is sized at 70% of the snapshot and never above it, from a two-unit starter to a maxed force', () => {
  for (const tf of [360, 1080, 2000, 5000, 12804, 31866]) {
    const target = Math.ceil(tf * PATROL_POWER_RATIO);
    const patrol = generatePatrol(target, seeded(tf));
    const p = patrolPower(patrol);
    assert.ok(p <= target + 1, `${tf}: patrol ${p} over target ${target}`);
    assert.ok(p >= target * 0.9, `${tf}: patrol ${p} far under target ${target}`);
    assert.ok(patrol.length >= 1 && patrol.length <= 6);
    assert.ok(patrol.every((u) => u.level >= 1 && u.level <= 50));
    assert.ok(new Set(patrol.map((u) => u.assetId)).size === patrol.length, 'distinct chassis');
  }
  // Same target, same seed: the same patrol every read. It is stored at spawn anyway.
  assert.deepEqual(generatePatrol(756, seeded(3)), generatePatrol(756, seeded(3)));
});

test('exercise rewards are Credits and resources only, scaled by the week like Daily Operations', () => {
  for (const t of EXERCISE_TYPES) {
    const r = exerciseReward(t, 1);
    assert.ok(!('tokens' in r));
    assert.ok(!/intel|fragment/i.test(EXERCISES[t].name + EXERCISES[t].blurb + EXERCISES[t].action));
    assert.ok(exerciseReward(t, 10).credits >= r.credits);
  }
  assert.equal(exerciseReward('fuel_silo', 1).fuel, 300);
  assert.equal(exerciseReward('fuel_silo', 10).fuel, Math.round(300 * 1.54));
});

/* -------------------------------------------------------------------------- */
/* Iron Dominion Arena, phase A (shared/arena.ts)                              */
/* -------------------------------------------------------------------------- */

import {
  ARENA_ATTEMPTS_PER_DAY,
  FIELD_CACHE,
  FULL_ENGAGEMENT_BONUS,
  MAX_ATTEMPT_SCORE,
  RANK_BANDS,
  anonymise,
  bandForRank,
  bootstrapBenchmark,
  lethalityIndex,
  rankStandings,
  scoreAttempt,
  squadPowerOf,
} from '../../shared/arena';
import {resolve as resolveFight} from '../../shared/combat';
import {NO_PACKAGES as BARE_PACKAGES} from '../../shared/upgrades';

test('rank bands cover every rank once, 1 to 101+, and pay Credits and resources only', () => {
  for (let rank = 1; rank <= 300; rank += 1) {
    const hits = RANK_BANDS.filter((b) => rank >= b.from && (b.to === null || rank <= b.to));
    assert.equal(hits.length, 1, `rank ${rank}`);
    assert.ok(!('tokens' in bandForRank(rank).reward));
  }
  assert.equal(bandForRank(50).label, '21–50');
  assert.equal(bandForRank(51).label, '51–100');
  assert.equal(bandForRank(101).label, '101+');
  assert.ok(bandForRank(1).reward.credits > bandForRank(2).reward.credits);
  assert.ok(!('tokens' in FIELD_CACHE) && !('tokens' in FULL_ENGAGEMENT_BONUS));
  assert.equal(ARENA_ATTEMPTS_PER_DAY, 3);
});

test('attempt score is the spec formula, itemised, between 0 and the maximum', () => {
  const six = ['m1a2', 'leclerc', 'f35a', 'rq4', 'm270a2', 'mi35m'];
  const side = (level: number) => six.map((assetId, slot) => ({assetId, level, packages: BARE_PACKAGES, slot}));
  const win = resolveFight({name: 'A', units: side(10)}, {name: 'B', units: side(2)}, 3);
  const loss = resolveFight({name: 'A', units: side(2)}, {name: 'B', units: side(10)}, 3);
  for (const r of [win, loss]) {
    const s = scoreAttempt(r);
    const sum = Math.floor(s.terms.enemyDamage + s.terms.enemyEliminated + s.terms.ownRemaining + s.terms.roundEfficiency + s.terms.clearBonus);
    assert.equal(s.score, sum);
    assert.ok(s.score >= 0 && s.score <= MAX_ATTEMPT_SCORE);
    for (const pct of [s.enemyDamagePct, s.enemyEliminatedPct, s.ownRemainingPct, s.roundEfficiencyPct]) assert.ok(pct >= 0 && pct <= 1);
  }
  assert.ok(scoreAttempt(win).score > scoreAttempt(loss).score);
  assert.equal(scoreAttempt(win).cleared, win.outcome === 'attacker');
  assert.equal(scoreAttempt(loss).terms.clearBonus, 0);
});

test('the benchmark is anonymised to the same category, role and metrics, and the bootstrap follows the band', () => {
  const src = [{assetId: 'm1a2', level: 7, packages: {...BARE_PACKAGES, armament: 4}, slot: 0, boost: 1.1}];
  const out = anonymise(src, seeded(5));
  assert.equal(out.length, 1);
  assert.notEqual(out[0].assetId, 'm1a2', 'a different chassis');
  assert.equal(out[0].level, 7);
  assert.deepEqual(out[0].packages, src[0].packages);
  assert.equal(out[0].boost, 1.1);
  assert.equal(squadPowerOf(out), squadPowerOf(src), 'same power');
  assert.ok(lethalityIndex(out) > 0);
  assert.equal(bootstrapBenchmark(1)[0].level, 2);
  assert.equal(bootstrapBenchmark(4)[0].level, 5);
  assert.equal(bootstrapBenchmark(10).length, 6);
});

test('standings order: score, then best attempt, then who got there first, then id', () => {
  const rows = [
    {playerId: 'b', username: 'b', score: 100, best: 60, attempts: 3, reachedAt: 10},
    {playerId: 'a', username: 'a', score: 100, best: 60, attempts: 3, reachedAt: 10},
    {playerId: 'c', username: 'c', score: 100, best: 70, attempts: 3, reachedAt: 20},
    {playerId: 'd', username: 'd', score: 120, best: 50, attempts: 2, reachedAt: 30},
    {playerId: 'e', username: 'e', score: 100, best: 60, attempts: 3, reachedAt: 5},
  ];
  assert.deepEqual(rankStandings(rows).map((r) => r.playerId), ['d', 'c', 'e', 'a', 'b']);
});
