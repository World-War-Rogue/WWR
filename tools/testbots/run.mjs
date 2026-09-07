/**
 * Drive the test accounts through the game and check the rulings hold.
 *
 *   node tools/testbots/run.mjs <origin> [--ticks 20] [--attacks] [--interval 30]
 *
 * Reads credentials from tools/testbots/bots.json (written by mint.mjs). Each
 * tick, every bot takes one persona-shaped action and every response is run
 * past the invariants below. The report lands in tools/testbots/reports/.
 *
 * --attacks lets the raider persona order attacks. Leave it off against the
 * live server: the server refuses test-bot attacks there anyway.
 */
import {readFileSync, mkdirSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {Client} from './api.mjs';

const args = process.argv.slice(2);
const origin = args.find((a) => !a.startsWith('--'));
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const v = args[i + 1];
  return v && !v.startsWith('--') ? v : true;
};
if (!origin) {
  console.error('usage: node tools/testbots/run.mjs <origin> [--ticks N] [--attacks] [--interval S]');
  process.exit(2);
}
const TICKS = Number(flag('ticks', 20));
const ATTACKS = flag('attacks', false) === true;
const INTERVAL_S = Number(flag('interval', 30));

const creds = JSON.parse(readFileSync(resolve('tools/testbots/bots.json'), 'utf8'))[origin] ?? [];
if (creds.length === 0) {
  console.error(`no bots for ${origin} in tools/testbots/bots.json - run mint.mjs first`);
  process.exit(2);
}

const PERSONAS = ['whale', 'grinder', 'raider', 'idle', 'builder'];
const findings = [];
const log = [];
const note = (bot, level, text, extra) => {
  const line = {t: new Date().toISOString(), bot, level, text, ...(extra ? {extra} : {})};
  (level === 'FAIL' ? findings : log).push(line);
  console.log(`${line.t} ${level.padEnd(4)} ${bot.padEnd(14)} ${text}`);
};

/* -------------------------------------------------------------------------- */
/* Invariants                                                                 */
/* -------------------------------------------------------------------------- */

function checkBase(bot, base) {
  const cc = base.levels?.command_center ?? 1;
  for (const [b, lvl] of Object.entries(base.levels ?? {})) {
    if (lvl < 1) note(bot, 'FAIL', `${b} is level ${lvl}; every building starts at 1`);
    if (b !== 'command_center' && lvl > cc) note(bot, 'FAIL', `${b} ${lvl} exceeds Command Center ${cc}`);
  }
  for (const [k, v] of Object.entries(base.resources ?? {})) {
    if (v < 0) note(bot, 'FAIL', `${k} stock is negative (${v})`);
    if (typeof base.storageCap === 'number' && v > base.storageCap + 1) {
      note(bot, 'FAIL', `${k} ${v} above Warehouse cap ${base.storageCap}`);
    }
  }
  if (base.wallet && (base.wallet.tokens < 0 || base.wallet.credits < 0)) {
    note(bot, 'FAIL', `wallet negative: ${JSON.stringify(base.wallet)}`);
  }
}

function checkSquads(bot, s) {
  const cc = s.base?.levels?.command_center ?? 1;
  for (const a of s.owned ?? []) {
    if (a.level > cc) note(bot, 'FAIL', `${a.assetId} rank ${a.level} above Command Center ${cc}`);
    if (a.level < 1) note(bot, 'FAIL', `${a.assetId} rank ${a.level}`);
    for (const [k, v] of Object.entries(a.packages ?? {})) {
      if (v > a.level) note(bot, 'FAIL', `${a.assetId} ${k} package ${v} above its rank ${a.level}`);
    }
  }
  const delta = s.squads?.Delta ?? [];
  if (delta.some(Boolean) && !s.deltaOpen) note(bot, 'FAIL', 'Delta holds assets while closed');
  if (s.deltaOpen && cc < 10) note(bot, 'FAIL', `Delta open at Command Center ${cc} (needs 10 bought / 20 earned)`);
}

