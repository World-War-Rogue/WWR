/**
 * Player profiles.
 *
 * The card another player sees when they click a base. It is public by design -
 * a game where you cannot size up a neighbour before marching on them is a
 * game where every attack is a coin toss - so what goes in it is chosen
 * carefully: everything here is something a player would expect a stranger to
 * be able to see.
 *
 * What is deliberately NOT here: email, anything about the account, when they
 * last signed in, and any location beyond the flag they chose to fly. A profile
 * answers "who am I looking at and can I take them", not "who is this person".
 */
import {
  BUILDING_KINDS,
  type BuildingKind,
  isBuildingKind,
  totalPower,
} from './game';
import {
  DEFAULT_PORTRAIT,
  isPortraitGlyph,
  isPortraitTint,
  MOTTO_MAX,
  PORTRAIT_MAX_BYTES,
  PORTRAIT_MIMES,
  type PortraitMime,
} from '../shared/portraits';

export interface PublicProfile {
  username: string;
  /** `image` is null unless they have uploaded one; the glyph is the fallback. */
  portrait: {glyph: string; tint: string; image: string | null};
  motto: string | null;
  /** ISO 3166-1 alpha-2. The client turns it into a flag and a name. */
  country: string;
  /** Home world - the server they came from, not the one they stand in. */
  homeWorldId: number | null;
  power: number;
  commandPost: number;
  baseName: string;
  skin: string;
  /** Null until alliances exist. */
  alliance: string | null;
  plot: {x: number; y: number} | null;
  joinedAt: number | null;
}

interface Row {
  id: string;
  username: string;
  country: string;
  portrait_glyph: string;
  portrait_tint: string;
  motto: string | null;
  approved_at: number | null;
  base_name: string | null;
  skin: string | null;
  home_world_id: number | null;
  plot_x: number | null;
  plot_y: number | null;
  portrait_image: string | null;
}

/**
 * Looks up a profile by callsign.
 *
 * Case-insensitive, because a callsign is how players refer to each other out
 * loud and nobody remembers capitalisation.
 */
export async function loadProfile(
  db: D1Database,
  username: string,
): Promise<PublicProfile | null> {
  const row = await db
    .prepare(
      `SELECT p.id AS id, p.username AS username, p.country AS country,
              p.portrait_glyph AS portrait_glyph, p.portrait_tint AS portrait_tint,
              p.motto AS motto, p.approved_at AS approved_at,
              b.name AS base_name, b.skin AS skin, b.home_world_id AS home_world_id,
              pl.plot_x AS plot_x, pl.plot_y AS plot_y,
              pp.data_url AS portrait_image
         FROM players p
         LEFT JOIN bases b ON b.player_id = p.id
         LEFT JOIN placements pl
                ON pl.player_id = p.id AND pl.world_id = b.home_world_id
         LEFT JOIN player_portraits pp ON pp.player_id = p.id
        WHERE p.username = ?1 COLLATE NOCASE`,
    )
    .bind(username)
    .first<Row>();
  if (!row) return null;

  const buildingRows = await db
    .prepare(`SELECT kind, level FROM buildings WHERE player_id = ?1`)
    .bind(row.id)
    .all<{kind: string; level: number}>();

  const levels = Object.fromEntries(
    BUILDING_KINDS.map((k) => [k, 0]),
  ) as Record<BuildingKind, number>;
  for (const b of buildingRows.results ?? []) {
    if (isBuildingKind(b.kind)) levels[b.kind] = b.level;
  }

  return {
    username: row.username,
    portrait: {
      glyph: isPortraitGlyph(row.portrait_glyph) ? row.portrait_glyph : DEFAULT_PORTRAIT.glyph,
      tint: isPortraitTint(row.portrait_tint) ? row.portrait_tint : DEFAULT_PORTRAIT.tint,
      image: row.portrait_image,
    },
    motto: row.motto,
    country: row.country,
    homeWorldId: row.home_world_id,
    power: totalPower(levels),
    commandPost: levels.command_post,
    baseName: row.base_name ?? `${row.username}'s Forward Base`,
    skin: row.skin ?? 'desert_fob',
    alliance: null,
    plot: row.plot_x !== null && row.plot_y !== null ? {x: row.plot_x, y: row.plot_y} : null,
    joinedAt: row.approved_at,
  };
}

export interface ProfileEdit {
  glyph?: unknown;
  tint?: unknown;
  motto?: unknown;
}

export type EditResult =
  | {ok: true; glyph: string; tint: string; motto: string | null}
  | {ok: false; error: string};

/**
 * Strips control characters, including the line breaks that would otherwise
 * let one player push another's card off the screen.
 *
 * Done by code point rather than by a regex range, because a regex literal
 * containing raw control characters is a thing that survives review and then
 * breaks something else entirely.
 */
function flatten(text: string): string {
  let out = '';
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    out += code < 0x20 || code === 0x7f ? ' ' : ch;
  }
  return out.trim();
}

