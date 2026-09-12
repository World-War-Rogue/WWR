/**
 * What the terrain generator actually puts on the map.
 *
 *     npm run terrain
 *     npm run terrain -- --seed 41230
 *
 * A density budget nobody can reproduce is a promise. This is the constraint:
 * it samples the world, reports what grows where, and FAILS if blocking props
 * take more of the map than agreed.
 *
 * The number that matters is the local one. An average across a world with a
 * huge empty salt pan in it would look reassuring while the ring where everyone
 * actually lives was solid rock, so the assertion is on the worst twenty-by-
 * twenty window found anywhere, not on the mean.
 *
 * Same reasoning as scripts/simulate.mjs, and the same node incantation if the
 * sandbox VM crashes under it: node --no-opt --no-turbofan.
 */
import {registerHooks} from 'node:module';
import {existsSync} from 'node:fs';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {dirname, resolve as resolvePath} from 'node:path';

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
const terrain = await import(pathToFileURL(resolvePath(root, 'shared/terrain.ts')).href);
const props = await import(pathToFileURL(resolvePath(root, 'shared/terrainProps.ts')).href);

const {legacyTerrainSeed, TERRAIN_VERSION, groundAt} = terrain;
const {PROPS, PLACEABLE, blocks, blockedAt, propsInPlot, BLOCK_CELL} = props;

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : Number(argv[i + 1]);
};

const EXTENT = 200;
const SEED = flag('seed', legacyTerrainSeed(1001, 1));
const VERSION = TERRAIN_VERSION;

/** No more than this share of plots blocked in any local window. */
const BUDGET = 0.02;
const WINDOW = 20;

const pct = (n) => `${(n * 100).toFixed(2)}%`;
const pad = (s, n) => String(s).padEnd(n);
const padl = (s, n) => String(s).padStart(n);

console.log(`\n${'='.repeat(72)}`);
console.log(`Terrain audit — seed ${SEED}, version ${VERSION}, extent ${EXTENT}`);
console.log('='.repeat(72));

console.log(`\n  ${PROPS.length} props in the catalogue, ${PLACEABLE.length} with art.`);
const missing = PROPS.filter((p) => !PLACEABLE.includes(p));
if (missing.length > 0) {
  console.log(`  Waiting on art: ${missing.map((p) => p.id).join(', ')}`);
}

/* ------------------------------------------------------------------ regions */

// Sampled by ring, because the rings are where the season happens and the map
// average would hide all of it.
const REGIONS = [
  {name: 'Core', from: 0, to: 12},
  {name: 'Dominion Front', from: 12, to: 26},
  {name: 'Factory Ring', from: 26, to: 44},
  {name: 'Outer Scraplands', from: 44, to: 90},
  {name: 'Deep field', from: 90, to: 200},
];

console.log(`\n  ${pad('region', 20)}${padl('plots', 9)}${padl('blocked', 10)}${padl('props/plot', 13)}`);

const counts = new Map();
let totalPlots = 0;
let totalBlocked = 0;

for (const region of REGIONS) {
  let plots = 0;
  let blocked = 0;
  let placed = 0;
  const step = region.to - region.from > 40 ? 3 : 1;
  for (let y = -region.to; y <= region.to; y += step) {
    for (let x = -region.to; x <= region.to; x += step) {
      const r = Math.sqrt(x * x + y * y);
      if (r < region.from || r >= region.to) continue;
      if (Math.abs(x) > EXTENT || Math.abs(y) > EXTENT) continue;
      plots += 1;
      if (blockedAt(SEED, VERSION, EXTENT, x, y)) blocked += 1;
      for (const p of propsInPlot(SEED, VERSION, EXTENT, x, y)) {
        placed += 1;
        counts.set(p.prop.id, (counts.get(p.prop.id) ?? 0) + 1);
      }
    }
  }
  totalPlots += plots;
  totalBlocked += blocked;
  console.log(
    `  ${pad(region.name, 20)}${padl(plots.toLocaleString(), 9)}` +
      `${padl(pct(blocked / Math.max(1, plots)), 10)}${padl((placed / Math.max(1, plots)).toFixed(2), 13)}`,
  );
}

