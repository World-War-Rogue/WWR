# Response to the Complete Product and Season 1 Design Brief

IMPLEMENTATION PLAN AND CONFLICTS — NO CODE WRITTEN

Read against the live repository at `a784d8f`, not against the design documents.
Where this contradicts an earlier document, the reason is given. Nothing here is
verified: everything below is derived from reading code, and only Matt or a
tester can verify a build.

---

## 0. Three findings that come before the plan

Two are arithmetic and one is structural. All three are provable by inspection —
none of them needed a simulation to find, and all three change what should be
built first.

### 0.1 The new level schedule empties the Season 1 economy in about two weeks

This is the largest consequence of the brief and it is not visible from the
brief alone, because it only appears when §5 is put next to the approved cost
curve in `docs/progression/04` and `06`.

Those documents are settled and were modelled on **Season 1 reaching level 30**.
The brief re-scopes Season 1 to **levels 1–10**, with 11–20 in Season 2 and 50
as the eventual ceiling. Everything downstream of that number moves.

Under the approved Curve B′ (25 per level in band 2–5, 45 in band 6–10) a full
24-asset draft to **level 10** costs:

> 24 × (4 × 25 + 5 × 45) = 24 × 325 = **7,800 Command Credits**

Against the approved earn schedule (420/day week 1, 600/day week 2, 910/day from
week 3), a committed free player has earned 7,140 by day 14 and clears 7,800 on
**day 15**.

| | Old Season 1 (level 30) | Brief's Season 1 (level 10) |
| :--- | ---: | ---: |
| Full draft cost | 67,800 | **7,800** |
| Committed player finishes | day 64 | **day 15** |
| Credits earned across the season | ~77,000 | ~77,000 |
| Credits with nothing to buy | ~9,000 | **~69,000** |
| Season spent at ceiling | 6 days | **55 days** |

So from roughly day 15 to day 70 there is no asset upgrade left to make, no
reason to earn Command Credits, and nothing at all that Tokens can accelerate.
The Readiness Band does not even reach 10 until week 9, so the ceiling is
personal *and* seasonal — a player finishes their draft five weeks before the
band lets them use it.

The monetisation is dead for 79% of the season, and so is the progression loop
that Command Credits exist to serve.

**This is not an argument against the ten-levels-per-season shape.** That shape
is better than the old one, and it fixes a real problem I raised in
`07-READINESS-BAND` §1 — a maxed Season 1 veteran with ten idle weeks in Season
2. Under the brief, Season 2 hands them levels 11–20, which is genuine
progression. The naval-in-Season-2 recommendation in that document is
**superseded and should be dropped**; naval stays in Season 3 as the brief says.

What it does mean is that **Blueprints, Squad Systems and Base Departments stop
being enrichment and become the Season 1 economy.** The brief treats them as
secondary — Blueprint Chapter 1 unlocks at level 10, which under the band
schedule is week 9. That leaves weeks 3 through 9 with no sink at all.

Three ways out, and this needs a designer decision, not an engineering one:

1. **Move the sinks earlier.** Blueprint Chapter 1 at level 5 rather than 10,
   Squad Systems available from week 2, Base Departments costing Command
   Credits. Cheapest, and it makes the brief's own systems load-bearing.
2. **Re-derive the cost curve for a 10-level season.** Multiply the per-level
   cost by roughly 8–9× so the draft still takes most of a season. Preserves the
   old model's shape, but a single level-up then costs more than a week of play
   at the top band, which reads badly.
3. **Re-derive the earn schedule downward.** Worst of the three: it makes every
   activity feel less rewarding to fix a problem the player did not cause.

**I recommend (1) with a partial (2)** — pull the sinks forward, and lift the
per-level costs enough that the draft is not finished before the sinks open.
Both numbers have to come after Stage 0, because both depend on what a level is
worth once the resolver is repaired.

### 0.2 The per-level power step is now too small to feel

`attributeAtLevel(base, level) = round(base × (1 + 0.06 × (level − 1)^1.15))`

That curve was tuned so that thirty levels spanned a **3.89×** range. Ten levels
span **1.75×**, and the first upgrade a player ever buys — level 1 to 2 — is
**+6%**. Level 2 to 3 is +6.9%.

