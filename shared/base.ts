/**
 * The base board.
 *
 * The inside of a base is a fixed painting of a salt-basin installation with
 * fifteen concrete pads. Buildings are art placed on pads; where a
 * building stands is the player's choice and changes nothing about what it
 * does. Placement is visual organisation only.
 *
 * Shared because the Worker validates a move (does that pad exist, is it the
 * reserved one, is that building movable) and the client draws the result,
 * and a board that the two sides describe differently is the Ravenkeep bug
 * again with pads instead of skins.
 *
 * Pad centres are normalised to the board image - x and y in 0..1 of its width
 * and height - taken from the designer's manifest. They are anchors, never
 * drawn.
 */
import type {AssetCategory} from './assets';

export const BOARD_IMAGE = '/base/board-salt-basin.webp';
/** Source pixels of the board painting; the aspect ratio is what matters. */
export const BOARD_W = 941;
export const BOARD_H = 1672;

/** The one pad that is never offered: the Command Center's. */
export const CENTRE_PAD = 'cc_01';

export interface Pad {
  id: string;
  /** Centre of the slab, as a fraction of the board's width and height. */
  x: number;
  y: number;
  /**
   * Perspective. The painting is a raking three-quarter view, so a slab at the
   * bottom of the board is drawn larger than one at the top; a building on it
   * scales the same way or it reads as a toy. 1.0 is the centre island.
   */
  scale: number;
}

/**
 * Measured from the painting, not copied from the manifest. The manifest's
 * fourteen coordinates put the centre pad on the wadi and every other pad on
 * a fence; these were found by detecting the slabs' concrete in the image.
 * The painting also has FIFTEEN slabs - the east compound holds five - so
 * there is one more pad than the manifest promised. It is naval's, later.
 */
export const PADS: readonly Pad[] = [
  {id: 'cc_01', x: 0.495, y: 0.409, scale: 1.0},
  {id: 'upper_01', x: 0.399, y: 0.13, scale: 0.8},
  {id: 'upper_02', x: 0.504, y: 0.116, scale: 0.8},
  {id: 'left_01', x: 0.241, y: 0.274, scale: 0.85},
  {id: 'left_02', x: 0.186, y: 0.338, scale: 0.9},
  {id: 'left_03', x: 0.147, y: 0.412, scale: 0.95},
  {id: 'left_04', x: 0.098, y: 0.503, scale: 1.0},
  {id: 'right_01', x: 0.789, y: 0.252, scale: 0.85},
  {id: 'right_02', x: 0.834, y: 0.312, scale: 0.9},
  {id: 'right_03', x: 0.865, y: 0.384, scale: 0.95},
  {id: 'right_04', x: 0.894, y: 0.47, scale: 1.0},
  {id: 'right_05', x: 0.905, y: 0.572, scale: 1.05},
  {id: 'lower_01', x: 0.246, y: 0.777, scale: 1.15},
  {id: 'lower_02', x: 0.479, y: 0.743, scale: 1.15},
  {id: 'lower_03', x: 0.709, y: 0.783, scale: 1.15},
] as const;

/** Width of a building's art at scale 1, as a fraction of the board width. */
export const BUILDING_WIDTH = 0.24;
/**
 * The art's bottom edge sits this far below the slab's centre (fraction of
 * board height, before the pad's scale), so a building stands on the front
 * of its slab rather than on its far edge.
 */
export const FOOT_DROP = 0.03;

export const PAD_BY_ID: Record<string, Pad> = Object.fromEntries(PADS.map((p) => [p.id, p]));

/**
 * What double-tapping a building opens. A closed set on purpose: the client
 * switches on it, and an unknown value is a building that opens nothing.
 */
export type BuildingEntry =
  | {kind: 'command_center'}
  | {kind: 'depot'}
  | {kind: 'assets'; category: AssetCategory};

export interface BoardBuilding {
  /** Stable id. Never renamed once a placement row refers to it. */
  id: string;
  /** English name; the string table carries translations keyed on the id. */
  name: string;
  /** Runtime art: 512x512, transparent, bottom-centre anchored. */
  art: string;
  movable: boolean;
  /** Art width relative to BUILDING_WIDTH. The Command Center is the big one. */
  size: number;
  /** Where it stands until the player moves it. Every default is distinct. */
  defaultPad: string;
  entry: BuildingEntry;
}

