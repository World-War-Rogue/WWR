# Infrastructure reference

Every service, identifier and setting in one place. No secrets - those are
listed by name only, with where to get a new one.

Last updated: 12 September 2026 (registrar corrected: Squarespace, not Cloudflare)

---

## Identifiers

| Thing | Value |
| :--- | :--- |
| Cloudflare account ID | `77c37c18b39214ae0a14b887daed118f` |
| Worker service name | `wwr` |
| Worker dev URL | `https://wwr.shy-mouse-f4e2.workers.dev` |
| D1 database name | `wwr-db` |
| D1 database ID | `b4742b18-4dd7-408e-b692-c54d5919a0b2` |
| GitHub repo | `github.com/mattr-source/WWR` - **public** (moved from the World-War-Rogue org on 12 Sep 2026; the old URL redirects) |
| GitHub org | none - the `World-War-Rogue` org is now empty and can be deleted |
| GitHub user | `mattr-source` (support@logiccompass.co) - all three companies' repos live here now |
| Git commit identity | `world-war-rogue-dev <support@worldwarrogue.com>` |
| Live site | `https://worldwarrogue.com` |
| Local working copy | `C:\Users\mattr\OneDrive\Desktop\WORLD WAR ROGUE` |

**The repository is public.** Nothing in it is a credential - that has been
checked - and the design does not rely on the server code being hidden, since
every rule that matters is enforced in the database or the Worker rather than by
obscurity. But it does mean anyone can read exactly how validation works, and
that the game's design documents are readable too. Making it private is a
two-click change in the repository's settings if you would rather it were.

---

## Secrets and variables

**Secrets** - set with `npx wrangler secret put NAME`, never readable back:

| Name | What it is | Where to get another |
| :--- | :--- | :--- |
| `RESEND_API_KEY` | Sends all game email | resend.com -> API keys -> create |

**Variables** - in `wrangler.jsonc`, deployed with the code:

| Name | Value | What it does |
| :--- | :--- | :--- |
| `DEBUG_ERRORS` | `off` | When `on`, returns internal exception text to the browser. Turn it on for one deploy when a 500 has no obvious cause, then turn it back off |
| `MAIL_FROM` | *(default)* | `World War Rogue <noreply@worldwarrogue.com>` |
| `OWNER_EMAIL` | *(default)* | `support@worldwarrogue.com` - where approval requests go |

There is no `ADMIN_KEY`. It was removed and replaced by an owner role on the
account, because a key in a query string ends up in browser history and logs.

---

## Bindings

| Binding | Resource |
| :--- | :--- |
| `env.DB` | D1 database `wwr-db` |
| `env.ASSETS` | The built client in `dist/` |
| `env.AI` | Workers AI, used only to translate chat |

`assets.run_worker_first` is `["/api/*"]`. This is load-bearing: without it,
`not_found_handling: single-page-application` answers API calls with
`index.html` and a 200 status.

`env.AI` is optional in the code. Every translation failure is swallowed and the
message simply shows in its original language, so removing the binding or losing
the model degrades chat instead of breaking it.

---

## Database

Twelve migrations, applied in order by `npm run db:migrate`:

| File | What it adds |
| :--- | :--- |
| `0001_init.sql` | players, sessions, bases, buildings, build_jobs |
| `0002_world.sql` | worlds, world_admissions, placements, skins |
| `0003_signups.sql` | access requests, profile fields on players |
| `0004_roles.sql` | the `role` column and owner rights |
| `0005_cosmetics.sql` | cosmetic ownership, equipped loadout on bases |
| `0006_exclusive.sql` | one-of-one items, enforced by a partial unique index |
| `0007_profile.sql` | portrait glyph, tint and motto on players |
| `0008_portraits.sql` | uploaded player portraits |
| `0009_alliances.sql` | alliances, membership with ranks, applications |
| `0010_crests.sql` | alliance crests and crest tint |
| `0011_chat.sql` | messages, channel_reads, dm_threads |
| `0012_groups_translation.sql` | chat_groups, chat_group_members, message_translations |

`npm run db:status` shows what the remote database has actually applied.

**Design rules to preserve if you rewrite any of it:**

Timers are absolute completion instants, never remaining durations. A client
cannot shorten one by lying about its clock, and nothing is lost on restart.

State is settled on read. Nothing ticks in the background: reading a base
applies any upgrade whose completion instant has passed, then credits production
from that instant. A world nobody is playing costs nothing to run.

Uniqueness is an index, never a read-then-write. Plot occupancy, alliance tags,
one-alliance-per-player and one-owner-per-exclusive-item are all decided by the
database. Two players acting in the same instant would both pass a check.

Power is computed from building levels on every read and never stored. A stored
figure drifts out of step with the base it describes, and it is the number other
players decide to attack on.

Images are served from endpoints, never inlined into list payloads. A
hundred-member roster carrying base64 portraits is two megabytes of JSON before
the first name appears.

