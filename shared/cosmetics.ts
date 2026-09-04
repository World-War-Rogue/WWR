/**
 * The cosmetics catalogue.
 *
 * Shared verbatim by the Worker and the client. It holds no DOM types and no
 * drawing code - only data - so the same file compiles under the Worker's
 * strict, DOM-free config and under the client's. That is the point: the
 * server decides what a player may equip and the client decides how it looks,
 * and if those two ever disagreed about what exists, a player would equip
 * something that renders as nothing.
 *
 * Why layers instead of whole skins. A skin is one commission and one SKU, and
 * two players who buy the same one are indistinguishable - which is the thing
 * a player is actually paying to avoid. Four slots of seven, six and seven
 * options multiply out to 2,058 visible combinations from a fraction of the
 * art, and every one of them is legible to a neighbour on the map.
 *
 * Nothing here touches power. A banner does not make a base harder to take.
 */

export type CosmeticSlot = 'banner' | 'emblem' | 'lights' | 'decal';

export const COSMETIC_SLOTS: CosmeticSlot[] = ['banner', 'emblem', 'lights', 'decal'];

export const SLOT_LABEL: Record<CosmeticSlot, string> = {
  banner: 'Banner',
  emblem: 'Emblem',
  lights: 'Perimeter lights',
  decal: 'Ground marking',
};

export const SLOT_BLURB: Record<CosmeticSlot, string> = {
  banner: 'Flown above the compound. The first thing a neighbour sees.',
  emblem: 'Your mark. Carried on the banner and painted on the pad.',
  lights: 'The colour your perimeter burns after dark.',
  decal: 'Painted onto the compound floor.',
};

/** Banner cloth patterns. The painter switches on this. */
export type BannerPattern = 'none' | 'solid' | 'split' | 'chevron' | 'bars';

/** Emblem glyphs, drawn as vector shapes rather than loaded as images. */
export type EmblemGlyph = 'none' | 'star' | 'wolf' | 'skull' | 'phoenix' | 'crown' | 'trident';

/** Ground markings. */
export type DecalMark = 'none' | 'pad' | 'chevrons' | 'grid' | 'scorch' | 'stripes' | 'compass';

export interface BannerConfig {
  kind: 'banner';
  pattern: BannerPattern;
  primary: string;
  secondary: string;
}

export interface EmblemConfig {
  kind: 'emblem';
  glyph: EmblemGlyph;
  color: string;
}

export interface LightsConfig {
  kind: 'lights';
  color: string;
  /** 0..1 - how far the glow carries. Brighter lights read from further out. */
  reach: number;
}

export interface DecalConfig {
  kind: 'decal';
  mark: DecalMark;
  color: string;
  /** 0..1 - paint opacity. Worn markings sit lower than fresh ones. */
  opacity: number;
}

export type CosmeticConfig = BannerConfig | EmblemConfig | LightsConfig | DecalConfig;

export interface CosmeticItem {
  id: string;
  slot: CosmeticSlot;
  name: string;
  blurb: string;
  /**
   * Price in credits. Zero means every player owns it without a row in
   * player_cosmetics - see ownership in worker/cosmetics.ts. Prices are
   * provisional; nothing sells them yet.
   */
  price: number;
  config: CosmeticConfig;
  /**
   * A one-of-one. At most one account may ever own it, enforced by a unique
   * index rather than by remembering not to sell it twice. Nothing in the
   * catalogue is exclusive yet; the first one will be a commissioned base.
   */
  exclusive?: boolean;
}

function banner(
  id: string,
  name: string,
  blurb: string,
  price: number,
  pattern: BannerPattern,
  primary: string,
  secondary: string,
): CosmeticItem {
  return {id, slot: 'banner', name, blurb, price, config: {kind: 'banner', pattern, primary, secondary}};
}

function emblem(
  id: string,
  name: string,
  blurb: string,
  price: number,
  glyph: EmblemGlyph,
  color: string,
): CosmeticItem {
  return {id, slot: 'emblem', name, blurb, price, config: {kind: 'emblem', glyph, color}};
}

function lights(
  id: string,
  name: string,
  blurb: string,
  price: number,
  color: string,
  reach: number,
): CosmeticItem {
  return {id, slot: 'lights', name, blurb, price, config: {kind: 'lights', color, reach}};
}

function decal(
  id: string,
  name: string,
  blurb: string,
  price: number,
  mark: DecalMark,
  color: string,
  opacity: number,
): CosmeticItem {
  return {id, slot: 'decal', name, blurb, price, config: {kind: 'decal', mark, color, opacity}};
}

/**
 * Every cosmetic in the game.
 *
 * Ordered free-first within each slot, because that is the order the
 * customisation screen shows them in and a player should meet what they
 * already own before what they do not.
 */
