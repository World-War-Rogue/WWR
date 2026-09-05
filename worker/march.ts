/**
 * Launching a march, and settling it when it lands.
 *
 * Battles are resolved ON READ, like every other timer in this game. Nothing
 * ticks in the background: whoever looks at the world next settles any march
 * whose arrival instant has passed. A raid that lands at three in the morning
 * lands correctly anyway, and a world nobody is playing costs nothing to run.
 */
import {ASSET_BY_ID, type SquadName, assetPower, attributeAtLevel} from '../shared/assets';
import {GARRISON_HOURS, type MarchKind, marchSeconds, plotsBetween} from '../shared/march';
import {type SideSpec, resolve} from '../shared/combat';
import {readSquads} from './squads';

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

/** The units in one squad, ready for the resolver. */
async function unitsOf(
  db: D1Database,
  playerId: string,
  squad: SquadName,
): Promise<Array<{assetId: string; level: number}>> {
  const board = await readSquads(db, playerId);
  const ids = (board[squad] ?? []).filter((id): id is string => !!id);
  if (ids.length === 0) return [];
  const rows = await db
    .prepare(
      `SELECT asset_id AS assetId, level FROM player_assets WHERE player_id = ?1`,
    )
    .bind(playerId)
    .all<{assetId: string; level: number}>();
  const levels = new Map((rows.results ?? []).map((r) => [r.assetId, r.level]));
  return ids.map((id) => ({assetId: id, level: levels.get(id) ?? 1}));
}

/** Everything the defender still has at home. Squads that marched out are gone. */
async function homeUnits(
  db: D1Database,
  playerId: string,
): Promise<Array<{assetId: string; level: number}>> {
  const [board, away, rows] = await Promise.all([
    readSquads(db, playerId),
    marchingSquads(db, playerId),
    db
      .prepare(`SELECT asset_id AS assetId, level FROM player_assets WHERE player_id = ?1`)
      .bind(playerId)
      .all<{assetId: string; level: number}>(),
  ]);
  const levels = new Map((rows.results ?? []).map((r) => [r.assetId, r.level]));
  const out: Array<{assetId: string; level: number}> = [];
  for (const [squad, slots] of Object.entries(board)) {
    if (away.has(squad)) continue;
    for (const id of slots) {
      if (id) out.push({assetId: id, level: levels.get(id) ?? 1});
    }
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
): Promise<Array<{assetId: string; level: number}>> {
  const rows = await db
    .prepare(
      `SELECT units FROM marches
        WHERE defender_id = ?1 AND kind = 'reinforce'
          AND resolved_at IS NOT NULL
          AND garrison_until IS NOT NULL AND garrison_until > ?2`,
    )
    .bind(playerId, now)
    .all<{units: string}>();

  const out: Array<{assetId: string; level: number}> = [];
  for (const row of rows.results ?? []) {
    try {
      const parsed = JSON.parse(row.units) as Array<{assetId: string; level: number}>;
      if (Array.isArray(parsed)) out.push(...parsed);
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

  const units = await unitsOf(db, attackerId, squad);
  if (units.length === 0) return {ok: false, error: `${squad} is empty.`};

  // For the message only. The unique index below is what actually decides -
  // this just gets to say WHICH thing is wrong, since one index rejection can
  // mean either "that squad is out" or "you already reinforced them".
  const busy = await marchingSquads(db, attackerId);
  if (busy.has(squad)) return {ok: false, error: `${squad} is already out.`};

  // The column moves at the pace of its slowest vehicle, which is a real cost
  // of bringing heavy armour and a real reason to keep one fast squad.
  const slowest = Math.min(
    ...units.map((u) => {
      const asset = ASSET_BY_ID[u.assetId];
      return asset ? attributeAtLevel(asset.attributes.mobility, u.level) : 5;
    }),
  );
  const seconds = marchSeconds(plotsBetween(from.x, from.y, to.x, to.y), slowest);
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
        // Frozen here. What marched is what fights.
        JSON.stringify(units),
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
          : `${squad} is already marching.`,
    };
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
      `SELECT id, attacker_id, squad, units, from_x, from_y, to_x, to_y
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

    let units: Array<{assetId: string; level: number}> = [];
    try {
      const parsed = JSON.parse(row.units) as Array<{assetId: string; level: number}>;
      if (Array.isArray(parsed)) units = parsed;
    } catch {
      units = [];
    }
    const slowest = units.length
      ? Math.min(
          ...units.map((u) => {
            const asset = ASSET_BY_ID[u.assetId];
            return asset ? attributeAtLevel(asset.attributes.mobility, u.level) : 5;
          }),
        )
      : 5;
    const home = marchSeconds(
      plotsBetween(row.to_x, row.to_y, row.from_x, row.from_y),
      slowest,
    );

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
        now + home * 1000,
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
              m.from_x, m.from_y, m.to_x, m.to_y, m.arrives_at
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
    let attackUnits: Array<{assetId: string; level: number}> = [];
    try {
      const parsed = JSON.parse(march.units) as Array<{assetId: string; level: number}>;
      if (Array.isArray(parsed)) attackUnits = parsed;
    } catch {
      attackUnits = [];
    }

    const [ownUnits, reinforcements, defenderBase] = await Promise.all([
      homeUnits(db, march.defender_id),
      garrisonUnits(db, march.defender_id, now),
      db
        .prepare(`SELECT command_post FROM buildings WHERE player_id = ?1`)
        .bind(march.defender_id)
        .first<{command_post: number}>()
        .catch(() => null),
    ]);

    // Everything at home, plus whatever allies have parked here. This is the
    // payoff for reinforcing and the reason it is worth a squad.
    const defendUnits = [...ownUnits, ...reinforcements];

    // Home ground. Passed IN to the resolver rather than read inside it, so
    // the arena - which has no base - cannot inherit a bonus.
    const cp = defenderBase?.command_post ?? 0;
    const attacker: SideSpec = {name: march.attacker, units: attackUnits};
    const defender: SideSpec = {
      name: march.defender,
      units: defendUnits,
      modifier: 1 + Math.min(0.25, cp * 0.015),
    };

    const seed = Math.abs(hash(march.id)) % 2147483647;
    const result = resolve(attacker, defender, seed);

    const battleId = newId();
    const power = (us: Array<{assetId: string; level: number}>) =>
      us.reduce((sum, u) => {
        const asset = ASSET_BY_ID[u.assetId];
        return sum + (asset ? assetPower(asset, u.level) : 0);
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

    // The survivors walk home, the same distance, in public. A squad is away
    // for the whole round trip rather than only the journey out, which is most
    // of what an attack actually costs - and anybody who watched it leave
    // knows exactly how long its owner is short a squad.
    const survivors = attackUnits.filter(
      (u) => !result.attacker.units.find((r) => r.assetId === u.assetId && r.damaged),
    );
    if (survivors.length > 0) {
      const slowest = Math.min(
        ...survivors.map((u) => {
          const asset = ASSET_BY_ID[u.assetId];
          return asset ? attributeAtLevel(asset.attributes.mobility, u.level) : 5;
        }),
      );
      const home = marchSeconds(
        plotsBetween(march.to_x, march.to_y, march.from_x, march.from_y),
        slowest,
      );
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
          now + home * 1000,
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
