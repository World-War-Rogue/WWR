/**
 * Cosmetic ownership and equipping.
 *
 * The catalogue is in shared/cosmetics.ts. This file is the part the server
 * has to be trusted with: deciding whether a player may actually wear the
 * thing they asked to wear. The client is free to preview anything; only this
 * decides what the rest of the map sees.
 */
import {
  COSMETIC_SLOTS,
  COSMETICS_BY_ID,
  type CosmeticSlot,
  DEFAULT_LOADOUT,
  type Loadout,
  isItemInSlot,
} from '../shared/cosmetics';

export {COSMETIC_SLOTS, DEFAULT_LOADOUT};
export type {Loadout};

/**
 * Every item this player may equip.
 *
 * Free items are not stored per player - the catalogue's price of zero is the
 * grant - so this is the free tier unioned with whatever they have bought or
 * been given.
 */
export async function ownedItemIds(db: D1Database, playerId: string): Promise<Set<string>> {
  const rows = await db
    .prepare(`SELECT item_id FROM player_cosmetics WHERE player_id = ?1`)
    .bind(playerId)
    .all<{item_id: string}>();

  const owned = new Set<string>();
  for (const item of Object.values(COSMETICS_BY_ID)) {
    if (item.price === 0) owned.add(item.id);
  }
  for (const row of rows.results ?? []) owned.add(row.item_id);
  return owned;
}

export interface LoadoutRejection {
  slot: CosmeticSlot;
  reason: 'unknown' | 'unowned';
  id: string;
}

/**
 * Checks a requested loadout against the catalogue and against ownership.
 *
 * Returns the first problem rather than a list: the customisation screen only
 * ever submits what it drew from the same catalogue, so a rejection here means
 * either a stale tab or someone editing the request, and neither case is worth
 * a detailed report.
 */
export function checkLoadout(
  requested: Partial<Record<CosmeticSlot, unknown>>,
  owned: Set<string>,
): {loadout: Loadout} | {rejected: LoadoutRejection} {
  const loadout: Loadout = {...DEFAULT_LOADOUT};

  for (const slot of COSMETIC_SLOTS) {
    const value = requested[slot];
    // An omitted slot keeps its default rather than failing: a client that
    // knows about three slots should still be able to save.
    if (value === undefined || value === null) continue;
    if (!isItemInSlot(slot, value)) {
      return {rejected: {slot, reason: 'unknown', id: String(value)}};
    }
    if (!owned.has(value)) {
      return {rejected: {slot, reason: 'unowned', id: value}};
    }
    loadout[slot] = value;
  }

  return {loadout};
}

/** Grants an item outright. Used by admin tooling and, later, by a purchase. */
export async function grantItem(
  db: D1Database,
  playerId: string,
  itemId: string,
  source: 'purchase' | 'grant' | 'reward',
  now: number,
): Promise<boolean> {
  const item = COSMETICS_BY_ID[itemId];
  if (!item) return false;
  await db
    .prepare(
      `INSERT INTO player_cosmetics (player_id, item_id, slot, source, acquired_at)
       VALUES (?1, ?2, ?3, ?4, ?5)
       ON CONFLICT(player_id, item_id) DO NOTHING`,
    )
    .bind(playerId, itemId, item.slot, source, now)
    .run();
  return true;
}
