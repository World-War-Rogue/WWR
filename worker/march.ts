/**
 * Launching a march, and settling it when it lands.
 *
 * Battles are resolved ON READ, like every other timer in this game. Nothing
 * ticks in the background: whoever looks at the world next settles any march
 * whose arrival instant has passed. A raid that lands at three in the morning
 * lands correctly anyway, and a world nobody is playing costs nothing to run.
 */
import {ASSET_BY_ID, type SquadName} from '../shared/assets';
import {type Packages, assetPowerWith, attributesWith, packagesFromRow} from '../shared/upgrades';
import {
  type Deployment,
  GARRISON_HOURS,
  type MarchKind,
  marchProgress,
  marchSeconds,
  plotsBetween,
} from '../shared/march';
import {type SideSpec, resolve} from '../shared/combat';
import {readSquads} from './squads';
import {readBase} from './buildings';
import {type Resources, RESOURCE_KINDS, categoryBoost, marchMultiplier, raidLoot} from '../shared/buildings';
import {REPAIR_WORDING, isDisabled, marchHpFactor} from '../shared/repair';
import {applyDamage, settleRepairs} from './repair';
import {readLevels} from './buildings';
import {TASK_FORCE_UNLOCK, taskForceOpen} from '../shared/season';
import {SHIELD_COOLDOWN_MS, SHIELD_WORDING, isShielded} from '../shared/shields';
import {DRONE_WORDING, droneCount, droneNetworkMultiplier, isDrone, paceMobility} from '../shared/drones';

export interface MarchRow {
  id: string;
  world_id: number;
  attacker_id: string;
  attacker: string;
  squad: string;
  defender_id: string;
  defender: string;
  from_x: number;
  from_y: number;
  to_x: number;
  to_y: number;
  departed_at: number;
  arrives_at: number;
  kind: string;
}

/**
 * Squads currently away, which are therefore not defending.
 *
 * Away means in the air OR standing at an ally's base. The second half is not
 * optional: a reinforcement that counted for its ally's defence and its own
 * would let one squad hold two places at once, which is the cheapest exploit
 * in the game and the one an alliance would find first.
 *
 * `garrison_until` is cleared the moment a garrison ends, so a non-null value
 * means standing there now and a null one means home or never went.
 */
export async function marchingSquads(db: D1Database, playerId: string): Promise<Set<string>> {
  const rows = await db
    .prepare(
      `SELECT squad FROM marches
        WHERE attacker_id = ?1
          AND (resolved_at IS NULL OR garrison_until IS NOT NULL)`,
    )
    .bind(playerId)
    .all<{squad: string}>();
  return new Set((rows.results ?? []).map((r) => r.squad));
}

export async function pendingMarches(db: D1Database, worldId: number): Promise<MarchRow[]> {
  const rows = await db
    .prepare(
      `SELECT m.id, m.world_id, m.attacker_id, a.username AS attacker, m.squad,
              m.defender_id, d.username AS defender,
              m.from_x, m.from_y, m.to_x, m.to_y, m.departed_at, m.arrives_at, m.kind
         FROM marches m
         JOIN players a ON a.id = m.attacker_id
         JOIN players d ON d.id = m.defender_id
        WHERE m.world_id = ?1 AND m.resolved_at IS NULL
        ORDER BY m.arrives_at ASC
        LIMIT 200`,
    )
    .bind(worldId)
    .all<MarchRow>();
  return rows.results ?? [];
}

/**
 * What a player's assets are, packages included.
 *
 * Packages have to travel with a march. They change what an asset IS - the
 * resolver builds its attributes from them - so a march that carried only
 * assetId and level would send a fitted-out squad and resolve it as a bare one,
 * which is a player paying for upgrades and not receiving them.
 */
export interface UnitSpec {
  assetId: string;
  level: number;
  packages: Packages;
  /** Slot in its Task Force, 0-5. The formation. Absent for legacy rows. */
  slot?: number;
  /** Its category building's boost. Absent means 1. */
  boost?: number;
  /** Hit points it left with, 0-1. Absent means whole. */
  hpFraction?: number;
  /** The ally whose roster this reinforcement belongs to. Absent: the defender's own. */
  owner?: string;
}

interface AssetLevelRow {
  assetId: string;
  level: number;
  pkg_armament: number;
  pkg_protection: number;
  pkg_propulsion: number;
  pkg_electronics: number;
  hp: number;
  repairEndsAt: number | null;
}

