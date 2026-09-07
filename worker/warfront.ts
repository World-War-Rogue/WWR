/**
 * Dominion Warfront on the server: standings, the Monday settlement, the
 * Operations Treasury, and the screen. Points are recorded by
 * worker/warfrontLedger.ts; rules and figures are in shared/warfront.ts.
 *
 * Everything settles on read, as the Arena does: the first read after
 * Monday 00:00 RST settles the closed week for that world. Every payout is
 * a PRIMARY KEY row (event_reward_grants for members, the treasury ledger
 * for alliances) written with INSERT OR IGNORE, so the settlement can run
 * twice and pay once.
 */
import {
  type AllianceStanding,
  type MemberWeek,
  WARFRONT,
  WARFRONT_METRICS,
  type WarfrontMetric,
  allianceScore,
  cappedDayScore,
  cappedMetric,
  divisionForRank,
  membershipEligible,
  rankAlliances,
} from '../shared/warfront';
import {type Reward, dailyWindow, describeReward, seasonPhase, weeklyWindow} from '../shared/season1Ops';
import {gameWeekStart} from '../shared/gametime';
import {grantReward} from './dailyOps';

interface DayRow {
  player_id: string;
  day_key: string;
  alliance_key: string;
  assault: number;
  operations: number;
  support: number;
  updated_at: number;
}

interface AllianceRow {
  id: string;
  tag: string;
  name: string;
}

/** Every member-week of a world's week, grouped by alliance (eligible rows only). */
async function memberWeeks(db: D1Database, worldId: number, weekKey: string): Promise<Map<string, MemberWeek[]>> {
  const rows = await db
    .prepare(
      `SELECT d.player_id, d.day_key, d.alliance_key, d.assault, d.operations, d.support, d.updated_at
         FROM warfront_days d
        WHERE d.world_id = ?1 AND d.week_key = ?2 AND d.alliance_key != ''`,
    )
    .bind(worldId, weekKey)
    .all<DayRow>();
  const byAlliance = new Map<string, Map<string, MemberWeek>>();
  for (const r of rows.results ?? []) {
    let members = byAlliance.get(r.alliance_key);
    if (!members) {
      members = new Map();
      byAlliance.set(r.alliance_key, members);
    }
    let m = members.get(r.player_id);
    if (!m) {
      m = {playerId: r.player_id, username: '', score: 0, reachedAt: 0};
      members.set(r.player_id, m);
    }
    m.score += cappedDayScore(r);
    m.reachedAt = Math.max(m.reachedAt, r.updated_at);
  }
  const ids = [...new Set([...byAlliance.values()].flatMap((m) => [...m.keys()]))];
  if (ids.length > 0) {
    const names = await db
      .prepare(`SELECT id, username FROM players WHERE id IN (${ids.map((_, i) => `?${i + 1}`).join(',')})`)
      .bind(...ids)
      .all<{id: string; username: string}>();
    const byId = new Map((names.results ?? []).map((n) => [n.id, n.username]));
    for (const members of byAlliance.values()) for (const m of members.values()) m.username = byId.get(m.playerId) ?? '';
  }
  return new Map([...byAlliance.entries()].map(([k, v]) => [k, [...v.values()].sort((a, b) => b.score - a.score || a.reachedAt - b.reachedAt)]));
}

export interface Standing extends AllianceStanding {
  rank: number;
  members: MemberWeek[];
}

/** The world's alliances ranked for a week. Every alliance appears; most at zero. */
export async function standings(db: D1Database, worldId: number, weekKey: string): Promise<Standing[]> {
  const [alliances, weeks] = await Promise.all([
    db.prepare(`SELECT id, tag, name FROM alliances WHERE home_world_id = ?1`).bind(worldId).all<AllianceRow>(),
    memberWeeks(db, worldId, weekKey),
  ]);
  const rows = (alliances.results ?? []).map((a) => {
    const members = weeks.get(a.id) ?? [];
    // Coordinated operations land with alliance operations; none exist yet.
    return {allianceId: a.id, tag: a.tag, name: a.name, score: allianceScore(members, 0), featured: 0, members};
  });
  return rankAlliances(rows).map((r, i) => ({...r, rank: i + 1}));
}

/* -------------------------------------------------------------------------- */
/* Treasury                                                                   */
/* -------------------------------------------------------------------------- */

export interface Treasury {
  credits: number;
  fuel: number;
  steel: number;
  munitions: number;
  alloy: number;
  ledger: Array<{id: string; kind: string; credits: number; fuel: number; steel: number; munitions: number; alloy: number; detail: string; createdAt: number}>;
}

