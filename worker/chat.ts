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
  LANGUAGE_CODES,
  allianceChannel,
  detectByScript,
  dmOther,
  leadershipChannel,
  mentionsIn,
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
  /** The message this one answers, when it answers one. */
  replyTo: string | null;
  replyAuthor: string | null;
  replyBody: string | null;
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
              t.body AS translated,
              m.reply_to AS replyTo, rp.username AS replyAuthor, rm.body AS replyBody
         FROM messages m
         JOIN players p ON p.id = m.author_id
         LEFT JOIN alliance_members am ON am.player_id = m.author_id
         LEFT JOIN player_portraits pp ON pp.player_id = m.author_id
         LEFT JOIN message_translations t
                ON t.message_id = m.id AND t.lang = ?4
         LEFT JOIN messages rm ON rm.id = m.reply_to
         LEFT JOIN players rp ON rp.id = rm.author_id
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
    // Only the script signal, never the word-list guess. The stored value may
    // have been settled by the classifier, and overruling a model's "es" with
    // a heuristic's "en" would undo the fix on every read.
    const lang = detectByScript(row.body);
    return !lang || lang === row.lang ? row : {...row, lang};
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
              t.body AS translated,
              m.reply_to AS replyTo, rp.username AS replyAuthor, rm.body AS replyBody
         FROM messages m
         JOIN players p ON p.id = m.author_id
         LEFT JOIN alliance_members am ON am.player_id = m.author_id
         LEFT JOIN player_portraits pp ON pp.player_id = m.author_id
         LEFT JOIN message_translations t
                ON t.message_id = m.id AND t.lang = ?3
         LEFT JOIN messages rm ON rm.id = m.reply_to
         LEFT JOIN players rp ON rp.id = rm.author_id
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

export const TRANSLATION_MODEL = '@cf/meta/m2m100-1.2b';

/**
 * A small instruct model, used only to name the language of a Latin-script
 * message. Chosen for being the cheapest thing that can answer rather than the
 * best at anything - the question has twenty possible answers and is asked
 * about one sentence.
 */
export const CLASSIFIER_MODEL = '@cf/meta/llama-3.2-1b-instruct';

/** Pull the generated text out of a text-generation result. */
export function readGenerated(result: unknown): string | null {
  if (typeof result === 'string') return result.trim() || null;
  if (!result || typeof result !== 'object') return null;
  const record = result as Record<string, unknown>;
  const direct = record.response ?? record.text;
  if (typeof direct === 'string' && direct.trim()) return direct.trim();
  if (record.result && typeof record.result === 'object') return readGenerated(record.result);
  return null;
}

/**
 * Settle the language of a message the script could not settle.
 *
 * Runs AFTER the send has been answered, never in front of it. A model call is
 * several hundred milliseconds and pressing Enter in a chat box has to feel
 * immediate, so the message is stored with the free guess and this corrects the
 * row behind it - well before anybody's four-second poll asks to translate it.
 *
 * Fails by leaving the row alone. The worst case is what we had before, a
 * message that does not translate; it is never a message that fails to send.
 */
export async function refineLanguage(
  env: TranslationEnv,
  messageId: string,
  body: string,
  stored: string,
): Promise<void> {
  // Hangul, kana, Cyrillic and the rest are already certain - asking a model
  // to confirm what the characters have said is a call bought for nothing.
  if (!env.AI || detectByScript(body)) return;

  const text = body.trim();
  if (text.length < 3) return;

  try {
    const result = await env.AI.run(CLASSIFIER_MODEL, {
      messages: [
        {
          role: 'system',
          content:
            'You identify what language a short chat message is written in. ' +
            'Answer with exactly one ISO 639-1 code from this list and nothing ' +
            `else: ${LANGUAGE_CODES.join(', ')}. No explanation, no punctuation.`,
        },
        {role: 'user', content: text},
      ],
      max_tokens: 4,
      // Deterministic: the same message must not be filed under two different
      // languages depending on when it happened to be sent.
      temperature: 0,
    });

    const raw = readGenerated(result);
    if (!raw) return;
    // Asked for a bare code and mostly gives one, but a stray word or full
    // stop should not lose the answer sitting inside it.
    const code = raw.toLowerCase().match(/[a-z]{2}/)?.[0];
    if (!code || !LANGUAGE_CODES.includes(code) || code === stored) return;

    await env.DB.prepare(`UPDATE messages SET lang = ?2 WHERE id = ?1`).bind(messageId, code).run();
  } catch (error) {
    console.log('classify: threw', error instanceof Error ? error.message : String(error));
  }
}

