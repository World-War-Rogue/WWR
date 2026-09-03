export type CountryCode =
  | 'US' // United States
  | 'DE' // Germany
  | 'GB' // United Kingdom
  | 'FR' // France
  | 'JP' // Japan
  | 'IL' // Israel
  | 'KR' // South Korea
  | 'SE' // Sweden
  | 'CA' // Canada
  | 'AU' // Australia
  | 'UA' // Ukraine
  | 'IT' // Italy
  | 'NO' // Norway
  | 'PL' // Poland
  | 'TR'; // Turkey

export type TechEra =
  | 'Cold War'
  | 'Modern'
  | 'Near-Future'
  | 'Futuristic';

export type UnitRole =
  | 'Main Battle Tank'
  | 'Infantry Fighting Vehicle'
  | 'Self-Propelled Artillery'
  | 'Attack Helicopter'
  | 'Recon & Sniper'
  | 'Air Defense SAM'
  | 'Heavy Breacher'
  | 'Drone Carrier'
  | 'Combat UAV Drone'
  | 'Exoskeleton Infantry'
  | 'Experimental Railgun'
  | 'Directed Energy Laser'
  | 'Missile Battery'
  | 'Guided Missile Warship'
  | 'Attack Submarine';

export type AmmoType =
  | 'APFSDS Kinetic'
  | 'High-Explosive Squash'
  | 'Tandem HEAT'
  | 'Flechette Anti-Infantry'
  | 'EMP Disruption';

export type ArmorMod =
  | 'Standard Steel'
  | 'Explosive Reactive (ERA)'
  | 'Composite Titanium'
  | 'Active Trophy APS'
  | 'Nanite Ceramic Weave';

export type OpticsMod =
  | 'Iron Sights & Standard Optics'
  | 'Thermal Gen-3'
  | 'Millimeter-Wave Radar'
  | 'Ballistic AI Fire Control'
  | 'Orbital Uplink Sensor';

export type TacticalStance =
  | 'Aggressive Assault'
  | 'Overwatch Hold'
  | 'Suppressive Flank'
  | 'Guerrilla Ambush';

export interface UnitCustomization {
  ammoType: AmmoType;
  armorMod: ArmorMod;
  opticsMod: OpticsMod;
  stance: TacticalStance;
  // Enhanced 6 categories equipment gear
  lethalityGear?: {
    primaryArmament?: string;
    secondarySystems?: string;
    ammoStorage?: string;
    ammunitionStorage?: string;
  };
  survivabilityGear?: {
    passiveArmor?: string;
    reactiveArmor?: string;
    cbrnProtection?: string;
  };
  mobilityGear?: {
    powerplant?: string;
    driveSystem?: string;
    fuelDelivery?: string;
  };
  electronicsGear?: {
    commandControl?: string;
    communications?: string;
    powerArchitecture?: string;
  };
  situationalGear?: {
    optics?: string;
    sensors?: string;
    fireControlSystem?: string;
    fireControlSystems?: string;
  };
  hmiGear?: {
    controls?: string;
    lifeSupport?: string;
    egressSystems?: string;
  };
}

export type EquipmentCategoryKey =
  | 'lethality'
  | 'survivability'
  | 'mobility'
  | 'electronics'
  | 'situational'
  | 'hmi';

export interface EquipmentOption {
  id: string;
  name: string;
  tier: number;
  statBonus: string;
  bonusValues: {
    firepower?: number;
    penetration?: number;
    armor?: number;
    hp?: number;
    speed?: number;
    range?: number;
    crewEfficiency?: number;
    reloadRate?: number;
  };
  description: string;
  unlockedAtLevel: number;
  cost: {
    alloy?: number;
    munitions?: number;
    fuel?: number;
    warBonds?: number;
  };
}

export interface EquipmentSubcategory {
  id: string;
  name: string;
  description: string;
  options: EquipmentOption[];
}