A player who spends currency and watches a number move by six percent will
conclude the upgrade did nothing. The brief requires every asset card to show
"next upgrade effect" (§6), and under this curve that line reads as noise for
the whole of the early season.

The curve needs re-deriving for the 50-level, ten-per-season shape: steeper
early so each of Season 1's ten levels is felt, flatter late so level 50 does
not run away. This belongs in Stage 0 with the resolver work, because
`assetPower` feeds power display, battle inputs, the map, and every cost model
above.

### 0.3 The counter ring is broken open, and it is why the known combat faults exist

`docs/COMBAT.md` records three unresolved faults: fixed wing beats rotary 100%
of the time, pure drone squads cannot win, and the composition band has not been
re-measured. All three have one cause, and it is structural rather than a
tuning problem.

`shared/combat.ts:118` defines a **closed six-category ring**. Every category has
exactly one perfect prey and one perfect predator, one medium prey and one
medium predator. It is symmetric, and it is correct — as long as all six
categories are playable.

Season 1 has five. Naval is `draftable: false`. **Removing one link from a ring
does not shorten the ring, it opens it**, and the two categories on either side
of the gap lose their balance:

| Season 1 category | Perfect prey | Perfect predator | Medium prey | Medium predator |
| :--- | :--- | :--- | :--- | :--- |
| armour | drone | rotary | artillery | fixed wing |
| rotary | armour | fixed wing | drone | **none** |
| fixed wing | rotary | **none** | armour | artillery |
| artillery | **none** | drone | fixed wing | armour |
| drone | artillery | armour | **none** | rotary |

Fixed wing is the only category with no perfect predator. Artillery is the only
one with no perfect prey. Rotary has no medium predator, drone has no medium
prey. Counting both tiers: **fixed wing and rotary run 2 prey to 1 predator,
artillery and drone run 1 to 2, armour is even.**

That is exactly the reported symptom, and it means brief §3 — *"At equal
investment, no asset should have a universally larger endgame value than
another"* — **is currently false by construction**, before any number is tuned.
No adjustment to `COUNTER_PERFECT` or `COUNTER_MEDIUM` can fix it, because the
fault is the shape of the graph, not the magnitude of its edges.

**The fix is a closed five-cycle for Season 1**, restoring the six-cycle when
naval arrives in Season 3. Ordering the playable categories
armour → drone → artillery → fixed wing → rotary → armour, with medium two steps
on, gives every category exactly one perfect prey, one perfect predator, one
medium prey and one medium predator.

It is also a small change. Seven relationships currently exist between playable
categories; **six of them survive unaltered.** Only `artillery → fixed wing`
changes character (medium becomes perfect — defensible as air defence), and two
medium links are added (`drone → fixed wing`, `artillery → rotary`).

The durable version of this is that **the ring must be a property of the
draftable set, not a hardcoded constant** — otherwise Season 3 breaks it again
in the opposite direction when naval switches on.

### 0.4 Two smaller faults in the same area

**The published counter web is not the implemented one.** `shared/assets.ts:154`
exports a second table, `COUNTERS`, used only by the asset catalogue screen
(`src/live/Assets.tsx:84,136`). It disagrees with the resolver in six of twelve
entries — it claims artillery beats armour, naval beats artillery, drone beats
fixed wing, and fixed wing loses to drone. The resolver implements none of
those. Brief §6 requires every asset card to show its counter, so today the game
would be telling players a lie in a screen the brief makes central. One of the
two tables has to be derived from the other; the resolver's is the real one.

Interesting detail worth flagging to the designer: `COUNTERS` is *closer* to a
five-category ring than the resolver is. It may be an unreconciled draft of
exactly the fix proposed in 0.3.

**Equal point cost does not buy equal value.** `auditAssets()` enforces
`pointsSpent === pointBudget(lift)` exactly, treating all five attributes as
equally priced. In the resolver they are not:

- `armour` is counted **twice** — once in the `points` sum that sets HP, then
  again through `HP_PER_ARMOUR`.
- `range` is counted **once and then never used**. `build()` reads it only into
  the points sum; the combat band comes from `CATEGORY_BAND`, not from `range`.
