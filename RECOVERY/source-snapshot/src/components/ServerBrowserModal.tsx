import React, { useState } from 'react';
import {
  Server,
  X,
  Radio,
  Globe2,
  Users,
  Shield,
  Clock,
  CheckCircle2,
  Wifi,
  Activity,
  AlertTriangle,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { ServerInfo } from '../types';
import { soundFx } from '../utils/audio';

interface ServerBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  servers: ServerInfo[];
  activeServer: ServerInfo;
  onSelectServer: (serverId: string) => void;
}

export const ServerBrowserModal: React.FC<ServerBrowserModalProps> = ({
  isOpen,
  onClose,
  servers,
  activeServer,
  onSelectServer,
}) => {
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (!isOpen) return null;

  const handleRefresh = () => {
    setIsRefreshing(true);
    soundFx.playRadioChirp();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  const handleConnect = (serverId: string) => {
    onSelectServer(serverId);
    soundFx.playRadioChirp();
  };

  const filteredServers = servers.filter((s) => {
    if (selectedRegion !== 'ALL') {
      if (selectedRegion === 'NA' && !s.region.includes('North America')) return false;
      if (selectedRegion === 'EU' && !s.region.includes('Europe')) return false;
      if (selectedRegion === 'ASIA' && !s.region.includes('East Asia')) return false;
      if (selectedRegion === 'ME' && !s.region.includes('Middle East')) return false;
      if (selectedRegion === 'GLOBAL' && !s.region.includes('International') && !s.region.includes('Orbital')) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        s.name.toLowerCase().includes(q) ||
        s.region.toLowerCase().includes(q) ||
        s.ruleset.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const totalCommanders = servers.reduce((acc, s) => acc + s.activeCommanders, 0);
  const totalAlliances = servers.reduce((acc, s) => acc + s.totalAlliances, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xl font-mono text-[#d1d5db] animate-fade-in">
      <div className="bg-[#0b0f14]/95 border border-white/15 rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-white/5 border-b border-white/10 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600/20 border border-orange-500/40 flex items-center justify-center text-orange-400 shadow-lg shadow-orange-950/40">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
                  TACTICAL SERVER BATTLE-GROUPS
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30 font-bold uppercase">
                  ACTIVE MATRIX
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Live military datacenters supporting 100-member Alliances, combined-arms operations &amp; cross-server comms.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-slate-300 hover:text-white transition-colors"
              title="Ping all datacenters"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-orange-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-white/5 hover:bg-red-500/20 hover:text-red-300 border border-white/10 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Global Network Telemetry Banner */}
        <div className="bg-black/60 px-4 py-2.5 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-slate-400 font-bold">ONLINE COMMANDERS:</span>
              <span className="text-white font-black">{totalCommanders.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-400 font-bold">ACTIVE ALLIANCES:</span>
              <span className="text-cyan-300 font-black">{totalAlliances.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-400 font-bold">CURRENT LINK:</span>
              <span className="text-emerald-400 font-black flex items-center gap-1">
                <span>{activeServer.flag}</span>
                <span>{activeServer.name}</span>
                <span className="text-[10px] bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-500/40">
                  {activeServer.pingMs}ms
                </span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <Clock className="w-3 h-3 text-orange-400" />
            <span>WAR RESET: <strong className="text-white">04h 22m</strong></span>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-3 bg-white/5 border-b border-white/10 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          {/* Region Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin">
            {[
              { id: 'ALL', label: 'All Servers (8)' },
              { id: 'GLOBAL', label: '🌐 Joint Relay' },
              { id: 'NA', label: '🇺🇸 North America' },
              { id: 'EU', label: '🇪🇺 Europe' },
              { id: 'ASIA', label: '🇯🇵 Asia-Pacific' },
              { id: 'ME', label: '🇦🇪 Middle East' },
            ].map((reg) => (
              <button
                key={reg.id}
                onClick={() => {
                  setSelectedRegion(reg.id);
                  soundFx.playRadioChirp();
                }}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase transition-all whitespace-nowrap border ${
                  selectedRegion === reg.id
                    ? 'bg-orange-600 text-white border-orange-400 shadow-md shadow-orange-950/50'
                    : 'bg-white/5 text-slate-400 border-white/10 hover:text-white hover:bg-white/10'
                }`}
              >
                {reg.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative flex-1 sm:max-w-xs">
            <input
              type="text"
              placeholder="Search server name, ruleset, or region..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/60 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Server Grid */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredServers.map((server) => {
            const isConnected = server.id === activeServer.id;
            const pingColor =
              server.pingMs < 25
                ? 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40'
                : server.pingMs < 45
                ? 'text-yellow-400 border-yellow-500/40 bg-yellow-950/40'
                : 'text-orange-400 border-orange-500/40 bg-orange-950/40';

            const statusColor =
              server.status === 'OPTIMAL'
                ? 'text-emerald-400 bg-emerald-950/80 border-emerald-500/40'
                : server.status === 'HIGH_LOAD'
                ? 'text-amber-400 bg-amber-950/80 border-amber-500/40'
                : 'text-red-400 bg-red-950/80 border-red-500/40';

            return (
              <div
                key={server.id}
                className={`p-4 rounded-xl border transition-all relative flex flex-col justify-between ${
                  isConnected
                    ? 'bg-orange-950/20 border-orange-500/60 shadow-xl shadow-orange-950/30'
                    : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10'
                }`}
              >
                {isConnected && (
                  <div className="absolute -top-2.5 right-4 bg-orange-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-orange-400 shadow-md flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    <span>CONNECTED BATTLEROOM</span>
                  </div>
                )}

                <div>
                  {/* Top Bar of Card */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl" role="img" aria-label="flag">
                        {server.flag}
                      </span>
                      <div>
                        <h3 className="text-sm font-black text-white flex items-center gap-2">
                          <span>{server.name}</span>
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                          <Globe2 className="w-3 h-3 text-slate-500" />
                          <span>{server.region}</span>
                        </p>
                      </div>
                    </div>

                    {/* Ping Badge */}
                    <div
                      className={`px-2 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1 border ${pingColor}`}
                    >
                      <Wifi className="w-3 h-3" />
                      <span>{server.pingMs} ms</span>
                    </div>
                  </div>

                  {/* Telemetry Row */}
                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/10 text-center">
                    <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                      <div className="text-[9px] uppercase font-bold text-slate-400">PLAYERS</div>
                      <div className="text-xs font-black text-white mt-0.5">
                        {server.activeCommanders.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                      <div className="text-[9px] uppercase font-bold text-slate-400">ALLIANCES</div>
                      <div className="text-xs font-black text-cyan-300 mt-0.5">
                        {server.totalAlliances} Active
                      </div>
                    </div>
                    <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                      <div className="text-[9px] uppercase font-bold text-slate-400">DEFCON</div>
                      <div className="text-xs font-black text-orange-400 mt-0.5">
                        LEVEL {server.defconLevel}
                      </div>
                    </div>
                  </div>

                  {/* Ruleset & Season Details */}
                  <div className="mt-3 space-y-1 text-[11px] text-slate-400">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Ruleset:</span>
                      <span className="text-slate-200 font-bold">{server.ruleset}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Active Theater:</span>
                      <span className="text-orange-400 font-bold">{server.seasonName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Node Status:</span>
                      <span className={`px-1.5 py-0.2 rounded border text-[10px] font-bold ${statusColor}`}>
                        {server.status} ({server.uptimePct}%)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Connect Action Button */}
                <div className="mt-4 pt-3 border-t border-white/10">
                  {isConnected ? (
                    <button
                      disabled
                      className="w-full py-2 bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-bold uppercase flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>CURRENTLY OPERATING ON THIS SERVER</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleConnect(server.id)}
                      className="w-full py-2 bg-orange-600 hover:bg-orange-500 active:scale-[0.98] text-white rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-orange-950/40 transition-all cursor-pointer"
                    >
                      <Radio className="w-3.5 h-3.5" />
                      <span>CONNECT TO BATTLE-GROUP</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 bg-black/60 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>All servers synchronize 100-member Alliances, live operations &amp; combat telemetry in real time.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold text-xs uppercase transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
