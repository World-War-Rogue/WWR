/**
 * Seasonal terrain.
 *
 * The map's ground is generated, never stored. Terrain is a pure function of
 * (world, season, plot), so every player sees identical ground with no rows in
 * the database and no bytes over the wire - and a new season is a data change
 * rather than a migration.
 *
 * Season 1, The Dry Basin, is a drained inland sea: salt flats at the centre,
 * ochre dunes around them, dry riverbeds cutting through, and a basalt rim at
 * the edge of the world.
 */

export type Biome = 'salt' | 'sand' | 'wadi' | 'scrub' | 'rock' | 'water' | 'ice' | 'forest';

export interface SeasonSpec {
  id: number;
  name: string;
  subtitle: string;
  /** Drawn beyond the edge of the playable world. */
  voidColor: string;
  biomes: Record<Biome, {fill: string; alt: string; detail: string}>;
  /** Radii, as a fraction of world extent, where each band gives way to the next. */
  bands: {inner: number; middle: number};
}

export const SEASONS: Record<number, SeasonSpec> = {
  1: {
    id: 1,
    name: 'Operation Sandstorm',
    subtitle: 'The Dry Basin',
    voidColor: '#0a0906',
    bands: {inner: 0.10, middle: 0.68},
    biomes: {
      salt: {fill: '#d9d2c0', alt: '#cfc7b3', detail: '#b9b0999'},
      sand: {fill: '#a8834e', alt: '#9d7a49', detail: '#c19a63'},
      wadi: {fill: '#6d5433', alt: '#654d2f', detail: '#8a6b42'},
      scrub: {fill: '#7d7a45', alt: '#736f40', detail: '#9aa05a'},
      rock: {fill: '#2f2a24', alt: '#3a342c', detail: '#4a4238'},
      water: {fill: '#1f6f73', alt: '#1a5f63', detail: '#37a0a2'},
      ice: {fill: '#cfe3ea', alt: '#c2d8e0', detail: '#e8f4f8'},
      forest: {fill: '#3f5a32', alt: '#37502c', detail: '#557a42'},
    },
  },
};

export const DEFAULT_SEASON = 1;

/** Hash-based value noise. Deterministic, cheap, and needs no tables. */
function hash2(x: number, y: number, seed: number): number {
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
function fbm(x: number, y: number, seed: number): number {
  return valueNoise(x, y, seed) * 0.65 + valueNoise(x * 2.3, y * 2.3, seed + 991) * 0.35;
}

export interface TerrainCell {
  biome: Biome;
  /** 0..1, drives the subtle per-plot shade variation that stops ground looking tiled. */
  shade: number;
  /** True on a rare feature plot: an oasis, or a wreck on the flats. */
  feature: 'oasis' | 'wreck' | null;
}

/**
 * Ground at a plot.
 *
 * Bands are radial - a drained sea is flat in the middle and rocky at the rim -
 * with noise pushing the boundaries around so they never read as circles.
 */
export function terrainAt(worldId: number, season: number, extent: number, x: number, y: number): TerrainCell {
  const seed = worldId * 31 + season * 7919;
  const distance = Math.sqrt(x * x + y * y) / Math.max(1, extent);
  const spec = SEASONS[season] ?? SEASONS[DEFAULT_SEASON];

  const warp = (fbm(x * 0.035, y * 0.035, seed) - 0.5) * 0.22;
  const banded = distance + warp;

  const detail = fbm(x * 0.11, y * 0.11, seed + 17);
  const shade = fbm(x * 0.5, y * 0.5, seed + 404);

  // Dry riverbeds: a ridged noise band, so they read as channels rather than blobs.
  const river = Math.abs(fbm(x * 0.045, y * 0.045, seed + 3301) - 0.5);
  const isWadi = river < 0.035 && banded > spec.bands.inner * 0.6;

  let biome: Biome;
  if (banded < spec.bands.inner) biome = 'salt';
  else if (banded < spec.bands.middle) biome = detail > 0.62 ? 'scrub' : 'sand';
  else biome = detail > 0.55 ? 'rock' : 'sand';

  if (isWadi && biome !== 'rock') biome = 'wadi';

  // Features are sparse and deterministic: an oasis in the dunes, a stranded
  // wreck out on the flats where the water left it.
  let feature: TerrainCell['feature'] = null;

  // Oases are sampled on a coarse grid so one hit spreads over neighbouring
  // plots. A lone watered plot reads as a map marker; a cluster reads as a
  // place worth fighting over.
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
    feature = 'wreck';
  }

  return {biome, shade, feature};
}

export function seasonSpec(season: number): SeasonSpec {
  return SEASONS[season] ?? SEASONS[DEFAULT_SEASON];
}
