/**
 * The Alliance Convoy on the server.
 *
 * The Daily Convoy is created lazily: the first read or join of a day, for an
 * alliance of 50+, writes its row (INSERT OR IGNORE on the unique alliance/
 * day/kind key, so concurrent first-reads make one). The Contract Convoy is
 * created by a leadership purchase, Tokens only. Boarding a truck is one
 * guarded statement; switching trucks is one transaction that can only move a
 * member where there is room and never drops their original seat if it fails.
 *
 * Every rule in shared/allianceConvoy.ts is enforced here against the
 * server's own roster and membership - nothing from the client is trusted
 * beyond "board truck N", "make this member Guardian", "put this asset here".
 *
 * There is no attack path. A Season 1 Convoy cannot be targeted.
 */
import {ASSET_BY_ID} from '../shared/assets';
import {
  CONTRACT_CONVOY_TOKENS,
  CONVOY_MIN_MEMBERS,
  CONVOY_TRUCKS,
  CONVOY_TRUCK_CAPACITY,
  type ConvoyKind,
  type GuardAsset,
  GUARD_SLOTS,
  convoyDayKey,
  dailyWindow,
  guardIsConfigured,
  isLeadership,
  locksAt,
  stateOf,
  validateGuard,
} from '../shared/allianceConvoy';
import {hashSeed} from '../shared/exercises';
import {membershipOf, memberCount} from './alliance';
import {awayAssets} from './arenaSquad';
import {ensureRoster} from './squads';
import {marchingSquads} from './march';
import {type Wallet, claimWallet, ledger, settleWallet} from './upgrades';

interface ConvoyRow {
  id: string;
  alliance_id: string;
  world_id: number;
  day_key: string;
  kind: string;
  starts_at: number;
  locks_at: number;
  route: string;
  guardian_id: string | null;
  guard: string | null;
  created_at: number;
}

interface Route {
  from: {x: number; y: number};
  to: {x: number; y: number};
}

function routeFor(seed: number, extent: number): Route {
  const roll = (n: number) => (hashSeed(`${seed}:${n}`) % (2 * extent + 1)) - extent;
  // A line across the map, at a hashed offset, so each Convoy has its own lane.
  const y = Math.round(roll(1) * 0.7);
  return {from: {x: -extent, y}, to: {x: extent, y: Math.round(roll(2) * 0.7)}};
}

function parseGuard(raw: string | null): GuardAsset[] | null {
  if (!raw) return null;
  try {
    const g = JSON.parse(raw) as GuardAsset[];
    return Array.isArray(g) ? g : null;
  } catch {
    return null;
  }
}

/** The Daily Convoy row for an alliance today, created if it qualifies. */
export async function ensureDaily(db: D1Database, allianceId: string, worldId: number, extent: number, now: number): Promise<ConvoyRow | null> {
  const dayKey = convoyDayKey(now);
  const existing = await db
    .prepare(`SELECT * FROM alliance_convoys WHERE alliance_id = ?1 AND day_key = ?2 AND kind = 'daily'`)
    .bind(allianceId, dayKey)
    .first<ConvoyRow>();
  if (existing) return existing;
  const members = await memberCount(db, allianceId);
  if (members < CONVOY_MIN_MEMBERS) return null;
  const win = dailyWindow(now);
  const id = `convoy:${allianceId}:${dayKey}:daily`;
  const route = routeFor(hashSeed(id), extent);
  await db
    .prepare(
      `INSERT OR IGNORE INTO alliance_convoys (id, alliance_id, world_id, day_key, kind, starts_at, locks_at, route, guardian_id, guard, created_at)
       VALUES (?1, ?2, ?3, ?4, 'daily', ?5, ?6, ?7, NULL, NULL, ?8)`,
    )
    .bind(id, allianceId, worldId, dayKey, win.startsAt, win.locksAt, JSON.stringify(route), now)
    .run();
  return db.prepare(`SELECT * FROM alliance_convoys WHERE id = ?1`).bind(id).first<ConvoyRow>();
}

export type ContractResult = {ok: true; wallet: Wallet} | {ok: false; error: string};

