# Revised Implementation Plan

RESPONSE TO DESIGNER RULINGS — NO CODE WRITTEN

Answers the six items requested. All rulings accepted as written; where a ruling has a consequence worth naming before it is built, I name it rather than absorb it silently.

**One ambiguity blocks the cost\-curve approval.** §8 asks for *"expected **Tokens earned** per active player day."* §9 caps *"purchased Token credit."* Together those imply **one Token currency with two sources — earned and purchased — and a cap on the purchased source only.** The original direction said only that Tokens are bought.

I have modelled on that reading because §8's question is unanswerable otherwise. If instead upgrades cost a separate earned resource that Tokens convert into, every number in §3 below changes and I will re\-model. **Please confirm which.**

## 1\. Revised stage plan

Password reset is pulled out to its own account\-access proposal and blocks nothing, per your ruling.

| Stage | Contents | Gate to start |
| --- | --- | --- |
| **0** | Simulation harness; counter\-model measurement and recommendation; bug\-report category; drop console capture; cosmetic entitlement repair | Approval of this plan |
| **1** | Hostile\-inbound strip and alerts | Stage 0 shipped |
| **2** | `shared/gametime.ts` — Rogue Standard Time, applied game\-wide including chat | Stage 1 shipped |
| **3** | Asset progression: upgrade endpoint, cost curve, 12/day throughput cap | Cost curve approved (§3) |
| **4** | Signature specialties, tactics, events | Stage 0's harness has closed the baseline defects |
| **5** | Season 1, staged A–F | Stage 4 for the parts that need combat; Stage A needs none of it |
| **6** | Token purchasing | Progression fairness proven live, plus §4 product answers |
| **—** | Password reset and account access | Separate proposal; not sequenced here |

Two notes on the ordering you set.

**Game time moved ahead of progression is correct and I had it wrong.** The daily throughput cap is defined in logical RST days, so the day boundary has to exist before anything can count against it. Building the cap first would mean inventing a temporary day definition and then migrating rows off it.

**Stage 0 no longer rewrites documentation.** Per §2, the harness measures first and the canonical counter model is chosen from evidence. Documentation is updated to the approved model at the *end* of Stage 0, not the start.

## 2\. Simulation harness and counter\-model comparison

### Harness scope

A standalone script under `tools/`, not a test file — it produces a report, not a pass/fail. It imports `resolve()` and the live catalogue directly, so it measures the shipped resolver rather than a copy of it.

**What it runs.** For each matchup under test, N battles at a fixed seed sequence (so a run is reproducible and two runs are comparable), across a sweep of squad compositions, level parities, and lift budgets. Default N \= 10,000 per cell, matching the figure `COMBAT.md` §11 already claims.

**What it reports.** Win rate per matchup, mean rounds to resolution, the composition multiplier's observed range, and the distribution of margin — because "counters matter but do not create automatic wins" is a statement about the *shape* of the win\-rate distribution, not about a single number.

**The three defects it must close**, from `COMBAT.md` §11:

1. Fixed wing beats rotary 100% of the time.
2. Pure drone squads cannot win.
3. The composition band has not been re\-measured since the exposure fix.

### Counter\-model comparison

Three models measured against each other on identical inputs:

| Model | Source | Perfect | Medium | Penalty |
| --- | --- | ---: | ---: | ---: |
| **Live** | `shared/combat.ts` `COUNTER` | ×1.2 | ×1.1 | none |
| **Documented** | `COMBAT.md` §6 \+ `shared/assets.ts` `COUNTERS` | ×1.5 | — | ×0.6 |
| **Revised** | `COMBAT.md` §11 | ×1.35 | — | ×0.75 |

The three disagree on the *relationships* as well as the multipliers — artillery, drone and naval each beat different things in the live table than in the dead one. So the comparison is two\-dimensional: which relationship web, and which multiplier strength.

**Acceptance criteria for the recommended model**, drawn from your §2:

- No matchup at or above 95% — counters must matter without deciding the fight before it starts.
- A pure\-drone squad reaches a defensible win rate against at least one common composition.
- Fixed wing versus rotary lands inside a band, not at 100%.
- Mirrored max\-level configurations sit at 50% ± noise, with no attacker advantage.