export interface EquipmentCategoryData {
  key: EquipmentCategoryKey;
  number: number;
  title: string;
  subtitle: string;
  summary: string;
  iconName: string;
  color: string;
  subcategories: EquipmentSubcategory[];
}

export interface CategoryUpgradeProgress {
  level: number;
  currentExp: number;
  maxExp: number;
  unlockedPerks: string[];
}

export interface BaseEvent {
  id: string;
  title: string;
  categoryAffinity: EquipmentCategoryKey;
  codename: string;
  description: string;
  tacticalBrief: string;
  durationMinutes: number;
  timeRemainingSec: number;
  minSquadRating: number;
  recommendedGear: string;
  entryFee: {
    warBonds: number;
    munitions: number;
    fuel?: number;
  };
  rewards: {
    warBonds: number;
    alloy: number;
    munitions: number;
    badgeTitle: string;
  };
  modifiers: string[];
  status: 'open' | 'signed_in' | 'completed';
}

export type ActiveAppView =
  | 'base_external'
  | 'base_internal'
  | 'squads'
  | 'combat'
  | 'comms'
  | 'alliances'
  | 'alliance_leaderboard';

export type HeroCategory =
  | 'tanks'
  | 'airplanes'
  | 'helicopters'
  | 'ships'
  | 'submarines'
  | 'missiles'
  | 'drones';

export type VehicleType =
  | 'tank'
  | 'airplane'
  | 'helicopter'
  | 'ifv'
  | 'artillery'
  | 'sam'
  | 'railgun'
  | 'infantry'
  | 'drone'
  | 'missile'
  | 'ship'
  | 'submarine';

export interface PilotHero {
  id: string;
  name: string;
  callsign: string;
  rank: string;
  specialty: string;
  avatarIcon: string; // emoji or icon code
  avatarBgColor: string;
  badgeType:
    | 'tank_ace'
    | 'fighter_pilot'
    | 'rotor_ace'
    | 'naval_commander'
    | 'submarine_skipper'
    | 'missile_officer'
    | 'drone_operator'
    | 'artillery_master'
    | 'recon_ghost'
    | 'air_defense'
    | 'cyber_drone';
  heroCategory?: HeroCategory;
  badge?: string;
  quote: string;
  firingCallout: string;
  killCallout: string;
  serviceBranch?: 'Army' | 'Navy' | 'Air Force' | 'Marine Corps' | 'Air Defense';
  country?: CountryCode;
}

export interface Unit {
  id: string;
  name: string;
  country: CountryCode;
  countryName: string;
  era: TechEra;
  role: UnitRole;
  vehicleType?: VehicleType;
  heroCategory?: HeroCategory;
  pilot?: PilotHero;
  powerRating: number;
  hp: number;
  maxHp: number;
  armor: number; // 0 - 100% damage reduction
  firepower: number;
  fireRate: number; // Shots per second
  range: number; // Pixel/meter range
  speed: number;
  blastRadius: number; // 0 for bullet, >0 for shell
  penetration: number; // Armor piercing mm rating
  advantage: string;
  disadvantage: string;
  description: string;
  unlockCostWarBonds: number;
  unlocked: boolean;
  upgradeLevel: number;
  customization: UnitCustomization;
}

export interface Squad {
  id: string;
  name: string; // e.g., 'Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo'
  designation: string; // e.g. '1st Armored Spearhead'
  icon: string;
  unitIds: string[]; // Max 6 units!
  tacticalSpecialty: string;
  totalCombatPower: number;
  formation: 'Wedge' | 'Line' | 'Echelon' | 'Box';
}

export type BuildingType =
  | 'hq'
  | 'phalanx_ciws'
  | 'howitzer'
  | 'sam_battery'
  | 'blast_wall'
  | 'dragons_teeth'
  | 'generator'
  | 'munitions_foundry'
  | 'hydroponics'
  | 'fuel_depot'
  | 'armory_lab';