- `firepower`, `mobility` and `detection` each do one job.

So an asset that spent its budget on armour is strictly stronger than an
identical-cost asset that spent it on range, and the audit calls both correct.
This is the second independent reason §3's equal-value promise does not hold
today. Either `range` earns a role in the resolver, or it stops costing points.

**And `auditAssets()` has no callers.** The invariant the whole catalogue rests
on is written down and never executed. `npm run lint` is `tsc --noEmit` only.

**And the ten-thousand-battle harness is not in the repository.** It is cited
five times in comments and twice in `docs/`, but there is no script, no test, no
dev route, and no test runner in `package.json`. The only caller of `resolve()`
in the codebase is march settlement. The three faults in COMBAT.md therefore
cannot currently be re-measured by anyone, which makes Stage 0 the first
buildable thing regardless of what else is agreed.

---

## 1. Staged implementation plan

The brief's build order in §18 is right and I have kept it, with one structural
change: **the season skeleton moves from last to near-first.**

The reason is the brief's own interface requirements. §14 puts the current
Readiness Band in the persistent header. §6 requires every asset card to show
effective Season level. §5 requires the Power Breakdown to open with Effective
Core Power. All three are unbuildable without a season record and a
phase-from-instant function. Under the old plan that was Stage A of the seasonal
work and arrived after everything else; under the brief it is a dependency of
the second screen a player sees.

Each stage is independently playable and independently deployable.

### Stage 0 — Combat truth

No player-visible change. Nothing numeric can be agreed until this lands.

- Commit the simulation harness as `scripts/simulate.mjs`, so the ten thousand
  battles are reproducible by anyone.
- Wire `auditAssets()` into `npm run lint` so the budget invariant is executed.
- Close the counter ring over the draftable set (§0.3) and make it derive from
  that set rather than being hardcoded.
- Collapse the two counter tables to one source (§0.4).
- Decide `range`: give it a resolver role or stop charging points for it (§0.4).
- Re-derive `attributeAtLevel` for ten levels per season across five seasons
  (§0.2).
- Re-measure and rewrite `docs/COMBAT.md` §10 with a fresh table.

Exit condition: the five measured outcomes in §4 below all sit in their target
bands, and the three open COMBAT.md items are closed with numbers.

### Stage 1 — The season and wallet spine (server)

- `seasons`, `season_phases` — season record, phase from instant, Readiness Band
  from phase. Pure function in `shared/season.ts`, derived and never stored per
  player, as specified in `07-READINESS-BAND` §2.
- `marches.readiness_band`, written at launch and read at settlement.
- Wallets: Tokens and Command Credits as balances on the player, with an
  append-only ledger so a purchase can be audited and a spend cannot be replayed.
- `POST /api/assets/upgrade` — the first payment path that touches an asset.
  Player chooses the split; **Tokens are never spent first by default**.
- Power becomes a structured value rather than a scalar (§5 below).

Playable solo. A player can spend and level for the first time.

### Stage 2 — Shell, navigation and the Upgrade Hub (client)

- Persistent header and five-tab navigation (§3 below). This also fixes a
  shipping defect: today the bug-report form is reachable only from the base
  screen, so a player on the map cannot report a map bug without leaving it.
- Upgrade Hub → Assets. Asset cards with real level, effective level, current
  power, next upgrade effect, cost, role, strength, weakness, counter, and the
  Power Breakdown.
- Wallet display and the payment-split control.

Playable solo. This is the first stage a tester can meaningfully judge.

### Stage 3 — The pale basin and visible marches

- Season 1 terrain treatment — salt flats, hardpan, dry channels, rock shelves,
  scrap landmarks. Visual only, as §11 requires; `src/live/terrain.ts` already
  derives terrain as a pure function of world, season and plot with nothing
  stored and nothing over the wire, so this is a re-skin of an existing layer,
  not a new system.
- March rendering: formation markers, ground versus air, per-asset silhouettes
  at close zoom, collapse to one marker at range. Existing chevron and
  interpolation stay; composition is added to the payload subject to the
  scouting question in §6.

### Stage 4 — General Rider onboarding

