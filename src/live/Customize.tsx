/**
 * The customisation screen.
 *
 * A base skin plus four accessory slots, over a live preview of the player's
 * own base. The preview is drawn with the same function the world map uses, so
 * what a player sees here is exactly what their neighbours will see - there is
 * no separate "preview renderer" to fall out of step with the real one.
 *
 * Locked items are shown rather than hidden, and they preview on your own
 * base. A catalogue that only lists what you already own gives nobody a reason
 * to open it twice.
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
import {skinIsAnimated} from './skinArt';
import {drawBase, skinSpec} from './skins';
import {t} from '../i18n';

const SWATCH = 56;

function useSwatchCanvas(paint: (ctx: CanvasRenderingContext2D, size: number) => void) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = SWATCH * dpr;
    canvas.height = SWATCH * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paint(ctx, SWATCH);
  }, [paint]);
  return ref;
}

function Tile({
  ref,
  label,
  caption,
  selected,
  locked,
  onPick,
}: {
  ref: (node: HTMLCanvasElement | null) => void;
  label: string;
  caption: string | null;
  selected: boolean;
  locked: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      title={locked ? t('customize.lockedItem', {item: label}) : label}
      className={`group relative rounded border p-1 transition ${
        selected
          ? 'border-orange-500 bg-orange-950/40'
          : 'border-neutral-800 bg-neutral-900/60 hover:border-neutral-600'
      }`}
    >
      <canvas ref={ref} style={{width: SWATCH, height: SWATCH}} className="block rounded-sm" />
      {locked && (
        <span className="absolute left-1 top-1 flex h-[56px] w-[56px] items-center justify-center rounded-sm bg-black/55 text-[10px] font-semibold uppercase tracking-wider text-neutral-300">
          {caption}
        </span>
      )}
      <span className="mt-1 block w-[56px] truncate text-center text-[10px] text-neutral-500 group-hover:text-neutral-300">
        {label}
      </span>
    </button>
  );
}

function ItemTile(props: {
  item: CosmeticItem;
  selected: boolean;
  locked: boolean;
  onPick: () => void;
}) {
  const {item} = props;
  const paint = useCallback(
    (ctx: CanvasRenderingContext2D, size: number) => drawSwatch(ctx, item, size),
    [item],
  );
  const ref = useSwatchCanvas(paint);
  return (
    <Tile
      ref={(node) => {
        ref.current = node;
      }}
      label={item.name}
      caption={String(item.price)}
      selected={props.selected}
      locked={props.locked}
      onPick={props.onPick}
    />
  );
}

function SkinTile(props: {
  skin: string;
  loadout: Loadout;
  selected: boolean;
  locked: boolean;
  onPick: () => void;
}) {
  const {skin, loadout} = props;
  const paint = useCallback(
    (ctx: CanvasRenderingContext2D, size: number) => {
      ctx.fillStyle = '#12100c';
      ctx.fillRect(0, 0, size, size);
      // Drawn a little inside the tile so a banner's overhang is not clipped.
      drawBase(ctx, size * 0.06, size * 0.14, size * 0.88, skinSpec(skin), 3, 5, 10, false, loadout, 0);
    },
    [skin, loadout],
  );
  const ref = useSwatchCanvas(paint);
  return (
    <Tile
      ref={(node) => {
        ref.current = node;
      }}
      label={skinSpec(skin).name}
      caption={t('customize.locked')}
      selected={props.selected}
      locked={props.locked}
      onPick={props.onPick}
    />
  );
}

/**
 * The player's own base, drawn large.
 *
 * Animated when the skin moves, and only then. A still skin paints once and
 * the screen costs nothing to leave open.
 */
function Preview({skin, loadout}: {skin: string; loadout: Loadout}) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const spec = skinSpec(skin);
  const animated = skinIsAnimated(spec.art, spec.motion);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const box = 280;
    canvas.width = box * dpr;
    canvas.height = box * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame: number | null = null;
    const paint = (time: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#0f0d09';
      ctx.fillRect(0, 0, box, box);
      // A patch of ground, so the compound is not floating in the void.
      ctx.fillStyle = '#7d6647';
      ctx.fillRect(0, box * 0.14, box, box * 0.86);

      // Inset from the top: the banner and any art overhang stand above the
      // plot, and would otherwise be cut off by the edge of the canvas.
      const size = box * 0.72;
      drawBase(ctx, (box - size) / 2, box * 0.24, size, spec, 7, 11, 12, true, loadout, time);
      if (animated) frame = window.requestAnimationFrame(paint);
    };

    paint(performance.now());
    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, [spec, loadout, animated]);

  return (
    <canvas
      ref={ref}
      style={{width: 280, height: 280}}
      className="rounded border border-neutral-800"
    />
  );
}

