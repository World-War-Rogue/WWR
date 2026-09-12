# World War Rogue — Implementation Plan

PLAN ONLY — NO CODE WRITTEN

Written against the consolidated product direction. Everything below comes from reading the current repository, the seven Season 1 design documents, `COMBAT.md`, `SQUADS-AND-HEROES.md`, `HOW-IT-WORKS.md` and the live migration set. Nothing here is verified in a running game; where I state what the code does, I am reporting what the code says.

**The finding that reorders everything:** there is no asset progression system. Every player is granted all 60 draftable assets at level 1 on first read, and no endpoint anywhere writes `player_assets.level`. `ASSET_MAX_LEVEL = 30` and `attributeAtLevel()` exist and are correct; nothing calls them to upgrade anything.

Tokens fund upgrades. There are no upgrades. **The progression system has to exist before the currency that buys it can be designed, priced, or capped.**

## 1\. Current state

### Already implemented and matching this direction

| Area | State |
| --- | --- |
| Server authority | Holds. Every meaningful number is server\-side; the client sends a plot, never a defender id. |
| Nothing ticks | Holds. `settleArrivals` runs on map read; battles are fought by whoever looks next. |
| Absolute timestamps | Holds. `marches.arrives_at`, build jobs, garrison expiry are all absolute instants. |
| Combat as a pure function | Holds. `shared/combat.ts` `resolve()` reads no clock, no DB, no map. Five rounds, mulberry32 seeded. |
| Deterministic seed | Holds. `seed = hash(march.id) % 2147483647` — derived from a stored id, so it is reproducible. |
| Power computed on read | Holds. `assetPower()` is called per read; nothing stores a power number. |
| No rarity tiers | Holds. No tier, star, or rarity field exists anywhere. |
| Cosmetics grant no power | Holds. Cosmetics are ids on the base row, read only by the renderer. |
| Shared catalogue module | Mostly holds — one live violation, see §2. |
| Uniqueness by index | Holds where it matters: `idx_squad_slots_one_squad_per_asset ON squad_slots(player_id, asset_id)` exists in migration 0015. One asset cannot sit in two squads, and it is the database saying so, not a check. |
| Five starter base skins | Shipped today. All five free, switchable, visual\-only. Old six removed, migration 0019 remapped existing bases. |
| Bug reporting | Shipped today, partially matching §2. Gaps in §2 below. |
| 19\-language interface | Holds. 313 committed keys, no runtime\-generated player prose. |

### Partially implemented

**Combat is wired but shallow.** `resolve()` is called from `worker/march.ts` on settlement, battle rows are written, and `/api/battles` reads them back. What is missing against `COMBAT.md`'s own build order is phases 2–7: damage and repair state, shields, the power floor, loot caps, and the arena. Loot columns exist and are always zero.

**Battle input is only half frozen.** The attacker's squad and levels are snapshotted into `marches.units` at launch — deliberately, so a roster swap mid\-flight cannot cheat. The **defender is read live at settlement**, also deliberately, with the comment: *"a defender rearranging while somebody is inbound is exactly the reaction the warning exists to allow."* See §2, collision 1.

**Bug reporting** has no category field, which §2 of the direction requires.

### Absent entirely

- **Asset levelling.** No endpoint, no cost curve, no resource sink. This is the big one.
- **Tokens.** No balance, no ledger, no packages, no payment provider, no webhook.
- **Tactics.** No enum, no column, no parameter. `resolve()` has no tactic input and `COMBAT.md` never proposed one.
- **Combat roles as this direction defines them.** The code has six roles (`breach`, `screen`, `strike`, `overwatch`, `recon`, `lift`); the direction proposes six different ones (Breaker, Bulwark, Hunter, Disruptor, Engineer, Commander). These are not the same six.
- **Signature specialties, counter relationships per asset, map specialties, tuning choices.** None exist.
- **Hostile\-inbound strip and alerts.** Nothing.
- **All Season 1 tables.** `seasons`, `season_objectives`, `season_ownership_events`, `season_windows` do not exist. Latest migration is 0019.
- **Events.** Asset Trials, Counter Drills, Squad Trials, Alliance Operations, War Games, Rogue Exercises — none.
- **Rogue Standard Time.** `07-GAME-TIME.md` decides UTC\-7 with no DST; `shared/gametime.ts` does not exist and chat still renders 12\-hour local time.
- **Password reset.** Still absent. With 100 testers arriving this is a live operational risk, not a roadmap item.
- **Text filtering, block, mute, report.** Absent. The Season 1 population gate depends on these before open signups.
- **Simulation harness.** `COMBAT.md` §11 reports figures from "ten thousand simulated battles." No test file or harness exists in the repository. Those numbers are not reproducible from this repo.

