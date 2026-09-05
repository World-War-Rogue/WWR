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

## Temporary switches

`ALL_SKINS_UNLOCKED` in `worker/game.ts` is `true` so testers can equip any
skin, including the one-of-one ones. Set it back to `false` before the game
opens to strangers, and reset any base wearing a skin it does not own in the
same pass, or those bases are left in a state the ownership check rejects.

## Type-checking on the device VM

Run tsc as `node --no-opt --no-turbofan ./node_modules/typescript/lib/tsc.js`,
and **retry on a non-zero exit that is not 1 or 2** - it is a crash, not a
finding.

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
