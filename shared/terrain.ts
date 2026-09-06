/**
 * The ground.
 *
 * Terrain is generated, never stored: a pure function of (seed, position), so
 * every player sees identical ground with no rows in the database and no bytes
 * over the wire, and a new season is a data change rather than a migration.
 *
 * ── Why this moved into shared/ ───────────────────────────────────────────
 *
 * It used to live in `src/live/terrain.ts` and be client-only, which was right
 * while terrain was decoration. It is not decoration any more: some props block
 * base placement, so the WORKER has to reach the same answer as the browser
 * about what is standing on a plot. Two copies of that would disagree eventually
 * - it is the same shape as the duplicated skin catalogue that made Ravenkeep
 * invisible, and the same shape as the second counter table that told players
 * artillery beat armour while the resolver disagreed.
 *
 * So the deterministic half lives here and both sides import it. Painting stays
 * in `src/live/`; this file is data and arithmetic only.
 *
 * Season 1, The Dry Basin, is a drained inland sea: salt flats at the centre,
 * ochre dunes around them, dry riverbeds cutting through, and a basalt rim at
 * the edge of the world.
 */

export type Biome = 'salt' | 'sand' | 'wadi' | 'scrub' | 'rock' | 'water' | 'ice' | 'forest';

/** Radii, as a fraction of world extent, where each band gives way to the next. */
export const BANDS = {inner: 0.10, middle: 0.68} as const;

/* -------------------------------------------------------------------------- */
/* Noise                                                                      */
/* -------------------------------------------------------------------------- */

/** Hash-based value noise. Deterministic, cheap, and needs no tables. */
export function hash2(x: number, y: number, seed: number): number {
  let h = x * 374761393 + y * 668265263 + seed * 2147483647;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

function valueNoise(x: number, y: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const a = hash2(xi, yi, seed);
  const b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed);
  const d = hash2(xi + 1, yi + 1, seed);
  const u = smooth(xf);
  const v = smooth(yf);
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}

