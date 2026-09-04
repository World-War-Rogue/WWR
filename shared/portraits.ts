/**
 * Player portraits.
 *
 * A portrait is a glyph and a tint, not an uploaded image. Shared by the
 * Worker and the client so neither can offer something the other cannot draw.
 *
 * Why chosen rather than uploaded. An upload needs somewhere to put the bytes,
 * server-side resizing the Workers runtime cannot do, and - the part that is
 * not a technical problem and does not go away - somebody looking at every
 * image before other players see it. A game with a picture next to every name
 * is a game with a moderation queue. This gets a portrait next to every name
 * today, sharp at any size, with nothing to host and nothing to review.
 *
 * If uploads arrive later they slot in as another portrait kind; the profile
 * does not change shape.
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
