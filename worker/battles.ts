/**
 * Reading battle reports.
 *
 * Writing them belongs to combat, which does not exist yet. What is here is
 * the read side and the access rule, so that when the resolver lands it has
 * somewhere to write to and nothing about who may read a report is left to be
 * decided in a hurry.
 */
import {BattleDetail, BattleSummary, REPORTS_PER_PAGE, parseDetail} from '../shared/battles';

interface BattleRow {
  id: string;
  world_id: number;
  plot_x: number;
  plot_y: number;
  fought_at: number;
  outcome: string;
  attacker_name: string;
  defender_name: string;
  attacker_alliance: string | null;
  defender_alliance: string | null;
  attacker_power: number;
  defender_power: number;
  attacker_losses: number;
  defender_losses: number;
  loot_fuel: number;
  loot_steel: number;
  loot_munitions: number;
  loot_alloy: number;
  side: string;
}

function toSummary(row: BattleRow): BattleSummary {
  return {
    id: row.id,
    foughtAt: row.fought_at,
    worldId: row.world_id,
    x: row.plot_x,
    y: row.plot_y,
    outcome: row.outcome === 'attacker' || row.outcome === 'defender' ? row.outcome : 'draw',
    yourSide: row.side === 'attacker' ? 'attacker' : 'defender',
    attacker: {
      name: row.attacker_name,
      alliance: row.attacker_alliance,
      power: row.attacker_power,
      losses: row.attacker_losses,
    },
    defender: {
      name: row.defender_name,
      alliance: row.defender_alliance,
      power: row.defender_power,
      losses: row.defender_losses,
    },
    loot: {
      fuel: row.loot_fuel,
      steel: row.loot_steel,
      munitions: row.loot_munitions,
      alloy: row.loot_alloy,
    },
  };
}

const COLUMNS = `b.id AS id, b.world_id AS world_id, b.plot_x AS plot_x, b.plot_y AS plot_y,
                 b.fought_at AS fought_at, b.outcome AS outcome,
                 b.attacker_name AS attacker_name, b.defender_name AS defender_name,
                 b.attacker_alliance AS attacker_alliance, b.defender_alliance AS defender_alliance,
                 b.attacker_power AS attacker_power, b.defender_power AS defender_power,
                 b.attacker_losses AS attacker_losses, b.defender_losses AS defender_losses,
                 b.loot_fuel AS loot_fuel, b.loot_steel AS loot_steel,
                 b.loot_munitions AS loot_munitions, b.loot_alloy AS loot_alloy,
                 bp.side AS side`;

/**
 * The reports this player may see, newest first.
 *
 * `scope` is 'mine' or 'alliance'. Alliance scope still joins through this
 * player's own participation row for `side`, falling back to the defender's
 * view for a battle they only watched - a report has to be told from somebody's
 * point of view, and an ally reading it cares who held the ground.
 */
export async function listBattles(
  db: D1Database,
  playerId: string,
  allianceId: string | null,
  scope: 'mine' | 'alliance',
  before: number | null,
): Promise<BattleSummary[]> {
  const cutoff = before ?? Number.MAX_SAFE_INTEGER;

  if (scope === 'alliance' && allianceId) {
    const {results} = await db
      .prepare(
        `SELECT ${COLUMNS}
           FROM battles b
           JOIN battle_participants bp ON bp.battle_id = b.id
          WHERE bp.alliance_id = ?1 AND b.fought_at < ?2
          GROUP BY b.id
          ORDER BY b.fought_at DESC
          LIMIT ?3`,
      )
      .bind(allianceId, cutoff, REPORTS_PER_PAGE)
      .all<BattleRow>();
    return (results ?? []).map(toSummary);
  }

  const {results} = await db
    .prepare(
      `SELECT ${COLUMNS}
         FROM battles b
         JOIN battle_participants bp ON bp.battle_id = b.id
        WHERE bp.player_id = ?1 AND b.fought_at < ?2
        ORDER BY b.fought_at DESC
        LIMIT ?3`,
    )
    .bind(playerId, cutoff, REPORTS_PER_PAGE)
    .all<BattleRow>();
  return (results ?? []).map(toSummary);
}

/**
 * One report in full.
 *
 * Access is decided by the participants table, exactly the way chat decides a
 * channel: you may read a battle you or your alliance were in, and the check
 * happens here rather than by the client asking only for its own ids.
 */
export async function readBattle(
  db: D1Database,
  playerId: string,
  allianceId: string | null,
  battleId: string,
): Promise<{summary: BattleSummary; detail: BattleDetail} | null> {
  const row = await db
    .prepare(
      `SELECT ${COLUMNS}, b.detail AS detail
         FROM battles b
         JOIN battle_participants bp ON bp.battle_id = b.id
        WHERE b.id = ?1
          AND (bp.player_id = ?2 OR (?3 IS NOT NULL AND bp.alliance_id = ?3))
        ORDER BY (bp.player_id = ?2) DESC
        LIMIT 1`,
    )
    .bind(battleId, playerId, allianceId)
    .first<BattleRow & {detail: string}>();
  if (!row) return null;
  return {summary: toSummary(row), detail: parseDetail(row.detail)};
}
