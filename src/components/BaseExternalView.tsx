import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  Zap,
  Flame,
  Radio,
  Crosshair,
  Wrench,
  AlertTriangle,
  Play,
  Compass,
  ArrowRight,
  Eye,
  Activity,
  Wind,
  Layers,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { BaseBuilding, PlayerProfile, SeasonTheater } from '../types';
import { soundFx } from '../utils/audio';
import { ModuleLockState, DeveloperSeat } from '../types/devOps';
import { ModuleLockBanner } from './ModuleLockBanner';

interface BaseExternalViewProps {
  buildings: BaseBuilding[];
  onUpgradeBuilding: (id: string) => void;
  onRepairBase: () => void;
  profile: PlayerProfile;
  activeSeason: SeasonTheater;
  onTriggerSurvivalWave: () => void;
  isSimulatingWave: boolean;
  onNavigateToInternal: () => void;
  lockState?: ModuleLockState;
  currentDev?: DeveloperSeat;
  onOpenDevOps?: () => void;
}

interface PerimeterThreat {
  id: string;
  angle: number; // in radians
  distance: number; // 0 to 1 relative to radar
  type: 'drone' | 'shell' | 'tank_platoon';
  label: string;
  speed: number;
  hp: number;
  intercepted: boolean;
}

export const BaseExternalView: React.FC<BaseExternalViewProps> = ({
  buildings,
  onUpgradeBuilding,
  onRepairBase,
  profile,
  activeSeason,
  onTriggerSurvivalWave,
  isSimulatingWave,
  onNavigateToInternal,
  lockState,
  currentDev,
  onOpenDevOps,
}) => {
  const isReadOnly = Boolean(lockState?.isLocked && lockState.lockedByDevId !== currentDev?.id);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('bldg_hq');
  const [radarThreats, setRadarThreats] = useState<PerimeterThreat[]>([]);
  const [radarAngle, setRadarAngle] = useState(0);
  const [activeInterceptions, setActiveInterceptions] = useState<
    Array<{ x: number; y: number; id: string }>
  >([]);
  const radarCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const selectedBuilding = buildings.find((b) => b.id === selectedBuildingId) || buildings[0];

  // Radar threat simulation loop
  useEffect(() => {
    // Initial threats
    const initialThreats: PerimeterThreat[] = [
      { id: 't1', angle: 0.8, distance: 0.75, type: 'drone', label: 'Hostile Recon Swarm', speed: 0.002, hp: 40, intercepted: false },
      { id: 't2', angle: 2.4, distance: 0.9, type: 'shell', label: 'Inbound 152mm Salvo', speed: 0.006, hp: 10, intercepted: false },
      { id: 't3', angle: 4.1, distance: 0.82, type: 'tank_platoon', label: 'Armored Spearhead', speed: 0.001, hp: 120, intercepted: false },
    ];
    setRadarThreats(initialThreats);

    const interval = setInterval(() => {
      setRadarAngle((prev) => (prev + 0.04) % (Math.PI * 2));

      setRadarThreats((prev) =>
        prev
          .map((t) => {
            if (t.intercepted) return t;
            const newDist = t.distance - t.speed;
            // Interception by CIWS/Phalanx when close
            if (newDist < 0.28 && !t.intercepted) {
              soundFx.playAutocannon();
              return { ...t, intercepted: true, distance: newDist };
            }
            return { ...t, distance: Math.max(0.1, newDist) };
          })
          .filter((t) => !t.intercepted || Math.random() > 0.1)
      );
    }, 50);

    return () => clearInterval(interval);
  }, []);

  // Spawn new threat periodically
  useEffect(() => {
    const spawner = setInterval(() => {
      if (radarThreats.length < 5) {
        const types: Array<'drone' | 'shell' | 'tank_platoon'> = ['drone', 'shell', 'tank_platoon'];
        const chosen = types[Math.floor(Math.random() * types.length)];
        const newT: PerimeterThreat = {
          id: `t_${Date.now()}`,
          angle: Math.random() * Math.PI * 2,
          distance: 0.95,
          type: chosen,
          label: chosen === 'drone' ? 'FPV Kamikaze Drone' : chosen === 'shell' ? 'Howitzer Artillery' : 'Hostile IFV Scout',
          speed: chosen === 'shell' ? 0.008 : chosen === 'drone' ? 0.004 : 0.002,
          hp: chosen === 'shell' ? 10 : chosen === 'drone' ? 30 : 90,
          intercepted: false,
        };
        setRadarThreats((prev) => [...prev, newT]);
      }
    }, 6000);

    return () => clearInterval(spawner);
  }, [radarThreats.length]);

  // Render radar sweep on 2D canvas
  useEffect(() => {
    const canvas = radarCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const radius = width / 2 - 12;

    ctx.clearRect(0, 0, width, height);

    // Radar background circles
    ctx.strokeStyle = 'rgba(234, 88, 12, 0.25)';
    ctx.lineWidth = 1;
    [0.25, 0.5, 0.75, 1].forEach((factor) => {
      ctx.beginPath();
      ctx.arc(cx, cy, radius * factor, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Crosshairs
    ctx.beginPath();
    ctx.moveTo(cx - radius, cy);
    ctx.lineTo(cx + radius, cy);
    ctx.moveTo(cx, cy - radius);
    ctx.lineTo(cx, cy + radius);
    ctx.strokeStyle = 'rgba(234, 88, 12, 0.2)';
    ctx.stroke();

    // Sweep line & cone
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(radarAngle);

    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    grad.addColorStop(0, 'rgba(234, 88, 12, 0.4)');
    grad.addColorStop(1, 'rgba(234, 88, 12, 0.0)');

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, -0.4, 0);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(radius, 0);
    ctx.strokeStyle = 'rgba(249, 115, 22, 0.9)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // Center base icon / point
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();

    // Threats
    radarThreats.forEach((t) => {
      const tx = cx + Math.cos(t.angle) * (t.distance * radius);
      const ty = cy + Math.sin(t.angle) * (t.distance * radius);

      if (t.intercepted) {
        ctx.fillStyle = '#ef4444';
        ctx.font = '10px monospace';
        ctx.fillText('DESTROYED', tx - 25, ty - 8);
      } else {
        ctx.fillStyle = t.type === 'shell' ? '#ef4444' : t.type === 'drone' ? '#f59e0b' : '#38bdf8';
        ctx.beginPath();
        ctx.arc(tx, ty, 4, 0, Math.PI * 2);
        ctx.fill();

        // Pulsing ring
        ctx.strokeStyle = ctx.fillStyle;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(tx, ty, 8, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = '9px monospace';
        ctx.fillText(t.label, tx + 8, ty + 3);
      }
    });
  }, [radarAngle, radarThreats]);

  const getBuildingIcon = (type: string) => {
    switch (type) {
      case 'hq':
        return <Shield className="w-5 h-5 text-emerald-400" />;
      case 'phalanx_ciws':
        return <Crosshair className="w-5 h-5 text-red-400" />;
      case 'howitzer':
        return <Flame className="w-5 h-5 text-amber-400" />;
      case 'sam_battery':
        return <Radio className="w-5 h-5 text-blue-400" />;
      case 'generator':
        return <Zap className="w-5 h-5 text-yellow-400" />;
      default:
        return <Wrench className="w-5 h-5 text-slate-300" />;
    }
  };

  const canAffordUpgrade = (bldg: BaseBuilding) => {
    return (
      profile.resources.fuel >= bldg.upgradeCost.fuel &&
      profile.resources.alloy >= bldg.upgradeCost.alloy &&
      profile.resources.munitions >= bldg.upgradeCost.munitions
    );
  };

  return (
    <div className="flex-1 p-3 sm:p-5 flex flex-col gap-4 max-w-7xl mx-auto w-full font-sans">
      {/* Mutex Area Lockout Banner */}
      <ModuleLockBanner
        lockState={lockState}
        currentDev={currentDev}
        onOpenDevOps={onOpenDevOps || (() => {})}
      />

      {/* Primary Transition Banner: Connects External Base to Internal Base */}
      <div className="bg-gradient-to-r from-orange-950/60 via-black/80 to-slate-900/60 border border-orange-500/40 rounded-2xl p-4 sm:p-5 shadow-2xl backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-orange-600/20 border border-orange-500/50 flex items-center justify-center text-orange-400 shadow-lg shadow-orange-950/40">
            <Compass className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-orange-500">
                PRIMARY VIEW 1 OF 2
              </span>
              <span className="bg-orange-600 text-white text-[10px] font-black px-2 py-0.5 rounded font-mono uppercase tracking-wider">
                EXTERNAL BASE PERIMETER
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight mt-0.5">
              Forward Operating Base (FOB) Alpha // Surface Perimeter
            </h1>
            <p className="text-xs text-slate-400 max-w-2xl mt-0.5">
              Defend the 5x5 fortified hardpoint grid, monitor 360° incoming perimeter threats, and maintain surface defenses. Access the underground workshop for all 6 equipment upgrade categories.
            </p>
          </div>
        </div>

        {/* Big Hatch Button to Enter Internal Base */}
        <button
          onClick={() => {
            soundFx.playRadioChirp();
            onNavigateToInternal();
          }}
          className="w-full md:w-auto bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-black text-xs uppercase tracking-widest px-6 py-3.5 rounded-xl shadow-xl shadow-orange-950/50 border border-amber-400/40 transition-all transform active:scale-95 flex items-center justify-center gap-3 cursor-pointer group"
          title="Enter the internal command bunker to work on upgrades, change gear, and sign into events"
        >
          <div className="text-left">
            <div className="text-[10px] text-amber-200 tracking-wider">PRIMARY VIEW 2 OF 2</div>
            <div className="font-sans font-black text-sm">ENTER BASE INTERIOR</div>
          </div>
          <ArrowRight className="w-5 h-5 text-white group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Surface Status, Radar & Survival Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left 4 Cols: Live 360° Perimeter Radar Interception */}
        <div className="lg:col-span-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl flex flex-col justify-between font-mono">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase">
              <Eye className="w-4 h-4 text-orange-400" />
              <span>360° Perimeter Early Warning Radar</span>
            </div>
            <span className="text-[10px] text-green-400 font-bold px-1.5 py-0.5 rounded bg-green-950/40 border border-green-500/30">
              ACTIVE SCAN
            </span>
          </div>

          {/* Radar Canvas */}
          <div className="flex items-center justify-center my-3 relative">
            <canvas
              ref={radarCanvasRef}
              width={260}
              height={260}
              className="rounded-full bg-black/60 border border-orange-500/30 shadow-[0_0_20px_rgba(234,88,12,0.15)]"
            />
            <div className="absolute bottom-2 text-[10px] text-slate-400 bg-black/70 px-2 py-0.5 rounded border border-white/10">
              Sweep Range: 15.0 km
            </div>
          </div>

          {/* Incoming Threat Log */}
          <div className="bg-black/50 border border-white/10 rounded-xl p-2.5 text-xs">
            <div className="text-[10px] font-bold text-orange-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Detected Inbound Vectors:</span>
              <span>{radarThreats.filter((t) => !t.intercepted).length} Hostile</span>
            </div>
            <div className="flex flex-col gap-1 max-h-24 overflow-y-auto">
              {radarThreats.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between text-[11px] p-1 rounded bg-white/5"
                >
                  <span className={t.intercepted ? 'text-slate-500 line-through' : 'text-slate-200'}>
                    {t.label}
                  </span>
                  <span className={t.intercepted ? 'text-green-400 font-bold' : 'text-orange-400 font-bold'}>
                    {t.intercepted ? 'INTERCEPTED' : `${(t.distance * 15).toFixed(1)} km`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center/Right 8 Cols: Base Fortifications & Tactical Controls */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {/* Top Bar with Theater, Integrity, and Survival Wave Drill */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl flex flex-wrap items-center justify-between gap-3 font-mono">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/10">
                <Shield className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <div className="text-xs text-slate-400 uppercase">THEATER OF OPERATIONS</div>
                <div className="text-sm font-black text-white flex items-center gap-2">
                  <span>{activeSeason.name}</span>
                  <span className="text-xs text-orange-400 font-bold">({activeSeason.terrainType})</span>
                </div>
              </div>
            </div>

            {/* Base Integrity Bar */}
            <div className="flex items-center gap-3 bg-black/40 px-3.5 py-2 rounded-xl border border-white/10">
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">STRUCTURAL INTEGRITY</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        profile.baseIntegrity > 60
                          ? 'bg-orange-500'
                          : profile.baseIntegrity > 30
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${profile.baseIntegrity}%` }}
                    />
                  </div>
                  <span className="text-xs font-black text-white">{profile.baseIntegrity}%</span>
                </div>
              </div>
            </div>

            {/* Actions: Repair & Survival Drill */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onRepairBase();
                  soundFx.playStructureCollapse();
                }}
                disabled={profile.baseIntegrity >= 100 || profile.resources.alloy < 200}
                className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed border border-white/10 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Repair surface fortifications using 200 Alloy"
              >
                <Wrench className="w-3.5 h-3.5 text-cyan-400" />
                <span>REPAIR (-200 ALLOY)</span>
              </button>

              <button
                onClick={() => {
                  soundFx.playAlarm();
                  onTriggerSurvivalWave();
                }}
                disabled={isSimulatingWave}
                className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-orange-950/40 transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 text-white" />
                <span>{isSimulatingWave ? 'REPULSING WAVE...' : 'SURVIVAL DRILL'}</span>
              </button>
            </div>
          </div>

          {/* 5x5 Hardpoint Perimeter Fortification Grid */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl flex flex-col flex-1">
            <div className="flex items-center justify-between mb-3 font-mono text-xs text-slate-400">
              <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-300">
                <Compass className="w-3.5 h-3.5 text-orange-400" />
                EXTERIOR PERIMETER GRID // 5x5 DEFENSIVE HARDPOINTS
              </span>
              <span className="text-orange-500 font-black text-[10px] tracking-widest uppercase">
                CLICK TO INSPECT / UPGRADE
              </span>
            </div>

            {/* 5x5 Grid */}
            <div className="grid grid-cols-5 gap-2.5 sm:gap-3 flex-1 min-h-[340px] p-3 bg-black/40 backdrop-blur-sm rounded-xl border border-white/10">
              {Array.from({ length: 25 }).map((_, idx) => {
                const gridX = idx % 5;
                const gridY = Math.floor(idx / 5);
                const buildingHere = buildings.find((b) => b.x === gridX && b.y === gridY);
                const isSelected = buildingHere?.id === selectedBuildingId;

                if (buildingHere) {
                  return (
                    <button
                      key={buildingHere.id}
                      onClick={() => {
                        setSelectedBuildingId(buildingHere.id);
                        soundFx.playRadioChirp();
                      }}
                      className={`relative p-2 rounded-xl border transition-all flex flex-col items-center justify-between select-none cursor-pointer ${
                        isSelected
                          ? 'bg-white/15 border-orange-500 ring-2 ring-orange-500/40 shadow-lg shadow-orange-950/40 text-white'
                          : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10 text-slate-300'
                      }`}
                    >
                      <div className="w-full flex items-center justify-between text-[9px] font-mono">
                        <span className="text-slate-400 font-bold">LVL {buildingHere.level}</span>
                        <span className="text-orange-400 font-black">{buildingHere.hp} HP</span>
                      </div>

                      <div className="my-1 p-2 rounded-lg bg-black/50 border border-white/10">
                        {getBuildingIcon(buildingHere.type)}
                      </div>

                      <div className="text-[10px] font-mono font-black text-white text-center truncate w-full leading-tight uppercase">
                        {buildingHere.name}
                      </div>

                      <div className="w-full h-1 bg-black/40 rounded-full mt-1 overflow-hidden">
                        <div
                          className="h-full bg-orange-500"
                          style={{ width: `${(buildingHere.hp / buildingHere.maxHp) * 100}%` }}
                        />
                      </div>
                    </button>
                  );
                }

                return (
                  <div
                    key={idx}
                    className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-2 flex flex-col items-center justify-center text-slate-600 hover:border-white/20 transition-colors"
                  >
                    <span className="text-[9px] font-mono text-slate-500">[{gridX},{gridY}]</span>
                    <span className="text-[8px] text-slate-500 font-mono mt-0.5 uppercase tracking-wider">
                      REVETMENT
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Selected Hardpoint Inspector and Upgrade Dossier */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-5 shadow-2xl font-mono flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-black/40 border border-white/10">
            {getBuildingIcon(selectedBuilding.type)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-base text-white uppercase">{selectedBuilding.name}</h3>
              <span className="text-xs px-2 py-0.5 rounded bg-orange-950/60 text-orange-400 border border-orange-500/30 font-bold uppercase">
                LEVEL {selectedBuilding.level} HARDPOINT
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">{selectedBuilding.description}</p>
          </div>
        </div>

        {/* Upgrade Cost and Action */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-3 text-xs bg-black/40 px-3.5 py-2 rounded-xl border border-white/10">
            <span className="text-slate-400 font-bold">UPGRADE COST:</span>
            <span className="text-blue-400 font-bold">Fuel: {selectedBuilding.upgradeCost.fuel}</span>
            <span className="text-cyan-400 font-bold">Alloy: {selectedBuilding.upgradeCost.alloy}</span>
            <span className="text-red-400 font-bold">Ammo: {selectedBuilding.upgradeCost.munitions}</span>
          </div>

          <button
            onClick={() => {
              onUpgradeBuilding(selectedBuilding.id);
              soundFx.playRadioChirp();
            }}
            disabled={!canAffordUpgrade(selectedBuilding)}
            className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-orange-950/40 cursor-pointer"
          >
            UPGRADE HARDPOINT
          </button>
        </div>
      </div>
    </div>
  );
};
