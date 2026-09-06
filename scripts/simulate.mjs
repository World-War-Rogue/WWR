/**
 * The combat harness.
 *
 * Runs the real resolver - not a copy of it - many thousands of times and
 * prints what actually happens. Building `shared/combat.ts` as a pure function
 * with no map, no clock, no database and no network is what makes this
 * possible, and this file is the reason that property is worth protecting.
 *
 *     npm run sim
 *     npm run sim -- --seeds 2000
 *     npm run sim -- --only matrix
 *     npm run sim -- --only buildings
 *
 * Exits non-zero when a STANDING assertion fails. Three of the measurements
 * here are not one-off curiosities - they are the balance promises the design
 * makes, and a change that breaks one should fail rather than be noticed in a
 * battle six weeks later:
 *
 *   matrix   no category is universally better than another
 *   clamp    a high rank clamped to a band fights exactly like that rank
 *   attrib   two assets on the same point budget are worth the same
 *
 * The others are reported for judgement rather than asserted, because their
 * healthy range is a design decision rather than an invariant.
 *
 * ── Why this file exists at all ───────────────────────────────────────────
 *
 * The comments in `shared/combat.ts` cite "ten thousand simulated fights" in
 * five places. The script that ran them was never committed, so for months the
 * three faults recorded in docs/COMBAT.md could not be re-measured by anybody,
 * and no change could be checked against the baseline it claimed to preserve.
 * Committing the measurement is the point. A number nobody can reproduce is a
 * story.
 */
import {registerHooks} from 'node:module';
import {existsSync} from 'node:fs';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {dirname, resolve as resolvePath} from 'node:path';

/*
 * The Worker and the client both build through tooling that resolves
 * extensionless imports. Node does not, and `shared/` must not grow file
 * extensions in its own imports just to suit a script. So the script adapts,
 * rather than the source it is measuring.
 */
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith('.') && !/\.[mc]?[jt]s$/.test(specifier)) {
      const url = new URL(specifier, context.parentURL);
      if (existsSync(fileURLToPath(`${url}.ts`))) return next(`${specifier}.ts`, context);
    }
    return next(specifier, context);
  },
});

const root = resolvePath(dirname(fileURLToPath(import.meta.url)), '..');
const assets = await import(pathToFileURL(resolvePath(root, 'shared/assets.ts')).href);
const combat = await import(pathToFileURL(resolvePath(root, 'shared/combat.ts')).href);
const board = await import(pathToFileURL(resolvePath(root, 'shared/base.ts')).href);
const buildings = await import(pathToFileURL(resolvePath(root, 'shared/buildings.ts')).href);
const upgrades = await import(pathToFileURL(resolvePath(root, 'shared/upgrades.ts')).href);

const {
  ASSETS,
  ASSET_BY_ID,
  auditAssets,
  BUDGET_MIN,
  SQUAD_SLOTS,
  attributeAtLevel,
  assetPower,
} = assets;
const {resolve: fight, COUNTER, CATEGORY_BAND, COUNTER_PERFECT, COUNTER_MEDIUM} = combat;

/* -------------------------------------------------------------------------- */
/* Options                                                                    */
/* -------------------------------------------------------------------------- */

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : argv[i + 1];
};
const SEEDS = Number(flag('seeds', 2000));
const ONLY = flag('only', null);
const wanted = (name) => !ONLY || ONLY === name;

/** Season 1 plays five categories. Naval is held back until it has a sea. */
const SEASON_1 = ASSETS.filter((a) => a.draftable !== false);
const CATEGORIES = [...new Set(SEASON_1.map((a) => a.category))];
const ALL_CATEGORIES = [...new Set(ASSETS.map((a) => a.category))];

/* -------------------------------------------------------------------------- */
/* Squad construction                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Six distinct assets of one category whose total lift is as close as possible
 * to a target.
 *
 * Lift is the thing to match, not power, because power at rank 1 is a flat
 * function of lift by construction - the budget used to be `BASE_POINTS + lift *
 * POINTS_PER_LIFT` and power is six times the points spent. Matching lift is
 * therefore matching power, and doing it that way means a drift between the
 * two shows up here rather than being hidden by the normalisation.
 */
function squadOf(category, targetLift, pool = SEASON_1) {
  const options = pool.filter((a) => a.category === category);
  if (options.length < SQUAD_SLOTS) throw new Error(`${category}: not enough assets`);
  let best = null;
  const choose = (start, picked, lift) => {
    if (picked.length === SQUAD_SLOTS) {
      const gap = Math.abs(lift - targetLift);
      if (!best || gap < best.gap) best = {gap, ids: picked.map((a) => a.id), lift};
      return;
    }
    for (let i = start; i < options.length; i += 1) {
      choose(i + 1, [...picked, options[i]], lift + options[i].lift);
    }
  };
  choose(0, [], 0);
  return best;
}

