/**
 * Four squads of six.
 *
 * The screen is a board and a bench: the squads at the top, everything you
 * hold underneath. Tapping a slot selects it; tapping an asset fills it. Two
 * taps rather than a drag, because this has to work on a phone and dragging a
 * card across a scrolling list with a thumb is how people lose their place.
 *
 * Every rule is the server's. The one rule left is that an asset sits in
 * exactly one squad, and the database enforces it.
 *
 * The lift BUDGET is gone as of 2026-09-06 - any six assets, in any squad, in
 * any combination. Lift is still shown, because the weight of a squad is worth
 * seeing and lift is still what sets each asset's attribute points, but nothing
 * is refused for it any more and nothing here greys out because of it.
 */
import {type PointerEvent as ReactPointerEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {ASSET_BY_ID, CATEGORY_LABEL, ROLE_LABEL, SQUAD_NAMES, SQUAD_SLOTS, type Asset, type AssetCategory, assetLabel} from '../../shared/assets';
import {ApiError, type SquadView, api} from '../net/api';
import {attributesWith} from '../../shared/upgrades';
import {categoryBoost} from '../../shared/buildings';
import {DRONE_WORDING, droneNetworkMultiplier, isDrone} from '../../shared/drones';
import {DELTA_BUY_LEVEL, DELTA_FREE_RANK, DELTA_PRICE, TASK_FORCE_UNLOCK, taskForceOpen} from '../../shared/season';
import {guideEvent} from './guide/bus';
import {useModal} from './guide/useModal';
import AssetIcon from './AssetIcon';
import ForcesTabs from './ForcesTabs';
import {t} from '../i18n';
import {taskForceName} from './taskForce';
import CombatSystemsPanel from './CombatSystems';
import {NO_SYSTEMS} from '../../shared/combatSystems';

const ROLE_TINT: Record<string, string> = {
  breach: 'text-red-300',
  screen: 'text-sky-300',
  strike: 'text-orange-300',
  overwatch: 'text-amber-300',
  recon: 'text-emerald-300',
  lift: 'text-neutral-300',
};

/** A thin bar under the name: what the asset has left. Hidden when whole. */
function HpBar({hp, repairing}: {hp: number; repairing: boolean}) {
  if (hp >= 0.999 && !repairing) return null;
  const pct = Math.round(Math.max(0, Math.min(1, hp)) * 100);
  return (
    <span className="mt-0.5 block h-1 w-full overflow-hidden rounded-full bg-neutral-800" title={repairing ? 'Under repair' : `${pct}% hit points`}>
      <span
        className={`block h-full rounded-full ${repairing ? 'bg-cyan-400' : pct <= 0 ? 'bg-red-600' : pct < 50 ? 'bg-orange-500' : 'bg-emerald-500'}`}
        style={{width: `${repairing ? 100 : Math.max(2, pct)}%`}}
      />
    </span>
  );
}

function Slot({
  asset,
  level,
  hp = 1,
  repairing = false,
  selected,
  dropTarget,
  dragging,
  onClick,
  onPointerDown,
}: {
  asset: Asset | null;
  level: number;
  hp?: number;
  repairing?: boolean;
  selected: boolean;
  dropTarget: boolean;
  dragging: boolean;
  onClick: () => void;
  onPointerDown: (e: ReactPointerEvent) => void;
}) {
  return (
    <button
      onClick={onClick}
      onPointerDown={onPointerDown}
      // The browser's own drag would fight the pointer handling and, on touch,
      // scroll the page instead of moving the asset.
      style={{touchAction: 'none'}}
      className={`flex min-h-[5.25rem] flex-col justify-center rounded border px-2 py-1 text-left transition ${
        dropTarget
          ? 'border-orange-400 bg-orange-900/40 ring-2 ring-orange-500'
          : dragging
            ? 'border-neutral-700 bg-neutral-900 opacity-40'
            : selected
              ? 'border-orange-500 bg-orange-950/40'
              : asset
                ? 'border-neutral-700 bg-neutral-900 hover:border-neutral-500'
                : 'border-dashed border-neutral-800 bg-neutral-950 hover:border-neutral-600'
      }`}
    >
      {asset ? (
        <span className="flex items-center gap-1.5">
          <AssetIcon asset={asset} size={40} level={level} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-semibold text-neutral-100">
              {assetLabel(asset)}
            </span>
            <span className={`block truncate text-[10px] ${ROLE_TINT[asset.role]}`}>
              {ROLE_LABEL[asset.role]}
            </span>
            <span className="block font-mono text-[11px] text-neutral-500">lv {level}</span>
            <HpBar hp={hp} repairing={repairing} />
          </span>
        </span>
      ) : (
        <span className="text-center text-[11px] text-neutral-700">empty</span>
      )}
    </button>
  );
}

export default function Squads({
  onClose,
  onShowAssets,
  account,
  only = null,
}: {
  onClose: () => void;
  onShowAssets: () => void;
  /** The account button (portrait), so the menu is reachable here too. */
  account?: ReactNode;
  /**
   * Opened from a Task Force slab on the base: just that one Task Force, so
   * the player is editing the thing they tapped and not the whole roster.
   */
  only?: string | null;
}) {
  const [view, setView] = useState<SquadView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState<{squad: string; slot: number} | null>(null);
  const [pickQuery, setPickQuery] = useState('');
  /** A filled slot that was tapped: remove it, or replace it. */
  const [acting, setActing] = useState<{squad: string; slot: number} | null>(null);
  useModal(acting !== null);
  /** The slot being dragged, and the slot the pointer is currently over. */
  const [drag, setDrag] = useState<{squad: string; slot: number} | null>(null);
  /** The slot the pointer is over mid-drag. Not `over` - that name is taken
   * by the lift-exceeded flag on each squad card, and the shadowing compiles
   * into a boolean where a slot was meant. */
  const [overSlot, setOverSlot] = useState<{squad: string; slot: number} | null>(null);
  const dragRef = useRef<{
    squad: string;
    slot: number;
    x: number;
    y: number;
    moved: boolean;
  } | null>(null);
  const [pickCategory, setPickCategory] = useState<AssetCategory | 'all'>('all');

  const load = useCallback(async () => {
    try {
      setView(await api.squads());
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reach the server.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const levels = useMemo(
    () => new Map((view?.owned ?? []).map((o) => [o.assetId, o.level])),
    [view],
  );

  /** Where an asset currently sits, so the bench can say so instead of hiding it. */
  const placedIn = useMemo(() => {
    const map = new Map<string, string>();
    for (const squad of SQUAD_NAMES) {
      for (const id of view?.squads[squad] ?? []) {
        if (id) map.set(id, squad);
      }
    }
    return map;
  }, [view]);

  /**
   * Squads in the field, and the assets sitting in them.
   *
   * The server refuses either edit anyway; this exists so the screen never
   * offers one. A button that is going to be rejected is worse than no button,
   * because the player learns the rule from an error instead of from the
   * layout.
   */
  const away = useMemo(() => new Set(view?.away ?? []), [view]);
  const assetAway = useMemo(() => {
    const out = new Map<string, string>();
    for (const name of view?.away ?? []) {
      for (const id of view?.squads[name] ?? []) if (id) out.set(id, name);
    }
    return out;
  }, [view]);

  useEffect(() => {
    if (!picking) return;
    setPickQuery('');
    setPickCategory('all');
  }, [picking?.squad, picking?.slot]);

  /**
   * Dragging, on both mouse and touch, from one handler.
   *
   * The press is not a drag until the pointer has moved a few pixels, so a tap
   * still opens the slot menu. The slot under the pointer is found by
   * hit-testing the DOM rather than by caching each slot's box, because the
   * squads scroll and a cached rectangle is wrong the moment they do.
   */
  useEffect(() => {
    if (!drag) return;

    const move = (e: PointerEvent) => {
      const hit = document
        .elementsFromPoint(e.clientX, e.clientY)
        .find((n) => n instanceof HTMLElement && n.dataset.slot) as HTMLElement | undefined;
      if (!hit?.dataset.slot) {
        setOverSlot(null);
        return;
      }
      const [squad, slot] = hit.dataset.slot.split(':');
      // A squad in the field is not a drop target. Refused here rather than on
      // release, so the cell never lights up as though it would accept.
      if (away.has(squad)) {
        setOverSlot(null);
        return;
      }
      setOverSlot({squad, slot: Number(slot)});
    };

    const up = () => {
      const target = overSlot;
      const source = drag;
      setDrag(null);
      setOverSlot(null);
      dragRef.current = null;
      if (!source || !target) return;
      if (source.squad === target.squad && source.slot === target.slot) return;
      void moveTo(source, target);
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [drag, overSlot, away]);

  function beginDrag(squad: string, slot: number, e: ReactPointerEvent) {
    if (!view?.squads[squad]?.[slot]) return;
    if (away.has(squad)) return;
    dragRef.current = {squad, slot, x: e.clientX, y: e.clientY, moved: false};

    const watch = (ev: PointerEvent) => {
      const d = dragRef.current;
      if (!d || d.moved) return;
      if (Math.abs(ev.clientX - d.x) + Math.abs(ev.clientY - d.y) < 6) return;
      d.moved = true;
      setDrag({squad: d.squad, slot: d.slot});
      window.removeEventListener('pointermove', watch);
    };
    window.addEventListener('pointermove', watch);
    window.addEventListener('pointerup', () => window.removeEventListener('pointermove', watch), {
      once: true,
    });
  }

  async function moveTo(
    from: {squad: string; slot: number},
    to: {squad: string; slot: number},
  ) {
    setBusy(true);
    setError(null);
    try {
      setView(await api.moveSlot(from, to));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That did not stick.');
    } finally {
      setBusy(false);
    }
  }

  const [confirmDelta, setConfirmDelta] = useState(false);
  async function buyDelta() {
    setBusy(true);
    setError(null);
    try {
      setView(await api.buyDelta());
      setConfirmDelta(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That did not stick.');
    } finally {
      setBusy(false);
    }
  }

  async function repairAll() {
    setBusy(true);
    setError(null);
    try {
      setView(await api.repair('all'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That did not stick.');
    } finally {
      setBusy(false);
    }
  }

  async function assign(squad: string, slot: number, assetId: string | null) {
    setBusy(true);
    setError(null);
    try {
      setView(await api.assignSlot(squad, slot, assetId));
      setPicking(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That did not stick.');
    } finally {
      setBusy(false);
    }
  }


  const slotHolds = picking ? view?.squads[picking.squad]?.[picking.slot] ?? null : null;

  /**
   * What the chooser offers. Everything held, filtered.
   *
   * Nothing is ordered by what fits any more, because everything fits. Heaviest
   * first within a category, which puts the assets a player is most likely to
   * be looking for at the top of each group.
   */
  const choices = useMemo(() => {
    const q = pickQuery.trim().toLowerCase();
    return (view?.owned ?? [])
      .map((o) => ASSET_BY_ID[o.assetId])
      .filter((a): a is Asset => !!a)
      .filter((a) => pickCategory === 'all' || a.category === pickCategory)
      .filter(
        (a) =>
          !q ||
          a.name.toLowerCase().includes(q) ||
          a.code.toLowerCase().includes(q) ||
          a.operator.toLowerCase().includes(q),
      )
      .sort(
        (a, b) =>
          a.category.localeCompare(b.category) ||
          a.name.localeCompare(b.name),
      );
  }, [view, pickCategory, pickQuery]);

  return (
    // `relative` so the chooser overlay below can pin itself to this screen
    // rather than to whatever ancestor happens to be positioned.
    <div className="relative flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-neutral-800 px-3 py-3">
        <button
          onClick={onClose}
          className="rounded border border-neutral-700 px-2 py-1 text-sm text-neutral-300 hover:border-orange-600"
        >
          ‹ Back
        </button>
        <ForcesTabs active="squads" onChange={(tab) => tab === 'assets' && onShowAssets()} />
        {view && (
          <span className="ml-auto hidden text-[12px] text-neutral-400 sm:inline">
            {only ? taskForceName(only) : t('squads.sixSlots')}
          </span>
        )}
        <div className="ml-auto shrink-0 sm:ml-2">{account}</div>
      </div>

      {error && (
        <p className="shrink-0 border-b border-red-900 bg-red-950/60 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {!view ? (
          error ? (
            // The request failed: say so and offer the retry, never a blank.
            <div className="rounded border border-red-900 bg-red-950/40 p-4 text-center">
              <p className="text-sm text-red-200">{t('squads.loadFailed')}</p>
              <button
                onClick={() => void load()}
                className="mt-3 min-h-[44px] rounded border border-orange-600 bg-orange-950/40 px-5 text-sm font-semibold text-orange-200"
              >
                {t('squads.retry')}
              </button>
            </div>
          ) : (
            // A compact skeleton of the four cards while the roster loads.
            <div className="grid gap-3 lg:grid-cols-2" aria-busy="true" aria-label={t('squads.readingRoster')}>
              {SQUAD_NAMES.map((name) => (
                <div key={name} className="animate-pulse rounded border border-neutral-800 bg-neutral-950 p-3">
                  <div className="h-4 w-32 rounded bg-neutral-800" />
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {Array.from({length: SQUAD_SLOTS}, (_, i) => (
                      <div key={i} className="h-[5.25rem] rounded border border-neutral-800 bg-neutral-900/60" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <>
            <div className={only ? 'mx-auto max-w-xl' : 'grid gap-3 lg:grid-cols-2'}>
              {SQUAD_NAMES.filter((name) => !only || name === only).map((name) => {
                const filled = (view.squads[name] ?? []).filter(Boolean).length;
                const out = away.has(name);
                // Bravo and Charlie open with the Command Center (5/10); Delta is
                // earned at 20 or bought at 10.
                const cc = view.base.levels.command_center;
                const lockedAt = taskForceOpen(name, cc, name === 'Delta' && view.deltaOpen) ? null : TASK_FORCE_UNLOCK[name];
                // The Drone Network: what the drones aboard do to the march and
                // the armour, from their real stats (rank, packages, building).
                const droneIds = (view.squads[name] ?? []).filter((id): id is string => !!id && isDrone(id));
                const network = droneNetworkMultiplier(
                  droneIds.map((id) => {
                    const held = view.owned.find((o) => o.assetId === id);
                    const a = attributesWith(
                      ASSET_BY_ID[id],
                      held?.level ?? 1,
                      held?.packages,
                      categoryBoost(view.base.levels, 'drone'),
                    );
                    return {id, mobility: a.mobility, detection: a.detection};
                  }),
                );
                if (lockedAt !== null) {
                  return (
                    <section
                      key={name}
                      className="rounded border border-dashed border-neutral-800 bg-neutral-950/60 p-3"
                    >
                      <h3 className="text-sm font-semibold text-neutral-400">{taskForceName(name)}</h3>
                      {name === 'Delta' ? (
                        <>
                          <p className="mt-1 text-[11px] text-neutral-500">
                            Free at Command Center {lockedAt} once Alpha, Bravo and Charlie are full with every asset at
                            Service Rank {DELTA_FREE_RANK}. Or buy it at Command Center {DELTA_BUY_LEVEL} for{' '}
                            {DELTA_PRICE.toLocaleString()} Credits or Tokens.
                          </p>
                          {cc >= DELTA_BUY_LEVEL &&
                            (confirmDelta ? (
                              <div className="mt-2 rounded border border-orange-800 bg-neutral-950 p-2">
                                <p className="text-[11px] text-neutral-300">
                                  Buy Task Force Delta for {DELTA_PRICE.toLocaleString()} Credits or Tokens? Permanent.
                                </p>
                                <div className="mt-2 flex gap-2">
                                  <button
                                    onClick={() => void buyDelta()}
                                    disabled={busy}
                                    className="flex-1 rounded border border-orange-600 bg-orange-950/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-orange-200"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    onClick={() => setConfirmDelta(false)}
                                    className="rounded border border-neutral-700 px-3 py-1 text-[11px] uppercase tracking-wider text-neutral-300"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDelta(true)}
                                className="mt-2 rounded border border-orange-600 bg-orange-950/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-orange-200 hover:bg-orange-900/40"
                              >
                                Buy Delta · {DELTA_PRICE.toLocaleString()}
                              </button>
                            ))}
                        </>
                      ) : (
                        <p className="mt-1 text-[11px] text-neutral-500">Opens at Command Center level {lockedAt}.</p>
                      )}
                    </section>
                  );
                }
                return (
                  <section
                    key={name}
                    className={`rounded border bg-neutral-950 p-3 ${
                      out ? 'border-neutral-900 opacity-60' : 'border-neutral-800'
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="text-sm font-semibold text-neutral-100">
                        {taskForceName(name)}
                        {out && (
                          <span className="ml-2 rounded border border-orange-800 px-1.5 py-0.5 text-[10px] font-normal uppercase tracking-wider text-orange-300">
                            {t('squads.away')}
                          </span>
                        )}
                      </h3>
                      <span className="text-[12px] text-neutral-400">
                        power{' '}
                        <span className="font-mono text-neutral-200">
                          {(view.power[name] ?? 0).toLocaleString()}
                        </span>
                      </span>
                    </div>

                    {/*
                      Slots filled, not lift used. Lift no longer caps anything,
                      so a bar drawn against it would be a bar against nothing -
                      six of six is the only limit left.
                    */}
                    <span className="mt-2 block h-1 overflow-hidden rounded-full bg-neutral-900">
                      <span
                        className="block h-full rounded-full bg-neutral-500"
                        style={{width: `${(filled / SQUAD_SLOTS) * 100}%`}}
                      />
                    </span>

                    <p
                      role={droneIds.length === 0 ? 'alert' : undefined}
                      className={`mt-2 rounded px-2 py-1 text-[12px] ${
                        droneIds.length === 0
                          ? 'border border-red-800 bg-red-950/50 font-semibold text-red-200'
                          : 'text-neutral-400'
                      }`}
                    >
                      {droneIds.length === 0
                        ? `${filled === 0 ? '' : '⚠ '}${DRONE_WORDING.needDrone}`
                        : DRONE_WORDING.network(network, droneIds.length)}
                    </p>

                    {(view.squads[name] ?? []).some((id) => {
                      const o = id ? view.owned.find((x) => x.assetId === id) : null;
                      return o && o.hp < 1 && !(o.repairEndsAt && o.repairEndsAt > Date.now());
                    }) &&
                      !out && (
                        <button
                          onClick={() => void repairAll()}
                          className="mt-2 w-full rounded border border-cyan-700 bg-cyan-950/30 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-cyan-200 hover:bg-cyan-900/40"
                        >
                          Repair damaged assets
                        </button>
                      )}

                    <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px] font-semibold uppercase tracking-[0.2em]">
                      <span className="text-red-300/80">Front</span>
                      <span className="text-neutral-400">Centre</span>
                      <span className="text-cyan-300/80">Rear</span>
                    </div>
                    {/*
                      Column-major: slots 0-1 stack in the Front column, 2-3 in
                      Centre, 4-5 in Rear, under the band labels above.
                    */}
                    <div className="mt-1 grid grid-flow-col grid-cols-3 grid-rows-2 gap-2">
                      {Array.from({length: SQUAD_SLOTS}, (_, slot) => {
                        const id = view.squads[name]?.[slot] ?? null;
                        const asset = id ? ASSET_BY_ID[id] ?? null : null;
                        return (
                          // data-slot is what the drag hit-test reads. It sits
                          // on the wrapper so the whole cell is a drop target,
                          // not just the button's own box.
                          <div key={slot} data-slot={`${name}:${slot}`}>
                            <Slot
                              asset={asset}
                              level={id ? levels.get(id) ?? 1 : 1}
                              hp={id ? view.owned.find((o) => o.assetId === id)?.hp ?? 1 : 1}
                              repairing={
                                id ? (view.owned.find((o) => o.assetId === id)?.repairEndsAt ?? 0) > Date.now() : false
                              }
                              selected={
                                (picking?.squad === name && picking.slot === slot) ||
                                (acting?.squad === name && acting.slot === slot)
                              }
                              dropTarget={
                                drag !== null && overSlot?.squad === name && overSlot?.slot === slot
                              }
                              dragging={drag?.squad === name && drag?.slot === slot}
                              onPointerDown={(e) => beginDrag(name, slot, e)}
                              onClick={() => {
                                // A drag ends over a slot and would otherwise
                                // fire this too.
                                if (dragRef.current?.moved) return;
                                // A squad in the field is read-only. Said in
                                // the error line rather than doing nothing,
                                // because a slot that ignores a tap looks
                                // broken.
                                if (out) {
                                  setError(t('squads.awayHint'));
                                  return;
                                }
                                guideEvent('tap:slot');
                                if (id && isDrone(id)) guideEvent('tap:drone');
                                // An occupied slot asks what to do with what is
                                // already there; an empty one goes straight to
                                // the choices, because there is only one thing
                                // to do with it.
                                if (id) setActing({squad: name, slot});
                                else setPicking({squad: name, slot});
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>

                    <CombatSystemsPanel
                      squad={name}
                      systems={view.systems?.[name] ?? NO_SYSTEMS}
                      wallet={view.wallet}
                      commandCenter={cc}
                      season={view.base.season}
                      locked={out}
                      onChanged={(wallet, systems) => setView((v) => (v ? {...v, wallet, systems} : v))}
                    />
                  </section>
                );
              })}
            </div>

            <p className="mt-4 text-[11px] leading-relaxed text-neutral-600">
              {t('squads.hint')} {t('squads.dragHint')}
            </p>
          </>
        )}
      </div>

      {/*
        What to do with a slot that already holds something. Tapping it used to
        open the whole catalogue, which assumed the answer was always "replace"
        - but most of the time the intent is to take it out, and that was a
        button hidden in the header of a sixty-row list.
      */}
      {acting && view && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xs rounded-lg border border-neutral-700 bg-neutral-950 p-4 shadow-2xl">
            {(() => {
              const id = view.squads[acting.squad]?.[acting.slot] ?? null;
              const held = id ? ASSET_BY_ID[id] ?? null : null;
              if (!held) return null;
              return (
                <>
                  <div className="flex items-center gap-2">
                    <AssetIcon asset={held} size={56} level={levels.get(held.id) ?? 1} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-neutral-100">
                        {assetLabel(held)}
                      </p>
                      <p className="truncate text-[11px] text-neutral-500">
                        {t('squads.inSlot', {
                          name: CATEGORY_LABEL[held.category],
                          squad: taskForceName(acting.squad),
                          slot: acting.slot + 1,
                        })}
                      </p>
                      {held.category === 'drone' && (
                        <p className="mt-1 text-[10px] text-neutral-400">{DRONE_WORDING.slotHint}</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2">
                    <button
                      onClick={() => {
                        const at = acting;
                        setActing(null);
                        setPicking(at);
                      }}
                      className="rounded border border-neutral-700 px-3 py-2 text-sm font-medium text-neutral-100 hover:border-orange-600"
                    >
                      {t('squads.replace')}
                    </button>
                    <button
                      onClick={() => {
                        void assign(acting.squad, acting.slot, null);
                        setActing(null);
                      }}
                      disabled={busy}
                      className="rounded border border-red-900 px-3 py-2 text-sm font-medium text-red-300 hover:border-red-600 disabled:opacity-50"
                    >
                      {t('squads.remove')}
                    </button>
                    <button
                      onClick={() => setActing(null)}
                      className="px-3 py-1 text-xs text-neutral-500 hover:text-neutral-200"
                    >
                      {t('squads.cancel')}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/*
        The chooser is an overlay, not a panel below the squads.
        It used to render underneath them, which meant tapping a slot on a
        phone opened it off the bottom of the screen - the tap looked like it
        had done nothing. A slot is chosen from the top of the screen, so the
        choices have to arrive over it.
      */}
      {picking && view && (
        // Padded for the chat bar: the Squads screen is a fixed wrapper (its
        // own stacking context), so the bar - a fixed sibling - paints over
        // the bottom of this overlay whatever z-index it carries. Same fix as
        // the map's Task Force composer.
        <div className="absolute inset-0 z-30 flex flex-col bg-black/70 pb-[calc(3.5rem+env(safe-area-inset-bottom))] backdrop-blur-sm">
          <button
            aria-label={t('squads.cancel')}
            onClick={() => setPicking(null)}
            className="min-h-[3rem] flex-1 cursor-default"
          />

          <div className="flex max-h-[78%] flex-col rounded-t-xl border-t border-neutral-700 bg-neutral-950 shadow-2xl">
            <div className="flex shrink-0 items-center gap-2 border-b border-neutral-800 px-3 py-3">
              <h3 className="text-sm font-semibold text-neutral-100">
                {t('squads.slot', {squad: taskForceName(picking.squad), slot: picking.slot + 1})}
              </h3>

              {slotHolds && (
                <button
                  onClick={() => void assign(picking.squad, picking.slot, null)}
                  disabled={busy}
                  className="rounded border border-neutral-700 px-2 py-0.5 text-[11px] text-neutral-400 hover:border-red-700 hover:text-red-300 disabled:opacity-50"
                >
                  {t('squads.clearSlot')}
                </button>
              )}
              <button
                onClick={() => setPicking(null)}
                className="ml-auto rounded border border-neutral-700 px-2 py-1 text-xs text-neutral-300 hover:border-orange-600"
              >
                {t('squads.cancel')}
              </button>
            </div>

            <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-neutral-800 px-3 py-2">
              <input
                value={pickQuery}
                onChange={(e) => setPickQuery(e.target.value)}
                placeholder={t('assets.search')}
                className="w-28 shrink-0 rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-neutral-100 placeholder:text-neutral-600 focus:border-orange-600 focus:outline-none"
              />
              {(['all', 'armour', 'rotary', 'fixed_wing', 'artillery', 'drone'] as const).map(
                (key) => (
                  <button
                    key={key}
                    onClick={() => setPickCategory(key)}
                    className={`shrink-0 rounded border px-2 py-1 text-xs ${
                      pickCategory === key
                        ? 'border-orange-600 bg-orange-950/40 text-orange-200'
                        : 'border-neutral-800 text-neutral-400 hover:border-neutral-600'
                    }`}
                  >
                    {key === 'all' ? t('assets.all') : CATEGORY_LABEL[key]}
                  </button>
                ),
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {/*
                A list where every row is greyed out reads as broken. It is
                not - the squad is simply full - and saying so is the
                difference between a rule a player understands and a screen
                they think is failing. This is the FIRST thing a new player
                meets: two tanks fill a level-zero squad exactly.
              */}
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {choices.map((asset) => {
                  const where = placedIn.get(asset.id);
                  // An asset sits in exactly one squad, so one that is in the
                  // field cannot be taken - assigning it here would pull it out
                  // of a squad that is at that moment attacking somebody.
                  // The only reason an asset cannot be taken: it is out with a
                  // squad in the field, and assigning it here would pull it out
                  // of that squad from the other end of the screen.
                  const fits = !assetAway.get(asset.id);
                  const out = assetAway.get(asset.id);
                  return (
                    <div key={asset.id}>
                      <button
                        onClick={() => void assign(picking.squad, picking.slot, asset.id)}
                        disabled={busy || !fits}
                        className={`flex w-full items-center gap-2 rounded border px-2 py-2 text-left transition ${
                          fits
                            ? 'border-neutral-800 bg-neutral-950 hover:border-orange-600'
                            : 'border-neutral-900 bg-neutral-950/50 opacity-40'
                        }`}
                      >
                        <AssetIcon asset={asset} size={48} level={levels.get(asset.id) ?? 1} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-semibold text-neutral-100">
                            {assetLabel(asset)}
                          </span>
                          <span className="block truncate text-[10px] text-neutral-600">
                            {CATEGORY_LABEL[asset.category]} ·{' '}
                            <span className={ROLE_TINT[asset.role]}>{ROLE_LABEL[asset.role]}</span>
                          </span>
                          {out ? (
                            <span className="block text-[10px] text-orange-400">
                              {t('squads.assetAway', {squad: taskForceName(out)})}
                            </span>
                          ) : (
                            where && (
                              <span className="block text-[10px] text-orange-500/80">
                                {t('squads.inSquad', {squad: taskForceName(where)})}
                              </span>
                            )
                          )}
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block font-mono text-[12px] text-neutral-300">
                            lv {levels.get(asset.id) ?? 1}
                          </span>
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
              {choices.length === 0 && (
                <p className="py-6 text-center text-sm text-neutral-600">
                  {t('assets.nothingMatches')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
