/**
 * Protection: the shield up now, the cooldown, this week's free coupons, and
 * the three paid durations. SHIELDS v1. Lives in the Command Center's
 * Protection tab; the Depot's Services tab shows the paid cards only.
 */
import {useEffect, useState} from 'react';
import {type SeasonState, type Wallet, api, ApiError} from '../net/api';
import {SHIELD_OPTIONS, SHIELD_WORDING} from '../../shared/shields';
import {formatClock} from '../../shared/gametime';
import {remaining} from './BuildingPanel';

export default function ShieldPanel({
  season1,
  wallet,
  onChanged,
  paidOnly = false,
}: {
  season1: SeasonState;
  wallet: Wallet;
  onChanged: (next: SeasonState, wallet: Wallet) => void;
  paidOnly?: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [confirm, setConfirm] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const {shield} = season1;
  const options = SHIELD_OPTIONS.filter((o) => (paidOnly ? o.price > 0 : true));
  const chosen = options.find((o) => o.kind === confirm) ?? null;

  const apply = async (kind: string) => {
    setBusy(true);
    setError(null);
    try {
      const r = await api.applyShield(kind);
      onChanged(r.season1, r.wallet);
      setConfirm(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reach the server.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded border border-neutral-800 bg-neutral-900/40 p-3">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-neutral-100">{paidOnly ? 'Shields' : 'Protection'}</h3>
        {!paidOnly && (
          <span className="font-mono text-[11px] text-neutral-400">
            {wallet.credits.toLocaleString()} cr · {wallet.tokens.toLocaleString()} tk
          </span>
        )}
      </div>

      {shield.until ? (
        <p className="mt-2 rounded border border-cyan-800/70 bg-cyan-950/30 px-2 py-1.5 text-xs text-cyan-200">
          Shielded · {remaining(shield.until - now)}
          <span className="block text-[10px] text-cyan-400/70">
            {SHIELD_WORDING.popupBody} Until {formatClock(shield.until)} RST. Attacking drops it.
          </span>
        </p>
      ) : shield.cooldownUntil ? (
        <p className="mt-2 text-[11px] text-neutral-400">
          {SHIELD_WORDING.cooldown(`${formatClock(shield.cooldownUntil)} RST`)} ({remaining(shield.cooldownUntil - now)})
        </p>
      ) : (
        <p className="mt-2 text-[11px] text-neutral-500">No shield. {SHIELD_WORDING.popupBody}</p>
      )}

      <div className="mt-2 space-y-1.5">
        {options.map((o) => {
          const couponSpent = (o.kind === 'coupon8' && !shield.coupons.h8) || (o.kind === 'coupon4' && !shield.coupons.h4);
          const disabled = busy || !!shield.until || !!shield.cooldownUntil || couponSpent;
          return (
            <div key={o.kind} className="flex items-center justify-between text-[11px]">
              <span className={couponSpent ? 'text-neutral-600 line-through' : 'text-neutral-300'}>{o.label}</span>
              <button
                onClick={() => setConfirm(o.kind)}
                disabled={disabled}
                className="rounded border border-cyan-700 bg-cyan-950/30 px-2 py-0.5 font-semibold text-cyan-200 transition hover:bg-cyan-900/40 disabled:cursor-not-allowed disabled:border-neutral-800 disabled:bg-transparent disabled:text-neutral-600"
              >
                {o.price === 0 ? (couponSpent ? 'Used' : 'Apply') : `${o.price} cr/tk`}
              </button>
            </div>
          );
        })}
      </div>
      {!paidOnly && (
        <p className="mt-2 text-[10px] text-neutral-600">
          Free coupons reset Monday 00:00 RST and do not carry over. One shield at a time; a 4-hour cooldown follows.
        </p>
      )}

      {chosen && (
        <div className="mt-3 rounded border border-cyan-800 bg-neutral-950 p-3">
          <p className="text-sm font-semibold text-neutral-100">Apply {chosen.label.replace(' (free this week)', '')}?</p>
          <p className="mt-1 text-[11px] text-neutral-400">
            {SHIELD_WORDING.confirm(chosen.label, `${formatClock(now + chosen.ms)} RST`)}
            {chosen.price > 0 && ` Costs ${chosen.price} Credits or Tokens.`}
          </p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => void apply(chosen.kind)}
              disabled={busy}
              className="flex-1 rounded border border-cyan-600 bg-cyan-950/40 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-cyan-200 hover:bg-cyan-900/40 disabled:opacity-50"
            >
              Apply shield
            </button>
            <button
              onClick={() => setConfirm(null)}
              className="rounded border border-neutral-700 px-3 py-1.5 text-xs uppercase tracking-wider text-neutral-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {error && <p className="mt-2 text-[11px] text-red-400">{error}</p>}
    </section>
  );
}
