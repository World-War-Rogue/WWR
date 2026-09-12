export interface DeveloperSeat {
  id: string; // e.g., 'dev_1', 'dev_2'
  callsign: string;
  roleTitle: string;
  specialty: string;
  avatarColor: string;
  isOnline: boolean;
  currentModuleId: string | null;
}

export type LockableModuleId =
  | 'base_external'
  | 'base_internal'
  | 'combat'
  | 'squads'
  | 'alliances'
  | 'alliance_leaderboard'
  | 'economy_armory';

export interface ModuleLockState {
  moduleId: LockableModuleId;
  moduleName: string;
  category: 'Base Engineering' | 'Combat & Physics' | 'Units & Balancing' | 'Metagame & Warfare';
  sourceFile: string;
  isLocked: boolean;
  lockedByDevId: string | null;
  lockedByName: string | null;
  lockedAt: string | null;
  taskDescription: string;
  revision: number;
}

export interface DevCommsMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  timestamp: string;
  text: string;
  type: 'chat' | 'lock_claimed' | 'lock_released' | 'commit_push' | 'bug_flag';
  targetModuleId?: LockableModuleId;
}

export interface DevLiveOverrides {
  ballisticsGravityScale: number; // default 1.0
  velocityScale: number; // default 1.0
  ricochetAngleDeg: number; // default 68 deg
  resourceMultiplier: number; // default 1.0
  ciwsInterceptRate: number; // default 0.85
  swarmSpawnIntervalSec: number; // default 15
  godModeDefense: boolean;
}

export interface DeveloperSessionState {
  currentDevId: string;
  seats: DeveloperSeat[];
  moduleLocks: Record<LockableModuleId, ModuleLockState>;
  commsMessages: DevCommsMessage[];
  liveOverrides: DevLiveOverrides;
  scratchpadNotes: string;
}
