/**
 * The Iron Dominion Arena, phase A: the Proving Ground.
 *
 * Everything on this screen comes from `/api/arena`. The server reads the
 * saved Arena Squad, builds the day's Dominion Warden, resolves the fight
 * and scores it - all before this screen hears about it. This screen shows
 * the squad, the Warden, the three attempts with every scored term, and the
 * live daily and weekly boards (provisional until the Monday settlement,
 * and it says so). An attempt opens the battle view, which plays the stored
 * fight; when it ends, or is skipped, the report opens.
 */
import {lazy, Suspense, useCallback, useEffect, useState} from 'react';
import {ASSET_BY_ID, CATEGORY_LABEL, type AssetCategory} from '../../shared/assets';
import {ARENA_RULES, FIELD_CACHE, FULL_ENGAGEMENT_BONUS, RANK_BANDS} from '../../shared/arena';
import {formatClock} from '../../shared/gametime';
import {describeReward} from '../../shared/season1Ops';
import {ApiError, type ArenaAttempt, type ArenaView, api} from '../net/api';
import {remaining} from './BuildingPanel';
import {t} from '../i18n';
import {useModal} from './guide/useModal';
import ArenaReport from './ArenaReport';

const ArenaBattle = lazy(() => import('./ArenaBattle'));
const ArenaSquad = lazy(() => import('./ArenaSquad'));

type Mode = {kind: 'lobby'} | {kind: 'squad'} | {kind: 'battle'; attempt: ArenaAttempt} | {kind: 'report'; attempt: ArenaAttempt};

