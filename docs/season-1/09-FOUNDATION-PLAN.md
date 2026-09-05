# Visual-First Season 1 Foundation — Implementation Plan

STAGED PLAN AND BLOCKING QUESTIONS — NO CODE WRITTEN

Answers the seven required items in the Visual-First Season 1 Foundation brief.
Read against the live repository at `dc44b46`.

This brief says to treat it as the source of truth and not to assume earlier
documents exist. I have taken that as authority over **design intent**, which it
plainly is. I have not taken it as a reason to forget what the code does or what
was already measured — `docs/season-1/08-BRIEF-RESPONSE.md` found three faults
that this brief does not address and that no amount of renaming removes. They
are carried forward in §7 rather than repeated in full.

Nothing here is verified. Only Matt or a tester can verify a build.

---

## 0. What changed from the previous brief, and what it costs

Most of the delta is vocabulary. Two of the renames are not.

### 0.1 The rename is cheap only if it stays in the string table

The brief renames a lot: level → **Service Rank**, Blueprints → **Technical
Dossiers**, Squad Systems → **Combat Systems**, base → **Forward Command Base**,
buildings → **Departments**, plus a seventeen-row generic-to-military term table.

**Recommendation, and I would like this treated as settled before anything is
built: rename in the translated string table only. Never in ids, database
columns, or `shared/` catalogue keys.**

`player_assets.level` stays `level`. It renders as Service Rank through
`t('asset.serviceRank')`. Four reasons, in order of weight:

1. **Every id rename is a migration against live player data.** There are
   approved accounts on the live world now.
2. **`shared/` ids are the contract between the Worker and the client.** They
   exist because the two sides once disagreed about a skin catalogue and
   Ravenkeep went invisible. Renaming across that boundary is the exact shape of
   that bug.
3. **The i18n generator never overwrites an existing string**, which is what
   makes hand-corrections survive. A *renamed key* is a new key, so it loses
   every correction in all nineteen languages and is re-machine-translated. The
   vocabulary in this brief — "Dossier", "Suite", "Lift", "Band" — is precisely
   the kind of term the machine gets wrong.
4. Asset, skin and cosmetic names are already deliberately server data and
   deliberately untranslated. Mixing display renames into that layer muddies a
   line that is currently clean.

Done this way the whole vocabulary change is a string-table edit plus a
translation run, and it can ship in an afternoon at any point. Done in the
schema it is a migration, a re-translation, and a class of bug this codebase has
already paid for once.

### 0.2 The Department list is a redesign of the base, not a rename of it

This is the one that changes scope, and it is easy to miss because it is
presented as a table of names.

Six buildings exist today: `command_post`, `motor_pool`, `airfield`, `barracks`,
`refinery`, `foundry`. The brief lists nine departments. **Only two map.**

| Brief's department | Existing building | Status |
| :--- | :--- | :--- |
| Command Headquarters | `command_post` | maps |
| Motor Pool | `motor_pool` | maps |
| Armory | — | new function |
| Operations Center | — | new function |
| Signals Center | — | new function |
| Engineer Yard | — | new function |
| UAV Command Bay | — | reserved, Season 2 |
| Fleet Operations Center | — | reserved, Season 3 |
| Campaign Archive | — | reserved, Season 2+ |
| — | `airfield` | **no home in the new list** |
| — | `barracks` | **no home in the new list** |
| — | `refinery` | no home; produces resources |
| — | `foundry` | no home; produces resources |

Two of the four homeless buildings are load-bearing:

> `squadLiftBudget = 10 + floor(0.8 × (motor_pool + airfield) + 0.5 × barracks)`

**Airfield and barracks are two of the three inputs to squad lift.** Drop them
and a squad's carrying capacity stops growing at all beyond the motor pool;
every squad in the game is permanently capped near its starting size. Lift is
the constraint the brief keeps — "limited by lift, not slot count" — so this
cannot be left to fall out of a naming table.

Refinery and foundry produce the four resources that pay for every upgrade in
the game. They also have no department.

So the base section is not a rename. It is: four existing buildings need
departments, four new departments need functions, resource production needs a
home, and lift needs its inputs preserved under whatever the new names are.
**Blocking question 3 in §7.**

### 0.3 The resource table adds materials that have no source and no sink

