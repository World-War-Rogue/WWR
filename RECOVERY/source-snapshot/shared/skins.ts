/**
 * What a base skin IS - imported by both the Worker and the client.
 *
 * This file exists because the two sides had separate copies of the catalogue
 * and they drifted the first time one was added to: Ravenkeep was registered
 * in the client, so it drew correctly, and was absent from the server, so it
 * was never offered in Customise and would have been rejected on equip. The
 * symptom - "the new skin isn't there" - pointed at the art, the atlas and the
 * deploy before it pointed at the real cause, which is exactly what a
 * duplicated catalogue does.
 *
 * The split is identity versus presentation. What a skin is called, what it
 * costs a player to be told about, whether it is a starter and whether it is
 * one-of-one all live here. How it is DRAWN - its perimeter recipe, its
 * landmark, its art atlas, its motion - is client-only and stays in
 * src/live/skins.ts, because the server has no canvas and no opinion about it.
 *
 * Data only. No DOM, no Worker APIs, or one of the two sides stops compiling.
 */

export type SkinId =
  | 'circular_shield_bunker'
  | 'desert_command_citadel'
  | 'field_workshop'
  | 'medieval_fortress'
  | 'rose_command_citadel'
  | 'ember_sentinel'
  | 'ravenkeep'
  | 'shellwarden'
  | 'signature_one';

export interface Palette {
  ground: string;
  structure: string;
  accent: string;
  roof: string;
  wall: string;
}

export interface SkinIdentity {
  id: SkinId;
  name: string;
  blurb: string;
  palette: Palette;
  /** Offered to a new player at signup. */
  starter: boolean;
  /**
   * A one-of-one commission. At most one account in the game may ever hold it,
   * and that is enforced by a unique index rather than by remembering not to
   * sell it twice - see migrations/0006_exclusive.sql.
   */
  exclusive?: boolean;
}

export const SKIN_IDENTITY: Record<SkinId, SkinIdentity> = {
  circular_shield_bunker: {
    id: 'circular_shield_bunker',
    name: 'Circular Shield Bunker',
    blurb: 'A sealed dome and one hatch. Nothing gets in that is not let in.',
    palette: {ground: '#4a5560', structure: '#d8d3c4', accent: '#22d3ee', roof: '#5a6875', wall: '#b9bec4'},
    starter: true,
  },
  desert_command_citadel: {
    id: 'desert_command_citadel',
    name: 'Desert Command Citadel',
    blurb: 'Terraced stone and comms masts. The whole valley is watched from here.',
    palette: {ground: '#8a6f4a', structure: '#d9c9a3', accent: '#e2701f', roof: '#5c5148', wall: '#c2ad82'},
    starter: true,
  },
  field_workshop: {
    id: 'field_workshop',
    name: 'Field Workshop',
    blurb: 'A ramp, a roller door and room to work. Everything here runs again.',
    palette: {ground: '#5c5a52', structure: '#b7ac93', accent: '#f5a524', roof: '#6b6a63', wall: '#9a9384'},
    starter: true,
  },
  medieval_fortress: {
    id: 'medieval_fortress',
    name: 'Medieval Fortress',
    blurb: 'Six towers and a portcullis. Older than the war and unbothered by it.',
    palette: {ground: '#6e6a63', structure: '#cfcac1', accent: '#c9a227', roof: '#4a5560', wall: '#b3ada3'},
    starter: true,
  },
  rose_command_citadel: {
    id: 'rose_command_citadel',
    name: 'Rose Command Citadel',
    blurb: 'Rose quartz and gold, cut into spires. Built to be looked at.',
    palette: {ground: '#7a4a63', structure: '#f0cfd6', accent: '#d4a24a', roof: '#6b3f56', wall: '#e0b3c0'},
    starter: true,
  },
  ember_sentinel: {
    id: 'ember_sentinel',
    name: 'Ember Sentinel',
    blurb: 'A sworn guard, cast in iron. The sword has not gone out since.',
    palette: {ground: '#2b2622', structure: '#8b8178', accent: '#ff6a1f', roof: '#3a332d', wall: '#5f574e'},
    starter: false,
  },
  ravenkeep: {
    id: 'ravenkeep',
    name: 'Ravenkeep',
    blurb: 'The old keep still stands, and something still circles it.',
    palette: {ground: '#2e2a24', structure: '#c9b48a', accent: '#a855f7', roof: '#3a332a', wall: '#8f7f62'},
    starter: false,
  },
  shellwarden: {
    id: 'shellwarden',
    name: 'Shellwarden',
    blurb: 'He has carried the wall on his back since before you were posted here.',
    palette: {ground: '#2b3124', structure: '#c6b389', accent: '#e2762b', roof: '#5a4530', wall: '#7c8a4a'},
    starter: false,
  },
  // The flagship commission. Sold once, to one player, and never again.
  signature_one: {
    id: 'signature_one',
    name: 'Shadow Empress',
    blurb: 'She reigns in silence. One of one, and never sold again.',
    palette: {ground: '#1c1712', structure: '#c9a227', accent: '#f0b429', roof: '#2b2318', wall: '#8a7434'},
    starter: false,
    exclusive: true,
  },
};

/**
 * Every skin id, in catalogue order.
 *
 * Derived from the record rather than listed again, so adding a skin is one
 * edit. A second list is the bug this file was written to end.
 */
export const SKIN_IDS = Object.keys(SKIN_IDENTITY) as SkinId[];

/** Only these are selectable by a new player at signup. */
export const STARTER_SKIN_IDS: SkinId[] = SKIN_IDS.filter((id) => SKIN_IDENTITY[id].starter);

export function isSkinId(value: unknown): value is SkinId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(SKIN_IDENTITY, value);
}
