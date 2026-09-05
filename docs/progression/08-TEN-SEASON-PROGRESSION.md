# Ten\-Season Progression

PLAN, DATA MODEL, COMBAT BUDGET — NO CODE WRITTEN

The structure is good and most of it needs no argument. Two things in it change the balance conclusions from earlier rounds, and they are connected.

## 1\. The Token cap moved by 10×

§8 states the cap as *"$10,000 USD / 100,000 Tokens per week, pending final confirmation."* Every prior round used 10,000 Tokens / $1,000.

|  | Previous | §8 as written |
| --- | ---: | ---: |
| Per week | 10,000 | 100,000 |
| Per day | 1,429 | 14,286 |
| Committed earner, per day | 1,400 | 1,400 |
| **Payer's rate advantage** | **1\.0×** | **10\.2×** |
| Over five seasons | 500,000 ($50k) | **5,000,000 ($500k)** |

**The 10,000 figure was load\-bearing, and possibly by accident.** It sat within 2% of a committed player's daily Command Credit earn. That single coincidence is *why* the model two rounds ago showed a free player and a stockpiler in identical columns every week.

At 100,000 that relationship is gone. A payer acquires currency ten times faster than a committed player earns it, and the entire defence collapses onto the Readiness Band — which makes §2 below urgent rather than tidy.

**Two things partly rescue it, and they are structural rather than lucky:**

**Bound materials.** Blueprint Fragments, Squad Components, Construction Materials and Drone Data cannot be purchased. Of five progression lanes, Tokens can fully buy **one** — Core Levels — and part of a second. A whale at 100,000/week can rush Core Levels and nothing else.

**But that one lane is the only one that scales raw power** in the budget I propose in §4. So money buys 100% of the power lane and 0% of the tactical lanes. Whether that is acceptable is a product call, and it is the real question behind the cap.

**My recommendation: keep 10,000.** It is not arbitrary — it is the number at which paid and played progression run at the same speed, which is the property every fairness claim in this design rests on. If the goal is a higher revenue ceiling, raising the *price* of levels is the safer lever than raising the *rate* of purchase, because price does not change the relative pace between two players.

## 2\. Season 1's ceiling and the Readiness Band contradict each other

§1 sets Season 1's permanent ceiling at **level 10**. The approved Readiness Band schedule runs **5 → 30** across Season 1's ten weeks.

From week 4 the band is 14, and no asset can exceed 10. So `min(real, band)` returns `real` for the rest of the season and **the band stops doing anything from week 4 onward.**

That matters more now than it would have last round, because §1 above makes the band the only remaining brake on a 10× purchase rate.

**Fix: the band scales within each season's own ten\-level range**, not toward a fixed 30.

| Week | 1–2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Season 1 band | 2 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 10 |
| Season 2 band | 11 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 |
| Season *n* band | ceiling−8 | … | … | … | … | … | … | ceiling | ceiling |

Same shape, same protected onboarding, and the band binds for the whole season instead of the first three weeks.

## 3\. Data model

| Table | Holds | Uniqueness |
| --- | --- | --- |
| `player_assets` *(exists)* | real level per owned asset | PK `(player_id, asset_id)` |
| `asset_blueprints` | chapter reached, fragments held, per asset | PK `(player_id, asset_id)` |
| `asset_tuning` | active tuning/protocol choice per asset | PK `(player_id, asset_id)` |
| `squad_systems` | rank per system per squad | PK `(player_id, squad, system)` |
| `drone_protocols` | rank per family; one `active_family` on the player | PK `(player_id, family)` |
| `base_departments` | rank per department, plus absolute completion instant for in\-progress projects | PK `(player_id, department)` |
| `player_materials` | fragments, components, drone data, construction materials | PK `(player_id, material)` |
| `legacy_items` | earned items and the one equipped | PK `(player_id, item_id)` |
| `upgrade_ledger` | every level and rank purchased, with currency split | `UNIQUE(player_id, lane, subject, to_rank)` |

Two design rules carried from the existing codebase:

**Nothing stores derived power.** Squad power, effective Season level and every budget number are computed on read from these rows, exactly as `assetPower` works today.

**The battle snapshot widens.** `marches` already freezes attacker units and will carry `readiness_band`. It must also carry the **active Drone protocol, the equipped Legacy Item, per\-asset tuning, and Squad System ranks** as they stood at launch. Your §4 requires the drone protocol to be in the immutable input; the same argument applies to all four, or a player changes a tuning mid\-flight and alters a fight already in the air.

Catalogue data — system names, protocol families, department names, rank effects, chapter definitions — goes in `shared/`, one definition imported by both sides. That rule already exists in this codebase and already has one live violation (the duplicate counter tables), so it is worth restating.

## 4\. Combat budget

The question in §11.1 is how four lanes avoid multiplying. The answer is that **only one of them is allowed to touch raw power at all.**

| Lane | Contribution to raw power | Shape |
| --- | --- | --- |
| **Core Levels 1–50** | ×1.00 → **×6.27** | The only lane that scales power |
| **Squad Systems R1–10** | **\+15% maximum**, additive, hard capped | Percentage of squad power, not per\-asset |
| **Blueprint Chapters** | **none** | Specialty, tuning, declared tradeoff |
| **Drone Protocols** | **none** | Utility; one active per battle |
| **Legacy Specialty Item** | **none** | Sidegrade with a counter; one equipped |

**Maximum end state: ×6.27 × 1.15 \= ×7.21** of a level\-1 asset.

If instead all four lanes multiplied at a modest 1.3× each, the same progression reaches **×13.78** — and every balance number in the game becomes untunable. That is the failure mode this allocation exists to prevent, and the difference between the two is one architectural decision made now.