/** The lift target every category can hit most closely. */
function commonLift(pool = SEASON_1) {
  const cats = [...new Set(pool.map((a) => a.category))];
  const reachable = cats.map((c) => {
    const lifts = pool.filter((a) => a.category === c).map((a) => a.lift).sort((x, y) => x - y);
    const lo = lifts.slice(0, SQUAD_SLOTS).reduce((a, b) => a + b, 0);
    const hi = lifts.slice(-SQUAD_SLOTS).reduce((a, b) => a + b, 0);
    return {lo, hi};
  });
  const lo = Math.max(...reachable.map((r) => r.lo));
  const hi = Math.min(...reachable.map((r) => r.hi));
  return Math.round((lo + hi) / 2);
}

const units = (ids, level) => ids.map((assetId) => ({assetId, level}));
const power = (ids, level) =>
  ids.reduce((s, id) => s + assetPower(ASSET_BY_ID[id], level), 0);

/* -------------------------------------------------------------------------- */
/* Running fights                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Run one pairing across many seeds, both ways round.
 *
 * Every pairing is fought twice with the sides swapped, because the resolver is
 * not symmetric - the attacker is named first, mobility ties break toward the
 * attacker, and the home-ground modifier belongs to whoever is passed as the
 * defender. Measuring only one orientation would report the attacker's edge as
 * a property of the category.
 */
function duel(aIds, bIds, {aLevel = 1, bLevel = 1, seeds = SEEDS} = {}) {
  let aWins = 0;
  let bWins = 0;
  let draws = 0;
  for (let s = 1; s <= seeds; s += 1) {
    const first = fight(
      {name: 'A', units: units(aIds, aLevel)},
      {name: 'B', units: units(bIds, bLevel)},
      s,
    );
    if (first.outcome === 'attacker') aWins += 1;
    else if (first.outcome === 'defender') bWins += 1;
    else draws += 1;

    const second = fight(
      {name: 'B', units: units(bIds, bLevel)},
      {name: 'A', units: units(aIds, aLevel)},
      s,
    );
    if (second.outcome === 'attacker') bWins += 1;
    else if (second.outcome === 'defender') aWins += 1;
    else draws += 1;
  }
  const total = seeds * 2;
  return {
    aWins,
    bWins,
    draws,
    total,
    aRate: aWins / total,
    bRate: bWins / total,
    drawRate: draws / total,
  };
}

/* -------------------------------------------------------------------------- */
/* Reporting                                                                  */
/* -------------------------------------------------------------------------- */

const pct = (n) => `${(n * 100).toFixed(1)}%`;
const pad = (s, n) => String(s).padEnd(n);
const padl = (s, n) => String(s).padStart(n);

const failures = [];
function assert(name, ok, detail) {
  if (!ok) failures.push(`${name}: ${detail}`);
  return ok ? 'PASS' : 'FAIL';
}

function heading(title) {
  console.log(`\n${'='.repeat(74)}\n${title}\n${'='.repeat(74)}`);
}

/* -------------------------------------------------------------------------- */
/* 0. Catalogue audit                                                         */
/* -------------------------------------------------------------------------- */

if (wanted('audit')) {
  heading('0. Catalogue audit');
  const problems = auditAssets();
  console.log(`${ASSETS.length} assets, ${SEASON_1.length} draftable in Season 1.`);
  if (problems.length === 0) {
    console.log('Every row sits exactly on its point budget and inside the bounds.');
  } else {
    for (const p of problems) console.log(`  ${p}`);
  }
  assert('audit', problems.length === 0, `${problems.length} rows off budget`);

  // The base board: every building on a real pad, no two on the same one,
  // the Command Center on the centre and nothing else there.
  const boardFaults = board.auditBoard();
  console.log(`${board.BOARD_BUILDINGS.length} buildings on ${board.PADS.length} pads.`);
  for (const f of boardFaults) console.log(`  ${f}`);
  assert('board', boardFaults.length === 0, `${boardFaults.length} board faults`);
}

/* -------------------------------------------------------------------------- */
/* 1. The counter web, as data                                                */
/* -------------------------------------------------------------------------- */

/**
 * Prey and predators per category, counted from the table rather than read off
 * the comment above it.
 *
 * A closed ring gives every category exactly one perfect prey, one perfect
 * predator, one medium prey and one medium predator. Anything else means the
 * ring is open, and an open ring cannot be fixed by changing the multipliers -
 * the fault is the shape of the graph.
 */
