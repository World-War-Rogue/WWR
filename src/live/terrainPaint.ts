/**
 * Painting the ground.
 *
 * The map used to draw one filled rectangle per plot: `terrainAt` sampled once
 * at each plot's integer coordinate, painted as a hard square, with shade
 * reduced to a single bit - `shade > 0.5 ? fill : alt`. That is why the map read
 * as a grid. All the detail the noise contained was thrown away before it
 * reached a pixel, biome edges snapped to plot corners, and a grid stroke was
 * drawn over the top at almost every useful zoom.
 *
 * This samples the same noise continuously, in world space, blends the biomes as
 * weights, and lights a height field from the upper left. Relief is what makes
 * ground read as land rather than as colour; the salt cracks, wash beds and
 * sandstone terraces all fall out of that height field rather than being drawn
 * on top of it.
 *
 * ── Why there is a buffer ─────────────────────────────────────────────────
 *
 * Per-pixel ground is far too expensive to do inside the frame loop, and the
 * frame loop runs continuously while a march is in the air. So ground and props
 * are painted once into an offscreen buffer and blitted after that, and the
 * buffer is only rebuilt when the camera, the size or the set of bases changes.
 *
 * The ground inside that buffer is computed at half resolution and scaled up.
 * Terrain is soft by nature so it costs almost nothing to look at, and it is
 * four times less work on the oldest phone a tester will bring - which is about
 * five years old. Props are drawn at full buffer resolution, because a soft
 * pylon looks broken in a way soft sand does not.
 *
 * A proper tile cache keyed by zoom bucket is the next step, and it is what
 * makes panning sharpen rather than stutter. This is the version that fits in
 * one buffer and already removes the grid.
 */
import {
  BANDS,
  type Ground,
  between,
  corridorAt,
  fbm,
  groundAt,
  legacyTerrainSeed,
  TERRAIN_VERSION,
} from '../../shared/terrain';
import {
  PROP_ATLAS_SRC,
  PROP_FRAMES,
} from '../../shared/terrainAtlas';
import {MIN_PROP_ZOOM, propFade, propsInPlot} from '../../shared/terrainProps';

/* -------------------------------------------------------------------------- */
/* The atlas                                                                  */
/* -------------------------------------------------------------------------- */

let atlas: HTMLImageElement | null = null;
let atlasReady = false;
const waiting: Array<() => void> = [];

function ensureAtlas(): void {
  if (atlas) return;
  atlas = new Image();
  atlas.decoding = 'async';
  atlas.onload = () => {
    atlasReady = true;
    for (const cb of waiting.splice(0)) cb();
  };
  atlas.src = PROP_ATLAS_SRC;
}

/** True once props can actually be drawn. The map is complete without them. */
export const propsReady = (): boolean => atlasReady;

/** Called once when the atlas lands, so the map can repaint with props on it. */
export function onPropsLoaded(cb: () => void): void {
  if (atlasReady) return;
  waiting.push(cb);
}

/* -------------------------------------------------------------------------- */
/* Palette                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * A pale dry basin.
 *
 * Lighter and far less saturated than the palette this replaces, which ran
 * brown enough to fight the salt-flat identity the season is named for.
 */
const P = {
  salt: [227, 221, 201],
  saltCrack: [199, 191, 169],
  hardpan: [210, 193, 156],
  sand: [198, 172, 126],
  wadi: [154, 130, 89],
  wadiDeep: [122, 103, 70],
  scrub: [154, 150, 104],
  stone: [176, 138, 96],
  voidCol: [10, 9, 6],
} as const;

/** Sun from the upper left, low. Enough relief to read, not enough to shout. */
const LIGHT_X = -0.62;
const LIGHT_Y = -0.78;

/* -------------------------------------------------------------------------- */
/* Height                                                                     */
/* -------------------------------------------------------------------------- */

function fbm4(x: number, y: number, seed: number): number {
  let v = 0;
  let amp = 0.5;
  let f = 1;
  for (let i = 0; i < 4; i += 1) {
    v += fbm(x * f, y * f, seed + i * 131) * amp;
    f *= 2.07;
    amp *= 0.5;
  }
  return v / 0.9375;
}

/**
 * The height field everything visible falls out of.
 *
 * `detail` fades the fine octaves in with zoom. Without that, high-frequency
 * relief aliases into noise at the world view - found while building the
 * look-dev page, and it is the same decision a tile cache makes per zoom bucket.
 */