## 2\. Collisions

These are places where the direction contradicts the code, the design documents, or itself. Each needs a decision.

### 1\. "Complete immutable battle input" vs the defender's right to react

The direction says a battle receives *a complete immutable battle input*. The code freezes the attacker at launch and reads the defender live at settlement, on purpose — and §3 of this same direction builds an alert system whose entire point is to let a defender react to an inbound attack.

Freezing the defender at launch makes the hostile\-inbound warning decorative: you would be told something is coming and be unable to do anything about it.

**Recommendation:** keep the defender live, and redefine immutability as *frozen at resolution*. The resolver already receives a complete frozen input — it just gets assembled at settlement rather than at launch. To make the battle genuinely replayable, store the **resolved** inputs: both rosters with levels, both modifiers, and the seed. Today the seed is recoverable from `march.id` but the defender's roster at resolution time is recorded nowhere, so no battle can currently be replayed.

### 2\. Two contradictory counter tables in `shared/`

`shared/combat.ts` exports `COUNTER`, which the resolver uses. `shared/assets.ts` exports `COUNTERS`, which nothing reads. They disagree:

|  | `COUNTERS` (dead) | `COUNTER` (live) |
| --- | --- | --- |
| Artillery beats | armour | naval, fixed wing |
| Drone beats | artillery, fixed wing | artillery, naval |
| Naval beats | artillery | fixed wing, rotary |

`COMBAT.md` §6 documents the dead one. This directly violates *"any shared catalogue must live in one shared module used by both client and server."* Two disagreeing counter webs in the same directory is exactly the failure `shared/` was created to end — the same class of bug that made Ravenkeep vanish from Customise.

**Recommendation:** delete `COUNTERS`, correct `COMBAT.md` to match the live table, and only then design per\-asset counter relationships.

### 3\. Combat multipliers do not match any document

`COMBAT.md` §6 says ×1.5 / ×0.6. §11 revises to ×1.35 / ×0.75. The code uses `COUNTER_PERFECT = 1.2`, `COUNTER_MEDIUM = 1.1`, **and has no penalty multiplier at all** — `counterOf` returns `?? 1`. The direction says counters *"must matter, but must not make a fair fight unwinnable."* Nobody can judge whether they currently do, because the documented numbers are not the shipped numbers.

### 4\. The known\-wrong combat baseline

`COMBAT.md` §11 records three open items: fixed wing beats rotary 100% of the time, pure drone squads cannot win, and the composition band has not been re\-measured. `03-DESIGN-RESPONSE.md` §8 already ruled that war\-asset values are not final until these are re\-simulated.

Designing six roles, per\-asset specialties and tactics on top of a baseline with two known\-broken matchups means tuning against a ruler that is bent. **The harness must be built and those three closed before specialty design begins.** No harness currently exists, so this is build\-then\-run, not just run.

### 5\. Six roles vs six different roles

The direction's roles (Breaker, Bulwark, Hunter, Disruptor, Engineer, Commander) are a behavioural taxonomy. The code's roles (`breach`, `screen`, `strike`, `overwatch`, `recon`, `lift`) are a hardware taxonomy currently driving squad composition and the exposure penalty.

They partly map — `breach`→Breaker, `screen`→Bulwark, `strike`→Hunter, `recon`→ nothing obvious — but Disruptor, Engineer and Commander have no equivalent, and `overwatch`, `recon` and `lift` have no home in the new set.

