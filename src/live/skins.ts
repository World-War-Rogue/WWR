/**
 * Base skins.
 *
 * A skin is a palette plus a recipe. Bases are drawn procedurally rather than
 * from image assets: it keeps the map to one canvas with no atlas to load, it
 * scales cleanly from a 14px block to a 96px close-up, and a new skin is a
 * data entry rather than an art pipeline. When real art is commissioned it
 * drops into the same slots without changing the renderer.
 *
 * Detail is drawn only when there are pixels to justify it. Below the close-up
 * threshold a base is a footprint and a roof - anything finer would be noise
 * that still costs a draw call per base per frame.
 */

import {DEFAULT_LOADOUT, type Loadout} from '../../shared/cosmetics';
import {
  type SkinArt,
  type SkinMotion,
  atlas,
  drawMotionGlow,
  drawSkinArt,
  motionOffset,
} from './skinArt';
import {
  bannerOf,
  decalOf,
  drawBanner,
  drawDecal,
  drawLights,
  drawLightsOnArt,
  drawOwnerRing,
  drawPadEmblem,
  emblemOf,
  lightsOf,
} from './cosmeticsPaint';

/**
 * What a skin is comes from shared/skins.ts, which the Worker imports too, so
 * the two sides cannot disagree about which skins exist. What is added here is
 * only how one is DRAWN - the perimeter recipe, the landmark, the art atlas
 * and the motion - none of which the server has any opinion about.
 */
import {SKIN_IDENTITY, type SkinId, type SkinIdentity} from '../../shared/skins';

export type {Palette, SkinId} from '../../shared/skins';
export {SKIN_IDS, STARTER_SKIN_IDS, isSkinId} from '../../shared/skins';

/** How a skin is drawn. Everything here is client-only. */
export interface SkinPresentation {
  /** Perimeter style: HESCO bastion, snow berm, palisade, or blast wall. */
  perimeter: 'bastion' | 'berm' | 'palisade' | 'blast';
  /** A signature structure that makes the skin recognisable at a glance. */
  landmark: 'tower' | 'dome' | 'canopy' | 'block';
  /**
   * Rendered art, when it exists. A skin with art ignores the drawn recipe
   * entirely; the recipe stays as the fallback for as long as the art has not
   * loaded, and forever for skins that never get any.
   */
  art?: SkinArt;
  /**
   * Movement applied to whatever is drawn - art or recipe. This is what makes
   * a single still render read as alive, and it is deliberately applied to the
   * placeholder skins too so the motion can be judged before art is bought.
   */
  motion?: SkinMotion;
}

export type SkinSpec = SkinIdentity & SkinPresentation;

