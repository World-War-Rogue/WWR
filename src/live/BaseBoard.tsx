/**
 * The base board: a painted salt-basin installation with fifteen pads, and
 * the buildings standing on them.
 *
 * Static on purpose. One image for the ground, one image per building, and
 * nothing redraws unless the player does something - the performance floor is
 * a five-year-old phone, and a base screen that costs a frame a second is a
 * base screen that warms the phone in a pocket.
 *
 * The painting COVERS the viewport: scaled so no black shows on either axis,
 * which on most screens leaves part of it off-screen, so the ground pans -
 * drag it, or scroll. Buildings are positioned by percentage of the board, so
 * the pan is one transform on one element.
 *
 * Interaction, as decided:
 *   - one tap selects a building and names it above its roof;
 *   - a second tap on the selected building inside 650ms (or a desktop
 *     double-click) opens it;
 *   - press and HOLD a building and it lifts; drag it to any pad and drop it.
 *     Whatever stood there moves itself to the nearest open pad. No Arrange
 *     mode, no confirmation - a move is cheap to undo by moving it back.
 * The Command Center is never a target of any of that.
 *
 * Where a building stands is the server's record; this asks and redraws.
 */
import {
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {type MessageKey, t} from '../i18n';
import {type BaseView, type SquadView, ApiError, api} from '../net/api';
import {
  ART_W,
  BOARD_BUILDINGS,
  BOARD_BUILDING_BY_ID,
  BOARD_H,
  BOARD_IMAGE,
  BOARD_W,
  COMMAND_CENTER_BOX,
  COMMAND_CENTER_ENTRY,
  COMMAND_CENTER_ID,
  PAD_H,
  PAD_W,
  PADS,
  VEHICLE_W,
  type BoardBuilding,
  type BuildingEntry,
  type Placement,
  TASK_FORCE_PADS,
  padTakesBuildings,
} from '../../shared/base';
import {taskForceName} from './taskForce';

/** A second tap after this is a new selection, not an open. */
const DOUBLE_TAP_MS = 650;
/** Hold a building this long and it lifts. Shorter than a browser long-press. */
const HOLD_MS = 320;
/** A press that travels further than this before the hold is a pan. */
const SLOP_PX = 10;
/** A drop lands on the nearest pad if it is within this fraction of board width. */
const DROP_REACH = 0.14;

function buildingName(b: BoardBuilding | {id: string; name: string}): string {
  return t(`building.${b.id}` as MessageKey) || b.name;
}
const COMMAND_CENTER = {id: COMMAND_CENTER_ID, name: 'Command Center'};

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

type Fit = {w: number; h: number; scale: number};

function fitBoard(vw: number, vh: number): Fit {
  const scale = Math.max(vw / BOARD_W, vh / BOARD_H);
  return {w: BOARD_W * scale, h: BOARD_H * scale, scale};
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
  const [view, setView] = useState({w: 360, h: 640});
  const [pan, setPan] = useState<{x: number; y: number} | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [lifted, setLifted] = useState<{id: string; x: number; y: number} | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [forces, setForces] = useState<SquadView | null>(null);
  const lastTap = useRef<{id: string; at: number}>({id: '', at: 0});

  // The Task Force line: which of Alpha-Delta are home. Read when the base
  // opens; a march launched from the map is a screen away and refreshes it.
  useEffect(() => {
    let live = true;
    api
      .squads()
      .then((v) => live && setForces(v))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [base.serverTime]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setView({w: el.clientWidth, h: el.clientHeight}));
    ro.observe(el);
    setView({w: el.clientWidth, h: el.clientHeight});
    return () => ro.disconnect();
  }, []);

  const fit = fitBoard(view.w, view.h);
  // The pan is the board's top-left in viewport pixels. Clamped so the ground
  // always covers the screen; centred until the player moves it.
  const minX = view.w - fit.w;
  const minY = view.h - fit.h;
  const cur = pan ?? {x: minX / 2, y: minY / 2};
  const px = clamp(cur.x, minX, 0);
  const py = clamp(cur.y, minY, 0);

  const padOf = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of base.placements) m.set(p.buildingId, p.padId);
    return m;
  }, [base.placements]);

  const ccLevel = base.buildings.find((b) => b.kind === 'command_post')?.level ?? 0;

  async function move(buildingId: string, padId: string) {
    setNote(null);
    try {
      const r = await api.arrange(buildingId, padId);
      onPlacements(r.placements);
    } catch (err) {
      setNote(err instanceof ApiError ? err.message : 'Could not reach the server.');
    }
  }

  function tapBuilding(id: string) {
    const entry = id === COMMAND_CENTER_ID ? COMMAND_CENTER_ENTRY : BOARD_BUILDING_BY_ID[id]?.entry;
    if (!entry) return;
    const at = Date.now();
    const prev = lastTap.current;
    lastTap.current = {id, at};
    if (selected === id && prev.id === id && at - prev.at < DOUBLE_TAP_MS) {
      onOpen(entry);
      return;
    }
    setSelected(id);
  }

  /** Viewport pixels -> board fraction. */
  function toBoard(clientX: number, clientY: number): {x: number; y: number} {
    const r = box.current?.getBoundingClientRect();
    const ox = r?.left ?? 0;
    const oy = r?.top ?? 0;
    return {x: (clientX - ox - px) / fit.w, y: (clientY - oy - py) / fit.h};
  }

  function nearestPad(x: number, y: number): string | null {
    let best: string | null = null;
    let bestD = DROP_REACH;
    for (const p of PADS) {
      if (!padTakesBuildings(p.id)) continue;
      const d = Math.hypot(p.x - x, (p.y - y) * (BOARD_H / BOARD_W));
      if (d < bestD) {
        bestD = d;
        best = p.id;
      }
    }
    return best;
  }

  /*
   * One pointer state machine for the whole board. A press starts as
   * "undecided": if it travels, it is a pan of the ground; if it is on a
   * building and held still past HOLD_MS, that building lifts and follows the
   * pointer; if it ends before either, it is a tap.
   */
  const press = useRef<{
    id: string | null;
    startX: number;
    startY: number;
    panX: number;
    panY: number;
    mode: 'undecided' | 'pan' | 'lift';
    timer: number | null;
    pointerId: number;
  } | null>(null);

  function onDown(e: ReactPointerEvent, id: string | null) {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const b = id ? BOARD_BUILDING_BY_ID[id] ?? null : null;
    const fixed = id === COMMAND_CENTER_ID || !!b?.fixed;
    const p: NonNullable<typeof press.current> = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      panX: px,
      panY: py,
      mode: 'undecided',
      timer: null,
      pointerId: e.pointerId,
    };
    press.current = p;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    if (b && !b.fixed) {
      p.timer = window.setTimeout(() => {
        if (press.current === p && p.mode === 'undecided') {
          p.mode = 'lift';
          const at = toBoard(e.clientX, e.clientY);
          setLifted({id: b.id, x: at.x, y: at.y});
          setSelected(null);
          if (navigator.vibrate) navigator.vibrate(12);
        }
      }, HOLD_MS);
    } else if (fixed) {
      p.timer = window.setTimeout(() => {
        if (press.current === p && p.mode === 'undecided') {
          setNote(b ? t('board.fixedRunway') : t('board.fixed'));
        }
      }, HOLD_MS);
    }
  }

  function onMove(e: ReactPointerEvent) {
    const p = press.current;
    if (!p || p.pointerId !== e.pointerId) return;
    const dx = e.clientX - p.startX;
    const dy = e.clientY - p.startY;
    if (p.mode === 'undecided' && Math.hypot(dx, dy) > SLOP_PX) {
      p.mode = 'pan';
      if (p.timer) window.clearTimeout(p.timer);
    }
    if (p.mode === 'pan') {
      setPan({x: p.panX + dx, y: p.panY + dy});
    } else if (p.mode === 'lift') {
      const at = toBoard(e.clientX, e.clientY);
      setLifted((l) => (l ? {...l, x: at.x, y: at.y} : l));
    }
  }

  function onUp(e: ReactPointerEvent) {
    const p = press.current;
    if (!p || p.pointerId !== e.pointerId) return;
    press.current = null;
    if (p.timer) window.clearTimeout(p.timer);
    if (p.mode === 'lift') {
      const at = toBoard(e.clientX, e.clientY);
      const pad = nearestPad(at.x, at.y);
      setLifted(null);
      if (pad && p.id && pad !== padOf.get(p.id)) void move(p.id, pad);
      return;
    }
    if (p.mode === 'undecided') {
      if (p.id) tapBuilding(p.id);
      else setSelected(null);
    }
  }

  function onCancel() {
    const p = press.current;
    if (p?.timer) window.clearTimeout(p.timer);
    press.current = null;
    setLifted(null);
  }

  const labelPx = Math.max(11, Math.round(fit.w * 0.03));

  // Draw order follows the pad's y so a southern building overlaps a northern
  // one, the way the map paints bases. A lifted building floats above all.
  const drawn = [...BOARD_BUILDINGS]
    .map((b) => ({b, pad: PADS.find((p) => p.id === (padOf.get(b.id) ?? b.defaultPad))!}))
    .sort((p, q) => p.pad.y - q.pad.y);
  const ccSel = selected === COMMAND_CENTER_ID;

  const targetPad = lifted ? nearestPad(lifted.x, lifted.y) : null;

  return (
    <div
      ref={box}
      className="absolute inset-0 select-none overflow-hidden bg-[#0a0906]"
      onWheel={(e) => setPan({x: px, y: py - e.deltaY})}
    >
      {note && (
        <p
          className="pointer-events-none absolute left-3 z-30 rounded bg-black/70 px-2 py-1 text-xs text-neutral-200"
          style={{top: 'calc(env(safe-area-inset-top) + 3.75rem)'}}
        >
          {note}
        </p>
      )}

      <div
        className="absolute left-0 top-0"
        style={{
          width: fit.w,
          height: fit.h,
          transform: `translate(${px}px, ${py}px)`,
          touchAction: 'none',
        }}
        onPointerDown={(e) => {
          if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'IMG') {
            // Ground, or the ground image. A building's own img stops
            // propagation below, so this is only ever the painting.
            onDown(e, null);
          }
        }}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onCancel}
      >
        <img
          src={BOARD_IMAGE}
          alt=""
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full"
          decoding="async"
        />

        {/* Pads light up only while something is lifted. */}
        {lifted &&
          PADS.filter((p) => padTakesBuildings(p.id)).map((pad) => (
            <div
              key={pad.id}
              className={`pointer-events-none absolute rounded-md border-2 border-dashed transition ${
                targetPad === pad.id
                  ? 'border-emerald-300 bg-emerald-300/25'
                  : 'border-emerald-200/50 bg-emerald-200/10'
              }`}
              style={{
                left: `${pad.x * 100}%`,
                top: `${pad.y * 100}%`,
                width: `${PAD_W * 100}%`,
                height: `${PAD_H * 100}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: 5,
              }}
            />
          ))}

        {/*
          The Command Center is painted into the board, so this is a hit box
          over the painting - tap to name it, tap again to open, hold to be
          told it stays put - with the label drawn where a roof would be.
        */}
        <div
          className="absolute"
          style={{
            left: `${COMMAND_CENTER_BOX.x * 100}%`,
            top: `${COMMAND_CENTER_BOX.y * 100}%`,
            width: `${COMMAND_CENTER_BOX.w * 100}%`,
            height: `${COMMAND_CENTER_BOX.h * 100}%`,
            zIndex: 12,
            touchAction: 'none',
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
            onDown(e, COMMAND_CENTER_ID);
          }}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onCancel}
          onDoubleClick={() => onOpen(COMMAND_CENTER_ENTRY)}
        >
          {ccSel && !lifted && (
            <div
              className="pointer-events-none absolute inset-x-0 top-[62%] z-20 flex flex-col items-center"
              style={{fontSize: labelPx}}
            >
              <span className="whitespace-nowrap rounded bg-black/80 px-2 py-0.5 font-semibold text-neutral-50 shadow">
                {buildingName(COMMAND_CENTER)}
                <span className="text-orange-300"> · {t('board.level', {level: ccLevel})}</span>
              </span>
              <span className="mt-0.5 rounded bg-black/60 px-1.5 text-[0.8em] text-neutral-300">
                {t('board.openHint')}
              </span>
            </div>
          )}
          {ccSel && !lifted && (
            <div className="pointer-events-none absolute inset-[6%] rounded-lg ring-2 ring-white/70" />
          )}
        </div>

        {/*
          The Task Force line. Four fixed slabs outside the southern gate, one
          per Task Force, saying whether it is home. Not building pads: nothing
          drops here, and the label is the only thing drawn until there is art
          for a parked Task Force.
        */}
        {TASK_FORCE_PADS.map(({padId, squad}) => {
          const pad = PADS.find((p) => p.id === padId)!;
          const filled = (forces?.squads[squad] ?? []).filter(Boolean).length;
          const out = forces?.away.includes(squad) ?? false;
          const state = !forces ? '' : out ? t('board.tfOut') : filled === 0 ? t('board.tfEmpty') : t('board.tfHome');
          const tint = out ? 'text-orange-300' : filled === 0 ? 'text-neutral-500' : 'text-emerald-300';
          return (
            <div
              key={padId}
              className="pointer-events-none absolute flex flex-col items-center justify-center text-center"
              style={{
                left: `${pad.x * 100}%`,
                top: `${pad.y * 100}%`,
                width: `${PAD_W * 100}%`,
                height: `${PAD_H * 100}%`,
                transform: 'translate(-50%, -50%)',
                fontSize: labelPx * 0.85,
                zIndex: 8,
              }}
            >
              <span className="whitespace-nowrap font-semibold text-neutral-800/90">{taskForceName(squad)}</span>
              <span className={`mt-0.5 rounded bg-black/70 px-1.5 text-[0.85em] font-semibold ${tint}`}>{state}</span>
            </div>
          );
        })}

        {drawn.map(({b, pad}) => {
          const isSel = selected === b.id;
          const isLifted = lifted?.id === b.id;
          const vehicle = b.draw === 'vehicle';
          const x = isLifted ? lifted.x : pad.x;
          const y = (isLifted ? lifted.y : pad.y) + (vehicle ? 0 : PAD_H / 2);
          return (
            <div
              key={b.id}
              className={`absolute ${isLifted ? '' : 'transition-[left,top] duration-200'}`}
              style={{
                left: `${x * 100}%`,
                top: `${y * 100}%`,
                width: `${(vehicle ? VEHICLE_W : ART_W) * 100}%`,
                transform: vehicle ? 'translate(-50%, -50%)' : 'translate(-50%, -100%)',
                zIndex: isLifted ? 30 : 10 + Math.round(pad.y * 10),
              }}
            >
              {isSel && !lifted && (
                <div
                  className="pointer-events-none absolute inset-x-0 -top-1 z-20 flex -translate-y-full flex-col items-center"
                  style={{fontSize: labelPx}}
                >
                  <span className="whitespace-nowrap rounded bg-black/80 px-2 py-0.5 font-semibold text-neutral-50 shadow">
                    {buildingName(b)}
                  </span>
                  <span className="mt-0.5 rounded bg-black/60 px-1.5 text-[0.8em] text-neutral-300">
                    {t('board.openHint')}
                  </span>
                </div>
              )}
              <img
                src={b.art}
                alt={buildingName(b)}
                draggable={false}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onDown(e, b.id);
                }}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerCancel={onCancel}
                onDoubleClick={() => onOpen(b.entry)}
                decoding="async"
                className={`block w-full cursor-pointer ${
                  isLifted ? 'brightness-110 drop-shadow-[0_0_14px_rgba(251,191,36,0.9)]' : ''
                } ${isSel && !lifted ? 'drop-shadow-[0_0_10px_rgba(255,255,255,0.7)]' : ''}`}
                style={{touchAction: 'none', transform: isLifted ? 'scale(1.05)' : undefined}}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
