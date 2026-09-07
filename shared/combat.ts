/**
 * The resolver.
 *
 * Two squads in, a report out. No map, no travel, no clock, no database - the
 * same function the map raid, the arena and every event will call, which is
 * what stops the arena becoming a second combat system with its own balance.
 *
 * Deterministic. The same seed and the same squads always produce the same
 * battle, so a report can be re-derived, a bug can be reproduced from the row
 * that recorded it, and ten thousand simulated fights mean something.
 */
import {
  ASSET_BY_ID,
  type Asset,
  type AssetCategory,
  DRAFTABLE_CATEGORIES,
} from './assets';
import type {AssetRole} from './assets';
import {type Packages, NO_PACKAGES, assetPowerWith, attributesWith} from './upgrades';
import {
  type CombatSystems,
  NO_SYSTEMS,
  describeSystems,
  fireControlMultiplier,
  survivabilityMultiplier,
} from './combatSystems';
import {
  FRONT_DRONE_DRAW,
  FRONT_DRONE_HP,
  FRONT_DRONE_WAVE,
  REAR_DRONE_DAMAGE,
  REAR_DRONE_HP,
  droneArmourMultiplier,
} from './drones';

/* -------------------------------------------------------------------------- */
/* Tuning - every number is provisional and named; docs/GAME-MATH-v1.md      */
/* -------------------------------------------------------------------------- */

export const ROUNDS = 5;

/**
 * Hit points: HP = HP_SCALE * (HP_BASE + HP_PER_POINT * firepower + HP_PER_ARMOUR * armour).
 *
 * HP_PER_ARMOUR is the number the harness has been wrong about twice. The
 * spec sets 1.2 AND adds a mitigation term on armour below, which is armour
 * counted twice - the exact fault the harness found in the first resolver.
 * Kept at the spec's value so the harness can measure it; section 8 of the
 * simulation (equal budget, different shape) is the check.
 */
/** A flat floor every asset has, so HP is not just another firepower bonus. */
export const HP_BASE = 3;
export const HP_PER_POINT = 0.3;
export const HP_PER_ARMOUR = 0.4;
export const HP_SCALE = 8;

/** Per-shot damage scale, and how much armour blunts a hit: 100/(100+4A). */
export const DAMAGE_SCALE = 2.0;
export const ARMOUR_MITIGATION = 4;

/** Range: 1 + 0.025 * (own range - enemy average), clamped. */
export const RANGE_DELTA = 0.025;
export const RANGE_MIN = 0.8;
export const RANGE_MAX = 1.18;

export const COUNTER_PERFECT = 1.2;
export const COUNTER_MEDIUM = 1.1;

/**
 * Exposure: each band a Task Force fails to cover makes it easier to hit.
 * Two kinds of band, both counted, as decided on 2026-09-06: the category
 * bands (deep / air / close - is there something to answer artillery, air
 * and armour) and the role bands (contact / fire / information - is there
 * something to hold, something to shoot from range, something to see).
 * 1 + EXPOSURE_PER_MISSING_BAND per band missing.
 */
export const EXPOSURE_PER_MISSING_BAND = 0.09;

/** Spotting: clamp(FLOOR, 1, BASE + DELTA * (own avg detection - theirs) + recon). */
export const SPOTTING_FLOOR = 0.35;
export const SPOTTING_BASE = 0.65;
export const SPOTTING_DELTA = 0.025;

/**
 * The roll. Every shot swings by up to VARIANCE either way, and with
 * probability CHANCE lands for TACTICAL_ROLL on top. The spec had only the
 * crit; with it alone an equal fight was decided by who shot first, because
 * nothing else in the resolver varies between two runs of the same battle.
 */
export const VARIANCE = 0.4;
export const CHANCE = 0.05;
export const TACTICAL_ROLL = 1.2;
/**
 * Each side also draws ONE roll for the whole battle - the day's conditions,
 * who got set first - of up to BATTLE_SWING either way on its damage. Per-shot
 * variance averages out over thirty shots; without a side-level swing a 5%
 * power gap won 93% of fights and the spec asks for close fights to be close.
 */
