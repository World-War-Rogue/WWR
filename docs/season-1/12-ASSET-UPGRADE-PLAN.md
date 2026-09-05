# Asset and upgrade design — implementation plan

PLAN AND BLOCKERS — NO CODE WRITTEN

Answers the seven required items in the Asset and Upgrade Design Brief. Read
against the live repository at `0a426e4`. Supersedes the asset-card and Service
Rank sections of `09` and `11` where they conflict; the terrain plan and the
stage order in `11` are unaffected except where noted in §7.

---

## 0. Three things to settle before the plan reads properly

### 0.1 The art volume is the critical path, and taken literally it is not buildable

The brief asks for a hero render per asset, a squad-formation visual, a map
silhouette, **a visual evolution every ten Service Ranks**, and visible component
detail for four packages. Multiplied out against 72 assets that is on the order
of four hundred hero renders plus component variants, for a project whose entire
existing art library is ten base skins, four of which have art.

Three things make it tractable without giving up what the brief is asking for:

**Season 1 needs two visual states per asset, not six.** The Season 1 cap is Rank
10, and the milestone table gives Field-Issue for 1–9 and Combat-Hardened at 10.
Ranks 20, 30, 40 and 50 are Seasons 2 to 5. That is 60 draftable assets × 2
states, and the second state is only reached late in the season.

**Component detail should be layered, not painted per asset.** This is the
cosmetics lesson exactly: base skins are four layers over a skin rather than
whole-base variants, deliberately, because "ten skins is ten commissions and any
two buyers look identical". A weapon mount, an armour panel, an exhaust bloom and
an antenna cluster drawn once per category and composited over the hero render
gives four packages × visible steps of build detail for roughly twenty layers per
category instead of hundreds of renders.

**The map silhouette already exists and is per category, not per asset.**
`shared/assetArt.ts` draws six shapes in a 24×24 box, and that is the right
granularity — at map scale interior detail is gone anyway.

Even scoped this way the hero renders are the long pole. **This is the item most
likely to set the schedule**, and it should start before the code, the same way
the terrain props have.

### 0.2 This substantially fixes the Season 1 economy hole — but does not close it

Worth connecting, because it changes an open question. With Service Rank as the
only sink, a full 24-asset draft to Rank 10 costs 7,800 Command Credits under the
approved curve and a committed player clears it on **day 15 of 70**, leaving
fifty-five days with nothing to buy.

Four packages per asset multiply that:

| Package cost, as a fraction of a Service Rank step | Full draft | Share of a season's earnings |
| ---: | ---: | ---: |
| 30% | 17,160 | 22% |
| 40% | 20,280 | 26% |
| 50% | 23,400 | 30% |

So the sink roughly triples. That is a real improvement and it means the four
packages are not enrichment — **they are the Season 1 economy.** But a committed
player still finishes everything at around a third of the season, so the gap
narrows rather than closes. The remaining answer is the per-rank curve, which
cannot be set until §6.

One consequence to design for rather than discover: 24 assets × 9 rank steps × 5
tracks is **1,080 upgrade actions** in Season 1. At one tap each that is a chore,
not a progression system. The Service Bay needs multi-rank upgrades in a single
confirmed action, with the cost and the resulting values shown before committing.

### 0.3 Two names collide, and this is the bug class that has already cost time

The Foundation brief gives every squad three **Combat System** lanes — Fire-
Control Suite, **Protection Suite**, Field Sustainment Suite. This brief gives
every asset four packages, one of which is the **Protection Package**.

So a player has a Protection Suite on Bravo and a Protection Package on the tank
inside Bravo, doing different things at different scopes. That is the same shape
as the fault that made "banner" mean two things, which the pennant rename exists
to avoid, and the same shape as the duplicated skin catalogue that made Ravenkeep
invisible. It needs settling in the string table before either system is built.
See blocker 1.

---

## 1. Asset Catalog redesign

