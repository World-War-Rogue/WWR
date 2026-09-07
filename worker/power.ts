/**
 * A player's power: every asset held, at its rank, packages and building
 * boost, added up. The same number the Task Force screen shows per force,
 * over the whole roster. Replaces the Gemini-era building-level power.
 */
import {ASSET_BY_ID} from '../shared/assets';
import {type BuildingLevels, NO_BUILDINGS, categoryBoost, isLevelledBuilding} from '../shared/buildings';
import {assetPowerWith, packagesFromRow} from '../shared/upgrades';

export interface PlayerPower {
  power: number;
  commandCenter: number;
}

/** Power and Command Center level for many players in two queries. */
export async function powerOf(db: D1Database, playerIds: string[]): Promise<Map<string, PlayerPower>> {
  const out = new Map<string, PlayerPower>();
  if (playerIds.length === 0) return out;
  for (const id of playerIds) out.set(id, {power: 0, commandCenter: 1});

  // D1 binds are positional; chunk so a big alliance list stays under limits.
  const chunks: string[][] = [];
  for (let i = 0; i < playerIds.length; i += 90) chunks.push(playerIds.slice(i, i + 90));

  const levelsByPlayer = new Map<string, BuildingLevels>();
  for (const chunk of chunks) {
    const marks = chunk.map((_, i) => `?${i + 1}`).join(',');
    const levels = await db
      .prepare(`SELECT player_id AS pid, building, level FROM base_levels WHERE player_id IN (${marks})`)
      .bind(...chunk)
      .all<{pid: string; building: string; level: number}>();
    for (const r of levels.results ?? []) {
      if (!isLevelledBuilding(r.building)) continue;
      const l = levelsByPlayer.get(r.pid) ?? {...NO_BUILDINGS};
      l[r.building] = Math.max(1, r.level);
      levelsByPlayer.set(r.pid, l);
    }
    const assets = await db
      .prepare(
        `SELECT player_id AS pid, asset_id AS assetId, level, pkg_armament, pkg_protection, pkg_propulsion, pkg_electronics
           FROM player_assets WHERE player_id IN (${marks})`,
      )
      .bind(...chunk)
      .all<{
        pid: string;
        assetId: string;
        level: number;
        pkg_armament: number | null;
        pkg_protection: number | null;
        pkg_propulsion: number | null;
        pkg_electronics: number | null;
      }>();
    for (const r of assets.results ?? []) {
      const asset = ASSET_BY_ID[r.assetId];
      const entry = out.get(r.pid);
      if (!asset || !entry) continue;
      const levels = levelsByPlayer.get(r.pid) ?? NO_BUILDINGS;
      entry.power += assetPowerWith(asset, r.level, packagesFromRow(r), categoryBoost(levels, asset.category));
    }
  }
  for (const [pid, entry] of out) {
    entry.power = Math.round(entry.power);
    entry.commandCenter = levelsByPlayer.get(pid)?.command_center ?? 1;
  }
  return out;
}
