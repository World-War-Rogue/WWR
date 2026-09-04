/**
 * Who is who, and the block that says so.
 *
 * Zoomed in, a base is a piece of art: the thing a player bought, and the
 * reason anyone customises anything. Zoomed out, art is the wrong information
 * entirely. A commander looking at forty plots is not asking which one has the
 * nicest throne - they are asking which of these can be attacked and which
 * will retaliate, and a map of forty distinct silhouettes answers a question
 * nobody asked while hiding the one that matters.
 *
 * So past a threshold every base becomes the same block and only its colour
 * differs. Identical shapes are the point: shape carries no meaning here, so
 * colour carries all of it, and allegiance reads across a whole screen at a
 * glance.
 */

export type Allegiance = 'you' | 'ally' | 'server' | 'neutral' | 'hostile';

export interface AllegianceColours {
  /** Fills the whole plot. This is the only thing carrying meaning out here. */
  fill: string;
  /** A slightly lifted tone along the top edge, so a field of plots has grain. */
  top: string;
  label: string;
}

/**
 * The five states, and nothing else.
 *
 * Chosen far apart in brightness as well as hue, because hue alone does not
 * survive a dim screen, a phone in sunlight, or a colour-blind player - and
 * this is the one place in the game where misreading a colour loses a battle.
 * Read as greyscale they still separate, in order: red darkest, then blue,
 * green, magenta, gold near white.
 *
 * Your own base is a colour of its own rather than a marker laid over another
 * one. Finding yourself is not a judgement about somebody else - it is the
 * first thing anyone does when the map opens, and an outline is something you
 * have to look for where a colour nothing else uses is something you land on.
 */
export const ALLEGIANCE: Record<Allegiance, AllegianceColours> = {
  // Magenta because nothing else in the game is anywhere near it. The ground
  // is sand, salt, olive and rock; the other four states run red, gold, green
  // and blue. This is the one hue that cannot be mistaken for a tile or for a
  // neighbour on any terrain, which is exactly what "where am I" needs.
  you: {fill: '#e879f9', top: '#f5d0fe', label: 'You'},
  ally: {fill: '#16a34a', top: '#4ade80', label: 'Your alliance'},
  // Gold rather than orange. Orange sits 25 degrees from red on the colour
  // wheel - the tightest pair in the set, and the two were being confused at
  // plot size. Gold moves it to 50 and, more usefully, separates it by
  // brightness: gold is the lightest colour here and red one of the darkest,
  // so they stay apart on a dim screen and for a colour-blind player, neither
  // of which hue alone survives.
  server: {fill: '#facc15', top: '#fef08a', label: 'Your server'},
  neutral: {fill: '#2563eb', top: '#60a5fa', label: 'Another server'},
  // Deepened a little to widen the gap from gold at the bottom end.
  hostile: {fill: '#c81e1e', top: '#f87171', label: 'At war'},
};

export interface Viewer {
  username: string;
  homeWorldId: number | null;
  allianceId: string | null;
}

export interface Subject {
  username: string;
  homeWorldId: number | null;
  allianceId?: string | null;
  /**
   * Set when an event has declared this base an opponent. Nothing sets it yet:
   * red is reserved for a war, and a war is a thing the event system will
   * decide. Until then the map has no red on it, which is correct - a colour
   * that means "at war" must not appear while nobody is.
   */
  atWar?: boolean;
}

/**
 * Where a base stands relative to the player looking at it.
 *
 * The order matters and is not arbitrary. War outranks everything: an ally who
 * has been declared an opponent for the duration of an event is an opponent,
 * and a map that painted them green would get somebody killed. Alliance
 * outranks server, because an alliance crosses servers and is the bond a
 * player actually acts on.
 *
 * Server means home world, not the world a base is standing in. Eight home
 * worlds share one map during an event, and telling a neighbour from a visitor
 * is the whole reason the event is worth attending.
 */
export function allegianceOf(subject: Subject, viewer: Viewer): Allegiance {
  // Ahead of everything, including war. You are not an entry in your own threat
  // assessment, and somebody hunting for their own base should not have to
  // reason about who they are currently fighting in order to find it.
  if (subject.username === viewer.username) return 'you';

  if (subject.atWar === true) return 'hostile';

  const theirs = subject.allianceId ?? null;
  if (theirs !== null && viewer.allianceId !== null && theirs === viewer.allianceId) {
    return 'ally';
  }

  if (
    subject.homeWorldId !== null &&
    viewer.homeWorldId !== null &&
    subject.homeWorldId === viewer.homeWorldId
  ) {
    return 'server';
  }

  // Another server, and not at war with you. Blue is deliberately the default
  // for a stranger: somebody you have no quarrel with yet is not an enemy, and
  // painting them as one would make every event look like a bloodbath before
  // anybody had declared anything.
  return 'neutral';
}

/**
 * The strategic marker: the whole plot, filled solid.
 *
 * Not a block standing on ground - a claimed square. At this zoom the map
 * stops being a place and becomes a holdings chart, and what a commander needs
 * to see is territory: where their alliance's colour is contiguous, where it
 * is not, and where somebody else's colour is pressing into it. A small
 * marker in the middle of an empty tile shows a base; a filled tile shows
 * ground held, and it is the only version you can read fifty at a time.
 */
export function drawAllegianceMarker(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  size: number,
  allegiance: Allegiance,
): void {
  const c = ALLEGIANCE[allegiance];

  ctx.save();
  ctx.fillStyle = c.fill;
  ctx.fillRect(px, py, size + 1, size + 1);

  // A lighter band along the top edge. Without it a run of adjacent plots in
  // the same colour merges into one shapeless field and the count is lost.
  ctx.fillStyle = c.top;
  ctx.fillRect(px, py, size + 1, Math.max(1, size * 0.14));

  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(px + 0.5, py + 0.5, size, size);

  ctx.restore();
}
