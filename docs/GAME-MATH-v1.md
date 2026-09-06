# WORLD WAR ROGUE — Game Math Specification v1

All calculations are server-side and deterministic. Store every stat as integer milli-points (stat × 1,000), round half-up only for display, and derive timers from stored timestamps plus the current instant. Every named number is a provisional configuration constant, never a hard-coded literal.

## 1. Attribute model

### Constants

| Constant | Value | Reason |
|---|---:|---|
| RANK_GROWTH | 1.045 | Rank 50 is 8.63× rank-1 base attributes: strong but readable growth. |
| PACKAGE_POINTS_PER_LEVEL | 0.140 | Packages matter without erasing asset identity. |
| INTEGRATION_PER_LOWEST_LEVEL | 0.100 | Rewards balanced package investment. |
| INTEGRATION_MAX | 1.000 | Caps the balanced-package payoff. |
| STAT_PRECISION | 0.001 | Shared server and UI precision. |

Each of the 72 assets has integer base Firepower, Armour, Mobility, Range, Detection in 1–10. Total base budget is 29–31 for every asset; categories must have equal average base budgets. Role changes behaviour, never the total budget.

For base stat b, stored Service Rank r, and package levels pF, pA, pM, pD:

R(r) = 1.045^(r − 1)

I = min(1.000, 0.100 × min(pF, pA, pM, pD))

F = bF × R(r) + (pF − 1) × 0.140 + I

A = bA × R(r) + (pA − 1) × 0.140 + I

M = bM × R(r) + (pM − 1) × 0.140 + I

D = bD × R(r) + (pD − 1) × 0.140 + I

Range = bR × R(r) + I

Range has no package. The effective rank used in combat is min(stored rank, Command Center level, Readiness Band cap).

### Worked examples

| Asset | Inputs | F | A | M | R | D |
|---|---|---:|---:|---:|---:|---:|
| Armour breach tank | Base (6,8,4,5,3), rank 10, packages (6,4,3,2), I=0.2 | 9.816 | 12.508 | 6.424 | 7.630 | 4.798 |
| Drone recon platform | Base (4,3,8,7,9), rank 10, packages (4,2,7,5), I=0.2 | 6.564 | 4.798 | 12.928 | 10.602 | 14.134 |
| Artillery overwatch | Base (9,3,3,9,5), rank 20, packages (20,16,12,14), I=1.0 | 24.423 | 10.021 | 9.461 | 21.763 | 14.355 |

### Fixed modifier order

| Stage | Apply |
|---:|---|
| 1 | Raw base attributes |
| 2 | Service Rank geometric curve |
| 3 | Packages |
| 4 | System Integration |
| 5 | Building buffs |
| 6 | Combat Systems |
| 7 | Owned, unequipped cosmetics |
| 8 | Equipped cosmetics |
| 9 | Alliance Operations and event buffs |
| 10 | Formation, role, spotting, exposure, counter, round |

Within a stage, sum additive bonuses first, then multiply the stage once. No modifier may change this order.

## 2. Roles and formation

### Roles and engagement bands

| Role | Band | Job | Best positions |
|---|---|---|---|
| Breach | Contact | Break armour, absorb first pressure | Front |
| Screen | Contact | Intercept and protect allies | Front / Centre |
| Strike | Assault | Punish damaged targets | Centre |
| Overwatch | Fire | Ranged damage | Rear |
| Recon | Information | Spotting and ambush prevention | Centre |
| Lift | Support | March and sustainment utility | Centre / Rear |

A Task Force has three required bands: Contact, Fire, Information. Missing any band creates Exposure.

### Six positions

| Position | Target weight | Damage | Other modifier |
|---|---:|---:|---|
| Front Left, Front Right | 1.45 | 0.96 | +8% Armour |
| Centre Left, Centre Right | 1.00 | 1.00 | Recon gives +0.050 team spotting, cap +0.100 |
| Rear Left, Rear Right | 0.65 | +12% if own Range ≥ enemy average; otherwise −10% | +10% Detection |

Role modifiers, all Stage 10:

| Condition | Effect |
|---|---:|
| Breach in Front | +6% damage |
| Screen in Front | Front allies take 5% less damage while screen lives |
| Strike in Centre | +8% damage against target damaged earlier this round |
| Overwatch in Rear | +6% damage |
| Recon in Centre | +0.050 spotting each, team cap +0.100 |
| Lift in Centre or Rear | +3% march speed each, Task Force cap +6% |

March mobility equals the lowest final Mobility in the Task Force multiplied by Fuel Point, Lift, and cosmetic speed modifiers.

## 3. Combat Systems

Each Task Force owns three independent upgrade lanes, levels 1–50, capped by Command Center level.

| Lane | Per level | Stage | Level 50 |
|---|---:|---:|---:|
| Fire-Control | +0.50% damage, +0.35% spotting | 6 | +25% damage, +17.5% spotting |
| Survivability | +0.60% HP, −0.35% damage taken | 6 | +30% HP, −17.5% taken |
| Sustainment | −0.80% repair time, −0.60% repair resources | 6 | −40% time, −30% cost |