The brief's term table introduces MREs, Engineering Stock, Armory Parts,
Technical Dossier Pages, Signal Components, Engineer Kits, Power Cells and
Operational Readiness. Four resources exist today: `fuel`, `steel`,
`munitions`, `alloy`, produced on a timer and spent on building upgrades.

Most of that table is vocabulary for things that already exist or are deferred,
and should be treated as such:

- **Rename, do not add:** `fuel` → Power Cells, `steel` → Armory Parts, `alloy`
  → Engineering Stock. String table only, per §0.1.
- **`munitions` has no row in the table.** It needs a name.
- **Build only two new bound materials in this foundation**, because only two
  have a Season 1 sink: **Technical Dossier Pages** (Chapter I) and **Engineer
  Kits** (departments). Signal Components belong with the Season 2 UAV system.
- **Do not build MREs or Operational Readiness at all.** The brief is explicit
  that MREs never decay, never gate login, and never become paid energy, and
  that Operational Readiness replaces stamina — which this game does not have
  and, on the brief's own rules, should not acquire. Reserving the words costs
  nothing; building the systems is scope the brief defers.

### 0.4 What the brief answers from the previous round

| Earlier question | This brief |
| :--- | :--- |
| Does the band schedule replace the approved one? | **Answered** — 2…10, ranks 1–10. Confirmed. `docs/progression/06`'s projections are void |
| Is the 10,000/week Token ceiling reopened? | **Deferred, not reopened.** Checkout and the final limit are out of scope. The approved 10,000/week stands until checkout is built |
| Console lines in bug reports | **Answered** — do not attach automatically. See §5 for how I would do this without losing the capability |
| Dossier/Blueprint Chapter I level | **Unchanged** — still Rank 10, so the economy hole in §7 is now sharper, not resolved |
| Recall, hostile march composition, Drone speed, home-ground bonus, Chat's home | **Restated, not resolved.** Still blocking. §7 |

---

## 1. Staged implementation plan

Seven stages. Each is independently deployable, and each ends in something a
tester can look at. The brief's own ordering is kept except where a dependency
forces otherwise, and those are called out.

### Stage 0 — Combat truth

No player-visible change. Nothing numeric can be agreed until this lands, and it
depends on none of the open questions.

- Commit the simulation harness as `scripts/simulate.mjs`. It is cited seven
  times across the code and docs and **does not exist**, so the three open
  faults in `docs/COMBAT.md` cannot currently be re-measured by anyone.
- Run `auditAssets()` in `npm run lint`. It has zero callers today.
- Close the counter ring over the draftable set, and make it derive from that
  set rather than being a constant (§7.1).
- Collapse the two disagreeing counter tables to one source.
- Decide `range`: give it a resolver role, or stop charging points for it.
- Re-derive `attributeAtLevel` for ten ranks per season to fifty.
- Rewrite `docs/COMBAT.md` §10 with a measured table.

### Stage 1 — Season spine, wallet, and the first upgrade (server)

- `seasons` and phase-from-instant; **Season Readiness Band as a pure function**
  in `shared/season.ts`, derived and never stored per player.
- `marches.readiness_band`, written at launch, read at settlement.
- Tokens and Command Credits as balances plus an append-only ledger.
- Technical Dossier Pages and Engineer Kits as bound materials.
- `POST /api/assets/upgrade` — the first write to `player_assets.level`, which
  today has **no `UPDATE` anywhere in the codebase**. Explicit payment split,
  server-recomputed cost, conditional spend.
- Power becomes a structured breakdown rather than a scalar (§5).

**The season spine is Stage 1 rather than last**, because the brief puts the
Readiness Band in the persistent header, on every asset card, and at the head of
the Power Breakdown. It is a dependency of the second screen a player sees.

### Stage 2 — Shell, navigation, Upgrade Hub (client)

- Persistent header and five-tab navigation. This also closes a shipping defect:
  today the bug-report form is reachable **only from the base screen**, so a
  player on the map cannot report a map bug without leaving the map.
- Upgrade Hub → Assets. Hero asset cards with Service Rank, effective level,
  role, strength, weakness, counter, current power, next upgrade effect, cost
  and Power Breakdown.
- Wallet display and the payment-split control.
- The full vocabulary rename lands here as a string-table edit (§0.1).

First stage a tester can meaningfully judge.

### Stage 3 — The pale basin and visible marches

