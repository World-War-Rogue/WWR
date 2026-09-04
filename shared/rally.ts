/**
 * Rendezvous points.
 *
 * A general or lieutenant drops one marker on the map; everyone else in the
 * alliance presses RV and lands beside it. Imported by both the Worker and the
 * client so the cooldown a button greys itself out on is the same number the
 * server enforces.
 */

/**
 * How long a player must wait between rallies.
 *
 * Rallying is free - a player who cannot afford to answer their general is a
 * player who stops being asked - so a cooldown is the only brake on it. Thirty
 * minutes is long enough that RV cannot be used to dodge every incoming attack
 * once combat exists, and short enough that a real operation can re-form after
 * one goes wrong.
 */
export const RALLY_COOLDOWN_MS = 30 * 60 * 1000;

/**
 * How far out the search for a free plot is allowed to spiral.
 *
 * Twenty rings is roughly 1,600 plots, which is far more than an alliance of a
 * hundred needs even in crowded ground. The cap exists so a rally into a
 * completely full region fails with a message rather than silently depositing
 * someone forty plots from the marker they were called to.
 */
export const RALLY_SEARCH_RINGS = 20;

/** Only these ranks may set or clear the marker. */
export type RallySetter = 'leader' | 'officer';

export function maySetRally(rank: string | null | undefined): rank is RallySetter {
  return rank === 'leader' || rank === 'officer';
}

export interface RallyPoint {
  x: number;
  y: number;
  worldId: number;
  /** Callsign of whoever planted it, so the alliance knows whose call this is. */
  setBy: string;
  setAt: number;
}

/** Milliseconds left on this player's cooldown; 0 when they may rally now. */
export function rallyCooldownLeft(ralliedAt: number, now: number): number {
  return Math.max(0, ralliedAt + RALLY_COOLDOWN_MS - now);
}

/** "12m", "45s" - short enough to sit inside a button. */
export function formatCooldown(ms: number): string {
  if (ms <= 0) return '';
  const seconds = Math.ceil(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.ceil(seconds / 60)}m`;
}

/**
 * Plots in rings outward from the centre, nearest first.
 *
 * The caller walks this and takes the first plot the database will accept, so
 * an alliance answering one call packs tightly around the marker instead of
 * scattering. Ring 0 is the marker itself, which is the right first try: if the
 * general planted it on empty ground, the first person to arrive gets it.
 *
 * This is a generator rather than an array because the common case exits on the
 * first or second ring, and building 1,600 coordinates to use three of them is
 * work nobody asked for.
 */
export function* ringsOutward(
  cx: number,
  cy: number,
  maxRings: number,
): Generator<{x: number; y: number}> {
  yield {x: cx, y: cy};
  for (let r = 1; r <= maxRings; r += 1) {
    // Top and bottom edges, corners included.
    for (let dx = -r; dx <= r; dx += 1) {
      yield {x: cx + dx, y: cy - r};
      yield {x: cx + dx, y: cy + r};
    }
    // Left and right edges, corners already emitted.
    for (let dy = -r + 1; dy <= r - 1; dy += 1) {
      yield {x: cx - r, y: cy + dy};
      yield {x: cx + r, y: cy + dy};
    }
  }
}