`src/live/Assets.tsx` becomes a card list rather than a stat grid. Per the brief,
the art leads and the numbers are demoted.

- **Left:** the hero render, at the largest size the row allows.
- **Right:** name, designation and operator, role badge, squad assignment, real
  Service Rank, effective Season Rank, current Power, one mission line, and the
  counter reference.
- **No stat bars on the card.** Those move to Combat Data.
- The whole card is the tap target.
- Filters by category stay; naval stays visible and undraftable, which is already
  how the catalogue behaves.

One correction that lands here regardless: the counter reference on this card was
reading from a second hand-written table that disagreed with the resolver in six
of twelve entries. Stage 0 fixed that — it now reads `counterWeb()`, derived from
the table the resolver actually uses. The card can be trusted.

## 2. Full-page Asset Detail

A screen, not a sheet. The lesson already paid for is that **a sheet is not a
panel** — the asset picker "did nothing" because it rendered below four squad
cards, off-screen on a phone.

Back navigation, four tabs, tab state held in the screen and not in the URL,
consistent with how the client routes today.

| Tab | Holds |
| :--- | :--- |
| **Asset Profile** | Hero render, name, designation, category, role, squad, real and effective rank, Power. Restrained idle motion. Nothing dense. |
| **Mission Profile** | Specialty, strengths, weaknesses, best squad use, what it counters, what counters it, lift, one operational line. Comparison panels rather than paragraphs. |
| **Combat Data** | The five attributes, lift, Power, both ranks, and the full Power Breakdown. |
| **Service Bay** | Service Rank panel, four package panels, Dossier status, current and next values, cost, material, upgrade action, Field Note buttons, Season cap. |

**Idle motion** reuses the existing effects layer rather than new art:
`src/live/effects.ts` already runs deterministic per-plot particle systems for
smoke, fire and embers over static skin art, on the principle that art stays
static and motion is code. Rotor blur, radar sweep, exhaust and lights are the
same trick at a different scale, and they cost no commissions.
`prefers-reduced-motion` stops all of it.

## 3. Service Rank and the four packages

### Schema

`player_assets` today is `(player_id, asset_id, level, acquired_at)` with `level`
plumbed end to end and **no `UPDATE` anywhere in the codebase** — every asset is
rank 1 in practice. The upgrade path is the first write.

- `player_assets` gains four integer columns: `pkg_armament`, `pkg_protection`,
  `pkg_propulsion`, `pkg_electronics`, all defaulting to 1. Four columns rather
  than a table because the set is fixed and closed.
- `level` stays named `level` and displays as Service Rank. **Renaming a live
  column buys nothing and costs a migration** — the vocabulary lives in the string
  table, per the rule settled in `09` §0.1.
- Materials get their own table, `player_materials (player_id, material, amount)`,
  rather than more columns. Four arrive here — Munitions Kits, Armour Plates,
  Drive Assemblies, Signal Components — and Technical Dossier Pages and Engineer
  Kits are already known to be coming.

### The rules, and where each is enforced

Every one of these is a server check, and the ones that can be indexes rather
than checks should be:

| Rule | Enforcement |
| :--- | :--- |
| Package rank ≤ Service Rank | `CHECK` constraint on the row, plus the conditional update |
| Rank ≤ season cap | Server-side against the season record, never the request |
| Costs and materials | Recomputed server-side from the catalogue; the request carries only the target |
| No overspend under concurrency | Conditional `UPDATE … WHERE balance >= ?`, the same shape as the march settle at `march.ts:369` |
| Simultaneous upgrades | One statement per spend; two tabs cannot both pass |

The concurrency point is not theoretical here. Build-job collection at
`worker/index.ts:285` already issues an unguarded `UPDATE … SET collected_at`,
so two reads of `GET /api/base` can both apply the same finished job. It is
bounded today because the write is idempotent. The upgrade path must not copy
that pattern, and check 10 in the brief is exactly this.

### System Integration

