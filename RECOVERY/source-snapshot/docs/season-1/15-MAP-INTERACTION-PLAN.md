# Map interaction and Alliance UI — implementation plan

PLAN AND BLOCKERS — NO CODE WRITTEN

Folds tile confirmation, Alliance Operations and on-base reinforcement into the
Season 1 plan. Read against the live repository at `705098b`.

---

## 0. What the code already does, and what it does not

Four findings shape everything below. Two are better news than expected.

### The overlap is real, and it is a stacking accident

`src/live/WorldMap.tsx:1430` puts the selection panel at
`absolute inset-x-3 bottom-16 … sm:right-3 sm:w-80`. The zoom and RV cluster is
`absolute bottom-16 left-3` (`:1259`). Reports and Home are
`absolute bottom-16 right-3` (`:1294`).

**All three sit in the same band, none of them declares a z-index, and the panel
comes later in the DOM — so it wins.** On a phone `inset-x-3` makes it full
width, so it covers the zoom cluster on the left *and* the Reports/Home stack on
the right. The buttons underneath are still `pointer-events-auto`; they are
simply buried. At `sm` and up it narrows to `right-3 w-80` and lands squarely on
Reports and Home.

So this is not a spacing tweak. The fix is to stop putting plot actions in a
bottom drawer at all — which is what the brief asks for anyway.

### Alliance Operations needs almost no new data

`pendingMarches` (`worker/march.ts:61-77`) bounds only on world and unresolved:

```sql
WHERE m.world_id = ?1 AND m.resolved_at IS NULL
ORDER BY m.arrives_at ASC
LIMIT 200
```

**No player bound, no viewport bound.** Every client already receives every
march in the world — including strangers attacking strangers — with `mine` and
`incoming` computed per viewer. So Under Fire and Allied Assaults reveal nothing
that is not already on the wire, and the feature is mostly a read over data the
client holds.

Two caveats. The 200 cap is ordered by soonest arrival, so at scale an ally's
attack could fall off the end — fine for a closed beta, not fine at a thousand
players. And "do not reveal protected enemy destinations" is currently vacuous:
there is no detection system and every march is public, by the same rule that
makes a march public in both directions.

### Reinforcement has no endpoint of its own, and does not need one

There is no reinforce route and no ally picker. Reinforcing is
`POST /api/attack` aimed at an ally's plot; the server resolves the target
player *from the plot*, reads both alliances itself, and picks the kind
(`worker/index.ts:1107-1115`). The client's `allied` flag decides a button label
and nothing else — the comment at `:1067` says so explicitly.

That is exactly the shape this brief needs. "Send Reinforcements" from a list is
the same call with the ally's coordinates, so the list cannot lie about who it is
helping.

### The world is never polled

`WorldMap.tsx:642-647` refetches only on camera change, canvas resize, or after a
mutation, with a 180 ms debounce and backoff on failure. **A player who does not
touch the map never learns anything new.**

That is the central problem for Under Fire, which is time-critical by definition.
See §3.

---

## 1. The layout, fixed once

### Plot actions leave the bottom band entirely

The selected plot gets a **compact callout anchored beside it**, not a drawer.
The plot's screen position is already computed by the camera transform, so the
callout is positioned from it and tracks while panning.

It must be a **DOM overlay, not canvas text**. Nineteen languages, tap targets
and focus states all argue the same way, and the map's own painters currently
hardcode English (`'RV'`) precisely because canvas has no good answer for this.

Edge behaviour: flip to whichever side has room, clamp inside the map, and never
resolve into the space reserved for fixed controls. On a narrow screen it sits
above or below the plot rather than beside it.

### One declared layer order

Today the panel wins by DOM accident, chat and the squad sheet are both `z-40`,
and the control clusters declare nothing. With chat across the bottom, the
navigation row above it, map controls above that, and now anchored callouts and
Alliance Operations, this recurs unless it is written down once:

