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
import {type Packages, NO_PACKAGES, assetPowerWith, attributesWith} from './upgrades';

/* -------------------------------------------------------------------------- */
/* Tuning                                                                     */
/* -------------------------------------------------------------------------- */

export const ROUNDS = 5;

/**
 * Survivability.
 *
 * NOT the armour attribute alone. Simulation said so twice, in opposite
 * directions.
 *
 * First: with `hp = armour * 12` an armour asset was eight times tougher than a
 * drone, no counter could overcome it, and artillery lost to armour 99% of the
 * time despite being its designed counter. So durability was made to scale with
 * what an asset IS - which scales with its lift - and armour became a bonus on
 * top rather than the whole of it.
 *
 * Then the bonus turned out to still be far too large. `auditAssets` charges the
 * same point for every attribute, so two assets on one budget are meant to be
 * worth the same - and at HP_PER_ARMOUR 1.2 an armour-heavy asset beat an
 * equal-cost, equal-power range-heavy one 100% of the time, because armour was
 * counted twice: once in the points sum that sets hit points, then again here.
 *
 * 0.1 is where the two price equally, measured. Armour is still the durability
 * attribute - it is worth about 1.2 of a normal attribute for hit points, and
 * it alone builds the screen in `reachOf` - but it is a bonus now rather than
 * most of the pool. `npm run sim` asserts this and will fail if it drifts.
 */
export const HP_PER_POINT = 0.6;
export const HP_PER_ARMOUR = 0.1;
export const HP_SCALE = 8;

/**
 * What a matchup is worth.
 *
 * A bonus to the attacker, never a penalty to the defender - so a matchup can
 * only ever be an edge, and power stays the thing that decides most fights.
 * The whole spread between the best and worst matchup is twenty per cent.
 *
 * Earlier attempts ran 1.5 against 0.6, an eighty per cent spread, and made
 * rotary beat armour 96% of the time. That is the counters-decide-everything
 * design that was explicitly not chosen.
 */
export const COUNTER_PERFECT = 1.2;
export const COUNTER_MEDIUM = 1.1;

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
 * close band nothing shields the rear; without an air band nothing contests the
 * sky; without a deep band nothing reaches. All three are true of real
 * formations and all three are now expensive.
 *
 * The penalty used to apply to close and air only, and never to deep. That had
 * two consequences nobody intended. Artillery is the only draftable category in
 * the deep band, so an artillery squad paid the penalty twice while nothing
 * ever paid for leaving artillery out - measured, carrying armour was worth
 * +11 points of win rate and artillery -3, against a promise that no asset is
 * worth more than another. Covering all three bands closed that to +5 and +6.
 *
 * 1.2 rather than 1.5 because three penalties compound where two used to.
 */
export const EXPOSURE_PER_MISSING_BAND = 1.2;

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

/**
 * Bounded, small, and never the story. A loss has to be explicable.
 *
 * Rolled once per volley rather than once per shooter. Six independent rolls
 * average out to almost nothing - the measured spread across a whole squad was
 * under two per cent, and no fight ever changed hands because of it.
 *
 * Worth knowing before this is tuned: raising it does NOT buy meaningful
 * uncertainty. At 0.35 a mirror match still drew 88% of the time, because the
 * roll happens fifteen times a battle (three bands, five rounds) and averages
 * out again. Combat here is close to deterministic by construction, and making
 * it less so is a design change rather than a constant.
 */
export const CHANCE = 0.05;

/** Mobility buys initiative, and buys your way out when it goes wrong. */
export const WITHDRAW_RELIEF = 0.35;

/**
 * How close two squads have to finish for it to be called a draw.
 *
 * This was an unnamed 0.05 sitting inline in `resolve`, and it turned out to be
 * one of the most consequential numbers in the file. A medium counter is worth
 * a ten per cent damage edge, which comes out as roughly a four per cent
 * difference in surviving strength - INSIDE a five per cent draw band. So every
 * medium counter in the game resolved as a draw and the entire tier was
 * decorative: measured, a medium counter converted to a win 7% of the time and
 * drew the other 93%.
 *
 * At two per cent the tier does what it is for - a medium counter is a real but
 * modest edge, and a genuinely even fight is still a draw.
 */