- Season 1 terrain treatment. `src/live/terrain.ts` already derives terrain as a
  pure function of world, season and plot with nothing stored and nothing over
  the wire, so this is a re-skin of an existing layer rather than a new system.
- The four map rings drawn as a visual overlay — Outer Scraplands, Factory Ring,
  Dominion Front, Iron Dominion Core. Presentation only; no capture, no
  objectives, no combat rules.
- March rendering: ground formations on the deck, rotary/fixed wing/drone drawn
  above it, mixed squads showing both, per-asset silhouettes at close zoom,
  collapsing to one formation marker at range. Existing chevron, colour rules
  and interpolation stay. **Subject to question 2 in §7** — what a hostile march
  is allowed to reveal decides what the server may send.

### Stage 4 — General Rider

- Seven static translated onboarding steps, highlight targeting, Back / Next /
  Skip / Finish, completion stored per account, replay from Help granting
  nothing, reduced-motion respected.
- Five poses: welcome, pointing, tablet-explaining, approval, alert.
- First-open guidance for major systems. Note this is **not one completion flag
  but a set** — one row per account holding the set of guidance keys already
  seen, settled server-side so replay cannot pay twice.

Art notes are in §3.

### Stage 5 — Two-player PvP, recovery, alerts, bug categories

- Temporary squad recovery with an absolute `ready_at`, settled on read.
- Battle reports extended: effective levels used, Drone outcome, recovery state.
- The defender's inbound strip, plus visual/audible warning settings and Test
  Warning, both defaulting off.
- Bug-report categories, and the console-log decision in §5.

### Stage 6 — Boot Sequence presentation

- Weeks 1–2 protected state: no meaningful territory loss, no alliance-vs-
  alliance attack, safe practice battles, alliance formation.

### Stage 7 — Technical Dossiers, Combat Systems, Departments

**I would move this ahead of Stage 6, and possibly ahead of Stage 5.** The brief
places it late, but §7.3 below shows these three systems are the Season 1
economy rather than enrichment: without them there is nothing to spend on from
roughly day 15 onward. I have left it numbered last to match the brief and I am
flagging the disagreement rather than quietly reordering.

---

## 2. Current systems: reuse, redesign, remove

### Reuse unchanged

Server authority, absolute completion instants, settle-on-read, uniqueness by
database index, `shared/` as the single catalogue, the pure five-round resolver,
the 72-asset catalogue with its points budget, lift, four squads of six,
march/reinforce/recall/garrison with its frozen roster, chat with translation,
alliances, cosmetics, profiles, the build-time i18n pipeline across nineteen
languages, and Rogue Standard Time.

Two things the brief specifies that **already ship** and need no work:

- **The five starter base skins.** Migration `0019` retired the old set and
  redistributed every base across Medieval Fortress, Circular Shield Bunker,
  Field Workshop, Desert Command Citadel and Rose Command Citadel — the brief's
  list exactly, already live.
- **Bug reporting.** Rate limited to one per minute, bounded, re-serialised
  server-side, read-back guarded against D1's 7403, and returning an
  eight-character reference. Only categories and the console decision are
  missing.

### Redesign

| Thing | Now | Needs to be |
| :--- | :--- | :--- |
| `ASSET_MAX_LEVEL` | `30`, and **dead — zero references** | `50`, enforced on the upgrade path |
| `attributeAtLevel` | tuned for 30 ranks; 10 ranks span 1.75× | re-derived for ten-per-season to fifty |
| Counter ring | open in Season 1 | closed over the draftable set |
| `COUNTERS` (catalogue screen) | disagrees with the resolver in 6 of 12 entries | derived from the resolver's table |
| `range` | costs points, does nothing in combat | earns a role, or stops costing |
| Power | one integer | structured breakdown |
| Navigation | no tab bar; Settings only from the base screen | persistent header, five tabs |
| Base | six buildings, resource production | departments, per §0.2 — **the real work in this brief** |
| Battle report | winner, power, losses, loot, rounds | plus effective levels, Drone outcome, recovery |
| Settings | bug form only | alert toggles, Test Warning, categories |

### Remove

`src/App.tsx`, `src/components/` (15 files), `src/data/`, `src/utils/`,
`src/types.ts`, `src/types/` — **25,219 lines, 1.4× the size of the live game**,
unreachable because `src/main.tsx` mounts `LiveApp` and nothing imports `App`.

