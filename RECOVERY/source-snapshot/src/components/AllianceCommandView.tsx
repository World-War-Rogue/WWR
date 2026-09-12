import React, { useState } from 'react';
import {
  Shield,
  Users,
  Award,
  Calendar,
  CheckCircle2,
  PlusCircle,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Crown,
  Star,
  Swords,
  Radio,
  Send,
  Globe2,
  Filter,
  Search,
  AlertTriangle,
  Zap,
  Target,
  FileText,
  ChevronRight,
  Trash2,
  Building2,
  Lock,
  Trophy,
} from 'lucide-react';
import {
  Alliance,
  AllianceMember,
  AllianceTask,
  AllianceEvent,
  AllianceRank,
  PlayerProfile,
  ServerInfo,
  CountryCode,
} from '../types';
import { soundFx } from '../utils/audio';

interface AllianceCommandViewProps {
  alliances: Alliance[];
  activeAllianceId: string;
  onSelectAlliance: (allianceId: string) => void;
  playerRole: AllianceRank;
  onSetPlayerRole: (role: AllianceRank) => void;
  profile: PlayerProfile;
  activeServer: ServerInfo;
  onPlanTask: (task: Omit<AllianceTask, 'id' | 'currentAmount' | 'status'>) => void;
  onSetUpEvent: (event: Omit<AllianceEvent, 'id' | 'currentScore' | 'status' | 'registeredMemberIds'>) => void;
  onContributeTask: (taskId: string, amount: number) => void;
  onRegisterEvent: (eventId: string) => void;
  onPromoteMember: (memberId: string) => boolean;
  onDemoteMember: (memberId: string) => void;
  onKickMember: (memberId: string) => void;
  onCreateAlliance: (allianceData: { name: string; tag: string; motto: string; emblemIcon: string }) => void;
  onOpenServerBrowser: () => void;
  onOpenLeaderboard?: () => void;
}