const ROSTER_SQL = `SELECT asset_id AS assetId, level, pkg_armament, pkg_protection,
                           pkg_propulsion, pkg_electronics, hp_fraction AS hp,
                           repair_ends_at AS repairEndsAt
                      FROM player_assets WHERE player_id = ?1`;

/** A unit as it stands in the roster: with its hit points and repair state. */
type RosterUnit = UnitSpec & {repairing: boolean};

async function rosterOf(db: D1Database, playerId: string): Promise<Map<string, RosterUnit>> {
  // Finished repairs first, so a unit that healed a minute ago is whole.
  const now = Date.now();
  await settleRepairs(db, playerId, now);
  // The base's building levels ride along on every unit as a boost, so the
  // resolver, the march clock and the power figure all see the same asset.
  const [rows, base] = await Promise.all([
    db.prepare(ROSTER_SQL).bind(playerId).all<AssetLevelRow>(),
    readBase(db, playerId, now),
  ]);
  return new Map(
    (rows.results ?? []).map((r) => {
      const asset = ASSET_BY_ID[r.assetId];
      const boost = asset ? categoryBoost(base.levels, asset.category) : 1;
      return [
        r.assetId,
        {
          assetId: r.assetId,
          level: r.level,
          packages: packagesFromRow(r),
          boost,
          hpFraction: r.hp,
          repairing: r.repairEndsAt !== null && r.repairEndsAt > now,
        },
      ];
    }),
  );
}

const BARE: Packages = {armament: 1, protection: 1, propulsion: 1, electronics: 1};

/** The units in one squad, ready for the resolver. */
async function unitsOf(
  db: D1Database,
  playerId: string,
  squad: SquadName,
): Promise<RosterUnit[]> {
  const board = await readSquads(db, playerId);
  const slots = board[squad] ?? [];
  if (!slots.some(Boolean)) return [];
  const roster = await rosterOf(db, playerId);
  // The slot index travels with the unit: it is the formation. Slots 0-1 are
  // the front, 2-3 the centre, 4-5 the rear, and the resolver reads it.
  const out: RosterUnit[] = [];
  slots.forEach((id, slot) => {
    if (id) out.push({...(roster.get(id) ?? {assetId: id, level: 1, packages: BARE, repairing: false}), slot});
  });
  return out;
}

/** Everything the defender still has at home. Squads that marched out are gone. */
async function homeUnits(db: D1Database, playerId: string): Promise<UnitSpec[]> {
  const [board, away, roster] = await Promise.all([
    readSquads(db, playerId),
    marchingSquads(db, playerId),
    rosterOf(db, playerId),
  ]);
  const out: UnitSpec[] = [];
  for (const [squad, slots] of Object.entries(board)) {
    if (away.has(squad)) continue;
    slots.forEach((id, slot) => {
      const r = roster.get(id ?? '');
      // A unit under repair is in the shop, not on the line.
      if (id && !(r && r.repairing)) out.push({...(r ?? {assetId: id, level: 1, packages: BARE}), slot});
    });
  }
  return out;
}

export type LaunchResult =
  | {ok: true; arrivesAt: number; seconds: number}
  | {ok: false; error: string};

/**
 * Squads standing at this player's base as reinforcements.
 *
 * Counted as part of the defence, which is the whole point of sending them.
 * Read live rather than snapshotted: a reinforcement that has already gone
 * home is not there any more, and the row says when that was.
 */
export async function garrisonUnits(
  db: D1Database,
  playerId: string,
  now: number,
): Promise<UnitSpec[]> {
  const rows = await db
    .prepare(
      `SELECT units, attacker_id AS owner FROM marches
        WHERE defender_id = ?1 AND kind = 'reinforce'
          AND resolved_at IS NOT NULL
          AND garrison_until IS NOT NULL AND garrison_until > ?2`,
    )
    .bind(playerId, now)
    .all<{units: string; owner: string}>();

  const out: UnitSpec[] = [];
  for (const row of rows.results ?? []) {
    try {
      const parsed = JSON.parse(row.units) as UnitSpec[];
      // A march stored before packages existed has none. `packages` is optional
      // on the resolver's input for exactly this reason, so an old reinforcement
      // in the field resolves as it always did rather than throwing.
      if (Array.isArray(parsed)) out.push(...parsed.map((u) => ({...u, owner: row.owner})));
    } catch {
      // A reinforcement whose roster cannot be read simply is not there.
    }
  }
  return out;
}

