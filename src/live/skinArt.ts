/**
 * Real skin art: sprite atlases and the motion applied over them.
 *
 * The skins the game shipped with are drawn with canvas primitives. That was
 * always the placeholder - it scales cleanly and costs nothing, but it cannot
 * look like a rendered 3D model, and rendered 3D models are what a premium
 * skin has to be to be worth paying for.
 *
 * This file is the drop-in point. A skin that has art declares an atlas here;
 * the renderer plays it and never touches the vector recipe. A skin without
 * art keeps drawing the way it always did, so art can land one skin at a time
 * instead of all at once.
 *
 * Two shapes of art are supported deliberately:
 *
 *   frames = 1   A single rendered still. All movement comes from `motion`
 *                below - a slow rise and fall, a pulsing glow, a shimmer.
 *                Cheap to produce and it reads as alive on a map where
 *                everything else is still.
 *
 *   frames > 1   A baked animation loop out of Blender. This is what a rigged
 *                model looks like once it is rendered to an isometric sequence
 *                and packed into a grid, and it is the only way to get a
 *                character that actually moves - something rising out of the
 *                base, a rotating dome, a falling fountain.
 *
 * Both go through the same code path, so commissioning a still first and
 * upgrading it to a sequence later changes one data entry.
 */

export interface SkinArt {
  /** Atlas URL. Lives in public/skins/, so it is served from the same origin. */
  src: string;
  /** Frames in the loop. 1 is a still. */
  frames: number;
  /** Columns in the atlas grid. Rows are derived from frames. */
  cols: number;
  /** Size of one frame in the atlas, in pixels. */
  frameW: number;
  frameH: number;
  /** Playback rate. Ignored when frames === 1. */
  fps: number;
  /**
   * How much taller than the plot the art is allowed to stand, as a fraction
   * of the plot size. A tower or a raised character needs headroom above the
   * footprint or it reads as a rug rather than a building.
   */
  overhang: number;
}

export interface SkinMotion {
  /** Rise and fall, as a fraction of plot size. Gives a still a heartbeat. */
  bob?: {amplitude: number; periodMs: number};
  /** A pulsing halo behind the art. */
  glow?: {color: string; radius: number; periodMs: number};
  /** Slow horizontal shear, in radians. Reads as cloth or heat haze. */
  sway?: {amount: number; periodMs: number};
}

/* -------------------------------------------------------------------------- */
/* Loading                                                                    */
/* -------------------------------------------------------------------------- */

type Entry = {image: HTMLImageElement; ready: boolean; failed: boolean};

const cache = new Map<string, Entry>();
const listeners = new Set<() => void>();

/** Called when an atlas finishes loading, so the map can redraw with it. */
export function onArtLoaded(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Returns the atlas if it is decoded, and starts loading it if not.
 *
 * Never blocks and never throws: a base whose art has not arrived yet draws
 * with its vector recipe this frame and with its art the next. A skin whose
 * art is missing entirely stays on the vector recipe forever rather than
 * leaving a hole in the map.
 */
export function atlas(src: string): HTMLImageElement | null {
  const hit = cache.get(src);
  if (hit) return hit.ready ? hit.image : null;

  const image = new Image();
  const entry: Entry = {image, ready: false, failed: false};
  cache.set(src, entry);
  image.onload = () => {
    entry.ready = true;
    for (const fn of listeners) fn();
  };
  image.onerror = () => {
    entry.failed = true;
    console.warn(`Skin art failed to load: ${src} - falling back to the drawn skin.`);
  };
  image.src = src;
  return null;
}

/** True while any declared atlas is still in flight. */
export function artPending(): boolean {
  for (const entry of cache.values()) if (!entry.ready && !entry.failed) return true;
  return false;
}

/* -------------------------------------------------------------------------- */
/* Drawing                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * The offset and shear a skin's motion applies this instant.
 *
 * Motion is computed here rather than inside the art drawing, because it has
 * to apply identically to a rendered atlas and to a skin still drawn with
 * canvas primitives. That is what lets a placeholder skin demonstrate exactly
 * the movement its finished art will have.
 *
 * `time` is a shared clock, not a per-base one. Two bases wearing the same
 * skin therefore breathe in step, which reads as intentional; seeding the
 * phase per plot makes a row of identical bases look like a crowd fidgeting,
 * which does not.
 */
export function motionOffset(
  motion: SkinMotion | undefined,
  size: number,
  time: number,
): {dy: number; shear: number} {
  let dy = 0;
  let shear = 0;
  if (motion?.bob) {
    const t = (time % motion.bob.periodMs) / motion.bob.periodMs;
    dy = Math.sin(t * Math.PI * 2) * size * motion.bob.amplitude;
  }
  if (motion?.sway) {
    const t = (time % motion.sway.periodMs) / motion.sway.periodMs;
    shear = Math.sin(t * Math.PI * 2) * motion.sway.amount;
  }
  return {dy, shear};
}

/** The pulsing halo, drawn behind the base rather than over it. */
export function drawMotionGlow(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  size: number,
  motion: SkinMotion | undefined,
  time: number,
): void {
  const glow = motion?.glow;
  if (!glow) return;
  const t = (time % glow.periodMs) / glow.periodMs;
  const pulse = 0.55 + 0.45 * Math.sin(t * Math.PI * 2);
  const cx = px + size / 2;
  const cy = py + size * 0.55;
  const r = size * glow.radius * (0.85 + pulse * 0.3);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.2 + pulse * 0.3;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, glow.color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Draws one frame of a skin's art over its plot.
 *
 * The image is passed in rather than fetched here, because the caller has to
 * know whether art is coming BEFORE it draws the ground: art brings its own
 * floor, and a compound slab underneath it shows around the edges.
 *
 * Returns false when the art has not arrived, which is the caller's signal to
 * fall back to the drawn recipe. That fallback is the reason art can ship one
 * skin at a time instead of all at once.
 */
export function drawSkinArt(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  size: number,
  art: SkinArt,
  image: HTMLImageElement | null,
  time: number,
): boolean {
  if (!image) return false;

  const frame = art.frames > 1 ? Math.floor((time / 1000) * art.fps) % art.frames : 0;
  const sx = (frame % art.cols) * art.frameW;
  const sy = Math.floor(frame / art.cols) * art.frameH;

  // Drawn taller than the plot and anchored to the bottom of the footprint, so
  // the overhang goes upward: a building grows out of its plot rather than
  // being centred on it.
  const drawH = size * (1 + art.overhang);
  ctx.drawImage(image, sx, sy, art.frameW, art.frameH, px, py + size - drawH, size, drawH);
  return true;
}

/** True when a skin needs a frame clock: a real animation, or code-driven motion. */
export function skinIsAnimated(art: SkinArt | undefined, motion: SkinMotion | undefined): boolean {
  if (art && art.frames > 1) return true;
  return Boolean(motion?.bob || motion?.glow || motion?.sway);
}
