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
  attributeAtLevel,
  assetPower,
} from './assets';

/* -------------------------------------------------------------------------- */
/* Tuning                                                                     */
/* -------------------------------------------------------------------------- */

export const ROUNDS = 5;

/**
 * Survivability.
 *
 * NOT the armour attribute alone. Ten thousand simulated fights said so: with
 * hp = armour x 12 an armour-category asset was eight times tougher than a
 * drone, no counter multiplier could overcome that, and artillery lost to
 * armour 99% of the time despite being its designed counter. Durability has to
 * scale with what an asset IS - which scales with its lift - and let armour be
 * a bonus on top, not the whole of it.
 */
export const HP_PER_POINT = 0.6;
export const HP_PER_ARMOUR = 1.2;
export const HP_SCALE = 8;

/**
 * What a good matchup is worth, and what a bad one costs.
 *
 * 1.5 / 0.6 was tried first and made the web too absolute - rotary beat armour
 * 96% of the time, which is the "counters decide almost everything" design
 * that was explicitly not chosen. These leave power as the main driver.
 */
export const COUNTER_STRONG = 1.35;
export const COUNTER_WEAK = 0.75;

/**
 * What a squad pays for missing a band, per band missing.
 *
 * This is the mechanism that makes combined arms the answer rather than a
 * preference, and it had to be added: without it a mono-category squad beat a
 * mixed one, because a focused squad never suffers a bad matchup within itself
 * while a mixed one is a bet on what it will meet. Rock-paper-scissors with
 * one throw rewards guessing right, not bringing variety.
 *
 * With it, a squad holding all three bands beats every pure squad. Without a
 * close band nothing shields the rear; without an air band nothing contests
 * the sky. Both are true of real formations and both are now expensive.
 */
export const EXPOSURE_PER_MISSING_BAND = 1.5;

/**
 * Deep fire is gated on knowing where to shoot.
 *
 * A side with no reconnaissance still fires - it is shelling map squares - at
 * `SPOTTING_FLOOR`. A side that owns the detection contest approaches
 * `SPOTTING_FLOOR + SPOTTING_SWING`. This is the most important pair of
 * numbers in the file: it is what makes a drone worth a slot beside a tank,
 * and why artillery is not simply the best category.
 */
export const SPOTTING_FLOOR = 0.35;
export const SPOTTING_SWING = 1.3;

/** Bounded, small, and never the story. A loss has to be explicable. */
export const CHANCE = 0.05;

/** Mobility buys initiative, and buys your way out when it goes wrong. */
export const WITHDRAW_RELIEF = 0.35;

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
 * What beats what. Symmetric by construction: what beats you also takes less
 * from you, so a squad of six tanks meeting helicopters is not slightly
 * behind - it is the wrong squad, and the report will read that way.
 */
export const COUNTER: Record<AssetCategory, Partial<Record<AssetCategory, number>>> = {
  rotary: {armour: COUNTER_STRONG, fixed_wing: COUNTER_WEAK},
  fixed_wing: {rotary: COUNTER_STRONG, drone: COUNTER_WEAK},
  drone: {artillery: COUNTER_STRONG, fixed_wing: COUNTER_STRONG, armour: COUNTER_WEAK},
  armour: {drone: COUNTER_STRONG, artillery: COUNTER_STRONG, rotary: COUNTER_WEAK},
  artillery: {armour: COUNTER_STRONG, drone: COUNTER_WEAK, rotary: COUNTER_WEAK},
  naval: {artillery: COUNTER_STRONG, fixed_wing: COUNTER_WEAK},
};

export function counterOf(attacker: AssetCategory, defender: AssetCategory): number {
  return COUNTER[attacker]?.[defender] ?? 1;
}

/* -------------------------------------------------------------------------- */
/* Input and output                                                           */
/* -------------------------------------------------------------------------- */

export interface CombatantSpec {
  assetId: string;
  level: number;
}

export interface SideSpec {
  name: string;
  units: CombatantSpec[];
  /**
   * Home ground. The map passes the defender's Command Post and buildings; the
   * arena passes 1, because there is no base there. Supplied by the caller so
   * the resolver never reads a building and the arena cannot inherit a bonus
   * nobody is standing on.
   */
  modifier?: number;
}

interface Unit {
  asset: Asset;
  level: number;
  hp: number;
  maxHp: number;
  firepower: number;
  mobility: number;
  detection: number;
  band: Band;
  damaged: boolean;
}

export interface CombatUnitResult {
  assetId: string;
  name: string;
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
  /** Share of the detection contest, 0 to 1. */
  spotting: number;
  losses: number;
  units: CombatUnitResult[];
  /** Fraction of the starting pool still standing when it ended. */
  strength: number;
}

/* -------------------------------------------------------------------------- */
/* Determinism                                                                */
/* -------------------------------------------------------------------------- */

/** mulberry32. Small, fast, and good enough for a battle. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* -------------------------------------------------------------------------- */
/* Resolution                                                                 */
/* -------------------------------------------------------------------------- */