I will return the measured tables and one recommendation. The duplicate is removed and the documentation updated only after you approve the model.

## 3\. Three upgrade cost curves

### The constant that matters most

**12 level\-ups per day × 696 level\-ups for a 24\-asset draft \= 58 days minimum.** Eight point three weeks, for everybody, paying or not. No cost curve and no amount of money changes it.

Season 1 is ten weeks. So the earliest any player can field a fully maxed draft is roughly week 8 — the season's final act is fought near the ceiling, and nobody arrives at week 2 already finished. The throughput cap is doing the fairness work the token cap could not.

Below, "cost" is Tokens to raise one asset one level. Level\-30 assets are ×3.88 their level\-1 selves on the existing curve, which is unchanged.

### The three curves

|  | **A — Flat** | **B — Linear** | **C — Superlinear** |
| --- | ---: | ---: | ---: |
| Formula | `40` | `10 × L` | `6 × L^1.45` |
| Cost at L2 | 40 | 20 | 16 |
| Cost at L10 | 40 | 100 | 169 |
| Cost at L20 | 40 | 200 | 462 |
| Cost at L30 | 40 | 300 | 832 |
| One asset 1→30 | 1,160 | 4,640 | 10,598 |
| Full 24\-asset draft | 27,840 | 111,360 | 254,352 |
| Draft cost in USD | $2,784 | $11,136 | $25,435 |
| Earn needed to hold the cap, early | 480/day | 900/day | 1,432/day |
| Earn needed to hold the cap, late | 480/day | 2,940/day | 7,491/day |
| Level\-ups/day a capped buyer can fund, early | 35\.7 | 19\.1 | 12\.0 |
| Level\-ups/day a capped buyer can fund, late | 35\.7 | 5\.8 | 2\.3 |
| What binds a payer | Throughput, always | Throughput early, money late | Money, always |
| Weeks of capped buying to fund a full draft | 2\.8 | 11\.1 | 25\.4 |

### Reading the table

**Curve A** keeps the throughput cap binding at every stage, which is the cleanest expression of the fairness rule. Its problem is at the other end: a full draft costs $2,784, so a maximal spender exhausts everything worth buying in **under three weeks** and the 10,000\-per\-week cap becomes irrelevant for the remaining seven. It also makes level 30 cost exactly what level 2 costs, so there is no weight behind choosing depth over breadth.

**Curve C** inverts the design intent. Money binds from day one — even at the purchase cap a player cannot sustain 12 upgrades a day at any point in the game. The throughput cap becomes decorative and the wallet becomes the real limiter, which is the outcome the whole design is meant to avoid.

**Curve B is the recommendation.** Early on, the throughput cap binds: money buys you *keeping up*, exactly the intended role. Late on, money stops being able to sustain the cap for anyone, so the final stretch is earned at a similar rate by everyone — a fairness property that falls out of the curve rather than being bolted on. And the curve is dimensioned to the purchase cap: 11.1 weeks of capped buying to fund a full draft, against a ten\-week season. The two limits are the same size, which is what you want from two limits that are meant to work together.

### The stockpiling risk, which is real for B

You asked specifically. **Curve B creates a late\-season power spike if the earn rate is flat.** Early it takes 900 Tokens/day to hold the cap; late it takes 2,940. A flat earn rate of, say, 1,500/day banks 600/day of unspendable surplus through weeks 1–4, then that bank is dumped into expensive late levels in weeks 7–10. The player who idled early arrives at the finale with a war chest.

Two mitigations, and I recommend the first:

1. **Scale the earn rate with progression** so it tracks the cost of the levels a player is actually buying — surplus never accumulates because the need rises with the earn. Sources unlocking as the base develops does this naturally.
2. Cap the balance. Blunt, and it punishes players who take a week off.

Curve A has no stockpiling risk and no spike. Curve C has a permanent deficit and no spike, but for the wrong reason.

### What I still need for a complete answer

The earn rate is a free parameter and I have deliberately not chosen it. **Once you confirm the single\-currency reading in the callout above, I will return a proposed earn schedule** — sources, rates, and how they unlock — modelled so a committed free player tracks near the cap without generating a stockpile. That is the other half of this decision and the curve should not be approved without it.