Combat System cost for target level L is ceil(200 × 1.17^(L − 1)) Command Credits or Tokens, plus ceil(L / 5) modules distributed in rotating Ordnance, Protection, Powertrain, Electronic order.

### Extensible Specialty Adders

Every future power item is a data-defined Modifier. A Modifier may be a cosmetic, specialty Task Force adder, event reward, alliance operation, building project, season item, or future system. Adding one must never require a new resolver stage or a hidden formula.

Each Task Force has two Specialty slots: Slot 1 unlocks at Command Center 10 and Slot 2 at Command Center 25. A player may equip at most one Modifier from each declared slot family. Specialty Adders are earned from events, daily systems, alliance play, or bought with Command Credits/Tokens only when the same stat can also be earned; they are designed to complement a build, not become an always-best item.

| Example adder | Eligible Task Force | Exact effect | Stage | Stack group / cap |
|---|---|---|---|---|
| Breach Charges | At least one Front Breach | +8% damage against Siege or Factory targets | 9 | assaultSpecialty; one |
| Counter-Battery Node | At least one Rear Overwatch | +10% Detection and +6% first-round damage against Artillery | 9 | fireSupportSpecialty; one |
| Mobile Screen Array | At least one Front Screen | Protected Front allies take another 4% less damage | 9 | defenceSpecialty; one |
| Recon Uplink | At least one Centre Recon | +0.060 spotting; Ambush threshold reduced by 0.05 | 9 | informationSpecialty; one |
| Field Service Pack | Any Task Force | −12% repair time and −8% repair resources | 6 | sustainmentSpecialty; one |

Each Modifier definition must contain:

| Field | Required rule |
|---|---|
| id, version, sourceType | Stable audit identity, never inferred from display text |
| scope | asset, category, Task Force, player, alliance, or event |
| stage | Must be one of existing stages 5–9; no new stage is legal |
| operation / effects | One or more effects using add_points, add_percent, multiply, cap_min, cap_max, or flag |
| target | One stat, a named resolver term, a resource, or a feature flag |
| value | Explicit numeric value; no prose-only effect |
| conditions | Tags, category, role, position, event, season, and/or threshold predicates |
| stackingGroup and cap | Defines whether effects add, take highest, or are mutually exclusive |
| acquisition | At least one earned route for every combat-affecting Modifier |
| reportKey | Required battle-report line item |

Resolution is deterministic: fetch active Modifiers, reject those whose conditions fail, sort by stage then stackingGroup then id, reduce each stackingGroup by its rule, then apply it in the existing pipeline. Add-percent values in a stage sum before multiplication. Multiply values multiply in ascending id order. Conflicting flags resolve by priority, then id. Unsupported operations fail validation at content publish time.

## 4. Buildings

Command Center caps all rank, package, department, and Combat System levels. It unlocks Alpha at level 1, Bravo at 5, Charlie at 15, Delta at 25. It has no direct combat stat.

Production formula: OutputPerHour(L) = BaseOutput × 1.095^(L − 1).

| Department | Function and formula | Level-50 result | Stage |
|---|---|---:|---:|
| Tactical Operations Center | Damage multiplier 1 + 0.003L | +15% damage | 5 |
| Signals Center | Detection 1 + 0.004L; alert rings 1 + floor(L/5); ambush defence +0.004L | +20% D, 11 rings, +20% defence | 5 |
| Bulk Fuel Point | 140 × 1.095^(L−1) Fuel/h; +0.20%L march speed | 11,995/h; +10% march | 5 |
| Base Fabrication Shop | 120 × 1.095^(L−1) Steel/h | 10,281/h | — |
| Garrison Barracks | 90 × 1.095^(L−1) Munitions/h; +0.20%L reinforcement readiness | 7,711/h; +10% | 5 |
| Materials Recovery Yard | 80 × 1.095^(L−1) Alloy/h | 6,854/h | — |
| Quartermaster Warehouse | Storage 2,500 × 1.17^(L−1) each resource; protection min(75%, 10% + 1.3%L) | 5,454,190; 75% | — |
| Depot | Daily crates 1 + floor(L/10); earned modules ×(1 + 0.003L) | 6 crates; +15% | — |
| Engineer Support Yard | Build time multiplier 1 / (1 + 0.014L); second queue permit at L10 | 0.588× build time | — |
| Alliance Trading Post | Daily offers 1 + floor((L−1)/10); fee max(2%, 10% − 0.15%L) | 5 offers; 2.5% | — |

Trade requires 48 continuous alliance hours. Offers are pending until both parties accept; a counter replaces the pending offer; transfer is atomic.

Alliance Operations applies only in alliance events and reinforcement stacks:

AllianceOps = 1 + 0.003 × max(0, min(40, activeMembersLast7Days) − 1)

One member receives 1.000. Forty active members receive 1.117. This is Stage 9.