export const BATTLE_SWING = 0.28;

/** Targeting: weight * (1 + TARGET_DAMAGED * fraction of HP already lost). */
export const TARGET_DAMAGED = 0.12;

/** Within this much strength, nobody won. */
export const DRAW_BAND = 0.02;

/* Formation: six slots, three pairs. Slot index decides. */
export type Position = 'front' | 'centre' | 'rear';
export function positionOfSlot(slot: number): Position {
  return slot < 2 ? 'front' : slot < 4 ? 'centre' : 'rear';
}
export const POSITION: Record<
  Position,
  {targetWeight: number; damage: number; armour: number; detection: number}
> = {
  front: {targetWeight: 1.45, damage: 0.96, armour: 0.08, detection: 0},
  centre: {targetWeight: 1.0, damage: 1.0, armour: 0, detection: 0},
  rear: {targetWeight: 0.65, damage: 1.0, armour: 0, detection: 0.1},
};
/** Rear fires +12% when its range at least matches the enemy average, else -10%. */
export const REAR_RANGE_BONUS = 0.12;
export const REAR_RANGE_PENALTY = -0.1;

/* Roles, in the position they were built for. */
export const BREACH_FRONT_DAMAGE = 0.06;
export const SCREEN_FRONT_PROTECTION = 0.05;
export const STRIKE_CENTRE_DAMAGED_TARGET = 0.08;
export const OVERWATCH_REAR_DAMAGE = 0.06;
export const RECON_CENTRE_SPOTTING = 0.05;
export const RECON_SPOTTING_CAP = 0.1;

/** Which role covers which role band. Lift and strike cover none. */
export type RoleBand = 'contact' | 'fire' | 'information';
export const ROLE_BANDS: RoleBand[] = ['contact', 'fire', 'information'];
export const ROLE_BAND: Partial<Record<AssetRole, RoleBand>> = {
  breach: 'contact',
  screen: 'contact',
  overwatch: 'fire',
  recon: 'information',
};

export type Band = 'deep' | 'air' | 'close';
export const BANDS: Band[] = ['deep', 'air', 'close'];

/** Which band a category fights in. The order is the order of a real engagement. */
export const CATEGORY_BAND: Record<AssetCategory, Band> = {
  artillery: 'deep',
  naval: 'deep',
  rotary: 'air',
  fixed_wing: 'air',
  drone: 'air',
  armour: 'close',
};

/**
 * The order of the counter ring.
 *
 * Each category perfectly counters the NEXT one along, and mediumly counters
 * the one two along. Every link is a real relationship. Helicopters kill tanks
 * from above; tanks with close-in defences kill loitering munitions; drones are
 * counter-battery; shore batteries threaten ships; ship air defence kills
 * aircraft; fighters kill helicopters.
 *
 * ── Why this is an order and not a table ──────────────────────────────────
 *
 * It used to be a hand-written table of six categories, and it was correct for
 * six. Season 1 plays FIVE, because naval is held back until the map has water
 * - and removing one link from a ring does not shorten the ring, it OPENS it.
 * With naval gone, artillery lost the only thing it perfectly countered and
 * fixed wing lost the only thing that perfectly countered it. Measured across
 * the whole draftable catalogue, fixed wing beat every other category 100% of
 * the time and artillery lost to every other category 100% of the time.
 *
 * That is not a tuning fault and no multiplier can fix it. The fault was the
 * shape of the graph, and the shape was hardcoded for a set of categories that
 * is not the set actually being played.
 *
 * So the ring is now DERIVED from whichever categories are draftable. Delete
 * naval and the five that remain close up into a five-cycle; restore naval in
 * Season 3 and it becomes a six-cycle again, with no second table to forget to
 * update. `scripts/simulate.mjs` asserts the ring is closed, so this cannot
 * quietly break again.
 */
export const COUNTER_CYCLE: AssetCategory[] = [
  'rotary',
  'armour',
  'drone',
  'artillery',
  'naval',
  'fixed_wing',
];