/**
 * The buildings that exist today. Seven of fourteen pads. The rest of the
 * installation - fuel, steel, munitions, alloy, storage, the operations centre,
 * the trading post - arrives as its art and its design do, one row each.
 *
 * Naval has no building until there is water on the map.
 */
export const BOARD_BUILDINGS: readonly BoardBuilding[] = [
  {
    id: 'command_center',
    name: 'Command Center',
    art: '/base/command-center.webp',
    movable: false,
    size: 1.25,
    defaultPad: CENTRE_PAD,
    entry: {kind: 'command_center'},
  },
  {
    id: 'depot',
    name: 'Depot',
    art: '/base/maintenance-depot.webp',
    movable: true,
    size: 1,
    defaultPad: 'lower_02',
    entry: {kind: 'depot'},
  },
  {
    id: 'armour_hub',
    name: 'Armour Command Tank',
    art: '/base/armour-tank.webp',
    movable: true,
    size: 1,
    defaultPad: 'left_02',
    entry: {kind: 'assets', category: 'armour'},
  },
  {
    id: 'artillery_hub',
    name: 'Artillery Command Platform',
    art: '/base/artillery-platform.webp',
    movable: true,
    size: 1,
    defaultPad: 'left_03',
    entry: {kind: 'assets', category: 'artillery'},
  },
  {
    id: 'rotary_hub',
    name: 'Rotary Wing Command Helicopter',
    art: '/base/rotary-helicopter.webp',
    movable: true,
    size: 1,
    defaultPad: 'right_02',
    entry: {kind: 'assets', category: 'rotary'},
  },
  {
    id: 'fixed_wing_hub',
    name: 'Fixed Wing Command Jet',
    art: '/base/fixed-wing-jet.webp',
    movable: true,
    size: 1,
    defaultPad: 'right_03',
    entry: {kind: 'assets', category: 'fixed_wing'},
  },
  {
    id: 'drone_hub',
    name: 'Drone Operations Aircraft',
    art: '/base/drone.webp',
    movable: true,
    size: 1,
    defaultPad: 'upper_01',
    entry: {kind: 'assets', category: 'drone'},
  },
] as const;

export const BOARD_BUILDING_BY_ID: Record<string, BoardBuilding> = Object.fromEntries(
  BOARD_BUILDINGS.map((b) => [b.id, b]),
);

export interface Placement {
  buildingId: string;
  padId: string;
}

/** Where every building stands for a player who has never moved one. */
export function defaultPlacements(): Placement[] {
  return BOARD_BUILDINGS.map((b) => ({buildingId: b.id, padId: b.defaultPad}));
}

/**
 * Stored rows over the defaults. A building added after a player last
 * arranged their base has no row, and takes its default pad - unless a moved
 * building already stands there, in which case it takes the first free pad,
 * so two buildings never draw on top of each other whatever the history.
 */
export function resolvePlacements(stored: readonly Placement[]): Placement[] {
  const byBuilding = new Map(stored.map((p) => [p.buildingId, p.padId]));
  const taken = new Set(byBuilding.values());
  const out: Placement[] = [];
  for (const b of BOARD_BUILDINGS) {
    let pad = byBuilding.get(b.id);
    if (!b.movable) pad = b.defaultPad;
    if (pad === undefined) {
      pad = taken.has(b.defaultPad)
        ? PADS.find((p) => p.id !== CENTRE_PAD && !taken.has(p.id))?.id ?? b.defaultPad
        : b.defaultPad;
      taken.add(pad);
    }
    out.push({buildingId: b.id, padId: pad});
  }
  return out;
}

/** Everything the designer's manifest promised, checked once at build time. */
export function auditBoard(): string[] {
  const faults: string[] = [];
  const pads = new Set<string>();
  for (const b of BOARD_BUILDINGS) {
    if (!PAD_BY_ID[b.defaultPad]) faults.push(`${b.id}: default pad ${b.defaultPad} does not exist`);
    if (pads.has(b.defaultPad)) faults.push(`${b.id}: default pad ${b.defaultPad} used twice`);
    pads.add(b.defaultPad);
    if (b.movable && b.defaultPad === CENTRE_PAD) faults.push(`${b.id}: movable building on the centre pad`);
    if (!b.movable && b.defaultPad !== CENTRE_PAD) faults.push(`${b.id}: fixed building off the centre pad`);
  }
  if (PADS.length !== 15) faults.push(`expected 15 pads, found ${PADS.length}`);
  return faults;
}
