/**
 * Development progression tools. Test realm only: the screen exists in the
 * bundle everywhere, but it is reachable only when `/api/dev/progression`
 * answers, which it does solely on a Worker with ALLOW_DEV_PROGRESSION_SEEDS
 * set and only to the owner. On production the menu never shows it.
 *
 * Everything here acts on the `qa-progression-max` account, never on the
 * signed-in one. Inspect the result by "Sign in as" that account.
 */
import {useEffect, useState} from 'react';
import {ASSETS} from '../../shared/assets';
import {COMBAT_SYSTEM_LANES, LANE_LABEL} from '../../shared/combatSystems';
import {PACKAGE_KEYS, PACKAGE_LABEL} from '../../shared/upgrades';
import {ApiError, type DevStatus, api} from '../net/api';

const LEVELS = [1, 10, 20, 30, 40, 50];

export default function DevTools({onClose}: {onClose: () => void}) {
  const [status, setStatus] = useState<DevStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState('');
  const [kind, setKind] = useState<'building' | 'asset' | 'package' | 'combat-system'>('building');
  const [id, setId] = useState('command_center');
  const [pkg, setPkg] = useState<string>(PACKAGE_KEYS[0]);
  const [squad, setSquad] = useState('Alpha');
  const [lane, setLane] = useState<string>(COMBAT_SYSTEM_LANES[0]);
  const [level, setLevel] = useState(50);
  const [tokens, setTokens] = useState(100000);
  const [credits, setCredits] = useState(100000);

  useEffect(() => {
    api
      .devStatus()
      .then(setStatus)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Dev tools are not available on this server.'));
  }, []);

  async function run(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const r = await api.devAction(body);
      setNote(r.message);
      setStatus(r.status);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'That did not stick.');
    } finally {
      setBusy(false);
    }
  }

  const btn = 'rounded border border-neutral-700 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-200 hover:border-orange-500 hover:text-orange-200 disabled:opacity-40';
  const input = 'rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-neutral-100';
  const idOptions =
    kind === 'building'
      ? (status?.buildings ?? []).map((b) => ({value: b, label: b}))
      : kind === 'combat-system'
        ? []
        : ASSETS.filter((a) => a.draftable !== false).map((a) => ({value: a.id, label: `${a.code} · ${a.name}`}));

  return (
    <div className="mx-auto max-w-2xl p-4 text-neutral-200">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-orange-400">Dev · progression seeds</h2>
        <button onClick={onClose} className={btn}>
          Close
        </button>
      </div>
      <p className="mt-1 text-[11px] text-neutral-500">
        Test realm only. Every action here acts on <span className="font-mono">qa-progression-max</span>, is validated on
        the server, runs in one transaction and is written to the audit log.
      </p>

      {error && <p className="mt-3 rounded border border-red-900 bg-red-950/60 px-3 py-2 text-sm text-red-300">{error}</p>}
      {note && <p className="mt-3 rounded border border-emerald-900 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-300">{note}</p>}

      {status && (
        <>
          <section className="mt-4 rounded border border-neutral-800 p-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">Account</h3>
            {status.account ? (
              <p className="mt-1 text-sm">
                <span className="font-mono">{status.account.username}</span>{' '}
                <span className="text-neutral-500">role {status.account.role}</span>
                <a
                  href={`/api/admin/impersonate?player=${encodeURIComponent(status.account.id)}`}
                  className="ml-3 rounded border border-cyan-700 bg-cyan-950/40 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-cyan-200"
                >
                  Sign in as
                </a>
              </p>
            ) : (
              <p className="mt-1 text-sm text-neutral-400">Not created yet.</p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={status.account ? 'New password (8+)' : 'Password (8+)'}
                className={input}
              />
              <button disabled={busy || password.length < 8} onClick={() => void run({action: 'create', password})} className={btn}>
                {status.account ? 'Replace password' : 'Create account'}
              </button>
            </div>
          </section>

          <section className="mt-3 rounded border border-neutral-800 p-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">Every track at once</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              <button disabled={busy || !status.account} onClick={() => void run({action: 'reset'})} className={`${btn} border-red-800 text-red-200`}>
                Reset to 1
              </button>
              {LEVELS.filter((l) => l > 1).map((l) => (
                <button key={l} disabled={busy || !status.account} onClick={() => void run({action: 'set-all', level: l})} className={btn}>
                  All → {l}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[10px] text-neutral-600">
              Buildings, every owned asset's Service Rank and four packages, and every Task Force's three Combat Systems.
              Season and Command Center caps still apply to purchases made afterwards.
            </p>
          </section>

          <section className="mt-3 rounded border border-neutral-800 p-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">One thing</h3>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <select value={kind} onChange={(e) => { const k = e.target.value as typeof kind; setKind(k); setId(k === 'building' ? 'command_center' : ASSETS[0].id); }} className={input}>
                <option value="building">Building</option>
                <option value="asset">Asset (Service Rank)</option>
                <option value="package">Package lane</option>
                <option value="combat-system">Combat System</option>
              </select>
              {kind !== 'combat-system' && (
                <select value={id} onChange={(e) => setId(e.target.value)} className={input}>
                  {idOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              )}
              {kind === 'package' && (
                <select value={pkg} onChange={(e) => setPkg(e.target.value)} className={input}>
                  {PACKAGE_KEYS.map((k) => (
                    <option key={k} value={k}>
                      {PACKAGE_LABEL[k]}
                    </option>
                  ))}
                </select>
              )}
              {kind === 'combat-system' && (
                <>
                  <select value={squad} onChange={(e) => setSquad(e.target.value)} className={input}>
                    {status.squads.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <select value={lane} onChange={(e) => setLane(e.target.value)} className={input}>
                    {COMBAT_SYSTEM_LANES.map((l) => (
                      <option key={l} value={l}>
                        {LANE_LABEL[l]}
                      </option>
                    ))}
                  </select>
                </>
              )}
              <select value={level} onChange={(e) => setLevel(Number(e.target.value))} className={input}>
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    level {l}
                  </option>
                ))}
              </select>
              <button
                disabled={busy || !status.account}
                onClick={() => void run({action: 'max-one', kind, id, package: pkg, squad, lane, level})}
                className={btn}
              >
                Set
              </button>
            </div>
          </section>

          <section className="mt-3 rounded border border-neutral-800 p-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">Wallet and limits</h3>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input type="number" value={tokens} onChange={(e) => setTokens(Number(e.target.value))} className={`${input} w-32`} />
              <span className="text-[11px] text-neutral-500">Tokens</span>
              <input type="number" value={credits} onChange={(e) => setCredits(Number(e.target.value))} className={`${input} w-32`} />
              <span className="text-[11px] text-neutral-500">Credits</span>
              <button disabled={busy || !status.account} onClick={() => void run({action: 'grant', tokens, credits})} className={btn}>
                Grant
              </button>
              <button disabled={busy || !status.account} onClick={() => void run({action: 'clear-limits'})} className={btn}>
                Clear limits
              </button>
              <button disabled={busy || !status.account} onClick={() => void run({action: 'seed-liveries'})} className={btn}>
                Seed liveries
              </button>
            </div>
          </section>

          <section className="mt-3 rounded border border-neutral-800 p-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">Registry</h3>
            <p className="mt-1 text-[11px] text-neutral-400">
              {status.tracks.length} tracks, levels 1–50 each.{' '}
              {status.registryProblems.length === 0 ? (
                <span className="text-emerald-400">Validates clean.</span>
              ) : (
                <span className="text-red-300">{status.registryProblems.length} problems.</span>
              )}
            </p>
            <ul className="mt-1 grid grid-cols-2 gap-x-3 text-[10px] text-neutral-500 sm:grid-cols-3">
              {status.tracks.map((t) => (
                <li key={t.id}>
                  {t.displayName}
                  {t.placeholderFrom && <span className="text-amber-500/80"> · placeholder from {t.placeholderFrom}</span>}
                </li>
              ))}
            </ul>
            {status.registryProblems.length > 0 && (
              <ul className="mt-2 text-[11px] text-red-300">
                {status.registryProblems.map((p, i) => (
                  <li key={i}>
                    {p.track} {p.level ?? ''}: {p.problem}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mt-3 rounded border border-neutral-800 p-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">Audit log</h3>
            {status.recent.length === 0 ? (
              <p className="mt-1 text-[11px] text-neutral-500">Nothing yet.</p>
            ) : (
              <ul className="mt-1 divide-y divide-neutral-900 text-[11px]">
                {status.recent.map((r, i) => (
                  <li key={i} className="flex gap-3 py-1">
                    <span className="shrink-0 font-mono text-neutral-500">{new Date(r.at).toISOString().slice(0, 19).replace('T', ' ')}</span>
                    <span className="font-semibold text-neutral-200">{r.action}</span>
                    <span className="truncate font-mono text-neutral-500">{r.params}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
