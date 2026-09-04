/**
 * The customisation screen.
 *
 * Four slots, each with its own row of options, over a live preview of the
 * player's own base. The preview is drawn with the same function the world map
 * uses, so what a player sees here is exactly what their neighbours will see -
 * there is no separate "preview renderer" to fall out of step.
 *
 * Locked items are shown, not hidden. A catalogue that only lists what you
 * already own gives a player no reason to come back to it.
 */
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  COSMETIC_SLOTS,
  type CosmeticItem,
  type CosmeticSlot,
  DEFAULT_LOADOUT,
  type Loadout,
  SLOT_BLURB,
  SLOT_LABEL,
} from '../../shared/cosmetics';
import {ApiError, api} from '../net/api';
import {drawSwatch} from './cosmeticsPaint';
import {drawBase, skinSpec} from './skins';

/** One catalogue item, drawn rather than described. */
function Swatch({
  item,
  selected,
  locked,
  onPick,
}: {
  item: CosmeticItem;
  selected: boolean;
  locked: boolean;
  onPick: () => void;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const size = 56;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawSwatch(ctx, item, size);
  }, [item]);

  return (
    <button
      type="button"
      onClick={onPick}
      title={locked ? `${item.name} — locked` : item.name}
      className={`group relative shrink-0 rounded border p-1 transition ${
        selected
          ? 'border-orange-500 bg-orange-950/40'
          : 'border-neutral-800 bg-neutral-900/60 hover:border-neutral-600'
      }`}
    >
      <canvas ref={ref} style={{width: 56, height: 56}} className="block rounded-sm" />
      {locked && (
        <span className="absolute inset-0 flex items-center justify-center rounded-sm bg-black/55 text-[10px] font-semibold uppercase tracking-wider text-neutral-300">
          {item.price}
        </span>
      )}
      <span className="mt-1 block w-[56px] truncate text-center text-[10px] text-neutral-500 group-hover:text-neutral-300">
        {item.name}
      </span>
    </button>
  );
}

/** The player's own base, drawn large, with the loadout currently being edited. */
function Preview({skin, loadout}: {skin: string; loadout: Loadout}) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const box = 280;
    canvas.width = box * dpr;
    canvas.height = box * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = '#0f0d09';
    ctx.fillRect(0, 0, box, box);
    // A patch of ground under the base, so the compound is not floating.
    ctx.fillStyle = '#7d6647';
    ctx.fillRect(0, box * 0.12, box, box * 0.88);

    // The banner overhangs the top of the plot, so the base is inset to leave
    // it room rather than being clipped by the edge of the canvas.
    const size = box * 0.74;
    drawBase(ctx, (box - size) / 2, box * 0.22, size, skinSpec(skin), 7, 11, 12, true, loadout);
  }, [skin, loadout]);

  return (
    <canvas
      ref={ref}
      style={{width: 280, height: 280}}
      className="rounded border border-neutral-800"
    />
  );
}

export default function Customize({skin, onClose}: {skin: string; onClose: () => void}) {
  const [items, setItems] = useState<CosmeticItem[] | null>(null);
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<Loadout>(DEFAULT_LOADOUT);
  const [draft, setDraft] = useState<Loadout>(DEFAULT_LOADOUT);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .cosmetics()
      .then((data) => {
        setItems(data.items);
        setOwned(new Set(data.owned));
        setSaved(data.loadout);
        setDraft(data.loadout);
      })
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Could not load the catalogue.'),
      );
  }, []);

  const bySlot = useMemo(() => {
    const map = new Map<CosmeticSlot, CosmeticItem[]>();
    for (const slot of COSMETIC_SLOTS) map.set(slot, []);
    for (const item of items ?? []) map.get(item.slot)?.push(item);
    return map;
  }, [items]);

  const dirty = COSMETIC_SLOTS.some((slot) => draft[slot] !== saved[slot]);

  const save = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await api.equip(draft);
      setSaved(result.loadout);
      setDraft(result.loadout);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save that loadout.');
    } finally {
      setBusy(false);
    }
  }, [draft]);

  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-orange-500">Customisation</p>
          <h1 className="text-xl font-semibold text-neutral-100">Your colours</h1>
          <p className="mt-1 max-w-md text-sm text-neutral-500">
            Nothing here changes what your base can do. It changes what everyone else sees when
            they find you on the map.
          </p>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 rounded border border-neutral-700 px-3 py-2 text-sm text-neutral-300 hover:border-orange-600"
        >
          Done
        </button>
      </header>

      {error && (
        <p className="mt-6 rounded border border-red-900 bg-red-950/60 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <Preview skin={skin} loadout={draft} />
        <div className="flex-1">
          <p className="text-sm text-neutral-400">
            {skinSpec(skin).name}
          </p>
          <p className="mt-1 text-xs text-neutral-600">{skinSpec(skin).blurb}</p>
          <button
            onClick={() => void save()}
            disabled={!dirty || busy}
            className="mt-4 w-full rounded bg-orange-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-neutral-800 disabled:text-neutral-500 sm:w-auto sm:px-6"
          >
            {busy ? 'Saving…' : dirty ? 'Save loadout' : 'Saved'}
          </button>
          {dirty && (
            <button
              onClick={() => setDraft(saved)}
              className="mt-2 block text-xs text-neutral-500 underline underline-offset-4 hover:text-neutral-300"
            >
              Discard changes
            </button>
          )}
        </div>
      </div>

      {items === null ? (
        <p className="mt-8 text-sm text-neutral-600">Loading the catalogue…</p>
      ) : (
        <div className="mt-8 space-y-6">
          {COSMETIC_SLOTS.map((slot) => (
            <section key={slot}>
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-sm font-semibold text-neutral-200">{SLOT_LABEL[slot]}</h2>
                <p className="truncate text-xs text-neutral-600">{SLOT_BLURB[slot]}</p>
              </div>
              <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
                {(bySlot.get(slot) ?? []).map((item) => {
                  const locked = !owned.has(item.id);
                  return (
                    // The key sits on a wrapper because this project carries no
                    // @types/react, so JSX's special handling of `key` on a
                    // custom component is not available here.
                    <div key={item.id} className="shrink-0">
                    <Swatch
                      item={item}
                      selected={draft[slot] === item.id}
                      locked={locked}
                      onPick={() => {
                        // Locked items still preview. Seeing it on your own
                        // base is the whole argument for buying it; the server
                        // refuses to equip it either way.
                        setDraft((d) => ({...d, [slot]: item.id}));
                        if (locked) setError(null);
                      }}
                    />
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <p className="mt-8 text-xs text-neutral-600">
        Locked items show their price and can be previewed on your own base, but cannot be saved
        yet — there is nothing to buy them with. Four slots, {items?.length ?? 0} items, 2,058
        combinations.
      </p>
    </div>
  );
}
