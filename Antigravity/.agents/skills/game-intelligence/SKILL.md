---
name: game-intelligence
description: Autonomous engine and game intelligence system (A.E.G.I.S.) for auditing and analyzing all game design, UI/UX, progression upgrades, and computing performance aspects of World War Rogue and other games.
---

# Game Intelligence & Analysis Agent (A.E.G.I.S.)

A.E.G.I.S. (Autonomous Engine & Game Intelligence System) provides automated intelligence, data collection, mathematical combat simulations, UI/UX component inspections, upgrade progression curves, and 60 FPS computing budget profiling for tactical military and roguelite games.

## Quick Start & CLI Usage

Run any command using the built-in runtime from the workspace root:

```bash
# Run full analysis, simulations, and generate reports
agy-node aegis.mjs all

# Run specific analyzers
agy-node aegis.mjs analyze
agy-node aegis.mjs simulate
agy-node aegis.mjs audit-ui
agy-node aegis.mjs audit-upgrades
agy-node aegis.mjs audit-compute
```

## Generated Deliverables

Every audit generates:
1. **Interactive Visual Dashboard**: `reports/dashboard.html` (SVG radar charts, waterfall frame timers, squad playout win-rates, complexity matrix).
2. **Classified Tactical Intelligence Dossier**: `reports/game_health_dossier.md` (Formal NATO-grade audit summary).
3. **Structured Telemetry Dataset**: `reports/telemetry_data.json` (Machine-readable metrics for automated CI/CD pipelines).

## Core Pillars & Heuristics

1. **Game Design & Combat Math**:
   - **Effective HP ($EHP$)**: $HP \times (1 + \frac{\text{Armor}}{100})$
   - **Sustained DPS**: $\text{Firepower} \times \text{FireRate} \times (1 + \frac{\text{Penetration}}{200})$
   - **Time-to-Kill (TTK)**: Healthy range is 3.0s to 25.0s. Baseline target is 8.5s.
   - **Counter-Matrix**: Enforces Rock-Paper-Scissors dynamics across MBT, Artillery, Air Defense, and Recon.

2. **User Interface (UI/UX)**:
   - **Component Maintainability**: Components exceeding 600 lines are flagged for decomposition.
   - **State Density**: Components with > 7 `useState` hooks are flagged for `useReducer` or context migration.
   - **Military HUD Design System**: Verifies phosphor green (`#22c55e`), amber warning (`#f59e0b`), and CRT scanline styling.

3. **Upgrades & Progression**:
   - **Upgrade ROI**: $\frac{\Delta \text{Power}}{\Delta \text{Cost}}$.
   - **Trap Detection**: Flags upgrades with $<5\%$ ROI per 1,000 resources.
   - **Runaway Creep**: Flags upgrades with $>85\%$ ROI that cause defensive turtling.

4. **Computing & 60 FPS Frame Budget (16.66ms)**:
   - **Ballistics Raycasting**: 3.2ms allocation.
   - **Squad AI & Swarm Pathfinding**: 4.0ms allocation.
   - **State Sync & Checksum**: 1.8ms allocation.
   - **React Render / Canvas**: 7.66ms allocation.
