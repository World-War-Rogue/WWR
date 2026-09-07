/**
 * Where a player's power comes from, itemised.
 *
 * Power is `assetPowerWith` summed over every asset held (worker/power.ts).
 * That one number hides four sources, and a player who cannot see them
 * cannot decide what to buy next. This takes the same inputs and splits each
 * asset's figure into what Service Rank alone gives, what the category
 * building adds on top, what the four packages add, and what System
 * Integration adds - in that order, because that is the order the formula
 * applies them (shared/upgrades.ts attributesWith), so the four parts sum to
 * the asset's power exactly.
 *
 * Combat Systems are Task Force multipliers on damage, HP and repair time.
 * They are not in the power score, by design (a lane has no power delta in
 * the registry), so they are reported beside it, never inside it.
 */
import {ASSET_BY_ID, type AssetCategory, SQUAD_NAMES, type SquadName} from './assets';
import {type BuildingLevels, HUB_OF_CATEGORY, categoryBoost} from './buildings';
import {type CombatSystems, NO_SYSTEMS} from './combatSystems';
import {NO_PACKAGES, type Packages, assetPowerWith, systemIntegration} from './upgrades';

export interface HeldAssetInput {
  assetId: string;
  level: number;
  packages: Packages;
}

export interface AssetPowerLine {
  assetId: string;
  code: string;
  name: string;
  category: AssetCategory;
  level: number;
  packages: Packages;
  /** Which Task Force it stands in, if any. */
  squad: SquadName | null;
  hub: string | null;
  hubLevel: number;
  boost: number;
  /** The four parts, summing to `power`. */
  fromRank: number;
  fromBuilding: number;
  fromPackages: number;
  fromIntegration: number;
  power: number;
}

export interface PowerBreakdown {
  total: number;
  /** The same four parts summed over the roster. */
  sources: {rank: number; building: number; packages: number; integration: number};
  assets: AssetPowerLine[];
  /** Per Task Force: the six slots' power and the lanes that multiply the fight. */
  taskForces: Array<{squad: SquadName; power: number; assets: number; systems: CombatSystems}>;
  /** Assets not in any Task Force still count toward the total. */
  unassignedPower: number;
}

export function powerBreakdown(
  held: HeldAssetInput[],
  levels: BuildingLevels,
  squads: Record<string, Array<string | null>>,
  systems: Partial<Record<SquadName, CombatSystems>> = {},
): PowerBreakdown {
  const squadOf = new Map<string, SquadName>();
  for (const name of SQUAD_NAMES) {
    for (const id of squads[name] ?? []) if (id) squadOf.set(id, name);
  }

  const assets: AssetPowerLine[] = [];
  const sources = {rank: 0, building: 0, packages: 0, integration: 0};
  for (const h of held) {
    const asset = ASSET_BY_ID[h.assetId];
    if (!asset) continue;
    const boost = categoryBoost(levels, asset.category);
    const hub = HUB_OF_CATEGORY[asset.category];
    const rankOnly = assetPowerWith(asset, h.level, NO_PACKAGES, 1);
    const withBuilding = assetPowerWith(asset, h.level, NO_PACKAGES, boost);
    // Packages without integration: the same packages, but integration
    // measured off a roster where the lowest package is 1 - which is what
    // fitting them one at a time looked like before the last one caught up.
    const integrationPoints = systemIntegration(h.packages);
    const full = assetPowerWith(asset, h.level, h.packages, boost);
    // Integration adds the same points to all five attributes: 6 x 5 x points.
    const fromIntegration = Math.round(6 * 5 * integrationPoints);
    const fromPackages = full - withBuilding - fromIntegration;
    const line: AssetPowerLine = {
      assetId: asset.id,
      code: asset.code,
      name: asset.name,
      category: asset.category,
      level: h.level,
      packages: h.packages,
      squad: squadOf.get(asset.id) ?? null,
      hub,
      hubLevel: hub ? levels[hub] : 1,
      boost,
      fromRank: rankOnly,
      fromBuilding: withBuilding - rankOnly,
      fromPackages,
      fromIntegration,
      power: full,
    };
    assets.push(line);
    sources.rank += line.fromRank;
    sources.building += line.fromBuilding;
    sources.packages += line.fromPackages;
    sources.integration += line.fromIntegration;
  }
  assets.sort((a, b) => b.power - a.power);

  const taskForces = SQUAD_NAMES.map((squad) => {
    const mine = assets.filter((a) => a.squad === squad);
    return {
      squad,
      power: mine.reduce((s, a) => s + a.power, 0),
      assets: mine.length,
      systems: systems[squad] ?? NO_SYSTEMS,
    };
  });

  return {
    total: assets.reduce((s, a) => s + a.power, 0),
    sources,
    assets,
    taskForces,
    unassignedPower: assets.filter((a) => a.squad === null).reduce((s, a) => s + a.power, 0),
  };
}