/* -------------------------------------------------------------------------- */
/* Personas                                                                   */
/* -------------------------------------------------------------------------- */

const state = new Map(); // username -> {client, persona, lastShield}

async function refresh(bot) {
  const [base, squads] = await Promise.all([bot.client.get('/api/base/levels'), bot.client.get('/api/squads')]);
  if (!base.ok) note(bot.name, 'FAIL', `GET /api/base/levels ${base.status}`, base.json);
  if (!squads.ok) note(bot.name, 'FAIL', `GET /api/squads ${squads.status}`, squads.json);
  if (base.ok) checkBase(bot.name, base.json);
  if (squads.ok) checkSquads(bot.name, squads.json);
  return {base: base.json, squads: squads.json};
}

function cheapestUpgrade(base) {
  const levels = base?.levels ?? {};
  const cc = levels.command_center ?? 1;
  const running = new Set((base?.jobs ?? []).map((j) => j.building));
  // Command Center first when everything else has caught up; else the lowest.
  const candidates = Object.entries(levels)
    .filter(([b]) => !running.has(b))
    .filter(([b, l]) => b === 'command_center' || l < cc)
    .sort((a, b) => a[1] - b[1]);
  return candidates[0]?.[0] ?? 'command_center';
}

async function act(bot, snap) {
  const {client, persona, name} = bot;
  const expectOk = async (label, res, tolerate = []) => {
    if (res.ok) {
      note(name, 'ok', `${label}`);
      return true;
    }
    const msg = res.json?.error ?? String(res.status);
    if (res.status >= 500) note(name, 'FAIL', `${label} -> ${res.status} ${msg}`, res.json);
    else if (tolerate.some((t) => msg.includes(t))) note(name, 'info', `${label} refused: ${msg}`);
    else note(name, 'warn', `${label} refused: ${msg}`);
    return false;
  };
  const softRefusals = ['Not enough', 'already', 'Already', 'queue', 'must reach', 'caps', 'first', 'running', 'busy'];

  switch (persona) {
    case 'builder':
    case 'grinder': {
      const building = cheapestUpgrade(snap.base);
      await expectOk(`level ${building}`, await client.post('/api/base/level', {building}), softRefusals);
      if (persona === 'grinder') {
        const a = (snap.squads?.owned ?? []).sort((x, y) => x.level - y.level)[0];
        if (a) {
          await expectOk(
            `rank ${a.assetId} -> ${a.level + 1} (credits)`,
            await client.post('/api/assets/rank', {assetId: a.assetId, target: a.level + 1, split: {tokens: 0, credits: 0}}),
            softRefusals.concat(['does not add up']),
          );
        }
      }
      return;
    }
    case 'whale': {
      // Spends Tokens first: rank the strongest asset, then buy a shield, then a building.
      const a = (snap.squads?.owned ?? []).sort((x, y) => y.level - x.level)[0];
      if (a) {
        const res = await client.post('/api/assets/rank', {assetId: a.assetId, target: a.level + 1});
        await expectOk(`rank ${a.assetId} -> ${a.level + 1}`, res, softRefusals);
        // Equal value: the same rank-up must cost the same whichever side pays.
        // Checked by asking for a split the server must reject when it does not add up.
        const bad = await client.post('/api/assets/rank', {assetId: a.assetId, target: a.level + 2, split: {tokens: 1, credits: 0}});
        if (bad.ok) note(name, 'FAIL', 'rank-up accepted a 1-Token split that cannot cover the price');
      }
      if (!snap.squads?.season1?.shield?.until) {
        await expectOk('shield paid8', await client.post('/api/shield', {kind: 'paid8'}), softRefusals.concat(['cooldown', 'Cooldown']));
      }
      await expectOk(`level ${cheapestUpgrade(snap.base)}`, await client.post('/api/base/level', {building: cheapestUpgrade(snap.base)}), softRefusals);
      return;
    }
    case 'idle': {
      // Logs in, looks at the map, leaves. The server must settle everything on that look.
      const w = await client.get('/api/world?x=-10&y=-10&w=20&h=20');
      await expectOk('look at the map', w);
      return;
    }
    case 'raider': {
      const w = await client.get('/api/world?x=-40&y=-40&w=80&h=80');
      if (!(await expectOk('scan the map', w))) return;
      const me = w.json?.you?.username;
      const targets = (w.json?.bases ?? []).filter((b) => b.username !== me && !b.shieldUntil);
      if (targets.length === 0) return note(name, 'info', 'no unshielded target in view');
      const shielded = (w.json?.bases ?? []).find((b) => b.username !== me && b.shieldUntil);
      if (!ATTACKS) return note(name, 'info', `would attack ${targets[0].username} (attacks off)`);
      // A shielded base must be refused before anything marches.
      if (shielded) {
        const r = await client.post('/api/attack', {squad: 'Alpha', x: shielded.x, y: shielded.y});
        if (r.ok) note(name, 'FAIL', `attack on shielded ${shielded.username} was accepted`);
        else note(name, 'ok', `shielded ${shielded.username} refused: ${r.json?.error}`);
      }
      const t = targets[Math.floor(Math.random() * targets.length)];
      const r = await client.post('/api/attack', {squad: 'Alpha', x: t.x, y: t.y});
      await expectOk(`attack ${t.username}`, r, softRefusals.concat(['empty', 'away', 'marching', 'repair', 'own base', 'may not attack']));
      return;
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Run                                                                        */
/* -------------------------------------------------------------------------- */

for (const [i, c] of creds.entries()) {
  const client = new Client(origin, c.username);
  const login = await client.login(c.password);
  if (!login.ok) {
    note(c.username, 'FAIL', `login ${login.status}`, login.json);
    continue;
  }
  state.set(c.username, {client, persona: PERSONAS[i % PERSONAS.length], name: c.username});
  note(c.username, 'info', `signed in as ${PERSONAS[i % PERSONAS.length]}`);
}

for (let tick = 1; tick <= TICKS; tick += 1) {
  console.log(`\n--- tick ${tick}/${TICKS} ---`);
  for (const bot of state.values()) {
    try {
      const snap = await refresh(bot);
      await act(bot, snap);
      const after = await refresh(bot);
      // Whatever a bot did, its shield state may only change by its own action.
      const before = snap.squads?.season1?.shield?.until ?? null;
      const now = after.squads?.season1?.shield?.until ?? null;
      if (before && !now && bot.persona !== 'raider') {
        note(bot.name, 'FAIL', 'shield dropped without an Attack being ordered');
      }
    } catch (e) {
      note(bot.name, 'FAIL', `harness error: ${e.message}`);
    }
  }
  if (tick < TICKS) await new Promise((r) => setTimeout(r, INTERVAL_S * 1000));
}

const dir = resolve('tools/testbots/reports');
mkdirSync(dir, {recursive: true});
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const file = resolve(dir, `${stamp}.md`);
const calls = [...state.values()].reduce((n, b) => n + b.client.calls, 0);
const md = [
  `# Test bot run - ${origin}`,
  '',
  `${new Date().toISOString()} · ${state.size} bots · ${TICKS} ticks · ${calls} API calls · attacks ${ATTACKS ? 'on' : 'off'}`,
  '',
  `## ${findings.length === 0 ? 'No rule violations' : `${findings.length} findings`}`,
  '',
  ...findings.map((f) => `- **${f.bot}** ${f.text}${f.extra ? `\n  \`${JSON.stringify(f.extra).slice(0, 300)}\`` : ''}`),
  '',
  '## Warnings (refusals that were not expected)',
  '',
  ...log.filter((l) => l.level === 'warn').map((l) => `- ${l.bot}: ${l.text}`),
  '',
  '## Log',
  '',
  ...log.map((l) => `- ${l.t} ${l.level} ${l.bot}: ${l.text}`),
  '',
].join('\n');
writeFileSync(file, md);
console.log(`\n${findings.length} findings. Report: ${file}`);
process.exit(findings.length > 0 ? 1 : 0);