/* --------------------------------------------------------------- salt flats */

let saltPlots = 0;
let saltProps = 0;
for (let y = -30; y <= 30; y += 1) {
  for (let x = -30; x <= 30; x += 1) {
    const g = groundAt(SEED, EXTENT, x + 0.5, y + 0.5);
    if (g.salt <= 0.5) continue;
    saltPlots += 1;
    saltProps += propsInPlot(SEED, VERSION, EXTENT, x, y).length;
  }
}
console.log(`\n  Salt pan: ${saltPlots} plots sampled, ${saltProps} props on them.`);
console.log('  The pan is meant to be bare but for the stranded freighter.');

/* --------------------------------------------------------------- the budget */

let worst = 0;
let worstAt = null;
for (let cy = -80; cy <= 80; cy += WINDOW) {
  for (let cx = -80; cx <= 80; cx += WINDOW) {
    let blocked = 0;
    for (let y = cy; y < cy + WINDOW; y += 1) {
      for (let x = cx; x < cx + WINDOW; x += 1) {
        if (blockedAt(SEED, VERSION, EXTENT, x, y)) blocked += 1;
      }
    }
    const share = blocked / (WINDOW * WINDOW);
    if (share > worst) {
      worst = share;
      worstAt = {x: cx, y: cy, blocked};
    }
  }
}

console.log(`\n  ${pad('what', 42)}${padl('measured', 12)}${padl('budget', 10)}`);
console.log(
  `  ${pad('blocked plots, whole sample', 42)}${padl(pct(totalBlocked / Math.max(1, totalPlots)), 12)}${padl('—', 10)}`,
);
console.log(
  `  ${pad(`worst ${WINDOW}x${WINDOW} window`, 42)}${padl(pct(worst), 12)}${padl(pct(BUDGET), 10)}`,
);
if (worstAt) {
  console.log(
    `  ${pad(`  at (${worstAt.x}, ${worstAt.y})`, 42)}${padl(`${worstAt.blocked} of ${WINDOW * WINDOW}`, 12)}`,
  );
}
// Per BLOCKED PLOT, not per prop: the largest footprint covers two.
const maxFootprint = Math.max(...PLACEABLE.filter((p) => blocks(p.cls)).map((p) => p.footprint.w * p.footprint.h));
console.log(
  `  ${pad('lattice ceiling, before habitat gating', 42)}${padl(pct(maxFootprint / (BLOCK_CELL * BLOCK_CELL)), 12)}`,
);

/* ------------------------------------------------------------------ per prop */

console.log(`\n  ${pad('prop', 24)}${pad('class', 15)}${padl('placed', 9)}${padl('blocks', 9)}`);
for (const p of PLACEABLE) {
  console.log(
    `  ${pad(p.id, 24)}${pad(p.cls, 15)}${padl((counts.get(p.id) ?? 0).toLocaleString(), 9)}${padl(blocks(p.cls) ? 'yes' : '—', 9)}`,
  );
}

/* ---------------------------------------------------------------- assertions */

const failures = [];
if (worst > BUDGET) {
  failures.push(
    `blocking props reach ${pct(worst)} in a ${WINDOW}x${WINDOW} window, over the ${pct(BUDGET)} budget`,
  );
}
if (saltProps > 0) {
  failures.push(`${saltProps} props placed on the salt pan, which is meant to be bare`);
}

console.log(`\n${'='.repeat(72)}`);
if (failures.length === 0) {
  console.log('All terrain assertions pass.');
} else {
  for (const f of failures) console.log(`FAIL  ${f}`);
}
console.log('');
process.exit(failures.length === 0 ? 0 : 1);
