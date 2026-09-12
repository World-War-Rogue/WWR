# Buildings, buffs, alliance operations and Alloy — implementation plan

Response to the designer brief of 2026-09-06. Read the brief first; this does
not repeat it.

The short version: **stage 1 is buildable this week and worth doing. Stages 3,
4 and 5 have no source of supply, because every one of them is earned from a
Season 1 Operations system that has not been built.** That is the thing to
settle before anything else here is approved.

---

## 0. Three things to settle before the plan reads properly

### 0.1 Three of the five stages depend on a system that does not exist

The brief's own build order is right, and stages 3–5 are each gated on
something the game cannot currently produce:

| Stage | What it needs | Does it exist? |
| :--- | :--- | :--- |
| 3. Alloy | "Daily Field Salvage objective", "Convoy Ambush", "Factory/Garrison Defense", "weekly seasonal participation mission" | **No.** None of these exist. |
| 4. Field Orders | "completing the daily Operation objective" | **No.** |
| 5. Alliance Operations | "one designated map/event support action in that cycle" | **No.** |

There is no `seasons` table, no `season_objectives`, no ownership event log and
no daily operation. Migrations stop at 0020 and none of them is seasonal. The
Season 1 plan calls this **Stage A** (the season skeleton) and **Stage B** (the
Boot Sequence, which is where daily objectives come from), and neither is built.

So the honest ordering is: **Season 1 Stage A and B come before stages 3, 4 and
5 of this brief.** Building the Alloy ledger first gives us a currency with a
sink and no faucet, which is the same shape as the bug the brief is written to
fix.

What can be built now, in order, is:

1. This brief's stage 1 — logistics facilities, correct descriptions, power
   weights. No new dependencies at all.
2. This brief's stage 2 — building visual stages, **once there is a Base screen
   to draw them on.** See 0.2.
3. Season 1 Stage A and B.
4. Then Alloy, Field Orders and Alliance Operations, in the brief's order.

### 0.2 There is no Base screen. The 42 cutouts have nowhere to go

The brief specifies seven visual stages per building on "the detailed Base
screen". **That screen does not exist.** The live base view is a menu: a
resource bar, a build queue, and a list of buildings as rows of text. There is
no art on it, no isometric view, no place a building is drawn at all.

`src/components/BaseInternalView.tsx`, `BaseExternalView.tsx` and
`BaseBuildingView.tsx` exist in the repo and look like exactly what is wanted —
but they are **dead code**. `main.tsx` renders `LiveApp`, not `App`, and nothing
in `src/live/` imports them. They are pre-build design fiction.

So stage 2 is really two projects: build a base screen that draws buildings, and
then commission 42 cutouts for it. The art is the smaller half. I would rather
say that now than have 42 pieces of art arrive against a screen that cannot show
them — which is exactly what happened in reverse with the terrain batch, where
the art was right and the pipeline had to be written to receive it.

**The map silhouettes are different and cheaper.** Four Command Post-led stages
at 40px, drawn into the existing base-skin renderer, are buildable immediately
and would be the first visible sign that a building level means anything.

### 0.3 Alloy at Rank 5 and Rank 10 gates the thing we just shipped

Season 1 caps Service Rank at 10. The brief puts Alloy costs at **Rank 5 (30)
and Rank 10 (90)** per asset. Applied today, every tester stops at Rank 4 and
cannot pass, because Alloy has no source.

That is fine as a *design* — it is a good gate — but it means Alloy costs cannot
ship before Alloy income, not even briefly. They go in the same deploy or the
upgrade path we just built stops working.

**Arithmetic worth having before that deploy.** At the brief's own cap of 330
Alloy per week over a ten-week season, a player earns **3,300**. A fully
refitted Rank-10 asset costs 200. The three facility milestones cost 160. So a
maximally active player refits **15 or 16 assets of their 24** in a season, and
only if they never miss a day.

I read that as intended — it forces a choice about which assets matter, which is
the same job the removed lift budget used to do. But it is worth stating plainly
because it is a large behavioural change to a system where, since yesterday,
everything is available from day one. **Confirm it is intended.**

---

## 1. Logistics facilities — buildable now, and it fixes a live bug

### The change

`marchSeconds(plots, slowestMobility)` stays exactly as it is. What changes is
what is handed to it.

