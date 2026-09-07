# BUILDING EFFECTS v1

All values are server-authoritative. Every building begins at Level 1; the first paid upgrade completes Level 2. The Command Center and Quartermaster gates in **BUILDING RESOURCES v1** apply before every upgrade or Service Rank start. `Next` is omitted at Level 10 because it is the Season 1 cap.

**Implementation precedence:** this document controls building holds and effects. Every building-level upgrade uses the resource-only cost and timer tables in **BUILDING RESOURCES v1**. Do not use any older Token/Credit payment table for a building level.

## Command Center

**Holds**

1. Base Overview — Command Center level, Season 1 cap, and active building queues.
2. Task Forces — Alpha, Bravo, Charlie, and Delta availability; Bravo unlocks here at Level 5.
3. Events & Wars — later; show `Coming Soon` until those systems are live.
4. Server Clock — current authoritative server time.

**Effect table — maximum Building and Service Rank level**

| Level | Ceiling |
|---:|---:|
| 1 | 1 |
| 2 | 2 |
| 3 | 3 |
| 4 | 4 |
| 5 | 5 + Task Force Bravo unlock |
| 6 | 6 |
| 7 | 7 |
| 8 | 8 |
| 9 | 9 |
| 10 | 10 |

**Panel line:** `Level {level}: Buildings and Service Ranks may advance to {level}. {nextLine}`

**Why:** It is the account's progression gate and Level 5 opens the second active Task Force.

**Rationale:** A universally required ceiling keeps specialised upgrades, Service Ranks, and build timers on one clear season pace.

## Armour Building

**Holds**

1. Armour Assets — owned armour roster and current Service Rank.
2. Service Rank — rank upgrade for the selected armour asset.
3. Packages — Armament, Protection, Propulsion, and Electronics for the selected asset.
4. Blueprints — current-week armour blueprints; unavailable future releases show their unlock week.

**Effect table — all Armour-asset stat multiplier**

| Level | Multiplier |
|---:|---:|
| 1 | ×1.020000 |
| 2 | ×1.040400 |
| 3 | ×1.061208 |
| 4 | ×1.082432 |
| 5 | ×1.104081 |
| 6 | ×1.126162 |
| 7 | ×1.148686 |
| 8 | ×1.171659 |
| 9 | ×1.195093 |
| 10 | ×1.218994 |

Apply to Firepower, Armour, Mobility, Range, and Detection after Service Rank and before the relevant package multiplier.

**Panel line:** `All Armour assets: +{cumulativePercent}% to all five stats. {nextLine}`

**Why:** It improves every tank at once while Service Rank still delivers the larger improvement to one chosen tank.

**Rationale:** Level 10 is ×1.218994, below a ten-Service-Rank gap, so ranks remain the main asset progression.

## Missile Building

**Holds**

1. Artillery Assets — owned artillery roster and current Service Rank.
2. Service Rank — rank upgrade for the selected artillery asset.
3. Packages — Armament, Protection, Propulsion, and Electronics for the selected asset.
4. Blueprints — current-week artillery blueprints; unavailable future releases show their unlock week.

**Effect table — all Artillery-asset stat multiplier**

| Level | Multiplier |
|---:|---:|
| 1 | ×1.020000 |
| 2 | ×1.040400 |
| 3 | ×1.061208 |
| 4 | ×1.082432 |
| 5 | ×1.104081 |
| 6 | ×1.126162 |
| 7 | ×1.148686 |
| 8 | ×1.171659 |
| 9 | ×1.195093 |
| 10 | ×1.218994 |

Apply to Firepower, Armour, Mobility, Range, and Detection after Service Rank and before the relevant package multiplier.

**Panel line:** `All Artillery assets: +{cumulativePercent}% to all five stats. {nextLine}`

**Why:** It makes an overwatch roster stronger together without replacing the value of ranking a preferred launcher.

**Rationale:** The category-wide multiplier rewards artillery investment while preserving asset-by-asset rank decisions.

## Fixed-Wing Building

**Holds**

