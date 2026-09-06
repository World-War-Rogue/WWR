# ASSET BUILDING UPGRADES v1

## 1. Levels and bonus curve

Season 1 cap: **10 levels per Asset Building**. Building level `L` applies the same category-wide multiplier to Firepower, Armour, Mobility, Range, and Detection of every owned asset in that category: `1.02^L`. Level 10 is `×1.218994`, or **+21.8994%** to every stat. Service Rank 50 remains `×8.6257`, so Service Rank is the main progression source.

**Rationale:** The building is a valuable category investment without replacing the reason to rank individual assets.

## 2. Stacking order

`finalStat = baseStat × 1.045^(serviceRank - 1) × 1.02^(buildingLevel) × packageMultiplierForThatStat`.

**Rationale:** All three systems compound cleanly, are server-verifiable, and a package remains specific to one asset and one stat.

## 3. Cost and build time

Every category uses this exact table, including the Drone Building. A player starts an upgrade by paying either Tokens or Commander Credits. Commander Credits are earned at exactly one credit per qualifying active-play minute; the credit route is exactly four times the Token route. The build timer begins only after either payment succeeds.

| Building level | Tokens | Commander Credits | Active-play minutes | Build time |
|---:|---:|---:|---:|---:|
| 1 | 40 | 160 | 160 | 20 minutes |
| 2 | 60 | 240 | 240 | 45 minutes |
| 3 | 90 | 360 | 360 | 1 hour 30 minutes |
| 4 | 130 | 520 | 520 | 3 hours |
| 5 | 180 | 720 | 720 | 6 hours |
| 6 | 240 | 960 | 960 | 9 hours |
| 7 | 320 | 1,280 | 1,280 | 12 hours |
| 8 | 420 | 1,680 | 1,680 | 18 hours |
| 9 | 540 | 2,160 | 2,160 | 24 hours |
| 10 | 700 | 2,800 | 2,800 | 36 hours |

Tokens and Commander Credits cannot shorten the listed build timer.

**Rationale:** A spender can start upgrades much earlier; an active free player can reach the same upgrade through a clear four-times-longer effort route, while timers still protect the season pace.

## 4. Gating and queues

An Asset Building may advance from level `L` to `L + 1` only when: the previous level is complete; Command Center level is at least `L + 1`; and the current season building cap is at least `L + 1`. Season 1's building cap is 10. There is no weekly level gate.

There is one shared Asset Building queue across the base. A **Second Asset Building Queue** costs **750 Tokens**, lasts exactly **7 days**, is refreshable, and permits one additional building upgrade at the same time. A building cannot have two upgrades running at once.

**Rationale:** Command Center progression sets the pace, while the second queue gives paying players a clear scheduling advantage without allowing one category to skip its own sequence.

## 5. Season rollover

Completed building levels carry into Season 2 and all later seasons. Season 2 raises the building cap to 20; the cap then follows the established season progression of 30, 40, and 50. The map resets, but building levels do not. An in-progress upgrade remains in progress through rollover and completes at its original server timestamp.

**Rationale:** Buildings are permanent account investments, consistent with assets and Service Ranks, while the new season still provides new levels to pursue.

## 6. Drone interaction

Drone Building levels intentionally raise drone Mobility. Apply the same building multiplier to the drone's Mobility stat before the Task Force march-speed calculation. The drone-provided portion of a Task Force's march-speed multiplier is capped at `×1.12`:

`droneMarchSpeedMultiplier = min(1.12, baseDroneMarchSpeedMultiplier × 1.02^droneBuildingLevel)`.

**Rationale:** Drone investment should improve marching, but no amount of drone building progression can grant more than +12% march speed from this source.

## 7. Simulation guardrails

1. At equal base stats and packages, a level-10 building asset must equal the level-0 building version multiplied by exactly `1.218994` for all five stats.
2. A level-10 building player using rank-20 assets must lose to a level-0 building player using otherwise identical rank-30 assets: `1.045^19 × 1.02^10 < 1.045^29`.
3. A level-10 building player using rank-40 assets must lose to a level-0 building player using otherwise identical rank-50 assets: `1.045^39 × 1.02^10 < 1.045^49`.
4. No Task Force may receive more than `×1.12` from the drone-provided march-speed multiplier.
5. Starting an upgrade must fail when its Command Center gate, season cap, preceding level, payment, or available queue slot is invalid; duplicate completion must never apply the bonus twice.

**Rationale:** These tests keep building upgrades rewarding while ensuring they cannot substitute for ten Service Rank bands or create an unbounded speed build.

## 8. Player-facing wording

- **Building sheet title:** `Tank Building — Category Systems Upgrade`
- **Upgrade button:** `Start Level {nextLevel}`
- **What this level gives:** `All Armour assets: +2% Firepower, Armour, Mobility, Range and Detection.`
- **Timer line:** `Completes {absoluteServerTime} · {remainingTime} remaining`

For the other four buildings, replace `Tank Building` and `Armour` with the matching building and category name.

**Rationale:** The wording states the category-wide benefit in one glance and gives the server-authoritative completion time.

---

## Owner's rulings on this document (2026-09-06)

- **§3 price.** One price, payable in any mix of Tokens and Command Credits, like every other purchase. The 4× Credit column is not used; the 4× is time (earn rate), not price. Resource costs per building are coming in BUILDING RESOURCES v1 and will replace this table's cost column.
- **Start level.** Every building starts at level 1 like every asset; the first upgrade is level 2, and the boost counts from level 1 (level 10 = ×1.02⁹ = +19.5%).
- **§4 Command Center gate.** Kept, and widened: the Command Center is the ceiling for everything. It must finish level N before any building, Service Rank or package may start level N. The Command Center's own cost table is the asset-building table ×1.5 until the designer publishes one.
- **§4 second queue.** Not the 7-day rental. The Second Engineer Team is a permanent purchase gated at Engineer Support Yard 10, as already decided.
- **§6 drone cap.** Waits for DRONE RULES v1.
