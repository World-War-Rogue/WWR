import React, { useState } from 'react';
import {
  Shield,
  Crosshair,
  Volume2,
  VolumeX,
  Radio,
  Server,
  Compass,
  Zap,
  ShoppingBag,
  FileText,
  Smartphone,
  Monitor,
  Gamepad2,
  Activity,
  AlertTriangle,
  Users,
  Trophy,
  FolderArchive,
  Terminal,
} from 'lucide-react';
import { PlayerProfile, SeasonTheater, ServerInfo, SeasonId, ActiveAppView } from '../types';
import { soundFx } from '../utils/audio';

interface TacticalHUDProps {
  profile: PlayerProfile;
  activeSeason: SeasonTheater;
  seasons: SeasonTheater[];
  onSelectSeason: (id: SeasonId) => void;
  activeServer: ServerInfo;
  servers: ServerInfo[];
  onSelectServer: (id: string) => void;
  activeView: ActiveAppView;
  onSelectView: (view: ActiveAppView) => void;
  onOpenArmory: () => void;
  onOpenDocs: () => void;
  onOpenServerBrowser?: () => void;
  onOpenDevOps?: () => void;
  activeDevCallsign?: string;
  activeAllianceTag?: string;
}

export const TacticalHUD: React.FC<TacticalHUDProps> = ({
  profile,
  activeSeason,
  seasons,
  onSelectSeason,
  activeServer,
  servers,
  onSelectServer,
  activeView,
  onSelectView,
  onOpenArmory,
  onOpenDocs,
  onOpenServerBrowser,
  onOpenDevOps,
  activeDevCallsign,
  activeAllianceTag = 'AEGIS',
}) => {
  const [audioMuted, setAudioMuted] = useState(!soundFx.enabled);
  const [controlMode, setControlMode] = useState<'pc' | 'mobile' | 'console'>('pc');
  const [showServerSelect, setShowServerSelect] = useState(false);
  const [showSeasonSelect, setShowSeasonSelect] = useState(false);

  const toggleAudio = () => {
    soundFx.enabled = !soundFx.enabled;
    setAudioMuted(!soundFx.enabled);
    if (soundFx.enabled) {
      soundFx.playRadioChirp();
    }
  };

  return (
    <header className="bg-black/40 backdrop-blur-xl border-b border-white/10 text-[#d1d5db] select-none sticky top-0 z-40 shadow-2xl">
      {/* Topmost Military Classification Banner */}
      <div className="bg-white/5 backdrop-blur-md px-3 sm:px-6 py-1.5 text-xs border-b border-white/10 flex flex-wrap items-center justify-between gap-2 font-mono">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-orange-500 font-bold tracking-widest text-[10px] uppercase">
              DEFCON 2 // FROSTED C4ISR
            </span>
          </div>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <div className="flex items-center gap-2 bg-white/5 px-2 py-0.5 rounded border border-white/10 text-[11px]">
            <span className="text-slate-400 uppercase text-[10px] font-bold">Commander:</span>
            <span className="font-bold text-white tracking-wider">{profile.callsign}</span>
            <span className="text-orange-400 font-black">[{profile.rank}]</span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Cross-Platform Indicator */}
          <div className="flex items-center bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-lg border border-white/10 gap-1 text-[11px]">
            <span className="text-slate-400 text-[10px] uppercase tracking-wider font-bold">MODE:</span>
            <button
              onClick={() => {
                setControlMode('pc');
                soundFx.playRadioChirp();
              }}
              className={`px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors ${
                controlMode === 'pc'
                  ? 'bg-orange-600 text-white font-bold shadow-md shadow-orange-950/40'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="PC Keyboard Shortcuts (1-5 Squads, Q/W/E/R Air Support, Spacebar Pause)"
            >
              <Monitor className="w-3 h-3" />
              <span className="hidden lg:inline text-[10px]">PC</span>
            </button>
            <button
              onClick={() => {
                setControlMode('mobile');
                soundFx.playRadioChirp();
              }}
              className={`px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors ${
                controlMode === 'mobile'
                  ? 'bg-orange-600 text-white font-bold shadow-md shadow-orange-950/40'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Mobile High-Touch Layout"
            >
              <Smartphone className="w-3 h-3" />
              <span className="hidden lg:inline text-[10px]">MOBILE</span>
            </button>
            <button
              onClick={() => {
                setControlMode('console');
                soundFx.playRadioChirp();
              }}
              className={`px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors ${
                controlMode === 'console'
                  ? 'bg-orange-600 text-white font-bold shadow-md shadow-orange-950/40'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Console Controller Layout"
            >
              <Gamepad2 className="w-3 h-3" />
              <span className="hidden lg:inline text-[10px]">CONSOLE</span>
            </button>
          </div>

          {/* Sound Synthesizer Toggle */}
          <button
            onClick={toggleAudio}
            className={`px-2.5 py-0.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors border ${
              audioMuted
                ? 'bg-white/5 text-slate-400 border-white/10'
                : 'bg-orange-600/20 text-orange-300 border-orange-500/40'
            }`}
            title="Toggle Web Audio Tactical Sound Synthesizer"
          >
            {audioMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline font-mono text-[10px] font-bold">
              {audioMuted ? 'MUTE' : 'AUDIO'}
            </span>
          </button>

          {/* Classified Game Archive & Intelligence Folder (/docs/) */}
          <button
            onClick={() => {
              soundFx.playRadioChirp();
              onOpenDocs();
            }}
            className="px-2.5 py-0.5 rounded-lg text-xs bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-600/60 flex items-center gap-1.5 font-mono transition-all shadow-sm cursor-pointer"
            title="Open Classified Game Archive & Intelligence Folder (/docs/)"
          >
            <FolderArchive className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline text-[10px] font-black uppercase tracking-wider">GAME FOLDER</span>
          </button>

          {/* Hidden Multi-Developer Ops & Lockout Command Suite */}
          {onOpenDevOps && (
            <button
              onClick={() => {
                soundFx.playRadioChirp();
                onOpenDevOps();
              }}
              className="px-2.5 py-0.5 rounded-lg text-xs bg-orange-950/70 hover:bg-orange-900 text-orange-300 border border-orange-500/70 flex items-center gap-1.5 font-mono transition-all shadow-sm cursor-pointer"
              title="Open Multi-Developer Studio, Area Locks & Live Calibration (Hotkey: Ctrl+Shift+D or ~)"
            >
              <Terminal className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-[10px] font-black uppercase tracking-wider">DEV OPS</span>
              {activeDevCallsign && (
                <span className="hidden md:inline text-[9px] bg-black/60 px-1 py-0.2 rounded text-orange-200">
                  {activeDevCallsign.split(' ')[0]}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Main Command Bar: Title, Dynamic Resources & Upgrades */}
      <div className="px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 bg-black/40 backdrop-blur-xl">
        {/* Title and Active Theater with Rotated Orange Diamond Emblem */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 bg-orange-600 flex items-center justify-center rounded-sm rotate-45 border border-white/20 shadow-[0_0_15px_rgba(234,88,12,0.4)] flex-shrink-0">
              <span className="-rotate-45 font-black text-white italic text-sm">WR</span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tighter text-white uppercase italic leading-none">
                  World War Rogue
                </h1>
                <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-orange-400 font-black tracking-widest hidden sm:inline">
                  MIL-SPEC
                </span>
              </div>

              {/* Season Selector */}
              <div className="relative mt-0.5">
                <button
                  onClick={() => setShowSeasonSelect(!showSeasonSelect)}
                  className="text-xs font-mono flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors"
                >
                  <span className="text-[10px] uppercase tracking-widest font-black text-orange-500">
                    S0{activeSeason.seasonNumber}: {activeSeason.name}
                  </span>
                  <span className="text-[10px] text-slate-400">({activeSeason.codeName})</span>
                  <span className="text-[9px] text-orange-500">▼</span>
                </button>

                {showSeasonSelect && (
                  <div className="absolute left-0 top-full mt-2 w-72 bg-[#0a0c0b]/95 backdrop-blur-2xl border border-white/15 rounded-xl p-2.5 shadow-2xl z-50 font-mono text-xs">
                    <div className="text-[10px] uppercase tracking-[0.2em] font-black text-orange-500 mb-2 px-1">
                      Select Campaign Theater:
                    </div>
                    {seasons.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          onSelectSeason(s.id);
                          setShowSeasonSelect(false);
                          soundFx.playRadioChirp();
                        }}
                        className={`w-full text-left p-2.5 rounded-lg mb-1 transition-all flex flex-col border ${
                          s.id === activeSeason.id
                            ? 'bg-white/10 border-orange-500/50 text-white shadow-md'
                            : 'bg-white/5 border-transparent hover:border-white/10 hover:bg-white/10 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold text-orange-400">
                          <span>{s.name}</span>
                          <span className="text-[10px] uppercase bg-black/50 px-1.5 py-0.5 rounded border border-white/10">
                            S{s.seasonNumber}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-300 truncate mt-0.5">{s.theaterLocation}</div>
                        <div className="text-[10px] text-emerald-400 mt-0.5">{s.buffDescription}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Resource Counters in Frosted Glass Container */}
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap bg-white/5 backdrop-blur-md border border-white/10 rounded-xl px-3 sm:px-4 py-2 font-mono text-xs shadow-xl">
          <div className="flex items-center gap-2" title="Fuel: Powers armored vehicles, generators, and air support">
            <div className="w-2.5 h-2.5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
            <div>
              <span className="text-[9px] block text-slate-400 font-bold uppercase leading-none">FUEL</span>
              <span className="font-bold text-white text-xs">{profile.resources.fuel.toLocaleString()}</span>
            </div>
          </div>

          <div className="w-px h-6 bg-white/10" />

          <div className="flex items-center gap-2" title="Rations: Morale and tactical stamina">
            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
            <div>
              <span className="text-[9px] block text-slate-400 font-bold uppercase leading-none">RATIONS</span>
              <span className="font-bold text-white text-xs">{profile.resources.rations.toLocaleString()}</span>
            </div>
          </div>

          <div className="w-px h-6 bg-white/10" />

          <div className="flex items-center gap-2" title="Munitions: Expended in ballistic combat and howitzer barrages">
            <div className="w-2.5 h-2.5 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
            <div>
              <span className="text-[9px] block text-slate-400 font-bold uppercase leading-none">AMMO</span>
              <span className="font-bold text-white text-xs">{profile.resources.munitions.toLocaleString()}</span>
            </div>
          </div>

          <div className="w-px h-6 bg-white/10" />

          <div className="flex items-center gap-2" title="Titanium Alloy: Upgrades armor plating and FOB buildings">
            <div className="w-2.5 h-2.5 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
            <div>
              <span className="text-[9px] block text-slate-400 font-bold uppercase leading-none">ALLOY</span>
              <span className="font-bold text-white text-xs">{profile.resources.alloy.toLocaleString()}</span>
            </div>
          </div>

          <div className="w-px h-6 bg-white/10" />

          <div className="flex items-center gap-2" title="War Bonds: Earned via tactical merit and fair armory">
            <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full shadow-[0_0_8px_rgba(250,204,21,0.6)]" />
            <div>
              <span className="text-[9px] block text-slate-400 font-bold uppercase leading-none">BONDS</span>
              <span className="font-bold text-yellow-300 text-xs">{profile.resources.warBonds.toLocaleString()}</span>
            </div>
          </div>

          {/* Frosted Glass Fair Armory & Upgrades Button */}
          <button
            onClick={() => {
              soundFx.playRadioChirp();
              onOpenArmory();
            }}
            className="ml-1 bg-orange-600 hover:bg-orange-500 text-white font-black text-xs uppercase tracking-widest px-3 py-2 rounded-lg shadow-lg shadow-orange-900/30 transition-all active:scale-95 flex items-center gap-1.5"
            title="Open Fair Armory: Affordable micro-upgrades and free daily drops"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span className="font-sans font-black">UPGRADE ARMORY</span>
          </button>
        </div>

        {/* Server & Survival Status */}
        <div className="flex items-center gap-2 font-mono text-xs">
          {/* Server Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowServerSelect(!showServerSelect)}
              className="bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors"
              title="Change private game server channel"
            >
              <Server className="w-3.5 h-3.5 text-orange-400" />
              <span className="hidden sm:inline font-bold text-xs">{activeServer.name}</span>
              <span className="sm:hidden">{activeServer.flag}</span>
              <span className="text-[10px] text-green-400 font-mono font-bold">{activeServer.pingMs}ms</span>
            </button>

            {showServerSelect && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-[#0a0c0b]/95 backdrop-blur-2xl border border-white/15 rounded-xl p-2.5 shadow-2xl z-50 font-mono text-xs">
                <div className="text-[10px] uppercase tracking-[0.2em] font-black text-orange-500 mb-2 px-1">
                  Private Game Servers:
                </div>
                {servers.map((srv) => (
                  <button
                    key={srv.id}
                    onClick={() => {
                      onSelectServer(srv.id);
                      setShowServerSelect(false);
                      soundFx.playRadioChirp();
                    }}
                    className={`w-full text-left p-2 rounded-lg mb-1 transition-all flex items-center justify-between border ${
                      srv.id === activeServer.id
                        ? 'bg-white/10 border-orange-500/50 text-white'
                        : 'bg-white/5 border-transparent hover:border-white/10 hover:bg-white/10 text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="font-bold flex items-center gap-1 text-slate-200">
                        <span>{srv.flag}</span>
                        <span>{srv.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">{srv.region}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-green-400 text-[11px] font-bold">{srv.pingMs}ms</div>
                      <div className="text-[9px] text-slate-500">{srv.status}</div>
                    </div>
                  </button>
                ))}

                {onOpenServerBrowser && (
                  <button
                    onClick={() => {
                      setShowServerSelect(false);
                      onOpenServerBrowser();
                      soundFx.playRadioChirp();
                    }}
                    className="w-full text-center py-2 mt-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Server className="w-3.5 h-3.5" />
                    <span>Open Server Matrix &amp; Alliances</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Survival Integrity Badge */}
          <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/10 text-[11px]">
            <Activity className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-slate-400 hidden md:inline font-bold text-[10px] uppercase">INTEGRITY:</span>
            <span className="font-black text-white">{profile.baseIntegrity}%</span>
          </div>
        </div>
      </div>

      {/* Main View Navigation Tabs */}
      <nav className="bg-black/40 backdrop-blur-xl border-t border-white/10 px-3 sm:px-6 py-1.5 flex items-center justify-between gap-1 overflow-x-auto">
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* PRIMARY VIEW 1: EXTERNAL BASE */}
          <button
            onClick={() => {
              onSelectView('base_external');
              soundFx.playRadioChirp();
            }}
            className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeView === 'base_external'
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/30 border border-orange-400/40'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-orange-400" />
            <span className="bg-orange-950/80 text-orange-300 text-[9px] px-1.5 py-0.2 rounded border border-orange-500/40">
              VIEW 1
            </span>
            <span>EXTERNAL BASE</span>
          </button>

          {/* PRIMARY VIEW 2: INTERNAL BASE */}
          <button
            onClick={() => {
              onSelectView('base_internal');
              soundFx.playRadioChirp();
            }}
            className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeView === 'base_internal'
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/30 border border-cyan-400/40'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span className="bg-cyan-950/80 text-cyan-300 text-[9px] px-1.5 py-0.2 rounded border border-cyan-500/40">
              VIEW 2
            </span>
            <span>INTERNAL BASE (6 CATEGORIES &amp; EVENTS)</span>
          </button>

          <div className="w-px h-5 bg-white/10 mx-1 hidden sm:block" />

          {/* ALLIANCE COMMAND TAB (100 MEMBERS) */}
          <button
            onClick={() => {
              onSelectView('alliances');
              soundFx.playRadioChirp();
            }}
            className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeView === 'alliances'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/40 border border-amber-400/50'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-amber-400" />
            <span className="bg-amber-950/80 text-amber-300 text-[9px] px-1.5 py-0.2 rounded border border-amber-500/40">
              [{activeAllianceTag}] 100
            </span>
            <span>ALLIANCE</span>
          </button>

          {/* ALLIANCE LEADERBOARD TAB */}
          <button
            onClick={() => {
              onSelectView('alliance_leaderboard');
              soundFx.playRadioChirp();
            }}
            className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeView === 'alliance_leaderboard'
                ? 'bg-yellow-500 text-black font-black shadow-lg shadow-yellow-900/40 border border-yellow-300'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-yellow-400" />
            <span className="bg-yellow-950/80 text-yellow-300 text-[9px] px-1.5 py-0.2 rounded border border-yellow-500/40 font-mono">
              RANKINGS
            </span>
            <span>LEADERBOARD</span>
          </button>

          <button
            onClick={() => {
              onSelectView('combat');
              soundFx.playRadioChirp();
            }}
            className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeView === 'combat'
                ? 'bg-red-600 text-white shadow-lg shadow-red-900/30 border border-red-400/40'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>COMBAT THEATER</span>
          </button>

          <button
            onClick={() => {
              onSelectView('squads');
              soundFx.playRadioChirp();
            }}
            className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeView === 'squads'
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/30 border border-orange-400/40'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>SQUADS (5) &amp; ROSTER</span>
          </button>

          <button
            onClick={() => {
              onSelectView('comms');
              soundFx.playRadioChirp();
            }}
            className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeView === 'comms'
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/30 border border-orange-400/40'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>COMMS</span>
          </button>
        </div>

        {/* Season Terrain Weather Alert Flag */}
        <div className="hidden xl:flex items-center gap-2 text-xs font-mono text-slate-400 bg-white/5 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10">
          <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
          <span>{activeSeason.weatherCondition}</span>
        </div>
      </nav>
    </header>
  );
};