export async function launch(
  db: D1Database,
  worldId: number,
  attackerId: string,
  squad: SquadName,
  defenderId: string,
  from: {x: number; y: number},
  to: {x: number; y: number},
  now: number,
  newId: () => string,
  kind: MarchKind = 'attack',
): Promise<LaunchResult> {
  if (attackerId === defenderId) return {ok: false, error: 'That is your own base.'};

  if (kind === 'attack') {
    // A shielded base is not a target. SHIELDS v1.
    const target = await db
      .prepare(`SELECT shield_until AS until FROM players WHERE id = ?1`)
      .bind(defenderId)
      .first<{until: number | null}>();
    if (isShielded(target?.until, now)) return {ok: false, error: SHIELD_WORDING.targetBlocked};
  }

  const units = await unitsOf(db, attackerId, squad);
  if (units.length === 0) return {ok: false, error: `Task Force ${squad} is empty.`};
  // Nothing marches broken. A disabled asset is repaired first; one in the
  // shop waits or is moved out. GAME-MATH v1 §5.
  for (const u of units) {
    const label = ASSET_BY_ID[u.assetId]?.name ?? u.assetId;
    if (u.repairing) return {ok: false, error: REPAIR_WORDING.repairing(label)};
    if (isDisabled(u.hpFraction ?? 1)) return {ok: false, error: REPAIR_WORDING.disabled(label)};
  }
  const levels = await readLevels(db, attackerId);
  if (!taskForceOpen(squad, levels.command_center)) {
    return {ok: false, error: `Task Force ${squad} opens at Command Center level ${TASK_FORCE_UNLOCK[squad]}.`};
  }
  // Nothing leaves the base without a drone. DRONE RULES v1.
  if (droneCount(units.map((u) => u.assetId)) === 0) return {ok: false, error: DRONE_WORDING.needDrone};

  // For the message only. The unique index below is what actually decides -
  // this just gets to say WHICH thing is wrong, since one index rejection can
  // mean either "that squad is out" or "you already reinforced them".
  const busy = await marchingSquads(db, attackerId);
  if (busy.has(squad)) return {ok: false, error: `Task Force ${squad} is already out.`};

  // The column moves at the pace of its slowest vehicle, which is a real cost
  // of bringing heavy armour and a real reason to keep one fast squad.
  //
  // Through attributesWith, not attributeAtLevel, so a Propulsion package
  // reaches the march. Before this a player bought Propulsion, watched combat
  // mobility rise, and marched exactly as slowly as before.
  //
  // Drones never slow the column - they speed it: the Drone Network
  // (shared/drones.ts) multiplies the pace, paced on the slowest non-drone.
  const resolved = units.map((u) => {
    const asset = ASSET_BY_ID[u.assetId];
    const a = asset ? attributesWith(asset, u.level, u.packages, u.boost ?? 1) : null;
    // A damaged vehicle limps: its pace is scaled by what it has left.
    return {id: u.assetId, mobility: (a?.mobility ?? 5) * marchHpFactor(u.hpFraction ?? 1), detection: a?.detection ?? 5};
  });
  const network = droneNetworkMultiplier(resolved.filter((r) => isDrone(r.id)));
  // The Tactical Operations Center speeds every march; the whole bonus is
  // capped at MARCH_TOTAL_CAP. BUILDING EFFECTS v1.
  const speed = paceMobility(resolved) * marchMultiplier(network, levels.tactical_operations_center);
  const seconds = marchSeconds(plotsBetween(from.x, from.y, to.x, to.y), speed);
  const arrivesAt = now + seconds * 1000;

  try {
    await db
      .prepare(
        `INSERT INTO marches
           (id, world_id, attacker_id, squad, defender_id, units,
            from_x, from_y, to_x, to_y, departed_at, arrives_at, kind)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)`,
      )
      .bind(
        newId(),
        worldId,
        attackerId,
        squad,
        defenderId,
        // Frozen here. What marched is what fights - hit points included.
        JSON.stringify(units.map(({repairing: _r, ...u}) => u)),
        from.x,
        from.y,
        to.x,
        to.y,
        now,
        arrivesAt,
        kind,
      )
      .run();
  } catch {
    // One of two partial unique indexes rejected it, and which one decides
    // what to say: a squad can only be out once, and an ally can only be
    // reinforced by you once.
    return {
      ok: false,
      error:
        kind === 'reinforce'
          ? 'You already have a squad reinforcing them.'
          : `Task Force ${squad} is already marching.`,
    };
  }

  // Ordering an attack drops your own shield, for good, and starts the
  // cooldown. Reinforcing does not. SHIELDS v1 with the owner's ruling.
  if (kind === 'attack') {
    await db
      .prepare(
        `UPDATE players SET shield_until = NULL, shield_kind = NULL, shield_cooldown_until = ?2
          WHERE id = ?1 AND shield_until IS NOT NULL AND shield_until > ?3`,
      )
      .bind(attackerId, now + SHIELD_COOLDOWN_MS, now)
      .run();
  }

  return {ok: true, arrivesAt, seconds};
}