/**
 * Build the counter table for a set of categories, as a closed ring.
 *
 * Medium counters need at least five categories to be distinct from the
 * perfect ones - with four, the category two along is also the one two back,
 * so a medium counter would be mutual. Below that the ring carries perfect
 * counters only, which is still closed.
 */
export function counterRing(
  categories: readonly AssetCategory[],
): Record<AssetCategory, Partial<Record<AssetCategory, number>>> {
  const order = COUNTER_CYCLE.filter((c) => categories.includes(c));
  const table = Object.fromEntries(
    COUNTER_CYCLE.map((c) => [c, {} as Partial<Record<AssetCategory, number>>]),
  ) as Record<AssetCategory, Partial<Record<AssetCategory, number>>>;
  const n = order.length;
  if (n < 3) return table;
  for (let i = 0; i < n; i += 1) {
    table[order[i]][order[(i + 1) % n]] = COUNTER_PERFECT;
    if (n >= 5) table[order[i]][order[(i + 2) % n]] = COUNTER_MEDIUM;
  }
  return table;
}

/** The ring over the categories a player can actually field this season. */
export const COUNTER = counterRing(DRAFTABLE_CATEGORIES);

export function counterOf(attacker: AssetCategory, defender: AssetCategory): number {
  return COUNTER[attacker]?.[defender] ?? 1;
}

/**
 * What a category beats and what beats it, for the roster card.
 *
 * Derived from the same table the resolver uses, because it was once a second
 * hand-written table that disagreed with the resolver in six of twelve entries
 * - the catalogue screen told players artillery beat armour and that fixed
 * wing lost to drones, and the resolver implemented neither. A screen that
 * teaches the counter web has to be reading the web.
 */
export function counterWeb(category: AssetCategory): {
  beats: AssetCategory[];
  losesTo: AssetCategory[];
} {
  const beats = Object.keys(COUNTER[category] ?? {}) as AssetCategory[];
  const losesTo = (Object.keys(COUNTER) as AssetCategory[]).filter(
    (other) => other !== category && COUNTER[other]?.[category] !== undefined,
  );
  return {beats, losesTo};
}

/* -------------------------------------------------------------------------- */
/* Input and output                                                           */
/* -------------------------------------------------------------------------- */

export interface CombatantSpec {
  assetId: string;
  level: number;
  /** Fitted packages. Optional so the arena and the harness keep working. */
  packages?: Packages;
  /**
   * Which of the six slots it stands in: 0-1 front, 2-3 centre, 4-5 rear.
   * The formation IS the slot order a player drags assets into. Optional:
   * without it an asset stands in the centre, which is the neutral position.
   */
  slot?: number;
  /** Fraction of HP it arrived with, 0-1. Damaged assets fight damaged. */
  hpFraction?: number;
  /** Its category building's boost (shared/buildings.ts). 1 when absent. */
  boost?: number;
  /**
   * The Combat Systems of the Task Force it fights in (shared/combatSystems.ts).
   * Per unit rather than per side because a defence is every Task Force at
   * home at once, each with its own lanes. Absent means level 1 everywhere.
   */
  systems?: CombatSystems;
  /** Which Task Force, for the report's modifier lines. */
  squad?: string;
}

export interface SideSpec {
  name: string;
  units: CombatantSpec[];
  /**
   * Home ground and every other stage-5-to-9 multiplier on outgoing damage,
   * pre-combined by the caller. The map passes the defender's buildings; the
   * arena passes 1. The resolver never reads a building.
   */
  modifier?: number;
  /**
   * Harness only. The isolated counter test sets this false so six synthetic
   * drones are not also paying the six-drone armour cost, which is a
   * different rule from the one being measured. Every real fight leaves it.
   */
  droneRules?: boolean;
}

interface Unit {
  id: string;
  asset: Asset;
  level: number;
  hp: number;
  maxHp: number;
  firepower: number;
  armour: number;
  mobility: number;
  range: number;
  detection: number;
  band: Band;
  position: Position;
  role: AssetRole;
  /** Hit this round already - a strike in the centre punishes that. */
  hitThisRound: boolean;
  drone: boolean;
  /** Fire-Control: multiplier on every shot this unit fires. 1 at level 1. */
  damageMult: number;
}