const PRESENTATION: Record<SkinId, SkinPresentation> = {
  desert_fob: {
    perimeter: 'bastion',
    landmark: 'tower',
  },
  arctic_station: {
    perimeter: 'berm',
    landmark: 'dome',
  },
  jungle_outpost: {
    perimeter: 'palisade',
    landmark: 'canopy',
  },
  urban_garrison: {
    perimeter: 'blast',
    landmark: 'block',
  },
  // Reserved for the two custom skins. Palettes are placeholders until the
  // reference images land; the renderer already handles them.
  // The two premium slots. No art yet, so they draw with the recipe - but they
  // carry motion, which means the rise-and-fall and the pulsing halo a bought
  // skin will have can be seen and tuned now, on placeholder geometry, before
  // anybody is paid to model anything.
  custom_one: {
    perimeter: 'blast',
    landmark: 'tower',
    motion: {
      bob: {amplitude: 0.022, periodMs: 3400},
      glow: {color: '#a855f7', radius: 0.85, periodMs: 2600},
    },
  },
  custom_two: {
    perimeter: 'bastion',
    landmark: 'dome',
    motion: {
      bob: {amplitude: 0.016, periodMs: 4200},
      glow: {color: '#facc15', radius: 0.7, periodMs: 3100},
      sway: {amount: 0.03, periodMs: 5200},
    },
  },
  // Cut from a single rendered still, like the Empress. Tall and narrow where
  // she is wide and spiky, which is the point: at map zoom the only thing that
  // survives is outline, so a catalogue needs shapes that differ, not just
  // themes that do.
  ember_sentinel: {
    perimeter: 'blast',
    landmark: 'tower',
    art: {
      src: '/skins/ember_sentinel.webp',
      frames: 1,
      cols: 1,
      frameW: 512,
      frameH: 640,
      fps: 12,
      overhang: 0.25,
      // Wider than the Empress, because the art itself only fills about
      // seventy percent of its frame - a tall statue leaves margin either
      // side, and without this it would sit small in the middle of its plot.
      fill: 1.3,
    },
    motion: {
      // Barely moves. It is a stone monument, and a plinth that bobbed like a
      // banner would read as weightless.
      bob: {amplitude: 0.012, periodMs: 4600},
      // Faster than the bob, because firelight flickers and stone does not.
      glow: {color: '#ff6a1f', radius: 0.8, periodMs: 1900},
    },
  },
  // Three flat cards - keep, arcane energy, raven - composited into one still.
  // The package it arrived in was built for a 24-frame Blender loop, and it can
  // still become one: `frames: 24, cols: 6` and a new atlas is the entire
  // change. Until then the motion below does the work, which is the same route
  // both other art skins took.
  ravenkeep: {
    perimeter: 'palisade',
    landmark: 'tower',
    art: {
      src: '/skins/ravenkeep.webp',
      frames: 1,
      cols: 1,
      frameW: 512,
      frameH: 640,
      fps: 12,
      overhang: 0.25,
      // Only slightly wider than its plot. The keep already fills the frame
      // edge to edge, unlike the two statue skins that needed pushing outward
      // to stop them sitting small in the middle of their ground.
      fill: 1.12,
    },
    motion: {
      // A building, not a monument and not a banner: enough to breathe, not
      // enough to look like it is floating. Masonry that bobbed like a flag
      // would give away that it is a flat card.
      bob: {amplitude: 0.016, periodMs: 4100},
      // Violet, taken from the arcane energy already in the art. A halo in a
      // colour the art does not contain reads as a filter laid over it rather
      // than as light coming off it.
      glow: {color: '#a855f7', radius: 0.85, periodMs: 2300},
      // Slower than the bob and much slower than the glow, so the three never
      // line up and the loop never announces its length.
      sway: {amount: 0.011, periodMs: 7600},
    },
  },
  // A person, not a building - the first skin whose landmark is somebody
  // standing there. That is worth doing precisely once or twice: at map zoom
  // the only thing that survives is outline, and a figure reads differently
  // from every keep and tower in the catalogue, which is exactly the contrast
  // a store needs.
  shellwarden: {
    perimeter: 'palisade',
    landmark: 'block',
    art: {
      src: '/skins/shellwarden.webp',
      frames: 1,
      cols: 1,
      frameW: 512,
      frameH: 640,
      fps: 12,
      overhang: 0.25,
      // The figure uses about seventy percent of the frame's width - a
      // standing pose leaves margin either side the way the Sentinel does -
      // so it is pushed outward rather than sitting small on its own ground.
      fill: 1.34,
    },
    motion: {
      // He breathes. More than the stone skins and less than a banner: a
      // living thing that held still would look like a statue of itself, and
      // one that bobbed like cloth would look weightless.
      bob: {amplitude: 0.02, periodMs: 3800},
      // Warm and dim, in the orange already on the vest tabs and the armband.
      // A lantern at his feet, not a spell - the halo is the only thing that
      // says "occupied" at the zoom where his face is four pixels wide.
      glow: {color: '#e2762b', radius: 0.7, periodMs: 3400},
      // A slow shift of weight. Deliberately out of step with the bob so the
      // pair never resolve into a single obvious cycle.
      sway: {amount: 0.014, periodMs: 6700},
    },
  },
  // The flagship commission. Sold once, to one player, and never again.
  //
  // This is the first skin with real art. `frames: 1` means the atlas is a
  // single rendered still and every bit of movement comes from `motion` below
  // - the rise and fall, the lantern-coloured halo, the slow lean. That is the
  // cheap half of the pipeline working: one image, no rig, and it still reads
  // as alive next to bases that are not moving.
  //
  // Replacing it with a 24-frame Blender loop later is this block and nothing
  // else: frames 24, cols 6. The art below stays exactly where it is.
  signature_one: {
    perimeter: 'blast',
    landmark: 'dome',
    art: {
      src: '/skins/signature_one.webp',
      frames: 1,
      cols: 1,
      frameW: 512,
      frameH: 640,
      fps: 12,
      overhang: 0.25,
      // Wider than her plot, so she crowds her neighbours a little. A base
      // that stops exactly on its grid line reads as a counter on a board.
      fill: 1.34,
    },
    motion: {
      bob: {amplitude: 0.022, periodMs: 3600},
      // Gold, to match the lanterns the art is already lit by. A halo in a
      // colour the art does not contain reads as a filter over it rather than
      // as light coming off it.
      glow: {color: '#f0b429', radius: 0.95, periodMs: 2600},
      sway: {amount: 0.015, periodMs: 7200},
    },
  },
};

