import { Squad, BaseBuilding, DestructibleObstacle, PlayerProfile } from '../types';

export const INITIAL_SQUADS: Squad[] = [
  {
    id: 'squad_alpha',
    name: 'Squad 1: Alpha',
    designation: '1st Armored Spearhead (US/DE/GB)',
    icon: 'Shield',
    unitIds: [
      'us-m1a2-abrams',      // USA MBT
      'de-leopard-2a7',      // Germany MBT
      'us-m2a4-bradley',     // USA IFV
      'gb-challenger-2',     // UK MBT
      'us-ah64-apache',      // USA Attack Helicopter
      'us-navy-seal-breacher',// USA Recon/Sniper
    ],
    tacticalSpecialty: 'Heavy Frontal Breach & Armored Spearhead',
    totalCombatPower: 5200,
    formation: 'Wedge',
  },
  {
    id: 'squad_bravo',
    name: 'Squad 2: Bravo',
    designation: 'Iron Siege & Long-Range Artillery (DE/FR/SE)',
    icon: 'Crosshair',
    unitIds: [
      'de-pzh-2000',         // Germany 155mm SP Artillery
      'fr-caesar-155',       // France 155mm Wheeled SP Artillery
      'se-archer-artillery', // Sweden Archer 155mm
      'de-gepard-1a2',       // Germany SPAAG Air Defense
      'fr-amx-leclerc',      // France MBT
      'de-ksk-commando',     // Germany Recon Demolition
    ],
    tacticalSpecialty: 'Ballistic Saturation & Fortification Annihilation',
    totalCombatPower: 5120,
    formation: 'Line',
  },
  {
    id: 'squad_charlie',
    name: 'Squad 3: Charlie',
    designation: 'Rapid Interdiction & Wheeled Recon (JP/CA/AU)',
    icon: 'Zap',
    unitIds: [
      'jp-type-10',          // Japan Type 10 MBT
      'jp-type-16-mcv',      // Japan 8x8 Wheeled Maneuver Tank
      'ca-lav-6-coyote',     // Canada 25mm Recon
      'au-boxer-crv',        // Australia 30mm CRV
      'au-bushmaster-pmv',   // Australia Protected Mine Breacher
      'ca-jtf2-sniper',      // Canada Arctic Tier-1 Sniper
    ],
    tacticalSpecialty: 'Flanking Maneuvers & High-Speed Ambush',
    totalCombatPower: 4890,
    formation: 'Echelon',
  },
  {
    id: 'squad_delta',
    name: 'Squad 4: Delta',
    designation: 'Air-Defense & Interceptor Screen (IL/KR/UA)',
    icon: 'Radio',
    unitIds: [
      'il-iron-dome',        // Israel Iron Dome Missile Battery
      'il-merkava-mk4',      // Israel Heavy MBT
      'kr-k2-black-panther', // South Korea K2 MBT
      'kr-k30-biho',         // South Korea Air Defense Gun/Missile
      'ua-stugna-p-team',    // Ukraine Remote Laser ATGM
      'ua-t84-oplot',        // Ukraine T-84 MBT
    ],
    tacticalSpecialty: 'Air Interception & Anti-Ballistic Umbrella',
    totalCombatPower: 5260,
    formation: 'Box',
  },
  {
    id: 'squad_echo',
    name: 'Squad 5: Echo',
    designation: 'Special Black Ops & Prototype Tech (SE/UA/FR)',
    icon: 'Cpu',
    unitIds: [
      'se-strv-103-s-tank',  // Sweden S-Tank (Ricochet Angle Master)
      'se-cv9040c',          // Sweden 40mm Bofors IFV
      'gb-sas-recon',        // UK SAS Infiltrator
      'kr-udt-commando',     // South Korea Commando
      'fr-foreign-legion',   // France Sapper Breacher
      'us-stryker-dragoon',  // USA 30mm Dragoon
    ],
    tacticalSpecialty: 'Stealth Infiltration, Demolition & Night Raids',
    totalCombatPower: 4680,
    formation: 'Wedge',
  },
];

