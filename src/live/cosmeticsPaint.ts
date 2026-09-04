/**
 * Drawing the cosmetic layers.
 *
 * The catalogue in shared/cosmetics.ts says what exists; this says what it
 * looks like. Every layer is vector work rather than sprites, which is what
 * keeps the whole system cheap: a new banner is eight lines of data, there is
 * no atlas to load before the map can draw, and every item stays sharp from a
 * 14-pixel block to a 96-pixel close-up.
 *
 * Layers are drawn at different zoom thresholds. A perimeter light still reads
 * as a coloured dot when a base is 20 pixels across; a ground marking at that
 * size is a smudge that costs a draw call, so it waits. The thresholds below
 * are the difference between a map that stays smooth with a thousand bases in
 * view and one that does not.
 */
import {
  type BannerConfig,
  COSMETICS_BY_ID,
  type CosmeticItem,
  type CosmeticSlot,
  type DecalConfig,
  type EmblemConfig,
  type EmblemGlyph,
  type LightsConfig,
  type Loadout,
} from '../../shared/cosmetics';

/** Below these on-screen plot sizes, a layer is not worth the draw call. */
export const LIGHTS_MIN = 18;
export const BANNER_MIN = 26;
export const DECAL_MIN = 30;
export const PAD_EMBLEM_MIN = 46;

function configFor<T>(loadout: Loadout, slot: CosmeticSlot, kind: string): T | null {
  const item = COSMETICS_BY_ID[loadout[slot]];
  if (!item || item.config.kind !== kind) return null;
  return item.config as unknown as T;
}

export const bannerOf = (l: Loadout) => configFor<BannerConfig>(l, 'banner', 'banner');
export const emblemOf = (l: Loadout) => configFor<EmblemConfig>(l, 'emblem', 'emblem');
export const lightsOf = (l: Loadout) => configFor<LightsConfig>(l, 'lights', 'lights');
export const decalOf = (l: Loadout) => configFor<DecalConfig>(l, 'decal', 'decal');

/* -------------------------------------------------------------------------- */
/* Emblems                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Draws a glyph centred on (cx, cy) inside a box of radius r.
 *
 * Shapes are deliberately chunky. An emblem is most often seen on a banner
 * roughly a dozen pixels wide, so anything that depends on fine interior
 * detail reads as a blob; these are silhouettes that survive being small.
 */