### Cosmetic modifiers

Every cosmetic item stores an affected category, a stat list, an owned modifier, an equipped modifier, and a source ID. A Base Skin is category-tagged; Nameplates, Base Effects, and Task Force Effects may use category All.

| Item type | Equipped | Owned, unequipped |
|---|---|---|
| Category Base Skin | +5% Firepower, +5% Armour, +2% Mobility | +2.5% Firepower, +2.5% Armour, +1% Mobility |
| Nameplate | +2% Firepower | +1% Firepower |
| Base Effect | +3% Armour | +1.5% Armour |
| Task Force Effect | +3% Detection or +3% Mobility | +1.5% matching stat |

For category c and stat s:

Owned(c,s) = min(0.50, sum(ownedModifier of every owned, unequipped applicable item))

Equipped(c,s) = sum(equippedModifier of each equipped applicable slot item)

Stage7Stat = Stage6Stat × (1 + Owned(c,s))

Stage8Stat = Stage7Stat × (1 + Equipped(c,s))

An equipped item does not also grant its owned value. The 50% cap is per category and stat at Stage 7. Equipped bonuses are limited by slot count. Reports must list every item ID and both contributions.

## 5. Combat resolver additions

Initial HP:

HP0 = 8 × (0.6F + 1.2A) × (1 + SurvivabilityHP)

Spotting for side X:

SpotX = clamp(0.35, 1.00, 0.65 + 0.025 × (averageDetectionX − averageDetectionY) + ReconBonus + FireControlSpotting)

Exposure:

Exposure = 1 + 0.06 × 1.5 × MissingBands

MissingBands is 0–3. A one-band mono force therefore takes 18% more incoming damage.

The resolver runs five rounds. Every living asset attacks once. It selects the living enemy with greatest:

TargetPriority = PositionTargetWeight × (1 + 0.12 × CurrentDamageFraction)

Ties go to lowest stable asset ID. Damage:

RangeMult = clamp(0.80, 1.18, 1 + 0.025 × (RangeAttacker − averageRangeEnemy))

Mitigation = 100 / (100 + 4 × ArmourTarget)

Damage = 12 × Firepower × RangeMult × SpotX × PositionAttack × RoleAttack × Counter × ExposureTarget × Mitigation × TacticalRoll

Counter rings: with Naval enabled, Rotary > Armour > Drone > Artillery > Naval > Fixed Wing > Rotary. In Season 1, Armour > Drone > Artillery > Fixed Wing > Rotary > Armour. Perfect counter is 1.20, medium counter one additional step is 1.10, all else 1.00.

Randomness is only TacticalRoll. Seed PRNG with battleId, round, attackerAssetId, targetAssetId. If u < 0.05, TacticalRoll = 1.20; otherwise 1.00. All targeting, ties, and math are deterministic.

Repair uses q = 1 − HPend / HP0:

RepairFuel = ceil(20q × (0.7F + 1.3A))

RepairSteel = ceil(16q × (0.5F + 1.5A))

RepairMunitions = ceil(8qF)

RepairSeconds = ceil(900q × (1 + 0.02 × effectiveRank) × SustainmentTimeMultiplier)

Store repairEndsAt, never a ticking counter. Disabled assets are repairable, not deleted.

Up to five players reinforce one side. Each retains its own formation. Damage is tracked by source asset and player; kill credit goes to highest source damage, tie to lowest player ID. Owners pay only their own repair costs.

Ambush requires attacker spotting at least 0.20 above defender and a living Recon asset. Round 1 attacker damage is +18%; defender spotting is −0.12 but not below 0.35. Defender reinforcements enter on round 3. Signals ambush defence reduces the +18% by its listed percent.

## 6. Power displays

Combat Power is display-only and never enters the resolver.

CPasset = round(10 × (1.35F + 1.35A + 0.90M + 0.75R + 1.10D))

Use final Stage-9 stats, excluding Formation, Counter, Exposure, and event factors.

CPTF = round(sum(CPasset) × (1 + 0.015 × filledPositions + 0.02 × bandsPresent))

CPplayer = sum(CPasset for every owned asset whose repair is complete)

DevelopmentScore = 100 × CommandCenterLevel + sum(round(12 × DepartmentLevel^1.35)) + 25 × sum(CombatSystemLevels)

The UI must expose all five asset stats, every multiplier stage, HP, damage dealt, damage received, cosmetics, and every active Specialty Adder source ID so every displayed power number is recomputable.

## 7. Economy

### Time-for-money progression contract

WORLD WAR ROGUE intentionally supports two routes to meaningful progression. A player who spends Tokens may reach a legal progression target with much less active play time by funding the same published resource, Command Credit, module, queue, and acceleration shortfalls. A player who does not spend may reach that same legal target through substantially more server-verified activity: Daily Operations, map exercises, neutral contracts, alliance operations, production collection, and event participation.