**Decision needed:** replace the existing roles, or layer the new ones on top as a second axis? Replacing means re\-tagging 72 assets and re\-tuning composition. Layering means two role systems, which is the same trap as the two counter tables.

### 6\. Bug reporting is missing its category

Shipped today without one. §2 requires Gameplay / Combat result / Map / Account or purchase / Translation / Other. That is migration 0020 plus a select and six translation keys.

Also worth flagging: the shipped version captures the last 20 client console errors. §2 says do not attach chat content. Console errors are unlikely to contain chat text, but they are not guaranteed not to. **Decision:** keep console capture, or drop it to be certain?

### 7\. Two of the five new base skins do not meet the camera standard

§1 locks a Base Skin Camera Standard: *centered directly toward the viewer, with no left or right yaw*. Of the five shipped today, Medieval Fortress, Desert Command Citadel and Rose Command Citadel are frontal. **Circular Shield Bunker and Field Workshop are drawn with visible yaw** — you see one side of each.

They look good and they read at map scale. But the standard was written to make future art consistent, and two of the five founding examples do not meet it. Either the standard is for future art only, or those two get regenerated.

### 8\. `ALL_SKINS_UNLOCKED = true` is live

`worker/game.ts:233`. Every tester can equip every skin including the one\-of\-one Shadow Empress. Closing it requires resetting the bases of testers wearing skins they do not own. Not urgent for Season 1 (the champion reward is a title, not a skin) but it is a prerequisite for selling anything cosmetic.

### 9\. Season document contradictions still open

From the design round, five items were raised and never answered: alliance supplies computed vs stored; Colossus pool freeze\-on\-first\-read; the "alliance banner" name colliding with the existing base cosmetic slot; whether objective garrisoning is in scope; and whether objective plots are reserved from base claiming. These block Stage C and D, not Stage A.

## 3\. Staged plan

Ordered to put the untestable work last and the load\-bearing work first.

**Stage 0 — Truth and safety.** Delete the dead `COUNTERS` table. Correct `COMBAT.md` to the shipped numbers. Build the simulation harness and close the three known baseline defects. Add the bug\-report category. Ship password reset. This stage writes almost no feature code and everything after it depends on the ruler being straight.

**Stage 1 — Hostile\-inbound strip and alerts.** Migration adds two boolean player preferences. The strip sits above the screen router, hostile only, hanging off the chat poll. One non\-strobing pulse, one alarm, escalation only when a strictly earlier arrival appears. Fully specified already and it unblocks Season 1 assaults, which need the same strip.

**Stage 2 — Asset progression.** The missing foundation. An upgrade endpoint, a cost curve in `shared/`, a resource sink, and the throughput cap from §5. Nothing about tokens yet. This is the stage that makes the game a game.

**Stage 3 — Roles, specialties, tactics.** Only after Stage 0's harness proves the baseline. Re\-tag roles per the decision in collision 5, add tactics as a frozen pre\-battle input, add per\-asset signature and counter data. Re\-simulate.

**Stage 4 — Rogue Standard Time and events.** `shared/gametime.ts`, applied game\-wide including chat. Then Asset Trials and Counter Drills, which are single\-player and testable today.

**Stage 5 — Season 1 Stage A.** Migration 0018 becomes 0021\+: `seasons`, `season_objectives`, `season_ownership_events`, `season_windows` (built empty), `shared/season.ts` with phase\-from\-instant, the map overlay and the season panel. No captures, no combat, no supplies.

**Stage 6 — Tokens and payments.** Deliberately last. It depends on Stage 2 existing, on the fairness model in §5 being decided, and on the distribution decision in §4. Shipping a currency before the thing it buys is how you end up refunding people.

**Stages 7\+ — Season 1 B through F**, alliance operations, war assets, Colossus, finale.

## 4\. Payments and distribution — questions before any code

The direction already flags this correctly. Concretely:

