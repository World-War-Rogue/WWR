/**
 * The base board.
 *
 * The inside of a base is a fixed painting of a salt-basin installation -
 * board v4 - with nineteen identical concrete pads. Buildings are art placed
 * on pads; where a building stands is the player's choice and changes nothing
 * about what it does. Placement is visual organisation only.
 *
 * Shared because the Worker validates a move (does that pad exist, may a
 * building stand on it, is that building movable) and the client draws the
 * result, and a board the two sides describe differently is the Ravenkeep bug
 * again with pads instead of skins.
 *
 * Every pad is the same size and faces the camera, so every building is drawn
 * at the same width with no rotation and no per-pad scale. That is what makes
 * "any building on any pad" true rather than approximately true, and it is
 * why v1's tilted, perspective pads were replaced.
 *
 * Pad centres are the designer's v4 manifest, checked against the painting
 * (every one lands on its slab). Fractions of the board's width and height.
 */
import type {AssetCategory} from './assets';

export const BOARD_IMAGE = '/base/board-v4.webp';
/** Source pixels of the board painting; the aspect ratio is what matters. */
export const BOARD_W = 1080;
export const BOARD_H = 1920;

/** Every pad is this size, as a fraction of the board. 190 x 120 px. */
export const PAD_W = 190 / BOARD_W;
export const PAD_H = 120 / BOARD_H;

/**
 * Building art is exported so its pedestal spans 0.94 of the canvas width;
 * drawn at this width, the pedestal is exactly one pad wide.
 */
export const ART_W = PAD_W / 0.94;

export type PadZone =
  /** A general department pad. */
  | 'pad'
  /** The east flight line: five pads, the asset buildings' home by default. */
  | 'runway'
  /** The Task Force line outside the southern gate. Not a building pad. */
  | 'taskforce';

export interface Pad {
  id: string;
  x: number;
  y: number;
  zone: PadZone;
}

export const PADS: readonly Pad[] = [
  {id: 'upper_01', x: 0.25, y: 0.119792, zone: 'pad'},
  {id: 'upper_02', x: 0.75, y: 0.119792, zone: 'pad'},
  {id: 'left_01', x: 0.160185, y: 0.280208, zone: 'pad'},
  {id: 'left_02', x: 0.160185, y: 0.4, zone: 'pad'},
  {id: 'left_03', x: 0.160185, y: 0.519792, zone: 'pad'},
  {id: 'left_04', x: 0.160185, y: 0.640104, zone: 'pad'},
  {id: 'right_01', x: 0.839815, y: 0.2, zone: 'runway'},
  {id: 'right_02', x: 0.839815, y: 0.319792, zone: 'runway'},
  {id: 'right_03', x: 0.839815, y: 0.440104, zone: 'runway'},
  {id: 'right_04', x: 0.839815, y: 0.559896, zone: 'runway'},
  {id: 'right_05', x: 0.839815, y: 0.680208, zone: 'runway'},
  {id: 'lower_01', x: 0.2, y: 0.759896, zone: 'pad'},
  {id: 'lower_02', x: 0.4, y: 0.759896, zone: 'pad'},
  {id: 'lower_03', x: 0.6, y: 0.759896, zone: 'pad'},
  {id: 'lower_04', x: 0.8, y: 0.759896, zone: 'pad'},
  {id: 'tf_01', x: 0.2, y: 0.940104, zone: 'taskforce'},
  {id: 'tf_02', x: 0.4, y: 0.940104, zone: 'taskforce'},
  {id: 'tf_03', x: 0.6, y: 0.940104, zone: 'taskforce'},
  {id: 'tf_04', x: 0.8, y: 0.940104, zone: 'taskforce'},
] as const;

export const PAD_BY_ID: Record<string, Pad> = Object.fromEntries(PADS.map((p) => [p.id, p]));

/** May a building be dropped here? The Task Force line is not a building pad. */
export function padTakesBuildings(padId: string): boolean {
  const pad = PAD_BY_ID[padId];
  return !!pad && pad.zone !== 'taskforce';
}

/** The Task Force line, in order: which pad shows which Task Force. */
export const TASK_FORCE_PADS: readonly {padId: string; squad: string}[] = [
  {padId: 'tf_01', squad: 'Alpha'},
  {padId: 'tf_02', squad: 'Bravo'},
  {padId: 'tf_03', squad: 'Charlie'},
  {padId: 'tf_04', squad: 'Delta'},
];