Paid progression is therefore valuable time compression, not an unreachable stat. Every combat-affecting resource, module, modifier, package, asset, and legal upgrade target sold for Tokens must expose at least one earned route. The earned route is intentionally slower and requires sustained active play; both routes retain the Season cap, Command Center cap, weekly limits, and minimum absolute timer floor.

| Configuration key | Provisional value | Rule |
|---|---:|---|
| `TIME_FOR_MONEY_PARITY_ACTIVE_TIME_MULTIPLIER` | 4.0 | Target active-play time required by a fully engaged free route versus a Token-funded ordinary-shortfall route to the same legal progression target. Tune from live telemetry, never from client claims. |
| `FREE_ROUTE_DAILY_ACTIVITY_TARGET` | server configured | Complete Daily Operations, map exercises, neutral/event contracts, and eligible alliance activity needed for the modelled active route. |
| `TOKEN_ROUTE_EXCLUSIVE_COMBAT_STAT` | false | No combat stat, modifier, or asset power may exist only behind Token payment. |
| `TOKEN_ROUTE_RESPECTS_MIN_TIMER_FLOOR` | true | Tokens may reduce eligible remaining time only to the published server timer floor. |
| `PROGRESSION_ROUTE_DISCLOSURE_REQUIRED` | true | Every Store progression product shows the Token route and the available earn route/source. |

For each progression target, the server balance tool must store `expectedFreeActiveMinutes`, `expectedFreeCalendarDays`, `expectedTokenActiveMinutes`, `requiredResources`, `earnedSources`, `tokenSources`, and `minimumTimerFloor`. The target passes validation only when it has both an earned route and a Token route where sold, and its measured time ratio is within the configurable parity band around `TIME_FOR_MONEY_PARITY_ACTIVE_TIME_MULTIPLIER`.

The design outcome is deliberate: a high-time free player can keep building toward the same power, while a low-time spender can remain competitive by paying to compress the grind. A spender is not required to play every activity; an active free player is not permanently blocked by payment.

### Upgrade curves

Rank and package currency cost for target level L:

RankOrPackageCC(L) = ceil(BaseStep(L) × 1.8^floor((L−1)/10))

BaseStep is 25 for levels 2–5 and 45 for levels 6–50. Level 1 costs zero. Tokens substitute for Command Credits 1:1. Package module cost is ceil((L−1)/3) of that package's matching module type.

| Target levels | Rank / package CC each | Package modules |
|---|---:|---:|
| 1 | 0 | 0 |
| 2–4 | 25 | 1 |
| 5 | 25 | 2 |
| 6–7 | 45 | 2 |
| 8–10 | 45 | 3 |
| 11–13 | 81 | 4 |
| 14–16 | 81 | 5 |
| 17–19 | 81 | 6 |
| 20 | 81 | 7 |
| 21–23 | 146 | 7–8 |
| 24–26 | 146 | 8–9 |
| 27–30 | 146 | 9–10 |
| 31–35 | 263 | 10–12 |
| 36–40 | 263 | 12–13 |
| 41–45 | 473 | 14–15 |
| 46–50 | 473 | 15–17 |

Combat System target cost is ceil(200 × 1.17^(L−1)). Building target cost is ceil(BaseResource × 1.19^(L−1)); build time is min(259,200, 30 × 1.45^(L−1)) seconds before Engineer Support.

| Building | Fuel | Steel | Munitions | Alloy |
|---|---:|---:|---:|---:|
| Command Center | 900 | 800 | 550 | 450 |
| Tactical Operations Center | 780 | 760 | 480 | 420 |
| Signals Center | 700 | 600 | 420 | 400 |
| Bulk Fuel Point | 650 | 500 | 300 | 260 |
| Base Fabrication Shop | 600 | 900 | 360 | 300 |
| Garrison Barracks | 560 | 480 | 820 | 380 |
| Materials Recovery Yard | 500 | 560 | 350 | 780 |
| Quartermaster Warehouse | 700 | 800 | 350 | 550 |
| Depot | 620 | 550 | 280 | 340 |
| Engineer Support Yard | 720 | 740 | 410 | 420 |
| Alliance Trading Post | 460 | 420 | 260 | 330 |

The formulas plus the base tables are complete exact level-1-to-50 cost tables.

### Income schedule

Each row is the weekly total for a player who plays daily. It includes seven days of activity, events, and average collected production. Casual player completes 45% of active content and collects 70% of production.

