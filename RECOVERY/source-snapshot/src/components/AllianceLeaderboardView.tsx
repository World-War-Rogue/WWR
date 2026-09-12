import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Award,
  Crown,
  Star,
  Swords,
  Shield,
  MapPin,
  Globe,
  Search,
  Filter,
  ChevronRight,
  Zap,
  Target,
  TrendingUp,
  Flame,
  Crosshair,
  Radio,
  BarChart2,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Users,
  Compass,
  ArrowUpRight,
  SlidersHorizontal,
  Sparkles,
  Info,
  X,
  Send,
} from 'lucide-react';
import {
  Alliance,
  AllianceRank,
  PlayerProfile,
  ServerInfo,
  ControlledSectorInfo,
} from '../types';
import {
  TheaterSector,
  INITIAL_THEATER_SECTORS,
  SEASON_EVENT_MILESTONES,
  calculateAllianceCompositeScore,
} from '../data/leaderboard';
import { soundFx } from '../utils/audio';

interface AllianceLeaderboardViewProps {
  alliances: Alliance[];
  activeAllianceId: string;
  onSelectAlliance: (allianceId: string) => void;
  servers: ServerInfo[];
  activeServer: ServerInfo;
  onSelectServer?: (serverId: string) => void;
  playerRole: AllianceRank;
  profile: PlayerProfile;
  onSwitchToAllianceCommand?: () => void;
}

type SortCriteria = 'composite' | 'power' | 'event' | 'territory';
type LeaderboardTab = 'standings' | 'theater_map' | 'season_events' | 'compare';