/**
 * Fight every march that has landed.
 *
 * Called from any read of the world. Idempotent by the `resolved_at IS NULL`
 * filter on the update: two players looking at the map in the same instant
 * cannot fight the same battle twice, because only one of their updates
 * matches a row.
 */
/**
 * Walk expired reinforcements back to their own base.
 *
 * Clearing `garrison_until` is the claim: it is a conditional update on a
 * value only one reader can win, so two people looking at the map in the same
 * instant cannot both send the same squad home. The return leg is inserted
 * after the claim rather than before, because the unique index counts a
 * garrisoned squad as busy and would reject the second row otherwise.
 */
async function sendGarrisonsHome(
  db: D1Database,
  worldId: number,
  now: number,
  newId: () => string,
): Promise<number> {
  const done = await db
    .prepare(
      `SELECT id, attacker_id, squad, units, from_x, from_y, to_x, to_y,
                departed_at, arrives_at
         FROM marches
        WHERE world_id = ?1 AND kind = 'reinforce'
          AND garrison_until IS NOT NULL AND garrison_until <= ?2
        LIMIT 12`,
    )
    .bind(worldId, now)
    .all<{
      id: string;
      attacker_id: string;
      squad: string;
      units: string;
      from_x: number;
      from_y: number;
      to_x: number;
      to_y: number;
      departed_at: number;
      arrives_at: number;
    }>();

  let sent = 0;
  for (const row of done.results ?? []) {
    const claim = await db
      .prepare(
        `UPDATE marches SET garrison_until = NULL
          WHERE id = ?1 AND garrison_until IS NOT NULL`,
      )
      .bind(row.id)
      .run();
    if ((claim.meta?.changes ?? 0) === 0) continue;

    // The way home takes exactly as long as the way out took. Not recomputed
    // from the distance: it is the same distance anyway, and recomputing would
    // quietly change the answer whenever the roster did - a squad whose
    // slowest vehicle died would somehow get home faster than it left.
    const home = row.arrives_at - row.departed_at;

    await db
      .prepare(
        `INSERT INTO marches
           (id, world_id, attacker_id, squad, defender_id, units,
            from_x, from_y, to_x, to_y, departed_at, arrives_at, kind)
         VALUES (?1,?2,?3,?4,?3,?5,?6,?7,?8,?9,?10,?11,'return')`,
      )
      .bind(
        newId(),
        worldId,
        row.attacker_id,
        row.squad,
        row.units,
        row.to_x,
        row.to_y,
        row.from_x,
        row.from_y,
        now,
        now + home,
      )
      .run();
    sent += 1;
  }
  return sent;
}

