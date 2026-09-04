/**
 * Four squads of six.
 *
 * The screen is a board and a bench: the squads at the top, everything you
 * hold underneath. Tapping a slot selects it; tapping an asset fills it. Two
 * taps rather than a drag, because this has to work on a phone and dragging a
 * card across a scrolling list with a thumb is how people lose their place.
 *
 * Every rule is the server's. This screen shows the lift budget and greys what
 * will not fit, but the refusal comes from the Worker - the greying is a
 * courtesy, not the check.
 */
import {type PointerEvent as ReactPointerEvent, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ASSET_BY_ID,
  CATEGORY_LABEL,
  ROLE_LABEL,
  SQUAD_NAMES,
  SQUAD_SLOTS,
  type Asset,
  type AssetCategory,
} from '../../shared/assets';
import {ApiError, type SquadView, api} from '../net/api';
import AssetIcon from './AssetIcon';
import ForcesTabs from './ForcesTabs';
import {t} from '../i18n';

const ROLE_TINT: Record<string, string> = {
  breach: 'text-red-300',
  screen: 'text-sky-300',
  strike: 'text-orange-300',
  overwatch: 'text-amber-300',
  recon: 'text-emerald-300',
  lift: 'text-neutral-300',
};

function Slot({
  asset,
  level,
  selected,
  dropTarget,
  dragging,
  onClick,
  onPointerDown,
}: {
  asset: Asset | null;
  level: number;
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
      className={`flex h-[4.5rem] flex-col justify-center rounded border px-2 text-left transition ${
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
          <AssetIcon asset={asset} size={26} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-semibold text-neutral-100">
              {asset.name}
            </span>
            <span className={`block truncate text-[10px] ${ROLE_TINT[asset.role]}`}>
              {ROLE_LABEL[asset.role]}
            </span>
            <span className="block font-mono text-[10px] text-neutral-600">
              lift {asset.lift} · lv {level}
            </span>
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
}: {
  onClose: () => void;
  onShowAssets: () => void;
}) {
  const [view, setView] = useState<SquadView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState<{squad: string; slot: number} | null>(null);
  const [pickQuery, setPickQuery] = useState('');
  /** A filled slot that was tapped: remove it, or replace it. */
  const [acting, setActing] = useState<{squad: string; slot: number} | null>(null);
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
  }, [drag, overSlot]);

  function beginDrag(squad: string, slot: number, e: ReactPointerEvent) {
    if (!view?.squads[squad]?.[slot]) return;
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

  const budget = view?.lift.budget ?? 0;
  const remaining = picking ? budget - (view?.lift.used[picking.squad] ?? 0) : 0;
  const slotHolds = picking ? view?.squads[picking.squad]?.[picking.slot] ?? null : null;
  const freed = slotHolds ? ASSET_BY_ID[slotHolds]?.lift ?? 0 : 0;

  /**
   * What the chooser offers. Everything held, filtered, and ordered so what
   * fits comes first - a list whose top half is greyed out reads as broken.
   */
  const choices = useMemo(() => {
    const q = pickQuery.trim().toLowerCase();
    const room = remaining + freed;
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
      .sort((a, b) => {
        const aFits = a.lift <= room ? 0 : 1;
        const bFits = b.lift <= room ? 0 : 1;
        return (
          aFits - bFits ||
          a.category.localeCompare(b.category) ||
          b.lift - a.lift ||
          a.name.localeCompare(b.name)
        );
      });
  }, [view, pickCategory, pickQuery, remaining, freed]);

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
          <span className="ml-auto text-[11px] text-neutral-500">
            Lift budget <span className="font-mono text-neutral-300">{budget}</span> per squad
            <span className="text-neutral-700">
              {' '}
              · Motor Pool {view.buildings.motor_pool} · Airfield {view.buildings.airfield} ·
              Barracks {view.buildings.barracks}
            </span>
          </span>
        )}
      </div>

      {error && (
        <p className="shrink-0 border-b border-red-900 bg-red-950/60 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {!view ? (
          <p className="text-sm text-neutral-500">Reading the roster…</p>
        ) : (
          <>
            <div className="grid gap-3 lg:grid-cols-2">
              {SQUAD_NAMES.map((name) => {
                const used = view.lift.used[name] ?? 0;
                const over = used > budget;
                return (
                  <section key={name} className="rounded border border-neutral-800 bg-neutral-950 p-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="text-sm font-semibold text-neutral-100">{name}</h3>
                      <span className="text-[11px] text-neutral-500">
                        power{' '}
                        <span className="font-mono text-neutral-300">
                          {(view.power[name] ?? 0).toLocaleString()}
                        </span>
                        <span className="text-neutral-700"> · </span>
                        lift{' '}
                        <span className={`font-mono ${over ? 'text-red-400' : 'text-neutral-300'}`}>
                          {used}/{budget}
                        </span>
                      </span>
                    </div>

                    <span className="mt-2 block h-1 overflow-hidden rounded-full bg-neutral-900">
                      <span
                        className={`block h-full rounded-full ${over ? 'bg-red-600' : 'bg-neutral-500'}`}
                        style={{width: `${Math.min(100, (used / Math.max(1, budget)) * 100)}%`}}
                      />
                    </span>

                    <div className="mt-3 grid grid-cols-3 gap-2">
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
                    <AssetIcon asset={held} size={32} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-neutral-100">
                        {held.name}
                      </p>
                      <p className="truncate text-[11px] text-neutral-500">
                        {t('squads.inSlot', {
                          name: CATEGORY_LABEL[held.category],
                          squad: acting.squad,
                          slot: acting.slot + 1,
                        })}
                      </p>
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
        <div className="absolute inset-0 z-30 flex flex-col bg-black/70 backdrop-blur-sm">
          <button
            aria-label={t('squads.cancel')}
            onClick={() => setPicking(null)}
            className="min-h-[3rem] flex-1 cursor-default"
          />

          <div className="flex max-h-[78%] flex-col rounded-t-xl border-t border-neutral-700 bg-neutral-950 shadow-2xl">
            <div className="flex shrink-0 items-center gap-2 border-b border-neutral-800 px-3 py-3">
              <h3 className="text-sm font-semibold text-neutral-100">
                {t('squads.slot', {squad: picking.squad, slot: picking.slot + 1})}
              </h3>
              <span className="text-[11px] text-neutral-500">
                {t('squads.liftFree', {amount: remaining + freed})}
              </span>
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
              {choices.length > 0 && choices.every((a) => a.lift > remaining + freed) && (
                <div className="mb-3 rounded border border-amber-900 bg-amber-950/40 px-3 py-2">
                  <p className="text-xs font-semibold text-amber-200">
                    {t('squads.nothingFits', {amount: remaining + freed})}
                  </p>
                  <p className="mt-0.5 text-[11px] text-amber-300/70">
                    {t('squads.nothingFitsHint')}
                  </p>
                </div>
              )}

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {choices.map((asset) => {
                  const where = placedIn.get(asset.id);
                  const fits = asset.lift <= remaining + freed;
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
                        <AssetIcon asset={asset} size={28} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-semibold text-neutral-100">
                            {asset.name}
                          </span>
                          <span className="block truncate text-[10px] text-neutral-600">
                            {CATEGORY_LABEL[asset.category]} ·{' '}
                            <span className={ROLE_TINT[asset.role]}>{ROLE_LABEL[asset.role]}</span>
                          </span>
                          {where && (
                            <span className="block text-[10px] text-orange-500/80">
                              {t('squads.inSquad', {squad: where})}
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block font-mono text-[11px] text-neutral-400">
                            {asset.lift}
                          </span>
                          <span className="block text-[9px] uppercase text-neutral-700">
                            {t('squads.lift')}
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
