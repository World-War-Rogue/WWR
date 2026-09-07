/**
 * The Arena Squad: one saved loadout per player, for the Arena only.
 *
 * It is not a Task Force. Alpha-Delta are deployed columns that march and
 * fight on the map; the Arena Squad is six slots of the same assets, saved,
 * that fight a snapshot battle in the Arena. An asset may sit in a world
 * Task Force AND in the Arena Squad - the loadout borrows nothing and moves
 * nothing. Every rule an asset obeys in a Task Force it obeys here: the
 * formation is the slot order (0-1 front, 2-3 centre, 4-5 rear), Service
 * Rank, packages, category boost and Combat Systems all apply, the drone
 * rule applies, and the server decides every figure.
 *
 * Two checks, at two moments:
 *   - saving: the slots name assets the player holds, none twice;
 *   - entering: every asset in it is available right now - not under
 *     repair, not disabled, not out with a marching Task Force.
 * The saved squad may hold an unavailable asset; it just cannot enter.
 */
import {ASSET_BY_ID, SQUAD_SLOTS} from './assets';
import {droneCount} from './drones';
import {isDisabled} from './repair';

export const ARENA_SQUAD_NAME = 'Arena Squad';

export type ArenaSlots = Array<string | null>;

export interface ArenaRosterEntry {
  hp: number;
  repairEndsAt: number | null;
}

export type SquadCheck = {ok: true} | {ok: false; error: string};

/** Whether the slots are a squad this player may save. */
export function validateArenaSlots(slots: unknown, owned: ReadonlySet<string>): SquadCheck {
  if (!Array.isArray(slots) || slots.length !== SQUAD_SLOTS) return {ok: false, error: `The Arena Squad has ${SQUAD_SLOTS} slots.`};
  const seen = new Set<string>();
  for (const id of slots) {
    if (id === null) continue;
    if (typeof id !== 'string' || !ASSET_BY_ID[id]) return {ok: false, error: 'No such asset.'};
    if (!owned.has(id)) return {ok: false, error: `You do not hold ${ASSET_BY_ID[id].code}.`};
    if (seen.has(id)) return {ok: false, error: `${ASSET_BY_ID[id].code} is in the squad twice.`};
    seen.add(id);
  }
  return {ok: true};
}

/** Why an asset cannot enter the Arena right now, or null when it can. */
export function unavailableReason(assetId: string, entry: ArenaRosterEntry | undefined, away: ReadonlySet<string>, now: number): string | null {
  const code = ASSET_BY_ID[assetId]?.code ?? assetId;
  if (!entry) return `${code} is not in your roster.`;
  if (entry.repairEndsAt && entry.repairEndsAt > now) return `${code} is under repair.`;
  if (isDisabled(entry.hp)) return `${code} is disabled. Repair it first.`;
  if (away.has(assetId)) return `${code} is out with a Task Force.`;
  return null;
}

/** Whether the saved squad can enter the Arena right now. */
export function validateArenaEntry(
  slots: ArenaSlots,
  roster: ReadonlyMap<string, ArenaRosterEntry>,
  away: ReadonlySet<string>,
  now: number,
): SquadCheck {
  const ids = slots.filter((id): id is string => typeof id === 'string');
  if (ids.length === 0) return {ok: false, error: 'The Arena Squad is empty. Set it up first.'};
  const saved = validateArenaSlots(slots, new Set(roster.keys()));
  if (!saved.ok) return saved;
  if (droneCount(ids) === 0) return {ok: false, error: 'The Arena Squad needs a drone, like any Task Force.'};
  for (const id of ids) {
    const why = unavailableReason(id, roster.get(id), away, now);
    if (why) return {ok: false, error: why};
  }
  return {ok: true};
}

export const ARENA_SQUAD_RULES = [
  'Six slots: two front, two centre, two rear. The order is the formation.',
  'Any asset you hold, once. It stays in its Task Force too - nothing moves.',
  'Rank, packages, category boost and Combat Systems count exactly as on the map.',
  'It needs a drone. An asset under repair, disabled, or out with a Task Force cannot enter.',
  'The Arena damages nothing. Condition shown here is what the asset would carry in.',
];