function ringShape(cats) {
  const rows = [];
  for (const c of cats) {
    const beats = Object.entries(COUNTER[c] ?? {}).filter(([t]) => cats.includes(t));
    const beatenBy = cats.filter((o) => (COUNTER[o] ?? {})[c] !== undefined && o !== c);
    rows.push({
      category: c,
      perfectPrey: beats.filter(([, v]) => v === COUNTER_PERFECT).map(([t]) => t),
      mediumPrey: beats.filter(([, v]) => v === COUNTER_MEDIUM).map(([t]) => t),
      perfectPredators: beatenBy.filter((o) => COUNTER[o][c] === COUNTER_PERFECT),
      mediumPredators: beatenBy.filter((o) => COUNTER[o][c] === COUNTER_MEDIUM),
    });
  }
  return rows;
}

if (wanted('ring')) {
  heading('1. The counter ring, counted from the table');
  for (const [label, cats] of [
    ['Season 1 (naval undraftable)', CATEGORIES],
    ['All six categories', ALL_CATEGORIES],
  ]) {
    console.log(`\n${label}`);
    console.log(
      `  ${pad('category', 12)}${pad('perfect prey', 14)}${pad('perfect pred.', 15)}${pad('med prey', 12)}${pad('med pred.', 12)}`,
    );
    const rows = ringShape(cats);
    for (const r of rows) {
      console.log(
        `  ${pad(r.category, 12)}${pad(r.perfectPrey.join(',') || '-- none --', 14)}` +
          `${pad(r.perfectPredators.join(',') || '-- none --', 15)}` +
          `${pad(r.mediumPrey.join(',') || '-- none --', 12)}` +
          `${pad(r.mediumPredators.join(',') || '-- none --', 12)}`,
      );
    }
    const open = rows.filter(
      (r) =>
        r.perfectPrey.length !== 1 ||
        r.perfectPredators.length !== 1 ||
        r.mediumPrey.length !== 1 ||
        r.mediumPredators.length !== 1,
    );
    if (open.length === 0) {
      console.log('  Ring is closed: every category has one of each.');
    } else {
      console.log(`  Ring is OPEN for: ${open.map((r) => r.category).join(', ')}`);
    }
    if (cats === CATEGORIES) {
      assert(
        'ring',
        open.length === 0,
        `open for ${open.map((r) => r.category).join(', ')} in the draftable set`,
      );
    }
  }
}

/* -------------------------------------------------------------------------- */
/* 2. Mirror match                                                            */
/* -------------------------------------------------------------------------- */

const LIFT = commonLift();

if (wanted('mirror')) {
  heading('2. Mirror match - identical squads');
  const s = squadOf(CATEGORIES[0], LIFT);
  const r = duel(s.ids, s.ids);
  console.log(`  ${CATEGORIES[0]} against itself, ${r.total} fights`);
  console.log(`  A ${pct(r.aRate)}   B ${pct(r.bRate)}   draw ${pct(r.drawRate)}`);
  const skew = Math.abs(r.aRate - r.bRate);
  console.log(`  skew ${pct(skew)} (target under 4%)`);
}

/* -------------------------------------------------------------------------- */
/* 3. The category matrix - the equal-value promise, as a number              */
/* -------------------------------------------------------------------------- */

let matrixRows = null;

if (wanted('matrix')) {
  heading('3. Category matrix - every category against every other');
  const squads = Object.fromEntries(CATEGORIES.map((c) => [c, squadOf(c, LIFT)]));
  console.log(`  Lift target ${LIFT}. Squads of ${SQUAD_SLOTS}, rank 1.`);
  console.log(
    `  ${pad('category', 12)}${padl('lift', 6)}${padl('power', 8)}   (a drift between lift and power is itself a finding)`,
  );
  for (const c of CATEGORIES) {
    console.log(`  ${pad(c, 12)}${padl(squads[c].lift, 6)}${padl(power(squads[c].ids, 1), 8)}`);
  }

  console.log(`\n  Win rate of the ROW category against the COLUMN category:`);
  console.log(`  ${pad('', 12)}${CATEGORIES.map((c) => padl(c.slice(0, 9), 11)).join('')}${padl('average', 11)}`);
  matrixRows = [];
  for (const a of CATEGORIES) {
    const cells = [];
    for (const b of CATEGORIES) {
      if (a === b) {
        cells.push(null);
        continue;
      }
      cells.push(duel(squads[a].ids, squads[b].ids, {seeds: Math.max(200, SEEDS / 4)}).aRate);
    }
    const played = cells.filter((c) => c !== null);
    const avg = played.reduce((x, y) => x + y, 0) / played.length;
    matrixRows.push({category: a, avg, cells});
    console.log(
      `  ${pad(a, 12)}${cells.map((c) => padl(c === null ? '--' : pct(c), 11)).join('')}${padl(pct(avg), 11)}`,
    );
  }

  const worst = matrixRows.reduce((w, r) =>
    Math.abs(r.avg - 0.5) > Math.abs(w.avg - 0.5) ? r : w,
  );
  console.log(
    `\n  Furthest from even: ${worst.category} at ${pct(worst.avg)} averaged across opponents.`,
  );
  console.log(
    '  DIAGNOSTIC ONLY - not asserted. A single-category squad is by definition',
  );
  console.log(
    '  missing bands, so this measures band coverage rather than what an asset is',
  );
  console.log(
    '  worth. Artillery is alone in the deep band and pays the exposure penalty',
  );
  console.log(
    '  twice over; the three air categories share a band and pay it once. The',
  );
  console.log('  promise about asset value is tested in section 3b.');
}