/**
 * The catalogue the renderer uses: what a skin is, plus how it is drawn.
 *
 * Merged rather than declared, so a skin added to shared/skins.ts appears here
 * automatically and one the server knows about can never be missing from the
 * client's list. The reverse - presentation declared for an id the server has
 * never heard of - stops compiling, which is the failure worth having.
 */
export const SKINS: Record<SkinId, SkinSpec> = Object.fromEntries(
  (Object.keys(SKIN_IDENTITY) as SkinId[]).map((id) => [
    id,
    {...SKIN_IDENTITY[id], ...PRESENTATION[id]},
  ]),
) as Record<SkinId, SkinSpec>;


export const STARTER_SKINS = Object.values(SKINS).filter((s) => s.starter);

/**
 * How far above its plot a skin's art reaches, in pixels.
 *
 * Anything drawn above a base - a nameplate, a march arrow, a shield timer -
 * has to clear this or it lands on the art. A drawn skin returns zero; art
 * with headroom and spill returns the amount it actually occupies, so the
 * caller never has to know which kind of skin it is looking at.
 */
export function artHeadroom(skin: SkinSpec, size: number): number {
  if (!skin.art) return 0;
  const fill = skin.art.fill ?? 1;
  return Math.max(0, size * (1 + skin.art.overhang) * fill - size);
}

export function skinSpec(id: string): SkinSpec {
  return SKINS[id as SkinId] ?? SKINS.desert_fob;
}

/** Deterministic pseudo-random from a plot, so a base looks the same to everyone, forever. */
function rand(x: number, y: number, salt: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + salt * 74.7) * 43758.5453;
  return n - Math.floor(n);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/**
 * Draws one base.
 *
 * `size` is the plot's on-screen size in pixels. Everything is expressed as a
 * fraction of it, so the same recipe reads correctly at every zoom.
 */
