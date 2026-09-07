/**
 * The Arena Squad on the server: one saved loadout per player
 * (arena_squad_slots), read for the setup screen, validated on save, and
 * turned into the snapshot an attempt fights with - after the availability
 * check. The rules are in shared/arenaSquad.ts; nothing from the client is
 * trusted beyond "put this asset id in this slot".
 */
import {ASSET_BY_ID, SQUAD_NAMES, SQUAD_SLOTS} from '../shared/assets';
import {type ArenaSlots, unavailableReason, validateArenaEntry, validateArenaSlots} from '../shared/arenaSquad';
import type {CombatantSpec} from '../shared/combat';
import {categoryBoost} from '../shared/buildings';
import {assetPowerWith} from '../shared/upgrades';
import {readLevels} from './buildings';
import {ARENA_SYSTEMS_KEY, readSystems} from './combatSystems';
import {type OwnedAsset, ensureRoster, readSquads} from './squads';
import {settleWallet} from './upgrades';

const SEASON = 1;

export async function readArenaSlots(db: D1Database, playerId: string): Promise<ArenaSlots> {
  const rows = await db
    .prepare(`SELECT slot, asset_id AS assetId FROM arena_squad_slots WHERE player_id = ?1`)
    .bind(playerId)
    .all<{slot: number; assetId: string}>();
  const slots: ArenaSlots = Array<string | null>(SQUAD_SLOTS).fill(null);
  for (const r of rows.results ?? []) {
    if (r.slot >= 0 && r.slot < SQUAD_SLOTS) slots[r.slot] = r.assetId;
  }
  return slots;
}

export type SaveResult = {ok: true; slots: ArenaSlots} | {ok: false; error: string};

/** Replace the whole squad. Validated against the roster the server holds. */
export async function saveArenaSlots(db: D1Database, playerId: string, slots: unknown, now: number): Promise<SaveResult> {
  const owned = await ensureRoster(db, playerId, now);
  const check = validateArenaSlots(slots, new Set(owned.map((o) => o.assetId)));
  if (!check.ok) return check;
  const next = slots as ArenaSlots;
  const statements: D1PreparedStatement[] = [db.prepare(`DELETE FROM arena_squad_slots WHERE player_id = ?1`).bind(playerId)];
  next.forEach((id, slot) => {
    if (!id) return;
    statements.push(db.prepare(`INSERT INTO arena_squad_slots (player_id, slot, asset_id) VALUES (?1, ?2, ?3)`).bind(playerId, slot, id));
  });
  await db.batch(statements);
  return {ok: true, slots: next};
}

/** Assets currently out with a marching Task Force - unavailable to the Arena. */
export async function awayAssets(db: D1Database, playerId: string, awaySquads: Set<string>): Promise<Set<string>> {
  if (awaySquads.size === 0) return new Set();
  const board = await readSquads(db, playerId);
  const out = new Set<string>();
  for (const name of SQUAD_NAMES) {
    if (!awaySquads.has(name)) continue;
    for (const id of board[name]) if (id) out.add(id);
  }
  return out;
}

export interface ArenaForce {
  units: CombatantSpec[];
  power: number;
}

export type ForceResult = {ok: true; force: ArenaForce} | {ok: false; error: string};

/**
 * The saved squad as a snapshot ready to fight, or why it cannot. Every
 * figure comes from the roster, the buildings and the Combat Systems rows -
 * the same sources a march freezes.
 */
export async function arenaForce(db: D1Database, playerId: string, awaySquads: Set<string>, now: number): Promise<ForceResult> {
  const [slots, owned, levels, systems, away] = await Promise.all([
    readArenaSlots(db, playerId),
    ensureRoster(db, playerId, now),
    readLevels(db, playerId),
    readSystems(db, playerId),
    awayAssets(db, playerId, awaySquads),
  ]);
  const roster = new Map(owned.map((o) => [o.assetId, o]));
  const check = validateArenaEntry(slots, roster, away, now);
  if (!check.ok) return check;
  const units: CombatantSpec[] = [];
  let power = 0;
  slots.forEach((id, slot) => {
    if (!id) return;
    const o = roster.get(id);
    const asset = ASSET_BY_ID[id];
    if (!o || !asset) return;
    const boost = categoryBoost(levels, asset.category);
    units.push({assetId: id, level: o.level, packages: o.packages, slot, hpFraction: o.hp, boost, systems: systems[ARENA_SYSTEMS_KEY], squad: ARENA_SYSTEMS_KEY});
    power += assetPowerWith(asset, o.level, o.packages, boost);
  });
  return {ok: true, force: {units, power}};
}

export interface ArenaSquadView {
  slots: ArenaSlots;
  power: number;
  /** Why it cannot enter right now, or null. */
  blocked: string | null;
  systems: {fire_control: number; survivability: number; sustainment: number};
  /** For the Combat Systems panel: what can be spent, and the cap. */
  wallet: {tokens: number; credits: number};
  commandCenter: number;
  season: number;
  roster: Array<{
    assetId: string;
    level: number;
    hp: number;
    repairing: boolean;
    away: boolean;
    power: number;
    /** Which Task Force holds it on the map, if any. */
    taskForce: string | null;
    unavailable: string | null;
  }>;
  /** The four Task Forces' slots, so "copy from Alpha" is one tap. */
  taskForces: Record<string, ArenaSlots>;
}

export async function arenaSquadView(db: D1Database, playerId: string, awaySquads: Set<string>, now: number): Promise<ArenaSquadView> {
  const [slots, owned, levels, systems, board, wallet] = await Promise.all([
    readArenaSlots(db, playerId),
    ensureRoster(db, playerId, now),
    readLevels(db, playerId),
    readSystems(db, playerId),
    readSquads(db, playerId),
    settleWallet(db, playerId, now),
  ]);
  const away = await awayAssets(db, playerId, awaySquads);
  const roster = new Map<string, OwnedAsset>(owned.map((o) => [o.assetId, o]));
  const holder = new Map<string, string>();
  for (const name of SQUAD_NAMES) for (const id of board[name]) if (id) holder.set(id, name);
  const powerOf = (o: OwnedAsset) => {
    const asset = ASSET_BY_ID[o.assetId];
    return asset ? assetPowerWith(asset, o.level, o.packages, categoryBoost(levels, asset.category)) : 0;
  };
  const power = slots.reduce((sum, id) => {
    const o = id ? roster.get(id) : undefined;
    return sum + (o ? powerOf(o) : 0);
  }, 0);
  const entry = validateArenaEntry(slots, roster, away, now);
  return {
    slots,
    power,
    blocked: entry.ok ? null : entry.error,
    systems: systems[ARENA_SYSTEMS_KEY],
    wallet: {tokens: wallet.tokens, credits: wallet.credits},
    commandCenter: levels.command_center,
    season: SEASON,
    roster: owned
      .map((o) => ({
        assetId: o.assetId,
        level: o.level,
        hp: o.hp,
        repairing: !!(o.repairEndsAt && o.repairEndsAt > now),
        away: away.has(o.assetId),
        power: powerOf(o),
        taskForce: holder.get(o.assetId) ?? null,
        unavailable: unavailableReason(o.assetId, o, away, now),
      }))
      .sort((a, b) => b.power - a.power),
    taskForces: Object.fromEntries(SQUAD_NAMES.map((name) => [name, board[name]])),
  };
}