export function drawGlyph(
  ctx: CanvasRenderingContext2D,
  glyph: EmblemGlyph,
  cx: number,
  cy: number,
  r: number,
  color: string,
): void {
  if (glyph === 'none' || r < 1.5) return;
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineJoin = 'round';
  ctx.beginPath();

  if (glyph === 'star') {
    for (let i = 0; i < 10; i += 1) {
      const rad = i % 2 === 0 ? r : r * 0.42;
      const a = -Math.PI / 2 + (Math.PI / 5) * i;
      const px = cx + Math.cos(a) * rad;
      const py = cy + Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  } else if (glyph === 'wolf') {
    // Head in profile: two ears, a brow, a muzzle.
    ctx.moveTo(cx - r * 0.85, cy - r * 0.15);
    ctx.lineTo(cx - r * 0.6, cy - r * 0.95);
    ctx.lineTo(cx - r * 0.18, cy - r * 0.4);
    ctx.lineTo(cx + r * 0.25, cy - r * 0.95);
    ctx.lineTo(cx + r * 0.5, cy - r * 0.1);
    ctx.lineTo(cx + r * 0.95, cy + r * 0.35);
    ctx.lineTo(cx + r * 0.25, cy + r * 0.5);
    ctx.lineTo(cx, cy + r * 0.95);
    ctx.lineTo(cx - r * 0.45, cy + r * 0.45);
    ctx.closePath();
    ctx.fill();
  } else if (glyph === 'skull') {
    ctx.arc(cx, cy - r * 0.18, r * 0.72, Math.PI, 0);
    ctx.lineTo(cx + r * 0.72, cy + r * 0.3);
    ctx.lineTo(cx + r * 0.34, cy + r * 0.3);
    ctx.lineTo(cx + r * 0.34, cy + r * 0.85);
    ctx.lineTo(cx - r * 0.34, cy + r * 0.85);
    ctx.lineTo(cx - r * 0.34, cy + r * 0.3);
    ctx.lineTo(cx - r * 0.72, cy + r * 0.3);
    ctx.closePath();
    ctx.fill();
    // Eye sockets are punched out rather than drawn dark, so the skull works
    // on a banner of any colour.
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.34, cy - r * 0.12, r * 0.22, r * 0.28, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + r * 0.34, cy - r * 0.12, r * 0.22, r * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (glyph === 'phoenix') {
    // Wings up, body between them.
    ctx.moveTo(cx, cy + r * 0.9);
    ctx.lineTo(cx - r * 0.22, cy + r * 0.1);
    ctx.lineTo(cx - r, cy - r * 0.85);
    ctx.lineTo(cx - r * 0.45, cy - r * 0.3);
    ctx.lineTo(cx - r * 0.55, cy - r * 0.95);
    ctx.lineTo(cx, cy - r * 0.35);
    ctx.lineTo(cx + r * 0.55, cy - r * 0.95);
    ctx.lineTo(cx + r * 0.45, cy - r * 0.3);
    ctx.lineTo(cx + r, cy - r * 0.85);
    ctx.lineTo(cx + r * 0.22, cy + r * 0.1);
    ctx.closePath();
    ctx.fill();
  } else if (glyph === 'crown') {
    ctx.moveTo(cx - r * 0.9, cy + r * 0.55);
    ctx.lineTo(cx - r * 0.9, cy - r * 0.5);
    ctx.lineTo(cx - r * 0.45, cy - r * 0.05);
    ctx.lineTo(cx, cy - r * 0.85);
    ctx.lineTo(cx + r * 0.45, cy - r * 0.05);
    ctx.lineTo(cx + r * 0.9, cy - r * 0.5);
    ctx.lineTo(cx + r * 0.9, cy + r * 0.55);
    ctx.closePath();
    ctx.fill();
  } else if (glyph === 'trident') {
    const w = r * 0.16;
    ctx.rect(cx - w / 2, cy - r * 0.5, w, r * 1.5);
    ctx.rect(cx - r * 0.7, cy - r * 0.9, w, r * 0.55);
    ctx.rect(cx + r * 0.7 - w, cy - r * 0.9, w, r * 0.55);
    ctx.rect(cx - r * 0.7, cy - r * 0.45, r * 1.4, w);
    ctx.moveTo(cx - w * 1.6, cy - r * 0.95);
    ctx.lineTo(cx, cy - r * 1.35);
    ctx.lineTo(cx + w * 1.6, cy - r * 0.95);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

/* -------------------------------------------------------------------------- */
/* Ground markings                                                            */
/* -------------------------------------------------------------------------- */

/** Painted onto the compound floor, under everything else the base is built from. */
export function drawDecal(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  cfg: DecalConfig,
): void {
  if (cfg.mark === 'none' || s < DECAL_MIN) return;
  const cx = x + s / 2;
  const cy = y + s / 2;

  ctx.save();
  // Everything is clipped to the compound so a stripe never bleeds onto a
  // neighbour's ground.
  ctx.beginPath();
  ctx.rect(x, y, s, s);
  ctx.clip();
  ctx.globalAlpha = cfg.opacity;
  ctx.fillStyle = cfg.color;
  ctx.strokeStyle = cfg.color;

  if (cfg.mark === 'pad') {
    ctx.lineWidth = Math.max(1, s * 0.03);
    ctx.beginPath();
    ctx.arc(cx, cy, s * 0.3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillRect(cx - s * 0.035, cy - s * 0.2, s * 0.07, s * 0.4);
    ctx.fillRect(cx - s * 0.2, cy - s * 0.035, s * 0.4, s * 0.07);
  } else if (cfg.mark === 'chevrons') {
    ctx.lineWidth = Math.max(1, s * 0.05);
    for (let i = 0; i < 3; i += 1) {
      const oy = y + s * (0.58 + i * 0.13);
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.2, oy + s * 0.07);
      ctx.lineTo(cx, oy - s * 0.05);
      ctx.lineTo(cx + s * 0.2, oy + s * 0.07);
      ctx.stroke();
    }
  } else if (cfg.mark === 'grid') {
    ctx.lineWidth = 1;
    for (let i = 1; i < 5; i += 1) {
      const o = (s / 5) * i;
      ctx.beginPath();
      ctx.moveTo(x + o, y);
      ctx.lineTo(x + o, y + s);
      ctx.moveTo(x, y + o);
      ctx.lineTo(x + s, y + o);
      ctx.stroke();
    }
  } else if (cfg.mark === 'scorch') {
    // A gradient rather than a flat disc: a hard-edged circle reads as a
    // painted target, and this is meant to read as damage.
    const g = ctx.createRadialGradient(cx, cy, s * 0.05, cx, cy, s * 0.5);
    g.addColorStop(0, cfg.color);
    g.addColorStop(0.55, cfg.color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, s, s);
  } else if (cfg.mark === 'stripes') {
    ctx.translate(cx, cy);
    ctx.rotate(-0.5);
    for (let i = -4; i <= 4; i += 1) {
      const w = s * (0.05 + (Math.abs(i) % 2) * 0.03);
      ctx.fillRect(i * s * 0.16 - w / 2, -s, w, s * 2);
    }
  } else if (cfg.mark === 'compass') {
    ctx.lineWidth = Math.max(1, s * 0.02);
    ctx.beginPath();
    ctx.arc(cx, cy, s * 0.36, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 16; i += 1) {
      const a = (Math.PI / 8) * i;
      const long = i % 4 === 0;
      const from = s * (long ? 0.06 : 0.26);
      const to = s * 0.36;
      ctx.lineWidth = long ? Math.max(1, s * 0.03) : 1;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * from, cy + Math.sin(a) * from);
      ctx.lineTo(cx + Math.cos(a) * to, cy + Math.sin(a) * to);
      ctx.stroke();
    }
  }

  ctx.restore();
}

/* -------------------------------------------------------------------------- */
/* Perimeter lights                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Corner lamps and a gate light.
 *
 * The cheapest layer to notice and the one that reads from furthest out, which
 * is why it is the layer with no "off" option - an unlit base looks abandoned
 * rather than understated.
 */
export function drawLights(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  cfg: LightsConfig,
): void {
  if (s < LIGHTS_MIN) return;
  const points: Array<[number, number]> = [
    [x + s * 0.08, y + s * 0.08],
    [x + s * 0.92, y + s * 0.08],
    [x + s * 0.08, y + s * 0.92],
    [x + s * 0.92, y + s * 0.92],
    [x + s * 0.5, y + s * 0.97],
  ];
  const glow = s * (0.09 + cfg.reach * 0.11);
  const core = Math.max(1, s * 0.022);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const [lx, ly] of points) {
    const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, glow);
    g.addColorStop(0, cfg.color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.5 + cfg.reach * 0.3;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(lx, ly, glow, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(lx, ly, core, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/* -------------------------------------------------------------------------- */
/* Banner                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * The banner, on a pole at the north-west corner.
 *
 * Drawn last and allowed to overhang the top of the plot, because a flag that
 * stays inside the compound footprint reads as a poster on the floor. The
 * overhang is what makes it look like it is standing up.
 */
export function drawBanner(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  cfg: BannerConfig,
  emblem: EmblemConfig | null,
): void {
  if (cfg.pattern === 'none' || s < BANNER_MIN) return;

  const poleX = x + s * 0.16;
  const footY = y + s * 0.3;
  const topY = y - s * 0.22;
  const clothW = s * 0.3;
  const clothH = s * 0.34;

  ctx.save();

  // Pole, with a shadow cast across the compound so it sits in the scene
  // rather than floating above it.
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = Math.max(1, s * 0.03);
  ctx.beginPath();
  ctx.moveTo(poleX + s * 0.03, footY + s * 0.02);
  ctx.lineTo(poleX + s * 0.12, footY + s * 0.06);
  ctx.stroke();

  ctx.strokeStyle = '#3a3733';
  ctx.lineWidth = Math.max(1, s * 0.026);
  ctx.beginPath();
  ctx.moveTo(poleX, footY);
  ctx.lineTo(poleX, topY);
  ctx.stroke();

  const cx0 = poleX;
  const cy0 = topY + s * 0.02;

  ctx.save();
  ctx.beginPath();
  ctx.rect(cx0, cy0, clothW, clothH);
  ctx.clip();

  if (cfg.pattern === 'solid') {
    ctx.fillStyle = cfg.primary;
    ctx.fillRect(cx0, cy0, clothW, clothH);
    ctx.fillStyle = cfg.secondary;
    ctx.fillRect(cx0, cy0 + clothH * 0.82, clothW, clothH * 0.18);
  } else if (cfg.pattern === 'split') {
    ctx.fillStyle = cfg.secondary;
    ctx.fillRect(cx0, cy0, clothW, clothH);
    ctx.fillStyle = cfg.primary;
    ctx.beginPath();
    ctx.moveTo(cx0, cy0);
    ctx.lineTo(cx0 + clothW, cy0);
    ctx.lineTo(cx0, cy0 + clothH);
    ctx.closePath();
    ctx.fill();
  } else if (cfg.pattern === 'chevron') {
    ctx.fillStyle = cfg.primary;
    ctx.fillRect(cx0, cy0, clothW, clothH);
    ctx.fillStyle = cfg.secondary;
    ctx.beginPath();
    ctx.moveTo(cx0, cy0 + clothH * 0.34);
    ctx.lineTo(cx0 + clothW * 0.5, cy0 + clothH * 0.08);
    ctx.lineTo(cx0 + clothW, cy0 + clothH * 0.34);
    ctx.lineTo(cx0 + clothW, cy0 + clothH * 0.58);
    ctx.lineTo(cx0 + clothW * 0.5, cy0 + clothH * 0.32);
    ctx.lineTo(cx0, cy0 + clothH * 0.58);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillStyle = cfg.secondary;
    ctx.fillRect(cx0, cy0, clothW, clothH);
    ctx.fillStyle = cfg.primary;
    for (let i = 0; i < 3; i += 1) {
      ctx.fillRect(cx0, cy0 + clothH * (0.08 + i * 0.3), clothW, clothH * 0.18);
    }
  }

  if (emblem && emblem.glyph !== 'none') {
    drawGlyph(ctx, emblem.glyph, cx0 + clothW * 0.5, cy0 + clothH * 0.5, clothH * 0.3, emblem.color);
  }

  ctx.restore();

  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(cx0, cy0, clothW, clothH);
  ctx.restore();
}

/**
 * The emblem again, stamped on the compound floor.
 *
 * Only at close zoom. It is the detail that makes a base feel occupied when a
 * player has zoomed all the way in on a neighbour, and it costs nothing on a
 * map where nobody has.
 */
export function drawPadEmblem(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  cfg: EmblemConfig,
): void {
  if (cfg.glyph === 'none' || s < PAD_EMBLEM_MIN) return;
  ctx.save();
  ctx.globalAlpha = 0.32;
  drawGlyph(ctx, cfg.glyph, x + s * 0.5, y + s * 0.72, s * 0.13, cfg.color);
  ctx.restore();
}

/* -------------------------------------------------------------------------- */
/* Store and customisation swatches                                           */
/* -------------------------------------------------------------------------- */

/**
 * Draws one catalogue item on its own, filling a square.
 *
 * The customisation screen needs to show an item away from the base it will
 * end up on, and each slot needs a different framing to be legible: a banner
 * wants to be seen as cloth, a light as a lamp, a marking as paint on dirt.
 * Doing that here rather than in the component keeps every drawing rule for
 * cosmetics in one file.
 */
export function drawSwatch(
  ctx: CanvasRenderingContext2D,
  item: CosmeticItem,
  size: number,
): void {
  ctx.clearRect(0, 0, size, size);
  const cfg = item.config;

  if (cfg.kind === 'banner') {
    ctx.fillStyle = '#15140f';
    ctx.fillRect(0, 0, size, size);
    if (cfg.pattern === 'none') {
      ctx.strokeStyle = '#3f3d36';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(size * 0.3, size * 0.3);
      ctx.lineTo(size * 0.7, size * 0.7);
      ctx.moveTo(size * 0.7, size * 0.3);
      ctx.lineTo(size * 0.3, size * 0.7);
      ctx.stroke();
      return;
    }
    // Reuse the map painter so a swatch cannot drift from the real thing:
    // scaled up and offset so the cloth alone fills the square.
    ctx.save();
    const s = size * 2.9;
    ctx.translate(size * 0.5 - s * 0.16 - s * 0.15, size * 0.5 + s * 0.19 - s * 0.17);
    drawBanner(ctx, 0, 0, s, cfg, null);
    ctx.restore();
    return;
  }

  if (cfg.kind === 'emblem') {
    ctx.fillStyle = '#15140f';
    ctx.fillRect(0, 0, size, size);
    if (cfg.glyph === 'none') {
      ctx.strokeStyle = '#3f3d36';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size * 0.26, 0, Math.PI * 2);
      ctx.stroke();
      return;
    }
    drawGlyph(ctx, cfg.glyph, size / 2, size / 2, size * 0.32, cfg.color);
    return;
  }

  if (cfg.kind === 'lights') {
    ctx.fillStyle = '#0b0a08';
    ctx.fillRect(0, 0, size, size);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size * 0.46);
    g.addColorStop(0, cfg.color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, Math.max(1.5, size * 0.06), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  // Ground marking, on a patch of the dirt it will actually be painted on.
  ctx.fillStyle = '#8f7550';
  ctx.fillRect(0, 0, size, size);
  if (cfg.mark === 'none') {
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(size * 0.24, size * 0.24, size * 0.52, size * 0.52);
    return;
  }
  // The map painter skips small sizes on purpose; a swatch is a close-up, so
  // it is drawn at map scale and scaled down into the square.
  const s = Math.max(DECAL_MIN, size) * 2;
  ctx.save();
  ctx.scale(size / s, size / s);
  drawDecal(ctx, 0, 0, s, cfg);
  ctx.restore();
}

/**
 * Perimeter lights for a base with rendered art.
 *
 * The plot-corner placement above is right for a square compound drawn to fill
 * its plot. Rendered art does not: it has its own silhouette, and lamps pinned
 * to the plot corners hang in empty space beside it, obviously not attached to
 * anything.
 *
 * These follow the front arc of the base instead - where a dais meets the
 * ground - so they read as lanterns standing around it whatever shape it is.
 */
export function drawLightsOnArt(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  cfg: LightsConfig,
): void {
  if (s < LIGHTS_MIN) return;

  const cx = x + s * 0.5;
  const cy = y + s * 0.78;
  const rx = s * 0.44;
  const ry = s * 0.15;
  const glow = s * (0.07 + cfg.reach * 0.08);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 7; i += 1) {
    // Across the front half of the ellipse only. A lamp drawn on the far side
    // would be behind the base, and drawing it in front of one reads as a
    // mistake rather than as depth.
    const a = Math.PI * (0.08 + (i / 6) * 0.84);
    const lx = cx - Math.cos(a) * rx;
    const ly = cy + Math.sin(a) * ry;

    const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, glow);
    g.addColorStop(0, cfg.color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.45 + cfg.reach * 0.3;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(lx, ly, glow, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * The "this is you" marker for a base with rendered art.
 *
 * A square outline works on a compound that fills its plot, and frames a
 * rendered base like a picture. This sits on the ground underneath instead,
 * which reads as a spotlight on your own base rather than a box around it.
 */
export function drawOwnerRing(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
): void {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = Math.max(1.5, s * 0.022);
  ctx.beginPath();
  ctx.ellipse(x + s * 0.5, y + s * 0.84, s * 0.46, s * 0.13, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
