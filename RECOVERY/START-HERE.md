# World War Rogue - Recovery Guide

**If everything is lost, this folder rebuilds the game.**

Last updated: 4 September 2026

---

## What survives what

| If you lose | You still have | Because |
| :--- | :--- | :--- |
| This computer | Everything | Code is on GitHub, data and hosting are on Cloudflare, and this folder is inside OneDrive, which syncs |
| GitHub | The code | `source-snapshot/` in this folder is a complete copy |
| OneDrive | The code | GitHub has it |
| **Cloudflare** | **The code and the domain name** | **DNS, the database and the live site are all there. See the warning below.** |
| Squarespace | Everything except the name | The domain registration lives there; DNS, data and hosting are on Cloudflare. Squarespace signs in as support@worldwarrogue.com, so losing Google Workspace mail makes its password reset unreachable too |

**Cloudflare is the single point of failure.** Losing that account loses DNS,
every player account, and the deployment together, and no copy of the
database exists anywhere else. (The domain registration itself is at
Squarespace, not Cloudflare - corrected 12 Sep 2026 after checking WHOIS.) Its recovery codes belong somewhere that is not
this folder and not this computer.

Note the circularity: Cloudflare, Resend and GitHub all sign in with an address
that Google Workspace delivers, and that depends on DNS Cloudflare serves. If
Cloudflare access is lost, the password resets for the others may be unreachable
too.

**Two things are still open on that, and both are quick:**

1. `richmatt85@gmail.com` was invited to the Cloudflare account as a Super
   Administrator. If that invite is still Pending, accept it. It is the second
   door into the account that does not depend on the domain's own mail.
2. Two-factor is ON for support@worldwarrogue.com (12 Sep 2026). Confirm it on
   the richmatt85@gmail.com login too, and keep the backup codes somewhere that
   is not this machine.

---

## The one-minute version

```
https://github.com/mattr-source/WWR
```

If that repository exists: clone, install, point at a database, set one secret,
migrate, deploy. Twenty minutes, most of it waiting.

If it is also gone, `source-snapshot/` here is a complete copy of the code.
`MANIFEST.txt` names the exact commit it was taken from.

---

## What the thing is

A closed multiplayer strategy game. Players request access by email, the owner
approves, and approved players share a persistent world where they hold ground
on a map, customise their base, form alliances and talk to each other.

| Piece | What it is |
| :--- | :--- |
| Client | React 19 + TypeScript, built with Vite |
| Server | A single Cloudflare Worker (`worker/`) |
| Shared | `shared/` - catalogues imported by BOTH sides so they cannot disagree |
| Database | Cloudflare D1 (SQLite), `wwr-db` |
| Hosting | Cloudflare Workers, service `wwr` |
| Domain | worldwarrogue.com, registered at **Squarespace Domains** (login support@worldwarrogue.com, renews 3 Sep 2027); DNS is delegated to Cloudflare |
| Email | Resend, sending as noreply@worldwarrogue.com |
| Translation | Cloudflare Workers AI, `@cf/meta/m2m100-1.2b` |

**The rule the whole design rests on:** the server decides everything. Anything
the browser can compute, a player can edit, so every number that matters -
resources, timers, who owns which plot, who may kick whom, who may read a
channel - is decided in `worker/` and the client only renders what it is told.

---

## Rebuild, step by step

### 1. Get the code

```powershell
git clone https://github.com/mattr-source/WWR
cd WWR
npm install
```

If GitHub is gone, copy `source-snapshot/` instead and run `npm install` in it.

### 2. Sign in to Cloudflare

```powershell
npx wrangler login
```

### 3. Database

If `wwr-db` still exists, skip to migrations. Otherwise:

```powershell
npx wrangler d1 create wwr-db
```

That prints a `database_id`. Put it into `wrangler.jsonc` under
`d1_databases[0].database_id`.

```powershell
npm run db:migrate
```

Applies everything in `migrations/` in order and records what it applied, so it
is safe to re-run.

### 4. Secret

One, and it is not in this folder or in git:

```powershell
npx wrangler secret put RESEND_API_KEY
```

From resend.com -> API keys. Keys cannot be read back after creation, so if the
old one is lost, make a new one.

There is no `ADMIN_KEY`. Owner access is a role on an account.

### 5. Deploy

```powershell
npm run build
npx wrangler deploy
```

### 6. Make yourself the owner

Request access through the site, approve it from the email, then edit the
callsign inside the script and run:

```powershell
npx wrangler d1 execute wwr-db --remote --file=./scripts/promote_owner.sql
```

Owner rights can only be granted with database access. There is deliberately no
way to promote an account from inside the game, so a compromised account cannot
promote itself.

---

## The order that matters

**Migrate before you deploy.** Deploying first puts new code live against the
old schema, and the first request that touches a missing table returns a 500
with no useful message, because `DEBUG_ERRORS` is off. Migrating first is
harmless in reverse - old code simply does not use the new table.

`npm run db:status` lists what the remote database has actually applied. It is
the first thing to check when something works locally and 500s in production.

