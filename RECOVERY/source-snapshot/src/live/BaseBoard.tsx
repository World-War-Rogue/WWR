/**
 * The base board: a painted salt-basin installation with fourteen pads, and
 * the buildings standing on them.
 *
 * Static on purpose. One image for the ground, one image per building, and
 * nothing redraws unless the player does something - the performance floor is
 * a five-year-old phone, and a base screen that costs a frame a second is a
 * base screen that warms the phone in a pocket.
 *
 * Interaction, as decided:
 *   - one tap selects a building and names it above its roof;
 *   - a second tap on the selected building inside 650ms (or a desktop
 *     double-click) opens it;
 *   - Arrange mode: tap a building, then tap a pad. An occupied pad offers a
 *     swap. On desktop the same thing works as drag and drop.
 * The Command Center is never a target of any of that.
 *
 * Where a building stands is the server's record; this asks and redraws.
 */
import {
  type DragEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {type MessageKey, t} from '../i18n';
import {type BaseView, ApiError, api} from '../net/api';
import {
  BOARD_BUILDINGS,
  BOARD_BUILDING_BY_ID,
  BOARD_H,
  BOARD_IMAGE,
  BOARD_W,
  type BoardBuilding,
  type BuildingEntry,
  CENTRE_PAD,
  PADS,
  type Placement,
} from '../../shared/base';
import {clockSynced, formatClock, useServerClock} from './serverClock';

/** A second tap after this is a new selection, not an open. */
const DOUBLE_TAP_MS = 650;
/** Width of a building's art as a fraction of the board width. Pads are ~0.2. */
const BUILDING_W = 0.26;
/**
 * How far above the pad centre the art's bottom edge sits. The pads are
 * painted in perspective, so a building anchored exactly on the centre reads
 * as standing on the pad's far edge; this pulls it forward onto the slab.
 */
const FOOT_LIFT = 0.84;

function buildingName(b: BoardBuilding): string {
  return t(`building.${b.id}` as MessageKey) || b.name;
}

export default function BaseBoard({
  base,
  onOpen,
  onPlacements,
}: {
  base: BaseView;
  onOpen: (entry: BuildingEntry) => void;
  onPlacements: (placements: Placement[]) => void;
}) {
  const box = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(360);
  const [selected, setSelected] = useState<string | null>(null);
  const [arranging, setArranging] = useState(false);
  const [moving, setMoving] = useState<string | null>(null);
  const [swap, setSwap] = useState<{a: string; b: string; padId: string} | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const lastTap = useRef<{id: string; at: number}>({id: '', at: 0});
  const now = useServerClock();

  // The board is sized by CSS; everything on it is positioned by percentage.
  // The one thing that needs a pixel number is text - a label that scales with
  // the board rather than with the phone's font setting - so measure once and
  // on resize, never per frame.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const padOf = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of base.placements) m.set(p.buildingId, p.padId);
    return m;
  }, [base.placements]);
  const buildingOn = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of base.placements) m.set(p.padId, p.buildingId);
    return m;
  }, [base.placements]);

  const ccLevel = base.buildings.find((b) => b.kind === 'command_post')?.level ?? 0;

  async function move(buildingId: string, padId: string) {
    setBusy(true);
    setNote(null);
    try {
      const r = await api.arrange(buildingId, padId);
      onPlacements(r.placements);
      setMoving(null);
      setSwap(null);
    } catch (err) {
      setNote(err instanceof ApiError ? err.message : 'Could not reach the server.');
    } finally {
      setBusy(false);
    }
  }

  function tapBuilding(id: string) {
    const b = BOARD_BUILDING_BY_ID[id];
    if (!b) return;
    if (arranging) {
      if (!b.movable) {
        setNote(t('board.fixed'));
        return;
      }
      if (moving && moving !== id) {
        // Tapping a second building while one is lifted: swap them.
        setSwap({a: moving, b: id, padId: padOf.get(id) ?? b.defaultPad});
        return;
      }
      setMoving(id);
      setNote(t('board.tapToMove'));
      return;
    }
    const at = Date.now();
    const prev = lastTap.current;
    lastTap.current = {id, at};
    if (selected === id && prev.id === id && at - prev.at < DOUBLE_TAP_MS) {
      onOpen(b.entry);
      return;
    }
    setSelected(id);
  }

  function tapPad(padId: string) {
    if (!arranging || !moving) return;
    if (padId === CENTRE_PAD) {
      setNote(t('board.fixed'));
      return;
    }
    const occupant = buildingOn.get(padId);
    if (occupant && occupant !== moving) {
      setSwap({a: moving, b: occupant, padId});
      return;
    }
    void move(moving, padId);
  }

  // Pointer discipline: a tap is a down and an up that did not travel. A pan
  // or a scroll that happens to end on a building must not select it.
  const down = useRef<{x: number; y: number} | null>(null);
  function onDown(e: ReactPointerEvent) {
    down.current = {x: e.clientX, y: e.clientY};
  }
  function isTap(e: ReactPointerEvent): boolean {
    const d = down.current;
    down.current = null;
    return !!d && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 12;
  }

  // Desktop drag and drop. Same outcomes as Arrange; a different verb.
  function onDragStart(e: DragEvent, id: string) {
    const b = BOARD_BUILDING_BY_ID[id];
    if (!b?.movable) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    setMoving(id);
  }
  function onDropPad(e: DragEvent, padId: string) {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || moving;
    if (!id) return;
    if (padId === CENTRE_PAD) return;
    const occupant = buildingOn.get(padId);
    if (occupant && occupant !== id) {
      setSwap({a: id, b: occupant, padId});
      return;
    }
    void move(id, padId);
  }

  const labelPx = Math.max(11, Math.round(width * 0.032));
  const clockPx = Math.max(9, Math.round(width * 0.027));

  // Draw order follows the pad's y so a southern building overlaps a northern
  // one, the way the map paints bases. A lifted building floats above all.
  const drawn = [...BOARD_BUILDINGS]
    .map((b) => ({b, pad: PADS.find((p) => p.id === (padOf.get(b.id) ?? b.defaultPad))!}))
    .sort((p, q) => p.pad.y - q.pad.y);

  return (
    <div className="select-none">
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <p className="min-h-[1.25rem] text-xs text-neutral-400">
          {arranging ? note ?? t('board.arranging') : note ?? ''}
        </p>
        <button
          onClick={() => {
            setArranging((v) => !v);
            setMoving(null);
            setSwap(null);
            setSelected(null);
            setNote(null);
          }}
          className={`shrink-0 rounded border px-3 py-1 text-xs font-medium ${
            arranging
              ? 'border-orange-500 bg-orange-950/40 text-orange-200'
              : 'border-neutral-700 text-neutral-300 hover:border-orange-500'
          }`}
        >
          {arranging ? t('board.arrangeDone') : t('board.arrange')}
        </button>
      </div>

      <div
        ref={box}
        className="relative mx-auto w-full overflow-hidden rounded-lg border border-neutral-800 bg-[#c9bfae]"
        style={{
          aspectRatio: `${BOARD_W} / ${BOARD_H}`,
          maxWidth: `calc((100vh - 15rem) * ${BOARD_W} / ${BOARD_H})`,
          touchAction: 'manipulation',
        }}
        onPointerDown={(e) => {
          if (e.target === e.currentTarget) setSelected(null);
        }}
      >
        <img
          src={BOARD_IMAGE}
          alt=""
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full"
          decoding="async"
        />

        {/* Pads: hit targets, drawn only while arranging. */}
        {PADS.map((pad) => {
          const occupant = buildingOn.get(pad.id);
          const visible = arranging && pad.id !== CENTRE_PAD;
          return (
            <button
              key={pad.id}
              aria-label={pad.id}
              onPointerDown={onDown}
              onPointerUp={(e) => isTap(e) && tapPad(pad.id)}
              onDragOver={(e) => arranging && e.preventDefault()}
              onDrop={(e) => onDropPad(e, pad.id)}
              className={`absolute rounded-md transition ${
                visible
                  ? occupant
                    ? 'border border-dashed border-orange-400/40'
                    : 'border-2 border-dashed border-emerald-300/80 bg-emerald-300/15'
                  : 'border border-transparent'
              }`}
              style={{
                left: `${pad.x * 100}%`,
                top: `${pad.y * 100}%`,
                width: '21%',
                height: '7%',
                transform: 'translate(-50%, -50%)',
                zIndex: 5,
              }}
            />
          );
        })}

        {drawn.map(({b, pad}) => {
          const isSel = selected === b.id;
          const lifted = moving === b.id;
          return (
            <div
              key={b.id}
              className="absolute"
              style={{
                left: `${pad.x * 100}%`,
                top: `${pad.y * 100}%`,
                width: `${BUILDING_W * 100}%`,
                transform: `translate(-50%, -${FOOT_LIFT * 100}%)`,
                zIndex: lifted ? 30 : 10 + Math.round(pad.y * 10),
              }}
            >
              {isSel && !arranging && (
                <div
                  className="pointer-events-none absolute inset-x-0 -top-1 z-20 flex -translate-y-full flex-col items-center"
                  style={{fontSize: labelPx}}
                >
                  <span className="rounded bg-black/80 px-2 py-0.5 font-semibold text-neutral-50 shadow">
                    {buildingName(b)}
                    {b.id === 'command_center' && (
                      <span className="text-orange-300"> · {t('board.level', {level: ccLevel})}</span>
                    )}
                  </span>
                  <span className="mt-0.5 rounded bg-black/60 px-1.5 text-[0.8em] text-neutral-300">
                    {t('board.openHint')}
                  </span>
                </div>
              )}
              <img
                src={b.art}
                alt={buildingName(b)}
                draggable={arranging && b.movable}
                onDragStart={(e) => onDragStart(e, b.id)}
                onPointerDown={onDown}
                onPointerUp={(e) => isTap(e) && tapBuilding(b.id)}
                onDoubleClick={() => !arranging && onOpen(b.entry)}
                decoding="async"
                className={`block w-full cursor-pointer transition ${
                  lifted ? 'scale-105 brightness-125 drop-shadow-[0_0_12px_rgba(251,191,36,0.9)]' : ''
                } ${isSel && !arranging ? 'drop-shadow-[0_0_10px_rgba(255,255,255,0.7)]' : ''} ${
                  arranging && !b.movable ? 'opacity-70' : ''
                }`}
              />
              {b.id === 'command_center' && (
                <div
                  className="pointer-events-none absolute flex items-center justify-center font-mono font-semibold tracking-wider text-amber-300"
                  style={{
                    left: '50%',
                    top: '58.5%',
                    width: '23%',
                    height: '5%',
                    transform: 'translate(-50%, -50%)',
                    fontSize: clockPx,
                    textShadow: '0 0 4px rgba(251,191,36,0.8)',
                  }}
                >
                  {clockSynced() ? `RST ${formatClock(now)}` : t('board.clockUnknown')}
                </div>
              )}
            </div>
          );
        })}

        {swap && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 p-6">
            <div className="w-full max-w-xs rounded-lg border border-neutral-700 bg-neutral-950 p-4 text-sm">
              <p className="font-semibold text-neutral-100">{t('board.swapTitle')}</p>
              <p className="mt-1 text-neutral-400">
                {t('board.swapBody', {
                  a: buildingName(BOARD_BUILDING_BY_ID[swap.a]),
                  b: buildingName(BOARD_BUILDING_BY_ID[swap.b]),
                })}
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => setSwap(null)}
                  className="rounded border border-neutral-700 px-3 py-1.5 text-neutral-300"
                >
                  {t('board.cancel')}
                </button>
                <button
                  disabled={busy}
                  onClick={() => void move(swap.a, swap.padId)}
                  className="rounded bg-orange-600 px-3 py-1.5 font-semibold text-white disabled:bg-neutral-800"
                >
                  {t('board.swapConfirm')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
