/**
 * Building an asset. ONBOARDING, SHIELDS & CONSTRUCTION v1 §1.
 *
 * A blueprint opens on its week and is BUILT, not handed out: one asset at
 * a time per player, at its category's building, which must be at least the
 * level of the unlock week. The six starters are owned at signup and skip
 * all of this. Timers are absolute and cannot be bought down.
 */
import {type AssetCategory, ASSET_BY_ID} from './assets';
import {type BuildingLevels, type LevelledBuilding, type Resources, HUB_OF_CATEGORY} from './buildings';
import {STARTER_ASSETS, seasonWeek, unlockWeekOf} from './season';

export interface BuildSpec {
  cost: Resources;
  ms: number;
}

/** One cost and timer per category for all of Season 1. */
export const BUILD_BY_CATEGORY: Record<Exclude<AssetCategory, 'naval'>, BuildSpec> = {
  armour: {cost: {fuel: 800, steel: 2400, munitions: 900, alloy: 500}, ms: 6 * 3_600_000},
  artillery: {cost: {fuel: 700, steel: 600, munitions: 2400, alloy: 900}, ms: 5.5 * 3_600_000},
  fixed_wing: {cost: {fuel: 2200, steel: 700, munitions: 900, alloy: 1200}, ms: 7 * 3_600_000},
  rotary: {cost: {fuel: 1600, steel: 650, munitions: 700, alloy: 1800}, ms: 6.5 * 3_600_000},
  drone: {cost: {fuel: 900, steel: 450, munitions: 700, alloy: 2400}, ms: 5 * 3_600_000},
};

export function buildSpec(assetId: string): BuildSpec | null {
  const asset = ASSET_BY_ID[assetId];
  if (!asset || asset.category === 'naval') return null;
  return BUILD_BY_CATEGORY[asset.category];
}

export function isStarter(assetId: string): boolean {
  return (STARTER_ASSETS as readonly string[]).includes(assetId);
}

/** The building an asset is built at; null for naval. */
export function builtAt(assetId: string): LevelledBuilding | null {
  const asset = ASSET_BY_ID[assetId];
  return asset ? HUB_OF_CATEGORY[asset.category] : null;
}

/** The category building level a blueprint needs: its unlock week. */
export function levelNeeded(assetId: string): number {
  return unlockWeekOf(assetId) ?? Number.POSITIVE_INFINITY;
}

export type BuildState =
  | {kind: 'locked'; week: number}
  | {kind: 'needs_level'; building: LevelledBuilding; level: number}
  | {kind: 'ready'; building: LevelledBuilding; spec: BuildSpec}
  | {kind: 'unbuildable'};

/** Why an unowned asset cannot be built right now, or that it can. */
export function buildState(assetId: string, levels: BuildingLevels, now: number): BuildState {
  const week = unlockWeekOf(assetId);
  const building = builtAt(assetId);
  const spec = buildSpec(assetId);
  if (week === null || !building || !spec) return {kind: 'unbuildable'};
  if (seasonWeek(now) < week) return {kind: 'locked', week};
  const level = levelNeeded(assetId);
  if (levels[building] < level) return {kind: 'needs_level', building, level};
  return {kind: 'ready', building, spec};
}
