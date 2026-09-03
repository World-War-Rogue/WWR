import {
  DeveloperSeat,
  LockableModuleId,
  ModuleLockState,
  DevCommsMessage,
  DevLiveOverrides,
  DeveloperSessionState,
} from '../types/devOps';

export const DEFAULT_DEVELOPER_SEATS: DeveloperSeat[] = [
  {
    id: 'dev_1',
    callsign: 'RichMatt (Lead)',
    roleTitle: 'Lead Systems Architect & Creative Director',
    specialty: 'Engine Orchestration & Game Balance',
    avatarColor: 'bg-amber-500 text-black',
    isOnline: true,
    currentModuleId: 'base_external',
  },
  {
    id: 'dev_2',
    callsign: 'Vanguard (Dev 2)',
    roleTitle: 'Lead Combat & Physics Engineer',
    specialty: 'Ballistics Engine, Ricochet & Damage Equations',
    avatarColor: 'bg-red-500 text-white',
    isOnline: true,
    currentModuleId: null,
  },
  {
    id: 'dev_3',
    callsign: 'Fortress (Dev 3)',
    roleTitle: 'Base Architect & Level Designer',
    specialty: 'FOB Structures, 2D Grid & Defense Systems',
    avatarColor: 'bg-cyan-500 text-black',
    isOnline: true,
    currentModuleId: null,
  },
  {
    id: 'dev_4',
    callsign: 'Arsenal (Dev 4)',
    roleTitle: 'Senior Military & Unit Balancer',
    specialty: '100+ Unit Roster, Armor Multipliers & Tech Eras',
    avatarColor: 'bg-emerald-500 text-black',
    isOnline: true,
    currentModuleId: null,
  },
  {
    id: 'dev_5',
    callsign: 'Overlord (Dev 5)',
    roleTitle: 'Metagame & Alliance Engineer',
    specialty: 'Territorial Warfare, 36 Sectors & Economy Loops',
    avatarColor: 'bg-purple-500 text-white',
    isOnline: true,
    currentModuleId: null,
  },
];

export const DEFAULT_MODULE_LOCKS: Record<LockableModuleId, ModuleLockState> = {
  base_external: {
    moduleId: 'base_external',
    moduleName: 'External Base & Fortification Grid',
    category: 'Base Engineering',
    sourceFile: '/src/components/BaseExternalView.tsx',
    isLocked: false,
    lockedByDevId: null,
    lockedByName: null,
    lockedAt: null,
    taskDescription: 'Perimeter blast walls, CIWS turrets, Radar grid and 2D threat detection',
    revision: 14,
  },
  base_internal: {
    moduleId: 'base_internal',
    moduleName: 'Internal Base & 6 Category Upgrades',
    category: 'Base Engineering',
    sourceFile: '/src/components/BaseInternalView.tsx',
    isLocked: false,
    lockedByDevId: null,
    lockedByName: null,
    lockedAt: null,
    taskDescription: 'Equipment categories, tech research tree, sign-in daily operations',
    revision: 22,
  },
  combat: {
    moduleId: 'combat',
    moduleName: 'Combat Simulator & 2D Ballistics',
    category: 'Combat & Physics',
    sourceFile: '/src/components/CombatSimulatorView.tsx',
    isLocked: false,
    lockedByDevId: null,
    lockedByName: null,
    lockedAt: null,
    taskDescription: 'Parabolic shell trajectories, armor penetration curves, ricochet math',
    revision: 38,
  },
  squads: {
    moduleId: 'squads',
    moduleName: 'Squad Command & 100+ Unit Roster',
    category: 'Units & Balancing',
    sourceFile: '/src/components/SquadCommandView.tsx',
    isLocked: false,
    lockedByDevId: null,
    lockedByName: null,
    lockedAt: null,
    taskDescription: '5 deployed squad formations, pilot aces, tank/air/SAM stat balancing',
    revision: 41,
  },
  alliances: {
    moduleId: 'alliances',
    moduleName: 'Alliance Command (100 Members)',
    category: 'Metagame & Warfare',
    sourceFile: '/src/components/AllianceCommandView.tsx',
    isLocked: false,
    lockedByDevId: null,
    lockedByName: null,
    lockedAt: null,
    taskDescription: 'Supreme Commander to Lieutenant hierarchy, task and event war planning',
    revision: 19,
  },
  alliance_leaderboard: {
    moduleId: 'alliance_leaderboard',
    moduleName: 'Territorial Warfare & 36 Sectors',
    category: 'Metagame & Warfare',
    sourceFile: '/src/components/AllianceLeaderboardView.tsx',
    isLocked: false,
    lockedByDevId: null,
    lockedByName: null,
    lockedAt: null,
    taskDescription: 'Global map, sector capture yields, composite dominance scores',
    revision: 27,
  },
  economy_armory: {
    moduleId: 'economy_armory',
    moduleName: 'Survival Economy & Fair Armory',
    category: 'Metagame & Warfare',
    sourceFile: '/src/components/FairArmoryModal.tsx',
    isLocked: false,
    lockedByDevId: null,
    lockedByName: null,
    lockedAt: null,
    taskDescription: 'Daily supply crates, resource accumulation, anti-p2w reward formulas',
    revision: 11,
  },
};

