# BUILDING RESOURCES v1

`F` = Fuel · `S` = Steel · `M` = Munitions · `A` = Alloy. All amounts are whole server-authoritative units.

## 1. Resource set

Keep the four resources exactly as they are.

| Resource | Primary use |
|---|---|
| Fuel | Operations, engines, airframes, mobility, and march infrastructure. |
| Steel | Heavy structures, armour, storage, fabrication, and Command Center construction. |
| Munitions | Weapons, defensive systems, artillery, garrisons, and combat-control hardware. |
| Alloy | Precision electronics, sensors, lightweight airframes, drones, and advanced systems. |

Production is accrued server-side continuously to the storage cap; the player never needs to collect it manually.

**Rationale:** Each resource has a visible home in the base and a different spending identity, while four stockpiles remain readable on a phone.

## 2. Production and storage

At base level 0, production is **50 F / 35 S / 30 M / 25 A per hour** and storage is **3,000 of each resource**. The listed producer replaces its level-0 rate for its matching resource. Quartermaster capacity is per resource, not shared.

| Level | Fuel Point F/hr | Fabrication Shop S/hr | Garrison Barracks M/hr | Recovery Yard A/hr | Warehouse cap each | Warehouse protected stock |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 250 | 180 | 150 | 120 | 6,000 | 8% |
| 2 | 400 | 300 | 250 | 200 | 10,000 | 16% |
| 3 | 600 | 450 | 375 | 300 | 16,000 | 24% |
| 4 | 900 | 650 | 550 | 450 | 24,000 | 32% |
| 5 | 1,300 | 950 | 800 | 650 | 36,000 | 40% |
| 6 | 1,800 | 1,300 | 1,100 | 900 | 50,000 | 48% |
| 7 | 2,400 | 1,750 | 1,500 | 1,200 | 68,000 | 56% |
| 8 | 3,200 | 2,300 | 2,000 | 1,600 | 90,000 | 64% |
| 9 | 4,200 | 3,000 | 2,600 | 2,100 | 116,000 | 72% |
| 10 | 5,500 | 3,900 | 3,400 | 2,800 | 150,000 | 80% |

A successful raid takes exactly 5% of the unprotected amount of each resource. Protected stock is never raided.

**Rationale:** Production grows enough for an active player to progress within ten weeks, while storage and protection make the Warehouse a meaningful priority instead of a nuisance.

## 3. Per-building upgrade costs

All normal building upgrades cost resources only; their `Tokens / Credits` entry is `—`. Tokens and Command Credits are spent at the Depot to obtain resources under section 5. For every non-Warehouse building upgrade to level `N`, Quartermaster Warehouse level must be at least `floor(N / 2)`. This is in addition to the Command Center gate and prevents a required resource from exceeding available storage.

### `armour_hub` — Armour Building

| L | F | S | M | A | Tokens / Credits | Time |
|---:|---:|---:|---:|---:|---|---|
| 1 | 250 | 750 | 200 | 250 | — | 20m |
| 2 | 375 | 1,125 | 300 | 375 | — | 45m |
| 3 | 550 | 1,650 | 440 | 550 | — | 1h 30m |
| 4 | 800 | 2,400 | 640 | 800 | — | 3h |
| 5 | 1,150 | 3,450 | 920 | 1,150 | — | 6h |
| 6 | 1,600 | 4,800 | 1,280 | 1,600 | — | 9h |
| 7 | 2,200 | 6,600 | 1,760 | 2,200 | — | 12h |
| 8 | 3,000 | 9,000 | 2,400 | 3,000 | — | 18h |
| 9 | 4,100 | 12,300 | 3,280 | 4,100 | — | 24h |
| 10 | 5,500 | 16,500 | 4,400 | 5,500 | — | 36h |

### `artillery_hub` — Missile Building