export const AllianceCommandView: React.FC<AllianceCommandViewProps> = ({
  alliances,
  activeAllianceId,
  onSelectAlliance,
  playerRole,
  onSetPlayerRole,
  profile,
  activeServer,
  onPlanTask,
  onSetUpEvent,
  onContributeTask,
  onRegisterEvent,
  onPromoteMember,
  onDemoteMember,
  onKickMember,
  onCreateAlliance,
  onOpenServerBrowser,
  onOpenLeaderboard,
}) => {
  const [activeTab, setActiveTab] = useState<'roster' | 'tasks' | 'events' | 'comms' | 'directory'>('roster');
  
  // Roster Filters
  const [rankFilter, setRankFilter] = useState<'ALL' | 'Admiral' | 'Colonel' | 'Lieutenant'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'power' | 'contribution' | 'rank'>('power');

  // Modals for Planning (Colonels & Admiral only)
  const [isPlanTaskModalOpen, setIsPlanTaskModalOpen] = useState<boolean>(false);
  const [isSetUpEventModalOpen, setIsSetUpEventModalOpen] = useState<boolean>(false);
  const [isCreateAllianceModalOpen, setIsCreateAllianceModalOpen] = useState<boolean>(false);

  // Form states for Task Planning
  const [newTaskTitle, setNewTaskTitle] = useState<string>('');
  const [newTaskDesc, setNewTaskDesc] = useState<string>('');
  const [newTaskCategory, setNewTaskCategory] = useState<AllianceTask['category']>('logistics');
  const [newTaskTarget, setNewTaskTarget] = useState<number>(50000);
  const [newTaskUnitLabel, setNewTaskUnitLabel] = useState<string>('Munitions Contributed');
  const [newTaskRewardBonds, setNewTaskRewardBonds] = useState<number>(300);

  // Form states for Event Setup
  const [newEventName, setNewEventName] = useState<string>('');
  const [newEventCodeName, setNewEventCodeName] = useState<string>('');
  const [newEventTheater, setNewEventTheater] = useState<string>('Pacific Littoral Archipelago');
  const [newEventType, setNewEventType] = useState<AllianceEvent['eventType']>('joint_fleet_exercise');
  const [newEventBriefing, setNewEventBriefing] = useState<string>('');
  const [newEventTargetScore, setNewEventTargetScore] = useState<number>(300000);

  // Form states for Creating an Alliance
  const [createName, setCreateName] = useState<string>('');
  const [createTag, setCreateTag] = useState<string>('');
  const [createMotto, setCreateMotto] = useState<string>('');
  const [createIcon, setCreateIcon] = useState<string>('🛡️');

  // Chat message in comms
  const [broadcastMessage, setBroadcastMessage] = useState<string>('');

  const currentAlliance = alliances.find((a) => a.id === activeAllianceId) || alliances[0];

  // Roster Stats
  const totalMembers = currentAlliance.members.length;
  const admiralCount = currentAlliance.members.filter((m) => m.rank === 'Admiral').length;
  const colonelCount = currentAlliance.members.filter((m) => m.rank === 'Colonel').length;
  const lieutenantCount = currentAlliance.members.filter((m) => m.rank === 'Lieutenant').length;

  const isAdmiral = playerRole === 'Admiral';
  const isColonel = playerRole === 'Colonel';
  const canPlanAndSetUp = isAdmiral || isColonel; // Up to 10 Colonels + Admiral assist in planning!

  // Filtered members
  const filteredMembers = currentAlliance.members
    .filter((m) => {
      if (rankFilter !== 'ALL' && m.rank !== rankFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          m.callsign.toLowerCase().includes(q) ||
          m.assignedRole.toLowerCase().includes(q) ||
          m.country.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'power') return b.combatPower - a.combatPower;
      if (sortBy === 'contribution') return b.contributionPoints - a.contributionPoints;
      if (sortBy === 'rank') {
        const rankWeight = { Admiral: 3, Colonel: 2, Lieutenant: 1 };
        return rankWeight[b.rank] - rankWeight[a.rank];
      }
      return 0;
    });

  // Handle task plan submit
  const handleSubmitPlanTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    onPlanTask({
      title: newTaskTitle.trim(),
      description: newTaskDesc.trim() || 'Tactical directive issued by alliance staff command.',
      category: newTaskCategory,
      targetAmount: Number(newTaskTarget) || 50000,
      unitLabel: newTaskUnitLabel,
      rewardWarBonds: Number(newTaskRewardBonds) || 300,
      rewardExp: 1200,
      plannedByCallsign: profile.callsign,
      plannedByRank: playerRole === 'Admiral' ? 'Admiral' : 'Colonel',
      expiresInHours: 24,
    });

    soundFx.playUpgradeSound();
    setIsPlanTaskModalOpen(false);
    setNewTaskTitle('');
    setNewTaskDesc('');
  };

  // Handle event setup submit
  const handleSubmitSetUpEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventName.trim()) return;

    onSetUpEvent({
      name: newEventName.trim(),
      codeName: newEventCodeName.trim().toUpperCase() || 'OPERATION APEX',
      theater: newEventTheater,
      eventType: newEventType,
      plannedByCallsign: profile.callsign,
      plannedByRank: playerRole === 'Admiral' ? 'Admiral' : 'Colonel',
      briefing: newEventBriefing.trim() || 'All 100 battlegroup members are directed to coordinate fire strikes.',
      scheduledTime: 'Tomorrow at 18:00 UTC',
      durationHours: 24,
      targetScore: Number(newEventTargetScore) || 300000,
      rewards: {
        warBonds: 1500,
        alloy: 20000,
        fuel: 30000,
        specialBadge: 'Staff Commendation Medal',
      },
    });

    soundFx.playUpgradeSound();
    setIsSetUpEventModalOpen(false);
    setNewEventName('');
    setNewEventCodeName('');
    setNewEventBriefing('');
  };

  // Handle create alliance submit
  const handleCreateAllianceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim() || !createTag.trim()) return;

    onCreateAlliance({
      name: createName.trim(),
      tag: createTag.trim().toUpperCase().slice(0, 6),
      motto: createMotto.trim() || 'Superiority Through Combined Arms',
      emblemIcon: createIcon,
    });

    soundFx.playUpgradeSound();
    setIsCreateAllianceModalOpen(false);
    setCreateName('');
    setCreateTag('');
    setCreateMotto('');
  };

  return (
    <div className="flex-1 p-3 sm:p-5 flex flex-col gap-4 max-w-7xl mx-auto w-full font-mono text-[#d1d5db] animate-fade-in">
      {/* Top Alliance Masthead */}
      <div className="bg-gradient-to-r from-black/80 via-[#0d141e]/90 to-black/80 border border-white/15 rounded-2xl p-4 sm:p-6 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        {/* Subtle grid accent */}
        <div className="absolute inset-0 bg-radial from-orange-500/5 to-transparent pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10">
          {/* Left: Emblem & Info */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-orange-600 to-amber-800 border-2 border-orange-400/60 flex items-center justify-center text-3xl sm:text-4xl shadow-xl shadow-orange-950/60 flex-shrink-0">
              {currentAlliance.emblemIcon}
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-xs bg-orange-600/90 text-white font-black px-2 py-0.5 rounded border border-orange-400/50 shadow-sm">
                  [{currentAlliance.tag}]
                </span>
                <h1 className="text-lg sm:text-2xl font-black text-white uppercase tracking-wider">
                  {currentAlliance.name}
                </h1>
                <span className="text-xs text-orange-400 bg-black/60 px-2 py-0.5 rounded border border-white/10 font-bold">
                  LEVEL {currentAlliance.level}
                </span>
              </div>

              <p className="text-xs text-slate-300 italic mt-1 max-w-2xl">
                &ldquo;{currentAlliance.motto}&rdquo;
              </p>

              {/* Badges row */}
              <div className="flex items-center gap-3 sm:gap-4 mt-2 flex-wrap text-xs">
                <div className="flex items-center gap-1.5 text-slate-300 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                  <Globe2 className="w-3.5 h-3.5 text-orange-400" />
                  <span>SERVER:</span>
                  <span className="text-white font-bold">{activeServer.name}</span>
                  <button
                    onClick={onOpenServerBrowser}
                    className="ml-1 text-[10px] text-orange-400 underline hover:text-orange-300"
                  >
                    Change
                  </button>
                </div>

                <div className="flex items-center gap-1.5 text-slate-300 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                  <Zap className="w-3.5 h-3.5 text-cyan-400" />
                  <span>TOTAL POWER:</span>
                  <span className="text-cyan-300 font-bold">
                    {(currentAlliance.totalCombatPower / 1000).toFixed(0)}k CP
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-slate-300 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  <span>ALLIANCE CAPACITY:</span>
                  <span className="text-white font-black">{totalMembers} / {currentAlliance.maxMembers}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Rank Structure Breakdown & Player Role Switcher */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-end gap-3 w-full lg:w-auto">
            {/* Hierarchy summary cards */}
            <div className="flex items-center gap-2 bg-black/50 p-2 rounded-xl border border-white/10 text-xs w-full sm:w-auto justify-between sm:justify-start">
              <div className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span>1 Admiral</span>
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-300 flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-blue-400" />
                <span>{colonelCount} / 10 Colonels</span>
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-slate-500/15 border border-slate-500/30 text-slate-300 flex items-center gap-1.5">
                <Swords className="w-3.5 h-3.5 text-slate-400" />
                <span>{lieutenantCount} Lieutenants</span>
              </div>
            </div>

            {/* Interactive Player Role Simulator Switcher */}
            <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 text-xs w-full sm:w-auto justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400">YOUR ROLE:</span>
              <div className="flex items-center gap-1">
                {(['Admiral', 'Colonel', 'Lieutenant'] as const).map((r) => {
                  const isActive = playerRole === r;
                  return (
                    <button
                      key={r}
                      onClick={() => {
                        onSetPlayerRole(r);
                        soundFx.playRadioChirp();
                      }}
                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase transition-all flex items-center gap-1 border ${
                        isActive
                          ? r === 'Admiral'
                            ? 'bg-amber-600 text-white border-amber-400 shadow-md'
                            : r === 'Colonel'
                            ? 'bg-blue-600 text-white border-blue-400 shadow-md'
                            : 'bg-slate-600 text-white border-slate-400 shadow-md'
                          : 'bg-black/40 text-slate-400 border-white/5 hover:text-white'
                      }`}
                      title={`Switch test perspective to ${r}`}
                    >
                      {r === 'Admiral' && <Crown className="w-2.5 h-2.5" />}
                      {r === 'Colonel' && <Star className="w-2.5 h-2.5" />}
                      {r === 'Lieutenant' && <Swords className="w-2.5 h-2.5" />}
                      <span>{r}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Staff Planning Notice for Colonels and Admiral */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-orange-600/20 border border-orange-500/40 flex items-center justify-center text-orange-400 flex-shrink-0">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-white uppercase text-xs">
              COMMAND AUTHORITY:
            </span>
            <span className="text-slate-300 ml-1.5">
              {canPlanAndSetUp ? (
                <span className="text-emerald-400 font-bold">
                  As {playerRole}, you have staff authority to plan Alliance Tasks, schedule Operations, and set up War Events!
                </span>
              ) : (
                <span className="text-slate-400">
                  As Lieutenant, you execute frontline missions and contribute firepower to operations planned by the Admiral &amp; up to 10 Colonels.
                </span>
              )}
            </span>
          </div>
        </div>

        {canPlanAndSetUp && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlanTaskModalOpen(true)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-black uppercase text-xs flex items-center gap-1.5 shadow-md shadow-blue-950/40 cursor-pointer transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>PLAN ALLIANCE TASK</span>
            </button>
            <button
              onClick={() => setIsSetUpEventModalOpen(true)}
              className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-black uppercase text-xs flex items-center gap-1.5 shadow-md shadow-orange-950/40 cursor-pointer transition-all"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>SET UP WAR EVENT</span>
            </button>
          </div>
        )}
      </div>

      {/* View Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-white/10 pb-1 overflow-x-auto text-xs scrollbar-thin">
        {[
          { id: 'roster', label: `ALLIANCE ROSTER (${totalMembers})`, icon: Users },
          { id: 'tasks', label: `TASKS & PLANNING (${currentAlliance.tasks.length})`, icon: Target },
          { id: 'events', label: `WAR EVENTS (${currentAlliance.events.length})`, icon: Calendar },
          { id: 'comms', label: 'COMMS & WAR LOG', icon: Radio },
          { id: 'directory', label: 'ALLIANCES DIRECTORY', icon: Building2 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as typeof activeTab);
                soundFx.playRadioChirp();
              }}
              className={`px-4 py-2 rounded-t-lg font-black uppercase tracking-wider text-xs flex items-center gap-2 transition-all border-t border-x cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-white/10 text-orange-400 border-orange-500/50 shadow-md'
                  : 'bg-black/40 text-slate-400 border-transparent hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}

        {onOpenLeaderboard && (
          <button
            onClick={() => {
              soundFx.playRadioChirp();
              onOpenLeaderboard();
            }}
            className="ml-auto px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-yellow-600/30 to-amber-600/30 hover:from-yellow-500 hover:to-amber-500 text-yellow-300 hover:text-black font-black uppercase tracking-wider text-xs flex items-center gap-1.5 border border-yellow-500/50 shadow-md cursor-pointer transition-all whitespace-nowrap"
            title="Open Alliance Leaderboard, Season Progress & Territorial Map"
          >
            <Trophy className="w-3.5 h-3.5 text-yellow-400" />
            <span>LEADERBOARD &amp; TERRITORY</span>
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ROSTER (100 MEMBERS) */}
      {/* ========================================================================= */}
      {activeTab === 'roster' && (
        <div className="flex flex-col gap-3">
          {/* Controls bar: Rank Filters, Search, Sort */}
          <div className="p-3 bg-white/5 border border-white/10 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Rank quick filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <span className="text-[10px] text-slate-400 uppercase font-black mr-1">RANKS:</span>
              <button
                onClick={() => setRankFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg font-bold uppercase transition-all ${
                  rankFilter === 'ALL'
                    ? 'bg-orange-600 text-white'
                    : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                All ({totalMembers})
              </button>
              <button
                onClick={() => setRankFilter('Admiral')}
                className={`px-2.5 py-1 rounded-lg font-bold uppercase transition-all flex items-center gap-1 ${
                  rankFilter === 'Admiral'
                    ? 'bg-amber-600 text-white'
                    : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                <Crown className="w-3 h-3 text-amber-400" />
                <span>Admiral ({admiralCount})</span>
              </button>
              <button
                onClick={() => setRankFilter('Colonel')}
                className={`px-2.5 py-1 rounded-lg font-bold uppercase transition-all flex items-center gap-1 ${
                  rankFilter === 'Colonel'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                <Star className="w-3 h-3 text-blue-400" />
                <span>Colonels ({colonelCount}/10)</span>
              </button>
              <button
                onClick={() => setRankFilter('Lieutenant')}
                className={`px-2.5 py-1 rounded-lg font-bold uppercase transition-all flex items-center gap-1 ${
                  rankFilter === 'Lieutenant'
                    ? 'bg-slate-600 text-white'
                    : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                <Swords className="w-3 h-3 text-slate-400" />
                <span>Lieutenants ({lieutenantCount})</span>
              </button>
            </div>

            {/* Search & Sort */}
            <div className="flex items-center gap-2 flex-1 sm:max-w-md justify-end">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search callsign, role, country..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-lg pl-8 pr-3 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="bg-black/60 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none"
              >
                <option value="power">Sort: Combat Power</option>
                <option value="contribution">Sort: Contribution</option>
                <option value="rank">Sort: Rank Hierarchy</option>
              </select>
            </div>
          </div>

          {/* Roster Table / Card Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
            {filteredMembers.map((member) => {
              const isMemAdmiral = member.rank === 'Admiral';
              const isMemColonel = member.rank === 'Colonel';
              const isMemLieutenant = member.rank === 'Lieutenant';

              const rankBadge = isMemAdmiral ? (
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black uppercase flex items-center gap-1">
                  <Crown className="w-3 h-3 text-amber-400" />
                  <span>ADMIRAL (LEADER)</span>
                </span>
              ) : isMemColonel ? (
                <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px] font-black uppercase flex items-center gap-1">
                  <Star className="w-3 h-3 text-blue-400" />
                  <span>COLONEL (STAFF PLANNER)</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-slate-500/20 text-slate-300 border border-slate-500/40 text-[10px] font-black uppercase flex items-center gap-1">
                  <Swords className="w-3 h-3 text-slate-400" />
                  <span>LIEUTENANT</span>
                </span>
              );

              const statusBadge =
                member.onlineStatus === 'ONLINE' ? (
                  <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-500/30 font-bold">
                    ONLINE
                  </span>
                ) : member.onlineStatus === 'IN_COMBAT' ? (
                  <span className="text-[10px] text-red-400 bg-red-950/80 px-1.5 py-0.2 rounded border border-red-500/30 font-bold animate-pulse">
                    IN COMBAT
                  </span>
                ) : member.onlineStatus === 'DEPLOYED' ? (
                  <span className="text-[10px] text-amber-400 bg-amber-950/80 px-1.5 py-0.2 rounded border border-amber-500/30 font-bold">
                    SORTIE DEPLOYED
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500 bg-black/50 px-1.5 py-0.2 rounded border border-white/5">
                    OFFLINE
                  </span>
                );

              return (
                <div
                  key={member.id}
                  className={`p-3 rounded-xl border transition-all flex flex-col justify-between ${
                    isMemAdmiral
                      ? 'bg-amber-950/20 border-amber-500/40 shadow-lg shadow-amber-950/30'
                      : isMemColonel
                      ? 'bg-blue-950/15 border-blue-500/30'
                      : 'bg-white/5 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div>
                    {/* Top Row: Callsign & Rank */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-black/60 px-1.5 py-0.5 rounded border border-white/10 font-bold text-slate-300">
                          {member.country}
                        </span>
                        <span className="font-black text-white text-xs tracking-wider">
                          {member.callsign}
                        </span>
                        {member.isPlayer && (
                          <span className="text-[9px] bg-orange-600 text-white font-black px-1.5 py-0.2 rounded">
                            YOU
                          </span>
                        )}
                      </div>
                      {statusBadge}
                    </div>

                    {/* Rank Badge & Role */}
                    <div className="mt-2 flex items-center justify-between gap-2">
                      {rankBadge}
                      <span className="text-cyan-300 font-bold text-xs font-mono">
                        {member.combatPower.toLocaleString()} CP
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 mt-1.5 line-clamp-1">
                      {member.assignedRole}
                    </div>

                    {/* Stats footer */}
                    <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400">
                      <span>Contribution: <strong className="text-white">{member.contributionPoints.toLocaleString()}</strong></span>
                      <span>Tasks: <strong className="text-white">{member.tasksCompleted}</strong></span>
                      <span>Joined: <span className="text-slate-500">{member.joinedDate}</span></span>
                    </div>
                  </div>

                  {/* Actions for Admiral or Staff */}
                  {isAdmiral && !member.isPlayer && (
                    <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-end gap-1.5 text-[10px]">
                      {isMemLieutenant && (
                        <button
                          onClick={() => {
                            const ok = onPromoteMember(member.id);
                            if (!ok) {
                              alert('Cannot promote: Maximum 10 Colonels limit reached. Demote a Colonel first.');
                            } else {
                              soundFx.playUpgradeSound();
                            }
                          }}
                          disabled={colonelCount >= 10}
                          className={`px-2 py-1 rounded font-bold uppercase transition-colors ${
                            colonelCount >= 10
                              ? 'bg-white/5 text-slate-500 cursor-not-allowed'
                              : 'bg-blue-600/80 hover:bg-blue-500 text-white cursor-pointer'
                          }`}
                          title={colonelCount >= 10 ? 'Maximum 10 Colonels reached' : 'Promote to Colonel'}
                        >
                          Promote to Colonel ({colonelCount}/10)
                        </button>
                      )}

                      {isMemColonel && (
                        <button
                          onClick={() => {
                            onDemoteMember(member.id);
                            soundFx.playRadioChirp();
                          }}
                          className="px-2 py-1 bg-white/5 hover:bg-slate-700 text-slate-300 rounded font-bold uppercase cursor-pointer transition-colors"
                        >
                          Demote to Lieutenant
                        </button>
                      )}

                      <button
                        onClick={() => {
                          onKickMember(member.id);
                          soundFx.playRadioChirp();
                        }}
                        className="p-1 hover:bg-red-500/20 text-slate-500 hover:text-red-400 rounded transition-colors"
                        title="Discharge Member"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TASKS & PLANNING */}
      {/* ========================================================================= */}
      {activeTab === 'tasks' && (
        <div className="flex flex-col gap-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Target className="w-4 h-4 text-orange-400" />
                <span>OPERATIONAL ALLIANCE TASKS</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Planned directly by the <strong>Admiral</strong> and up to <strong>10 Staff Colonels</strong>. All 100 members contribute firepower &amp; supplies.
              </p>
            </div>

            {canPlanAndSetUp && (
              <button
                onClick={() => setIsPlanTaskModalOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase rounded-lg shadow-lg shadow-blue-950/40 flex items-center gap-2 cursor-pointer transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ PLAN NEW ALLIANCE TASK</span>
              </button>
            )}
          </div>

          {/* Active Tasks Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentAlliance.tasks.map((task) => {
              const progressPct = Math.min(100, Math.round((task.currentAmount / task.targetAmount) * 100));
              const isCompleted = task.currentAmount >= task.targetAmount;

              return (
                <div
                  key={task.id}
                  className="bg-black/60 border border-white/10 rounded-xl p-4 flex flex-col justify-between shadow-xl"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-orange-400 font-bold uppercase">
                            {task.category.toUpperCase()}
                          </span>
                          <h4 className="text-sm font-black text-white">{task.title}</h4>
                        </div>
                        <p className="text-xs text-slate-400 mt-1.5">{task.description}</p>
                      </div>

                      {isCompleted ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-black uppercase flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>COMPLETED</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/40 text-[10px] font-bold flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{task.expiresInHours}h left</span>
                        </span>
                      )}
                    </div>

                    {/* Planned By Badge */}
                    <div className="mt-3 flex items-center gap-2 text-xs">
                      <span className="text-slate-500">Planned by:</span>
                      <span className="text-blue-300 font-bold flex items-center gap-1 bg-blue-950/40 px-2 py-0.5 rounded border border-blue-500/30">
                        {task.plannedByRank === 'Admiral' ? <Crown className="w-3 h-3 text-amber-400" /> : <Star className="w-3 h-3 text-blue-400" />}
                        <span>{task.plannedByRank} {task.plannedByCallsign}</span>
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-slate-400 font-bold">{task.unitLabel}</span>
                        <span className="font-mono text-white font-bold">
                          {task.currentAmount.toLocaleString()} / {task.targetAmount.toLocaleString()} ({progressPct}%)
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden p-0.5">
                        <div
                          className="h-full bg-gradient-to-r from-orange-600 to-amber-500 rounded-full transition-all duration-500"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Reward Pool */}
                    <div className="mt-3 flex items-center gap-3 text-xs">
                      <span className="text-slate-500">Task Rewards:</span>
                      <span className="text-yellow-400 font-bold">+{task.rewardWarBonds} Bonds</span>
                      <span className="text-cyan-300 font-bold">+{task.rewardExp} Alliance EXP</span>
                    </div>
                  </div>

                  {/* Contribution Button */}
                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-400">
                      Supply munitions or deploy sorties to contribute:
                    </span>
                    <button
                      onClick={() => {
                        onContributeTask(task.id, 2500);
                        soundFx.playUpgradeSound();
                      }}
                      disabled={isCompleted}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider cursor-pointer transition-all flex items-center gap-1 ${
                        isCompleted
                          ? 'bg-white/5 text-slate-500 cursor-not-allowed'
                          : 'bg-orange-600 hover:bg-orange-500 text-white shadow-md shadow-orange-950/40'
                      }`}
                    >
                      <span>CONTRIBUTE (+2.5k)</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: WAR EVENTS */}
      {/* ========================================================================= */}
      {activeTab === 'events' && (
        <div className="flex flex-col gap-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-orange-400" />
                <span>SCHEDULED ALLIANCE WAR GAMES &amp; FLEET EXERCISES</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Scheduled by <strong>Colonels</strong> and the <strong>Admiral</strong>. Mobilize all 100 members for high-yield rewards.
              </p>
            </div>

            {canPlanAndSetUp && (
              <button
                onClick={() => setIsSetUpEventModalOpen(true)}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-black text-xs uppercase rounded-lg shadow-lg shadow-orange-950/40 flex items-center gap-2 cursor-pointer transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ SET UP ALLIANCE EVENT</span>
              </button>
            )}
          </div>

          {/* Events List */}
          <div className="space-y-4">
            {currentAlliance.events.map((event) => {
              const isRegistered = event.registeredMemberIds.includes('mem-AEGIS-col-1') || event.registeredMemberIds.includes(profile.callsign);
              const scorePct = Math.min(100, Math.round((event.currentScore / event.targetScore) * 100));

              return (
                <div
                  key={event.id}
                  className="bg-black/60 border border-white/10 rounded-xl p-4 sm:p-5 shadow-xl flex flex-col gap-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs bg-orange-600 text-white font-black px-2 py-0.5 rounded">
                          {event.codeName}
                        </span>
                        <h4 className="text-base font-black text-white uppercase">{event.name}</h4>
                        <span className="text-xs text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                          {event.theater}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                        <span>Set up by: <strong className="text-blue-300">{event.plannedByRank} {event.plannedByCallsign}</strong></span>
                        <span>•</span>
                        <span className="text-orange-400 font-bold">{event.scheduledTime}</span>
                        <span>•</span>
                        <span>Duration: <strong className="text-white">{event.durationHours} Hours</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase border ${
                        event.status === 'ACTIVE'
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse'
                          : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                      }`}>
                        {event.status}
                      </span>
                    </div>
                  </div>

                  {/* Directive Briefing */}
                  <div className="p-3 rounded-lg bg-white/5 border border-white/5 text-xs text-slate-300 leading-relaxed">
                    <strong className="text-white uppercase mr-1">OPERATIONAL DIRECTIVE:</strong>
                    {event.briefing}
                  </div>

                  {/* Telemetry & Scores */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                    <div className="bg-black/40 p-2.5 rounded-lg border border-white/5">
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">PARTICIPATING MEMBERS</span>
                      <span className="text-sm font-black text-white mt-1 block">
                        {event.registeredMemberIds.length} / 100 Command Units
                      </span>
                    </div>
                    <div className="bg-black/40 p-2.5 rounded-lg border border-white/5">
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">EVENT COMBAT SCORE</span>
                      <span className="text-sm font-black text-cyan-300 mt-1 block">
                        {event.currentScore.toLocaleString()} / {event.targetScore.toLocaleString()} ({scorePct}%)
                      </span>
                    </div>
                    <div className="bg-black/40 p-2.5 rounded-lg border border-white/5">
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">REWARD POOL</span>
                      <span className="text-xs font-bold text-yellow-400 mt-1 block">
                        +{event.rewards.warBonds} Bonds | +{event.rewards.alloy.toLocaleString()} Alloy
                      </span>
                    </div>
                  </div>

                  {/* Action Register */}
                  <div className="pt-2 flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs text-slate-400">
                      {event.rewards.specialBadge && (
                        <span>Commendation Badge: <strong className="text-orange-400">{event.rewards.specialBadge}</strong></span>
                      )}
                    </span>

                    <button
                      onClick={() => {
                        onRegisterEvent(event.id);
                        soundFx.playUpgradeSound();
                      }}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-orange-950/40 cursor-pointer transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isRegistered ? 'SQUAD REGISTERED (DEPLOYED)' : 'REGISTER SQUAD TO EVENT'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: COMMS & WAR LOG */}
      {/* ========================================================================= */}
      {activeTab === 'comms' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Tactical War Log */}
          <div className="lg:col-span-2 bg-black/60 border border-white/10 rounded-xl p-4 flex flex-col justify-between shadow-xl">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-3">
                <Radio className="w-4 h-4 text-orange-400" />
                <span>SECURE ALLIANCE TACTICAL WAR LOG</span>
              </h3>

              <div className="space-y-2 mt-3 max-h-96 overflow-y-auto pr-1">
                {currentAlliance.logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-lg bg-white/5 border border-white/5 flex items-start gap-2.5 text-xs"
                  >
                    <span className="text-[10px] text-orange-400 font-mono font-bold whitespace-nowrap">
                      [{log.timestamp}]
                    </span>
                    <div className="text-slate-300">
                      <span className="font-bold text-white mr-1.5">
                        {log.type === 'promotion' ? '🎖️ [PROMOTION]' : log.type === 'task_plan' ? '📋 [TASK PLAN]' : log.type === 'event_plan' ? '⚔️ [EVENT SETUP]' : '⚡ [OPERATION]'}:
                      </span>
                      <span>{log.text}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Broadcast Form */}
            <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-2">
              <input
                type="text"
                placeholder="Broadcast tactical directives to alliance frequency..."
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                className="flex-1 bg-black/80 border border-white/15 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
              />
              <button
                onClick={() => {
                  if (!broadcastMessage.trim()) return;
                  soundFx.playRadioChirp();
                  setBroadcastMessage('');
                }}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-black uppercase flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>TRANSMIT</span>
              </button>
            </div>
          </div>

          {/* Alliance Command Staff Card */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col justify-between shadow-xl text-xs">
            <div>
              <h4 className="text-xs font-black text-white uppercase tracking-wider border-b border-white/10 pb-2">
                STAFF COMMAND PROTOCOL
              </h4>
              <ul className="mt-3 space-y-2.5 text-slate-300 leading-relaxed">
                <li className="flex items-start gap-2">
                  <Crown className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-amber-300">Admiral (1 Leader):</strong> Supreme authority over promotions, recruitment, manifesto, and battlegroup operations.
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <Star className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-blue-300">Colonels (Up to 10):</strong> Staff officers who assist in planning tasks and setting up alliance events.
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <Swords className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-300">Lieutenants (Up to 89):</strong> Frontline squadron commanders contributing firepower and executing orders.
                  </div>
                </li>
              </ul>
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 text-[11px] text-slate-400">
              Maximum Alliance Capacity: <strong className="text-white">100 Members</strong>.
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: ALLIANCES DIRECTORY */}
      {/* ========================================================================= */}
      {activeTab === 'directory' && (
        <div className="flex flex-col gap-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-orange-400" />
                <span>SERVER ALLIANCES DIRECTORY</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Browse active military coalitions on <strong>{activeServer.name}</strong> or found your own 100-member alliance.
              </p>
            </div>

            <button
              onClick={() => setIsCreateAllianceModalOpen(true)}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-black text-xs uppercase rounded-lg shadow-lg shadow-orange-950/40 flex items-center gap-2 cursor-pointer transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ FOUND NEW ALLIANCE</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alliances.map((ally) => {
              const isCurrent = ally.id === currentAlliance.id;
              const admiral = ally.members.find((m) => m.rank === 'Admiral');
              const cols = ally.members.filter((m) => m.rank === 'Colonel').length;

              return (
                <div
                  key={ally.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                    isCurrent
                      ? 'bg-orange-950/20 border-orange-500/50 shadow-xl'
                      : 'bg-black/60 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl">
                          {ally.emblemIcon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs bg-orange-600 text-white font-black px-1.5 py-0.2 rounded">
                              [{ally.tag}]
                            </span>
                            <h4 className="text-sm font-black text-white">{ally.name}</h4>
                          </div>
                          <p className="text-[11px] text-slate-400 italic mt-0.5 line-clamp-1">
                            &ldquo;{ally.motto}&rdquo;
                          </p>
                        </div>
                      </div>

                      {isCurrent && (
                        <span className="text-[9px] bg-emerald-600 text-white px-2 py-0.5 rounded font-black uppercase">
                          YOUR ALLIANCE
                        </span>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/10 text-center text-xs">
                      <div className="bg-white/5 p-2 rounded-lg">
                        <span className="text-[9px] text-slate-400 block font-bold">MEMBERS</span>
                        <span className="font-black text-white">{ally.members.length} / 100</span>
                      </div>
                      <div className="bg-white/5 p-2 rounded-lg">
                        <span className="text-[9px] text-slate-400 block font-bold">COLONELS</span>
                        <span className="font-black text-blue-300">{cols} / 10</span>
                      </div>
                      <div className="bg-white/5 p-2 rounded-lg">
                        <span className="text-[9px] text-slate-400 block font-bold">POWER</span>
                        <span className="font-black text-cyan-300">{(ally.totalCombatPower / 1000).toFixed(0)}k</span>
                      </div>
                    </div>

                    <div className="mt-2.5 text-[11px] text-slate-400 flex items-center justify-between">
                      <span>Admiral: <strong className="text-amber-300">{admiral?.callsign || 'Supreme Commander'}</strong></span>
                      <span>Level: <strong className="text-white">{ally.level}</strong></span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-end">
                    {isCurrent ? (
                      <button
                        disabled
                        className="px-4 py-1.5 bg-white/10 text-slate-400 rounded-lg text-xs font-bold uppercase cursor-default"
                      >
                        Active
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          onSelectAlliance(ally.id);
                          soundFx.playRadioChirp();
                        }}
                        className="px-4 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-black uppercase tracking-wider shadow-md shadow-orange-950/40 cursor-pointer transition-all"
                      >
                        Switch To This Alliance
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PLAN ALLIANCE TASK (FOR COLONELS & ADMIRAL) */}
      {/* ========================================================================= */}
      {isPlanTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-xl animate-fade-in font-mono text-[#d1d5db]">
          <div className="bg-[#0c1017] border border-white/15 rounded-2xl w-full max-w-lg p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-black text-white uppercase">
                  PLAN ALLIANCE TASK (STAFF OPERATION)
                </h3>
              </div>
              <button
                onClick={() => setIsPlanTaskModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmitPlanTask} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">TASK TITLE</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Operation Iron Strike: Artillery Convoy"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full bg-black/70 border border-white/15 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">CATEGORY</label>
                  <select
                    value={newTaskCategory}
                    onChange={(e) => setNewTaskCategory(e.target.value as AllianceTask['category'])}
                    className="w-full bg-black/70 border border-white/15 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="logistics">Logistics &amp; Munitions</option>
                    <option value="naval_sub">Naval &amp; Submarine Sorties</option>
                    <option value="armor">Armor Breakthrough</option>
                    <option value="air_defense">Integrated Air Defense</option>
                    <option value="drone_recon">Drone Reconnaissance</option>
                    <option value="combat_sim">Combat Simulator Victories</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">TARGET GOAL</label>
                  <input
                    type="number"
                    min="1"
                    value={newTaskTarget}
                    onChange={(e) => setNewTaskTarget(Number(e.target.value))}
                    className="w-full bg-black/70 border border-white/15 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">METRIC LABEL</label>
                <input
                  type="text"
                  placeholder="e.g. Munitions Contributed / Submarine Sorties"
                  value={newTaskUnitLabel}
                  onChange={(e) => setNewTaskUnitLabel(e.target.value)}
                  className="w-full bg-black/70 border border-white/15 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">OPERATIONAL DESCRIPTION</label>
                <textarea
                  rows={3}
                  placeholder="Directives and briefing details for the 100 alliance members..."
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  className="w-full bg-black/70 border border-white/15 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPlanTaskModalOpen(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-black uppercase tracking-wider shadow-lg shadow-blue-950/40"
                >
                  Issue Task Directive
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SET UP ALLIANCE EVENT (FOR COLONELS & ADMIRAL) */}
      {/* ========================================================================= */}
      {isSetUpEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-xl animate-fade-in font-mono text-[#d1d5db]">
          <div className="bg-[#0c1017] border border-white/15 rounded-2xl w-full max-w-lg p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-orange-400" />
                <h3 className="text-sm font-black text-white uppercase">
                  SET UP ALLIANCE EVENT (WAR GAMES &amp; OPERATIONS)
                </h3>
              </div>
              <button
                onClick={() => setIsSetUpEventModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmitSetUpEvent} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">EVENT NAME</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Combined Fleet War Games: Mariana Trench"
                  value={newEventName}
                  onChange={(e) => setNewEventName(e.target.value)}
                  className="w-full bg-black/70 border border-white/15 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">CODE NAME</label>
                  <input
                    type="text"
                    placeholder="e.g. TRIDENT APEX"
                    value={newEventCodeName}
                    onChange={(e) => setNewEventCodeName(e.target.value)}
                    className="w-full bg-black/70 border border-white/15 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">EVENT TYPE</label>
                  <select
                    value={newEventType}
                    onChange={(e) => setNewEventType(e.target.value as AllianceEvent['eventType'])}
                    className="w-full bg-black/70 border border-white/15 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="joint_fleet_exercise">Joint Fleet Exercise</option>
                    <option value="bastion_defense">48h Bastion Defense</option>
                    <option value="deep_strike_raid">Deep Strike Offensive</option>
                    <option value="cross_server_war">Cross-Server War Games</option>
                    <option value="recon_sweep">Stratospheric Recon Sweep</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">THEATER LOCATION</label>
                <input
                  type="text"
                  placeholder="e.g. Pacific Littoral Archipelago / Northern Tundra"
                  value={newEventTheater}
                  onChange={(e) => setNewEventTheater(e.target.value)}
                  className="w-full bg-black/70 border border-white/15 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">TACTICAL BRIEFING</label>
                <textarea
                  rows={3}
                  placeholder="Operational directives for the alliance..."
                  value={newEventBriefing}
                  onChange={(e) => setNewEventBriefing(e.target.value)}
                  className="w-full bg-black/70 border border-white/15 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSetUpEventModalOpen(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-black uppercase tracking-wider shadow-lg shadow-orange-950/40"
                >
                  Schedule Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: FOUND NEW ALLIANCE */}
      {/* ========================================================================= */}
      {isCreateAllianceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-xl animate-fade-in font-mono text-[#d1d5db]">
          <div className="bg-[#0c1017] border border-white/15 rounded-2xl w-full max-w-lg p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-black text-white uppercase">
                  FOUND NEW 100-MEMBER ALLIANCE (BECOME ADMIRAL)
                </h3>
              </div>
              <button
                onClick={() => setIsCreateAllianceModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateAllianceSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">ALLIANCE NAME</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Valkyrie Strike Wing"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="w-full bg-black/70 border border-white/15 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">ALLIANCE TAG (3-6 Chars)</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="e.g. VLK"
                    value={createTag}
                    onChange={(e) => setCreateTag(e.target.value)}
                    className="w-full bg-black/70 border border-white/15 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500 uppercase font-black"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">EMBLEM ICON</label>
                  <select
                    value={createIcon}
                    onChange={(e) => setCreateIcon(e.target.value)}
                    className="w-full bg-black/70 border border-white/15 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="🛡️">🛡️ Aegis Shield</option>
                    <option value="⚔️">⚔️ Crossed Swords</option>
                    <option value="🦅">🦅 Iron Eagle</option>
                    <option value="🌊">🌊 Undersea Trident</option>
                    <option value="⚡">⚡ Thunder Bolt</option>
                    <option value="🚀">🚀 Ballistic Rocket</option>
                    <option value="🎯">🎯 Precision Crosshair</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">ALLIANCE MOTTO</label>
                <input
                  type="text"
                  placeholder="e.g. Silent Depths, Devastating Strikes"
                  value={createMotto}
                  onChange={(e) => setCreateMotto(e.target.value)}
                  className="w-full bg-black/70 border border-white/15 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-lg text-amber-200 text-[11px] leading-relaxed">
                As the founding <strong>Admiral</strong>, you can recruit up to 100 members, appoint up to 10 <strong>Colonels</strong> to assist in planning tasks and events, and lead your battlegroup to supremacy!
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateAllianceModalOpen(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-black uppercase tracking-wider shadow-lg shadow-amber-950/40"
                >
                  Commission Alliance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