/* -------------------------------------------------------------------------- */
/* 3b. Presence premium - the equal-value promise, measured properly          */
/* -------------------------------------------------------------------------- */

if (wanted('premium')) {
  heading('3b. Presence premium - is any category worth more in a real squad?');
  /*
   * The promise is that no asset is worth more than another at equal
   * investment. The honest way to measure that is not to pit single-category
   * squads against each other - nobody fields those and they differ mostly in
   * which bands they left out - but to build many ordinary mixed squads at the
   * same lift and ask whether carrying a given category predicts winning.
   *
   * If every category sits near even, the catalogue keeps its promise. If one
   * category lifts a squad's win rate wherever it appears, that category is
   * simply better, which is the thing the design forbids.
   */
  const SQUADS = 60;
  let s = 20260905 >>> 0;
  const rand = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const roster = [];
  let guard = 0;
  while (roster.length < SQUADS && guard < SQUADS * 400) {
    guard += 1;
    const pick = [];
    const pool = [...SEASON_1];
    while (pick.length < SQUAD_SLOTS && pool.length > 0) {
      pick.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
    }
    const lift = pick.reduce((a, b) => a + b.lift, 0);
    if (Math.abs(lift - LIFT) > 2) continue;
    roster.push({ids: pick.map((a) => a.id), cats: pick.map((a) => a.category), lift});
  }

  const score = roster.map(() => 0);
  for (let i = 0; i < roster.length; i += 1) {
    for (let j = i + 1; j < roster.length; j += 1) {
      const r = duel(roster[i].ids, roster[j].ids, {seeds: 3});
      score[i] += r.aRate + r.drawRate / 2;
      score[j] += r.bRate + r.drawRate / 2;
    }
  }
  const played = roster.length - 1;
  const rate = score.map((v) => v / played);
  const overall = rate.reduce((a, b) => a + b, 0) / rate.length;

  console.log(`  ${roster.length} random mixed squads at lift ${LIFT}+/-2, full round robin.`);
  console.log(`  ${pad('category', 12)}${padl('squads', 9)}${padl('win rate', 11)}${padl('premium', 11)}`);
  const premiums = [];
  for (const c of CATEGORIES) {
    const withIt = rate.filter((_, i) => roster[i].cats.includes(c));
    if (withIt.length === 0) continue;
    const mean = withIt.reduce((a, b) => a + b, 0) / withIt.length;
    const premium = mean - overall;
    premiums.push({category: c, premium, mean, n: withIt.length});
    console.log(
      `  ${pad(c, 12)}${padl(withIt.length, 9)}${padl(pct(mean), 11)}${padl(`${premium >= 0 ? '+' : ''}${(premium * 100).toFixed(1)}pp`, 11)}`,
    );
  }
  const LIMIT = 0.1;
  const outside = premiums.filter((p) => Math.abs(p.premium) > LIMIT);
  console.log(`\n  Overall win rate ${pct(overall)}. Premium is how much carrying that`);
  console.log(`  category moves a squad's win rate. Target: within ${LIMIT * 100} points of zero.`);
  assert(
    'premium',
    outside.length === 0,
    outside.map((p) => `${p.category} ${(p.premium * 100).toFixed(1)}pp`).join(', '),
  );
  console.log(
    outside.length === 0
      ? '  PASS - no category is universally better than another.'
      : `  FAIL - ${outside.map((p) => `${p.category} ${(p.premium * 100).toFixed(1)}pp`).join(', ')}`,
  );
}

/* -------------------------------------------------------------------------- */
/* 4. Counters, isolated                                                      */
/* -------------------------------------------------------------------------- */

