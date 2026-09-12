import { RAW_UNITS_DATA, COUNTRY_NAMES } from '../data/units';
import { INITIAL_THEATER_SECTORS } from '../data/leaderboard';
import { INITIAL_ALLIANCES_DATA } from '../data/alliances';
import { SERVERS_LIST } from '../data/servers';
import { SEASONS_DATA } from '../data/seasons';
import { GAME_DOSSIER_FILES } from '../data/gameDossier';
import { PlayerProfile, Squad, BaseBuilding } from '../types';
import { generateAntiCheatChecksum } from './antiCheat';

/**
 * Generates the complete, consolidated Master Game Bible in Markdown format.
 * Covers every single game system, mathematical formula, lore background,
 * 100+ unit roster, 36 theater sectors, alliance hierarchy, base mechanics,
 * comms frequencies, tech stack, and active commander state.
 */
export function generateMasterGameBibleMarkdown(
  profile: PlayerProfile,
  squads: Squad[],
  buildings: BaseBuilding[]
): string {
  const checksum = generateAntiCheatChecksum(profile.callsign, profile.resources, squads);
  const now = new Date().toISOString();
  const totalSquadPower = squads.reduce((acc, s) => acc + s.totalCombatPower, 0);

  let bible = `# WORLD WAR ROGUE: THE MASTER GAME DESIGN BIBLE & OMNISCIENT CODEX
**Classification:** TOP SECRET // COMBINED ARMS HIGH COMMAND // MIL-SPEC 1.2.0  
**Project Codename:** Project Iron Citadel / World War Rogue  
**Generated On:** ${now}  
**Commander Callsign:** ${profile.callsign} [Rank: ${profile.rank}]  
**Server Node:** ${profile.activeServer} | **Active Season:** ${profile.currentSeason.toUpperCase()}  
**Total Deployed Power:** ${totalSquadPower.toLocaleString()} CP | **Base Integrity:** ${profile.baseIntegrity}%  
**State Checksum (HMAC-SHA256):** \`${checksum}\`  
**Core Stack:** React 19 • TypeScript • Tailwind CSS • Canvas 2D Ballistics • Web Audio Synthesizer • Express API

---

## TABLE OF CONTENTS
1. [Executive Summary & Core Design Pillars](#1-executive-summary--core-design-pillars)
2. [Global Lore, Factions & Seasonal Theaters](#2-global-lore-factions--seasonal-theaters)
3. [Ballistics Engine & Deterministic Physics Equations](#3-ballistics-engine--deterministic-physics-equations)
4. [Squad Doctrine & Complete 100+ Unit Military Catalog](#4-squad-doctrine--complete-100-unit-military-catalog)
5. [Forward Operating Base (FOB) Fortifications & Base Building](#5-forward-operating-base-fob-fortifications--base-building)
6. [Dynamic Survival Economy & Anti-Predatory Fair Armory](#6-dynamic-survival-economy--anti-predatory-fair-armory)
7. [Alliance High Command & 100-Member Hierarchy](#7-alliance-high-command--100-member-hierarchy)
8. [Territorial Warfare: 36 Strategic Sectors & Dominance Scoring](#8-territorial-warfare-36-strategic-sectors--dominance-scoring)
9. [Global Comms, 4 Military Frequencies & Neural Auto-Translation](#9-global-comms-4-military-frequencies--neural-auto-translation)
10. [Technical Engine Architecture & Procedural Web Audio Engine](#10-technical-engine-architecture--procedural-web-audio-engine)
11. [Appendix: Current Commander State & Deployed Battlegroups](#11-appendix-current-commander-state--deployed-battlegroups)

---

## 1. Executive Summary & Core Design Pillars

World War Rogue is an intense, gritty modern warfare strategy and tactical survival simulation designed to disrupt the mobile/browser strategy genre. It merges the deep base-building, perimeter fortification, and defensive layout strategy of *Clash of Clans* with the persistent survival resource urgency and swarm tension of *Last War*, fundamentally upgraded with authentic military ballistics and pro-consumer fairness.

### Key Pillars:
1. **Deterministic 2D Ballistic Physics:** Direct-fire kinetic APFSDS rounds, high-explosive parabolic mortar arcs, projectile velocity drop, air drag, destructible barriers, and angular armor ricochet calculation.
2. **True Destructible Environments:** Concrete blast walls, sandbag redoubts, dragon's teeth, fuel tanks, and automated CIWS defense turrets with localized hit points and persistent battle scarring.
3. **100+ Authentic Global Military Platforms:** Real-world military platforms spanning 11 sovereign allied and neutral nations across 4 technological eras (Cold War Foundations, Modern Advanced Warfare, Near-Future Enhanced, and Futuristic Experimental Prototypes).
4. **Strict 5-Squad Tactical Discipline:** Strategic squad composition capped at 5 distinct battlegroups (Alpha, Bravo, Charlie, Delta, Echo) with up to 6 units per squad (maximum 30 active deployable units out of 100+ pool), preventing mindless numerical spam.
5. **Anti-Predatory Fair Armory:** Absolute elimination of $99.99 whale paywalls. Micro-crates are strictly capped at $0.99 to $4.99 with generous free daily tactical drops, pity timers (guaranteed legendary every 10 crates), and strict skill-based rock-paper-scissors counterplay where tactical positioning and flanking allow free-to-play commanders to defeat high-spending players.
6. **Cross-Platform Tactical Comms:** Seamless cross-play networking supporting real-time military frequencies (Global, Alliance, Defense, Sector SOS) paired with instant 9-language neural auto-translation.
7. **Territorial Battlegroup Sovereignty:** Persistent 36-sector theater maps where 100-member alliances deploy coordinated spearheads to capture oil refineries, radar installations, and missile silos for hourly resource dividends.

---

## 2. Global Lore, Factions & Seasonal Theaters

### 2.1 The Grand Collapse
In the mid-2020s, a coordinated cyber-kinetic ASAT (Anti-Satellite) barrage blinded orbital reconnaissance networks, severing global supply chains and causing the collapse of centralized command structures. Regional military commands, private security contractors, and rogue battlegroups fractured into autonomous regional factions vying for remaining strategic refineries, alloy caches, and munitions stockpiles.

### 2.2 The 3 Seasonal Campaign Theaters
Environmental conditions dynamically modify ballistic range, thermal optical signatures, track traverse speeds, and fuel consumption:

| Season Theater | Codename | Terrain & Climate | Tactical Modifiers |
| :--- | :--- | :--- | :--- |
`;

  SEASONS_DATA.forEach((s) => {
    bible += `| **${s.name}** | \`${s.codeName}\` | ${s.terrainType} • ${s.weatherCondition} | **Optic:** ×${s.hazardEffect.opticModifier} • **Speed:** ×${s.hazardEffect.speedModifier} • **Fuel Burn:** ×${s.hazardEffect.fuelConsumptionRate} |\n`;
  });

  bible += `
---

## 3. Ballistics Engine & Deterministic Physics Equations

Combat calculations in World War Rogue discard artificial dice rolls in favor of continuous 2D vector kinematics and material science.

### 3.1 Parabolic Trajectory Equations
Mortars, howitzers, and rocket artillery follow continuous ballistic parabolic arcs:
$$\\vec{r}(t) = \\vec{r}_0 + \\vec{v}_0 t + \\frac{1}{2}\\vec{g}t^2$$

Where:
- $\\vec{v}_0 = (v_0 \\cos\\theta, v_0 \\sin\\theta)$ represents initial muzzle velocity and firing elevation.
- $\\vec{g} = (0, 9.81\\,\\text{m/s}^2)$ represents gravity constant scaled to canvas coordinate space.
- Horizontal velocity undergoes air drag decay: $v_x(t) = v_{x0} \\cdot e^{-\\gamma t}$, where $\\gamma = 0.045\\,\\text{s}^{-1}$.

### 3.2 Angle of Incidence & Armor Ricochet Math
Armor penetration depends strictly on impact angle $\\alpha$ measured from the armor surface normal:
$$\\text{Effective Armor Thickness } T_{\\text{eff}} = \\frac{T_{\\text{nominal}}}{\\cos\\alpha}$$

**Ricochet Law:**
$$\\text{If } \\alpha \\ge 68^\\circ \\implies \\text{RICOCHET GUARANTEED (0 Damage to Hull, Projectile Deflected)}$$

When $\\alpha < 68^\\circ$, penetration occurs if projectile kinetic penetration $P_{\\text{kin}} > T_{\\text{eff}}$, inflicting full hull trauma plus internal spalling.

### 3.3 Destructible Fortification & Blast Damage Falloff
High-explosive (HE) and thermobaric artillery shells inflict quadratic blast falloff within fragmentation radius $R$:
$$D(r) = D_0 \\cdot \\left(1 - \\frac{r}{R}\\right)^2 \\quad \\text{for } r \\le R$$

Cover absorbs damage along the line of sight:
- **Sandbag Redoubts:** 800 HP (Absorbs small arms and shrapnel; collapses instantly to 120mm+ kinetic rounds).
- **Reinforced Concrete Blast Walls:** 3,200 HP (Requires dedicated bunker-buster or sustained APFSDS penetrators to breach).
- **Dragon's Teeth:** 2,400 HP (Prevents tracked vehicle entry; intact until neutralized by heavy engineering charges).

---

## 4. Squad Doctrine & Complete 100+ Unit Military Catalog

### 4.1 Deployment Rules
- **5 Deployable Squads:**
  - **Squad Alpha:** Spearhead Assault & Heavy Armor
  - **Squad Bravo:** Breakthrough Siege & Artillery
  - **Squad Charlie:** Flanking Recon & Air Interdiction
  - **Squad Delta:** Air Defense & Tactical Support
  - **Squad Echo:** Black Ops & Stealth Disruption
- **6 Units per Squad:** 30 maximum active battlefield units from the 100+ unit catalog.

### 4.2 Complete Roster of 100+ Units (Authentic Specs & Tactical Balancing)

| # | Unit Name | Nation | Era | Role | HP | Armor | Firepower | Range | Advantage | Disadvantage |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- | :--- |
`;

  RAW_UNITS_DATA.forEach((u, idx) => {
    const flag = COUNTRY_NAMES[u.country]?.flag || '';
    bible += `| ${idx + 1} | **${u.name}** | ${flag} ${u.country} | ${u.era} | ${u.role} | ${u.hp} | ${u.armor} | ${u.firepower} | ${u.range}m | ${u.advantage} | ${u.disadvantage} |\n`;
  });

  bible += `
---

## 5. Forward Operating Base (FOB) Fortifications & Base Building

Commanders engineer custom defensive base grids featuring localized electrical grids, radar relays, and interlocking fields of fire:

### 5.1 Defensive Infrastructure
- **Tactical Command HQ:** Central processing node coordinating radar perimeter, squad deployment limits, and tech unlocks.
- **Phalanx CIWS 20mm Vulcan Turret:** High-rate-of-fire rotary anti-air defense intercepting incoming mortar shells, rockets, and drones within 250m.
- **155mm Heavy Howitzer Emplacement:** Over-the-horizon indirect fire battery delivering continuous high-explosive counter-battery strikes.
- **Surface-to-Air Missile (SAM) Silo:** Radar-guided interceptors neutralizing high-altitude supersonic bombers and CAS gunships.
- **Modular Concrete Blast Walls & Gates:** Interlocking perimeter barriers funneling hostiles into pre-sighted kill zones.
- **Dragon's Teeth Barriers:** Reinforced pyramidal concrete obstacles halting tracked vehicle advance.
- **Strategic Fuel Silos & Ammo Bunkers:** Resource storage facilities susceptible to catastrophic secondary explosion if structural integrity drops to zero.

### 5.2 Persistent Degradation & Repair Drone Cycle
Base structures retain combat damage between battles. Commanders must dispatch autonomous engineering drones and allocate Alloy and Fuel to repair blast fractures before the next siege cycle begins.

---

## 6. Dynamic Survival Economy & Anti-Predatory Fair Armory

### 6.1 The Five Strategic Resources
1. **Fuel (JP-8 & Fusion Cores):** Powers armored vehicle engines, base generators, and aerial airstrikes. Depletes during movement and radar sweeps.
2. **Rations (MREs & Hydroponic Greens):** Sustains personnel readiness. Severe deficits cause morale collapse, lowering reload speeds by 30%.
3. **Munitions (High-Caliber Shells & Missiles):** Consumed with every ballistic volley, CIWS burst, and artillery bombardment.
4. **Alloy (Titanium-Composite & Armor Steel):** Required to repair structural fractures, upgrade base defenses, and reinforce tank hulls.
5. **War Bonds (Merit Commendations):** Earned through tactical victories, sector defense, and seasonal tasks. Unlocks units with zero microtransactions.

### 6.2 The Anti-Predatory Fair Armory Model
World War Rogue rejects the abusive $99.99 microtransaction packs common in mobile strategy titles:
- **Fair Supply Crates:** Micro-crates priced strictly between **$0.99 and $4.99**.
- **Generous Daily Drops:** Free daily drops of Fuel, Munitions, and Alloy for all commanders.
- **Hard Anti-Pity Cap:** Guaranteed Legendary blueprint every 10 crate opens.
- **Skill Over Spend:** Flanking maneuvers, elevation advantages, and unit hard-counters allow free-to-play commanders using Cold War or Modern units to destroy experimental units fielded by paying players.

---

## 7. Alliance High Command & 100-Member Hierarchy

Alliances are structured as 100-commander military battlegroups with clear operational chains of command:

### 7.1 Chain of Command
- **1 Supreme Admiral:** Battlegroup Commander, sets strategic defense focus, declares theater wars, and assigns command roles.
- **Up to 10 Task Force Colonels:** Staff officers authorized to dispatch tactical alerts, activate emergency fortification buffs, and direct combat tasks.
- **Up to 89 Field Lieutenants:** Frontline tactical commanders executing sector raids, defensive reinforcement, and resource logistics.

### 7.2 Alliance Operational Tasks & Daily Orders
- Coordinated convoy escorts, refinery defense sieges, radar recalibrations, and bunker-busting operations yielding pooled alliance XP and seasonal trophies.

---

## 8. Territorial Warfare: 36 Strategic Sectors & Dominance Scoring

The seasonal theater is partitioned into **36 distinct, contested strategic sectors**:

### 8.1 Composite Dominance Scoring Formula
$$\\text{Composite Score} = (0.40 \\times \\text{Combat Power}) + (0.35 \\times \\text{Season Event Points}) + (0.25 \\times \\text{Territory Dominance Points})$$

### 8.2 The 36 Strategic Sectors of Season 01 (Sandstorm Perimeter)

| Sector ID | Grid | Sector Name | Facility Type | Controlling Tag | Defense Garrison | Strategic Buff | Hourly Resource Dividends |
| :---: | :---: | :--- | :---: | :---: | :---: | :--- | :--- |
`;

  INITIAL_THEATER_SECTORS.forEach((sec) => {
    const tag = sec.controllingAllianceTag || 'CONTESTED';
    const yields = `+${sec.hourlyYield.fuel}F / +${sec.hourlyYield.munitions}M / +${sec.hourlyYield.alloy}A / +${sec.hourlyYield.warBonds}WB`;
    bible += `| **${sec.id}** | \`${sec.gridCoord}\` | ${sec.name} | ${sec.type.toUpperCase()} | \`${tag}\` | ${sec.garrisonRating.toLocaleString()} CP | ${sec.buffYield} | ${yields} |\n`;
  });

  bible += `
---

## 9. Global Comms, 4 Military Frequencies & Neural Auto-Translation

Tactical radio communications operate on 4 dedicated frequency bands:
1. **142.80 MHz — Global Combined Arms:** Public communications across all allied and rival commanders with neural auto-translation between 9 languages (EN, ES, DE, FR, RU, JP, KR, AR, ZH).
2. **121.50 MHz — Alliance Encrypted High Command:** Private channel restricted strictly to verified battlegroup personnel.
3. **446.00 MHz — Sector Tactical SOS & Distress:** Emergency channel automatically broadcasting nearby defensive breaches and siege alarms.
4. **243.00 MHz — Server Defense Broadcast:** DEFCON status broadcasts and server-wide weather alerts.

---

## 10. Technical Engine Architecture & Procedural Web Audio Engine

### 10.1 Technology Stack
- **Frontend:** React 19, TypeScript, Tailwind CSS, Lucide Icons, Canvas 2D Ballistics renderer.
- **Backend:** Express API, Node.js, low-latency WebSocket emulation, HMAC-SHA256 anti-cheat validation.
- **Audio Engine:** Procedural Web Audio API synthesizer. Generates authentic gunfire crackles, supersonic bullet passes, tank engine rumble, and high-frequency radio squelch chirps using sine/square wave oscillators and bandpass white noise without external MP3 audio asset bloat.

### 10.2 Cryptographic Anti-Cheat Integrity
Save payloads are digitally signed using an HMAC-SHA256 hashing routine combining user callsign, current resource balances, squad units, and a server salt. Any manual memory tampering invalidates the checksum and rejects synchronization.

---

## 11. Appendix: Current Commander State & Deployed Battlegroups

### 11.1 Active Commander Profile
- **Callsign:** ${profile.callsign}
- **Rank:** ${profile.rank}
- **Active Server Node:** ${profile.activeServer}
- **Current Active Campaign Season:** ${profile.currentSeason.toUpperCase()}
- **Base Defensive Integrity:** ${profile.baseIntegrity}%
- **Power Grid Capacity:** ${profile.powerGridMw} MW
- **Tactical Combat Record:** ${profile.pvpWins} Victories / ${profile.pvpLosses} Defeats
- **Survival Swarm Wave Record:** Wave ${profile.survivalWaveRecord}
- **Strategic Resource Stockpiles:**
  - Fuel (JP-8): ${profile.resources.fuel.toLocaleString()}
  - Rations (MREs): ${profile.resources.rations.toLocaleString()}
  - Munitions (Ordnance): ${profile.resources.munitions.toLocaleString()}
  - Alloy (Titanium Composite): ${profile.resources.alloy.toLocaleString()}
  - War Bonds (Merit Commendations): ${profile.resources.warBonds.toLocaleString()}

### 11.2 Active Squad Formations (5 Squads)
`;

  squads.forEach((sq) => {
    const assignedUnits = (sq.unitIds || [])
      .map((id) => RAW_UNITS_DATA.find((u) => u.id === id))
      .filter((u): u is typeof RAW_UNITS_DATA[0] => !!u);

    bible += `\n#### ${sq.name} (${sq.designation || 'Battlegroup'} — ${assignedUnits.length}/6 Units)
- **Specialty:** ${sq.tacticalSpecialty || 'Combined Arms'} • **Formation:** ${sq.formation}
- **Combat Power:** ${sq.totalCombatPower.toLocaleString()} CP
- **Units Deployed:**
`;
    if (assignedUnits.length === 0) {
      bible += `  *(No units currently assigned to this squad formation)*\n`;
    } else {
      assignedUnits.forEach((u, i) => {
        const flag = COUNTRY_NAMES[u.country]?.flag || '';
        bible += `  ${i + 1}. **${u.name}** (${flag} ${u.country} • ${u.era} • ${u.role}) — HP: ${u.hp} | Armor: ${u.armor} | Firepower: ${u.firepower} | Range: ${u.range}m\n`;
      });
    }
  });

  bible += `\n### 11.3 Forward Operating Base Structures (${buildings.length} Buildings)\n`;
  buildings.forEach((b) => {
    bible += `- **${b.name}** (Level ${b.level}) — Grid: (${b.x}, ${b.y}) • HP: ${b.hp}/${b.maxHp} [Defense: ${b.defenseRating}]\n`;
  });

  bible += `\n---\n*END OF MASTER GAME DESIGN BIBLE — WORLD WAR ROGUE MIL-SPEC 1.2.0*\n`;

  return bible;
}