1. Fixed-Wing Assets — owned fixed-wing roster and current Service Rank.
2. Service Rank — rank upgrade for the selected fixed-wing asset.
3. Packages — Armament, Protection, Propulsion, and Electronics for the selected asset.
4. Blueprints — current-week fixed-wing blueprints; unavailable future releases show their unlock week.

**Effect table — all Fixed-Wing-asset stat multiplier**

| Level | Multiplier |
|---:|---:|
| 1 | ×1.020000 |
| 2 | ×1.040400 |
| 3 | ×1.061208 |
| 4 | ×1.082432 |
| 5 | ×1.104081 |
| 6 | ×1.126162 |
| 7 | ×1.148686 |
| 8 | ×1.171659 |
| 9 | ×1.195093 |
| 10 | ×1.218994 |

Apply to Firepower, Armour, Mobility, Range, and Detection after Service Rank and before the relevant package multiplier.

**Panel line:** `All Fixed-Wing assets: +{cumulativePercent}% to all five stats. {nextLine}`

**Why:** It rewards building an air wing, while individual jet ranks remain the fastest route to a standout attacker.

**Rationale:** Every category receives the same capped multiplier so no asset family has a hidden building advantage.

## Helicopter Building

**Holds**

1. Rotary Assets — owned rotary roster and current Service Rank.
2. Service Rank — rank upgrade for the selected rotary asset.
3. Packages — Armament, Protection, Propulsion, and Electronics for the selected asset.
4. Blueprints — current-week rotary blueprints; unavailable future releases show their unlock week.

**Effect table — all Rotary-asset stat multiplier**

| Level | Multiplier |
|---:|---:|
| 1 | ×1.020000 |
| 2 | ×1.040400 |
| 3 | ×1.061208 |
| 4 | ×1.082432 |
| 5 | ×1.104081 |
| 6 | ×1.126162 |
| 7 | ×1.148686 |
| 8 | ×1.171659 |
| 9 | ×1.195093 |
| 10 | ×1.218994 |

Apply to Firepower, Armour, Mobility, Range, and Detection after Service Rank and before the relevant package multiplier.

**Panel line:** `All Rotary assets: +{cumulativePercent}% to all five stats. {nextLine}`

**Why:** It makes lift and strike helicopters better as a group without turning a low-rank aircraft into a high-rank replacement.

**Rationale:** The same multiplier preserves category parity and keeps Service Rank as the dominant per-asset progression.

## Drone Building

**Holds**

1. Drone Assets — owned drone roster, current Service Rank, and Drone Network contribution.
2. Service Rank — rank upgrade for the selected drone asset.
3. Packages — Armament, Protection, Propulsion, and Electronics for the selected asset.
4. Blueprints — current-week drone blueprints; unavailable future releases show their unlock week.

**Effect table — all Drone-asset stat multiplier**

| Level | Multiplier |
|---:|---:|
| 1 | ×1.020000 |
| 2 | ×1.040400 |
| 3 | ×1.061208 |
| 4 | ×1.082432 |
| 5 | ×1.104081 |
| 6 | ×1.126162 |
| 7 | ×1.148686 |
| 8 | ×1.171659 |
| 9 | ×1.195093 |
| 10 | ×1.218994 |

Apply to Firepower, Armour, Mobility, Range, and Detection after Service Rank and before the relevant package multiplier; improved Mobility and Detection then feed the existing Drone Network formula.

**Panel line:** `All Drone assets: +{cumulativePercent}% to all five stats and stronger Drone Network contribution. {nextLine}`

**Why:** It improves required marching drones and makes a dedicated drone roster more useful without bypassing the Drone Network cap.

**Rationale:** Building stats improve the existing drone formula naturally, while the Drone Network itself remains capped at ×1.25.

## Tactical Operations Center

**Holds**

1. March Control — live Task Force march multiplier and global cap.
2. Task Force Dispatch — current home/away state and route timer for each Task Force.
3. Operations History — later; show `Coming Soon` until operation history is implemented.

**Effect table — Tactical Operations march multiplier**

| Level | Multiplier |
|---:|---:|
| 1 | ×1.02 |
| 2 | ×1.04 |
| 3 | ×1.06 |
| 4 | ×1.08 |
| 5 | ×1.10 |
| 6 | ×1.12 |
| 7 | ×1.14 |
| 8 | ×1.16 |
| 9 | ×1.18 |
| 10 | ×1.20 |