export async function settleArrivals(
  db: D1Database,
  worldId: number,
  now: number,
  newId: () => string,
): Promise<number> {
  const due = await db
    .prepare(
      `SELECT m.id, m.world_id, m.attacker_id, a.username AS attacker, m.squad, m.units,
              m.defender_id, d.username AS defender, m.kind,
              m.from_x, m.from_y, m.to_x, m.to_y, m.departed_at, m.arrives_at
         FROM marches m
         JOIN players a ON a.id = m.attacker_id
         JOIN players d ON d.id = m.defender_id
        WHERE m.world_id = ?1 AND m.resolved_at IS NULL AND m.arrives_at <= ?2
        ORDER BY m.arrives_at ASC
        LIMIT 12`,
    )
    .bind(worldId, now)
    .all<{
      id: string;
      world_id: number;
      attacker_id: string;
      attacker: string;
      squad: string;
      units: string;
      defender_id: string;
      defender: string;
      kind: string;
      from_x: number;
      from_y: number;
      to_x: number;
      to_y: number;
      departed_at: number;
      arrives_at: number;
    }>();

  // Garrisons that have run out. The squad does not blink home: it gets a
  // return leg like any other, so the ally watches it leave and the owner
  // watches it cross, and the plot it was defending is visibly emptier.
  let fought = await sendGarrisonsHome(db, worldId, now, newId);

  for (const march of due.results ?? []) {
    // Claim it first. If this updates nothing, somebody else's read already
    // fought this battle and we must not fight it again.
    const claim = await db
      .prepare(`UPDATE marches SET resolved_at = ?2 WHERE id = ?1 AND resolved_at IS NULL`)
      .bind(march.id, now)
      .run();
    if ((claim.meta?.changes ?? 0) === 0) continue;

    // A squad coming home is simply home. The row stops being a march and the
    // squad stops being away - which is the whole of what the return leg does.
    if (march.kind === 'return') {
      fought += 1;
      continue;
    }

    // A reinforcement joins its ally's defence and stands there for a while,
    // then walks back. No battle, and no fight to report.
    if (march.kind === 'reinforce') {
      await db
        .prepare(`UPDATE marches SET garrison_until = ?2 WHERE id = ?1`)
        .bind(march.id, now + GARRISON_HOURS * 3600 * 1000)
        .run();
      fought += 1;
      continue;
    }

    // The attacker's squad as it LEFT, not as it stands now. The defender's is
    // read live, because a defender rearranging while somebody is inbound is
    // exactly the reaction the warning exists to allow.
    let attackUnits: UnitSpec[] = [];
    try {
      const parsed = JSON.parse(march.units) as UnitSpec[];
      if (Array.isArray(parsed)) attackUnits = parsed;
    } catch {
      attackUnits = [];
    }

    const [ownUnits, reinforcements, defenderLevels, defenderShield] = await Promise.all([
      homeUnits(db, march.defender_id),
      garrisonUnits(db, march.defender_id, now),
      readLevels(db, march.defender_id),
      db
        .prepare(`SELECT shield_until AS until FROM players WHERE id = ?1`)
        .bind(march.defender_id)
        .first<{until: number | null}>(),
    ]);

    // A shield raised after the march left: it does not land. No fight, no
    // raid, a blocked-attack report, and the column turns for home at once.
    // SHIELDS v1 - a shield already up when the attack was ordered would
    // have refused the launch.
    if (isShielded(defenderShield?.until, march.arrives_at)) {
      const battleId = newId();
      await db.batch([
        db
          .prepare(
            `INSERT INTO battles
               (id, world_id, plot_x, plot_y, fought_at, attacker_id, defender_id,
                attacker_name, defender_name, outcome,
                attacker_power, defender_power, attacker_losses, defender_losses, detail)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,'blocked',0,0,0,0,?10)`,
          )
          .bind(
            battleId,
            worldId,
            march.to_x,
            march.to_y,
            now,
            march.attacker_id,
            march.defender_id,
            march.attacker,
            march.defender,
            JSON.stringify({
              version: 1,
              rounds: [],
              squads: [
                {
                  side: 'attacker',
                  squad: march.squad,
                  heroes: attackUnits.map((u) => ASSET_BY_ID[u.assetId]?.name ?? u.assetId),
                  losses: 0,
                  survived: true,
                },
              ],
              notes: [`${march.defender} was shielded. The attack could not land and turned for home.`],
            }),
          ),
        db
          .prepare(
            `INSERT INTO battle_participants (battle_id, player_id, side, alliance_id)
             VALUES (?1, ?2, 'attacker', NULL)`,
          )
          .bind(battleId, march.attacker_id),
        db
          .prepare(
            `INSERT INTO battle_participants (battle_id, player_id, side, alliance_id)
             VALUES (?1, ?2, 'defender', NULL)`,
          )
          .bind(battleId, march.defender_id),
        db.prepare(`UPDATE marches SET battle_id = ?2 WHERE id = ?1`).bind(march.id, battleId),
        db
          .prepare(
            `INSERT INTO marches
               (id, world_id, attacker_id, squad, defender_id, units,
                from_x, from_y, to_x, to_y, departed_at, arrives_at, kind)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,'return')`,
          )
          .bind(
            newId(),
            march.world_id,
            march.attacker_id,
            march.squad,
            march.attacker_id,
            march.units,
            march.to_x,
            march.to_y,
            march.from_x,
            march.from_y,
            now,
            now + (march.arrives_at - march.departed_at),
          ),
      ]);
      fought += 1;
      continue;
    }

    // Everything at home, plus whatever allies have parked here. This is the
    // payoff for reinforcing and the reason it is worth a squad.
    const defendUnits = [...ownUnits, ...reinforcements];

    // Home ground. Passed IN to the resolver rather than read inside it, so
    // the arena - which has no base - cannot inherit a bonus. The Command
    // Center's level (base levels v2), not the old command_post row.
    const cp = defenderLevels.command_center - 1;
    const attacker: SideSpec = {name: march.attacker, units: attackUnits};
    const defender: SideSpec = {
      name: march.defender,
      units: defendUnits,
      modifier: 1 + Math.min(0.25, cp * 0.015),
    };

    const seed = Math.abs(hash(march.id)) % 2147483647;
    const result = resolve(attacker, defender, seed);

    const battleId = newId();
    const power = (us: UnitSpec[]) =>
      us.reduce((sum, u) => {
        const asset = ASSET_BY_ID[u.assetId];
        return sum + (asset ? assetPowerWith(asset, u.level, u.packages ?? BARE, u.boost ?? 1) : 0);
      }, 0);

    await db.batch([
      db
        .prepare(
          `INSERT INTO battles
             (id, world_id, plot_x, plot_y, fought_at, attacker_id, defender_id,
              attacker_name, defender_name, outcome,
              attacker_power, defender_power, attacker_losses, defender_losses, detail)
           VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15)`,
        )
        .bind(
          battleId,
          worldId,
          march.to_x,
          march.to_y,
          now,
          march.attacker_id,
          march.defender_id,
          march.attacker,
          march.defender,
          result.outcome,
          power(attackUnits),
          power(defendUnits),
          result.attacker.losses,
          result.defender.losses,
          JSON.stringify({
            version: 1,
            rounds: result.rounds,
            squads: [
              {
                side: 'attacker',
                squad: march.squad,
                heroes: attackUnits.map((u) => ASSET_BY_ID[u.assetId]?.name ?? u.assetId),
                losses: result.attacker.losses,
                survived: result.outcome !== 'defender',
              },
              {
                side: 'defender',
                squad: 'Home',
                heroes: defendUnits.map((u) => ASSET_BY_ID[u.assetId]?.name ?? u.assetId),
                losses: result.defender.losses,
                survived: result.outcome !== 'attacker',
              },
            ],
            notes: [
              ...result.notes,
              `Detection: ${Math.round(result.attacker.spotting * 100)}% to ${march.attacker}.`,
              `Composition: ${march.attacker} ${result.attacker.composition}, ${march.defender} ${result.defender.composition}.`,
            ],
          }),
        ),
      db
        .prepare(
          `INSERT INTO battle_participants (battle_id, player_id, side, alliance_id)
           VALUES (?1, ?2, 'attacker', NULL)`,
        )
        .bind(battleId, march.attacker_id),
      db
        .prepare(
          `INSERT INTO battle_participants (battle_id, player_id, side, alliance_id)
           VALUES (?1, ?2, 'defender', NULL)`,
        )
        .bind(battleId, march.defender_id),
      db.prepare(`UPDATE marches SET battle_id = ?2 WHERE id = ?1`).bind(march.id, battleId),
    ]);

    // What each asset had left is what it comes home with - the attacker's
    // column and the defender's own line, and every ally's reinforcement,
    // each on its owner's roster. GAME-MATH v1 §5.
    const hits: Array<{playerId: string; assetId: string; remaining: number}> = [];
    result.attacker.units.forEach((u, i) => {
      const spec = attackUnits[i];
      if (spec && spec.assetId === u.assetId) hits.push({playerId: march.attacker_id, assetId: u.assetId, remaining: u.remaining});
    });
    result.defender.units.forEach((u, i) => {
      const spec = defendUnits[i] as (UnitSpec & {owner?: string}) | undefined;
      if (spec && spec.assetId === u.assetId) {
        hits.push({playerId: spec.owner ?? march.defender_id, assetId: u.assetId, remaining: u.remaining});
      }
    });
    await applyDamage(db, hits);

    // The raid: a win takes 5% of what the Warehouse does not protect, into
    // the attacker's stock as far as it fits. BUILDING RESOURCES v1 §2.
    if (result.outcome === 'attacker') {
      const [victim, raider] = await Promise.all([
        readBase(db, march.defender_id, now),
        readBase(db, march.attacker_id, now),
      ]);
      const loot = raidLoot(victim.resources, victim.levels);
      const taken: Resources = {...loot};
      for (const k of RESOURCE_KINDS) {
        taken[k] = Math.max(0, Math.min(loot[k], raider.storageCap - raider.resources[k]));
      }
      if (RESOURCE_KINDS.some((k) => taken[k] > 0)) {
        await db.batch([
          db
            .prepare(
              `UPDATE bases SET fuel = fuel - ?2, steel = steel - ?3, munitions = munitions - ?4, alloy = alloy - ?5,
                                stock_rev = stock_rev + 1
                WHERE player_id = ?1 AND fuel >= ?2 AND steel >= ?3 AND munitions >= ?4 AND alloy >= ?5`,
            )
            .bind(march.defender_id, taken.fuel, taken.steel, taken.munitions, taken.alloy),
          db
            .prepare(
              `UPDATE bases SET fuel = fuel + ?2, steel = steel + ?3, munitions = munitions + ?4, alloy = alloy + ?5
                WHERE player_id = ?1`,
            )
            .bind(march.attacker_id, taken.fuel, taken.steel, taken.munitions, taken.alloy),
          db
            .prepare(
              `UPDATE battles SET detail = json_set(detail, '$.raid', json(?2)) WHERE id = ?1`,
            )
            .bind(battleId, JSON.stringify(taken)),
        ]);
      }
    }

    // The survivors walk home, the same distance, in public. A squad is away
    // for the whole round trip rather than only the journey out, which is most
    // of what an attack actually costs - and anybody who watched it leave
    // knows exactly how long its owner is short a squad.
    const survivors = attackUnits.filter(
      (u) => !result.attacker.units.find((r) => r.assetId === u.assetId && r.damaged),
    );
    if (survivors.length > 0) {
      // As long as the way out took. Recomputing it from the survivors would
      // mean a squad that lost its slowest vehicle got home faster than it
      // arrived, which reads as a reward for taking casualties.
      const home = march.arrives_at - march.departed_at;
      await db
        .prepare(
          `INSERT INTO marches
             (id, world_id, attacker_id, squad, defender_id, units,
              from_x, from_y, to_x, to_y, departed_at, arrives_at, kind)
           VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,'return')`,
        )
        .bind(
          newId(),
          march.world_id,
          march.attacker_id,
          march.squad,
          march.attacker_id,
          JSON.stringify(survivors),
          march.to_x,
          march.to_y,
          march.from_x,
          march.from_y,
          now,
          now + home,
        )
        .run()
        .catch(() => undefined);
    }

    fought += 1;
  }
  return fought;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h | 0;
}

