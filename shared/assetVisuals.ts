/**
 * What an asset looks like at a Service Rank.
 *
 * Every asset has six looks, unlocked at ranks 1, 10, 20, 30, 40 and 50 -
 * once per season, as decided. Package upgrades change no visuals. The look
 * is the front three-quarter hero of that stage; the 360 turntable comes
 * later from the same art, and this module will grow a frame count then.
 *
 * Art is a file per asset per stage under public/assets/<id>/r<rank>.webp.
 * Only stages listed in ART_STAGES have files; everything else draws its
 * silhouette icon until its art lands, which is how art ships one asset at
 * a time without a code change: drop the files, list the stages here.
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

/**
 * The stages each asset has files for. Art lands a few stages at a time -
 * ranks 1/10/20 first, the rest later - so an asset can be partly done: it
 * draws the highest stage it has at or below the rank, and the upgrade
 * screen previews the next stage only when that file exists.
 */
export const ART_STAGES: Readonly<Record<string, readonly StageRank[]>> = {
  m1a2: [1, 10, 20, 30, 40, 50],
  leclerc: [1, 10, 20, 30, 40, 50],
  f35a: [1, 10, 20, 30, 40, 50],
  rq4: [1, 10, 20, 30, 40, 50],
  m270a2: [1, 10, 20, 30, 40, 50],
  mi35m: [1, 10, 20, 30, 40, 50],
  akinci: [1, 10, 20, 30, 40, 50],
  k2: [1, 10, 20, 30, 40, 50],
  ch47f: [1, 10, 20, 30, 40, 50],
  f15ex: [1, 10, 20, 30, 40, 50],
  merkava: [1, 10, 20],
  phl191: [1, 10, 20],
  su57: [1, 10, 20, 30, 40, 50],
};

function stageFile(assetId: string, stage: StageRank): string {
  return `/assets/${assetId}/r${String(stage).padStart(2, '0')}.webp`;
}

/** The art an asset shows at a rank: its highest delivered stage at or below it. */
export function assetArtUrl(assetId: string, level: number): string | null {
  const stages = ART_STAGES[assetId];
  if (!stages || stages.length === 0) return null;
  const want = visualStage(level);
  let best: StageRank | null = null;
  for (const s of stages) if (s <= want && (best === null || s > best)) best = s;
  return best === null ? null : stageFile(assetId, best);
}

/** The art for exactly this stage, or null if that stage has not been drawn yet. */
export function assetStageArtUrl(assetId: string, stage: StageRank): string | null {
  return ART_STAGES[assetId]?.includes(stage) ? stageFile(assetId, stage) : null;
}
