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

export type Allegiance = 'you' | 'ally' | 'server' | 'enemy';

export interface AllegianceColours {
  fill: string;
  top: string;
  edge: string;
  label: string;
}

/**
 * Deliberately far apart on the colour wheel, and distinguishable by
 * brightness as well as by hue - a red and a green of the same value are the
 * commonest pair to be indistinguishable to a colour-blind player, and this is
 * the one place in the game where misreading a colour loses a battle.
 */
export const ALLEGIANCE: Record<Allegiance, AllegianceColours> = {
  you: {fill: '#c2410c', top: '#f97316', edge: '#ffedd5', label: 'You'},
  ally: {fill: '#15803d', top: '#4ade80', edge: '#dcfce7', label: 'Alliance'},
  server: {fill: '#1d4ed8', top: '#60a5fa', edge: '#dbeafe', label: 'Your server'},
  enemy: {fill: '#9f1239', top: '#fb7185', edge: '#ffe4e6', label: 'Hostile'},
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
}

/**
 * Where a base stands relative to the player looking at it.
 *
 * Home world, not current world: in an event world eight servers share one
 * map, and telling a neighbour from an invader is the whole reason the event
 * is interesting. Everyone in your own home world is `server` - not a friend,
 * but not someone you are being asked to burn either.
 */
export function allegianceOf(subject: Subject, viewer: Viewer): Allegiance {
  if (subject.username === viewer.username) return 'you';

  const theirs = subject.allianceId ?? null;
  if (theirs !== null && viewer.allianceId !== null && theirs === viewer.allianceId) {
    return 'ally';
  }

  // An unknown home world is treated as hostile rather than as neutral. The
  // expensive mistake is assuming a stranger is safe, not the other way round.
  if (
    subject.homeWorldId !== null &&
    viewer.homeWorldId !== null &&
    subject.homeWorldId === viewer.homeWorldId
  ) {
    return 'server';
  }
  return 'enemy';
}

/**
 * The strategic marker: one shape for everybody.
 *
 * Drawn as a slab with a lit top face rather than a flat square, so a screen of
 * them still reads as objects standing on ground instead of as a spreadsheet.
 * Level is shown as height, which is the one piece of information worth
 * carrying down to this zoom - a tall block is somebody to think about.
 */
export function drawAllegianceMarker(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  size: number,
  allegiance: Allegiance,
  level: number,
): void {
  const c = ALLEGIANCE[allegiance];

  const w = size * 0.62;
  const x = px + (size - w) / 2;
  // Height grows with level but flattens off, so a level 30 neighbour is
  // visibly bigger than a level 5 and not six times bigger.
  const lift = size * (0.16 + Math.min(0.26, Math.sqrt(level) * 0.055));
  const baseY = py + size * 0.74;
  const topY = baseY - lift;

  ctx.save();

  // Contact shadow, so the block sits on the ground rather than floating.
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ctx.beginPath();
  ctx.ellipse(px + size / 2, baseY + size * 0.04, w * 0.56, size * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = c.fill;
  ctx.fillRect(x, topY, w, baseY - topY);

  ctx.fillStyle = c.top;
  ctx.fillRect(x, topY, w, Math.max(1.5, size * 0.07));

  ctx.strokeStyle = c.edge;
  ctx.lineWidth = allegiance === 'you' ? Math.max(1.5, size * 0.045) : 1;
  ctx.strokeRect(x + 0.5, topY + 0.5, w - 1, baseY - topY - 1);

  ctx.restore();
}
