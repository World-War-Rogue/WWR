/**
 * Arena Squad setup.
 *
 * Six formation slots and the roster. Tap a slot, tap an asset; tap a
 * filled slot again to clear it. Copy a Task Force in one tap. Save sends
 * the slot list and nothing else - the server validates it against the
 * roster it holds and answers with the power it computed. Enter Arena is
 * only offered once the saved squad is one the server says can enter.
 */
import {useEffect, useMemo, useState} from 'react';
import {ASSET_BY_ID, ROLE_LABEL, SQUAD_NAMES, SQUAD_SLOTS, assetLabel} from '../../shared/assets';
import {ARENA_SQUAD_RULES} from '../../shared/arenaSquad';
import {droneCount} from '../../shared/drones';
import {NO_SYSTEMS} from '../../shared/combatSystems';
import {ApiError, type ArenaSquadView, api} from '../net/api';
import AssetIcon from './AssetIcon';
import CombatSystemsPanel from './CombatSystems';
import {useModal} from './guide/useModal';
import {taskForceName} from './taskForce';

const POSITION_LABEL = ['Front', 'Front', 'Centre', 'Centre', 'Rear', 'Rear'];

export default function ArenaSquad({onClose, onEnter}: {onClose: () => void; onEnter: () => void}) {
  useModal();
  const [view, setView] = useState<ArenaSquadView | null>(null);
  const [slots, setSlots] = useState<Array<string | null>>(Array<string | null>(SQUAD_SLOTS).fill(null));
  const [picked, setPicked] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let live = true;
    api
      .arenaSquad()
      .then((v) => {
        if (!live) return;
        setView(v);
        setSlots(v.slots);
      })
      .catch((e) => live && setError(e instanceof ApiError ? e.message : 'Could not reach the server.'));
    return () => {
      live = false;
    };
  }, []);

  const roster = useMemo(() => new Map((view?.roster ?? []).map((r) => [r.assetId, r])), [view]);
  const localPower = slots.reduce((sum, id) => sum + (id ? (roster.get(id)?.power ?? 0) : 0), 0);
  const chosen = slots.filter((id): id is string => !!id);
  const localBlock = chosen.length === 0 ? 'The squad is empty.' : droneCount(chosen) === 0 ? 'Needs a drone.' : (chosen.map((id) => roster.get(id)?.unavailable).find(Boolean) ?? null);

  function put(slot: number, id: string | null) {
    setSlots((prev) => {
      const next = [...prev];
      // An asset sits in one slot: placing it again moves it.
      if (id) {
        const was = next.indexOf(id);
        if (was >= 0) next[was] = prev[slot];
      }
      next[slot] = id;
      return next;
    });
    setDirty(true);
    setPicked(null);
  }

  function copy(name: string) {
    const tf = view?.taskForces[name];
    if (!tf) return;
    setSlots([...tf]);
    setDirty(true);
    setPicked(null);
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const v = await api.arenaSaveSquad(slots);
      setView(v);
      setSlots(v.slots);
      setDirty(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'That did not stick.');
    } finally {
      setBusy(false);
    }
  }

  const btn = 'rounded border border-neutral-700 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-200 hover:border-orange-500 hover:text-orange-200 disabled:opacity-40';
  const canEnter = !!view && !dirty && !view.blocked;

  return (
    <div className="mx-auto max-w-3xl p-4 text-neutral-200">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-orange-400">Arena Squad</h2>
          <p className="text-[11px] text-neutral-500">Your Arena loadout. Separate from Task Forces Alpha–Delta; nothing here moves on the map.</p>
        </div>
        <button onClick={onClose} className={btn}>
          Close
        </button>
      </div>

      {error && <p className="mt-3 rounded border border-red-900 bg-red-950/60 px-3 py-2 text-sm text-red-300">{error}</p>}
      {!view && !error && <p className="mt-3 text-sm text-neutral-500">Reading your roster…</p>}

      {view && (
        <>
          <section className="mt-3 rounded border border-neutral-800 bg-neutral-950 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-neutral-100">
                Power <span className="font-mono">{(dirty ? localPower : view.power).toLocaleString()}</span>
                {dirty && <span className="ml-2 text-[10px] uppercase tracking-wider text-amber-400">unsaved</span>}
              </p>
              <div className="flex gap-1">
                <button onClick={() => void save()} disabled={busy || !dirty} className={`${btn} border-orange-700 text-orange-200`}>
                  {busy ? '…' : 'Save squad'}
                </button>
                <button onClick={onEnter} disabled={!canEnter} className={`${btn} border-emerald-700 text-emerald-200`} title={view.blocked ?? (dirty ? 'Save first' : '')}>
                  Enter Arena
                </button>
              </div>
            </div>
            {(dirty ? localBlock : view.blocked) && <p className="mt-1 text-[11px] text-amber-400">{dirty ? localBlock : view.blocked}</p>}

            {/* Formation. */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              {slots.map((id, slot) => {
                const asset = id ? ASSET_BY_ID[id] : null;
                const r = id ? roster.get(id) : undefined;
                return (
                  <button
                    key={slot}
                    onClick={() => (picked === slot && id ? put(slot, null) : setPicked(slot))}
                    className={`flex min-h-[4.5rem] items-center gap-2 rounded border px-2 py-1 text-left ${
                      picked === slot ? 'border-orange-500 bg-orange-950/40' : asset ? 'border-neutral-700 bg-neutral-900' : 'border-dashed border-neutral-800'
                    }`}
                  >
                    {asset ? (
                      <>
                        <AssetIcon asset={asset} size={38} level={r?.level ?? 1} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-semibold text-neutral-100">{assetLabel(asset)}</span>
                          <span className="block text-[10px] text-neutral-500">
                            {POSITION_LABEL[slot]} · {ROLE_LABEL[asset.role]} · Lv {r?.level ?? 1}
                          </span>
                          {r?.unavailable && <span className="block text-[10px] text-amber-400">{r.unavailable}</span>}
                          {picked === slot && <span className="block text-[10px] text-orange-300">tap again to clear</span>}
                        </span>
                      </>
                    ) : (
                      <span className="w-full text-center text-[11px] text-neutral-600">{POSITION_LABEL[slot]} · empty</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-1 text-[10px] text-neutral-500">
              <span>Copy:</span>
              {SQUAD_NAMES.map((name) => (
                <button key={name} onClick={() => copy(name)} className="rounded border border-neutral-800 px-1.5 py-0.5 text-neutral-300 hover:border-neutral-500">
                  {taskForceName(name)}
                </button>
              ))}
              <button onClick={() => { setSlots(Array<string | null>(SQUAD_SLOTS).fill(null)); setDirty(true); }} className="rounded border border-neutral-800 px-1.5 py-0.5 text-neutral-400 hover:border-neutral-500">
                Clear
              </button>
            </div>
          </section>

          {/* Roster. */}
          <section className="mt-3 rounded border border-neutral-800 bg-neutral-950 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
              Roster {picked !== null && <span className="normal-case tracking-normal text-orange-300">· tap an asset for slot {picked + 1}</span>}
            </p>
            <ul className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {view.roster.map((r) => {
                const asset = ASSET_BY_ID[r.assetId];
                if (!asset) return null;
                const inSlot = slots.indexOf(r.assetId);
                return (
                  <li key={r.assetId}>
                    <button
                      onClick={() => picked !== null && put(picked, r.assetId)}
                      disabled={picked === null}
                      className={`flex w-full items-center gap-1.5 rounded border px-1.5 py-1 text-left ${
                        inSlot >= 0 ? 'border-orange-900/60 bg-orange-950/20' : 'border-neutral-800 bg-neutral-900/40'
                      } ${picked === null ? 'opacity-70' : 'hover:border-orange-500'}`}
                    >
                      <AssetIcon asset={asset} size={30} level={r.level} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[11px] text-neutral-100">{assetLabel(asset)}</span>
                        <span className="block text-[10px] text-neutral-500">
                          Lv {r.level} · <span className="font-mono">{r.power.toLocaleString()}</span>
                          {r.taskForce && <> · {taskForceName(r.taskForce)}</>}
                          {inSlot >= 0 && <> · slot {inSlot + 1}</>}
                        </span>
                        {r.unavailable && <span className="block text-[10px] text-amber-400">{r.unavailable}</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="mt-3">
            <CombatSystemsPanel
              squad="Arena"
              systems={view.systems ?? NO_SYSTEMS}
              wallet={view.wallet}
              commandCenter={view.commandCenter}
              season={view.season}
              locked={false}
              onChanged={(wallet, systems) => setView((v) => (v ? {...v, wallet, systems: systems.Arena ?? v.systems} : v))}
            />
          </section>

          <section className="mt-3 rounded border border-neutral-800 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">Rules</p>
            <ul className="mt-1 space-y-0.5 text-[11px] text-neutral-500">
              {ARENA_SQUAD_RULES.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