export const INITIAL_DEV_COMMS: DevCommsMessage[] = [
  {
    id: 'msg_init_1',
    senderId: 'dev_1',
    senderName: 'RichMatt (Lead)',
    senderRole: 'Lead Systems Architect',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    text: 'Engine lock-system initialized. Remember: always claim the area lock before making code modifications to prevent merge collisions.',
    type: 'chat',
  },
  {
    id: 'msg_init_2',
    senderId: 'dev_2',
    senderName: 'Vanguard (Dev 2)',
    senderRole: 'Combat & Physics',
    timestamp: new Date(Date.now() - 2400000).toISOString(),
    text: 'Standing by for Combat Simulator ballistics tuning. Testing APFSDS critical ricochet threshold at 68 degrees.',
    type: 'chat',
  },
  {
    id: 'msg_init_3',
    senderId: 'dev_3',
    senderName: 'Fortress (Dev 3)',
    senderRole: 'Base Architect',
    timestamp: new Date(Date.now() - 1200000).toISOString(),
    text: 'External Base 2D canvas threat detection grid is active. Ready to calibrate CIWS range.',
    type: 'chat',
  },
];

export const DEFAULT_LIVE_OVERRIDES: DevLiveOverrides = {
  ballisticsGravityScale: 1.0,
  velocityScale: 1.0,
  ricochetAngleDeg: 68,
  resourceMultiplier: 1.0,
  ciwsInterceptRate: 0.85,
  swarmSpawnIntervalSec: 15,
  godModeDefense: false,
};

const STORAGE_KEY = 'wwr_developer_ops_state_v1';

export function loadDevOpsState(): DeveloperSessionState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        currentDevId: parsed.currentDevId || 'dev_1',
        seats: parsed.seats || DEFAULT_DEVELOPER_SEATS,
        moduleLocks: parsed.moduleLocks || DEFAULT_MODULE_LOCKS,
        commsMessages: parsed.commsMessages || INITIAL_DEV_COMMS,
        liveOverrides: parsed.liveOverrides || DEFAULT_LIVE_OVERRIDES,
        scratchpadNotes: parsed.scratchpadNotes || '# TEAM SCRATCHPAD\n- Sprint 1: Verify 5-dev lock safety\n- Sprint 2: Mobile touch calibration for 2D Base\n- Sprint 3: Add new Tier-4 futuristic hypersonic battery',
      };
    }
  } catch (err) {
    console.warn('Failed to parse devOps state, using default', err);
  }

  return {
    currentDevId: 'dev_1',
    seats: DEFAULT_DEVELOPER_SEATS,
    moduleLocks: DEFAULT_MODULE_LOCKS,
    commsMessages: INITIAL_DEV_COMMS,
    liveOverrides: DEFAULT_LIVE_OVERRIDES,
    scratchpadNotes: '# TEAM SCRATCHPAD\n- Sprint 1: Verify 5-dev lock safety\n- Sprint 2: Mobile touch calibration for 2D Base\n- Sprint 3: Add new Tier-4 futuristic hypersonic battery',
  };
}

export function saveDevOpsState(state: DeveloperSessionState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('Failed to save devOps state to localStorage', err);
  }
}