- Seven static localised steps, highlight targeting, Back/Next/Skip/Finish,
  completion stored per account, replay from Help, reduced-motion respected.
- Five reusable poses as flat art with restrained CSS motion. No rig, no
  runtime dialogue, no AI chat, per §15.

### Stage 5 — PvP that costs something, and the alert channel

- Temporary squad recovery with an absolute `ready_at`, settled on read.
- Battle reports extended: effective levels used, drone outcome, recovery state.
- The defender's countdown strip, agreed on 2026-09-05 and still unbuilt.
- Alert settings: visual on/off, audible on/off, Test Warning. Both default off.
- Bug-report categories (§16 names six; the form has none today).

### Stage 6 — Boot Sequence

- The six onboarding operations, daily claim index, catch-up track,
  participation, protected alliance state, Alliance Supplies earning.

### Stage 7 — Blueprints, Squad Systems, Base Departments

**Ordering note:** §0.1 argues these are the Season 1 economy rather than
enrichment. If the designer takes option (1) there, Stage 7 moves ahead of
Stage 6 and probably ahead of Stage 5, because without it weeks 3 through 9 have
no sink. I have left it last here because the brief places it last; I would move
it, and I would like that decided rather than assumed.

### Beyond

Factories and supplies, scheduled warfare, war assets, the Colossus, the Core
and rewards continue to follow Stages C–F of the existing season plan, which the
brief does not change.

---

## 2. What to preserve, change and remove

### Preserve — these already match the brief and should not be touched

| Thing | Where | Why |
| :--- | :--- | :--- |
| Server authority, absolute instants, settle-on-read, uniqueness by index | throughout | §2 restates these as foundational; they are already the house style and are load-bearing in eleven places |
| `shared/` as the single catalogue both sides import | `shared/` | §2's "defined once in a shared module" is already the rule, and exists because of a real bug |
| The pure resolver | `shared/combat.ts` | §2 requires exactly this. Its purity is what makes Stage 0 cheap |
| 72 assets, 12 per category, points budget | `shared/assets.ts` | §3's roster. No rarity, no random rolls — already true |
| Lift, not slot count | `squadLiftBudget` | §3, already enforced server-side |
| Four squads, six slots, independent levelling | `0015` | §3, exact match |
| March, reinforce, recall, garrison, frozen roster | `worker/march.ts`, `0016`–`0017` | §11's server authority over arrival; `marches.units` is the pattern `readiness_band` will follow |
| Five starter base skins | `0019` | §13's list, already shipped and already migrated |
| Bug reporting | `0018`, `worker/support.ts` | §16, mostly built — rate limited, bounded, read-back guarded, reference number returned |
| i18n build-time pipeline, 313 keys, 19 languages | `src/i18n/` | §2's static-and-translated rule; the pipeline is the reason it is affordable |
| Rogue Standard Time | `07-GAME-TIME` | Unchanged by the brief |
| Chat with translation, alliances, cosmetics, profiles | various | Untouched by the brief, and chat is the differentiator |

### Change

| Thing | Now | Needs to be |
| :--- | :--- | :--- |
| `ASSET_MAX_LEVEL` | `30`, and **dead — zero references** | `50`, and actually enforced on the upgrade path |
| `attributeAtLevel` | tuned for 30 levels; 10 levels span 1.75× | re-derived for 10-per-season to 50 (§0.2) |
| Counter ring | open in Season 1 | closed over the draftable set (§0.3) |
| `COUNTERS` (UI) | disagrees with the resolver in 6 of 12 | derived from `COUNTER` (§0.4) |
| `range` | costs points, does nothing | earns a role, or stops costing |
| `auditAssets()` | no callers | runs in `npm run lint` |
| Power | one integer, `assetPower → round(6 × Σ)` | a structured breakdown (§5) |
| Navigation | no tab bar; two per-screen header rows; Settings reachable only from the base screen | persistent header + five tabs (§3) |
| Settings | bug-report form only | alert toggles, Test Warning, bug categories |
| Battle report | winner, power, losses, loot, rounds, notes | plus effective levels, drone outcome, recovery state, stale-objective explanation |
| March payload | kind and timing only | plus composition, subject to §6's scouting question |
| Home-ground bonus | `1 + min(0.25, command_post × 0.015)` | see §6 — this is a permanent global combat multiplier from a building, which §6 of the brief forbids |