if (wanted('counters')) {
  heading('4. What a counter is worth, isolated');
  /*
   * Measured with synthetic assets that are identical in every way except
   * their category, and all in the SAME band.
   *
   * Doing this with real single-category squads does not work and the earlier
   * attempt to do so was measuring the wrong thing entirely: two squads from
   * different categories also sit in different bands, carry different exposure
   * penalties and different attribute shapes, and those swamp a multiplier
   * whose whole spread is twenty per cent. Artillery "losing" to fixed wing at
   * 0% while perfectly countering it was band coverage talking, not the
   * counter.
   *
   * Three air-band categories give one perfect and two medium matchups with
   * everything else held equal, which is the only way to see what the
   * multiplier alone is worth.
   */
  const LIFT_EACH = 5;
  const even = Math.floor(BUDGET_MIN / 5);
  const rest = BUDGET_MIN - even * 5;
  const attrs = {
    firepower: even + rest,
    armour: even,
    mobility: even,
    range: even,
    detection: even,
  };
  const air = ['rotary', 'fixed_wing', 'drone'];
  for (const c of air) {
    ASSET_BY_ID[`sim_${c}`] = {
      id: `sim_${c}`,
      code: c,
      name: c,
      category: c,
      role: 'screen',
      operator: 'harness',
      lift: LIFT_EACH,
      attributes: {...attrs},
      blurb: 'synthetic',
    };
  }
  console.log(`  Identical assets ${JSON.stringify(attrs)}, all in the air band.`);
  console.log(`  Only the category differs, so only the counter multiplier can.\n`);
  console.log(`  ${pad('matchup', 30)}${pad('tier', 10)}${padl('wins', 10)}${padl('draws', 10)}${padl('losses', 10)}`);
  const seen = {perfect: [], medium: []};
  const losses = [];
  for (const a of air) {
    for (const b of air) {
      const m = (COUNTER[a] ?? {})[b];
      if (!m || a === b) continue;
      const tier = m === COUNTER_PERFECT ? 'perfect' : 'medium';
      const r = duel(
        Array(SQUAD_SLOTS).fill(`sim_${a}`),
        Array(SQUAD_SLOTS).fill(`sim_${b}`),
        {seeds: Math.max(200, SEEDS / 4)},
      );
      seen[tier].push(r.aRate);
      losses.push({matchup: `${a} vs ${b}`, rate: r.bRate});
      console.log(
        `  ${pad(`${a} vs ${b}`, 30)}${pad(tier, 10)}${padl(pct(r.aRate), 10)}${padl(pct(r.drawRate), 10)}${padl(pct(r.bRate), 10)}`,
      );
    }
  }
  for (const tier of ['perfect', 'medium']) {
    if (seen[tier].length === 0) continue;
    const avg = seen[tier].reduce((x, y) => x + y, 0) / seen[tier].length;
    console.log(`  ${pad(`${tier} average`, 40)}${padl(pct(avg), 10)}`);
  }
  /*
   * The resolver has a per-battle swing now (BATTLE_SWING), so a counter is
   * an edge, not a verdict: the assertion is that holding one wins the
   * matchup clearly more often than not. This is the ceiling case - six units
   * all countering six units, everything else identical - so it should sit
   * well above the spec's mixed-squad bands (54-62 perfect, 51-57 medium).
   * What a counter is worth in an ordinary mixed squad is section 3b.
   */
  const weak = losses.filter((l) => l.rate > 0.4);
  assert(
    'counters',
    weak.length === 0,
    weak.map((l) => `${l.matchup} loses ${pct(l.rate)}`).join(', '),
  );
  console.log(
    weak.length === 0
      ? '\n  PASS - holding a counter wins the matchup clearly (each loses under 40%).'
      : `\n  FAIL - ${weak.map((l) => `${l.matchup} loses ${pct(l.rate)}`).join(', ')}`,
  );
  for (const c of air) delete ASSET_BY_ID[`sim_${c}`];
}

/* -------------------------------------------------------------------------- */
/* 5. Mixed against mono - the central claim                                  */
/* -------------------------------------------------------------------------- */

