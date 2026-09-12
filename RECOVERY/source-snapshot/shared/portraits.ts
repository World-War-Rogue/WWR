/**
 * Player portraits.
 *
 * A portrait is a glyph and a tint, not an uploaded image. Shared by the
 * Worker and the client so neither can offer something the other cannot draw.
 *
 * There are two kinds and every player always has one: an uploaded picture
 * when they have set one, and otherwise a glyph on a tint. That fallback is
 * why a new account has a portrait from its first second rather than a grey
 * circle waiting to be filled, and why deleting a picture is safe.
 *
 * All resizing happens in the browser. The Workers runtime has no image
 * library, so a server accepting originals would be storing whatever came off
 * a phone camera - four megabytes to draw at 88 pixels. The client crops to a
 * square, scales to PORTRAIT_SIZE and encodes; the server's job is to check
 * that what arrived is the size and format it claims to be.
 */

export const PORTRAIT_GLYPHS = [
  'star',
  'wolf',
  'skull',
  'phoenix',
  'crown',
  'trident',
] as const;

export type PortraitGlyph = (typeof PORTRAIT_GLYPHS)[number];

export interface PortraitTint {
  id: string;
  name: string;
  /** Behind the glyph. */
  background: string;
  /** The glyph itself. Kept light against every background below. */
  ink: string;
}

export const PORTRAIT_TINTS: PortraitTint[] = [
  {id: 'ember', name: 'Ember', background: '#7c2d12', ink: '#fed7aa'},
  {id: 'ash', name: 'Ash', background: '#3f3f46', ink: '#e4e4e7'},
  {id: 'moss', name: 'Moss', background: '#14532d', ink: '#bbf7d0'},
  {id: 'deep', name: 'Deep', background: '#1e3a8a', ink: '#bfdbfe'},
  {id: 'wine', name: 'Wine', background: '#7f1d1d', ink: '#fecaca'},
  {id: 'iris', name: 'Iris', background: '#4c1d95', ink: '#ddd6fe'},
  {id: 'brass', name: 'Brass', background: '#78350f', ink: '#fde68a'},
  {id: 'slate', name: 'Slate', background: '#1e293b', ink: '#cbd5e1'},
];

export const PORTRAIT_TINTS_BY_ID: Record<string, PortraitTint> = Object.fromEntries(
  PORTRAIT_TINTS.map((t) => [t.id, t]),
);

export const DEFAULT_PORTRAIT = {glyph: 'star' as PortraitGlyph, tint: 'ember'};

export function isPortraitGlyph(value: unknown): value is PortraitGlyph {
  return typeof value === 'string' && (PORTRAIT_GLYPHS as readonly string[]).includes(value);
}

export function isPortraitTint(value: unknown): value is string {
  return typeof value === 'string' && value in PORTRAIT_TINTS_BY_ID;
}

/** The longest a motto may be. One line, not a biography. */
export const MOTTO_MAX = 80;


/* -------------------------------------------------------------------------- */
/* Uploaded portraits                                                         */
/* -------------------------------------------------------------------------- */

/**
 * What the file picker accepts.
 *
 * HEIC is deliberately absent. iPhones shoot it by default but browsers cannot
 * decode it, so offering it would mean a picker that accepts a file and then
 * fails on it. Choosing from the iOS photo library hands over a JPEG, which is
 * the path that actually works.
 */
export const PORTRAIT_ACCEPT = 'image/jpeg,image/png,image/webp';

/** The square the browser scales a crop down to before uploading. */
export const PORTRAIT_SIZE = 256;

/**
 * Ceiling on what the server will store, after encoding.
 *
 * A 256px WebP at good quality lands near 20KB, so this leaves generous room
 * for a busy photograph while keeping a profile fetch to one quick response.
 */
export const PORTRAIT_MAX_BYTES = 96 * 1024;

/** Ceiling on the original file, checked before the browser tries to decode it. */
export const PORTRAIT_MAX_SOURCE_BYTES = 16 * 1024 * 1024;

export const PORTRAIT_MIMES = ['image/webp', 'image/jpeg'] as const;
export type PortraitMime = (typeof PORTRAIT_MIMES)[number];