### Remove

**The dead prototype tree: `src/App.tsx`, `src/components/` (15 files),
`src/data/`, `src/utils/`, `src/types.ts`, `src/types/`.**

`src/main.tsx` mounts `LiveApp` and nothing imports `App`. That tree is
**25,219 lines — 1.4× the size of the entire live game (17,925).**

It is not merely dead, it actively contradicts the brief:

- `src/data/pilots.ts` defines `PilotHero` and `HeroCategory` — a human-hero
  system with named aces and hero categories. Brief §12: *"Do not add human
  heroes. The machine is the hero."*
- `src/components/CombatSimulatorView.tsx` looks like the combat harness and is
  not — it imports `../data/units` and `../data/pilots` and never touches
  `shared/combat.ts`. Anyone looking for the harness finds this first.
- `src/types.ts` defines a four-value `SeasonId` unrelated to anything the
  server will do.

Every one of those is a trap for a future reader, including a future Claude
session. Deleting it costs nothing and removes the most likely source of a wrong
answer about what this game is.

---

## 3. Screen hierarchy and visual approach

### The gap the brief does not name

§14 gives five primary tabs: Map, Squads, Upgrade Hub, Alliance, Profile. The
live game has eight screens plus a chat overlay and a settings modal. Three
things that ship today have no home in the brief's navigation:

- **Base.** The base screen is not the same thing as Base Departments. It holds
  the resource bar, build jobs, the rendered base with its four cosmetic layers,
  and the skin the player chose. §13 is entirely about how a base looks and §14
  never says where a player looks at it.
- **Chat.** Nineteen languages with live translation is the thing that
  distinguishes this game, and it is not in the brief at all.
- **Battles.** Battle reports are specified in detail in §9 and given no
  location in §14.

### Proposed hierarchy

Persistent header, on every screen (§14):

> Profile entry · Season · Readiness Band · Tokens · Command Credits · Alliance · inbound-attack strip

The inbound strip is the component agreed on 2026-09-05 — rendered only when
something hostile is inbound, absolute arrival instant counted down
client-side, hanging off the existing chat poll rather than adding one.

Five tabs, as the brief specifies:

| Tab | Contains |
| :--- | :--- |
| **Map** | The world, marches, and — as a screen, not a tab — **Base**, reached the way it is today by a centre button. Base keeps the resource bar, build jobs, cosmetics and skin selection. |
| **Squads** | Alpha/Bravo/Charlie/Delta, lift, drag-to-swap, marches panel and Recall. |
| **Upgrade Hub** | Assets · Blueprints · Squad Systems · Base — the brief's four tabs exactly. Base here is Departments, not the base view. |
| **Alliance** | Roster, ranks, applications, crest, pennant, Alliance Supplies. |
| **Profile** | Player, then **Settings · Add Tokens · Log Out** in that order (§14). Battle reports live here, and Help — including Rider replay. |

**Chat stays a persistent overlay rather than becoming a tab.** It is already
reachable from every screen, it must remain reachable while a player is doing
something else, and a tab would make it modal. This is a deliberate departure
from a five-tab reading of §14 and I would like it confirmed.

### Visual approach

- **Mobile-first, one column, thumb-reachable.** The existing failure to learn
  from: the asset picker "did nothing" because it rendered below four squad
  cards, off-screen on a phone. A sheet is not a panel.
- **Silhouette first.** At 40 pixels all interior detail is gone — established
  by the skin work and true again for the six asset categories and for formation
  markers. Armour widest, drone smallest, air shapes visibly airborne.
- **Dark art on light ground.** Season 1 is a pale dry basin, which is why the
  basin was chosen. Hero asset art should be dark-bodied so it reads against it.
- **Three asset renditions**, as §12 requires: hero card, squad formation, map
  silhouette. `shared/assetArt.ts` already draws the third in a 24×24 box and
  should be extended rather than replaced.
- **Restrained motion, reduced-motion respected**, and no continuous client
  writes — the map already forces its animation loop only while a march exists.

---

