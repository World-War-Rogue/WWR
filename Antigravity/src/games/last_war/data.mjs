/**
 * Last War: Survival Game - Master Game Data & System Specifications
 * Real heroes, squad roles, counter triangle, HQ progression, drone components, and gear.
 */

export const LAST_WAR_DATA = {
  name: 'Last War: Survival Game',
  developer: 'FirstFun',
  genre: 'Mobile 4X Strategy / Base Builder / Squad Auto-Battler',
  platform: 'iOS / Android (Portrait Orientation)',
  
  // =========================================================================
  // 1. HERO ROSTER (Tanks, Aircraft, Missiles across UR and SSR tiers)
  // =========================================================================
  heroes: [
    // --- TANK HEROES (Strong vs Missile, Weak vs Aircraft) ---
    {
      id: 'tank-kimberly',
      name: 'Kimberly',
      tier: 'UR',
      type: 'Tank',
      role: 'Attacker',
      position: 'Back',
      powerRating: 1250,
      baseHp: 68000,
      baseAttack: 14200,
      baseDefense: 6200,
      critRate: 0.28,
      deflectionRate: 0.10,
      skillName: 'Energy Artillery Barrage',
      skillMultiplier: 4.80, // Massive AoE energy damage
      skillDescription: 'Fires high-intensity energy artillery hitting all enemy targets with high crit multiplier.',
      energyCost: 1000,
      isCoreMeta: true
    },
    {
      id: 'tank-murphy',
      name: 'Murphy',
      tier: 'UR',
      type: 'Tank',
      role: 'Defender',
      position: 'Front',
      powerRating: 1220,
      baseHp: 112000,
      baseAttack: 6800,
      baseDefense: 13500,
      critRate: 0.10,
      deflectionRate: 0.35,
      skillName: 'Ironclad Kinetic Shield',
      skillMultiplier: 0.40, // 40% squad damage reduction
      skillDescription: 'Deploys an ironclad kinetic defense matrix absorbing incoming physical and energy damage for 5s.',
      energyCost: 1000,
      isCoreMeta: true
    },
    {
      id: 'tank-williams',
      name: 'Williams',
      tier: 'UR',
      type: 'Tank',
      role: 'Defender',
      position: 'Front',
      powerRating: 1210,
      baseHp: 108000,
      baseAttack: 7200,
      baseDefense: 13100,
      critRate: 0.12,
      deflectionRate: 0.32,
      skillName: 'Fortified Bulwark',
      skillMultiplier: 0.35,
      skillDescription: 'Taunts enemy frontliners and grants heavy defense buff to adjacent allies.',
      energyCost: 1000,
      isCoreMeta: true
    },
    {
      id: 'tank-marshall',
      name: 'Marshall',
      tier: 'UR',
      type: 'Tank',
      role: 'Support',
      position: 'Back',
      powerRating: 1190,
      baseHp: 74000,
      baseAttack: 9800,
      baseDefense: 7900,
      critRate: 0.22,
      deflectionRate: 0.15,
      skillName: 'Tactical Inspiration Aura',
      skillMultiplier: 0.30, // +30% Crit Damage & +20% Attack buff
      skillDescription: 'Boosts squad-wide critical hit rate and attack damage for the entire combat duration.',
      energyCost: 1000,
      isCoreMeta: true
    },
    {
      id: 'tank-stetmann',
      name: 'Stetmann',
      tier: 'UR',
      type: 'Tank',
      role: 'Attacker',
      position: 'Back',
      powerRating: 1240,
      baseHp: 71000,
      baseAttack: 13800,
      baseDefense: 6500,
      critRate: 0.25,
      deflectionRate: 0.12,
      skillName: 'High-Frequency Beam',
      skillMultiplier: 4.40,
      skillDescription: 'Pierces through the front line directly striking high-threat backline attackers.',
      energyCost: 1000,
      isCoreMeta: true
    },
    {
      id: 'tank-violet',
      name: 'Violet',
      tier: 'SSR',
      type: 'Tank',
      role: 'Defender',
      position: 'Front',
      powerRating: 920,
      baseHp: 84000,
      baseAttack: 5200,
      baseDefense: 9400,
      critRate: 0.08,
      deflectionRate: 0.22,
      skillName: 'Blade Whirlwind',
      skillMultiplier: 2.20,
      skillDescription: 'Defensive cleave striking adjacent zombies and front enemies.',
      energyCost: 1000,
      isCoreMeta: false
    },
    {
      id: 'tank-mason',
      name: 'Mason',
      tier: 'SSR', // Note: Can promote to UR in Season 1
      type: 'Tank',
      role: 'Attacker',
      position: 'Back',
      powerRating: 980,
      baseHp: 58000,
      baseAttack: 10400,
      baseDefense: 5300,
      critRate: 0.20,
      deflectionRate: 0.10,
      skillName: 'Rapid Rotary Gatling',
      skillMultiplier: 3.10,
      skillDescription: 'Sustained bullet stream against single target frontliners.',
      energyCost: 1000,
      isCoreMeta: false
    },

    // --- AIRCRAFT HEROES (Strong vs Tank, Weak vs Missile) ---
    {
      id: 'air-dva',
      name: 'DVA',
      tier: 'UR',
      type: 'Aircraft',
      role: 'Attacker',
      position: 'Back',
      powerRating: 1260,
      baseHp: 67000,
      baseAttack: 14500,
      baseDefense: 6100,
      critRate: 0.30,
      deflectionRate: 0.12,
      skillName: 'Micro-Missile Salvo',
      skillMultiplier: 5.10,
      skillDescription: 'Unleashes devastating multi-stage micro-missiles shredding armored vehicles.',
      energyCost: 1000,
      isCoreMeta: true
    },
    {
      id: 'air-carlie',
      name: 'Carlie',
      tier: 'UR',
      type: 'Aircraft',
      role: 'Defender',
      position: 'Front',
      powerRating: 1210,
      baseHp: 106000,
      baseAttack: 7100,
      baseDefense: 13200,
      critRate: 0.12,
      deflectionRate: 0.34,
      skillName: 'Chaff & Flare Screen',
      skillMultiplier: 0.38,
      skillDescription: 'Deploys airborne countermeasures reducing enemy skill damage.',
      energyCost: 1000,
      isCoreMeta: true
    },
    {
      id: 'air-lucius',
      name: 'Lucius',
      tier: 'UR',
      type: 'Aircraft',
      role: 'Defender',
      position: 'Front',
      powerRating: 1230,
      baseHp: 110000,
      baseAttack: 7000,
      baseDefense: 13600,
      critRate: 0.11,
      deflectionRate: 0.36,
      skillName: 'Energy Absorption Shield',
      skillMultiplier: 0.42,
      skillDescription: 'Converts absorbed kinetic and energy impact into defensive overshield.',
      energyCost: 1000,
      isCoreMeta: true
    },
    {
      id: 'air-morrison',
      name: 'Morrison',
      tier: 'UR',
      type: 'Aircraft',
      role: 'Attacker',
      position: 'Back',
      powerRating: 1240,
      baseHp: 69000,
      baseAttack: 14100,
      baseDefense: 6300,
      critRate: 0.27,
      deflectionRate: 0.11,
      skillName: 'Precision Bunker Buster',
      skillMultiplier: 4.60,
      skillDescription: 'Surgical ballistic bomb directly striking highest HP targets.',
      energyCost: 1000,
      isCoreMeta: true
    },
    {
      id: 'air-schuyler',
      name: 'Schuyler',
      tier: 'UR',
      type: 'Aircraft',
      role: 'Support / Attacker',
      position: 'Back',
      powerRating: 1220,
      baseHp: 72000,
      baseAttack: 12600,
      baseDefense: 6800,
      critRate: 0.24,
      deflectionRate: 0.14,
      skillName: 'Sonic Disruption Pulse',
      skillMultiplier: 3.80,
      skillDescription: 'Stuns front-row enemies for 1 turn and disrupts energy regeneration.',
      energyCost: 1000,
      isCoreMeta: true
    },

    // --- MISSILE HEROES (Strong vs Aircraft, Weak vs Tank) ---
    {
      id: 'missile-tesla',
      name: 'Tesla',
      tier: 'UR',
      type: 'Missile',
      role: 'Attacker',
      position: 'Back',
      powerRating: 1255,
      baseHp: 68500,
      baseAttack: 14400,
      baseDefense: 6150,
      critRate: 0.29,
      deflectionRate: 0.10,
      skillName: 'Chain Lightning Overload',
      skillMultiplier: 4.95,
      skillDescription: 'High-voltage electric arcs jumping across up to 4 targets with paralysis chance.',
      energyCost: 1000,
      isCoreMeta: true
    },
    {
      id: 'missile-mcgregor',
      name: 'McGregor',
      tier: 'UR',
      type: 'Missile',
      role: 'Defender',
      position: 'Front',
      powerRating: 1215,
      baseHp: 109000,
      baseAttack: 7300,
      baseDefense: 13300,
      critRate: 0.10,
      deflectionRate: 0.33,
      skillName: 'Heavy Reactive Armor',
      skillMultiplier: 0.36,
      skillDescription: 'Absorbs ballistic impacts and reflects 15% damage back to attackers.',
      energyCost: 1000,
      isCoreMeta: true
    },
    {
      id: 'missile-fiona',
      name: 'Fiona',
      tier: 'UR',
      type: 'Missile',
      role: 'Attacker',
      position: 'Back',
      powerRating: 1235,
      baseHp: 70000,
      baseAttack: 13900,
      baseDefense: 6400,
      critRate: 0.26,
      deflectionRate: 0.11,
      skillName: 'EMP Cluster Bomb',
      skillMultiplier: 4.30,
      skillDescription: 'Disrupts aircraft flight controls and inflicts burn over time.',
      energyCost: 1000,
      isCoreMeta: true
    },
    {
      id: 'missile-swift',
      name: 'Swift',
      tier: 'UR',
      type: 'Missile',
      role: 'Attacker',
      position: 'Back',
      powerRating: 1225,
      baseHp: 69000,
      baseAttack: 13600,
      baseDefense: 6300,
      critRate: 0.25,
      deflectionRate: 0.12,
      skillName: 'Hyper-Sonic Rocket Barrage',
      skillMultiplier: 4.20,
      skillDescription: 'Rapid-firing guided missiles with elevated armor penetration.',
      energyCost: 1000,
      isCoreMeta: true
    },
    {
      id: 'missile-venom',
      name: 'Venom',
      tier: 'SSR',
      type: 'Missile',
      role: 'Attacker',
      position: 'Back',
      powerRating: 940,
      baseHp: 59000,
      baseAttack: 10100,
      baseDefense: 5400,
      critRate: 0.18,
      deflectionRate: 0.09,
      skillName: 'Toxic Chemical Spray',
      skillMultiplier: 2.80,
      skillDescription: 'Corrosive mist reducing enemy defense by 15% for 3s.',
      energyCost: 1000,
      isCoreMeta: false
    }
  ],

  // =========================================================================
  // 2. COUNTER TRIANGLE RULES & MONOTYPE SYNERGY
  // =========================================================================
  counterRules: {
    damageBonusAgainstCounter: 0.20,    // +20% damage dealt to countered unit type
    damageMitigationFromCounter: 0.20,  // -20% damage taken from countered unit type
    monotypeBonus5Heroes: 0.20,         // +20% HP, Defense, and Attack for 5 identical types
    monotypeBonus4Heroes: 0.15,         // +15% for 4 identical types
    monotypeBonus3Heroes: 0.10,         // +10% for 3 identical types
    relationships: {
      Tank: 'Missile',       // Tank beats Missile
      Missile: 'Aircraft',   // Missile beats Aircraft
      Aircraft: 'Tank'       // Aircraft beats Tank
    }
  },

  // =========================================================================
  // 3. HEADQUARTERS (HQ) PROGRESSION (Levels 1 to 30)
  // =========================================================================
  hqProgression: [
    { level: 5,  constructionTimeHours: 1,    goldCost: 50000,       ironCost: 40000,       foodCost: 60000,       troopTierUnlocked: 'T2', requiredPrereq: 'Wall Lv 4' },
    { level: 10, constructionTimeHours: 8,    goldCost: 450000,      ironCost: 380000,      foodCost: 520000,      troopTierUnlocked: 'T4', requiredPrereq: 'Wall Lv 9' },
    { level: 15, constructionTimeHours: 24,   goldCost: 3200000,     ironCost: 2800000,     foodCost: 3900000,     troopTierUnlocked: 'T5', requiredPrereq: 'Drone Center Lv 14' },
    { level: 20, constructionTimeHours: 72,   goldCost: 28000000,    ironCost: 24000000,    foodCost: 34000000,    troopTierUnlocked: 'T7', requiredPrereq: 'Tank Center Lv 19' },
    { level: 24, constructionTimeHours: 168,  goldCost: 145000000,   ironCost: 120000000,   foodCost: 165000000,   troopTierUnlocked: 'T8', requiredPrereq: 'Tech Center Lv 23' },
    { level: 27, constructionTimeHours: 360,  goldCost: 620000000,   ironCost: 540000000,   foodCost: 710000000,   troopTierUnlocked: 'T9', requiredPrereq: 'Wall Lv 26' },
    { level: 30, constructionTimeHours: 720,  goldCost: 2400000000,  ironCost: 2100000000,  foodCost: 2800000000,  troopTierUnlocked: 'T10 (Unit X)', requiredPrereq: 'Tech Center Lv 29' }
  ],

  // =========================================================================
  // 4. TECH RESEARCH: SPECIAL FORCES (T10 / Unit X Gatekeepers)
  // =========================================================================
  specialForcesTree: {
    treeName: 'Special Forces',
    targetUnit: 'Unit X (T10 Troops)',
    prerequisites: ['HQ Level 30', 'Tech Center Level 30', 'Barracks Level 30'],
    primaryBottlenecks: ['Gold (Coins)', 'Valor Badges'],
    valorBadgesRequiredForT10: 68500,
    goldRequiredForT10: 4800000000, // 4.8 Billion Gold
    gatekeeperNodes: [
      { name: 'HP Boost III', maxLevel: 10, valorCostPerLevel: 3200, goldCost: 280000000 },
      { name: 'Attack Boost III', maxLevel: 10, valorCostPerLevel: 3500, goldCost: 310000000 },
      { name: 'Defense Boost III', maxLevel: 10, valorCostPerLevel: 3200, goldCost: 280000000 },
      { name: 'Unit X Research', maxLevel: 1, valorCostPerLevel: 12000, goldCost: 850000000 }
    ]
  },

  // =========================================================================
  // 5. DRONE SYSTEM & COMPONENT SLOTS (Left vs Right Asymmetry)
  // =========================================================================
  droneSystem: {
    maxLevel: 150,
    componentSlots: [
      { slot: 1, name: 'Radar', side: 'Left', dropWeight: 0.35, difficulty: 'Common' },
      { slot: 2, name: 'Missile Launcher', side: 'Right', dropWeight: 0.15, difficulty: 'High Bottleneck' },
      { slot: 3, name: 'Turbine Engine', side: 'Left', dropWeight: 0.35, difficulty: 'Common' },
      { slot: 4, name: 'Fuel Cell', side: 'Right', dropWeight: 0.15, difficulty: 'High Bottleneck' },
      { slot: 5, name: 'Composite Armor', side: 'Left', dropWeight: 0.35, difficulty: 'Common' },
      { slot: 6, name: 'Thermal Imager', side: 'Right', dropWeight: 0.15, difficulty: 'High Bottleneck' }
    ],
    primaryResources: ['Battle Data', 'Drone Parts']
  },

  // =========================================================================
  // 6. GEAR SYSTEM (4 Slots, Levels 1-40, Mythic Promotion)
  // =========================================================================
  gearSlots: [
    { type: 'Gun', primaryStat: 'Attack', priority: 'Highest (Upgrade First)' },
    { type: 'Radar', primaryStat: 'Critical Chance & HP', priority: 'High (Upgrade Second)' },
    { type: 'Armor', primaryStat: 'Defense & HP', priority: 'Medium' },
    { type: 'Chip', primaryStat: 'Deflection & Attack', priority: 'Medium' }
  ],

  // =========================================================================
  // 7. UI / UX TELEMETRY PROFILE (Mobile Portrait Ergonomics)
  // =========================================================================
  uiProfile: {
    activeRedDotBadgesSimultaneous: 28, // High cognitive load / FOMO indicator
    dailyPopupsPerSession: 4.2,         // Microtransaction popups upon login/action
    primaryScreens: ['Base View', 'World Map', 'Heroes Vault', 'Tech Lab', 'Alliance War Room', 'Radar Station', 'Drone Center'],
    thumbReachZoneRisk: 'High on modern 19.5:9 mobile displays (top-left stamina & top-right VIP out of reach)'
  }
};