export interface CombatUnitResult {
  assetId: string;
  name: string;
  /** Disabled: no HP left. It is repairable, not gone. */
  damaged: boolean;
  /** How much of its pool it had left, 0 to 1. */
  remaining: number;
}

export interface CombatRound {
  index: number;
  summary: string;
  attackerDamage: number;
  defenderDamage: number;
}

export interface CombatResult {
  outcome: 'attacker' | 'defender' | 'draw';
  rounds: CombatRound[];
  notes: string[];
  attacker: SideResult;
  defender: SideResult;
}

export interface SideResult {
  name: string;
  power: number;
  /** What composition was worth, measured rather than declared. */
  composition: number;
  /** Spotting, 0.35 to 1. */
  spotting: number;
  /** Exposure multiplier the side fought under. 1 means every band covered. */
  exposure: number;
  losses: number;
  units: CombatUnitResult[];
  /** Fraction of the starting pool still standing when it ended. */
  strength: number;
  /**
   * Every Task Force-level modifier that took part, one line each, in the
   * words the report prints. Empty when nothing above level 1 was carried.
   */
  modifiers: string[];
}

/* -------------------------------------------------------------------------- */
/* Determinism                                                                */
/* -------------------------------------------------------------------------- */

/** mulberry32. Small, fast, and good enough for a battle. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* -------------------------------------------------------------------------- */
/* Building a side                                                            */
/* -------------------------------------------------------------------------- */

function build(spec: SideSpec): Unit[] {
  const units: Unit[] = [];
  // Every drone carried costs the whole Task Force armour - the escort is
  // stretched thin covering them. Drones pay it too. DRONE RULES v1 §2.
  const rules = spec.droneRules ?? true;
  const drones = spec.units.filter((u) => ASSET_BY_ID[u.assetId]?.category === 'drone').length;
  const droneArmour = rules ? droneArmourMultiplier(drones) : 1;
  spec.units.forEach((u, i) => {
    const asset = ASSET_BY_ID[u.assetId];
    if (!asset) return;
    const a = attributesWith(asset, u.level, u.packages ?? NO_PACKAGES, u.boost ?? 1);
    const position = positionOfSlot(u.slot ?? 2);
    const pos = POSITION[position];
    const drone = asset.category === 'drone';
    const armour = a.armour * (1 + pos.armour) * droneArmour;
    const detection = a.detection * (1 + pos.detection);
    // A front drone is fragile by choice; a rear one is built to last. §3-4.
    const droneHp =
      drone && rules ? (position === 'front' ? FRONT_DRONE_HP : position === 'rear' ? REAR_DRONE_HP : 1) : 1;
    const systems = u.systems ?? NO_SYSTEMS;
    // Survivability: the whole pool, before damage taken is applied.
    const maxHp =
      HP_SCALE * (HP_BASE + HP_PER_POINT * a.firepower + HP_PER_ARMOUR * armour) * droneHp *
      survivabilityMultiplier(systems.survivability);
    const frac = Math.max(0, Math.min(1, u.hpFraction ?? 1));
    units.push({
      id: `${u.assetId}#${i}`,
      asset,
      level: u.level,
      hp: maxHp * frac,
      maxHp,
      firepower: a.firepower,
      armour,
      mobility: a.mobility,
      range: a.range,
      detection,
      band: CATEGORY_BAND[asset.category],
      position,
      role: asset.role,
      hitThisRound: false,
      drone,
      damageMult: fireControlMultiplier(systems.fire_control),
    });
  });
  return units;
}

const alive = (units: Unit[]) => units.filter((u) => u.hp > 0);

/**
 * The Combat Systems lines for a side: one set per Task Force that fought,
 * in the order its units appear. A defence of two Task Forces prints both.
 */
