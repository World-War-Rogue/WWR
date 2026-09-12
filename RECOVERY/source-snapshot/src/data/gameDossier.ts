export interface DossierDocument {
  id: string;
  number: string;
  title: string;
  filename: string;
  category: 'overview' | 'combat' | 'units' | 'base' | 'economy' | 'alliances' | 'leaderboard' | 'network' | 'tech';
  securityLevel: string;
  classificationStamp: string;
  lastUpdated: string;
  summary: string;
  sections: {
    heading: string;
    content: string[];
    table?: {
      headers: string[];
      rows: string[][];
    };
    callout?: {
      type: 'warning' | 'intel' | 'formula' | 'protocol';
      title: string;
      text: string;
    };
  }[];
}

export const GAME_DOSSIER_FILES: DossierDocument[] = [
  {
    id: 'doc-00',
    number: '00',
    title: 'World War Rogue: Master Design Document',
    filename: 'WORLD_WAR_ROGUE_DESIGN.md',
    category: 'overview',
    securityLevel: 'LEVEL 4 CLEARANCE',
    classificationStamp: 'TOP SECRET // MASTER SPEC',
    lastUpdated: '2026-09-03',
    summary: 'Executive summary, core pillars, and high-level gameplay loops blending Clash of Clans base depth with Last War survival pressure.',
    sections: [
      {
        heading: 'Executive Summary & Vision',
        content: [
          'World War Rogue is an intense, gritty modern warfare strategy game fusing persistent base-building and fortification depth with high-stakes survival resource pressure.',
          'Key innovations include deterministic 2D ballistic physics, fully destructible battlefield fortifications, 100+ global military platforms, strict 5-squad discipline, and pro-consumer fair monetization.'
        ],
        callout: {
          type: 'intel',
          title: 'CORE GAME DESIGN PHILOSOPHY',
          text: 'Tactical positioning, ballistic cover, and unit counters allow skilled free-to-play commanders to defeat high spenders. No $99 pay-to-win mechanics.'
        }
      },
      {
        heading: 'Pillars of Competitive Fairness',
        content: [
          'Every unit features explicit tactical advantages and vulnerabilities.',
          'Combat is calculated using real parabolic ballistic trajectories, velocity decay, and angle-dependent armor ricochet math.'
        ]
      }
    ]
  },
  {
    id: 'doc-01',
    number: '01',
    title: 'Game Overview, Lore & Geopolitical Setting',
    filename: '01_GAME_OVERVIEW_AND_LORE.md',
    category: 'overview',
    securityLevel: 'LEVEL 4 CLEARANCE',
    classificationStamp: 'RESTRICTED // NATO MIL-SPEC',
    lastUpdated: '2026-09-03',
    summary: 'Narrative backdrop, collapse of satellite communication grids, resource conflicts, and the 3 seasonal campaign theaters.',
    sections: [
      {
        heading: 'Geopolitical Conflict Background',
        content: [
          'In the mid-2020s, catastrophic orbital collisions and the depletion of key lithium and titanium reserves shattered centralized international treaties.',
          'Commanders deploy Forward Operating Bases (FOBs) in hostile frontiers, managing survival resources while coordinating in 100-member battlegroup alliances.'
        ]
      },
      {
        heading: 'The 3 Campaign Theaters',
        content: [
          'Theaters shift dynamically by season, fundamentally altering ballistic conditions, vehicle traction, and survival economics.'
        ],
        table: {
          headers: ['Season', 'Theater Codename', 'Terrain & Atmosphere', 'Combat Effect'],
          rows: [
            ['Season 01', 'Operation Sandstorm', 'Arid desert dunes & oil basins', '+5% muzzle velocity, dust storms impair long-range optics'],
            ['Season 02', 'Operation Frostbite', 'Glacial fjords & permafrost', '-8% projectile range, sub-zero engine freeze hazards'],
            ['Season 03', 'Operation Iron Jungle', 'Equatorial rainforest & monsoons', 'Heavy canopy detonates proximity fuses, mud slows armor']
          ]
        }
      }
    ]
  },
  {
    id: 'doc-02',
    number: '02',
    title: 'Ballistics, Trajectory Equations & Physics Engine',
    filename: '02_BALLISTICS_AND_PHYSICS_ENGINE.md',
    category: 'combat',
    securityLevel: 'LEVEL 3 CLEARANCE',
    classificationStamp: 'CONFIDENTIAL // ORDNANCE',
    lastUpdated: '2026-09-03',
    summary: 'Mathematical models for parabolic projectile arcs, armor sloping, angle of attack ricochets, and destructible obstacle physics.',
    sections: [
      {
        heading: 'Deterministic Trajectory Formulation',
        content: [
          'All projectiles (shells, mortars, ATGMs) utilize continuous discrete vector integration rather than random RNG hit rolls.'
        ],
        callout: {
          type: 'formula',
          title: 'BALLISTIC TRAJECTORY VECTOR EQUATION',
          text: 'r(t) = r₀ + v₀·t + 0.5·g·t² | Ricochet Angle Threshold: θ ≥ 68° | Effective Armor = Nominal / cos(θ)'
        }
      },
      {
        heading: 'Destructible Battlefield Obstacles',
        content: [
          'Obstacles degrade dynamically when struck by kinetic shells or high-explosive blast waves, collapsing into low-cover rubble.'
        ],
        table: {
          headers: ['Structure', 'Max HP', 'Kinetic Resistance', 'HE Blast Resistance', 'Destruction State'],
          rows: [
            ['Sandbag Redoubt', '250 HP', '40% Deflection', '10% (High Vulnerability)', 'Collapses to ground berm (25% cover)'],
            ['Concrete Blast Wall', '1,200 HP', '85% Deflection', '70% Resistance', 'Fractures into jagged rubble'],
            ['Dragon\'s Teeth', '2,500 HP', '95% (Immune to AP)', '80% Resistance', 'Impedes tracked vehicles until breached'],
            ['Fuel Tanker Depot', '400 HP', '10% Deflection', '5% Highly Volatile', 'Catastrophic secondary explosion (300px AOE)']
          ]
        }
      }
    ]
  },
  {
    id: 'doc-03',
    number: '03',
    title: 'Military Unit Roster & Squad Command Doctrine',
    filename: '03_MILITARY_UNITS_AND_SQUAD_DOCTRINE.md',
    category: 'units',
    securityLevel: 'LEVEL 3 CLEARANCE',
    classificationStamp: 'TOP SECRET // TACTICAL ARSENAL',
    lastUpdated: '2026-09-03',
    summary: '100+ authentic weapon platforms across 11 global nations, 4 technological eras, and strict 5-squad 6-unit deployment limits.',
    sections: [
      {
        heading: 'Technological Eras',
        content: [
          'Era I: Cold War Foundations (M60A3 Patton, T-72M1, M113, TOW Jeep, UH-1 Huey).',
          'Era II: Modern Advanced (M1A2 SEPv3 Abrams, Leopard 2A7V, Challenger 2, Archer 155mm, AH-64E Apache).',
          'Era III: Near-Future Enhanced (Hybrid Stryker II, Boxer CRV, Drone Carrier, Trophy APS).',
          'Era IV: Futuristic Prototypes (Apex Railgun Tank, DEW Laser CIWS, EMP Swarms, Orbital Recon Beacon).'
        ]
      },
      {
        heading: 'Strict 5-Squad Command Discipline',
        content: [
          'Commanders field exactly 5 operational squads with up to 6 units per squad (maximum 30 active units out of 100+ choices).',
          'Squad Alpha: Spearhead Armored Breaching',
          'Squad Bravo: Heavy Siege & Long-Range Artillery',
          'Squad Charlie: Rapid Reconnaissance & Flanking Interdiction',
          'Squad Delta: Air Defense & Electronic Warfare Grid',
          'Squad Echo: Special Operations & Aerial Precision Strike'
        ],
        callout: {
          type: 'warning',
          title: 'DOCTRINE CAPACITY CEILING',
          text: 'Over-stacking tanks without anti-air coverage leaves squads defenseless against attack helicopters. Balance is mandatory.'
        }
      }
    ]
  },
  {
    id: 'doc-04',
    number: '04',
    title: 'Base Building & Fortifications Specification',
    filename: '04_BASE_BUILDING_AND_FORTIFICATIONS.md',
    category: 'base',
    securityLevel: 'LEVEL 3 CLEARANCE',
    classificationStamp: 'CONFIDENTIAL // FORTIFICATION',
    lastUpdated: '2026-09-03',
    summary: 'Isometric Forward Operating Base layout, Tactical HQ, CIWS rotary interceptors, Howitzers, and repair cycles.',
    sections: [
      {
        heading: 'Forward Operating Base Infrastructure',
        content: [
          'Commanders position defensive turrets, sensor arrays, and production buildings on an isometric grid.',
          'Tactical HQ: Dictates building upgrade tiers, command radar radius, and squad dispatch capacities.',
          'Phalanx CIWS: 20mm rotary Gatling cannon shooting down incoming artillery shells and mortars.',
          '155mm Heavy Howitzer: Provides ballistic counter-battery bombardment against attacking raiders.',
          'Surface-to-Air Missile (SAM) Silo: Defends base airspace against attack helicopters and airstrikes.'
        ]
      },
      {
        heading: 'Persistent Base Degradation',
        content: [
          'Damage sustained during defensive battles does not auto-heal. Bases require refined Titanium Alloy to repair walls and replace burned-out generator components.'
        ]
      }
    ]
  },
  {
    id: 'doc-05',
    number: '05',
    title: 'Survival Economy & Fair Play Monetization',
    filename: '05_SURVIVAL_ECONOMY_AND_MONETIZATION.md',
    category: 'economy',
    securityLevel: 'LEVEL 2 CLEARANCE',
    classificationStamp: 'RESTRICTED // FAIR PLAY CHARTER',
    lastUpdated: '2026-09-03',
    summary: 'Dynamic 5-resource management (Fuel, Rations, Ammo, Alloy, War Bonds), survival swarm crises, and ethical $0.99–$4.99 crates.',
    sections: [
      {
        heading: 'Five Dynamic Strategic Resources',
        content: [
          'Fuel: Required to mobilize armored columns, power generators, and execute radar scans.',
          'Rations: Sustains troop morale and readiness. Starvation causes 25% accuracy and reload debuffs.',
          'Munitions: Expended during ballistic fire, howitzer barrages, and automated CIWS rounds.',
          'Alloy: High-grade titanium used for base wall fortifications, vehicle armor, and structural repairs.',
          'War Bonds: Merit currency awarded from tactical PvE commendations and milestone achievements.'
        ]
      },
      {
        heading: 'Anti-Predatory Commercial Manifesto',
        content: [
          'Disrupting the exploitative $99-$499 microtransaction traps common in mobile strategy games.',
          'All optional crates in the Fair Armory are priced between $0.99 and $4.99 with 100% transparent drop odds.',
          'Daily free tactical air drops guarantee steady resource reserves for all players regardless of spend.'
        ],
        callout: {
          type: 'protocol',
          title: 'ETHICAL MONETIZATION GUARANTEE',
          text: 'No paywalls. No zero-percent drop chances. Free-to-play commanders have access to all 100+ military units through gameplay progression.'
        }
      }
    ]
  },
  {
    id: 'doc-06',
    number: '06',
    title: 'Alliance High Command & 100-Member Hierarchy',
    filename: '06_ALLIANCE_HIGH_COMMAND.md',
    category: 'alliances',
    securityLevel: 'LEVEL 4 CLEARANCE',
    classificationStamp: 'TOP SECRET // BATTLEGROUP HIERARCHY',
    lastUpdated: '2026-09-03',
    summary: '100-member battlegroup command structure: 1 Admiral, 10 Colonels, 89 Lieutenants, daily tasks, and tactical comms.',
    sections: [
      {
        heading: 'Hierarchical Chain of Command',
        content: [
          'Alliances are strictly structured around 100 officers to ensure clear chain of command and distributed task leadership.',
          '1 Admiral: Supreme commander with authority over diplomacy, war declarations, alliances, and officer promotions.',
          '10 Colonels: Task force leaders who manage sector garrisons, initiate alliance research, and command tactical tasks.',
          '89 Lieutenants: Frontline staff officers contributing combat power, reinforcing garrisons, and participating in operations.'
        ]
      },
      {
        heading: 'Tactical Tasks & Operations',
        content: [
          'Daily Logistics Quota: Combined delivery of 500,000 Alloy and 200,000 Fuel to the Alliance War Chest.',
          'Weekly Fortress Raid: Multi-squad assault on automated rogue NPC citadels to unlock experimental vehicle schematics.'
        ]
      }
    ]
  },
  {
    id: 'doc-07',
    number: '07',
    title: 'Leaderboard Rankings & 36-Sector Territorial Warfare',
    filename: '07_LEADERBOARD_AND_TERRITORIAL_WARFARE.md',
    category: 'leaderboard',
    securityLevel: 'LEVEL 4 CLEARANCE',
    classificationStamp: 'TOP SECRET // DOMINANCE INDEX',
    lastUpdated: '2026-09-03',
    summary: 'Composite dominance scoring formula (40% Combat Power, 35% Season Event, 25% Territorial Control), 36-sector map, and hourly dividends.',
    sections: [
      {
        heading: 'Composite Dominance Formula',
        content: [
          'Rankings integrate three vital pillars of wartime dominance into a single normalized index (0 to 100):'
        ],
        callout: {
          type: 'formula',
          title: 'ALLIANCE DOMINANCE SCORE FORMULA',
          text: 'Dominance Score = (0.40 × Combat Power Score) + (0.35 × Season Event Score) + (0.25 × Territorial Control Score)'
        }
      },
      {
        heading: '36 Strategic Sectors & Hourly Dividends',
        content: [
          'The theater comprises 36 sectors arranged in a 6x6 grid. Controlling sectors yields automated hourly dividends to all 100 alliance members.',
          'Refineries: +450 Fuel/hr per sector.',
          'Arsenals: +400 Ammo/hr per sector.',
          'Smelting Hubs: +380 Alloy/hr per sector.',
          'Heavy Citadels: +120 War Bonds/hr and +15% garrison fortification capacity.'
        ]
      }
    ]
  },
  {
    id: 'doc-08',
    number: '08',
    title: 'Global Comms, Auto-Translation & Server Networking',
    filename: '08_GLOBAL_COMMS_AND_NETWORKING.md',
    category: 'network',
    securityLevel: 'LEVEL 3 CLEARANCE',
    classificationStamp: 'CONFIDENTIAL // COMMS PROTOCOL',
    lastUpdated: '2026-09-03',
    summary: 'Real-time multi-frequency radio channels, 9-language neural translation, and cryptographic anti-cheat save verification.',
    sections: [
      {
        heading: '4 Tactical Radio Frequencies',
        content: [
          'Global Broadcast (142.80 MHz): Cross-server communications.',
          'Alliance Frequency (121.50 MHz): Internal 100-member military coordination.',
          'Squad Intercom (446.00 MHz): Active combat orders during tactical sorties.',
          'Emergency Defense (243.00 MHz): Automated perimeter alarms and raid alerts.'
        ]
      },
      {
        heading: '9-Language Live Translation Matrix',
        content: [
          'All communication channels feature instant translation between English, Spanish, German, French, Russian, Japanese, Korean, Arabic, and Chinese to enable seamless multinational alliance collaboration.'
        ]
      }
    ]
  },
  {
    id: 'doc-09',
    number: '09',
    title: 'Technical Architecture & Development Roadmap',
    filename: '09_TECHNICAL_ARCHITECTURE_AND_ROADMAP.md',
    category: 'tech',
    securityLevel: 'LEVEL 2 CLEARANCE',
    classificationStamp: 'RESTRICTED // ENGINEERING',
    lastUpdated: '2026-09-03',
    summary: 'React 19 + TypeScript + Tailwind CSS stack, procedural Web Audio synthesizer, Express private server, and development roadmap.',
    sections: [
      {
        heading: 'Software Stack & Architectural Philosophy',
        content: [
          'Frontend: React 19, TypeScript, Tailwind CSS, Vite 6.',
          'Audio Synthesis: Custom Web Audio API procedural sound engine generating gunfire, sirens, and radio chirps without external audio assets.',
          'Backend & Anti-Cheat: Express.js private server with HMAC-SHA256 squad validation and cryptographic save state export/import.'
        ]
      },
      {
        heading: 'Completed & Upcoming Milestones',
        content: [
          'Phase 1 to Phase 6 Completed: Base building, 100+ units, ballistics simulator, fair armory, 100-member alliance high command, composite dominance leaderboard, and classified game file dossier.',
          'Upcoming Phase 7: Season 02 Operation Frostbite with sub-zero ice mechanics, frozen naval docks, and advanced thermal optics.'
        ]
      }
    ]
  }
];