| Layer | z | What |
| :--- | ---: | :--- |
| Map canvas | 0 | terrain, bases, marches |
| Anchored callouts | 20 | plot label, ally card, reinforcement popup |
| Fixed map controls | 30 | zoom, RV, Reports, Home, Alliance Operations |
| Navigation row | 40 | the five primary tabs |
| Chat bar | 50 | across the bottom |
| Modals | 60 | full-screen sheets |

**Controls outrank callouts deliberately.** If a callout would cover Home or
Reports it repositions; it never wins the argument. That single rule is what the
first human check is testing.

---

## 2. Tile selection and confirmation

**First tap** selects: the existing dashed ring stays, and a compact anchored
label appears carrying coordinates and status — `Open Ground · -26, 10`. No
panel, nothing over the fixed controls.

**Second tap** confirms, on the action shown at that same plot: `Move Here`, or
`Set Rendezvous Here` for a General or Lieutenant.

Unavailable states render in the same label rather than as an error after the
fact: `Unavailable: occupied`, `Unavailable: obstructed ground`, `Unavailable:
outside relocation range`.

Three small gaps to close while here: tapping empty space does not currently
clear the selection; the selection ring is drawn *before* bases so art paints
over its interior; and there is no relocation range rule at all today, so
`outside relocation range` has nothing behind it — see blocker 4.

### What is already correct

Most of the authority the brief asks for exists.

- **Move revalidates at the write.** `tryPlace` claims by upsert and the unique
  index `idx_placements_plot` rejects a taken plot, so two players confirming the
  same instant are separated by the database rather than by a check.
- **Rendezvous permission is read from `alliance_members` on every call**
  (`worker/index.ts:801-806`), never from the request, so a leadership change
  between selection and confirmation is already revalidated. `maySetRally` in the
  payload gates the button as a courtesy only.
- **A squad out blocks relocation** (`worker/index.ts:783-786`).

Added: the obstruction check from `14-TERRAIN-PROPS-PLAN.md`, and a message
**key** rather than an English sentence — the door already ships about fourteen
formed sentences from the Worker and that is the only English a non-English
speaker meets, so a new message starts right.

---

## 3. Alliance Operations

Two fixed buttons on the right, **above** Reports and Home with reserved
spacing, at the controls layer so nothing can cover them.

### One data source for two features, and it already has a home

Under Fire is time-critical and the world is never polled. The answer is not a
new timer: the **defender's countdown strip**, already decided on 2026-09-05, was
specified to hang off the chat poll — 4 s open, 25 s collapsed — precisely
because that cadence is already tuned against a real cost.

Under Fire is the alliance-wide version of the same question. So both read one
small `GET /api/ops` payload on that same schedule:

- your own inbound hostile marches — the strip
- your alliance's inbound hostile marches — Under Fire
- your alliance's outbound attacks — Allied Assaults

Alliance-scoped, not filtered from the world payload, so the 200-march cap cannot
silently truncate an ally under attack. One poll, two features, no new cadence.

### The lists

Under Fire sorts by earliest impact; Allied Assaults by nearest settlement, both
server-side. Entries carry the ally, the target, coordinates, and time to impact
or battle state, plus `Locate` and the contextual action.

`Locate` centres the camera and opens the same anchored card — one card
implementation, reached two ways.

No alliance means no badge and a `Join an Alliance` explanation. Leaving an
alliance ends access to its operational data on the next read, which matches how
channel access is already checked on reads as well as writes.

Badges stay restrained and reuse the player's existing hostile-alert settings.
No new sound, no new flash.

---

## 4. Allied base card and reinforcement

Tapping an allied base opens the anchored card — member, tag and role, base name,
status, coordinates, `Send Reinforcements`, and `Locate` when reached from a
list. It points at the base with a connector so the association is unambiguous.

`Send Reinforcements` opens a second anchored popup at the same base: the four
squads, each with readiness, effective Season power, location, estimated arrival,
and why it is unavailable if it is. Select a squad, then confirm — two deliberate
steps, both beside the base.

### What the popup can honestly show, and when

| Field | Available |
| :--- | :--- |
| Squad, filled slots, raw power | now — `GET /api/squads` |
| Away / returning / empty | now — `deployments` |
| Estimated arrival | now — `marchSeconds()` in `shared/march.ts`, client-estimated, server-decided |
| Already reinforcing this ally | now — the unique index knows, so the UI should too |
| **Effective Season power** | needs the season spine, Stage 2 |
| **Recovering** | needs PvP recovery, later stage |