function build(spec: SideSpec): Unit[] {
  const out: Unit[] = [];
  for (const entry of spec.units) {
    const asset = ASSET_BY_ID[entry.assetId];
    if (!asset) continue;
    const a = asset.attributes;
    const points =
      attributeAtLevel(a.firepower, entry.level) +
      attributeAtLevel(a.armour, entry.level) +
      attributeAtLevel(a.mobility, entry.level) +
      attributeAtLevel(a.range, entry.level) +
      attributeAtLevel(a.detection, entry.level);
    const hp =
      (points * HP_PER_POINT + attributeAtLevel(a.armour, entry.level) * HP_PER_ARMOUR) *
      HP_SCALE;
    out.push({
      asset,
      level: entry.level,
      hp,
      maxHp: hp,
      firepower: attributeAtLevel(asset.attributes.firepower, entry.level),
      mobility: attributeAtLevel(asset.attributes.mobility, entry.level),
      detection: attributeAtLevel(asset.attributes.detection, entry.level),
      band: CATEGORY_BAND[asset.category],
      damaged: false,
    });
  }
  return out;
}

const alive = (units: Unit[]) => units.filter((u) => !u.damaged);
const sum = (ns: number[]) => ns.reduce((a, b) => a + b, 0);

/**
 * What a side pays for the bands it left out.
 *
 * Multiplied into the damage it RECEIVES, so a squad of six tanks with no air
 * cover and nothing at range is not merely missing options - it is easier to
 * kill, which is the honest consequence of having no answer to half the fight.
 */
export function exposureOf(units: Unit[]): number {
  const bands = new Set(units.map((u) => u.band));
  let mult = 1;
  if (!bands.has('close')) mult *= EXPOSURE_PER_MISSING_BAND;
  if (!bands.has('air')) mult *= EXPOSURE_PER_MISSING_BAND;
  return mult;
}

/**
 * Damage one band's worth of fire into the other side.
 *
 * Targets are taken best-matchup first, so a band of helicopters spends itself
 * on armour before anything else. That is what makes the counter web visible
 * in the report rather than buried in an average - "the Apaches broke the
 * Abrams" is a sentence a player can learn from.
 */
function fire(
  shooters: Unit[],
  targets: Unit[],
  spotting: number,
  modifier: number,
  /** What the RECEIVING side pays for the bands it did not bring. */
  exposure: number,
  roll: () => number,
): {dealt: number; killed: string[]} {
  let living = alive(targets);
  if (living.length === 0 || shooters.length === 0) return {dealt: 0, killed: []};

  // A front line. Close-range fire has to chew through whatever is standing in
  // front before it reaches anything behind, which is what a screen IS and why
  // artillery wants tanks in the squad rather than more artillery.
  if (shooters[0].band === 'close') {
    const front = living.filter((u) => u.band === 'close');
    if (front.length > 0) living = front;
  }

  let pool = 0;
  for (const s of shooters) {
    // Only deep fire is gated on spotting. A tank at close range does not need
    // a drone to tell it where the other tank is.
    const sight =
      s.band === 'deep' ? SPOTTING_FLOOR + SPOTTING_SWING * spotting : 1;
    const variance = 1 + (roll() * 2 - 1) * CHANCE;
    pool += s.firepower * sight * variance;
  }
  pool *= modifier * exposure;

  const order = [...living].sort((a, b) => {
    const am = Math.max(...shooters.map((s) => counterOf(s.asset.category, a.asset.category)));
    const bm = Math.max(...shooters.map((s) => counterOf(s.asset.category, b.asset.category)));
    return bm - am || a.hp - b.hp;
  });

  const killed: string[] = [];
  let dealt = 0;
  for (const target of order) {
    if (pool <= 0) break;
    const multiplier = Math.max(
      ...shooters.map((s) => counterOf(s.asset.category, target.asset.category)),
    );
    const applied = Math.min(target.hp, pool * multiplier);
    target.hp -= applied;
    dealt += applied;
    pool -= applied / multiplier;
    if (target.hp <= 0) {
      target.damaged = true;
      killed.push(target.asset.name);
    }
  }
  return {dealt, killed};
}

