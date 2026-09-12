/**
 * What is standing on the ground, and what a base may be built on.
 *
 * Placement is a pure function of (seed, version, position). Nothing is stored,
 * nothing is sent, and the Worker and the browser reach the same answer from
 * the same code - which is the point, because some of these block base
 * placement and the server has to decide that without trusting anybody.
 *
 * ── The scale fact that shapes all of this ────────────────────────────────
 *
 * A plot is a whole base. So blocking is whole-plot whether we like it or not,
 * and a pylon that is physically far smaller than a base still costs a full
 * base site when it blocks one. That makes DENSITY the thing to control, and
 * it is controlled by construction rather than by hope: blocking props are
 * drawn from a nine-by-nine candidate lattice, so at most one in eighty-one
 * plots anchors one, and habitat gating narrows it much further.
 *
 * Note the ceiling is per PROP, not per blocked plot - a two-plot footprint
 * blocks two. The first pass got that wrong and quoted a ceiling it then
 * exceeded, which is exactly why `npm run terrain` measures what actually lands
 * and fails the build if it drifts past the budget.
 */
import {
  type Ground,
  TERRAIN_VERSION,
  between,
  corridorAt,
  groundAt,
  hash2,
} from './terrain';
import {PROP_FRAMES} from './terrainAtlas';

/* -------------------------------------------------------------------------- */
/* Classes                                                                    */
/* -------------------------------------------------------------------------- */

export type PropClass =
  | 'vegetation'
  | 'scatter'
  | 'rock'
  | 'industrial'
  | 'wreck'
  | 'structure'
  | 'fortification';

/**
 * Which classes stop a base being built on the plot.
 *
 * Blocking is a property of the CLASS, never of the individual prop, and that
 * is deliberate: batch two brings mech wrecks, guard towers, cranes, barriers
 * and siege debris, and every one of them blocks by declaring what it is. One
 * line changes here, not twelve rows in a table somebody has to remember to
 * update.
 */
export const BLOCKING_CLASSES: ReadonlySet<PropClass> = new Set<PropClass>([
  'rock',
  'industrial',
  'wreck',
  'structure',
  'fortification',
]);

export const blocks = (cls: PropClass): boolean => BLOCKING_CLASSES.has(cls);

/* -------------------------------------------------------------------------- */
/* The catalogue                                                              */
/* -------------------------------------------------------------------------- */

export interface PropHabitat {
  /** Weight per biome. A prop appears where its habitat is strong. */
  salt?: number;
  sand?: number;
  scrub?: number;
  rock?: number;
  /** Wants the edge of a dry wash. */
  wadi?: number;
  /** Needs abandoned infrastructure this strong, 0..1. Industrial props only. */
  corridor?: number;
  /** How often a qualifying site actually gets one, 0..1. */
  rarity: number;
}

export interface TerrainProp {
  id: string;
  cls: PropClass;
  /**
   * Drawn width, in plots.
   *
   * A readability number, not a realism one. A thorn bush is about a metre and
   * a plot is a whole base compound, so at true scale it would be a pixel and a
   * half at normal zoom. Every map in this genre exaggerates prop scale and
   * this one is no exception - what matters is that the relative sizes are
   * honest, so a tree reads as taller than a bush and a pylon towers over both.
   */
  span: number;
  /** Where the object meets the ground, as a fraction of its frame. */
  anchor: {x: number; y: number};
  /** Logical blocking size in plots. Never the image's pixel bounds. */
  footprint: {w: number; h: number};
  /** Culled below this many pixels per plot. */
  minZoom: number;
  habitat: PropHabitat;
}