1. **Is there a mobile app, or is this web\-only?** If World War Rogue ships through the App Store or Google Play, in\-game currency generally must go through In\-App Purchase and Play Billing respectively, and an in\-app link to your own web checkout is restricted by the relevant storefront programs. Web\-only removes the constraint entirely. **This decision changes the architecture, not just the checkout button.**
2. **Which payment provider?** Stripe is the default assumption. It changes webhook shape, idempotency key strategy, and refund handling.
3. **What entity is selling?** Tokens are a stored\-value product. Sales tax and VAT on digital goods differ by jurisdiction and this is a question for an accountant, not for me.
4. **Refund policy?** The direction requires refund, chargeback, duplicate\-webhook, failed\-payment and already\-spent\-token handling to be explained before implementation. My proposal: tokens are never clawed back on refund; instead the account is flagged and further purchases blocked pending review. Reversing spent tokens means reversing upgrades, which means reversing battles fought with them. That path has no clean bottom.
5. **Chargeback after spend** — same answer, and it needs your explicit agreement because it means eating the loss.

Mechanically, the ledger design is straightforward and I have no questions about it: fixed server\-owned packages, credit only after provider verification, one ledger entry per provider transaction enforced by a unique index on the provider's transaction id, and spending as a conditional update (`UPDATE ... WHERE balance >= cost`) so two simultaneous spends cannot both succeed. The rolling seven\-day cap is a `SUM` over the ledger `WHERE created_at > now - 7 days`, evaluated at purchase time. No reset job.

## 5\. Paid vs earned progression — the model

This is the section where the direction's own guardrail does not hold, and you should see the arithmetic.

### What levelling actually does

The curve is `base × (1 + 0.06 × (level − 1)^1.15)`, identical for every asset:

| Level | Multiplier |
| ---: | ---: |
| 1 | ×1.00 |
| 5 | ×1.30 |
| 10 | ×1.75 |
| 15 | ×2.25 |
| 20 | ×2.77 |
| 25 | ×3.32 |
| 30 | ×3.88 |

A fully upgraded asset is **3\.88× its level\-1 self**. The ceiling is shared, so *"every fully upgraded asset has the same total maximum power budget"* is already structurally true. Good.

Fielding 24 assets (four squads of six) to level 30 costs **696 level\-ups**. Maxing all 60 owned assets costs 1,740.

### What the cap buys

The cap is 10,000 tokens per rolling seven days, so **100,000 tokens across a ten\-week season**. Against 696 level\-ups:

| Price per level | Levels a capped buyer can afford | As % of a maxed 24\-asset draft |
| ---: | ---: | ---: |
| 10 tokens ($1) | 10,000 | 1,437% |
| 25 tokens ($2.50) | 4,000 | 575% |
| 50 tokens ($5) | 2,000 | 287% |
| 100 tokens ($10) | 1,000 | 144% |
| 200 tokens ($20) | 500 | 72% |

**The 10,000\-token cap does not constrain competitive fairness at any plausible price.** Even at $20 per single level — a price nobody would pay — a capped buyer reaches 72% of a fully maxed draft in one season. At $10 per level they max everything with 44% of their budget unspent.

The cap is a **spending guardrail**, not a fairness guardrail. It protects a player from spending $10,000 in a weekend. It does not protect an active free player from being outscaled in week two.

### Recommendation: yes, a separate throughput cap is needed

The direction asks whether one is required. It is, and the direction already states the correct shape: it *"must apply equally to all players regardless of whether their upgrade resources were earned or purchased."*

**Proposal — a per\-day upgrade throughput cap.** Every player, paying or not, may complete at most *N* asset level\-ups per logical season day. Money buys you *up to* the cap on days you would otherwise fall short; it never buys you past it.

To make a maxed 24\-asset draft take roughly eight weeks of consistent play: 696 ÷ 56 days ≈ **12 level\-ups per day**.

What this preserves:

- A paying player converts money into *not falling behind* — they hit the cap every day without grinding.
- An active free player who plays daily reaches the same ceiling on the same schedule.
- A free player who plays three days a week falls behind a payer, which is the honest and acceptable middle.
- The maximum power ceiling stays shared and reachable by everyone, as required.

