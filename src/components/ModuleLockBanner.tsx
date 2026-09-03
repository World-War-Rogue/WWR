import React from 'react';
import { Lock, Unlock, AlertTriangle, ShieldCheck, Terminal } from 'lucide-react';
import { ModuleLockState, DeveloperSeat } from '../types/devOps';
import { soundFx } from '../utils/audio';

interface ModuleLockBannerProps {
  lockState: ModuleLockState | undefined;
  currentDev: DeveloperSeat | undefined;
  onOpenDevOps: () => void;
}

export const ModuleLockBanner: React.FC<ModuleLockBannerProps> = ({
  lockState,
  currentDev,
  onOpenDevOps,
}) => {
  if (!lockState) return null;

  const isLockedByMe = lockState.isLocked && lockState.lockedByDevId === currentDev?.id;
  const isLockedByOther = lockState.isLocked && lockState.lockedByDevId !== currentDev?.id;

  if (isLockedByOther) {
    return (
      <div className="bg-gradient-to-r from-red-950/90 via-red-900/60 to-black border-y sm:border border-red-500/80 px-4 py-2.5 sm:rounded-xl mb-3 shadow-lg shadow-red-950/40 font-mono text-xs animate-pulse">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-red-200">
            <Lock className="w-4 h-4 text-red-400 shrink-0" />
            <div>
              <span className="font-black text-white uppercase tracking-wider">
                [MUTEX LOCK ACTIVE] READ-ONLY MODE:
              </span>{' '}
              <span>
                Locked by <strong className="text-red-300">[{lockState.lockedByName}]</strong> for:{' '}
                <em>"{lockState.taskDescription}"</em>. Changes disabled to prevent merge conflicts.
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              soundFx.playRadioChirp();
              onOpenDevOps();
            }}
            className="px-3 py-1 rounded bg-red-600 hover:bg-red-500 text-white font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5 self-start sm:self-auto cursor-pointer transition-colors shrink-0"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Manage in Dev Ops</span>
          </button>
        </div>
      </div>
    );
  }

  if (isLockedByMe) {
    return (
      <div className="bg-gradient-to-r from-amber-950/80 via-[#18140c] to-black border-y sm:border border-amber-500/60 px-4 py-2 sm:rounded-xl mb-3 shadow-md font-mono text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-amber-200">
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <span className="font-black text-amber-300 uppercase tracking-wider">
                EXCLUSIVELY CHECKED OUT TO YOU:
              </span>{' '}
              <span>"{lockState.taskDescription}" — You have exclusive write authority.</span>
            </div>
          </div>
          <button
            onClick={() => {
              soundFx.playRadioChirp();
              onOpenDevOps();
            }}
            className="px-3 py-1 rounded bg-amber-700 hover:bg-amber-600 text-white font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5 self-start sm:self-auto cursor-pointer transition-colors shrink-0"
          >
            <Unlock className="w-3.5 h-3.5" />
            <span>Release in Dev Ops</span>
          </button>
        </div>
      </div>
    );
  }

  // When unlocked / available
  return (
    <div className="bg-black/40 border border-white/10 px-3 py-1.5 rounded-lg mb-2 flex items-center justify-between text-[11px] font-mono text-slate-400">
      <div className="flex items-center gap-2">
        <Unlock className="w-3.5 h-3.5 text-emerald-400" />
        <span>
          Subsystem Status: <strong className="text-emerald-400 font-bold">UNLOCKED / AVAILABLE</strong> (Rev #{lockState.revision})
        </span>
      </div>
      <button
        onClick={() => {
          soundFx.playRadioChirp();
          onOpenDevOps();
        }}
        className="text-[10px] text-orange-400 hover:text-orange-300 uppercase font-bold flex items-center gap-1 cursor-pointer transition-colors"
      >
        <Lock className="w-3 h-3" />
        <span>Claim Area Lock</span>
      </button>
    </div>
  );
};