`totalMarchMultiplier = min(1.50, droneNetworkMultiplier × tacticalOperationsMultiplier)`. It applies to every Task Force march after the slowest-asset pace is resolved.

**Panel line:** `All Task Forces march {tocPercent}% faster. Drone Network total caps at ×1.50. {nextLine}`

**Why:** It improves every mobile formation, so it competes directly with investing in a single asset category.

**Rationale:** Level 10 ×1.20 multiplied by the existing Drone Network cap of ×1.25 reaches, but cannot exceed, the hard ×1.50 total cap.

## Signals Center

**Holds**

1. Incoming Alerts — live incoming marches, arrival time, origin, and current warning lead time.
2. Signal Coverage — current early-warning level and next-level preview.
3. Contact Reports — later; when map scouting UI exists, it may show carried categories only, never exact assets, ranks, packages, or stats.

**Effect table — inbound warning lead time**

| Level | Lead time |
|---:|---:|
| 1 | 3 minutes |
| 2 | 6 minutes |
| 3 | 9 minutes |
| 4 | 12 minutes |
| 5 | 15 minutes |
| 6 | 18 minutes |
| 7 | 21 minutes |
| 8 | 24 minutes |
| 9 | 27 minutes |
| 10 | 30 minutes |

For an incoming march, `visibleAt = max(sentAt, arrivalAt - warningLeadTime)`.

**Panel line:** `Incoming attacks appear {leadMinutes} minutes earlier. {nextLine}`

**Why:** It gives a defender more time to bring home, reinforce, or reposition a Task Force without exposing exact enemy information.

**Rationale:** Earlier alerts are useful in every conflict while remaining a defensive information tool rather than a hidden-stat scanner.

## Bulk Fuel Point

**Holds**

1. Fuel Stock — live current Fuel, cap, protected amount, and time until full.
2. Production — live Fuel per hour and the next-level rate.
3. Fuel Ledger — later; show `Coming Soon` until resource history is implemented.

**Effect table — Fuel production**

| Level | Fuel per hour |
|---:|---:|
| 1 | 250 |
| 2 | 400 |
| 3 | 600 |
| 4 | 900 |
| 5 | 1,300 |
| 6 | 1,800 |
| 7 | 2,400 |
| 8 | 3,200 |
| 9 | 4,200 |
| 10 | 5,500 |

**Panel line:** `Produces {fuelPerHour} Fuel/hour. {nextLine}`

**Why:** Fuel supports operations, engines, airframes, and mobility costs, so it is the direct way to sustain more activity.

**Rationale:** This preserves the already-tabled producer curve with no secondary modifier.

## Base Fabrication Shop

**Holds**

1. Steel Stock — live current Steel, cap, protected amount, and time until full.
2. Production — live Steel per hour and the next-level rate.
3. Fabrication Ledger — later; show `Coming Soon` until resource history is implemented.

**Effect table — Steel production**

| Level | Steel per hour |
|---:|---:|
| 1 | 180 |
| 2 | 300 |
| 3 | 450 |
| 4 | 650 |
| 5 | 950 |
| 6 | 1,300 |
| 7 | 1,750 |
| 8 | 2,300 |
| 9 | 3,000 |
| 10 | 3,900 |

**Panel line:** `Produces {steelPerHour} Steel/hour. {nextLine}`

**Why:** Steel is the construction and armour bottleneck, making this the practical choice for players planning heavy base or tank upgrades.

**Rationale:** This preserves the already-tabled producer curve with no secondary modifier.

## Garrison Barracks

**Holds**

1. Munitions Stock — live current Munitions, cap, protected amount, and time until full.
2. Production — live Munitions per hour and the next-level rate.
3. Garrison Ledger — later; show `Coming Soon` until resource history is implemented.

**Effect table — Munitions production**

| Level | Munitions per hour |
|---:|---:|
| 1 | 150 |
| 2 | 250 |
| 3 | 375 |
| 4 | 550 |
| 5 | 800 |
| 6 | 1,100 |
| 7 | 1,500 |
| 8 | 2,000 |
| 9 | 2,600 |
| 10 | 3,400 |