## 4. The combat simulation plan

Stage 0's output is a committed harness and a measured table. The brief asks for
equal fights, favourable counters, unfavourable counters, and high-versus-low
effective level. I would add two, because §0.3 and §0.4 mean the current faults
are structural and would otherwise be measured without being explained.

`scripts/simulate.mjs`, importing `shared/combat.ts` directly — no worker, no
database, no network, which is what the resolver's purity buys.

| # | Measurement | Target | Why |
| ---: | :--- | :--- | :--- |
| 1 | Mirror match, identical squads, 10,000 seeds | 48–52% each way | Baseline. Anything else means the seed or the initiative order is biased |
| 2 | Perfect counter, equal power | 60–75% | A counter should decide a close fight, not every fight |
| 3 | Medium counter, equal power | 55–65% | Must be visibly weaker than perfect |
| 4 | Mixed squad vs mono squad, equal power | mixed 60–70% | The central claim of the design. Once measured at the opposite of this |
| 5 | Every category against every other, equal power, 10,000 each | **no category above 55% or below 45% averaged across all opponents** | This is the §3 promise as a number, and the test §0.3 currently fails |
| 6 | Effective-level gap sweep: 0, 1, 2, 3, 5 bands apart | upsets fall smoothly; no cliff | The old table (29% / 6% / 1% / 0%) was measured on the 30-level curve and is void under §0.2 |
| 7 | Level 30 real vs level 10 real, both clamped to band 10 | **byte-identical `CombatResult`** | `07-READINESS-BAND` §5 test 1. The cheapest and most load-bearing assertion in the whole system |
| 8 | Attribute value probe: two assets, equal budget, one all-armour, one all-range | win rate within 45–55% | Directly tests §0.4. Currently expected to fail badly |

Tests 5, 7 and 8 should be standing assertions that fail the build, not one-off
measurements — 7 especially, because the entire Readiness Band mechanic is
proven or disproven by it in a single comparison.

**Only after this table is green should any of these be fixed:** per-level cost,
earn schedule, Blueprint effect sizes, Squad System effect sizes, war-asset
modifiers, or the Seasonal Power Skin's +10%. Tuning a modifier against a
baseline known to be wrong is how the three COMBAT.md faults survived this long.

---

## 5. Data and authority plan

Everything below follows the house rules already in `CLAUDE.md`, because the
brief's §2 and those rules are the same document written twice.

### Upgrades

`player_assets.level` exists and has **no `UPDATE` anywhere in the codebase** —
levels are plumbed end to end and are always 1. Adding the upgrade path is the
first write.

- Wallets: `players.tokens`, `players.credits`, plus an append-only
  `wallet_entries` ledger. Balance is the authority; the ledger is the audit.
- `POST /api/assets/upgrade` takes asset, target level, and an explicit
  `{tokens, credits}` split that must sum to the cost. The server recomputes
  cost from the catalogue and refuses a mismatch. **Never a default that spends
  Tokens first** (§8).
- The spend is a conditional update — `WHERE tokens >= ?` — so two tabs cannot
  both pay. Same shape as the march settle at `march.ts:369`.
- Level is validated against `ASSET_MAX_LEVEL` and against the season's
  permitted range, both server-side.

**One existing defect to fix in the same pass:** build-job collection at
`worker/index.ts:285` issues `UPDATE build_jobs SET collected_at` with no
`AND collected_at IS NULL`. Two concurrent reads of `GET /api/base` can both
apply the same finished job. The building update is idempotent so the damage is
bounded to a double resource settle today — but the upgrade path must not copy
that pattern, and the existing one should be corrected while the idiom is in
hand.

### Power, and the breakdown

`assetPower` returns one integer. §5 wants a four-part breakdown, and one part
of it cannot be a number.

> Effective Core Power → Permanent Build Adders → Role/Tactical Interaction → Temporary Seasonal Effect

Core Power and Build Adders are scalars and compose additively. **Role and
tactical interaction are not** — a counter is a relationship between two
squads, so it has no value until an opponent exists. Printing a single number
for it on an asset card would be inventing one.