| Week | Rank cap | Active CC | Casual CC | Active Fuel / Steel / Munitions / Alloy | Active each module | Casual each module |
|---:|---:|---:|---:|---|---:|---:|
| 1 | 2 | 1,300 | 585 | 13,000 / 11,000 / 7,000 / 6,000 | 35 | 16 |
| 2 | 3 | 1,650 | 743 | 16,000 / 13,000 / 8,000 / 7,000 | 42 | 19 |
| 3 | 4 | 2,000 | 900 | 19,000 / 16,000 / 10,000 / 8,000 | 49 | 22 |
| 4 | 5 | 2,350 | 1,058 | 22,000 / 19,000 / 12,000 / 10,000 | 56 | 25 |
| 5 | 6 | 2,700 | 1,215 | 25,000 / 22,000 / 14,000 / 12,000 | 63 | 28 |
| 6 | 7 | 3,050 | 1,373 | 29,000 / 25,000 / 16,000 / 14,000 | 70 | 32 |
| 7 | 8 | 3,400 | 1,530 | 33,000 / 29,000 / 19,000 / 16,000 | 78 | 35 |
| 8 | 9 | 3,750 | 1,688 | 37,000 / 33,000 / 22,000 / 19,000 | 86 | 39 |
| 9 | 10 | 4,100 | 1,845 | 42,000 / 37,000 / 25,000 / 22,000 | 94 | 42 |
| 10 | 10 | 4,450 | 2,003 | 47,000 / 42,000 / 29,000 / 25,000 | 102 | 46 |

Ten-week totals: daily 28,750 CC, 270k Fuel, 247k Steel, 162k Munitions, 139k Alloy, 675 of each module. Casual 12,940 CC, 119k Fuel, 109k Steel, 72k Munitions, 62k Alloy, 304 of each module.

### Sink proof

| Week-10 full-development sink | CC | Fuel | Steel | Munitions | Alloy | Each module |
|---|---:|---:|---:|---:|---:|---:|
| 24 assets to rank 10 | 7,800 | — | — | — | — | — |
| 96 package tracks to 10 | 31,200 | — | — | — | — | 432 |
| Three Combat Systems to 10 | 13,662 | — | — | — | — | 18 total |
| Command Center plus 10 departments to 10 | — | 214,291 | 206,196 | 116,441 | 112,624 | — |
| Total sink | 52,662 | 214,291 | 206,196 | 116,441 | 112,624 | 432+ |
| Daily-player income | 28,750 | 270,000 | 247,000 | 162,000 | 139,000 | 675 |

The CC sink exceeds income by 23,912. A daily player can specialize, not max every possible package and system, by week 10. The weekly 10,000 Token cap can accelerate time and substitute for the same CC/module sinks, but cannot purchase a stat unavailable through play.

## 8. Events

Sample builds: Bulwark uses breach/screen front and overwatch rear; Raider uses high-mobility strike, rotary, fixed wing, drone; Sensor Lance uses recon centre, artillery/fixed rear, armour screen.

| Event | Stage-9 modifier set | Favoured build |
|---|---|---|
| Convoy Raid | +25% Mobility damage; rear Range bonus disabled | Raider |
| Factory Defence | +20% Front target weight; Screen protection doubled | Bulwark |
| Long-Range Strike | Rear Range bonus doubled; Contact damage −10% | Sensor Lance |
| Siege | Breach Front damage +25%; repair resources +30% | Bulwark |
| Recon Race | Detection score +50%; Ambush threshold 0.10 | Sensor Lance |
| Colossus Hunt | Missing-band Exposure doubled; all three bands +12% boss damage | Bulwark |
| Air Corridor | Rotary/Fixed counter modifier +5%; ground Range −8% | Raider |

No event changes a stored stat. Each event modifier is itemized in its battle report.

## 9. Variety proof

For 24 owned rank-10 assets:

Compositions = choose(24,6) = 134,596

Formations = 6! = 720

Package vectors = 10^(4 × 6) = 10^24

Combat System vectors = 10^3 = 1,000

Total meaningful raw Task Force builds = 134,596 × 720 × 10^24 × 1,000 = 9.690912 × 10^34.

| Same-power pair | Event A wins | Event B wins |
|---|---|---|
| Bulwark vs Raider | Factory Defence: screen/front rules | Convoy Raid: mobility |
| Raider vs Sensor Lance | Air Corridor: air composition | Recon Race: detection |
| Sensor Lance vs Bulwark | Long-Range Strike: rear overwatch | Siege: breach/front |

## 10. Simulation plan

Run 10,000 battles per assertion cell over at least 20 stable seeds. Fail CI when a confidence interval crosses a boundary.

| Assertion | Target band |
|---|---|
| Same seed and state | Bit-identical result |
| 0–5% CP gap | Either side 42–58% wins |
| 15–20% CP gap | Stronger side 68–82% |
| 30% CP gap | Stronger side at least 90% |
| Perfect counter, equal CP | 54–62% |
| Medium counter, equal CP | 51–57% |
| Mixed three-band vs same-CP mono | Mixed wins 58–68% |
| Named event-favoured build | 55–70% against each non-favoured sample |
| Any build in balanced event/category matrix | No more than 56% overall wins |
| Valid Ambush | Attacker 55–65%, never more than 68% |
| Five-player reinforcement | Damage and repair ledgers sum exactly to side totals |
| Modifier validation | Every published Modifier has an earned route, valid stage, explicit cap, report key, and no unsupported predicate |
| Specialty balance | No single Specialty Adder has more than 54% wins across a balanced eligible-build matrix |

## 11. Server config