export interface BaseBuilding {
  id: string;
  type: BuildingType;
  name: string;
  level: number;
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  defenseRating: number;
  productionRate?: {
    resource: 'fuel' | 'rations' | 'munitions' | 'alloy';
    amountPerHour: number;
  };
  range?: number;
  description: string;
  upgradeCost: {
    fuel: number;
    alloy: number;
    munitions: number;
  };
}

export type SeasonId = 'sandstorm' | 'frostbite' | 'iron_jungle' | 'neo_rogue';

export interface SeasonTheater {
  id: SeasonId;
  seasonNumber: number;
  name: string;
  codeName: string;
  theaterLocation: string;
  terrainType: string;
  weatherCondition: string;
  buffDescription: string;
  debuffDescription: string;
  accentColor: string;
  bgColor: string;
  cardBanner: string;
  hazardEffect: {
    opticModifier: number; // e.g. 0.7 for sandstorm
    speedModifier: number; // e.g. 0.85 for snow
    fuelConsumptionRate: number; // e.g. 1.2
  };
}

export interface ServerInfo {
  id: string;
  name: string;
  region: string;
  pingMs: number;
  status: 'OPTIMAL' | 'CONGESTED' | 'MAINTENANCE' | 'HIGH_LOAD';
  activeCommanders: number;
  flag: string;
  totalAlliances: number;
  defconLevel: number; // 1 to 5
  seasonName: string;
  ruleset: string;
  uptimePct: number;
}

export type AllianceRank = 'Admiral' | 'Colonel' | 'Lieutenant';

export interface AllianceMember {
  id: string;
  callsign: string;
  rank: AllianceRank;
  country: CountryCode;
  combatPower: number;
  assignedRole: string;
  joinedDate: string;
  onlineStatus: 'ONLINE' | 'IN_COMBAT' | 'DEPLOYED' | 'OFFLINE';
  contributionPoints: number;
  tasksCompleted: number;
  isPlayer?: boolean;
}

export interface AllianceTask {
  id: string;
  title: string;
  description: string;
  category: 'logistics' | 'naval_sub' | 'armor' | 'air_defense' | 'drone_recon' | 'combat_sim';
  targetAmount: number;
  currentAmount: number;
  unitLabel: string;
  rewardWarBonds: number;
  rewardExp: number;
  plannedByCallsign: string;
  plannedByRank: 'Admiral' | 'Colonel';
  status: 'ACTIVE' | 'COMPLETED' | 'EXPIRED';
  expiresInHours: number;
}

export interface AllianceEvent {
  id: string;
  name: string;
  codeName: string;
  theater: string;
  eventType: 'joint_fleet_exercise' | 'bastion_defense' | 'deep_strike_raid' | 'cross_server_war' | 'recon_sweep';
  plannedByCallsign: string;
  plannedByRank: 'Admiral' | 'Colonel';
  briefing: string;
  scheduledTime: string;
  durationHours: number;
  status: 'UPCOMING' | 'ACTIVE' | 'CONCLUDED';
  registeredMemberIds: string[];
  targetScore: number;
  currentScore: number;
  rewards: {
    warBonds: number;
    alloy: number;
    fuel: number;
    specialBadge?: string;
  };
}

export interface AllianceLogEntry {
  id: string;
  timestamp: string;
  text: string;
  type: 'promotion' | 'demotion' | 'task_plan' | 'event_plan' | 'task_complete' | 'event_complete' | 'member_join';
  officerName?: string;
}

export interface ControlledSectorInfo {
  sectorId: string;
  name: string;
  type: 'refinery' | 'radar_array' | 'naval_port' | 'air_base' | 'munitions_depot' | 'heavy_citadel' | 'forward_outpost';
  controlLevel: number; // 1 to 3
  garrisonRating: number;
  defenseStatus: 'SECURE' | 'CONTESTED' | 'FORTIFIED';
  buffYield: string;
  assignedColonelCallsign?: string;
}

export interface AllianceSeasonProgress {
  eventScore: number;
  rank: number;
  tier: number;
  tierMax: number;
  milestoneProgressPct: number;
  completedOperations: number;
  trophies: number;
  activeOperationCodename: string;
  lastOperationVictoryTime?: string;
}

