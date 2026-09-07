/**
 * Mint test accounts on a server and write their credentials to bots.json.
 *
 *   TEST_BOT_SECRET=… node tools/testbots/mint.mjs https://wwr-test.example.workers.dev [count]
 *
 * Passwords are returned once by the server and stored here only; keep the
 * file out of git (it is ignored) and out of chat.
 */
import {writeFileSync, existsSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const [origin, countArg] = process.argv.slice(2);
const secret = process.env.TEST_BOT_SECRET;
if (!origin || !secret) {
  console.error('usage: TEST_BOT_SECRET=… node tools/testbots/mint.mjs <origin> [count]');
  process.exit(2);
}
const count = Number(countArg) || 5;

const res = await fetch(origin.replace(/\/$/, '') + '/api/admin/testbots/mint', {
  method: 'POST',
  headers: {'Content-Type': 'application/json', 'X-Test-Bot-Secret': secret},
  body: JSON.stringify({count}),
});
const body = await res.json().catch(() => ({}));
if (!res.ok) {
  console.error(`mint failed: ${res.status}`, body);
  process.exit(1);
}

const file = resolve(process.cwd(), 'tools/testbots/bots.json');
const existing = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
const byOrigin = existing[origin] ?? [];
existing[origin] = [...byOrigin, ...body.bots];
writeFileSync(file, JSON.stringify(existing, null, 2));
console.log(`minted ${body.bots.length} on ${origin}:`);
for (const b of body.bots) console.log(`  ${b.username}`);
console.log(`credentials written to ${file}`);
