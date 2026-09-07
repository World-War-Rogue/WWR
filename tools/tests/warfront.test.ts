/**
 * Dominion Warfront rules: caps, the alliance formula, ranking, divisions,
 * eligibility. The design's own acceptance checks, held here.
 *
 *   node --import tsx --test tools/tests/warfront.test.ts
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {MODULE_FRAGMENT_AS_CREDITS} from '../../shared/season1Ops';
import {
  DIVISIONS,
  MEMBERSHIP_ELIGIBILITY_MS,
  type MemberWeek,
  POINTS,
  WARFRONT,
  allianceScore,
  cappedDayScore,
  divisionForRank,
  membershipEligible,
  rankAlliances,
} from '../../shared/warfront';

test('one player cannot exceed 1,000 a day however much they do', () => {
  assert.equal(cappedDayScore({assault: 0, operations: 0, support: 0}), 0);
  assert.equal(cappedDayScore({assault: 100, operations: 100, support: 100}), 300);
  // Each metric to its own cap first.
  assert.equal(cappedDayScore({assault: 9999, operations: 0, support: 0}), WARFRONT.metricDailyCap.assault);
  assert.equal(cappedDayScore({assault: 0, operations: 9999, support: 0}), WARFRONT.metricDailyCap.operations);
  assert.equal(cappedDayScore({assault: 0, operations: 0, support: 9999}), WARFRONT.metricDailyCap.support);
  // Then the day: the three caps sum past 1,000, and 1,000 holds.
  const caps = WARFRONT.metricDailyCap;
  assert.ok(caps.assault + caps.operations + caps.support > WARFRONT.perPlayerDailyCap);
  assert.equal(cappedDayScore({assault: 9999, operations: 9999, support: 9999}), WARFRONT.perPlayerDailyCap);
  // Negative or broken input is zero, never a refund.
  assert.equal(cappedDayScore({assault: -50, operations: 0, support: 0}), 0);
});

test('every scoring action names a metric under its cap', () => {
  for (const p of Object.values(POINTS)) {
    assert.ok(p.points > 0);
    assert.ok(p.points <= WARFRONT.metricDailyCap[p.metric], p.label);
  }
  assert.equal(POINTS.dailyLane.points, 35);
  assert.equal(POINTS.dailyCache.points, 100);
  assert.equal(POINTS.contract.points, 90);
  assert.equal(POINTS.arenaDay.points, 80);
  assert.equal(POINTS.allianceOperation.points, 120);
});

const member = (playerId: string, score: number, reachedAt = 100): MemberWeek => ({playerId, username: playerId, score, reachedAt});

test('several medium active members outscore one maxed premium player', () => {
  // One player at the cap every day of the week.
  const whale = allianceScore([member('w', 7 * WARFRONT.perPlayerDailyCap)], 0);
  // Five members at 600 a day.
  const team = allianceScore([1, 2, 3, 4, 5].map((i) => member(`m${i}`, 7 * 600)), 0);
  assert.ok(team.total > whale.total, `${team.total} > ${whale.total}`);
  assert.equal(whale.activeMembers, 1);
  assert.equal(team.activeMembers, 5);
  assert.equal(team.activeBonus, 5 * WARFRONT.activeMemberBonus);
});

test('the alliance formula: members + active bonus + coordinated operations, each capped', () => {
  const members = [member('a', 1200), member('b', 499), member('c', 500), member('d', 0)];
  const s = allianceScore(members, 3);
  assert.equal(s.memberSum, 2199);
  assert.equal(s.contributors, 3, 'a zero is not a contributor');
  assert.equal(s.activeMembers, 2, '500 is active, 499 is not');
  assert.equal(s.activeBonus, 2 * WARFRONT.activeMemberBonus);
  assert.equal(s.coordinatedOps, 3);
  assert.equal(s.coordinatedBonus, 3 * WARFRONT.coordinatedOperationScore);
  assert.equal(s.total, 2199 + 700 + 1500);
  // Caps.
  const big = allianceScore(Array.from({length: 100}, (_, i) => member(`p${i}`, 1000)), 99);
  assert.equal(big.activeMembers, WARFRONT.activeMemberBonusCap);
  assert.equal(big.coordinatedOps, WARFRONT.coordinatedOperationWeeklyCap);
});

test('ranking is deterministic: score, contributors, featured, earlier, id', () => {
  const row = (id: string, scores: number[], reachedAt: number, featured = 0) => ({
    allianceId: id,
    tag: id.toUpperCase(),
    name: id,
    score: allianceScore(scores.map((s, i) => member(`${id}${i}`, s, reachedAt)), 0),
    featured,
  });
  // Same total (two ways to reach 1000 with no active bonus... use scores under 500).
  const a = row('a', [400, 400], 50); // 800, 2 contributors
  const b = row('b', [400, 200, 200], 50); // 800, 3 contributors -> above a
  const c = row('c', [400, 400], 10); // 800, 2 contributors, earlier -> above a
  const d = row('d', [400, 400], 50, 1); // featured -> above a and c
  const ranked = rankAlliances([a, b, c, d]).map((r) => r.allianceId);
  assert.deepEqual(ranked, ['b', 'd', 'c', 'a']);
  const e = row('e', [400, 400], 50);
  assert.deepEqual(rankAlliances([e, a]).map((r) => r.allianceId), ['a', 'e'], 'id breaks the last tie');
});

test('divisions and their thresholds', () => {
  assert.equal(divisionForRank(1).name, 'Dominion Breakers');
  assert.equal(divisionForRank(2).name, 'Iron Vanguard');
  assert.equal(divisionForRank(3).name, 'Iron Vanguard');
  assert.equal(divisionForRank(4).name, 'Factory Raiders');
  assert.equal(divisionForRank(10).name, 'Factory Raiders');
  assert.equal(divisionForRank(11).name, 'Scrapland Companies');
  assert.equal(divisionForRank(25).name, 'Scrapland Companies');
  assert.equal(divisionForRank(26).name, 'Registered participants');
  assert.equal(divisionForRank(999).name, 'Registered participants');
  assert.equal(divisionForRank(26).pool, null);
  assert.equal(divisionForRank(26).memberThreshold, 500);
  assert.equal(divisionForRank(1).memberThreshold, 1500);
  // Fragments are Credits: rank 1 pool carries 60 x 15 on top of 10,000.
  assert.equal(DIVISIONS[0].pool!.credits, 10_000 + 60 * MODULE_FRAGMENT_AS_CREDITS);
  assert.equal(DIVISIONS[0].member.credits, 700 + 6 * MODULE_FRAGMENT_AS_CREDITS);
  // Never Tokens.
  for (const d of DIVISIONS) {
    assert.ok(!('tokens' in d.member));
    if (d.pool) assert.ok(!('tokens' in d.pool));
  }
});

test('48 continuous hours before points count or a payout lands', () => {
  const joined = 1_800_000_000_000;
  assert.equal(membershipEligible(joined, joined), false);
  assert.equal(membershipEligible(joined, joined + MEMBERSHIP_ELIGIBILITY_MS - 1), false);
  assert.equal(membershipEligible(joined, joined + MEMBERSHIP_ELIGIBILITY_MS), true);
  assert.equal(MEMBERSHIP_ELIGIBILITY_MS, 48 * 3600 * 1000);
});