~~~json
{
  "version": 1,
  "precision": { "statMilliPoints": 1000, "rounding": "half_up" },
  "season": {
    "weeks": 10,
    "readinessRankCaps": [2,3,4,5,6,7,8,9,10,10],
    "tokenPerDollar": 10,
    "weeklyTokenCap": 10000
  },
  "timeForMoneyParity": {
    "activeTimeMultiplier": 4.0,
    "tokenRouteExclusiveCombatStat": false,
    "tokenRouteRespectsMinimumTimerFloor": true,
    "progressionRouteDisclosureRequired": true,
    "freeRouteDailyActivityTarget": "server_configured"
  },
  "attributes": {
    "rankGrowth": 1.045,
    "packagePointsPerLevel": 0.14,
    "integrationPerLowestLevel": 0.1,
    "integrationMax": 1.0,
    "baseBudget": { "min": 29, "max": 31, "attributeMin": 1, "attributeMax": 10 }
  },
  "pipelineStages": [
    "raw",
    "service_rank",
    "packages",
    "integration",
    "buildings",
    "combat_systems",
    "owned_cosmetics",
    "equipped_cosmetics",
    "alliance_events",
    "formation_counter"
  ],
  "formation": {
    "positions": {
      "front_left": { "targetWeight": 1.45, "damage": 0.96, "armour": 0.08 },
      "front_right": { "targetWeight": 1.45, "damage": 0.96, "armour": 0.08 },
      "center_left": { "targetWeight": 1.0, "damage": 1.0, "detection": 0.0 },
      "center_right": { "targetWeight": 1.0, "damage": 1.0, "detection": 0.0 },
      "rear_left": { "targetWeight": 0.65, "damageIfRangeAtLeastEnemyAverage": 0.12, "damageIfBelow": -0.1, "detection": 0.1 },
      "rear_right": { "targetWeight": 0.65, "damageIfRangeAtLeastEnemyAverage": 0.12, "damageIfBelow": -0.1, "detection": 0.1 }
    },
    "roles": {
      "breachFrontDamage": 0.06,
      "screenFrontAllyDamageTaken": -0.05,
      "strikeDamagedTargetDamage": 0.08,
      "overwatchRearDamage": 0.06,
      "reconCenterSpotting": 0.05,
      "reconSpottingCap": 0.1,
      "liftMarchSpeed": 0.03,
      "liftMarchSpeedCap": 0.06
    },
    "bands": ["contact", "fire", "information"]
  },
  "combatSystems": {
    "maxLevel": 50,
    "currencyBase": 200,
    "currencyGrowth": 1.17,
    "moduleCostFormula": "ceil(level/5)",
    "fireControl": { "damagePerLevel": 0.005, "spottingPerLevel": 0.0035 },
    "survivability": { "hpPerLevel": 0.006, "damageTakenPerLevel": -0.0035 },
    "sustainment": { "repairTimePerLevel": -0.008, "repairCostPerLevel": -0.006 }
  },
  "combat": {
    "rounds": 5,
    "hpPerFirepower": 0.6,
    "hpPerArmour": 1.2,
    "hpScale": 8,
    "damageScale": 12,
    "armourMitigationScale": 4,
    "spottingFloor": 0.35,
    "spottingBase": 0.65,
    "spottingDetectionDelta": 0.025,
    "exposurePerMissingBand": 1.5,
    "exposureDamagePerPoint": 0.06,
    "rangeDeltaMultiplier": 0.025,
    "rangeMultiplierMin": 0.8,
    "rangeMultiplierMax": 1.18,
    "tacticalRoll": { "chance": 0.05, "multiplier": 1.2 },
    "targetDamagePriority": 0.12,
    "counter": {
      "perfect": 1.2,
      "medium": 1.1,
      "navalEnabledRing": ["rotary", "armour", "drone", "artillery", "naval", "fixed_wing"],
      "seasonOneRing": ["armour", "drone", "artillery", "fixed_wing", "rotary"]
    },
    "ambush": {
      "spottingGap": 0.2,
      "roundOneDamage": 0.18,
      "defenderSpottingPenalty": 0.12,
      "reinforcementRound": 3
    }
  },
  "buildings": {
    "maxLevel": 50,
    "costGrowth": 1.19,
    "timeBaseSeconds": 30,
    "timeGrowth": 1.45,
    "timeCapSeconds": 259200,
    "outputGrowth": 1.095,
    "baseCostsByBuilding": {
      "command_center": [900,800,550,450],
      "tactical_operations_center": [780,760,480,420],
      "signals_center": [700,600,420,400],
      "bulk_fuel_point": [650,500,300,260],
      "fabrication_shop": [600,900,360,300],
      "garrison_barracks": [560,480,820,380],
      "recovery_yard": [500,560,350,780],
      "quartermaster_warehouse": [700,800,350,550],
      "depot": [620,550,280,340],
      "engineer_support_yard": [720,740,410,420],
      "alliance_trading_post": [460,420,260,330]
    },
    "productionBasePerHour": { "fuel": 140, "steel": 120, "munitions": 90, "alloy": 80 },
    "tacticalDamagePerLevel": 0.003,
    "signalsDetectionPerLevel": 0.004,
    "fuelMarchPerLevel": 0.002,
    "garrisonReadinessPerLevel": 0.002,
    "warehouseStorageBase": 2500,
    "warehouseStorageGrowth": 1.17,
    "warehouseRaidProtectionBase": 0.1,
    "warehouseRaidProtectionPerLevel": 0.013,
    "warehouseRaidProtectionCap": 0.75,
    "depotModuleDropPerLevel": 0.003,
    "engineerTimePerLevel": 0.014,
    "engineerSecondQueueLevel": 10,
    "allianceTradeMinHours": 48
  },
  "costs": {
    "rankAndPackage": {
      "levels2to5": 25,
      "levels6plus": 45,
      "tenRankBandGrowth": 1.8,
      "packageModuleFormula": "ceil((level-1)/3)"
    }
  },
  "cosmetics": {
    "ownedCategoryStatCap": 0.5,
    "ownedStage": 7,
    "equippedStage": 8,
    "rule": "sum owned unequipped modifiers by category and stat to cap; equipped item uses equipped value instead of owned value",
    "defaults": {
      "baseSkin": { "equipped": { "firepower": 0.05, "armour": 0.05, "mobility": 0.02 }, "owned": { "firepower": 0.025, "armour": 0.025, "mobility": 0.01 } },
      "nameplate": { "equipped": { "firepower": 0.02 }, "owned": { "firepower": 0.01 } },
      "baseEffect": { "equipped": { "armour": 0.03 }, "owned": { "armour": 0.015 } },
      "taskForceEffect": { "equipped": { "detectionOrMobility": 0.03 }, "owned": { "detectionOrMobility": 0.015 } }
    }
  },
  "modifiers": {
    "taskForceSpecialtySlots": [
      { "slot": 1, "commandCenterLevel": 10 },
      { "slot": 2, "commandCenterLevel": 25 }
    ],
    "allowedStages": [5, 6, 7, 8, 9],
    "allowedOperations": ["add_points", "add_percent", "multiply", "cap_min", "cap_max", "flag"],
    "sortOrder": ["stage", "stackingGroup", "id"],
    "requireEarnedAcquisitionForCombat": true,
    "groupRules": { "default": "sum_then_cap", "exclusive": "highest_then_id" },
    "definitions": [
      {
        "id": "specialty.breach_charges", "version": 1, "sourceType": "task_force_specialty", "scope": "task_force", "stage": 9,
        "effects": [{ "operation": "add_percent", "target": "damageVs.siege_or_factory", "value": 0.08 }],
        "conditions": { "requiresRole": "breach", "requiresPositionBand": "front" }, "stackingGroup": "assaultSpecialty", "stackingRule": "exclusive", "cap": 1,
        "acquisition": { "earned": ["siege_event", "daily_operations"], "currencySubstitute": "command_credits_or_tokens" }, "reportKey": "modifier.specialty.breach_charges"
      },
      {
        "id": "specialty.counter_battery_node", "version": 1, "sourceType": "task_force_specialty", "scope": "task_force", "stage": 9,
        "effects": [{ "operation": "add_percent", "target": "detection", "value": 0.1 }, { "operation": "add_percent", "target": "round1DamageVs.artillery", "value": 0.06 }],
        "conditions": { "requiresRole": "overwatch", "requiresPositionBand": "rear" }, "stackingGroup": "fireSupportSpecialty", "stackingRule": "exclusive", "cap": 1,
        "acquisition": { "earned": ["artillery_event", "daily_operations"], "currencySubstitute": "command_credits_or_tokens" }, "reportKey": "modifier.specialty.counter_battery_node"
      },
      {
        "id": "specialty.mobile_screen_array", "version": 1, "sourceType": "task_force_specialty", "scope": "task_force", "stage": 9,
        "effects": [{ "operation": "add_percent", "target": "frontAlliesDamageTaken", "value": -0.04 }],
        "conditions": { "requiresRole": "screen", "requiresPositionBand": "front" }, "stackingGroup": "defenceSpecialty", "stackingRule": "exclusive", "cap": 1,
        "acquisition": { "earned": ["defence_event", "alliance_operations"], "currencySubstitute": "command_credits_or_tokens" }, "reportKey": "modifier.specialty.mobile_screen_array"
      },
      {
        "id": "specialty.recon_uplink", "version": 1, "sourceType": "task_force_specialty", "scope": "task_force", "stage": 9,
        "effects": [{ "operation": "add_points", "target": "spotting", "value": 0.06 }, { "operation": "add_points", "target": "ambushThreshold", "value": -0.05 }],
        "conditions": { "requiresRole": "recon", "requiresPositionBand": "centre" }, "stackingGroup": "informationSpecialty", "stackingRule": "exclusive", "cap": 1,
        "acquisition": { "earned": ["recon_event", "daily_operations"], "currencySubstitute": "command_credits_or_tokens" }, "reportKey": "modifier.specialty.recon_uplink"
      },
      {
        "id": "specialty.field_service_pack", "version": 1, "sourceType": "task_force_specialty", "scope": "task_force", "stage": 6,
        "effects": [{ "operation": "add_percent", "target": "repairTime", "value": -0.12 }, { "operation": "add_percent", "target": "repairResourceCost", "value": -0.08 }],
        "conditions": {}, "stackingGroup": "sustainmentSpecialty", "stackingRule": "exclusive", "cap": 1,
        "acquisition": { "earned": ["daily_operations", "alliance_operations"], "currencySubstitute": "command_credits_or_tokens" }, "reportKey": "modifier.specialty.field_service_pack"
      }
    ]
  },
  "alliance": {
    "activeMemberWindowDays": 7,
    "operationsPerAdditionalMember": 0.003,
    "operationsMemberCap": 40
  },
  "repair": {
    "fuelFactor": 20,
    "steelFactor": 16,
    "munitionsFactor": 8,
    "timeBaseSeconds": 900,
    "timeRankFactor": 0.02
  },
  "economy": {
    "weeklyActiveCC": [1300,1650,2000,2350,2700,3050,3400,3750,4100,4450],
    "weeklyCasualCC": [585,743,900,1058,1215,1373,1530,1688,1845,2003],
    "weeklyActiveResources": [
      [13000,11000,7000,6000],[16000,13000,8000,7000],[19000,16000,10000,8000],[22000,19000,12000,10000],[25000,22000,14000,12000],
      [29000,25000,16000,14000],[33000,29000,19000,16000],[37000,33000,22000,19000],[42000,37000,25000,22000],[47000,42000,29000,25000]
    ],
    "weeklyActiveModulesEach": [35,42,49,56,63,70,78,86,94,102],
    "casualActiveContentRatio": 0.45,
    "casualProductionRatio": 0.7
  },
  "events": {
    "convoyRaid": { "mobilityDamage": 0.25, "rearRangeBonusDisabled": true },
    "factoryDefence": { "frontTargetWeight": 0.2, "screenProtectionMultiplier": 2 },
    "longRangeStrike": { "rearRangeMultiplier": 2, "contactDamage": -0.1 },
    "siege": { "breachFrontDamage": 0.25, "repairResourceCost": 0.3 },
    "reconRace": { "detectionScore": 0.5, "ambushThreshold": 0.1 },
    "colossusHunt": { "missingBandExposureMultiplier": 2, "allBandsBossDamage": 0.12 },
    "airCorridor": { "rotaryFixedCounter": 0.05, "groundRange": -0.08 }
  }
}
~~~