**Why Squad Systems are additive on *squad* power rather than per\-asset:** applied per\-asset they compound with Core Levels multiplicatively. Applied once to the squad's summed power and capped, they cannot. It is the same reason `exposureOf` multiplies a damage pool rather than each unit.

**Level 50 needs re\-simulation, as you say.** The current formula extended gives ×6.27, which is a reasonable five\-season arc — but it was never measured past 30, and the resolver's step\-function defect means no figure past 30 is trustworthy until Stage 0 lands.

**Fairness at maximum (§11.3)** already holds structurally: `auditAssets()` checks every row against `BASE_POINTS + lift × POINTS_PER_LIFT`, and `attributeAtLevel` is a uniform multiplier, so two assets equal at level 1 stay equal at level 50. Extending to 50 does not break it; changing the *formula* might, which is what the audit function is for.

## 5\. Pacing — costs cannot outrun earnings

A committed player earns about **77,000** Command Credits in a ten\-week season on the approved schedule. Each season releases ten levels. So each season's ten levels for a 24\-asset draft must cost close to that season's earnings, or players fall behind their own season's ceiling and the band becomes decorative in the other direction.

That forces one of two choices:

- **Flat costs across seasons** — later levels cost the same as early ones, which feels wrong.
- **Earn growth alongside cost growth** — sources and yields rise as Base Departments and Operations unlock.

**The second is right, at roughly 1.4× per season:**

| Season | Earns | Cost per level\-up | 24\-asset draft, that season |
| --- | ---: | ---: | ---: |
| 1 | 77,000 | \~356 | 76,900 |
| 2 | 107,800 | \~449 | 107,760 |
| 3 | 150,920 | \~629 | 150,960 |
| 4 | 211,288 | \~880 | 211,200 |
| 5 | 295,803 | \~1,233 | 295,920 |
| **Total** | **842,811** |  | **842,736** |

## 6\. Time and cost to maximise everything (§11.7)

| Target | Level\-ups | Currency | Committed player |
| --- | ---: | ---: | --- |
| 24\-asset draft to L50 | 1,176 | \~843,000 | **5 seasons** |
| All 60 non\-naval to L50 | 2,940 | \~2,107,000 | **\~12.5 seasons** |
| Squad Systems (4 squads × 3) | 108 ranks | Squad Components only | Material\-gated |
| Drone Protocols (4 families) | 36 ranks | Currency \+ Drone Data | Material\-gated |
| Base Departments (5) | 45 ranks | Construction Materials | Material\-gated |
| Blueprint Chapters | 300 chapters | Fragments only | Material\-gated |

**This answers §11.8 better than any new system would.** Maxing all sixty non\-naval assets costs roughly **2\.5× what a committed player earns across the five vertical seasons.**

So Seasons 6–10 already have their progression: **breadth.** Vertical levels stop at 50, and the remaining work is bringing the other thirty\-six assets up to it — which is exactly the content that makes counters, roles and squad composition matter, because a player with sixty maxed assets has real choices and a player with twenty\-four does not.

Add the twelve naval assets — finished in `shared/assets.ts`, held behind `draftable: false` — and Seasons 6–10 have a full progression arc with no new systems at all.

## 7\. Catch\-up without sandbagging (§11.5)

A below\-band earn multiplier is the right shape, with one constraint that closes the exploit:

**Apply it only to non\-combat sources** — patrols, salvage, convoys, construction. Never to combat or objective rewards.

A player who deliberately sits below the band to farm the bonus still forfeits every combat and objective reward, which are the larger and the competitively relevant ones. Sandbagging then costs more than it pays, and it costs more the longer it runs. No detection heuristic needed, no appeals process, nothing to game.

## 8\. Implementation order

Unchanged in shape; this brief slots into it rather than replacing it.

| Stage | Adds from this brief |
| --- | --- |
| **0** | Nothing. Harness and counter model first — every number above is provisional until it lands. |
| **3** | Core Levels 1–10, upgrade ledger, the §10 explanation templates, cost curve |
| **4** | Blueprint Chapter 1, asset tuning, Squad Systems R1–2 |
| **5** | Readiness Band, Drone Protocols R1–2, Base Departments R1–2 |
| **6** | Tokens |
| **S2\+** | Legacy Items, higher ranks, naval |

**§10's explanation standard is not a UI task and should not be scheduled as one.** Every upgrade must state its exact change, its Season effect, whether it is banked, and its counter — as fixed localized templates. That is roughly 40–60 new i18n keys per lane, and the templates have to exist before the first upgrade ships or the standard gets retrofitted badly. I would build it with Stage 3 rather than after.

## 9\. Unanswered

**Blocking:**

1. **10,000 or 100,000 Tokens per week** (§1). Everything about relative pacing depends on it, and I recommend 10,000 with price as the revenue lever instead.
2. **Readiness Band rescaled per season** (§2) — confirm, or the band stops binding in week 4 of every season.
3. **Squad Systems: per squad or per account?** §3 says "each squad has three slots," which means twelve systems to rank. Per account is four times cheaper to build and to balance. Worth confirming you meant per squad.

**Needed before Stage 3:**

4. Earn growth of \~1.4× per season (§5) — confirm the shape.
5. Whether Core Levels should *also* be partly material\-gated. It is the only lane Tokens fully buy, and gating it would blunt §1 — but it contradicts "Tokens may accelerate permanent progression."
6. Do Blueprint Chapters gate on *reaching* a level milestone, or on the milestone plus fragments? §2 implies both.

**Still outstanding from earlier rounds:**

7. **Monday 00:00 RST** — five rounds now.
8. Second\-contributor floor for two\-member alliances.
9. Payment provider, selling entity, tax treatment.
