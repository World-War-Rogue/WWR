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
import {SKINS, isSkinId} from './game';

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

/**
 * What a grantable id is, whether it names an accessory or a premium base
 * skin. Both are recorded in player_cosmetics so there is exactly one place to
 * look to answer "may this player wear this".
 */
function resolveGrantable(itemId: string): {slot: string; exclusive: boolean} | null {
  const item = COSMETICS_BY_ID[itemId];
  if (item) return {slot: item.slot, exclusive: item.exclusive === true};
  if (isSkinId(itemId)) return {slot: 'skin', exclusive: SKINS[itemId].exclusive === true};
  return null;
}

/**
 * Grants an item outright. Used by admin tooling and, later, by a purchase.
 *
 * Returns 'taken' when the item is a one-of-one that somebody already holds.
 * That answer comes from the unique index rejecting the write, not from a
 * check performed first - two purchases landing in the same instant would both
 * pass a check, and only one can win the insert.
 */
export async function grantItem(
  db: D1Database,
  playerId: string,
  itemId: string,
  source: 'purchase' | 'grant' | 'reward',
  now: number,
): Promise<'granted' | 'taken' | 'unknown'> {
  const grantable = resolveGrantable(itemId);
  if (!grantable) return 'unknown';
  try {
    await db
      .prepare(
        `INSERT INTO player_cosmetics (player_id, item_id, slot, source, acquired_at, exclusive)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)
         ON CONFLICT(player_id, item_id) DO NOTHING`,
      )
      .bind(playerId, itemId, grantable.slot, source, now, grantable.exclusive ? 1 : 0)
      .run();
    return 'granted';
  } catch {
    // The partial unique index on exclusive items refused it: somebody owns
    // this one already, and that refusal is the promise being kept.
    return 'taken';
  }
}