export const COSMETICS: CosmeticItem[] = [
  // Banners -----------------------------------------------------------------
  banner('banner_none', 'No banner', 'Fly nothing. Some prefer not to be read.', 0, 'none', '#000', '#000'),
  banner('banner_olive', 'Olive Standard', 'Issue cloth. Faded by the sun within a week.', 0, 'solid', '#5c6b3f', '#3f4a2c'),
  banner('banner_sand', 'Sand Standard', 'The colour of everything else out here.', 0, 'solid', '#c2a878', '#8f7a52'),
  banner('banner_slate', 'Slate Standard', 'Grey on grey. Hard to place, which is the idea.', 0, 'solid', '#6a7178', '#464c52'),
  banner('banner_ember', 'Ember Split', 'Half black, half burning. Not subtle.', 900, 'split', '#e0521f', '#1b1a18'),
  banner('banner_chevron', 'Gold Chevron', 'A single stripe, gold on black. Earned or bought.', 1200, 'chevron', '#0f0f0e', '#e2b23c'),
  banner('banner_crimson', 'Crimson Bars', 'Three bars. Read at a distance, which is the point.', 1200, 'bars', '#a3182b', '#f0e6dc'),

  // Emblems -----------------------------------------------------------------
  emblem('emblem_none', 'No emblem', 'An unmarked flag.', 0, 'none', '#ffffff'),
  emblem('emblem_star', 'Star', 'Five points. The oldest mark there is.', 0, 'star', '#f5f0e6'),
  emblem('emblem_wolf', 'Wolf', 'A head in profile. Common, and still effective.', 0, 'wolf', '#e8e4dc'),
  emblem('emblem_skull', 'Skull', 'Unambiguous.', 0, 'skull', '#f2ede4'),
  emblem('emblem_phoenix', 'Phoenix', 'Wings up. For a base that has been levelled before.', 1000, 'phoenix', '#f0932b'),
  emblem('emblem_crown', 'Crown', 'Worn by whoever is willing to defend it.', 1400, 'crown', '#e2b23c'),
  emblem('emblem_trident', 'Trident', 'Three prongs. A naval affectation, inland.', 1000, 'trident', '#5ec8e5'),

  // Perimeter lights --------------------------------------------------------
  lights('lights_amber', 'Amber', 'Standard sodium. Warm, and cheap to run.', 0, '#ffb347', 0.5),
  lights('lights_white', 'Halogen', 'White and unforgiving. Nothing crosses unlit.', 0, '#f4f7ff', 0.55),
  lights('lights_red', 'Blackout Red', 'Low red. Preserves night vision on the wall.', 0, '#ff4d4d', 0.4),
  lights('lights_azure', 'Azure', 'Cold blue. Reads as money from three plots out.', 800, '#4fa8ff', 0.7),
  lights('lights_violet', 'Violet', 'No tactical justification whatsoever.', 900, '#b06cff', 0.7),
  lights('lights_viridian', 'Viridian', 'Green wash across the bastion walls.', 800, '#39e08a', 0.65),

  // Ground markings ---------------------------------------------------------
  decal('decal_none', 'Bare ground', 'Packed dirt. Nothing painted.', 0, 'none', '#000', 0),
  decal('decal_pad', 'Landing Pad', 'A cross and a circle. Functional, and it shows.', 0, 'pad', '#e8e2d4', 0.5),
  decal('decal_chevrons', 'Approach Chevrons', 'Painted at the gate. Slows people down.', 0, 'chevrons', '#e0c15a', 0.45),
  decal('decal_grid', 'Survey Grid', 'Someone measured this ground before building on it.', 0, 'grid', '#cfd6d9', 0.28),
  decal('decal_scorch', 'Scorch Ring', 'Left by something that landed harder than intended.', 700, 'scorch', '#2b241d', 0.6),
  decal('decal_stripes', 'Tiger Stripes', 'Loud. Visible from the far edge of the viewport.', 1100, 'stripes', '#f0932b', 0.6),
  decal('decal_compass', 'Compass Rose', 'Sixteen points, painted properly. A vanity.', 1300, 'compass', '#e6ded0', 0.5),
];

export const COSMETICS_BY_ID: Record<string, CosmeticItem> = Object.fromEntries(
  COSMETICS.map((item) => [item.id, item]),
);

export function itemsInSlot(slot: CosmeticSlot): CosmeticItem[] {
  return COSMETICS.filter((item) => item.slot === slot);
}

export type Loadout = Record<CosmeticSlot, string>;

/** What a base wears before its owner has chosen anything. Matches the column defaults in 0005. */
export const DEFAULT_LOADOUT: Loadout = {
  banner: 'banner_none',
  emblem: 'emblem_none',
  lights: 'lights_amber',
  decal: 'decal_none',
};

/** True when the id names a real item that belongs in that slot. */
export function isItemInSlot(slot: CosmeticSlot, id: unknown): id is string {
  return typeof id === 'string' && COSMETICS_BY_ID[id]?.slot === slot;
}

/**
 * Coerces whatever came out of the database into a loadout that renders.
 *
 * A row written before an item was retired - or by a client sending nonsense -
 * falls back to the slot default rather than drawing nothing, because a base
 * that silently loses a layer looks like a bug in someone else's game.
 */
export function normaliseLoadout(raw: Partial<Record<CosmeticSlot, unknown>>): Loadout {
  const out = {...DEFAULT_LOADOUT};
  for (const slot of COSMETIC_SLOTS) {
    if (isItemInSlot(slot, raw[slot])) out[slot] = raw[slot] as string;
  }
  return out;
}

/** Items every player owns without a row: the free tier. */
export const FREE_ITEM_IDS: string[] = COSMETICS.filter((item) => item.price === 0).map((i) => i.id);