So the popup ships useful and gains two fields as those stages land. Worth saying
rather than discovering.

**One thing the brief implies and does not resolve:** a garrison only helps if it
arrives before the battle settles. Sending Bravo on a ten-minute march to an ally
who is hit in two minutes does nothing except take Bravo off the board. The popup
knows both numbers, so it should say so — `Arrives 8 min after impact` — rather
than letting a player find out from the report.

Anti-abuse is already structural: reinforcement moves no currency and no
resources, same-alliance marches resolve as garrison rather than battle, and
`idx_marches_one_reinforcement` caps one reinforcement per teammate — not per
player, so four squads cannot stack on whoever is being hit.

---

## 5. Revalidation at confirmation

Everything the brief asks for revalidates on the same call that acts, because the
data is read server-side at that moment:

| Risk | Guard |
| :--- | :--- |
| Plot taken between select and confirm | unique index on the placement write |
| Plot obstructed | `blockedAt()` recomputed from the stored seed |
| Lost rally permission | rank read from `alliance_members` per call |
| Squad became unavailable | `marchingSquads` in `launch()` |
| Already reinforcing that ally | unique partial index |
| Ally relocated, resolved, or left the alliance | target resolved from the plot, alliances read at launch |
| Player has no base yet | checked before anything else |

The pattern throughout is the one this codebase already commits to: **uniqueness
is an index, not a check.** A prop-obstruction test is a check and cannot replace
the index; it sits alongside it.

---

## 6. Where this lands

This is map interaction, so it belongs with the map work rather than after it.

- **Stage 1** (terrain) absorbs the anchored-callout layer and the z-order,
  because the same code positions props, selection and callouts against the
  camera transform, and because the overlap bug is live now.
- **Stage 2** (season spine) adds effective Season power to the popup.
- **Alliance Operations** rides the chat poll and can ship with the defender's
  strip as one piece of work, which is the sequencing that avoids building the
  same poll twice.

Human checks 1, 2, 7, 8, 9 and 12 are testable at the end of Stage 1. Checks 5
and 6 need a second account with an active march. Check 3 needs two accounts at
different ranks. Checks 4, 10 and 11 are races and are worth doing by hand,
because the failure they look for is a stale client being trusted.

---

## 7. Blocking questions

**1. What does `Join Assault` actually do?** It is listed as an action on Allied
Assaults, but there is no multi-player attack in the game — "can several players
attack one base together?" is still open in `docs/COMBAT.md` §10, and it is
described there as a large addition to both the resolver and the report. Two
readings: it means "send your own separate attack at the same target", which
exists today and is really a `Locate` plus an ordinary attack; or it means
coordinated combat, which is a resolver change and not Season 1 scope. I read it
as the first. Confirm, because the second changes the combat system.

**2. Where does the base name come from?** The card asks for one. `bases.name`
exists in the schema but is not in the world payload — the selection panel
currently shows the *skin* name instead (`skinSpec(...).name`). Adding the real
name is a payload field; using the skin name is free and already there. I would
send the real name.

**3. Does an anchored callout track the plot while panning, or close?** Tracking
is nicer and cheap, since the map already re-renders on camera change. Closing is
simpler and avoids a callout sliding under a control. I lean tracking, with the
clamp rule from §1.

**4. Is there a relocation range limit?** `Unavailable: outside relocation range`
is given as an example state, but there is no distance rule in `handleMove`
today — a player can jump anywhere on the map for free, and the only restriction
is that no squad is out. Is a range limit intended, or was that example
aspirational? It matters beyond the label: unrestricted relocation is what makes
"jump 300 plots after being attacked" possible, which is the reason the
squad-out rule exists at all.

---

## 8. What this does not change

No new polling cadence. No background jobs. No client-decided availability or
permission. No change to march paths, timing, combat or detection. And no
currency or resource movement between allies — reinforcement stays a loan of
force, not a transfer of anything.