export const INITIAL_BASE_BUILDINGS: BaseBuilding[] = [
  {
    id: 'bldg_hq',
    type: 'hq',
    name: 'FOB Strategic Command Center',
    level: 4,
    x: 2,
    y: 2,
    width: 2,
    height: 2,
    hp: 4500,
    maxHp: 4500,
    defenseRating: 120,
    description: 'Central tactical command node coordinating radar detection, squad capacities, and anti-tamper security.',
    upgradeCost: { fuel: 800, alloy: 1200, munitions: 600 },
  },
  {
    id: 'bldg_ciws_1',
    type: 'phalanx_ciws',
    name: 'Phalanx CIWS 20mm Gatling',
    level: 3,
    x: 1,
    y: 0,
    width: 1,
    height: 1,
    hp: 2100,
    maxHp: 2100,
    defenseRating: 240,
    range: 350,
    description: 'Radar-guided 20mm M61 Vulcan rotary cannon shooting down incoming artillery shells and rockets.',
    upgradeCost: { fuel: 400, alloy: 700, munitions: 800 },
  },
  {
    id: 'bldg_howitzer_1',
    type: 'howitzer',
    name: 'Hardened 155mm Ballistic Emplacement',
    level: 3,
    x: 4,
    y: 0,
    width: 1,
    height: 1,
    hp: 2600,
    maxHp: 2600,
    defenseRating: 310,
    range: 520,
    description: 'Long-range armored gun emplacement providing over-the-horizon defensive bombardment.',
    upgradeCost: { fuel: 500, alloy: 900, munitions: 950 },
  },
  {
    id: 'bldg_sam_1',
    type: 'sam_battery',
    name: 'Patriot Advanced SAM Silo',
    level: 3,
    x: 0,
    y: 3,
    width: 1,
    height: 1,
    hp: 1900,
    maxHp: 1900,
    defenseRating: 280,
    range: 480,
    description: 'Surface-to-air missile battery providing an impenetrable shield against airstrikes and gunships.',
    upgradeCost: { fuel: 600, alloy: 850, munitions: 900 },
  },
  {
    id: 'bldg_generator_1',
    type: 'generator',
    name: 'Armored Fusion-Diesel Generator',
    level: 4,
    x: 4,
    y: 3,
    width: 1,
    height: 1,
    hp: 2200,
    maxHp: 2200,
    defenseRating: 80,
    description: 'Produces 85 MW of power to sustain defense turrets, radar sensors, and shield grids.',
    upgradeCost: { fuel: 1000, alloy: 750, munitions: 300 },
  },
  {
    id: 'bldg_munitions_foundry',
    type: 'munitions_foundry',
    name: 'Automated Munitions Foundry',
    level: 3,
    x: 0,
    y: 1,
    width: 1,
    height: 1,
    hp: 1800,
    maxHp: 1800,
    defenseRating: 90,
    productionRate: { resource: 'munitions', amountPerHour: 450 },
    description: 'Fabricates high-caliber kinetic sabot rounds, mortar charges, and autocannon belts.',
    upgradeCost: { fuel: 350, alloy: 600, munitions: 400 },
  },
  {
    id: 'bldg_fuel_depot',
    type: 'fuel_depot',
    name: 'Hardened Underground Fuel Bladder',
    level: 3,
    x: 4,
    y: 2,
    width: 1,
    height: 1,
    hp: 2000,
    maxHp: 2000,
    defenseRating: 70,
    productionRate: { resource: 'fuel', amountPerHour: 380 },
    description: 'Stores JP-8 refined turbine fuel and synthetic cell reserves for tanks and gunships.',
    upgradeCost: { fuel: 400, alloy: 550, munitions: 250 },
  },
  {
    id: 'bldg_hydroponics',
    type: 'hydroponics',
    name: 'Bio-Sustainment Hydroponic Bay',
    level: 3,
    x: 1,
    y: 4,
    width: 1,
    height: 1,
    hp: 1600,
    maxHp: 1600,
    defenseRating: 60,
    productionRate: { resource: 'rations', amountPerHour: 500 },
    description: 'Produces enriched field rations to maintain operator morale and combat reaction speed.',
    upgradeCost: { fuel: 300, alloy: 500, munitions: 200 },
  },
  {
    id: 'bldg_armory_lab',
    type: 'armory_lab',
    name: 'DARPA Experimental Armory Lab',
    level: 3,
    x: 3,
    y: 4,
    width: 1,
    height: 1,
    hp: 2400,
    maxHp: 2400,
    defenseRating: 110,
    description: 'Researches transition from Cold War weapons into futuristic hyper-railguns and laser defense.',
    upgradeCost: { fuel: 750, alloy: 1100, munitions: 800 },
  },
];

export const INITIAL_DESTRUCTIBLE_OBSTACLES: DestructibleObstacle[] = [
  {
    id: 'obs-wall-1',
    name: 'Reinforced Concrete Blast Wall',
    type: 'concrete_wall',
    x: 280,
    y: 120,
    width: 30,
    height: 90,
    hp: 1200,
    maxHp: 1200,
    isDestroyed: false,
    coverValue: 0.7,
    rubblePassable: false,
  },
  {
    id: 'obs-wall-2',
    name: 'Reinforced Concrete Blast Wall',
    type: 'concrete_wall',
    x: 280,
    y: 270,
    width: 30,
    height: 90,
    hp: 1200,
    maxHp: 1200,
    isDestroyed: false,
    coverValue: 0.7,
    rubblePassable: false,
  },
  {
    id: 'obs-sandbag-1',
    name: 'Heavy Sandbag Emplacement',
    type: 'sandbag',
    x: 220,
    y: 220,
    width: 60,
    height: 25,
    hp: 650,
    maxHp: 650,
    isDestroyed: false,
    coverValue: 0.5,
    rubblePassable: true,
  },
  {
    id: 'obs-watchtower-1',
    name: 'Steel Observation Watchtower',
    type: 'watchtower',
    x: 420,
    y: 80,
    width: 40,
    height: 40,
    hp: 850,
    maxHp: 850,
    isDestroyed: false,
    coverValue: 0.4,
    rubblePassable: true,
  },
  {
    id: 'obs-fueltank-1',
    name: 'Pressurized Fuel Tanker (Explosive Hazard)',
    type: 'fuel_tank',
    x: 450,
    y: 330,
    width: 45,
    height: 35,
    hp: 400,
    maxHp: 400,
    isDestroyed: false,
    coverValue: 0.2,
    rubblePassable: true,
  },
];

export const INITIAL_PLAYER_PROFILE: PlayerProfile = {
  callsign: 'Apex_Vanguard',
  rank: 'Brigadier General (O-7)',
  activeServer: 'global_war_room',
  currentSeason: 'sandstorm',
  resources: {
    fuel: 4800,
    rations: 4500,
    munitions: 5200,
    alloy: 3900,
    warBonds: 650, // Enough to test recruitment & upgrades immediately
  },
  baseIntegrity: 98,
  powerGridMw: 92,
  antiCheatToken: 'SEC-WWR-INIT-OK',
  pvpWins: 14,
  pvpLosses: 3,
  survivalWaveRecord: 18,
};