Today, at `worker/march.ts:216`:

```ts
const slowest = Math.min(
  ...units.map((u) => attributeAtLevel(asset.attributes.mobility, u.level)),
);
```

That has **two** faults, and the brief only names one.

**Fault one, the brief's:** no facility modifier. Fixed by the brief's formula,
applied per asset by category.

**Fault two, which nobody has noticed yet: the Propulsion package does not
affect march speed.** The line reads `attributeAtLevel(...)`, which is Service
Rank only. It does not go through `attributesWith`, so a player who buys
Propulsion sees their combat mobility rise and their marches take exactly as
long as before. That is a live bug in the feature shipped yesterday, and it is
the same class as packages not reaching the resolver — an upgrade paid for and
not received.

So the corrected line computes, per asset:

```
operational = attributesWith(asset, level, packages).mobility
            × (1 + 0.0075 × facilityLevel(category))
```

…and takes the minimum. `facilityLevel` is Motor Pool for armour and artillery,
Airfield for rotary, fixed wing and drone, and 1.0 (no modifier) for naval.

### Where the numbers come from, and when

Building levels are read at launch and baked into the arrival instant, which is
already how marches work — the roster is frozen at launch, and this is the same
freeze applied to the same event. A Motor Pool that finishes upgrading while a
march is in the air does not speed it up, which is correct and matches the
brief's "snapshot at launch" rule for Orders.

The return leg is the awkward one. Today a return uses the elapsed outbound
time, so it is automatically consistent and needs no change. Worth keeping.

### The launch preview

The brief asks for base duration, facility reduction, the floor if it bites, and
final duration. This needs a new read-only endpoint or an addition to the attack
payload — the client cannot compute it, because it does not know the player's
building levels on the map screen. One field on the existing squad payload is
cheaper than an endpoint.

**The floor honesty matters.** At the 45-second floor a facility bonus is worth
nothing, and most early marches are at the floor. A preview that shows "−18%"
and then a duration that did not move is worse than showing no percentage.

### Power weights

The brief sets every weight to 0 except Command Post 60. That is right about the
lie, and I want to flag what it costs, because power is not only a profile
number.

`totalPower` feeds three places: the profile, the **alliance application list**
(an officer judging an applicant), and the **alliance leaderboard ranking**.
With only the Command Post contributing, all three collapse to
`Σ commandPost^1.6 × 60` — the leaderboard becomes a ranking of summed Command
Post levels, and an applicant's power tells an officer one number they could
have read off the applicant's base.

That may be an improvement on a number that is actively misleading. But
"Development Score" then needs to exist at the same time, or the game loses its
only comparative statistic in the same deploy that removes its meaning.

**Recommendation:** set the weights as the brief says, and ship the Development
Score in the same change rather than as a follow-up. It is a second `reduce`
over the same building levels and a second field on the profile.

---

## 2. Visual stages

Deferred behind the Base screen (0.2), except the map silhouettes.

**Map silhouettes are buildable now.** Four Command Post stages — 1–9, 10–19,
20–29, 30 — chosen at draw time in `WorldMap.tsx`, which already picks skin art
per base and already receives each base's `level`. No new payload field, no new
migration, and it is the first time a building level will have been visible to
anybody other than its owner.

**One thing the brief did not consider:** a taller Command Post silhouette
advertises a harder target, and the map already colours by allegiance. Making
level legible at a glance is a real strategic change, not only a visual one. I
think it is a good one — it makes the map informative — but it should be a
decision rather than a side effect.

The construction overlay is cheap and should ship with whatever comes first.

---

## 3. Field Orders

Blocked on a charge source (0.1). The mechanics themselves are clean and I have
only two implementation notes.

**The resolver has to change shape, and this is the right moment.** `resolve()`
takes `CombatantSpec {assetId, level, packages}` and looks the attributes up
itself. External bonuses cannot be expressed that way without the resolver
learning about Orders, which would put game state inside the pure function.

The brief already says the right thing — "callers assemble the calculated combat
inputs and send those inputs to it" — and this is the architectural change plan
12 §4 flagged as worth making. `CombatantSpec` becomes computed attributes plus
category, and every caller (the map, the arena, the simulation harness) computes
them the same way through one shared function. It is a contained refactor and it
makes the +12% ceiling checkable by a test rather than by inspection.

