# WORLD WAR ROGUE: MASTER GAME ARCHIVE & INTELLIGENCE DOSSIER

> **These are the original design documents, written before the game was built.**
>
> They describe an architecture that was never used - Google Cloud Run, an
> Express server, a 36-sector theatre map, an Admiral/Colonel/Lieutenant
> hierarchy - and features that do not exist, and the in-game Intel Dossier
> panel they refer to belongs to the earlier offline prototype in
> `src/components/`. Read them for intent and tone; read `README.md`,
> `CLAUDE.md` and `WORLD_WAR_ROGUE_DESIGN.md` for how the game actually works.
>
> What is really running: a Cloudflare Worker over D1, one world per server,
> alliances led by a General with up to 10 Lieutenants and the rest Soldiers,
> and no combat system yet.

**Classification:** CLASSIFIED // NATO UNCLASSIFIED EQUIVALENT // TOP SECRET MILITARY TACTICAL SPEC  
**Project Codename:** Operation Sandstorm Perimeter / World War Rogue  
**Version:** 1.2.0 Active Development  
**Repository Branch:** `main`  
**Deployment Infrastructure:** Google Cloud Run, Express Private Server, React 19, TypeScript  

---

## 📁 File Folder Structure (Master Documentation Index)

This folder contains the complete game design documentation, mathematical combat models, unit databases, alliance hierarchies, 36-sector territorial control mechanics, and private server protocols for **World War Rogue**.

| Document | File Name | Description |
| :--- | :--- | :--- |
| **00. Master Design** | [`WORLD_WAR_ROGUE_DESIGN.md`](./WORLD_WAR_ROGUE_DESIGN.md) | Executive summary, core pillars, and high-level gameplay loops. |
| **01. Overview & Lore** | [`01_GAME_OVERVIEW_AND_LORE.md`](./01_GAME_OVERVIEW_AND_LORE.md) | World setting, global factions, Sandstorm narrative, and aesthetic identity. |
| **02. Ballistics Physics** | [`02_BALLISTICS_AND_PHYSICS_ENGINE.md`](./02_BALLISTICS_AND_PHYSICS_ENGINE.md) | Parabolic trajectories, ricochet angles, velocity drop, and destructible cover. |
| **03. Unit Roster & Squads** | [`03_MILITARY_UNITS_AND_SQUAD_DOCTRINE.md`](./03_MILITARY_UNITS_AND_SQUAD_DOCTRINE.md) | 100+ military units, 11 nations, 4 tech eras, and strict 5-squad rules. |
| **04. Base & Fortifications** | [`04_BASE_BUILDING_AND_FORTIFICATIONS.md`](./04_BASE_BUILDING_AND_FORTIFICATIONS.md) | Base grid, Tactical HQ, CIWS, Howitzers, dragon's teeth, and damage states. |
| **05. Economy & Fair Play** | [`05_SURVIVAL_ECONOMY_AND_MONETIZATION.md`](./05_SURVIVAL_ECONOMY_AND_MONETIZATION.md) | 5 dynamic resources, survival crisis swarms, and anti-predatory $0.99–$4.99 model. |
| **06. Alliance High Command**| [`06_ALLIANCE_HIGH_COMMAND.md`](./06_ALLIANCE_HIGH_COMMAND.md) | 100-member battlegroup hierarchy (Admiral, Colonels, Lieutenants), tasks, events. |
| **07. Leaderboard & Map** | [`07_LEADERBOARD_AND_TERRITORIAL_WARFARE.md`](./07_LEADERBOARD_AND_TERRITORIAL_WARFARE.md) | Composite dominance formula, 36-sector theater map, yields, and season progress. |
| **08. Comms & Networking** | [`08_GLOBAL_COMMS_AND_NETWORKING.md`](./08_GLOBAL_COMMS_AND_NETWORKING.md) | 9-language auto-translation channels, private server verification, cross-platform. |
| **09. Tech Stack & Roadmap** | [`09_TECHNICAL_ARCHITECTURE_AND_ROADMAP.md`](./09_TECHNICAL_ARCHITECTURE_AND_ROADMAP.md) | Architectural blueprint, state management, anti-cheat checksum, and roadmap. |

---

## 🎯 Quick Navigation & Access in Game

All dossiers in this folder can be accessed directly inside the live application:
- Click the **📁 INTEL DOSSIER / GAME FOLDER** button in the top tactical HUD navigation bar.
- Or click **Documentation** in the bottom status telemetry bar.
- The in-game file folder includes live full-text search, manila folder tabs, classified watermark toggles, and instant markdown export.