The brief requires it capped, additive, and not a multiplier stack. The shape
that satisfies "rewards maintaining all four reasonably well" and cannot be
gamed by one tall package is to **derive it from the lowest package rank**, not
the sum or the average — a player with 10/1/1/1 gets nothing, a player with
4/4/4/4 gets the bonus for rank 4. Capped as a flat additive term.

The number waits on §6.

## 4. Power Breakdown and Season Readiness

### One architectural change worth making now

`resolve()` currently takes `{assetId, level}` and looks the attributes up
itself. With Service Rank, four package ranks, System Integration, a Dossier
choice and a Readiness Band all feeding the same numbers, that signature stops
working — and the wrong fix is to teach the resolver about all of it.

**`CombatantSpec` should carry resolved attribute values, not a rank.** The
caller resolves real ranks → effective ranks → package contributions →
integration → final five attributes, and hands the resolver a finished unit. The
resolver keeps knowing nothing about seasons, bands, packages or upgrades, which
is the property that makes it testable and makes the arena and the map share one
combat system.

This also makes the battle report honest: the resolved spec is what gets stored
in `battles.detail`, so a report can be re-derived exactly, which is already the
reason the roster is frozen into `marches.units` at launch.

### The breakdown

The brief's five parts map cleanly, with one caveat that has to be stated:

1. Base Service Power — a number.
2. Component Package Power — a number, four contributions.
3. System Integration — a number, capped.
4. Role and Tactical Effects — **not a number.**
5. Temporary Seasonal Effects — later, a number with an expiry.

Parts 1 to 3 are scalars that sum to the displayed Power. **Part 4 is a
relationship between two squads and has no value until an opponent exists** — a
counter is worth ×1.2 against one category and nothing against another. Printing
a single figure for it would be inventing one. It should render as named effects
carrying trigger, benefit, limitation and counter, which is what the Foundation
brief already asks every tactical effect to show.

### Readiness Band

Settled in `07-READINESS-BAND` and unchanged: the band is derived from the season
phase, never stored per player, and applied when the battle input is assembled.
`marches.readiness_band` is written at launch alongside the frozen roster, so a
phase change mid-flight cannot alter a fight already in the air.

New here: **package ranks clamp to the same recorded band**, not only Service
Rank. One clamp function, applied to five numbers instead of one.

## 5. Visual variants and component detail

| Form | Granularity | Source |
| :--- | :--- | :--- |
| Hero render | Per asset, 2 states in Season 1 | Commissioned art |
| Component detail | Per category, layered overlays | Commissioned art, composited in code |
| Squad formation | Per asset, scaled hero render | No new art |
| Map / battle silhouette | Per category | `shared/assetArt.ts`, exists |
| Idle motion | Per category | Code, via the effects layer |

The pipeline is the one that already works: generated on a plain flat background
with a clear margin, cut out, packed to an atlas under `public/`, declared in a
shared catalogue. `public/skins/README.md` is the precedent and the cutout trap
is the same one — anything matching the background is eaten.

**Assets are drawn as silhouettes for a legal reason as well as an artistic one.**
Manufacturer press photos are copyrighted, only about twenty of the seventy-two
have a usable US federal image, and designations carry less trademark weight than
popular names. The brief's "no unlicensed real-world photos" agrees; the hero
renders must be original machines in the style of, not depictions of.

## 6. What the simulation has to prove first

The harness exists and runs — `npm run sim`, committed in Stage 0, with five
standing assertions that fail the build. Four of the brief's balance rules are
assertions rather than opinions and belong in it:

| # | Rule from the brief | Test |
| ---: | :--- | :--- |
| 1 | Rank 10 / Armament 1 must not beat Rank 8 / Armament 5 | Direct duel, both directions, assert the balanced build wins |
| 2 | An upgraded Drone stays comparatively fragile | Drone at max Season 1 packages against armour; assert survivability ordering holds |
| 3 | An upgraded Armour asset stays slower than air | Assert mobility ordering after max Propulsion |
| 4 | No asset upgrades into a universal role | The presence-premium test, re-run with packages: no category outside ±10 points |
| 5 | Integration is capped, never a stack | Sweep all package combinations, assert the bonus never exceeds its cap |
| 6 | A band clamp applies to packages too | A rank-30 asset with rank-30 packages clamped to band 10 produces a byte-identical result to a real rank-10 asset with rank-10 packages |