**Panel line:** `Produces {munitionsPerHour} Munitions/hour. {nextLine}`

**Why:** Munitions feeds weapons, artillery, garrisons, and combat-control upgrades, so it supports offensive and defensive pressure.

**Rationale:** This preserves the already-tabled producer curve with no secondary modifier.

## Materials Recovery Yard

**Holds**

1. Alloy Stock — live current Alloy, cap, protected amount, and time until full.
2. Production — live Alloy per hour and the next-level rate.
3. Recovery Ledger — later; show `Coming Soon` until resource history is implemented.

**Effect table — Alloy production**

| Level | Alloy per hour |
|---:|---:|
| 1 | 120 |
| 2 | 200 |
| 3 | 300 |
| 4 | 450 |
| 5 | 650 |
| 6 | 900 |
| 7 | 1,200 |
| 8 | 1,600 |
| 9 | 2,100 |
| 10 | 2,800 |

**Panel line:** `Produces {alloyPerHour} Alloy/hour. {nextLine}`

**Why:** Alloy is the precision bottleneck for sensors, drones, electronics, and advanced airframes.

**Rationale:** This preserves the already-tabled producer curve with no secondary modifier.

## Quartermaster Warehouse

**Holds**

1. Stock — live Fuel, Steel, Munitions, and Alloy balances.
2. Capacity & Protection — cap per resource, protected share, and time until each stock reaches cap.
3. Raid Report — later; show `Coming Soon` until raid-history UI is implemented.

**Effect table — capacity per resource and protected share**

| Level | Cap each resource | Protected share |
|---:|---:|---:|
| 1 | 6,000 | 8% |
| 2 | 10,000 | 16% |
| 3 | 16,000 | 24% |
| 4 | 24,000 | 32% |
| 5 | 36,000 | 40% |
| 6 | 50,000 | 48% |
| 7 | 68,000 | 56% |
| 8 | 90,000 | 64% |
| 9 | 116,000 | 72% |
| 10 | 150,000 | 80% |

**Panel line:** `Stores {capEach} of each resource; {protectedPercent}% is raid-protected. {nextLine}`

**Why:** It prevents production waste, enables higher-level costs, and keeps more accumulated resources safe after a raid.

**Rationale:** Capacity is the primary effect and raid protection is the mandatory already-tabled secondary effect.

## Engineer Support Yard

**Holds**

1. Build Queue — live active building timers and their fixed completion timestamps.
2. Efficiency — current build-timer reduction and next level preview.
3. Second Engineer Team — locked until Level 10; then show its existing one-time hire cost and 24-hour timer.

**Effect table — new building-timer multiplier**

| Level | Multiplier |
|---:|---:|
| 1 | ×0.97 |
| 2 | ×0.94 |
| 3 | ×0.91 |
| 4 | ×0.88 |
| 5 | ×0.85 |
| 6 | ×0.82 |
| 7 | ×0.79 |
| 8 | ×0.76 |
| 9 | ×0.73 |
| 10 | ×0.70 |

For a timer started after this Yard level is complete, `finalTimer = baseTimer × multiplier`. An already-started timer never changes. At Level 10, the existing Second Engineer Team hire becomes available: `12,000 Steel + 12,000 Alloy + 1,500 Tokens/Credits`, followed by its fixed 24-hour timer.

**Panel line:** `New building timers are {timerReductionPercent}% shorter. {nextLine}`

**Why:** It accelerates every future base decision and, at Level 10, unlocks the permanent second build queue.

**Rationale:** The reduction reaches the required −30% cap at Level 10, remains unskippable, and gives levels 2–9 a clear value.

## Depot

**Holds**

1. Supplies — live resource purchase cards, fixed Token/Credit rates, remaining daily caps, and storage check.
2. Modules — later; show `Coming Soon` until modules are implemented.
3. Cosmetics — later; show `Coming Soon` until cosmetic inventory and equip flow are implemented.
4. Services — later; show `Coming Soon` until asset repair is implemented.

**Effect table — daily Supplies-cap multiplier**