export function drawBase(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  size: number,
  skin: SkinSpec,
  plotX: number,
  plotY: number,
  level: number,
  isYou: boolean,
  loadout: Loadout = DEFAULT_LOADOUT,
  time = 0,
) {
  const p = skin.palette;
  const pad = size * 0.05;
  const inner = size - pad * 2;
  const x = px + pad;
  const y = py + pad;

  const banner = bannerOf(loadout);
  const emblem = emblemOf(loadout);
  const lights = lightsOf(loadout);
  const decal = decalOf(loadout);

  // Whether art is going to cover this plot has to be known BEFORE the ground
  // is drawn, not after: rendered art brings its own floor, and a compound
  // slab underneath shows around its edges as a square that does not belong to
  // anything. Asking for the atlas here also starts it loading.
  const artImage = skin.art ? atlas(skin.art.src) : null;
  const hasArt = artImage !== null;

  // The halo sits behind everything, so it reads as light cast on the ground
  // rather than as a filter over the base.
  drawMotionGlow(ctx, x, y, inner, skin.motion, time);

  if (!hasArt) {
    // Compound floor.
    ctx.fillStyle = p.ground;
    roundRect(ctx, x, y, inner, inner, size * 0.09);
    ctx.fill();

    // Ground marking goes on the floor, under everything built on it - and it
    // stays put while the base above it moves, because paint does not bob.
    if (decal) drawDecal(ctx, x, y, inner, decal);
  } else if (isYou) {
    // Drawn before the base so the base stands inside the ring rather than
    // being circled by it.
    drawOwnerRing(ctx, x, y, inner);
  }

  const {dy, shear} = motionOffset(skin.motion, inner, time);
  const moving = dy !== 0 || shear !== 0;

  if (moving) {
    ctx.save();
    // Sheared about the foot of the base so the footprint stays anchored and
    // only the top leans, the way something standing on ground would.
    const anchorY = y + inner;
    ctx.translate(0, anchorY + dy);
    ctx.transform(1, 0, shear, 1, 0, 0);
    ctx.translate(0, -anchorY);
  }

  // Rendered art wins when it has loaded. Everything below it is the fallback
  // that keeps the map complete while art is still being commissioned.
  const painted = skin.art ? drawSkinArt(ctx, x, y, inner, skin.art, artImage, time) : false;

  if (!painted) {
    const detailed = size >= 34;
    if (detailed) {
      drawPerimeter(ctx, x, y, inner, skin);
      drawInterior(ctx, x, y, inner, skin, plotX, plotY, level);
    } else {
      // Far-out silhouette: footprint plus a roof mass, enough to tell skins
      // apart by colour without spending draw calls on detail nobody can see.
      ctx.fillStyle = p.roof;
      ctx.fillRect(x + inner * 0.22, y + inner * 0.22, inner * 0.56, inner * 0.56);
      ctx.fillStyle = p.accent;
      ctx.fillRect(x + inner * 0.4, y + inner * 0.4, inner * 0.2, inner * 0.2);
    }
    // The pad emblem is painted on the compound floor. Rendered art brings its
    // own ground, so it is skipped there rather than stamped over the model.
    if (emblem) drawPadEmblem(ctx, x, y, inner, emblem);
  }

  if (moving) ctx.restore();

  if (!painted) {
    // The plot outline belongs to a compound that fills its plot. Around
    // rendered art it reads as a picture frame, so art gets the ground ring
    // above instead and no box at all.
    ctx.strokeStyle = isYou ? '#ffffff' : 'rgba(0,0,0,0.4)';
    ctx.lineWidth = isYou ? Math.max(2, size * 0.045) : 1;
    roundRect(ctx, x, y, inner, inner, size * 0.09);
    ctx.stroke();
  }

  // Lights sit on top of the walls, and the banner on top of everything - it
  // is the tallest thing in the compound and is allowed to overhang the plot.
  if (lights) {
    if (painted) drawLightsOnArt(ctx, x, y, inner, lights);
    else drawLights(ctx, x, y, inner, lights);
  }
  if (banner) drawBanner(ctx, x, y, inner, banner, emblem);
}

function drawPerimeter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  skin: SkinSpec,
) {
  const p = skin.palette;
  const t = s * 0.09; // wall thickness

  ctx.fillStyle = p.wall;
  ctx.fillRect(x, y, s, t);
  ctx.fillRect(x, y + s - t, s, t);
  ctx.fillRect(x, y, t, s);
  ctx.fillRect(x + s - t, y, t, s);

  if (skin.perimeter === 'bastion') {
    // HESCO cells read as repeated segments along the wall.
    ctx.strokeStyle = 'rgba(0,0,0,0.22)';
    ctx.lineWidth = 1;
    const cells = 6;
    for (let i = 1; i < cells; i += 1) {
      const o = (s / cells) * i;
      ctx.beginPath();
      ctx.moveTo(x + o, y);
      ctx.lineTo(x + o, y + t);
      ctx.moveTo(x + o, y + s - t);
      ctx.lineTo(x + o, y + s);
      ctx.moveTo(x, y + o);
      ctx.lineTo(x + t, y + o);
      ctx.moveTo(x + s - t, y + o);
      ctx.lineTo(x + s, y + o);
      ctx.stroke();
    }
  } else if (skin.perimeter === 'blast') {
    // Corner strongpoints.
    ctx.fillStyle = p.roof;
    const c = s * 0.16;
    ctx.fillRect(x, y, c, c);
    ctx.fillRect(x + s - c, y, c, c);
    ctx.fillRect(x, y + s - c, c, c);
    ctx.fillRect(x + s - c, y + s - c, c, c);
  } else if (skin.perimeter === 'palisade') {
    ctx.strokeStyle = p.roof;
    ctx.lineWidth = Math.max(1, s * 0.02);
    for (let i = 0; i < 14; i += 1) {
      const o = (s / 14) * (i + 0.5);
      ctx.beginPath();
      ctx.moveTo(x + o, y);
      ctx.lineTo(x + o, y + t);
      ctx.moveTo(x + o, y + s - t);
      ctx.lineTo(x + o, y + s);
      ctx.stroke();
    }
  } else {
    // Snow berm: soft highlight along the inside edge.
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(x + t, y + t, s - t * 2, t * 0.35);
  }

  // Gate on the south wall.
  ctx.fillStyle = p.accent;
  ctx.fillRect(x + s * 0.42, y + s - t, s * 0.16, t);
}