## 12. Open questions for Matt

| Decision | Options | Recommendation |
|---|---|---|
| Season-1 asset access | All 60 non-naval; staged release; starter subset | Approved: six owned starter assets at signup, then six buildable blueprints at each Monday reset in Weeks 2–10. Use the fixed catalogue in `season-1-asset-unlock-schedule-v2.md`. |
| Second queue | Permanent purchase; season rental; event reward | Permanent CC-or-Token speed purchase at Engineer level 10. |
| Cosmetic Detection bonuses | Attack/defence only; all stats; category only | Allow small Detection and Mobility values, report every item. |
| Raid severity | 25%, 50%, or 75% of unprotected stock | 50%, with Warehouse protection from this spec. |
| Season reset | Full reset; partial reset; carry progression | Reset season standings/resources; retain cosmetics, owned assets, and account unlocks. |
| Naval release | Season 2; Season 3; later | Season 2 only after six naval assets and counter tests are ready. Do not offer Naval cosmetics first. |

---

## Decisions on the open questions (Matt, 2026-09-06)

| Question | Decision |
| :--- | :--- |
| Season-1 asset access | A starter subset, with more assets unlocking by week. The subset and schedule are still to be designed. |
| Second queue | Permanent purchase (Credits or Tokens), unlocked at Engineer Support Yard 10. |
| Cosmetic stat scope | All five stats allowed, small values, every item itemised in reports. |
| Raid severity | About 5% of unprotected stock per successful attack. |
| Season end | An offseason with events, letting other servers catch up; then server transfers (a scoring mechanism is needed); then 10-30 minutes offline and a new season loads on a different visual map. Everything earned carries over. |
| Naval release | Season 3. |
| Live-ops "Intel" and "module fragments" | Not added. Rewards pay in existing things: Credits for intel-type rewards, whole Modules for fragment-type rewards. |

Resolver constants that replaced the spec's after simulation (see `shared/combat.ts`): DAMAGE_SCALE 2 (was 12), HP = 8 × (3 + 0.3 F + 0.25 A) (was 8 × (0.6 F + 1.2 A)), per-shot swing ±40% plus the 5% ×1.2 crit, per-battle side swing ±28%, mobility ties broken by the seeded roll. Exposure counts category bands and role bands both.
