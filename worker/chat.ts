/**
 * Chat.
 *
 * The only interesting question in here is who may read and write a channel,
 * and it is answered here every single time - on reads as well as on writes.
 *
 * A channel string arriving in a request is a claim, not a credential. Anyone
 * can type `alliance:<someone-elses-id>` into a URL, and if reads were trusted
 * because writes were checked, private alliance planning would be readable by
 * the people it is about. So `resolveAccess` runs on both.
 */
import {
  allianceChannel,
  dmOther,
  leadershipChannel,
  serverChannel,
} from '../shared/chat';

export type Access =
  | {ok: true; canWrite: boolean}
  | {ok: false; error: string};

export interface Viewer {
  playerId: string;
  homeWorldId: number | null;
  allianceId: string | null;
  rank: 'leader' | 'officer' | 'member' | null;
}

/**
 * Whether this player belongs in this channel.
 *
 * Membership is read fresh from the viewer on every request rather than
 * trusted from anything the client holds. Somebody removed from an alliance
 * loses the alliance channel on their next poll, not whenever their tab
 * happens to reload.
 */
export function resolveAccess(channel: string, viewer: Viewer): Access {
  if (channel.startsWith('server:')) {
    const id = Number(channel.slice('server:'.length));
    if (!Number.isFinite(id)) return {ok: false, error: 'No such channel.'};
    if (viewer.homeWorldId !== id) return {ok: false, error: 'That is another server.'};
    return {ok: true, canWrite: true};
  }

  if (channel.startsWith('alliance:')) {
    const id = channel.slice('alliance:'.length);
    if (!viewer.allianceId || viewer.allianceId !== id) {
      return {ok: false, error: 'You are not in that alliance.'};
    }
    return {ok: true, canWrite: true};
  }

  if (channel.startsWith('leadership:')) {
    const id = channel.slice('leadership:'.length);
    if (!viewer.allianceId || viewer.allianceId !== id) {
      return {ok: false, error: 'You are not in that alliance.'};
    }
    if (viewer.rank !== 'leader' && viewer.rank !== 'officer') {
      return {ok: false, error: 'Lieutenants and the general only.'};
    }
    return {ok: true, canWrite: true};
  }

  if (channel.startsWith('dm:')) {
    // A private channel names both its participants, so belonging to it is the
    // same question as being one of them.
    if (dmOther(channel, viewer.playerId) === null) {
      return {ok: false, error: 'That conversation is not yours.'};
    }
    return {ok: true, canWrite: true};
  }

  return {ok: false, error: 'No such channel.'};
}

/** The channels this player currently has, in tab order. */
export function channelsFor(viewer: Viewer): {
  server: string | null;
  alliance: string | null;
  leadership: string | null;
} {
  return {
    server: viewer.homeWorldId === null ? null : serverChannel(viewer.homeWorldId),
    alliance: viewer.allianceId === null ? null : allianceChannel(viewer.allianceId),
    leadership:
      viewer.allianceId !== null && (viewer.rank === 'leader' || viewer.rank === 'officer')
        ? leadershipChannel(viewer.allianceId)
        : null,
  };
}

export interface MessageRow {
  id: string;
  author: string;
  body: string;
  createdAt: number;
  rank: string | null;
  hasPortrait: number;
}

/**
 * Messages in a channel after an instant.
 *
 * `since` is a timestamp rather than an offset, so a client that has been
 * away for a minute asks for exactly what it missed instead of re-reading a
 * page and working out the overlap.
 */
export async function readChannel(
  db: D1Database,
  channel: string,
  since: number,
  limit: number,
): Promise<MessageRow[]> {
  const rows = await db
    .prepare(
      `SELECT m.id AS id, p.username AS author, m.body AS body,
              m.created_at AS createdAt, am.rank AS rank,
              (CASE WHEN pp.player_id IS NULL THEN 0 ELSE 1 END) AS hasPortrait
         FROM messages m
         JOIN players p ON p.id = m.author_id
         LEFT JOIN alliance_members am ON am.player_id = m.author_id
         LEFT JOIN player_portraits pp ON pp.player_id = m.author_id
        WHERE m.channel = ?1 AND m.created_at > ?2
        ORDER BY m.created_at ASC
        LIMIT ?3`,
    )
    .bind(channel, since, limit)
    .all<MessageRow>();
  return rows.results ?? [];
}

/**
 * The most recent messages, for opening a channel cold.
 *
 * Read newest-first so the index does the limiting, then reversed, because a
 * player opening a channel wants the end of the conversation and asking for
 * the oldest thousand to find it would get slower every day.
 */
export async function readRecent(
  db: D1Database,
  channel: string,
  limit: number,
): Promise<MessageRow[]> {
  const rows = await db
    .prepare(
      `SELECT m.id AS id, p.username AS author, m.body AS body,
              m.created_at AS createdAt, am.rank AS rank,
              (CASE WHEN pp.player_id IS NULL THEN 0 ELSE 1 END) AS hasPortrait
         FROM messages m
         JOIN players p ON p.id = m.author_id
         LEFT JOIN alliance_members am ON am.player_id = m.author_id
         LEFT JOIN player_portraits pp ON pp.player_id = m.author_id
        WHERE m.channel = ?1
        ORDER BY m.created_at DESC
        LIMIT ?2`,
    )
    .bind(channel, limit)
    .all<MessageRow>();
  return (rows.results ?? []).reverse();
}