Channel access is checked on reads as well as writes. A player removed from an
alliance stops being able to read its history within one poll, not merely to
post to it.

Translations are cached per message per target language. A message read by
twenty people in the same language is translated once, which is the difference
between chat costing pennies and costing real money.

---

## World shape

| Setting | Value | Why |
| :--- | :--- | :--- |
| Plot size | 4x4 tiles | One base per plot |
| World extent | 200 plots | +/-200 on both axes: 401x401 plots |
| Players per world | 1000 | New arrivals open a new world when full |
| Target occupancy | 12% | Dense enough for neighbours, open enough to move |
| Salt flats radius | 20 plots | Nobody is placed here - contested centre |
| Alliance capacity | 100 | A cap is what makes an alliance a choice |
| Lieutenants per alliance | 10 | Plus the general |
| Group chat capacity | 20 | Anyone inside may add, up to the cap |
| Chat retention | 14 days | Messages older than this are dropped |
| Strategic zoom | below 42px/plot | Bases become allegiance colours |
| Home zoom | 94px/plot | Where the map opens and Home returns to |

Sized so eight worlds meeting for a battle event - 8000 bases - still leave open
ground. Worlds are numbered from 1001.

---

## Alliance ranks

Stored as `leader`, `officer`, `member`. Shown as **General**, **Lieutenant**,
**Soldier**. The stored values were deliberately left alone when the labels were
renamed, so the rename touched one lookup table rather than every query and a
migration.

---

## Map colours

| Colour | Meaning |
| :--- | :--- |
| Magenta | You |
| Green | Your alliance |
| Gold | Your server, outside your alliance |
| Blue | Another server |
| Red | At war |

Separated by brightness as well as hue, because hue alone does not survive a dim
screen or a colour-blind player, and this is the one place in the game where
misreading a colour loses a battle. Allegiance is decided by **home world**, not
the world a base stands in.

---

## Chat

| Channel | Who can read and post |
| :--- | :--- |
| Server | Everyone admitted to that world |
| Alliance | Members of that alliance |
| Leadership | The general and the lieutenants only |
| Direct | The two players in the thread |
| Group | The named members, up to 20 |

Polled on a `since` cursor rather than held open: a Worker cannot keep a
connection, so the client asks every 4 seconds while chat is open and every 25
seconds while it is collapsed. Durable Objects are the upgrade path if that ever
needs to become real-time.

Translation is Workers AI, `@cf/meta/m2m100-1.2b`, into each player's chosen
language, capped at eight new translations per request. The original is always
shown, with the translation beneath it.

---

## Email

Sending is Resend, on the root domain, from `noreply@worldwarrogue.com`.
Approval requests go to `support@worldwarrogue.com`.

Receiving is Google Workspace, unchanged, on the root `MX` at priority 1.

**The two must not be confused.** Resend also offers an inbound `MX` on the root
at priority 0. Adding it would outrank Google and silently stop all mail to
support@worldwarrogue.com. It is not needed for sending and must never be added.

---

## Commands

```powershell
npm run db:status     # what the remote database has applied
npm run db:migrate    # apply pending migrations - ALWAYS before deploying
npm run lint          # type-check client and worker separately
npm run build         # build the client into dist/ - ALWAYS before deploying
npx wrangler deploy   # publish in seconds, skipping the CI queue
npx wrangler tail     # stream live logs from the running Worker
npx wrangler secret list
npm run recovery      # rebuild the recovery folder from the current commit
```

Pushing to `main` also triggers a Cloudflare build, but that queue has sat for
fifteen minutes. Deploy directly when you need it live now.

---

## Accounts and their reach

| Service | Sign-in | Controls |
| :--- | :--- | :--- |
| Squarespace Domains | support@worldwarrogue.com (Sign in with Google) | The domain registration (renews 3 Sep 2027). Squarespace 2FA and account recovery were both Off on 12 Sep 2026; the Google account's 2FA is the real lock |
| Cloudflare | support@worldwarrogue.com | DNS, Worker, D1, the live site |
| Cloudflare (second) | richmatt85@gmail.com | Same - Super Administrator, invited |
| GitHub | mattr-source (support@logiccompass.co) | The code |
| Resend | support@worldwarrogue.com | Email sending |
| Google Workspace | support@worldwarrogue.com | Mail for the domain |
| OneDrive | Microsoft account on this PC | The working copy and this folder |

**Cloudflare is the single point of failure**, and three of the four original
accounts sign in through an address that depends on DNS it serves.

**Open, in order of how much it matters:**

1. ~~Two-factor is off on both Cloudflare logins.~~ Turned on for
   support@worldwarrogue.com (confirmed by Matt, 12 Sep 2026). Still confirm it
   on the richmatt85@gmail.com login. Backup codes off this machine.
2. **The Gmail invite may still be Pending.** It is not a second door until it
   is accepted.
