/**
 * Map effects.
 *
 * Smoke, fire, embers and blast waves are drawn *over* bases rather than baked
 * into them. One smoke system serves every skin, which is what makes a large
 * skin catalogue affordable: art stays static, motion is code.
 *
 * Everything here is deterministic per plot except the particle lifetimes, so
 * two players watching the same burning base see the same fire in the same
 * place - it drifts identically because it is seeded from the plot, not from
 * whenever their tab happened to open.
 */

export type EffectKind = 'smoke' | 'fire' | 'embers' | 'rubble';

export interface EffectSource {
  /** Plot coordinates the effect is anchored to. */
  x: number;
  y: number;
  kind: EffectKind;
  /** 0..1 - how hard it is burning. Drives density and colour. */
  intensity: number;
  /** Server instant the effect stops. Effects are state, not animation triggers. */
  until: number;
}

interface Particle {
  /** Offset from the plot centre, in plot units, so particles scale with zoom. */
  ox: number;
  oy: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  seed: number;
}

const MAX_PARTICLES_PER_SOURCE = 44;

function hash(x: number, y: number, salt: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + salt * 74.7) * 43758.5453;
  return n - Math.floor(n);
}

/**
 * A live emitter for one base.
 *
 * Particles are kept in a fixed-size pool and recycled rather than allocated,
 * because a map full of burning bases would otherwise produce thousands of
 * short-lived objects a second and hand the garbage collector a stutter at
 * exactly the moment the player is watching something happen.
 */
export class Emitter {
  readonly source: EffectSource;
  private particles: Particle[] = [];
  private spawnAccumulator = 0;

  constructor(source: EffectSource) {
    this.source = source;
    const count = Math.round(MAX_PARTICLES_PER_SOURCE * source.intensity);
    for (let i = 0; i < count; i += 1) this.particles.push(this.make(i, true));
  }

  private make(index: number, stagger: boolean): Particle {
    const {x, y, kind} = this.source;
    const seed = hash(x, y, index);
    const spread = kind === 'fire' ? 0.18 : 0.3;
    const rise = kind === 'smoke' ? 0.55 : kind === 'embers' ? 0.7 : 0.4;
    const maxLife = kind === 'fire' ? 700 + seed * 500 : 1800 + seed * 1600;
    return {
      ox: (hash(x, y, index + 11) - 0.5) * spread,
      oy: (hash(x, y, index + 23) - 0.5) * spread * 0.6,
      vx: (hash(x, y, index + 37) - 0.5) * 0.16,
      vy: -(0.22 + hash(x, y, index + 53) * rise),
      // Staggering the initial lives stops every particle being born on the
      // same frame, which reads as a pulse rather than a plume.
      life: stagger ? seed * maxLife : 0,
      maxLife,
      size: 0.1 + hash(x, y, index + 71) * 0.22,
      seed,
    };
  }

  update(deltaMs: number): void {
    const drift = deltaMs / 1000;
    for (let i = 0; i < this.particles.length; i += 1) {
      const p = this.particles[i];
      p.life += deltaMs;
      if (p.life >= p.maxLife) {
        const fresh = this.make(i, false);
        this.particles[i] = fresh;
        continue;
      }
      p.ox += p.vx * drift;
      p.oy += p.vy * drift;
      // Smoke widens and slows as it rises; fire does not get the chance.
      if (this.source.kind !== 'fire') p.vy *= 1 - 0.35 * drift;
    }
    this.spawnAccumulator += deltaMs;
  }