/**
 * The Command Center is painted INTO the board at the top centre. It is not
 * on a pad and has no art of its own; this is where it is, so it can be
 * tapped and named like everything else. Fractions of the board.
 */
export const COMMAND_CENTER_BOX = {
  x: 375 / BOARD_W,
  y: 7 / BOARD_H,
  w: 330 / BOARD_W,
  h: 330 / BOARD_H,
};

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
  /**
   * Runtime art: 512 wide, transparent, bottom-centre anchored, pedestal at
   * 0.94 of the width. Any height. Nothing is rotated or scaled per pad.
   */
  art: string;
  /** Where it stands until the player moves it. Every default is distinct. */
  defaultPad: string;
  entry: BuildingEntry;
}

export const COMMAND_CENTER_ID = 'command_center';
export const COMMAND_CENTER_ENTRY: BuildingEntry = {kind: 'command_center'};

/**
 * The movable buildings that exist today: the Depot and the five asset
 * buildings. The rest of the installation - fuel, steel, munitions, alloy,
 * storage, the operations centre, the trading post - arrives as its art and
 * its design do, one row each. Naval has no building until there is water.
 */
export const BOARD_BUILDINGS: readonly BoardBuilding[] = [
  {
    id: 'depot',
    name: 'Depot',
    art: '/base/maintenance-depot.webp',
    defaultPad: 'lower_02',
    entry: {kind: 'depot'},
  },
  {
    id: 'armour_hub',
    name: 'Armour Building',
    art: '/base/building-armour.webp',
    defaultPad: 'right_01',
    entry: {kind: 'assets', category: 'armour'},
  },
  {
    id: 'artillery_hub',
    name: 'Missile Building',
    art: '/base/building-artillery.webp',
    defaultPad: 'right_02',
    entry: {kind: 'assets', category: 'artillery'},
  },
  {
    id: 'rotary_hub',
    name: 'Helicopter Building',
    art: '/base/building-rotary.webp',
    defaultPad: 'right_03',
    entry: {kind: 'assets', category: 'rotary'},
  },
  {
    id: 'fixed_wing_hub',
    name: 'Fixed-Wing Building',
    art: '/base/building-fixed-wing.webp',
    defaultPad: 'right_04',
    entry: {kind: 'assets', category: 'fixed_wing'},
  },
  {
    id: 'drone_hub',
    name: 'Drone Building',
    art: '/base/building-drone.webp',
    defaultPad: 'right_05',
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
 * Stored rows over the defaults. Rows for buildings that no longer exist (the
 * v1 board stored the Command Center on a pad) and rows on pads that no
 * longer take buildings are ignored. A building with no usable row takes its
 * default pad - unless something already stands there, in which case it takes
 * the first free pad, so two buildings never draw on top of each other
 * whatever the history.
 */
export function resolvePlacements(stored: readonly Placement[]): Placement[] {
  const byBuilding = new Map<string, string>();
  for (const p of stored) {
    if (BOARD_BUILDING_BY_ID[p.buildingId] && padTakesBuildings(p.padId)) {
      byBuilding.set(p.buildingId, p.padId);
    }
  }
  const taken = new Set(byBuilding.values());
  const out: Placement[] = [];
  for (const b of BOARD_BUILDINGS) {
    let pad = byBuilding.get(b.id);
    if (pad === undefined) {
      pad = taken.has(b.defaultPad)
        ? PADS.find((p) => padTakesBuildings(p.id) && !taken.has(p.id))?.id ?? b.defaultPad
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
    if (!padTakesBuildings(b.defaultPad)) faults.push(`${b.id}: default pad ${b.defaultPad} takes no buildings`);
    if (pads.has(b.defaultPad)) faults.push(`${b.id}: default pad ${b.defaultPad} used twice`);
    pads.add(b.defaultPad);
  }
  if (PADS.length !== 19) faults.push(`expected 19 pads, found ${PADS.length}`);
  if (PADS.filter((p) => p.zone === 'taskforce').length !== 4) faults.push('expected 4 Task Force pads');
  for (const tf of TASK_FORCE_PADS) {
    if (PAD_BY_ID[tf.padId]?.zone !== 'taskforce') faults.push(`${tf.padId} is not a Task Force pad`);
  }
  return faults;
}
