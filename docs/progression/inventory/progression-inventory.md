# WWR progression inventory — read-only audit

Repo `World-War-Rogue/WWR` at commit `65e77e5`, audited 2026-09-07. Nothing in the repo was changed by this audit. Every number below was produced by executing the repo's own `shared/` code (`tsx`), and every claim names a file:line. Machine-readable twin: `progression-inventory.json` (39 rows, same ids).

**Units.** Service Rank, packages, shields, Delta, Second Engineer Team, Depot purchases and the Trade Post are priced in Command Credits / Tokens (always 1:1). Buildings, asset construction and repair are priced in **resources** (Fuel / Steel / Munitions / Alloy) only; to make them comparable the table quotes them as *Depot-equivalent* currency — the Credits-or-Tokens it would take to buy those resources at the Depot's flat rate (100 Fuel, 80 Steel, 70 Munitions, 60 Alloy per 1 currency, `shared/buildings.ts:183-188`). "Cost into L" is the single step L-1 → L.

## 1. Headline findings

1. **No Command Credit income exists in code.** The only statement that ever adds Credits is the package-strip refund (`worker/upgrades.ts:425-434`), which returns the player's own spend. Every "earned by playing" line in the UI is copy, not code. Average Credit income per source and per 15-minute session is therefore **0 / not computable** (§7).
2. **The only inflow is the weekly test Token top-up** to 100,000 (`shared/economy.ts:49-50`, `worker/upgrades.ts:80-136`), so today every purchase is effectively paid in Tokens.
3. **Tokens and Credits are 1:1 for every purchasable thing.** All currency spends pass through `splitIsValid`/`defaultSplit` (`shared/economy.ts:137-152`) against one price. The one exchange path: Token-paid packages refund as Credits when stripped (`worker/upgrades.ts:372-383`) — a Token→Credit conversion the docs say must not exist.
4. **One cost curve for rank and all four packages:** `round(25 × 1.8^floor(from/5))` in bands of five (`shared/economy.ts:57-95`). `docs/GAME-MATH-v1.md:277-300` specifies bands of ten; doc and code diverge from level 15.
5. **Every cap in play today is 10**, from a single constant `CURRENT_SEASON = 1` (`worker/index.ts:1198`, duplicated as `SEASON = 1` in `src/live/AssetUpgrade.tsx:44`): buildings (`buildingCapForSeason`), Service Rank (`maxRankForSeason`), packages (≤ rank). Hard maxima are 50 everywhere (`ASSET_MAX_LEVEL`, `BUILDING_MAX_LEVEL`, DB CHECKs).
6. **Building levels 11–50 are placeholder extrapolations**, not a designed economy: cost ×1.3 and time ×1.5 per level past 10 (`shared/buildings.ts:273-286`, comment "until a later table lands"). Command Center 20 = 144 days base timer; level 50 = 27.6 million days. These must not be read as balance.
7. **One live power formula:** `assetPowerWith = round(6 × Σ(F,A,M,R,D))` (`shared/upgrades.ts:145-153`). Profile, alliance, squads, battle records and client all use it. Because all 72 assets total exactly 30 attribute points, **power at a given rank is identical for every asset**: 180 / 280 / 454 / 736 / 1,195 / 1,939 at ranks 1/10/20/30/40/50 (no packages, no hub boost).
8. **Power is not an input to who wins.** The resolver (`shared/combat.ts`) fights on per-attribute values; power is only a report figure.
9. **Cosmetics grant no power and cannot be bought** (`shared/cosmetics.ts:17`, no Token price, `grantItem` has no callers). `ALL_SKINS_UNLOCKED = true` (`worker/game.ts:233`).
10. **Combat Systems, liveries with modifiers, collections, blueprints/dossiers, doctrines, drone packages, modules/materials, Readiness Band, alliance barter, Events/Wars, daily tasks: not built** (§8).

## 2. Inventory table (one row per built system)