export interface AllianceTerritoryControl {
  sectorsControlled: number;
  totalSectorsInTheater: number;
  controlPercentage: number;
  sectors: ControlledSectorInfo[];
  contestedCount: number;
  hourlyYield: {
    fuel: number;
    munitions: number;
    alloy: number;
    warBonds: number;
  };
  theaterDominanceRank: number;
}

export interface Alliance {
  id: string;
  name: string;
  tag: string; // e.g. [AEGIS], [IRON], [VALKYRIE]
  serverId: string; // Connected server ID
  motto: string;
  emblemIcon: string;
  emblemColor: string;
  level: number;
  totalCombatPower: number;
  maxMembers: 100; // strictly 100 max members
  members: AllianceMember[]; // up to 100 members (1 Admiral, up to 10 Colonels, rest Lieutenants)
  tasks: AllianceTask[];
  events: AllianceEvent[];
  logs: AllianceLogEntry[];
  isOpenRecruitment: boolean;
  minPowerRequirement: number;
  seasonEventProgress?: AllianceSeasonProgress;
  territorialControl?: AllianceTerritoryControl;
  compositeScore?: number;
  globalRank?: number;
  winStreak?: number;
}

export interface ChatMessage {
  id: string;
  serverId: string;
  serverName: string;
  sender: string;
  senderRank: string;
  senderCountry: CountryCode;
  originalLanguage: string;
  originalText: string;
  translatedText: string;
  timestamp: string;
  isAiAgent?: boolean;
}

export interface DestructibleObstacle {
  id: string;
  name: string;
  type: 'sandbag' | 'concrete_wall' | 'watchtower' | 'fuel_tank' | 'bunker';
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  isDestroyed: boolean;
  coverValue: number; // % damage reduction for units behind it
  rubblePassable: boolean;
}

export interface CombatEntity {
  id: string;
  unitId: string;
  name: string;
  team: 'player' | 'enemy';
  country: CountryCode;
  role: UnitRole;
  vehicleType: VehicleType;
  pilot: PilotHero;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  headingAngle: number; // in radians
  turretAngle: number; // in radians
  recoil: number; // 0 to 1
  rotorAngle: number; // radians for helicopter/drone blades
  bankAngle: number; // radians for aircraft banking
  altitude: number; // flight height in pixels
  lastMuzzleFlash: number; // timestamp
  speechBubble?: {
    text: string;
    expiresAt: number;
  };
  hp: number;
  maxHp: number;
  armor: number;
  firepower: number;
  fireRate: number;
  range: number;
  speed: number;
  blastRadius: number;
  penetration: number;
  lastFired: number;
  squadName: string;
  stance: TacticalStance;
  destroyed: boolean;
}

export interface BallisticProjectile {
  id: string;
  sourceUnitId?: string;
  targetUnitId?: string;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  currentX: number;
  currentY: number;
  currentHeight: number; // for arc rendering
  speed: number;
  progress: number; // 0 to 1
  damage: number;
  blastRadius: number;
  penetration: number;
  team: 'player' | 'enemy';
  caliber: string;
  projectileType: 'bullet' | 'missile' | 'tank_shell' | 'artillery_shell' | 'railgun' | 'laser';
  flightAngle: number;
  isRicochet?: boolean;
}

export interface ParticleEffect {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
  type: 'smoke' | 'fire' | 'debris' | 'ricochet_spark' | 'shockwave' | 'casing' | 'flare' | 'spark' | 'dust';
  angle?: number;
  angularVelocity?: number;
  bounces?: number;
  opacity?: number;
  maxRadius?: number; // for shockwaves
}

export interface GroundCrater {
  id: string;
  x: number;
  y: number;
  radius: number;
  opacity: number;
  createdAt: number;
  type: 'blast' | 'tread_mark' | 'fuel_scorch';
  angle?: number;
}