It contradicts this brief directly: `src/data/pilots.ts` defines a `PilotHero`
and `HeroCategory` system — human heroes with named aces, which the brief
forbids — and `CombatSimulatorView.tsx` looks like the missing combat harness
while never touching `shared/combat.ts`. Anyone told to find the harness finds
that first. Deleting it costs nothing and removes the most likely source of a
wrong answer about what this game is.

---

## 3. Screen hierarchy and visual approach

### The gap the brief does not name

Five primary tabs are specified. Three things that ship today have no home in
them:

- **The Forward Command Base view.** The base *screen* — resource bar, build
  jobs, the rendered base with its four cosmetic layers and chosen skin — is not
  the same thing as the Departments *upgrade tab*. The brief devotes a section
  to how the base looks and never says where a player looks at it.
- **Chat.** Nineteen languages with live translation is the thing that
  distinguishes this game from its genre, and it appears nowhere in the brief.
- **Battle reports.** Specified in detail, given no location.

### Proposed hierarchy

Persistent header on every screen: profile entry · season and Readiness Band ·
Tokens · Command Credits · alliance · inbound-hostile strip when relevant.

| Tab | Contains |
| :--- | :--- |
| **Map** | The world, marches, ring overlay, and the Forward Command Base view reached by a centre button as it is today. Base keeps resources, build jobs, cosmetics and skin selection |
| **Squads** | Alpha/Bravo/Charlie/Delta, lift, drag-to-swap, the marches panel and Recall |
| **Upgrade Hub** | Assets · Technical Dossiers · Combat Systems · Forward Command Base — the brief's four tabs exactly. "Forward Command Base" here means Departments, not the base view |
| **Alliance** | Roster, ranks, applications, crest |
| **Profile** | Player, then **Settings · Add Tokens · Log Out** in that order. Battle reports live here, and Help including Rider replay |

**Chat stays a persistent overlay rather than a sixth tab.** It must remain
reachable while a player is doing something else, and a tab would make it modal.
A deliberate departure from a strict five-tab reading — question 5 in §7.

### Visual approach

- **Mobile-first, one column, thumb-reachable.** The lesson already paid for:
  the asset picker "did nothing" because it rendered below four squad cards,
  off-screen on a phone. A sheet is not a panel.
- **Silhouette first.** At forty pixels all interior detail is gone. True for
  base skins, true again for the six asset categories and for formation markers.
  Armour widest, drone smallest, air shapes visibly airborne.
- **Dark art on light ground.** Season 1 is a pale dry basin, which is why the
  basin was chosen. Hero asset art should be dark-bodied to read against it.
- **Three asset renditions**, as specified. `shared/assetArt.ts` already draws
  the map silhouette in a 24×24 box and should be extended, not replaced.

### General Rider — two art notes that will cost time if missed

**The reference image will break the cutout tool.** `tools/skinforge/cutout.py`
flood-fills inward from the image edges, and the reference sits on a dark
vignette. His gloves, boots and navy coat are dark. This is exactly the failure
that once returned a base skin as gold trim with the figure erased. **Every
Rider pose must be generated isolated on a plain light background**, not on the
vignette, however good the vignette looks as a portrait.

**Full-body will not survive mobile onboarding.** The brief requires Rider not
to cover the highlighted control. On a phone, a full-body figure at a size that
clears the control is too small to read a face. Recommend **bust or half-body
crops for the six guidance steps, full body only on the welcome step**, with the
tablet and the open presenting hand as the two silhouette cues that survive
shrinking.

**Style lock — this is a requirement, not a preference.** The attached reference
is committed as `docs/season-1/general-rider-reference.png` and is the single
source of truth for the character. Every tutorial pose must preserve, without
reinterpretation:

- **The face.** Same man — same bone structure, same warm half-smile, same eyes,
  neatly styled mid-brown hair with the same sweep, same trimmed beard and
  moustache. He must be recognisably one character across all five poses, not
  five men in one coat.
- **The uniform.** Cream double-breasted command coat with slate-navy panelled
  sleeves and shoulders, brass-edged trim, brass shoulder boards, the winged
  chest insignia, the diagonal brown leather strap with its brass badge, the
  brass belt buckle with the same emblem, belt pouches, dark navy trousers with
  reinforced knee panels, long brown boots with brass buckles, and dark gloves.
