/**
 * Rogue Standard Time.
 *
 * Decided in docs/season-1/07-GAME-TIME.md. Game time is UTC-7, permanently,
 * with no daylight saving. Arizona is where the idea came from; Arizona is the
 * explanation and not the specification. The specification is the offset.
 *
 * ── Why arithmetic and not a timezone ─────────────────────────────────────
 *
 * `Intl.DateTimeFormat` with `timeZone: 'America/Phoenix'` would make the game
 * clock a dependency on the IANA timezone database, so a future rule change
 * would silently move every published war window. It is also ambiguous: the
 * Navajo Nation observes daylight saving inside Arizona, so "Arizona time" is
 * not one thing. A fixed offset is.
 *
 * ── Why this is shared ────────────────────────────────────────────────────
 *
 * Same reason as the counter table and the terrain generator: a Worker and a
 * client that each own a copy of the offset will eventually disagree about when
 * a war window closes, and that is not a bug anyone enjoys finding.
 *
 * ── What is NOT stored in game time ───────────────────────────────────────
 *
 * Nothing. Every instant in the database is absolute epoch milliseconds and
 * stays that way. This is a display transform applied at the edge, plus the
 * week boundary the weekly grant is anchored to.
 */

/** UTC-7, in minutes. Negative, like getTimezoneOffset, because it is behind. */
export const GAME_OFFSET_MINUTES = -7 * 60;
export const GAME_OFFSET_MS = GAME_OFFSET_MINUTES * 60_000;

/** Not "Arizona", and not seasonal - seasons change, the clock does not. */
export const CLOCK_NAME = 'RST';
export const CLOCK_OFFSET_LABEL = 'UTC-7';

const DAY_MS = 86_400_000;

export interface GameParts {
  year: number;
  month: number;
  /** 1-31. */
  day: number;
  /** 0-23. Always. See `formatClock`. */
  hour: number;
  minute: number;
  second: number;
  /** 0 = Sunday, matching Date.getUTCDay. */
  weekday: number;
}

/**
 * The calendar and clock reading at an instant, in game time.
 *
 * Shifts the instant and then reads UTC components off it, which is the whole
 * trick: the shifted Date is never treated as a real instant, only as a carrier
 * for the digits.
 */
export function gameParts(instant: number): GameParts {
  const d = new Date(instant + GAME_OFFSET_MS);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    second: d.getUTCSeconds(),
    weekday: d.getUTCDay(),
  };
}

const pad2 = (n: number) => (n < 10 ? `0${n}` : String(n));

/**
 * 24-hour time: `14:07`.
 *
 * Not 02:07 PM. AM and PM are an English convention; most of the nineteen
 * languages the game ships in use a 24-hour clock, and `14:07` needs no
 * translation key at all while "PM" does.
 */
export function formatClock(instant: number): string {
  const p = gameParts(instant);
  return `${pad2(p.hour)}:${pad2(p.minute)}`;
}

/** `14:07:32`, for anywhere the seconds are the point. */
export function formatClockSeconds(instant: number): string {
  const p = gameParts(instant);
  return `${pad2(p.hour)}:${pad2(p.minute)}:${pad2(p.second)}`;
}

/**
 * `14:07 RST (UTC-7)`.
 *
 * Anything SCHEDULED renders the offset alongside the name, so a player who has
 * never heard of RST can work out their own local time without asking. A
 * timestamp on a message they are looking at right now does not need it.
 */
export function formatClockWithOffset(instant: number): string {
  return `${formatClock(instant)} ${CLOCK_NAME} (${CLOCK_OFFSET_LABEL})`;
}

/** `2026-09-05`. Sortable, and unambiguous in every locale the game ships in. */
export function formatGameDate(instant: number): string {
  const p = gameParts(instant);
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}`;
}

/**
 * The most recent midnight RST at or before an instant.
 *
 * The logical day boundary. A season can begin at any time of day - including
 * "whenever we finished building it" - and daily operations still roll over at
 * midnight game time rather than at 14:37 for reasons nobody can explain.
 */
export function gameDayStart(instant: number): number {
  const shifted = instant + GAME_OFFSET_MS;
  return Math.floor(shifted / DAY_MS) * DAY_MS - GAME_OFFSET_MS;
}

/**
 * Which game week an instant falls in, counted from the Unix epoch.
 *
 * Weeks start Monday at 00:00 RST. 1970-01-01 was a Thursday, so days are
 * shifted by three before dividing - which puts Monday 1970-01-05 at the start
 * of week 1 and leaves the four-day stub before it as week 0.
 *
 * This is an INDEX, not a timestamp, and it is what the weekly Token grant is
 * keyed on. Comparing indexes means the grant cannot fire twice in one week
 * however many times a player reloads, and cannot be missed by a player who
 * happens to log in at 00:00:00.4 on the Monday.
 */
export function gameWeekIndex(instant: number): number {
  const day = Math.floor((instant + GAME_OFFSET_MS) / DAY_MS);
  return Math.floor((day + 3) / 7);
}

/** The instant a game week began. The inverse of `gameWeekIndex`. */
export function gameWeekStart(index: number): number {
  return (index * 7 - 3) * DAY_MS - GAME_OFFSET_MS;
}
