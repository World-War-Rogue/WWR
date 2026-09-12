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

**Four gaps in this, found 2026-09-05 and all still open.**

*There is no password reset.* The Gate has a request-access link and nothing
else. The owner locked himself out of MattofWar and the only route back was
copying a `password_hash` out of a throwaway `signups` row in D1. Every approved
player is one forgotten password from the same position, and the way out runs
through someone with database access. This belongs above the store on the
roadmap.

*`signups` stores a working `password_hash` before approval.* A pending
request-access row carries a live credential for an account nobody has vetted.
Fine while the owner is the only reader of that table; not fine when signups
open to strangers. Same bucket as text filtering.

*Nothing invalidates sessions when a password changes.* Irrelevant for a
forgotten password, decisive for a compromised one.

*A successful access request shows no confirmation.* The form empties and says
nothing, so a real applicant cannot tell it worked and will either submit twice
or give up. Same screen as the Gate i18n work - fix them together.

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

The **Squads** button is top left of the world map, and opens the squad editor.
The marches panel with Recall appears only when a squad is away, so it remains
untested.

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

**The poll overlaps the last 60 seconds.** A translation is written after the
message row it belongs to, so a cursor that had already moved past a message
meant its translation never arrived - the reader kept the untranslated copy
permanently, and closing and reopening the panel was the only way out.
`readChannel` floors its query at `min(since, now - REDELIVERY_WINDOW_MS)`, so a
message inside the window comes back on every poll until it falls out of it. The
cursor still advances to the newest instant; the window is a floor on what is
returned, not a change to the cursor.

**The client therefore upserts by id, never appends.** Re-delivery replaces a
message in place. It also returns the array it was given when nothing changed,
because the auto-scroll effect keys off `messages` and a new array every four
seconds would drag the view to the bottom while someone reads back through
history. Anything else keyed to a message arriving must key to *first* arrival
for the same reason - a re-delivered mention that pings twice looks correct
right up until it happens.

Unread badges and mention pings were checked against this and are already safe:
unread is counted server-side from `channel_reads.last_read_at`, and mentions
come from `message_mentions`, cleared explicitly. Neither keys off arrival.

60 seconds is a guess at the translation tail, not a measurement. If
translations routinely take longer the window silently stops helping, so log the
gap between `messages.created_at` and the translation write before trusting the
number.

Messages are kept 14 days and capped at 400 characters. The collapsed bar shows
the newest message in whichever channel was open last - not the last thing you
typed.

Translation is Workers AI (`@cf/meta/m2m100-1.2b`) into each player's chosen
language, cached per message per language so a message read by twenty people is
translated once, and capped at eight new translations per request. Every failure
is swallowed: a model outage shows messages untranslated rather than breaking
chat. The original is always shown, with the translation beneath it.

A message in a language the reader does not read, with no translation yet, says
`Translating...` rather than presenting the original as final. Some message
always falls outside the window whatever the window is, and the absence of this
line is why a bug report about untranslated chat - written in Korean, in chat -
sat unread.

**Two known quality problems, neither of them delivery.**

The model handles a bare imperative and loses anything with a clause in it.
"You have to turn the chat off and on again for it to translate." came back as
"Open the chat and translate it again." The failures are fluent English, so
nothing about them looks like a failure. That is a quality ceiling, not a bug,
and it matters because cross-language play is the differentiator the game is
built on. Worth doing before relying on it further: translate twenty real
messages from existing history and have a speaker of each language mark them
right or wrong. Chat is the only per-message ongoing cost in the system, so a
model change has a price attached and should be decided with numbers.

The classifier is wrong in both directions - a plainly English message stored as
`de` was round-tripped through the translator and rendered in translation
styling. This is the third distinct failure of the same component: it previously
stored the author's reading preference instead of the language they typed, then
failed on Spanish function words. Cheap mitigation, worth doing regardless
because it also catches the model no-oping: discard a translation that comes
back near-identical to its source. The real fix is classifier reliability, which
is its own investigation.

## Operating it

**Confirm D1 writes with a read.** A write returned `code: 7403` and a read
seconds later showed it had not happened; a retry worked. wrangler prints a loud
error, so the risk is not missing the failure - it is assuming a write landed
because the command exited. Anything that matters gets a `SELECT` after it.

**`wrangler d1 execute --file` prints only a summary.** The verification
`SELECT` at the end of a script never displays, so a check written into the file
does not actually surface - `grant_shellwarden.sql` ends with one and it has
never been seen. Run the check as a separate `--command`.

GrandpaWhale already owned `shellwarden`, granted 02:13 UTC on 2026-09-05, which
is why re-running that script reported 0 rows written. The grant is applied.

## Decided, not built

**The defender's countdown does not live on the map.** A player about to be hit
may be in Customise, Chat or Squads, so a red column on the map warns only
whoever happens to be looking at the right screen - that is something you can
discover, not a warning.

It goes above the screen router: a thin strip present on every screen, rendered
only when something hostile is inbound, showing the count and the soonest
arrival, expanding on click. It is not the squads panel, it is not about your own
squads, and no number goes back on the map.

**Hostile only.** Ally reinforcements are also inbound and also not your squads,
and it is tempting to reuse the container. Don't: once the strip can mean "a
friend is helping", it stops being scannable and the one alert channel has been
spent on something that is not an alert.

It takes an absolute arrival instant and counts down client-side, like every
other timer, and it hangs off the chat poll rather than adding one - 4s open,
25s collapsed is already tuned against a real cost.

The part worth keeping: the strip hitting zero is exactly when the battle can be
settled, and battles are settled by whoever looks next. Today a defender who is
not watching the map has no prompt at all and the battle sits unresolved until
someone wanders past. The same component fixes the notification gap and the
settling gap.

Still open, and a design call rather than a technical one: whether the attacker
knows the defender can see the clock. Visible incoming timers are the genre norm
and make defence a real decision rather than a coin flip, but they also mean no
attack ever surprises anyone. Settle it before building, because it decides
whether this is a warning system or a scoreboard.

## Not built

Combat, troops, heroes, monetization. No filtering on player-authored text -
callsigns, alliance names and descriptions, mottos, group names, messages - and
no block, mute or report in chat. Both are needed before the game is open to
people who are not friends.