/** Deposit once, by ledger id. Returns true when this call deposited. */
export async function depositTreasury(db: D1Database, allianceId: string, id: string, kind: string, reward: Reward, detail: string, now: number): Promise<boolean> {
  const guard = `AND EXISTS (SELECT 1 FROM alliance_treasury_ledger l WHERE l.id = ?2 AND l.created_at = ?3)`;
  const results = await db.batch([
    db
      .prepare(
        `INSERT OR IGNORE INTO alliance_treasury_ledger (id, alliance_id, kind, credits, fuel, steel, munitions, alloy, detail, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`,
      )
      .bind(id, allianceId, kind, reward.credits, reward.fuel, reward.steel, reward.munitions, reward.alloy, detail, now),
    db.prepare(`INSERT OR IGNORE INTO alliance_treasury (alliance_id, updated_at) VALUES (?1, ?2)`).bind(allianceId, now),
    db
      .prepare(
        `UPDATE alliance_treasury
            SET credits = credits + ?4, fuel = fuel + ?5, steel = steel + ?6, munitions = munitions + ?7, alloy = alloy + ?8, updated_at = ?3
          WHERE alliance_id = ?1 ${guard}`,
      )
      .bind(allianceId, id, now, reward.credits, reward.fuel, reward.steel, reward.munitions, reward.alloy),
  ]);
  return (results[0].meta.changes ?? 0) > 0;
}

export async function readTreasury(db: D1Database, allianceId: string): Promise<Treasury> {
  const [balance, ledger] = await Promise.all([
    db.prepare(`SELECT credits, fuel, steel, munitions, alloy FROM alliance_treasury WHERE alliance_id = ?1`).bind(allianceId).first<Omit<Treasury, 'ledger'>>(),
    db
      .prepare(
        `SELECT id, kind, credits, fuel, steel, munitions, alloy, detail, created_at AS createdAt
           FROM alliance_treasury_ledger WHERE alliance_id = ?1 ORDER BY created_at DESC LIMIT 30`,
      )
      .bind(allianceId)
      .all<Treasury['ledger'][number]>(),
  ]);
  return {credits: 0, fuel: 0, steel: 0, munitions: 0, alloy: 0, ...(balance ?? {}), ledger: ledger.results ?? []};
}

/* -------------------------------------------------------------------------- */
/* Monday settlement                                                          */
/* -------------------------------------------------------------------------- */

function weekCloseOf(weekKey: string): number {
  const index = Number(weekKey.slice(2));
  return gameWeekStart(index + 1);
}

/**
 * Settle every closed, unsettled week for a world: rank the alliances,
 * deposit each division's pool to its treasury, pay each eligible member,
 * freeze the table. Eligibility is judged at the week's close: in the
 * alliance now, 48 hours in by the close, and over the division's personal
 * threshold that week.
 */
export async function settleClosedWeeks(db: D1Database, worldId: number, now: number): Promise<number> {
  const current = weeklyWindow(now).key;
  const open = await db
    .prepare(
      `SELECT DISTINCT d.week_key AS weekKey FROM warfront_days d
        WHERE d.world_id = ?1 AND d.week_key != ?2
          AND NOT EXISTS (SELECT 1 FROM warfront_weeks w WHERE w.world_id = d.world_id AND w.week_key = d.week_key)`,
    )
    .bind(worldId, current)
    .all<{weekKey: string}>();
  let settled = 0;
  for (const {weekKey} of open.results ?? []) {
    const closeAt = weekCloseOf(weekKey);
    const table = await standings(db, worldId, weekKey);
    for (const s of table) {
      const division = divisionForRank(s.rank);
      if (division.pool) {
        await depositTreasury(
          db,
          s.allianceId,
          `warfront-week:${weekKey}:${s.allianceId}`,
          'warfront-pool',
          division.pool,
          `Warfront week ${weekKey} · rank ${s.rank} · ${division.name} · ${describeReward(division.pool)}`,
          now,
        );
      }
      const roster = await db
        .prepare(`SELECT player_id AS playerId, joined_at AS joinedAt FROM alliance_members WHERE alliance_id = ?1`)
        .bind(s.allianceId)
        .all<{playerId: string; joinedAt: number}>();
      const scores = new Map(s.members.map((m) => [m.playerId, m.score]));
      for (const m of roster.results ?? []) {
        if (!membershipEligible(m.joinedAt, closeAt)) continue;
        const score = scores.get(m.playerId) ?? 0;
        if (score < division.memberThreshold) continue;
        await grantReward(
          db,
          m.playerId,
          `warfront-week:${weekKey}:${m.playerId}`,
          'warfront-member',
          division.member,
          `Warfront week ${weekKey} · [${s.tag}] rank ${s.rank} (${division.name}) · your score ${score} · ${describeReward(division.member)}`,
          now,
        );
      }
      await db
        .prepare(
          `INSERT OR IGNORE INTO warfront_results (world_id, week_key, alliance_id, rank, tag, name, score, contributors, division)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`,
        )
        .bind(worldId, weekKey, s.allianceId, s.rank, s.tag, s.name, s.score.total, s.score.contributors, division.name)
        .run();
    }
    await db
      .prepare(`INSERT OR IGNORE INTO warfront_weeks (world_id, week_key, settled_at, ranked) VALUES (?1, ?2, ?3, ?4)`)
      .bind(worldId, weekKey, now, table.length)
      .run();
    settled += 1;
  }
  return settled;
}