| L | F | S | M | A | Tokens / Credits | Time |
|---:|---:|---:|---:|---:|---|---|
| 1 | 200 | 250 | 750 | 250 | — | 20m |
| 2 | 300 | 375 | 1,125 | 375 | — | 45m |
| 3 | 440 | 550 | 1,650 | 550 | — | 1h 30m |
| 4 | 640 | 800 | 2,400 | 800 | — | 3h |
| 5 | 920 | 1,150 | 3,450 | 1,150 | — | 6h |
| 6 | 1,280 | 1,600 | 4,800 | 1,600 | — | 9h |
| 7 | 1,760 | 2,200 | 6,600 | 2,200 | — | 12h |
| 8 | 2,400 | 3,000 | 9,000 | 3,000 | — | 18h |
| 9 | 3,280 | 4,100 | 12,300 | 4,100 | — | 24h |
| 10 | 4,400 | 5,500 | 16,500 | 5,500 | — | 36h |

### `fixed_wing_hub` — Fixed-Wing Building

| L | F | S | M | A | Tokens / Credits | Time |
|---:|---:|---:|---:|---:|---|---|
| 1 | 750 | 250 | 200 | 250 | — | 20m |
| 2 | 1,125 | 375 | 300 | 375 | — | 45m |
| 3 | 1,650 | 550 | 440 | 550 | — | 1h 30m |
| 4 | 2,400 | 800 | 640 | 800 | — | 3h |
| 5 | 3,450 | 1,150 | 920 | 1,150 | — | 6h |
| 6 | 4,800 | 1,600 | 1,280 | 1,600 | — | 9h |
| 7 | 6,600 | 2,200 | 1,760 | 2,200 | — | 12h |
| 8 | 9,000 | 3,000 | 2,400 | 3,000 | — | 18h |
| 9 | 12,300 | 4,100 | 3,280 | 4,100 | — | 24h |
| 10 | 16,500 | 5,500 | 4,400 | 5,500 | — | 36h |

### `rotary_hub` — Helicopter Building

| L | F | S | M | A | Tokens / Credits | Time |
|---:|---:|---:|---:|---:|---|---|
| 1 | 500 | 250 | 250 | 500 | — | 20m |
| 2 | 750 | 375 | 375 | 750 | — | 45m |
| 3 | 1,100 | 550 | 550 | 1,100 | — | 1h 30m |
| 4 | 1,600 | 800 | 800 | 1,600 | — | 3h |
| 5 | 2,300 | 1,150 | 1,150 | 2,300 | — | 6h |
| 6 | 3,200 | 1,600 | 1,600 | 3,200 | — | 9h |
| 7 | 4,400 | 2,200 | 2,200 | 4,400 | — | 12h |
| 8 | 6,000 | 3,000 | 3,000 | 6,000 | — | 18h |
| 9 | 8,200 | 4,100 | 4,100 | 8,200 | — | 24h |
| 10 | 11,000 | 5,500 | 5,500 | 11,000 | — | 36h |

### `drone_hub` — Drone Building

| L | F | S | M | A | Tokens / Credits | Time |
|---:|---:|---:|---:|---:|---|---|
| 1 | 250 | 200 | 250 | 750 | — | 20m |
| 2 | 375 | 300 | 375 | 1,125 | — | 45m |
| 3 | 550 | 440 | 550 | 1,650 | — | 1h 30m |
| 4 | 800 | 640 | 800 | 2,400 | — | 3h |
| 5 | 1,150 | 920 | 1,150 | 3,450 | — | 6h |
| 6 | 1,600 | 1,280 | 1,600 | 4,800 | — | 9h |
| 7 | 2,200 | 1,760 | 2,200 | 6,600 | — | 12h |
| 8 | 3,000 | 2,400 | 3,000 | 9,000 | — | 18h |
| 9 | 4,100 | 3,280 | 4,100 | 12,300 | — | 24h |
| 10 | 5,500 | 4,400 | 5,500 | 16,500 | — | 36h |

### `tactical_operations_center` — Tactical Operations Center