if (wanted('mixed')) {
  heading('5. Mixed squad against single-category squads');
  /*
   * The design's central claim is that combined arms beats specialisation. It
   * was once measured at exactly the opposite, which is why the exposure
   * penalty exists at all.
   *
   * The mixed squad is built to the SAME lift as the squads it fights, holding
   * all three bands. Lift is what buys power, so a mixed squad assembled from
   * the cheapest asset in each category would be fighting uphill by a quarter
   * of its power and would lose for a reason that has nothing to do with
   * composition.
   */
  let seed = 90520260 >>> 0;
  const rand = () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  let mixed = null;
  for (let attempt = 0; attempt < 40000 && !mixed; attempt += 1) {
    const pool = [...SEASON_1];
    const pick = [];
    while (pick.length < SQUAD_SLOTS && pool.length > 0) {
      pick.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
    }
    const lift = pick.reduce((a, b) => a + b.lift, 0);
    const bands = new Set(pick.map((a) => CATEGORY_BAND[a.category]));
    if (lift === LIFT && bands.size === 3) mixed = pick.map((a) => a.id);
  }
  if (!mixed) {
    console.log('  Could not build a three-band squad at the target lift.');
  } else {
    console.log(`  Mixed squad: lift ${LIFT}, power ${power(mixed, 1)}, all three bands`);
    console.log(`  ${mixed.map((id) => ASSET_BY_ID[id].category).join(', ')}\n`);
    let wins = 0;
    let n = 0;
    for (const c of CATEGORIES) {
      const mono = squadOf(c, LIFT);
      const r = duel(mixed, mono.ids, {seeds: Math.max(200, SEEDS / 4)});
      console.log(
        `    vs ${pad(c, 12)} lift ${padl(mono.lift, 3)} power ${padl(power(mono.ids, 1), 6)}   mixed wins ${padl(pct(r.aRate), 8)}`,
      );
      wins += r.aRate;
      n += 1;
    }
    console.log(`\n  Mixed wins ${pct(wins / n)} on average (target 60-70%).`);
  }
}

/* -------------------------------------------------------------------------- */
/* 6. Rank gap                                                                */
/* -------------------------------------------------------------------------- */

if (wanted('ranks')) {
  heading('6. Rank gap - how often the weaker squad wins');
  const s = squadOf(CATEGORIES[0], LIFT);
  console.log(`  ${pad('gap', 8)}${pad('low rank', 12)}${pad('high rank', 12)}${padl('power gap', 12)}${padl('upsets', 10)}`);
  for (const [low, high] of [[1, 1], [1, 2], [1, 3], [1, 4], [1, 6], [5, 10], [1, 10]]) {
    const r = duel(s.ids, s.ids, {aLevel: low, bLevel: high, seeds: Math.max(200, SEEDS / 4)});
    const pLow = power(s.ids, low);
    const pHigh = power(s.ids, high);
    const gap = (pHigh - pLow) / pLow;
    console.log(
      `  ${pad(high - low, 8)}${pad(low, 12)}${pad(high, 12)}${padl(pct(gap), 12)}${padl(pct(r.aRate), 10)}`,
    );
  }
}

/* -------------------------------------------------------------------------- */
/* 7. The Readiness Band clamp                                                */
/* -------------------------------------------------------------------------- */

if (wanted('clamp')) {
  heading('7. Readiness Band - a clamped high rank fights as that rank');
  /*
   * The cheapest and most load-bearing assertion in the system. If a rank 30
   * asset clamped to band 10 does not produce a byte-identical battle to a
   * real rank 10 asset, the entire Readiness Band mechanic is decorative and
   * every projection built on it is void.
   *
   * The clamp itself belongs to the caller assembling the battle input, not to
   * the resolver - which is the property being protected here. The resolver
   * must not know that bands exist.
   */
  const effectiveLevel = (real, band) => Math.min(real, band);
  const s = squadOf(CATEGORIES[0], LIFT);
  const BAND = 10;
  let identical = true;
  let firstDiff = null;
  for (let seed = 1; seed <= Math.max(200, SEEDS / 4); seed += 1) {
    const clamped = fight(
      {name: 'A', units: units(s.ids, effectiveLevel(30, BAND))},
      {name: 'B', units: units(s.ids, effectiveLevel(50, BAND))},
      seed,
    );
    const real = fight(
      {name: 'A', units: units(s.ids, BAND)},
      {name: 'B', units: units(s.ids, BAND)},
      seed,
    );
    if (JSON.stringify(clamped) !== JSON.stringify(real)) {
      identical = false;
      firstDiff = seed;
      break;
    }
  }
  console.log(`  Rank 30 and rank 50, both clamped to band ${BAND}, against a real rank ${BAND}.`);
  console.log(
    identical
      ? '  Byte-identical across every seed.'
      : `  DIFFERENT at seed ${firstDiff}.`,
  );
  assert('clamp', identical, `results differed at seed ${firstDiff}`);
}

/* -------------------------------------------------------------------------- */
/* 8. Attribute value - is a point of armour worth a point of range?          */
/* -------------------------------------------------------------------------- */

