/**
 * The Season 1 Alliance Convoy.
 *
 * A free Daily Convoy per alliance (50+ members), and at most one paid
 * Contract Convoy a day. Each opens a two-hour join window with five cargo
 * trucks; members take first-come seats, one truck each, twenty to a truck.
 * At the lock the trucks freeze and the Convoy launches across the world
 * map in a fixed military formation: three Vanguard, five trucks, three
 * Rear Guard. Leadership picks the Guardian; the Guardian fits six of their
 * own ready assets into the guard slots.
 *
 * SEASON 1: a Convoy cannot be attacked, intercepted, raided or targeted by
 * anyone. There is no attack route, no attacker reward, no target marker,
 * no loss state - none of it exists yet. Convoy attacks are a Season 2
 * feature and nothing here half-builds them.
 *
 * Source: the 7 September Alliance Convoy spec. This file is the rules and
 * the shapes; worker/allianceConvoy.ts applies them to the database.
 */
import {gameDayStart} from './gametime';

export const CONVOY_TRUCKS = 5;
export const CONVOY_TRUCK_CAPACITY = 20;
/** An alliance needs at least this many members for its free Daily Convoy. */
export const CONVOY_MIN_MEMBERS = 50;
/** The join window: two hours from the Convoy's start. */
export const CONVOY_JOIN_MS = 2 * 60 * 60 * 1000;

export const CONVOY_GUARD_SLOTS = 6;
/** The six fixed guard positions, in formation order. */
export const GUARD_SLOTS = ['vanguard_1', 'vanguard_2', 'vanguard_3', 'rear_1', 'rear_2', 'rear_3'] as const;
export type GuardSlot = (typeof GUARD_SLOTS)[number];
export const GUARD_SLOT_LABEL: Record<GuardSlot, string> = {
  vanguard_1: 'Vanguard 1',
  vanguard_2: 'Vanguard 2',
  vanguard_3: 'Vanguard 3',
  rear_1: 'Rear Guard 1',
  rear_2: 'Rear Guard 2',
  rear_3: 'Rear Guard 3',
};
export const VANGUARD_SLOTS: GuardSlot[] = ['vanguard_1', 'vanguard_2', 'vanguard_3'];
export const REAR_SLOTS: GuardSlot[] = ['rear_1', 'rear_2', 'rear_3'];

export type ConvoyKind = 'daily' | 'contract';
export type ConvoyState = 'joining' | 'launched';

/**
 * The Tokens a Contract Convoy costs: the website's Token count worth $50.
 * A server constant, never a dollar price and never a Credits alternative in
 * game (the spec forbids both). Change it here when the Token pack price
 * changes; the client only ever sees "Tokens".
 */
export const CONTRACT_CONVOY_TOKENS = 4500;

/** Only leadership may run a Convoy or set its Guardian. */
export type LeadershipRank = 'leader' | 'officer';
export function isLeadership(rank: string | null | undefined): rank is LeadershipRank {
  return rank === 'leader' || rank === 'officer';
}

/**
 * The daily Convoy day key and its two windows. The Daily Convoy starts at
 * 00:00 RST and locks at 02:00 RST; a Contract Convoy carries its own start
 * (its purchase instant) and locks two hours later, so it is usable whenever
 * in the day it is bought.
 */
export function convoyDayKey(now: number): string {
  const start = gameDayStart(now);
  return `d:${Math.round(start / 86_400_000)}`;
}

export function dailyWindow(now: number): {startsAt: number; locksAt: number} {
  const startsAt = gameDayStart(now);
  return {startsAt, locksAt: startsAt + CONVOY_JOIN_MS};
}

export function stateOf(startsAt: number, now: number): ConvoyState {
  return now < startsAt + CONVOY_JOIN_MS ? 'joining' : 'launched';
}

export function locksAt(startsAt: number): number {
  return startsAt + CONVOY_JOIN_MS;
}

/* -------------------------------------------------------------------------- */
/* Guard validation                                                           */
/* -------------------------------------------------------------------------- */

export interface GuardAsset {
  slot: GuardSlot;
  assetId: string;
}

export type GuardCheck = {ok: true} | {ok: false; error: string};

export interface GuardCandidate {
  hp: number;
  repairEndsAt: number | null;
  away: boolean;
}

/**
 * Whether a proposed six-asset escort is valid: exactly the six slots, each
 * an asset the Guardian holds, no asset twice, each ready (not disabled, not
 * under repair, not out with a marching Task Force). The server runs this
 * against its own roster - the client's word is never taken.
 */
export function validateGuard(
  assignments: unknown,
  roster: ReadonlyMap<string, GuardCandidate>,
  assetExists: (id: string) => boolean,
  assetCode: (id: string) => string,
  now: number,
): GuardCheck {
  if (!Array.isArray(assignments) || assignments.length !== CONVOY_GUARD_SLOTS) {
    return {ok: false, error: `The escort has ${CONVOY_GUARD_SLOTS} guard slots.`};
  }
  const slotsSeen = new Set<string>();
  const assetsSeen = new Set<string>();
  for (const entry of assignments) {
    const slot = (entry as GuardAsset)?.slot;
    const assetId = (entry as GuardAsset)?.assetId;
    if (typeof slot !== 'string' || !(GUARD_SLOTS as readonly string[]).includes(slot)) return {ok: false, error: 'Unknown guard slot.'};
    if (slotsSeen.has(slot)) return {ok: false, error: `${GUARD_SLOT_LABEL[slot as GuardSlot]} is filled twice.`};
    slotsSeen.add(slot);
    if (typeof assetId !== 'string' || !assetExists(assetId)) return {ok: false, error: 'No such asset.'};
    if (assetsSeen.has(assetId)) return {ok: false, error: `${assetCode(assetId)} is in the escort twice.`};
    assetsSeen.add(assetId);
    const cand = roster.get(assetId);
    if (!cand) return {ok: false, error: `You do not hold ${assetCode(assetId)}.`};
    if (cand.repairEndsAt && cand.repairEndsAt > now) return {ok: false, error: `${assetCode(assetId)} is under repair.`};
    if (cand.hp <= 0.0005) return {ok: false, error: `${assetCode(assetId)} is disabled.`};
    if (cand.away) return {ok: false, error: `${assetCode(assetId)} is out with a Task Force.`};
  }
  if (slotsSeen.size !== CONVOY_GUARD_SLOTS) return {ok: false, error: 'Fill all six guard slots.'};
  return {ok: true};
}

/** A guard is valid enough to launch: six slots filled. Used for the replace rule. */
export function guardIsConfigured(assignments: GuardAsset[] | null | undefined): boolean {
  if (!assignments || assignments.length !== CONVOY_GUARD_SLOTS) return false;
  const slots = new Set(assignments.map((a) => a.slot));
  return slots.size === CONVOY_GUARD_SLOTS;
}

export const CONVOY_RULES = [
  'Opens 00:00 RST for alliances of 50+. Two hours to board: five trucks, twenty seats each, one truck per member.',
  'At 02:00 RST the trucks lock and the Convoy launches - even with empty seats.',
  'Leadership picks the Guardian; the Guardian fits six of their own ready assets into three Vanguard and three Rear Guard slots.',
  'Leadership may swap the Guardian during the join window only while no valid six-asset escort is set.',
  'A Contract Convoy is one extra Convoy a day, paid in Tokens, with the same two hours, trucks and guard.',
  'Season 1: a Convoy cannot be attacked, raided or targeted by anyone.',
];