What it costs: it caps your revenue per player per day. That is the trade, and it is a product decision, not an engineering one.

**This needs your decision before Stage 2**, because the cost curve and the cap are the same design and building either without the other wastes the work.

## 6\. Asset roster

72 assets, twelve in each of six categories. **Naval is disabled** — `draftable !== false` filters it out, so 60 are available. Every player is granted all 60 at level 1 on first read and there is currently no way to raise any of them.

**Visual identity:** there is no per\-asset art. `shared/assetArt.ts` defines six top\-down **category silhouettes** as vector paths, drawn identically on card, map and battle. Per\-asset art was designed to layer over the silhouette the way skin art layers over a drawn base recipe, but none has been made. So today an Abrams and a Leopard are the same picture.

**Attribute budget:** every asset gets `BASE_POINTS + lift × POINTS_PER_LIFT` spread across five attributes, and `auditAssets()` exists to fail a row that drifts. Power per unit of lift is flat across the catalogue by construction.

**Before individual specialties can be designed, these must be settled:** the role taxonomy question (collision 5), the counter table question (collision 2), and the three baseline defects (collision 4). Assigning 60 signature specialties on top of an unmeasured baseline produces 60 numbers nobody can defend.

### The roster

FP \= firepower, Arm \= armour, Mob \= mobility, Rng \= range, Det \= detection. Roles are the *current* code roles, not the proposed new six.

#### Armour (12)

| Name | Designation | Role | Operator | Lift | FP | Arm | Mob | Rng | Det |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Abrams | M1A2 SEPv3 | breach | USA | 5 | 8 | 9 | 4 | 3 | 2 |
| Leopard | Leopard 2A7\+ | breach | Germany | 5 | 7 | 10 | 4 | 3 | 2 |
| Challenger | Challenger 3 | breach | UK | 5 | 7 | 10 | 3 | 4 | 2 |
| Leclerc | Leclerc XLR | screen | France | 4 | 4 | 4 | 7 | 3 | 4 |
| Black Panther | K2 Black Panther | breach | South Korea | 5 | 7 | 9 | 4 | 3 | 3 |
| Type 10 | Type 10 | screen | Japan | 4 | 4 | 3 | 8 | 3 | 4 |
| Merkava | Merkava Mk.4 Barak | breach | Israel | 5 | 6 | 10 | 4 | 4 | 2 |
| Proryv | T\-90M Proryv | breach | Russia | 4 | 7 | 7 | 3 | 3 | 2 |
| Altay | Altay | breach | Turkey | 4 | 6 | 8 | 3 | 3 | 2 |
| Stridsvagn | Stridsvagn 122 | breach | Sweden | 5 | 7 | 9 | 4 | 3 | 3 |
| Ariete | Ariete AMV | screen | Italy | 4 | 4 | 4 | 7 | 3 | 4 |
| Twardy | PT\-91 Twardy | screen | Poland | 3 | 3 | 3 | 6 | 3 | 3 |

#### Rotary (12)

| Name | Designation | Role | Operator | Lift | FP | Arm | Mob | Rng | Det |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Apache | AH\-64E | strike | USA | 3 | 7 | 2 | 4 | 3 | 2 |
| Viper | AH\-1Z | strike | USA | 3 | 7 | 1 | 5 | 3 | 2 |
| Alligator | Ka\-52M | strike | Russia | 3 | 7 | 2 | 4 | 3 | 2 |
| Havoc | Mi\-28NM | strike | Russia | 3 | 7 | 2 | 4 | 3 | 2 |
| Hind | Mi\-35M | lift | Russia | 3 | 3 | 5 | 5 | 2 | 3 |
| Tiger | Tiger HAD | screen | France / Germany | 3 | 3 | 3 | 6 | 3 | 3 |
| ATAK | T129 ATAK | screen | Turkey | 2 | 3 | 2 | 5 | 2 | 2 |
| Z\-10 | Z\-10ME | strike | China | 3 | 7 | 2 | 4 | 3 | 2 |
| Rooivalk | Rooivalk Mk1 | strike | South Africa | 3 | 7 | 1 | 4 | 4 | 2 |
| Black Hawk | UH\-60M | lift | USA | 3 | 2 | 4 | 6 | 3 | 3 |
| Chinook | CH\-47F | lift | USA | 4 | 2 | 7 | 6 | 3 | 4 |
| Merlin | AW101 | lift | UK / Italy | 4 | 2 | 5 | 7 | 3 | 5 |

