/**
 * Dominion Warfront: the weekly alliance competition, as one screen.
 *
 * Everything here is read from `/api/warfront`. The server records every
 * point, applies the caps, ranks the alliances and settles the week; this
 * screen shows your day against its caps, your week, where your alliance
 * stands and why (members, active bonus, coordinated operations), the
 * Operations Treasury with its ledger, last week's table, and the rules.
 */
import {useEffect, useState} from 'react';
import {formatClock} from '../../shared/gametime';
import {describeReward} from '../../shared/season1Ops';
import {DIVISIONS, METRIC_BLURB, METRIC_LABEL, POINTS, WARFRONT, WARFRONT_METRICS, WARFRONT_RULES} from '../../shared/warfront';
import {ApiError, type WarfrontView, api} from '../net/api';
import {remaining} from './BuildingPanel';
import {t} from '../i18n';
import {useModal} from './guide/useModal';

export default function Warfront({onClose}: {onClose: () => void}) {
  useModal();
  const [view, setView] = useState<WarfrontView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'standings' | 'alliance' | 'last'>('standings');
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let live = true;
    api
      .warfront()
      .then((v) => live && setView(v))
      .catch((e) => live && setError(e instanceof ApiError ? e.message : 'Could not reach the server.'));
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      live = false;
      window.clearInterval(id);
    };
  }, []);

  const btn = 'rounded border border-neutral-700 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-200 hover:border-orange-500 hover:text-orange-200';
  const money = (r: {credits: number; fuel: number; steel: number; munitions: number; alloy: number}) => describeReward(r);

  return (
    <div className="mx-auto max-w-3xl p-4 text-neutral-200">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-orange-400">Dominion Warfront</h2>
          {view && (
            <p className="text-[11px] text-neutral-500">
              Season 1 week {view.seasonWeek} · settles {formatClock(view.closesAt)} RST Monday · {remaining(Math.max(0, view.closesAt - now))} left
            </p>
          )}
        </div>
        <button onClick={onClose} className={btn}>
          {t('nav.close')}
        </button>
      </div>

      {error && <p className="mt-3 rounded border border-red-900 bg-red-950/60 px-3 py-2 text-sm text-red-300">{error}</p>}
      {!view && !error && <p className="mt-3 text-sm text-neutral-500">Reading the Warfront…</p>}

      {view && (
        <>
          {/* Membership state. */}
          <section className="mt-3 rounded border border-neutral-800 bg-neutral-900/40 p-3 text-[12px]">
            {view.membership ? (
              view.membership.eligible ? (
                <p className="text-neutral-200">
                  Contributing to <span className="font-semibold">[{view.membership.tag}] {view.membership.name}</span>
                  {view.mine && (
                    <>
                      {' '}
                      · rank <span className="font-mono">{view.mine.rank}</span> · {view.mine.division.name}
                    </>
                  )}
                </p>
              ) : (
                <p className="text-amber-300">
                  Joined [{view.membership.tag}] {view.membership.name} {remaining(Math.max(0, now - view.membership.joinedAt))} ago. Your points count for the alliance from{' '}
                  {formatClock(view.membership.eligibleAt ?? now)} RST (48 hours in). Until then they are recorded for you only.
                </p>
              )
            ) : (
              <p className="text-neutral-400">You are not in an alliance. Your Warfront Score is recorded, but it counts for no alliance and pays no weekly reward.</p>
            )}
          </section>

          {/* Today against the caps. */}
          <section className="mt-3 rounded border border-neutral-800 bg-neutral-950 p-3">
            <div className="flex items-baseline justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">Today</p>
              <p className="text-[11px] text-neutral-500">
                <span className="font-mono text-neutral-100">{view.today.score}</span> / {view.today.dailyCap} · resets in {remaining(Math.max(0, view.resetAt - now))}
              </p>
            </div>
            <div className="mt-2 space-y-2">
              {WARFRONT_METRICS.map((k) => {
                const cap = view.today.caps[k];
                const counted = view.today.counted[k];
                const earned = view.today.earned[k];
                return (
                  <div key={k}>
                    <div className="flex items-baseline justify-between text-[11px]">
                      <span className="text-neutral-200">
                        {METRIC_LABEL[k]} <span className="text-neutral-600">· {METRIC_BLURB[k]}</span>
                      </span>
                      <span className="font-mono text-neutral-400">
                        {counted} / {cap}
                        {earned > cap && <span className="text-neutral-600"> (earned {earned})</span>}
                      </span>
                    </div>
                    <div className="mt-0.5 h-1.5 overflow-hidden rounded bg-neutral-800">
                      <div className={`h-full ${k === 'assault' ? 'bg-red-500' : k === 'operations' ? 'bg-amber-400' : 'bg-sky-400'}`} style={{width: `${(counted / cap) * 100}%`}} />
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-neutral-400">
              This week: <span className="font-mono text-neutral-100">{view.weekScore.toLocaleString()}</span> personal
              {view.membership && (
                <>
                  {' '}
                  · <span className="font-mono text-neutral-100">{view.weekForAlliance.toLocaleString()}</span> counted for [{view.membership.tag}]
                  {view.mine && view.weekForAlliance < view.mine.division.memberThreshold && (
                    <span className="text-neutral-500"> · {view.mine.division.memberThreshold - view.weekForAlliance} more for the member reward</span>
                  )}
                </>
              )}
            </p>
            {view.recent.length > 0 && (
              <ul className="mt-2 space-y-0.5 text-[10px] text-neutral-500">
                {view.recent.slice(0, 8).map((r) => (
                  <li key={r.id} className="flex justify-between gap-2">
                    <span className="truncate">
                      {formatClock(r.createdAt)} · {r.detail}
                      {!r.countedFor && view.membership && <span className="text-amber-500"> · not yet counted for the alliance</span>}
                    </span>
                    <span className="shrink-0 font-mono text-neutral-300">
                      +{r.points} {METRIC_LABEL[r.metric]}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Standings / my alliance / last week. */}
          <section className="mt-3 rounded border border-neutral-800 bg-neutral-950 p-3">
            <div className="flex gap-1">
              {(['standings', 'alliance', 'last'] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => setTab(k)}
                  className={`rounded border px-2 py-1 text-[11px] ${tab === k ? 'border-orange-600 bg-orange-950/40 text-orange-200' : 'border-neutral-700 text-neutral-400'}`}
                >
                  {k === 'standings' ? 'Server standings' : k === 'alliance' ? 'My alliance' : 'Last week'}
                </button>
              ))}
            </div>

            {tab === 'standings' && (
              <ol className="mt-2 divide-y divide-neutral-900 text-[11px]">
                {view.standings.map((s) => (
                  <li key={s.allianceId} className={`flex items-center gap-2 py-1 ${s.mine ? 'text-orange-200' : ''}`}>
                    <span className="w-6 shrink-0 font-mono text-neutral-500">{s.rank}</span>
                    <span className="min-w-0 flex-1 truncate">
                      [{s.tag}] {s.name} <span className="text-neutral-600">· {s.contributors} contributing · {s.activeMembers} active</span>
                    </span>
                    <span className="font-mono text-neutral-100">{s.total.toLocaleString()}</span>
                  </li>
                ))}
                {view.standings.length === 0 && <li className="py-2 text-neutral-500">No alliances on this server yet.</li>}
              </ol>
            )}

            {tab === 'alliance' &&
              (view.mine ? (
                <div className="mt-2 text-[11px]">
                  <p className="text-neutral-300">
                    Rank <span className="font-mono text-neutral-100">{view.mine.rank}</span> · {view.mine.division.name} · score{' '}
                    <span className="font-mono text-neutral-100">{view.mine.score.total.toLocaleString()}</span>
                  </p>
                  <p className="mt-0.5 text-neutral-500">
                    = members {view.mine.score.memberSum.toLocaleString()} + active {view.mine.score.activeMembers} × {WARFRONT.activeMemberBonus} ={' '}
                    {view.mine.score.activeBonus.toLocaleString()} + coordinated ops {view.mine.score.coordinatedOps} × {WARFRONT.coordinatedOperationScore} ={' '}
                    {view.mine.score.coordinatedBonus.toLocaleString()}
                  </p>
                  <p className="mt-0.5 text-neutral-500">
                    At this rank: pool {view.mine.division.pool ? money(view.mine.division.pool) : 'none (registered tier)'} · each eligible member {money(view.mine.division.member)} (needs{' '}
                    {view.mine.division.memberThreshold} personal score and 48 hours in).
                  </p>
                  <ol className="mt-2 divide-y divide-neutral-900">
                    {view.mine.members.map((m, i) => (
                      <li key={m.username} className={`flex items-center gap-2 py-0.5 ${m.me ? 'text-orange-200' : ''}`}>
                        <span className="w-6 shrink-0 font-mono text-neutral-500">{i + 1}</span>
                        <span className="min-w-0 flex-1 truncate">
                          {m.username} {m.active && <span className="text-emerald-400">· active</span>}
                        </span>
                        <span className="font-mono text-neutral-100">{m.score.toLocaleString()}</span>
                      </li>
                    ))}
                    {view.mine.members.length === 0 && <li className="py-2 text-neutral-500">No eligible contributions yet this week.</li>}
                  </ol>
                  {view.treasury && (
                    <div className="mt-3 rounded border border-neutral-800 p-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">Operations Treasury</p>
                      <p className="mt-1 font-mono text-neutral-100">{money(view.treasury)}</p>
                      <p className="text-[10px] text-neutral-600">Funds posted alliance operations only. Every deposit and spend is listed here; no one leader holds it.</p>
                      {view.treasury.ledger.length > 0 && (
                        <ul className="mt-1 space-y-0.5 text-[10px] text-neutral-500">
                          {view.treasury.ledger.map((l) => (
                            <li key={l.id}>
                              {formatClock(l.createdAt)} · {l.detail}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-[11px] text-neutral-500">Join an alliance to compete in the Warfront.</p>
              ))}

            {tab === 'last' && (
              <ol className="mt-2 divide-y divide-neutral-900 text-[11px]">
                {view.lastWeek.map((s) => (
                  <li key={s.allianceId} className={`flex items-center gap-2 py-1 ${s.mine ? 'text-orange-200' : ''}`}>
                    <span className="w-6 shrink-0 font-mono text-neutral-500">{s.rank}</span>
                    <span className="min-w-0 flex-1 truncate">
                      [{s.tag}] {s.name} <span className="text-neutral-600">· {s.division}</span>
                    </span>
                    <span className="font-mono text-neutral-100">{s.score.toLocaleString()}</span>
                  </li>
                ))}
                {view.lastWeek.length === 0 && <li className="py-2 text-neutral-500">No settled week yet.</li>}
              </ol>
            )}
          </section>

          {/* How to score. */}
          <section className="mt-3 rounded border border-neutral-800 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">How to score</p>
            <ul className="mt-1 divide-y divide-neutral-900 text-[11px]">
              {Object.values(POINTS).map((p) => (
                <li key={p.label} className="flex justify-between gap-2 py-0.5">
                  <span className="text-neutral-300">{p.label}</span>
                  <span className="shrink-0 font-mono text-neutral-400">
                    +{p.points} {METRIC_LABEL[p.metric]}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[10px] text-neutral-600">Alliance operations and coordinated operations score when alliance operations exist.</p>
          </section>

          {/* Divisions. */}
          <section className="mt-3 rounded border border-neutral-800 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">Divisions</p>
            <ul className="mt-1 divide-y divide-neutral-900 text-[11px]">
              {DIVISIONS.map((d) => (
                <li key={d.name} className="py-1">
                  <p className="text-neutral-200">
                    {d.label} · {d.name}
                  </p>
                  <p className="text-[10px] text-neutral-500">
                    Treasury: {d.pool ? money(d.pool) : 'milestone pool only'} · member: {money(d.member)} (needs {d.memberThreshold})
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-3 rounded border border-neutral-800 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">Rules</p>
            <ul className="mt-1 space-y-0.5 text-[11px] text-neutral-500">
              {WARFRONT_RULES.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