/** Leadership buys the day's one Contract Convoy. Tokens only. */
export async function startContract(db: D1Database, playerId: string, worldId: number, extent: number, now: number): Promise<ContractResult> {
  const membership = await membershipOf(db, playerId);
  if (!membership) return {ok: false, error: 'You are not in an alliance.'};
  if (!isLeadership(membership.rank)) return {ok: false, error: 'Only alliance leadership can call a Contract Convoy.'};
  const dayKey = convoyDayKey(now);
  const existing = await db
    .prepare(`SELECT id FROM alliance_convoys WHERE alliance_id = ?1 AND day_key = ?2 AND kind = 'contract'`)
    .bind(membership.alliance.id, dayKey)
    .first<{id: string}>();
  if (existing) return {ok: false, error: 'This alliance already has a Contract Convoy today.'};

  const wallet = await settleWallet(db, playerId, now);
  if (wallet.tokens < CONTRACT_CONVOY_TOKENS) return {ok: false, error: 'Not enough Tokens for a Contract Convoy.'};
  const split = {tokens: CONTRACT_CONVOY_TOKENS, credits: 0};
  const id = `convoy:${membership.alliance.id}:${dayKey}:contract`;
  const route = routeFor(hashSeed(id), extent);
  const results = await db.batch([
    claimWallet(db, playerId, wallet, split),
    db
      .prepare(
        `INSERT OR IGNORE INTO alliance_convoys (id, alliance_id, world_id, day_key, kind, starts_at, locks_at, route, guardian_id, guard, created_at)
         SELECT ?1, ?2, ?3, ?4, 'contract', ?5, ?6, ?7, NULL, NULL, ?5
          WHERE EXISTS (SELECT 1 FROM players WHERE id = ?8 AND wallet_rev = ?9)`,
      )
      .bind(id, membership.alliance.id, worldId, dayKey, now, now + locksAt(0), JSON.stringify(route), playerId, wallet.rev + 1),
    ledger(db, playerId, 'convoy-contract', split, membership.alliance.id, 'Contract Convoy called', now, wallet.rev),
  ]);
  if (!(results[0].meta.changes ?? 0)) return {ok: false, error: 'That did not go through - try again.'};
  const after = await settleWallet(db, playerId, now);
  return {ok: true, wallet: after};
}

export type JoinResult = {ok: true} | {ok: false; error: string};

async function truckCounts(db: D1Database, convoyId: string): Promise<number[]> {
  const rows = await db
    .prepare(`SELECT truck, COUNT(*) AS n FROM convoy_truck_members WHERE convoy_id = ?1 GROUP BY truck`)
    .bind(convoyId)
    .all<{truck: number; n: number}>();
  const counts = Array<number>(CONVOY_TRUCKS).fill(0);
  for (const r of rows.results ?? []) if (r.truck >= 0 && r.truck < CONVOY_TRUCKS) counts[r.truck] = r.n;
  return counts;
}

/**
 * Board or switch trucks. First-come to the seat: the insert (or the move)
 * lands only while the truck holds fewer than twenty, checked inside the same
 * statement, so two members racing for the last seat cannot both win. A switch
 * moves the row only if the destination has room; if it does not, the member
 * keeps the truck they had.
 */