| L | F | S | M | A | Tokens / Credits | Time |
|---:|---:|---:|---:|---:|---|---|
| 1 | 300 | 300 | 400 | 200 | — | 20m |
| 2 | 450 | 450 | 600 | 300 | — | 40m |
| 3 | 600 | 600 | 800 | 400 | — | 1h 20m |
| 4 | 900 | 900 | 1,200 | 600 | — | 2h 40m |
| 5 | 1,200 | 1,200 | 1,600 | 800 | — | 5h |
| 6 | 1,800 | 1,800 | 2,400 | 1,200 | — | 7h 30m |
| 7 | 2,400 | 2,400 | 3,200 | 1,600 | — | 10h |
| 8 | 3,600 | 3,600 | 4,800 | 2,400 | — | 15h |
| 9 | 4,800 | 4,800 | 6,400 | 3,200 | — | 20h |
| 10 | 7,200 | 7,200 | 9,600 | 4,800 | — | 30h |

### `signals_center` — Signals Center

| L | F | S | M | A | Tokens / Credits | Time |
|---:|---:|---:|---:|---:|---|---|
| 1 | 150 | 200 | 100 | 500 | — | 20m |
| 2 | 225 | 300 | 150 | 750 | — | 40m |
| 3 | 300 | 400 | 200 | 1,000 | — | 1h 20m |
| 4 | 450 | 600 | 300 | 1,500 | — | 2h 40m |
| 5 | 600 | 800 | 400 | 2,000 | — | 5h |
| 6 | 900 | 1,200 | 600 | 3,000 | — | 7h 30m |
| 7 | 1,200 | 1,600 | 800 | 4,000 | — | 10h |
| 8 | 1,800 | 2,400 | 1,200 | 6,000 | — | 15h |
| 9 | 2,400 | 3,200 | 1,600 | 8,000 | — | 20h |
| 10 | 3,600 | 4,800 | 2,400 | 12,000 | — | 30h |

### `fuel_point` — Bulk Fuel Point

| L | F | S | M | A | Tokens / Credits | Time |
|---:|---:|---:|---:|---:|---|---|
| 1 | 100 | 300 | 100 | 200 | — | 15m |
| 2 | 150 | 450 | 150 | 300 | — | 30m |
| 3 | 200 | 600 | 200 | 400 | — | 1h |
| 4 | 300 | 900 | 300 | 600 | — | 2h |
| 5 | 400 | 1,200 | 400 | 800 | — | 4h |
| 6 | 600 | 1,800 | 600 | 1,200 | — | 6h |
| 7 | 800 | 2,400 | 800 | 1,600 | — | 8h |
| 8 | 1,200 | 3,600 | 1,200 | 2,400 | — | 12h |
| 9 | 1,600 | 4,800 | 1,600 | 3,200 | — | 16h |
| 10 | 2,400 | 7,200 | 2,400 | 4,800 | — | 24h |

### `fabrication_shop` — Base Fabrication Shop

| L | F | S | M | A | Tokens / Credits | Time |
|---:|---:|---:|---:|---:|---|---|
| 1 | 200 | 200 | 200 | 400 | — | 15m |
| 2 | 300 | 300 | 300 | 600 | — | 30m |
| 3 | 400 | 400 | 400 | 800 | — | 1h |
| 4 | 600 | 600 | 600 | 1,200 | — | 2h |
| 5 | 800 | 800 | 800 | 1,600 | — | 4h |
| 6 | 1,200 | 1,200 | 1,200 | 2,400 | — | 6h |
| 7 | 1,600 | 1,600 | 1,600 | 3,200 | — | 8h |
| 8 | 2,400 | 2,400 | 2,400 | 4,800 | — | 12h |
| 9 | 3,200 | 3,200 | 3,200 | 6,400 | — | 16h |
| 10 | 4,800 | 4,800 | 4,800 | 9,600 | — | 24h |

### `garrison_barracks` — Garrison Barracks

