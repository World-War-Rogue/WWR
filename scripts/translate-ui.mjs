/**
 * Translate the interface once, and commit the result.
 *
 *     node scripts/translate-ui.mjs            # only what is missing
 *     node scripts/translate-ui.mjs --force    # everything, again
 *     node scripts/translate-ui.mjs --lang ko  # one language
 *
 * Reads every fragment in src/i18n/en/, sends the strings to Workers AI in
 * batches, and writes
 * src/i18n/generated.ts. Run it whenever a key is added; the output is checked
 * in, so players never wait for a model and the game costs nothing to render
 * in twenty languages.
 *
 * Needs CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in the environment, and
 * a token with Workers AI read. It is a build tool - it is never called from
 * the game, and no key it uses is in the deployed bundle.
 *
 * KEEPING TRANSLATIONS HONEST. Anything already present is left alone unless
 * --force is given, so a string corrected by a human stays corrected. That is
 * the whole reason this is a committed file rather than a cache: the model is
 * a first draft for a hundred strings, and the words that matter get fixed by
 * somebody who speaks the language.
 */
import {readFileSync, readdirSync, writeFileSync, existsSync} from 'node:fs';

const MODEL = '@cf/meta/llama-3.1-8b-instruct-fast';
const BATCH = 20;

const ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID;
const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
if (!ACCOUNT || !TOKEN) {
  console.error('Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN first.');
  process.exit(1);
}

const args = process.argv.slice(2);
const force = args.includes('--force');
const only = args.includes('--lang') ? args[args.indexOf('--lang') + 1] : null;

const LANGUAGES = [
  ['es', 'Spanish'], ['pt', 'Portuguese'], ['fr', 'French'], ['de', 'German'],
  ['it', 'Italian'], ['nl', 'Dutch'], ['pl', 'Polish'], ['ru', 'Russian'],
  ['uk', 'Ukrainian'], ['tr', 'Turkish'], ['ar', 'Arabic'], ['he', 'Hebrew'],
  ['hi', 'Hindi'], ['zh', 'Chinese (Simplified)'], ['ja', 'Japanese'],
  ['ko', 'Korean'], ['vi', 'Vietnamese'], ['th', 'Thai'], ['id', 'Indonesian'],
];

// Parse the source text without importing it: this is a plain script and the
// fragments are TS. en.ts itself holds no strings any more - it composes the
// files in src/i18n/en/ - so read those, all of them, rather than naming them.
const source = readdirSync('src/i18n/en')
  .filter((f) => f.endsWith('.ts'))
  .sort()
  .map((f) => readFileSync(`src/i18n/en/${f}`, 'utf8'))
  .join('\n');
const EN = {};
for (const m of source.matchAll(/^  '([^']+)': '((?:[^'\\]|\\.)*)',$/gm)) {
  EN[m[1]] = m[2].replace(/\\'/g, "'").replace(/\\\\/g, '\\');
}

// The pattern above only matches a key and its value on ONE line, which is how
// prettier leaves most of them - but it wraps a long one onto the next line,
// and such a key then matches nothing. That failure is completely silent: the
// string is simply never translated and nobody finds out until a player says
// the interface is still in English. So count the keys a second way and shout
// if the two disagree.
const declared = (source.match(/^  '[^']+':/gm) ?? []).length;
const parsed = Object.keys(EN).length;
if (parsed !== declared) {
  console.error(
    `\n  ${declared} keys declared in en.ts but only ${parsed} could be read.\n` +
      '  A value wrapped onto its own line does not match the parser.\n' +
      '  Put each key and its string on one line in src/i18n/en/ and retry.\n',
  );
  process.exit(1);
}
console.log(`${parsed} keys to translate`);

const existing = {};
if (existsSync('src/i18n/generated.ts') && !force) {
  const prev = readFileSync('src/i18n/generated.ts', 'utf8');
  const start = prev.indexOf('{');
  const end = prev.lastIndexOf('}');
  if (start > -1 && end > start) {
    try {
      Object.assign(existing, JSON.parse(prev.slice(start, end + 1)));
    } catch {
      console.warn('Could not read the previous file; translating everything.');
    }
  }
}

async function ask(messages) {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/ai/run/${MODEL}`,
    {
      method: 'POST',
      headers: {Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json'},
      body: JSON.stringify({messages, max_tokens: 2000, temperature: 0.1}),
    },
  );
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  const body = await res.json();
  return body?.result?.response ?? '';
}

// The system prompt carries the context a bare word cannot. "Lift", "Screen"
// and "Breach" are ordinary English words with specific meanings here, and a
// model given one of them alone will confidently pick the wrong sense.
const SYSTEM = (name) => `You translate the interface of a modern-warfare strategy game into ${name}.

Rules:
- Reply with ONLY a JSON object mapping each key to its translation. No prose.
- Keep {placeholders} EXACTLY as they appear, including the braces.
- Keep the register short and military. These are buttons and labels, not prose.
- Vocabulary, in this game's sense:
  Lift = transport capacity a squad can carry. Not elevator, not raising.
  Screen = a covering/flanking military role. Not a display.
  Breach = the role that closes and takes ground.
  Overwatch = firing from a distance at spotted targets.
  Recon = reconnaissance, scouting.
  Range = engagement distance.
  Power = a numeric strength score.
  Squad, Alliance, Server, Base, Command Post are game nouns - translate
  naturally but consistently.
- Where a language would normally leave a technical term in English, do so.`;

const out = {};
for (const [code, name] of LANGUAGES) {
  if (only && code !== only) {
    if (existing[code]) out[code] = existing[code];
    continue;
  }
  const have = existing[code] ?? {};
  const missing = Object.keys(EN).filter((k) => !have[k]);
  if (missing.length === 0) {
    out[code] = have;
    console.log(`${code}  up to date`);
    continue;
  }

  const table = {...have};
  for (let i = 0; i < missing.length; i += BATCH) {
    const slice = missing.slice(i, i + BATCH);
    const payload = Object.fromEntries(slice.map((k) => [k, EN[k]]));
    try {
      const reply = await ask([
        {role: 'system', content: SYSTEM(name)},
        {role: 'user', content: JSON.stringify(payload, null, 0)},
      ]);
      const start = reply.indexOf('{');
      const end = reply.lastIndexOf('}');
      const parsed = JSON.parse(reply.slice(start, end + 1));
      for (const key of slice) {
        if (typeof parsed[key] === 'string' && parsed[key].trim()) {
          table[key] = parsed[key].trim();
        }
      }
      process.stdout.write(`${code} ${Object.keys(table).length}/${Object.keys(EN).length}\r`);
    } catch (err) {
      console.warn(`\n${code} batch ${i / BATCH} failed: ${err.message}`);
    }
  }
  out[code] = table;
  console.log(`${code}  ${Object.keys(table).length}/${Object.keys(EN).length}`);
}

const header = `/**
 * Generated by scripts/translate-ui.mjs. Committed on purpose.
 *
 * Edit a string here by hand when the machine gets one wrong - the generator
 * leaves anything already present alone, so a correction survives every later
 * run. Delete a key to have it translated again.
 *
 * English is not in here; it is src/i18n/en.ts, which is the source text.
 */
export const TRANSLATIONS: Record<string, Record<string, string>> = `;

writeFileSync('src/i18n/generated.ts', `${header}${JSON.stringify(out, null, 2)};\n`);
console.log('\nwrote src/i18n/generated.ts');