- **The palette.** Slate navy, pale sand cream, muted brass. No new accent
  colour, no rank markings that read as a real force, no flags, national
  insignia, political symbols, weapons, logos or text.
- **The style.** Premium cartoon-command — stylised realism with soft rounded
  forms, clean readable shapes and warm even lighting. Not photoreal, not
  chibi, not gritty.
- **The props.** The tactical tablet stays with him and is the pose-to-pose
  continuity cue.

The reference gives the **welcome** pose — open presenting hand, tablet held
under the left arm. Pointing, tablet-explaining, approval and alert must be
generated from it with matched costume, proportions, lighting and face. Generate
them as a set in one pass rather than one at a time, or they will drift; and
generate every one of them isolated on a plain light background for the reason
directly above.

---

## 4. Combat simulation plan

Stage 0's output is a committed harness and a measured table.
`scripts/simulate.mjs`, importing `shared/combat.ts` directly — no worker, no
database, no network, which is what the resolver's purity buys.

| # | Measurement | Target |
| ---: | :--- | :--- |
| 1 | Mirror match, identical squads, 10,000 seeds | 48–52% each way |
| 2 | Perfect counter, equal power | 60–75% |
| 3 | Medium counter, equal power | 55–65%, visibly below perfect |
| 4 | Mixed squad vs mono squad, equal power | mixed 60–70% |
| 5 | Every category against every other, 10,000 each | **no category above 55% or below 45% averaged across all opponents** |
| 6 | Effective-level gap sweep: 0, 1, 2, 3, 5 bands | upsets fall smoothly, no cliff |
| 7 | Rank 30 real vs Rank 10 real, both clamped to band 10 | **byte-identical `CombatResult`** |
| 8 | Equal-budget all-armour vs all-range asset | 45–55% |
| 9 | Squad with one Drone vs the same squad without | measures the Drone tradeoff once question 1 in §7 is answered |

Test 5 is the brief's equal-endgame-value promise stated as a number, and §7.1
says it currently fails. Test 7 proves or disproves the entire Readiness Band
mechanic in one comparison and is the cheapest assertion in the system. Tests 5,
7 and 8 should fail the build, not be measured once.

**Nothing numeric is fixed until this table is green** — not per-rank cost, not
the earn schedule, not Dossier or Combat System effect sizes, not Drone speed,
not recovery duration. Tuning a modifier against a baseline known to be wrong is
how three faults survived in `COMBAT.md` this long.

---

## 5. Server authority and stored state

Everything below follows rules already in `CLAUDE.md`, because the brief's hard
rules and those rules are the same document written twice.

**Upgrades.** Wallets as balances plus an append-only ledger: balance is the
authority, ledger is the audit. `POST /api/assets/upgrade` takes an explicit
`{tokens, credits}` split that must sum to a server-recomputed cost; the spend
is a conditional update so two tabs cannot both pay. **Never a default that
spends Tokens first.** Target rank validated against `ASSET_MAX_LEVEL` and the
season's permitted range, server-side.

*One existing defect to fix in the same pass:* build-job collection at
`worker/index.ts:285` issues `UPDATE build_jobs SET collected_at` with no
`AND collected_at IS NULL`, so two concurrent reads of `GET /api/base` can both
apply the same finished job. Bounded today because the building update is
idempotent, but the upgrade path must not copy the pattern.

**Power and the breakdown.** The brief's four-part chain has a problem: Core
Power and Build Adders are scalars that compose additively, but **Role and
Tactical Interaction is not a number** — a counter is a relationship between two
squads and has no value until an opponent exists. Printing one figure for it on
an asset card would be inventing it.

Proposal: the breakdown shows **Core and Adders as numbers that sum to the
displayed power**, and **Role/Tactical and Seasonal as named effects** carrying
the trigger, benefit, limitation and counter the brief already requires. The
displayed power stays honest — it is what the card claims and what the resolver
receives — and the conditional parts sit where their conditions can be stated.
`assetPower` becomes `assetPowerBreakdown(asset, realRank, band, adders)` with a
scalar accessor for the map, still computed on read, never stored.

**Movement.** Timing is already correct: absolute `arrives_at`, client
interpolates, server alone decides arrival. Add `readiness_band` at launch, the
same way `marches.units` freezes the roster. Composition in the march payload is
gated on question 2.