if (wanted('attrib')) {
  heading('8. Attribute value - equal budget, different shape');
  /*
   * `auditAssets` enforces that every asset spends exactly its point budget,
   * treating all five attributes as equally priced. The resolver does not agree
   * with that: armour is counted twice - once in the points sum that sets HP,
   * then again through HP_PER_ARMOUR - while range is counted once and then
   * never read. Every other attribute does exactly one job.
   *
   * So this probes the audit's central assumption directly, with two synthetic
   * assets that differ only in swapping points between armour and range. They
   * are injected into the catalogue for the duration of the run and share a
   * category, so no counter multiplier can muddy the result.
   */
  const LIFT_EACH = 5;
  const budget = BUDGET_MIN;
  const mk = (id, attrs) => ({
    id,
    code: id,
    name: id,
    category: 'armour',
    role: 'breach',
    operator: 'harness',
    lift: LIFT_EACH,
    attributes: attrs,
    blurb: 'synthetic',
  });
  const spread = budget - 10 - 1 - 3 * 1;
  const heavyArmour = mk('sim_armour', {
    firepower: 1 + Math.floor(spread / 3),
    armour: 10,
    mobility: 1 + Math.floor(spread / 3),
    range: 1,
    detection: 1 + (spread - 2 * Math.floor(spread / 3)),
  });
  const heavyRange = mk('sim_range', {
    firepower: heavyArmour.attributes.firepower,
    armour: 1,
    mobility: heavyArmour.attributes.mobility,
    range: 10,
    detection: heavyArmour.attributes.detection,
  });
  ASSET_BY_ID.sim_armour = heavyArmour;
  ASSET_BY_ID.sim_range = heavyRange;

  const spentA = Object.values(heavyArmour.attributes).reduce((a, b) => a + b, 0);
  const spentR = Object.values(heavyRange.attributes).reduce((a, b) => a + b, 0);
  console.log(`  budget ${budget}; armour-heavy spends ${spentA}, range-heavy spends ${spentR}`);
  console.log(`  armour-heavy ${JSON.stringify(heavyArmour.attributes)}`);
  console.log(`  range-heavy  ${JSON.stringify(heavyRange.attributes)}`);
  console.log(`  power: armour-heavy ${assetPower(heavyArmour, 1)}, range-heavy ${assetPower(heavyRange, 1)}`);

  /*
   * Both squads are three synthetic close-band assets plus the same three real
   * rear assets, so lift, power, bands and everything else match exactly and
   * the only difference is which attribute the close slots bought.
   *
   * The rear matters. Testing two all-close-band squads against each other
   * proves nothing: with no rear there is nothing for range to reach past, so
   * range cannot matter by construction and the probe would report a fault it
   * had manufactured itself.
   */
  const rear = [];
  for (const c of CATEGORIES) {
    if (CATEGORY_BAND[c] === 'close') continue;
    const cheapest = SEASON_1.filter((x) => x.category === c).sort((x, y) => x.lift - y.lift)[0];
    if (cheapest) rear.push(cheapest.id);
    if (rear.length === 3) break;
  }
  const armourSquad = ['sim_armour', 'sim_armour', 'sim_armour', ...rear];
  const rangeSquad = ['sim_range', 'sim_range', 'sim_range', ...rear];

  console.log(`  rear on both sides: ${rear.map((id) => ASSET_BY_ID[id].category).join(', ')}`);
  console.log(`  power: armour squad ${power(armourSquad, 1)}, range squad ${power(rangeSquad, 1)}`);
  const r = duel(armourSquad, rangeSquad, {seeds: Math.max(200, SEEDS / 4)});
  console.log(
    `  armour-heavy wins ${pct(r.aRate)}, range-heavy ${pct(r.bRate)}, draws ${pct(r.drawRate)}`,
  );
  const valueGap = Math.abs(r.aRate - r.bRate);
  console.log(`  spread ${(valueGap * 100).toFixed(1)} points (target under 15)`);
  const ok = valueGap <= 0.15;
  console.log(
    ok
      ? '  PASS - equal budget buys equal value.'
      : '  FAIL - the point budget prices these two attributes the same and the resolver does not.',
  );
  assert('attrib', ok, `armour-heavy and range-heavy differ by ${(valueGap * 100).toFixed(1)} points at equal budget`);

  delete ASSET_BY_ID.sim_armour;
  delete ASSET_BY_ID.sim_range;
}

/* -------------------------------------------------------------------------- */
/* 9. The rank curve                                                          */
/* -------------------------------------------------------------------------- */