**The 5-round resolver is deterministic, so the cap is testable.** I will add a
standing assertion to `scripts/simulate.mjs`: a +7% Order and a matching +5%
Operation produce exactly ×1.12, never ×1.1235. The brief calls this out as an
edge and it is exactly the kind of thing that passes review and fails in
production.

**One design question the brief leaves open.** An attacker snapshots their Order
at launch and it survives arrival even if it would have expired. A defender's is
evaluated at settlement. So a defender whose Order expires *during* the incoming
march loses it, while the attacker's cannot expire. That asymmetry favours the
attacker, and settlement time is not under the defender's control — it happens
whenever somebody next reads the map. **Is that intended?**

---

## 4. Alliance Operations

Blocked on a stamp source (0.1). Two genuine problems with the design as
written.

**"Member count at cycle start" is not recoverable.** The charge threshold is
`min(3, member count at cycle start)`. `alliance_members` has `joined_at`, so
members who joined after the cycle began can be excluded — but a member who
**left** during the cycle is deleted from the table entirely, so the count at
cycle start cannot be reconstructed. An alliance of two that loses one member
would be measured as one.

Two ways out: snapshot the count into the cycle row when the cycle's first stamp
is written, or make the threshold `min(3, members now)`. The snapshot is more
faithful to the brief; the live count is simpler and self-healing. I recommend
the **snapshot**, because the live count lets a two-member alliance drop to one
mid-cycle to halve its own threshold.

**A one-member alliance needing one stamp is a self-buff.** The brief's own
table allows a solo alliance to earn a +5% Operation from its own single action
every 48 hours. That is a strictly better deal than being in a group, where you
still stamp personally *and* depend on two others. Anyone optimising will play
solo-alliance. **Recommendation: the floor should be 2, and a one-member
alliance earns nothing.** An alliance operation should require an alliance.

Everything else — the two-officer confirmation with a ten-minute expiry, the
12-hour cooldown, the two-charge bank, certification in the current or prior
cycle, the snapshot-at-launch and evaluate-at-settlement split — is implementable
as described with absolute instants and no background job.

---

## 5. Alloy

Blocked on sources (0.1). Two notes.

**The refund needs a column.** Packages refund "100% of their Alloy as well as
every other package cost". `player_assets.pkg_credits` currently holds the whole
currency cost; Alloy needs `pkg_alloy` alongside it, for the same reason — a
refund must not depend on scanning a ledger. One migration, and it should go in
whenever the Alloy costs do.

**Nothing enforces the daily caps yet.** "One claim per action per account,
enforced in the write" is right, and it is a unique index on
`(player_id, action, rst_date)` rather than a check. Worth stating in the
migration so it is not implemented as a `SELECT` followed by an `INSERT`, which
is the bug shape this codebase keeps finding.

---

## 6. What I would build, in order

| # | What | Blocked on |
| :--- | :--- | :--- |
| 1 | Logistics facilities, the Propulsion march bug, corrected descriptions, power weights + Development Score, launch preview | Nothing |
| 2 | Command Post map silhouettes, construction overlay | A decision on advertising level |
| 3 | Season 1 Stage A — season skeleton, objectives, ownership log | Nothing |
| 4 | Season 1 Stage B — Boot Sequence and daily objectives | 3 |
| 5 | Combat input refactor + the ×1.12 assertion | Nothing, and worth doing early |
| 6 | Alloy: ledger, claims, costs, `pkg_alloy` | 4 |
| 7 | Field Orders | 4, 5 |
| 8 | Alliance Operations | 4, 5 |

Item 1 alone gives every one of the six buildings an honest description and a
real effect, fixes a bug in yesterday's feature, and needs no new art, no
migration and no season.

---

## 7. Questions I need answered before building past item 1

1. **Is the Alloy gate on Rank 5 and 10 intended**, knowing it caps a fully
   active player at roughly 15 of 24 assets refitted per season?
2. **Development Score in the same change as the power-weight reset**, or accept
   a deploy where power means almost nothing?
3. **Should the Command Post silhouette advertise level on the map?**
4. **Alliance Operations floor: 2 members, not 1?**
5. **The attacker/defender Order asymmetry** — intended, or should a defender's
   Order also be snapshotted when the march is launched against them?