**Battle reports.** Already denormalised into `battles` with a `detail` blob,
which is right — a report must survive the roster and the alliance changing. Add
effective levels, recorded band, Drone outcome and resulting recovery. The
brief's "objective outcome, if applicable" needs a **reason field rather than a
sentence**, so it can be translated.

**Recovery.** Absolute `ready_at`, settled on read. It has no home today: there
is no squads table, only `squad_slots`. A `squad_state` keyed
`(player_id, squad)` is cheapest, and it must be counted as busy by the same
logic as `idx_marches_squad_busy` — the garrison bug, where one squad defended
two plots because a resolved row read as "home", is the precedent for exactly
this mistake.

**Onboarding.** One row per account holding the set of guidance keys seen.
Replay allowed and grants nothing: rewards key to the account, not to the run.
All steps are static translated keys.

**Alerts.** Two booleans plus Test Warning. The strip reads the existing chat
poll (4s open / 25s collapsed) rather than adding one, and is hostile-only.

**One distinction the brief blurs:** the strip and the warning are different
things. The strip is always-present UI showing an inbound count and a countdown.
The settings control the *alert* — the single flash and the single sound.
Without that split, "default off" means a defender gets no clock at all, which
is the problem the strip was designed to solve.

**Bug reports.** Add the six categories and persist them. The eight-character
reference shown to players is currently a display truncation with **no endpoint
behind it**, so a player quoting one cannot be looked up; that needs closing.

On console logs: the brief says do not attach them automatically, and I will
follow that. **I would push back once, though.** `recentErrors()` sends the last
twenty bounded, server-re-serialised lines and it is the most useful column in
the table. Suggested compromise that honours the rule and keeps the capability:
an explicit **"include diagnostic log" checkbox on the form, default off**,
showing the player what will be sent. Automatic attachment ends; the diagnostic
does not have to.

**i18n.** This foundation is well beyond the 80–120 keys previously estimated.
Rider's steps and first-open guidance, four Upgrade Hub tabs, the Power
Breakdown, Dossiers, Combat Systems, nine Departments, recovery, alerts,
categories and the full vocabulary rename is closer to **300–450 keys against
the current 313** — roughly a doubling. The pipeline handles it, but two known
traps scale with it: the line-anchored parser silently skips a wrapped string,
and the first translation run reported 301/301 green with 32 broken strings in
it. **Check the artefact, not the run.**

---

## 6. The first two-player tester vertical slice

What Matt and one tester can do end to end after Stages 0–5. Deliberately
weighted toward what has **never been observed** — the status record lists the
marches panel, Recall, the reinforcement round trip, drag-to-swap and
multi-player chat as untested, and several of them are on this path.

**Both players, solo first:**

1. Create an account, meet General Rider, complete all seven steps, skip on a
   second account, replay from Help and confirm nothing pays twice.
2. Choose among the five starter skins and see the base change.
3. Open the Upgrade Hub, read a hero asset card, and confirm role, strength,
   weakness and counter match what the resolver actually does.
4. Spend Command Credits and Tokens on a Service Rank with an explicit split,
   and confirm Tokens are never taken first.
5. Watch real rank rise above the Readiness Band, and confirm the asset card
   shows both while the map shows effective power only.
6. Build a mixed squad against the lift budget, including drag-to-swap on a
   phone.

**Together:**

7. March a ground squad and watch it cross the basin; refresh mid-march and
   confirm the position is coherent.
8. March a mixed squad and confirm air assets draw above ground assets, and that
   the group collapses to one formation marker when zoomed out.
9. The defender sees the inbound strip count down, with warnings on and off.
10. Battle settles on read. Both read the report and agree it describes the same
    fight, including Drone outcome and effective levels used.
11. The defeated squad enters recovery, cannot be marched, and becomes available
    at its stated instant.
12. Attack the same opponent repeatedly and confirm rewards fall off.
13. Join one alliance, confirm same-alliance attack becomes reinforcement, and
    **watch the garrison arrive, hold, expire and walk home** — the round trip
    that has never been seen.
14. Recall a march in each state and confirm the return leg takes the elapsed
    time out.
15. File one bug report in each of the six categories and read them back.

