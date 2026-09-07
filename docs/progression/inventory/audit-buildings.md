# Audit: Base Buildings and everything built around them

Repo snapshot `/tmp/wwr` (commit 65e77e5). Scope: the sixteen levelled buildings (Command Center, ten departments, five asset-category hubs), build queues / Second Engineer Team, resource production / storage / raid protection, Depot resource purchases, asset construction (`shared/construction.ts`), Task Force Delta purchase and Task Force unlocks, the season cap / "readiness band".

Every number below was produced by executing the repo's own `shared/buildings.ts` and `shared/construction.ts` with `tsx` (installed globally in the container; scripts in `/tmp/wwr-calc/{calc,table,fit,pergrid}.ts`). No formula was transliterated by hand; the tables are the code's output.

## 0. The rules that govern every building (code, not docs)

| Rule | Source | Detail |
|---|---|---|
| Sixteen levelled buildings | `shared/buildings.ts:31-48` `LEVELLED_BUILDINGS` | `command_center`, 5 hubs, 10 departments. Naval has no hub (`HUB_OF_CATEGORY.naval = null`, `:56-63`). |
| Start level 1, hard max 50 | `shared/buildings.ts:75-77` | `BUILDING_START_LEVEL = 1`, `BUILDING_LEVELS_PER_SEASON = 10`, `BUILDING_MAX_LEVEL = 50`. DB CHECK `level >= 0 AND level <= 50` in `migrations/0022_base_levels.sql`. |
| Season cap | `shared/buildings.ts:84-86` `buildingCapForSeason(season) = min(50, max(0, season) * 10)` | Season is the constant `CURRENT_SEASON = 1` at `worker/index.ts:1198` ("One place, so nothing reads it off a request"). **Today's enforced cap is 10.** Season 2 → 20 … Season 5 → 50. |
| Command Center ceiling | `shared/buildings.ts:320-336` `buildingBlock()` | Any non-CC building may only start level N when `levels.command_center >= N` (i.e. CC must have *finished* N). Same function used by server (`worker/buildings.ts:248`) and client (`src/live/BuildingPanel.tsx:83`). |
| Warehouse gate | `shared/buildings.ts:309-311` `warehouseNeeded(N) = floor(N/2)` | Any building except the Warehouse itself may only start level N if `quartermaster_warehouse >= floor(N/2)`. |
| CC ceiling on Service Rank | `shared/buildings.ts:349-351` `rankCeiling(levels) = max(1, levels.command_center)`; enforced `worker/upgrades.ts:270-272` via `worker/index.ts:1229-1238` | A rank may not exceed the CC level. Packages are gated transitively (package ≤ rank ≤ CC, `worker/upgrades.ts:344`). |
| Queue | `worker/buildings.ts:184` `queues = second_team_at !== null && second_team_at <= now ? 2 : 1` | One job per base (two with the Second Engineer Team); one job per building (unique index `idx_base_jobs_one_per_building`, `migrations/0023_base_resources.sql`). Enforced inside the INSERT `worker/buildings.ts:272-284`. |
| Level built is always current+1 | `worker/buildings.ts:263` | The request names a building only; no level, no price (`worker/index.ts:2787-2799`). |
| Timers absolute; only the Engineer Yard shortens them | `worker/buildings.ts:267` `ms = round(step.ms * engineerMultiplier(levels.engineer_support_yard))` | No speed-up purchase exists anywhere in code. |
| Costs are resources only (Fuel/Steel/Munitions/Alloy) | `shared/buildings.ts:14-16` header comment; `startLevel` debits `bases.fuel/steel/munitions/alloy` only (`worker/buildings.ts:212-222`) | Tokens/Credits never touch a building level. |
| Settle-on-read | `worker/buildings.ts:97-168` | Jobs fold into `base_levels` and production accrues on any `readBase()`; nothing runs in the background. |
| Test reset | `migrations/0024_season_1_reset.sql` | All `base_levels`, `base_jobs`, `depot_purchases` deleted; stock zeroed; `second_team_at = NULL`; 100,000 Tokens per player. `delta_at` (0027) is not touched by 0024 (0027 came after). |
| Currency parity | `shared/economy.ts:137-152` `splitIsValid` / `defaultSplit` | Every currency purchase in scope takes a `{tokens, credits}` split that must sum to one price; credits are spent first by default. 1:1 holds for every item in this scope. |

### Resources: production, storage, protection, raids

- Production per hour: table `PRODUCTION` `shared/buildings.ts:124-129`, indexed by the *producer's* level (`PRODUCER_OF` `:104-109`: fuel←fuel_point, steel←fabrication_shop, munitions←garrison_barracks, alloy←recovery_yard). Past level 10: `row()` `:136-140` = `round(table[10] * 1.3^(level-10))`.
- Storage cap: `WAREHOUSE_CAP` `:132`, same 1.3× extrapolation (`storageCap` `:148-150`). **Fuel has no cap**: `capFor()` `:157-159` returns `+Infinity` for fuel (owner decision 2026-09-07). Steel/Munitions/Alloy each capped at the Warehouse figure (per resource, not shared).
- Protected share: `WAREHOUSE_PROTECTED` `:133`, holds at 0.8 past level 10 (`protectedShare` `:161-164`).
- Raid: `RAID_SHARE = 0.05` `:167`; `raidLoot()` `:169-176` = `floor(stock * (1 - protected) * 0.05)` per resource. Wired in `worker/march.ts:754-783`: on an attacker win, loot is moved from defender to attacker, **clipped to `raider.storageCap - raider.resources[k]` for every resource including Fuel** (`worker/march.ts:761`) — so a raider whose Fuel stock exceeds the Warehouse cap number receives no Fuel loot even though Fuel is uncapped elsewhere (`capFor` is not used there). Minor inconsistency.
- Production settle: `worker/buildings.ts:136-168`; production stops at the cap; stock above cap is never cut; whole gap paid at the current rate.
- Attack Fuel spend (consumable, in scope as the only resource sink outside building/asset construction): `shared/march.ts:116-120` `attackFuel(units) = round(100 + 20 * units)`, debited at launch `worker/march.ts:311-326`; reinforcing is free.

### Effects grid (computed; all sixteen buildings set to the same level)

| level | Fuel/h | Steel/h | Munitions/h | Alloy/h | Warehouse cap (S/M/A each) | protected | hub boost | Signals lead |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 250 | 180 | 150 | 120 | 6,000 | 8% | ×1.000000 | 3 min |
| 2 | 400 | 300 | 250 | 200 | 10,000 | 16% | ×1.020000 | 6 min |
| 3 | 600 | 450 | 375 | 300 | 16,000 | 24% | ×1.040400 | 9 min |
| 4 | 900 | 650 | 550 | 450 | 24,000 | 32% | ×1.061208 | 12 min |
| 5 | 1,300 | 950 | 800 | 650 | 36,000 | 40% | ×1.082432 | 15 min |
| 6 | 1,800 | 1,300 | 1,100 | 900 | 50,000 | 48% | ×1.104081 | 18 min |
| 7 | 2,400 | 1,750 | 1,500 | 1,200 | 68,000 | 56% | ×1.126162 | 21 min |
| 8 | 3,200 | 2,300 | 2,000 | 1,600 | 90,000 | 64% | ×1.148686 | 24 min |
| 9 | 4,200 | 3,000 | 2,600 | 2,100 | 116,000 | 72% | ×1.171659 | 27 min |
| 10 | 5,500 | 3,900 | 3,400 | 2,800 | 150,000 | 80% | ×1.195093 | 30 min |
| 11 | 7,150 | 5,070 | 4,420 | 3,640 | 195,000 | 80% | ×1.218994 | 33 min |
| 15 | 20,421 | 14,480 | 12,624 | 10,396 | 556,940 | 80% | ×1.319479 | 45 min |
| 20 | 75,822 | 53,765 | 46,872 | 38,600 | 2,067,877 | 80% | ×1.456811 | 60 min |
| 30 | 1,045,273 | 741,194 | 646,169 | 532,139 | 28,507,446 | 80% | ×1.775845 | 90 min |
| 40 | 14,409,976 | 10,217,983 | 8,907,985 | 7,335,988 | 392,999,347 | 80% | ×2.164745 | 120 min |
| 50 | 198,653,756 | 140,863,573 | 122,804,140 | 101,132,821 | 5,417,829,721 | 80% | ×2.638812 | 150 min |

Department curves (`ramp()` `shared/buildings.ts:378-383`: `(at10 - 1) * (min(10, level) - 1) / 9`, **clamped at level 10 — levels 11-50 add nothing** for these four):

| level | TOC march ×  (`tocMultiplier` :389-391) | Engineer timer × (`engineerMultiplier` :399-401) | Depot daily-cap × (`depotCapMultiplier` :404-406) | Trading Post open offers (`tradingOffers` :414-416) |
|---:|---:|---:|---:|---:|
| 1 | 1.0000 | 1.0000 | 1.0000 | 1 |
| 2 | 1.0222 | 0.9667 | 1.0556 | 2 |
| 5 | 1.0889 | 0.8667 | 1.2222 | 5 |
| 10 | 1.2000 | 0.7000 | 1.5000 | 10 |
| 11-50 | 1.2000 | 0.7000 | 1.5000 | = level (uncapped, but barter is not built) |

March total = `min(1.5, droneNetwork × toc)` (`marchMultiplier` `:394-396`, `MARCH_TOTAL_CAP = 1.5` `:386`), applied at `worker/march.ts:304`; `DRONE_NETWORK_CAP = 1.25` (`shared/drones.ts:20`), so 1.25 × 1.20 = 1.50 exactly.

Note the doc/code split: `docs/BUILDING-EFFECTS-v1.md` tables start at ×1.02 / ×0.97 / ×1.05 at level 1 and give hubs ×1.02^L (×1.218994 at 10). Code follows the owner's ruling appended at `docs/BUILDING-EFFECTS-v1.md:509-517`: level 1 is the start (×1.00), hub boost is `1.02^(level-1)` = ×1.195093 at 10 (`buildingBoost` `shared/buildings.ts:360-362`). The hub boost is **not** clamped at 10: ×1.4568 at 20, ×2.6388 at 50.

## 1. Cost tables (executed `buildingStep()` `shared/buildings.ts:266-288`)

Formula, verbatim from code:

```
l = max(2, floor(toLevel)); past = max(0, l - 10); idx = min(10, l)
command_center: cost = round(COMMAND_CENTER_ROWS[idx].cost * 1.3^past); ms = round(COMMAND_CENTER_ROWS[idx].minutes * 1.5^past) * 60000
others:         cost = round(BASE_ROW[b] * SCALE[idx] * 1.3^past);  ms = round(MINUTES[idx] * 1.5^past) * 60000
  SCALE   = HUB_SCALE  [0,1,1.5,2.2,3.2,4.6,6.4,8.8,12,16.4,22]  for the 5 hubs           (:208)
          = DEPT_SCALE [0,1,1.5,2,3,4,6,8,12,16,24]              for the 10 departments   (:210)
  MINUTES = HUB_MINUTES      [0,20,45,90,180,360,540,720,1080,1440,2160]  hubs           (:209)
          = PRODUCER_MINUTES [0,15,30,60,120,240,360,480,720,960,1440]   4 producers    (:212)
          = DEPT_MINUTES     [0,20,40,80,160,300,450,600,900,1200,1800]  other 6 depts  (:211)
  BASE_ROW (fuel, steel, munitions, alloy) :214-230; COMMAND_CENTER_ROWS :232-244
```

"Cost of level N" = the resources debited when the job that *reaches* level N is started (the step INTO level N). Level 1 is never bought (`null`). The last column, **Depot-equivalent currency**, is my derived figure: the Tokens *or* Credits (1:1) needed to buy that step's resources at the Depot rate (`fuel/100 + steel/80 + munitions/70 + alloy/60`, `RESOURCE_PER_UNIT` `:183-188`) — ignoring daily caps and production. It is the only way to express a resource cost in currency; it is not a price the code charges. Timers are the base figure before the Engineer Yard multiplier (×0.70 at Yard 10).

Rows 2-10 reproduce `docs/BUILDING-RESOURCES-v1.md` §3-4 exactly (I checked the 10-row for each). Rows 11-50 are the code's placeholder extrapolation (`1.3^past` cost, `1.5^past` time — "until a later table lands", `:135`), which is why CC 20 takes 144 days and CC 50 takes 27.6 million days.

### command_center
| to level | Fuel | Steel | Munitions | Alloy | timer (base, before Engineer Yard) | Depot-equivalent currency |
|---:|---:|---:|---:|---:|---|---:|
| 2 | 1,350 | 1,050 | 900 | 750 | 2h 0m | 52 |
| 5 | 4,400 | 3,400 | 3,000 | 2,500 | 12h 0m | 171 |
| 10 | 24,000 | 21,600 | 19,000 | 16,200 | 2d 12h 0m | 1,051 |
| 11 | 31,200 | 28,080 | 24,700 | 21,060 | 3d 18h 0m | 1,367 |
| 20 | 330,860 | 297,774 | 261,931 | 223,331 | 144d 3h 54m | 14,495 |
| 30 | 4,561,191 | 4,105,072 | 3,610,943 | 3,078,804 | 8313d 3h 24m | 199,824 |
| 40 | 62,879,895 | 56,591,906 | 49,779,917 | 42,443,929 | 479377d 15h 33m | 2,754,738 |
| 50 | 866,852,755 | 780,167,480 | 686,258,431 | 585,125,610 | 27643330d 19h 15m | 37,976,406 |
| cum 2→10 | 82,350 | 67,550 | 59,450 | 50,300 | 8d 20h 0m | 3,355 |
| cum 2→50 | 3,756,340,283 | 3,380,699,697 | 2,973,763,654 | 2,535,524,408 | 82929993d 17h 47m | 164,563,227 |

### armour_hub
| to level | Fuel | Steel | Munitions | Alloy | timer (base, before Engineer Yard) | Depot-equivalent currency |
|---:|---:|---:|---:|---:|---|---:|
| 2 | 375 | 1,125 | 300 | 375 | 0h 45m | 28 |
| 5 | 1,150 | 3,450 | 920 | 1,150 | 6h 0m | 87 |
| 10 | 5,500 | 16,500 | 4,400 | 5,500 | 1d 12h 0m | 416 |
| 11 | 7,150 | 21,450 | 5,720 | 7,150 | 2d 6h 0m | 541 |
| 20 | 75,822 | 227,467 | 60,658 | 75,822 | 86d 11h 56m | 5,732 |
| 30 | 1,045,273 | 3,135,819 | 836,218 | 1,045,273 | 4987d 21h 15m | 79,018 |
| 40 | 14,409,976 | 43,229,928 | 11,527,981 | 14,409,976 | 287626d 14h 8m | 1,089,326 |
| 50 | 198,653,756 | 595,961,269 | 158,923,005 | 198,653,756 | 16585998d 11h 33m | 15,017,278 |
| cum 2→10 | 19,275 | 57,825 | 15,420 | 19,275 | 4d 14h 15m | 1,457 |
| cum 2→50 | 860,828,386 | 2,582,485,158 | 688,662,710 | 860,828,386 | 49757995d 12h 56m | 65,074,527 |

### artillery_hub
| to level | Fuel | Steel | Munitions | Alloy | timer (base, before Engineer Yard) | Depot-equivalent currency |
|---:|---:|---:|---:|---:|---|---:|
| 2 | 300 | 375 | 1,125 | 375 | 0h 45m | 30 |
| 5 | 920 | 1,150 | 3,450 | 1,150 | 6h 0m | 92 |
| 10 | 4,400 | 5,500 | 16,500 | 5,500 | 1d 12h 0m | 440 |
| 11 | 5,720 | 7,150 | 21,450 | 7,150 | 2d 6h 0m | 572 |
| 20 | 60,658 | 75,822 | 227,467 | 75,822 | 86d 11h 56m | 6,068 |
| 30 | 836,218 | 1,045,273 | 3,135,819 | 1,045,273 | 4987d 21h 15m | 83,647 |
| 40 | 11,527,981 | 14,409,976 | 43,229,928 | 14,409,976 | 287626d 14h 8m | 1,153,141 |
| 50 | 158,923,005 | 198,653,756 | 595,961,269 | 198,653,756 | 16585998d 11h 33m | 15,897,030 |
| cum 2→10 | 15,420 | 19,275 | 57,825 | 19,275 | 4d 14h 15m | 1,542 |
| cum 2→50 | 688,662,710 | 860,828,386 | 2,582,485,158 | 860,828,386 | 49757995d 12h 56m | 68,886,767 |

