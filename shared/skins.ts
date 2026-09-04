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
  | 'desert_fob'
  | 'arctic_station'
  | 'jungle_outpost'
  | 'urban_garrison'
  | 'custom_one'
  | 'custom_two'
  | 'ember_sentinel'
  | 'ravenkeep'
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
  desert_fob: {
    id: 'desert_fob',
    name: 'Desert FOB',
    blurb: 'HESCO barriers and sand berms. Built fast, holds hard.',
    palette: {ground: '#b08248', structure: '#d9c39a', accent: '#e07a29', roof: '#8d6636', wall: '#c9ac78'},
    starter: true,
  },
  arctic_station: {
    id: 'arctic_station',
    name: 'Arctic Station',
    blurb: 'Radar domes above the treeline. Nothing crosses unseen.',
    palette: {ground: '#9fb6c6', structure: '#e8f1f6', accent: '#3fa9d6', roof: '#7d97a8', wall: '#cddde6'},
    starter: true,
  },
  jungle_outpost: {
    id: 'jungle_outpost',
    name: 'Jungle Outpost',
    blurb: 'Camouflage netting and raised platforms. Hard to find.',
    palette: {ground: '#4e6b3a', structure: '#7b8f5c', accent: '#9fd356', roof: '#3c5430', wall: '#5f7a45'},
    starter: true,
  },
  urban_garrison: {
    id: 'urban_garrison',
    name: 'Urban Garrison',
    blurb: 'Blast walls and concrete. A city block turned strongpoint.',
    palette: {ground: '#6b6b6b', structure: '#9aa0a6', accent: '#d64545', roof: '#4f5155', wall: '#8a9096'},
    starter: true,
  },
  // Not offered at signup. Reserved for skins under test.
  custom_one: {
    id: 'custom_one',
    name: 'Custom I',
    blurb: 'Awaiting reference art. Motion is live.',
    palette: {ground: '#5b4b6e', structure: '#b9a7d0', accent: '#c084fc', roof: '#413352', wall: '#8f7cab'},
    starter: false,
  },
  custom_two: {
    id: 'custom_two',
    name: 'Custom II',
    blurb: 'Awaiting reference art. Motion is live.',
    palette: {ground: '#6e5b3a', structure: '#d6c08a', accent: '#facc15', roof: '#4d3f27', wall: '#a89066'},
    starter: false,
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
