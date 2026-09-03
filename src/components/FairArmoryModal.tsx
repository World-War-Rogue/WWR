import React, { useState } from 'react';
import {
  ShoppingBag,
  ShieldCheck,
  Zap,
  Sparkles,
  Gift,
  CheckCircle2,
  DollarSign,
  Info,
} from 'lucide-react';
import { ARMORY_CRATES, ArmoryCrateTier } from '../utils/antiCheat';
import { soundFx } from '../utils/audio';

interface FairArmoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPurchaseCrate: (crate: ArmoryCrateTier) => void;
  claimedDaily: boolean;
}

export const FairArmoryModal: React.FC<FairArmoryModalProps> = ({
  isOpen,
  onClose,
  onPurchaseCrate,
  claimedDaily,
}) => {
  const [purchasedId, setPurchasedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleBuy = (crate: ArmoryCrateTier) => {
    soundFx.playRadioChirp();
    setPurchasedId(crate.id);
    onPurchaseCrate(crate);
    setTimeout(() => {
      setPurchasedId(null);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-3 sm:p-5 font-mono">
      <div className="bg-[#0d1210]/95 backdrop-blur-2xl border border-white/15 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-black/40 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600/20 border border-orange-500/40 flex items-center justify-center text-orange-400 shadow-md">
              <ShoppingBag className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-wide">
                <span>TACTICAL UPGRADE ARMORY &amp; SUPPLY DROPS</span>
                <span className="text-[10px] text-orange-400 bg-orange-600/20 px-2 py-0.5 rounded border border-orange-500/40 font-bold uppercase">
                  FAIR PLAY CHARTER
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Micro-costs reduced by up to 95% compared to Last War. No predatory $99 packs.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white text-xs font-bold uppercase"
          >
            ✕ CLOSE
          </button>
        </div>

        {/* Fair Monetization Philosophy Notice */}
        <div className="bg-white/5 border-b border-white/10 p-3.5 px-4 flex items-start gap-2.5 text-xs text-slate-300 backdrop-blur-md">
          <Info className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-white uppercase tracking-wider">DESIGN MANDATE: </span>
            Upgrades boost squad armor, firepower, and technology progression. However, costs are kept between{' '}
            <span className="text-orange-400 font-bold">$0.99 and $4.99</span>, with 100% free daily drops. F2P players can use ballistic ricochets, flanking positions, and smoke to outmaneuver paying squads!
          </div>
        </div>

        {/* Tiers Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-black/40">
          {ARMORY_CRATES.map((crate) => {
            const isDaily = crate.isDailyFree;
            const isClaimed = isDaily && claimedDaily;
            const isPurchased = purchasedId === crate.id;

            return (
              <div
                key={crate.id}
                className={`rounded-xl p-4 border transition-all flex flex-col justify-between backdrop-blur-md ${
                  isDaily
                    ? 'bg-white/10 border-orange-500/50 shadow-lg shadow-orange-950/30'
                    : 'bg-white/5 border-white/10 hover:border-white/20'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-white/10">
                    <div>
                      <div className="font-black text-sm text-white uppercase">{crate.name}</div>
                      {crate.badge && (
                        <span className="text-[10px] font-bold text-orange-400 bg-orange-600/20 px-2 py-0.5 rounded border border-orange-500/40 mt-1 inline-block uppercase">
                          {crate.badge}
                        </span>
                      )}
                    </div>

                    <div className="text-right">
                      <div className="text-base font-black text-orange-400">
                        {crate.priceUsd === 0 ? 'FREE' : `${crate.priceUsd.toFixed(2)}`}
                      </div>
                      {crate.lastWarCostComparison > 0 && (
                        <div className="text-[10px] text-slate-500 line-through">
                          Last War: ${crate.lastWarCostComparison.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 my-2.5 leading-relaxed">
                    {crate.description}
                  </p>

                  {/* Guaranteed Supplies Yield */}
                  <div className="bg-black/40 rounded-xl p-3 border border-white/10 space-y-1.5 text-xs">
                    <div className="flex justify-between font-bold text-yellow-400">
                      <span>War Bonds:</span>
                      <span>+{crate.warBondsYield}</span>
                    </div>
                    <div className="flex justify-between text-cyan-300 font-bold">
                      <span>Titanium Alloy:</span>
                      <span>+{crate.bonusAlloy.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-blue-400 font-bold">
                      <span>Refined Fuel:</span>
                      <span>+{crate.bonusFuel.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-red-400 font-bold">
                      <span>Munitions:</span>
                      <span>+{crate.bonusMunitions.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Purchase Button */}
                <div className="mt-4 pt-3 border-t border-white/10">
                  <button
                    onClick={() => handleBuy(crate)}
                    disabled={isClaimed}
                    className={`w-full py-2.5 px-3 rounded-lg font-black text-xs uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-md ${
                      isClaimed
                        ? 'bg-white/5 text-slate-500 cursor-not-allowed border border-white/5'
                        : isDaily
                        ? 'bg-orange-600 hover:bg-orange-500 text-white shadow-orange-950/40'
                        : 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white shadow-orange-950/40'
                    }`}
                  >
                    {isPurchased ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-white" />
                        <span>REQUISITION DELIVERED!</span>
                      </>
                    ) : isClaimed ? (
                      <span>DAILY DROP CLAIMED (RESETS 0600)</span>
                    ) : isDaily ? (
                      <>
                        <Gift className="w-4 h-4" />
                        <span>CLAIM FREE DAILY DROP</span>
                      </>
                    ) : (
                      <>
                        <DollarSign className="w-4 h-4" />
                        <span>AUTHORIZE REQUISITION (${crate.priceUsd.toFixed(2)})</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