export async function joinTruck(db: D1Database, playerId: string, convoyId: string, truck: number, now: number): Promise<JoinResult> {
  if (!Number.isInteger(truck) || truck < 0 || truck >= CONVOY_TRUCKS) return {ok: false, error: 'No such truck.'};
  const convoy = await db.prepare(`SELECT * FROM alliance_convoys WHERE id = ?1`).bind(convoyId).first<ConvoyRow>();
  if (!convoy) return {ok: false, error: 'No such Convoy.'};
  if (stateOf(convoy.starts_at, now) !== 'joining') return {ok: false, error: 'Boarding has closed for this Convoy.'};
  const membership = await membershipOf(db, playerId);
  if (!membership || membership.alliance.id !== convoy.alliance_id) return {ok: false, error: 'This Convoy belongs to another alliance.'};

  const current = await db
    .prepare(`SELECT truck FROM convoy_truck_members WHERE convoy_id = ?1 AND player_id = ?2`)
    .bind(convoyId, playerId)
    .first<{truck: number}>();
  if (current && current.truck === truck) return {ok: true};

  // The seat check is a subquery inside the write, so the count is read and
  // the row written in one statement - no read-then-write gap for a racer.
  const cap = CONVOY_TRUCK_CAPACITY;
  const guard = `(SELECT COUNT(*) FROM convoy_truck_members WHERE convoy_id = ?1 AND truck = ?3) < ${cap}`;
  if (current) {
    const moved = await db
      .prepare(`UPDATE convoy_truck_members SET truck = ?3, joined_at = ?4 WHERE convoy_id = ?1 AND player_id = ?2 AND ${guard}`)
      .bind(convoyId, playerId, truck, now)
      .run();
    if (!(moved.meta.changes ?? 0)) return {ok: false, error: `Truck ${truck + 1} is full. You are still in Truck ${current.truck + 1}.`};
    return {ok: true};
  }
  const joined = await db
    .prepare(
      `INSERT INTO convoy_truck_members (convoy_id, player_id, truck, joined_at)
       SELECT ?1, ?2, ?3, ?4 WHERE ${guard}`,
    )
    .bind(convoyId, playerId, truck, now)
    .run();
  if (!(joined.meta.changes ?? 0)) return {ok: false, error: `Truck ${truck + 1} is full.`};
  return {ok: true};
}

export async function leaveTruck(db: D1Database, playerId: string, convoyId: string, now: number): Promise<JoinResult> {
  const convoy = await db.prepare(`SELECT starts_at FROM alliance_convoys WHERE id = ?1`).bind(convoyId).first<{starts_at: number}>();
  if (!convoy) return {ok: false, error: 'No such Convoy.'};
  if (stateOf(convoy.starts_at, now) !== 'joining') return {ok: false, error: 'The Convoy has launched.'};
  await db.prepare(`DELETE FROM convoy_truck_members WHERE convoy_id = ?1 AND player_id = ?2`).bind(convoyId, playerId).run();
  return {ok: true};
}

/* -------------------------------------------------------------------------- */
/* Guardian                                                                   */
/* -------------------------------------------------------------------------- */

export type GuardianResult = {ok: true} | {ok: false; error: string};

/** Leadership names the Guardian. Replaceable in the window only while no valid escort is set. */
export async function setGuardian(db: D1Database, actorId: string, convoyId: string, guardianUsername: string, now: number): Promise<GuardianResult> {
  const membership = await membershipOf(db, actorId);
  if (!membership || !isLeadership(membership.rank)) return {ok: false, error: 'Only alliance leadership can choose the Guardian.'};
  const convoy = await db.prepare(`SELECT * FROM alliance_convoys WHERE id = ?1`).bind(convoyId).first<ConvoyRow>();
  if (!convoy || convoy.alliance_id !== membership.alliance.id) return {ok: false, error: 'No such Convoy.'};
  if (stateOf(convoy.starts_at, now) !== 'joining') return {ok: false, error: 'The Convoy has launched.'};
  if (convoy.guardian_id && guardIsConfigured(parseGuard(convoy.guard))) {
    return {ok: false, error: 'The Guardian has set a valid escort and can no longer be replaced this Convoy.'};
  }
  const guardian = await db
    .prepare(
      `SELECT p.id AS id FROM players p JOIN alliance_members m ON m.player_id = p.id
        WHERE p.username = ?1 AND m.alliance_id = ?2`,
    )
    .bind(guardianUsername, membership.alliance.id)
    .first<{id: string}>();
  if (!guardian) return {ok: false, error: 'That commander is not in your alliance.'};
  // A new Guardian starts with no escort.
  await db.prepare(`UPDATE alliance_convoys SET guardian_id = ?2, guard = NULL WHERE id = ?1`).bind(convoyId, guardian.id).run();
  return {ok: true};
}

