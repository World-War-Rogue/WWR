# World War Rogue

A closed multiplayer strategy game. Players request access by email, the owner
approves, and approved players share a persistent world where they hold ground
on a map, build and customise a base, form alliances, and talk to each other
across a language barrier.

**Live:** [worldwarrogue.com](https://worldwarrogue.com)

## Stack

| | |
| :--- | :--- |
| Client | React 19 + TypeScript 5.8, built with Vite 6 |
| Styling | Tailwind CSS v4 (via `@tailwindcss/vite`) |
| Server | A single Cloudflare Worker (`worker/`) |
| Database | Cloudflare D1 (SQLite) |
| Translation | Cloudflare Workers AI (`@cf/meta/m2m100-1.2b`) |
| Hosting | Cloudflare Workers with a static assets binding |

## The rule everything else follows

**The server decides everything.** Anything the browser can compute, a player
can edit, so every number that matters - resources, build timers, who owns which
plot, who may kick whom, who may read a channel - is decided in `worker/`, and
the client only renders what it is told.

Three consequences worth knowing before changing anything:

- **Timers are absolute completion instants**, never remaining durations, and
  state is settled on read. Nothing ticks in the background, so a world nobody
  is playing costs nothing to run.
- **Uniqueness is a database index, never a read-then-write.** Plot occupancy,
  alliance tags, one-alliance-per-player and one-owner-per-exclusive-item are
  all decided by the schema. Two players acting in the same instant would both
  pass a check.
- **`shared/` is imported by both sides.** Catalogues that the client and the
  Worker must agree on - cosmetics, alliance ranks, chat channels, portrait
  limits - live there and are data only, with no DOM and no Worker APIs, so the
  two can never drift apart.

## Running locally

**Prerequisites:** Node.js 20 or newer, and a Cloudflare account for anything
that touches the database.

```bash
npm install
npm run dev          # client only, http://localhost:3000
```

```bash
npm run lint         # type-check client and worker as separate projects
npm run build        # production build into dist/
npm run db:status    # what the remote database has actually applied
npm run db:migrate   # apply pending migrations
```

## Deploying

In this order, every time:

```powershell
npm run db:migrate   # if anything in migrations/ is new
npm run build        # deploy publishes dist/, not src/
npx wrangler deploy
```

Migrating after deploying puts new code live against the old schema, and the
first request touching a missing table returns a bare 500. Deploying without
building first republishes the previous build, which looks exactly like a change
that did not work.

## Project layout

```
worker/          the server - auth, world, game state, alliances, chat, admin
shared/          catalogues imported by BOTH the client and the worker
migrations/      database schema, applied in order, never edited once applied
src/live/        the live multiplayer client: map, base, profile, alliance, chat
src/net/api.ts   the single place the client talks to the server
src/components/  the earlier single-player prototype views
src/data/        static datasets belonging to that prototype
tools/skinforge/ turns reference art into a base skin
docs/            design documents
scripts/         database utilities and the recovery-folder refresh
```

`src/live/` is the real game. `src/components/` and `src/data/` are the earlier
offline prototype the project started from; they still build, but nothing in
them talks to the server.

## What exists

Accounts with email approval, sessions, base building on server-side timers,
resources settled on read, a shared world with generated seasonal terrain, plot
ownership and movement, an owner role, layered cosmetics over base skins,
rendered skin art with code-driven motion, one-of-one items, player profiles
with uploaded portraits, alliances with ranks and applications and crests, and
chat - server, alliance, leadership, direct messages and named group chats, with
automatic translation into each player's chosen language.

**Not built yet:** combat, troops, heroes, monetization, filtering on
player-authored text, and block / mute / report in chat.

## Documentation

- [`docs/HOW-IT-WORKS.md`](./docs/HOW-IT-WORKS.md) - **start here.** What the game
  actually is and why each part is built the way it is.
- [`docs/SQUADS-AND-HEROES.md`](./docs/SQUADS-AND-HEROES.md) - the asset
  catalogue, squads, lift, and how they are drawn.
- [`docs/COMBAT.md`](./docs/COMBAT.md) - what a battle is, what decides it,
  and what it costs.
- [`docs/SKIN-ART-SPEC.md`](./docs/SKIN-ART-SPEC.md) - what a base skin needs to be.
  The brief for a 3D artist.
- [`docs/CHATGPT-SKIN-BRIEF.md`](./docs/CHATGPT-SKIN-BRIEF.md) - the same job
  written for an image model. Paste it in whole and ask for a skin.
- [`CLAUDE.md`](./CLAUDE.md) - the things that have already cost time here.
- `docs/WORLD_WAR_ROGUE_DESIGN.md` and `docs/01`-`docs/09` are the original
  design fiction from before the game was built. They describe an architecture
  that was never used and features that do not exist. Read them for intent, not
  for how anything works.
