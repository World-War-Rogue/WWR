# Audit: ASSETS scope (Service Rank, packages, System Integration, power, battle, repair, drones, march)

Repo snapshot `/tmp/wwr` (commit 65e77e5). Every number below was produced by executing the repo's own `shared/` code with `tsx` (`/tmp/wwr-calc2/assets.ts`, run from `/tmp/wwr` with `npx tsx`). File:line citations are to this snapshot.

Definition used throughout: **"cost at level N" = the cost of the single step INTO level N**, i.e. `rankStepCost(N-1)` / `packageStepCost(N-1)` (`shared/economy.ts:69-73`, `93-95`). Level 1 is the start and has no step into it (`null`). "Cumulative to max" = `rankCost(1, 50)` (`shared/economy.ts:76-80`).

---

## 0. Headline facts (all code-derived)

| Fact | Value | Source |
|---|---|---|
| Catalogue size | 72 assets, 12 per category × 6 categories; 60 draftable (naval 12 not draftable) | `shared/assets.ts:197-1002`, `1009` |
| Every asset's attribute budget | exactly 30 points (audit allows 29-31, all 72 are 30; `auditAssets()` returns `[]`) | `shared/assets.ts:1063-1064`, `1066-1096` |
| Service Rank range | 1..50 (`ASSET_MAX_LEVEL = 50`), 10 per season | `shared/assets.ts:180-181` |
| Season 1 rank cap enforced | `min(50, season*10)` = **10** with `CURRENT_SEASON = 1` | `shared/assets.ts:184-186`; `worker/index.ts:1198`; `worker/upgrades.ts:266` |
| Second cap on rank | Command Center level (`rankCeiling`) | `shared/buildings.ts:349-351`; `worker/upgrades.ts:270`; `worker/index.ts:1238` |
| Package cap | package level ≤ asset Service Rank (`packageCeiling`), also a DB CHECK | `shared/upgrades.ts:164-166`; `worker/upgrades.ts:344-350`, `369`; `migrations/0020_wallet_upgrades.sql:107-110` |
| Rank step cost | `round(25 × 1.8^floor(from/5))` — bands of **five** ranks | `shared/economy.ts:57-59`, `69-73` |
| Package step cost | identical function (`packageStepCost = rankStepCost`) | `shared/economy.ts:93-95` |
| Cumulative one track 1→50 | **55,605** Credits-or-Tokens | computed via `rankCost(1,50)` |
| Full asset (rank + 4 packages) 1→50 | **278,025**; full 24-asset draft: **6,672,600** | `fullAssetCost(50)`, `fullDraftCost(50)` (`shared/economy.ts:108-115`) |
| Season-1 (cap 10) per track | 325; full asset 1,625; full draft 39,000 | `rankCost(1,10)`, `fullAssetCost(10)`, `fullDraftCost(10)` |
| Attribute growth | `base × 1.045^(L-1+milestonesReached(L))`; milestones at 10/20/30/40/50 are double steps | `shared/assets.ts:1158`, `1174-1188` |
| Rank-50 multiplier | **×10.772** (exponent 54), not the ×8.6 stated in comments/docs | computed `attributeAtLevel(1,50)` |
| Power formula | `round(6 × (F+A+M+R+D))` after rank, boost, packages, integration | `shared/upgrades.ts:145-153` |
| Power at rank 1 / 10 / 20 / 30 / 40 / 50 (no packages, boost 1) | **180 / 280 / 454 / 736 / 1195 / 1939 — identical for every one of the 72 assets** | computed; identical because every asset totals 30 points |
| Same with packages maxed at that rank | 180 / 337 / 547 / 864 / 1356 / 2134 | computed |
| Tokens:Credits | 1:1 everywhere in this scope (`splitIsValid` requires `tokens + credits === cost`) | `shared/economy.ts:137-141` |
| Repair | costs **Fuel/Steel/Munitions only** (Alloy always 0), no Credit/Token spend, no speed-up | `shared/repair.ts:23-42`; `worker/repair.ts:94-125` |

---

## 1. Built progression systems (JSON)

### 1.1 Service Rank

```json
{
  "id": "service-rank",
  "displayName": "Service Rank",
  "category": "asset-rank",
  "currentLevelMin": 1,
  "currentLevelMax": 10,
  "levelCount": 10,
  "playerVisible": true,
  "upgradeCurrency": ["credits", "tokens"],
  "tokenCostRule": "rankStepCost(from) = Math.round(25 * 1.8 ** Math.floor(from / 5)); rankCost(from,to) = sum of steps. Tokens accepted 1:1 with Credits via a client-chosen split; default split spends Credits first (shared/economy.ts:149-152).",
  "creditCostRule": "Same function; Credits and Tokens are interchangeable units of one cost (shared/economy.ts:137-141 requires split.tokens + split.credits === cost).",
  "equalValueCheck": true,
  "costSourceFile": "shared/economy.ts:57-80 (RANK_STEP_BASE, RANK_STEP_GROWTH, rankStepCost, rankCost); consumed at worker/upgrades.ts:274",
  "costFormulaOrTable": "rankStepCost(from): if (from < 1 || from >= 50) return 0; band = floor(from/5); return round(25 * 1.8^band). Steps (from->to): 1->2..4->5 = 25 (4 steps); 5->6..9->10 = 45; 10->11..14->15 = 81; 15->16..19->20 = 146; 20->25 = 262; 25->30 = 472; 30->35 = 850; 35->40 = 1531; 40->45 = 2755; 45->50 = 4959. Executed from repo code.",
  "costAtLevels": {"1": null, "10": 45, "20": 146, "30": 472, "40": 1531, "50": 4959},
  "cumulativeCostToMax": 55605,
  "timeCostRule": null,
  "prerequisiteRule": "target must be integer > current level (worker/upgrades.ts:259-263); target <= min(50, maxRankForSeason(CURRENT_SEASON=1)) = 10 (worker/upgrades.ts:266-269; worker/index.ts:1198); target <= Command Center level via rankCeiling(base.levels) (worker/upgrades.ts:270-272; worker/index.ts:1238; shared/buildings.ts:349-351); player must hold the asset (worker/upgrades.ts:261-262). Multi-step jumps are allowed by the API (rankCost(from,to) sums steps) but the client only ever sends level+1 (src/live/AssetUpgrade.tsx:508).",
  "effectDescription": "Multiplies all five base attributes by RANK_GROWTH^(L-1+milestonesReached(L)) with RANK_GROWTH=1.045 and a double step at every 10th rank (shared/assets.ts:1158,1174-1188). Raises the ceiling of all four packages to L (shared/upgrades.ts:164-166). Changes art at ranks 10/20/30/40/50 (shared/assetVisuals.ts:14-28). Permanent; never refunded (worker/upgrades.ts:239-246).",
  "combatRelevant": true,
  "powerClass": "combat",
  "statOrPowerFieldsChanged": ["firepower", "armour", "mobility", "range", "detection", "packageCeiling", "visualStage", "repair time (0.02*level factor)", "march pace (via mobility)"],
  "powerScoreFormula": "assetPowerWith = round(6 * sum over 5 attrs of (attributeAtLevel(base,L) * boost + integration + packagePoints)) (shared/upgrades.ts:121-153). Rank alone: power(L) = round(6 * 30 * 1.045^(L-1+floor(L/10))) for every asset.",
  "cumulativePowerAtMax": 1939,
  "capsAndLimits": "Hard max 50 (ASSET_MAX_LEVEL). Season cap 10 now (CURRENT_SEASON=1 hardcoded in worker/index.ts:1198 and duplicated as SEASON=1 in src/live/AssetUpgrade.tsx:44). Command Center ceiling. No cooldown, no timer, no reset. Wallet claim is atomic via wallet_rev (worker/upgrades.ts:177-190). Weekly test grant tops Tokens up to 100,000 (shared/economy.ts:49-50; worker/upgrades.ts:80-136).",
  "serverGrantPath": "worker/upgrades.ts rankUp() <- worker/index.ts handleRankUp() (line 1218) <- route 'POST /api/assets/rank' (worker/index.ts:2710). Writes player_assets.level, players.tokens/credits/wallet_rev, wallet_ledger kind 'rank'.",
  "clientScreenPath": "src/live/AssetUpgrade.tsx AssetUpgrade -> Track label='Service Rank' (lines 479-509), opened from src/live/Assets.tsx Card 'Upgrade' button (lines 254-269, 475-503). Client quotes rankCost(level, level+1) (AssetUpgrade.tsx:304).",
  "notes": "Cost bands are per FIVE ranks in code; docs/GAME-MATH-v1.md:277-300 specifies 1.8^floor((L-1)/10) (per TEN) with 25 for levels 2-5 and 45 for 6-50, so the doc's table (e.g. 81 for levels 11-20) disagrees with code past level 15. Rank-50 multiplier is x10.772 (milestone double steps), not the x8.6 in shared/assets.ts:1145-1146 comment and docs. Power at any rank is identical for all assets."
}
```

