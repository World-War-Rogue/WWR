/**
 * The Alliance Convoy's art manifest.
 *
 * The five cargo trucks are static art, one file each, drawn in column order
 * 1..5. The Guardian's Vanguard and Rear Guard are NOT baked here: they are
 * whatever six assets the Guardian chose, drawn at runtime from the ordinary
 * asset art (shared/assetVisuals.ts) or the vector silhouette when an asset
 * has no art yet. So the formation on the map is the alliance's real escort,
 * never a generic stand-in.
 */
export const CONVOY_TRUCK_COUNT = 5;

/** The cargo truck art, indexed 0..4 for trucks 1..5. */
export function convoyTruckUrl(truck: number): string {
  const n = Math.max(1, Math.min(CONVOY_TRUCK_COUNT, truck + 1));
  return `/assets/alliance-convoy/convoy-truck-0${n}.webp`;
}

export const CONVOY_TRUCK_URLS: readonly string[] = Array.from({length: CONVOY_TRUCK_COUNT}, (_, i) => convoyTruckUrl(i));