| L | F | S | M | A | Tokens / Credits | Time |
|---:|---:|---:|---:|---:|---|---|
| 1 | 200 | 200 | 500 | 100 | — | 15m |
| 2 | 300 | 300 | 750 | 150 | — | 30m |
| 3 | 400 | 400 | 1,000 | 200 | — | 1h |
| 4 | 600 | 600 | 1,500 | 300 | — | 2h |
| 5 | 800 | 800 | 2,000 | 400 | — | 4h |
| 6 | 1,200 | 1,200 | 3,000 | 600 | — | 6h |
| 7 | 1,600 | 1,600 | 4,000 | 800 | — | 8h |
| 8 | 2,400 | 2,400 | 6,000 | 1,200 | — | 12h |
| 9 | 3,200 | 3,200 | 8,000 | 1,600 | — | 16h |
| 10 | 4,800 | 4,800 | 12,000 | 2,400 | — | 24h |

### `recovery_yard` — Materials Recovery Yard

| L | F | S | M | A | Tokens / Credits | Time |
|---:|---:|---:|---:|---:|---|---|
| 1 | 200 | 250 | 100 | 400 | — | 15m |
| 2 | 300 | 375 | 150 | 600 | — | 30m |
| 3 | 400 | 500 | 200 | 800 | — | 1h |
| 4 | 600 | 750 | 300 | 1,200 | — | 2h |
| 5 | 800 | 1,000 | 400 | 1,600 | — | 4h |
| 6 | 1,200 | 1,500 | 600 | 2,400 | — | 6h |
| 7 | 1,600 | 2,000 | 800 | 3,200 | — | 8h |
| 8 | 2,400 | 3,000 | 1,200 | 4,800 | — | 12h |
| 9 | 3,200 | 4,000 | 1,600 | 6,400 | — | 16h |
| 10 | 4,800 | 6,000 | 2,400 | 9,600 | — | 24h |

### `quartermaster_warehouse` — Quartermaster Warehouse

| L | F | S | M | A | Tokens / Credits | Time |
|---:|---:|---:|---:|---:|---|---|
| 1 | 100 | 500 | 100 | 500 | — | 20m |
| 2 | 150 | 750 | 150 | 750 | — | 40m |
| 3 | 200 | 1,000 | 200 | 1,000 | — | 1h 20m |
| 4 | 300 | 1,500 | 300 | 1,500 | — | 2h 40m |
| 5 | 400 | 2,000 | 400 | 2,000 | — | 5h |
| 6 | 600 | 3,000 | 600 | 3,000 | — | 7h 30m |
| 7 | 800 | 4,000 | 800 | 4,000 | — | 10h |
| 8 | 1,200 | 6,000 | 1,200 | 6,000 | — | 15h |
| 9 | 1,600 | 8,000 | 1,600 | 8,000 | — | 20h |
| 10 | 2,400 | 12,000 | 2,400 | 12,000 | — | 30h |

### `engineer_support_yard` — Engineer Support Yard

| L | F | S | M | A | Tokens / Credits | Time |
|---:|---:|---:|---:|---:|---|---|
| 1 | 200 | 400 | 200 | 400 | — | 20m |
| 2 | 300 | 600 | 300 | 600 | — | 40m |
| 3 | 400 | 800 | 400 | 800 | — | 1h 20m |
| 4 | 600 | 1,200 | 600 | 1,200 | — | 2h 40m |
| 5 | 800 | 1,600 | 800 | 1,600 | — | 5h |
| 6 | 1,200 | 2,400 | 1,200 | 2,400 | — | 7h 30m |
| 7 | 1,600 | 3,200 | 1,600 | 3,200 | — | 10h |
| 8 | 2,400 | 4,800 | 2,400 | 4,800 | — | 15h |
| 9 | 3,200 | 6,400 | 3,200 | 6,400 | — | 20h |
| 10 | 4,800 | 9,600 | 4,800 | 9,600 | — | 30h |

After Engineer Support Yard level 10 is complete, the player may permanently buy **Second Engineer Team** once: `12,000 S + 12,000 A + 1,500 Tokens/Credits`, then a fixed 24-hour timer. It adds one permanent second base build queue. This replaces the temporary seven-day Asset Building queue.

### `depot` — Depot