#### Fixed Wing (12)

| Name | Designation | Role | Operator | Lift | FP | Arm | Mob | Rng | Det |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Lightning II | F\-35A | strike | USA | 5 | 10 | 2 | 6 | 4 | 4 |
| Raptor | F\-22 | screen | USA | 5 | 4 | 4 | 10 | 3 | 5 |
| Eagle II | F\-15EX | strike | USA | 5 | 10 | 3 | 6 | 5 | 2 |
| Thunderbolt II | A\-10C | strike | USA | 4 | 10 | 3 | 3 | 4 | 2 |
| Super Hornet | F/A\-18E | strike | USA | 4 | 9 | 2 | 5 | 4 | 2 |
| Ghostrider | AC\-130J | overwatch | USA | 5 | 10 | 2 | 2 | 10 | 2 |
| Typhoon | Eurofighter Typhoon | screen | Multi\-national | 4 | 4 | 4 | 7 | 3 | 4 |
| Rafale | Rafale F4 | strike | France | 4 | 8 | 2 | 5 | 5 | 2 |
| Gripen | JAS 39E | screen | Sweden | 3 | 3 | 3 | 7 | 2 | 3 |
| Felon | Su\-57 | screen | Russia | 5 | 4 | 5 | 9 | 3 | 5 |
| Fullback | Su\-34 | strike | Russia | 4 | 9 | 3 | 4 | 4 | 2 |
| Boramae | KF\-21 | screen | South Korea | 4 | 4 | 4 | 6 | 3 | 5 |

#### Artillery (12)

| Name | Designation | Role | Operator | Lift | FP | Arm | Mob | Rng | Det |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| HIMARS | M142 | overwatch | USA | 3 | 6 | 1 | 3 | 7 | 1 |
| MLRS | M270A2 | overwatch | USA | 4 | 8 | 1 | 2 | 9 | 2 |
| PULS | PULS | overwatch | Israel | 3 | 6 | 2 | 1 | 8 | 1 |
| Chunmoo | K239 | overwatch | South Korea | 3 | 6 | 2 | 2 | 7 | 1 |
| Smerch | BM\-30 | overwatch | Russia | 4 | 9 | 1 | 1 | 9 | 2 |
| Solntsepyok | TOS\-1A | breach | Russia | 4 | 8 | 8 | 3 | 1 | 2 |
| PHL\-191 | PHL\-191 | overwatch | China | 4 | 7 | 2 | 2 | 9 | 2 |
| Astros | Astros II MK6 | overwatch | Brazil | 3 | 6 | 1 | 1 | 8 | 2 |
| Vampire | RM\-70 Vampire | overwatch | Czechia | 3 | 6 | 2 | 2 | 7 | 1 |
| PzH 2000 | PzH 2000 | overwatch | Germany | 4 | 7 | 2 | 2 | 9 | 2 |
| Archer | Archer FH77 BW | overwatch | Sweden | 3 | 6 | 1 | 3 | 7 | 1 |
| K9 | K9 Thunder | overwatch | South Korea | 4 | 7 | 2 | 2 | 9 | 2 |

#### Drone (12)

