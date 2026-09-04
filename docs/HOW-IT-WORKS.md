# How the game actually works

The other documents in this folder describe what the game was meant to be. This
one describes what it is, as of the commit it ships with, and is the one to
trust when the two disagree.

---

## Shape

One Cloudflare Worker answers `/api/*`; everything else is a static file from
the built client. `run_worker_first: ["/api/*"]` in `wrangler.jsonc` is what
makes that split happen - without it the single-page-app fallback answers API
calls with `index.html` and a 200, and the API appears broken for no visible
reason.

```
browser ──/api/*──> worker/index.ts ──> D1 (wwr-db)
        └─anything else─> dist/ (static assets binding)
```

There is no second service, no queue, no cron, and nothing that runs when
nobody is playing.

## Where things live

| Path | What it is |
| :--- | :--- |
| `worker/index.ts` | Every route, and the state that belongs to no one module |
| `worker/auth.ts` | Password hashing, sessions, the session cookie |
| `worker/signup.ts` | Access requests and the approval email |
| `worker/admin.ts` | The owner's approval page |
| `worker/game.ts` | Base state, build timers, production, power |
| `worker/world.ts` | Placement, movement, world admission |
| `worker/alliance.ts` | Membership, roster, ranks, applications |
| `worker/chat.ts` | Channel access, reads, translation |
| `worker/profile.ts` | Profiles, uploaded portraits, image responses |
| `worker/cosmetics.ts` | Ownership and equipping |
| `shared/` | Catalogues both sides import - see below |
| `src/live/` | The live client |
| `src/net/api.ts` | The only place the client talks to the server |
| `src/components/`, `src/data/` | The earlier offline prototype |
| `tools/skinforge/` | Turns reference art into a base skin |

**`shared/` is the load-bearing idea.** `cosmetics.ts`, `alliances.ts`,
`chat.ts` and `portraits.ts` are imported by the Worker *and* the client, so a
price, a rank label, a channel key or an upload limit exists once. They must
stay data only - no DOM, no Worker APIs - or one side stops compiling.

## The rule everything follows

The server decides everything. Anything the browser can compute, a player can
edit.

**Timers are absolute completion instants.** A build job stores when it will
finish, not how long is left. A client lying about its clock cannot shorten one,
and a restart loses nothing.

**State is settled on read.** Reading a base applies any upgrade whose instant
has passed, then credits production from that instant forward. Nothing ticks in
the background.

**Uniqueness is an index.** Plot occupancy, alliance tags, one-alliance-per-
player and one-owner-per-exclusive-item are all decided by the database, because
two players acting in the same instant would both pass a read-then-write check.

**Power is computed on every read and never stored.** It weights building types
unequally and rises superlinearly with level, so a stored copy would drift from
the base it describes - and it is the number other players decide to attack on.

**Images come from endpoints.** `/api/portrait` and `/api/alliance/crest` serve
them with an ETag of `updated_at` and `Cache-Control: private`. Inlining them
into a roster would ship megabytes of base64 before the first name appeared.

## Getting in

Access is closed. A visitor requests it with an email and a callsign; the owner
gets an email with approve and decline links carrying a one-time token; approval
creates the account and admits it to a world.

The request endpoint answers identically whether the email is already known or
not, which is deliberate and means testing the mailer with an address that has
already signed up proves nothing. Use a fresh plus-address.

Owner rights can only be granted with database access - `scripts/promote_owner.sql`.
There is no way to promote an account from inside the game, so a compromised
account cannot promote itself.

## The world

Bases stand on 4x4-tile plots in a 401x401-plot world, 1000 players per world,
worlds numbered from 1001. New arrivals open a new world when one fills. A
20-plot radius at the centre - the salt flats - is left empty, so the middle of
the map is contested ground rather than someone's home.

The map is a canvas. Terrain is generated deterministically from the world seed,
so it needs no storage and every player sees the same ground. Bases are painted
in `y` order, because once art stands taller than its plot a northern base drawn
late would cover the one in front of it.

Zoom decides what a base looks like. Below 42px per plot the art is replaced by
a solid allegiance colour filling the whole plot; above it, the skin is drawn.
The Home button returns to 94px per plot centred on your own base, which is also
where the map opens.

| Colour | Meaning |
| :--- | :--- |
| Magenta | You |
| Green | Your alliance |
| Gold | Your server, outside your alliance |
| Blue | Another server |
| Red | At war |

Allegiance is decided by **home world**, not by the world a base is standing in.
The colours are separated by brightness as well as hue, because hue alone does
not survive a dim screen or a colour-blind player.

Nameplates are drawn in a single pass after every base, anchored to the bottom
edge of the plot and sitting just inside it, so a name is never hidden by a
taller neighbour and every name sits at the same height whatever its skin does.
The plate is opaque and capped at the plot's width, with long callsigns
ellipsised, so it stays readable over any skin and never spills onto a
neighbouring plot.

## Cosmetics

A base wears one **skin** plus four accessory slots - banner, emblem, lights,
decal - which multiply out to over two thousand combinations. Free items have a
price of zero and need no ownership row; anything else is checked against
ownership on equip.

Some items are **one-of-one**: a partial unique index means the database, not
the code, guarantees only one account can own one.

Skins with art are rendered from a WebP atlas with code-driven motion, drawn
wider than their plot so they read as objects rather than tiles.
`docs/SKIN-ART-SPEC.md` covers what new art has to be. The one thing that
catches people: reference art must be generated isolated on a plain light
background, because the cutout tool floods inward from the edges and will eat a
dark subject sitting on a dark background.

`ALL_SKINS_UNLOCKED` in `worker/game.ts` is currently `true` for testing. See
`CLAUDE.md` before turning it off.

## Alliances

Up to 100 members. Ranks are stored as `leader` / `officer` / `member` and shown
as **General** / **Lieutenant** / **Soldier** - the stored values were left
alone when the labels were renamed, so the rename touched one lookup table
instead of every query. One general, at most ten lieutenants.

Tags are 2-4 letters and unique by index. A player belongs to one alliance,
also by index. Ranks can only act downward: a lieutenant cannot touch another
lieutenant or the general.

The roster is two queries - members, then all their buildings - not one query
per member, because power is recomputed for everyone on every read.

## Chat

| Channel | Who can read and post |
| :--- | :--- |
| Server | Everyone admitted to that world |
| Alliance | Members of that alliance |
| Leadership | The general and the lieutenants only |
| Direct | The two players in the thread |
| Group | The named members, up to 20; anyone inside may add |

Access is resolved **on reads as well as writes**, so leaving an alliance ends
access to its history within one poll rather than only stopping new posts.

A Worker cannot hold a connection, so the client polls on a `since` cursor -
every 4 seconds with chat open, every 25 collapsed. Durable Objects are the
upgrade path if this ever has to be real-time.

Messages are kept 14 days and capped at 400 characters. The collapsed bar shows
the newest message in whichever channel was open last - not the last thing you
typed.

Translation is Workers AI (`@cf/meta/m2m100-1.2b`) into each player's chosen
language, cached per message per language so a message read by twenty people is
translated once, and capped at eight new translations per request. Every failure
is swallowed: a model outage shows messages untranslated rather than breaking
chat. The original is always shown, with the translation beneath it.

## Not built

Combat, troops, heroes, monetization. No filtering on player-authored text -
callsigns, alliance names and descriptions, mottos, group names, messages - and
no block, mute or report in chat. Both are needed before the game is open to
people who are not friends.