| L | F | S | M | A | Tokens / Credits | Time |
|---:|---:|---:|---:|---:|---|---|
| 1 | 200 | 300 | 300 | 300 | — | 20m |
| 2 | 300 | 450 | 450 | 450 | — | 40m |
| 3 | 400 | 600 | 600 | 600 | — | 1h 20m |
| 4 | 600 | 900 | 900 | 900 | — | 2h 40m |
| 5 | 800 | 1,200 | 1,200 | 1,200 | — | 5h |
| 6 | 1,200 | 1,800 | 1,800 | 1,800 | — | 7h 30m |
| 7 | 1,600 | 2,400 | 2,400 | 2,400 | — | 10h |
| 8 | 2,400 | 3,600 | 3,600 | 3,600 | — | 15h |
| 9 | 3,200 | 4,800 | 4,800 | 4,800 | — | 20h |
| 10 | 4,800 | 7,200 | 7,200 | 7,200 | — | 30h |

### `alliance_trading_post` — Alliance Trading Post

| L | F | S | M | A | Tokens / Credits | Time |
|---:|---:|---:|---:|---:|---|---|
| 1 | 300 | 200 | 200 | 300 | — | 20m |
| 2 | 450 | 300 | 300 | 450 | — | 40m |
| 3 | 600 | 400 | 400 | 600 | — | 1h 20m |
| 4 | 900 | 600 | 600 | 900 | — | 2h 40m |
| 5 | 1,200 | 800 | 800 | 1,200 | — | 5h |
| 6 | 1,800 | 1,200 | 1,200 | 1,800 | — | 7h 30m |
| 7 | 2,400 | 1,600 | 1,600 | 2,400 | — | 10h |
| 8 | 3,600 | 2,400 | 2,400 | 3,600 | — | 15h |
| 9 | 4,800 | 3,200 | 3,200 | 4,800 | — | 20h |
| 10 | 7,200 | 4,800 | 4,800 | 7,200 | — | 30h |

**Rationale:** Heavy categories pull hard on their natural resource, producers cost the infrastructure needed to expand them, and every normal upgrade remains a resource decision rather than another Token-only wall.

## 4. Command Center costs

The Command Center is intentionally the most expensive and slowest Season 1 building. It is also subject to the Warehouse requirement in section 3.

| L | F | S | M | A | Tokens / Credits | Time |
|---:|---:|---:|---:|---:|---|---|
| 1 | 900 | 700 | 600 | 500 | — | 1h |
| 2 | 1,350 | 1,050 | 900 | 750 | — | 2h |
| 3 | 2,000 | 1,600 | 1,350 | 1,100 | — | 4h |
| 4 | 3,000 | 2,300 | 2,000 | 1,650 | — | 8h |
| 5 | 4,400 | 3,400 | 3,000 | 2,500 | — | 12h |
| 6 | 6,400 | 5,000 | 4,400 | 3,700 | — | 18h |
| 7 | 9,200 | 7,200 | 6,400 | 5,400 | — | 24h |
| 8 | 13,200 | 10,400 | 9,200 | 7,800 | — | 36h |
| 9 | 18,800 | 15,000 | 13,200 | 11,200 | — | 48h |
| 10 | 24,000 | 21,600 | 19,000 | 16,200 | — | 60h |

**Rationale:** The Command Center sets the account's real progression ceiling, so its all-resource cost and long timer make it more valuable than pushing one specialty building alone.

## 5. Buying resources at the Depot

Yes. The Depot sells resources for Tokens, Command Credits, or any mixture of the two at equal value. One currency unit buys the following exact amount:

| Resource | Units per Token or Credit | Daily account purchase cap | Currency cost at daily cap |
|---|---:|---:|---:|
| Fuel | 100 | 20,000 | 200 |
| Steel | 80 | 16,000 | 200 |
| Munitions | 70 | 14,000 | 200 |
| Alloy | 60 | 12,000 | 200 |

Each resource cap resets at the daily server reset. Total maximum Depot-resource spend is exactly **800 Tokens/Credits per day** and **5,600 Tokens/Credits per seven-day week**. Purchases that would exceed storage are rejected; the player must first spend resources or increase storage.