### 1.2 Armament package

```json
{
  "id": "package-armament",
  "displayName": "Armament",
  "category": "package",
  "currentLevelMin": 1,
  "currentLevelMax": 10,
  "levelCount": 10,
  "playerVisible": true,
  "upgradeCurrency": ["credits", "tokens"],
  "tokenCostRule": "packageStepCost(from) = rankStepCost(from) (shared/economy.ts:93-95); Tokens 1:1 with Credits via split.",
  "creditCostRule": "Same function.",
  "equalValueCheck": true,
  "costSourceFile": "shared/economy.ts:93-101 (packageStepCost, packageCost); consumed at worker/upgrades.ts:352 and shared/tradePost.ts:136",
  "costFormulaOrTable": "packageStepCost(from) = round(25 * 1.8^floor(from/5)); identical step table to Service Rank (verified equal at every level 1..50 by executing both).",
  "costAtLevels": {"1": null, "10": 45, "20": 146, "30": 472, "40": 1531, "50": 4959},
  "cumulativeCostToMax": 55605,
  "timeCostRule": null,
  "prerequisiteRule": "target integer > current package level (worker/upgrades.ts:335,342); target <= packageCeiling(asset.level) = max(1,min(level,50)) (worker/upgrades.ts:344-350) and SQL guard '?2 <= level' (line 369) and DB CHECK pkg_armament BETWEEN 1 AND level (migrations/0020_wallet_upgrades.sql:107). Player must hold the asset.",
  "effectDescription": "+0.14 firepower per package rank above 1, additive AFTER rank scaling and boost (PACKAGE_POINTS_PER_RANK, shared/upgrades.ts:90, 121-142). Contributes to System Integration via the lowest package (shared/upgrades.ts:106-111). Refundable: strip returns pkg_credits in Credits (worker/upgrades.ts:409-461).",
  "combatRelevant": true,
  "powerClass": "combat",
  "statOrPowerFieldsChanged": ["firepower", "systemIntegration (indirect)", "HP (via firepower in combat.ts:372)", "repair bill (via F)"],
  "powerScoreFormula": "Each package rank adds 0.14 to one attribute -> +0.84 power (6 x 0.14) before rounding; plus integration when it is the lowest package.",
  "cumulativePowerAtMax": 41,
  "capsAndLimits": "Cap = asset Service Rank (so 10 this season). Reset takes all four back to 1 and refunds the whole pkg_credits (which records Tokens spent too, converted to Credits at 1:1: worker/upgrades.ts:372-383). Also purchasable via Trade Post 'Package Component Selector', weekly shelf, limit 2 (shared/tradePost.ts:49-59), which calls the same packageUp() (worker/tradePost.ts:200).",
  "serverGrantPath": "worker/upgrades.ts packageUp() <- worker/index.ts handlePackageUp() (line 1248) <- 'POST /api/assets/package' (worker/index.ts:2831). Reset: resetPackages() <- handlePackageReset() (1270) <- 'POST /api/assets/reset' (2859). Second path: worker/tradePost.ts:200 -> packageUp().",
  "clientScreenPath": "src/live/AssetUpgrade.tsx PACKAGE_KEYS.map -> Track (lines 511-558); reset button lines 575-587. Also src/live/TradePost.tsx.",
  "notes": "cumulativePowerAtMax is the increase in assetPowerWith from packages alone at rank 50: 49 ranks x 0.14 x 6 = 41.16 (rounded 41) per package; all four maxed + integration(+1.0 x 5 attrs x 6 = 30) = 2134 - 1939 = 195 at rank 50. Migration 0020 comment (line 111-113) says Tokens are NOT refunded on reset; code refunds the whole cost (worker/upgrades.ts:372-383) -- doc/comment vs code disagreement."
}
```

### 1.3 Protection package

```json
{
  "id": "package-protection",
  "displayName": "Protection",
  "category": "package",
  "currentLevelMin": 1,
  "currentLevelMax": 10,
  "levelCount": 10,
  "playerVisible": true,
  "upgradeCurrency": ["credits", "tokens"],
  "tokenCostRule": "packageStepCost(from) = rankStepCost(from); Tokens 1:1.",
  "creditCostRule": "Same.",
  "equalValueCheck": true,
  "costSourceFile": "shared/economy.ts:93-101; worker/upgrades.ts:352",
  "costFormulaOrTable": "round(25 * 1.8^floor(from/5)) per step; same as Service Rank.",
  "costAtLevels": {"1": null, "10": 45, "20": 146, "30": 472, "40": 1531, "50": 4959},
  "cumulativeCostToMax": 55605,
  "timeCostRule": null,
  "prerequisiteRule": "Same as Armament: <= asset Service Rank (worker/upgrades.ts:344-350; DB CHECK migrations/0020:108).",
  "effectDescription": "+0.14 armour per package rank above 1 (PACKAGE_ATTRIBUTE.protection = 'armour', shared/upgrades.ts:58-63).",
  "combatRelevant": true,
  "powerClass": "combat",
  "statOrPowerFieldsChanged": ["armour", "systemIntegration (indirect)", "HP and mitigation (combat.ts:367,372,472)", "repair bill (via A)"],
  "powerScoreFormula": "+0.84 power per rank (6 x 0.14) plus integration when lowest.",
  "cumulativePowerAtMax": 41,
  "capsAndLimits": "Same as Armament.",
  "serverGrantPath": "worker/upgrades.ts packageUp(key='protection') <- 'POST /api/assets/package'.",
  "clientScreenPath": "src/live/AssetUpgrade.tsx lines 511-558.",
  "notes": "Armour in combat is additionally multiplied by drone armour cost and position (combat.ts:367), which packages do not see."
}
```

### 1.4 Propulsion package

