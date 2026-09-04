/**
 * How an asset is drawn, at every size it is drawn at.
 *
 * Three places need a picture of an asset and they are not the same problem:
 *
 *   - the roster card, around 64px, browsed at leisure
 *   - the map, as small as 12px, moving, seen among fifty other things
 *   - a battle, in the middle, where facing and category decide the reading
 *
 * A single image cannot serve all three. Art that reads on a card is grey mud
 * at map scale, and a sprite that reads at map scale is a smudge on a card.
 * This is the same lesson the base skins taught: below 42px per plot the map
 * stops drawing art and paints a solid allegiance colour, because at that size
 * the only question is whose it is.
 *
 * So the picture is layered the same way. Underneath, a CATEGORY SILHOUETTE
 * drawn from vector paths - free, sharp at any size, identical in the browser
 * and on the canvas, and impossible to get wrong legally. Over the top, per
 * asset art if and when it is bought, exactly the way `SkinArt` sits over the
 * drawn recipe for a base.
 *
 * The silhouettes are TOP-DOWN, because that is the view the map uses and the
 * map is the view that cannot compromise. A top-down tank still reads as a
 * tank on a card; a three-quarter tank does not read as anything from above.
 *
 * They are deliberately generic. A tank shape is a tank shape; nothing here
 * traces a specific vehicle, which keeps the catalogue clear of the design
 * rights that the real machines carry.
 *
 * All paths are drawn in a 24x24 box, pointing UP, so the map can rotate them
 * to a heading with one transform and everything else can ignore that.
 */
import type {AssetCategory, AssetRole} from './assets';

/**
 * Why the shapes are what they are: at sixteen pixels only the outline
 * survives, so each category has to differ in gross form rather than detail.
 * A disc, a delta, a box, a hull and a cross are distinguishable when they are
 * eight pixels across. Six variations on a rectangle are not.
 */
export const CATEGORY_PATH: Record<AssetCategory, string> = {
  // Wide hull with tracks either side, round turret, short barrel. The tracks
  // are the signature - nothing else in the set has parallel bars flanking it,
  // and WIDTH is what tells it apart from the ship at fourteen pixels. The
  // first attempt at this was tall and narrow and read as a bottle.
  armour:
    'M5.5 7 L8 7 L8 21 L5.5 21 Z M16 7 L18.5 7 L18.5 21 L16 21 Z M8 8 L16 8 L16 20 L8 20 Z M12 9.5 a3.2 3.2 0 1 1 -0.01 0 Z M11.1 2 L12.9 2 L12.9 10 L11.1 10 Z',

  // The rotor disc is the whole identity - nothing else on the map is a circle.
  rotary:
    'M12 4 a7 7 0 1 0 0.01 0 Z M11 8 L13 8 L13 17 L15 20 L9 20 L11 17 Z',

  // Swept delta. Sharp nose, wings back, unmistakable against a disc or a box.
  fixed_wing: 'M12 2 L14 10 L21 15 L21 17 L13 15 L13 19 L16 21 L8 21 L11 19 L11 15 L3 17 L3 15 L10 10 Z',

  // A launcher box, angled up and back, sitting on a chassis. Reads as tubes.
  artillery:
    'M6 21 L6 16 L18 16 L18 21 Z M8 15 L8 8 L10 8 L10 15 Z M11 15 L11 6 L13 6 L13 15 Z M14 15 L14 8 L16 8 L16 15 Z',

  // Long straight wing, thin body. Deliberately spindly - drones are cheap and
  // should look it beside a tank.
  drone: 'M11.2 3 L12.8 3 L12.8 10 L22 12 L22 13.5 L12.8 13 L12.8 19 L15 21 L9 21 L11.2 19 L11.2 13 L2 13.5 L2 12 L11.2 10 Z',

  // Long, narrow, full height: wedge bow, parallel sides, flat stern, with two
  // sponsons. The aspect ratio is the tell - it is the thinnest thing in the
  // set, which is what keeps it from reading as the tank when both are twelve
  // pixels of vertical shape.
  naval:
    'M12 1 L14.3 7 L14.3 20 L13.6 23 L10.4 23 L9.7 20 L9.7 7 Z M14.3 11 L17.5 12.4 L17.5 13.6 L14.3 13.6 Z M9.7 11 L6.5 12.4 L6.5 13.6 L9.7 13.6 Z',
};

/**
 * A mark laid over the silhouette to say what the asset is FOR.
 *
 * Category answers "what is it", role answers "what does it do", and on the
 * map the second question is the one that decides whether you engage. Kept to
 * marks that survive being four pixels across: a dot, a ring, a bar, a chevron.
 */
export const ROLE_MARK: Record<AssetRole, string> = {
  breach: 'M12 9 L15 15 L9 15 Z',
  screen: 'M12 8 L16 12 L12 16 L8 12 Z',
  strike: 'M13 8 L9 13 L11.5 13 L11 16 L15 11 L12.5 11 Z',
  overwatch: 'M12 8 L13 11 L16 12 L13 13 L12 16 L11 13 L8 12 L11 11 Z',
  recon: 'M12 8.5 a3.5 3.5 0 1 1 -0.01 0 Z M12 10.5 a1.5 1.5 0 1 0 0.01 0 Z',
  lift: 'M9 10 L15 10 L15 11.5 L9 11.5 Z M9 13 L15 13 L15 14.5 L9 14.5 Z',
};

/**
 * Category colour, used where allegiance is not the question.
 *
 * On the map an asset takes its owner's allegiance colour, because there the
 * only question is whose it is - the same rule the bases follow. On a roster
 * card everything belongs to the player, so the colour is free to say what the
 * thing is instead.
 */
export const CATEGORY_COLOUR: Record<AssetCategory, string> = {
  armour: '#c2703f',
  rotary: '#4fa8ff',
  fixed_wing: '#8b9dc3',
  artillery: '#e0a03c',
  drone: '#4fd1a5',
  naval: '#6c8ebf',
};