**Rationale:** The player who spends can choose momentum immediately, while the equal Credit price preserves the active route. The daily cap protects a new server from unlimited same-day construction, and build timers remain unskippable.

## 6. Pacing check

The simulation baseline defines an active free player as logging 90 qualifying activity minutes and two base visits per day, earning 600 Command Credits per day, using no Tokens, and prioritising the four production buildings and Warehouse only as required by the storage gate. The 10,000-Token/week player logs 22.5 qualifying activity minutes per day, buys Depot resources up to the daily caps when needed, and never skips a timer. This is exactly four times the active play time for the free profile.

| Profile | Command Center 5 + all five asset buildings 4 | Command Center 10 + all five asset buildings 9 |
|---|---:|---:|
| Active free player | End of Season Day 16 | End of Season Day 58 |
| 10,000-Token/week player | End of Season Day 3 | End of Season Day 26 |

**Rationale:** Paying creates a strong early lead, but the one build queue and absolute timers prevent instant completion; the active free profile still reaches the full Season 1 Command Center target before the ten-week season ends.

## 7. Simulation guardrails

1. For every resource, `0 <= stock <= currentWarehouseCap`; production stops at the cap and never creates overflow.
2. An upgrade to level `N` fails unless Command Center level `N` is complete, all costs are available, its prior level is complete, a queue is available, and the Warehouse is at least `floor(N / 2)`; Warehouse upgrades are exempt only from their own Warehouse gate.
3. Every level-10 cost in this document fits within the required level-5 Warehouse cap of 36,000 for each individual resource; the largest is Command Center 10 Fuel at 24,000.
4. A successful raid removes exactly `0.05 × unprotectedStock` from each resource and never removes protected stock or more than the available amount.
5. Depot purchases may not exceed Fuel 20,000, Steel 16,000, Munitions 14,000, or Alloy 12,000 per daily reset, regardless of Token/Credit mix.
6. In the pacing simulation, the active-free profile reaches Command Center 10 plus five level-9 asset buildings no later than Day 58; the paid profile cannot reach that state before Day 26 because no build timer can be shortened.

**Rationale:** These checks catch economy exploits, storage deadlocks, raid errors, mixed-currency cap bypasses, and timer bypasses before release.

## 8. Player-facing wording

- Resource labels: `Fuel`, `Steel`, `Munitions`, `Alloy`
- Cost line: `Fuel 1,200 · Steel 1,800 · Munitions 600 · Alloy 900 · 2h 40m`
- Insufficient-resource message: `Need {amount} more {resource}. Produce it at {producerBuilding} or buy it at the Depot.`
- Storage-full message: `{resource} storage is full. Upgrade the Quartermaster Warehouse or spend resources to resume production.`

**Rationale:** Players see exactly what is needed, where it comes from, and the single next action without opening a separate help screen.

---

## Owner's rulings on this document (2026-09-06)

- **Start level.** Every building starts at level 1 like every asset, so each table's level-1 row is the starting state (a fresh base produces 250 F / 180 S / 150 M / 120 A per hour and stores 6,000 of each) and the first purchase is level 2. The level-1 cost rows are never charged.
- **Stock is shown in a building**, the Quartermaster Warehouse, and as have/need on every cost line. There is no resource bar.
- **Departments without a designed effect** (Tactical Operations Center, Signals Center, Engineer Support Yard below 10, Depot, Alliance Trading Post) level and cost as tabled but unlock nothing until designed.
- **Raids** take 5% of the unprotected stock (`raidLoot` in `shared/buildings.ts`); the battle-settlement step wires it in when raids start taking resources.
- Implemented in `shared/buildings.ts`, `worker/buildings.ts`, migration 0023.
- **Fuel is the attack currency (2026-09-07).** Every attack from the map burns Fuel: 100 + 20 per asset + 5 per plot of distance (`attackFuel()` in `shared/march.ts`), debited when the column leaves; reinforcing is free. Fuel has **no storage cap** — only its production rate is fixed; it is won in raids and (when rewards land) daily tasks. The Warehouse caps Steel, Munitions and Alloy only.