```json
{
  "id": "package-propulsion",
  "displayName": "Propulsion",
  "category": "package",
  "currentLevelMin": 1,
  "currentLevelMax": 10,
  "levelCount": 10,
  "playerVisible": true,
  "upgradeCurrency": ["credits", "tokens"],
  "tokenCostRule": "packageStepCost(from) = rankStepCost(from); Tokens 1:1.",
  "creditCostRule": "Same.",
  "equalValueCheck": true,
  "costSourceFile": "shared/economy.ts:93-101; worker/upgrades.ts:352",
  "costFormulaOrTable": "round(25 * 1.8^floor(from/5)) per step; same as Service Rank.",
  "costAtLevels": {"1": null, "10": 45, "20": 146, "30": 472, "40": 1531, "50": 4959},
  "cumulativeCostToMax": 55605,
  "timeCostRule": null,
  "prerequisiteRule": "Same as Armament (DB CHECK migrations/0020:109).",
  "effectDescription": "+0.14 mobility per rank above 1. Mobility sets shot order (combat.ts:604), march pace for non-drones (shared/drones.ts:74-78; worker/march.ts:295-306), and Drone Network contribution for drones (shared/drones.ts:48-50).",
  "combatRelevant": true,
  "powerClass": "combat",
  "statOrPowerFieldsChanged": ["mobility", "march seconds", "drone network multiplier", "systemIntegration (indirect)"],
  "powerScoreFormula": "+0.84 power per rank plus integration when lowest.",
  "cumulativePowerAtMax": 41,
  "capsAndLimits": "Same as Armament. Drone Network is capped at x1.25 (DRONE_NETWORK_CAP, shared/drones.ts:20) and total march multiplier at x1.5 (MARCH_TOTAL_CAP, shared/buildings.ts:386).",
  "serverGrantPath": "worker/upgrades.ts packageUp(key='propulsion') <- 'POST /api/assets/package'.",
  "clientScreenPath": "src/live/AssetUpgrade.tsx lines 511-558 (note line 536-540 adds DRONE_WORDING.propulsion for drones).",
  "notes": ""
}
```

### 1.5 Electronics package

```json
{
  "id": "package-electronics",
  "displayName": "Electronics",
  "category": "package",
  "currentLevelMin": 1,
  "currentLevelMax": 10,
  "levelCount": 10,
  "playerVisible": true,
  "upgradeCurrency": ["credits", "tokens"],
  "tokenCostRule": "packageStepCost(from) = rankStepCost(from); Tokens 1:1.",
  "creditCostRule": "Same.",
  "equalValueCheck": true,
  "costSourceFile": "shared/economy.ts:93-101; worker/upgrades.ts:352",
  "costFormulaOrTable": "round(25 * 1.8^floor(from/5)) per step; same as Service Rank.",
  "costAtLevels": {"1": null, "10": 45, "20": 146, "30": 472, "40": 1531, "50": 4959},
  "cumulativeCostToMax": 55605,
  "timeCostRule": null,
  "prerequisiteRule": "Same as Armament (DB CHECK migrations/0020:110).",
  "effectDescription": "+0.14 detection per rank above 1. Detection feeds spotting (combat.ts:411-424) and the Drone Network (shared/drones.ts:49).",
  "combatRelevant": true,
  "powerClass": "combat",
  "statOrPowerFieldsChanged": ["detection", "spotting", "drone network multiplier", "systemIntegration (indirect)"],
  "powerScoreFormula": "+0.84 power per rank plus integration when lowest.",
  "cumulativePowerAtMax": 41,
  "capsAndLimits": "Same as Armament.",
  "serverGrantPath": "worker/upgrades.ts packageUp(key='electronics') <- 'POST /api/assets/package'.",
  "clientScreenPath": "src/live/AssetUpgrade.tsx lines 511-558.",
  "notes": "Range has deliberately no package (shared/upgrades.ts:48-56)."
}
```

### 1.6 System Integration (derived, not purchased)

```json
{
  "id": "system-integration",
  "displayName": "System Integration",
  "category": "other",
  "currentLevelMin": 0,
  "currentLevelMax": 9,
  "levelCount": 10,
  "playerVisible": true,
  "upgradeCurrency": [],
  "tokenCostRule": "None. Derived from the lowest of the four package ranks (shared/upgrades.ts:106-111).",
  "creditCostRule": "None.",
  "equalValueCheck": true,
  "costSourceFile": "shared/upgrades.ts:103-111 (INTEGRATION_POINTS_PER_RANK=0.1, INTEGRATION_MAX_POINTS=1.0, systemIntegration)",
  "costFormulaOrTable": "systemIntegration(pkg) = lowest <= 1 ? 0 : min(1.0, (lowest - 1) * 0.1). Effective 'level' = lowest package - 1, 0..9 this season (max 0.9 at rank 10; 1.0 cap reached at lowest package 11).",
  "costAtLevels": {"1": null, "10": null, "20": null, "30": null, "40": null, "50": null},
  "cumulativeCostToMax": null,
  "timeCostRule": null,
  "prerequisiteRule": "All four packages >= N+1 to get N x 0.1 (min over PACKAGE_KEYS).",
  "effectDescription": "Flat +integration points added to ALL FIVE attributes (including range) after boost, before packages (shared/upgrades.ts:132-141).",
  "combatRelevant": true,
  "powerClass": "combat",
  "statOrPowerFieldsChanged": ["firepower", "armour", "mobility", "range", "detection"],
  "powerScoreFormula": "+6 x 5 x integration = +30 power at 1.0; +27 at the Season-1 max of 0.9.",
  "cumulativePowerAtMax": 30,
  "capsAndLimits": "Capped at 1.0 points (INTEGRATION_MAX_POINTS). Cost to reach cap = 4 packages to rank 11 = 4 x packageCost(1,11) = 4 x 406 = 1,624 (requires rank 11, not reachable in Season 1).",
  "serverGrantPath": "None (pure function called inside attributesWith at shared/upgrades.ts:132; used by every server power/combat path).",
  "clientScreenPath": "src/live/AssetUpgrade.tsx lines 560-573 (System Integration panel), and the explain.gain copy at 548-551.",
  "notes": "costAtLevels null because nothing is bought directly; cost is the package spend needed to lift the lowest package. GAME-MATH-v1.md:23 writes I = min(1, 0.1 x min(p)) (no '-1'), code uses (lowest-1) x 0.1 -- doc vs code mismatch of one rank."
}
```

### 1.7 Asset construction (blueprint build) — acquisition, resources only

```json
{
  "id": "asset-build",
  "displayName": "Build asset (weekly blueprint)",
  "category": "other",
  "currentLevelMin": 0,
  "currentLevelMax": 1,
  "levelCount": 1,
  "playerVisible": true,
  "upgradeCurrency": ["fuel", "steel", "munitions", "alloy"],
  "tokenCostRule": "None directly (Tokens/Credits only buy resources at the Depot; outside this scope).",
  "creditCostRule": "None directly.",
  "equalValueCheck": true,
  "costSourceFile": "shared/construction.ts:18-24 (BUILD_BY_CATEGORY); worker/season1.ts:168-218 (startBuild)",
  "costFormulaOrTable": "Flat per category: armour {800,2400,900,500} 6h; artillery {700,600,2400,900} 5.5h; fixed_wing {2200,700,900,1200} 7h; rotary {1600,650,700,1800} 6.5h; drone {900,450,700,2400} 5h (fuel,steel,munitions,alloy).",
  "costAtLevels": {"1": null, "10": null, "20": null, "30": null, "40": null, "50": null},
  "cumulativeCostToMax": null,
  "timeCostRule": "5-7 hours by category (shared/construction.ts:18-24); absolute timer, cannot be bought down; one build at a time per player (migrations/0025:12-13; worker/season1.ts:180-182).",
  "prerequisiteRule": "Asset unlocked by max(seasonWeek, commandCenter) >= UNLOCK_WEEK (shared/season.ts:31-58); category hub building level >= unlock week (shared/construction.ts:43-45, 55-63); not already owned; naval unbuildable.",
  "effectDescription": "Grants the asset at Service Rank 1, packages 1, hp 1.",
  "combatRelevant": true,
  "powerClass": "combat",
  "statOrPowerFieldsChanged": ["owned roster (adds +180 to player power at rank 1, boost 1)"],
  "powerScoreFormula": "assetPowerWith(asset, 1, NO_PACKAGES, boost) = round(180 x boost)",
  "cumulativePowerAtMax": 180,
  "capsAndLimits": "Six starters granted free on first roster read (worker/squads.ts:95-127; shared/season.ts:31); 54 more buildable over weeks 2-10; naval never this season.",
  "serverGrantPath": "worker/season1.ts startBuild() <- 'POST /api/assets/build' (worker/index.ts:2716); completion folded into player_assets on read (worker/season1.ts readSeasonState).",
  "clientScreenPath": "src/live/Assets.tsx unlockLabel() (85-118) and Card 'Build asset' button (164-174).",
  "notes": "Included because it is the only way roster power grows other than rank/packages. Not a Credits/Tokens purchase."
}
```