function heightAt(seed: number, extent: number, x: number, y: number, detail: number): number {
  const rolling = fbm4(x * 0.022, y * 0.022, seed + 51);
  const dune = fbm(x * 0.09, y * 0.09, seed + 77) * 0.28;
  const grain = fbm4(x * 0.55, y * 0.55, seed + 909) * 0.055;

  const distance = Math.sqrt(x * x + y * y) / Math.max(1, extent);
  const warp = (fbm(x * 0.035, y * 0.035, seed) - 0.5) * 0.22;
  const banded = distance + warp;

  // Sandstone shelves, terraced toward the rim so they read as steps.
  const rockAmt = between(BANDS.middle - 0.12, BANDS.middle + 0.06, banded);
  const terrace = Math.floor(fbm(x * 0.05, y * 0.05, seed + 17) * 6) / 6;
  const shelf = terrace * rockAmt * 0.55;

  // Washes cut down through whatever is above them.
  const river = Math.abs(fbm(x * 0.045, y * 0.045, seed + 3301) - 0.5);
  const channel = between(0.055, 0.012, river) * (banded > BANDS.inner * 0.6 ? 1 : 0.2);

  const micro = fbm4(x * 2.4, y * 2.4, seed + 1212) * 0.075 * detail;
  const fine = fbm4(x * 7.5, y * 7.5, seed + 1717) * 0.028 * detail;

  return rolling * 0.5 + dune + shelf + grain + micro + fine - channel * 0.3;
}

/* -------------------------------------------------------------------------- */
/* The buffer                                                                 */
/* -------------------------------------------------------------------------- */

export interface GroundSpec {
  worldId: number;
  season: number;
  extent: number;
  cx: number;
  cy: number;
  zoom: number;
  w: number;
  h: number;
  /** Plots holding a base. Props never draw on one. */
  occupied: ReadonlySet<string>;
}

let buffer: HTMLCanvasElement | null = null;
/** Half-resolution staging canvas for the ground, reused across paints. */
let scratch: HTMLCanvasElement | null = null;
let bufferKey = '';
/** The camera the buffer was painted for, so a stale one can be reused. */
let bufferCam: {cx: number; cy: number; zoom: number} | null = null;
let lastBuild = 0;

/**
 * How long to reuse a stale buffer before rebuilding.
 *
 * Rebuilding is per-pixel and a wheel gesture fires camera changes far faster
 * than that. Without this the first zoom-out ran a full rebuild for every
 * intermediate zoom level and locked the page hard enough to look like a crash.
 */
const REBUILD_MS = 110;

function keyOf(s: GroundSpec): string {
  // Occupancy folded in cheaply. Bases move rarely, so this almost never
  // invalidates - but when one does move, the prop under it has to reappear.
  let occ = 0;
  for (const plot of s.occupied) {
    for (let i = 0; i < plot.length; i += 1) occ = (occ * 31 + plot.charCodeAt(i)) | 0;
  }
  return [
    s.worldId,
    s.season,
    s.extent,
    Math.round(s.cx * 64),
    Math.round(s.cy * 64),
    Math.round(s.zoom * 4),
    s.w,
    s.h,
    s.occupied.size,
    occ,
  ].join('|');
}

