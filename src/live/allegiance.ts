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

export type Allegiance = 'ally' | 'server' | 'neutral' | 'hostile';

export interface AllegianceColours {
  /** Fills the whole plot. This is the only thing carrying meaning out here. */
  fill: string;
  /** A slightly lifted tone along the top edge, so a field of plots has grain. */
  top: string;
  label: string;
}

/**
 * The four states, and nothing else.
 *
 * Chosen far apart in brightness as well as hue, because hue alone does not
 * survive a dim screen, a phone in sunlight, or a colour-blind player - and
 * this is the one place in the game where misreading a colour loses a battle.
 * Read as greyscale the four still separate: gold near white, green and blue
 * in the middle at different weights, red darkest.
 *
 * There is no colour for yourself. Four meanings is already the most a player
 * can hold in their head at a glance, and your own base is the one you can
 * always find another way: it gets a white outline in your own allegiance's
 * colour, so it stays part of the picture rather than becoming a fifth thing
 * to learn.
 */
export const ALLEGIANCE: Record<Allegiance, AllegianceColours> = {
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
  isYou: boolean,
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

  if (isYou) {
    // Your own base keeps its allegiance colour and is found by its outline
    // instead, so finding yourself never costs a fifth meaning.
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1.5, size * 0.09);
    ctx.strokeRect(px + ctx.lineWidth / 2, py + ctx.lineWidth / 2, size - ctx.lineWidth, size - ctx.lineWidth);
  }

  ctx.restore();
}