/** The Guardian fits their six assets into the guard slots. */
export async function setGuard(db: D1Database, playerId: string, convoyId: string, assignments: unknown, now: number): Promise<GuardianResult> {
  const convoy = await db.prepare(`SELECT * FROM alliance_convoys WHERE id = ?1`).bind(convoyId).first<ConvoyRow>();
  if (!convoy) return {ok: false, error: 'No such Convoy.'};
  if (convoy.guardian_id !== playerId) return {ok: false, error: 'Only the Convoy Guardian can arrange the escort.'};
  if (stateOf(convoy.starts_at, now) !== 'joining') return {ok: false, error: 'The Convoy has launched.'};
  const [owned, awaySquads] = await Promise.all([ensureRoster(db, playerId, now), marchingSquads(db, playerId)]);
  const away = await awayAssets(db, playerId, awaySquads);
  const roster = new Map(owned.map((o) => [o.assetId, {hp: o.hp, repairEndsAt: o.repairEndsAt, away: away.has(o.assetId)}]));
  const check = validateGuard(assignments, roster, (id) => !!ASSET_BY_ID[id], (id) => ASSET_BY_ID[id]?.code ?? id, now);
  if (!check.ok) return check;
  await db.prepare(`UPDATE alliance_convoys SET guard = ?2 WHERE id = ?1`).bind(convoyId, JSON.stringify(assignments)).run();
  return {ok: true};
}

/* -------------------------------------------------------------------------- */
/* Views                                                                      */
/* -------------------------------------------------------------------------- */

export interface ConvoyView {
  id: string;
  kind: ConvoyKind;
  state: 'joining' | 'launched';
  startsAt: number;
  locksAt: number;
  route: Route;
  trucks: number[];
  capacity: number;
  myTruck: number | null;
  guardian: {username: string; isMe: boolean} | null;
  guard: Array<{slot: string; assetId: string; level: number}> | null;
  guardConfigured: boolean;
}

async function viewOne(db: D1Database, row: ConvoyRow, playerId: string, now: number): Promise<ConvoyView> {
  const [counts, mine, guardianName] = await Promise.all([
    truckCounts(db, row.id),
    db.prepare(`SELECT truck FROM convoy_truck_members WHERE convoy_id = ?1 AND player_id = ?2`).bind(row.id, playerId).first<{truck: number}>(),
    row.guardian_id ? db.prepare(`SELECT username FROM players WHERE id = ?1`).bind(row.guardian_id).first<{username: string}>() : Promise.resolve(null),
  ]);
  const guardRaw = parseGuard(row.guard);
  // Each escort asset's rank is read from the Guardian's roster so the map draws its real stage art.
  let guard: ConvoyView['guard'] = null;
  if (guardRaw && row.guardian_id) {
    const owned = await ensureRoster(db, row.guardian_id, now);
    const level = new Map(owned.map((o) => [o.assetId, o.level]));
    guard = guardRaw.map((g) => ({slot: g.slot, assetId: g.assetId, level: level.get(g.assetId) ?? 1}));
  }
  return {
    id: row.id,
    kind: row.kind as ConvoyKind,
    state: stateOf(row.starts_at, now),
    startsAt: row.starts_at,
    locksAt: row.locks_at,
    route: JSON.parse(row.route) as Route,
    trucks: counts,
    capacity: CONVOY_TRUCK_CAPACITY,
    myTruck: mine?.truck ?? null,
    guardian: guardianName ? {username: guardianName.username, isMe: row.guardian_id === playerId} : null,
    guard,
    guardConfigured: guardIsConfigured(guardRaw),
  };
}

export interface AllianceConvoyView {
  inAlliance: boolean;
  isLeadership: boolean;
  members: number;
  minMembers: number;
  contractTokens: number;
  daily: ConvoyView | null;
  contract: ConvoyView | null;
  /** The alliance roster, for a leader choosing a Guardian. */
  roster: Array<{username: string}>;
  /** The Guardian's own assets, for arranging the escort (only when you are the Guardian of a convoy). */
  myAssets: Array<{assetId: string; level: number; ready: boolean; reason: string | null}>;
}