### fixed_wing_hub
| to level | Fuel | Steel | Munitions | Alloy | timer (base, before Engineer Yard) | Depot-equivalent currency |
|---:|---:|---:|---:|---:|---|---:|
| 2 | 1,125 | 375 | 300 | 375 | 0h 45m | 26 |
| 5 | 3,450 | 1,150 | 920 | 1,150 | 6h 0m | 81 |
| 10 | 16,500 | 5,500 | 4,400 | 5,500 | 1d 12h 0m | 388 |
| 11 | 21,450 | 7,150 | 5,720 | 7,150 | 2d 6h 0m | 505 |
| 20 | 227,467 | 75,822 | 60,658 | 75,822 | 86d 11h 56m | 5,353 |
| 30 | 3,135,819 | 1,045,273 | 836,218 | 1,045,273 | 4987d 21h 15m | 73,791 |
| 40 | 43,229,928 | 14,409,976 | 11,527,981 | 14,409,976 | 287626d 14h 8m | 1,017,276 |
| 50 | 595,961,269 | 198,653,756 | 158,923,005 | 198,653,756 | 16585998d 11h 33m | 14,024,009 |
| cum 2→10 | 57,825 | 19,275 | 15,420 | 19,275 | 4d 14h 15m | 1,361 |
| cum 2→50 | 2,582,485,158 | 860,828,386 | 688,662,710 | 860,828,386 | 49757995d 12h 56m | 60,770,385 |

### rotary_hub
| to level | Fuel | Steel | Munitions | Alloy | timer (base, before Engineer Yard) | Depot-equivalent currency |
|---:|---:|---:|---:|---:|---|---:|
| 2 | 750 | 375 | 375 | 750 | 0h 45m | 30 |
| 5 | 2,300 | 1,150 | 1,150 | 2,300 | 6h 0m | 92 |
| 10 | 11,000 | 5,500 | 5,500 | 11,000 | 1d 12h 0m | 441 |
| 11 | 14,300 | 7,150 | 7,150 | 14,300 | 2d 6h 0m | 573 |
| 20 | 151,644 | 75,822 | 75,822 | 151,644 | 86d 11h 56m | 6,075 |
| 30 | 2,090,546 | 1,045,273 | 1,045,273 | 2,090,546 | 4987d 21h 15m | 83,746 |
| 40 | 28,819,952 | 14,409,976 | 14,409,976 | 28,819,952 | 287626d 14h 8m | 1,154,514 |
| 50 | 397,307,513 | 198,653,756 | 198,653,756 | 397,307,513 | 16585998d 11h 33m | 15,915,950 |
| cum 2→10 | 38,550 | 19,275 | 19,275 | 38,550 | 4d 14h 15m | 1,544 |
| cum 2→50 | 1,721,656,771 | 860,828,386 | 860,828,386 | 1,721,656,771 | 49757995d 12h 56m | 68,968,750 |

### drone_hub
| to level | Fuel | Steel | Munitions | Alloy | timer (base, before Engineer Yard) | Depot-equivalent currency |
|---:|---:|---:|---:|---:|---|---:|
| 2 | 375 | 300 | 375 | 1,125 | 0h 45m | 32 |
| 5 | 1,150 | 920 | 1,150 | 3,450 | 6h 0m | 97 |
| 10 | 5,500 | 4,400 | 5,500 | 16,500 | 1d 12h 0m | 464 |
| 11 | 7,150 | 5,720 | 7,150 | 21,450 | 2d 6h 0m | 603 |
| 20 | 75,822 | 60,658 | 75,822 | 227,467 | 86d 11h 56m | 6,391 |
| 30 | 1,045,273 | 836,218 | 1,045,273 | 3,135,819 | 4987d 21h 15m | 88,102 |
| 40 | 14,409,976 | 11,527,981 | 14,409,976 | 43,229,928 | 287626d 14h 8m | 1,214,555 |
| 50 | 198,653,756 | 158,923,005 | 198,653,756 | 595,961,269 | 16585998d 11h 33m | 16,743,674 |
| cum 2→10 | 19,275 | 15,420 | 19,275 | 57,825 | 4d 14h 15m | 1,625 |
| cum 2→50 | 860,828,386 | 688,662,710 | 860,828,386 | 2,582,485,158 | 49757995d 12h 56m | 72,555,535 |

### tactical_operations_center
| to level | Fuel | Steel | Munitions | Alloy | timer (base, before Engineer Yard) | Depot-equivalent currency |
|---:|---:|---:|---:|---:|---|---:|
| 2 | 450 | 450 | 600 | 300 | 0h 40m | 24 |
| 5 | 1,200 | 1,200 | 1,600 | 800 | 5h 0m | 63 |
| 10 | 7,200 | 7,200 | 9,600 | 4,800 | 1d 6h 0m | 379 |
| 11 | 9,360 | 9,360 | 12,480 | 6,240 | 1d 21h 0m | 493 |
| 20 | 99,258 | 99,258 | 132,344 | 66,172 | 72d 1h 57m | 5,227 |
| 30 | 1,368,357 | 1,368,357 | 1,824,477 | 912,238 | 4156d 13h 42m | 72,056 |
| 40 | 18,863,969 | 18,863,969 | 25,151,958 | 12,575,979 | 239688d 19h 47m | 993,353 |
| 50 | 260,055,827 | 260,055,827 | 346,741,102 | 173,370,551 | 13821665d 9h 38m | 13,694,210 |
| cum 2→10 | 22,950 | 22,950 | 30,600 | 15,300 | 3d 20h 10m | 1,209 |
| cum 2→50 | 1,126,900,334 | 1,126,900,334 | 1,502,533,776 | 751,266,890 | 41464996d 7h 5m | 59,341,141 |

### signals_center
| to level | Fuel | Steel | Munitions | Alloy | timer (base, before Engineer Yard) | Depot-equivalent currency |
|---:|---:|---:|---:|---:|---|---:|
| 2 | 225 | 300 | 150 | 750 | 0h 40m | 21 |
| 5 | 600 | 800 | 400 | 2,000 | 5h 0m | 55 |
| 10 | 3,600 | 4,800 | 2,400 | 12,000 | 1d 6h 0m | 330 |
| 11 | 4,680 | 6,240 | 3,120 | 15,600 | 1d 21h 0m | 429 |
| 20 | 49,629 | 66,172 | 33,086 | 165,430 | 72d 1h 57m | 4,553 |
| 30 | 684,179 | 912,238 | 456,119 | 2,280,596 | 4156d 13h 42m | 62,771 |
| 40 | 9,431,984 | 12,575,979 | 6,287,990 | 31,439,948 | 239688d 19h 47m | 865,347 |
| 50 | 130,027,913 | 173,370,551 | 86,685,276 | 433,426,378 | 13821665d 9h 38m | 11,929,545 |
| cum 2→10 | 11,475 | 15,300 | 7,650 | 38,250 | 3d 20h 10m | 1,053 |
| cum 2→50 | 563,450,168 | 751,266,890 | 375,633,445 | 1,878,167,221 | 41464996d 7h 5m | 51,694,317 |

### fuel_point
| to level | Fuel | Steel | Munitions | Alloy | timer (base, before Engineer Yard) | Depot-equivalent currency |
|---:|---:|---:|---:|---:|---|---:|
| 2 | 150 | 450 | 150 | 300 | 0h 30m | 14 |
| 5 | 400 | 1,200 | 400 | 800 | 4h 0m | 38 |
| 10 | 2,400 | 7,200 | 2,400 | 4,800 | 1d 0h 0m | 228 |
| 11 | 3,120 | 9,360 | 3,120 | 6,240 | 1d 12h 0m | 297 |
| 20 | 33,086 | 99,258 | 33,086 | 66,172 | 57d 15h 58m | 3,147 |
| 30 | 456,119 | 1,368,357 | 456,119 | 912,238 | 3325d 6h 10m | 43,386 |
| 40 | 6,287,990 | 18,863,969 | 6,287,990 | 12,575,979 | 191751d 1h 25m | 598,108 |
| 50 | 86,685,276 | 260,055,827 | 86,685,276 | 173,370,551 | 11057332d 7h 42m | 8,245,421 |
| cum 2→10 | 7,650 | 22,950 | 7,650 | 15,300 | 3d 1h 30m | 728 |
| cum 2→50 | 375,633,445 | 1,126,900,334 | 375,633,445 | 751,266,890 | 33171997d 0h 38m | 35,729,896 |

### fabrication_shop
| to level | Fuel | Steel | Munitions | Alloy | timer (base, before Engineer Yard) | Depot-equivalent currency |
|---:|---:|---:|---:|---:|---|---:|
| 2 | 300 | 300 | 300 | 600 | 0h 30m | 21 |
| 5 | 800 | 800 | 800 | 1,600 | 4h 0m | 56 |
| 10 | 4,800 | 4,800 | 4,800 | 9,600 | 1d 0h 0m | 337 |
| 11 | 6,240 | 6,240 | 6,240 | 12,480 | 1d 12h 0m | 438 |
| 20 | 66,172 | 66,172 | 66,172 | 132,344 | 57d 15h 58m | 4,640 |
| 30 | 912,238 | 912,238 | 912,238 | 1,824,477 | 3325d 6h 10m | 63,965 |
| 40 | 12,575,979 | 12,575,979 | 12,575,979 | 25,151,958 | 191751d 1h 25m | 881,816 |
| 50 | 173,370,551 | 173,370,551 | 173,370,551 | 346,741,102 | 11057332d 7h 42m | 12,156,578 |
| cum 2→10 | 15,300 | 15,300 | 15,300 | 30,600 | 3d 1h 30m | 1,073 |
| cum 2→50 | 751,266,890 | 751,266,890 | 751,266,890 | 1,502,533,776 | 33171997d 0h 38m | 52,678,119 |

### garrison_barracks
| to level | Fuel | Steel | Munitions | Alloy | timer (base, before Engineer Yard) | Depot-equivalent currency |
|---:|---:|---:|---:|---:|---|---:|
| 2 | 300 | 300 | 750 | 150 | 0h 30m | 20 |
| 5 | 800 | 800 | 2,000 | 400 | 4h 0m | 53 |
| 10 | 4,800 | 4,800 | 12,000 | 2,400 | 1d 0h 0m | 319 |
| 11 | 6,240 | 6,240 | 15,600 | 3,120 | 1d 12h 0m | 415 |
| 20 | 66,172 | 66,172 | 165,430 | 33,086 | 57d 15h 58m | 4,404 |
| 30 | 912,238 | 912,238 | 2,280,596 | 456,119 | 3325d 6h 10m | 60,707 |
| 40 | 12,575,979 | 12,575,979 | 31,439,948 | 6,287,990 | 191751d 1h 25m | 836,901 |
| 50 | 173,370,551 | 173,370,551 | 433,426,378 | 86,685,276 | 11057332d 7h 42m | 11,537,397 |
| cum 2→10 | 15,300 | 15,300 | 38,250 | 7,650 | 3d 1h 30m | 1,018 |
| cum 2→50 | 751,266,890 | 751,266,890 | 1,878,167,221 | 375,633,445 | 33171997d 0h 38m | 49,995,023 |

### recovery_yard
| to level | Fuel | Steel | Munitions | Alloy | timer (base, before Engineer Yard) | Depot-equivalent currency |
|---:|---:|---:|---:|---:|---|---:|
| 2 | 300 | 375 | 150 | 600 | 0h 30m | 20 |
| 5 | 800 | 1,000 | 400 | 1,600 | 4h 0m | 53 |
| 10 | 4,800 | 6,000 | 2,400 | 9,600 | 1d 0h 0m | 317 |
| 11 | 6,240 | 7,800 | 3,120 | 12,480 | 1d 12h 0m | 412 |
| 20 | 66,172 | 82,715 | 33,086 | 132,344 | 57d 15h 58m | 4,374 |
| 30 | 912,238 | 1,140,298 | 456,119 | 1,824,477 | 3325d 6h 10m | 60,300 |
| 40 | 12,575,979 | 15,719,974 | 6,287,990 | 25,151,958 | 191751d 1h 25m | 831,287 |
| 50 | 173,370,551 | 216,713,189 | 86,685,276 | 346,741,102 | 11057332d 7h 42m | 11,460,000 |
| cum 2→10 | 15,300 | 19,125 | 7,650 | 30,600 | 3d 1h 30m | 1,011 |
| cum 2→50 | 751,266,890 | 939,083,613 | 375,633,445 | 1,502,533,776 | 33171997d 0h 38m | 49,659,636 |

### quartermaster_warehouse
| to level | Fuel | Steel | Munitions | Alloy | timer (base, before Engineer Yard) | Depot-equivalent currency |
|---:|---:|---:|---:|---:|---|---:|
| 2 | 150 | 750 | 150 | 750 | 0h 40m | 26 |
| 5 | 400 | 2,000 | 400 | 2,000 | 5h 0m | 68 |
| 10 | 2,400 | 12,000 | 2,400 | 12,000 | 1d 6h 0m | 408 |
| 11 | 3,120 | 15,600 | 3,120 | 15,600 | 1d 21h 0m | 531 |
| 20 | 33,086 | 165,430 | 33,086 | 165,430 | 72d 1h 57m | 5,629 |
| 30 | 456,119 | 2,280,596 | 456,119 | 2,280,596 | 4156d 13h 42m | 77,595 |
| 40 | 6,287,990 | 31,439,948 | 6,287,990 | 31,439,948 | 239688d 19h 47m | 1,069,707 |
| 50 | 86,685,276 | 433,426,378 | 86,685,276 | 433,426,378 | 13821665d 9h 38m | 14,746,817 |
| cum 2→10 | 7,650 | 38,250 | 7,650 | 38,250 | 3d 20h 10m | 1,301 |
| cum 2→50 | 375,633,445 | 1,878,167,221 | 375,633,445 | 1,878,167,221 | 41464996d 7h 5m | 63,902,404 |

### engineer_support_yard
| to level | Fuel | Steel | Munitions | Alloy | timer (base, before Engineer Yard) | Depot-equivalent currency |
|---:|---:|---:|---:|---:|---|---:|
| 2 | 300 | 600 | 300 | 600 | 0h 40m | 25 |
| 5 | 800 | 1,600 | 800 | 1,600 | 5h 0m | 66 |
| 10 | 4,800 | 9,600 | 4,800 | 9,600 | 1d 6h 0m | 397 |
| 11 | 6,240 | 12,480 | 6,240 | 12,480 | 1d 21h 0m | 516 |
| 20 | 66,172 | 132,344 | 66,172 | 132,344 | 72d 1h 57m | 5,467 |
| 30 | 912,238 | 1,824,477 | 912,238 | 1,824,477 | 4156d 13h 42m | 75,368 |
| 40 | 12,575,979 | 25,151,958 | 12,575,979 | 25,151,958 | 239688d 19h 47m | 1,039,015 |
| 50 | 173,370,551 | 346,741,102 | 173,370,551 | 346,741,102 | 13821665d 9h 38m | 14,323,710 |
| cum 2→10 | 15,300 | 30,600 | 15,300 | 30,600 | 3d 20h 10m | 1,264 |
| cum 2→50 | 751,266,890 | 1,502,533,776 | 751,266,890 | 1,502,533,776 | 41464996d 7h 5m | 62,068,955 |

### depot
| to level | Fuel | Steel | Munitions | Alloy | timer (base, before Engineer Yard) | Depot-equivalent currency |
|---:|---:|---:|---:|---:|---|---:|
| 2 | 300 | 450 | 450 | 450 | 0h 40m | 23 |
| 5 | 800 | 1,200 | 1,200 | 1,200 | 5h 0m | 60 |
| 10 | 4,800 | 7,200 | 7,200 | 7,200 | 1d 6h 0m | 361 |
| 11 | 6,240 | 9,360 | 9,360 | 9,360 | 1d 21h 0m | 469 |
| 20 | 66,172 | 99,258 | 99,258 | 99,258 | 72d 1h 57m | 4,975 |
| 30 | 912,238 | 1,368,357 | 1,368,357 | 1,368,357 | 4156d 13h 42m | 68,581 |
| 40 | 12,575,979 | 18,863,969 | 18,863,969 | 18,863,969 | 239688d 19h 47m | 945,444 |
| 50 | 173,370,551 | 260,055,827 | 260,055,827 | 260,055,827 | 13821665d 9h 38m | 13,033,750 |
| cum 2→10 | 15,300 | 22,950 | 22,950 | 22,950 | 3d 20h 10m | 1,150 |
| cum 2→50 | 751,266,890 | 1,126,900,334 | 1,126,900,334 | 1,126,900,334 | 41464996d 7h 5m | 56,479,172 |

### alliance_trading_post
| to level | Fuel | Steel | Munitions | Alloy | timer (base, before Engineer Yard) | Depot-equivalent currency |
|---:|---:|---:|---:|---:|---|---:|
| 2 | 450 | 300 | 300 | 450 | 0h 40m | 20 |
| 5 | 1,200 | 800 | 800 | 1,200 | 5h 0m | 53 |
| 10 | 7,200 | 4,800 | 4,800 | 7,200 | 1d 6h 0m | 321 |
| 11 | 9,360 | 6,240 | 6,240 | 9,360 | 1d 21h 0m | 417 |
| 20 | 99,258 | 66,172 | 66,172 | 99,258 | 72d 1h 57m | 4,419 |
| 30 | 1,368,357 | 912,238 | 912,238 | 1,368,357 | 4156d 13h 42m | 60,924 |
| 40 | 18,863,969 | 12,575,979 | 12,575,979 | 18,863,969 | 239688d 19h 47m | 839,896 |
| 50 | 260,055,827 | 173,370,551 | 173,370,551 | 260,055,827 | 13821665d 9h 38m | 11,578,676 |
| cum 2→10 | 22,950 | 15,300 | 15,300 | 22,950 | 3d 20h 10m | 1,022 |
| cum 2→50 | 1,126,900,334 | 751,266,890 | 751,266,890 | 1,126,900,334 | 41464996d 7h 5m | 50,173,896 |