/**
 * Generates the omniscient JSON project archive containing:
 * - The full compiled Markdown design bible
 * - All 10 documentation chapters in structured format
 * - The complete 100+ military units array
 * - All 36 theater sectors with coordinates and yields
 * - All alliances, 100-member rosters, and leaderboard scores
 * - All server instances and status
 * - All seasonal campaign theaters
 * - The active player profile, 5 squads, base buildings, resources, and HMAC-SHA256 checksum
 */
export function generateOmniscientProjectArchiveJson(
  profile: PlayerProfile,
  squads: Squad[],
  buildings: BaseBuilding[]
): object {
  const checksum = generateAntiCheatChecksum(profile.callsign, profile.resources, squads);
  const markdownBible = generateMasterGameBibleMarkdown(profile, squads, buildings);

  return {
    archiveName: 'WORLD_WAR_ROGUE_OMNISCIENT_PROJECT_ARCHIVE',
    classification: 'TOP SECRET // DEPT OF STRATEGIC WARFARE // OMNISCIENT EXPORT',
    version: '1.2.0-MILSPEC',
    exportTimestamp: new Date().toISOString(),
    engine: {
      framework: 'React 19 + TypeScript + Vite + Tailwind CSS',
      physics: 'Deterministic 2D Ballistic Arc & Quadratic Falloff Engine',
      audio: 'Procedural Web Audio API Synthesizer (Zero External Asset Bloat)',
      antiCheat: 'HMAC-SHA256 Cryptographic State Verification',
    },
    compiledMasterBibleMarkdown: markdownBible,
    documentationChapters: GAME_DOSSIER_FILES,
    completeUnitsDatabase: {
      totalUnits: RAW_UNITS_DATA.length,
      units: RAW_UNITS_DATA,
    },
    territorialWarfare: {
      theaterName: 'Season 01: Sandstorm Perimeter',
      totalSectors: INITIAL_THEATER_SECTORS.length,
      sectors: INITIAL_THEATER_SECTORS,
    },
    alliancesAndLeaderboards: {
      alliances: INITIAL_ALLIANCES_DATA,
    },
    seasonalTheaters: SEASONS_DATA,
    serverInfrastructure: SERVERS_LIST,
    activeCommanderState: {
      profile,
      squads,
      buildings,
      checksum,
    },
  };
}