export const DRAW_BAND = 0.02;

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
  /**
   * Fitted packages, when the caller knows them.
   *
   * Optional, and it defaults to NO_PACKAGES, so every existing caller - the
   * arena, the simulation harness, any test that builds a squad by hand - keeps
   * working and keeps producing the numbers it produced before. What it stops
   * is packages being a display-only number: an upgrade that never reaches the
   * resolver is an upgrade a player pays for and does not receive.
   */
  packages?: Packages;
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
  /** How far past a screen it can reach. See `reachOf`. */
  range: number;
  armour: number;
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
    // One computation of what this unit actually is, packages included, rather
    // than eight separate calls that could drift apart.
    const a = attributesWith(asset, entry.level, entry.packages ?? NO_PACKAGES);
    const points = a.firepower + a.armour + a.mobility + a.range + a.detection;
    const hp = (points * HP_PER_POINT + a.armour * HP_PER_ARMOUR) * HP_SCALE;
    out.push({
      asset,
      level: entry.level,
      hp,
      maxHp: hp,
      firepower: a.firepower,
      mobility: a.mobility,
      detection: a.detection,
      range: a.range,
      armour: a.armour,
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
 * kill, which is the honest consequence of having no answer to most of the
 * fight. Every band counts, including deep: see EXPOSURE_PER_MISSING_BAND for
 * what leaving one out of the count did.
 */
export function exposureOf(units: Unit[]): number {
  const bands = new Set(units.map((u) => u.band));
  let mult = 1;
  for (const band of BANDS) {
    if (!bands.has(band)) mult *= EXPOSURE_PER_MISSING_BAND;
  }
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
/**
 * What fraction of a band's fire gets past the enemy's close-range screen.
 *
 * A contest between how far the shooters reach and how hard the screen is to
 * shoot through, in the same shape as the spotting contest: always between 0
 * and 1, and scale-free, so it means the same thing at rank 1 and rank 50.
 *
 * ── Why range needed this ─────────────────────────────────────────────────
 *
 * `range` is documented in `shared/assets.ts` as "which band it fights in", but
 * the band comes from CATEGORY_BAND and always did, so range was read exactly
 * once - into the points sum that sets hit points - and never again. Every
 * other attribute does a second job: firepower deals damage, armour adds hit
 * points on top of its points, mobility buys initiative and withdrawal,
 * detection wins the spotting contest. Range did nothing.
 *
 * That broke the promise the whole catalogue rests on. `auditAssets` prices all
 * five attributes identically, so two assets on the same point budget are meant
 * to be worth the same - and measured, an armour-heavy asset beat an equal-cost
 * range-heavy one 100% of the time with both showing identical power.
 *
 * So range now buys reach past a screen, and armour buys the screen's strength.
 * Both are real, both scale, and they are in direct tension: a wall of armour
 * is what long range is for, and long range is what a wall of armour fears.
 */
export function reachOf(shooters: Unit[], screen: Unit[]): number {
  if (screen.length === 0) return 1;
  const reach = sum(shooters.map((u) => u.range));
  const wall = sum(screen.map((u) => u.armour));
  if (reach + wall === 0) return 1;
  return reach / (reach + wall);
}

function fire(
  shooters: Unit[],
  targets: Unit[],
  spotting: number,
  modifier: number,
  /** What the RECEIVING side pays for the bands it did not bring. */
  exposure: number,
  roll: () => number,
): {dealt: number; killed: string[]} {
  const living = alive(targets);
  if (living.length === 0 || shooters.length === 0) return {dealt: 0, killed: []};

  let pool = 0;
  for (const s of shooters) {
    // Only deep fire is gated on spotting. A tank at close range does not need
    // a drone to tell it where the other tank is.
    const sight =
      s.band === 'deep' ? SPOTTING_FLOOR + SPOTTING_SWING * spotting : 1;
    pool += s.firepower * sight;
  }
  // One roll for the volley, not one per shooter. Six independent rolls average
  // out to nothing - measured, the spread across a whole squad was under two
  // per cent and no fight ever changed hands because of it, which made every
  // matchup a lookup table returning 0% or 100%. A battle has to be able to
  // surprise the person who launched it.
  pool *= modifier * exposure * (1 + (roll() * 2 - 1) * CHANCE);

  // The screen. Whatever is standing at close range shields what is behind it,
  // and only the fraction of fire that out-reaches the screen gets past.
  const screen = living.filter((u) => u.band === 'close');
  const behind = living.filter((u) => u.band !== 'close');
  const past = screen.length > 0 && behind.length > 0 ? reachOf(shooters, screen) : 1;

  const spend = (candidates: Unit[], amount: number): {dealt: number; killed: string[]} => {
    const killed: string[] = [];
    let dealt = 0;
    let left = amount;
    const order = [...candidates].sort((a, b) => {
      const am = Math.max(...shooters.map((s) => counterOf(s.asset.category, a.asset.category)));
      const bm = Math.max(...shooters.map((s) => counterOf(s.asset.category, b.asset.category)));
      return bm - am || a.hp - b.hp;
    });
    for (const target of order) {
      if (left <= 0) break;
      if (target.damaged) continue;
      const multiplier = Math.max(
        ...shooters.map((s) => counterOf(s.asset.category, target.asset.category)),
      );
      const applied = Math.min(target.hp, left * multiplier);
      target.hp -= applied;
      dealt += applied;
      left -= applied / multiplier;
      if (target.hp <= 0) {
        target.damaged = true;
        killed.push(target.asset.name);
      }
    }
    return {dealt, killed};
  };

  // Fire that out-reaches the screen may pick its target anywhere. The rest is
  // held at the front, and falls through to the whole squad once the screen is
  // gone, so nothing is wasted shooting at something that is no longer there.
  const far = spend(living, pool * past);
  const near = spend(alive(screen).length > 0 ? screen : living, pool * (1 - past));

  return {
    dealt: far.dealt + near.dealt,
    killed: [...far.killed, ...near.killed],
  };
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

  const powerOf = (spec: SideSpec) =>
    sum(
      spec.units.map((u) => {
        const asset = ASSET_BY_ID[u.assetId];
        return asset ? assetPowerWith(asset, u.level, u.packages ?? NO_PACKAGES) : 0;
      }),
    );
  const powerA = powerOf(attackerSpec);
  const powerD = powerOf(defenderSpec);

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
    Math.abs(strengthA - strengthD) < DRAW_BAND
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