Test 6 is the load-bearing one, the same way its Service-Rank-only equivalent was
in Stage 0 — if it fails, the Readiness Band is decorative for packages.

**Nothing numeric is fixed until these are green:** not per-rank costs, not the
package-to-Service-Rank cost ratio, not the integration cap, not material drop
rates, not the Dossier effect sizes. Stage 0 exists because three faults survived
for months against a baseline nobody could re-measure.

## 7. Where this sits

The stage order in `11` holds. This work lands across two of its stages rather
than becoming a new one:

- **Stage 2** gains the four package columns, the materials table, the upgrade
  endpoint and the resolved-spec change to `CombatantSpec`.
- **Stage 3** gains the catalog redesign and the four-tab Asset Detail.
- Terrain stays Stage 1, unaffected.

The hero renders are a parallel track and should start now, alongside the terrain
props, because §0.1 makes them the schedule.

---

## 8. Blocking questions

**1. What are the two Protection systems called?** A Protection Suite on a squad
and a Protection Package on an asset inside that squad will be confused by
players and, more expensively, by us. My suggestion is to rename the squad lane —
squad-level Combat Systems become **Fire Control / Survivability / Sustainment**,
leaving Protection to mean one thing. Cheap now, a migration and a
re-translation later. This blocks the string table, so it blocks both systems.

**2. Which package improves `range`?** The four packages map to firepower,
armour, mobility and detection. **`range` has no package**, and it is no longer a
dead stat — Stage 0 gave it a real job, contesting a screen so fire can reach the
rear. Options: Electronics covers detection and range; Armament covers firepower
and range; or range moves with Service Rank only. I lean Armament, since reach is
a weapon property, but it changes what Armament is for.

**3. Does march speed use real or effective Propulsion?** Movement is not combat,
so the Readiness Band arguably should not apply — but if it does not, a player
who has bought ahead marches faster than everyone else from week 1, which is a
competitive advantage the band exists to prevent. I lean effective, for
consistency. Check 7 in the brief tests the freeze, not this.

**4. Do package ranks show a visual state, or only Service Rank?** The brief says
Service Rank drives silhouette evolution every ten ranks and packages give
"smaller, satisfying build details". In Season 1 only Rank 10 is reachable, so
for most of the season **package detail is the only visible change a player ever
gets from upgrading**. That argues for making the layered component overlays a
Season 1 requirement rather than a nice-to-have, which is an art commitment.

**5. How many Field Notes?** "Why it matters for that asset" read literally is
four notes × 72 assets = 288 pieces of static text, in nineteen languages. Per
package per category is 20, plus a per-asset line. I would do the latter; the
former is not translatable at a quality anyone would want.

**6. Can a player refund or reset a package?** Not mentioned. With four tracks and
a rule that packages cannot exceed Service Rank, a player who over-invests in one
package on the wrong asset has no way back. Season 1 is short enough that "no" is
defensible, but it should be a decision rather than an omission.

---

## 9. Human checks

All eleven in the brief are human-run and none can be verified by me. Six map to
harness assertions and can fail before a human sees them — checks 5, 6, 8, 10 and
11, plus the band clamp. The other five are genuinely visual or tactile: the hero
renders reading as machines worth collecting, the four tabs being touch-friendly
on a phone, the milestone visual actually landing at Rank 10, Field Notes reading
as advice rather than instruction, and the upgrade flow feeling satisfying rather
than like 1,080 taps.

That last one is the one I would watch. It is the difference between a
progression system and a spreadsheet with buttons, and it is exactly what this
brief set out to fix.