### 1.8 Repair (consumable sink, resources only)

```json
{
  "id": "asset-repair",
  "displayName": "Repair",
  "category": "other",
  "currentLevelMin": 0,
  "currentLevelMax": 0,
  "levelCount": 0,
  "playerVisible": true,
  "upgradeCurrency": ["fuel", "steel", "munitions"],
  "tokenCostRule": "None. No Credit or Token spend exists anywhere in the repair path.",
  "creditCostRule": "None.",
  "equalValueCheck": true,
  "costSourceFile": "shared/repair.ts:23-42 (repairBill); worker/repair.ts:51-128 (startRepair)",
  "costFormulaOrTable": "q = clamp(1 - hpFraction, 0, 1); F, A = resolved firepower/armour from attributesWith(asset, level, packages, boost). fuel = ceil(20q(0.7F + 1.3A)); steel = ceil(16q(0.5F + 1.5A)); munitions = ceil(8qF); alloy = 0; ms = ceil(900q(1 + 0.02 x level)) x 1000. 'all' sums bills across every damaged, not-away, not-repairing asset into ONE debit (worker/repair.ts:94-104, 108-115).",
  "costAtLevels": {"1": null, "10": null, "20": null, "30": null, "40": null, "50": null},
  "cumulativeCostToMax": null,
  "timeCostRule": "ceil(900 x q x (1 + 0.02 x level)) seconds; e.g. fully disabled (q=1): 15.3 min at rank 1, 18 min at 10, 21 at 20, 24 at 30, 27 at 40, 30 at 50 (computed). Absolute repair_ends_at; settled on read (worker/repair.ts:12-20); cannot be bought down.",
  "prerequisiteRule": "hp_fraction < 1 and repair_ends_at IS NULL; asset's Task Force not away (worker/repair.ts:63-89). Debit is conditional on stock_rev (worker/repair.ts:108-115).",
  "effectDescription": "Restores hp_fraction to 1 when the timer passes. Damaged assets fight with hp x fraction (combat.ts:373-378) and march at max(0.5, hp) pace (shared/repair.ts:44-47); disabled (hp <= 0.0005) or repairing assets block a launch (worker/march.ts:268-272); repairing assets do not defend (worker/march.ts:192-195).",
  "combatRelevant": true,
  "powerClass": "consumable",
  "statOrPowerFieldsChanged": ["hp_fraction", "repair_ends_at"],
  "powerScoreFormula": null,
  "cumulativePowerAtMax": null,
  "capsAndLimits": "Worked examples (m1a2, boost 1, NO packages, computed): rank 1 fully disabled = 386 Fuel / 312 Steel / 72 Munitions; rank 10 = 600/485/112; rank 20 = 973/787/182; rank 30 = 1579/1277/295; rank 40 = 2563/2071/478; rank 50 = 4158/3361/776. rq4 rank 1 disabled = 160/128/32. Power figures (profile, squads, alliance) IGNORE hp/repair state -- worker/power.ts:38-59 does not read hp_fraction.",
  "serverGrantPath": "worker/repair.ts startRepair() <- 'POST /api/assets/repair' (worker/index.ts:2724-2737); damage written by applyDamage() from worker/march.ts:738-749 after resolve().",
  "clientScreenPath": "src/live/Assets.tsx Card repair panel (224-252, uses repairBill client-side for the quote); src/live/Squads.tsx 'Repair damaged assets' (534-545) -> api.repair('all').",
  "notes": "GAME-MATH-v1.md:231 multiplies time by a SustainmentTimeMultiplier (Combat Systems) that does not exist in code. Doc uses 'effectiveRank'; code uses stored level."
}
```

---

## 2. Asset catalogue (extracted by executing `shared/assets.ts`)

Counts: armour 12, rotary 12, fixed_wing 12, artillery 12, drone 12, naval 12 (naval `draftable: false`). `auditAssets()` = `[]` (no budget, range, duplicate or dominance problems). Every row spends exactly 30 points (`BUDGET_MIN/MAX` 29-31 at `shared/assets.ts:1063-1064`). `lift` still exists on rows but no longer caps squads (`worker/squads.ts:8-27`); it affects nothing in the live game.

