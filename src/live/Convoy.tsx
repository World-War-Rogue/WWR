/**
 * The Alliance Convoy screen.
 *
 * Everything is read from `/api/convoy`. A member boards one of five trucks
 * during the two-hour window; leadership names the Guardian and can call the
 * day's one paid Contract Convoy; the Guardian fits six of their own ready
 * assets into the Vanguard and Rear Guard slots. Once launched, the Convoy
 * crosses the world map as a formation - there is nothing to attack.
 */
import {useEffect, useState} from 'react';
import {ASSET_BY_ID, assetLabel} from '../../shared/assets';
import {CONVOY_TRUCKS, GUARD_SLOTS, GUARD_SLOT_LABEL, type GuardSlot, CONVOY_RULES} from '../../shared/allianceConvoy';
import {formatClock} from '../../shared/gametime';
import {ApiError, type AllianceConvoyView, type ConvoyView, api} from '../net/api';
import {remaining} from './BuildingPanel';
import AssetIcon from './AssetIcon';
import {useModal} from './guide/useModal';
import {t} from '../i18n';

export default function Convoy({onClose}: {onClose: () => void}) {
  useModal();
  const [view, setView] = useState<AllianceConvoyView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [tab, setTab] = useState<'daily' | 'contract'>('daily');

  const load = () =>
    api
      .convoy()
      .then(setView)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not reach the server.'));

  useEffect(() => {
    load();
    const id = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  async function act(fn: () => Promise<{view: AllianceConvoyView}>, ok?: string) {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const r = await fn();
      setView(r.view);
      if (ok) setNote(ok);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'That did not stick.');
    } finally {
      setBusy(false);
    }
  }

  const btn = 'rounded border border-neutral-700 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-200 hover:border-orange-500 hover:text-orange-200 disabled:opacity-40';
  const active = view ? (tab === 'daily' ? view.daily : view.contract) : null;

  return (
    <div className="mx-auto max-w-3xl p-4 text-neutral-200">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-orange-400">Alliance Convoy</h2>
          <p className="text-[11px] text-neutral-500">Board a truck, ride under escort. Season 1: a Convoy cannot be attacked.</p>
        </div>
        <button onClick={onClose} className={btn}>
          {t('nav.close')}
        </button>
      </div>

      {error && <p className="mt-3 rounded border border-red-900 bg-red-950/60 px-3 py-2 text-sm text-red-300">{error}</p>}
      {note && <p className="mt-3 rounded border border-emerald-900 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-300">{note}</p>}
      {!view && !error && <p className="mt-3 text-sm text-neutral-500">Reading the Convoy…</p>}

      {view && !view.inAlliance && (
        <p className="mt-4 rounded border border-neutral-800 bg-neutral-950 p-4 text-sm text-neutral-400">
          Join an alliance to ride the Convoy.
        </p>
      )}

      {view && view.inAlliance && (
        <>
          {view.members < view.minMembers && !view.daily && (
            <p className="mt-3 rounded border border-amber-900/60 bg-amber-950/30 px-3 py-2 text-[12px] text-amber-300">
              The free Daily Convoy needs {view.minMembers} alliance members. You have {view.members}.
            </p>
          )}

          <div className="mt-3 flex gap-1">
            {(['daily', 'contract'] as const).map((k) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`rounded border px-2.5 py-1 text-[11px] ${tab === k ? 'border-orange-600 bg-orange-950/40 text-orange-200' : 'border-neutral-700 text-neutral-400'}`}
              >
                {k === 'daily' ? 'Daily Convoy' : 'Contract Convoy'}
              </button>
            ))}
          </div>

          {tab === 'contract' && !view.contract && (
            <div className="mt-3 rounded border border-neutral-800 bg-neutral-950 p-3">
              <p className="text-sm text-neutral-200">One extra Convoy today, called by leadership.</p>
              <p className="mt-1 text-[11px] text-neutral-500">Paid in Tokens. Same two-hour window, five trucks, Guardian and escort.</p>
              {view.isLeadership ? (
                <button onClick={() => void act(() => api.convoyContract(), 'Contract Convoy called.')} disabled={busy} className={`${btn} mt-2 border-orange-700 text-orange-200`}>
                  Call a Contract Convoy · {view.contractTokens.toLocaleString()} Tokens
                </button>
              ) : (
                <p className="mt-2 text-[11px] text-amber-400">Only alliance leadership can call a Contract Convoy.</p>
              )}
            </div>
          )}

          {active && <ConvoyPanel view={view} convoy={active} now={now} busy={busy} act={act} />}
          {tab === 'daily' && !view.daily && view.members >= view.minMembers && (
            <p className="mt-3 text-sm text-neutral-500">Today’s Convoy is being prepared…</p>
          )}

          <section className="mt-4 rounded border border-neutral-800 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">Rules</p>
            <ul className="mt-1 space-y-0.5 text-[11px] text-neutral-500">
              {CONVOY_RULES.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

function ConvoyPanel({
  view,
  convoy,
  now,
  busy,
  act,
}: {
  view: AllianceConvoyView;
  convoy: ConvoyView;
  now: number;
  busy: boolean;
  act: (fn: () => Promise<{view: AllianceConvoyView}>, ok?: string) => Promise<void>;
}) {
  const joining = convoy.state === 'joining';
  const btn = 'rounded border border-neutral-700 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-200 hover:border-orange-500 hover:text-orange-200 disabled:opacity-40';
  return (
    <section className="mt-3 rounded border border-neutral-800 bg-neutral-950 p-3">
      <div className="flex items-baseline justify-between">
        <p className="text-sm text-neutral-100">
          {convoy.kind === 'daily' ? 'Daily Convoy' : 'Contract Convoy'}{' '}
          <span className="text-[11px] uppercase tracking-wider text-neutral-500">{joining ? 'Boarding' : 'Launched'}</span>
        </p>
        <p className="text-[11px] text-neutral-500">
          {joining ? `Locks ${formatClock(convoy.locksAt)} RST · ${remaining(Math.max(0, convoy.locksAt - now))}` : 'On the road'}
        </p>
      </div>

      {/* Trucks. */}
      <div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-5">
        {Array.from({length: CONVOY_TRUCKS}, (_, tr) => {
          const count = convoy.trucks[tr] ?? 0;
          const full = count >= convoy.capacity;
          const mine = convoy.myTruck === tr;
          return (
            <button
              key={tr}
              onClick={() => void act(() => api.convoyJoin(convoy.id, tr).then((r) => ({view: r.view})))}
              disabled={busy || !joining || (full && !mine)}
              className={`rounded border p-2 text-left ${mine ? 'border-orange-500 bg-orange-950/40' : full ? 'border-neutral-800 bg-neutral-950 opacity-60' : 'border-neutral-700 bg-neutral-900 hover:border-orange-500'}`}
            >
              <span className="block text-[11px] font-semibold text-neutral-100">Truck {tr + 1}</span>
              <span className="block font-mono text-sm text-neutral-300">
                {count} / {convoy.capacity}
              </span>
              {mine && <span className="block text-[10px] text-orange-300">you’re aboard</span>}
              {full && !mine && <span className="block text-[10px] text-neutral-600">full</span>}
            </button>
          );
        })}
      </div>
      {joining && convoy.myTruck !== null && (
        <button onClick={() => void act(() => api.convoyLeave(convoy.id).then((r) => ({view: r.view})))} disabled={busy} className={`${btn} mt-2`}>
          Leave the Convoy
        </button>
      )}

      {/* Guardian + escort. */}
      <div className="mt-3 rounded border border-neutral-800 bg-neutral-900/40 p-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
          Guardian {convoy.guardian ? <span className="normal-case tracking-normal text-neutral-200">· {convoy.guardian.username}</span> : <span className="normal-case tracking-normal text-neutral-600">· none yet</span>}
        </p>
        {view.isLeadership && joining && (!convoy.guardian || !convoy.guardConfigured) && (
          <GuardianPicker view={view} convoyId={convoy.id} busy={busy} act={act} />
        )}
        {convoy.guardian?.isMe && joining && <EscortEditor view={view} convoy={convoy} busy={busy} act={act} />}
        {convoy.guard && (
          <ul className="mt-2 grid grid-cols-2 gap-1 sm:grid-cols-3">
            {GUARD_SLOTS.map((slot) => {
              const g = convoy.guard?.find((x) => x.slot === slot);
              const asset = g ? ASSET_BY_ID[g.assetId] : null;
              return (
                <li key={slot} className="flex items-center gap-1.5 rounded border border-neutral-800 bg-neutral-950 px-1.5 py-1">
                  {asset && <AssetIcon asset={asset} size={26} level={g?.level ?? 1} />}
                  <span className="min-w-0">
                    <span className="block text-[10px] text-neutral-500">{GUARD_SLOT_LABEL[slot]}</span>
                    <span className="block truncate text-[11px] text-neutral-200">{asset ? assetLabel(asset) : '—'}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {!convoy.guard && <p className="mt-1 text-[11px] text-neutral-600">The Guardian has not set the escort yet.</p>}
      </div>
    </section>
  );
}

function GuardianPicker({
  view,
  convoyId,
  busy,
  act,
}: {
  view: AllianceConvoyView;
  convoyId: string;
  busy: boolean;
  act: (fn: () => Promise<{view: AllianceConvoyView}>, ok?: string) => Promise<void>;
}) {
  const [name, setName] = useState('');
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1">
      <select value={name} onChange={(e) => setName(e.target.value)} className="rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-[11px] text-neutral-200">
        <option value="">Choose a Guardian…</option>
        {view.roster.map((r) => (
          <option key={r.username} value={r.username}>
            {r.username}
          </option>
        ))}
      </select>
      <button
        onClick={() => name && void act(() => api.convoyGuardian(convoyId, name).then((r) => ({view: r.view})), 'Guardian set.')}
        disabled={busy || !name}
        className="rounded border border-orange-700 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-orange-200 disabled:opacity-40"
      >
        Set Guardian
      </button>
    </div>
  );
}

function EscortEditor({
  view,
  convoy,
  busy,
  act,
}: {
  view: AllianceConvoyView;
  convoy: ConvoyView;
  busy: boolean;
  act: (fn: () => Promise<{view: AllianceConvoyView}>, ok?: string) => Promise<void>;
}) {
  const start: Record<string, string> = {};
  for (const g of convoy.guard ?? []) start[g.slot] = g.assetId;
  const [slots, setSlots] = useState<Record<string, string>>(start);
  const chosen = new Set(Object.values(slots).filter(Boolean));
  const ready = view.myAssets.filter((a) => a.ready);
  const complete = GUARD_SLOTS.every((s) => slots[s]);

  function pick(slot: GuardSlot, assetId: string) {
    setSlots((prev) => {
      const next = {...prev};
      // One asset in one slot: placing it elsewhere clears the old slot.
      for (const s of Object.keys(next)) if (next[s] === assetId) delete next[s];
      next[slot] = assetId;
      return next;
    });
  }

  return (
    <div className="mt-2 rounded border border-orange-900/40 bg-neutral-950 p-2">
      <p className="text-[10px] uppercase tracking-wider text-orange-300">Arrange your escort — six ready assets</p>
      <div className="mt-1 grid grid-cols-2 gap-1 sm:grid-cols-3">
        {GUARD_SLOTS.map((slot) => (
          <label key={slot} className="block rounded border border-neutral-800 bg-neutral-900 p-1">
            <span className="block text-[10px] text-neutral-500">{GUARD_SLOT_LABEL[slot]}</span>
            <select
              value={slots[slot] ?? ''}
              onChange={(e) => pick(slot, e.target.value)}
              className="mt-0.5 w-full rounded border border-neutral-700 bg-neutral-950 px-1 py-0.5 text-[11px] text-neutral-200"
            >
              <option value="">—</option>
              {ready.map((a) => (
                <option key={a.assetId} value={a.assetId} disabled={chosen.has(a.assetId) && slots[slot] !== a.assetId}>
                  {ASSET_BY_ID[a.assetId]?.code ?? a.assetId} · Lv {a.level}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <button
        onClick={() =>
          void act(
            () => api.convoyGuard(convoy.id, GUARD_SLOTS.map((s) => ({slot: s, assetId: slots[s]})).filter((x) => x.assetId)).then((r) => ({view: r.view})),
            'Escort set.',
          )
        }
        disabled={busy || !complete}
        className="mt-2 rounded border border-orange-700 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-orange-200 disabled:opacity-40"
      >
        Set escort
      </button>
      {view.myAssets.length > 0 && ready.length < 6 && <p className="mt-1 text-[10px] text-amber-400">You need six ready assets; some are under repair, disabled or out.</p>}
    </div>
  );
}