| id | category | levels today (cap) | hard max | currency | 1:1 | cost into L10 / L20 / L30 / L40 / L50 | cum. to current cap | power class | combat | stats changed | server grant | client screen |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `alliance_trading_post` | building | 1–10 | 50 (DB CHECK) | fuel, steel, munitions, alloy | yes | 321 / 4,419 / 60,924 / 839,896 / 11,578,676 (Depot-equiv.) | 1,022 (Depot-equiv.) | convenience/production | no | — | worker/buildings.ts startLevel() (:236-289) via POST /api/base/level (worker/index.ts:2787 | src/live/BaseSheets.tsx DepartmentSheet -> BuildingPanel |
| `armour_hub` | building | 1–10 | 50 (DB CHECK) | fuel, steel, munitions, alloy | yes | 416 / 5,732 / 79,018 / 1,089,326 / 15,017,278 (Depot-equiv.) | 1,457 (Depot-equiv.) | combat | yes | firepower, armour, mobility, range, detection | worker/buildings.ts startLevel() (:236-289) via POST /api/base/level (worker/index.ts:2787 | src/live/Assets.tsx:430-435 (category view) -> src/live/BuildingPanel. |
| `artillery_hub` | building | 1–10 | 50 (DB CHECK) | fuel, steel, munitions, alloy | yes | 440 / 6,068 / 83,647 / 1,153,141 / 15,897,030 (Depot-equiv.) | 1,542 (Depot-equiv.) | combat | yes | firepower, armour, mobility, range, detection | worker/buildings.ts startLevel() (:236-289) via POST /api/base/level (worker/index.ts:2787 | src/live/Assets.tsx:430-435 (category view) -> src/live/BuildingPanel. |
| `command_center` | building | 1–10 | 50 (DB CHECK) | fuel, steel, munitions, alloy | yes | 1,051 / 14,495 / 199,824 / 2,754,738 / 37,976,406 (Depot-equiv.) | 3,355 (Depot-equiv.) | combat | yes | rank ceiling (indirect: every asset attribute via Service Rank), asset tier availability, Task Force count | worker/buildings.ts startLevel() (:236-289) via POST /api/base/level (worker/index.ts:2787 | src/live/BaseSheets.tsx CommandCenterSheet (Departments tab) -> src/li |
| `depot` | building | 1–10 | 50 (DB CHECK) | fuel, steel, munitions, alloy | yes | 361 / 4,975 / 68,581 / 945,444 / 13,033,750 (Depot-equiv.) | 1,150 (Depot-equiv.) | convenience/production | no | daily resource purchase cap | worker/buildings.ts startLevel() (:236-289) via POST /api/base/level (worker/index.ts:2787 | src/live/BaseSheets.tsx DepotSheet (Supplies tab) -> BuildingPanel + R |
| `drone_hub` | building | 1–10 | 50 (DB CHECK) | fuel, steel, munitions, alloy | yes | 464 / 6,391 / 88,102 / 1,214,555 / 16,743,674 (Depot-equiv.) | 1,625 (Depot-equiv.) | combat | yes | firepower, armour, mobility, range, detection, march speed (via Drone Network) | worker/buildings.ts startLevel() (:236-289) via POST /api/base/level (worker/index.ts:2787 | src/live/Assets.tsx:430-435 (category view) -> src/live/BuildingPanel. |
| `engineer_support_yard` | building | 1–10 | 50 (DB CHECK) | fuel, steel, munitions, alloy | yes | 397 / 5,467 / 75,368 / 1,039,015 / 14,323,710 (Depot-equiv.) | 1,264 (Depot-equiv.) | convenience/production | no | building timer multiplier, second queue eligibility | worker/buildings.ts startLevel() (:236-289) via POST /api/base/level (worker/index.ts:2787 | src/live/BaseSheets.tsx DepartmentSheet -> BuildingPanel + ResourcePan |
| `fabrication_shop` | building | 1–10 | 50 (DB CHECK) | fuel, steel, munitions, alloy | yes | 337 / 4,640 / 63,965 / 881,816 / 12,156,578 (Depot-equiv.) | 1,073 (Depot-equiv.) | convenience/production | no | steel/hour | worker/buildings.ts startLevel() (:236-289) via POST /api/base/level (worker/index.ts:2787 | src/live/BaseSheets.tsx DepartmentSheet -> BuildingPanel + ResourcePan |
| `fixed_wing_hub` | building | 1–10 | 50 (DB CHECK) | fuel, steel, munitions, alloy | yes | 388 / 5,353 / 73,791 / 1,017,276 / 14,024,009 (Depot-equiv.) | 1,361 (Depot-equiv.) | combat | yes | firepower, armour, mobility, range, detection | worker/buildings.ts startLevel() (:236-289) via POST /api/base/level (worker/index.ts:2787 | src/live/Assets.tsx:430-435 (category view) -> src/live/BuildingPanel. |
| `fuel_point` | building | 1–10 | 50 (DB CHECK) | fuel, steel, munitions, alloy | yes | 228 / 3,147 / 43,386 / 598,108 / 8,245,421 (Depot-equiv.) | 728 (Depot-equiv.) | convenience/production | no | fuel/hour | worker/buildings.ts startLevel() (:236-289) via POST /api/base/level (worker/index.ts:2787 | src/live/BaseSheets.tsx DepartmentSheet -> BuildingPanel + ResourcePan |
| `garrison_barracks` | building | 1–10 | 50 (DB CHECK) | fuel, steel, munitions, alloy | yes | 319 / 4,404 / 60,707 / 836,901 / 11,537,397 (Depot-equiv.) | 1,018 (Depot-equiv.) | convenience/production | no | munitions/hour | worker/buildings.ts startLevel() (:236-289) via POST /api/base/level (worker/index.ts:2787 | src/live/BaseSheets.tsx DepartmentSheet -> BuildingPanel + ResourcePan |
| `quartermaster_warehouse` | building | 1–10 | 50 (DB CHECK) | fuel, steel, munitions, alloy | yes | 408 / 5,629 / 77,595 / 1,069,707 / 14,746,817 (Depot-equiv.) | 1,301 (Depot-equiv.) | convenience/production | no | storage cap, protected share, raid loot exposure | worker/buildings.ts startLevel() (:236-289) via POST /api/base/level (worker/index.ts:2787 | src/live/BaseSheets.tsx DepartmentSheet -> BuildingPanel + ResourcePan |
| `recovery_yard` | building | 1–10 | 50 (DB CHECK) | fuel, steel, munitions, alloy | yes | 317 / 4,374 / 60,300 / 831,287 / 11,460,000 (Depot-equiv.) | 1,011 (Depot-equiv.) | convenience/production | no | alloy/hour | worker/buildings.ts startLevel() (:236-289) via POST /api/base/level (worker/index.ts:2787 | src/live/BaseSheets.tsx DepartmentSheet -> BuildingPanel + ResourcePan |
| `rotary_hub` | building | 1–10 | 50 (DB CHECK) | fuel, steel, munitions, alloy | yes | 441 / 6,075 / 83,746 / 1,154,514 / 15,915,950 (Depot-equiv.) | 1,544 (Depot-equiv.) | combat | yes | firepower, armour, mobility, range, detection | worker/buildings.ts startLevel() (:236-289) via POST /api/base/level (worker/index.ts:2787 | src/live/Assets.tsx:430-435 (category view) -> src/live/BuildingPanel. |
| `signals_center` | building | 1–10 | 50 (DB CHECK) | fuel, steel, munitions, alloy | yes | 330 / 4,553 / 62,771 / 865,347 / 11,929,545 (Depot-equiv.) | 1,053 (Depot-equiv.) | combat | yes | warning lead time | worker/buildings.ts startLevel() (:236-289) via POST /api/base/level (worker/index.ts:2787 | src/live/BaseSheets.tsx DepartmentSheet -> BuildingPanel |
| `tactical_operations_center` | building | 1–10 | 50 (DB CHECK) | fuel, steel, munitions, alloy | yes | 379 / 5,227 / 72,056 / 993,353 / 13,694,210 (Depot-equiv.) | 1,209 (Depot-equiv.) | combat | yes | march speed | worker/buildings.ts startLevel() (:236-289) via POST /api/base/level (worker/index.ts:2787 | src/live/BaseSheets.tsx DepartmentSheet -> BuildingPanel |
| `service-rank` | asset-rank | 1–10 | 50 (ASSET_MAX_LEVEL) | credits, tokens | yes | 45 / 146 / 472 / 1,531 / 4,959 | 55,605 | combat | yes | firepower, armour, mobility, range, detection, packageCeiling, visualStage, repair time (0.02*level factor), march pace (via mobility) | worker/upgrades.ts rankUp() <- worker/index.ts handleRankUp() (line 1218) <- route 'POST / | src/live/AssetUpgrade.tsx AssetUpgrade -> Track label='Service Rank' ( |
| `package-armament` | package | 1–10 | ≤ Service Rank, ≤ 50 | credits, tokens | yes | 45 / 146 / 472 / 1,531 / 4,959 | 55,605 | combat | yes | firepower, systemIntegration (indirect), HP (via firepower in combat.ts:372), repair bill (via F) | worker/upgrades.ts packageUp() <- worker/index.ts handlePackageUp() (line 1248) <- 'POST / | src/live/AssetUpgrade.tsx PACKAGE_KEYS.map -> Track (lines 511-558); r |
| `package-electronics` | package | 1–10 | ≤ Service Rank, ≤ 50 | credits, tokens | yes | 45 / 146 / 472 / 1,531 / 4,959 | 55,605 | combat | yes | detection, spotting, drone network multiplier, systemIntegration (indirect) | worker/upgrades.ts packageUp(key='electronics') <- 'POST /api/assets/package'. | src/live/AssetUpgrade.tsx lines 511-558. |
| `package-propulsion` | package | 1–10 | ≤ Service Rank, ≤ 50 | credits, tokens | yes | 45 / 146 / 472 / 1,531 / 4,959 | 55,605 | combat | yes | mobility, march seconds, drone network multiplier, systemIntegration (indirect) | worker/upgrades.ts packageUp(key='propulsion') <- 'POST /api/assets/package'. | src/live/AssetUpgrade.tsx lines 511-558 (note line 536-540 adds DRONE_ |
| `package-protection` | package | 1–10 | ≤ Service Rank, ≤ 50 | credits, tokens | yes | 45 / 146 / 472 / 1,531 / 4,959 | 55,605 | combat | yes | armour, systemIntegration (indirect), HP and mitigation (combat.ts:367,372,472), repair bill (via A) | worker/upgrades.ts packageUp(key='protection') <- 'POST /api/assets/package'. | src/live/AssetUpgrade.tsx lines 511-558. |
| `asset-repair` | other | 0–0 | — | fuel, steel, munitions | yes | — | — | consumable | yes | hp_fraction, repair_ends_at | worker/repair.ts startRepair() <- 'POST /api/assets/repair' (worker/index.ts:2724-2737); d | src/live/Assets.tsx Card repair panel (224-252, uses repairBill client |
| `asset_construction` | other | 0–1 | — | fuel, steel, munitions, alloy | yes | — | — | combat | yes | roster (new asset at rank 1) | worker/season1.ts startBuild() (:169-220) + settleBuild() (:70-94) via POST /api/assets/bu | src/live/Assets.tsx unlockLabel()/Card (:85-120, :332) — the hub build |
| `attack_fuel` | other | 0–0 | — | fuel | yes | — | — | consumable | yes | bases.fuel | worker/march.ts launch() (:311-326) via POST /api/attack | src/live/WorldMap.tsx:1779 (fuel shown on the attack panel) |
| `depot_resource_alloy` | other | 0–0 | — | credits, tokens | yes | — | — | consumable | no | bases.alloy | worker/buildings.ts buyResource() (:306-372) via POST /api/depot/resources (worker/index.t | src/live/ResourcePanels.tsx ResourceShop (Depot sheet, Supplies tab; B |
| `depot_resource_fuel` | other | 0–0 | — | credits, tokens | yes | — | — | consumable | yes | bases.fuel | worker/buildings.ts buyResource() (:306-372) via POST /api/depot/resources (worker/index.t | src/live/ResourcePanels.tsx ResourceShop (Depot sheet, Supplies tab; B |
| `depot_resource_munitions` | other | 0–0 | — | credits, tokens | yes | — | — | consumable | no | bases.munitions | worker/buildings.ts buyResource() (:306-372) via POST /api/depot/resources (worker/index.t | src/live/ResourcePanels.tsx ResourceShop (Depot sheet, Supplies tab; B |
| `depot_resource_steel` | other | 0–0 | — | credits, tokens | yes | — | — | consumable | no | bases.steel | worker/buildings.ts buyResource() (:306-372) via POST /api/depot/resources (worker/index.t | src/live/ResourcePanels.tsx ResourceShop (Depot sheet, Supplies tab; B |
| `package-strip-refund` | other | 0–0 | — | credits | yes | — | — | consumable | no | players.credits, player_assets.pkg_*, player_assets.pkg_credits | worker/upgrades.ts resetPackages() -> POST /api/assets/reset (worker/index.ts:2859) | src/live/AssetUpgrade.tsx:577-582 ('Strip packages · refunds N Credits |
| `system-integration` | other | 0–9 | — | — | yes | — | — | combat | yes | firepower, armour, mobility, range, detection | None (pure function called inside attributesWith at shared/upgrades.ts:132; used by every  | src/live/AssetUpgrade.tsx lines 560-573 (System Integration panel), an |
| `task_force_delta_purchase` | other | 0–1 | — | credits, tokens | yes | L1: 2,500 | 2,500 | combat | yes | Task Force count (4th squad of 6 slots) | worker/season1.ts buyDelta() (:331-360) via POST /api/squads/delta (worker/index.ts:2739-2 | src/live/Squads.tsx:418-475 (Buy Delta button when cc >= 10) |
| `task_force_unlocks` | other | 1–4 | — | — | yes | — | — | combat | yes | squads available | worker/squads.ts assignSlot()/moveSlot() gate; deltaOpen() writes delta_at; GET /api/squad | src/live/Squads.tsx:418 (taskForceOpen) and BaseBoard.tsx Task Force s |
| `test-token-top-up` | other | 0–0 | — | tokens | n/a | — | — | consumable | no | players.tokens, players.granted_week, wallet_ledger | worker/upgrades.ts settleWallet() | none (balance shows on src/live/WalletLine.tsx) |
| `trade-post-package-component-selector` | other | 1–10 | — | credits, tokens | yes | 45 / 146 / 472 / 1,531 / 4,959 | — | combat | yes | player_assets.pkg_<key>, player_assets.pkg_credits, trade_purchases | worker/tradePost.ts buyFromTradePost() -> POST /api/trade-post/buy (worker/index.ts:2836-2 | src/live/TradePost.tsx (Command Center tab); Review component :201-374 |
| `second_engineer_team` | queue | 0–1 | — | steel, alloy, credits, tokens | yes | L1: 1,500 | 1,500 | convenience/production | no | queues | worker/buildings.ts buySecondTeam() (:378-423) via POST /api/base/second-team (worker/inde | src/live/ResourcePanels.tsx SecondTeamPanel (Engineer Support Yard Dep |
| `shield-coupon` | shield | 1–1 | — | — | yes | L1: 0 | 0 | consumable | yes | players.shield_until, players.shield_kind, players.coupon_8_used, players.coupon_4_used | worker/season1.ts applyShield() price===0 branch (261-271) -> POST /api/shield | src/live/ShieldPanel.tsx |
| `shield-paid` | shield | 1–1 | — | credits, tokens | yes | L1: 250 | — | consumable | yes | players.shield_until, players.shield_kind | worker/season1.ts applyShield() -> POST /api/shield (worker/index.ts:2749-2760); wallet vi | src/live/ShieldPanel.tsx (mounted from src/live/BaseSheets.tsx:126 Com |
| `base-skins` | cosmetic | 0–0 | — | — | n/a | — | — | cosmetic-only | no | bases.skin | none (equip only via POST /api/cosmetics/equip) | src/live/Customize.tsx SkinTile :128-160, :330-345 |
| `cosmetics-accessories` | cosmetic | 0–0 | — | — | n/a | — | — | cosmetic-only | no | bases.banner, bases.emblem, bases.lights, bases.decal | NO purchase route. grantItem() (worker/cosmetics.ts:100-124) exists for 'purchase'|'grant' | src/live/Customize.tsx (ItemTile shows caption=String(item.price) :121 |

Column notes: *levels today* is the range a player can actually reach with `CURRENT_SEASON = 1`; *cum. to current cap* is the sum of steps to that cap (55,605 per rank/package track and 278,025 per fully fitted asset if the cap were 50). Full per-row detail — formulas, prerequisites, timers, caps, notes — is in the JSON.

## 3. Level caps in code (below / at / above 50)

| Cap | Value today | Hard max | Source |
|---|---|---|---|
| Building level (all 16) | 10 (`buildingCapForSeason(1)`) | 50 | `shared/buildings.ts:77,84-86`; `migrations/0022` CHECK ≤ 50 |
| Service Rank | 10 (`maxRankForSeason(1)`), and ≤ Command Center level (`rankCeiling`) | 50 | `shared/assets.ts:180-186`; `shared/buildings.ts:349-351`; `worker/upgrades.ts:266-272` |
| Package rank (×4) | ≤ Service Rank | 50 | `shared/upgrades.ts:164-166`; `migrations/0020` CHECK `pkg_* BETWEEN 1 AND level` |
| System Integration | derived: 0.1 × (lowest package − 1), max 1.0 (needs package 11 — unreachable in Season 1) | 1.0 | `shared/upgrades.ts:104-112` |
| Task Forces | Alpha 1, Bravo at CC 5, Charlie at CC 10, Delta bought at CC 10 (2,500) or free at CC 20 + three full TFs at rank 20 (unreachable in Season 1) | 4 | `shared/season.ts:71-95` |
| Department effects (TOC, Engineer Yard, Depot) | clamp at level 10 — levels 11–50 add nothing | — | `shared/buildings.ts:378-406` `ramp()` |
| Hub boost, production, storage, Signals lead, Trading Post offers | **not** clamped: hub ×1.02^(L−1) = ×2.64 at 50 | — | `shared/buildings.ts:360-362,142-160,409-416` |
| Drone Network / march total | ×1.25 / ×1.5 | — | `shared/drones.ts:20`; `shared/buildings.ts:386` |
| Farm bots | level 8 (Season 1), band = week + 1 | — | `worker/bots.ts:33,132-137` |

Nothing in code is capped above 50. Nothing player-facing sits between 10 and 50 except the hard maxima.

## 4. Exact costs at levels 1 / 10 / 20 / 30 / 40 / 50

**Service Rank and each package (identical function, per track):** step into 10 = 45, 20 = 146, 30 = 472, 40 = 1,531, 50 = 4,959. Cumulative 1→10 = 325, 1→20 = 1,460, 1→30 = 5,130, 1→40 = 17,035, **1→50 = 55,605**. Fully fitted asset (rank + 4 packages) 1→50 = 278,025; the 60-asset live roster = 16,681,500 (`fullDraftCost` still assumes 24 assets = 6,672,600).

**Buildings (Depot-equivalent currency, step into level):**

| building | L2 | L10 | L11 | L20 | L30 | L40 | L50 |
|---|---:|---:|---:|---:|---:|---:|---:|
| Command Center | 50 | 1,051 | 1,366 | 14,495 | 199,824 | 2,754,738 | 37,976,406 |
| Category hubs (armour … drone, `HUB_SCALE`) | ~20 | 416–440 | ~540 | 5,732–6,068 | 79,018–83,647 | ~1.1 M | ~15–16 M |
| Departments (`DEPT_SCALE`) | ~15 | 321 | ~417 | 4,419 | 60,924 | 839,896 | 11,578,676 |

Raw resource rows 2–10 match `docs/BUILDING-RESOURCES-v1.md` exactly (the 25 per-building tables are in `audit-buildings.md` §1). Timers: CC 10 = 2d 12h; CC 20 = 144 d; CC 30 ≈ 8,314 d — the ×1.5 extrapolation is unplayable past ~15.

**Fixed prices:** paid shields 250 (8 h) / 600 (24 h) / 1,500 (72 h), coupons free (`shared/shields.ts:16-21`); Delta 2,500 (`shared/season.ts:78`); Second Engineer Team 1,500 + 12,000 Steel + 12,000 Alloy at Engineer Yard 10 (`shared/buildings.ts:297-302`); Depot resources 100/80/70/60 units per currency, daily caps 20,000/16,000/14,000/12,000 units ×1.5 at Depot 10 (`shared/buildings.ts:183-196`); attack Fuel 100 + 20 × units (`shared/march.ts:115-120`).

## 5. Hardcoded prices, duplicated rules, 1:1 exceptions

| Literal / rule | Where | Verdict |
|---|---|---|
| Shield prices 0/0/250/600/1500 | `shared/shields.ts:16-21` | price outside `economy.ts`; 1:1 |
| `DELTA_PRICE = 2500` | `shared/season.ts:78` | outside `economy.ts`; 1:1 |
| `SECOND_TEAM.currency = 1500` | `shared/buildings.ts:300` | outside `economy.ts`; 1:1 |
| Depot `RESOURCE_PER_UNIT`, `DAILY_RESOURCE_CAP` | `shared/buildings.ts:183-196` | outside `economy.ts`; 1:1 |
| Building tables + bare `1.3` / `1.5` extrapolation literals | `shared/buildings.ts:208-244, 273-286`; `1.3` again in `productionPerHour`/`storageCap` (:144,149) | placeholder |
| Construction costs `BUILD_BY_CATEGORY` | `shared/construction.ts:19-25` | resources |
| Repair factors 20/16/8/900/0.02 | `shared/repair.ts:35-39` | bare literals, resources |
| `ATTACK_FUEL_BASE/PER_UNIT` | `shared/march.ts:115-120` | Fuel |
| `TEST_TOKEN_FLOOR = 100_000` | `shared/economy.ts:50` **and** literal `100000` in `migrations/0024:47` | duplicated |
| `CURRENT_SEASON = 1` / `SEASON = 1` | `worker/index.ts:1198` / `src/live/AssetUpgrade.tsx:44` | duplicated cap rule (server vs client) |
| Legacy `upgradeCost` 260/140 × 1.55^level, `totalPower`, `STORAGE_CAP` | `worker/game.ts:120-159` | dead code still seeded at signup and echoed by `GET /api/base` (`worker/index.ts:217-372`) |
| Cosmetic prices 700–1400 "in credits" | `shared/cosmetics.ts:156-184` | no Token price, no purchase path — cannot be 1:1-checked |
| Shortfall / queue-busy message strings | `worker/buildings.ts:198-205,257-259` vs `src/live/BuildingPanel.tsx:160-169` | duplicated rule text |
| Shield cooldown wording | `shared/shields.ts:6-7`, `src/live/ShieldPanel.tsx:95` vs enforcement only in `worker/march.ts:369-377` | server enforces no cooldown after natural expiry — consecutive paid shields unlimited |
| Package strip refund | `worker/upgrades.ts:372-383, 425-434` | **Token→Credit conversion at 1:1** (contradicts `docs/progression/README.md:63-65`, `migrations/0020:97-100`) |

**Not 1:1 anywhere.** No item is priced differently in Tokens vs Credits. The client never sends a split for shields / Delta / Depot / Second Team (`src/net/api.ts:458-488`), so with Credits at 0 those are always paid in Tokens.

## 6. Power classes

| Class | Systems |
|---|---|
| **Combat power** | Service Rank; Armament / Protection / Propulsion / Electronics packages; System Integration (derived); the five category hubs (×1.02^(L−1) on every attribute of the category); Command Center (rank ceiling; home-ground defence bonus `1 + min(0.25, 0.015×(CC−1))`, `worker/march.ts:652-658`); TOC (march speed); Signals Center (inbound lead time); Task Force unlocks and Delta (more units fielded); asset construction (which assets exist) |
| **Convenience / production** | Fuel Point, Fabrication Shop, Arsenal (`garrison_barracks`), Recovery Yard (production); Quartermaster Warehouse (storage + raid protection 8 %→80 %); Engineer Support Yard (timer ×0.70 at 10) and Second Engineer Team (second queue); Depot (daily cap ×1.5); Alliance Trading Post (offer count — barter not built) |
| **Cosmetic-only** | Base skins, banners/emblems/lights/decals, portraits — zero stat effect today (`shared/cosmetics.ts:17`) |
| **Consumables — not permanent progression** | Paid shields and coupons; Depot resource purchases; attack Fuel; repair bills (resources); weekly test Token top-up; package-strip refund |

## 7. Command Credit income

**Cannot be computed — there is no income.** Every wallet-changing statement in `worker/` was enumerated (`audit-spend-income.md` §1.2): Token top-up (`worker/upgrades.ts:94-135`), rank/package/shield/Delta/Second-Team/Depot/Trade-Post debits, and the strip refund. Raids and battles move resources only (`worker/march.ts:752-783`, `migrations/0013:54-57`). Alliances, bots, signup, admin grant nothing. There is no session model (`players.last_seen_at` is the only activity timestamp), so "an active 15-minute daily session" has no code correlate. The docs' earn schedules (420 → 1,400 Credits/day, 77,000 per season; `docs/progression/04,06,08`, `docs/GAME-MATH-v1.md:320-350`) have no code counterpart. `scripts/simulate.mjs` is a combat harness and encodes no economy.

Season 1 spend ceiling reachable in code per player: Delta 2,500 + Second Team 1,500 + Depot 56,000–84,000 + shields (uncapped; ≈35,000 for continuous 72 h cover) + Trade Post ≤ 900 + rank/packages 97,500 for 60 assets to 10 fully fitted — against 100,000 Tokens/week of test top-up and 0 Credits.

## 8. Catalogue: categories, chassis, buildings, packages, caps

- **Asset categories (6):** armour, rotary, fixed_wing, artillery, drone, naval — 12 chassis each = **72 assets**, 60 draftable (naval 12 `draftable: false`, Season 3). Every asset spends exactly 30 attribute points across firepower / armour / mobility / range / detection (`shared/assets.ts:1063-1096`, `auditAssets() = []`). Full list with attributes: `audit-assets.md` §2. Starters: m1a2, leclerc, f35a, rq4, m270a2, mi35m (`shared/season.ts:33`). Unlock weeks: `shared/season.ts:36-45`.
- **Service Rank:** 1–50, 10 per season, milestones every 10 ranks (double step + art). Attribute multiplier `1.045^(L−1+milestones)`: ×1.553 at 10, ×2.520 at 20, ×4.090 at 30, ×6.637 at 40, **×10.772 at 50** (comments/docs say ×8.6).
- **Packages (4):** armament→firepower, protection→armour, propulsion→mobility, electronics→detection; +0.14 points per rank above 1, additive after boost; cap = Service Rank. Range has no package by design.
- **Buildings (16 levelled):** command_center; hubs armour_hub, artillery_hub, fixed_wing_hub, rotary_hub, drone_hub; departments tactical_operations_center, signals_center, fuel_point, fabrication_shop, garrison_barracks (Arsenal), recovery_yard, quartermaster_warehouse, engineer_support_yard, depot, alliance_trading_post. All 1–10 today, hard max 50. Effects grid by level: `audit-buildings.md` §0.
- **Task Forces:** Alpha, Bravo (CC 5), Charlie (CC 10), Delta (bought 2,500 at CC 10 / free at CC 20). Six slots each; ≥ 1 drone to march; drone armour ×0.93 each.
- **Shields:** 8 h / 24 h / 72 h paid; 8 h / 4 h coupons; 48 h new-player shield.
- **Trade Post:** one offer (Package Component Selector), 2 per player per weekly window, monthly shelf empty; price = the direct package step.

## 9. Where "power" is computed and whether they agree

| Place | Formula | Agrees? |
|---|---|---|
| Client asset sheet `src/live/AssetUpgrade.tsx:243`, `Assets.tsx:465,491` | `assetPowerWith(asset, level, packages, categoryBoost)` | yes |
| Squad header `worker/squads.ts:267-280` → map/squads screens | Σ over 6 slots | yes |
| Profile / alliance roster / alliance browse `worker/power.ts:16-66`, `profile.ts:103`, `alliance.ts:113-124`, `index.ts:1732-1756` | Σ over **all** owned assets (unassigned included, repair state ignored) | same formula, wider scope |
| Battle record `worker/march.ts:664-691` | Σ over marched units, **frozen at launch** (attacker boost = hub level at launch), stored once in `battles.attacker_power` | same formula, snapshot |
| Resolver `shared/combat.ts:521-529` | same Σ, report-only; the fight uses per-attribute values | consistent inputs |
| Alliance applications `worker/index.ts:1634-1651` | `power: 0` hardcoded | **disagrees** (placeholder) |
| `shared/assets.ts:1191-1200 assetPower` | rank only, no boost/packages | second definition, only `scripts/simulate.mjs` |
| `worker/game.ts:106-113 totalPower` | legacy buildings^1.6 | third definition, imported, never called |
| World map | shows Command Center level, not power | n/a |
| `docs/GAME-MATH-v1.md:243-251` | `10×(1.35F+1.35A+0.90M+0.75R+1.10D)`, CPTF, DevelopmentScore | **not implemented** |
| `CLAUDE.md` "power from building levels, never stored" | — | stale on both counts |

## 10. `notBuiltYet` — do not invent curves for these

Combat Systems (Fire-Control / Survivability / Sustainment; doc cost `ceil(200×1.17^(L−1))`, `docs/GAME-MATH-v1.md:98-110`); package modules / materials (`player_materials` table exists, nothing reads or writes it, `migrations/0020:126-138`); Specialty Adders; cosmetic / livery stat modifiers (`GAME-MATH-v1.md:165-189`); per-asset liveries, collections, blueprints / Technical Dossiers, doctrines, drone packages/firmware; Season Readiness Band (bots only, `worker/bots.ts:131-155`); season progression past 1 (a constant); Alliance Trading Post barter; Depot Modules / Cosmetics / Services tabs; Command Center Events / Wars; daily tasks / objectives; Token store (link only); wallet handoff / reservations / 10,000-per-week purchase cap; naval assets and Fleet Doctrines; Lift / Fuel Point / Signals march bonuses; alliance operations, ambush, event modifiers; weighted CP / CPTF / DevelopmentScore; cosmetic purchase path (`grantItem` uncalled); asset art for 59 of 72 chassis.

## 11. Missing information (not derivable from code)

- Any Credit earn rate, income schedule, or session model (§7).
- Designed building costs, timers and effects for levels 11–50 (code holds a placeholder extrapolation; TOC / Engineer Yard / Depot effects have no design past 10).
- Absolute power at max for a hub — depends on the roster; only the multiplier (×2.6388 at 50) is derivable.
- How `CURRENT_SEASON` advances; there is no season/phase table.
- Whether ×10.772 at rank 50 (code) or ×8.6 (docs) is intended; whether Integration's 1.0 ceiling (needs package 11) is intended.
- `HP_PER_ARMOUR`: 0.4 in code, 0.25 in the doc footer, 1.2 in the spec.
- Whether "successful raid" = `outcome === 'attacker'` matches design; whether the strip-refund Token→Credit path is intended (the code comment says owner decision; the docs say no).
- Whether any pre-package march rows survive the Season 1 reset (would resolve as bare).

## 12. Files and functions that must change for the approved level 1–50 economy

| File | Functions / constants |
|---|---|
| `shared/economy.ts` | `RANK_STEP_BASE`, `RANK_STEP_GROWTH`, `rankStepCost`, `rankCost`, `packageStepCost`, `packageCost`, `fullAssetCost`, `fullDraftCost` (draftSize 24), `SEASON_1_CAP`; new home for every price now outside it |
| `shared/assets.ts` | `ASSET_MAX_LEVEL`, `RANKS_PER_SEASON`, `maxRankForSeason`, `RANK_GROWTH`, `MILESTONE_EVERY`, `milestonesReached`, `rankStepGain`, `attributeAtLevel`, `SEASON_GAIN`; delete legacy `assetPower` |
| `shared/upgrades.ts` | `PACKAGE_POINTS_PER_RANK`, `INTEGRATION_POINTS_PER_RANK`, `INTEGRATION_MAX_POINTS`, `systemIntegration`, `attributesWith`, `assetPowerWith`, `packageCeiling` |
| `shared/buildings.ts` | `buildingStep` (:266-288) and tables (:208-244); `row`, `PRODUCTION`, `WAREHOUSE_CAP/PROTECTED`, `protectedShare`; `ramp`, `tocMultiplier`, `engineerMultiplier`, `depotCapMultiplier`, `MARCH_TOTAL_CAP`; `signalsLeadMs`, `tradingOffers`; `buildingBoost`/`BUILDING_STEP`, `categoryBoost`; `buildingCapForSeason`, `BUILDING_MAX_LEVEL`, `warehouseNeeded`, `effectLine`; `RESOURCE_PER_UNIT`, `DAILY_RESOURCE_CAP`, `SECOND_TEAM`; `rankCeiling` |
| `shared/season.ts` | `DELTA_PRICE`, `DELTA_BUY_LEVEL`, `DELTA_FREE_RANK`, `TASK_FORCE_UNLOCK`, `taskForceOpen`, `deltaEarned`; `SEASON_1_START`, `SEASON_WEEKS`, `seasonWeek`, `isUnlocked` |
| `shared/shields.ts` | `SHIELD_OPTIONS`, `SHIELD_COOLDOWN_MS` |
| `shared/construction.ts` | `BUILD_BY_CATEGORY`, `levelNeeded` |
| `shared/repair.ts` | `repairBill` literals |
| `shared/combat.ts` | `HP_*`, `DAMAGE_SCALE`, `ARMOUR_MITIGATION` (`100/(100+4A)` saturates at rank-50 magnitudes), `RANGE_*`, `POSITION`, role constants |
| `shared/march.ts`, `shared/drones.ts` | `SECONDS_PER_PLOT`, `MIN/MAX_MARCH_SECONDS` (mobility 30–90 at rank 50 pins every march at the 12 s floor), `droneContribution`, `DRONE_NETWORK_CAP` |
| `shared/tradePost.ts`, `worker/tradePost.ts` | `quotePackageStep`, offer limits/windows |
| `shared/cosmetics.ts`, `worker/cosmetics.ts` | price/currency fields, `grantItem` (uncalled) — only if cosmetics gain a purchase path or modifiers |
| `worker/index.ts` | `CURRENT_SEASON` (:1198); `handleRankUp` (:1238); legacy `settleAndLoad`/`baseView`/`seedBase` (:217-372) and `handleSquads` (:1161-1165); alliance applications `power: 0` (:1634-1651); `totalPower` import (:150) |
| `worker/game.ts` | delete `BUILDINGS`, `upgradeCost`, `upgradeDurationMs`, `totalPower`, `STORAGE_CAP`, `productionPerHour` (:12-159); `ALL_SKINS_UNLOCKED` (:233) |
| `worker/upgrades.ts` | `rankUp` (:255-272), `packageUp` (:344-383), `resetPackages` (:425-434), weekly top-up (:80-136) |
| `worker/buildings.ts` | `startLevel` (:236-289), `buyResource` (:306-372), `buySecondTeam` (:378-423) |
| `worker/season1.ts` | `startBuild` (:169-220, ignores Engineer Yard), `applyShield` (:258-281), `buyDelta` (:331-360) |
| `worker/march.ts` | `:296-304` pace, `:311-328` Fuel debit, `:369-377` shield cooldown, `:652-658` home-ground bonus, `:664-691` stored power, `:761` raid clip (uses Warehouse cap for Fuel) |
| `worker/power.ts`, `worker/squads.ts:squadPower` | aggregation call sites (change together with the formula) |
| `worker/bots.ts` | `FARM_CEILING_SEASON_1`, `bandCeiling`, `growthPlan` (bots bypass cost) |
| `migrations/0020_wallet_upgrades.sql`, `0022_base_levels.sql` | CHECK constraints (`pkg_* BETWEEN 1 AND level`, `level <= 50`) — only if those rules move; `0024:47` literal 100000 |
| `src/live/AssetUpgrade.tsx` (`SEASON`, :239-254 caps), `Assets.tsx:85-120`, `BuildingPanel.tsx:79-90,136-169`, `ResourcePanels.tsx:26-155`, `BaseSheets.tsx`, `Squads.tsx:418-475`, `ShieldPanel.tsx`, `TradePost.tsx` | display-side copies of the shared functions and the duplicated strings |
| `docs/GAME-MATH-v1.md`, `docs/BUILDING-*.md`, `docs/ASSET-BUILDING-UPGRADES-v1.md`, `docs/progression/README.md`, `CLAUDE.md` | stale statements to correct alongside (cost bands, ×8.6, ×1.02^L, Charlie 15 / Delta 25, Token refund, "power from buildings") |

## 13. Bugs and drift noticed on the way (not fixed — read-only)

- Shield cooldown not enforced after natural expiry (`worker/march.ts:369-377` only).
- Raid loot clips Fuel by the Warehouse cap though Fuel is uncapped elsewhere (`worker/march.ts:761`).
- Asset construction timers ignore the Engineer Support Yard (`worker/season1.ts:196`).
- Alliance applications list shows power 0.
- Legacy Gemini-era base tables still seeded at signup and echoed over `GET /api/base`.
- Docs say Charlie 15 / Delta 25; code is 10 / 20 (`docs/BUILDING-EFFECTS-v1.md:514` vs `shared/season.ts:71-79`).
- Hub boost unclamped: the docs' guardrail "a building never equals ten Service Ranks" breaks from hub level 24.
- Trade Post: if `packageUp` throws instead of refusing, the weekly slot is consumed with no grant (`worker/tradePost.ts:161-231`).

Source reports with full per-system JSON and executed tables: `audit-buildings.md`, `audit-assets.md`, `audit-spend-income.md` (same folder).
