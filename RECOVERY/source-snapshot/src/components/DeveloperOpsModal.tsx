import React, { useState } from 'react';
import {
  Shield,
  Zap,
  Lock,
  Unlock,
  Users,
  Terminal,
  MessageSquare,
  Sliders,
  FileCode2,
  Bug,
  Download,
  AlertTriangle,
  Check,
  RefreshCw,
  Send,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Server,
  Activity,
  Cpu,
  Radio,
  Eye,
  X,
  Play,
} from 'lucide-react';
import {
  DeveloperSeat,
  LockableModuleId,
  ModuleLockState,
  DevCommsMessage,
  DevLiveOverrides,
  DeveloperSessionState,
} from '../types/devOps';
import { soundFx } from '../utils/audio';

interface DeveloperOpsModalProps {
  isOpen: boolean;
  onClose: () => void;
  devState: DeveloperSessionState;
  onUpdateDevState: (updater: (prev: DeveloperSessionState) => DeveloperSessionState) => void;
  onNavigateToView: (view: LockableModuleId) => void;
  activeGameState: {
    profile: any;
    squads: any[];
    buildings: any[];
  };
}

export const DeveloperOpsModal: React.FC<DeveloperOpsModalProps> = ({
  isOpen,
  onClose,
  devState,
  onUpdateDevState,
  onNavigateToView,
  activeGameState,
}) => {
  const [activeTab, setActiveTab] = useState<
    'locks' | 'comms' | 'overrides' | 'scratchpad' | 'bug_hunter' | 'download_guide'
  >('locks');
  const [chatInput, setChatInput] = useState('');
  const [taskInput, setTaskInput] = useState('');
  const [selectedModuleForLock, setSelectedModuleForLock] = useState<LockableModuleId>('base_external');

  if (!isOpen) return null;

  const currentDev =
    devState.seats.find((s) => s.id === devState.currentDevId) || devState.seats[0];

  const handleSelectSeat = (seatId: string) => {
    soundFx.playRadioChirp();
    onUpdateDevState((prev) => {
      const seat = prev.seats.find((s) => s.id === seatId);
      const newComms: DevCommsMessage = {
        id: `sys_${Date.now()}`,
        senderId: seatId,
        senderName: seat?.callsign || seatId,
        senderRole: seat?.roleTitle || 'Developer',
        timestamp: new Date().toISOString(),
        text: `Switched active workstation seat to [${seat?.callsign}].`,
        type: 'chat',
      };
      return {
        ...prev,
        currentDevId: seatId,
        commsMessages: [...prev.commsMessages, newComms],
      };
    });
  };

  const handleClaimLock = (moduleId: LockableModuleId) => {
    soundFx.playRadioChirp();
    const taskDesc =
      taskInput.trim() ||
      `Active modifications in progress by ${currentDev.callsign}`;

    onUpdateDevState((prev) => {
      const targetMod = prev.moduleLocks[moduleId];
      const updatedLocks = {
        ...prev.moduleLocks,
        [moduleId]: {
          ...targetMod,
          isLocked: true,
          lockedByDevId: currentDev.id,
          lockedByName: currentDev.callsign,
          lockedAt: new Date().toISOString(),
          taskDescription: taskDesc,
          revision: targetMod.revision + 1,
        },
      };

      const auditMsg: DevCommsMessage = {
        id: `lock_${Date.now()}`,
        senderId: currentDev.id,
        senderName: currentDev.callsign,
        senderRole: currentDev.roleTitle,
        timestamp: new Date().toISOString(),
        text: `🔒 CLAIMED EXCLUSIVE LOCK on [${targetMod.moduleName}]: "${taskDesc}". Other devs set to READ-ONLY.`,
        type: 'lock_claimed',
        targetModuleId: moduleId,
      };

      return {
        ...prev,
        moduleLocks: updatedLocks,
        commsMessages: [...prev.commsMessages, auditMsg],
      };
    });
    setTaskInput('');
  };

  const handleReleaseLock = (moduleId: LockableModuleId) => {
    soundFx.playRadioChirp();
    onUpdateDevState((prev) => {
      const targetMod = prev.moduleLocks[moduleId];
      const updatedLocks = {
        ...prev.moduleLocks,
        [moduleId]: {
          ...targetMod,
          isLocked: false,
          lockedByDevId: null,
          lockedByName: null,
          lockedAt: null,
          taskDescription: 'Available for checkout',
        },
      };

      const auditMsg: DevCommsMessage = {
        id: `unlock_${Date.now()}`,
        senderId: currentDev.id,
        senderName: currentDev.callsign,
        senderRole: currentDev.roleTitle,
        timestamp: new Date().toISOString(),
        text: `🔓 RELEASED LOCK on [${targetMod.moduleName}]. Subsystem is now open for other developers to edit.`,
        type: 'lock_released',
        targetModuleId: moduleId,
      };

      return {
        ...prev,
        moduleLocks: updatedLocks,
        commsMessages: [...prev.commsMessages, auditMsg],
      };
    });
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;

    soundFx.playRadioChirp();
    const newMsg: DevCommsMessage = {
      id: `chat_${Date.now()}`,
      senderId: currentDev.id,
      senderName: currentDev.callsign,
      senderRole: currentDev.roleTitle,
      timestamp: new Date().toISOString(),
      text: chatInput.trim(),
      type: 'chat',
    };

    onUpdateDevState((prev) => ({
      ...prev,
      commsMessages: [...prev.commsMessages, newMsg],
    }));
    setChatInput('');
  };

  const handleUpdateOverride = <K extends keyof DevLiveOverrides>(
    key: K,
    val: DevLiveOverrides[K]
  ) => {
    onUpdateDevState((prev) => ({
      ...prev,
      liveOverrides: {
        ...prev.liveOverrides,
        [key]: val,
      },
    }));
  };

  const handleResetOverrides = () => {
    soundFx.playRadioChirp();
    onUpdateDevState((prev) => ({
      ...prev,
      liveOverrides: {
        ballisticsGravityScale: 1.0,
        velocityScale: 1.0,
        ricochetAngleDeg: 68,
        resourceMultiplier: 1.0,
        ciwsInterceptRate: 0.85,
        swarmSpawnIntervalSec: 15,
        godModeDefense: false,
      },
    }));
  };

  const handleExportBugReport = () => {
    soundFx.playRadioChirp();
    const dossier = {
      reportType: 'WORLD_WAR_ROGUE_DEV_TELEMETRY_BUG_REPORT',
      timestamp: new Date().toISOString(),
      reporter: currentDev,
      clientSpecs: {
        userAgent: navigator.userAgent,
        screen: `${window.innerWidth}x${window.innerHeight}`,
        devicePixelRatio: window.devicePixelRatio,
        hardwareConcurrency: navigator.hardwareConcurrency || 4,
      },
      currentWorkspaceLocks: devState.moduleLocks,
      liveOverrides: devState.liveOverrides,
      playerProfile: activeGameState.profile,
      squadCount: activeGameState.squads.length,
      buildingsCount: activeGameState.buildings.length,
      squads: activeGameState.squads,
      buildings: activeGameState.buildings,
      recentDevComms: devState.commsMessages.slice(-20),
    };

    const blob = new Blob([JSON.stringify(dossier, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `WWR_BUG_REPORT_${currentDev.callsign.replace(/\s+/g, '_')}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0b0e0c] border border-orange-500/50 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-[0_0_50px_rgba(249,115,22,0.25)] overflow-hidden font-mono">
        {/* Top Developer Command Bar */}
        <div className="bg-gradient-to-r from-orange-950/80 via-[#121714] to-black px-4 sm:px-6 py-3 border-b border-orange-500/40 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-600 rounded-lg flex items-center justify-center shadow-lg shadow-orange-950 border border-orange-400">
              <Terminal className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-wider uppercase">
                  HIGH COMMAND // DEVELOPER OPS STUDIO
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/40 font-bold">
                  MULTI-DEV SUITE
                </span>
              </div>
              <p className="text-xs text-orange-400/80">
                Mutual-Exclusion Area Locks • 5 Developer Workstations • Live Sandbox Calibration
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                soundFx.playRadioChirp();
                handleExportBugReport();
              }}
              className="px-2.5 py-1 rounded-lg bg-red-950/60 hover:bg-red-900 border border-red-500/50 text-red-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Download full JSON bug report with memory, locks & game state"
            >
              <Bug className="w-3.5 h-3.5 text-red-400" />
              <span className="hidden sm:inline">BUG REPORT (.JSON)</span>
            </button>

            <button
              onClick={() => {
                soundFx.playRadioChirp();
                onClose();
              }}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 5 Developer Workstation Switcher Bar */}
        <div className="bg-[#101412] px-4 sm:px-6 py-2 border-b border-white/10 flex items-center justify-between gap-3 overflow-x-auto">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-black uppercase text-slate-400 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-orange-400" />
              <span>DEV SEATS (5):</span>
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {devState.seats.map((seat) => {
              const isSelected = seat.id === devState.currentDevId;
              return (
                <button
                  key={seat.id}
                  onClick={() => handleSelectSeat(seat.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-orange-600 text-white border-orange-400 shadow-md shadow-orange-950 scale-105'
                      : 'bg-black/40 text-slate-300 border-white/10 hover:border-white/20 hover:bg-white/5'
                  }`}
                  title={`${seat.roleTitle} - ${seat.specialty}`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isSelected ? 'bg-white animate-pulse' : 'bg-emerald-500'
                    }`}
                  />
                  <span>{seat.callsign}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Navigation Tabs for Dev Ops */}
        <div className="bg-black/40 px-4 sm:px-6 py-1.5 border-b border-white/10 flex items-center gap-2 overflow-x-auto text-xs">
          <button
            onClick={() => {
              soundFx.playRadioChirp();
              setActiveTab('locks');
            }}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'locks'
                ? 'bg-orange-600/30 text-orange-300 border border-orange-500/50'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>MODULE LOCKOUTS</span>
            <span className="text-[9px] px-1.5 py-0.2 bg-black/60 rounded text-orange-400 font-black">
              {(Object.values(devState.moduleLocks) as ModuleLockState[]).filter((m) => m.isLocked).length}/7 LOCKED
            </span>
          </button>

          <button
            onClick={() => {
              soundFx.playRadioChirp();
              setActiveTab('comms');
            }}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'comms'
                ? 'bg-orange-600/30 text-orange-300 border border-orange-500/50'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>DEV COMMS &amp; LOGS</span>
            <span className="text-[9px] px-1.5 py-0.2 bg-black/60 rounded text-emerald-400 font-black">
              {devState.commsMessages.length}
            </span>
          </button>

          <button
            onClick={() => {
              soundFx.playRadioChirp();
              setActiveTab('overrides');
            }}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'overrides'
                ? 'bg-orange-600/30 text-orange-300 border border-orange-500/50'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>LIVE CALIBRATION</span>
          </button>

          <button
            onClick={() => {
              soundFx.playRadioChirp();
              setActiveTab('scratchpad');
            }}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'scratchpad'
                ? 'bg-orange-600/30 text-orange-300 border border-orange-500/50'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5" />
            <span>TEAM SCRATCHPAD</span>
          </button>

          <button
            onClick={() => {
              soundFx.playRadioChirp();
              setActiveTab('download_guide');
            }}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'download_guide'
                ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/50'
                : 'text-cyan-400 hover:text-cyan-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>DOWNLOAD &amp; PLAY DIRECTIONS</span>
          </button>

          <button
            onClick={() => {
              soundFx.playRadioChirp();
              setActiveTab('bug_hunter');
            }}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'bug_hunter'
                ? 'bg-red-600/30 text-red-300 border border-red-500/50'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bug className="w-3.5 h-3.5" />
            <span>BUG HUNTER</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: MODULE LOCKOUTS (MUTEX) */}
          {activeTab === 'locks' && (
            <div className="space-y-4">
              {/* Instructions banner */}
              <div className="bg-orange-950/40 border border-orange-500/40 p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-orange-300 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-orange-400" />
                    <span>MUTUAL EXCLUSION AREA LOCKOUT PROTOCOL (NO MERGE COLLISIONS)</span>
                  </div>
                  <p className="text-slate-300 mt-1">
                    When you claim an exclusive lock on an area (e.g. <strong>External Base</strong> or <strong>Internal Base</strong>), the game engine automatically places that area into <strong>READ-ONLY</strong> mode for all other 4 developers.
                  </p>
                </div>
                <div className="shrink-0 font-mono text-[11px] bg-black/60 px-3 py-1.5 rounded-lg border border-orange-500/30 text-orange-200">
                  ACTIVE SEAT: <strong className="text-white">{currentDev.callsign}</strong>
                </div>
              </div>

              {/* Quick Lock Claim Form */}
              <div className="bg-[#131715] p-4 rounded-xl border border-white/10 flex flex-col md:flex-row items-stretch md:items-center gap-3">
                <div className="flex-1">
                  <label className="text-[11px] font-bold uppercase text-slate-400 block mb-1">
                    Task / Commit Description:
                  </label>
                  <input
                    type="text"
                    value={taskInput}
                    onChange={(e) => setTaskInput(e.target.value)}
                    placeholder="e.g., Adjusting blast wall collision meshes & Phalanx CIWS radar sweep..."
                    className="w-full bg-black/60 border border-white/20 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div className="w-full md:w-64">
                  <label className="text-[11px] font-bold uppercase text-slate-400 block mb-1">
                    Select Target Area:
                  </label>
                  <select
                    value={selectedModuleForLock}
                    onChange={(e) => setSelectedModuleForLock(e.target.value as LockableModuleId)}
                    className="w-full bg-black/60 border border-white/20 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                  >
                    {(Object.values(devState.moduleLocks) as ModuleLockState[]).map((m) => (
                      <option key={m.moduleId} value={m.moduleId}>
                        {m.moduleName} {m.isLocked ? `(Locked: ${m.lockedByName})` : '(Available)'}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="self-end md:self-auto pt-4 md:pt-5">
                  <button
                    onClick={() => handleClaimLock(selectedModuleForLock)}
                    className="w-full md:w-auto px-5 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-orange-950 transition-all"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>CLAIM LOCK</span>
                  </button>
                </div>
              </div>

              {/* All 7 Subsystems Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
                {(Object.values(devState.moduleLocks) as ModuleLockState[]).map((mod) => {
                  const isLockedByMe = mod.isLocked && mod.lockedByDevId === currentDev.id;
                  const isLockedByOther = mod.isLocked && mod.lockedByDevId !== currentDev.id;

                  return (
                    <div
                      key={mod.moduleId}
                      className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                        isLockedByMe
                          ? 'bg-amber-950/20 border-amber-500/70 shadow-lg shadow-amber-950/30'
                          : isLockedByOther
                          ? 'bg-red-950/20 border-red-500/50'
                          : 'bg-[#121614] border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div>
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                {mod.category}
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/40 text-slate-400 border border-white/10">
                                Rev #{mod.revision}
                              </span>
                            </div>
                            <h4 className="text-sm font-black text-white mt-0.5">{mod.moduleName}</h4>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">{mod.sourceFile}</div>
                          </div>

                          {/* Lock badge */}
                          {mod.isLocked ? (
                            <span
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase flex items-center gap-1.5 border ${
                                isLockedByMe
                                  ? 'bg-amber-950 text-amber-300 border-amber-500'
                                  : 'bg-red-950 text-red-300 border-red-500'
                              }`}
                            >
                              <Lock className="w-3 h-3" />
                              <span>{isLockedByMe ? 'LOCKED BY YOU' : `LOCKED: ${mod.lockedByName}`}</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase flex items-center gap-1.5 bg-emerald-950 text-emerald-300 border border-emerald-500">
                              <Unlock className="w-3 h-3" />
                              <span>UNLOCKED / OPEN</span>
                            </span>
                          )}
                        </div>

                        {/* Task description */}
                        <div className="mt-3 p-2.5 rounded-lg bg-black/40 border border-white/5 text-xs text-slate-300">
                          <span className="text-slate-500 font-bold mr-1.5">TASK:</span>
                          <span>{mod.taskDescription}</span>
                          {mod.lockedAt && (
                            <div className="text-[10px] text-slate-500 mt-1">
                              Locked at: {new Date(mod.lockedAt).toLocaleTimeString()}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                        <button
                          onClick={() => {
                            onNavigateToView(mod.moduleId);
                            onClose();
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect View</span>
                        </button>

                        <div className="flex items-center gap-2">
                          {isLockedByMe ? (
                            <button
                              onClick={() => handleReleaseLock(mod.moduleId)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
                            >
                              <Unlock className="w-3.5 h-3.5" />
                              <span>Release Lock</span>
                            </button>
                          ) : isLockedByOther ? (
                            <button
                              onClick={() => {
                                if (
                                  confirm(
                                    `Are you sure you want to FORCE BREAK the lock held by ${mod.lockedByName}?`
                                  )
                                ) {
                                  handleClaimLock(mod.moduleId);
                                }
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-red-950/80 hover:bg-red-900 text-red-300 text-xs font-bold flex items-center gap-1.5 border border-red-600 transition-colors cursor-pointer"
                              title="Lead override: Force break lock"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>Force Override</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleClaimLock(mod.moduleId)}
                              className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
                            >
                              <Lock className="w-3.5 h-3.5" />
                              <span>Claim Area Lock</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: DEV COMMS & ACTIVITY LOGS */}
          {activeTab === 'comms' && (
            <div className="space-y-4">
              <div className="bg-[#121614] border border-white/10 rounded-xl p-4 flex flex-col h-[460px]">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-3">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-orange-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      DEV OPS SECURE COMMS CHANNEL (FREQUENCY 000.00 MHz)
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono">
                    ● 5 WORKSTATIONS SYNCED
                  </span>
                </div>

                {/* Messages stream */}
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-2">
                  {devState.commsMessages.map((msg) => {
                    const isSystem =
                      msg.type === 'lock_claimed' ||
                      msg.type === 'lock_released' ||
                      msg.type === 'commit_push';
                    return (
                      <div
                        key={msg.id}
                        className={`p-2.5 rounded-lg text-xs font-mono border ${
                          msg.type === 'lock_claimed'
                            ? 'bg-amber-950/40 border-amber-600/50 text-amber-200'
                            : msg.type === 'lock_released'
                            ? 'bg-emerald-950/40 border-emerald-600/50 text-emerald-200'
                            : 'bg-black/40 border-white/5 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                          <span className="font-bold text-orange-400">
                            [{msg.senderRole}] {msg.senderName}
                          </span>
                          <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <div className={isSystem ? 'font-bold' : ''}>{msg.text}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Input box */}
                <form
                  onSubmit={handleSendMessage}
                  className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Broadcast to all 5 developer seats (e.g., 'Testing new Howitzer shell velocity')..."
                    className="flex-1 bg-black/60 border border-white/20 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors shadow-md"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>SEND</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 3: LIVE SANDBOX OVERRIDES & CALIBRATION */}
          {activeTab === 'overrides' && (
            <div className="space-y-4">
              <div className="bg-[#131715] p-4 rounded-xl border border-white/10 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-white uppercase flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-orange-400" />
                    <span>LIVE RUNTIME CALIBRATION &amp; OVERRIDES</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Tune ballistics equations, ricochet critical angles, and economy loops live in-game without rebuilding code.
                  </p>
                </div>
                <button
                  onClick={handleResetOverrides}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/20 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reset Mil-Spec Defaults</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Ballistics Gravity Scale */}
                <div className="bg-black/50 p-4 rounded-xl border border-white/10">
                  <div className="flex justify-between items-center text-xs mb-2 font-bold">
                    <span className="text-white">Ballistics Gravity Scale (g):</span>
                    <span className="text-orange-400 font-mono font-black">
                      {devState.liveOverrides.ballisticsGravityScale.toFixed(2)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="2.5"
                    step="0.05"
                    value={devState.liveOverrides.ballisticsGravityScale}
                    onChange={(e) =>
                      handleUpdateOverride('ballisticsGravityScale', parseFloat(e.target.value))
                    }
                    className="w-full accent-orange-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>Low Arc (0.2x)</span>
                    <span>Mil-Spec (1.0x)</span>
                    <span>Heavy Mortar (2.5x)</span>
                  </div>
                </div>

                {/* Muzzle Velocity Scale */}
                <div className="bg-black/50 p-4 rounded-xl border border-white/10">
                  <div className="flex justify-between items-center text-xs mb-2 font-bold">
                    <span className="text-white">Muzzle Velocity Multiplier:</span>
                    <span className="text-orange-400 font-mono font-black">
                      {devState.liveOverrides.velocityScale.toFixed(2)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="3.0"
                    step="0.1"
                    value={devState.liveOverrides.velocityScale}
                    onChange={(e) =>
                      handleUpdateOverride('velocityScale', parseFloat(e.target.value))
                    }
                    className="w-full accent-orange-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>Subsonic (0.5x)</span>
                    <span>Standard (1.0x)</span>
                    <span>Hypervelocity (3.0x)</span>
                  </div>
                </div>

                {/* Critical Ricochet Angle */}
                <div className="bg-black/50 p-4 rounded-xl border border-white/10">
                  <div className="flex justify-between items-center text-xs mb-2 font-bold">
                    <span className="text-white">Critical Ricochet Deflection Angle:</span>
                    <span className="text-orange-400 font-mono font-black">
                      {devState.liveOverrides.ricochetAngleDeg}°
                    </span>
                  </div>
                  <input
                    type="range"
                    min="45"
                    max="85"
                    step="1"
                    value={devState.liveOverrides.ricochetAngleDeg}
                    onChange={(e) =>
                      handleUpdateOverride('ricochetAngleDeg', parseInt(e.target.value))
                    }
                    className="w-full accent-orange-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>Loose Deflection (45°)</span>
                    <span>Standard Law (68°)</span>
                    <span>Hard Penetration (85°)</span>
                  </div>
                </div>

                {/* Phalanx CIWS Interception Rate */}
                <div className="bg-black/50 p-4 rounded-xl border border-white/10">
                  <div className="flex justify-between items-center text-xs mb-2 font-bold">
                    <span className="text-white">FOB CIWS Automated Intercept Rate:</span>
                    <span className="text-orange-400 font-mono font-black">
                      {Math.round(devState.liveOverrides.ciwsInterceptRate * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="1.0"
                    step="0.05"
                    value={devState.liveOverrides.ciwsInterceptRate}
                    onChange={(e) =>
                      handleUpdateOverride('ciwsInterceptRate', parseFloat(e.target.value))
                    }
                    className="w-full accent-orange-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>20% Intercept</span>
                    <span>85% Standard</span>
                    <span>100% Iron Dome</span>
                  </div>
                </div>

                {/* Resource Generation Multiplier */}
                <div className="bg-black/50 p-4 rounded-xl border border-white/10">
                  <div className="flex justify-between items-center text-xs mb-2 font-bold">
                    <span className="text-white">Economy Yield Multiplier:</span>
                    <span className="text-emerald-400 font-mono font-black">
                      {devState.liveOverrides.resourceMultiplier.toFixed(1)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="0.5"
                    value={devState.liveOverrides.resourceMultiplier}
                    onChange={(e) =>
                      handleUpdateOverride('resourceMultiplier', parseFloat(e.target.value))
                    }
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>1x (Real Survival)</span>
                    <span>5x (Fast Test)</span>
                    <span>10x (Sandbox Mode)</span>
                  </div>
                </div>

                {/* Swarm Spawn Interval */}
                <div className="bg-black/50 p-4 rounded-xl border border-white/10">
                  <div className="flex justify-between items-center text-xs mb-2 font-bold">
                    <span className="text-white">Survival Swarm Drone Wave Rate:</span>
                    <span className="text-orange-400 font-mono font-black">
                      Every {devState.liveOverrides.swarmSpawnIntervalSec}s
                    </span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="60"
                    step="5"
                    value={devState.liveOverrides.swarmSpawnIntervalSec}
                    onChange={(e) =>
                      handleUpdateOverride('swarmSpawnIntervalSec', parseInt(e.target.value))
                    }
                    className="w-full accent-orange-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>Rapid Siege (5s)</span>
                    <span>Standard (15s)</span>
                    <span>Slow Paced (60s)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TEAM SCRATCHPAD */}
          {activeTab === 'scratchpad' && (
            <div className="space-y-4">
              <div className="bg-[#121614] border border-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white uppercase flex items-center gap-2">
                    <FileCode2 className="w-4 h-4 text-orange-400" />
                    <span>SHARED DEVELOPER SCRATCHPAD (MARKDOWN &amp; FORMULAS)</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Autosaved to Local Workspace
                  </span>
                </div>
                <textarea
                  value={devState.scratchpadNotes}
                  onChange={(e) => {
                    const val = e.target.value;
                    onUpdateDevState((prev) => ({
                      ...prev,
                      scratchpadNotes: val,
                    }));
                  }}
                  rows={14}
                  className="w-full bg-black/60 border border-white/20 rounded-xl p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-orange-500 leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* TAB 5: DOWNLOAD & PLAY DIRECTIONS */}
          {activeTab === 'download_guide' && (
            <div className="space-y-4">
              <div className="bg-cyan-950/40 border border-cyan-500/50 p-4 rounded-xl">
                <h4 className="text-sm font-black text-cyan-300 uppercase flex items-center gap-2">
                  <Download className="w-4 h-4 text-cyan-400" />
                  <span>STEP-BY-STEP DIRECTIONS: DOWNLOAD, INSTALL &amp; PLAYTEST</span>
                </h4>
                <p className="text-xs text-cyan-200/80 mt-1">
                  Here is the exact playbook to onboard 4 more developers so your entire team can build and playtest simultaneously.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Method 1: Playable PWA App */}
                <div className="bg-[#131715] p-4 rounded-xl border border-white/10">
                  <div className="flex items-center gap-2 text-xs font-black text-white uppercase">
                    <span className="w-5 h-5 rounded-full bg-cyan-600 text-white flex items-center justify-center text-[10px]">
                      1
                    </span>
                    <span>INSTALL AS DESKTOP &amp; MOBILE APP (PWA)</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    You and your testers can install the game directly from the browser to play in full-screen native mode:
                  </p>
                  <ol className="text-xs text-slate-300 list-decimal list-inside mt-2 space-y-1 font-mono">
                    <li>Open this game URL in <strong>Google Chrome, Microsoft Edge, or Safari</strong>.</li>
                    <li>Look at the address bar or browser menu for the <strong>"Install App"</strong> icon.</li>
                    <li>Click <strong>Install World War Rogue</strong>.</li>
                    <li>The game will launch as an independent window with zero browser tabs, touch gesture support, and desktop shortcuts.</li>
                  </ol>
                </div>

                {/* Method 2: Git & Local Codebase */}
                <div className="bg-[#131715] p-4 rounded-xl border border-white/10">
                  <div className="flex items-center gap-2 text-xs font-black text-white uppercase">
                    <span className="w-5 h-5 rounded-full bg-orange-600 text-white flex items-center justify-center text-[10px]">
                      2
                    </span>
                    <span>DOWNLOAD CODE &amp; RUN LOCALLY (VS CODE)</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    To have 4 developers write code simultaneously on their local machines:
                  </p>
                  <ol className="text-xs text-slate-300 list-decimal list-inside mt-2 space-y-1 font-mono">
                    <li>Click the <strong>Settings</strong> gear in Google AI Studio.</li>
                    <li>Select <strong>Export to GitHub</strong> (or <strong>Download ZIP</strong>).</li>
                    <li>Open your terminal and run:
                      <pre className="bg-black/80 p-1.5 rounded mt-1 text-[11px] text-orange-400">
                        git clone &lt;repo-url&gt;{'\n'}npm install{'\n'}npm run dev
                      </pre>
                    </li>
                    <li>Open <code className="text-orange-300">http://localhost:3000</code> in your browser.</li>
                  </ol>
                </div>

                {/* Method 3: Area Lock Discipline */}
                <div className="bg-[#131715] p-4 rounded-xl border border-white/10">
                  <div className="flex items-center gap-2 text-xs font-black text-white uppercase">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                      3
                    </span>
                    <span>THE 5-DEVELOPER AREA ASSIGNMENT RULES</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    Prevent merge conflicts by assigning one developer to one area:
                  </p>
                  <ul className="text-xs text-slate-300 space-y-1.5 mt-2 font-mono">
                    <li>• <strong>Dev 1 (RichMatt)</strong>: Master orchestrator &amp; core types.</li>
                    <li>• <strong>Dev 2</strong>: Ballistics, Combat Simulator &amp; Ricochet formulas.</li>
                    <li>• <strong>Dev 3</strong>: External Base 2D canvas, Threat grid &amp; CIWS defenses.</li>
                    <li>• <strong>Dev 4</strong>: Internal Base categories, Tech upgrades &amp; 100+ Unit roster.</li>
                    <li>• <strong>Dev 5</strong>: Alliances, Territorial 36 Sectors &amp; Comms.</li>
                  </ul>
                </div>

                {/* Method 4: Swapping Save States */}
                <div className="bg-[#131715] p-4 rounded-xl border border-white/10">
                  <div className="flex items-center gap-2 text-xs font-black text-white uppercase">
                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px]">
                      4
                    </span>
                    <span>TESTING EACH OTHER'S BASES (SAVE SWAP)</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    Test how bases perform under attack:
                  </p>
                  <ol className="text-xs text-slate-300 list-decimal list-inside mt-2 space-y-1 font-mono">
                    <li>Click <strong>GAME FOLDER</strong> in the HUD.</li>
                    <li>Navigate to <strong>SAVE &amp; ANTI-CHEAT</strong>.</li>
                    <li>Click <strong>EXPORT VERIFIED SAVE (.JSON)</strong>.</li>
                    <li>Send that file to another developer on your team.</li>
                    <li>They click <strong>IMPORT / RESTORE SAVE</strong> to immediately load and attack your exact base layout and squad setup!</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: BUG HUNTER */}
          {activeTab === 'bug_hunter' && (
            <div className="space-y-4">
              <div className="bg-red-950/40 border border-red-500/50 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-red-300 uppercase flex items-center gap-2">
                    <Bug className="w-4 h-4 text-red-400" />
                    <span>DIAGNOSTICS &amp; BUG HUNTING SUITE</span>
                  </h4>
                  <p className="text-xs text-red-200/80 mt-0.5">
                    Live system monitors and one-click bug dossier export for reproducible bug filing.
                  </p>
                </div>
                <button
                  onClick={handleExportBugReport}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>EXPORT BUG DOSSIER</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-black/50 p-3.5 rounded-xl border border-white/10">
                  <div className="text-slate-400 font-bold uppercase text-[10px]">Viewport</div>
                  <div className="text-lg font-black text-white font-mono mt-1">
                    {window.innerWidth} x {window.innerHeight} px
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">DPR: {window.devicePixelRatio}</div>
                </div>

                <div className="bg-black/50 p-3.5 rounded-xl border border-white/10">
                  <div className="text-slate-400 font-bold uppercase text-[10px]">Active Squads</div>
                  <div className="text-lg font-black text-orange-400 font-mono mt-1">
                    {activeGameState.squads.length} Formations
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {activeGameState.squads.reduce((acc, s) => acc + (s.unitIds?.length || 0), 0)} Units Assigned
                  </div>
                </div>

                <div className="bg-black/50 p-3.5 rounded-xl border border-white/10">
                  <div className="text-slate-400 font-bold uppercase text-[10px]">Base Fortifications</div>
                  <div className="text-lg font-black text-cyan-400 font-mono mt-1">
                    {activeGameState.buildings.length} Structures
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Grid: 10x10 Coordinate Space
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="bg-[#0b0e0c] px-4 sm:px-6 py-2.5 border-t border-white/10 flex flex-wrap items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <span className="text-orange-400 font-bold">HOTKEY SHORTCUT:</span>
            <span>Press <kbd className="px-1.5 py-0.5 rounded bg-black border border-white/20 text-white font-bold">Ctrl+Shift+D</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-black border border-white/20 text-white font-bold">~</kbd> (Tilde) to open this Dev Ops layer anytime.</span>
          </div>
          <div className="text-slate-500 font-mono">
            World War Rogue Engine v1.2.0-DEV
          </div>
        </div>
      </div>
    </div>
  );
};