export async function allianceConvoyView(db: D1Database, playerId: string, worldId: number, extent: number, now: number): Promise<AllianceConvoyView> {
  const membership = await membershipOf(db, playerId);
  if (!membership) {
    return {inAlliance: false, isLeadership: false, members: 0, minMembers: CONVOY_MIN_MEMBERS, contractTokens: CONTRACT_CONVOY_TOKENS, daily: null, contract: null, roster: [], myAssets: []};
  }
  const allianceId = membership.alliance.id;
  const [daily, contractRow, members, roster] = await Promise.all([
    ensureDaily(db, allianceId, worldId, extent, now),
    db.prepare(`SELECT * FROM alliance_convoys WHERE alliance_id = ?1 AND day_key = ?2 AND kind = 'contract'`).bind(allianceId, convoyDayKey(now)).first<ConvoyRow>(),
    memberCount(db, allianceId),
    db.prepare(`SELECT username FROM players p JOIN alliance_members m ON m.player_id = p.id WHERE m.alliance_id = ?1 ORDER BY username`).bind(allianceId).all<{username: string}>(),
  ]);
  const dailyView = daily ? await viewOne(db, daily, playerId, now) : null;
  const contractView = contractRow ? await viewOne(db, contractRow, playerId, now) : null;

  // The Guardian's own ready assets, only when this player is a Guardian of one of the convoys.
  let myAssets: AllianceConvoyView['myAssets'] = [];
  const guardOfDaily = daily?.guardian_id === playerId;
  const guardOfContract = contractRow?.guardian_id === playerId;
  if (guardOfDaily || guardOfContract) {
    const [owned, awaySquads] = await Promise.all([ensureRoster(db, playerId, now), marchingSquads(db, playerId)]);
    const away = await awayAssets(db, playerId, awaySquads);
    myAssets = owned.map((o) => {
      const repairing = !!(o.repairEndsAt && o.repairEndsAt > now);
      const disabled = o.hp <= 0.0005;
      const out = away.has(o.assetId);
      return {
        assetId: o.assetId,
        level: o.level,
        ready: !repairing && !disabled && !out,
        reason: repairing ? 'Under repair' : disabled ? 'Disabled' : out ? 'Out with a Task Force' : null,
      };
    });
  }

  return {
    inAlliance: true,
    isLeadership: isLeadership(membership.rank),
    members,
    minMembers: CONVOY_MIN_MEMBERS,
    contractTokens: CONTRACT_CONVOY_TOKENS,
    daily: dailyView,
    contract: contractView,
    roster: roster.results ?? [],
    myAssets,
  };
}

/** Launched convoys in a world, for the map's moving formations. */
export interface WorldConvoy {
  id: string;
  tag: string;
  route: Route;
  startsAt: number;
  guard: Array<{slot: string; assetId: string; level: number}>;
}

export async function worldConvoys(db: D1Database, worldId: number, now: number): Promise<WorldConvoy[]> {
  const dayKey = convoyDayKey(now);
  const rows = await db
    .prepare(
      `SELECT c.*, a.tag AS tag FROM alliance_convoys c JOIN alliances a ON a.id = c.alliance_id
        WHERE c.world_id = ?1 AND c.day_key = ?2 AND c.locks_at <= ?3`,
    )
    .bind(worldId, dayKey, now)
    .all<ConvoyRow & {tag: string}>();
  const out: WorldConvoy[] = [];
  for (const row of rows.results ?? []) {
    const guardRaw = parseGuard(row.guard) ?? [];
    let guard: WorldConvoy['guard'] = [];
    if (guardRaw.length && row.guardian_id) {
      const owned = await ensureRoster(db, row.guardian_id, now);
      const level = new Map(owned.map((o) => [o.assetId, o.level]));
      guard = guardRaw.map((g) => ({slot: g.slot, assetId: g.assetId, level: level.get(g.assetId) ?? 1}));
    }
    out.push({id: row.id, tag: row.tag, route: JSON.parse(row.route) as Route, startsAt: row.starts_at, guard});
  }
  return out;
}