export const PROPS: TerrainProp[] = [
  // Vegetation. Sparse and hardy - this is a drained sea, not a savannah.
  {
    id: 'hardy_tree_a',
    cls: 'vegetation',
    span: 0.58,
    anchor: {x: 0.5, y: 0.97},
    footprint: {w: 1, h: 1},
    minZoom: 34,
    habitat: {scrub: 1, sand: 0.25, wadi: 0.6, rarity: 0.05},
  },
  {
    id: 'hardy_tree_b',
    cls: 'vegetation',
    span: 0.60,
    anchor: {x: 0.5, y: 0.97},
    footprint: {w: 1, h: 1},
    minZoom: 34,
    habitat: {scrub: 1, sand: 0.25, wadi: 0.6, rarity: 0.05},
  },
  {
    id: 'hardy_tree_c',
    cls: 'vegetation',
    span: 0.66,
    anchor: {x: 0.5, y: 0.96},
    footprint: {w: 1, h: 1},
    minZoom: 34,
    habitat: {scrub: 1, sand: 0.2, wadi: 0.7, rarity: 0.04},
  },
  {
    id: 'thorn_brush_a',
    cls: 'vegetation',
    span: 0.34,
    anchor: {x: 0.5, y: 0.95},
    footprint: {w: 1, h: 1},
    minZoom: 42,
    habitat: {scrub: 1, sand: 0.5, rarity: 0.30},
  },
  {
    id: 'thorn_brush_b',
    cls: 'vegetation',
    span: 0.30,
    anchor: {x: 0.5, y: 0.94},
    footprint: {w: 1, h: 1},
    minZoom: 42,
    habitat: {scrub: 1, sand: 0.6, rarity: 0.30},
  },
  {
    id: 'thorn_brush_c',
    cls: 'vegetation',
    span: 0.32,
    anchor: {x: 0.5, y: 0.94},
    footprint: {w: 1, h: 1},
    minZoom: 42,
    habitat: {scrub: 1, sand: 0.55, rarity: 0.28},
  },
  {
    id: 'dry_grass_a',
    cls: 'vegetation',
    span: 0.30,
    anchor: {x: 0.5, y: 0.94},
    footprint: {w: 1, h: 1},
    minZoom: 60,
    habitat: {wadi: 1, scrub: 0.7, sand: 0.3, rarity: 0.34},
  },
  {
    id: 'dry_grass_b',
    cls: 'vegetation',
    span: 0.28,
    anchor: {x: 0.5, y: 0.93},
    footprint: {w: 1, h: 1},
    minZoom: 60,
    habitat: {wadi: 1, scrub: 0.7, sand: 0.3, rarity: 0.34},
  },
  // Scatter. Debris too low and too broken to build around.
  {
    id: 'scrap_pile_b',
    cls: 'scatter',
    span: 0.62,
    anchor: {x: 0.5, y: 0.9},
    footprint: {w: 1, h: 1},
    minZoom: 42,
    habitat: {sand: 1, scrub: 0.6, corridor: 0.25, rarity: 0.22},
  },

  // Rock. Rough ground and wash edges, where the basin shows its bones.
  {
    id: 'boulder_cluster_a',
    cls: 'rock',
    span: 0.52,
    anchor: {x: 0.5, y: 0.93},
    footprint: {w: 1, h: 1},
    minZoom: 26,
    habitat: {rock: 1, wadi: 0.7, sand: 0.15, rarity: 0.24},
  },
  {
    id: 'sandstone_shelf_a',
    cls: 'rock',
    span: 0.95,
    anchor: {x: 0.5, y: 0.82},
    footprint: {w: 1, h: 1},
    minZoom: 20,
    habitat: {rock: 1, wadi: 0.5, rarity: 0.20},
  },
  {
    id: 'sandstone_shelf_b',
    cls: 'rock',
    span: 1.70,
    anchor: {x: 0.5, y: 0.82},
    footprint: {w: 2, h: 1},
    minZoom: 20,
    habitat: {rock: 1, wadi: 0.4, rarity: 0.12},
  },

  // Industrial. Follows the corridors - roads and power lines that used to be
  // here - rather than scattering evenly, which is what makes a generated world
  // look generated.
  {
    id: 'power_pylon_a',
    cls: 'industrial',
    span: 0.46,
    anchor: {x: 0.5, y: 0.98},
    footprint: {w: 1, h: 1},
    minZoom: 20,
    habitat: {sand: 1, scrub: 0.8, rock: 0.5, corridor: 0.55, rarity: 0.40},
  },
  {
    id: 'power_pylon_b',
    cls: 'industrial',
    span: 0.90,
    anchor: {x: 0.5, y: 0.9},
    footprint: {w: 1, h: 1},
    minZoom: 20,
    habitat: {sand: 1, scrub: 0.8, rock: 0.5, corridor: 0.5, rarity: 0.16},
  },
  {
    id: 'rusted_pipe_run_a',
    cls: 'industrial',
    span: 1.50,
    anchor: {x: 0.5, y: 0.86},
    footprint: {w: 2, h: 1},
    minZoom: 26,
    habitat: {sand: 1, scrub: 0.7, rock: 0.4, corridor: 0.5, rarity: 0.24},
  },
  {
    id: 'cargo_container_a',
    cls: 'industrial',
    span: 0.60,
    anchor: {x: 0.5, y: 0.9},
    footprint: {w: 1, h: 1},
    minZoom: 30,
    habitat: {sand: 1, scrub: 0.6, corridor: 0.6, rarity: 0.26},
  },
  {
    id: 'cargo_container_b',
    cls: 'industrial',
    span: 0.64,
    anchor: {x: 0.5, y: 0.9},
    footprint: {w: 1, h: 1},
    minZoom: 30,
    habitat: {sand: 1, scrub: 0.6, corridor: 0.6, rarity: 0.20},
  },
  {
    id: 'fuel_drums_a',
    cls: 'industrial',
    span: 0.44,
    anchor: {x: 0.5, y: 0.92},
    footprint: {w: 1, h: 1},
    minZoom: 34,
    habitat: {sand: 1, scrub: 0.6, corridor: 0.55, rarity: 0.24},
  },
  {
    id: 'cable_spool_a',
    cls: 'industrial',
    span: 0.40,
    anchor: {x: 0.5, y: 0.93},
    footprint: {w: 1, h: 1},
    minZoom: 34,
    habitat: {sand: 1, scrub: 0.6, corridor: 0.6, rarity: 0.20},
  },
  {
    id: 'scrap_pile_a',
    cls: 'industrial',
    span: 0.56,
    anchor: {x: 0.5, y: 0.92},
    footprint: {w: 1, h: 1},
    minZoom: 34,
    habitat: {sand: 1, scrub: 0.7, rock: 0.4, corridor: 0.4, rarity: 0.26},
  },
];