  /**
   * Draws the emitter.
   *
   * `px`/`py` are the plot's top-left on screen and `size` its on-screen size,
   * so the caller owns the camera and this owns the look.
   */
  draw(ctx: CanvasRenderingContext2D, px: number, py: number, size: number): void {
    const cx = px + size / 2;
    const cy = py + size / 2;
    const kind = this.source.kind;

    ctx.save();
    ctx.globalCompositeOperation = kind === 'fire' || kind === 'embers' ? 'lighter' : 'source-over';

    for (const p of this.particles) {
      const t = p.life / p.maxLife;
      if (t <= 0 || t >= 1) continue;

      // Fade in fast, out slow: a puff that appears at full opacity reads as a
      // pop, and one that vanishes abruptly reads as a bug.
      const alpha = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85;
      const x = cx + p.ox * size;
      const y = cy + p.oy * size;
      const r = p.size * size * (kind === 'smoke' ? 0.6 + t * 1.4 : 1 - t * 0.5);
      if (r <= 0.4) continue;

      if (kind === 'smoke') {
        const shade = 40 + p.seed * 40;
        ctx.fillStyle = `rgba(${shade},${shade},${shade},${alpha * 0.42})`;
      } else if (kind === 'fire') {
        // Cools from white through amber to red as it rises.
        const heat = 1 - t;
        const g = Math.round(90 + heat * 150);
        const b = Math.round(20 + heat * 70);
        ctx.fillStyle = `rgba(255,${g},${b},${alpha * 0.7})`;
      } else if (kind === 'embers') {
        ctx.fillStyle = `rgba(255,${Math.round(170 + p.seed * 60)},90,${alpha * 0.9})`;
      } else {
        ctx.fillStyle = `rgba(70,64,58,${alpha * 0.5})`;
      }

      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

/**
 * A one-shot blast ring, for the moment a base is destroyed.
 *
 * Separate from Emitter because it is an event rather than a state: it plays
 * once and is discarded, where smoke persists for as long as the server says
 * the base is burning.
 */
export class Blast {
  private elapsed = 0;
  private readonly duration = 900;

  constructor(
    readonly x: number,
    readonly y: number,
  ) {}

  get finished(): boolean {
    return this.elapsed >= this.duration;
  }

  update(deltaMs: number): void {
    this.elapsed += deltaMs;
  }

  draw(ctx: CanvasRenderingContext2D, px: number, py: number, size: number): void {
    const t = Math.min(1, this.elapsed / this.duration);
    const cx = px + size / 2;
    const cy = py + size / 2;
    // Ease out: fast expansion that decelerates, which reads as force.
    const eased = 1 - Math.pow(1 - t, 3);
    const radius = size * (0.2 + eased * 1.5);
    const alpha = (1 - t) * 0.8;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(255,${Math.round(150 + (1 - t) * 90)},60,${alpha})`;
    ctx.lineWidth = Math.max(1, size * 0.09 * (1 - t));
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = `rgba(255,220,150,${alpha * 0.5})`;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.3 * (1 - t), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/**
 * Keeps emitters in step with what the server says is happening.
 *
 * Effects are driven by state with an expiry, not by "play this now": a player
 * who opens the map halfway through a fire sees it already burning, and a
 * reload does not restart it.
 */
export class EffectLayer {
  private emitters = new Map<string, Emitter>();
  private blasts: Blast[] = [];

  sync(sources: EffectSource[], now: number): void {
    const live = new Set<string>();
    for (const source of sources) {
      if (source.until <= now) continue;
      const key = `${source.x},${source.y}`;
      live.add(key);
      const existing = this.emitters.get(key);
      if (!existing || existing.source.kind !== source.kind) {
        this.emitters.set(key, new Emitter(source));
      }
    }
    for (const key of [...this.emitters.keys()]) {
      if (!live.has(key)) this.emitters.delete(key);
    }
  }

  addBlast(x: number, y: number): void {
    this.blasts.push(new Blast(x, y));
  }

  get busy(): boolean {
    return this.emitters.size > 0 || this.blasts.length > 0;
  }

  update(deltaMs: number): void {
    for (const emitter of this.emitters.values()) emitter.update(deltaMs);
    for (const blast of this.blasts) blast.update(deltaMs);
    this.blasts = this.blasts.filter((b) => !b.finished);
  }

  /** `project` turns plot coordinates into the plot's top-left on screen. */
  draw(
    ctx: CanvasRenderingContext2D,
    project: (x: number, y: number) => {px: number; py: number} | null,
    size: number,
  ): void {
    for (const emitter of this.emitters.values()) {
      const at = project(emitter.source.x, emitter.source.y);
      if (at) emitter.draw(ctx, at.px, at.py, size);
    }
    for (const blast of this.blasts) {
      const at = project(blast.x, blast.y);
      if (at) blast.draw(ctx, at.px, at.py, size);
    }
  }
}