Proposal: the breakdown shows **Core and Adders as numbers that sum to the
displayed power**, and shows **Role/Tactical and Seasonal as named effects**,
each with the trigger, benefit, limitation and counter that §5C already
requires. That keeps the displayed power honest — it is what the card claims and
what the resolver receives — and puts the conditional parts where their
conditions can be stated.

`assetPower` becomes `assetPowerBreakdown(asset, realLevel, band, adders)`
returning the parts, with a scalar accessor for the map. Still computed on read,
never stored.

### Movement

- Timing unchanged: absolute `arrives_at`, client interpolates, the server alone
  decides arrival. Already correct.
- `marches.readiness_band` written at launch, exactly as `marches.units` freezes
  the roster.
- **Drone speed needs a rule the brief does not give.** March pace is
  `marchSeconds(plots, slowestMobility)` — the squad travels at its slowest
  asset. §7 says a deployed Drone improves squad march speed. Whether that
  raises the slowest asset's mobility, applies a multiplier to the final time,
  and whether two drones stack, is undefined. See §6.
- Composition in the march payload is what makes §11's silhouettes possible, and
  is a scouting decision rather than a rendering one. See §6.

### Battle reports

- The report is already denormalised into `battles` with a `detail` blob, which
  is right: a report must survive the roster and the alliance changing.
- Add the effective levels used, the recorded band, drone outcome, and resulting
  recovery state.
- §9's "clear explanation if a battle result did not change territory because
  objective state was already stale" needs the report to carry an outcome reason,
  not just an outcome — a field, not a sentence, so it can be translated.

### Recovery

New state with an absolute `ready_at`, settled on read like everything else. It
has no natural home today: there is no `squads` table, only `squad_slots`. A
`squad_state` table keyed `(player_id, squad)` is the cheapest place, and it must
be counted by `idx_marches_squad_busy`'s sibling logic so a recovering squad
cannot march — the garrison bug is the precedent for exactly this class of
mistake.

### Onboarding

- Completion stored per account, one row. Replay allowed, and replay grants
  nothing — the reward, if any, is keyed to the account, not to the run.
- All seven steps are static translated keys. No runtime prose (§2).

### Alerts

- Two booleans on the player, both default off, plus Test Warning.
- The strip reads the existing chat poll (4s open / 25s collapsed) rather than
  adding a poll, and hostile only — never ally reinforcements.
- **The strip and the warning are two different things**, and the brief blurs
  them. The strip is always-present UI showing an inbound count and a countdown;
  the settings control the *alert* — the one flash and the one sound. Otherwise
  "default off" means a defender gets no clock at all, which was the problem the
  strip was designed to solve.

### Bug reports

Mostly built. §16 needs three additions: a **category selector** (the six
categories in §16 — today there is none, only the auto-captured screen), the
category persisted alongside the existing context, and a way to look up a report
by the eight-character reference the player is shown. That reference is
currently a display truncation with no endpoint behind it, so a player quoting
it cannot be found without a manual scan.

§16 also says not to capture console logs automatically. **This conflicts with
what ships**: `recentErrors()` sends the last 20 console lines with every
report. I read the brief's intent as private chat and payment details rather
than diagnostics, and the existing capture is bounded, re-serialised server-side
and enormously useful. Flagged rather than changed. See §6.

### i18n

Season 1 as briefed is well beyond the 80–120 new keys previously estimated.
Rider's seven steps, the Upgrade Hub's four tabs, the Power Breakdown, Blueprints,
Squad Systems, Base Departments, recovery, alerts and bug categories is closer to
**250–400 keys against the current 313** — roughly a doubling. The pipeline
handles it (build-time, free per player, corrections preserved across runs), but
two known traps get proportionally more dangerous: the line-anchored parser, and
trusting the run rather than the artefact. The first translation run reported
301/301 green with 32 broken strings in it.

---

## 6. Blocking questions

Only the ones where I would otherwise be guessing at a rule, and where guessing
wrong means rework rather than a tweak. Ordered by how much they cost if
answered late.

**1. The Season 1 economy hole (§0.1).** Ten levels per season empties the
approved cost curve by about day 15 and leaves 55 days with no sink and nothing
Tokens can accelerate. Pull Blueprints and Squad Systems earlier, re-derive the
cost curve upward, or both? I recommend both, with the numbers set after Stage 0.
**This is the one that changes the build order**, so it is worth answering before
anything else.