/**
 * Pull the translated string out of whatever the model returned.
 *
 * Written defensively on purpose. Workers AI has returned this in more than
 * one shape across model versions - bare, wrapped in `result`, and as a plain
 * string - and the failure mode of guessing wrong is silent: a translation
 * that is present but unreadable looks exactly like a translation that was
 * never produced.
 */
export function readTranslation(result: unknown): string | null {
  if (typeof result === 'string') return result.trim() || null;
  if (!result || typeof result !== 'object') return null;
  const record = result as Record<string, unknown>;
  const direct = record.translated_text ?? record.translation ?? record.text;
  if (typeof direct === 'string' && direct.trim()) return direct.trim();
  if (record.result && typeof record.result === 'object') {
    return readTranslation(record.result);
  }
  return null;
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
      const result = await env.AI.run(TRANSLATION_MODEL, {
        text: row.body,
        source_lang: row.lang,
        target_lang: target,
      });

      const text = readTranslation(result);
      if (!text) {
        // Logged rather than swallowed silently. A translation that never
        // arrives is invisible in the UI - the message simply shows in its
        // original language, which is also what a working model looks like
        // when nobody needed translating - so without this line the only
        // symptom of a broken binding is a feature that quietly does nothing.
        console.log('translate: no text in result', JSON.stringify(result)?.slice(0, 300));
        continue;
      }

      writes.push(
        env.DB.prepare(
          `INSERT INTO message_translations (message_id, lang, body)
           VALUES (?1, ?2, ?3) ON CONFLICT DO NOTHING`,
        ).bind(row.id, target, text),
      );
    } catch (error) {
      // One failed translation should not lose the others - but it should be
      // findable with `wrangler tail`, which is the only way to see it.
      console.log('translate: threw', error instanceof Error ? error.message : String(error));
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

/* -------------------------------------------------------------------------- */
/* Mentions                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Everybody who could be named in this channel.
 *
 * This is the autocomplete list AND the guest list a mention is checked
 * against, deliberately the same query. If they were separate, the check would
 * eventually drift from the offer and somebody would be notified about a
 * channel they cannot open - which hands them a line of text from it.
 */
export async function mentionableIn(
  db: D1Database,
  channel: string,
  viewer: Viewer,
): Promise<Array<{id: string; username: string}>> {
  const access = resolveAccess(channel, viewer);
  if (!access.ok) return [];

  if (channel.startsWith('server:')) {
    const id = Number(channel.slice('server:'.length));
    const rows = await db
      .prepare(
        `SELECT p.id AS id, p.username AS username
           FROM players p
           JOIN bases b ON b.player_id = p.id
          WHERE b.home_world_id = ?1
          ORDER BY p.username
          LIMIT 400`,
      )
      .bind(id)
      .all<{id: string; username: string}>();
    return rows.results ?? [];
  }

  if (channel.startsWith('alliance:') || channel.startsWith('leadership:')) {
    const id = channel.slice(channel.indexOf(':') + 1);
    // Leadership is the general and the lieutenants only, so naming a soldier
    // there must not reach them - they cannot open the channel to read it.
    const ranks = channel.startsWith('leadership:')
      ? `AND m.rank IN ('leader','officer')`
      : '';
    const rows = await db
      .prepare(
        `SELECT p.id AS id, p.username AS username
           FROM alliance_members m
           JOIN players p ON p.id = m.player_id
          WHERE m.alliance_id = ?1 ${ranks}
          ORDER BY p.username`,
      )
      .bind(id)
      .all<{id: string; username: string}>();
    return rows.results ?? [];
  }

  if (channel.startsWith('group:')) {
    const id = channel.slice('group:'.length);
    const rows = await db
      .prepare(
        `SELECT p.id AS id, p.username AS username
           FROM chat_group_members g
           JOIN players p ON p.id = g.player_id
          WHERE g.group_id = ?1
          ORDER BY p.username`,
      )
      .bind(id)
      .all<{id: string; username: string}>();
    return rows.results ?? [];
  }

  if (channel.startsWith('dm:')) {
    const other = dmOther(channel, viewer.playerId);
    if (!other) return [];
    const rows = await db
      .prepare(`SELECT id, username FROM players WHERE id IN (?1, ?2) ORDER BY username`)
      .bind(viewer.playerId, other)
      .all<{id: string; username: string}>();
    return rows.results ?? [];
  }

  return [];
}

/**
 * Turn the callsigns in a message into rows, for the people it may reach.
 *
 * A name that matches nobody in the channel is dropped without comment. That
 * covers a typo and it covers naming somebody who is not there, and the two
 * should behave the same: telling the sender which callsigns exist elsewhere
 * would make chat a membership oracle for every private channel in the game.
 *
 * Mentioning yourself is dropped too. It happens by accident when quoting, and
 * a badge for something you just typed is noise.
 */
export async function recordMentions(
  db: D1Database,
  messageId: string,
  channel: string,
  body: string,
  viewer: Viewer,
  now: number,
): Promise<string[]> {
  const names = mentionsIn(body);
  if (names.length === 0) return [];

  const roster = await mentionableIn(db, channel, viewer);
  const byName = new Map(roster.map((r) => [r.username.toLowerCase(), r]));

  const hit = names
    .map((name) => byName.get(name))
    .filter((row): row is {id: string; username: string} => !!row && row.id !== viewer.playerId);
  if (hit.length === 0) return [];

  await db.batch(
    hit.map((row) =>
      db
        .prepare(
          `INSERT INTO message_mentions (message_id, player_id, channel, created_at)
           VALUES (?1, ?2, ?3, ?4) ON CONFLICT DO NOTHING`,
        )
        .bind(messageId, row.id, channel, now),
    ),
  );
  return hit.map((row) => row.username);
}

export interface PendingMention {
  messageId: string;
  channel: string;
  createdAt: number;
  author: string;
  body: string;
}

/** Unseen mentions for one player, newest first. What the badge counts. */
export async function pendingMentions(
  db: D1Database,
  playerId: string,
  limit = 20,
): Promise<PendingMention[]> {
  const rows = await db
    .prepare(
      `SELECT mm.message_id AS messageId, mm.channel AS channel, mm.created_at AS createdAt,
              p.username AS author, m.body AS body
         FROM message_mentions mm
         JOIN messages m ON m.id = mm.message_id
         JOIN players p ON p.id = m.author_id
        WHERE mm.player_id = ?1 AND mm.seen_at IS NULL
        ORDER BY mm.created_at DESC
        LIMIT ?2`,
    )
    .bind(playerId, limit)
    .all<PendingMention>();
  return rows.results ?? [];
}

/**
 * Mark mentions seen.
 *
 * Scoped to one message when the player jumps to it, and to a whole channel
 * when they have actually opened and read it. Deliberately NOT tied to
 * channel_reads: scrolling past a busy channel should not clear a mention
 * somebody is waiting on an answer to.
 */
export async function clearMentions(
  db: D1Database,
  playerId: string,
  scope: {messageId?: string; channel?: string},
  now: number,
): Promise<void> {
  if (scope.messageId) {
    await db
      .prepare(
        `UPDATE message_mentions SET seen_at = ?3
          WHERE player_id = ?1 AND message_id = ?2 AND seen_at IS NULL`,
      )
      .bind(playerId, scope.messageId, now)
      .run();
    return;
  }
  if (scope.channel) {
    await db
      .prepare(
        `UPDATE message_mentions SET seen_at = ?3
          WHERE player_id = ?1 AND channel = ?2 AND seen_at IS NULL`,
      )
      .bind(playerId, scope.channel, now)
      .run();
  }
}