/** Two octaves is enough for ground read at map scale and stays cheap per tile. */
export function fbm(x: number, y: number, seed: number): number {
  return valueNoise(x, y, seed) * 0.65 + valueNoise(x * 2.3, y * 2.3, seed + 991) * 0.35;
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Smooth 0..1 ramp between two thresholds. Reversed when a > b. */
export function between(a: number, b: number, t: number): number {
  if (a === b) return t < a ? 0 : 1;
  return smooth(clamp01((t - a) / (b - a)));
}

/* -------------------------------------------------------------------------- */
/* Seeds                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * The seed a world used before it had one of its own.
 *
 * Terrain seeds are stored on the world from migration 0020 onward, so that a
 * world's layout can be re-rolled without changing its identity, and so that a
 * change to the generator cannot move a rock shelf under somebody's base. This
 * reproduces the original derivation exactly, and is what an existing world is
 * back-filled with, so nothing already on the map moves.
 */
export function legacyTerrainSeed(worldId: number, season: number): number {
  return worldId * 31 + season * 7919;
}

/**
 * The generator version a world was built with.
 *
 * Stored per world. Placement branches on it, so improving the generator gives
 * new worlds better terrain and leaves existing ones exactly as they are. There
 * is one version today; the point is that there is somewhere for the second one
 * to go that is not "everybody's map changes on Tuesday".
 */
export const TERRAIN_VERSION = 1;

/* -------------------------------------------------------------------------- */
/* Ground                                                                     */
/* -------------------------------------------------------------------------- */

export interface Ground {
  /** How much of each biome this point is. Sums to roughly one. */
  salt: number;
  sand: number;
  scrub: number;
  rock: number;
  /** Dry wash, overlaid on whatever is beneath it. */
  wadi: number;
  /** Distance from the centre with the band warp applied, 0 at the middle. */
  banded: number;
}

/**
 * The ground at a point, as blended weights rather than one label.
 *
 * Takes floats, not plot integers. The old `terrainAt` sampled this same noise
 * once per plot and painted a hard square, which threw away every bit of detail
 * between plot centres and is why the map read as a grid. Sampling continuously
 * is what lets a wash cross a plot boundary without a staircase in it.
 */
export function groundAt(seed: number, extent: number, x: number, y: number): Ground {
  const distance = Math.sqrt(x * x + y * y) / Math.max(1, extent);
  const warp = (fbm(x * 0.035, y * 0.035, seed) - 0.5) * 0.22;
  const banded = distance + warp;
  const detail = fbm(x * 0.11, y * 0.11, seed + 17);

  const salt = 1 - between(BANDS.inner - 0.055, BANDS.inner + 0.055, banded);
  const rock =
    between(BANDS.middle - 0.10, BANDS.middle + 0.08, banded) * between(0.44, 0.60, detail);
  const scrub = (1 - salt) * (1 - rock) * between(0.55, 0.70, detail);
  const sand = Math.max(0, 1 - salt - rock - scrub);

  const river = Math.abs(fbm(x * 0.045, y * 0.045, seed + 3301) - 0.5);
  const wadi = between(0.05, 0.014, river) * (banded > BANDS.inner * 0.6 ? 1 : 0.25);

  return {salt, sand, scrub, rock, wadi, banded};
}

/**
 * Abandoned infrastructure, as a field.
 *
 * Long sinuous routes across the basin, from ridged noise on its own seed - the
 * same trick the dry washes use, at a different frequency. Industrial props are
 * gated on it so pipes, pylons and containers follow the roads and power lines
 * that used to be here, rather than being sprinkled evenly over the whole map.
 *
 * Evenly scattered industry is the thing that makes a generated world look
 * generated.
 */
export function corridorAt(seed: number, x: number, y: number): number {
  const ridge = Math.abs(fbm(x * 0.028, y * 0.028, seed + 5501) - 0.5);
  return between(0.075, 0.018, ridge);
}

/* -------------------------------------------------------------------------- */
/* Per-plot, for the things that still want one answer                        */
/* -------------------------------------------------------------------------- */

export interface TerrainCell {
  biome: Biome;
  /** 0..1, drives the subtle per-plot shade variation. */
  shade: number;
  /** True on a rare feature plot: an oasis, or a wreck on the flats. */
  feature: 'oasis' | 'wreck' | null;
}

/**
 * Ground at a plot, as a single label.
 *
 * Kept because a few callers legitimately want one answer for one plot, and
 * because the stranded freighter on the salt flats lives here. Painting should
 * use `groundAt` instead.
 */
export function terrainAt(
  worldId: number,
  season: number,
  extent: number,
  x: number,
  y: number,
): TerrainCell {
  const seed = legacyTerrainSeed(worldId, season);
  const distance = Math.sqrt(x * x + y * y) / Math.max(1, extent);

  const warp = (fbm(x * 0.035, y * 0.035, seed) - 0.5) * 0.22;
  const banded = distance + warp;

  const detail = fbm(x * 0.11, y * 0.11, seed + 17);
  const shade = fbm(x * 0.5, y * 0.5, seed + 404);

  const river = Math.abs(fbm(x * 0.045, y * 0.045, seed + 3301) - 0.5);
  const isWadi = river < 0.035 && banded > BANDS.inner * 0.6;

  let biome: Biome;
  if (banded < BANDS.inner) biome = 'salt';
  else if (banded < BANDS.middle) biome = detail > 0.62 ? 'scrub' : 'sand';
  else biome = detail > 0.55 ? 'rock' : 'sand';

  if (isWadi && biome !== 'rock') biome = 'wadi';

  let feature: TerrainCell['feature'] = null;

  const ox = Math.floor(x / 3);
  const oy = Math.floor(y / 3);
  if (biome === 'sand' && hash2(ox, oy, seed + 8081) > 0.988) {
    const edge = hash2(x, y, seed + 6060);
    if (edge > 0.25) {
      biome = 'water';
      feature = 'oasis';
    } else {
      biome = 'forest';
    }
  } else if (biome === 'salt' && hash2(x, y, seed + 3131) > 0.997) {
    // The freighter the sea left behind. The one thing allowed on the flats:
    // the salt pan is meant to read empty, and this is the landmark that
    // explains what the basin used to be.
    feature = 'wreck';
  }

  return {biome, shade, feature};
}