export const PROP_BY_ID: Record<string, TerrainProp> = Object.fromEntries(
  PROPS.map((p) => [p.id, p]),
);

/** Only props whose art actually made it into the atlas can be placed. */
export const PLACEABLE = PROPS.filter((p) => PROP_FRAMES[p.id] !== undefined);
const SCATTER = PLACEABLE.filter((p) => !blocks(p.cls));
const BLOCKERS = PLACEABLE.filter((p) => blocks(p.cls));

/* -------------------------------------------------------------------------- */
/* Placement                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * One candidate blocking prop per nine-by-nine block of plots.
 *
 * This is the density budget, expressed as code rather than as an intention.
 * Eighty-one plots anchor at most one blocking prop, and since the largest
 * footprint covers two the hard ceiling is one blocked plot in forty. Habitat
 * gating takes the realised figure far below that.
 *
 * Nine is where the audit stopped arguing. Six gave 4.25% in the worst local
 * window against a 2% budget; eight, with the rock props thinned, still gave
 * 2.25%. Both failures were out in the deep field where rough ground and
 * infrastructure corridors overlap and nobody will build for a long time - and
 * the budget was tightened rather than scoped to the inhabited rings, because a
 * constraint that moves when it is inconvenient is not a constraint.
 */
export const BLOCK_CELL = 9;

/** How far, in plots, a footprint can reach beyond its anchor. */
const MAX_REACH = 1;

export interface PlacedProp {
  prop: TerrainProp;
  /** Plot the prop is anchored in. */
  px: number;
  py: number;
  /** Where inside that plot it stands, 0..1. */
  ox: number;
  oy: number;
  /** Deterministic per-prop variation. */
  flip: boolean;
  tint: number;
}