if (wanted('curve')) {
  heading('9. The rank curve - what a season of progression is worth');
  console.log(`  ${pad('rank', 8)}${padl('multiplier', 14)}${padl('step', 10)}`);
  let prev = null;
  for (const rank of [1, 2, 3, 5, 10, 20, 30, 40, 50]) {
    const mult = attributeAtLevel(1000, rank) / 1000;
    const step = prev === null ? null : mult / prev - 1;
    console.log(
      `  ${pad(rank, 8)}${padl(`${mult.toFixed(3)}x`, 14)}${padl(step === null ? '--' : pct(step), 10)}`,
    );
    prev = mult;
  }
  const s1 = attributeAtLevel(1000, 10) / attributeAtLevel(1000, 1);
  const firstStep = attributeAtLevel(1000, 2) / attributeAtLevel(1000, 1) - 1;
  console.log(`\n  Season 1 (ranks 1-10) spans ${s1.toFixed(2)}x.`);
  console.log(`  The first upgrade a player ever buys is worth ${pct(firstStep)}.`);
}

/* -------------------------------------------------------------------------- */
/* 10. Asset building upgrades - the guardrails in the design doc             */
/* -------------------------------------------------------------------------- */

/**
 * docs/ASSET-BUILDING-UPGRADES-v1.md §7. A building is worth a lot, and it
 * must never be worth ten Service Ranks: a level-10 base with rank-20 assets
 * loses to a level-0 base with rank-30 ones, at every band.
 */
if (wanted('buildings')) {
  heading('10. Asset building upgrades');
  const {buildingBoost, buildingStep, LEVELLED_BUILDINGS} = buildings;
  const {attributesWith, NO_PACKAGES} = upgrades;
  const tank = ASSET_BY_ID.m1a2;

  // 1. Level 10 is exactly x1.218994 on every attribute, packages aside.
  const bare = attributesWith(tank, 20, NO_PACKAGES, 1);
  const lifted = attributesWith(tank, 20, NO_PACKAGES, buildingBoost(10));
  const ratios = ['firepower', 'armour', 'mobility', 'range', 'detection'].map((k) => lifted[k] / bare[k]);
  const ratioOk = ratios.every((r) => Math.abs(r - 1.218994) < 0.002);
  console.log(`  level 10 boost: ${buildingBoost(10).toFixed(6)}x  (per-attribute ${ratios.map((r) => r.toFixed(3)).join(' ')})`);
  assert('buildings.curve', ratioOk, `attributes off the 1.218994 multiplier: ${ratios.join(',')}`);

  // 2/3. Ten ranks beat ten building levels, at both bands the doc names.
  for (const [low, high] of [[20, 30], [40, 50]]) {
    const ids = SEASON_1.slice(0, 6).map((a) => a.id);
    let lowWins = 0;
    let highWins = 0;
    for (let seed = 1; seed <= Math.min(SEEDS, 600); seed += 1) {
      const a = {name: 'building', units: ids.map((assetId) => ({assetId, level: low, boost: buildingBoost(10)}))};
      const b = {name: 'rank', units: ids.map((assetId) => ({assetId, level: high}))};
      const r1 = fight(a, b, seed);
      const r2 = fight(b, a, seed);
      if (r1.outcome === 'attacker') lowWins += 1; else if (r1.outcome === 'defender') highWins += 1;
      if (r2.outcome === 'attacker') highWins += 1; else if (r2.outcome === 'defender') lowWins += 1;
    }
    const total = lowWins + highWins;
    console.log(`  rank ${low} + building 10  vs  rank ${high} + building 0: ranks win ${pct(highWins / total)}`);
    assert(`buildings.rank${high}`, highWins > lowWins, `building beat ten ranks (${lowWins} v ${highWins})`);
  }

  // 5. Every table row is a positive, rising price and time.
  let monotone = true;
  for (const b of LEVELLED_BUILDINGS) {
    let prev = {cost: 0, ms: 0};
    for (let l = 1; l <= 10; l += 1) {
      const step = buildingStep(b, l);
      if (step.cost <= prev.cost || step.ms <= prev.ms) monotone = false;
      prev = step;
    }
  }
  const cc10 = buildingStep('command_center', 10);
  console.log(`  Command Center 10: ${cc10.cost} in ${(cc10.ms / 3600000).toFixed(0)}h; tank building 10: ${buildingStep('armour_hub', 10).cost}`);
  assert('buildings.table', monotone, 'a level costs less or takes less time than the one before it');
}

/* -------------------------------------------------------------------------- */

heading('Standing assertions');
if (failures.length === 0) {
  console.log('  All standing assertions pass.');
} else {
  for (const f of failures) console.log(`  FAIL  ${f}`);
}
console.log('');
process.exit(failures.length === 0 ? 0 : 1);
