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
  detectLanguage,
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
  /** Group ids this player belongs to. Membership is the only permission. */
  groupIds: string[];
  /** What they want to read in. */
  language: string;
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

  if (channel.startsWith('group:')) {
    const id = channel.slice('group:'.length);
    // Membership is the whole rule. There is no owner and no admin, so there
    // is nothing else to check.
    if (!viewer.groupIds.includes(id)) {
      return {ok: false, error: 'That conversation is not yours.'};
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
  /** The language it was typed in. */
  lang: string;
  /** Filled in when the reader's language differs and a translation exists. */
  translated: string | null;
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
  language: string,
): Promise<MessageRow[]> {
  const rows = await db
    .prepare(
      `SELECT m.id AS id, p.username AS author, m.body AS body,
              m.created_at AS createdAt, am.rank AS rank, m.lang AS lang,
              (CASE WHEN pp.player_id IS NULL THEN 0 ELSE 1 END) AS hasPortrait,
              t.body AS translated
         FROM messages m
         JOIN players p ON p.id = m.author_id
         LEFT JOIN alliance_members am ON am.player_id = m.author_id
         LEFT JOIN player_portraits pp ON pp.player_id = m.author_id
         LEFT JOIN message_translations t
                ON t.message_id = m.id AND t.lang = ?4
        WHERE m.channel = ?1 AND m.created_at > ?2
        ORDER BY m.created_at ASC
        LIMIT ?3`,
    )
    .bind(channel, since, limit, language)
    .all<MessageRow>();
  return correctLang(rows.results ?? []);
}

/**
 * Re-derive each message's language from its body.
 *
 * Messages written before language was detected at send time carry their
 * author's preference in `lang`, which is what made an English speaker's
 * Korean message claim to be English and go untranslated. Correcting it here
 * rather than migrating the column means old messages start translating
 * immediately and the tag under them names the language they are actually in.
 * It is a regex over a screenful of text, not a model call.
 */
function correctLang(rows: MessageRow[]): MessageRow[] {
  return rows.map((row) => {
    const lang = detectLanguage(row.body, row.lang);
    return lang === row.lang ? row : {...row, lang};
  });
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
  language: string,
): Promise<MessageRow[]> {
  const rows = await db
    .prepare(
      `SELECT m.id AS id, p.username AS author, m.body AS body,
              m.created_at AS createdAt, am.rank AS rank, m.lang AS lang,
              (CASE WHEN pp.player_id IS NULL THEN 0 ELSE 1 END) AS hasPortrait,
              t.body AS translated
         FROM messages m
         JOIN players p ON p.id = m.author_id
         LEFT JOIN alliance_members am ON am.player_id = m.author_id
         LEFT JOIN player_portraits pp ON pp.player_id = m.author_id
         LEFT JOIN message_translations t
                ON t.message_id = m.id AND t.lang = ?3
        WHERE m.channel = ?1
        ORDER BY m.created_at DESC
        LIMIT ?2`,
    )
    .bind(channel, limit, language)
    .all<MessageRow>();
  return correctLang((rows.results ?? []).reverse());
}

/* -------------------------------------------------------------------------- */
/* Translation                                                                */
/* -------------------------------------------------------------------------- */

interface TranslationEnv {
  DB: D1Database;
  AI?: {run: (model: string, input: unknown) => Promise<unknown>};
}

/**
 * Translates whatever the reader has not seen translated yet.
 *
 * Run after the response has already gone out, so a message appears
 * immediately in the language it was typed in and grows a translation a second
 * later. Translating inline would put a model call - hundreds of milliseconds
 * each - between the player and every message in the channel.
 *
 * Everything here fails quietly. A model outage should mean chat without
 * translations, not chat that does not load.
 */
export async function translateMissing(
  env: TranslationEnv,
  rows: MessageRow[],
  target: string,
): Promise<void> {
  if (!env.AI) return;

  const pending = rows
    // `lang` was already corrected against the body by the read that produced
    // these rows, so a message mislabelled with its author's preference is not
    // skipped here for claiming to already be in the reader's language.
    .filter((r) => r.translated === null && r.lang !== target && r.body.length > 0)
    // A cap per request, because a player scrolling into a long history should
    // not trigger eighty model calls at once.
    .slice(0, 8);
  if (pending.length === 0) return;

  const writes: D1PreparedStatement[] = [];
  for (const row of pending) {
    try {
      const result = (await env.AI.run('@cf/meta/m2m100-1.2b', {
        text: row.body,
        source_lang: row.lang,
        target_lang: target,
      })) as {translated_text?: string} | null;

      const text = result?.translated_text?.trim();
      if (!text) continue;

      writes.push(
        env.DB.prepare(
          `INSERT INTO message_translations (message_id, lang, body)
           VALUES (?1, ?2, ?3) ON CONFLICT DO NOTHING`,
        ).bind(row.id, target, text),
      );
    } catch {
      // One failed translation should not lose the others.
    }
  }

  if (writes.length > 0) {
    try {
      await env.DB.batch(writes);
    } catch {
      // Cache write failed; it will be retried on the next read.
    }
  }
}