export const AllianceLeaderboardView: React.FC<AllianceLeaderboardViewProps> = ({
  alliances,
  activeAllianceId,
  onSelectAlliance,
  servers,
  activeServer,
  onSelectServer,
  playerRole,
  profile,
  onSwitchToAllianceCommand,
}) => {
  // Main view navigation tabs
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('standings');

  // Sorting & Filtering
  const [sortBy, setSortBy] = useState<SortCriteria>('composite');
  const [serverFilter, setServerFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Theater map state
  const [theaterSectors, setTheaterSectors] = useState<TheaterSector[]>(INITIAL_THEATER_SECTORS);
  const [selectedSector, setSelectedSector] = useState<TheaterSector | null>(null);
  const [sectorFilterType, setSectorFilterType] = useState<string>('ALL');

  // Inspected Alliance Modal
  const [inspectedAlliance, setInspectedAlliance] = useState<Alliance | null>(null);
  const [diplomaticMessageSent, setDiplomaticMessageSent] = useState<string | null>(null);

  // Active player alliance
  const currentAlliance = useMemo(() => {
    return alliances.find((a) => a.id === activeAllianceId) || alliances[0];
  }, [alliances, activeAllianceId]);

  // Dynamic ranking calculation
  const rankedAlliances = useMemo(() => {
    // Filter by server & search
    let list = alliances.filter((a) => {
      const matchServer = serverFilter === 'ALL' || a.serverId === serverFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        a.name.toLowerCase().includes(q) ||
        a.tag.toLowerCase().includes(q) ||
        a.motto.toLowerCase().includes(q) ||
        a.members.some((m) => m.callsign.toLowerCase().includes(q));
      return matchServer && matchSearch;
    });

    // Sort according to criteria
    list.sort((a, b) => {
      if (sortBy === 'power') {
        return b.totalCombatPower - a.totalCombatPower;
      }
      if (sortBy === 'event') {
        const scoreA = a.seasonEventProgress?.eventScore || 0;
        const scoreB = b.seasonEventProgress?.eventScore || 0;
        return scoreB - scoreA;
      }
      if (sortBy === 'territory') {
        const sectA = a.territorialControl?.sectorsControlled || 0;
        const sectB = b.territorialControl?.sectorsControlled || 0;
        if (sectB !== sectA) return sectB - sectA;
        return (b.territorialControl?.controlPercentage || 0) - (a.territorialControl?.controlPercentage || 0);
      }
      // default: composite score
      const compA =
        a.compositeScore ||
        calculateAllianceCompositeScore(
          a.totalCombatPower,
          a.seasonEventProgress?.eventScore || 0,
          a.territorialControl?.sectorsControlled || 0
        );
      const compB =
        b.compositeScore ||
        calculateAllianceCompositeScore(
          b.totalCombatPower,
          b.seasonEventProgress?.eventScore || 0,
          b.territorialControl?.sectorsControlled || 0
        );
      return compB - compA;
    });

    return list;
  }, [alliances, serverFilter, searchQuery, sortBy]);

  // Find player's rank in current sorted list
  const playerAllianceRankIndex = rankedAlliances.findIndex((a) => a.id === activeAllianceId);
  const playerAllianceRank = playerAllianceRankIndex !== -1 ? playerAllianceRankIndex + 1 : 1;

  // Jump to player alliance handler
  const handleJumpToMyAlliance = () => {
    soundFx.playRadioChirp();
    const el = document.getElementById(`alliance-card-${activeAllianceId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-4', 'ring-orange-500', 'bg-orange-950/30');
      setTimeout(() => {
        el.classList.remove('ring-4', 'ring-orange-500', 'bg-orange-950/30');
      }, 2500);
    }
  };

  // Sector tactical interaction: Fortify
  const handleFortifySector = (sector: TheaterSector) => {
    soundFx.playUpgradeSound();
    setTheaterSectors((prev) =>
      prev.map((s) => {
        if (s.id === sector.id) {
          return {
            ...s,
            garrisonRating: s.garrisonRating + 12500,
            defenseStatus: 'FORTIFIED',
          };
        }
        return s;
      })
    );
    setSelectedSector((prev) =>
      prev && prev.id === sector.id
        ? { ...prev, garrisonRating: prev.garrisonRating + 12500, defenseStatus: 'FORTIFIED' }
        : prev
    );
  };

  // Sector tactical interaction: Launch Sortie / Contest
  const handleContestSector = (sector: TheaterSector) => {
    soundFx.playMissileLaunch();
    // Simulate tactical outcome
    const winRoll = Math.random() > 0.35;
    setTimeout(() => {
      if (winRoll) {
        soundFx.playUpgradeSound();
        setTheaterSectors((prev) =>
          prev.map((s) => {
            if (s.id === sector.id) {
              return {
                ...s,
                controllingAllianceTag: currentAlliance.tag,
                controllingAllianceId: currentAlliance.id,
                garrisonRating: Math.floor(Math.random() * 20000) + 75000,
                defenseStatus: 'CONTESTED',
              };
            }
            return s;
          })
        );
        setSelectedSector((prev) =>
          prev && prev.id === sector.id
            ? {
                ...prev,
                controllingAllianceTag: currentAlliance.tag,
                controllingAllianceId: currentAlliance.id,
                defenseStatus: 'CONTESTED',
              }
            : prev
        );
      } else {
        soundFx.playRadioChirp();
      }
    }, 400);
  };

  // Podium alliances (Top 3)
  const topPodium = rankedAlliances.slice(0, 3);

  return (
    <div className="flex flex-col gap-4 text-slate-100 font-sans pb-16">
      {/* ========================================================================= */}
      {/* 1. MILITARY HEADER BANNER & ACTIVE THEATER TELEMETRY */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-zinc-950 via-[#121614] to-black border border-orange-500/30 p-4 sm:p-6 shadow-2xl">
        {/* Background Radar Grid Pattern */}
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#ea580c_1px,transparent_1px)] [background-size:16px_16px]" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-orange-600/30 text-orange-400 border border-orange-500/50 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                <Globe className="w-3 h-3" />
                <span>GLOBAL C4ISR MATRIX</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300 text-[10px] font-mono">
                SEASON 01: SANDSTORM PERIMETER
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                DEFCON 1 ACTIVE
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight uppercase text-white flex items-center gap-3">
              <span>ALLIANCE LEADERBOARD</span>
              <span className="text-orange-500 text-lg sm:text-xl font-mono font-normal">
                &bull; THEATER CONTROL
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-400 max-w-3xl mt-1">
              Top 100-member military battlegroups ranked by combined combat power, season event operations, and strategic territorial sectors held across the theater.
            </p>
          </div>

          {/* Quick Player Alliance Status Card */}
          <div className="bg-black/60 backdrop-blur-md border border-orange-500/40 rounded-xl p-3 sm:p-4 flex items-center justify-between gap-4 sm:gap-6 min-w-[280px]">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-600 to-amber-700 flex items-center justify-center text-xl shadow-lg border border-white/20 flex-shrink-0">
                {currentAlliance.emblemIcon}
              </div>
              <div>
                <div className="text-[10px] uppercase font-mono font-black text-orange-400 flex items-center gap-1">
                  <span>MY ALLIANCE</span>
                  <span className="text-slate-400">[{currentAlliance.tag}]</span>
                </div>
                <div className="text-sm font-black text-white truncate max-w-[140px]">
                  {currentAlliance.name}
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  Rank #{playerAllianceRank} &bull; {(currentAlliance.totalCombatPower / 1000).toFixed(0)}k CP
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <button
                onClick={handleJumpToMyAlliance}
                className="px-2.5 py-1 bg-white/10 hover:bg-white/15 text-white rounded text-[10px] font-mono font-bold uppercase transition-all flex items-center gap-1 cursor-pointer border border-white/10"
                title="Scroll down to highlight my alliance"
              >
                <Crosshair className="w-3 h-3 text-orange-400" />
                <span>LOCATE</span>
              </button>
              {onSwitchToAllianceCommand && (
                <button
                  onClick={() => {
                    soundFx.playRadioChirp();
                    onSwitchToAllianceCommand();
                  }}
                  className="px-2.5 py-1 bg-orange-600 hover:bg-orange-500 text-white rounded text-[10px] font-mono font-bold uppercase transition-all flex items-center gap-1 cursor-pointer shadow-md shadow-orange-950/40"
                  title="Switch to High Command roster, tasks & events"
                >
                  <Users className="w-3 h-3" />
                  <span>HQ VIEW</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Global Theater Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-3 border-t border-white/10 text-xs font-mono">
          <div className="bg-white/5 rounded-lg px-3 py-2 border border-white/5">
            <span className="text-[10px] text-slate-400 block uppercase">DEPLOYED POWER</span>
            <span className="text-sm font-bold text-orange-400">
              {(alliances.reduce((acc, a) => acc + a.totalCombatPower, 0) / 1000000).toFixed(2)}M CP
            </span>
          </div>
          <div className="bg-white/5 rounded-lg px-3 py-2 border border-white/5">
            <span className="text-[10px] text-slate-400 block uppercase">STRATEGIC SECTORS</span>
            <span className="text-sm font-bold text-cyan-400">
              36 Sectors (34 Occupied)
            </span>
          </div>
          <div className="bg-white/5 rounded-lg px-3 py-2 border border-white/5">
            <span className="text-[10px] text-slate-400 block uppercase">EVENT DIVIDENDS</span>
            <span className="text-sm font-bold text-emerald-400">
              +4,850 Bonds / Day
            </span>
          </div>
          <div className="bg-white/5 rounded-lg px-3 py-2 border border-white/5">
            <span className="text-[10px] text-slate-400 block uppercase">RULING HEGEMON</span>
            <span className="text-sm font-bold text-amber-300 truncate block">
              [{rankedAlliances[0]?.tag}] {rankedAlliances[0]?.name.split(' ')[0]}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SUB-VIEW NAVIGATION TABS */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1 overflow-x-auto text-xs scrollbar-thin">
        <div className="flex items-center gap-1.5">
          {[
            { id: 'standings', label: 'GLOBAL STANDINGS', icon: Trophy },
            { id: 'theater_map', label: 'THEATER SECTOR MAP (36)', icon: Compass },
            { id: 'season_events', label: 'SEASON EVENT MILESTONES', icon: Target },
            { id: 'compare', label: 'HEAD-TO-HEAD MATRIX', icon: BarChart2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  soundFx.playRadioChirp();
                  setActiveTab(tab.id as LeaderboardTab);
                }}
                className={`px-4 py-2 rounded-t-xl font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all border-t border-x cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-white/10 text-orange-400 border-orange-500/50 shadow-md'
                    : 'bg-black/30 text-slate-400 border-transparent hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Weekly Dividend Countdown */}
        <div className="hidden md:flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg font-mono text-[11px] text-slate-400">
          <Sparkles className="w-3 h-3 text-yellow-400" />
          <span>Weekly Territorial Dividend: <strong className="text-white">2d 14h 22m</strong></span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: GLOBAL STANDINGS (THE LEADERBOARD) */}
      {/* ========================================================================= */}
      {activeTab === 'standings' && (
        <div className="flex flex-col gap-4">
          {/* Controls Bar: Sort Mode, Server Filter, Search */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Sort Criteria Selector */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-mono uppercase font-black text-slate-400 mr-1 flex items-center gap-1">
                <SlidersHorizontal className="w-3 h-3 text-orange-400" />
                <span>RANK BY:</span>
              </span>
              {[
                { id: 'composite', label: '🏆 COMPOSITE DOMINANCE', tooltip: 'Weighted: 40% Power + 35% Season Event + 25% Territory' },
                { id: 'power', label: '⚔️ COMBAT POWER', tooltip: 'Sum of 100 officers firepower' },
                { id: 'event', label: '🎯 SEASON EVENT PROGRESS', tooltip: 'Operation score & milestones' },
                { id: 'territory', label: '🗺️ TERRITORIAL CONTROL', tooltip: 'Strategic sectors & theater %' },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    soundFx.playRadioChirp();
                    setSortBy(s.id as SortCriteria);
                  }}
                  title={s.tooltip}
                  className={`px-3 py-1.5 rounded-lg font-mono text-[11px] font-bold uppercase transition-all border cursor-pointer ${
                    sortBy === s.id
                      ? 'bg-orange-600 text-white border-orange-400 shadow-md shadow-orange-950/40'
                      : 'bg-black/40 text-slate-300 border-white/5 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Server Filter & Search */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-48">
                <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <select
                  value={serverFilter}
                  onChange={(e) => {
                    setServerFilter(e.target.value);
                    soundFx.playRadioChirp();
                  }}
                  aria-label="Filter alliances by server"
                  className="w-full bg-black/60 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-orange-500 font-mono"
                >
                  <option value="ALL">All Servers ({servers.length})</option>
                  {servers.map((srv) => (
                    <option key={srv.id} value={srv.id}>
                      {srv.flag} {srv.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative flex-1 md:w-56">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search tag, name, admiral..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* TOP 3 PODIUM DISPLAY */}
          {/* ========================================================================= */}
          {topPodium.length >= 3 && serverFilter === 'ALL' && !searchQuery && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              {/* RANK 2 - SILVER */}
              <div className="order-2 md:order-1 bg-gradient-to-b from-slate-900/90 to-black border border-slate-400/40 rounded-2xl p-4 shadow-xl flex flex-col justify-between relative overflow-hidden">
                <div className="absolute -right-6 -bottom-6 opacity-5 pointer-events-none text-9xl font-black font-mono">
                  #2
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-500/20 text-slate-300 border border-slate-400/50 text-[10px] font-mono font-black flex items-center gap-1">
                      <span>🥈 RANK #2</span>
                      <span className="text-slate-400">SILVER LAUREL</span>
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      Level {topPodium[1].level}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-700 to-indigo-950 flex items-center justify-center text-2xl shadow-lg border border-white/20">
                      {topPodium[1].emblemIcon}
                    </div>
                    <div>
                      <div className="text-base font-black text-white flex items-center gap-1.5">
                        <span>{topPodium[1].name}</span>
                        <span className="text-xs font-mono text-cyan-400">[{topPodium[1].tag}]</span>
                      </div>
                      <div className="text-[11px] text-slate-400 italic truncate max-w-[200px]">
                        "{topPodium[1].motto}"
                      </div>
                    </div>
                  </div>

                  {/* 3 Core Metric Bars */}
                  <div className="space-y-1.5 text-xs font-mono bg-black/40 p-2.5 rounded-xl border border-white/5 my-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Combat Power:</span>
                      <span className="font-bold text-white">
                        {(topPodium[1].totalCombatPower / 1000).toLocaleString()}k CP
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Season Event:</span>
                      <span className="font-bold text-amber-400">
                        {topPodium[1].seasonEventProgress?.eventScore.toLocaleString()} pts (Tier {topPodium[1].seasonEventProgress?.tier}/5)
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Territory Control:</span>
                      <span className="font-bold text-cyan-400">
                        {topPodium[1].territorialControl?.sectorsControlled} Sectors ({topPodium[1].territorialControl?.controlPercentage}%)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
                  <div className="text-[10px] text-slate-400 font-mono">
                    Admiral: <strong className="text-slate-200">{topPodium[1].members[0]?.callsign}</strong>
                  </div>
                  <button
                    onClick={() => {
                      soundFx.playRadioChirp();
                      setInspectedAlliance(topPodium[1]);
                    }}
                    className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-[10px] font-mono font-bold uppercase transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span>INSPECT</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* RANK 1 - GOLD SUPREME */}
              <div className="order-1 md:order-2 bg-gradient-to-b from-amber-950/40 via-zinc-900 to-black border-2 border-amber-500/80 rounded-2xl p-4 shadow-[0_0_25px_rgba(245,158,11,0.25)] flex flex-col justify-between relative overflow-hidden md:-translate-y-2">
                <div className="absolute top-0 right-0 bg-amber-500 text-black font-black text-[9px] font-mono uppercase px-3 py-0.5 rounded-bl-lg tracking-widest flex items-center gap-1 shadow-md">
                  <Crown className="w-3 h-3 fill-black" />
                  <span>SUPREME HEGEMON</span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/50 text-[10px] font-mono font-black flex items-center gap-1">
                      <span>👑 RANK #1</span>
                      <span className="text-amber-400">GOLD LAUREL</span>
                    </span>
                    <span className="text-xs font-mono text-amber-400 font-bold">
                      Level {topPodium[0].level}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-600 to-amber-700 flex items-center justify-center text-3xl shadow-xl border-2 border-amber-400/50">
                      {topPodium[0].emblemIcon}
                    </div>
                    <div>
                      <div className="text-lg font-black text-white flex items-center gap-1.5">
                        <span>{topPodium[0].name}</span>
                        <span className="text-xs font-mono text-orange-400">[{topPodium[0].tag}]</span>
                      </div>
                      <div className="text-[11px] text-slate-300 italic truncate max-w-[200px]">
                        "{topPodium[0].motto}"
                      </div>
                    </div>
                  </div>

                  {/* 3 Core Metric Bars */}
                  <div className="space-y-1.5 text-xs font-mono bg-black/60 p-3 rounded-xl border border-amber-500/30 my-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Total Combat Power:</span>
                      <span className="font-black text-white text-sm">
                        {(topPodium[0].totalCombatPower / 1000).toLocaleString()}k CP
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Season Event Progress:</span>
                      <span className="font-bold text-amber-300">
                        {topPodium[0].seasonEventProgress?.eventScore.toLocaleString()} pts (Tier {topPodium[0].seasonEventProgress?.tier}/5)
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Territorial Dominance:</span>
                      <span className="font-bold text-emerald-400">
                        {topPodium[0].territorialControl?.sectorsControlled} Sectors ({topPodium[0].territorialControl?.controlPercentage}%)
                      </span>
                    </div>
                    <div className="pt-1.5 border-t border-white/10 flex justify-between items-center text-[11px]">
                      <span className="text-slate-400">Hourly War Dividend:</span>
                      <span className="text-yellow-400 font-bold">
                        +{topPodium[0].territorialControl?.hourlyYield.warBonds} Bonds &bull; +{topPodium[0].territorialControl?.hourlyYield.fuel} Fuel
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
                  <div className="text-[10px] text-slate-400 font-mono">
                    Supreme Admiral: <strong className="text-amber-300">{topPodium[0].members[0]?.callsign}</strong>
                  </div>
                  <button
                    onClick={() => {
                      soundFx.playRadioChirp();
                      setInspectedAlliance(topPodium[0]);
                    }}
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-black font-black rounded text-[10px] font-mono uppercase transition-all flex items-center gap-1 cursor-pointer shadow-md"
                  >
                    <span>INSPECT #1</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* RANK 3 - BRONZE */}
              <div className="order-3 bg-gradient-to-b from-amber-950/20 to-black border border-amber-700/40 rounded-2xl p-4 shadow-xl flex flex-col justify-between relative overflow-hidden">
                <div className="absolute -right-6 -bottom-6 opacity-5 pointer-events-none text-9xl font-black font-mono">
                  #3
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-800/20 text-amber-400 border border-amber-700/50 text-[10px] font-mono font-black flex items-center gap-1">
                      <span>🥉 RANK #3</span>
                      <span className="text-amber-600">BRONZE LAUREL</span>
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      Level {topPodium[2].level}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-zinc-700 to-slate-900 flex items-center justify-center text-2xl shadow-lg border border-white/20">
                      {topPodium[2].emblemIcon}
                    </div>
                    <div>
                      <div className="text-base font-black text-white flex items-center gap-1.5">
                        <span>{topPodium[2].name}</span>
                        <span className="text-xs font-mono text-zinc-400">[{topPodium[2].tag}]</span>
                      </div>
                      <div className="text-[11px] text-slate-400 italic truncate max-w-[200px]">
                        "{topPodium[2].motto}"
                      </div>
                    </div>
                  </div>

                  {/* 3 Core Metric Bars */}
                  <div className="space-y-1.5 text-xs font-mono bg-black/40 p-2.5 rounded-xl border border-white/5 my-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Combat Power:</span>
                      <span className="font-bold text-white">
                        {(topPodium[2].totalCombatPower / 1000).toLocaleString()}k CP
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Season Event:</span>
                      <span className="font-bold text-amber-400">
                        {topPodium[2].seasonEventProgress?.eventScore.toLocaleString()} pts (Tier {topPodium[2].seasonEventProgress?.tier}/5)
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Territory Control:</span>
                      <span className="font-bold text-cyan-400">
                        {topPodium[2].territorialControl?.sectorsControlled} Sectors ({topPodium[2].territorialControl?.controlPercentage}%)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
                  <div className="text-[10px] text-slate-400 font-mono">
                    Admiral: <strong className="text-slate-200">{topPodium[2].members[0]?.callsign}</strong>
                  </div>
                  <button
                    onClick={() => {
                      soundFx.playRadioChirp();
                      setInspectedAlliance(topPodium[2]);
                    }}
                    className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-[10px] font-mono font-bold uppercase transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span>INSPECT</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* COMPLETE ALLIANCE LEADERBOARD TABLE */}
          {/* ========================================================================= */}
          <div className="bg-[#0b0e0c]/90 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-3.5 bg-white/5 border-b border-white/10 flex items-center justify-between flex-wrap gap-2 text-xs font-mono">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-orange-400" />
                <span className="font-bold text-white uppercase">
                  MASTER BATTLEGROUP MATRIX ({rankedAlliances.length} Alliances Active)
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                Sorted by: <strong className="text-orange-400 uppercase">{sortBy.toUpperCase()}</strong>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="bg-black/50 text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/10">
                    <th className="py-3 px-3 sm:px-4">Rank</th>
                    <th className="py-3 px-4">Alliance &amp; Server</th>
                    <th className="py-3 px-4 text-right">Combat Power (100)</th>
                    <th className="py-3 px-4 text-right">Season Progress</th>
                    <th className="py-3 px-4 text-right">Territorial Control</th>
                    <th className="py-3 px-4 text-right">Hourly Dividend</th>
                    <th className="py-3 px-4 text-center">Command Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {rankedAlliances.map((alliance, idx) => {
                    const rankNumber = idx + 1;
                    const isMyAlliance = alliance.id === activeAllianceId;
                    const serverObj = servers.find((s) => s.id === alliance.serverId);

                    return (
                      <tr
                        key={alliance.id}
                        id={`alliance-card-${alliance.id}`}
                        className={`transition-colors ${
                          isMyAlliance
                            ? 'bg-orange-600/10 border-l-4 border-orange-500'
                            : 'hover:bg-white/5'
                        }`}
                      >
                        {/* Rank Badge */}
                        <td className="py-3.5 px-3 sm:px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {rankNumber === 1 ? (
                              <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-400 text-amber-300 flex items-center justify-center font-black text-xs shadow-md">
                                🥇 1
                              </div>
                            ) : rankNumber === 2 ? (
                              <div className="w-7 h-7 rounded-lg bg-slate-400/20 border border-slate-300 text-slate-200 flex items-center justify-center font-black text-xs">
                                🥈 2
                              </div>
                            ) : rankNumber === 3 ? (
                              <div className="w-7 h-7 rounded-lg bg-amber-800/20 border border-amber-600 text-amber-400 flex items-center justify-center font-black text-xs">
                                🥉 3
                              </div>
                            ) : (
                              <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 text-slate-400 flex items-center justify-center font-black text-xs">
                                #{rankNumber}
                              </div>
                            )}

                            {isMyAlliance && (
                              <span className="hidden sm:inline-block px-1.5 py-0.5 bg-orange-600 text-white rounded text-[9px] font-black uppercase">
                                YOU
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Alliance Info & Server Flag */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-zinc-800 to-black border border-white/10 flex items-center justify-center text-lg flex-shrink-0 shadow">
                              {alliance.emblemIcon}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-white text-sm">
                                  {alliance.name}
                                </span>
                                <span className="text-xs font-mono text-orange-400 font-bold">
                                  [{alliance.tag}]
                                </span>
                                <span className="text-[10px] text-slate-400 bg-white/5 px-1.5 py-0.2 rounded border border-white/5">
                                  LVL {alliance.level}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                <span>{serverObj?.flag || '🌐'} {serverObj?.name || alliance.serverId}</span>
                                <span>&bull;</span>
                                <span className="text-slate-300 truncate max-w-[180px]">
                                  Adm. {alliance.members[0]?.callsign}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Total Combat Power */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="font-bold text-white text-sm">
                            {alliance.totalCombatPower.toLocaleString()} CP
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Avg: {Math.round(alliance.totalCombatPower / 100).toLocaleString()} CP/officer
                          </div>
                        </td>

                        {/* Season Event Progress */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="font-bold text-amber-300">
                            {alliance.seasonEventProgress?.eventScore.toLocaleString() || '0'} pts
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center justify-end gap-1">
                            <span className="text-orange-400 font-bold">
                              Tier {alliance.seasonEventProgress?.tier || 1}/5
                            </span>
                            <span>&bull;</span>
                            <span>{alliance.seasonEventProgress?.completedOperations || 0} Ops</span>
                          </div>
                        </td>

                        {/* Territorial Control */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="font-bold text-cyan-400">
                            {alliance.territorialControl?.sectorsControlled || 0} Sectors
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {alliance.territorialControl?.controlPercentage || 0}% Dominance
                            {alliance.territorialControl?.contestedCount ? (
                              <span className="text-red-400 font-bold ml-1">
                                ({alliance.territorialControl.contestedCount} Contested)
                              </span>
                            ) : null}
                          </div>
                        </td>

                        {/* Hourly Yield */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="text-yellow-400 font-bold">
                            +{alliance.territorialControl?.hourlyYield.warBonds || 0} Bonds/h
                          </div>
                          <div className="text-[10px] text-slate-400">
                            +{alliance.territorialControl?.hourlyYield.fuel || 0} Fuel &bull; +{alliance.territorialControl?.hourlyYield.munitions || 0} Ammo
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                soundFx.playRadioChirp();
                                setInspectedAlliance(alliance);
                              }}
                              className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-[10px] font-mono font-bold uppercase transition-all flex items-center gap-1 cursor-pointer border border-white/10"
                              title="Inspect 100-member command roster and territorial holdings"
                            >
                              <Info className="w-3 h-3 text-orange-400" />
                              <span>INSPECT</span>
                            </button>

                            {alliance.id !== activeAllianceId && (
                              <button
                                onClick={() => {
                                  soundFx.playRadioChirp();
                                  onSelectAlliance(alliance.id);
                                }}
                                className="px-2 py-1 bg-orange-600/30 hover:bg-orange-600 text-orange-300 hover:text-white rounded text-[10px] font-mono font-bold uppercase transition-all border border-orange-500/40 cursor-pointer"
                                title="Switch perspective to this alliance"
                              >
                                <span>SELECT</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: THEATER SECTOR MAP (INTERACTIVE 36-SECTOR GRID) */}
      {/* ========================================================================= */}
      {activeTab === 'theater_map' && (
        <div className="flex flex-col gap-4">
          {/* Theater Map Controls & Legend */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
            <div>
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-orange-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  SANDSTORM PERIMETER &bull; 36 STRATEGIC WAR SECTORS
                </h3>
              </div>
              <p className="text-slate-400 text-xs mt-0.5">
                Click any sector to view garrison combat rating, defending Colonels, resource yields, or initiate reinforcement/contest sorties.
              </p>
            </div>

            {/* Filter by Sector Type */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-slate-400 uppercase font-black">SECTOR TYPE:</span>
              {[
                { id: 'ALL', label: 'ALL (36)' },
                { id: 'refinery', label: '🛢️ REFINERIES' },
                { id: 'radar_array', label: '📡 RADAR ARRAYS' },
                { id: 'naval_port', label: '⚓ NAVAL PIERS' },
                { id: 'air_base', label: '✈️ AIR BASES' },
                { id: 'munitions_depot', label: '🚀 MUNITIONS' },
                { id: 'heavy_citadel', label: '🏰 CITADELS' },
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => {
                    soundFx.playRadioChirp();
                    setSectorFilterType(filter.id);
                  }}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all border ${
                    sectorFilterType === filter.id
                      ? 'bg-orange-600 text-white border-orange-400 shadow-md'
                      : 'bg-black/40 text-slate-300 border-white/5 hover:bg-white/10'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {/* 36-Sector Tactical Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {theaterSectors
              .filter((s) => sectorFilterType === 'ALL' || s.type === sectorFilterType)
              .map((sector) => {
                const isControlledByPlayer = sector.controllingAllianceTag === currentAlliance.tag;
                const isContested = sector.defenseStatus === 'CONTESTED';
                const isFortified = sector.defenseStatus === 'FORTIFIED';

                // Color accent based on controlling alliance
                let borderClass = 'border-white/10 bg-black/50';
                let tagColorClass = 'bg-white/10 text-slate-300';

                if (sector.controllingAllianceTag === 'AEGIS') {
                  borderClass = 'border-orange-500/50 bg-orange-950/20';
                  tagColorClass = 'bg-orange-600/30 text-orange-300 border border-orange-500/40';
                } else if (sector.controllingAllianceTag === 'POSDN') {
                  borderClass = 'border-blue-500/50 bg-blue-950/20';
                  tagColorClass = 'bg-blue-600/30 text-blue-300 border border-blue-500/40';
                } else if (sector.controllingAllianceTag === 'TITAN') {
                  borderClass = 'border-zinc-500/50 bg-zinc-900/40';
                  tagColorClass = 'bg-zinc-600/30 text-zinc-300 border border-zinc-500/40';
                } else if (sector.controllingAllianceTag === 'VLK') {
                  borderClass = 'border-cyan-500/50 bg-cyan-950/20';
                  tagColorClass = 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/40';
                } else if (sector.controllingAllianceTag === 'SHIELD') {
                  borderClass = 'border-emerald-500/50 bg-emerald-950/20';
                  tagColorClass = 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40';
                } else if (sector.controllingAllianceTag === 'VIPER') {
                  borderClass = 'border-yellow-500/50 bg-yellow-950/20';
                  tagColorClass = 'bg-yellow-600/30 text-yellow-300 border border-yellow-500/40';
                }

                return (
                  <div
                    key={sector.id}
                    onClick={() => {
                      soundFx.playRadioChirp();
                      setSelectedSector(sector);
                    }}
                    className={`relative rounded-xl p-3 border transition-all cursor-pointer hover:scale-[1.02] flex flex-col justify-between min-h-[140px] shadow-lg ${borderClass} ${
                      isContested ? 'ring-2 ring-red-500 animate-pulse' : ''
                    } ${isControlledByPlayer ? 'shadow-orange-900/20' : ''}`}
                  >
                    {/* Top status badges */}
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className="text-[10px] font-mono font-black text-slate-400">
                        {sector.id} &bull; {sector.gridCoord}
                      </span>
                      {isContested ? (
                        <span className="px-1.5 py-0.2 bg-red-600 text-white rounded text-[8px] font-black uppercase tracking-wider">
                          CONTESTED
                        </span>
                      ) : isFortified ? (
                        <span className="px-1.5 py-0.2 bg-emerald-600 text-white rounded text-[8px] font-black uppercase tracking-wider">
                          FORTIFIED
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 bg-white/10 text-slate-300 rounded text-[8px] font-mono">
                          SECURE
                        </span>
                      )}
                    </div>

                    {/* Sector Name and Type */}
                    <div>
                      <div className="text-xs font-black text-white leading-snug line-clamp-2">
                        {sector.name}
                      </div>
                      <div className="text-[10px] text-slate-400 uppercase mt-0.5 flex items-center gap-1 font-mono">
                        {sector.type === 'refinery' && '🛢️ Refinery'}
                        {sector.type === 'radar_array' && '📡 Radar Array'}
                        {sector.type === 'naval_port' && '⚓ Deepwater Pier'}
                        {sector.type === 'air_base' && '✈️ Air Base'}
                        {sector.type === 'munitions_depot' && '🚀 Munitions Depot'}
                        {sector.type === 'heavy_citadel' && '🏰 Heavy Citadel'}
                        {sector.type === 'forward_outpost' && '🎯 Forward Outpost'}
                      </div>
                    </div>

                    {/* Controlling Alliance Tag & Garrison */}
                    <div className="pt-2 mt-2 border-t border-white/5 flex items-center justify-between font-mono text-[10px]">
                      <span className={`px-1.5 py-0.5 rounded font-black ${tagColorClass}`}>
                        [{sector.controllingAllianceTag || 'NEUTRAL'}]
                      </span>
                      <span className="text-slate-300 font-bold">
                        {(sector.garrisonRating / 1000).toFixed(0)}k DEF
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SEASON EVENT MILESTONES (OPERATION PROGRESS & REWARDS) */}
      {/* ========================================================================= */}
      {activeTab === 'season_events' && (
        <div className="flex flex-col gap-4">
          <div className="bg-gradient-to-r from-amber-950/40 via-zinc-900 to-black border border-amber-500/40 rounded-2xl p-4 sm:p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-black uppercase tracking-widest flex items-center gap-1 w-fit mb-1">
                  <Target className="w-3 h-3" />
                  <span>CAMPAIGN OPERATION PROGRESSION</span>
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
                  OPERATION SANDSTORM APEX &bull; MILESTONE TIERS
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
                  Earn season event points across combat theater sorties, alliance task completion, and holding key territory sectors to unlock massive War Bonds and titanium blueprints for all 100 members.
                </p>
              </div>

              {/* Player Alliance Progress Overview */}
              <div className="bg-black/60 border border-white/10 rounded-xl p-3 sm:p-4 min-w-[240px] font-mono text-xs">
                <div className="text-[10px] text-slate-400 uppercase">My Alliance Event Points:</div>
                <div className="text-lg font-black text-amber-400">
                  {currentAlliance.seasonEventProgress?.eventScore.toLocaleString()} PTS
                </div>
                <div className="text-[11px] text-slate-300 mt-0.5">
                  Tier {currentAlliance.seasonEventProgress?.tier || 1} of 5 &bull; {currentAlliance.seasonEventProgress?.completedOperations} Operations Cleared
                </div>
              </div>
            </div>
          </div>

          {/* Milestone Tier Cards */}
          <div className="space-y-3">
            {SEASON_EVENT_MILESTONES.map((milestone) => {
              const currentScore = currentAlliance.seasonEventProgress?.eventScore || 0;
              const isUnlocked = currentScore >= milestone.pointsRequired;
              const progressPct = Math.min(100, Math.round((currentScore / milestone.pointsRequired) * 100));

              return (
                <div
                  key={milestone.tier}
                  className={`rounded-xl p-4 border transition-all ${
                    isUnlocked
                      ? 'bg-gradient-to-r from-amber-950/30 to-black border-amber-500/50 shadow-lg'
                      : 'bg-black/40 border-white/10'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl border ${
                        isUnlocked
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                          : 'bg-white/5 border-white/10 text-slate-500'
                      }`}>
                        {milestone.badgeIcon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-white uppercase">
                            {milestone.title}
                          </h4>
                          {isUnlocked ? (
                            <span className="px-2 py-0.2 rounded bg-emerald-600 text-white text-[9px] font-mono font-black uppercase">
                              UNLOCKED
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-slate-400">
                              {progressPct}% Completed
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-mono text-slate-400 mt-0.5">
                          Target: <strong className="text-amber-300">{milestone.pointsRequired.toLocaleString()} Points</strong>
                          <span className="mx-2">&bull;</span>
                          Title: <strong className="text-slate-200">"{milestone.rewards.exclusiveTitle}"</strong>
                        </div>
                      </div>
                    </div>

                    {/* Rewards Summary */}
                    <div className="flex items-center gap-2 font-mono text-xs flex-wrap bg-white/5 p-2 rounded-lg border border-white/5">
                      <span className="text-yellow-400 font-bold">+{milestone.rewards.warBonds} Bonds</span>
                      <span className="text-slate-500">&bull;</span>
                      <span className="text-cyan-400 font-bold">+{milestone.rewards.alloy.toLocaleString()} Alloy</span>
                      <span className="text-slate-500">&bull;</span>
                      <span className="text-red-400 font-bold">+{milestone.rewards.munitions.toLocaleString()} Munitions</span>
                      <span className="text-slate-500">&bull;</span>
                      <span className="text-blue-400 font-bold">+{milestone.rewards.fuel.toLocaleString()} Fuel</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-black/60 rounded-full h-2 mt-3 overflow-hidden border border-white/10">
                    <div
                      className={`h-full transition-all duration-500 ${
                        isUnlocked ? 'bg-amber-500' : 'bg-orange-600'
                      }`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: HEAD-TO-HEAD MATRIX (TELEMETRY COMPARISON) */}
      {/* ========================================================================= */}
      {activeTab === 'compare' && (
        <div className="flex flex-col gap-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 font-mono text-xs">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 mb-1">
              <BarChart2 className="w-4 h-4 text-orange-400" />
              <span>HEAD-TO-HEAD COMPARATIVE TELEMETRY MATRIX</span>
            </h3>
            <p className="text-slate-400">
              Benchmark your battlegroup against rival alliances across total combat rating, high command roster density, season points, and held sectors.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left: Player's Alliance */}
            <div className="bg-gradient-to-b from-orange-950/30 to-black border-2 border-orange-500/50 rounded-2xl p-4 sm:p-5 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="px-2 py-0.5 rounded bg-orange-600 text-white font-mono text-[10px] font-black uppercase">
                  YOUR BATTLEGROUP
                </span>
                <span className="text-xs font-mono text-orange-400 font-bold">
                  Rank #{playerAllianceRank}
                </span>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-600 to-amber-700 flex items-center justify-center text-3xl shadow-lg border border-white/20">
                  {currentAlliance.emblemIcon}
                </div>
                <div>
                  <h4 className="text-lg font-black text-white flex items-center gap-1.5">
                    <span>{currentAlliance.name}</span>
                    <span className="text-sm font-mono text-orange-400">[{currentAlliance.tag}]</span>
                  </h4>
                  <div className="text-xs text-slate-400 italic">
                    "{currentAlliance.motto}"
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-xs font-mono bg-black/60 p-3 rounded-xl border border-white/10">
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-slate-400">Total Combat Power:</span>
                  <strong className="text-white font-black">{currentAlliance.totalCombatPower.toLocaleString()} CP</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-slate-400">Officers Roster:</span>
                  <strong className="text-slate-200">100 / 100 (10 Colonels active)</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-slate-400">Season Event Score:</span>
                  <strong className="text-amber-300">{currentAlliance.seasonEventProgress?.eventScore.toLocaleString()} pts</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-slate-400">Territory Sectors Held:</span>
                  <strong className="text-cyan-400">{currentAlliance.territorialControl?.sectorsControlled} Sectors ({currentAlliance.territorialControl?.controlPercentage}%)</strong>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Hourly War Bond Yield:</span>
                  <strong className="text-yellow-400">+{currentAlliance.territorialControl?.hourlyYield.warBonds} Bonds/h</strong>
                </div>
              </div>
            </div>

            {/* Right: Selected Rival or Top Alliance */}
            <div className="bg-gradient-to-b from-slate-900 to-black border border-white/15 rounded-2xl p-4 sm:p-5 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="px-2 py-0.5 rounded bg-slate-700 text-white font-mono text-[10px] font-black uppercase">
                  RIVAL BENCHMARK
                </span>
                <span className="text-xs font-mono text-slate-400">
                  {rankedAlliances[0]?.id === activeAllianceId ? 'Rank #2 Contender' : 'Rank #1 Ruling Battlegroup'}
                </span>
              </div>

              {(() => {
                const rival = rankedAlliances[0]?.id === activeAllianceId ? rankedAlliances[1] : rankedAlliances[0];
                if (!rival) return null;

                const powerDiff = currentAlliance.totalCombatPower - rival.totalCombatPower;
                const scoreDiff = (currentAlliance.seasonEventProgress?.eventScore || 0) - (rival.seasonEventProgress?.eventScore || 0);
                const sectorDiff = (currentAlliance.territorialControl?.sectorsControlled || 0) - (rival.territorialControl?.sectorsControlled || 0);

                return (
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-700 to-indigo-950 flex items-center justify-center text-3xl shadow-lg border border-white/20">
                        {rival.emblemIcon}
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-white flex items-center gap-1.5">
                          <span>{rival.name}</span>
                          <span className="text-sm font-mono text-cyan-400">[{rival.tag}]</span>
                        </h4>
                        <div className="text-xs text-slate-400 italic">
                          "{rival.motto}"
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs font-mono bg-black/60 p-3 rounded-xl border border-white/10">
                      <div className="flex justify-between py-1 border-b border-white/5">
                        <span className="text-slate-400">Total Combat Power:</span>
                        <div className="text-right">
                          <strong className="text-white font-black">{rival.totalCombatPower.toLocaleString()} CP</strong>
                          <span className={`block text-[10px] ${powerDiff >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {powerDiff >= 0 ? `+${powerDiff.toLocaleString()}` : `${powerDiff.toLocaleString()}`}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between py-1 border-b border-white/5">
                        <span className="text-slate-400">Officers Roster:</span>
                        <strong className="text-slate-200">100 / 100 (10 Colonels active)</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-white/5">
                        <span className="text-slate-400">Season Event Score:</span>
                        <div className="text-right">
                          <strong className="text-amber-300">{rival.seasonEventProgress?.eventScore.toLocaleString()} pts</strong>
                          <span className={`block text-[10px] ${scoreDiff >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {scoreDiff >= 0 ? `+${scoreDiff.toLocaleString()}` : `${scoreDiff.toLocaleString()}`}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between py-1 border-b border-white/5">
                        <span className="text-slate-400">Territory Sectors Held:</span>
                        <div className="text-right">
                          <strong className="text-cyan-400">{rival.territorialControl?.sectorsControlled} Sectors ({rival.territorialControl?.controlPercentage}%)</strong>
                          <span className={`block text-[10px] ${sectorDiff >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {sectorDiff >= 0 ? `+${sectorDiff} Sectors` : `${sectorDiff} Sectors`}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400">Hourly War Bond Yield:</span>
                        <strong className="text-yellow-400">+{rival.territorialControl?.hourlyYield.warBonds} Bonds/h</strong>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MODAL: SECTOR RECONNAISSANCE & CONTROL DRAWER */}
      {/* ========================================================================= */}
      {selectedSector && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 z-50 animate-fadeIn">
          <div className="bg-[#0b0e0c] border border-orange-500/50 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl font-mono text-xs">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-zinc-900 to-black p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-600/30 border border-orange-500/50 flex items-center justify-center text-orange-400">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-orange-400 font-bold uppercase">
                    SECTOR INTEL &bull; {selectedSector.id} ({selectedSector.gridCoord})
                  </span>
                  <h3 className="text-sm font-black text-white uppercase">
                    {selectedSector.name}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedSector(null)}
                aria-label="Close sector details modal"
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-3">
              <p className="text-slate-300 text-xs">
                {selectedSector.description}
              </p>

              {/* Status Grid */}
              <div className="grid grid-cols-2 gap-2 bg-black/50 p-3 rounded-xl border border-white/5">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Controlling Alliance:</span>
                  <span className="font-bold text-orange-400 text-xs">
                    [{selectedSector.controllingAllianceTag || 'NEUTRAL / CONTESTED'}]
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Defense Status:</span>
                  <span className={`font-bold text-xs ${
                    selectedSector.defenseStatus === 'FORTIFIED' ? 'text-emerald-400' :
                    selectedSector.defenseStatus === 'CONTESTED' ? 'text-red-400 animate-pulse' : 'text-slate-200'
                  }`}>
                    {selectedSector.defenseStatus}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Garrison Combat Rating:</span>
                  <span className="font-bold text-white text-xs">
                    {selectedSector.garrisonRating.toLocaleString()} DEF Rating
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Assigned Staff Colonel:</span>
                  <span className="font-bold text-slate-300 text-xs truncate block">
                    {selectedSector.assignedColonelCallsign || 'General Garrison HQ'}
                  </span>
                </div>
              </div>

              {/* Strategic Buff & Yield */}
              <div className="bg-emerald-950/20 border border-emerald-500/30 p-3 rounded-xl">
                <span className="text-[10px] font-bold text-emerald-400 uppercase block mb-1">
                  TACTICAL ALLIANCE BUFF:
                </span>
                <div className="text-xs font-bold text-emerald-300">
                  {selectedSector.buffYield}
                </div>
                <div className="text-[11px] text-slate-300 mt-1 flex items-center gap-2">
                  <span>Hourly Yield:</span>
                  <span className="text-yellow-400 font-bold">+{selectedSector.hourlyYield.warBonds} Bonds</span>
                  <span className="text-blue-400 font-bold">+{selectedSector.hourlyYield.fuel} Fuel</span>
                  <span className="text-red-400 font-bold">+{selectedSector.hourlyYield.munitions} Ammo</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-black/60 border-t border-white/10 flex items-center justify-between gap-2">
              <button
                onClick={() => setSelectedSector(null)}
                className="px-3 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer"
              >
                DISMISS
              </button>

              {selectedSector.controllingAllianceTag === currentAlliance.tag ? (
                <button
                  onClick={() => handleFortifySector(selectedSector)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black uppercase transition-all flex items-center gap-1.5 shadow-md shadow-emerald-950/40 cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>FORTIFY GARRISON (+12.5k DEF)</span>
                </button>
              ) : (
                <button
                  onClick={() => handleContestSector(selectedSector)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-black uppercase transition-all flex items-center gap-1.5 shadow-md shadow-red-950/40 cursor-pointer"
                >
                  <Swords className="w-3.5 h-3.5" />
                  <span>LAUNCH SORTIE TO CONTEST SECTOR</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL: ALLIANCE DEEP INSPECTOR & HIGH COMMAND OVERVIEW */}
      {/* ========================================================================= */}
      {inspectedAlliance && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 z-50 animate-fadeIn">
          <div className="bg-[#0c0f0d] border border-orange-500/40 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl font-mono text-xs">
            {/* Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-zinc-900 via-black to-[#131614] border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-600 to-amber-700 flex items-center justify-center text-2xl shadow-lg border border-white/20">
                  {inspectedAlliance.emblemIcon}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-black text-white uppercase">
                      {inspectedAlliance.name}
                    </h3>
                    <span className="text-xs font-mono text-orange-400 font-bold">
                      [{inspectedAlliance.tag}]
                    </span>
                    <span className="text-[10px] text-slate-300 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                      LEVEL {inspectedAlliance.level}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 italic mt-0.5">
                    "{inspectedAlliance.motto}"
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setInspectedAlliance(null);
                  setDiplomaticMessageSent(null);
                }}
                aria-label="Close alliance inspector modal"
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Scrollable Area */}
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
              {/* Telemetry Summary Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-black/50 p-3 rounded-xl border border-white/5">
                  <span className="text-[10px] text-slate-400 block uppercase">Total Combat Power</span>
                  <span className="font-black text-white text-sm">
                    {inspectedAlliance.totalCombatPower.toLocaleString()} CP
                  </span>
                </div>
                <div className="bg-black/50 p-3 rounded-xl border border-white/5">
                  <span className="text-[10px] text-slate-400 block uppercase">Roster Capacity</span>
                  <span className="font-bold text-slate-200 text-sm">
                    100 / 100 Officers
                  </span>
                </div>
                <div className="bg-black/50 p-3 rounded-xl border border-white/5">
                  <span className="text-[10px] text-slate-400 block uppercase">Season Event Score</span>
                  <span className="font-bold text-amber-300 text-sm">
                    {inspectedAlliance.seasonEventProgress?.eventScore.toLocaleString()} pts
                  </span>
                </div>
                <div className="bg-black/50 p-3 rounded-xl border border-white/5">
                  <span className="text-[10px] text-slate-400 block uppercase">Territory Held</span>
                  <span className="font-bold text-cyan-400 text-sm">
                    {inspectedAlliance.territorialControl?.sectorsControlled || 0} Sectors ({inspectedAlliance.territorialControl?.controlPercentage || 0}%)
                  </span>
                </div>
              </div>

              {/* High Command: Admiral & 10 Colonels */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                    <span>HIGH COMMAND MATRIX (1 ADMIRAL + 10 COLONELS)</span>
                  </h4>
                  <span className="text-[10px] text-slate-400">Strict Command Ceiling: 10 Colonels Max</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {inspectedAlliance.members
                    .filter((m) => m.rank === 'Admiral' || m.rank === 'Colonel')
                    .map((officer) => (
                      <div
                        key={officer.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                          officer.rank === 'Admiral'
                            ? 'bg-amber-950/30 border-amber-500/50'
                            : 'bg-black/40 border-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                            officer.rank === 'Admiral'
                              ? 'bg-amber-500 text-black font-black'
                              : 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
                          }`}>
                            {officer.rank === 'Admiral' ? 'ADM' : 'COL'}
                          </div>
                          <div className="truncate">
                            <div className="font-bold text-white text-xs truncate flex items-center gap-1">
                              <span>{officer.callsign}</span>
                              <span className="text-[10px] text-slate-400">({officer.country})</span>
                            </div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[160px]">
                              {officer.assignedRole}
                            </div>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0 ml-2">
                          <div className="font-bold text-orange-400 text-[11px]">
                            {officer.combatPower.toLocaleString()} CP
                          </div>
                          <div className="text-[9px] text-emerald-400">
                            {officer.onlineStatus}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Controlled Sectors List */}
              {inspectedAlliance.territorialControl && inspectedAlliance.territorialControl.sectors.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-cyan-400" />
                    <span>HELD SECTORS ({inspectedAlliance.territorialControl.sectors.length})</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {inspectedAlliance.territorialControl.sectors.map((sector) => (
                      <div
                        key={sector.sectorId}
                        className="bg-black/40 border border-white/10 p-2.5 rounded-xl text-xs flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-white">{sector.name}</div>
                          <div className="text-[10px] text-emerald-400">{sector.buffYield}</div>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300">
                          {sector.defenseStatus}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Diplomatic Actions */}
              <div className="bg-white/5 border border-white/10 p-3 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-slate-300 uppercase flex items-center gap-1">
                    <Radio className="w-3 h-3 text-orange-400" />
                    <span>SECURE DIPLOMATIC COMMS FREQUENCY</span>
                  </span>
                  {diplomaticMessageSent && (
                    <span className="text-[10px] text-emerald-400 font-bold">
                      {diplomaticMessageSent}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      soundFx.playRadioChirp();
                      setDiplomaticMessageSent(`Non-Aggression Pact offered to Admiral ${inspectedAlliance.members[0]?.callsign}!`);
                    }}
                    className="flex-1 py-1.5 bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white rounded-lg text-[10px] font-bold uppercase transition-all border border-blue-500/40 cursor-pointer"
                  >
                    PROPOSE NON-AGGRESSION PACT
                  </button>
                  <button
                    onClick={() => {
                      soundFx.playMissileLaunch();
                      setDiplomaticMessageSent(`Formal declaration of strategic hostility dispatched!`);
                    }}
                    className="flex-1 py-1.5 bg-red-600/30 hover:bg-red-600 text-red-300 hover:text-white rounded-lg text-[10px] font-bold uppercase transition-all border border-red-500/40 cursor-pointer"
                  >
                    DECLARE THEATER WAR
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-black/80 border-t border-white/10 flex items-center justify-between">
              <button
                onClick={() => {
                  setInspectedAlliance(null);
                  setDiplomaticMessageSent(null);
                }}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer"
              >
                CLOSE INSPECTOR
              </button>

              {inspectedAlliance.id !== activeAllianceId && (
                <button
                  onClick={() => {
                    soundFx.playRadioChirp();
                    onSelectAlliance(inspectedAlliance.id);
                    setInspectedAlliance(null);
                  }}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-black uppercase transition-all shadow-md shadow-orange-950/40 cursor-pointer"
                >
                  SWITCH TO THIS ALLIANCE
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