export default function Customize({onClose}: {onClose: () => void}) {
  const [items, setItems] = useState<CosmeticItem[] | null>(null);
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [skinIds, setSkinIds] = useState<string[]>([]);
  const [skinsOwned, setSkinsOwned] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<{loadout: Loadout; skin: string}>({
    loadout: DEFAULT_LOADOUT,
    skin: 'desert_fob',
  });
  const [draft, setDraft] = useState<{loadout: Loadout; skin: string}>({
    loadout: DEFAULT_LOADOUT,
    skin: 'desert_fob',
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .cosmetics()
      .then((data) => {
        setItems(data.items);
        setOwned(new Set(data.owned));
        setSkinIds(data.skinIds);
        setSkinsOwned(new Set(data.skinsOwned));
        setSaved({loadout: data.loadout, skin: data.skin});
        setDraft({loadout: data.loadout, skin: data.skin});
      })
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : t('customize.errorLoad')),
      );
  }, []);

  const bySlot = useMemo(() => {
    const map = new Map<CosmeticSlot, CosmeticItem[]>();
    for (const slot of COSMETIC_SLOTS) map.set(slot, []);
    for (const item of items ?? []) map.get(item.slot)?.push(item);
    return map;
  }, [items]);

  const dirty =
    draft.skin !== saved.skin ||
    COSMETIC_SLOTS.some((slot) => draft.loadout[slot] !== saved.loadout[slot]);

  const save = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await api.equip(draft.loadout, draft.skin);
      setSaved({loadout: result.loadout, skin: result.skin});
      setDraft({loadout: result.loadout, skin: result.skin});
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('customize.errorSave'));
    } finally {
      setBusy(false);
    }
  }, [draft]);

  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-orange-500">
            {t('customize.eyebrow')}
          </p>
          <h1 className="text-xl font-semibold text-neutral-100">{t('customize.title')}</h1>
          <p className="mt-1 max-w-md text-sm text-neutral-500">{t('customize.blurb')}</p>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 rounded border border-neutral-700 px-3 py-2 text-sm text-neutral-300 hover:border-orange-600"
        >
          {t('customize.done')}
        </button>
      </header>

      {error && (
        <p className="mt-6 rounded border border-red-900 bg-red-950/60 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <Preview skin={draft.skin} loadout={draft.loadout} />
        <div className="flex-1">
          <p className="text-sm font-semibold text-neutral-200">{skinSpec(draft.skin).name}</p>
          <p className="mt-1 text-xs text-neutral-500">{skinSpec(draft.skin).blurb}</p>
          <button
            onClick={() => void save()}
            disabled={!dirty || busy}
            className="mt-4 w-full rounded bg-orange-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-neutral-800 disabled:text-neutral-500 sm:w-auto sm:px-6"
          >
            {busy ? t('customize.saving') : dirty ? t('customize.save') : t('customize.saved')}
          </button>
          {dirty && (
            <button
              onClick={() => setDraft(saved)}
              className="mt-2 block text-xs text-neutral-500 underline underline-offset-4 hover:text-neutral-300"
            >
              {t('customize.discard')}
            </button>
          )}
        </div>
      </div>

      {items === null ? (
        <p className="mt-8 text-sm text-neutral-600">{t('customize.loading')}</p>
      ) : (
        <div className="mt-8 space-y-6">
          <section>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-sm font-semibold text-neutral-200">{t('customize.skins')}</h2>
              <p className="truncate text-xs text-neutral-600">{t('customize.skinsBlurb')}</p>
            </div>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
              {skinIds.map((id) => (
                <div key={id} className="shrink-0">
                  <SkinTile
                    skin={id}
                    loadout={draft.loadout}
                    selected={draft.skin === id}
                    locked={!skinsOwned.has(id)}
                    onPick={() => setDraft((d) => ({...d, skin: id}))}
                  />
                </div>
              ))}
            </div>
          </section>

          {COSMETIC_SLOTS.map((slot) => (
            <section key={slot}>
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-sm font-semibold text-neutral-200">{SLOT_LABEL[slot]}</h2>
                <p className="truncate text-xs text-neutral-600">{SLOT_BLURB[slot]}</p>
              </div>
              <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
                {(bySlot.get(slot) ?? []).map((item) => (
                  // The key sits on a wrapper because this project carries no
                  // @types/react, so JSX's special handling of `key` on a
                  // custom component is not available here.
                  <div key={item.id} className="shrink-0">
                    <ItemTile
                      item={item}
                      selected={draft.loadout[slot] === item.id}
                      locked={!owned.has(item.id)}
                      onPick={() =>
                        // Locked items still preview. Seeing one on your own
                        // base is the whole argument for buying it; the server
                        // refuses to save it either way.
                        setDraft((d) => ({...d, loadout: {...d.loadout, [slot]: item.id}}))
                      }
                    />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <p className="mt-8 text-xs text-neutral-600">
        {t('customize.footnote', {count: items?.length ?? 0})}
      </p>
    </div>
  );
}