function paintInto(target: CanvasRenderingContext2D, s: GroundSpec): void {
  const {w, h, zoom, cx, cy, extent} = s;
  const seed = legacyTerrainSeed(s.worldId, s.season);

  // Ground at half resolution, scaled up. Terrain is soft; this is not.
  const iw = Math.max(1, Math.ceil(w / 2));
  const ih = Math.max(1, Math.ceil(h / 2));
  const img = target.createImageData(iw, ih);
  const d = img.data;

  const wx0 = cx - w / (2 * zoom);
  const wy0 = cy - h / (2 * zoom);
  const step = 2 / zoom;
  const detail = between(30, 90, zoom);
  const eps = Math.max(0.012, 1.1 / zoom);
  const crackAmt = between(30, 85, zoom);

  for (let j = 0; j < ih; j += 1) {
    const wy = wy0 + j * step;
    for (let i = 0; i < iw; i += 1) {
      const wx = wx0 + i * step;
      const o = (j * iw + i) * 4;

      if (Math.abs(wx) > extent || Math.abs(wy) > extent) {
        d[o] = P.voidCol[0];
        d[o + 1] = P.voidCol[1];
        d[o + 2] = P.voidCol[2];
        d[o + 3] = 255;
        continue;
      }

      const g: Ground = groundAt(seed, extent, wx, wy);
      let r = 0;
      let gr = 0;
      let b = 0;

      // Hardpan under everything, so nothing is ever one flat hue.
      const grain = fbm4(wx * 0.7, wy * 0.7, seed + 611);
      let tot = 0.22;
      r += (P.hardpan[0] + (grain - 0.5) * 18) * 0.22;
      gr += (P.hardpan[1] + (grain - 0.5) * 16) * 0.22;
      b += (P.hardpan[2] + (grain - 0.5) * 14) * 0.22;

      const mix = (col: readonly number[], wgt: number) => {
        r += col[0] * wgt;
        gr += col[1] * wgt;
        b += col[2] * wgt;
        tot += wgt;
      };
      mix(P.salt, g.salt);
      mix(P.stone, g.rock);
      mix(P.scrub, g.scrub);
      mix(P.sand, g.sand);
      r /= tot;
      gr /= tot;
      b /= tot;

      if (g.wadi > 0.001) {
        const t = g.wadi;
        r = r * (1 - t) + P.wadi[0] * t;
        gr = gr * (1 - t) + P.wadi[1] * t;
        b = b * (1 - t) + P.wadi[2] * t;
        const deep = between(0.55, 1, t) * 0.6;
        r = r * (1 - deep) + P.wadiDeep[0] * deep;
        gr = gr * (1 - deep) + P.wadiDeep[1] * deep;
        b = b * (1 - deep) + P.wadiDeep[2] * deep;
      }

      // Cracked mineral, only where salt actually is and only once it is big
      // enough to see.
      if (g.salt > 0.25 && crackAmt > 0) {
        const cr = Math.abs(fbm(wx * 5.5, wy * 5.5, seed + 4242) - 0.5);
        const crack = between(0.03, 0.006, cr) * g.salt * crackAmt * 0.6;
        r = r * (1 - crack) + P.saltCrack[0] * crack;
        gr = gr * (1 - crack) + P.saltCrack[1] * crack;
        b = b * (1 - crack) + P.saltCrack[2] * crack;
      }

      const hC = heightAt(seed, extent, wx, wy, detail);
      const gx = (heightAt(seed, extent, wx + eps, wy, detail) - hC) / eps;
      const gy = (heightAt(seed, extent, wx, wy + eps, detail) - hC) / eps;
      let lam = 1 + (gx * LIGHT_X + gy * LIGHT_Y) * 0.55;
      if (lam < 0.52) lam = 0.52;
      if (lam > 1.48) lam = 1.48;
      const ao = 1 - Math.max(0, Math.min(1, (0.34 - hC) * 0.5));
      r *= lam * ao;
      gr *= lam * ao;
      b *= lam * ao;

      d[o] = r < 0 ? 0 : r > 255 ? 255 : r;
      d[o + 1] = gr < 0 ? 0 : gr > 255 ? 255 : gr;
      d[o + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
      d[o + 3] = 255;
    }
  }

  // Kept between paints. A full-viewport canvas allocated on every rebuild is
  // a few megabytes of garbage several times a second during a gesture, and
  // the browser reclaiming it is felt as a stutter in the middle of the zoom.
  if (!scratch) scratch = document.createElement('canvas');
  if (scratch.width !== iw || scratch.height !== ih) {
    scratch.width = iw;
    scratch.height = ih;
  }
  const sctx = scratch.getContext('2d');
  if (!sctx) return;
  sctx.putImageData(img, 0, 0);
  target.imageSmoothingEnabled = true;
  target.imageSmoothingQuality = 'high';
  target.drawImage(scratch, 0, 0, iw, ih, 0, 0, w, h);

  paintProps(target, s, seed);
}

/* -------------------------------------------------------------------------- */
/* Props                                                                      */
/* -------------------------------------------------------------------------- */

function paintProps(ctx: CanvasRenderingContext2D, s: GroundSpec, seed: number): void {
  ensureAtlas();
  if (!atlasReady || !atlas) return;

  const {w, h, zoom, cx, cy, extent} = s;

  // Nothing is drawn below the weakest threshold in the catalogue, and the loop
  // below is O(visible plots) - which is about a hundred plots at the zoom the
  // map opens at and four thousand at the world view. Walking all of them to
  // decide every one is invisible is what made zooming out lock the page.
  if (zoom < MIN_PROP_ZOOM) return;
  const sx = (px: number) => (px - cx) * zoom + w / 2;
  const sy = (py: number) => (py - cy) * zoom + h / 2;

  const firstX = Math.floor(cx - w / (2 * zoom)) - 2;
  const lastX = Math.ceil(cx + w / (2 * zoom)) + 2;
  const firstY = Math.floor(cy - h / (2 * zoom)) - 2;
  const lastY = Math.ceil(cy + h / (2 * zoom)) + 2;

  // Back to front, so something further down the screen is drawn in front of
  // what is behind it - the same reason bases are sorted by y.
  for (let py = firstY; py <= lastY; py += 1) {
    for (let px = firstX; px <= lastX; px += 1) {
      if (s.occupied.has(`${px},${py}`)) continue;
      const placed = propsInPlot(seed, TERRAIN_VERSION, extent, px, py);
      if (placed.length === 0) continue;

      for (const item of placed) {
        const fade = propFade(item.prop, zoom);
        if (fade <= 0.01) continue;
        const frame = PROP_FRAMES[item.prop.id];
        if (!frame) continue;

        const width = item.prop.span * zoom;
        const height = (width * frame.h) / frame.w;
        const gx = sx(item.px + item.ox);
        const gy = sy(item.py + item.oy);
        const dx = gx - width * item.prop.anchor.x;
        const dy = gy - height * item.prop.anchor.y;

        // A soft contact shadow, so it stands on the ground rather than over it.
        ctx.globalAlpha = fade * 0.22;
        ctx.fillStyle = '#3c2d1c';
        ctx.beginPath();
        ctx.ellipse(gx + width * 0.06, gy, width * 0.34, width * 0.1, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = fade;
        if (item.flip) {
          ctx.save();
          ctx.translate(dx + width, dy);
          ctx.scale(-1, 1);
          ctx.drawImage(atlas, frame.x, frame.y, frame.w, frame.h, 0, 0, width, height);
          ctx.restore();
        } else {
          ctx.drawImage(atlas, frame.x, frame.y, frame.w, frame.h, dx, dy, width, height);
        }
      }
    }
  }
  ctx.globalAlpha = 1;
}

/* -------------------------------------------------------------------------- */
/* Entry point                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Draw the ground.
 *
 * Returns true when what was drawn is a STALE buffer stretched to fit, which
 * means the caller should ask for another paint shortly so it can sharpen. That
 * is the whole throttle: a wheel gesture produces camera changes far faster than
 * a per-pixel rebuild can service, so the buffer is reused and transformed while
 * the camera is moving and rebuilt once it settles.
 */
export function paintGround(ctx: CanvasRenderingContext2D, s: GroundSpec): boolean {
  if (s.w === 0 || s.h === 0) return false;
  ensureAtlas();

  const key = keyOf(s);
  const fits = buffer !== null && buffer.width === s.w && buffer.height === s.h;
  const now = performance.now();

  if (fits && bufferKey === key) {
    ctx.drawImage(buffer as HTMLCanvasElement, 0, 0);
    return false;
  }

  // Stale, but recent enough that rebuilding now would fight the gesture.
  // Stretch what we have to where the camera is and come back for it.
  if (fits && bufferCam && now - lastBuild < REBUILD_MS) {
    // Where the buffer's centre pixel belongs on screen now, worked back to a
    // destination rectangle. A world point X sits at w/2 + (X - cx) * zoom, and
    // the buffer's centre pixel holds the world point bufferCam.cx, so the
    // offset is the buffer camera's displacement from the current one - drawn
    // at the ratio of the two zooms.
    const scale = s.zoom / bufferCam.zoom;
    const dx = s.w / 2 + (bufferCam.cx - s.cx) * s.zoom - (s.w / 2) * scale;
    const dy = s.h / 2 + (bufferCam.cy - s.cy) * s.zoom - (s.h / 2) * scale;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(
      buffer as HTMLCanvasElement,
      dx,
      dy,
      s.w * scale,
      s.h * scale,
    );
    ctx.restore();
    return true;
  }

  if (!buffer) buffer = document.createElement('canvas');
  buffer.width = s.w;
  buffer.height = s.h;
  const bctx = buffer.getContext('2d');
  if (!bctx) return false;
  paintInto(bctx, s);
  bufferKey = key;
  bufferCam = {cx: s.cx, cy: s.cy, zoom: s.zoom};
  lastBuild = performance.now();
  ctx.drawImage(buffer, 0, 0);
  return false;
}

/** Corridors, for anything that wants to know where the old roads ran. */
export {corridorAt};