| id | code (display, `assetLabel`) | name | category | role | operator | lift | F | A | M | R | D | pts | draftable |
|---|---|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| m1a2 | M1A2 SEPv3 | Abrams | armour | breach | USA | 5 | 9 | 10 | 3 | 3 | 5 | 30 | yes |
| leopard2a7 | Leopard 2A7+ | Leopard | armour | breach | Germany | 5 | 9 | 8 | 5 | 5 | 3 | 30 | yes |
| challenger3 | Challenger 3 | Challenger | armour | breach | UK | 5 | 6 | 10 | 3 | 6 | 5 | 30 | yes |
| leclerc | Leclerc XLR | Leclerc | armour | screen | France | 4 | 6 | 6 | 7 | 3 | 8 | 30 | yes |
| k2 | K2 Black Panther | Black Panther | armour | breach | South Korea | 5 | 8 | 9 | 3 | 7 | 3 | 30 | yes |
| type10 | Type 10 | Type 10 | armour | screen | Japan | 4 | 3 | 6 | 10 | 4 | 7 | 30 | yes |
| merkava | Merkava Mk.4 Barak | Merkava | armour | breach | Israel | 5 | 6 | 10 | 6 | 4 | 4 | 30 | yes |
| t90m | T-90M Proryv | Proryv | armour | breach | Russia | 4 | 6 | 10 | 6 | 6 | 2 | 30 | yes |
| altay | Altay | Altay | armour | breach | Turkey | 4 | 8 | 8 | 7 | 3 | 4 | 30 | yes |
| strv122 | Stridsvagn 122 | Stridsvagn | armour | breach | Sweden | 5 | 9 | 8 | 3 | 5 | 5 | 30 | yes |
| ariete | Ariete AMV | Ariete | armour | screen | Italy | 4 | 3 | 5 | 8 | 6 | 8 | 30 | yes |
| pt91 | PT-91 Twardy | Twardy | armour | screen | Poland | 3 | 5 | 7 | 6 | 6 | 6 | 30 | yes |
| ah64e | AH-64E | Apache | rotary | strike | USA | 3 | 9 | 3 | 9 | 4 | 5 | 30 | yes |
| ah1z | AH-1Z | Viper | rotary | strike | USA | 3 | 9 | 5 | 6 | 4 | 6 | 30 | yes |
| ka52m | Ka-52M | Alligator | rotary | strike | Russia | 3 | 9 | 5 | 6 | 6 | 4 | 30 | yes |
| mi28nm | Mi-28NM | Havoc | rotary | strike | Russia | 3 | 9 | 5 | 9 | 4 | 3 | 30 | yes |
| mi35m | Mi-35M | Hind | rotary | lift | Russia | 3 | 3 | 8 | 8 | 6 | 5 | 30 | yes |
| tiger | Tiger HAD | Tiger | rotary | screen | France / Germany | 3 | 5 | 5 | 9 | 3 | 8 | 30 | yes |
| t129 | T129 ATAK | ATAK | rotary | screen | Turkey | 2 | 4 | 3 | 10 | 6 | 7 | 30 | yes |
| z10me | Z-10ME | Z-10 | rotary | strike | China | 3 | 8 | 3 | 6 | 7 | 6 | 30 | yes |
| rooivalk | Rooivalk Mk1 | Rooivalk | rotary | strike | South Africa | 3 | 7 | 5 | 9 | 4 | 5 | 30 | yes |
| uh60m | UH-60M | Black Hawk | rotary | lift | USA | 3 | 3 | 7 | 8 | 4 | 8 | 30 | yes |
| ch47f | CH-47F | Chinook | rotary | lift | USA | 4 | 3 | 5 | 9 | 6 | 7 | 30 | yes |
| aw101 | AW101 | Merlin | rotary | lift | UK / Italy | 4 | 5 | 5 | 8 | 4 | 8 | 30 | yes |
| f35a | F-35A | Lightning II | fixed_wing | strike | USA | 5 | 9 | 5 | 6 | 7 | 3 | 30 | yes |
| f22 | F-22 | Raptor | fixed_wing | screen | USA | 5 | 5 | 5 | 9 | 5 | 6 | 30 | yes |
| f15ex | F-15EX | Eagle II | fixed_wing | strike | USA | 5 | 9 | 3 | 7 | 5 | 6 | 30 | yes |
| a10c | A-10C | Thunderbolt II | fixed_wing | strike | USA | 4 | 8 | 3 | 8 | 8 | 3 | 30 | yes |
| fa18e | F/A-18E | Super Hornet | fixed_wing | strike | USA | 4 | 10 | 5 | 5 | 5 | 5 | 30 | yes |
| ac130j | AC-130J | Ghostrider | fixed_wing | overwatch | USA | 5 | 10 | 3 | 3 | 10 | 4 | 30 | yes |
| typhoon | Eurofighter Typhoon | Typhoon | fixed_wing | screen | Multi-national | 4 | 7 | 4 | 8 | 3 | 8 | 30 | yes |
| rafale | Rafale F4 | Rafale | fixed_wing | strike | France | 4 | 8 | 5 | 8 | 5 | 4 | 30 | yes |
| gripen | JAS 39E | Gripen | fixed_wing | screen | Sweden | 3 | 5 | 6 | 8 | 3 | 8 | 30 | yes |
| su57 | Su-57 | Felon | fixed_wing | screen | Russia | 5 | 4 | 4 | 10 | 3 | 9 | 30 | yes |
| su34 | Su-34 | Fullback | fixed_wing | strike | Russia | 4 | 8 | 3 | 5 | 8 | 6 | 30 | yes |
| kf21 | KF-21 | Boramae | fixed_wing | screen | South Korea | 4 | 5 | 3 | 8 | 6 | 8 | 30 | yes |
| himars | M142 | HIMARS | artillery | overwatch | USA | 3 | 6 | 4 | 5 | 9 | 6 | 30 | yes |
| m270a2 | M270A2 | MLRS | artillery | overwatch | USA | 4 | 9 | 4 | 3 | 8 | 6 | 30 | yes |
| puls | PULS | PULS | artillery | overwatch | Israel | 3 | 6 | 6 | 2 | 10 | 6 | 30 | yes |
| k239 | K239 | Chunmoo | artillery | overwatch | South Korea | 3 | 6 | 6 | 5 | 10 | 3 | 30 | yes |
| smerch | BM-30 | Smerch | artillery | overwatch | Russia | 4 | 8 | 6 | 5 | 8 | 3 | 30 | yes |
| tos1a | TOS-1A | Solntsepyok | artillery | breach | Russia | 4 | 9 | 9 | 5 | 3 | 4 | 30 | yes |
| phl191 | PHL-191 | PHL-191 | artillery | overwatch | China | 4 | 8 | 1 | 5 | 9 | 7 | 30 | yes |
| astros | Astros II MK6 | Astros | artillery | overwatch | Brazil | 3 | 6 | 6 | 4 | 7 | 7 | 30 | yes |
| rm70 | RM-70 Vampire | Vampire | artillery | overwatch | Czechia | 3 | 10 | 1 | 4 | 10 | 5 | 30 | yes |
| pzh2000 | PzH 2000 | PzH 2000 | artillery | overwatch | Germany | 4 | 8 | 4 | 5 | 10 | 3 | 30 | yes |
| archer | Archer FH77 BW | Archer | artillery | overwatch | Sweden | 3 | 10 | 6 | 3 | 7 | 4 | 30 | yes |
| k9 | K9 Thunder | K9 | artillery | overwatch | South Korea | 4 | 10 | 3 | 5 | 8 | 4 | 30 | yes |
| mq9a | MQ-9A | Reaper | drone | strike | USA | 3 | 7 | 1 | 5 | 9 | 8 | 30 | yes |
| mq1c | MQ-1C | Gray Eagle | drone | recon | USA | 2 | 5 | 3 | 8 | 7 | 7 | 30 | yes |
| rq4 | RQ-4 | Global Hawk | drone | recon | USA | 3 | 4 | 4 | 5 | 9 | 8 | 30 | yes |
| switchblade | Switchblade 600 | Switchblade | drone | strike | USA | 1 | 5 | 5 | 4 | 9 | 7 | 30 | yes |
| tb2 | Bayraktar TB2 | TB2 | drone | strike | Turkey | 2 | 6 | 5 | 6 | 8 | 5 | 30 | yes |
| akinci | Bayraktar Akinci | Akinci | drone | strike | Turkey | 3 | 8 | 5 | 5 | 6 | 6 | 30 | yes |
| herontp | Heron TP | Heron | drone | recon | Israel | 3 | 3 | 5 | 8 | 6 | 8 | 30 | yes |
| harop | Harop | Harop | drone | strike | Israel | 1 | 6 | 2 | 8 | 6 | 8 | 30 | yes |
| orbiter4 | Orbiter 4 | Orbiter | drone | recon | Israel | 1 | 4 | 1 | 7 | 9 | 9 | 30 | yes |
| lancet3 | Lancet-3 | Lancet | drone | strike | Russia | 1 | 5 | 5 | 5 | 5 | 10 | 30 | yes |
| wingloong2 | Wing Loong II | Wing Loong | drone | recon | China | 2 | 4 | 4 | 5 | 7 | 10 | 30 | yes |
| ch5 | CH-5 | Rainbow | drone | recon | China | 3 | 4 | 1 | 9 | 9 | 7 | 30 | yes |
| burke | DDG Flight III | Arleigh Burke | naval | overwatch | USA | 6 | 8 | 6 | 2 | 8 | 6 | 30 | no |
| zumwalt | DDG-1000 | Zumwalt | naval | overwatch | USA | 6 | 8 | 5 | 3 | 10 | 4 | 30 | no |
| virginia | SSN Virginia | Virginia | naval | strike | USA | 6 | 8 | 6 | 7 | 6 | 3 | 30 | no |
| wasp | LHD Wasp | Wasp | naval | lift | USA | 6 | 4 | 8 | 7 | 5 | 6 | 30 | no |
| type45 | Type 45 | Daring | naval | screen | UK | 5 | 4 | 8 | 8 | 4 | 6 | 30 | no |
| type26 | Type 26 | City | naval | recon | UK | 5 | 3 | 4 | 6 | 8 | 9 | 30 | no |
| fremm | FREMM | FREMM | naval | overwatch | France / Italy | 5 | 10 | 4 | 5 | 8 | 3 | 30 | no |
| sejong | KDX-III | Sejong the Great | naval | overwatch | South Korea | 6 | 10 | 4 | 2 | 8 | 6 | 30 | no |
| gorshkov | Project 22350 | Gorshkov | naval | strike | Russia | 5 | 10 | 3 | 5 | 8 | 4 | 30 | no |
| type055 | Type 055 | Renhai | naval | overwatch | China | 6 | 10 | 6 | 2 | 8 | 4 | 30 | no |
| visby | Visby | Visby | naval | screen | Sweden | 4 | 4 | 5 | 10 | 3 | 8 | 30 | no |
| ada | Ada | Ada | naval | screen | Turkey | 4 | 6 | 5 | 7 | 5 | 7 | 30 | no |

