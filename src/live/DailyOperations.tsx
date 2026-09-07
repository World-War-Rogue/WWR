/**
 * Daily Operations: the six lanes, the 4-of-6 Cache, the reset countdown.
 *
 * Everything here is read from the server (`/api/ops/daily`); the card never
 * decides a lane is done or a Cache is claimable on its own. Rewards are the
 * registry's figures for this week, printed the one way `describeReward`
 * prints them - Credits and resources, never a placeholder currency name.
 */
import {useEffect, useState} from 'react';
import {INDUSTRY_HOUR_MS, LANE_COPY, describeReward} from '../../shared/season1Ops';
import {formatClock} from '../../shared/gametime';
import {ApiError, type DailyView, api} from '../net/api';
import {remaining} from './BuildingPanel';

export default function DailyOperations({onWallet}: {onWallet?: () => void}) {
  const [view, setView] = useState<DailyView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let live = true;
    api
      .daily()
      .then((v) => live && setView(v))
      .catch((e) => live && setError(e instanceof ApiError ? e.message : 'Could not reach the server.'));
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      live = false;
      window.clearInterval(id);
    };
  }, []);

  async function claim() {
    setBusy(true);
    setError(null);
    try {
      const r = await api.claimDailyCache();
      setView(r.daily);
      setNote(`Cache claimed: ${describeReward(r.reward)}.`);
      onWallet?.();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'That did not stick.');
    } finally {
      setBusy(false);
    }
  }

  if (error && !view) return <p className="rounded border border-red-900 bg-red-950/60 px-3 py-2 text-sm text-red-300">{error}</p>;
  if (!view) return <p className="text-sm text-neutral-500">Reading today’s operations…</p>;

  const left = Math.max(0, view.resetAt - now);
  const canClaim = view.cache.claimable;

  return (
    <section className="rounded border border-neutral-800 bg-neutral-900/40 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-neutral-100">Daily Operations</h3>
          <p className="text-[11px] text-neutral-500">
            Season 1 · Week {view.week} · resets in {remaining(left)} ({formatClock(view.resetAt)} RST)
          </p>
        </div>
        <span className="font-mono text-sm text-neutral-200">
          {view.doneCount}
          <span className="text-neutral-600"> / {view.lanes.length}</span>
        </span>
      </div>

      {/* The Cache: the reason to do four of these. */}
      <div
        className={`mt-3 rounded border p-3 ${
          view.cache.claimedAt
            ? 'border-emerald-900 bg-emerald-950/30'
            : canClaim
              ? 'border-orange-600 bg-orange-950/30'
              : 'border-neutral-800 bg-neutral-950'
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-300">Operations Cache</p>
            <p className="mt-0.5 text-[12px] text-neutral-200">{describeReward(view.cache.reward)}</p>
            <p className="text-[10px] text-neutral-500">
              {view.cache.claimedAt
                ? `Claimed today at ${formatClock(view.cache.claimedAt)} RST. Back tomorrow.`
                : `Complete any ${view.lanesForCache} of ${view.lanes.length} lanes. ${Math.max(0, view.lanesForCache - view.doneCount)} to go.`}
            </p>
          </div>
          <button
            onClick={() => void claim()}
            disabled={busy || !canClaim}
            className="shrink-0 rounded border border-orange-600 bg-orange-950/40 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-orange-200 hover:bg-orange-900/40 disabled:border-neutral-800 disabled:bg-transparent disabled:text-neutral-600"
          >
            {view.cache.claimedAt ? 'Claimed' : busy ? '…' : 'Claim'}
          </button>
        </div>
        <span className="mt-2 block h-1 overflow-hidden rounded-full bg-neutral-900">
          <span
            className="block h-full rounded-full bg-orange-500"
            style={{width: `${Math.min(100, (view.doneCount / view.lanesForCache) * 100)}%`}}
          />
        </span>
      </div>

      {note && <p className="mt-2 rounded border border-emerald-900 bg-emerald-950/40 px-3 py-1.5 text-[11px] text-emerald-300">{note}</p>}
      {error && <p className="mt-2 rounded border border-red-900 bg-red-950/60 px-3 py-1.5 text-[11px] text-red-300">{error}</p>}

      <ul className="mt-3 divide-y divide-neutral-900">
        {view.lanes.map((l) => {
          const copy = LANE_COPY[l.lane];
          const industry = l.lane === 'industry' && !l.done;
          return (
            <li key={l.lane} className="flex items-start gap-3 py-2">
              <span
                aria-hidden
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] ${
                  l.done ? 'border-emerald-600 bg-emerald-950/60 text-emerald-300' : 'border-neutral-700 text-neutral-600'
                }`}
              >
                {l.done ? '✓' : ''}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] text-neutral-200">
                  <span className="font-semibold">{copy.label}</span>
                  <span className="text-neutral-500"> · {copy.task}</span>
                </p>
                <p className="text-[10px] text-neutral-600">{copy.hint}</p>
                {industry && (
                  <span className="mt-1 block h-1 w-40 overflow-hidden rounded-full bg-neutral-900">
                    <span
                      className="block h-full rounded-full bg-neutral-500"
                      style={{width: `${Math.min(100, (view.industryMs / INDUSTRY_HOUR_MS) * 100)}%`}}
                    />
                  </span>
                )}
                {l.done && l.doneAt && <p className="text-[10px] text-emerald-500/80">Done at {formatClock(l.doneAt)} RST.</p>}
              </div>
              <span className="shrink-0 text-right font-mono text-[10px] text-neutral-400">{describeReward(l.reward)}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
