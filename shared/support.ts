/**
 * Bug reports, shared by the Worker and the client.
 *
 * Data only, like everything else in here - the Worker imports it too, so a
 * DOM reference or a Worker API stops one side compiling.
 */

/**
 * Characters in a report body.
 *
 * Four times a chat message. A bug report is the one place a player should be
 * able to write at length, and the thing that makes reports useless is people
 * running out of room before they get to what they actually did.
 */
export const REPORT_MAX = 2000;

/**
 * One report per player per minute.
 *
 * Not a spam defence so much as a double-submit defence: the failure mode is
 * somebody pressing the button again because nothing visible happened, which
 * is exactly what the access-request form already does wrong.
 */
export const REPORT_INTERVAL_MS = 60_000;

/** Console lines kept with a report. Enough to see a stack, not a session. */
export const REPORT_CONSOLE_MAX = 20;

/** Where the player was when they hit the button. */
export const REPORT_SCREENS = [
  'map',
  'base',
  'squads',
  'assets',
  'alliance',
  'chat',
  'profile',
  'customize',
  'battles',
  'other',
] as const;

export type ReportScreen = (typeof REPORT_SCREENS)[number];

export function isReportScreen(value: unknown): value is ReportScreen {
  return typeof value === 'string' && (REPORT_SCREENS as readonly string[]).includes(value);
}