| Name | Designation | Role | Operator | Lift | FP | Arm | Mob | Rng | Det |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Reaper | MQ\-9A | strike | USA | 3 | 7 | 1 | 4 | 4 | 2 |
| Gray Eagle | MQ\-1C | recon | USA | 2 | 1 | 1 | 3 | 3 | 6 |
| Global Hawk | RQ\-4 | recon | USA | 3 | 1 | 1 | 3 | 5 | 8 |
| Switchblade | Switchblade 600 | strike | USA | 1 | 4 | 1 | 2 | 2 | 1 |
| TB2 | Bayraktar TB2 | strike | Turkey | 2 | 6 | 1 | 3 | 3 | 1 |
| Akinci | Bayraktar Akinci | strike | Turkey | 3 | 8 | 1 | 4 | 3 | 2 |
| Heron | Heron TP | recon | Israel | 3 | 1 | 1 | 4 | 4 | 8 |
| Harop | Harop | strike | Israel | 1 | 5 | 1 | 2 | 1 | 1 |
| Orbiter | Orbiter 4 | recon | Israel | 1 | 1 | 1 | 2 | 2 | 4 |
| Lancet | Lancet\-3 | strike | Russia | 1 | 4 | 1 | 2 | 2 | 1 |
| Wing Loong | Wing Loong II | recon | China | 2 | 1 | 1 | 3 | 3 | 6 |
| Rainbow | CH\-5 | recon | China | 3 | 1 | 1 | 4 | 4 | 8 |

#### Naval (12) — disabled, not draftable

| Name | Designation | Role | Operator | Lift | FP | Arm | Mob | Rng | Det |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Arleigh Burke | DDG Flight III | overwatch | USA | 6 | 10 | 3 | 3 | 10 | 4 |
| Zumwalt | DDG\-1000 | overwatch | USA | 6 | 10 | 4 | 3 | 10 | 3 |
| Virginia | SSN Virginia | strike | USA | 6 | 10 | 2 | 7 | 6 | 5 |
| Wasp | LHD Wasp | lift | USA | 6 | 3 | 8 | 9 | 4 | 6 |
| Daring | Type 45 | screen | UK | 5 | 4 | 4 | 8 | 3 | 7 |
| City | Type 26 | recon | UK | 5 | 2 | 2 | 6 | 6 | 10 |
| FREMM | FREMM | overwatch | France / Italy | 5 | 9 | 3 | 2 | 10 | 2 |
| Sejong the Great | KDX\-III | overwatch | South Korea | 6 | 10 | 4 | 3 | 10 | 3 |
| Gorshkov | Project 22350 | strike | Russia | 5 | 10 | 3 | 6 | 5 | 2 |
| Renhai | Type 055 | overwatch | China | 6 | 10 | 3 | 3 | 10 | 4 |
| Visby | Visby | screen | Sweden | 4 | 3 | 4 | 8 | 3 | 4 |
| Ada | Ada | screen | Turkey | 4 | 4 | 4 | 7 | 3 | 4 |

## 7\. Data changes and uniqueness

Grouped by stage. Migration numbers start at 0020; Season 1's "0018" from the design round is now 0021\+.

| Migration | Adds | Uniqueness guarantee |
| --- | --- | --- |
| 0020 | `bug_reports.category` | — |
| 0021 | Two boolean alert preferences on the player row | — |
| 0022 | `asset_upgrades` ledger; upgrade throughput counters | `UNIQUE(player_id, asset_id, to_level)` so a level cannot be bought twice |
| 0023 | `asset_tuning`; tactic column on `marches` | `UNIQUE(player_id, asset_id)` for tuning |
| 0024 | `battle_inputs` — resolved rosters, modifiers, seed | `UNIQUE(battle_id)` |
| 0025 | `token_ledger`, `token_purchases` | `UNIQUE(provider, provider_txn_id)` — the idempotency guarantee |
| 0026\+ | `seasons`, `season_objectives`, `season_ownership_events`, `season_windows` | One controlling alliance per objective; `UNIQUE(season_id, player_id, day_index, op_type)` for daily claims |

**Already satisfied and not being rebuilt:** one asset per squad (`idx_squad_slots_one_squad_per_asset`), one march per squad, one reinforcement per teammate, plot occupancy, alliance tag uniqueness, one\-of\-one cosmetics.