/** How well a site suits a prop, 0..1. */
function suits(h: PropHabitat, g: Ground, corridor: number): number {
  if (h.corridor !== undefined && corridor < h.corridor) return 0;
  let fit = 0;
  if (h.salt) fit += h.salt * g.salt;
  if (h.sand) fit += h.sand * g.sand;
  if (h.scrub) fit += h.scrub * g.scrub;
  if (h.rock) fit += h.rock * g.rock;
  if (h.wadi) fit += h.wadi * g.wadi;
  return Math.min(1, fit);
}

/**
 * The salt pan stays empty.
 *
 * A decision rather than a side effect: the centre of the map is meant to read
 * as bare, and the only thing standing on it is the freighter the sea left,
 * which `terrainAt` generates as a feature rather than as a prop.
 */
function onSaltPan(g: Ground): boolean {
  return g.salt > 0.5;
}

/**
 * The blocking prop anchored in a lattice cell, if any.
 *
 * Deterministic from the seed, the version and the cell - so the same world
 * always grows the same rock shelf in the same place, through a refresh, a
 * reconnect and a deploy.
 */
function blockerInCell(
  seed: number,
  version: number,
  extent: number,
  cellX: number,
  cellY: number,
): PlacedProp | null {
  if (BLOCKERS.length === 0) return null;
  const s = seed + version * 7717;

  // Where in the cell it stands. Jittered, so blocking props do not sit on a
  // visible six-plot grid of their own - which would be the old fault back in
  // a new costume.
  const px = cellX * BLOCK_CELL + Math.floor(hash2(cellX, cellY, s + 61) * BLOCK_CELL);
  const py = cellY * BLOCK_CELL + Math.floor(hash2(cellX, cellY, s + 137) * BLOCK_CELL);
  if (Math.abs(px) > extent || Math.abs(py) > extent) return null;

  const g = groundAt(seed, extent, px + 0.5, py + 0.5);
  if (onSaltPan(g)) return null;
  const corridor = corridorAt(seed, px + 0.5, py + 0.5);

  // Pick among the blockers this site suits, weighted.
  let total = 0;
  const weights: number[] = [];
  for (const p of BLOCKERS) {
    const w = suits(p.habitat, g, corridor) * p.habitat.rarity;
    weights.push(w);
    total += w;
  }
  if (total <= 0) return null;

  // One roll decides whether anything stands here at all, so the lattice cap
  // holds: `total` is the chance this cell is used.
  const roll = hash2(cellX, cellY, s + 909);
  if (roll > Math.min(1, total)) return null;

  let pick = hash2(cellX, cellY, s + 2027) * total;
  let chosen = BLOCKERS[BLOCKERS.length - 1];
  for (let i = 0; i < BLOCKERS.length; i += 1) {
    pick -= weights[i];
    if (pick <= 0) {
      chosen = BLOCKERS[i];
      break;
    }
  }

  return {
    prop: chosen,
    px,
    py,
    ox: 0.5,
    oy: 0.55,
    flip: hash2(px, py, s + 4041) > 0.5,
    tint: hash2(px, py, s + 5051),
  };
}

/**
 * Every blocking prop whose footprint could cover this plot.
 *
 * Checks the cell the plot sits in and its western and northern neighbours,
 * because a footprint extends east and south from its anchor by at most one
 * plot. Four cells, not the whole map.
 */
function blockersNear(
  seed: number,
  version: number,
  extent: number,
  x: number,
  y: number,
): PlacedProp[] {
  const cx = Math.floor(x / BLOCK_CELL);
  const cy = Math.floor(y / BLOCK_CELL);
  const out: PlacedProp[] = [];
  for (let dx = -MAX_REACH; dx <= 0; dx += 1) {
    for (let dy = -MAX_REACH; dy <= 0; dy += 1) {
      const found = blockerInCell(seed, version, extent, cx + dx, cy + dy);
      if (found) out.push(found);
    }
  }
  return out;
}