**2. Does the Readiness Band schedule in §5 replace the approved one?** The
settled schedule is 5, 5, 10, 14, 18, 22, 25, 27, 29, 30 with a level-30 Season 1
ceiling (`docs/progression/06`, approved). The brief gives 2, 3, 4, 5, 6, 7, 8, 9,
10, 10 with a level-10 ceiling. I have assumed the brief supersedes it and that
`06`'s projections are void. Confirm, because every currency number in `04` and
`06` is derived from the old one.

**3. The Token weekly ceiling.** §8 calls this unresolved and floats 10,000 or
100,000 per week. It was approved at **10,000 per week, Monday 00:00 RST**, and
that number is not cosmetic — `04` derives the entire cost curve from it, because
a 10,000 ceiling is what caps a level-up at 119 currency for the throughput rule
to hold. 100,000 would break that derivation. Is this genuinely reopened, or is
§8 describing history?

**4. Does Recall survive competitive marches?** §9 says a player cannot cancel a
competitive march after learning information revealed by launch. `POST /api/recall`
today cancels any march at any time and walks the squad home over the elapsed
duration. Either recall becomes unavailable for season-objective and war-window
marches, or §9's rule is about something narrower. This is a shipped feature
being restricted, so it should be explicit.

**5. Do hostile marches reveal composition?** §11 wants per-asset silhouettes at
close zoom, and also says enemy marches appear only through legitimate detection.
Those pull against each other: drawing six silhouettes tells a defender exactly
what is coming, which is scouting information given away for free. My proposal —
**own and allied marches render full composition; hostile marches render a
generic formation marker until detection earns more** — leaves one sub-question:
may a hostile marker show ground versus air, which a defender would plausibly see
from the ground? I would say yes and would like it confirmed.

**6. How does a Drone speed up a squad?** §7 requires it; the march rule is
"pace of the slowest asset". Does a drone raise the effective mobility of the
slowest asset, or multiply the final march time? Do two drones stack, and is
there a floor? The 45-second minimum and 40-minute ceiling already exist and
should probably bound it either way.

**7. The home-ground bonus.** §6 says base upgrades must not create global
permanent combat multipliers. `worker/march.ts:425` gives every defender
`1 + min(0.25, command_post × 0.015)` — up to +25% on defence, permanent, global
across all four squads, bought with resources. That is the shape §6 forbids,
though it is defence-only and capped. Keep it as a deliberate exception, or
remove it? Removing it makes attacking easier everywhere and should be measured
in Stage 0 rather than guessed.

**8. Is Chat a sixth destination?** §14 lists five tabs and does not mention
chat. I have kept it as a persistent overlay (§3). Confirm, because it changes the
header layout.

**9. Blueprint Chapter 1 at level 10** means blueprints unlock in week 9 of a
ten-week season, for players who reached real level 10. Is the Blueprint system
intended to be effectively a Season 2 system that merely opens at the end of
Season 1? If yes, that makes question 1 sharper, because it removes one of the
two sinks. If no, Chapter 1 should open lower.

**10. Console lines in bug reports** (§5 above). §16 says do not capture console
logs; the shipped report captures the last 20 bounded lines and they are the most
useful field in the table. Keep, or strip?

---

## What I have not reopened

Per the brief's closing instruction: cumulative Core hold time and its tiebreaks,
pro-rated factory output, computed Alliance Supplies, no membership lock during
an assault, the pennant, staggered war windows, the settlement watermark, the
frozen Colossus integrity pool, reserved objective plots, ring-derived objective
coordinates, Preseason as its own row, and the population gate are all settled in
`docs/season-1/01`–`07` and are unchanged here. The nineteen languages, the
no-rarity rule, the two-currency model, cosmetics granting no power, and Rogue
Standard Time likewise.

---

## Recommended next action

Approve or amend §6's ten questions, and settle question 1 in particular.
**Stage 0 can start before any of them are answered** — it depends on none of
them, it blocks all the numbers, and it is roughly a day of work against a
harness that should have been committed the first time it was run.
