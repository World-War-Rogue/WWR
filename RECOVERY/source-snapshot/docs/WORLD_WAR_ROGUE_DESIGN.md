# WORLD WAR ROGUE: MASTER DESIGN DOCUMENTATION & FIELD MANUAL

> **Original design document, written before the game was built.** It describes
> an Express private server, ballistic combat, a 100+ unit roster and an
> Admiral/Colonel hierarchy, none of which exist. For how the game actually
> works, read [`HOW-IT-WORKS.md`](./HOW-IT-WORKS.md).

**Project Codename:** World War Rogue  
**Version:** 1.0.0 Tactical Preview  
**Genre:** Mobile Tactical Strategy & Survival with Base Building, PvP Ballistics, and Cross-Server Warfare  
**Engine:** React 19, TypeScript, Tailwind CSS, Express Private Server, Web Audio API Synthesizer, Canvas 2D Ballistic Physics  

---

## 1. Executive Summary & Vision
World War Rogue is an intense, gritty modern warfare strategy game fusing the persistent base-building and fortification depth of *Clash of Clans* with the high-stakes survival resource pressure of *Last War*, upgraded with:
- **Realistic Ballistic Physics**: Arc trajectories, velocity drop, armor ricochets, and explosive fragmentation radii.
- **Destructible Environments**: Concrete dragon's teeth, sandbag bunkers, watchtowers, and fuel depots that can be chipped, fractured, and obliterated by heavy ordnance.
- **100+ Global Military Units**: Spanning 11 nations (USA, Germany, UK, France, Japan, Israel, South Korea, Sweden, Canada, Australia, Ukraine) and 4 technological eras (Cold War, Modern Advanced, Near-Future, Futuristic Prototypes).
- **Tactical Squad Discipline**: Strict limit of 5 deployable squads (Alpha, Bravo, Charlie, Delta, Echo) with up to 6 specialized units per squad (30 total active units from 100+ choices).
- **Pro-Consumer Fair Monetization**: Disrupting the predatory $99 microtransaction traps of *Last War* with $0.99–$4.99 micro-investments and rewarding free-to-play tactical mechanics where position, cover, and weapon counters allow skilled F2P commanders to defeat high spenders.
- **Cross-Server Global Comms with Auto-Translation**: Seamless cross-platform play (PC, Mobile, Console) with real-time military frequencies translating global languages (English, Spanish, German, French, Russian, Japanese, Korean, Arabic, Chinese).
- **Seasons in Diverse Lands**: 3 initial full campaign theaters (Operation Sandstorm, Operation Frostbite, Operation Iron Jungle) altering ballistics, thermal visibility, vehicle traction, and survival hazards.

---

## 2. Dynamic Resource Management & Survival Mechanics
Commanders must balance five dynamic strategic resources:
1. **Fuel (JP-8 / Fusion Cells)**: Required to power armored vehicles, generators, and airstrikes. Depletes during movement and radar sweeps.
2. **Rations (MREs / Hydroponics)**: Sustains unit readiness and recruit morale. Shortages cause performance debuffs.
3. **Munitions (High-Caliber Ordnance)**: Consumed in ballistic fire, artillery barrages, and turret defense grids.
4. **Alloy (Titanium-Composite & Nanites)**: Sourced from scavenging and refineries; used for base fortification and armor modifications.
5. **War Bonds (Merit & Commendations)**: Fair currency earned through tactical defense, seasonal missions, and micro-supplies.

### Survival Crisis Events
- **Rogue Insurgency Waves**: Nighttime AI swarm raids challenging base perimeter defenses.
- **Environmental Storms**: Dust storms (Sandstorm), Sub-zero blizzards (Frostbite), Monsoon floods (Iron Jungle) causing power grid drains and sensor degradation.
- **Integrity & Repair**: Bases suffer persistent ballistic damage that requires active engineering drones and alloy repair.

---

## 3. Base Building & Fortification Grid
- **Tactical HQ**: Coordinates radar range, squad capacities, and tech tree progression.
- **Phalanx CIWS & Anti-Air SAM**: Intercepts ballistic rockets, mortars, and close air support.
- **155mm Howitzer & Mortar Emplacements**: Over-the-horizon ballistic bombardment.
- **Destructible Fortifications**:
  - Sandbag Redoubts (absorbs small arms, collapses under HE shells).
  - Reinforced Concrete Blast Walls (requires APFSDS or heavy bunker-buster munitions to breach).
  - Dragon's Teeth (anti-armor vehicle obstacles).
  - Fuel Reserves (volatile secondary explosion risk if compromised).

---

## 4. The 100+ Unit Roster & Tactical Balancing
Units are categorized across 4 Technological Eras:
1. **Era I: Cold War Foundations**: M60A3 Patton, T-72M1, M113 Gavin, BMP-1, TOW Missile Jeep, BGM-71, UH-1 Iroquois.
2. **Era II: Modern Advanced Warfare**: M1A2 SEPv3 Abrams, Leopard 2A7V, Challenger 2 TES, AMX Leclerc, Merkava Mk IV, K2 Black Panther, Type 10 Hitomaru, Archer 155mm, AH-64E Apache Guardian, Javelin ATGM Teams.
3. **Era III: Near-Future Enhanced**: Hybrid-Drive Stryker II, Cyber-EW Drone Carrier, Active Camo Sniper, Boxer CRV, Trophy APS Defenders.
4. **Era IV: Futuristic Experimental**: Apex Railgun Destroyer, Directed-Energy Laser Aegis, Exoskeleton Skirmishers, EMP Drone Swarms, Orbital Particle Beacons.

### Squad Composition Rules
- Maximum **5 Squads**: Alpha (Spearhead), Bravo (Siege/Armor), Charlie (Interdiction/Recon), Delta (Air Defense/Support), Echo (Black Ops/Stealth).
- Maximum **6 Units per Squad** (up to 30 active units out of 100+ pool).
- Every unit features an explicit **Advantage** (e.g. *95% Kinetic Deflection*) and **Disadvantage** (e.g. *High Fuel Burn & Top-Armor ATGM Vulnerability*).

---

## 5. Ballistic Physics & Destructible Environment Engine
- **Trajectory Calculation**:
  $$\vec{r}(t) = \vec{r}_0 + \vec{v}_0 t + \frac{1}{2} \vec{g} t^2$$
- **Armor Sloping & Ricochet**: Projectiles hitting armor at acute angles (>65°) undergo ricochet checks based on kinetic energy vs. plate hardness.
- **Destructible Voxel-Grid**: Structures absorb damage, generate dust/shrapnel particles, and fracture into low-cover rubble.

---

## 6. Anti-Cheat & Private Server Architecture
To ensure competitive fairness and prevent client-side memory tampering:
- Squad battle power, tech loadouts, and battle results are hashed and authenticated against the private server ledger (`/api/server/verify-squad`).
- Matchmaking and PvP raid records are stored server-authoritatively.

---

## 7. Cross-Platform Controls
- **PC**: Keyboard shortcuts (1-5 Squad select, Q/W/E/R Air Support, Spacebar Tactical Pause/Slow-mo, Tab Comms).
- **Mobile**: High-touch 48px target pads, thumb command bar, gesture zoom and drag.
- **Console**: Gamepad D-pad navigation, bumper squad cycle, trigger tactical deployment.