/**
 * Where all four squads are, for the panel that shows it.
 *
 * Two queries because a squad is away for two different reasons and only one
 * of them is a row in flight: an attack or a reinforcement on its way, and a
 * reinforcement already standing at an ally's base. The second has a settled
 * row - which is why it is easy to forget, and why forgetting it would leave
 * the eight-hour commitment invisible on the one screen meant to show it.
 */
export async function deployments(
  db: D1Database,
  playerId: string,
  now: number,
): Promise<Deployment[]> {
  const rows = await db
    .prepare(
      `SELECT m.id, m.squad, m.kind, m.to_x, m.to_y, m.arrives_at, m.garrison_until,
              d.username AS target
         FROM marches m
         JOIN players d ON d.id = m.defender_id
        WHERE m.attacker_id = ?1
          AND (m.resolved_at IS NULL OR m.garrison_until IS NOT NULL)
        ORDER BY m.arrives_at ASC
        LIMIT 8`,
    )
    .bind(playerId)
    .all<{
      id: string;
      squad: string;
      kind: string;
      to_x: number;
      to_y: number;
      arrives_at: number;
      garrison_until: number | null;
      target: string;
    }>();

  return (rows.results ?? []).map((r) => {
    // A settled row with a garrison on it is a squad standing still. It is not
    // 'reinforce' any more - that was the journey, and the journey is over.
    const standing = r.garrison_until !== null && r.garrison_until > now;
    return {
      marchId: r.id,
      squad: r.squad,
      kind: standing ? ('garrison' as const) : (r.kind as MarchKind),
      target: r.target,
      to: {x: r.to_x, y: r.to_y},
      arrivesAt: standing ? null : r.arrives_at,
      until: standing ? r.garrison_until : null,
    };
  });
}