## 2. Systems (one JSON object each)

Fields are as the brief specifies. For buildings, `costAtLevels[N]` = Depot-equivalent currency (Tokens or Credits, 1:1) of the resources for the step INTO level N (null at 1; levels 20-50 are the code's placeholder extrapolation, not reachable under today's cap of 10); `cumulativeCostToMax` = the same measure summed 2→10 (today's enforced max). Resource breakdowns are in `costFormulaOrTable` and in section 1.

```json
{
  "id": "command_center",
  "displayName": "Command Center",
  "category": "building",
  "currentLevelMin": 1,
  "currentLevelMax": 10,
  "levelCount": 10,
  "playerVisible": true,
  "upgradeCurrency": [
    "fuel",
    "steel",
    "munitions",
    "alloy"
  ],
  "tokenCostRule": "none — building levels never take Tokens; Tokens buy resources at the Depot (100 F / 80 S / 70 M / 60 A per Token, shared/buildings.ts:183-188)",
  "creditCostRule": "none — same; Credits buy resources at the identical Depot rate",
  "equalValueCheck": true,
  "costSourceFile": "shared/buildings.ts:266-288 (buildingStep); tables :208-244",
  "costFormulaOrTable": "cost = round(COMMAND_CENTER_ROWS[idx] (shared/buildings.ts:232-244) * 1.3^max(0,l-10)); ms = round(COMMAND_CENTER_ROWS[idx].minutes * 1.5^max(0,l-10)) * 60000. Level 2: F 1,350 / S 1,050 / M 900 / A 750, 2h 0m. Level 10: F 24,000 / S 21,600 / M 19,000 / A 16,200, 2d 12h 0m. Cum 2->10: F 82,350 / S 67,550 / M 59,450 / A 50,300, 8d 20h 0m of timers. Cum 2->50: F 3,756,340,283 / S 3,380,699,697 / M 2,973,763,654 / A 2,535,524,408, 82929993d 17h 47m.",
  "costAtLevels": {
    "1": null,
    "10": 1051,
    "20": 14495,
    "30": 199824,
    "40": 2754738,
    "50": 37976406
  },
  "cumulativeCostToMax": 3355,
  "timeCostRule": "COMMAND_CENTER_ROWS[idx].minutes (minutes) x 1.5^max(0,l-10), then x engineerMultiplier(engineer_support_yard) at job start (worker/buildings.ts:267). Level 10 base timer 2d 12h 0m; level 20 144d 3h 54m; level 50 27643330d 19h 15m.",
  "prerequisiteRule": "level N <= buildingCapForSeason(CURRENT_SEASON) (=10 today); quartermaster_warehouse >= floor(N/2); no running job on this building; a free queue slot; stock covers cost (shared/buildings.ts:320-336, worker/buildings.ts:236-289)",
  "effectDescription": "Ceiling for everything: every other building may only start level N once CC is at N (buildingBlock, shared/buildings.ts:328-330); Service Rank may not exceed CC level (rankCeiling :349-351, enforced worker/upgrades.ts:270); packages inherit that via rank ceiling. Asset tier N (unlock week N) opens early when CC >= N (shared/season.ts:60-63). Task Forces: Bravo at CC 5, Charlie at CC 10, Delta earned at CC 20 / purchasable at CC 10 (shared/season.ts:71-79). Shown on the world map as the base \"level\" (worker/world.ts:168-175). No stat of its own.",
  "combatRelevant": true,
  "powerClass": "combat",
  "statOrPowerFieldsChanged": [
    "rank ceiling (indirect: every asset attribute via Service Rank)",
    "asset tier availability",
    "Task Force count"
  ],
  "powerScoreFormula": null,
  "cumulativePowerAtMax": null,
  "capsAndLimits": "Season cap = 10 x season (CURRENT_SEASON=1 -> 10; hard max 50, shared/buildings.ts:77,84-86; DB CHECK level<=50 migrations/0022). Levels carry across seasons (reset 0024 wiped them once for the test reset).  One job per building; timers absolute.",
  "serverGrantPath": "worker/buildings.ts startLevel() (:236-289) via POST /api/base/level (worker/index.ts:2787-2799); settleJobs() (:97-126) folds completion into base_levels on any readBase(); GET /api/base/levels (:2774-2785) reads.",
  "clientScreenPath": "src/live/BaseSheets.tsx CommandCenterSheet (Departments tab) -> src/live/BuildingPanel.tsx",
  "notes": "costAtLevels and cumulativeCostToMax are Depot-equivalent currency (Tokens or Credits at 1:1) for the resources of the step INTO that level, rounded; cumulativeCostToMax is 2->10 (today's cap). Depot-equivalent 2->50 = 164,563,227. Timer at 50 is a placeholder extrapolation (27643330d 19h 15m). BUILDING-RESOURCES-v1 rows 2-10 match the code exactly. Doc rulings note in BUILDING-EFFECTS-v1.md:514 says \"Bravo 5, Charlie 15, Delta 25\" but code is Bravo 5 / Charlie 10 / Delta 20 (shared/season.ts:71-76). effectLine (:436-439) promises \"tier-N assets\" up to 10 and Delta wording at 10/20."
}
```

```json
{
  "id": "armour_hub",
  "displayName": "Armour Building",
  "category": "building",
  "currentLevelMin": 1,
  "currentLevelMax": 10,
  "levelCount": 10,
  "playerVisible": true,
  "upgradeCurrency": [
    "fuel",
    "steel",
    "munitions",
    "alloy"
  ],
  "tokenCostRule": "none — building levels never take Tokens; Tokens buy resources at the Depot (100 F / 80 S / 70 M / 60 A per Token, shared/buildings.ts:183-188)",
  "creditCostRule": "none — same; Credits buy resources at the identical Depot rate",
  "equalValueCheck": true,
  "costSourceFile": "shared/buildings.ts:266-288 (buildingStep); tables :208-244",
  "costFormulaOrTable": "cost = round(BASE_ROW.armour_hub (:214-230) x HUB_SCALE[idx] * 1.3^max(0,l-10)); ms = round(HUB_MINUTES[idx] * 1.5^max(0,l-10)) * 60000. Level 2: F 375 / S 1,125 / M 300 / A 375, 0h 45m. Level 10: F 5,500 / S 16,500 / M 4,400 / A 5,500, 1d 12h 0m. Cum 2->10: F 19,275 / S 57,825 / M 15,420 / A 19,275, 4d 14h 15m of timers. Cum 2->50: F 860,828,386 / S 2,582,485,158 / M 688,662,710 / A 860,828,386, 49757995d 12h 56m.",
  "costAtLevels": {
    "1": null,
    "10": 416,
    "20": 5732,
    "30": 79018,
    "40": 1089326,
    "50": 15017278
  },
  "cumulativeCostToMax": 1457,
  "timeCostRule": "HUB_MINUTES[idx] (minutes) x 1.5^max(0,l-10), then x engineerMultiplier(engineer_support_yard) at job start (worker/buildings.ts:267). Level 10 base timer 1d 12h 0m; level 20 86d 11h 56m; level 50 16585998d 11h 33m.",
  "prerequisiteRule": "level N <= buildingCapForSeason(CURRENT_SEASON) (=10 today); command_center >= N; quartermaster_warehouse >= floor(N/2); no running job on this building; a free queue slot (1, or 2 with Second Engineer Team); stock covers cost",
  "effectDescription": "All armour assets: every one of the five attributes x1.02^(level-1) (buildingBoost shared/buildings.ts:358-367), applied to the ranked attribute BEFORE packages/integration are added (attributesWith shared/upgrades.ts:121-142). Also the building at which armour blueprints are constructed; construction needs hub level >= asset unlock week (shared/construction.ts:44-46,62). Repair bills use the boosted attributes (worker/repair.ts:99).",
  "combatRelevant": true,
  "powerClass": "combat",
  "statOrPowerFieldsChanged": [
    "firepower",
    "armour",
    "mobility",
    "range",
    "detection"
  ],
  "powerScoreFormula": "per asset in category: round(6 * sum over 5 attrs of milli(base * 1.045^(rank-1+floor(rank/10)) * 1.02^(hub-1) + integration + packagePoints)) (shared/upgrades.ts:145-153, shared/assets.ts:1186-1188)",
  "cumulativePowerAtMax": null,
  "capsAndLimits": "Season cap = 10 x season (CURRENT_SEASON=1 -> 10; hard max 50, shared/buildings.ts:77,84-86; DB CHECK level<=50 migrations/0022). Levels carry across seasons (reset 0024 wiped them once for the test reset). Boost is not clamped past 10 (x2.6388 at 50). One job per building; timers absolute.",
  "serverGrantPath": "worker/buildings.ts startLevel() (:236-289) via POST /api/base/level (worker/index.ts:2787-2799); settleJobs() (:97-126) folds completion into base_levels on any readBase(); GET /api/base/levels (:2774-2785) reads.",
  "clientScreenPath": "src/live/Assets.tsx:430-435 (category view) -> src/live/BuildingPanel.tsx; opened from BaseBoard entry {kind:\"assets\"}",
  "notes": "costAtLevels and cumulativeCostToMax are Depot-equivalent currency (Tokens or Credits at 1:1) for the resources of the step INTO that level, rounded; cumulativeCostToMax is 2->10 (today's cap). Depot-equivalent 2->50 = 65,074,527. Timer at 50 is a placeholder extrapolation (16585998d 11h 33m). BUILDING-RESOURCES-v1 rows 2-10 match the code exactly. docs/BUILDING-EFFECTS-v1.md tables say x1.02^L (x1.218994 at 10); code is x1.02^(L-1) (x1.195093 at 10) per the owner ruling at :511. docs/ASSET-BUILDING-UPGRADES-v1.md section 3 Token/Credit price table (40..700 Tokens, 4x Credits) is NOT used — superseded by the ruling at :83."
}
```

```json
{
  "id": "artillery_hub",
  "displayName": "Missile Building",
  "category": "building",
  "currentLevelMin": 1,
  "currentLevelMax": 10,
  "levelCount": 10,
  "playerVisible": true,
  "upgradeCurrency": [
    "fuel",
    "steel",
    "munitions",
    "alloy"
  ],
  "tokenCostRule": "none — building levels never take Tokens; Tokens buy resources at the Depot (100 F / 80 S / 70 M / 60 A per Token, shared/buildings.ts:183-188)",
  "creditCostRule": "none — same; Credits buy resources at the identical Depot rate",
  "equalValueCheck": true,
  "costSourceFile": "shared/buildings.ts:266-288 (buildingStep); tables :208-244",
  "costFormulaOrTable": "cost = round(BASE_ROW.artillery_hub (:214-230) x HUB_SCALE[idx] * 1.3^max(0,l-10)); ms = round(HUB_MINUTES[idx] * 1.5^max(0,l-10)) * 60000. Level 2: F 300 / S 375 / M 1,125 / A 375, 0h 45m. Level 10: F 4,400 / S 5,500 / M 16,500 / A 5,500, 1d 12h 0m. Cum 2->10: F 15,420 / S 19,275 / M 57,825 / A 19,275, 4d 14h 15m of timers. Cum 2->50: F 688,662,710 / S 860,828,386 / M 2,582,485,158 / A 860,828,386, 49757995d 12h 56m.",
  "costAtLevels": {
    "1": null,
    "10": 440,
    "20": 6068,
    "30": 83647,
    "40": 1153141,
    "50": 15897030
  },
  "cumulativeCostToMax": 1542,
  "timeCostRule": "HUB_MINUTES[idx] (minutes) x 1.5^max(0,l-10), then x engineerMultiplier(engineer_support_yard) at job start (worker/buildings.ts:267). Level 10 base timer 1d 12h 0m; level 20 86d 11h 56m; level 50 16585998d 11h 33m.",
  "prerequisiteRule": "level N <= buildingCapForSeason(CURRENT_SEASON) (=10 today); command_center >= N; quartermaster_warehouse >= floor(N/2); no running job on this building; a free queue slot (1, or 2 with Second Engineer Team); stock covers cost",
  "effectDescription": "Same as armour_hub for the artillery category.",
  "combatRelevant": true,
  "powerClass": "combat",
  "statOrPowerFieldsChanged": [
    "firepower",
    "armour",
    "mobility",
    "range",
    "detection"
  ],
  "powerScoreFormula": "as armour_hub",
  "cumulativePowerAtMax": null,
  "capsAndLimits": "Season cap = 10 x season (CURRENT_SEASON=1 -> 10; hard max 50, shared/buildings.ts:77,84-86; DB CHECK level<=50 migrations/0022). Levels carry across seasons (reset 0024 wiped them once for the test reset). Boost is not clamped past 10 (x2.6388 at 50). One job per building; timers absolute.",
  "serverGrantPath": "worker/buildings.ts startLevel() (:236-289) via POST /api/base/level (worker/index.ts:2787-2799); settleJobs() (:97-126) folds completion into base_levels on any readBase(); GET /api/base/levels (:2774-2785) reads.",
  "clientScreenPath": "src/live/Assets.tsx:430-435 (category view) -> src/live/BuildingPanel.tsx; opened from BaseBoard entry {kind:\"assets\"}",
  "notes": "costAtLevels and cumulativeCostToMax are Depot-equivalent currency (Tokens or Credits at 1:1) for the resources of the step INTO that level, rounded; cumulativeCostToMax is 2->10 (today's cap). Depot-equivalent 2->50 = 68,886,767. Timer at 50 is a placeholder extrapolation (16585998d 11h 33m). BUILDING-RESOURCES-v1 rows 2-10 match the code exactly. docs/BUILDING-EFFECTS-v1.md tables say x1.02^L (x1.218994 at 10); code is x1.02^(L-1) (x1.195093 at 10) per the owner ruling at :511. docs/ASSET-BUILDING-UPGRADES-v1.md section 3 Token/Credit price table (40..700 Tokens, 4x Credits) is NOT used — superseded by the ruling at :83."
}
```

```json
{
  "id": "fixed_wing_hub",
  "displayName": "Fixed-Wing Building",
  "category": "building",
  "currentLevelMin": 1,
  "currentLevelMax": 10,
  "levelCount": 10,
  "playerVisible": true,
  "upgradeCurrency": [
    "fuel",
    "steel",
    "munitions",
    "alloy"
  ],
  "tokenCostRule": "none — building levels never take Tokens; Tokens buy resources at the Depot (100 F / 80 S / 70 M / 60 A per Token, shared/buildings.ts:183-188)",
  "creditCostRule": "none — same; Credits buy resources at the identical Depot rate",
  "equalValueCheck": true,
  "costSourceFile": "shared/buildings.ts:266-288 (buildingStep); tables :208-244",
  "costFormulaOrTable": "cost = round(BASE_ROW.fixed_wing_hub (:214-230) x HUB_SCALE[idx] * 1.3^max(0,l-10)); ms = round(HUB_MINUTES[idx] * 1.5^max(0,l-10)) * 60000. Level 2: F 1,125 / S 375 / M 300 / A 375, 0h 45m. Level 10: F 16,500 / S 5,500 / M 4,400 / A 5,500, 1d 12h 0m. Cum 2->10: F 57,825 / S 19,275 / M 15,420 / A 19,275, 4d 14h 15m of timers. Cum 2->50: F 2,582,485,158 / S 860,828,386 / M 688,662,710 / A 860,828,386, 49757995d 12h 56m.",
  "costAtLevels": {
    "1": null,
    "10": 388,
    "20": 5353,
    "30": 73791,
    "40": 1017276,
    "50": 14024009
  },
  "cumulativeCostToMax": 1361,
  "timeCostRule": "HUB_MINUTES[idx] (minutes) x 1.5^max(0,l-10), then x engineerMultiplier(engineer_support_yard) at job start (worker/buildings.ts:267). Level 10 base timer 1d 12h 0m; level 20 86d 11h 56m; level 50 16585998d 11h 33m.",
  "prerequisiteRule": "level N <= buildingCapForSeason(CURRENT_SEASON) (=10 today); command_center >= N; quartermaster_warehouse >= floor(N/2); no running job on this building; a free queue slot (1, or 2 with Second Engineer Team); stock covers cost",
  "effectDescription": "Same as armour_hub for the fixed_wing category.",
  "combatRelevant": true,
  "powerClass": "combat",
  "statOrPowerFieldsChanged": [
    "firepower",
    "armour",
    "mobility",
    "range",
    "detection"
  ],
  "powerScoreFormula": "as armour_hub",
  "cumulativePowerAtMax": null,
  "capsAndLimits": "Season cap = 10 x season (CURRENT_SEASON=1 -> 10; hard max 50, shared/buildings.ts:77,84-86; DB CHECK level<=50 migrations/0022). Levels carry across seasons (reset 0024 wiped them once for the test reset). Boost is not clamped past 10 (x2.6388 at 50). One job per building; timers absolute.",
  "serverGrantPath": "worker/buildings.ts startLevel() (:236-289) via POST /api/base/level (worker/index.ts:2787-2799); settleJobs() (:97-126) folds completion into base_levels on any readBase(); GET /api/base/levels (:2774-2785) reads.",
  "clientScreenPath": "src/live/Assets.tsx:430-435 (category view) -> src/live/BuildingPanel.tsx; opened from BaseBoard entry {kind:\"assets\"}",
  "notes": "costAtLevels and cumulativeCostToMax are Depot-equivalent currency (Tokens or Credits at 1:1) for the resources of the step INTO that level, rounded; cumulativeCostToMax is 2->10 (today's cap). Depot-equivalent 2->50 = 60,770,385. Timer at 50 is a placeholder extrapolation (16585998d 11h 33m). BUILDING-RESOURCES-v1 rows 2-10 match the code exactly. docs/BUILDING-EFFECTS-v1.md tables say x1.02^L (x1.218994 at 10); code is x1.02^(L-1) (x1.195093 at 10) per the owner ruling at :511. docs/ASSET-BUILDING-UPGRADES-v1.md section 3 Token/Credit price table (40..700 Tokens, 4x Credits) is NOT used — superseded by the ruling at :83."
}
```

```json
{
  "id": "rotary_hub",
  "displayName": "Helicopter Building",
  "category": "building",
  "currentLevelMin": 1,
  "currentLevelMax": 10,
  "levelCount": 10,
  "playerVisible": true,
  "upgradeCurrency": [
    "fuel",
    "steel",
    "munitions",
    "alloy"
  ],
  "tokenCostRule": "none — building levels never take Tokens; Tokens buy resources at the Depot (100 F / 80 S / 70 M / 60 A per Token, shared/buildings.ts:183-188)",
  "creditCostRule": "none — same; Credits buy resources at the identical Depot rate",
  "equalValueCheck": true,
  "costSourceFile": "shared/buildings.ts:266-288 (buildingStep); tables :208-244",
  "costFormulaOrTable": "cost = round(BASE_ROW.rotary_hub (:214-230) x HUB_SCALE[idx] * 1.3^max(0,l-10)); ms = round(HUB_MINUTES[idx] * 1.5^max(0,l-10)) * 60000. Level 2: F 750 / S 375 / M 375 / A 750, 0h 45m. Level 10: F 11,000 / S 5,500 / M 5,500 / A 11,000, 1d 12h 0m. Cum 2->10: F 38,550 / S 19,275 / M 19,275 / A 38,550, 4d 14h 15m of timers. Cum 2->50: F 1,721,656,771 / S 860,828,386 / M 860,828,386 / A 1,721,656,771, 49757995d 12h 56m.",
  "costAtLevels": {
    "1": null,
    "10": 441,
    "20": 6075,
    "30": 83746,
    "40": 1154514,
    "50": 15915950
  },
  "cumulativeCostToMax": 1544,
  "timeCostRule": "HUB_MINUTES[idx] (minutes) x 1.5^max(0,l-10), then x engineerMultiplier(engineer_support_yard) at job start (worker/buildings.ts:267). Level 10 base timer 1d 12h 0m; level 20 86d 11h 56m; level 50 16585998d 11h 33m.",
  "prerequisiteRule": "level N <= buildingCapForSeason(CURRENT_SEASON) (=10 today); command_center >= N; quartermaster_warehouse >= floor(N/2); no running job on this building; a free queue slot (1, or 2 with Second Engineer Team); stock covers cost",
  "effectDescription": "Same as armour_hub for the rotary category.",
  "combatRelevant": true,
  "powerClass": "combat",
  "statOrPowerFieldsChanged": [
    "firepower",
    "armour",
    "mobility",
    "range",
    "detection"
  ],
  "powerScoreFormula": "as armour_hub",
  "cumulativePowerAtMax": null,
  "capsAndLimits": "Season cap = 10 x season (CURRENT_SEASON=1 -> 10; hard max 50, shared/buildings.ts:77,84-86; DB CHECK level<=50 migrations/0022). Levels carry across seasons (reset 0024 wiped them once for the test reset). Boost is not clamped past 10 (x2.6388 at 50). One job per building; timers absolute.",
  "serverGrantPath": "worker/buildings.ts startLevel() (:236-289) via POST /api/base/level (worker/index.ts:2787-2799); settleJobs() (:97-126) folds completion into base_levels on any readBase(); GET /api/base/levels (:2774-2785) reads.",
  "clientScreenPath": "src/live/Assets.tsx:430-435 (category view) -> src/live/BuildingPanel.tsx; opened from BaseBoard entry {kind:\"assets\"}",
  "notes": "costAtLevels and cumulativeCostToMax are Depot-equivalent currency (Tokens or Credits at 1:1) for the resources of the step INTO that level, rounded; cumulativeCostToMax is 2->10 (today's cap). Depot-equivalent 2->50 = 68,968,750. Timer at 50 is a placeholder extrapolation (16585998d 11h 33m). BUILDING-RESOURCES-v1 rows 2-10 match the code exactly. docs/BUILDING-EFFECTS-v1.md tables say x1.02^L (x1.218994 at 10); code is x1.02^(L-1) (x1.195093 at 10) per the owner ruling at :511. docs/ASSET-BUILDING-UPGRADES-v1.md section 3 Token/Credit price table (40..700 Tokens, 4x Credits) is NOT used — superseded by the ruling at :83."
}
```

```json
{
  "id": "drone_hub",
  "displayName": "Drone Building",
  "category": "building",
  "currentLevelMin": 1,
  "currentLevelMax": 10,
  "levelCount": 10,
  "playerVisible": true,
  "upgradeCurrency": [
    "fuel",
    "steel",
    "munitions",
    "alloy"
  ],
  "tokenCostRule": "none — building levels never take Tokens; Tokens buy resources at the Depot (100 F / 80 S / 70 M / 60 A per Token, shared/buildings.ts:183-188)",
  "creditCostRule": "none — same; Credits buy resources at the identical Depot rate",
  "equalValueCheck": true,
  "costSourceFile": "shared/buildings.ts:266-288 (buildingStep); tables :208-244",
  "costFormulaOrTable": "cost = round(BASE_ROW.drone_hub (:214-230) x HUB_SCALE[idx] * 1.3^max(0,l-10)); ms = round(HUB_MINUTES[idx] * 1.5^max(0,l-10)) * 60000. Level 2: F 375 / S 300 / M 375 / A 1,125, 0h 45m. Level 10: F 5,500 / S 4,400 / M 5,500 / A 16,500, 1d 12h 0m. Cum 2->10: F 19,275 / S 15,420 / M 19,275 / A 57,825, 4d 14h 15m of timers. Cum 2->50: F 860,828,386 / S 688,662,710 / M 860,828,386 / A 2,582,485,158, 49757995d 12h 56m.",
  "costAtLevels": {
    "1": null,
    "10": 464,
    "20": 6391,
    "30": 88102,
    "40": 1214555,
    "50": 16743674
  },
  "cumulativeCostToMax": 1625,
  "timeCostRule": "HUB_MINUTES[idx] (minutes) x 1.5^max(0,l-10), then x engineerMultiplier(engineer_support_yard) at job start (worker/buildings.ts:267). Level 10 base timer 1d 12h 0m; level 20 86d 11h 56m; level 50 16585998d 11h 33m.",
  "prerequisiteRule": "level N <= buildingCapForSeason(CURRENT_SEASON) (=10 today); command_center >= N; quartermaster_warehouse >= floor(N/2); no running job on this building; a free queue slot (1, or 2 with Second Engineer Team); stock covers cost",
  "effectDescription": "Same as armour_hub for the drone category; boosted drone mobility/detection also feed the Drone Network march multiplier (worker/march.ts:296-304, capped at DRONE_NETWORK_CAP 1.25 and MARCH_TOTAL_CAP 1.5).",
  "combatRelevant": true,
  "powerClass": "combat",
  "statOrPowerFieldsChanged": [
    "firepower",
    "armour",
    "mobility",
    "range",
    "detection",
    "march speed (via Drone Network)"
  ],
  "powerScoreFormula": "as armour_hub",
  "cumulativePowerAtMax": null,
  "capsAndLimits": "Season cap = 10 x season (CURRENT_SEASON=1 -> 10; hard max 50, shared/buildings.ts:77,84-86; DB CHECK level<=50 migrations/0022). Levels carry across seasons (reset 0024 wiped them once for the test reset). Boost is not clamped past 10 (x2.6388 at 50). One job per building; timers absolute.",
  "serverGrantPath": "worker/buildings.ts startLevel() (:236-289) via POST /api/base/level (worker/index.ts:2787-2799); settleJobs() (:97-126) folds completion into base_levels on any readBase(); GET /api/base/levels (:2774-2785) reads.",
  "clientScreenPath": "src/live/Assets.tsx:430-435 (category view) -> src/live/BuildingPanel.tsx; opened from BaseBoard entry {kind:\"assets\"}",
  "notes": "costAtLevels and cumulativeCostToMax are Depot-equivalent currency (Tokens or Credits at 1:1) for the resources of the step INTO that level, rounded; cumulativeCostToMax is 2->10 (today's cap). Depot-equivalent 2->50 = 72,555,535. Timer at 50 is a placeholder extrapolation (16585998d 11h 33m). BUILDING-RESOURCES-v1 rows 2-10 match the code exactly. docs/BUILDING-EFFECTS-v1.md tables say x1.02^L (x1.218994 at 10); code is x1.02^(L-1) (x1.195093 at 10) per the owner ruling at :511. docs/ASSET-BUILDING-UPGRADES-v1.md section 3 Token/Credit price table (40..700 Tokens, 4x Credits) is NOT used — superseded by the ruling at :83."
}
```

```json
{
  "id": "tactical_operations_center",
  "displayName": "Tactical Operations Center",
  "category": "building",
  "currentLevelMin": 1,
  "currentLevelMax": 10,
  "levelCount": 10,
  "playerVisible": true,
  "upgradeCurrency": [
    "fuel",
    "steel",
    "munitions",
    "alloy"
  ],
  "tokenCostRule": "none — building levels never take Tokens; Tokens buy resources at the Depot (100 F / 80 S / 70 M / 60 A per Token, shared/buildings.ts:183-188)",
  "creditCostRule": "none — same; Credits buy resources at the identical Depot rate",
  "equalValueCheck": true,
  "costSourceFile": "shared/buildings.ts:266-288 (buildingStep); tables :208-244",
  "costFormulaOrTable": "cost = round(BASE_ROW.tactical_operations_center (:214-230) x DEPT_SCALE[idx] * 1.3^max(0,l-10)); ms = round(DEPT_MINUTES[idx] * 1.5^max(0,l-10)) * 60000. Level 2: F 450 / S 450 / M 600 / A 300, 0h 40m. Level 10: F 7,200 / S 7,200 / M 9,600 / A 4,800, 1d 6h 0m. Cum 2->10: F 22,950 / S 22,950 / M 30,600 / A 15,300, 3d 20h 10m of timers. Cum 2->50: F 1,126,900,334 / S 1,126,900,334 / M 1,502,533,776 / A 751,266,890, 41464996d 7h 5m.",
  "costAtLevels": {
    "1": null,
    "10": 379,
    "20": 5227,
    "30": 72056,
    "40": 993353,
    "50": 13694210
  },
  "cumulativeCostToMax": 1209,
  "timeCostRule": "DEPT_MINUTES[idx] (minutes) x 1.5^max(0,l-10), then x engineerMultiplier(engineer_support_yard) at job start (worker/buildings.ts:267). Level 10 base timer 1d 6h 0m; level 20 72d 1h 57m; level 50 13821665d 9h 38m.",
  "prerequisiteRule": "level N <= buildingCapForSeason(CURRENT_SEASON) (=10 today); command_center >= N; quartermaster_warehouse >= floor(N/2); no running job on this building; a free queue slot (1, or 2 with Second Engineer Team); stock covers cost",
  "effectDescription": "Every Task Force march is faster: tocMultiplier = 1 + 0.2*(min(10,level)-1)/9 (shared/buildings.ts:389-391), total = min(1.5, droneNetwork * toc) (marchMultiplier :394-396), applied worker/march.ts:304. Holds at x1.20 past level 10.",
  "combatRelevant": true,
  "powerClass": "combat",
  "statOrPowerFieldsChanged": [
    "march speed"
  ],
  "powerScoreFormula": null,
  "cumulativePowerAtMax": null,
  "capsAndLimits": "Season cap = 10 x season (CURRENT_SEASON=1 -> 10; hard max 50, shared/buildings.ts:77,84-86; DB CHECK level<=50 migrations/0022). Levels carry across seasons (reset 0024 wiped them once for the test reset). Effect ramp clamps at level 10 (ramp(), :378-383): levels 11-50 give nothing. One job per building; timers absolute.",
  "serverGrantPath": "worker/buildings.ts startLevel() (:236-289) via POST /api/base/level (worker/index.ts:2787-2799); settleJobs() (:97-126) folds completion into base_levels on any readBase(); GET /api/base/levels (:2774-2785) reads.",
  "clientScreenPath": "src/live/BaseSheets.tsx DepartmentSheet -> BuildingPanel",
  "notes": "costAtLevels and cumulativeCostToMax are Depot-equivalent currency (Tokens or Credits at 1:1) for the resources of the step INTO that level, rounded; cumulativeCostToMax is 2->10 (today's cap). Depot-equivalent 2->50 = 59,341,141. Timer at 50 is a placeholder extrapolation (13821665d 9h 38m). BUILDING-RESOURCES-v1 rows 2-10 match the code exactly."
}
```

```json
{
  "id": "signals_center",
  "displayName": "Signals Center",
  "category": "building",
  "currentLevelMin": 1,
  "currentLevelMax": 10,
  "levelCount": 10,
  "playerVisible": true,
  "upgradeCurrency": [
    "fuel",
    "steel",
    "munitions",
    "alloy"
  ],
  "tokenCostRule": "none — building levels never take Tokens; Tokens buy resources at the Depot (100 F / 80 S / 70 M / 60 A per Token, shared/buildings.ts:183-188)",
  "creditCostRule": "none — same; Credits buy resources at the identical Depot rate",
  "equalValueCheck": true,
  "costSourceFile": "shared/buildings.ts:266-288 (buildingStep); tables :208-244",
  "costFormulaOrTable": "cost = round(BASE_ROW.signals_center (:214-230) x DEPT_SCALE[idx] * 1.3^max(0,l-10)); ms = round(DEPT_MINUTES[idx] * 1.5^max(0,l-10)) * 60000. Level 2: F 225 / S 300 / M 150 / A 750, 0h 40m. Level 10: F 3,600 / S 4,800 / M 2,400 / A 12,000, 1d 6h 0m. Cum 2->10: F 11,475 / S 15,300 / M 7,650 / A 38,250, 3d 20h 10m of timers. Cum 2->50: F 563,450,168 / S 751,266,890 / M 375,633,445 / A 1,878,167,221, 41464996d 7h 5m.",
  "costAtLevels": {
    "1": null,
    "10": 330,
    "20": 4553,
    "30": 62771,
    "40": 865347,
    "50": 11929545
  },
  "cumulativeCostToMax": 1053,
  "timeCostRule": "DEPT_MINUTES[idx] (minutes) x 1.5^max(0,l-10), then x engineerMultiplier(engineer_support_yard) at job start (worker/buildings.ts:267). Level 10 base timer 1d 6h 0m; level 20 72d 1h 57m; level 50 13821665d 9h 38m.",
  "prerequisiteRule": "level N <= buildingCapForSeason(CURRENT_SEASON) (=10 today); command_center >= N; quartermaster_warehouse >= floor(N/2); no running job on this building; a free queue slot (1, or 2 with Second Engineer Team); stock covers cost",
  "effectDescription": "Inbound enemy marches appear on the viewer's world map only once within level*3 minutes of landing (signalsLeadMs shared/buildings.ts:409-411; filter worker/index.ts:824). Not clamped: 150 min at level 50.",
  "combatRelevant": true,
  "powerClass": "combat",
  "statOrPowerFieldsChanged": [
    "warning lead time"
  ],
  "powerScoreFormula": null,
  "cumulativePowerAtMax": null,
  "capsAndLimits": "Season cap = 10 x season (CURRENT_SEASON=1 -> 10; hard max 50, shared/buildings.ts:77,84-86; DB CHECK level<=50 migrations/0022). Levels carry across seasons (reset 0024 wiped them once for the test reset).  One job per building; timers absolute.",
  "serverGrantPath": "worker/buildings.ts startLevel() (:236-289) via POST /api/base/level (worker/index.ts:2787-2799); settleJobs() (:97-126) folds completion into base_levels on any readBase(); GET /api/base/levels (:2774-2785) reads.",
  "clientScreenPath": "src/live/BaseSheets.tsx DepartmentSheet -> BuildingPanel",
  "notes": "costAtLevels and cumulativeCostToMax are Depot-equivalent currency (Tokens or Credits at 1:1) for the resources of the step INTO that level, rounded; cumulativeCostToMax is 2->10 (today's cap). Depot-equivalent 2->50 = 51,694,317. Timer at 50 is a placeholder extrapolation (13821665d 9h 38m). BUILDING-RESOURCES-v1 rows 2-10 match the code exactly."
}
```

```json
{
  "id": "fuel_point",
  "displayName": "Bulk Fuel Point",
  "category": "building",
  "currentLevelMin": 1,
  "currentLevelMax": 10,
  "levelCount": 10,
  "playerVisible": true,
  "upgradeCurrency": [
    "fuel",
    "steel",
    "munitions",
    "alloy"
  ],
  "tokenCostRule": "none — building levels never take Tokens; Tokens buy resources at the Depot (100 F / 80 S / 70 M / 60 A per Token, shared/buildings.ts:183-188)",
  "creditCostRule": "none — same; Credits buy resources at the identical Depot rate",
  "equalValueCheck": true,
  "costSourceFile": "shared/buildings.ts:266-288 (buildingStep); tables :208-244",
  "costFormulaOrTable": "cost = round(BASE_ROW.fuel_point (:214-230) x DEPT_SCALE[idx] * 1.3^max(0,l-10)); ms = round(PRODUCER_MINUTES[idx] * 1.5^max(0,l-10)) * 60000. Level 2: F 150 / S 450 / M 150 / A 300, 0h 30m. Level 10: F 2,400 / S 7,200 / M 2,400 / A 4,800, 1d 0h 0m. Cum 2->10: F 7,650 / S 22,950 / M 7,650 / A 15,300, 3d 1h 30m of timers. Cum 2->50: F 375,633,445 / S 1,126,900,334 / M 375,633,445 / A 751,266,890, 33171997d 0h 38m.",
  "costAtLevels": {
    "1": null,
    "10": 228,
    "20": 3147,
    "30": 43386,
    "40": 598108,
    "50": 8245421
  },
  "cumulativeCostToMax": 728,
  "timeCostRule": "PRODUCER_MINUTES[idx] (minutes) x 1.5^max(0,l-10), then x engineerMultiplier(engineer_support_yard) at job start (worker/buildings.ts:267). Level 10 base timer 1d 0h 0m; level 20 57d 15h 58m; level 50 11057332d 7h 42m.",
  "prerequisiteRule": "level N <= buildingCapForSeason(CURRENT_SEASON) (=10 today); command_center >= N; quartermaster_warehouse >= floor(N/2); no running job on this building; a free queue slot (1, or 2 with Second Engineer Team); stock covers cost",
  "effectDescription": "Fuel production per hour by table PRODUCTION.fuel (shared/buildings.ts:125), x1.3/level past 10. Fuel is uncapped and is the attack currency (attackFuel 100+20/unit, shared/march.ts:116-120).",
  "combatRelevant": false,
  "powerClass": "convenience/production",
  "statOrPowerFieldsChanged": [
    "fuel/hour"
  ],
  "powerScoreFormula": null,
  "cumulativePowerAtMax": null,
  "capsAndLimits": "Season cap = 10 x season (CURRENT_SEASON=1 -> 10; hard max 50, shared/buildings.ts:77,84-86; DB CHECK level<=50 migrations/0022). Levels carry across seasons (reset 0024 wiped them once for the test reset). Past 10 the table extrapolates x1.3 per level (row(), :136-140). One job per building; timers absolute.",
  "serverGrantPath": "worker/buildings.ts startLevel() (:236-289) via POST /api/base/level (worker/index.ts:2787-2799); settleJobs() (:97-126) folds completion into base_levels on any readBase(); GET /api/base/levels (:2774-2785) reads.",
  "clientScreenPath": "src/live/BaseSheets.tsx DepartmentSheet -> BuildingPanel + ResourcePanels.tsx StockPanel",
  "notes": "costAtLevels and cumulativeCostToMax are Depot-equivalent currency (Tokens or Credits at 1:1) for the resources of the step INTO that level, rounded; cumulativeCostToMax is 2->10 (today's cap). Depot-equivalent 2->50 = 35,729,896. Timer at 50 is a placeholder extrapolation (11057332d 7h 42m). BUILDING-RESOURCES-v1 rows 2-10 match the code exactly."
}
```

```json
{
  "id": "fabrication_shop",
  "displayName": "Base Fabrication Shop",
  "category": "building",
  "currentLevelMin": 1,
  "currentLevelMax": 10,
  "levelCount": 10,
  "playerVisible": true,
  "upgradeCurrency": [
    "fuel",
    "steel",
    "munitions",
    "alloy"
  ],
  "tokenCostRule": "none — building levels never take Tokens; Tokens buy resources at the Depot (100 F / 80 S / 70 M / 60 A per Token, shared/buildings.ts:183-188)",
  "creditCostRule": "none — same; Credits buy resources at the identical Depot rate",
  "equalValueCheck": true,
  "costSourceFile": "shared/buildings.ts:266-288 (buildingStep); tables :208-244",
  "costFormulaOrTable": "cost = round(BASE_ROW.fabrication_shop (:214-230) x DEPT_SCALE[idx] * 1.3^max(0,l-10)); ms = round(PRODUCER_MINUTES[idx] * 1.5^max(0,l-10)) * 60000. Level 2: F 300 / S 300 / M 300 / A 600, 0h 30m. Level 10: F 4,800 / S 4,800 / M 4,800 / A 9,600, 1d 0h 0m. Cum 2->10: F 15,300 / S 15,300 / M 15,300 / A 30,600, 3d 1h 30m of timers. Cum 2->50: F 751,266,890 / S 751,266,890 / M 751,266,890 / A 1,502,533,776, 33171997d 0h 38m.",
  "costAtLevels": {
    "1": null,
    "10": 337,
    "20": 4640,
    "30": 63965,
    "40": 881816,
    "50": 12156578
  },
  "cumulativeCostToMax": 1073,
  "timeCostRule": "PRODUCER_MINUTES[idx] (minutes) x 1.5^max(0,l-10), then x engineerMultiplier(engineer_support_yard) at job start (worker/buildings.ts:267). Level 10 base timer 1d 0h 0m; level 20 57d 15h 58m; level 50 11057332d 7h 42m.",
  "prerequisiteRule": "level N <= buildingCapForSeason(CURRENT_SEASON) (=10 today); command_center >= N; quartermaster_warehouse >= floor(N/2); no running job on this building; a free queue slot (1, or 2 with Second Engineer Team); stock covers cost",
  "effectDescription": "Steel production per hour (PRODUCTION.steel :126).",
  "combatRelevant": false,
  "powerClass": "convenience/production",
  "statOrPowerFieldsChanged": [
    "steel/hour"
  ],
  "powerScoreFormula": null,
  "cumulativePowerAtMax": null,
  "capsAndLimits": "Season cap = 10 x season (CURRENT_SEASON=1 -> 10; hard max 50, shared/buildings.ts:77,84-86; DB CHECK level<=50 migrations/0022). Levels carry across seasons (reset 0024 wiped them once for the test reset). Past 10 the table extrapolates x1.3 per level (row(), :136-140). One job per building; timers absolute.",
  "serverGrantPath": "worker/buildings.ts startLevel() (:236-289) via POST /api/base/level (worker/index.ts:2787-2799); settleJobs() (:97-126) folds completion into base_levels on any readBase(); GET /api/base/levels (:2774-2785) reads.",
  "clientScreenPath": "src/live/BaseSheets.tsx DepartmentSheet -> BuildingPanel + ResourcePanels.tsx StockPanel",
  "notes": "costAtLevels and cumulativeCostToMax are Depot-equivalent currency (Tokens or Credits at 1:1) for the resources of the step INTO that level, rounded; cumulativeCostToMax is 2->10 (today's cap). Depot-equivalent 2->50 = 52,678,119. Timer at 50 is a placeholder extrapolation (11057332d 7h 42m). BUILDING-RESOURCES-v1 rows 2-10 match the code exactly."
}
```

```json
{
  "id": "garrison_barracks",
  "displayName": "Arsenal (id garrison_barracks)",
  "category": "building",
  "currentLevelMin": 1,
  "currentLevelMax": 10,
  "levelCount": 10,
  "playerVisible": true,
  "upgradeCurrency": [
    "fuel",
    "steel",
    "munitions",
    "alloy"
  ],
  "tokenCostRule": "none — building levels never take Tokens; Tokens buy resources at the Depot (100 F / 80 S / 70 M / 60 A per Token, shared/buildings.ts:183-188)",
  "creditCostRule": "none — same; Credits buy resources at the identical Depot rate",
  "equalValueCheck": true,
  "costSourceFile": "shared/buildings.ts:266-288 (buildingStep); tables :208-244",
  "costFormulaOrTable": "cost = round(BASE_ROW.garrison_barracks (:214-230) x DEPT_SCALE[idx] * 1.3^max(0,l-10)); ms = round(PRODUCER_MINUTES[idx] * 1.5^max(0,l-10)) * 60000. Level 2: F 300 / S 300 / M 750 / A 150, 0h 30m. Level 10: F 4,800 / S 4,800 / M 12,000 / A 2,400, 1d 0h 0m. Cum 2->10: F 15,300 / S 15,300 / M 38,250 / A 7,650, 3d 1h 30m of timers. Cum 2->50: F 751,266,890 / S 751,266,890 / M 1,878,167,221 / A 375,633,445, 33171997d 0h 38m.",
  "costAtLevels": {
    "1": null,
    "10": 319,
    "20": 4404,
    "30": 60707,
    "40": 836901,
    "50": 11537397
  },
  "cumulativeCostToMax": 1018,
  "timeCostRule": "PRODUCER_MINUTES[idx] (minutes) x 1.5^max(0,l-10), then x engineerMultiplier(engineer_support_yard) at job start (worker/buildings.ts:267). Level 10 base timer 1d 0h 0m; level 20 57d 15h 58m; level 50 11057332d 7h 42m.",
  "prerequisiteRule": "level N <= buildingCapForSeason(CURRENT_SEASON) (=10 today); command_center >= N; quartermaster_warehouse >= floor(N/2); no running job on this building; a free queue slot (1, or 2 with Second Engineer Team); stock covers cost",
  "effectDescription": "Munitions production per hour (PRODUCTION.munitions :127). Player-facing name is \"Arsenal\" (src/i18n/en/base.ts:10, shared/base.ts:198) though docs call it Garrison Barracks.",
  "combatRelevant": false,
  "powerClass": "convenience/production",
  "statOrPowerFieldsChanged": [
    "munitions/hour"
  ],
  "powerScoreFormula": null,
  "cumulativePowerAtMax": null,
  "capsAndLimits": "Season cap = 10 x season (CURRENT_SEASON=1 -> 10; hard max 50, shared/buildings.ts:77,84-86; DB CHECK level<=50 migrations/0022). Levels carry across seasons (reset 0024 wiped them once for the test reset). Past 10 the table extrapolates x1.3 per level (row(), :136-140). One job per building; timers absolute.",
  "serverGrantPath": "worker/buildings.ts startLevel() (:236-289) via POST /api/base/level (worker/index.ts:2787-2799); settleJobs() (:97-126) folds completion into base_levels on any readBase(); GET /api/base/levels (:2774-2785) reads.",
  "clientScreenPath": "src/live/BaseSheets.tsx DepartmentSheet -> BuildingPanel + ResourcePanels.tsx StockPanel",
  "notes": "costAtLevels and cumulativeCostToMax are Depot-equivalent currency (Tokens or Credits at 1:1) for the resources of the step INTO that level, rounded; cumulativeCostToMax is 2->10 (today's cap). Depot-equivalent 2->50 = 49,995,023. Timer at 50 is a placeholder extrapolation (11057332d 7h 42m). BUILDING-RESOURCES-v1 rows 2-10 match the code exactly."
}
```

```json
{
  "id": "recovery_yard",
  "displayName": "Materials Recovery Yard",
  "category": "building",
  "currentLevelMin": 1,
  "currentLevelMax": 10,
  "levelCount": 10,
  "playerVisible": true,
  "upgradeCurrency": [
    "fuel",
    "steel",
    "munitions",
    "alloy"
  ],
  "tokenCostRule": "none — building levels never take Tokens; Tokens buy resources at the Depot (100 F / 80 S / 70 M / 60 A per Token, shared/buildings.ts:183-188)",
  "creditCostRule": "none — same; Credits buy resources at the identical Depot rate",
  "equalValueCheck": true,
  "costSourceFile": "shared/buildings.ts:266-288 (buildingStep); tables :208-244",
  "costFormulaOrTable": "cost = round(BASE_ROW.recovery_yard (:214-230) x DEPT_SCALE[idx] * 1.3^max(0,l-10)); ms = round(PRODUCER_MINUTES[idx] * 1.5^max(0,l-10)) * 60000. Level 2: F 300 / S 375 / M 150 / A 600, 0h 30m. Level 10: F 4,800 / S 6,000 / M 2,400 / A 9,600, 1d 0h 0m. Cum 2->10: F 15,300 / S 19,125 / M 7,650 / A 30,600, 3d 1h 30m of timers. Cum 2->50: F 751,266,890 / S 939,083,613 / M 375,633,445 / A 1,502,533,776, 33171997d 0h 38m.",
  "costAtLevels": {
    "1": null,
    "10": 317,
    "20": 4374,
    "30": 60300,
    "40": 831287,
    "50": 11460000
  },
  "cumulativeCostToMax": 1011,
  "timeCostRule": "PRODUCER_MINUTES[idx] (minutes) x 1.5^max(0,l-10), then x engineerMultiplier(engineer_support_yard) at job start (worker/buildings.ts:267). Level 10 base timer 1d 0h 0m; level 20 57d 15h 58m; level 50 11057332d 7h 42m.",
  "prerequisiteRule": "level N <= buildingCapForSeason(CURRENT_SEASON) (=10 today); command_center >= N; quartermaster_warehouse >= floor(N/2); no running job on this building; a free queue slot (1, or 2 with Second Engineer Team); stock covers cost",
  "effectDescription": "Alloy production per hour (PRODUCTION.alloy :128).",
  "combatRelevant": false,
  "powerClass": "convenience/production",
  "statOrPowerFieldsChanged": [
    "alloy/hour"
  ],
  "powerScoreFormula": null,
  "cumulativePowerAtMax": null,
  "capsAndLimits": "Season cap = 10 x season (CURRENT_SEASON=1 -> 10; hard max 50, shared/buildings.ts:77,84-86; DB CHECK level<=50 migrations/0022). Levels carry across seasons (reset 0024 wiped them once for the test reset). Past 10 the table extrapolates x1.3 per level (row(), :136-140). One job per building; timers absolute.",
  "serverGrantPath": "worker/buildings.ts startLevel() (:236-289) via POST /api/base/level (worker/index.ts:2787-2799); settleJobs() (:97-126) folds completion into base_levels on any readBase(); GET /api/base/levels (:2774-2785) reads.",
  "clientScreenPath": "src/live/BaseSheets.tsx DepartmentSheet -> BuildingPanel + ResourcePanels.tsx StockPanel",
  "notes": "costAtLevels and cumulativeCostToMax are Depot-equivalent currency (Tokens or Credits at 1:1) for the resources of the step INTO that level, rounded; cumulativeCostToMax is 2->10 (today's cap). Depot-equivalent 2->50 = 49,659,636. Timer at 50 is a placeholder extrapolation (11057332d 7h 42m). BUILDING-RESOURCES-v1 rows 2-10 match the code exactly."
}
```

```json
{
  "id": "quartermaster_warehouse",
  "displayName": "Quartermaster Warehouse",
  "category": "building",
  "currentLevelMin": 1,
  "currentLevelMax": 10,
  "levelCount": 10,
  "playerVisible": true,
  "upgradeCurrency": [
    "fuel",
    "steel",
    "munitions",
    "alloy"
  ],
  "tokenCostRule": "none — building levels never take Tokens; Tokens buy resources at the Depot (100 F / 80 S / 70 M / 60 A per Token, shared/buildings.ts:183-188)",
  "creditCostRule": "none — same; Credits buy resources at the identical Depot rate",
  "equalValueCheck": true,
  "costSourceFile": "shared/buildings.ts:266-288 (buildingStep); tables :208-244",
  "costFormulaOrTable": "cost = round(BASE_ROW.quartermaster_warehouse (:214-230) x DEPT_SCALE[idx] * 1.3^max(0,l-10)); ms = round(DEPT_MINUTES[idx] * 1.5^max(0,l-10)) * 60000. Level 2: F 150 / S 750 / M 150 / A 750, 0h 40m. Level 10: F 2,400 / S 12,000 / M 2,400 / A 12,000, 1d 6h 0m. Cum 2->10: F 7,650 / S 38,250 / M 7,650 / A 38,250, 3d 20h 10m of timers. Cum 2->50: F 375,633,445 / S 1,878,167,221 / M 375,633,445 / A 1,878,167,221, 41464996d 7h 5m.",
  "costAtLevels": {
    "1": null,
    "10": 408,
    "20": 5629,
    "30": 77595,
    "40": 1069707,
    "50": 14746817
  },
  "cumulativeCostToMax": 1301,
  "timeCostRule": "DEPT_MINUTES[idx] (minutes) x 1.5^max(0,l-10), then x engineerMultiplier(engineer_support_yard) at job start (worker/buildings.ts:267). Level 10 base timer 1d 6h 0m; level 20 72d 1h 57m; level 50 13821665d 9h 38m.",
  "prerequisiteRule": "level N <= buildingCapForSeason(CURRENT_SEASON) (=10 today); command_center >= N; exempt from its own Warehouse gate; no running job on this building; a free queue slot (1, or 2 with Second Engineer Team); stock covers cost",
  "effectDescription": "Storage cap per resource for Steel/Munitions/Alloy (WAREHOUSE_CAP :132, x1.3/level past 10; Fuel uncapped via capFor :157-159), raid-protected share (WAREHOUSE_PROTECTED :133, holds 0.8 past 10), and the gate floor(N/2) for every other building's level N (warehouseNeeded :309-311). Depot purchases that would overflow the cap are refused (worker/buildings.ts:322-327).",
  "combatRelevant": false,
  "powerClass": "convenience/production",
  "statOrPowerFieldsChanged": [
    "storage cap",
    "protected share",
    "raid loot exposure"
  ],
  "powerScoreFormula": null,
  "cumulativePowerAtMax": null,
  "capsAndLimits": "Season cap = 10 x season (CURRENT_SEASON=1 -> 10; hard max 50, shared/buildings.ts:77,84-86; DB CHECK level<=50 migrations/0022). Levels carry across seasons (reset 0024 wiped them once for the test reset). Past 10 the table extrapolates x1.3 per level (row(), :136-140). One job per building; timers absolute.",
  "serverGrantPath": "worker/buildings.ts startLevel() (:236-289) via POST /api/base/level (worker/index.ts:2787-2799); settleJobs() (:97-126) folds completion into base_levels on any readBase(); GET /api/base/levels (:2774-2785) reads.",
  "clientScreenPath": "src/live/BaseSheets.tsx DepartmentSheet -> BuildingPanel + ResourcePanels.tsx StockPanel",
  "notes": "costAtLevels and cumulativeCostToMax are Depot-equivalent currency (Tokens or Credits at 1:1) for the resources of the step INTO that level, rounded; cumulativeCostToMax is 2->10 (today's cap). Depot-equivalent 2->50 = 63,902,404. Timer at 50 is a placeholder extrapolation (13821665d 9h 38m). BUILDING-RESOURCES-v1 rows 2-10 match the code exactly."
}
```

```json
{
  "id": "engineer_support_yard",
  "displayName": "Engineer Support Yard",
  "category": "building",
  "currentLevelMin": 1,
  "currentLevelMax": 10,
  "levelCount": 10,
  "playerVisible": true,
  "upgradeCurrency": [
    "fuel",
    "steel",
    "munitions",
    "alloy"
  ],
  "tokenCostRule": "none — building levels never take Tokens; Tokens buy resources at the Depot (100 F / 80 S / 70 M / 60 A per Token, shared/buildings.ts:183-188)",
  "creditCostRule": "none — same; Credits buy resources at the identical Depot rate",
  "equalValueCheck": true,
  "costSourceFile": "shared/buildings.ts:266-288 (buildingStep); tables :208-244",
  "costFormulaOrTable": "cost = round(BASE_ROW.engineer_support_yard (:214-230) x DEPT_SCALE[idx] * 1.3^max(0,l-10)); ms = round(DEPT_MINUTES[idx] * 1.5^max(0,l-10)) * 60000. Level 2: F 300 / S 600 / M 300 / A 600, 0h 40m. Level 10: F 4,800 / S 9,600 / M 4,800 / A 9,600, 1d 6h 0m. Cum 2->10: F 15,300 / S 30,600 / M 15,300 / A 30,600, 3d 20h 10m of timers. Cum 2->50: F 751,266,890 / S 1,502,533,776 / M 751,266,890 / A 1,502,533,776, 41464996d 7h 5m.",
  "costAtLevels": {
    "1": null,
    "10": 397,
    "20": 5467,
    "30": 75368,
    "40": 1039015,
    "50": 14323710
  },
  "cumulativeCostToMax": 1264,
  "timeCostRule": "DEPT_MINUTES[idx] (minutes) x 1.5^max(0,l-10), then x engineerMultiplier(engineer_support_yard) at job start (worker/buildings.ts:267). Level 10 base timer 1d 6h 0m; level 20 72d 1h 57m; level 50 13821665d 9h 38m.",
  "prerequisiteRule": "level N <= buildingCapForSeason(CURRENT_SEASON) (=10 today); command_center >= N; quartermaster_warehouse >= floor(N/2); no running job on this building; a free queue slot (1, or 2 with Second Engineer Team); stock covers cost",
  "effectDescription": "New building timers x(1 - 0.3*(min(10,level)-1)/9) (engineerMultiplier :399-401), applied at job start only (worker/buildings.ts:267). Holds x0.70 past 10. At level 10 the Second Engineer Team can be hired (SECOND_TEAM.requiresEngineerYard :298). Does NOT shorten asset construction timers (worker/season1.ts:214 uses spec.ms unmodified).",
  "combatRelevant": false,
  "powerClass": "convenience/production",
  "statOrPowerFieldsChanged": [
    "building timer multiplier",
    "second queue eligibility"
  ],
  "powerScoreFormula": null,
  "cumulativePowerAtMax": null,
  "capsAndLimits": "Season cap = 10 x season (CURRENT_SEASON=1 -> 10; hard max 50, shared/buildings.ts:77,84-86; DB CHECK level<=50 migrations/0022). Levels carry across seasons (reset 0024 wiped them once for the test reset). Effect ramp clamps at level 10 (ramp(), :378-383): levels 11-50 give nothing. One job per building; timers absolute.",
  "serverGrantPath": "worker/buildings.ts startLevel() (:236-289) via POST /api/base/level (worker/index.ts:2787-2799); settleJobs() (:97-126) folds completion into base_levels on any readBase(); GET /api/base/levels (:2774-2785) reads.",
  "clientScreenPath": "src/live/BaseSheets.tsx DepartmentSheet -> BuildingPanel + ResourcePanels.tsx QueuePanel + SecondTeamPanel",
  "notes": "costAtLevels and cumulativeCostToMax are Depot-equivalent currency (Tokens or Credits at 1:1) for the resources of the step INTO that level, rounded; cumulativeCostToMax is 2->10 (today's cap). Depot-equivalent 2->50 = 62,068,955. Timer at 50 is a placeholder extrapolation (13821665d 9h 38m). BUILDING-RESOURCES-v1 rows 2-10 match the code exactly."
}
```

```json
{
  "id": "depot",
  "displayName": "Depot",
  "category": "building",
  "currentLevelMin": 1,
  "currentLevelMax": 10,
  "levelCount": 10,
  "playerVisible": true,
  "upgradeCurrency": [
    "fuel",
    "steel",
    "munitions",
    "alloy"
  ],
  "tokenCostRule": "none — building levels never take Tokens; Tokens buy resources at the Depot (100 F / 80 S / 70 M / 60 A per Token, shared/buildings.ts:183-188)",
  "creditCostRule": "none — same; Credits buy resources at the identical Depot rate",
  "equalValueCheck": true,
  "costSourceFile": "shared/buildings.ts:266-288 (buildingStep); tables :208-244",
  "costFormulaOrTable": "cost = round(BASE_ROW.depot (:214-230) x DEPT_SCALE[idx] * 1.3^max(0,l-10)); ms = round(DEPT_MINUTES[idx] * 1.5^max(0,l-10)) * 60000. Level 2: F 300 / S 450 / M 450 / A 450, 0h 40m. Level 10: F 4,800 / S 7,200 / M 7,200 / A 7,200, 1d 6h 0m. Cum 2->10: F 15,300 / S 22,950 / M 22,950 / A 22,950, 3d 20h 10m of timers. Cum 2->50: F 751,266,890 / S 1,126,900,334 / M 1,126,900,334 / A 1,126,900,334, 41464996d 7h 5m.",
  "costAtLevels": {
    "1": null,
    "10": 361,
    "20": 4975,
    "30": 68581,
    "40": 945444,
    "50": 13033750
  },
  "cumulativeCostToMax": 1150,
  "timeCostRule": "DEPT_MINUTES[idx] (minutes) x 1.5^max(0,l-10), then x engineerMultiplier(engineer_support_yard) at job start (worker/buildings.ts:267). Level 10 base timer 1d 6h 0m; level 20 72d 1h 57m; level 50 13821665d 9h 38m.",
  "prerequisiteRule": "level N <= buildingCapForSeason(CURRENT_SEASON) (=10 today); command_center >= N; quartermaster_warehouse >= floor(N/2); no running job on this building; a free queue slot (1, or 2 with Second Engineer Team); stock covers cost",
  "effectDescription": "Daily Depot resource caps x(1 + 0.5*(min(10,level)-1)/9) (depotCapMultiplier :404-406; used worker/buildings.ts:335 and ResourcePanels.tsx:132). Rates never change. Holds x1.50 past 10.",
  "combatRelevant": false,
  "powerClass": "convenience/production",
  "statOrPowerFieldsChanged": [
    "daily resource purchase cap"
  ],
  "powerScoreFormula": null,
  "cumulativePowerAtMax": null,
  "capsAndLimits": "Season cap = 10 x season (CURRENT_SEASON=1 -> 10; hard max 50, shared/buildings.ts:77,84-86; DB CHECK level<=50 migrations/0022). Levels carry across seasons (reset 0024 wiped them once for the test reset). Effect ramp clamps at level 10 (ramp(), :378-383): levels 11-50 give nothing. One job per building; timers absolute.",
  "serverGrantPath": "worker/buildings.ts startLevel() (:236-289) via POST /api/base/level (worker/index.ts:2787-2799); settleJobs() (:97-126) folds completion into base_levels on any readBase(); GET /api/base/levels (:2774-2785) reads.",
  "clientScreenPath": "src/live/BaseSheets.tsx DepotSheet (Supplies tab) -> BuildingPanel + ResourcePanels.tsx ResourceShop",
  "notes": "costAtLevels and cumulativeCostToMax are Depot-equivalent currency (Tokens or Credits at 1:1) for the resources of the step INTO that level, rounded; cumulativeCostToMax is 2->10 (today's cap). Depot-equivalent 2->50 = 56,479,172. Timer at 50 is a placeholder extrapolation (13821665d 9h 38m). BUILDING-RESOURCES-v1 rows 2-10 match the code exactly."
}
```

```json
{
  "id": "alliance_trading_post",
  "displayName": "Alliance Trading Post",
  "category": "building",
  "currentLevelMin": 1,
  "currentLevelMax": 10,
  "levelCount": 10,
  "playerVisible": true,
  "upgradeCurrency": [
    "fuel",
    "steel",
    "munitions",
    "alloy"
  ],
  "tokenCostRule": "none — building levels never take Tokens; Tokens buy resources at the Depot (100 F / 80 S / 70 M / 60 A per Token, shared/buildings.ts:183-188)",
  "creditCostRule": "none — same; Credits buy resources at the identical Depot rate",
  "equalValueCheck": true,
  "costSourceFile": "shared/buildings.ts:266-288 (buildingStep); tables :208-244",
  "costFormulaOrTable": "cost = round(BASE_ROW.alliance_trading_post (:214-230) x DEPT_SCALE[idx] * 1.3^max(0,l-10)); ms = round(DEPT_MINUTES[idx] * 1.5^max(0,l-10)) * 60000. Level 2: F 450 / S 300 / M 300 / A 450, 0h 40m. Level 10: F 7,200 / S 4,800 / M 4,800 / A 7,200, 1d 6h 0m. Cum 2->10: F 22,950 / S 15,300 / M 15,300 / A 22,950, 3d 20h 10m of timers. Cum 2->50: F 1,126,900,334 / S 751,266,890 / M 751,266,890 / A 1,126,900,334, 41464996d 7h 5m.",
  "costAtLevels": {
    "1": null,
    "10": 321,
    "20": 4419,
    "30": 60924,
    "40": 839896,
    "50": 11578676
  },
  "cumulativeCostToMax": 1022,
  "timeCostRule": "DEPT_MINUTES[idx] (minutes) x 1.5^max(0,l-10), then x engineerMultiplier(engineer_support_yard) at job start (worker/buildings.ts:267). Level 10 base timer 1d 6h 0m; level 20 72d 1h 57m; level 50 13821665d 9h 38m.",
  "prerequisiteRule": "level N <= buildingCapForSeason(CURRENT_SEASON) (=10 today); command_center >= N; quartermaster_warehouse >= floor(N/2); no running job on this building; a free queue slot (1, or 2 with Second Engineer Team); stock covers cost",
  "effectDescription": "tradingOffers(level) = level open barter offers (shared/buildings.ts:414-416) — computed and printed in effectLine only; barter is not built. No live effect.",
  "combatRelevant": false,
  "powerClass": "convenience/production",
  "statOrPowerFieldsChanged": [],
  "powerScoreFormula": null,
  "cumulativePowerAtMax": null,
  "capsAndLimits": "Season cap = 10 x season (CURRENT_SEASON=1 -> 10; hard max 50, shared/buildings.ts:77,84-86; DB CHECK level<=50 migrations/0022). Levels carry across seasons (reset 0024 wiped them once for the test reset).  One job per building; timers absolute.",
  "serverGrantPath": "worker/buildings.ts startLevel() (:236-289) via POST /api/base/level (worker/index.ts:2787-2799); settleJobs() (:97-126) folds completion into base_levels on any readBase(); GET /api/base/levels (:2774-2785) reads.",
  "clientScreenPath": "src/live/BaseSheets.tsx DepartmentSheet -> BuildingPanel",
  "notes": "costAtLevels and cumulativeCostToMax are Depot-equivalent currency (Tokens or Credits at 1:1) for the resources of the step INTO that level, rounded; cumulativeCostToMax is 2->10 (today's cap). Depot-equivalent 2->50 = 50,173,896. Timer at 50 is a placeholder extrapolation (13821665d 9h 38m). BUILDING-RESOURCES-v1 rows 2-10 match the code exactly."
}
```

```json
{
  "id": "depot_resource_fuel",
  "displayName": "Depot Supplies: fuel",
  "category": "other",
  "currentLevelMin": 0,
  "currentLevelMax": 0,
  "levelCount": 0,
  "playerVisible": true,
  "upgradeCurrency": [
    "credits",
    "tokens"
  ],
  "tokenCostRule": "1 Token = 100 fuel (RESOURCE_PER_UNIT.fuel, shared/buildings.ts:183-188); purchase rounded DOWN to whole currency units (worker/buildings.ts:317-319)",
  "creditCostRule": "1 Credit = 100 fuel; any split accepted (splitIsValid, shared/economy.ts:137-141); Credits first by default (defaultSplit :149-152)",
  "equalValueCheck": true,
  "costSourceFile": "shared/buildings.ts:183-196",
  "costFormulaOrTable": "units = floor(amount / 100); bought = units * 100; price = units (Tokens+Credits). Daily cap 20,000 fuel/game day at Depot 1 (= 200 currency), floor(20,000 * depotCapMultiplier(depot)) -> 30,000 at Depot 10 (= 300 currency).",
  "costAtLevels": {
    "1": null,
    "10": null,
    "20": null,
    "30": null,
    "40": null,
    "50": null
  },
  "cumulativeCostToMax": null,
  "timeCostRule": null,
  "prerequisiteRule": "stock + bought <= capFor(fuel) (Fuel is uncapped so never refused for storage); today's purchases + bought <= daily cap; wallet covers split",
  "effectDescription": "Adds fuel to the base stock (bases.fuel) immediately.",
  "combatRelevant": true,
  "powerClass": "consumable",
  "statOrPowerFieldsChanged": [
    "bases.fuel"
  ],
  "powerScoreFormula": null,
  "cumulativePowerAtMax": null,
  "capsAndLimits": "Per game day (gameDayStart, 00:00 RST, shared/gametime.ts:116-119) per resource, tallied in depot_purchases(player_id, day, resource) whatever the currency mix (worker/buildings.ts:328-339, migrations/0023). Depot level raises the cap up to x1.5. All four caps together = 800 currency/day at Depot 1, 1,200/day at Depot 10.",
  "serverGrantPath": "worker/buildings.ts buyResource() (:306-372) via POST /api/depot/resources (worker/index.ts:2801-2815); ledger kind \"resources\"",
  "clientScreenPath": "src/live/ResourcePanels.tsx ResourceShop (Depot sheet, Supplies tab; BaseSheets.tsx:203-211)",
  "notes": "Client default is 10 units per tap (ResourcePanels.tsx:101). The four rates are hardcoded in shared/buildings.ts, not shared/economy.ts."
}
```

```json
{
  "id": "depot_resource_steel",
  "displayName": "Depot Supplies: steel",
  "category": "other",
  "currentLevelMin": 0,
  "currentLevelMax": 0,
  "levelCount": 0,
  "playerVisible": true,
  "upgradeCurrency": [
    "credits",
    "tokens"
  ],
  "tokenCostRule": "1 Token = 80 steel (RESOURCE_PER_UNIT.steel, shared/buildings.ts:183-188); purchase rounded DOWN to whole currency units (worker/buildings.ts:317-319)",
  "creditCostRule": "1 Credit = 80 steel; any split accepted (splitIsValid, shared/economy.ts:137-141); Credits first by default (defaultSplit :149-152)",
  "equalValueCheck": true,
  "costSourceFile": "shared/buildings.ts:183-196",
  "costFormulaOrTable": "units = floor(amount / 80); bought = units * 80; price = units (Tokens+Credits). Daily cap 16,000 steel/game day at Depot 1 (= 200 currency), floor(16,000 * depotCapMultiplier(depot)) -> 24,000 at Depot 10 (= 300 currency).",
  "costAtLevels": {
    "1": null,
    "10": null,
    "20": null,
    "30": null,
    "40": null,
    "50": null
  },
  "cumulativeCostToMax": null,
  "timeCostRule": null,
  "prerequisiteRule": "stock + bought <= capFor(steel) (Warehouse cap); today's purchases + bought <= daily cap; wallet covers split",
  "effectDescription": "Adds steel to the base stock (bases.steel) immediately.",
  "combatRelevant": false,
  "powerClass": "consumable",
  "statOrPowerFieldsChanged": [
    "bases.steel"
  ],
  "powerScoreFormula": null,
  "cumulativePowerAtMax": null,
  "capsAndLimits": "Per game day (gameDayStart, 00:00 RST, shared/gametime.ts:116-119) per resource, tallied in depot_purchases(player_id, day, resource) whatever the currency mix (worker/buildings.ts:328-339, migrations/0023). Depot level raises the cap up to x1.5. All four caps together = 800 currency/day at Depot 1, 1,200/day at Depot 10.",
  "serverGrantPath": "worker/buildings.ts buyResource() (:306-372) via POST /api/depot/resources (worker/index.ts:2801-2815); ledger kind \"resources\"",
  "clientScreenPath": "src/live/ResourcePanels.tsx ResourceShop (Depot sheet, Supplies tab; BaseSheets.tsx:203-211)",
  "notes": "Client default is 10 units per tap (ResourcePanels.tsx:101). The four rates are hardcoded in shared/buildings.ts, not shared/economy.ts."
}
```

```json
{
  "id": "depot_resource_munitions",
  "displayName": "Depot Supplies: munitions",
  "category": "other",
  "currentLevelMin": 0,
  "currentLevelMax": 0,
  "levelCount": 0,
  "playerVisible": true,
  "upgradeCurrency": [
    "credits",
    "tokens"
  ],
  "tokenCostRule": "1 Token = 70 munitions (RESOURCE_PER_UNIT.munitions, shared/buildings.ts:183-188); purchase rounded DOWN to whole currency units (worker/buildings.ts:317-319)",
  "creditCostRule": "1 Credit = 70 munitions; any split accepted (splitIsValid, shared/economy.ts:137-141); Credits first by default (defaultSplit :149-152)",
  "equalValueCheck": true,
  "costSourceFile": "shared/buildings.ts:183-196",
  "costFormulaOrTable": "units = floor(amount / 70); bought = units * 70; price = units (Tokens+Credits). Daily cap 14,000 munitions/game day at Depot 1 (= 200 currency), floor(14,000 * depotCapMultiplier(depot)) -> 21,000 at Depot 10 (= 300 currency).",
  "costAtLevels": {
    "1": null,
    "10": null,
    "20": null,
    "30": null,
    "40": null,
    "50": null
  },
  "cumulativeCostToMax": null,
  "timeCostRule": null,
  "prerequisiteRule": "stock + bought <= capFor(munitions) (Warehouse cap); today's purchases + bought <= daily cap; wallet covers split",
  "effectDescription": "Adds munitions to the base stock (bases.munitions) immediately.",
  "combatRelevant": false,
  "powerClass": "consumable",
  "statOrPowerFieldsChanged": [
    "bases.munitions"
  ],
  "powerScoreFormula": null,
  "cumulativePowerAtMax": null,
  "capsAndLimits": "Per game day (gameDayStart, 00:00 RST, shared/gametime.ts:116-119) per resource, tallied in depot_purchases(player_id, day, resource) whatever the currency mix (worker/buildings.ts:328-339, migrations/0023). Depot level raises the cap up to x1.5. All four caps together = 800 currency/day at Depot 1, 1,200/day at Depot 10.",
  "serverGrantPath": "worker/buildings.ts buyResource() (:306-372) via POST /api/depot/resources (worker/index.ts:2801-2815); ledger kind \"resources\"",
  "clientScreenPath": "src/live/ResourcePanels.tsx ResourceShop (Depot sheet, Supplies tab; BaseSheets.tsx:203-211)",
  "notes": "Client default is 10 units per tap (ResourcePanels.tsx:101). The four rates are hardcoded in shared/buildings.ts, not shared/economy.ts."
}
```

```json
{
  "id": "depot_resource_alloy",
  "displayName": "Depot Supplies: alloy",
  "category": "other",
  "currentLevelMin": 0,
  "currentLevelMax": 0,
  "levelCount": 0,
  "playerVisible": true,
  "upgradeCurrency": [
    "credits",
    "tokens"
  ],
  "tokenCostRule": "1 Token = 60 alloy (RESOURCE_PER_UNIT.alloy, shared/buildings.ts:183-188); purchase rounded DOWN to whole currency units (worker/buildings.ts:317-319)",
  "creditCostRule": "1 Credit = 60 alloy; any split accepted (splitIsValid, shared/economy.ts:137-141); Credits first by default (defaultSplit :149-152)",
  "equalValueCheck": true,
  "costSourceFile": "shared/buildings.ts:183-196",
  "costFormulaOrTable": "units = floor(amount / 60); bought = units * 60; price = units (Tokens+Credits). Daily cap 12,000 alloy/game day at Depot 1 (= 200 currency), floor(12,000 * depotCapMultiplier(depot)) -> 18,000 at Depot 10 (= 300 currency).",
  "costAtLevels": {
    "1": null,
    "10": null,
    "20": null,
    "30": null,
    "40": null,
    "50": null
  },
  "cumulativeCostToMax": null,
  "timeCostRule": null,
  "prerequisiteRule": "stock + bought <= capFor(alloy) (Warehouse cap); today's purchases + bought <= daily cap; wallet covers split",
  "effectDescription": "Adds alloy to the base stock (bases.alloy) immediately.",
  "combatRelevant": false,
  "powerClass": "consumable",
  "statOrPowerFieldsChanged": [
    "bases.alloy"
  ],
  "powerScoreFormula": null,
  "cumulativePowerAtMax": null,
  "capsAndLimits": "Per game day (gameDayStart, 00:00 RST, shared/gametime.ts:116-119) per resource, tallied in depot_purchases(player_id, day, resource) whatever the currency mix (worker/buildings.ts:328-339, migrations/0023). Depot level raises the cap up to x1.5. All four caps together = 800 currency/day at Depot 1, 1,200/day at Depot 10.",
  "serverGrantPath": "worker/buildings.ts buyResource() (:306-372) via POST /api/depot/resources (worker/index.ts:2801-2815); ledger kind \"resources\"",
  "clientScreenPath": "src/live/ResourcePanels.tsx ResourceShop (Depot sheet, Supplies tab; BaseSheets.tsx:203-211)",
  "notes": "Client default is 10 units per tap (ResourcePanels.tsx:101). The four rates are hardcoded in shared/buildings.ts, not shared/economy.ts."
}
```

```json
{
  "id": "second_engineer_team",
  "displayName": "Second Engineer Team (permanent second build queue)",
  "category": "queue",
  "currentLevelMin": 0,
  "currentLevelMax": 1,
  "levelCount": 1,
  "playerVisible": true,
  "upgradeCurrency": [
    "steel",
    "alloy",
    "credits",
    "tokens"
  ],
  "tokenCostRule": "1500 in any Tokens/Credits split (SECOND_TEAM.currency, shared/buildings.ts:300) plus resources",
  "creditCostRule": "same 1500, Credits first by default",
  "equalValueCheck": true,
  "costSourceFile": "shared/buildings.ts:297-302",
  "costFormulaOrTable": "SECOND_TEAM = {requiresEngineerYard: 10, cost: F 0 / S 12,000 / M 0 / A 12,000, currency: 1500, ms: 24h}. Resource part is Depot-equivalent 350 currency, so the all-in Depot-equivalent price is 1850.",
  "costAtLevels": {
    "1": 1500,
    "10": null,
    "20": null,
    "30": null,
    "40": null,
    "50": null
  },
  "cumulativeCostToMax": 1500,
  "timeCostRule": "24h fixed (SECOND_TEAM.ms); queues becomes 2 only once second_team_at <= now (worker/buildings.ts:184)",
  "prerequisiteRule": "engineer_support_yard >= 10; not already bought (players.second_team_at IS NULL); stock covers 12,000 S + 12,000 A; wallet covers 1,500",
  "effectDescription": "Two building jobs may run at once, permanently (worker/buildings.ts:253-261, 281).",
  "combatRelevant": false,
  "powerClass": "convenience/production",
  "statOrPowerFieldsChanged": [
    "queues"
  ],
  "powerScoreFormula": null,
  "cumulativePowerAtMax": null,
  "capsAndLimits": "One per account; never expires; reset by migration 0024 (second_team_at = NULL).",
  "serverGrantPath": "worker/buildings.ts buySecondTeam() (:378-423) via POST /api/base/second-team (worker/index.ts:2817-2829); ledger kind \"second_team\"",
  "clientScreenPath": "src/live/ResourcePanels.tsx SecondTeamPanel (Engineer Support Yard DepartmentSheet, BaseSheets.tsx:261-266)",
  "notes": "costAtLevels[\"1\"] = the currency part only. A mixed resource+currency price; the only building-side item that takes currency directly. The 1,500 is a literal outside shared/economy.ts. Asset construction (asset_builds) has its own separate one-at-a-time queue and is NOT widened by this."
}
```

```json
{
  "id": "asset_construction",
  "displayName": "Asset construction (weekly blueprints built at the category hub)",
  "category": "other",
  "currentLevelMin": 0,
  "currentLevelMax": 1,
  "levelCount": 1,
  "playerVisible": true,
  "upgradeCurrency": [
    "fuel",
    "steel",
    "munitions",
    "alloy"
  ],
  "tokenCostRule": "none (resources only)",
  "creditCostRule": "none (resources only)",
  "equalValueCheck": true,
  "costSourceFile": "shared/construction.ts:19-25 BUILD_BY_CATEGORY",
  "costFormulaOrTable": "One flat cost and timer per category for all of Season 1, no scaling by tier/week: armour: F 800 / S 2,400 / M 900 / A 500 (Depot-eq 59), 6h 0m; artillery: F 700 / S 600 / M 2,400 / A 900 (Depot-eq 64), 5h 30m; fixed_wing: F 2,200 / S 700 / M 900 / A 1,200 (Depot-eq 64), 7h 0m; rotary: F 1,600 / S 650 / M 700 / A 1,800 (Depot-eq 64), 6h 30m; drone: F 900 / S 450 / M 700 / A 2,400 (Depot-eq 65), 5h 0m. Naval: unbuildable.",
  "costAtLevels": {
    "1": null,
    "10": null,
    "20": null,
    "30": null,
    "40": null,
    "50": null
  },
  "cumulativeCostToMax": null,
  "timeCostRule": "5h-7h by category (BUILD_BY_CATEGORY[c].ms); NOT reduced by the Engineer Support Yard (worker/season1.ts:214)",
  "prerequisiteRule": "not owned; no other asset_build running (one at a time, unique index idx_asset_builds_one_running, migrations/0025); isUnlocked: max(seasonWeek(now), command_center) >= unlock week (shared/season.ts:60-63); hub level >= unlock week (levelNeeded, shared/construction.ts:44-46); stock covers cost",
  "effectDescription": "Inserts player_assets row at rank 1 when the timer lands (worker/season1.ts:70-94). Six starters are owned at signup and skip this.",
  "combatRelevant": true,
  "powerClass": "combat",
  "statOrPowerFieldsChanged": [
    "roster (new asset at rank 1)"
  ],
  "powerScoreFormula": "assetPowerWith(asset, 1, NO_PACKAGES, categoryBoost) added to roster power",
  "cumulativePowerAtMax": null,
  "capsAndLimits": "54 non-starter assets on the Season 1 schedule (UNLOCK_WEEK, shared/season.ts:36-47), weeks 2-10; one build at a time per player; timers absolute.",
  "serverGrantPath": "worker/season1.ts startBuild() (:169-220) + settleBuild() (:70-94) via POST /api/assets/build (worker/index.ts:2716-2722)",
  "clientScreenPath": "src/live/Assets.tsx unlockLabel()/Card (:85-120, :332) — the hub building view",
  "notes": "The hub level gate means week-10 blueprints need hub level 10 (the Season 1 cap). Costs are a fixed table with no level dimension, hence costAtLevels null."
}
```

```json
{
  "id": "task_force_delta_purchase",
  "displayName": "Task Force Delta (bought)",
  "category": "other",
  "currentLevelMin": 0,
  "currentLevelMax": 1,
  "levelCount": 1,
  "playerVisible": true,
  "upgradeCurrency": [
    "credits",
    "tokens"
  ],
  "tokenCostRule": "2500 in any split (DELTA_PRICE shared/season.ts:78)",
  "creditCostRule": "2500, Credits first by default",
  "equalValueCheck": true,
  "costSourceFile": "shared/season.ts:77-79",
  "costFormulaOrTable": "DELTA_BUY_LEVEL = 10; DELTA_PRICE = 2500; DELTA_FREE_RANK = 20",
  "costAtLevels": {
    "1": 2500,
    "10": null,
    "20": null,
    "30": null,
    "40": null,
    "50": null
  },
  "cumulativeCostToMax": 2500,
  "timeCostRule": null,
  "prerequisiteRule": "command_center >= 10; players.delta_at IS NULL; wallet covers 2500",
  "effectDescription": "Opens the fourth Task Force (six more squad slots that can march/attack). Sets players.delta_at (migrations/0027).",
  "combatRelevant": true,
  "powerClass": "combat",
  "statOrPowerFieldsChanged": [
    "Task Force count (4th squad of 6 slots)"
  ],
  "powerScoreFormula": null,
  "cumulativePowerAtMax": null,
  "capsAndLimits": "One-time, permanent. Alternative free path: CC >= 20 AND Alpha/Bravo/Charlie each full (6) AND every asset in them rank >= 20 (deltaEarned shared/season.ts:82-93, worker/squads.ts:134-152; written to delta_at once true). The free path is unreachable in Season 1 (CC cap 10, rank cap 10).",
  "serverGrantPath": "worker/season1.ts buyDelta() (:331-360) via POST /api/squads/delta (worker/index.ts:2739-2747); ledger kind \"delta\"; deltaOpen() worker/squads.ts:134-152 gates assign/move",
  "clientScreenPath": "src/live/Squads.tsx:418-475 (Buy Delta button when cc >= 10)",
  "notes": "Literal price outside shared/economy.ts. The purchase check reads CC from base_levels directly (readLevels), not via readBase, so a CC job that has completed but not yet been folded in is not counted until any readBase() runs."
}
```

```json
{
  "id": "task_force_unlocks",
  "displayName": "Task Force unlocks (Alpha/Bravo/Charlie/Delta-earned)",
  "category": "other",
  "currentLevelMin": 1,
  "currentLevelMax": 4,
  "levelCount": 4,
  "playerVisible": true,
  "upgradeCurrency": [],
  "tokenCostRule": "none",
  "creditCostRule": "none",
  "equalValueCheck": true,
  "costSourceFile": "shared/season.ts:71-98",
  "costFormulaOrTable": "TASK_FORCE_UNLOCK = {\"Alpha\":1,\"Bravo\":5,\"Charlie\":10,\"Delta\":20}; taskForceOpen(squad, cc, deltaOpen) = squad==='Delta' ? deltaOpen : cc >= TASK_FORCE_UNLOCK[squad]",
  "costAtLevels": {
    "1": null,
    "10": null,
    "20": null,
    "30": null,
    "40": null,
    "50": null
  },
  "cumulativeCostToMax": null,
  "timeCostRule": null,
  "prerequisiteRule": "Command Center level; see Delta row for the earned path",
  "effectDescription": "Which squads accept assignments/moves (worker/squads.ts:209, 308) and can march.",
  "combatRelevant": true,
  "powerClass": "combat",
  "statOrPowerFieldsChanged": [
    "squads available"
  ],
  "powerScoreFormula": null,
  "cumulativePowerAtMax": null,
  "capsAndLimits": "In Season 1 (CC cap 10): Alpha, Bravo (CC 5), Charlie (CC 10), Delta only by purchase.",
  "serverGrantPath": "worker/squads.ts assignSlot()/moveSlot() gate; deltaOpen() writes delta_at; GET /api/squads returns deltaOpen (worker/index.ts:1158)",
  "clientScreenPath": "src/live/Squads.tsx:418 (taskForceOpen) and BaseBoard.tsx Task Force slabs",
  "notes": "docs/BUILDING-EFFECTS-v1.md:514 ruling text says Charlie 15 / Delta 25; code says 10 / 20."
}
```

```json
{
  "id": "attack_fuel",
  "displayName": "Attack Fuel (per march)",
  "category": "other",
  "currentLevelMin": 0,
  "currentLevelMax": 0,
  "levelCount": 0,
  "playerVisible": true,
  "upgradeCurrency": [
    "fuel"
  ],
  "tokenCostRule": "none directly (Fuel is Depot-purchasable at 100/unit)",
  "creditCostRule": "none directly",
  "equalValueCheck": true,
  "costSourceFile": "shared/march.ts:116-120",
  "costFormulaOrTable": "attackFuel(units) = round(100 + 20 * units); 6-asset squad = 220 Fuel (= 2.2 currency at Depot rate)",
  "costAtLevels": {
    "1": null,
    "10": null,
    "20": null,
    "30": null,
    "40": null,
    "50": null
  },
  "cumulativeCostToMax": null,
  "timeCostRule": null,
  "prerequisiteRule": "bases.fuel >= attackFuel at launch (worker/march.ts:311-326); reinforcing is free",
  "effectDescription": "Consumed per attack march; nothing else.",
  "combatRelevant": true,
  "powerClass": "consumable",
  "statOrPowerFieldsChanged": [
    "bases.fuel"
  ],
  "powerScoreFormula": null,
  "cumulativePowerAtMax": null,
  "capsAndLimits": "None. Fuel stock is uncapped.",
  "serverGrantPath": "worker/march.ts launch() (:311-326) via POST /api/attack",
  "clientScreenPath": "src/live/WorldMap.tsx:1779 (fuel shown on the attack panel)",
  "notes": "Included because it is the only per-use sink of a base resource outside construction."
}
```


## 3. notBuiltYet (in scope)

| Thing | Where referenced | Status in code |
|---|---|---|
| Season Readiness Band (effective level clamp on battles) | `docs/progression/07-READINESS-BAND-AND-CONTRIBUTION.md`; comment `shared/assets.ts:1148`; bots honour a "band" via `bandCeiling()` `worker/bots.ts:132-137` (= `seasonWeek + 1`) | **Not built for players.** No `readiness_band` column, no `season_windows` table, no clamp in `worker/march.ts` battle assembly (grep for `readiness` finds only the comment and the bot pacing). The only enforced season caps are `buildingCapForSeason` (buildings, 10) and `maxRankForSeason` (ranks, 10, `shared/assets.ts:184-186`). |
| Season progression past 1 | `shared/buildings.ts:84-86`, `worker/index.ts:1198` `CURRENT_SEASON = 1` | A constant; no season row/phase table. Levels 11-50 are reachable only by editing the constant. |
| Alliance Trading Post barter | `shared/buildings.ts:413-416`, `docs/BUILDING-EFFECTS-v1.md:467-497`, `src/live/BaseSheets.tsx:272-277`, blurb `src/i18n/en/base.ts:25` | Offer count computed and printed; no offers table, no route. |
| Depot tabs: Modules, Cosmetics, Services (beyond shields) | `src/live/BaseSheets.tsx:212-239`, `src/i18n/en/base.ts:66-68` ("Ordnance, Protection, Powertrain and Electronic modules", "relocation charges") | `Soon` placeholders. |
| Command Center tabs: Events, Wars | `src/live/BaseSheets.tsx:137-138`, `src/i18n/en/base.ts:55-56` | `Soon` placeholders. |
| Combat Systems / battle reports / scout reports at the TOC; alerts/scouting/chat range at Signals | blurbs `src/i18n/en/base.ts:17-18` | Not built (Signals only filters the map). |
| Ledgers / raid report / operations history per building | `docs/BUILDING-EFFECTS-v1.md` "Holds" lists | Not built. |
| Daily tasks that award Fuel | `src/live/ResourcePanels.tsx:65` copy, `docs/BUILDING-RESOURCES-v1.md:348` | Not built. |
| Docs' §3 Token/Credit price table for hub levels (40..700 Tokens / 4× Credits) and the 750-Token 7-day second queue | `docs/ASSET-BUILDING-UPGRADES-v1.md:19-40` | Superseded by owner rulings (`:81-87`); nothing in code. |
| Level-0 base production/storage ("50 F / 35 S / 30 M / 25 A, 3,000 storage") | `docs/BUILDING-RESOURCES-v1.md:22` | Not in code (start is level 1: 250/180/150/120, 6,000). |
| Legacy Gemini-era base (`buildings`, `build_jobs` tables; `worker/game.ts` `BUILDINGS`, `upgradeCost`, `totalPower`, `STORAGE_CAP`) | `worker/game.ts:12-159`; still seeded at signup `worker/index.ts:232-238`; still read and echoed by `GET /api/base` (`settleAndLoad` `:277-332`, `baseView` `:334-372` → `buildings[].nextCost`) and `GET /api/squads` (`:1161-1165`) | **Dead but live**: no route lets a player start a legacy upgrade (there is no `/api/base/upgrade`), `totalPower` is imported (`:150`) but never called, and migration 0024 says "nothing reads a row from them any more" — yet `settleAndLoad` still does. `src/net/api.ts:132` still types `nextCost`. |

## 4. powerDiscrepancies

Every live power figure derives from one function, `assetPowerWith()` `shared/upgrades.ts:145-153`:
`round(6 * Σ(firepower, armour, mobility, range, detection))` where each attribute = `milli(attributeAtLevel(base, rank) * hubBoost + systemIntegration + packagePoints)` (`attributesWith` `:121-142`; `attributeAtLevel` `shared/assets.ts:1186-1188` = `base * 1.045^(rank-1+floor(rank/10))`).

| Place | Formula / inputs | Agrees? |
|---|---|---|
| Profile power (`worker/profile.ts:103,116`) and alliance roster (`worker/alliance.ts:113-124`) and alliance browse sum (`worker/index.ts:1732-1750`) | `powerOf()` `worker/power.ts:16-66`: Σ over **every held asset** (roster, not squads) of `assetPowerWith(asset, level, packages, categoryBoost(levels))`, rounded once at the end (`:62`) | Yes — same function, same boost. Note it sums the whole roster, so profile power ≠ Σ squad power. |
| Squad header power (`GET /api/squads` `worker/index.ts:1151-1153` → `squadPower` `worker/squads.ts:267-280`) | Σ over the six slots of `assetPowerWith(asset, held.level ?? 1, held.packages, categoryBoost(levels))` | Yes. |
| Battle record `attacker_power`/`defender_power` (`worker/march.ts:664-691`) | Σ `assetPowerWith(asset, u.level, u.packages ?? BARE, u.boost ?? 1)` over the marched/defending units; `u.boost` is each unit **owner's** hub boost captured at launch/settle (`rosterOf` `:136-155`) | Yes (same function). Units are captured at launch, so a hub level that finishes mid-flight does not change the fight. |
| Client asset card (`src/live/AssetUpgrade.tsx:243`, `Assets.tsx:465,491`) | `assetPowerWith(asset, held.level, held.packages, categoryBoost(base.levels))` — display only | Yes. |
| World map | Shows the Command Center level as the base `level` (`worker/world.ts:168-175`), **not power**. `src/live/WorldMap.tsx:1777` shows the viewer's own squad power from `/api/squads`. | N/A — no power computed. |
| Alliance applications list (`worker/index.ts:1634-1651`) | `power: 0` hardcoded | **Disagrees** (placeholder zero). |
| `shared/assets.ts:1191-1200` `assetPower(asset, level)` | Rank only — no hub boost, no packages, no integration | **Second definition**, only used by `scripts/simulate.mjs:141,730`; would disagree if ever used for a live number. |
| `worker/game.ts:106-113` `totalPower(levels)` | `Σ round(level^1.6 × POWER_WEIGHT[kind])` over the six legacy buildings | **Third definition**, imported at `worker/index.ts:150` but never called. |
| Combat resolver | uses `attributesWith()` per attribute, not the power scalar (`worker/march.ts:296-299` for march pace; resolver in `shared/combat.ts` — outside this scope) | Consistent inputs (same boost). |

Boost-related discrepancies with docs: hub boost is `1.02^(L-1)` in code vs `1.02^L` in `docs/BUILDING-EFFECTS-v1.md` tables and `docs/ASSET-BUILDING-UPGRADES-v1.md:5,11` (owner ruling wins). The docs' "stacking order" `base × 1.045^(rank-1) × 1.02^L × packageMultiplier` is not what code does either: packages are **additive points** (`PACKAGE_POINTS_PER_RANK = 0.14`, `shared/upgrades.ts:90`) added after the boost, and milestones double a rank step (`shared/assets.ts:1183`).

## 5. hardcodedPrices (literals outside `shared/economy.ts`, in scope)

| Literal | File:line | 1:1? | Comment |
|---|---|---|---|
| `RESOURCE_PER_UNIT = {fuel:100, steel:80, munitions:70, alloy:60}` | `shared/buildings.ts:183-188` | yes (same rate for Tokens and Credits) | The only currency→resource exchange. |
| `DAILY_RESOURCE_CAP = {20000, 16000, 14000, 12000}` | `shared/buildings.ts:191-196` | n/a | Daily caps; ×`depotCapMultiplier`. |
| `SECOND_TEAM.currency = 1500` (+ 12,000 S + 12,000 A) | `shared/buildings.ts:297-302` | yes | Mixed resource+currency price. |
| `DELTA_PRICE = 2500` | `shared/season.ts:78` | yes | |
| `DELTA_BUY_LEVEL = 10`, `DELTA_FREE_RANK = 20`, `TASK_FORCE_UNLOCK` | `shared/season.ts:71-79` | n/a | Gates. |
| Building cost tables (`HUB_SCALE`, `DEPT_SCALE`, `*_MINUTES`, `BASE_ROW`, `COMMAND_CENTER_ROWS`) and the `1.3` / `1.5` extrapolation constants | `shared/buildings.ts:208-244, 273-274, 285-286` | n/a (resources) | The `1.3` cost growth and `1.5` time growth appear as bare literals in `buildingStep`, and `1.3` again in `productionPerHour`/`storageCap` (`:144,149`). |
| `BUILD_BY_CATEGORY` asset construction costs/timers | `shared/construction.ts:19-25` | n/a (resources) | |
| `ATTACK_FUEL_BASE = 100`, `ATTACK_FUEL_PER_UNIT = 20` | `shared/march.ts:116-117` | n/a | |
| Legacy `upgradeCost()` (`base 260/140 × 1.55^level`), `upgradeDurationMs()`, `STORAGE_CAP`, `productionPerHour` | `worker/game.ts:120-159` | n/a | Dead code still exported over `GET /api/base`. |
| Paid shield 1,500 (`paid72`) etc. | `shared/shields.ts:21` | (out of scope, noted) | |
| Duplicated rule text: the "Need N more X. Produce it at … or buy it at the Depot." message is built independently in `worker/buildings.ts:198-205` and `src/live/BuildingPanel.tsx:164-169`; the queue-busy strings likewise (`worker/buildings.ts:257-259` vs `BuildingPanel.tsx:160-162`). | | | Not a price, but a duplicated rule that can drift. |

No item in scope is priced differently in Tokens vs Credits; every currency spend goes through `splitIsValid`/`defaultSplit` (`shared/economy.ts:137-152`) with a single price.

## 6. missingInformation (cannot derive from code)

- **Absolute power at max** for any hub: depends on the roster (which assets, ranks, packages). Only the multiplier is derivable: ×1.195093 at 10, ×2.638812 at 50 on every attribute of the category (`buildingBoost`). Field `cumulativePowerAtMax` left `null`.
- **Real levels 11-50 costs/timers**: the code's `1.3^past` / `1.5^past` extrapolation is explicitly a placeholder ("until a later table lands", `shared/buildings.ts:135, 380`); the numbers above are what the code *would* charge, not a designed economy. Timers past ~level 15 are unplayable (CC 20 = 144 days base).
- **Departments' effects past 10**: TOC / Engineer Yard / Depot are clamped; Signals, Trading Post, hubs, producers, Warehouse are not. No design exists for 11-50.
- **Season > 1**: no phase table; how `CURRENT_SEASON` advances is undecided in code.
- **Readiness Band**: no code.
- **Credit earn rate / income**: outside this scope, so the "Depot-equivalent" figures cannot be turned into days-of-play here.
- **Pacing check** in `docs/BUILDING-RESOURCES-v1.md` §6 (Day 16 / Day 58): not verifiable from this scope (depends on `scripts/simulate.mjs` and income assumptions).
- **Raid loot in practice**: `raidLoot` is wired (`worker/march.ts:754-783`) but whether "successful raid" = `result.outcome === 'attacker'` matches the design's "successful raid" is a design question, not derivable.

## 7. filesToChangeLater (for a designed level 1-50 economy)

| File | Function / constant | What has to change |
|---|---|---|
| `shared/buildings.ts` | `buildingStep()` `:266-288`, tables `:208-244` | Replace the `1.3^past` cost and `1.5^past` time extrapolation with real rows 11-50 (or a designed curve). |
| `shared/buildings.ts` | `row()` `:136-140`, `PRODUCTION` `:124-129`, `WAREHOUSE_CAP` `:132`, `WAREHOUSE_PROTECTED` `:133`, `protectedShare()` `:161-164` | Production/storage/protection for 11-50. |
| `shared/buildings.ts` | `ramp()` `:378-383`, `tocMultiplier`, `engineerMultiplier`, `depotCapMultiplier` `:389-406`, `MARCH_TOTAL_CAP` `:386` | Curves clamped at 10; decide 11-50 and whether the ×0.70 / ×1.50 / ×1.20 caps stay. |
| `shared/buildings.ts` | `signalsLeadMs()` `:409-411`, `tradingOffers()` `:414-416` | Unclamped linear; decide caps. |
| `shared/buildings.ts` | `buildingBoost()`/`BUILDING_STEP` `:358-362` | ×1.02^(L-1) unclamped → ×2.64 at 50; the docs' guardrail "building can never equal ten Service Ranks" (1.045^10 = 1.553) is already broken from level 24 on (1.02^23 = 1.577). |
| `shared/buildings.ts` | `buildingCapForSeason()` `:84-86`, `BUILDING_MAX_LEVEL` `:77`; `warehouseNeeded()` `:309-311`; `effectLine()` `:422-482` (hardcoded milestone copy at 5/10/20) | Season cap rule and player copy. |
| `shared/buildings.ts` | `RESOURCE_PER_UNIT` `:183-188`, `DAILY_RESOURCE_CAP` `:191-196`, `SECOND_TEAM` `:297-302` | Depot rates/caps and the Second Team price (consider moving to `shared/economy.ts`). |
| `shared/season.ts` | `DELTA_PRICE`, `DELTA_BUY_LEVEL`, `DELTA_FREE_RANK`, `TASK_FORCE_UNLOCK` `:71-79`; `SEASON_1_START`, `SEASON_WEEKS`, `seasonWeek()` `:13-25`; `isUnlocked()` `:60-63` | Delta price/gates; a real season/phase model (and the Readiness Band if built). |
| `shared/construction.ts` | `BUILD_BY_CATEGORY` `:19-25`, `levelNeeded()` `:44-46` | Per-tier costs and the hub-level gate for later seasons. |
| `worker/index.ts` | `CURRENT_SEASON` `:1198`; `settleAndLoad`/`baseView`/`seedBase` `:217-372` (legacy `buildings`); `handleSquads` `:1161-1165`; import of `totalPower` `:150` | Season source; delete the legacy base plumbing. |
| `worker/game.ts` | `BUILDINGS`, `upgradeCost`, `upgradeDurationMs`, `totalPower`, `STORAGE_CAP`, `productionPerHour` `:12-159` | Delete (keep only world constants/skins). |
| `worker/buildings.ts` | `startLevel()` `:236-289` (queue count, Engineer multiplier), `buyResource()` `:306-372` (cap logic), `buySecondTeam()` `:378-423` | Any change in gates/caps. |
| `worker/march.ts` | `:761` raid clip uses `raider.storageCap` for Fuel too | Use `capFor(k, levels)` so Fuel loot is not clipped by the Warehouse figure. |
| `worker/season1.ts` | `startBuild()` `:169-220` (`can.spec.ms` unmodified by Engineer Yard), `buyDelta()` `:331-360` | If construction timers should honour the Yard; Delta gating. |
| `worker/upgrades.ts` | `rankUp()` ceiling param `:255-272` | If the CC ceiling on rank changes. |
| `worker/bots.ts` | `FARM_CEILING_SEASON_1 = 8` `:33`, `bandCeiling()` `:132-137`, `growthPlan()` `:96-109` | Bot levels bypass cost; retune with the economy. |
| `migrations/0022_base_levels.sql` | `CHECK (level >= 0 AND level <= 50)` | Only if the hard max moves. |
| `src/live/BuildingPanel.tsx` `:79-90,136-147`, `src/live/ResourcePanels.tsx` `:26-155`, `src/live/BaseSheets.tsx`, `src/live/Squads.tsx:418-475`, `src/live/Assets.tsx:85-120` | Display-side copies of the same shared functions plus duplicated message strings | Follow the shared changes; dedupe the shortfall/queue strings. |
| `docs/BUILDING-EFFECTS-v1.md`, `docs/BUILDING-RESOURCES-v1.md`, `docs/ASSET-BUILDING-UPGRADES-v1.md` | tables | Bring the doc tables in line with the level-1-is-start ruling (×1.02^(L-1), ×1.00 at 1) and the Charlie 10 / Delta 20 gates. |
