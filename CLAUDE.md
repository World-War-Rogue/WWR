# Notes for working on this repo

## TypeScript

This project uses the automatic JSX runtime (`"jsx": "react-jsx"`). `React` is
**not** in scope as a namespace, so `React.FormEvent`, `React.ReactNode` and
`React.RefObject` do not resolve. Import the type by name instead:

```ts
import {type FormEvent, type ReactNode, type RefObject} from 'react';
```

There is no `@types/react`, so JSX does not special-case `key` on a custom
component. Put the key on a wrapper element.

The client and the Worker are checked as separate projects: `npm run lint` runs
`tsc` over `src/` and then over `worker/`. The Worker is checked under `strict`;
the client is not yet.

## Deploying

In this order, every time:

```powershell
npm run db:migrate   # if anything in migrations/ is new
npm run build        # deploy publishes dist/, not src/
npx wrangler deploy
```

**Migrate before deploying.** New code against the old schema returns a bare 500
on the first request touching a missing table, because `DEBUG_ERRORS` is off.
The reverse order is harmless - old code simply does not use the new table.
`npm run db:status` is the first thing to check when something works locally and
500s in production.

**Build before deploying.** `wrangler deploy` publishes whatever is in `dist/`.
Deploying a stale `dist/` looks exactly like a change that did not work, and has
cost time three times.

`npx wrangler deploy` skips Cloudflare's build queue, which has sat for 15
minutes. Pushing to `main` triggers a Cloudflare build too; both end up at the
same Worker.

## Architecture

- The server is authoritative. Anything the browser can compute, a player can
  edit, so every number that matters is decided in `worker/`.
- Timers are stored as absolute completion instants, never as remaining
  durations, and state is settled on read. Nothing ticks in the background.
- Uniqueness is enforced by an index, not by read-then-write: two players moving
  onto the same square in the same instant must be separated by the database,
  not by a check. The same holds for alliance tags, one-alliance-per-player and
  one-owner-per-exclusive-item.
- Power is computed from building levels on every read and never stored.
- `shared/` is imported by both the client and the Worker, so it must stay data
  only - no DOM, no Worker APIs. It exists so the two sides cannot disagree
  about a catalogue.
- Channel access is checked on reads as well as writes. Losing an alliance must
  end access to its history, not merely the ability to post.
- Images are served from their own endpoints and never inlined into list
  payloads. A hundred-member roster carrying base64 portraits is megabytes of
  JSON before the first name appears.
- `run_worker_first: ["/api/*"]` in `wrangler.jsonc` is load-bearing. Without it
  the single-page-app fallback answers API calls with `index.html` and a 200.

## Runtime limits already hit

- D1 rejects `CREATE TEMP TABLE` with `SQLITE_AUTH`.
- **Migrations must use `--` line comments only.** `wrangler d1 migrations apply`
  splits the file on `;` and rejects any chunk that holds no statement, so a
  C-style banner between two statements fails the WHOLE file with
  `SQL code did not contain a statement [code: 7500]` before anything runs.
  Valid SQL is not the same as a file wrangler will accept, and checking a
  migration against SQLite does not check it against the splitter. Applying every
  file in `migrations/` in order to an in-memory SQLite, with rows seeded before
  the one under test, catches the other half - a table rebuild that drops data -
  without touching production. Worth doing for any migration that recreates a
  table.
- PBKDF2 is capped at 100,000 iterations in the Workers runtime. Higher throws
  at runtime, not at deploy.
- Workers cannot hold a connection, so chat polls on a `since` cursor. Durable
  Objects are the upgrade path if it ever needs to be real-time.

## Base skin art

Reference art must be generated **isolated on a plain light background**. The
cutout tool flood-fills inward from the edges, so a subject already sitting on a
dark or busy background loses its own dark parts - one skin came back as gold
trim with the figure erased.

Windows ships no flag glyphs, so country flags render as raw letters there. Use
a country-code chip, not an emoji flag.

## Bots