Starters (`shared/season.ts:31`): m1a2, leclerc, f35a, rq4, m270a2, mi35m — placed in Alpha slots 0-5 on first roster read (`worker/squads.ts:103-123`). Unlock weeks per asset: `shared/season.ts:34-45` (matches `docs/SEASON-1-ASSET-SCHEDULE-v2.md`).

---

## 3. Cost tables executed from repo code

### 3.1 Rank / package step cost (identical functions)

`rankStepCost(from)` for every step 1→2 … 49→50:

| from → to | cost | band |
|---|---:|---|
| 1→2, 2→3, 3→4, 4→5 | 25 | floor(from/5)=0 (4 steps) |
| 5→6 … 9→10 | 45 | band 1 |
| 10→11 … 14→15 | 81 | band 2 |
| 15→16 … 19→20 | 146 | band 3 |
| 20→21 … 24→25 | 262 | band 4 |
| 25→26 … 29→30 | 472 | band 5 |
| 30→31 … 34→35 | 850 | band 6 |
| 35→36 … 39→40 | 1531 | band 7 |
| 40→41 … 44→45 | 2755 | band 8 |
| 45→46 … 49→50 | 4959 | band 9 |

Cost of the step INTO level N (`rankStepCost(N-1)`): N=1 n/a; N=10 **45**; N=20 **146**; N=30 **472**; N=40 **1531**; N=50 **4959**.
Cumulative `rankCost(1,N)`: N=10 **325**; N=20 **1,460**; N=30 **5,130**; N=40 **17,035**; N=50 **55,605**.
`packageStepCost(L) === rankStepCost(L)` verified true for L = 1..50.

Per asset fully fitted (`fullAssetCost`): cap 10 = 1,625; cap 50 = 278,025. Full 24-asset draft (`fullDraftCost`): cap 10 = 39,000; cap 50 = 6,672,600. (Note: the live roster is 60 assets, not 24; `fullDraftCost` still defaults `draftSize = 24` at `shared/economy.ts:113`.)

### 3.2 Attribute multiplier by rank (`attributeAtLevel(1, L)`)

| L | exponent (L-1+milestones) | multiplier |
|---:|---:|---:|
| 1 | 0 | 1.000 |
| 10 | 10 | 1.553 |
| 20 | 21 | 2.520 |
| 30 | 32 | 4.090 |
| 40 | 43 | 6.637 |
| 50 | 54 | 10.772 |

`SEASON_GAIN` constant (`shared/assets.ts:1160`) is `1.045^10 = 1.553`, which happens to equal the rank-10 multiplier only because rank 10 is one milestone.

### 3.3 Power per representative asset (`assetPowerWith`, boost = 1)

Because every asset sums to 30 points and rank/packages/integration act identically on totals, **the numbers are the same for every asset**. Verified for m1a2 (armour), mi35m (rotary), f35a (fixed_wing), m270a2 (artillery), rq4 (drone), burke (naval):

| Rank | no packages | packages maxed at that rank (all four = rank) | integration |
|---:|---:|---:|---:|
| 1 | 180 | 180 | 0 |
| 10 | 280 | 337 | 0.9 |
| 20 | 454 | 547 | 1.0 |
| 30 | 736 | 864 | 1.0 |
| 40 | 1195 | 1356 | 1.0 |
| 50 | 1939 | 2134 | 1.0 |

Attribute example, m1a2 rank 10 maxed: F 16.137, A 17.69, M 6.819, R 5.559, D 9.925 (R gets only integration).

Building boost (out of scope for cost, in scope for power): m1a2 with a level-10 hub (`1.02^9`) = 215 / 334 / 542 / 880 / 1428 / 2317 at ranks 1/10/20/30/40/50 no packages; a level-50 hub (`1.02^49`) gives 475 at rank 1 and 5116 at rank 50.

Starter Task Force (6 assets) power: rank 1 = 1,080; rank 50 fully packaged = 12,804. Whole 60-asset roster at rank 1, boost 1 = 10,800 (profile figure).

### 3.4 March speed (`marchSeconds`, `shared/march.ts:17-37`)

`raw = plots × 1.75 / (max(1, mobility)/5)`, clamped to [12, 600] s. Computed: mobility 3 → 10 plots 29 s, 50 plots 146 s; mobility 5 → 18 s / 88 s; mobility 10 → 12 s / 44 s. Pace mobility = slowest non-drone `attributesWith(...).mobility × marchHpFactor(hp)` (`worker/march.ts:295-299`; `shared/drones.ts:74-78`), multiplied by `marchMultiplier(droneNetwork, TOC level)` capped at 1.5 (`shared/buildings.ts:386-396`). Drone Network: one rq4 at rank 1 = ×1.0459; six = ×1.1262; cap ×1.25 (`shared/drones.ts:20, 57-68`). Armour cost: ×0.93 per drone, six = ×0.58 (`shared/drones.ts:17, 43-45`). Return leg takes as long as the way out (`worker/march.ts:444, 798`). Attack costs Fuel `100 + 20 × units` (`shared/march.ts:115-120`; debited `worker/march.ts:311-328`); reinforce is free.

### 3.5 Battle resolver (`shared/combat.ts`)

Inputs: `attributesWith(asset, level, packages, boost)` per unit (line 363); armour × position (+8% front) × drone armour multiplier (367); detection × position (+10% rear) (368). HP = `8 × (3 + 0.3F + 0.4A) × droneHp` (45-48, 372) — **HP_PER_ARMOUR is 0.4 in code**, while `docs/GAME-MATH-v1.md:664` says the post-simulation value is 0.25 and the comment at `combat.ts:37-43` says the spec's 1.2 was "kept" — three different statements, code = 0.4. Damage per shot = `2.0 × scale × droneAttack × F × rangeMult × spotting × positionAttack × roleAttack × counter × exposure × mitigation(100/(100+4A)) × tactical((1±0.4)×(5%: 1.2)) × modifier(side swing ±0.28 × defender home-ground 1+min(0.25, 0.015×(CC-1)) from worker/march.ts:652-658) × screened` (485-499). Five rounds, mobility order, ties by seeded roll (584-635); opening front-drone wave (545-582). Outcome by remaining HP share, draw within 0.02 (637-647). Power is computed inside `resolve()` only for the report's `composition` figure (521-529, 677-680); **power is not an input to who wins.**

---

## 4. `notBuiltYet` (referenced, no live grant/result)

