/**
 * The Arena report: what the stored fight came to.
 *
 * Everything on it is read from the attempt the server stored - the two
 * snapshots, the result, the event log - so it opens the same from the
 * Arena screen the moment the replay ends and from Reports a week later.
 * The repair figures are the game's own (shared/repair.ts) for the
 * condition each asset came out with; they are what it WOULD cost, because
 * the Arena damages nothing.
 */
import {useMemo, useState} from 'react';
import {ASSET_BY_ID, CATEGORY_LABEL, type AssetCategory} from '../../shared/assets';
import {MAX_ATTEMPT_SCORE, SCORE, wardenHardpoints} from '../../shared/arena';
import {finalState, timeline, totalDealt} from '../../shared/arenaReplay';
import {formatClock} from '../../shared/gametime';
import {repairBill} from '../../shared/repair';
import type {ArenaAttempt} from '../net/api';
import {remaining as clock} from './BuildingPanel';
import AssetIcon from './AssetIcon';

export default function ArenaReport({attempt, onWatchAgain, onClose}: {attempt: ArenaAttempt; onWatchAgain?: () => void; onClose: () => void}) {
  const battle = attempt.battle;
  const [showTimeline, setShowTimeline] = useState(false);
  const events = useMemo(() => battle?.events ?? [], [battle]);
  const end = useMemo(() => (battle ? finalState(attempt.units, battle.benchmark, events) : null), [battle, attempt.units, events]);
  const hardpoints = useMemo(() => (battle ? wardenHardpoints(battle.benchmark) : []), [battle]);
  const lines = useMemo(
    () => (battle ? timeline(events, attempt.units.map((u) => ASSET_BY_ID[u.assetId]?.code ?? u.assetId), hardpoints.map((h) => h.name)) : []),
    [battle, events, attempt.units, hardpoints],
  );
  const dealt = totalDealt(events, 'attacker');
  const taken = totalDealt(events, 'defender');
  const won = attempt.outcome === 'attacker';
  const btn = 'rounded border border-neutral-700 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-200 hover:border-orange-500 hover:text-orange-200';

  return (
    <div className="mx-auto max-w-3xl p-4 text-neutral-200">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className={`text-lg font-semibold uppercase tracking-[0.3em] ${won ? 'text-emerald-300' : attempt.outcome === 'draw' ? 'text-neutral-300' : 'text-red-300'}`}>
            {won ? 'Victory' : attempt.outcome === 'draw' ? 'Draw' : 'Defeat'}
          </h2>
          <p className="text-[11px] text-neutral-500">
            Arena attempt {attempt.n} · {formatClock(attempt.createdAt)} RST · vs {battle?.opponent ?? 'Dominion Warden'} · Arena Squad
          </p>
        </div>
        <div className="flex gap-1">
          {onWatchAgain && battle && (
            <button onClick={onWatchAgain} className={`${btn} border-orange-700 text-orange-200`}>
              Watch again
            </button>
          )}
          <button onClick={onClose} className={btn}>
            Close
          </button>
        </div>
      </div>

      <section className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded border border-neutral-800 bg-neutral-950 p-2">
          <p className="text-[10px] uppercase tracking-wider text-neutral-500">Score</p>
          <p className="font-mono text-lg text-neutral-50">
            {attempt.score.toLocaleString()} <span className="text-[10px] text-neutral-600">/ {MAX_ATTEMPT_SCORE.toLocaleString()}</span>
          </p>
        </div>
        <div className="rounded border border-neutral-800 bg-neutral-950 p-2">
          <p className="text-[10px] uppercase tracking-wider text-neutral-500">Damage dealt</p>
          <p className="font-mono text-lg text-amber-300">{dealt.toLocaleString()}</p>
        </div>
        <div className="rounded border border-neutral-800 bg-neutral-950 p-2">
          <p className="text-[10px] uppercase tracking-wider text-neutral-500">Damage taken</p>
          <p className="font-mono text-lg text-red-300">{taken.toLocaleString()}</p>
        </div>
      </section>

      {/* Each asset's contribution and condition. */}
      <section className="mt-3 rounded border border-neutral-800 bg-neutral-950 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">Your squad</p>
        <ul className="mt-2 divide-y divide-neutral-900">
          {attempt.units.map((u, i) => {
            const asset = ASSET_BY_ID[u.assetId];
            const s = end?.attacker[i];
            const pct = Math.round((s?.hp ?? 1) * 100);
            const bill = asset ? repairBill(asset, u.level, u.packages, u.boost ?? 1, s?.hp ?? 1) : null;
            return (
              <li key={i} className="flex items-center gap-2 py-1.5">
                {asset && <AssetIcon asset={asset} size={30} level={u.level} />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] text-neutral-100">
                    {asset?.code ?? u.assetId} <span className="text-neutral-600">Lv {u.level}</span>
                    {s && s.hp <= 0 && <span className="ml-1 rounded bg-neutral-800 px-1 text-[9px] text-neutral-400">OUT</span>}
                  </p>
                  <p className="text-[10px] text-neutral-500">
                    dealt <span className="font-mono text-amber-300">{(s?.dealt ?? 0).toLocaleString()}</span> · {s?.shots ?? 0} shots · took{' '}
                    <span className="font-mono text-red-300">{(s?.taken ?? 0).toLocaleString()}</span>
                    {bill && bill.q > 0 && (
                      <>
                        {' '}
                        · would repair in {clock(bill.ms)} for {bill.fuel} Fuel · {bill.steel} Steel · {bill.munitions} Munitions
                      </>
                    )}
                  </p>
                </div>
                <div className="w-16 shrink-0 text-right">
                  <p className={`font-mono text-[11px] ${pct <= 0 ? 'text-red-400' : pct < 50 ? 'text-orange-300' : 'text-emerald-300'}`}>{pct}%</p>
                  <div className="mt-0.5 h-1 overflow-hidden rounded bg-neutral-800">
                    <div className={`h-full ${pct < 35 ? 'bg-orange-500' : 'bg-emerald-500'}`} style={{width: `${pct}%`}} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-[10px] text-neutral-600">Condition is what the asset came out of the snapshot with. Nothing was damaged; the repair figures are what it would cost.</p>
      </section>

      {/* The Warden. */}
      {battle && (
        <section className="mt-3 rounded border border-red-900/50 bg-neutral-950 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-red-300">
            {battle.opponent} <span className="font-mono normal-case tracking-normal text-neutral-500">power {battle.defender.power.toLocaleString()}</span>
          </p>
          <ul className="mt-2 divide-y divide-neutral-900">
            {hardpoints.map((h) => {
              const s = end?.defender[h.index];
              const pct = Math.round((s?.hp ?? 1) * 100);
              return (
                <li key={h.index} className="flex items-center justify-between gap-2 py-1 text-[11px]">
                  <span className={s && s.hp <= 0 ? 'text-neutral-500 line-through' : 'text-neutral-200'}>
                    {h.name} <span className="text-neutral-600">{CATEGORY_LABEL[h.category as AssetCategory]} Lv {h.level}</span>
                  </span>
                  <span className="font-mono text-neutral-400">
                    took {(s?.taken ?? 0).toLocaleString()} · {pct}%
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Scoring. */}
      {attempt.breakdown && (
        <section className="mt-3 rounded border border-neutral-800 bg-neutral-950 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">Score</p>
          <table className="mt-1 w-full text-[11px]">
            <tbody className="divide-y divide-neutral-900">
              {(
                [
                  ['Enemy durability damage', attempt.breakdown.enemyDamagePct, SCORE.enemyDamage, attempt.breakdown.terms.enemyDamage],
                  ['Hardpoints knocked out', attempt.breakdown.enemyEliminatedPct, SCORE.enemyEliminated, attempt.breakdown.terms.enemyEliminated],
                  ['Own durability remaining', attempt.breakdown.ownRemainingPct, SCORE.ownRemaining, attempt.breakdown.terms.ownRemaining],
                  ['Round efficiency', attempt.breakdown.roundEfficiencyPct, SCORE.roundEfficiency, attempt.breakdown.terms.roundEfficiency],
                ] as Array<[string, number, number, number]>
              ).map(([label, pct, weight, pts]) => (
                <tr key={label}>
                  <td className="py-1 text-neutral-300">{label}</td>
                  <td className="py-1 text-right font-mono text-neutral-500">
                    {Math.round(pct * 100)}% × {weight.toLocaleString()}
                  </td>
                  <td className="py-1 text-right font-mono text-neutral-100">{Math.floor(pts).toLocaleString()}</td>
                </tr>
              ))}
              <tr>
                <td className="py-1 text-neutral-300">Clear bonus</td>
                <td className="py-1 text-right font-mono text-neutral-500">{attempt.breakdown.cleared ? 'Warden defeated' : 'not cleared'}</td>
                <td className="py-1 text-right font-mono text-neutral-100">{attempt.breakdown.terms.clearBonus.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </section>
      )}

      {/* Timeline. */}
      {battle && (
        <section className="mt-3 rounded border border-neutral-800 p-3">
          <button onClick={() => setShowTimeline((v) => !v)} className="flex w-full items-center justify-between text-left">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">Timeline · {lines.length} shots</span>
            <span className="text-neutral-500">{showTimeline ? '▾' : '▸'}</span>
          </button>
          {showTimeline && (
            <ol className="mt-2 max-h-72 space-y-0.5 overflow-y-auto text-[11px]">
              {lines.map((l) => (
                <li key={l.index} className={l.side === 'attacker' ? 'text-neutral-300' : 'text-red-200/80'}>
                  <span className="font-mono text-neutral-600">{l.round === 0 ? 'wave' : `r${l.round}`}</span> {l.text}
                </li>
              ))}
            </ol>
          )}
          {battle.notes.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-[10px] text-neutral-500">
              {battle.notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