/**
 * Is this plot obstructed?
 *
 * The whole reason placement lives in `shared/`. The Worker calls this when a
 * player confirms a move and never trusts the client's answer; the client calls
 * the same function to grey the plot out beforehand, which is a courtesy rather
 * than the check - the same relationship the squad screen already has with the
 * lift budget.
 *
 * Note what this does NOT consider: whether a base is standing there. Occupancy
 * is live database state and belongs to the caller. A plot holding a base draws
 * no prop and is not blocked by one, which is what stops this landing on top of
 * a player who was already there.
 */
export function blockedAt(
  seed: number,
  version: number,
  extent: number,
  x: number,
  y: number,
): boolean {
  for (const placed of blockersNear(seed, version, extent, x, y)) {
    const {w, h} = placed.prop.footprint;
    if (x >= placed.px && x < placed.px + w && y >= placed.py && y < placed.py + h) {
      return true;
    }
  }
  return false;
}

/** Which prop is obstructing, for a message that says something useful. */
export function blockerAt(
  seed: number,
  version: number,
  extent: number,
  x: number,
  y: number,
): TerrainProp | null {
  for (const placed of blockersNear(seed, version, extent, x, y)) {
    const {w, h} = placed.prop.footprint;
    if (x >= placed.px && x < placed.px + w && y >= placed.py && y < placed.py + h) {
      return placed.prop;
    }
  }
  return null;
}

/**
 * Everything standing in one plot, for painting.
 *
 * Blocking props come from the lattice; vegetation and scatter are sampled per
 * plot across three independent slots, so a plot can carry a little clutter
 * without any of it being guaranteed.
 */
export function propsInPlot(
  seed: number,
  version: number,
  extent: number,
  x: number,
  y: number,
): PlacedProp[] {
  if (Math.abs(x) > extent || Math.abs(y) > extent) return [];
  const out: PlacedProp[] = [];
  const s = seed + version * 7717;

  const blocker = blockerInCell(
    seed,
    version,
    extent,
    Math.floor(x / BLOCK_CELL),
    Math.floor(y / BLOCK_CELL),
  );
  if (blocker && blocker.px === x && blocker.py === y) out.push(blocker);

  if (SCATTER.length > 0) {
    const g = groundAt(seed, extent, x + 0.5, y + 0.5);
    if (!onSaltPan(g)) {
      const corridor = corridorAt(seed, x + 0.5, y + 0.5);
      for (let slot = 0; slot < 3; slot += 1) {
        let total = 0;
        const weights: number[] = [];
        for (const p of SCATTER) {
          const w = suits(p.habitat, g, corridor) * p.habitat.rarity;
          weights.push(w);
          total += w;
        }
        if (total <= 0) break;
        const roll = hash2(x * 7 + slot, y * 13 + slot * 31, s + 2200);
        if (roll > Math.min(0.85, total)) continue;

        let pick = hash2(x + slot * 97, y - slot * 57, s + 3300) * total;
        let chosen = SCATTER[SCATTER.length - 1];
        for (let i = 0; i < SCATTER.length; i += 1) {
          pick -= weights[i];
          if (pick <= 0) {
            chosen = SCATTER[i];
            break;
          }
        }
        out.push({
          prop: chosen,
          px: x,
          py: y,
          ox: 0.15 + hash2(x + slot * 11, y + slot * 23, s + 4400) * 0.7,
          oy: 0.2 + hash2(x - slot * 19, y + slot * 41, s + 5500) * 0.7,
          flip: hash2(x + slot, y - slot, s + 6600) > 0.5,
          tint: hash2(x - slot, y + slot, s + 7700),
        });
      }
    }
  }

  // Painted back to front, so something standing further down the screen is
  // drawn in front of what is behind it.
  return out.sort((a, b) => a.oy - b.oy);
}

/** Default version, for callers that predate the stored one. */
export const DEFAULT_TERRAIN_VERSION = TERRAIN_VERSION;

/** Weakest zoom at which anything at all is worth drawing. */
export const MIN_PROP_ZOOM = Math.min(...PLACEABLE.map((p) => p.minZoom));

/** Smooth fade as a prop's zoom threshold is crossed, so nothing pops in. */
export function propFade(prop: TerrainProp, zoom: number): number {
  return between(prop.minZoom, prop.minZoom + 14, zoom);
}