| System | Where referenced | Status in code |
|---|---|---|
| Combat Systems (Fire-Control / Survivability / Sustainment lanes, cost `ceil(200×1.17^(L-1))`) | `docs/GAME-MATH-v1.md:98-110, 302, 467-475`; UI copy `src/i18n/en/base.ts:17` ("Combat Systems ... will be run from here") | No table, no route, no resolver stage. `repairBill` has no Sustainment multiplier. |
| Package modules / materials (Munitions Kits, Armour Plates, Drive Assemblies, Signal Components; "ceil((L-1)/3) modules") | `docs/GAME-MATH-v1.md:108, 281-300, 546`; table `player_materials` in `migrations/0020_wallet_upgrades.sql:126-138` | Table exists; nothing reads or writes it. Packages cost currency only. Depot "Modules" tab shows Coming Soon (`src/live/BaseSheets.tsx:212`). |
| Specialty Adders / Modifiers (Breach Charges etc.), Task Force specialty slots | `docs/GAME-MATH-v1.md:112-139, 561-603` | Nothing. |
| Cosmetic stat modifiers (base skin +5% F/A, nameplate, effects) | `docs/GAME-MATH-v1.md:168-189, 549-560` | Cosmetics grant nothing (`docs/progression/01-IMPLEMENTATION-PLAN.md:24`); not in `attributesWith`. |
| Season Readiness Band / effective rank clamp | `shared/assets.ts:1147-1148` comment; `docs/GAME-MATH-v1.md:35, 416`; `docs/progression/06,07,08` | Only farm bots honour a band (`worker/bots.ts:131-155`); player ranks are never clamped in combat. |
| Alliance Operations multiplier, ambush, reinforcement round-3 entry, event modifiers | `docs/GAME-MATH-v1.md:162-166, 237, 352-366` | Not in `shared/combat.ts`. |
| Display-only Combat Power (weighted `10×(1.35F+1.35A+0.90M+0.75R+1.10D)`), CPTF formation bonus, DevelopmentScore | `docs/GAME-MATH-v1.md:239-253` | Code uses `6 × sum` (`shared/upgrades.ts:152`). No CPTF multiplier; no DevelopmentScore. |
| Lift role march bonus (+3% each, cap 6%), Bulk Fuel Point march %, Signals detection % | `docs/GAME-MATH-v1.md:94-96, 149-153` | Not implemented (march uses Drone Network × TOC only). |
| Naval assets, Fleet Doctrines | `shared/assets.ts:858-1001` (12 rows, `draftable: false`); `docs/progression/09-SEASON-3-NAVAL.md` | Rows exist, cannot be built, drafted, ranked. |
| Blueprint Chapters / Legacy Specialty Item / Drone Protocols / Base Departments ranks | `docs/progression/08-TEN-SEASON-PROGRESSION.md:79-81, 147` | Nothing. |
| Asset visuals beyond stage art | `shared/assetVisuals.ts:36-50` lists art for 13 of 72 assets (merkava, phl191 only to stage 20); the rest draw silhouettes | Art gap, not a system. |
| Trade Post monthly shelf | `shared/tradePost.ts:47-48` "intentionally empty" | Empty. |
| "Dossier" | `src/i18n/en/profile.ts:9` (eyebrow label on a profile) | Label only. |

---

## 5. `powerDiscrepancies` — every place power is computed

All live paths call **one function**: `assetPowerWith(asset, level, packages, boost)` = `round(6 × Σ attributesWith)` (`shared/upgrades.ts:145-153`). They agree on the formula; they differ on inputs and lifetime.

| # | Where | Formula / inputs | Agrees? |
|---|---|---|---|
| 1 | Client asset sheet — `src/live/AssetUpgrade.tsx:243` | `assetPowerWith(asset, held.level, held.packages, boost)` with `boost = categoryBoost(base.levels, category)` from `/api/squads` (`Assets.tsx:491`) | Yes (same function, same inputs as server). |
| 2 | Squad header (server) — `worker/squads.ts:267-280 squadPower()` via `handleSquads` `worker/index.ts:1151-1153` | Σ over the 6 slots of `assetPowerWith(asset, level ?? 1, packages, categoryBoost(base.levels, category))` | Yes. |
| 3 | Squads screen / World map — `src/live/Squads.tsx:504`, `src/live/WorldMap.tsx:1777` | Displays `view.power[name]` from #2; no client computation | Yes (pass-through). |
| 4 | Player power (profile) — `worker/power.ts:16-66 powerOf()` used by `worker/profile.ts:103` → `/api/profile`; shown in `src/live/Profile.tsx:342`, `LiveApp.tsx:123` | Σ over ALL `player_assets` rows of `assetPowerWith(..., categoryBoost(levels from base_levels))`; `Math.round` of an integer sum | Same formula. Differs in scope: counts unassigned assets and ignores hp/repair state (doc §6 says exclude assets under repair). |
| 5 | Alliance member list — `worker/alliance.ts:113-124` and alliance browse leaderboard — `worker/index.ts:1732-1756` | Σ `powerOf()` per member / per alliance | Same as #4. |
| 6 | Battle report stored power — `worker/march.ts:664-668, 690-691` | Σ `assetPowerWith(asset, u.level, u.packages ?? BARE, u.boost ?? 1)` over attacker units **frozen at launch** (`worker/march.ts:345`) and defender units read live at arrival (plus garrisons from their stored JSON). Written once to `battles.attacker_power/defender_power` (`migrations/0013:49`), never recomputed. | Same formula; different lifetime (stored snapshot vs computed on read) and different scope (6 units vs whole roster). Attacker boost is the hub level at launch, not at resolution. |
| 7 | Resolver-internal — `shared/combat.ts:521-529` | Identical Σ, used only for `composition` (677-680); returned `SideResult.power` is not persisted (march.ts recomputes it separately at 664-668 — duplicate computation, same result). | Yes. |
| 8 | Legacy `assetPower(asset, level)` — `shared/assets.ts:1191-1200` | `round(6 × Σ attributeAtLevel)` — no packages, no boost, no integration | Only used by `scripts/simulate.mjs:71,141`. Equals `assetPowerWith` when packages = 1 and boost = 1 (verified: 180/280/454/736/1195/1939). Dead for the live game. |
| 9 | Design doc — `docs/GAME-MATH-v1.md:243-251` | `CPasset = round(10×(1.35F+1.35A+0.90M+0.75R+1.10D))`, `CPTF` with formation/band multiplier, `CPplayer` excludes repairing assets | **Disagrees with code** on weights, scale and scope. Not implemented. |
| 10 | Bots — `worker/bots.ts:204` | Bots get ranks via direct `UPDATE player_assets SET level = MAX(level, ?)`; power then flows through #4/#6 normally | Same formula; bots pay nothing. |
| 11 | `CLAUDE.md` Architecture note | "Power is computed from building levels on every read and never stored" | Stale on both counts: power is from assets (`worker/power.ts:2-4`), and battle power IS stored. |

Property worth flagging: because all 72 assets have the same 30-point total, **power at a given rank/package/boost state is identical for every asset**; power discriminates only rank, package ranks, integration and hub level — never composition.

---

## 6. `hardcodedPrices` — literal prices outside `shared/economy.ts` (seen in this scope)