function modifiersOf(spec: SideSpec): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const u of spec.units) {
    const squad = u.squad ?? '';
    if (seen.has(squad)) continue;
    seen.add(squad);
    out.push(...describeSystems(squad || spec.name, u.systems ?? NO_SYSTEMS));
  }
  return out;
}
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const avg = (xs: number[]) => (xs.length === 0 ? 0 : sum(xs) / xs.length);

/**
 * How exposed a side is: one step per band it does not cover, counting both
 * the category bands and the role bands. A mono-category Task Force of the
 * right roles is still exposed; a mixed one with nobody to see is too.
 */
export function exposureOf(units: Unit[]): number {
  const cats = new Set(units.map((u) => u.band));
  const roles = new Set(units.map((u) => ROLE_BAND[u.role]).filter(Boolean));
  const missing = BANDS.length - cats.size + (ROLE_BANDS.length - roles.size);
  return 1 + EXPOSURE_PER_MISSING_BAND * missing;
}

function spottingOf(mine: Unit[], theirs: Unit[]): number {
  const delta = avg(mine.map((u) => u.detection)) - avg(theirs.map((u) => u.detection));
  const recon = Math.min(
    RECON_SPOTTING_CAP,
    mine.filter((u) => u.role === 'recon' && u.position === 'centre').length * RECON_CENTRE_SPOTTING,
  );
  const seen = Math.max(SPOTTING_FLOOR, Math.min(1, SPOTTING_BASE + SPOTTING_DELTA * delta + recon));
  // No drone, no eyes forward: a side without a living drone never spots
  // better than base, whatever its detection. That is how a drone-less Task
  // Force defends at home - it cannot march at all. Decided with DRONE RULES
  // v1; the floor was tried first and broke the counter ring (six drones beat
  // rotary 88%, because rotary could not see them).
  return mine.some((u) => u.drone && u.hp > 0) ? seen : Math.min(seen, SPOTTING_BASE);
}

/* -------------------------------------------------------------------------- */
/* The fight                                                                  */
/* -------------------------------------------------------------------------- */

function pickTarget(enemies: Unit[]): Unit | null {
  let best: Unit | null = null;
  let bestScore = -1;
  for (const e of enemies) {
    const lost = 1 - e.hp / e.maxHp;
    const draw = e.drone && e.position === 'front' ? FRONT_DRONE_DRAW : 1;
    const score = POSITION[e.position].targetWeight * draw * (1 + TARGET_DAMAGED * lost);
    if (score > bestScore || (score === bestScore && best && e.id < best.id)) {
      best = e;
      bestScore = score;
    }
  }
  return best;
}

function shot(
  shooter: Unit,
  target: Unit,
  enemies: Unit[],
  spotting: number,
  modifier: number,
  exposure: number,
  roll: () => number,
  /** The opening wave fires at a share of a normal shot. 1 for a normal one. */
  scale = 1,
): number {
  const enemyRange = avg(enemies.map((u) => u.range));
  const rangeMult = Math.max(RANGE_MIN, Math.min(RANGE_MAX, 1 + RANGE_DELTA * (shooter.range - enemyRange)));

  let positionAttack = POSITION[shooter.position].damage;
  if (shooter.position === 'rear') {
    positionAttack *= 1 + (shooter.range >= enemyRange ? REAR_RANGE_BONUS : REAR_RANGE_PENALTY);
  }

  let roleAttack = 1;
  if (shooter.role === 'breach' && shooter.position === 'front') roleAttack *= 1 + BREACH_FRONT_DAMAGE;
  if (shooter.role === 'overwatch' && shooter.position === 'rear') roleAttack *= 1 + OVERWATCH_REAR_DAMAGE;
  if (shooter.role === 'strike' && shooter.position === 'centre' && target.hitThisRound) {
    roleAttack *= 1 + STRIKE_CENTRE_DAMAGED_TARGET;
  }

  const counter = counterOf(shooter.asset.category, target.asset.category);
  const mitigation = 100 / (100 + ARMOUR_MITIGATION * target.armour);
  const tactical = (1 + (roll() * 2 - 1) * VARIANCE) * (roll() < CHANCE ? TACTICAL_ROLL : 1);

  // A screen in the front takes 5% off what its front-line neighbours take.
  const screened =
    target.position === 'front' &&
    enemies.some((u) => u !== target && u.role === 'screen' && u.position === 'front' && u.hp > 0)
      ? 1 - SCREEN_FRONT_PROTECTION
      : 1;

  // A rear drone shoots softer for lasting longer. §4.
  const droneAttack = shooter.drone && shooter.position === 'rear' ? REAR_DRONE_DAMAGE : 1;

  const damage =
    DAMAGE_SCALE *
    scale *
    droneAttack *
    shooter.damageMult *
    shooter.firepower *
    rangeMult *
    spotting *
    positionAttack *
    roleAttack *
    counter *
    exposure *
    mitigation *
    tactical *
    modifier *
    screened;

  const applied = Math.min(target.hp, damage);
  target.hp -= applied;
  target.hitThisRound = true;
  return applied;
}