**Compare\-and\-set, not uniqueness.** Settlement races are not solved by an index. Every settle path — battle resolution, token spend, factory accrual, Colossus damage — must be a conditional update (`WHERE settled_at IS NULL`, `WHERE balance >= cost`) so the reader that loses the race applies nothing and reads the winner's result. The garrison return leg is the existing precedent.

## 8\. Costs

**Localization.** Roughly 80–120 new keys for Season 1 alone, against a current 313 — a 30% dictionary increase. Tokens, alerts, upgrades and events add more. Two operational notes learned today: the i18n parser is line\-anchored and a wrapped string silently matches nothing, and the generator refuses to run on a key\-count mismatch, which is what caught it. **Check the artefact, not the run** — an early pass reported full coverage with broken strings in it.

**Storage.** D1 rows are small and the volumes are modest: a few hundred ownership events per season, one ledger row per purchase, one upgrade row per level. The one to watch is `battle_inputs`, which stores two rosters per battle. At 100 players fighting a few times a day that is thousands of rows a week — fine, but it needs the same 30\-day retention the battle reports already have.

**Simulation.** The harness does not exist and needs building before it can be run. Budget a day to build it and a day to close the three baseline defects. Every subsequent balance decision depends on it.

**Operational.** No background jobs anywhere, by design. The per\-message AI translation cost in chat remains the only recurring spend. Tokens add payment\-provider fees and a webhook endpoint. None of this changes the shape of the system.

## 9\. Test checklists

Human\-run, because I cannot verify anything.

**Stage 0.** Run the harness and confirm fixed wing no longer beats rotary 100% of the time. Confirm a pure drone squad can win a winnable fight. File a bug report in each of the six categories and read them back from the queue. Lock yourself out of a test account and recover it through the reset flow without touching the database.

**Stage 1.** Enable visual only, then audio only, then both. Test Warning demonstrates exactly what is enabled. Send a hostile march from a second account and confirm the strip appears on the base, squad, alliance, chat, profile and customise screens without returning to the map. Confirm a reinforcement and an outgoing march trigger nothing. Reload mid\-threat: strip persists, alarm does not replay. Turn a setting off during an active threat and confirm the presentation stops immediately.

**Stage 2.** Upgrade an asset and confirm the power number on the squad header moves. Hit the daily throughput cap and confirm the next upgrade is refused with a clear message. Two browser tabs upgrading the same asset simultaneously: one succeeds, one is refused, the resource is deducted once.

**Stage 3.** Launch a battle, change the squad mid\-flight, confirm what marched is what fought. Replay a battle from its stored inputs and confirm an identical result. Confirm a mirrored max\-level configuration is neutral over many runs.

**Stage 6.** Buy the smallest package and confirm the balance moves only after the provider confirms. Replay the webhook and confirm exactly one credit. Buy to the seven\-day cap and confirm the next purchase is refused with the remaining capacity shown. Spend to zero and confirm a further spend is refused rather than going negative.

## 10\. Decisions I need before writing code

1. **Upgrade throughput cap — yes or no, and at what daily number?** §5. Blocks Stage 2, and Stage 6 after it.
2. **Cost curve for a level\-up.** Which resources, and roughly how many. Blocks Stage 2.
3. **Roles: replace or layer?** Collision 5. Blocks Stage 3 and all specialty design.
4. **Defender frozen at launch, or live at settlement?** Collision 1. My recommendation is live, with resolved inputs stored for replay.
5. **Mobile app, or web only?** §4. Changes the payment architecture, not just the button.
6. **Refund and chargeback policy** — my proposal is no clawback, flag the account. Needs your agreement because it means eating losses.
7. **Console\-error capture in bug reports** — keep or drop.
8. **The two yawed base skins** — regenerate, or is the camera standard for future art only?
9. **The five unanswered Season 1 questions** from the design round: supplies computed vs stored, Colossus freeze, the banner name collision, objective garrisoning scope, objective plot reservation. Not blocking until Stage 5.

Say which way on 1 through 4 and I can start Stage 0 immediately — that stage needs none of the others answered.
