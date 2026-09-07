# DRONE RULES v1

This document supersedes the Drone Building march-speed formula in **ASSET BUILDING UPGRADES v1 §6**.

## 1. March speed multiplier formula

For each drone, resolve `M` (Mobility) and `D` (Detection) through the normal asset pipeline through event buffs, before formation effects. Its Drone Network contribution is:

`droneContribution = 0.020 + 0.012 × ln(1 + M) + 0.002 × ln(1 + D)`

Sort all drones in the Task Force by `droneContribution` descending; ties sort by asset id ascending. Apply weights `[1.00, 0.65, 0.45, 0.30, 0.20, 0.15]` in that order:

`droneNetworkMultiplier = min(1.25, 1 + Σ(droneContribution[i] × weight[i]))`

`marchTime = distance ÷ (paceMobility × droneNetworkMultiplier)`, where `paceMobility` is the lowest non-drone Mobility in the Task Force; for an all-drone Task Force it is the lowest drone Mobility.

`PACKAGE_POINTS_PER_RANK` is **0.10**. A rank-50 maximum Propulsion package therefore adds exactly `4.9` Mobility; no Electronics package is assumed in the examples below. `1.045^49 = 8.643671`.

| Drone set | 1 drone | 3 identical drones | 6 identical drones |
|---|---|---|---|
| RQ-4 rank 1 (`M=5`, `D=8`) | ×1.0459; 95.6% march time | ×1.0964; 91.2% | ×1.1262; 88.8% |
| CH-5 rank 1 (`M=9`, `D=7`) | ×1.0518; 95.1% march time | ×1.1088; 90.2% | ×1.1424; 87.5% |
| RQ-4 rank 50 + max Propulsion (`M=48.118`, `D=69.149`) | ×1.0752; 93.0% march time | ×1.1580; 86.4% | ×1.2069; 82.9% |
| CH-5 rank 50 + max Propulsion (`M=82.693`, `D=60.506`) | ×1.0814; 92.5% march time | ×1.1709; 85.4% | ×1.2238; 81.7% |

**Rationale:** Mobility is the main driver, Detection provides a smaller scouting dividend, and the fixed weights make every extra drone valuable without letting six drones exceed the ×1.25 movement cap.

## 2. Armour/defence cost per drone

Every drone in the Task Force applies a 7% armour reduction to every asset in that Task Force, including the drones themselves:

`taskForceArmourMultiplier = 1 - (0.07 × droneCount)`

Apply this multiplier after all normal asset armour modifiers and before the combat HP and mitigation formulas. It affects armour only; Firepower, Mobility, Range, and Detection are unchanged.

| Drone count | Armour multiplier | Armour reduction |
|---:|---:|---:|
| 1 | ×0.93 | −7% |
| 3 | ×0.79 | −21% |
| 6 | ×0.58 | −42% |

An all-drone Task Force is legal and mobile, but always takes the full −42% armour penalty.

**Rationale:** Every added drone presents a visible movement-versus-survivability choice; an all-drone force can exploit speed, detection, and counters, but cannot become a durable general-purpose formation.

## 3. Front drone opening wave

Each drone in front slots 0–1 fires exactly one opening-wave shot before round 1. The shot uses the normal target selection, accuracy, counter, range, and mitigation rules at **70% of its normal resolved damage**. Two front drones each fire one opening-wave shot.

After the opening wave, each front drone has `HP × 0.78` and target-priority weight `×2.00` for all five rounds. Its normal round shots are unchanged.

**Rationale:** Front drones create a real short-fight advantage, but their low HP and doubled fire draw make the position a deliberate sacrifice rather than the universal best slot.

## 4. Rear drone endurance

Each drone in rear slots 4–5 has `HP × 1.30` and deals `×0.90` normal resolved damage on every normal round shot. Its Detection remains fully active while it lives. Over five uninterrupted rounds it deals exactly 90% of a centre drone's normal-round damage, while its 30% HP gain makes it the preferred late-fight spotter.

**Rationale:** Rear drones trade 10% immediate output for survival and round-5 spotting; the damage loss is small enough that the position is a genuine endurance option rather than a trap.

## 5. Week-1 pacing

Keep **one** starter drone: `rq4`. Week 1 therefore permits exactly one Task Force to march. `akinci` remains the Week 2 unlock and enables the second marching Task Force.

**Rationale:** Early expansion is intentionally constrained by recon availability, giving Week 2's first new drone a meaningful strategic unlock instead of only adding roster variety.

## 6. Balance guardrails

1. Permuting the same six drones across slots without changing their front/centre/rear bands must produce the identical Drone Network multiplier; only the sorted contribution values and fixed weights determine it.
2. Increasing a drone's Propulsion package by one level must strictly increase its Task Force Drone Network multiplier whenever the total multiplier is below ×1.25.
3. No legal Task Force may have `droneNetworkMultiplier > 1.25` or `taskForceArmourMultiplier < 0.58`.
4. A front drone must deal 70% of one normal resolved shot before round 1, have 22% less HP than the same centre drone, and receive exactly double target-priority weight.
5. A rear drone that survives all five rounds must deal exactly 90% of the normal-round damage of an otherwise identical centre drone and retain exactly 30% more HP.
6. In a fixed-seed rank-20 mirror simulation, moving one drone from centre to front must increase that drone's damage by the end of round 1; moving it from centre to rear must increase its surviving HP at the end of round 5.

**Rationale:** These assertions verify the speed cap, armour trade, package linkage, and position choices directly instead of relying on aggregate win rates alone.

## 7. Player-facing wording

- No-drone march error: `Add a Drone to deploy this Task Force. Drones provide recon and march speed.`
- Slot hint: `Front: opening wave, −22% HP, draws 2× fire. Rear: +30% HP, −10% damage.`
- Task Force trade label: `Drone Network — ×{marchMultiplier} March Speed · −{armourPenalty}% Armour`
- Propulsion hint: `Propulsion on any deployed drone raises Drone Network march speed.`

**Rationale:** The player sees the hard deploy requirement, the positional choice, and the live speed/armour trade without opening a separate rules panel.

---

## Owner's rulings and implementation notes (2026-09-07)

- **Package constant.** `PACKAGE_POINTS_PER_RANK` stays 0.14 (decided in GAME-MATH step 1); the 0.10 in §1 is not adopted. The example multipliers shift by a hair.
- **Front-drone draw** multiplies the front row's existing 1.45× target weight (a front drone draws 2.9× a centre asset's share).
- **No drone at home.** A Task Force without a drone cannot march; at home it still defends but never spots better than base (0.65). The floor (0.35) was tried first and broke the counter ring — six drones beat rotary 88% because rotary could not see them.
- **Harness.** The isolated counter test turns the drone rules off (`SideSpec.droneRules = false`) so six synthetic drones are not also paying the six-drone armour cost; every real fight leaves it on. Section 11 asserts guardrails 1–6.
- Implemented in `shared/drones.ts`, `shared/combat.ts`, `worker/march.ts`; UI in Squads (Drone Network line, slot hint), AssetUpgrade (Propulsion hint). No migration.