## 4\. Payment and distribution — still blocked

Unchanged from the previous plan and still blocking Stage 6 only. Restated compactly because you asked for what remains open:

1. **Storefront.** Apple, Google, both, or web only. If the game ships through either mobile storefront, in\-game currency generally must use that storefront's billing, and an in\-app link to your own checkout is restricted by the relevant programs. Web\-only removes the constraint entirely. **This is architecture, not a button.**
2. **Provider.** Stripe is the working assumption. It determines webhook shape, idempotency key strategy, and refund mechanics.
3. **Selling entity and tax.** Stored\-value digital goods; sales tax and VAT treatment varies by jurisdiction. An accountant's question, not mine, but it has to be answered before money moves.

Your provisional refund policy is recorded as the design target: never reverse settled battles or used progression; refund unused balance only; flag and suspend on a chargeback against already\-spent Tokens; no automatic clawback. I will build to it once product approves it as final.

## 5\. Stage 0 and Stage 1 — migrations and tests

### Migrations

| \# | Stage | Change |
| --- | --- | --- |
| 0020 | 0 | `bug_reports.category TEXT` — nullable, so existing rows stay valid. Six values validated in `shared/support.ts`, not by a database constraint, so adding a category later is a code change rather than a table rebuild. |
| 0021 | 0 | Cosmetic entitlement repair. Move any base wearing a skin its owner does not own onto a valid starter, and grant nothing. Run **after** `ALL_SKINS_UNLOCKED` is set false in the same deploy, or the flag re\-hides the problem. |
| 0022 | 1 | Two boolean columns on the player row, both defaulting to 0 — visual and audible hostile warnings, off by default. |

No migration removes the console column in 0020; the capture stops at the client and the column is left in place holding historical rows. Dropping a column in SQLite is a table rebuild and the data is already collected.

### Stage 0 tests — human\-run

- File a report in each of the six categories; confirm all six come back from the owner queue with the right category.
- Confirm a new report carries no console payload.
- Confirm an existing pre\-migration report still reads back without a category rather than erroring.
- Confirm every tester wearing a premium skin they do not own is on a starter after 0021, and that nobody gained a skin.
- Confirm Shadow Empress is still held by exactly one account.
- Run the harness twice with the same seed sequence and confirm identical output.
- Read the harness report and confirm the three defects are measured, not assumed.

### Stage 1 tests — human\-run

- Both settings default off on a fresh account.
- Enable visual only, then audible only, then both; Test Warning demonstrates exactly what is enabled each time.
- Send a hostile march from a second account. Confirm the strip appears on base, squads, assets, alliance, chat, profile and customise **without returning to the map**.
- Confirm a reinforcement, an outgoing march, and a normal build completion trigger nothing.
- Reload mid\-threat: the strip persists, the alarm does not replay.
- Launch a second, sooner\-arriving attack: exactly one escalation.
- Turn a setting off during an active threat: that presentation stops immediately.
- Confirm no new network request appears — the strip must ride the existing chat poll.
- Confirm the flash is non\-strobing. One pulse, roughly 1.5 seconds, well under the three\-per\-second photosensitivity threshold.

## 6\. Unresolved

**Blocking Stage 3:**

- The single\-currency question in the callout at the top.
- The earn schedule, which I will propose once that is answered.

**Blocking nothing yet, but unanswered:**

- Which two of the five starter skins get regenerated to meet the camera standard, and whether you want me to specify the shot or whether ChatGPT handles it from the standard as written. Circular Shield Bunker and Field Workshop are the two with visible yaw.
- Whether the Preseason uses the same phase set as Season 1 or a reduced one. Absent from all seven design documents.
- What an uncontested alliance experiences in Weeks 4–9 if the population gate is met but only one alliance is competitive. The documents cover the empty finale and the Colossus with one player, but not this case.

**Recorded as resolved by your response, no longer open:** defender liveness and replay from stored resolved snapshots; the role taxonomy; supplies as ledger\-derived; the Colossus deadline settle; Champion Pennant; objective garrisoning out of scope; objective plots reserved.

## Ready to start

Stage 0 needs only approval of this plan. It touches no gameplay balance, ships the bug\-report category and the entitlement repair, and produces the measurement everything downstream depends on.