/**
 * Validates an edit to your own profile.
 *
 * The motto is the only free text a player puts in front of other players, so
 * it is capped and flattened here. It is NOT HTML-escaped: React renders it as
 * text, and escaping at the boundary would mean storing "&amp;" and showing
 * that back to whoever typed an ampersand.
 */
export function validateEdit(edit: ProfileEdit): EditResult {
  if (edit.glyph !== undefined && !isPortraitGlyph(edit.glyph)) {
    return {ok: false, error: 'That portrait does not exist.'};
  }
  if (edit.tint !== undefined && !isPortraitTint(edit.tint)) {
    return {ok: false, error: 'That colour does not exist.'};
  }

  let motto: string | null = null;
  if (typeof edit.motto === 'string') {
    const cleaned = flatten(edit.motto);
    if (cleaned.length > MOTTO_MAX) {
      return {ok: false, error: `Motto must be ${MOTTO_MAX} characters or fewer.`};
    }
    motto = cleaned.length > 0 ? cleaned : null;
  } else if (edit.motto !== undefined && edit.motto !== null) {
    return {ok: false, error: 'Motto must be text.'};
  }

  return {
    ok: true,
    glyph: isPortraitGlyph(edit.glyph) ? edit.glyph : DEFAULT_PORTRAIT.glyph,
    tint: isPortraitTint(edit.tint) ? edit.tint : DEFAULT_PORTRAIT.tint,
    motto,
  };
}

/* -------------------------------------------------------------------------- */
/* Uploaded portraits                                                         */
/* -------------------------------------------------------------------------- */

export type PortraitResult =
  | {ok: true; mime: PortraitMime; dataUrl: string; bytes: number}
  | {ok: false; error: string};

/**
 * Checks an uploaded portrait before it is stored.
 *
 * The Workers runtime cannot decode an image, so this cannot confirm the file
 * is a picture of anything. What it can do is confirm the bytes begin the way
 * the claimed format begins. Without that check the field accepts any base64 a
 * client cares to send, and the size cap becomes the only thing between this
 * table and being general-purpose storage.
 *
 * JPEG starts FF D8 FF. WebP is a RIFF container whose fourth word is 'WEBP'.
 */
export function validatePortrait(raw: unknown): PortraitResult {
  if (typeof raw !== 'string') return {ok: false, error: 'No image received.'};

  const comma = raw.indexOf(',');
  if (!raw.startsWith('data:') || comma < 0) {
    return {ok: false, error: 'That is not an image.'};
  }

  const header = raw.slice(5, comma);
  if (!header.endsWith(';base64')) return {ok: false, error: 'That is not an image.'};
  const mime = header.slice(0, header.length - 7) as PortraitMime;
  if (!(PORTRAIT_MIMES as readonly string[]).includes(mime)) {
    return {ok: false, error: 'Portraits must be WebP or JPEG.'};
  }

  const body = raw.slice(comma + 1);
  const padding = body.endsWith('==') ? 2 : body.endsWith('=') ? 1 : 0;
  const bytes = Math.floor((body.length * 3) / 4) - padding;
  if (bytes <= 0) return {ok: false, error: 'That image is empty.'};
  if (bytes > PORTRAIT_MAX_BYTES) {
    return {ok: false, error: 'That image is too large after cropping.'};
  }

  let head: string;
  try {
    head = atob(body.slice(0, 32));
  } catch {
    return {ok: false, error: 'That image could not be read.'};
  }

  if (mime === 'image/jpeg') {
    if (
      head.charCodeAt(0) !== 0xff ||
      head.charCodeAt(1) !== 0xd8 ||
      head.charCodeAt(2) !== 0xff
    ) {
      return {ok: false, error: 'That file is not really a JPEG.'};
    }
  } else if (head.slice(0, 4) !== 'RIFF' || head.slice(8, 12) !== 'WEBP') {
    return {ok: false, error: 'That file is not really a WebP.'};
  }

  return {ok: true, mime, dataUrl: raw, bytes};
}

/** Stores a portrait, replacing whatever was there. */
export async function savePortrait(
  db: D1Database,
  playerId: string,
  result: Extract<PortraitResult, {ok: true}>,
  now: number,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO player_portraits (player_id, mime, data_url, bytes, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5)
       ON CONFLICT(player_id) DO UPDATE SET
         mime = excluded.mime, data_url = excluded.data_url,
         bytes = excluded.bytes, updated_at = excluded.updated_at`,
    )
    .bind(playerId, result.mime, result.dataUrl, result.bytes, now)
    .run();
}

/** Removes a portrait. The player falls back to their glyph, never to nothing. */
export async function clearPortrait(db: D1Database, playerId: string): Promise<void> {
  await db.prepare(`DELETE FROM player_portraits WHERE player_id = ?1`).bind(playerId).run();
}
