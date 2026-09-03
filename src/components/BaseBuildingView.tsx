import React, { useState } from 'react';
import {
  Shield,
  Zap,
  Flame,
  Radio,
  Crosshair,
  Wrench,
  AlertTriangle,
  Play,
  CheckCircle2,
  Lock,
  Compass,
} from 'lucide-react';
import { BaseBuilding, PlayerProfile, SeasonTheater } from '../types';
import { soundFx } from '../utils/audio';

interface BaseBuildingViewProps {
  buildings: BaseBuilding[];
  onUpgradeBuilding: (id: string) => void;
  onRepairBase: () => void;
  profile: PlayerProfile;
  activeSeason: SeasonTheater;
  onTriggerSurvivalWave: () => void;
  isSimulatingWave: boolean;
}

export const BaseBuildingView: React.FC<BaseBuildingViewProps> = ({
  buildings,
  onUpgradeBuilding,
  onRepairBase,
  profile,
  activeSeason,
  onTriggerSurvivalWave,
  isSimulatingWave,
}) => {
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('bldg_hq');

  const selectedBuilding = buildings.find((b) => b.id === selectedBuildingId) || buildings[0];

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
    <div className="flex-1 p-3 sm:p-5 flex flex-col gap-4 max-w-7xl mx-auto w-full">
      {/* Top Threat & Survival Status Bar */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-2xl flex flex-wrap items-center justify-between gap-4 font-mono">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-orange-600/20 border border-orange-500/40 flex items-center justify-center text-orange-400 shadow-md">
            <Shield className="w-6 h-6 text-orange-400" />
          </div>
          <div>
            <div className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-wide">
              <span>FORWARD OPERATING BASE (FOB) ALPHA</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-black/40 text-orange-400 border border-orange-500/30 font-bold uppercase">
                FORTIFIED GRID 5x5
              </span>
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
              <span>Theater: {activeSeason.name}</span>
              <span>•</span>
              <span className="text-orange-400 font-bold">{activeSeason.terrainType}</span>
            </div>
          </div>
        </div>

        {/* Survival Metrics */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="bg-black/40 backdrop-blur-md px-3.5 py-2 rounded-lg border border-white/10">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">BASE INTEGRITY</div>
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
              <span className="text-sm font-black text-white">{profile.baseIntegrity}%</span>
            </div>
          </div>

          <div className="bg-black/40 backdrop-blur-md px-3.5 py-2 rounded-lg border border-white/10">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">POWER GRID CAPACITY</div>
            <div className="text-sm font-black text-orange-400 flex items-center gap-1.5 mt-0.5">
              <Zap className="w-3.5 h-3.5" />
              <span>{profile.powerGridMw} MW ONLINE</span>
            </div>
          </div>

          {/* Base Repair Action */}
          <button
            onClick={() => {
              onRepairBase();
              soundFx.playStructureCollapse();
            }}
            disabled={profile.baseIntegrity >= 100 || profile.resources.alloy < 200}
            className="px-3.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed border border-white/10 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
            title="Repair base fortifications (Requires 200 Titanium Alloy)"
          >
            <Wrench className="w-4 h-4 text-cyan-400" />
            <span>REPAIR ALLOY (-200)</span>
          </button>

          {/* Trigger Survival Test Wave Button */}
          <button
            onClick={() => {
              soundFx.playAlarm();
              onTriggerSurvivalWave();
            }}
            disabled={isSimulatingWave}
            className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-orange-950/40 transition-all active:scale-95 disabled:opacity-60"
          >
            <Play className="w-4 h-4 text-white" />
            <span>{isSimulatingWave ? 'REPULSING INCOMING WAVE...' : 'SURVIVAL DRILL: ROGUE WAVE'}</span>
          </button>
        </div>
      </div>

      {/* Main Base Fortification Grid and Building Details Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: Interactive 5x5 Tactical Grid */}
        <div className="lg:col-span-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-5 shadow-2xl relative overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-3 font-mono text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-300">
              <Compass className="w-3.5 h-3.5 text-orange-400" />
              PERIMETER DEFENSE SECTOR // MGRS 38S MB 4392 9182
            </span>
            <span className="text-orange-500 font-black text-[10px] tracking-widest uppercase">
              CLICK ANY BUILDING TO INSPECT
            </span>
          </div>

          {/* 5x5 Grid representation */}
          <div className="grid grid-cols-5 gap-2.5 sm:gap-3 flex-1 min-h-[380px] p-2.5 bg-black/40 backdrop-blur-sm rounded-xl border border-white/10">
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
                    className={`relative p-2.5 rounded-xl border transition-all flex flex-col items-center justify-between select-none ${
                      isSelected
                        ? 'bg-white/15 border-orange-500 ring-2 ring-orange-500/40 shadow-lg shadow-orange-950/40 text-white'
                        : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10 text-slate-300'
                    }`}
                  >
                    {/* Top status indicator */}
                    <div className="w-full flex items-center justify-between text-[10px] font-mono">
                      <span className="text-slate-400 font-bold">LVL {buildingHere.level}</span>
                      <span className="text-orange-400 font-black">{buildingHere.hp} HP</span>
                    </div>

                    <div className="my-1.5 p-2 rounded-lg bg-black/40 border border-white/10">
                      {getBuildingIcon(buildingHere.type)}
                    </div>

                    <div className="text-[11px] font-mono font-black text-white text-center truncate w-full leading-tight uppercase">
                      {buildingHere.name}
                    </div>

                    {/* Health mini-bar */}
                    <div className="w-full h-1 bg-black/40 rounded-full mt-1.5 overflow-hidden">
                      <div
                        className="h-full bg-orange-500"
                        style={{ width: `${(buildingHere.hp / buildingHere.maxHp) * 100}%` }}
                      />
                    </div>
                  </button>
                );
              }

              // Empty perimeter ground slot
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-2 flex flex-col items-center justify-center text-slate-600 hover:border-white/20 transition-colors"
                >
                  <span className="text-[10px] font-mono text-slate-500">[{gridX},{gridY}]</span>
                  <span className="text-[9px] text-slate-500 font-mono mt-0.5 uppercase tracking-wider">REVETMENT</span>
                </div>
              );
            })}
          </div>

          {/* Destructible Environment Legend & Defense Notice */}
          <div className="mt-3 bg-black/40 border border-white/10 rounded-xl p-2.5 flex items-center justify-between text-xs font-mono text-slate-400 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-400" />
              <span className="text-slate-300">Ballistic defenses intercept 85% of standard rockets &amp; artillery.</span>
            </div>
            <span className="text-orange-500 font-black text-[10px] tracking-widest uppercase hidden sm:inline">
              DESTRUCTIBLE HARDPOINTS ACTIVE
            </span>
          </div>
        </div>

        {/* Right 1 Col: Selected Building Inspection & Upgrade Dossier */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col justify-between font-mono">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-black/40 border border-white/10">
                  {getBuildingIcon(selectedBuilding.type)}
                </div>
                <div>
                  <h3 className="font-black text-sm text-white uppercase">{selectedBuilding.name}</h3>
                  <div className="text-[11px] text-orange-400 font-bold uppercase tracking-wider">
                    LEVEL {selectedBuilding.level} CLASSIFIED
                  </div>
                </div>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-lg bg-black/40 text-slate-200 border border-white/10 font-bold">
                DEF: {selectedBuilding.defenseRating}
              </span>
            </div>

            <p className="text-xs text-slate-300 mt-3 leading-relaxed">
              {selectedBuilding.description}
            </p>

            {/* Current Spec Dossier */}
            <div className="mt-4 bg-black/40 rounded-xl p-3.5 border border-white/10 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold uppercase text-[11px]">Structural Integrity:</span>
                <span className="font-black text-orange-400">
                  {selectedBuilding.hp} / {selectedBuilding.maxHp} HP
                </span>
              </div>
              {selectedBuilding.range && (
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold uppercase text-[11px]">Radar / Intercept Range:</span>
                  <span className="font-black text-cyan-400">{selectedBuilding.range}m Radius</span>
                </div>
              )}
              {selectedBuilding.productionRate && (
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold uppercase text-[11px]">Resource Output:</span>
                  <span className="font-black text-amber-400">
                    +{selectedBuilding.productionRate.amountPerHour} {selectedBuilding.productionRate.resource.toUpperCase()} / hr
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold uppercase text-[11px]">Armor Thickness:</span>
                <span className="font-bold text-slate-200">Rolled Homogeneous Steel Class 4</span>
              </div>
            </div>

            {/* Upgrade Cost Box */}
            <div className="mt-4 bg-black/40 rounded-xl p-3.5 border border-white/10">
              <div className="text-[10px] text-orange-500 uppercase tracking-widest mb-2 font-black">
                Upgrade to Level {selectedBuilding.level + 1} Requisition:
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-white/5 p-2 rounded-lg border border-white/10">
                  <span className="text-[9px] block text-slate-400 font-bold uppercase">FUEL</span>
                  <span
                    className={`font-black ${
                      profile.resources.fuel >= selectedBuilding.upgradeCost.fuel
                        ? 'text-blue-400'
                        : 'text-red-400'
                    }`}
                  >
                    {selectedBuilding.upgradeCost.fuel}
                  </span>
                </div>
                <div className="bg-white/5 p-2 rounded-lg border border-white/10">
                  <span className="text-[9px] block text-slate-400 font-bold uppercase">ALLOY</span>
                  <span
                    className={`font-black ${
                      profile.resources.alloy >= selectedBuilding.upgradeCost.alloy
                        ? 'text-cyan-400'
                        : 'text-red-400'
                    }`}
                  >
                    {selectedBuilding.upgradeCost.alloy}
                  </span>
                </div>
                <div className="bg-white/5 p-2 rounded-lg border border-white/10">
                  <span className="text-[9px] block text-slate-400 font-bold uppercase">AMMO</span>
                  <span
                    className={`font-black ${
                      profile.resources.munitions >= selectedBuilding.upgradeCost.munitions
                        ? 'text-red-400'
                        : 'text-red-400'
                    }`}
                  >
                    {selectedBuilding.upgradeCost.munitions}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Upgrade Action Trigger */}
          <div className="mt-5 pt-3 border-t border-white/10">
            <button
              onClick={() => {
                onUpgradeBuilding(selectedBuilding.id);
                soundFx.playRadioChirp();
              }}
              disabled={!canAffordUpgrade(selectedBuilding)}
              className="w-full py-2.5 px-4 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:bg-white/5 disabled:text-slate-500 text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-orange-950/40 transition-all active:scale-95 disabled:cursor-not-allowed"
            >
              {canAffordUpgrade(selectedBuilding) ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>AUTHORIZE UPGRADE (+25% DEFENSE &amp; HP)</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-slate-500" />
                  <span>INSUFFICIENT RESOURCES FOR UPGRADE</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