/**
 * Bring a squad home now.
 *
 * Recall is not a cancel. The squad does not blink back onto its plot: it gets
 * a return leg from wherever it actually is, drawn on the map like any other
 * march, and it is still away until it lands. Turning a column around within
 * sight of its target costs the whole journey back, which is what keeps
 * recall from being a free look at somebody's defence.
 *
 * From WHERE IT IS, not from where it was going. A squad recalled one plot out
 * is home in seconds; one recalled at the far end pays for the whole trip.
 */
export async function recall(
  db: D1Database,
  playerId: string,
  squad: string,
  now: number,
  newId: () => string,
): Promise<{ok: true; arrivesAt: number} | {ok: false; error: string}> {
  const row = await db
    .prepare(
      `SELECT id, world_id, kind, units, from_x, from_y, to_x, to_y,
              departed_at, arrives_at, garrison_until
         FROM marches
        WHERE attacker_id = ?1 AND squad = ?2
          AND (resolved_at IS NULL OR garrison_until IS NOT NULL)
        LIMIT 1`,
    )
    .bind(playerId, squad)
    .first<{
      id: string;
      world_id: number;
      kind: string;
      units: string;
      from_x: number;
      from_y: number;
      to_x: number;
      to_y: number;
      departed_at: number;
      arrives_at: number;
      garrison_until: number | null;
    }>();

  if (!row) return {ok: false, error: `Task Force ${squad} is already home.`};
  if (row.kind === 'return' && row.garrison_until === null) {
    return {ok: false, error: `Task Force ${squad} is already on its way home.`};
  }

  // Where the squad actually is. A garrison is standing at the target; a march
  // in flight is somewhere along its line, rounded to the nearest plot.
  const standing = row.garrison_until !== null;
  const progress = standing ? 1 : marchProgress(row.departed_at, row.arrives_at, now);
  const atX = Math.round(row.from_x + (row.to_x - row.from_x) * progress);
  const atY = Math.round(row.from_y + (row.to_y - row.from_y) * progress);

  // Claim it. Whichever column is the one that can only be won once is the
  // one to test, so two taps cannot both turn the same squad around and leave
  // it with two return legs - which the busy index would reject anyway, but
  // as a database error rather than an answer.
  const claim = standing
    ? await db
        .prepare(`UPDATE marches SET garrison_until = NULL WHERE id = ?1 AND garrison_until IS NOT NULL`)
        .bind(row.id)
        .run()
    : await db
        .prepare(`UPDATE marches SET resolved_at = ?2 WHERE id = ?1 AND resolved_at IS NULL`)
        .bind(row.id, now)
        .run();
  if ((claim.meta?.changes ?? 0) === 0) {
    return {ok: false, error: `Task Force ${squad} has already moved.`};
  }

  // The way back takes exactly as long as the way out has taken so far. Turn
  // around twenty seconds in and you are home twenty seconds later.
  //
  // Elapsed time, not distance. Distance would be re-rounded to a plot and put
  // through the same floor every march gets, so a squad recalled in the first
  // few seconds would still owe three quarters of a minute - which is not what
  // "I changed my mind" should cost. A garrison has already flown the whole
  // way, so it owes the whole way back.
  const outbound = row.arrives_at - row.departed_at;
  // Floored at a second so the return leg is always a real march with a real
  // duration - a zero-length one would divide by zero when the map drew it.
  const home = standing ? outbound : Math.min(outbound, Math.max(1000, now - row.departed_at));
  const arrivesAt = now + home;

  await db
    .prepare(
      `INSERT INTO marches
         (id, world_id, attacker_id, squad, defender_id, units,
          from_x, from_y, to_x, to_y, departed_at, arrives_at, kind)
       VALUES (?1,?2,?3,?4,?3,?5,?6,?7,?8,?9,?10,?11,'return')`,
    )
    .bind(
      newId(),
      row.world_id,
      playerId,
      squad,
      row.units,
      atX,
      atY,
      row.from_x,
      row.from_y,
      now,
      arrivesAt,
    )
    .run();

  return {ok: true, arrivesAt};
}