| Literal | File:line | Used by | 1:1? |
|---|---|---|---|
| `DELTA_PRICE = 2500` (Task Force Delta purchase) | `shared/season.ts:79` | `worker/season1.ts:344-345` (`buyDelta`, `POST /api/squads/delta`), `src/live/Squads.tsx:446, 452, 475` | Yes (uses `splitIsValid`), but it is a price living outside economy.ts. |
| Shield prices 0/0/250/600/1500 | `shared/shields.ts:16-21` | `worker/season1.ts applyShield`, `src/live/ShieldPanel.tsx` | Yes via split; outside economy.ts (shield scope). |
| `SECOND_TEAM.currency = 1500` + resources | `shared/buildings.ts:297-302` | building scope | Outside economy.ts. |
| Depot `RESOURCE_PER_UNIT` (100/80/70/60 per Token-or-Credit) and daily caps | `shared/buildings.ts:183-196` | building scope | Outside economy.ts. |
| `ATTACK_FUEL_BASE = 100`, `ATTACK_FUEL_PER_UNIT = 20` (Fuel, not currency) | `shared/march.ts:115-120` | `worker/march.ts:312` | n/a (resource). |
| Repair factors 20/16/8/900/0.02 | `shared/repair.ts:35-39` | `worker/repair.ts:99` | n/a (resource); literals rather than named constants, contrary to `docs/GAME-MATH-v1.md:3`. |
| Asset build costs per category | `shared/construction.ts:18-24` | `worker/season1.ts:196` | n/a (resource). |
| `TEST_TOKEN_FLOOR = 100_000` weekly Token top-up | `shared/economy.ts:50` (inside economy.ts but note: also `migrations/0024_season_1_reset.sql:47` sets `tokens = 100000` as a literal) | `worker/upgrades.ts:95-135` | Duplicated literal. |
| `SEASON = 1` | `src/live/AssetUpgrade.tsx:44` duplicates `CURRENT_SEASON = 1` at `worker/index.ts:1198` | rank cap display | Duplicated rule (cap, not a price). |

Duplicated price rules: none for rank/packages — client (`AssetUpgrade.tsx:304, 516`), worker (`upgrades.ts:274, 352`) and Trade Post (`shared/tradePost.ts:136`) all call the economy.ts functions. The Trade Post advertises the package at `{tokens: cost, credits: cost}` and lets the buyer pick a single route (`shared/tradePost.ts:160-162`), which is 1:1.

Not 1:1 anywhere in scope. One subtle exchange: stripping packages refunds Token-paid spend as Credits at 1:1 (`worker/upgrades.ts:372-383, 425-434`) — a Token→Credit conversion path, as the comment itself notes.

---

## 7. `missingInformation` — cannot be derived from code

- **Rank cost and effects above 10 are dormant**: `maxRankForSeason(1) = 10`. Costs to 50 are computed from the formula but no player can buy past 10 until `CURRENT_SEASON` (`worker/index.ts:1198`) and `SEASON = 1` (`src/live/AssetUpgrade.tsx:44`) change. Which season constant governs later seasons (`shared/season.ts` has only `SEASON_1_START`) is not defined.
- **Command Credit income**: nothing in this scope grants Credits (only the weekly Token top-up and package-strip refunds touch the wallet). Whether any earned route exists is outside this scope; time-to-max cannot be derived.
- **Player-facing display of Season Integration cap**: reaching 1.0 requires package rank 11 — impossible this season; whether that is intended is a design question.
- **Milestone double step vs stated ×8.6**: code gives ×10.772 at rank 50; which one is the intended balance is not decidable from code.
- **Repair "effectiveRank" and Sustainment**: doc formula references systems that do not exist; code uses stored level.
- **`fullDraftCost` assumes 24 assets** (`shared/economy.ts:113`) but the roster is 60 owned assets; the "season sink" comment (`economy.ts:18-29`, 7,800 Credits) is therefore stale — true sink for 60 assets to rank 10 fully fitted = 60 × 1,625 = 97,500.
- **HP_PER_ARMOUR**: three values in play (code 0.4, doc footer 0.25, spec 1.2); only the code value is authoritative.
- **Battle power for pre-package marches**: `garrisonUnits` may parse rows with no `packages`/`boost` (`worker/march.ts:229-233`); they resolve as bare, so stored power for such rows differs from the owner's current roster. Cannot know if any such rows remain after the Season 1 reset (`migrations/0024:15` deleted marches).

---

## 8. `filesToChangeLater` — for a level 1-50 economy

| File | Function / constant | What it pins today |
|---|---|---|
| `shared/economy.ts` | `RANK_STEP_BASE`, `RANK_STEP_GROWTH`, `rankStepCost`, `rankCost`, `packageStepCost`, `packageCost`, `fullAssetCost`, `fullDraftCost` (draftSize 24), `SEASON_1_CAP` | The one cost curve (bands of 5); doc says bands of 10. |
| `shared/assets.ts` | `ASSET_MAX_LEVEL`, `RANKS_PER_SEASON`, `maxRankForSeason`, `RANK_GROWTH`, `MILESTONE_EVERY`, `milestonesReached`, `rankStepGain`, `attributeAtLevel`, `assetPower` (legacy), `SEASON_GAIN` | Rank cap, growth curve, milestone double step. |
| `shared/upgrades.ts` | `PACKAGE_POINTS_PER_RANK`, `INTEGRATION_POINTS_PER_RANK`, `INTEGRATION_MAX_POINTS`, `systemIntegration`, `attributesWith`, `assetPowerWith`, `packageCeiling` | Package/integration value and the power formula. |
| `worker/index.ts` | `CURRENT_SEASON` (1198); `handleRankUp` passes `rankCeiling(base.levels)` (1238) | Season cap applied server-side. |
| `src/live/AssetUpgrade.tsx` | `SEASON = 1` (44); `seasonCap`/`cap`/`ceiling` (239-254) | Duplicated client cap. |
| `worker/upgrades.ts` | `rankUp` (cap logic 266-272), `packageUp` (ceiling 344-350, refund accounting 372-383), `resetPackages` | Grant paths. |
| `migrations/0020_wallet_upgrades.sql` | CHECK constraints `pkg_* BETWEEN 1 AND level` | Package ≤ rank enforced in DB; any decoupling needs a rebuild migration. |
| `shared/buildings.ts` | `rankCeiling`, `BUILDING_STEP`, `buildingBoost`, `categoryBoost`, `BUILDING_MAX_LEVEL` | Command Center ceiling on rank; hub boost in power. |
| `shared/repair.ts` | `repairBill` (literal 20/16/8/900/0.02) | Repair scales with F/A (so with rank & packages) and with level. |
| `shared/combat.ts` | `HP_*`, `DAMAGE_SCALE`, `ARMOUR_MITIGATION`, `RANGE_*`, `POSITION`, role constants | Resolver tuning as attribute magnitudes grow ~10× by rank 50 (mitigation `100/(100+4A)` saturates: A=107 at rank 50 → 0.19). |
| `shared/march.ts` / `shared/drones.ts` | `SECONDS_PER_PLOT`, `MIN/MAX_MARCH_SECONDS`, `droneContribution`, `DRONE_NETWORK_CAP` | Mobility 30-90 at rank 50 pins every march at the 12 s floor. |
| `shared/assetVisuals.ts` | `STAGE_RANKS`, `ART_STAGES` | Art per milestone; 59 assets have no art. |
| `shared/tradePost.ts` / `worker/tradePost.ts` | `quotePackageStep`, offer limits | Second purchase path for packages. |
| `worker/power.ts`, `worker/squads.ts:squadPower`, `worker/march.ts:664-668` | Power aggregation call sites | Would need to change together if the power formula changes (and battle rows already stored keep the old numbers). |
| `worker/bots.ts` | `growthPlan`, `bandCeiling`, `FARM_CEILING_SEASON_1` | Bot rank progression bypasses cost. |
| `docs/GAME-MATH-v1.md`, `docs/DRONE-RULES-v1.md`, `shared/assets.ts:1145-1146` comment, `migrations/0020:111-113` comment, `CLAUDE.md` | Stale statements (cost bands, ×8.6, integration formula, Token refund, "power from buildings") | Documentation drift to correct alongside. |
