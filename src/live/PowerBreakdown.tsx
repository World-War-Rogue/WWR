/**
 * Where your power comes from.
 *
 * The profile shows one number. This shows the four things inside it -
 * Service Rank, category buildings, packages, System Integration - as a bar,
 * then per Task Force, then per asset, so a player can see which purchase
 * moved the number and which would move it next. Combat Systems sit beside
 * the score, not in it: they multiply the fight, not the figure.
 */
import {useEffect, useState} from 'react';
import {CATEGORY_LABEL} from '../../shared/assets';
import {COMBAT_SYSTEM_LANES, LANE_LABEL, effectPercent} from '../../shared/combatSystems';
import {PACKAGE_KEYS} from '../../shared/upgrades';
import {ApiError, api} from '../net/api';
import type {PowerBreakdown as Breakdown} from '../../shared/powerBreakdown';
import {t} from '../i18n';
import {taskForceName} from './taskForce';

const SOURCE: Array<{key: keyof Breakdown['sources']; label: string; tint: string; hint: string}> = [
  {key: 'rank', label: 'Service Rank', tint: 'bg-neutral-300', hint: 'What every asset is worth at its rank alone'},
  {key: 'building', label: 'Category buildings', tint: 'bg-orange-400', hint: '×1.02 per building level above 1, on every asset of that category'},
  {key: 'packages', label: 'Packages', tint: 'bg-emerald-400', hint: 'Armament, Protection, Propulsion, Electronics points'},
  {key: 'integration', label: 'System Integration', tint: 'bg-cyan-400', hint: 'Bonus for keeping all four packages up, off the lowest one'},
];

export default function PowerBreakdownScreen({onClose}: {onClose: () => void}) {
  const [data, setData] = useState<Breakdown | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .power()
      .then(setData)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not reach the server.'));
  }, []);

  return (
    <div className="mx-auto max-w-3xl p-4 text-neutral-200">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-orange-400">Power breakdown</h2>
        <button
          onClick={onClose}
          className="rounded border border-neutral-700 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-200 hover:border-orange-500"
        >
          {t('nav.close')}
        </button>
      </div>

      {error && <p className="mt-3 rounded border border-red-900 bg-red-950/60 px-3 py-2 text-sm text-red-300">{error}</p>}
      {!data && !error && <p className="mt-3 text-sm text-neutral-500">Loading…</p>}

      {data && (
        <>
          <p className="mt-2 text-3xl font-semibold text-neutral-50">{data.total.toLocaleString()}</p>
          <p className="text-[11px] text-neutral-500">
            Every asset you hold, at its Service Rank, with its building boost, packages and integration. Assets outside a
            Task Force still count ({data.unassignedPower.toLocaleString()} of it).
          </p>

          {/* The four sources as one bar, then a legend with the numbers. */}
          <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-neutral-900">
            {SOURCE.map((s) => {
              const v = data.sources[s.key];
              const pct = data.total === 0 ? 0 : (Math.max(0, v) / data.total) * 100;
              return <span key={s.key} className={`${s.tint} block h-full`} style={{width: `${pct}%`}} title={`${s.label}: ${v.toLocaleString()}`} />;
            })}
          </div>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-4">
            {SOURCE.map((s) => (
              <div key={s.key}>
                <dt className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                  <span className={`inline-block h-2 w-2 rounded-sm ${s.tint}`} />
                  {s.label}
                </dt>
                <dd className="font-mono text-sm text-neutral-100">{data.sources[s.key].toLocaleString()}</dd>
                <dd className="text-[10px] text-neutral-600">{s.hint}</dd>
              </div>
            ))}
          </dl>

          <section className="mt-5">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">Task Forces</h3>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {data.taskForces.map((tf) => (
                <div key={tf.squad} className="rounded border border-neutral-800 bg-neutral-950 p-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-semibold text-neutral-100">{taskForceName(tf.squad)}</span>
                    <span className="font-mono text-sm text-neutral-200">{tf.power.toLocaleString()}</span>
                  </div>
                  <p className="text-[10px] text-neutral-600">{tf.assets} of 6 slots filled</p>
                  <ul className="mt-1.5 space-y-0.5 text-[11px]">
                    {COMBAT_SYSTEM_LANES.map((lane) => (
                      <li key={lane} className="flex justify-between">
                        <span className="text-neutral-400">
                          {LANE_LABEL[lane]} <span className="font-mono text-neutral-600">{tf.systems[lane]}</span>
                        </span>
                        <span className={tf.systems[lane] > 1 ? 'font-mono text-emerald-400' : 'font-mono text-neutral-700'}>
                          {effectPercent(lane, tf.systems[lane])}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1 text-[10px] text-neutral-600">Combat Systems multiply the fight; they are not in the power score.</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-5">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">Every asset</h3>
            <div className="mt-2 overflow-x-auto rounded border border-neutral-800">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-neutral-900/60 text-[10px] uppercase tracking-wider text-neutral-500">
                  <tr>
                    <th className="px-2 py-1.5">Asset</th>
                    <th className="px-2 py-1.5">TF</th>
                    <th className="px-2 py-1.5 text-right">Rank</th>
                    <th className="px-2 py-1.5 text-right">Bldg</th>
                    <th className="px-2 py-1.5 text-right">Pkgs</th>
                    <th className="px-2 py-1.5 text-right">Integ.</th>
                    <th className="px-2 py-1.5 text-right">Power</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900">
                  {data.assets.map((a) => (
                    <tr key={a.assetId}>
                      <td className="px-2 py-1.5">
                        <span className="font-semibold text-neutral-200">{a.code}</span>
                        <span className="block text-[10px] text-neutral-600">
                          {CATEGORY_LABEL[a.category]} · Lv {a.level} · {PACKAGE_KEYS.map((k) => a.packages[k]).join('/')}
                          {a.hub && ` · ${a.hub.replace(/_/g, ' ')} ${a.hubLevel} (×${a.boost.toFixed(3)})`}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-neutral-400">{a.squad ?? '—'}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-neutral-300">{a.fromRank.toLocaleString()}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-orange-300">{a.fromBuilding > 0 ? `+${a.fromBuilding.toLocaleString()}` : '—'}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-emerald-300">{a.fromPackages > 0 ? `+${a.fromPackages.toLocaleString()}` : '—'}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-cyan-300">{a.fromIntegration > 0 ? `+${a.fromIntegration.toLocaleString()}` : '—'}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-neutral-100">{a.power.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