export interface FlyingDebris {
  id: string;
  x: number;
  y: number;
  z: number; // height in pixels
  vx: number;
  vy: number;
  vz: number;
  angle: number;
  angularVelocity: number;
  type: 'turret' | 'wing_fragment' | 'armor_plate';
  team: 'player' | 'enemy';
  size: number;
  settled: boolean;
}

export interface PlayerResources {
  fuel: number;
  rations: number;
  munitions: number;
  alloy: number;
  warBonds: number;
}

export interface PlayerProfile {
  callsign: string;
  rank: string;
  activeServer: string;
  currentSeason: SeasonId;
  resources: PlayerResources;
  baseIntegrity: number; // 0 - 100%
  powerGridMw: number;
  antiCheatToken: string;
  pvpWins: number;
  pvpLosses: number;
  survivalWaveRecord: number;
}

// ==========================================
// POST-COMBAT TELEMETRY & AAR OVERLAY TYPES
// ==========================================

export interface CombatUnitTelemetry {
  id: string;
  name: string;
  team: 'player' | 'enemy';
  role: string;
  country?: CountryCode;
  initialHp: number;
  finalHp: number;
  maxHp: number;
  armor: number;
  firepower: number;
  speed: number;
  penetration: number;
  range: number;
  blastRadius: number;
  fireRate: number;
  destroyed: boolean;
  timeOfDeathSec?: number;
  damageDealt: number;
  damageTaken: number;
  shotsFired: number;
  hitsLanded: number;
  ricochetsCaused: number;
  kills: number;
  criticalHits: number;
}

export interface CombatMilestoneEvent {
  id: string;
  timeSec: number;
  type:
    | 'kill'
    | 'first_contact'
    | 'cas_strike'
    | 'emp_pulse'
    | 'artillery_barrage'
    | 'fuel_explosion'
    | 'critical_penetration'
    | 'ricochet'
    | 'fortification_down';
  title: string;
  description: string;
  team: 'player' | 'enemy' | 'neutral';
  impactMagnitude?: 'low' | 'medium' | 'high' | 'critical';
}

export interface CombatTelemetrySnapshot {
  timeSec: number;
  playerTotalHp: number;
  playerMaxHp: number;
  enemyTotalHp: number;
  enemyMaxHp: number;
  playerActiveCount: number;
  enemyActiveCount: number;
  playerCumulativeDamage: number;
  enemyCumulativeDamage: number;
  playerDamageRate: number;
  enemyDamageRate: number;
  unitStates: Record<
    string,
    {
      hp: number;
      maxHp: number;
      destroyed: boolean;
      damageDealt: number;
      damageTaken: number;
      shotsFired: number;
      hitsLanded: number;
    }
  >;
}

export interface ComparativeMetricItem {
  id: string;
  category:
    | 'Firepower & Alpha Strike'
    | 'Survivability & Armor Protection'
    | 'Tactical Gunnery & Accuracy'
    | 'Mobility & Traverse'
    | 'Explosive & Area Impact'
    | 'Attrition, Casualties & Efficiency';
  label: string;
  playerValue: number;
  enemyValue: number;
  unitSuffix: string;
  higherIsBetter: boolean;
  advantageSide: 'player' | 'enemy' | 'tied';
  advantagePct: number;
  analysis: string;
}

export interface CombatAfterActionReport {
  battleId: string;
  result: 'victory' | 'defeat';
  timestamp: string;
  durationSec: number;
  theaterName: string;
  playerSquadName: string;
  playerSquadPower: number;
  playerCommanderName: string;
  playerCommanderRank: string;
  enemyCommanderName: string;
  enemyCommanderServer: string;
  enemyCommanderFlag: string;
  enemySquadPower: number;
  snapshots: CombatTelemetrySnapshot[];
  milestones: CombatMilestoneEvent[];
  playerUnits: CombatUnitTelemetry[];
  enemyUnits: CombatUnitTelemetry[];
  comparativeMetrics: ComparativeMetricItem[];
  salvageRecovered: {
    fuel: number;
    munitions: number;
    alloy: number;
    warBonds: number;
  };
}