**Build before you deploy.** `npx wrangler deploy` publishes whatever is sitting
in `dist/`, not whatever is in `src/`. Deploying without building first ships
the previous build and looks exactly like a change that did not work. This has
happened three times.

---

## Keeping this folder current

```powershell
npm run recovery
```

Run it from the project folder after any run of work. It wipes
`source-snapshot/`, re-extracts every file git tracks at the current commit, and
writes `MANIFEST.txt` naming that commit.

It copies from git, not from the working folder, which is the point in two
directions: a file you forgot to commit shows up as missing here rather than
quietly surviving in one place only, and nothing ignored - `.dev.vars`, `.env`,
`dist`, `node_modules` - can leak in, by construction rather than by a rule
someone has to remember.

If it warns about uncommitted changes, commit them and run it again.

---

## DNS

Five records matter. `dns-records.txt` here has them exactly.

| Name | Type | Points at | Why |
| :--- | :--- | :--- | :--- |
| `worldwarrogue.com` | Worker | `wwr` | The game |
| `www` | CNAME | `worldwarrogue.com` | Redirected to the apex |
| `worldwarrogue.com` | MX | `smtp.google.com` | **Your email** |
| `resend._domainkey` | TXT | DKIM key | Lets Resend send |
| `send` | TXT + MX | amazonses | Lets Resend send |
| `_dmarc` | TXT | `v=DMARC1; p=none;` | Anti-spoofing |

Plus a Redirect Rule sending `www` to the apex, preserving the query string.
That redirect is not cosmetic: session cookies are host-scoped, so a player
signing in at `www` would appear signed out at the apex.

**Never add the root `MX` record Resend lists under "Enable Receiving."** It has
priority 0, Google's has priority 1, and lower wins - adding it silently stops
all mail reaching support@worldwarrogue.com. Sending does not need it.

---

## Things that will bite you

**Migrations not applied.** See "the order that matters" above. This has already
cost real time once.

**Deploying a stale `dist/`.** Also above. Three times.

**The automatic JSX runtime.** `React` is not in scope as a namespace.
`React.FormEvent` does not resolve; import the type by name. Three build
failures.

**No `@types/react` in the project.** JSX does not special-case `key` on a
custom component, so put the key on a wrapper element.

**`run_worker_first` in `wrangler.jsonc`.** Without it the single-page-app
fallback answers `/api/*` with `index.html` and a 200, and the API appears
broken in a baffling way.

**D1 rejects `CREATE TEMP TABLE`** with `SQLITE_AUTH`.

**PBKDF2 is capped at 100,000 iterations** in the Workers runtime. Higher throws
at runtime, not at deploy.

**Secrets pasted into a hidden prompt fail silently.** Paste into Notepad first
to confirm you have the whole value. A truncated Resend key cost an hour, twice.

**Request-access answers identically** whether an email is already known or not.
That is deliberate, and it means testing the mailer with a known address
silently proves nothing. Use a fresh plus-address.

**`git` is not on the PATH in PowerShell.** GitHub Desktop bundles its own copy.
Use GitHub Desktop, or `winget install Git.Git`.

**The project lives in OneDrive**, which syncs `node_modules`. That is also why
this folder survives the machine, so it is a trade rather than a mistake.

**Reference art for a base skin must be generated on a plain light background,
with the subject isolated.** The cutout tool flood-fills from the edges; a
subject already sitting on a dark or busy background loses its own dark parts.
One skin came back as gold trim with the figure erased.

---

## What exists, and what does not

**Working:** accounts with email approval, sessions, base building on
server-side timers, resources settled on read, a shared world with generated
seasonal terrain, plot ownership and movement, an owner role, a particle effects
layer, layered cosmetics over base skins, rendered skin art with code-driven
motion, one-of-one items, player profiles with uploaded portraits, alliances
with ranks and applications and crests, and chat - server, alliance, leadership,
direct messages, named group chats up to 20, with automatic translation into
each player's chosen language.

**Not built yet:** combat, troops, heroes, monetization, name and message
filtering on player-authored text, and block / mute / report in chat.

**Deliberately switched on for testing, and must be switched off before the game
opens to strangers:** `ALL_SKINS_UNLOCKED` in `worker/game.ts` is `true`, which
lets any account equip any skin including the one-of-one ones. Setting it back
to `false` will leave any base wearing an unowned skin in an invalid state, so
reset those bases in the same pass.

---

## Files in this folder

| File | What it is |
| :--- | :--- |
| `START-HERE.md` | This |
| `INFRASTRUCTURE.md` | Every service, ID and setting in one place |
| `MANIFEST.txt` | Which commit the snapshot was taken from, and when |
| `dns-records.txt` | The DNS records as a zone file |
| `source-snapshot/` | Full copy of the code |
| `migrations/` | Database schema, in order |
| `scripts/` | Owner promotion, cosmetic grants, test cleanup, this folder's refresh |

**No secrets or passwords are in this folder, deliberately.** A recovery folder
containing its own keys is a folder you cannot safely put anywhere - including
in the OneDrive that makes it survive.

**These two guides are deliberately not in the git repository either**, because
that repository is public. They map the infrastructure, and while nothing in
them is a credential, a map is still worth more to a stranger than to you.