Two kinds, both in `worker/bots.ts`, both listed on `/api/admin/bots` (owner
session), where every one has a **Sign in as** link (`/api/admin/impersonate`,
owner only - it replaces the owner's cookie; sign out and back in to return).

- **Farm bots** (`role = 'farmbot'`, callsign `Lieutenant ######`) are planted
  from the bots page, 10 per request, up to 200 per world. They never act.
  Their levels are a deterministic function of (now - planted_at, seed),
  clamped to the week's readiness band and their ceiling (8 in Season 1),
  and are materialised into `base_levels` / `player_assets` when they are read:
  inside a map viewport (a few per request, `growBotsInViewport`) or as a raid
  target (`materialiseBot` in `settleArrivals`). Never shielded. To the rest of
  the game they are players; keep it that way rather than special-casing them.
- **Test bots** (`role = 'testbot'`) are minted by `POST /api/admin/testbots/mint`
  with header `X-Test-Bot-Secret`, only while the `TEST_BOT_SECRET` secret is
  set. Their attacks are refused unless `TEST_BOTS_MAY_ATTACK` is `"on"`, which
  it is only in the `test` environment. `tools/testbots/` drives them.

The `test` environment in `wrangler.jsonc` is a second Worker (`wwr-test`) on
its own database. Deploy and migrate it with `--env test`. Bindings do not
inherit between environments, so anything added to the top level must be
added under `env.test` too or that deploy silently runs without it.

## Trade Post

A tab in the Command Center sheet (`src/live/TradePost.tsx`), not a board
building: no level, no upgrade, no power. The manifest is
`shared/tradePost.ts`; it holds offers, limits and wording and **no prices**.
Every offer names an existing grant (`kind`), and its cost is resolved from
`shared/economy.ts` for the target the player picks - the same number the
direct screen shows, and the same number in Tokens and Credits (1:1 is a
locked ruling; a designer draft proposed 1:4 and was withdrawn).

`worker/tradePost.ts` writes the purchase row FIRST (`trade_purchases`, keyed
by the client's purchase id, limit guarded in the same INSERT), then calls the
canonical grant (`packageUp`). A refused grant deletes the row; a repeated id
answers with the standing state and grants nothing. Windows: weekly =
`gameWeekIndex` (Monday 00:00 RST), monthly = 1st 00:00 RST.

The monthly shelf is empty on purpose and shows its server-provided empty
text. Do not add greyed "coming soon" cards. `public/trade-post/` holds all
six designer PNGs unmodified (1254px, ~2 MB each - source only, never
rendered) beside 512px WebP derivatives (~50 KB) that the cards render; only
`package-component-selector.webp` is shown until the systems behind the
others exist. Regenerate a derivative with the PIL one-liner in the commit
that added them (trim transparent margin, fit 512, quality 82). "Visit Token Store"
renders only when `WWR_TOKEN_STORE_URL` (https) is set - there is no website
store yet. Never print a cash amount, pack, bundle or discount in the game.

`npm test` runs `tools/tests/*.test.ts` under node:test via tsx (the first test
runner in the repo; `npm install` once after pulling).

## Temporary switches

`ALL_SKINS_UNLOCKED` in `worker/game.ts` is `true` so testers can equip any
skin, including the one-of-one ones. Set it back to `false` before the game
opens to strangers, and reset any base wearing a skin it does not own in the
same pass, or those bases are left in a state the ownership check rejects.

## Type-checking on the device VM

Run tsc as
`node --max-opt=0 --single-threaded --no-concurrent-recompilation --stack-size=4000 ./node_modules/typescript/lib/tsc.js -p <tsconfig> --noEmit`,
and **retry on a non-zero exit that is not 1 or 2** - it is a crash, not a
finding. `--single-threaded` is the flag that matters: the worker project
segfaulted (exit 139) ten times in a row under `--max-opt=0` alone and passed
first time with it, because the fatal comes from a background compile thread.
The client project usually passes under `--max-opt=0` alone.

The device shell itself runs on the same node and dies the same way, so ANY
device_bash call can be killed mid-way - even one that only runs `ls`. A
crash during `git commit` leaves `.git/index.lock` behind, which blocks GitHub
Desktop; remove it. Do one thing per call and read back what landed.

The VM's node crashes intermittently with a V8 fatal error in the optimizing
compiler ("unreachable code", turboshaft in the stack). `--jitless` was the
earlier workaround and is no longer reliable: turboshaft still appears in the
crash trace under it, so it was never actually disabling the optimizer here.
`--no-opt --no-turbofan` is what holds, and even that crashes occasionally, so
loop the run until it exits 0 (clean), 1 or 2 (real errors).

The crash kills the whole shell call, so a script that writes files and then
type-checks can lose the writes as well - write first, check in a separate
call. Exit 139 is a segfault, 133 a V8 trap, 255 a fatal error; none of them
mean the code is wrong.

Do not put raw control characters in a heredoc - a regex literal written with
actual control bytes has broken the transport twice. Use codepoint checks.

## The translate token hijacks wrangler

`npm run i18n` needs `CLOUDFLARE_API_TOKEN` in the environment. **Wrangler reads
the same variable**, and prefers it over its own stored login - so in a shell
that has just run the translator, `wrangler deploy` authenticates as the narrow
Workers-AI-read token and fails with `Authentication error [code: 10000]`.

Nothing is wrong with the login. Close that window, or:

    Remove-Item Env:CLOUDFLARE_API_TOKEN
    Remove-Item Env:CLOUDFLARE_ACCOUNT_ID

Run the translator in its own window and deploy from a different one. Wrangler
does say so in the note under the error, which is easy to read past when the
headline is an auth failure.

## The recovery folder

`npm run recovery` rebuilds the recovery folder on the Desktop from
`git archive HEAD`. Run it after any run of work. It copies only committed
files, so nothing gitignored can leak into it and a forgotten commit shows up as
a missing file rather than a file surviving in one place only.

**git is not on PATH in Matt's PowerShell** - he pushes from GitHub Desktop, so
nothing ever put it there. The script therefore finds git rather than requiring
it: PATH, then the standard installs, then GitHub Desktop's bundled copy under
`%LOCALAPPDATA%\GitHubDesktop\app-<version>\resources\app\git\cmd\`. Set
`$env:WWR_GIT` to a full path to override. Any other script that shells out to
git has to do the same - assuming `git` on PATH is how this failed for a month
without anyone noticing the snapshot was stale.

## Working with Matt

- ChatGPT is the game designer (with Grok alongside from 2026-09-07); Matt is
  owner and deployer; Claude implements. Read the repo and the existing
  systems first, answer with a plan and questions only, wait for approval,
  then build only the approved scope. Product decisions are asked plainly
  with the trade-off and a recommendation.
- Claude commits (one commit per fix, a clear title and a description that
  says why) and never pushes, deploys or runs remote migrations. Matt pushes
  from GitHub Desktop and deploys in PowerShell. Nothing is "verified" until
  Matt or a tester ran it in the deployed game.
- Instructions to Matt are given explicitly and completely, one line at a
  time.
- The mascot is **General Rider** (not Admiral). Rider hides while any modal
  is open: sheets, composers and dialogs call `useModal()` from
  `src/live/guide/useModal.ts`, which registers them in `guide/bus.ts`.
  Anything new that floats over the game must call it, or Rider's bubble
  (z-60, bottom edge) will sit over its buttons.
- The map wrapper is `position: fixed`, so it is its own stacking context:
  a z-index inside `WorldMap` never wins against the chat bar (a fixed z-40
  sibling). Anything anchored to the map's bottom edge must pad for the bar.
- `src/live/WorldMap.tsx` keeps its last camera and view in a module-level
  cache across mounts (`forgetMap()` on sign-out), so the map does not open
  blank when the player comes back from the base.

## Claude session log

Chats get lost; the repo does not. Every commit carries its session link in
`Claude-Session:`. Sessions so far:

- 2026-09-07 bots, test realm, first-load budget:
  https://claude.ai/code/session_011WwhehTcZ3zWnFfzjzUgiM
- 2026-09-07 QA fix pass (General Rider, composer clipping, account menu,
  blank map, Skip tour, building tap, nameplates, Credits/Tokens, upgrade
  dead ends): https://claude.ai/code/session_01Wnmkfu9Lof4ogvFTtYbqyg