export function resolve(
  attackerSpec: SideSpec,
  defenderSpec: SideSpec,
  seed = 1,
): CombatResult {
  const roll = rng(seed);
  const A = build(attackerSpec);
  const D = build(defenderSpec);

  const startA = sum(A.map((u) => u.maxHp));
  const startD = sum(D.map((u) => u.maxHp));

  const powerA = sum(attackerSpec.units.map((u) => {
    const asset = ASSET_BY_ID[u.assetId];
    return asset ? assetPower(asset, u.level) : 0;
  }));
  const powerD = sum(defenderSpec.units.map((u) => {
    const asset = ASSET_BY_ID[u.assetId];
    return asset ? assetPower(asset, u.level) : 0;
  }));

  const expA = exposureOf(A);
  const expD = exposureOf(D);

  const rounds: CombatRound[] = [];
  const notes: string[] = [];
  if (expA > 1) notes.push(`${attackerSpec.name} brought no answer to every band.`);
  if (expD > 1) notes.push(`${defenderSpec.name} brought no answer to every band.`);
  let spotA = 0.5;
  let spotD = 0.5;

  for (let r = 1; r <= ROUNDS; r += 1) {
    const liveA = alive(A);
    const liveD = alive(D);
    if (liveA.length === 0 || liveD.length === 0) break;

    // The detection contest is re-fought every round, because losing your
    // reconnaissance mid-battle should blind your artillery for the rest of it.
    const detA = sum(liveA.map((u) => u.detection));
    const detD = sum(liveD.map((u) => u.detection));
    spotA = detA + detD === 0 ? 0.5 : detA / (detA + detD);
    spotD = 1 - spotA;

    let dmgA = 0;
    let dmgD = 0;
    const events: string[] = [];

    for (const band of BANDS) {
      const shootersA = alive(A).filter((u) => u.band === band);
      const shootersD = alive(D).filter((u) => u.band === band);

      // Mobility buys the first shot inside a band. In an even fight that is
      // the difference between trading and taking one for free.
      const mobA = sum(shootersA.map((u) => u.mobility));
      const mobD = sum(shootersD.map((u) => u.mobility));
      const attackerFirst = mobA >= mobD;

      const shoot = (
        shooters: Unit[],
        targets: Unit[],
        spotting: number,
        modifier: number,
        exposure: number,
        label: string,
      ) => {
        if (shooters.length === 0) return 0;
        const {dealt, killed} = fire(shooters, targets, spotting, modifier, exposure, roll);
        if (killed.length > 0) events.push(`${label} broke ${killed.join(', ')}`);
        return dealt;
      };

      const fireA = () =>
        shoot(
          alive(A).filter((u) => u.band === band),
          D,
          spotA,
          attackerSpec.modifier ?? 1,
          expD,
          attackerSpec.name,
        );
      const fireD = () =>
        shoot(
          alive(D).filter((u) => u.band === band),
          A,
          spotD,
          defenderSpec.modifier ?? 1,
          expA,
          defenderSpec.name,
        );

      if (attackerFirst) {
        dmgA += fireA();
        dmgD += fireD();
      } else {
        dmgD += fireD();
        dmgA += fireA();
      }
    }

    rounds.push({
      index: r,
      summary: events.length > 0 ? events.join('; ') : 'Fire traded, nothing broken.',
      attackerDamage: Math.round(dmgA),
      defenderDamage: Math.round(dmgD),
    });
  }

  // Withdrawal: the losing side saves what it can, and mobility decides how
  // much. Being fast is how you survive having brought the wrong squad.
  const leftA = sum(alive(A).map((u) => u.hp));
  const leftD = sum(alive(D).map((u) => u.hp));
  const strengthA = startA === 0 ? 0 : leftA / startA;
  const strengthD = startD === 0 ? 0 : leftD / startD;

  const outcome: CombatResult['outcome'] =
    Math.abs(strengthA - strengthD) < 0.05
      ? 'draw'
      : strengthA > strengthD
        ? 'attacker'
        : 'defender';

  const losing = outcome === 'attacker' ? D : outcome === 'defender' ? A : null;
  if (losing) {
    const mob = sum(losing.map((u) => u.mobility)) / Math.max(1, losing.length);
    const relief = Math.min(WITHDRAW_RELIEF, (mob / 10) * WITHDRAW_RELIEF);
    let saved = 0;
    for (const u of losing) {
      if (u.damaged && roll() < relief) {
        u.damaged = false;
        u.hp = u.maxHp * 0.15;
        saved += 1;
      }
    }
    if (saved > 0) notes.push(`${saved} withdrew before they were finished.`);
  }

  const describe = (units: Unit[], spec: SideSpec, power: number, spotting: number, start: number): SideResult => {
    const left = sum(units.map((u) => (u.damaged ? 0 : u.hp)));
    return {
      name: spec.name,
      power,
      // Measured, not declared: what this squad actually achieved against what
      // its raw power says it should have. The report shows it so a defeated
      // player can see the reason rather than infer it.
      composition: 0,
      spotting,
      losses: units.filter((u) => u.damaged).length,
      strength: start === 0 ? 0 : left / start,
      units: units.map((u) => ({
        assetId: u.asset.id,
        name: u.asset.name,
        damaged: u.damaged,
        remaining: u.maxHp === 0 ? 0 : Math.max(0, u.hp) / u.maxHp,
      })),
    };
  };

  const resultA = describe(A, attackerSpec, powerA, spotA, startA);
  const resultD = describe(D, defenderSpec, powerD, spotD, startD);

  // Composition is what the squad was worth beyond its raw power. Expressed as
  // the ratio of how the fight actually went to how the power difference alone
  // says it should have gone.
  const expected = powerA + powerD === 0 ? 0.5 : powerA / (powerA + powerD);
  const actual =
    strengthA + strengthD === 0 ? 0.5 : strengthA / (strengthA + strengthD);
  resultA.composition = expected === 0 ? 1 : Number((actual / expected).toFixed(3));
  resultD.composition =
    1 - expected === 0 ? 1 : Number(((1 - actual) / (1 - expected)).toFixed(3));

  return {outcome, rounds, notes, attacker: resultA, defender: resultD};
}