function drawInterior(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  skin: SkinSpec,
  plotX: number,
  plotY: number,
  level: number,
) {
  const p = skin.palette;
  const t = s * 0.09;
  const ix = x + t;
  const iy = y + t;
  const is = s - t * 2;

  // Roadway from the gate to the centre.
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  ctx.fillRect(ix + is * 0.44, iy + is * 0.35, is * 0.12, is * 0.65);

  // Outbuildings. Deterministic per plot, so each base is its own place.
  const count = 3 + Math.floor(rand(plotX, plotY, 5) * 3);
  for (let i = 0; i < count; i += 1) {
    const bw = is * (0.16 + rand(plotX, plotY, i) * 0.16);
    const bh = is * (0.14 + rand(plotX, plotY, i + 40) * 0.16);
    const bx = ix + (is - bw) * rand(plotX, plotY, i + 80);
    const by = iy + (is - bh) * rand(plotX, plotY, i + 120) * 0.8;

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(bx + s * 0.02, by + s * 0.025, bw, bh);
    ctx.fillStyle = p.structure;
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = p.roof;
    ctx.fillRect(bx, by, bw, bh * 0.34);
  }

  // Landmark: the thing that makes a skin recognisable at a glance.
  const cx = ix + is * 0.5;
  const cy = iy + is * 0.42;
  const r = is * 0.14;

  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ctx.beginPath();
  ctx.ellipse(cx + s * 0.02, cy + s * 0.03, r, r * 0.85, 0, 0, Math.PI * 2);
  ctx.fill();

  if (skin.landmark === 'dome') {
    ctx.fillStyle = p.structure;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = p.accent;
    ctx.lineWidth = Math.max(1, s * 0.018);
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.62, 0, Math.PI * 2);
    ctx.stroke();
  } else if (skin.landmark === 'tower') {
    ctx.fillStyle = p.structure;
    ctx.fillRect(cx - r * 0.5, cy - r, r, r * 2);
    ctx.fillStyle = p.accent;
    ctx.fillRect(cx - r * 0.75, cy - r * 1.25, r * 1.5, r * 0.45);
  } else if (skin.landmark === 'canopy') {
    ctx.fillStyle = p.accent;
    ctx.beginPath();
    ctx.moveTo(cx, cy - r * 1.1);
    ctx.lineTo(cx + r * 1.05, cy + r * 0.7);
    ctx.lineTo(cx - r * 1.05, cy + r * 0.7);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillStyle = p.structure;
    ctx.fillRect(cx - r, cy - r * 0.85, r * 2, r * 1.7);
    ctx.fillStyle = p.accent;
    ctx.fillRect(cx - r, cy - r * 0.85, r * 2, r * 0.3);
  }

  // Level pips along the inside of the north wall: a readable sense of how
  // developed a neighbour is without reading their nameplate.
  const pips = Math.min(6, Math.max(1, Math.round(level / 5)));
  ctx.fillStyle = p.accent;
  for (let i = 0; i < pips; i += 1) {
    ctx.fillRect(ix + is * 0.06 + i * s * 0.07, iy + is * 0.03, s * 0.045, s * 0.035);
  }
}