| Level | Multiplier |
|---:|---:|
| 1 | ×1.05 |
| 2 | ×1.10 |
| 3 | ×1.15 |
| 4 | ×1.20 |
| 5 | ×1.25 |
| 6 | ×1.30 |
| 7 | ×1.35 |
| 8 | ×1.40 |
| 9 | ×1.45 |
| 10 | ×1.50 |

Apply this to the fixed daily Supplies caps before purchase validation: Fuel `20,000`, Steel `16,000`, Munitions `14,000`, and Alloy `12,000` at ×1.00. Rates do not change.

**Panel line:** `Daily Supplies limits are +{capBonusPercent}% higher. Rates stay fixed. {nextLine}`

**Why:** It lets a paying or Credit-saving player turn more earned value into building resources each day without removing the server's daily throttle.

**Rationale:** It fills Depot levels with a live, existing cap modifier while preserving equal Token/Credit value and fixed exchange rates.

## Alliance Trading Post

**Holds**

1. Alliance Offers — later; show `Coming Soon` until private barter ships.
2. My Offers — later; show `Coming Soon` until private barter ships.
3. Create Offer — later; display the 48-hour alliance-membership requirement when the feature ships.
4. Trade History — later; show `Coming Soon` until private barter ships.

**Effect table — simultaneous open barter offers per player**

| Level | Open offers |
|---:|---:|
| 1 | 1 |
| 2 | 2 |
| 3 | 3 |
| 4 | 4 |
| 5 | 5 |
| 6 | 6 |
| 7 | 7 |
| 8 | 8 |
| 9 | 9 |
| 10 | 10 |

When private barter ships, only a player in the same alliance for at least 48 continuous hours may create, counter, or accept an offer. A pending counter occupies the original offer slot; an accepted trade finalises atomically and frees both players' slots.

**Panel line:** `You may keep {openOfferCount} alliance barter offers open. {nextLine}`

**Why:** Active alliance traders can coordinate more resource and item swaps without introducing a new currency or public market.

**Rationale:** Open-offer count is a simple modifier of the already-decided private barter system and gives every Trading Post level a future use without changing trade value.

## Simulation guardrails

1. Starting a Building or Service Rank level `N` must fail unless Command Center level `N` is complete; non-Warehouse buildings must also meet `Warehouse >= floor(N / 2)`.
2. For each Asset Building, Level 10 must apply exactly `×1.218994` to all five category stats, and `1.218994 < 1.045^10`; the building can never equal ten Service Ranks.
3. Every Task Force must resolve `totalMarchMultiplier = min(1.50, droneNetworkMultiplier × tacticalOperationsMultiplier)`; at Drone Network ×1.25 and Tactical Operations Center 10, the result must equal exactly ×1.50.
4. Every building timer started at Engineer Support Yard Level 10 must equal `baseTimer ×0.70`; no timer may be shortened below ×0.70 or change after it has started.
5. Signals Center output must expose only incoming timing/origin and, when Contact Reports later exist, category labels; it must never return an enemy asset id, Service Rank, package, stat, or exact roster before landing.

---

## Owner's rulings and implementation notes (2026-09-07)

- **Level 1 is the start, not a bonus.** Every curve runs from nothing at level 1 to the document's level-10 endpoint in equal steps: asset buildings ×1.02 per level above 1 (×1.195 at 10), Tactical Operations Center ×1.20 at 10, Engineer Support Yard ×0.70 at 10, Depot caps ×1.50 at 10. Signals is 3 minutes × level as written. Past level 10 the value holds until a later table.
- **March total** = min(×1.50, Drone Network × TOC) — `marchMultiplier()` in `shared/buildings.ts`, applied in `worker/march.ts`.
- **Signals** filters what the viewer sees on the World map: their own marches always; anyone else's only once within the lead time of landing.
- **Task Force unlocks** (Bravo 5, Charlie 15, Delta 25) go live with the test reset, as decided earlier.
- **Trading Post** open-offer count is computed and shown; barter itself is not built.
- Holds: producers show their own stock and time-to-full; Engineer Yard shows the queue and the Second Team; Signals points at the map. Ledgers, raid reports and operations history are "later" as written.
- Harness section 10b asserts the guardrails.
