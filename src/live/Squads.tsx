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
import {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ASSET_BY_ID,
  CATEGORY_LABEL,
  ROLE_LABEL,
  SQUAD_NAMES,
  SQUAD_SLOTS,
  type Asset,
  assetPower,
} from '../../shared/assets';
import {ApiError, type SquadView, api} from '../net/api';

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
  onClick,
}: {
  asset: Asset | null;
  level: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex h-[4.5rem] flex-col justify-center rounded border px-2 text-left transition ${
        selected
          ? 'border-orange-500 bg-orange-950/40'
          : asset
            ? 'border-neutral-700 bg-neutral-900 hover:border-neutral-500'
            : 'border-dashed border-neutral-800 bg-neutral-950 hover:border-neutral-600'
      }`}
    >
      {asset ? (
        <>
          <span className="truncate text-xs font-semibold text-neutral-100">{asset.name}</span>
          <span className={`truncate text-[10px] ${ROLE_TINT[asset.role]}`}>
            {ROLE_LABEL[asset.role]}
          </span>
          <span className="font-mono text-[10px] text-neutral-600">
            lift {asset.lift} · lv {level}
          </span>
        </>
      ) : (
        <span className="text-center text-[11px] text-neutral-700">empty</span>
      )}
    </button>
  );
}

export default function Squads({onClose}: {onClose: () => void}) {
  const [view, setView] = useState<SquadView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState<{squad: string; slot: number} | null>(null);

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

  const bench = useMemo(() => {
    const owned = (view?.owned ?? [])
      .map((o) => ASSET_BY_ID[o.assetId])
      .filter((a): a is Asset => !!a);
    return owned.sort(
      (a, b) =>
        a.category.localeCompare(b.category) || a.lift - b.lift || a.name.localeCompare(b.name),
    );
  }, [view]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-neutral-800 px-3 py-3">
        <button
          onClick={onClose}
          className="rounded border border-neutral-700 px-2 py-1 text-sm text-neutral-300 hover:border-orange-600"
        >
          ‹ Back
        </button>
        <h2 className="font-semibold text-neutral-100">Squads</h2>
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
                          <div key={slot}>
                            <Slot
                              asset={asset}
                              level={id ? levels.get(id) ?? 1 : 1}
                              selected={picking?.squad === name && picking.slot === slot}
                              onClick={() =>
                                setPicking(
                                  picking?.squad === name && picking.slot === slot
                                    ? null
                                    : {squad: name, slot},
                                )
                              }
                            />
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>

            {picking ? (
              <div className="mt-4">
                <div className="mb-2 flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-neutral-100">
                    {picking.squad} · slot {picking.slot + 1}
                  </h3>
                  <span className="text-[11px] text-neutral-500">
                    {remaining + freed} lift free
                  </span>
                  {slotHolds && (
                    <button
                      onClick={() => void assign(picking.squad, picking.slot, null)}
                      disabled={busy}
                      className="rounded border border-neutral-700 px-2 py-0.5 text-[11px] text-neutral-400 hover:border-red-700 hover:text-red-300 disabled:opacity-50"
                    >
                      Clear slot
                    </button>
                  )}
                  <button
                    onClick={() => setPicking(null)}
                    className="ml-auto text-[11px] text-neutral-500 hover:text-neutral-200"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {bench.map((asset) => {
                    const where = placedIn.get(asset.id);
                    const fits = asset.lift <= remaining + freed;
                    return (
                      <div key={asset.id}>
                        <button
                          onClick={() => void assign(picking.squad, picking.slot, asset.id)}
                          disabled={busy || !fits}
                          className={`w-full rounded border px-2 py-2 text-left transition ${
                            fits
                              ? 'border-neutral-800 bg-neutral-950 hover:border-orange-600'
                              : 'border-neutral-900 bg-neutral-950/50 opacity-40'
                          }`}
                        >
                          <span className="flex items-baseline justify-between gap-2">
                            <span className="truncate text-xs font-semibold text-neutral-100">
                              {asset.name}
                            </span>
                            <span className="shrink-0 font-mono text-[10px] text-neutral-500">
                              {asset.lift}
                            </span>
                          </span>
                          <span className="block truncate text-[10px] text-neutral-600">
                            {CATEGORY_LABEL[asset.category]} ·{' '}
                            <span className={ROLE_TINT[asset.role]}>{ROLE_LABEL[asset.role]}</span>
                            {' · '}
                            {assetPower(asset, levels.get(asset.id) ?? 1).toLocaleString()}
                          </span>
                          {where && (
                            <span className="block text-[10px] text-orange-500/80">in {where}</span>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="mt-4 text-[11px] leading-relaxed text-neutral-600">
                Tap a slot to fill it. Lift is the brake: heavier assets cost more, and the budget
                comes from your Motor Pool, Airfield and Barracks — so early on a squad has to be
                mixed, and that is the point.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
