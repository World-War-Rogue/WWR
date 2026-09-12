/**
 * Seasonal palette.
 *
 * The generator itself moved to `shared/terrain.ts` when terrain stopped being
 * decoration: some props block base placement, so the Worker has to reach the
 * same answer as the browser about what is standing on a plot, and two copies of
 * that arithmetic would disagree eventually. This file is what is left - the
 * colours and the season's name, which only the client has any use for.
 *
 * Nothing here is duplicated from shared. The types and the generator are
 * re-exported so existing imports keep working and there is still exactly one
 * implementation.
 */
export {
  type Biome,
  type TerrainCell,
  BANDS,
  corridorAt,
  groundAt,
  legacyTerrainSeed,
  terrainAt,
  TERRAIN_VERSION,
} from '../../shared/terrain';

import type {Biome} from '../../shared/terrain';

export interface SeasonSpec {
  id: number;
  name: string;
  subtitle: string;
  /** Drawn beyond the edge of the playable world. */
  voidColor: string;
  biomes: Record<Biome, {fill: string; alt: string; detail: string}>;
}

/**
 * Season 1, The Dry Basin: a drained inland sea.
 *
 * These colours are the fallback and the legend, not the ground. The ground is
 * painted per pixel from blended weights and a lit height field in
 * `src/live/terrainPaint.ts`, which is what stopped the map reading as a grid of
 * two-tone squares.
 */
export const SEASONS: Record<number, SeasonSpec> = {
  1: {
    id: 1,
    name: 'Operation Sandstorm',
    subtitle: 'The Dry Basin',
    voidColor: '#0a0906',
    biomes: {
      salt: {fill: '#e3ddc9', alt: '#d9d2c0', detail: '#c7bfa9'},
      sand: {fill: '#c6ac7e', alt: '#bda473', detail: '#d8c49c'},
      wadi: {fill: '#9a8259', alt: '#7a6746', detail: '#b09a72'},
      scrub: {fill: '#9a9668', alt: '#8d8a5e', detail: '#aeaa7c'},
      rock: {fill: '#b08a60', alt: '#9c7a54', detail: '#c9a179'},
      water: {fill: '#1f6f73', alt: '#1a5f63', detail: '#37a0a2'},
      ice: {fill: '#cfe3ea', alt: '#c2d8e0', detail: '#e8f4f8'},
      forest: {fill: '#3f5a32', alt: '#37502c', detail: '#557a42'},
    },
  },
};

export const DEFAULT_SEASON = 1;

export function seasonSpec(season: number): SeasonSpec {
  return SEASONS[season] ?? SEASONS[DEFAULT_SEASON];
}