export default function Arena({onClose}: {onClose: () => void}) {
  // A full screen: General Rider stays out of the way while it is open.
  useModal();
  const [view, setView] = useState<ArenaView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<Mode>({kind: 'lobby'});
  const [board, setBoard] = useState<'daily' | 'weekly'>('daily');
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(() => {
    api
      .arena()
      .then((v) => setView(v))
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not reach the server.'));
  }, []);

  useEffect(() => {
    load();
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, [load]);

  async function attempt() {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const r = await api.arenaAttempt();
      setView(r.view);
      const paid = [
        r.fieldCache ? `Field Cache: ${describeReward(FIELD_CACHE)}` : null,
        r.fullEngagement ? `Full Engagement: ${describeReward(FULL_ENGAGEMENT_BONUS)}` : null,
      ].filter(Boolean);
      if (paid.length) setNote(paid.join(' · '));
      // The fight is resolved and stored. Now watch it.
      setMode({kind: 'battle', attempt: r.attempt});
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'That did not stick.');
    } finally {
      setBusy(false);
    }
  }

  if (mode.kind === 'squad') {
    return (
      <Suspense fallback={<p className="p-4 text-sm text-neutral-500">Loading…</p>}>
        <ArenaSquad
          onClose={() => {
            setMode({kind: 'lobby'});
            load();
          }}
          onEnter={() => {
            setMode({kind: 'lobby'});
            load();
            void attempt();
          }}
        />
      </Suspense>
    );
  }
  if (mode.kind === 'battle') {
    const a = mode.attempt;
    return (
      <Suspense fallback={<p className="p-4 text-sm text-neutral-500">Loading…</p>}>
        <ArenaBattle attempt={a} onDone={() => setMode({kind: 'report', attempt: a})} />
      </Suspense>
    );
  }
  if (mode.kind === 'report') {
    const a = mode.attempt;
    return <ArenaReport attempt={a} onWatchAgain={a.battle ? () => setMode({kind: 'battle', attempt: a}) : undefined} onClose={() => setMode({kind: 'lobby'})} />;
  }

  const btn = 'rounded border border-neutral-700 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-200 hover:border-orange-500 hover:text-orange-200 disabled:opacity-40';

  return (
    <div className="mx-auto max-w-3xl p-4 text-neutral-200">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-orange-400">Iron Dominion Arena</h2>
          {view && (
            <p className="text-[11px] text-neutral-500">
              {view.phase === 'proving_ground' ? 'Proving Ground' : view.phase === 'head_to_head' ? 'Head-to-Head Ladder' : view.phase} · Season 1 week{' '}
              {view.seasonWeek} · closes {formatClock(view.closesAt)} RST Monday
            </p>
          )}
        </div>
        <button onClick={onClose} className={btn}>
          {t('nav.close')}
        </button>
      </div>

      {error && <p className="mt-3 rounded border border-red-900 bg-red-950/60 px-3 py-2 text-sm text-red-300">{error}</p>}
      {note && <p className="mt-3 rounded border border-emerald-900 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-300">{note}</p>}
      {!view && !error && <p className="mt-3 text-sm text-neutral-500">Reading the Arena…</p>}

      {view && (
        <>
          {/* Today: attempts, your force, the benchmark. */}
          <section className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded border border-neutral-800 bg-neutral-950 p-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">Arena Squad</p>
                <button onClick={() => setMode({kind: 'squad'})} className={btn}>
                  Set up
                </button>
              </div>
              {view.force ? (
                <>
                  <p className="mt-1 text-sm text-neutral-100">
                    <span className="font-mono text-neutral-400">power {view.force.power.toLocaleString()}</span>
                  </p>
                  <ul className="mt-1 text-[11px] text-neutral-400">
                    {view.force.units.map((u) => (
                      <li key={u.slot}>
                        {ASSET_BY_ID[u.assetId]?.code ?? u.assetId} <span className="text-neutral-600">Lv {u.level}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1 text-[10px] text-neutral-600">Your saved loadout, checked by the server. Nothing on the map moves.</p>
                </>
              ) : (
                <p className="mt-1 text-[12px] text-amber-400">{view.forceBlocked ?? 'Set up your Arena Squad first.'}</p>
              )}
            </div>
            <div className="rounded border border-red-900/60 bg-neutral-950 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-red-300">{view.benchmark.name}</p>
              <p className="mt-1 font-mono text-sm text-neutral-100">power {view.benchmark.power.toLocaleString()}</p>
              <ul className="mt-1 text-[11px] text-neutral-400">
                {view.benchmark.hardpoints.map((h) => (
                  <li key={h.index}>
                    {h.name} <span className="text-neutral-600">{CATEGORY_LABEL[h.category as AssetCategory] ?? h.category} Lv {h.level}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-[10px] text-neutral-600">One per server per day, its hardpoints built from yesterday’s strongest profile. Same for everyone.</p>
            </div>
          </section>

          <section className="mt-3 rounded border border-neutral-800 bg-neutral-900/40 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-neutral-100">
                  Attempts today{' '}
                  <span className="font-mono">
                    {view.attemptsUsed} / {view.attemptsPerDay}
                  </span>
                </p>
                <p className="text-[11px] text-neutral-500">
                  Resets in {remaining(Math.max(0, view.resetAt - now))}. First attempt of the day pays the Field Cache ({describeReward(FIELD_CACHE)}); all three pay{' '}
                  {describeReward(FULL_ENGAGEMENT_BONUS)} more.
                </p>
              </div>
              <button
                onClick={() => void attempt()}
                disabled={busy || !view.force || view.attemptsUsed >= view.attemptsPerDay || view.phase !== 'proving_ground'}
                className="shrink-0 rounded border border-orange-600 bg-orange-950/40 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-orange-200 hover:bg-orange-900/40 disabled:border-neutral-800 disabled:bg-transparent disabled:text-neutral-600"
              >
                {busy ? '…' : 'Enter the Arena'}
              </button>
            </div>

            {view.attempts.length > 0 && (
              <ul className="mt-3 grid gap-2 sm:grid-cols-3">
                {view.attempts.map((a) => (
                  <li key={a.id}>
                    <button
                      onClick={() => setMode({kind: 'report', attempt: a})}
                      className={`w-full rounded border p-2 text-left ${
                        a.outcome === 'attacker' ? 'border-emerald-900 bg-emerald-950/20' : 'border-neutral-800 bg-neutral-950'
                      }`}
                    >
                      <p className="text-[10px] uppercase tracking-wider text-neutral-500">Attempt {a.n} · {formatClock(a.createdAt)} RST</p>
                      <p className="font-mono text-lg text-neutral-50">{a.score.toLocaleString()}</p>
                      <p className="text-[10px] text-neutral-500">
                        {a.outcome === 'attacker' ? 'Warden defeated' : a.outcome === 'draw' ? 'Draw' : 'Warden held'} · tap for the report
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Boards. */}
          <section className="mt-3 rounded border border-neutral-800 bg-neutral-950 p-3">
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                {(['daily', 'weekly'] as const).map((b) => (
                  <button
                    key={b}
                    onClick={() => setBoard(b)}
                    className={`rounded border px-2 py-1 text-[11px] ${
                      board === b ? 'border-orange-600 bg-orange-950/40 text-orange-200' : 'border-neutral-700 text-neutral-400'
                    }`}
                  >
                    {b === 'daily' ? 'Today' : 'This week'}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-neutral-500">
                {board === 'daily'
                  ? myDailyLine(view)
                  : view.myWeekly
                    ? `You: rank ${view.myWeekly.rank} · ${view.myWeekly.score.toLocaleString()} · ${view.myWeekly.attempts} attempts`
                    : 'You: not ranked yet'}
              </p>
            </div>
            <ol className="mt-2 divide-y divide-neutral-900 text-[11px]">
              {(board === 'daily' ? view.daily : view.weekly).map((r) => (
                <li key={r.username} className="flex items-center gap-3 py-1">
                  <span className="w-8 shrink-0 font-mono text-neutral-500">{r.rank}</span>
                  <span className="min-w-0 flex-1 truncate text-neutral-200">{r.username}</span>
                  <span className="font-mono text-neutral-100">{r.score.toLocaleString()}</span>
                </li>
              ))}
              {(board === 'daily' ? view.daily : view.weekly).length === 0 && <li className="py-2 text-neutral-500">Nobody has fought yet today.</li>}
            </ol>
            <p className="mt-2 text-[10px] text-neutral-600">
              Provisional until the Monday 00:00 RST settlement. Rank rewards need three settled attempts that week. Bands:{' '}
              {RANK_BANDS.map((b) => b.label).join(' · ')}.
            </p>
          </section>

          <section className="mt-3 rounded border border-neutral-800 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">Rules</p>
            <ul className="mt-1 space-y-0.5 text-[11px] text-neutral-500">
              {ARENA_RULES.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

function myDailyLine(view: ArenaView): string {
  return view.myDaily ? `You: rank ${view.myDaily.rank} · best ${view.myDaily.best.toLocaleString()}` : 'You: no attempt yet today';
}