/* -------------------------------------------------------------------------- */
/* The screen                                                                 */
/* -------------------------------------------------------------------------- */

export async function warfrontView(db: D1Database, playerId: string, worldId: number, now: number) {
  const day = dailyWindow(now);
  const week = weeklyWindow(now);
  const {week: seasonWeek, phase} = seasonPhase(now);
  await settleClosedWeeks(db, worldId, now);

  const [membership, todayRows, weekRows, table, recent] = await Promise.all([
    db
      .prepare(
        `SELECT m.alliance_id AS allianceId, m.joined_at AS joinedAt, a.tag AS tag, a.name AS name
           FROM alliance_members m JOIN alliances a ON a.id = m.alliance_id WHERE m.player_id = ?1`,
      )
      .bind(playerId)
      .first<{allianceId: string; joinedAt: number; tag: string; name: string}>(),
    db.prepare(`SELECT * FROM warfront_days WHERE player_id = ?1 AND day_key = ?2`).bind(playerId, day.key).all<DayRow>(),
    db.prepare(`SELECT * FROM warfront_days WHERE player_id = ?1 AND week_key = ?2`).bind(playerId, week.key).all<DayRow>(),
    standings(db, worldId, week.key),
    db
      .prepare(
        `SELECT id, metric, points, source, detail, alliance_key AS allianceKey, created_at AS createdAt
           FROM warfront_points WHERE player_id = ?1 AND day_key = ?2 ORDER BY created_at DESC LIMIT 30`,
      )
      .bind(playerId, day.key)
      .all<{id: string; metric: WarfrontMetric; points: number; source: string; detail: string; allianceKey: string; createdAt: number}>(),
  ]);

  // Today, across every row (an alliance row and a no-alliance row can both exist).
  const earned = {assault: 0, operations: 0, support: 0};
  for (const r of todayRows.results ?? []) for (const k of WARFRONT_METRICS) earned[k] += r[k];
  const todayScore = cappedDayScore(earned);
  const today = {
    earned,
    counted: Object.fromEntries(WARFRONT_METRICS.map((k) => [k, cappedMetric(k, earned[k])])) as Record<WarfrontMetric, number>,
    score: todayScore,
    caps: WARFRONT.metricDailyCap,
    dailyCap: WARFRONT.perPlayerDailyCap,
  };
  // The week: personal total, and the part counted for the current alliance.
  let weekScore = 0;
  let weekForAlliance = 0;
  for (const r of weekRows.results ?? []) {
    const s = cappedDayScore(r);
    weekScore += s;
    if (membership && r.alliance_key === membership.allianceId) weekForAlliance += s;
  }

  const mine = membership ? (table.find((s) => s.allianceId === membership.allianceId) ?? null) : null;
  const eligibleAt = membership ? membership.joinedAt + WARFRONT.membershipHoursForEligibility * 3600 * 1000 : null;
  const treasury = membership ? await readTreasury(db, membership.allianceId) : null;
  const lastWeekKey = weeklyWindow(week.startsAt - 1).key;
  const lastWeek = await db
    .prepare(`SELECT alliance_id AS allianceId, rank, tag, name, score, contributors, division FROM warfront_results WHERE world_id = ?1 AND week_key = ?2 ORDER BY rank LIMIT 25`)
    .bind(worldId, lastWeekKey)
    .all<{allianceId: string; rank: number; tag: string; name: string; score: number; contributors: number; division: string}>();

  return {
    phase,
    seasonWeek,
    weekKey: week.key,
    closesAt: week.resetAt,
    resetAt: day.resetAt,
    today,
    weekScore,
    weekForAlliance,
    membership: membership
      ? {
          allianceId: membership.allianceId,
          tag: membership.tag,
          name: membership.name,
          joinedAt: membership.joinedAt,
          eligibleAt,
          eligible: membershipEligible(membership.joinedAt, now),
        }
      : null,
    standings: table.slice(0, 50).map((s) => ({
      rank: s.rank,
      allianceId: s.allianceId,
      tag: s.tag,
      name: s.name,
      total: s.score.total,
      memberSum: s.score.memberSum,
      contributors: s.score.contributors,
      activeMembers: s.score.activeMembers,
      activeBonus: s.score.activeBonus,
      coordinatedOps: s.score.coordinatedOps,
      division: divisionForRank(s.rank).name,
      mine: !!membership && s.allianceId === membership.allianceId,
    })),
    mine: mine
      ? {
          rank: mine.rank,
          score: mine.score,
          division: divisionForRank(mine.rank),
          members: mine.members.slice(0, 100).map((m) => ({username: m.username, score: m.score, active: m.score >= WARFRONT.activeMemberThreshold, me: m.playerId === playerId})),
        }
      : null,
    treasury,
    recent: (recent.results ?? []).map((r) => ({...r, countedFor: r.allianceKey || null})),
    lastWeek: (lastWeek.results ?? []).map((r) => ({...r, mine: !!membership && r.allianceId === membership.allianceId})),
  };
}
