/**
 * The base board.
 *
 * The inside of a base is a fixed painting of a salt-basin installation with
 * fourteen identical concrete pads. Buildings are art placed on pads; where a
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
  x: number;
  y: number;
}

export const PADS: readonly Pad[] = [
  {id: 'cc_01', x: 0.5, y: 0.45},
  {id: 'upper_01', x: 0.38, y: 0.14},
  {id: 'upper_02', x: 0.62, y: 0.14},
  {id: 'left_01', x: 0.21, y: 0.28},
  {id: 'left_02', x: 0.21, y: 0.39},
  {id: 'left_03', x: 0.21, y: 0.5},
  {id: 'left_04', x: 0.21, y: 0.61},
  {id: 'right_01', x: 0.79, y: 0.28},
  {id: 'right_02', x: 0.79, y: 0.39},
  {id: 'right_03', x: 0.79, y: 0.5},
  {id: 'right_04', x: 0.79, y: 0.61},
  {id: 'lower_01', x: 0.24, y: 0.76},
  {id: 'lower_02', x: 0.5, y: 0.75},
  {id: 'lower_03', x: 0.76, y: 0.76},
] as const;

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
    defaultPad: CENTRE_PAD,
    entry: {kind: 'command_center'},
  },
  {
    id: 'depot',
    name: 'Depot',
    art: '/base/maintenance-depot.webp',
    movable: true,
    defaultPad: 'lower_02',
    entry: {kind: 'depot'},
  },
  {
    id: 'armour_hub',
    name: 'Armour Command Tank',
    art: '/base/armour-tank.webp',
    movable: true,
    defaultPad: 'left_02',
    entry: {kind: 'assets', category: 'armour'},
  },
  {
    id: 'artillery_hub',
    name: 'Artillery Command Platform',
    art: '/base/artillery-platform.webp',
    movable: true,
    defaultPad: 'left_03',
    entry: {kind: 'assets', category: 'artillery'},
  },
  {
    id: 'rotary_hub',
    name: 'Rotary Wing Command Helicopter',
    art: '/base/rotary-helicopter.webp',
    movable: true,
    defaultPad: 'right_02',
    entry: {kind: 'assets', category: 'rotary'},
  },
  {
    id: 'fixed_wing_hub',
    name: 'Fixed Wing Command Jet',
    art: '/base/fixed-wing-jet.webp',
    movable: true,
    defaultPad: 'right_03',
    entry: {kind: 'assets', category: 'fixed_wing'},
  },
  {
    id: 'drone_hub',
    name: 'Drone Operations Aircraft',
    art: '/base/drone.webp',
    movable: true,
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
  if (PADS.length !== 14) faults.push(`expected 14 pads, found ${PADS.length}`);
  return faults;
}
