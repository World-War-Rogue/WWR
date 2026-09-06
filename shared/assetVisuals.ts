/**
 * What an asset looks like at a Service Rank.
 *
 * Every asset has six looks, unlocked at ranks 1, 10, 20, 30, 40 and 50 -
 * once per season, as decided. Package upgrades change no visuals. The look
 * is the front three-quarter hero of that stage; the 360 turntable comes
 * later from the same art, and this module will grow a frame count then.
 *
 * Art is a file per asset per stage under public/assets/<id>/r<rank>.webp.
 * Only assets listed in ART_READY have files; everything else draws its
 * silhouette icon until its art lands, which is how art ships one asset at
 * a time without a code change: drop the six files, add the id here.
 */
export const STAGE_RANKS = [1, 10, 20, 30, 40, 50] as const;
export type StageRank = (typeof STAGE_RANKS)[number];

/** The highest stage a rank has reached. */
export function visualStage(level: number): StageRank {
  let stage: StageRank = 1;
  for (const r of STAGE_RANKS) if (level >= r) stage = r;
  return stage;
}

/** The next stage after this rank, or null at the top. */
export function nextVisualStage(level: number): StageRank | null {
  for (const r of STAGE_RANKS) if (level < r) return r;
  return null;
}

/** Assets whose six stage files exist. Add an id when its art is in. */
export const ART_READY: ReadonlySet<string> = new Set(['m1a2']);

export function assetArtUrl(assetId: string, level: number): string | null {
  if (!ART_READY.has(assetId)) return null;
  return `/assets/${assetId}/r${String(visualStage(level)).padStart(2, '0')}.webp`;
}
