/**
 * The three Combat Systems lanes of one Task Force, on its card.
 *
 * Every number on this panel is read from shared/combatSystems.ts and the
 * progression registry - the same functions the server prices with - so the
 * quote here is the quote the server accepts. The confirmation states the
 * cost, what the level does now and what the next one does, and that a level
 * cannot be undone, before anything is spent.
 */
import {useState} from 'react';
import {
  COMBAT_SYSTEM_LANES,
  COMBAT_SYSTEM_MAX_LEVEL,
  type CombatSystemLane,
  type CombatSystems as Systems,
  LANE_EFFECT,
  LANE_LABEL,
  combatSystemStepCost,
  effectPercent,
} from '../../shared/combatSystems';
import {maxRankForSeason} from '../../shared/assets';
import {ApiError, type Wallet, api} from '../net/api';

const LANE_BLURB: Record<CombatSystemLane, string> = {
  fire_control: 'Every shot this Task Force fires does more damage.',
  survivability: 'Every asset in this Task Force carries more hit points into a fight.',
  sustainment: 'Assets repaired while in this Task Force come back sooner.',
};

export default function CombatSystemsPanel({
  squad,
  systems,
  wallet,
  commandCenter,
  season,
  locked,
  onChanged,
}: {
  squad: string;
  systems: Systems;
  wallet: Wallet;
  commandCenter: number;
  season: number;
  /** The Task Force is in the field: nothing can be bought for it. */
  locked: boolean;
  onChanged: (wallet: Wallet, systems: Record<string, Systems>) => void;
}) {
  const [confirming, setConfirming] = useState<CombatSystemLane | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const cap = Math.min(COMBAT_SYSTEM_MAX_LEVEL, maxRankForSeason(season), commandCenter);

  async function buy(lane: CombatSystemLane) {
    setBusy(true);
    setError(null);
    try {
      const r = await api.systemUp(squad, lane, systems[lane] + 1);
      onChanged(r.wallet, r.systems);
      setConfirming(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That did not stick.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 rounded border border-neutral-800 bg-neutral-900/40">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-2.5 py-1.5 text-left"
      >
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-300">Combat Systems</span>
        <span className="font-mono text-[11px] text-neutral-500">
          {COMBAT_SYSTEM_LANES.map((lane) => systems[lane]).join(' / ')}
          <span className="ml-2 text-neutral-600">{open ? '▾' : '▸'}</span>
        </span>
      </button>

      {open && (
        <div className="divide-y divide-neutral-900 border-t border-neutral-900">
          {COMBAT_SYSTEM_LANES.map((lane) => {
            const level = systems[lane];
            const next = level + 1;
            const atMax = level >= COMBAT_SYSTEM_MAX_LEVEL;
            const cost = combatSystemStepCost(next);
            const canAfford = wallet.credits + wallet.tokens >= cost;
            const reason = atMax
              ? 'At the maximum.'
              : level >= maxRankForSeason(season)
                ? `Season ${season} caps this at ${maxRankForSeason(season)}.`
                : level >= commandCenter
                  ? `Command Center must reach level ${next} first.`
                  : locked
                    ? 'In the field. Wait for it to come home.'
                    : !canAfford
                      ? `Need ${(cost - wallet.credits - wallet.tokens).toLocaleString()} more Credits or Tokens.`
                      : null;
            return (
              <div key={lane} className="px-2.5 py-2">
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] text-neutral-200">
                      {LANE_LABEL[lane]}{' '}
                      <span className="font-mono text-neutral-500">{level}</span>
                      <span className="font-mono text-neutral-700"> / {cap}</span>
                      <span className="ml-2 font-mono text-[11px] text-emerald-400">{effectPercent(lane, level)}</span>
                      <span className="text-[10px] text-neutral-500"> {LANE_EFFECT[lane].wording}</span>
                    </p>
                    <p className="text-[10px] text-neutral-600">{LANE_BLURB[lane]}</p>
                    {reason && <p className="text-[10px] text-amber-500/80">{reason}</p>}
                  </div>
                  <button
                    onClick={() => setConfirming(lane)}
                    disabled={busy || !!reason || confirming === lane}
                    className="shrink-0 rounded border border-neutral-700 px-2.5 py-1 text-[11px] font-semibold text-neutral-200 transition hover:border-orange-500 hover:text-orange-200 disabled:border-neutral-900 disabled:text-neutral-700"
                  >
                    {reason ? '—' : `Upgrade · ${cost.toLocaleString()}`}
                  </button>
                </div>

                {confirming === lane && (
                  <div className="mt-2 rounded border border-orange-800 bg-neutral-950 p-2.5">
                    <p className="text-[12px] font-semibold text-neutral-100">
                      {LANE_LABEL[lane]} {level} → {next}
                    </p>
                    <p className="mt-1 text-[11px] text-neutral-300">
                      Cost: <span className="font-mono text-amber-300">{cost.toLocaleString()}</span> Credits or Tokens
                      (Credits spent first).
                    </p>
                    <p className="mt-0.5 text-[11px] text-emerald-400">
                      {LANE_EFFECT[lane].wording}: {effectPercent(lane, level)} now, {effectPercent(lane, next)} at {next}.
                    </p>
                    <p className="mt-1 text-[11px] font-semibold text-orange-300">
                      A Combat Systems level is permanent and cannot be undone.
                    </p>
                    {error && <p className="mt-1 text-[11px] text-red-300">{error}</p>}
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => void buy(lane)}
                        disabled={busy}
                        className="flex-1 rounded border border-orange-600 bg-orange-950/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-orange-200 hover:bg-orange-900/40 disabled:opacity-50"
                      >
                        {busy ? '…' : 'Confirm upgrade'}
                      </button>
                      <button
                        onClick={() => {
                          setConfirming(null);
                          setError(null);
                        }}
                        className="rounded border border-neutral-700 px-3 py-1 text-[11px] uppercase tracking-wider text-neutral-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
