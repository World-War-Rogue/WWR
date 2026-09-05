/**
 * Bug reports.
 *
 * The rule this module exists to enforce: a report must not depend on the
 * thing being reported. It does not go through chat, it is not translated on
 * the way in, and it does not need the player to know what to include. It is
 * one insert into a table the owner drains deliberately.
 */
import {REPORT_CONSOLE_MAX, REPORT_INTERVAL_MS, REPORT_MAX, isReportScreen} from '../shared/support';
import {newId} from './auth';

export interface ReportInput {
  body: unknown;
  screen: unknown;
  build: unknown;
  viewport: unknown;
  console: unknown;
}

export interface ReportRow {
  id: string;
  callsign: string;
  createdAt: number;
  body: string;
  lang: string;
  screen: string | null;
  build: string | null;
  worldId: number | null;
  viewport: string | null;
  userAgent: string | null;
  console: string | null;
  status: string;
  notes: string | null;
}

/** Trim to a bound, or null. Applied to everything the client sends. */
function bounded(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  return trimmed.slice(0, max);
}

/**
 * Console lines, as a bounded JSON array.
 *
 * Re-serialised here rather than stored as the client sent it, so a client
 * that sends a megabyte of log, or something that is not an array of strings,
 * cannot decide what goes in the column.
 */
function consoleLines(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  const lines = value
    .filter((line): line is string => typeof line === 'string')
    .slice(-REPORT_CONSOLE_MAX)
    .map((line) => line.slice(0, 500));
  return lines.length === 0 ? null : JSON.stringify(lines);
}

/**
 * When this player may file again, or null if they may file now.
 *
 * Read rather than enforced by an index, because the limit is a window rather
 * than a uniqueness rule, and the answer wants to be a friendly message
 * instead of a constraint violation.
 */
export async function reportAllowedAt(
  db: D1Database,
  playerId: string,
  now: number,
): Promise<number | null> {
  const row = await db
    .prepare(
      `SELECT created_at AS createdAt FROM bug_reports
        WHERE player_id = ?1 ORDER BY created_at DESC LIMIT 1`,
    )
    .bind(playerId)
    .first<{createdAt: number}>();
  if (!row) return null;
  const next = row.createdAt + REPORT_INTERVAL_MS;
  return next > now ? next : null;
}

/**
 * File a report.
 *
 * Returns the id, which the client shows back to the player. A reference they
 * can quote is the cheapest way to make a form feel like it did something -
 * the access-request form says nothing and people submit it twice.
 */
export async function fileReport(
  db: D1Database,
  player: {id: string; username: string; homeWorldId: number | null},
  language: string,
  userAgent: string | null,
  input: ReportInput,
  now: number,
): Promise<{ok: true; id: string} | {ok: false; error: string}> {
  const body = bounded(input.body, REPORT_MAX);
  if (!body) return {ok: false, error: 'Describe what happened.'};

  const id = newId();
  await db
    .prepare(
      `INSERT INTO bug_reports
         (id, player_id, callsign, created_at, body, lang,
          screen, build, world_id, viewport, user_agent, console)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)`,
    )
    .bind(
      id,
      player.id,
      player.username,
      now,
      body,
      language,
      isReportScreen(input.screen) ? input.screen : null,
      bounded(input.build, 64),
      player.homeWorldId,
      bounded(input.viewport, 32),
      bounded(userAgent, 300),
      consoleLines(input.console),
    )
    .run();

  // Confirm the write with a read. D1 has returned code 7403 on a write that
  // had not landed, and the whole point of this table is that a report is
  // never silently lost - telling somebody it was filed when it was not is
  // worse than telling them to try again.
  const check = await db
    .prepare(`SELECT id FROM bug_reports WHERE id = ?1`)
    .bind(id)
    .first<{id: string}>();
  if (!check) return {ok: false, error: 'That did not save. Try once more.'};

  return {ok: true, id};
}

const REPORT_COLUMNS = `id, callsign, created_at AS createdAt, body, lang, screen, build,
         world_id AS worldId, viewport, user_agent AS userAgent, console, status, notes`;

/**
 * The queue, newest first. Owner-only.
 *
 * This is the read that makes the table worth having: one query returns every
 * report with its context already attached, so triage never starts with a
 * round of questions.
 */
export async function recentReports(
  db: D1Database,
  status: string | null,
  limit: number,
): Promise<ReportRow[]> {
  const rows = status
    ? await db
        .prepare(
          `SELECT ${REPORT_COLUMNS} FROM bug_reports
            WHERE status = ?1 ORDER BY created_at DESC LIMIT ?2`,
        )
        .bind(status, limit)
        .all<ReportRow>()
    : await db
        .prepare(`SELECT ${REPORT_COLUMNS} FROM bug_reports ORDER BY created_at DESC LIMIT ?1`)
        .bind(limit)
        .all<ReportRow>();
  return rows.results ?? [];
}
