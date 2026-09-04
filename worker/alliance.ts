/**
 * Alliances.
 *
 * Every permission question here is answered on the server and nowhere else.
 * The client hides buttons a player cannot use, but hiding a button is a
 * courtesy, not a check - the request it would have sent can be sent anyway.
 *
 * The rules, once, in one place:
 *
 *   leader   may do anything to anyone below them, edit the alliance, hand
 *            leadership over, and disband it.
 *   officer  may accept and decline applications, and remove members.
 *   member   may leave.
 *
 * Nobody may act on somebody of equal or higher rank. That single rule is what
 * stops two officers removing each other and what stops a leader being kicked
 * out of the alliance they founded.
 */
import {
  ALLIANCE_CAPACITY,
  type AllianceRank,
  DESCRIPTION_MAX,
  nameKey,
  outranks,
  validName,
  validTag,
} from '../shared/alliances';
import {BUILDING_KINDS, type BuildingKind, isBuildingKind, totalPower} from './game';

export interface AllianceRow {
  id: string;
  tag: string;
  name: string;
  description: string | null;
  home_world_id: number;
  open_join: number;
  created_at: number;
  emblem_tint: string;
  has_crest: number;
}

export interface MemberView {
  username: string;
  rank: AllianceRank;
  power: number;
  commandPost: number;
  joinedAt: number;
  portrait: {glyph: string; tint: string; hasImage: boolean};
}

export interface Membership {
  alliance: AllianceRow;
  rank: AllianceRank;
}

/** The alliance this player belongs to, if any. */
export async function membershipOf(
  db: D1Database,
  playerId: string,
): Promise<Membership | null> {
  const row = await db
    .prepare(
      `SELECT a.id AS id, a.tag AS tag, a.name AS name, a.description AS description,
              a.home_world_id AS home_world_id, a.open_join AS open_join,
              a.created_at AS created_at, a.emblem_tint AS emblem_tint,
              (CASE WHEN ap.alliance_id IS NULL THEN 0 ELSE 1 END) AS has_crest,
              m.rank AS rank
         FROM alliance_members m
         JOIN alliances a ON a.id = m.alliance_id
         LEFT JOIN alliance_portraits ap ON ap.alliance_id = a.id
        WHERE m.player_id = ?1`,
    )
    .bind(playerId)
    .first<AllianceRow & {rank: AllianceRank}>();
  if (!row) return null;
  const {rank, ...alliance} = row;
  return {alliance, rank};
}

/**
 * The roster, with each member's power computed the same way the profile
 * computes it.
 *
 * One query for the members and one for every building row belonging to them,
 * rather than a power query per member. A hundred-member alliance would
 * otherwise be a hundred round trips to open a screen.
 */
export async function rosterOf(db: D1Database, allianceId: string): Promise<MemberView[]> {
  const members = await db
    .prepare(
      `SELECT m.player_id AS id, m.rank AS rank, m.joined_at AS joined_at,
              p.username AS username, p.portrait_glyph AS glyph, p.portrait_tint AS tint,
              (CASE WHEN pp.player_id IS NULL THEN 0 ELSE 1 END) AS image
         FROM alliance_members m
         JOIN players p ON p.id = m.player_id
         LEFT JOIN player_portraits pp ON pp.player_id = m.player_id
        WHERE m.alliance_id = ?1`,
    )
    .bind(allianceId)
    .all<{
      id: string;
      rank: AllianceRank;
      joined_at: number;
      username: string;
      glyph: string;
      tint: string;
      image: number;
    }>();

  const rows = members.results ?? [];
  if (rows.length === 0) return [];

  const buildings = await db
    .prepare(
      `SELECT b.player_id AS id, b.kind AS kind, b.level AS level
         FROM buildings b
         JOIN alliance_members m ON m.player_id = b.player_id
        WHERE m.alliance_id = ?1`,
    )
    .bind(allianceId)
    .all<{id: string; kind: string; level: number}>();

  const levelsByPlayer = new Map<string, Record<BuildingKind, number>>();
  for (const row of rows) {
    levelsByPlayer.set(
      row.id,
      Object.fromEntries(BUILDING_KINDS.map((k) => [k, 0])) as Record<BuildingKind, number>,
    );
  }
  for (const b of buildings.results ?? []) {
    if (isBuildingKind(b.kind)) {
      const levels = levelsByPlayer.get(b.id);
      if (levels) levels[b.kind] = b.level;
    }
  }

  return rows
    .map((row) => {
      const levels = levelsByPlayer.get(row.id)!;
      return {
        username: row.username,
        rank: row.rank,
        power: totalPower(levels),
        commandPost: levels.command_post,
        joinedAt: row.joined_at,
        portrait: {glyph: row.glyph, tint: row.tint, hasImage: row.image === 1},
      };
    })
    // Leaders first, then by power. An alliance roster is a chain of command
    // and a threat assessment at the same time.
    .sort((a, b) => {
      const rank = {leader: 3, officer: 2, member: 1};
      return rank[b.rank] - rank[a.rank] || b.power - a.power;
    });
}

export async function memberCount(db: D1Database, allianceId: string): Promise<number> {
  const row = await db
    .prepare(`SELECT COUNT(*) AS n FROM alliance_members WHERE alliance_id = ?1`)
    .bind(allianceId)
    .first<{n: number}>();
  return row?.n ?? 0;
}

export type CreateResult =
  | {ok: true; id: string}
  | {ok: false; error: string};

/**
 * Creates an alliance and puts its founder in as leader.
 *
 * The uniqueness of the tag and the name is decided by the index, not by a
 * lookup first: two players naming an alliance the same thing in the same
 * instant would both find it free.
 */
export async function createAlliance(
  db: D1Database,
  playerId: string,
  homeWorldId: number,
  id: string,
  tag: string,
  name: string,
  description: string | null,
  openJoin: boolean,
  now: number,
): Promise<CreateResult> {
  if (!validTag(tag)) return {ok: false, error: 'Tag must be 2-4 letters.'};
  if (!validName(name)) return {ok: false, error: 'That name is not allowed.'};
  const trimmed = name.trim();

  try {
    await db.batch([
      db
        .prepare(
          `INSERT INTO alliances
             (id, tag, tag_key, name, name_key, description, home_world_id,
              open_join, created_at, created_by)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`,
        )
        .bind(
          id,
          tag.toUpperCase(),
          tag.toLowerCase(),
          trimmed,
          nameKey(trimmed),
          description ? description.slice(0, DESCRIPTION_MAX) : null,
          homeWorldId,
          openJoin ? 1 : 0,
          now,
          playerId,
        ),
      db
        .prepare(
          `INSERT INTO alliance_members (player_id, alliance_id, rank, joined_at)
           VALUES (?1, ?2, 'leader', ?3)`,
        )
        .bind(playerId, id, now),
    ]);
    return {ok: true, id};
  } catch {
    // Either the tag or the name is taken on this world, or this player joined
    // something else a moment ago. All three are "pick again".
    return {ok: false, error: 'That tag or name is already taken on your server.'};
  }
}

/** True when `actor` may act on `target` within the same alliance. */
export function mayActOn(actor: AllianceRank, target: AllianceRank): boolean {
  return outranks(actor, target);
}

export function atCapacity(count: number): boolean {
  return count >= ALLIANCE_CAPACITY;
}