**The load-bearing assertion in the whole slice is 5.** If a maxed asset and a
fresh one fight identically under the same band, the Readiness Band works. If
they do not, nothing else in the progression design matters.

---

## 7. Blocking questions

Ordered by what they cost if answered late. The first three carry forward from
`08-BRIEF-RESPONSE.md` and are unchanged by this brief.

**1. The Season 1 economy hole — still open, and now sharper.** The ten-ranks-
per-season shape empties the approved cost curve by about day 15 of 70: a full
24-asset draft to Rank 10 costs 7,800 Command Credits, and the approved earn
schedule clears that on day 15. This brief keeps **Technical Dossier Chapter I
at Rank 10**, which under the band schedule is week 9. So the three systems that
would absorb the surplus — Dossiers, Combat Systems, Departments — arrive in the
last two weeks, and weeks 3 through 9 have no sink at all.

Also: with ten ranks the first upgrade a player buys moves power by **six
percent**, on a curve tuned for thirty ranks. "Next upgrade effect" is a headline
field on every asset card and it will read as noise.

My recommendation is to open Dossier Chapter I nearer Rank 5, make Combat
Systems available from week 2, and re-derive the per-rank curve so the draft is
not finished before the sinks open. Numbers after Stage 0. **This is the one
that changes the build order.**

**2. What may a hostile march reveal?** The brief wants per-asset silhouettes at
close zoom *and* says enemy marches appear only through legitimate detection.
Those pull against each other: drawing six silhouettes tells a defender exactly
what is coming, which is scouting given away free. Proposal — **own and allied
marches render full composition; hostile marches render a generic formation
marker until detection earns more.** One sub-question: may a hostile marker show
ground versus air, which a defender would plausibly see from the ground? I would
say yes. This decides what the server may put in the payload, so it gates
Stage 3.

**3. The Departments question (§0.2).** Where do `airfield` and `barracks` go?
They are two of the three inputs to squad lift, and neither has a home in the
nine departments. Where do `refinery` and `foundry` go — the two that produce
every resource in the game? Either the list gains departments, or existing
buildings fold into the listed ones with their lift and production
contributions preserved explicitly. This is base scope, not naming, and it gates
Stage 7.

**4. How does a Drone speed up a squad?** A squad travels at the pace of its
slowest asset. Does a Drone raise that asset's effective mobility, or multiply
the final march time? Do two Drones stack, and is there a floor? The existing
45-second minimum and 40-minute ceiling should bound it either way. Needed
before test 9 in §4 can be written.

**5. Is Chat a sixth destination, or an overlay?** I have kept it as a
persistent overlay. It changes the header layout, so it should be settled before
Stage 2.

**6. Does Recall survive competitive marches?** The brief says a launched
competitive attack cannot be cancelled after it reveals information.
`POST /api/recall` today cancels any march at any time. Either Recall becomes
unavailable for season-objective and war-window marches, or the rule is narrower
than it reads. A shipped feature is being restricted, so it should be explicit.

**7. The home-ground bonus.** The brief says departments must not grant generic
permanent combat multipliers. `worker/march.ts:425` already gives every defender
`1 + min(0.25, command_post × 0.015)` — up to +25% on defence, permanent, across
all four squads, bought with resources. That is the shape the rule forbids,
though it is defence-only and capped. Keep as a deliberate exception, or remove?
Removing it makes attacking easier everywhere and should be measured in Stage 0
rather than guessed.

**8. What is `munitions` called?** It is one of the four live resources and the
term table has no row for it.

---

## Carried forward, unchanged and not reopened

The three faults in `08-BRIEF-RESPONSE.md` §0.3 and §0.4 are properties of the
code, not of the brief, and this brief does not touch them:

- **The counter ring is open in Season 1.** It is a closed six-cycle; Season 1
  plays five because naval is off. Fixed wing ends with no perfect predator and
  artillery with no perfect prey, so the brief's equal-endgame-value promise is
  false by construction before any number is tuned. A closed five-cycle fixes
  it and leaves six of the seven existing relationships unaltered.
- **Equal point cost does not buy equal value.** `armour` is counted twice in
  the HP formula and `range` is never read by the resolver, while
  `auditAssets()` prices all five attributes identically — and has no callers.
- **The harness is not in the repository.**

All three are Stage 0, all three are cheap, and Stage 0 depends on none of the
eight questions above.