export function resolve(
  attackerSpec: SideSpec,
  defenderSpec: SideSpec,
  seed = 1,
): CombatResult {
  const roll = rng(seed);
  const A = build(attackerSpec);
  const D = build(defenderSpec);
  const swingA = 1 + (roll() * 2 - 1) * BATTLE_SWING;
  const swingD = 1 + (roll() * 2 - 1) * BATTLE_SWING;

  const startA = sum(A.map((u) => u.maxHp));
  const startD = sum(D.map((u) => u.maxHp));

  const powerOf = (spec: SideSpec) =>
    sum(
      spec.units.map((u) => {
        const asset = ASSET_BY_ID[u.assetId];
        return asset ? assetPowerWith(asset, u.level, u.packages ?? NO_PACKAGES, u.boost ?? 1) : 0;
      }),
    );
  const powerA = powerOf(attackerSpec);
  const powerD = powerOf(defenderSpec);

  const expA = exposureOf(A);
  const expD = exposureOf(D);

  const rounds: CombatRound[] = [];
  const notes: string[] = [];
  if (expA > 1) notes.push(`${attackerSpec.name} left a band uncovered.`);
  if (expD > 1) notes.push(`${defenderSpec.name} left a band uncovered.`);
  let spotA = SPOTTING_BASE;
  let spotD = SPOTTING_BASE;

  // The opening wave: every front drone fires one shot before round 1, at
  // FRONT_DRONE_WAVE of a normal one, before anything else moves. Attacker's
  // drones first, then the defender's; a drone broken by the other side's
  // wave still fires nothing. DRONE RULES v1 §3.
  {
    spotA = spottingOf(alive(A), alive(D));
    spotD = spottingOf(alive(D), alive(A));
    let waveA = 0;
    let waveD = 0;
    const wave = (side: 'A' | 'D') => {
      const mine = side === 'A' ? A : D;
      for (const u of mine) {
        if (u.hp <= 0 || !u.drone || u.position !== 'front') continue;
        const enemies = alive(side === 'A' ? D : A);
        const target = pickTarget(enemies);
        if (!target) return;
        const dealt = shot(
          u,
          target,
          enemies,
          side === 'A' ? spotA : spotD,
          ((side === 'A' ? attackerSpec.modifier : defenderSpec.modifier) ?? 1) * (side === 'A' ? swingA : swingD),
          side === 'A' ? expD : expA,
          roll,
          FRONT_DRONE_WAVE,
        );
        if (side === 'A') waveA += dealt;
        else waveD += dealt;
      }
    };
    wave('A');
    wave('D');
    if (waveA > 0 || waveD > 0) {
      for (const u of [...A, ...D]) u.hitThisRound = false;
      rounds.push({
        index: 0,
        summary: 'Opening wave: drones strike first.',
        attackerDamage: Math.round(waveA),
        defenderDamage: Math.round(waveD),
      });
    }
  }

  for (let r = 1; r <= ROUNDS; r += 1) {
    const liveA = alive(A);
    const liveD = alive(D);
    if (liveA.length === 0 || liveD.length === 0) break;

    // Spotting is re-fought every round: lose your recon and your rear goes
    // blind for the rest of the fight.
    spotA = spottingOf(liveA, liveD);
    spotD = spottingOf(liveD, liveA);
    for (const u of [...A, ...D]) u.hitThisRound = false;

    // Every living asset shoots once, in mobility order across both sides -
    // the fast shoot first, and an asset broken before its turn never fires.
    // Ties in mobility are broken by the seeded roll, not by name: broken by
    // name, one side shot first every round of every battle between equal
    // assets and a x1.1 counter could not overcome it. The harness saw a
    // medium counter lose 100%.
    const keyed = [...liveA.map((u) => ({u, side: 'A' as const})), ...liveD.map((u) => ({u, side: 'D' as const}))].map(
      (e) => ({...e, tie: roll()}),
    );
    const order = keyed.sort((x, y) => y.u.mobility - x.u.mobility || x.tie - y.tie);

    let dmgA = 0;
    let dmgD = 0;
    const broken: string[] = [];
    for (const {u, side} of order) {
      if (u.hp <= 0) continue;
      const enemies = alive(side === 'A' ? D : A);
      if (enemies.length === 0) break;
      const target = pickTarget(enemies);
      if (!target) break;
      const dealt = shot(
        u,
        target,
        enemies,
        side === 'A' ? spotA : spotD,
        ((side === 'A' ? attackerSpec.modifier : defenderSpec.modifier) ?? 1) * (side === 'A' ? swingA : swingD),
        side === 'A' ? expD : expA,
        roll,
      );
      if (side === 'A') dmgA += dealt;
      else dmgD += dealt;
      if (target.hp <= 0) broken.push(target.asset.code);
    }

    rounds.push({
      index: r,
      summary: broken.length > 0 ? `Broken: ${broken.join(', ')}` : 'Fire traded, nothing broken.',
      attackerDamage: Math.round(dmgA),
      defenderDamage: Math.round(dmgD),
    });
  }

  const leftA = sum(alive(A).map((u) => u.hp));
  const leftD = sum(alive(D).map((u) => u.hp));
  const strengthA = startA === 0 ? 0 : leftA / startA;
  const strengthD = startD === 0 ? 0 : leftD / startD;

  const outcome: CombatResult['outcome'] =
    Math.abs(strengthA - strengthD) < DRAW_BAND
      ? 'draw'
      : strengthA > strengthD
        ? 'attacker'
        : 'defender';

  const describe = (
    units: Unit[],
    spec: SideSpec,
    power: number,
    spotting: number,
    exposure: number,
    start: number,
  ): SideResult => ({
    name: spec.name,
    power,
    composition: 0,
    spotting,
    exposure,
    losses: units.filter((u) => u.hp <= 0).length,
    strength: start === 0 ? 0 : sum(units.map((u) => Math.max(0, u.hp))) / start,
    units: units.map((u) => ({
      assetId: u.asset.id,
      name: u.asset.code,
      damaged: u.hp <= 0,
      remaining: u.maxHp === 0 ? 0 : Math.max(0, u.hp) / u.maxHp,
    })),
    modifiers: modifiersOf(spec),
  });

  const resultA = describe(A, attackerSpec, powerA, spotA, expA, startA);
  const resultD = describe(D, defenderSpec, powerD, spotD, expD, startD);

  // Composition is what the Task Force was worth beyond its raw power: how
  // the fight went against how the power difference alone says it should.
  const expected = powerA + powerD === 0 ? 0.5 : powerA / (powerA + powerD);
  const actual = strengthA + strengthD === 0 ? 0.5 : strengthA / (strengthA + strengthD);
  resultA.composition = expected === 0 ? 1 : Number((actual / expected).toFixed(3));
  resultD.composition = 1 - expected === 0 ? 1 : Number(((1 - actual) / (1 - expected)).toFixed(3));

  // Modifier lines go into the notes too, so every report reader - the
  // screen, the harness, a log - sees what took part without a second field.
  notes.push(...resultA.modifiers, ...resultD.modifiers);

  return {outcome, rounds, notes, attacker: resultA, defender: resultD};
}
