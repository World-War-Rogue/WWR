import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Award,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Rewind,
  Crosshair,
  Shield,
  Zap,
  Flame,
  Activity,
  BarChart2,
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  FileText,
  X,
  Swords,
  ChevronRight,
  Sliders,
  CheckCircle,
} from 'lucide-react';
import {
  CombatAfterActionReport,
  CombatTelemetrySnapshot,
  CombatUnitTelemetry,
  ComparativeMetricItem,
  CombatMilestoneEvent,
} from '../types';
import { soundFx } from '../utils/audio';

interface PostCombatSummaryOverlayProps {
  report: CombatAfterActionReport;
  onClose: () => void;
  onReplayBattle: () => void;
}

type TabKey = 'playback' | 'metrics' | 'head_to_head' | 'debrief';

export const PostCombatSummaryOverlay: React.FC<PostCombatSummaryOverlayProps> = ({
  report,
  onClose,
  onReplayBattle,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('playback');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [selectedPlayerUnitId, setSelectedPlayerUnitId] = useState<string>(
    report.playerUnits[0]?.id || ''
  );
  const [selectedEnemyUnitId, setSelectedEnemyUnitId] = useState<string>(
    report.enemyUnits[0]?.id || ''
  );
  const [metricCategoryFilter, setMetricCategoryFilter] = useState<string>('all');

  const playbackTimerRef = useRef<number | null>(null);
  const duration = Math.max(1, report.durationSec);

  // Playback Loop
  useEffect(() => {
    if (isPlaying) {
      playbackTimerRef.current = window.setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + 0.1 * playbackSpeed;
          if (next >= duration) {
            setIsPlaying(false);
            return duration;
          }
          return next;
        });
      }, 100);
    } else if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current);
    }

    return () => {
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, duration]);

  // Find active snapshot based on currentTime
  const currentSnapshot: CombatTelemetrySnapshot = useMemo(() => {
    if (!report.snapshots || report.snapshots.length === 0) {
      return {
        timeSec: currentTime,
        playerTotalHp: 1000,
        playerMaxHp: 1000,
        enemyTotalHp: 1000,
        enemyMaxHp: 1000,
        playerActiveCount: report.playerUnits.length,
        enemyActiveCount: report.enemyUnits.length,
        playerCumulativeDamage: 0,
        enemyCumulativeDamage: 0,
        playerDamageRate: 0,
        enemyDamageRate: 0,
        unitStates: {},
      };
    }

    // Find closest snapshot
    let closest = report.snapshots[0];
    let minDiff = Math.abs(closest.timeSec - currentTime);
    for (const snap of report.snapshots) {
      const diff = Math.abs(snap.timeSec - currentTime);
      if (diff < minDiff) {
        minDiff = diff;
        closest = snap;
      }
    }
    return closest;
  }, [report.snapshots, currentTime]);

  // Filtered metrics
  const filteredMetrics = useMemo(() => {
    if (metricCategoryFilter === 'all') return report.comparativeMetrics;
    return report.comparativeMetrics.filter((m) => m.category === metricCategoryFilter);
  }, [report.comparativeMetrics, metricCategoryFilter]);

  // Overall player advantages vs opponent advantages count
  const advantageSummary = useMemo(() => {
    let playerAdvCount = 0;
    let enemyAdvCount = 0;
    let tiedCount = 0;

    report.comparativeMetrics.forEach((m) => {
      if (m.advantageSide === 'player') playerAdvCount++;
      else if (m.advantageSide === 'enemy') enemyAdvCount++;
      else tiedCount++;
    });

    return { playerAdvCount, enemyAdvCount, tiedCount };
  }, [report.comparativeMetrics]);

  // Selected Units for Head-to-Head
  const selectedPlayerUnit =
    report.playerUnits.find((u) => u.id === selectedPlayerUnitId) || report.playerUnits[0];
  const selectedEnemyUnit =
    report.enemyUnits.find((u) => u.id === selectedEnemyUnitId) || report.enemyUnits[0];

  const handleSeek = (time: number) => {
    setCurrentTime(Math.max(0, Math.min(duration, time)));
    soundFx.playRadioChirp();
  };

  return (
    <div
      id="post-combat-overlay-root"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex flex-col justify-between overflow-y-auto text-slate-100 font-mono"
    >
      {/* Top Banner & Verdict Header */}
      <header className="border-b border-white/10 bg-[#090d0b]/95 px-4 py-3 sticky top-0 z-30 shadow-2xl">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl border flex items-center justify-center shadow-lg ${
                report.result === 'victory'
                  ? 'bg-orange-600/20 border-orange-500/50 text-orange-400 shadow-orange-950/50'
                  : 'bg-red-950/60 border-red-500/50 text-red-400 shadow-red-950/50'
              }`}
            >
              {report.result === 'victory' ? (
                <Award className="w-7 h-7 animate-pulse" />
              ) : (
                <AlertTriangle className="w-7 h-7" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-lg sm:text-xl font-black uppercase tracking-wider italic ${
                    report.result === 'victory' ? 'text-orange-400' : 'text-red-400'
                  }`}
                >
                  {report.result === 'victory'
                    ? 'AFTER ACTION REVIEW // TACTICAL VICTORY'
                    : 'AFTER ACTION REVIEW // RETREAT ORDERED'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 border border-white/15 text-slate-300 font-bold uppercase">
                  ENGAGEMENT TIME: {report.durationSec.toFixed(1)}s
                </span>
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-3 mt-0.5">
                <span>
                  Squad: <strong className="text-white">{report.playerSquadName}</strong> (
                  {report.playerSquadPower} PWR)
                </span>
                <span className="text-orange-500 font-bold">vs</span>
                <span>
                  Hostile:{' '}
                  <strong className="text-white">
                    {report.enemyCommanderFlag} {report.enemyCommanderName}
                  </strong>{' '}
                  ({report.enemySquadPower} PWR &bull; {report.enemyCommanderServer})
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                soundFx.playRadioChirp();
                onReplayBattle();
              }}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-orange-400" />
              <span>REPLAY BATTLE</span>
            </button>
            <button
              onClick={() => {
                soundFx.playRadioChirp();
                onClose();
              }}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-slate-200 hover:text-white transition-colors"
              title="Close Summary Overlay"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto flex items-center gap-2 mt-3 pt-2 border-t border-white/5 overflow-x-auto">
          <button
            onClick={() => {
              setActiveTab('playback');
              soundFx.playRadioChirp();
            }}
            className={`px-4 py-2 rounded-lg text-xs font-black tracking-wider uppercase transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'playback'
                ? 'bg-orange-600 text-white shadow-md shadow-orange-950/40 border border-orange-400/40'
                : 'bg-white/5 text-slate-400 hover:text-white border border-white/10 hover:bg-white/10'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>VISUAL PLAYBACK &amp; STAT FLUCTUATIONS</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('metrics');
              soundFx.playRadioChirp();
            }}
            className={`px-4 py-2 rounded-lg text-xs font-black tracking-wider uppercase transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'metrics'
                ? 'bg-orange-600 text-white shadow-md shadow-orange-950/40 border border-orange-400/40'
                : 'bg-white/5 text-slate-400 hover:text-white border border-white/10 hover:bg-white/10'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>FULL COMPARATIVE METRICS MATRIX ({report.comparativeMetrics.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('head_to_head');
              soundFx.playRadioChirp();
            }}
            className={`px-4 py-2 rounded-lg text-xs font-black tracking-wider uppercase transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'head_to_head'
                ? 'bg-orange-600 text-white shadow-md shadow-orange-950/40 border border-orange-400/40'
                : 'bg-white/5 text-slate-400 hover:text-white border border-white/10 hover:bg-white/10'
            }`}
          >
            <Swords className="w-3.5 h-3.5" />
            <span>UNIT-BY-UNIT 1v1 MATCHUPS</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('debrief');
              soundFx.playRadioChirp();
            }}
            className={`px-4 py-2 rounded-lg text-xs font-black tracking-wider uppercase transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'debrief'
                ? 'bg-orange-600 text-white shadow-md shadow-orange-950/40 border border-orange-400/40'
                : 'bg-white/5 text-slate-400 hover:text-white border border-white/10 hover:bg-white/10'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>TACTICAL DEBRIEF &amp; ADVICE</span>
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 space-y-4">
        {/* ========================================================
            TAB 1: VISUAL PLAYBACK & STAT FLUCTUATIONS
        ======================================================== */}
        {activeTab === 'playback' && (
          <div className="space-y-4">
            {/* Playback Control Bar */}
            <div className="bg-[#111714] border border-white/10 rounded-xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    handleSeek(0);
                  }}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors"
                  title="Reset to 00.0s"
                >
                  <Rewind className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    setIsPlaying(!isPlaying);
                    soundFx.playRadioChirp();
                  }}
                  className={`px-4 py-2 rounded-lg font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg transition-all ${
                    isPlaying
                      ? 'bg-amber-600 hover:bg-amber-500 text-slate-950 shadow-amber-950/50'
                      : 'bg-orange-600 hover:bg-orange-500 text-white shadow-orange-950/50'
                  }`}
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-4 h-4" />
                      <span>PAUSE</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      <span>PLAY</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    handleSeek(duration);
                  }}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors"
                  title="Jump to End"
                >
                  <FastForward className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1 bg-black/40 border border-white/10 rounded-lg p-1 text-xs">
                  {[0.5, 1, 2, 4].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => setPlaybackSpeed(spd)}
                      className={`px-2 py-0.5 rounded font-black text-[10px] transition-colors ${
                        playbackSpeed === spd
                          ? 'bg-orange-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Scrubber */}
              <div className="flex-1 min-w-[280px] flex items-center gap-3">
                <span className="text-xs font-black text-orange-400 min-w-[44px]">
                  {currentTime.toFixed(1)}s
                </span>
                <input
                  type="range"
                  min="0"
                  max={duration}
                  step="0.1"
                  value={currentTime}
                  onChange={(e) => handleSeek(parseFloat(e.target.value))}
                  className="flex-1 accent-orange-500 cursor-pointer h-2 bg-white/10 rounded-lg"
                />
                <span className="text-xs text-slate-400 min-w-[44px] text-right">
                  {duration.toFixed(1)}s
                </span>
              </div>

              {/* Live Squad Health Meters at Current Scrubber Point */}
              <div className="flex items-center gap-4 bg-black/40 border border-white/10 px-3 py-1.5 rounded-lg text-xs">
                <div>
                  <div className="text-[10px] text-emerald-400 font-bold uppercase">
                    PLAYER HP: {currentSnapshot.playerTotalHp} / {currentSnapshot.playerMaxHp}
                  </div>
                  <div className="w-24 h-1.5 bg-black/60 rounded-full overflow-hidden mt-0.5">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-150"
                      style={{
                        width: `${Math.min(
                          100,
                          (currentSnapshot.playerTotalHp / currentSnapshot.playerMaxHp) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="text-slate-500 font-bold">vs</div>

                <div>
                  <div className="text-[10px] text-red-400 font-bold uppercase">
                    RIVAL HP: {currentSnapshot.enemyTotalHp} / {currentSnapshot.enemyMaxHp}
                  </div>
                  <div className="w-24 h-1.5 bg-black/60 rounded-full overflow-hidden mt-0.5">
                    <div
                      className="h-full bg-red-500 transition-all duration-150"
                      style={{
                        width: `${Math.min(
                          100,
                          (currentSnapshot.enemyTotalHp / currentSnapshot.enemyMaxHp) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Fluctuation Graph Canvas / Time-Series Area Chart */}
            <div className="bg-[#111714] border border-white/10 rounded-xl p-4 shadow-xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-orange-400" />
                  <span className="text-xs font-black uppercase tracking-wider text-white">
                    SQUAD HP &amp; COMBAT POWER FLUCTUATION OVER TIME
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs font-bold">
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <div className="w-3 h-1 bg-emerald-500 rounded" />
                    <span>Player Forces</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-red-400">
                    <div className="w-3 h-1 bg-red-500 rounded" />
                    <span>Opposing Hostiles</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-amber-400">
                    <div className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>Milestone Events</span>
                  </div>
                </div>
              </div>

              {/* SVG Dynamic Timeline Graph */}
              <div className="relative w-full h-44 bg-black/40 border border-white/10 rounded-lg p-2 overflow-hidden select-none">
                <svg
                  className="w-full h-full overflow-visible"
                  viewBox="0 0 800 160"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="playerGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="enemyGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid lines */}
                  <line x1="0" y1="40" x2="800" y2="40" stroke="#ffffff10" strokeDasharray="3 3" />
                  <line x1="0" y1="80" x2="800" y2="80" stroke="#ffffff10" strokeDasharray="3 3" />
                  <line x1="0" y1="120" x2="800" y2="120" stroke="#ffffff10" strokeDasharray="3 3" />

                  {/* Player HP Polyline */}
                  {report.snapshots.length > 1 && (
                    <>
                      <path
                        d={(() => {
                          const points = report.snapshots.map((s) => {
                            const x = (s.timeSec / duration) * 800;
                            const y = 140 - (s.playerTotalHp / s.playerMaxHp) * 120;
                            return `${x},${Math.max(10, Math.min(150, y))}`;
                          });
                          return `M 0,140 L ${points.join(' L ')} L 800,140 Z`;
                        })()}
                        fill="url(#playerGrad)"
                      />
                      <polyline
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="2.5"
                        points={report.snapshots
                          .map((s) => {
                            const x = (s.timeSec / duration) * 800;
                            const y = 140 - (s.playerTotalHp / s.playerMaxHp) * 120;
                            return `${x},${Math.max(10, Math.min(150, y))}`;
                          })
                          .join(' ')}
                      />
                    </>
                  )}

                  {/* Opponent HP Polyline */}
                  {report.snapshots.length > 1 && (
                    <>
                      <path
                        d={(() => {
                          const points = report.snapshots.map((s) => {
                            const x = (s.timeSec / duration) * 800;
                            const y = 140 - (s.enemyTotalHp / s.enemyMaxHp) * 120;
                            return `${x},${Math.max(10, Math.min(150, y))}`;
                          });
                          return `M 0,140 L ${points.join(' L ')} L 800,140 Z`;
                        })()}
                        fill="url(#enemyGrad)"
                      />
                      <polyline
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="2.5"
                        points={report.snapshots
                          .map((s) => {
                            const x = (s.timeSec / duration) * 800;
                            const y = 140 - (s.enemyTotalHp / s.enemyMaxHp) * 120;
                            return `${x},${Math.max(10, Math.min(150, y))}`;
                          })
                          .join(' ')}
                      />
                    </>
                  )}

                  {/* Milestones markers on graph */}
                  {report.milestones.map((ms) => {
                    const cx = (ms.timeSec / duration) * 800;
                    return (
                      <g key={ms.id} className="cursor-pointer" onClick={() => handleSeek(ms.timeSec)}>
                        <line
                          x1={cx}
                          y1="0"
                          x2={cx}
                          y2="150"
                          stroke="#f59e0b"
                          strokeWidth="1"
                          strokeDasharray="2 2"
                        />
                        <circle cx={cx} cy="20" r="4" fill="#f59e0b" />
                      </g>
                    );
                  })}

                  {/* Playhead Vertical Line */}
                  <line
                    x1={(currentTime / duration) * 800}
                    y1="0"
                    x2={(currentTime / duration) * 800}
                    y2="155"
                    stroke="#ea580c"
                    strokeWidth="2"
                  />
                  <polygon
                    points={`${(currentTime / duration) * 800 - 5},0 ${(currentTime / duration) * 800 + 5},0 ${(currentTime / duration) * 800},10`}
                    fill="#ea580c"
                  />
                </svg>

                {/* Milestone Pills below graph */}
                <div className="absolute bottom-1 left-2 right-2 flex items-center justify-between text-[10px] text-slate-400">
                  <span>00.0s (First Contact)</span>
                  <span>{(duration / 2).toFixed(1)}s (Peak Engagement)</span>
                  <span>{duration.toFixed(1)}s (Resolution)</span>
                </div>
              </div>

              {/* Clickable Milestones Ticker */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase whitespace-nowrap">
                  TIMELINE MILESTONES:
                </span>
                {report.milestones.map((ms) => (
                  <button
                    key={ms.id}
                    onClick={() => handleSeek(ms.timeSec)}
                    className={`px-2 py-1 rounded text-[10px] font-bold whitespace-nowrap border flex items-center gap-1.5 transition-colors ${
                      Math.abs(currentTime - ms.timeSec) < 0.8
                        ? 'bg-orange-600/30 border-orange-500 text-orange-300 shadow-[0_0_8px_rgba(234,88,12,0.4)]'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <span className="text-amber-400 font-black">{ms.timeSec.toFixed(1)}s</span>
                    <span>{ms.title}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Live Units Stat Cards at Scrubbed Second */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Player Forces Active Fluctuations */}
              <div className="bg-[#111714] border border-white/10 rounded-xl p-4 shadow-xl space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-black text-emerald-400 uppercase tracking-wider">
                      PLAYER SQUAD UNITS // STATUS AT {currentTime.toFixed(1)}s
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold">
                    {report.playerUnits.filter((u) => {
                      const st = currentSnapshot.unitStates[u.id];
                      return st ? !st.destroyed : !u.destroyed;
                    }).length}{' '}
                    / {report.playerUnits.length} ACTIVE
                  </span>
                </div>

                <div className="space-y-2">
                  {report.playerUnits.map((u) => {
                    const st = currentSnapshot.unitStates[u.id];
                    const hp = st ? st.hp : u.finalHp;
                    const isDead = st ? st.destroyed : u.destroyed;
                    const hpPct = Math.max(0, Math.min(100, (hp / u.maxHp) * 100));
                    const dmgDealt = st ? st.damageDealt : u.damageDealt;

                    return (
                      <div
                        key={u.id}
                        className={`p-2.5 rounded-lg border transition-all ${
                          isDead
                            ? 'bg-red-950/20 border-red-900/40 opacity-60'
                            : 'bg-white/5 border-white/10 hover:border-emerald-500/40'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{u.name}</span>
                            <span className="text-[10px] text-slate-400">[{u.role}]</span>
                          </div>
                          <span
                            className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                              isDead
                                ? 'bg-red-900/50 text-red-300'
                                : hpPct < 35
                                ? 'bg-amber-900/50 text-amber-300'
                                : 'bg-emerald-950/60 text-emerald-400'
                            }`}
                          >
                            {isDead ? 'DESTROYED' : `${hp} / ${u.maxHp} HP (${hpPct.toFixed(0)}%)`}
                          </span>
                        </div>

                        {/* HP Bar */}
                        <div className="w-full h-1.5 bg-black/60 rounded-full overflow-hidden mt-2">
                          <div
                            className={`h-full transition-all duration-200 ${
                              hpPct > 50
                                ? 'bg-emerald-500'
                                : hpPct > 25
                                ? 'bg-amber-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${hpPct}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5">
                          <span>Damage Output: {dmgDealt} dmg</span>
                          <span>Armor: {u.armor}%</span>
                          <span>Pen: {u.penetration}mm</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Opposing Forces Active Fluctuations */}
              <div className="bg-[#111714] border border-white/10 rounded-xl p-4 shadow-xl space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2">
                    <Crosshair className="w-4 h-4 text-red-400" />
                    <span className="text-xs font-black text-red-400 uppercase tracking-wider">
                      OPPOSING SQUAD UNITS // STATUS AT {currentTime.toFixed(1)}s
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold">
                    {report.enemyUnits.filter((u) => {
                      const st = currentSnapshot.unitStates[u.id];
                      return st ? !st.destroyed : !u.destroyed;
                    }).length}{' '}
                    / {report.enemyUnits.length} ACTIVE
                  </span>
                </div>

                <div className="space-y-2">
                  {report.enemyUnits.map((u) => {
                    const st = currentSnapshot.unitStates[u.id];
                    const hp = st ? st.hp : u.finalHp;
                    const isDead = st ? st.destroyed : u.destroyed;
                    const hpPct = Math.max(0, Math.min(100, (hp / u.maxHp) * 100));
                    const dmgDealt = st ? st.damageDealt : u.damageDealt;

                    return (
                      <div
                        key={u.id}
                        className={`p-2.5 rounded-lg border transition-all ${
                          isDead
                            ? 'bg-red-950/20 border-red-900/40 opacity-60'
                            : 'bg-white/5 border-white/10 hover:border-red-500/40'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{u.name}</span>
                            <span className="text-[10px] text-slate-400">[{u.role}]</span>
                          </div>
                          <span
                            className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                              isDead
                                ? 'bg-red-900/50 text-red-300'
                                : hpPct < 35
                                ? 'bg-amber-900/50 text-amber-300'
                                : 'bg-red-950/60 text-red-400'
                            }`}
                          >
                            {isDead ? 'DESTROYED' : `${hp} / ${u.maxHp} HP (${hpPct.toFixed(0)}%)`}
                          </span>
                        </div>

                        {/* HP Bar */}
                        <div className="w-full h-1.5 bg-black/60 rounded-full overflow-hidden mt-2">
                          <div
                            className={`h-full transition-all duration-200 ${
                              hpPct > 50 ? 'bg-red-500' : hpPct > 25 ? 'bg-amber-500' : 'bg-red-700'
                            }`}
                            style={{ width: `${hpPct}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5">
                          <span>Damage Output: {dmgDealt} dmg</span>
                          <span>Armor: {u.armor}%</span>
                          <span>Pen: {u.penetration}mm</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 2: FULL COMPARATIVE METRICS MATRIX (ALL METRICS)
        ======================================================== */}
        {activeTab === 'metrics' && (
          <div className="space-y-4">
            {/* Superiority Overview & Where Opposing Sides are Stronger */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#111714] border border-emerald-500/30 rounded-xl p-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-400 uppercase tracking-wider">
                    PLAYER DOMAIN SUPERIORITY
                  </span>
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-3xl font-black text-white mt-1">
                  {advantageSummary.playerAdvCount} <span className="text-sm font-normal text-slate-400">Categories</span>
                </div>
                <p className="text-[11px] text-slate-300 mt-1.5 leading-relaxed">
                  Player force maintained measurable advantages in direct armor penetration, kinetic hit accuracy, and target neutralization speed.
                </p>
              </div>

              <div className="bg-[#111714] border border-red-500/30 rounded-xl p-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-red-400 uppercase tracking-wider">
                    OPPONENT DOMAIN SUPERIORITY
                  </span>
                  <TrendingDown className="w-4 h-4 text-red-400" />
                </div>
                <div className="text-3xl font-black text-white mt-1">
                  {advantageSummary.enemyAdvCount} <span className="text-sm font-normal text-slate-400">Categories</span>
                </div>
                <p className="text-[11px] text-slate-300 mt-1.5 leading-relaxed">
                  Hostile battlegroup fielded superior composite armor thickness, wider explosive blast dispersal, and faster battlefield repositioning.
                </p>
              </div>

              <div className="bg-[#111714] border border-white/10 rounded-xl p-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-400 uppercase tracking-wider">
                    PARITY &amp; CONTESTED METRICS
                  </span>
                  <Activity className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-3xl font-black text-white mt-1">
                  {advantageSummary.tiedCount} <span className="text-sm font-normal text-slate-400">Categories</span>
                </div>
                <p className="text-[11px] text-slate-300 mt-1.5 leading-relaxed">
                  Long-range ballistic sightlines and radar telemetry parity remained evenly matched within &plusmn;3% threshold.
                </p>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {[
                { key: 'all', label: 'ALL COMPARATIVE METRICS' },
                { key: 'Firepower & Alpha Strike', label: 'FIREPOWER & ALPHA' },
                { key: 'Survivability & Armor Protection', label: 'SURVIVABILITY & ARMOR' },
                { key: 'Tactical Gunnery & Accuracy', label: 'GUNNERY & ACCURACY' },
                { key: 'Mobility & Traverse', label: 'MOBILITY & TRAVERSE' },
                { key: 'Explosive & Area Impact', label: 'EXPLOSIVES & BLAST' },
                { key: 'Attrition, Casualties & Efficiency', label: 'ATTRITION & CASUALTIES' },
              ].map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => {
                    setMetricCategoryFilter(cat.key);
                    soundFx.playRadioChirp();
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase whitespace-nowrap transition-colors border ${
                    metricCategoryFilter === cat.key
                      ? 'bg-orange-600 text-white border-orange-400/40 shadow-md'
                      : 'bg-white/5 text-slate-400 hover:text-white border-white/10 hover:bg-white/10'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Comprehensive Metrics List */}
            <div className="space-y-3">
              {filteredMetrics.map((metric) => {
                const totalVal = Math.max(0.1, metric.playerValue + metric.enemyValue);
                const playerPct = Math.min(100, Math.max(0, (metric.playerValue / totalVal) * 100));
                const enemyPct = 100 - playerPct;

                return (
                  <div
                    key={metric.id}
                    className="bg-[#111714] border border-white/10 rounded-xl p-4 shadow-lg hover:border-white/20 transition-all space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-white uppercase tracking-wider">
                            {metric.label}
                          </span>
                          <span className="text-[10px] text-slate-400 px-2 py-0.5 rounded bg-white/5 border border-white/10">
                            {metric.category}
                          </span>
                        </div>
                      </div>

                      {/* Advantage Badge */}
                      <div>
                        {metric.advantageSide === 'player' ? (
                          <span className="px-2.5 py-1 rounded bg-emerald-950/80 border border-emerald-500/50 text-emerald-400 text-xs font-black uppercase tracking-wide flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                            <TrendingUp className="w-3.5 h-3.5" />
                            <span>PLAYER ADVANTAGE (+{metric.advantagePct.toFixed(1)}%)</span>
                          </span>
                        ) : metric.advantageSide === 'enemy' ? (
                          <span className="px-2.5 py-1 rounded bg-red-950/80 border border-red-500/50 text-red-400 text-xs font-black uppercase tracking-wide flex items-center gap-1.5 shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                            <TrendingDown className="w-3.5 h-3.5" />
                            <span>OPPONENT ADVANTAGE (+{metric.advantagePct.toFixed(1)}%)</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded bg-slate-800/80 border border-slate-600 text-slate-300 text-xs font-black uppercase tracking-wide">
                            PARITY / TIED
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Numerical Comparison Values & Side-by-Side Visual Bar */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between text-xs font-mono font-bold">
                        <span className="text-emerald-400">
                          {report.playerSquadName}: {metric.playerValue.toLocaleString()} {metric.unitSuffix}
                        </span>
                        <span className="text-red-400">
                          {report.enemyCommanderName}: {metric.enemyValue.toLocaleString()} {metric.unitSuffix}
                        </span>
                      </div>

                      <div className="w-full h-2.5 bg-black/60 rounded-full flex overflow-hidden p-0.5 border border-white/5">
                        <div
                          className="h-full bg-emerald-500 rounded-l-full transition-all duration-300"
                          style={{ width: `${playerPct}%` }}
                        />
                        <div
                          className="h-full bg-red-500 rounded-r-full transition-all duration-300"
                          style={{ width: `${enemyPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Detailed Tactical Analysis */}
                    <p className="text-xs text-slate-300 bg-black/30 border border-white/5 rounded-lg p-2.5 leading-relaxed">
                      <strong className="text-orange-400 uppercase text-[10px] tracking-wider block mb-0.5">
                        TACTICAL TELEMETRY DEBRIEF:
                      </strong>
                      {metric.analysis}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 3: UNIT-BY-UNIT 1v1 HEAD-TO-HEAD MATCHUPS
        ======================================================== */}
        {activeTab === 'head_to_head' && (
          <div className="space-y-4">
            <div className="bg-[#111714] border border-white/10 rounded-xl p-4 shadow-xl space-y-4">
              <div className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Swords className="w-4 h-4 text-orange-400" />
                <span>DIRECT UNIT-BY-UNIT COMBAT TELEMETRY INSPECTOR</span>
              </div>
              <p className="text-xs text-slate-300">
                Select any unit from your squad and an opposing hostile to compare individual ballistics, armor, damage dealt, and tactical outcome.
              </p>

              {/* Selector Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Player Unit Picker */}
                <div>
                  <label className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                    SELECT PLAYER SQUAD COMBATANT:
                  </label>
                  <select
                    value={selectedPlayerUnitId}
                    onChange={(e) => {
                      setSelectedPlayerUnitId(e.target.value);
                      soundFx.playRadioChirp();
                    }}
                    className="w-full bg-black/60 border border-emerald-500/40 rounded-lg p-2.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-400"
                  >
                    {report.playerUnits.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} [{u.role}] - {u.destroyed ? 'Destroyed' : 'Survived'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Opponent Unit Picker */}
                <div>
                  <label className="text-[10px] font-bold text-red-400 uppercase tracking-wider block mb-1">
                    SELECT OPPOSING HOSTILE COMBATANT:
                  </label>
                  <select
                    value={selectedEnemyUnitId}
                    onChange={(e) => {
                      setSelectedEnemyUnitId(e.target.value);
                      soundFx.playRadioChirp();
                    }}
                    className="w-full bg-black/60 border border-red-500/40 rounded-lg p-2.5 text-xs text-white font-mono focus:outline-none focus:border-red-400"
                  >
                    {report.enemyUnits.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} [{u.role}] - {u.destroyed ? 'Destroyed' : 'Survived'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 1v1 Comparative Dossier Display */}
              {selectedPlayerUnit && selectedEnemyUnit && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {/* Left Player Unit Card */}
                  <div className="bg-black/40 border border-emerald-500/30 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <div>
                        <div className="text-sm font-black text-emerald-400">{selectedPlayerUnit.name}</div>
                        <div className="text-[10px] text-slate-400">{selectedPlayerUnit.role}</div>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-black uppercase ${
                          selectedPlayerUnit.destroyed
                            ? 'bg-red-950 text-red-400 border border-red-500/30'
                            : 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {selectedPlayerUnit.destroyed
                          ? `Killed at ${selectedPlayerUnit.timeOfDeathSec?.toFixed(1) || '?'}s`
                          : 'Survived Mission'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 bg-white/5 rounded-lg">
                        <div className="text-[10px] text-slate-400 uppercase">Damage Dealt</div>
                        <div className="text-base font-black text-white">{selectedPlayerUnit.damageDealt}</div>
                      </div>
                      <div className="p-2 bg-white/5 rounded-lg">
                        <div className="text-[10px] text-slate-400 uppercase">Damage Absorbed</div>
                        <div className="text-base font-black text-white">{selectedPlayerUnit.damageTaken}</div>
                      </div>
                      <div className="p-2 bg-white/5 rounded-lg">
                        <div className="text-[10px] text-slate-400 uppercase">Gunnery Accuracy</div>
                        <div className="text-base font-black text-emerald-400">
                          {selectedPlayerUnit.shotsFired > 0
                            ? `${Math.round(
                                (selectedPlayerUnit.hitsLanded / selectedPlayerUnit.shotsFired) * 100
                              )}%`
                            : '0%'}
                        </div>
                      </div>
                      <div className="p-2 bg-white/5 rounded-lg">
                        <div className="text-[10px] text-slate-400 uppercase">Kills Confirmed</div>
                        <div className="text-base font-black text-orange-400">{selectedPlayerUnit.kills}</div>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Firepower Rating:</span>
                        <span className="text-white font-bold">{selectedPlayerUnit.firepower}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Armor Thickness:</span>
                        <span className="text-white font-bold">{selectedPlayerUnit.armor}% RHAe</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Armor Penetration:</span>
                        <span className="text-white font-bold">{selectedPlayerUnit.penetration}mm</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Traverse Speed:</span>
                        <span className="text-white font-bold">{selectedPlayerUnit.speed} km/h</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Enemy Unit Card */}
                  <div className="bg-black/40 border border-red-500/30 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <div>
                        <div className="text-sm font-black text-red-400">{selectedEnemyUnit.name}</div>
                        <div className="text-[10px] text-slate-400">{selectedEnemyUnit.role}</div>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-black uppercase ${
                          selectedEnemyUnit.destroyed
                            ? 'bg-red-950 text-red-400 border border-red-500/30'
                            : 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {selectedEnemyUnit.destroyed
                          ? `Killed at ${selectedEnemyUnit.timeOfDeathSec?.toFixed(1) || '?'}s`
                          : 'Survived Mission'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 bg-white/5 rounded-lg">
                        <div className="text-[10px] text-slate-400 uppercase">Damage Dealt</div>
                        <div className="text-base font-black text-white">{selectedEnemyUnit.damageDealt}</div>
                      </div>
                      <div className="p-2 bg-white/5 rounded-lg">
                        <div className="text-[10px] text-slate-400 uppercase">Damage Absorbed</div>
                        <div className="text-base font-black text-white">{selectedEnemyUnit.damageTaken}</div>
                      </div>
                      <div className="p-2 bg-white/5 rounded-lg">
                        <div className="text-[10px] text-slate-400 uppercase">Gunnery Accuracy</div>
                        <div className="text-base font-black text-red-400">
                          {selectedEnemyUnit.shotsFired > 0
                            ? `${Math.round(
                                (selectedEnemyUnit.hitsLanded / selectedEnemyUnit.shotsFired) * 100
                              )}%`
                            : '0%'}
                        </div>
                      </div>
                      <div className="p-2 bg-white/5 rounded-lg">
                        <div className="text-[10px] text-slate-400 uppercase">Kills Confirmed</div>
                        <div className="text-base font-black text-orange-400">{selectedEnemyUnit.kills}</div>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Firepower Rating:</span>
                        <span className="text-white font-bold">{selectedEnemyUnit.firepower}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Armor Thickness:</span>
                        <span className="text-white font-bold">{selectedEnemyUnit.armor}% RHAe</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Armor Penetration:</span>
                        <span className="text-white font-bold">{selectedEnemyUnit.penetration}mm</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Traverse Speed:</span>
                        <span className="text-white font-bold">{selectedEnemyUnit.speed} km/h</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 4: TACTICAL DEBRIEF & ADVICE
        ======================================================== */}
        {activeTab === 'debrief' && (
          <div className="space-y-4">
            <div className="bg-[#111714] border border-white/10 rounded-xl p-4 sm:p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                <FileText className="w-5 h-5 text-orange-400" />
                <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
                  TACTICAL INTELLIGENCE COMMANDER DEBRIEF
                </h3>
              </div>

              <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
                  <h4 className="text-orange-400 font-bold uppercase text-[11px] mb-1">
                    1. ENGAGEMENT OUTCOME ANALYSIS
                  </h4>
                  <p>
                    {report.result === 'victory'
                      ? `Decisive victory achieved in ${report.durationSec.toFixed(1)} seconds. Player squad focused fire successfully on high-value targets, eliminating opposing heavy armor before hostile artillery could saturate the defensive perimeter.`
                      : `Defeat sustained after ${report.durationSec.toFixed(1)} seconds of heavy skirmishing. Hostile battlegroup breached frontal lines by exploiting higher composite armor resilience and concentrated volley fire.`}
                  </p>
                </div>

                <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
                  <h4 className="text-orange-400 font-bold uppercase text-[11px] mb-1">
                    2. IDENTIFIED OPPOSING VULNERABILITIES &amp; THREATS
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-slate-300">
                    <li>
                      <strong>Armor Dispersion:</strong> Enemy IFVs and artillery lack secondary reactive tiles. High-explosive 155mm airbursts yielded 35% higher collateral damage on light vehicles.
                    </li>
                    <li>
                      <strong>Engagement Distance:</strong> Hostile heavy MBT main guns operate at optimal efficiency within 320m. Keeping combat spacing at 400m+ forces their fire into deflection arcs.
                    </li>
                    <li>
                      <strong>Electronics Susceptibility:</strong> Tactical EMP call-ins successfully disabled hostile fire control systems for 4.0 critical seconds during mid-battle.
                    </li>
                  </ul>
                </div>

                <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
                  <h4 className="text-orange-400 font-bold uppercase text-[11px] mb-1">
                    3. RECOMMENDED UPGRADE PATHWAYS
                  </h4>
                  <p>
                    Visit the <strong>Base Workshop (6 Categories)</strong> to invest Munitions and Alloy into:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    <div className="p-2 bg-black/40 rounded border border-white/5">
                      <span className="text-emerald-400 font-bold">Lethality Tier Upgrade:</span> Boosts raw APFSDS kinetic penetration to guarantee hull penetrations against T-90M glacis.
                    </div>
                    <div className="p-2 bg-black/40 rounded border border-white/5">
                      <span className="text-emerald-400 font-bold">Survivability Tier Upgrade:</span> Mounts double-layer ERA tiles to mitigate hostile tandem ATGM damage.
                    </div>
                  </div>
                </div>

                {/* Salvage Summary */}
                <div className="p-3 bg-orange-950/30 border border-orange-500/30 rounded-xl flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] text-orange-400 font-black uppercase tracking-wider block">
                      SALVAGE &amp; BONDS RECOVERED:
                    </span>
                    <span className="text-slate-200 text-xs font-bold">
                      Battlefield assets credited to Base Vault inventory.
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-mono font-bold">
                    <span className="text-blue-400">+{report.salvageRecovered.fuel} Fuel</span>
                    <span className="text-red-400">+{report.salvageRecovered.munitions} Munitions</span>
                    <span className="text-cyan-400">+{report.salvageRecovered.alloy} Alloy</span>
                    <span className="text-yellow-400">+{report.salvageRecovered.warBonds} Bonds</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer Controls */}
      <footer className="border-t border-white/10 bg-[#090d0b]/95 p-4 sticky bottom-0 z-30">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            Recorded via Central Tactical Ballistics Telemetry &bull; Mil-Std 2045 Frame Telemetry
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                soundFx.playRadioChirp();
                onReplayBattle();
              }}
              className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-black uppercase tracking-wider transition-colors"
            >
              REPLAY SIMULATION
            </button>
            <button
              onClick={() => {
                soundFx.playRadioChirp();
                onClose();
              }}
              className="px-6 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-orange-950/50 transition-all active:scale-95"
            >
              RETURN TO COMMAND CENTER
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
