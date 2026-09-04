/**
 * The shared world map.
 *
 * Drawn on a canvas rather than as DOM nodes. A thousand bases with nameplates
 * would be a thousand elements to lay out and composite on every pan; here it
 * is one element and a draw loop, which is the difference between a map that
 * stays smooth on a phone and one that does not.
 *
 * The camera is in plot units. A plot is a 4x4 block of world tiles and holds
 * exactly one base, so plot coordinates are the only unit this file thinks in;
 * pixels appear only at the moment of drawing.
 */
import {type RefObject, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {ApiError, type PlacedBase, type WorldView, api} from '../net/api';
import {EffectLayer, type EffectSource} from './effects';
import {DEFAULT_SEASON, seasonSpec, terrainAt} from './terrain';
import {normaliseLoadout} from '../../shared/cosmetics';
import {artPending, onArtLoaded, skinIsAnimated} from './skinArt';
import {drawBase as paintBase, skinSpec} from './skins';

const MIN_ZOOM = 14; // pixels per plot when fully zoomed out
const MAX_ZOOM = 96;
const FETCH_MARGIN = 6; // plots of slack around the viewport, so panning is not a stutter of requests

interface Camera {
  cx: number;
  cy: number;
  zoom: number;
}

function useCanvasSize(ref: RefObject<HTMLCanvasElement | null>) {
  const [size, setSize] = useState({w: 0, h: 0});
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const observer = new ResizeObserver(() => {
      setSize({w: parent.clientWidth, h: parent.clientHeight});
    });
    observer.observe(parent);
    setSize({w: parent.clientWidth, h: parent.clientHeight});
    return () => observer.disconnect();
  }, [ref]);
  return size;
}

function drawNameplate(
  ctx: CanvasRenderingContext2D,
  cx: number,
  topY: number,
  base: PlacedBase,
  isYou: boolean,
  scale: number,
) {
  const fontSize = Math.max(9, Math.min(13, scale * 0.2));
  ctx.font = `600 ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
  const label = base.username;
  const levelText = String(base.level);
  const textWidth = ctx.measureText(label).width;
  const padX = fontSize * 0.5;
  const boxW = textWidth + padX * 2 + fontSize * 1.6;
  const boxH = fontSize * 1.5;
  const boxX = cx - boxW / 2;
  const boxY = topY - boxH - fontSize * 0.4;

  ctx.fillStyle = isYou ? 'rgba(234,88,12,0.92)' : 'rgba(15,17,16,0.82)';
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, boxH / 2);
  ctx.fill();
  ctx.strokeStyle = isYou ? '#ffb37a' : 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = isYou ? '#fff7ed' : '#e5e7eb';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(label, boxX + padX, boxY + boxH / 2);

  // Level badge on the right of the plate.
  const badgeX = boxX + boxW - fontSize * 1.1;
  ctx.fillStyle = isYou ? '#7c2d12' : 'rgba(255,255,255,0.14)';
  ctx.beginPath();
  ctx.arc(badgeX, boxY + boxH / 2, fontSize * 0.62, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f5f5f4';
  ctx.textAlign = 'center';
  ctx.font = `700 ${fontSize * 0.78}px ui-sans-serif, system-ui, sans-serif`;
  ctx.fillText(levelText, badgeX, boxY + boxH / 2 + 0.5);
}

export default function WorldMap({onOpenBase}: {onOpenBase: () => void}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const {w, h} = useCanvasSize(canvasRef);

  const [camera, setCamera] = useState<Camera>({cx: 0, cy: 0, zoom: 40});
  const [view, setView] = useState<WorldView | null>(null);
  const [selected, setSelected] = useState<{x: number; y: number; base: PlacedBase | null} | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);
  const [centred, setCentred] = useState(false);

  const cameraRef = useRef(camera);
  cameraRef.current = camera;

  // Effects live outside React state: they change every frame, and putting
  // them through a re-render would cost more than the drawing does.
  const effectsRef = useRef(new EffectLayer());
  const frameRef = useRef<number | null>(null);
  const lastFrameRef = useRef(0);
  const [, forceDraw] = useState(0);

  // Whether anything currently loaded needs a frame clock. A map of still
  // bases costs nothing; one animated skin in view starts the loop, and only
  // for as long as it is in view.
  const animatedInView = useMemo(
    () =>
      (view?.bases ?? []).some((base) => {
        const spec = skinSpec(base.skin);
        return skinIsAnimated(spec.art, spec.motion);
      }),
    [view],
  );

  const basesByPlot = useMemo(() => {
    const map = new Map<string, PlacedBase>();
    for (const base of view?.bases ?? []) map.set(`${base.x},${base.y}`, base);
    return map;
  }, [view]);

  const load = useCallback(async (cam: Camera, width: number, height: number) => {
    if (width === 0 || height === 0) return;
    const plotsW = Math.ceil(width / cam.zoom) + FETCH_MARGIN * 2;
    const plotsH = Math.ceil(height / cam.zoom) + FETCH_MARGIN * 2;
    const x = Math.floor(cam.cx - plotsW / 2);
    const y = Math.floor(cam.cy - plotsH / 2);
    try {
      setView(await api.world(x, y, Math.min(80, plotsW), Math.min(80, plotsH)));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reach the server.');
    }
  }, []);

  // Centre on your own base the first time the map opens, so a new player is
  // looking at their neighbours rather than at empty ground.
  useEffect(() => {
    if (centred || !view?.you.plot) return;
    setCamera((c) => ({...c, cx: view.you.plot!.x + 0.5, cy: view.you.plot!.y + 0.5}));
    setCentred(true);
  }, [view, centred]);

  // Refetch on a settle rather than on every frame of a drag.
  useEffect(() => {
    const id = window.setTimeout(() => void load(camera, w, h), 180);
    return () => window.clearTimeout(id);
  }, [camera, w, h, load]);

  // Pointer panning. Tracked in refs so a drag never re-renders per frame.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let dragging = false;
    let moved = 0;
    let lastX = 0;
    let lastY = 0;

    const down = (e: PointerEvent) => {
      dragging = true;
      moved = 0;
      lastX = e.clientX;
      lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      moved += Math.abs(dx) + Math.abs(dy);
      lastX = e.clientX;
      lastY = e.clientY;
      setCamera((c) => ({...c, cx: c.cx - dx / c.zoom, cy: c.cy - dy / c.zoom}));
    };
    const up = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      canvas.releasePointerCapture(e.pointerId);
      // A drag is not a click. Only select when the pointer barely moved.
      if (moved > 6) return;
      const rect = canvas.getBoundingClientRect();
      const cam = cameraRef.current;
      const plotX = Math.floor(cam.cx + (e.clientX - rect.left - rect.width / 2) / cam.zoom);
      const plotY = Math.floor(cam.cy + (e.clientY - rect.top - rect.height / 2) / cam.zoom);
      setSelected({x: plotX, y: plotY, base: null});
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      setCamera((c) => ({
        ...c,
        zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, c.zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15))),
      }));
    };

    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', wheel, {passive: false});
    return () => {
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', up);
      canvas.removeEventListener('wheel', wheel);
    };
  }, []);

  // Resolve which base, if any, occupies the selected plot.
  useEffect(() => {
    if (!selected) return;
    const base = basesByPlot.get(`${selected.x},${selected.y}`) ?? null;
    if (base !== selected.base) setSelected({...selected, base});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basesByPlot, selected?.x, selected?.y]);

  // Draw.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || w === 0 || h === 0) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // One clock for the whole map. Bases wearing the same skin move in step,
    // which reads as deliberate; a per-base phase reads as fidgeting.
    const time = performance.now();

    const {cx, cy, zoom} = camera;
    const toScreenX = (plotX: number) => (plotX - cx) * zoom + w / 2;
    const toScreenY = (plotY: number) => (plotY - cy) * zoom + h / 2;

    ctx.fillStyle = '#0a0906';
    ctx.fillRect(0, 0, w, h);

    const firstX = Math.floor(cx - w / (2 * zoom)) - 1;
    const lastX = Math.ceil(cx + w / (2 * zoom)) + 1;
    const firstY = Math.floor(cy - h / (2 * zoom)) - 1;
    const lastY = Math.ceil(cy + h / (2 * zoom)) + 1;

    const extent = view?.world.extent ?? 200;

    // Ground. Terrain is generated per plot rather than stored, so the season
    // costs nothing in the database and nothing over the wire.
    const season = seasonSpec(DEFAULT_SEASON);
    const showGrid = zoom > 26;
    const worldId = view?.world.id ?? 1001;

    for (let py = firstY; py <= lastY; py += 1) {
      for (let px = firstX; px <= lastX; px += 1) {
        const sx = toScreenX(px);
        const sy = toScreenY(py);

        if (Math.abs(px) > extent || Math.abs(py) > extent) {
          ctx.fillStyle = season.voidColor;
          ctx.fillRect(sx, sy, zoom + 1, zoom + 1);
          continue;
        }

        const cell = terrainAt(worldId, season.id, extent, px, py);
        const colours = season.biomes[cell.biome];
        ctx.fillStyle = cell.shade > 0.5 ? colours.fill : colours.alt;
        ctx.fillRect(sx, sy, zoom + 1, zoom + 1);

        if (cell.feature === 'oasis') {
          ctx.fillStyle = season.biomes.forest.fill;
          ctx.beginPath();
          ctx.arc(sx + zoom / 2, sy + zoom / 2, zoom * 0.44, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = colours.detail;
          ctx.beginPath();
          ctx.arc(sx + zoom / 2, sy + zoom / 2, zoom * 0.26, 0, Math.PI * 2);
          ctx.fill();
        } else if (cell.feature === 'wreck' && zoom > 20) {
          // A freighter left stranded when the sea dried, canted over.
          ctx.save();
          ctx.translate(sx + zoom / 2, sy + zoom / 2);
          ctx.rotate(cell.shade * 1.2 - 0.6);
          ctx.fillStyle = '#4a4038';
          ctx.fillRect(-zoom * 0.34, -zoom * 0.12, zoom * 0.68, zoom * 0.24);
          ctx.fillStyle = '#6b5c4d';
          ctx.fillRect(-zoom * 0.06, -zoom * 0.24, zoom * 0.18, zoom * 0.16);
          ctx.restore();
        }

        if (showGrid) {
          ctx.strokeStyle = 'rgba(0,0,0,0.10)';
          ctx.lineWidth = 1;
          ctx.strokeRect(sx + 0.5, sy + 0.5, zoom, zoom);
        }
      }
    }

    // Selection.
    if (selected) {
      const sx = toScreenX(selected.x);
      const sy = toScreenY(selected.y);
      ctx.strokeStyle = selected.base ? '#f59e0b' : '#4ade80';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(sx + 1, sy + 1, zoom - 2, zoom - 2);
      ctx.setLineDash([]);
    }

    // Bases, then nameplates on top so plates are never hidden by a neighbour.
    const visible = (view?.bases ?? []).filter(
      (b) => b.x >= firstX && b.x <= lastX && b.y >= firstY && b.y <= lastY,
    );
    const you = view?.you.username;

    for (const base of visible) {
      paintBase(
        ctx,
        toScreenX(base.x),
        toScreenY(base.y),
        zoom,
        skinSpec(base.skin),
        base.x,
        base.y,
        base.level,
        base.username === you,
        normaliseLoadout(base),
        time,
      );
    }

    // Effects sit above the bases and below the nameplates, so a plate is
    // never obscured by the smoke coming off its own base.
    effectsRef.current.draw(
      ctx,
      (ex, ey) =>
        ex >= firstX && ex <= lastX && ey >= firstY && ey <= lastY
          ? {px: toScreenX(ex), py: toScreenY(ey)}
          : null,
      zoom,
    );

    if (zoom > 26) {
      for (const base of visible) {
        drawNameplate(
          ctx,
          toScreenX(base.x) + zoom / 2,
          toScreenY(base.y),
          base,
          base.username === you,
          zoom,
        );
      }
    }
  }, [camera, view, w, h, selected]);

  // Drives the animation loop only while something is actually moving. A map
  // of static bases costs nothing; a burning one runs at frame rate.
  useEffect(() => {
    const layer = effectsRef.current;
    // Three reasons to keep drawing: something is burning, a skin in view
    // moves, or art is still arriving and the frame it lands on has to be
    // redrawn.
    const running = () => layer.busy || animatedInView || artPending();
    const step = (time: number) => {
      const delta = lastFrameRef.current ? Math.min(64, time - lastFrameRef.current) : 16;
      lastFrameRef.current = time;
      layer.update(delta);
      forceDraw((n) => (n + 1) % 1_000_000);
      frameRef.current = running() ? window.requestAnimationFrame(step) : null;
    };
    if (running() && frameRef.current === null) {
      lastFrameRef.current = 0;
      frameRef.current = window.requestAnimationFrame(step);
    }
    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  });

  // A skin with a single still and no motion never starts the loop, so the
  // frame its art lands on has to be asked for explicitly.
  useEffect(() => onArtLoaded(() => forceDraw((n) => (n + 1) % 1_000_000)), []);

  // Until combat exists, effects can be exercised from the console:
  //   wwrBurn(x, y)  - set a plot alight
  //   wwrBlast(x, y) - play the destruction ring
  useEffect(() => {
    const layer = effectsRef.current;
    const w = window as unknown as Record<string, unknown>;
    w.wwrBurn = (x: number, y: number, minutes = 5) => {
      const sources: EffectSource[] = [
        {x, y, kind: 'smoke', intensity: 1, until: Date.now() + minutes * 60000},
      ];
      layer.sync(sources, Date.now());
      layer.sync([...sources, {x, y, kind: 'fire', intensity: 0.8, until: Date.now() + minutes * 60000}], Date.now());
      forceDraw((n) => n + 1);
      return `burning ${x},${y}`;
    };
    w.wwrBlast = (x: number, y: number) => {
      layer.addBlast(x, y);
      forceDraw((n) => n + 1);
      return `blast ${x},${y}`;
    };
    return () => {
      delete w.wwrBurn;
      delete w.wwrBlast;
    };
  }, []);

  async function moveHere() {
    if (!selected) return;
    setMoving(true);
    setError(null);
    try {
      await api.move(selected.x, selected.y);
      await load(camera, w, h);
      setSelected(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reach the server.');
    } finally {
      setMoving(false);
    }
  }

  const occupied = Boolean(selected?.base);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0a0906]">
      <canvas ref={canvasRef} className="h-full w-full touch-none" style={{width: w, height: h}} />

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3">
        <div className="pointer-events-auto rounded border border-neutral-800 bg-black/70 px-3 py-2 backdrop-blur">
          <p className="text-[10px] uppercase tracking-[0.25em] text-orange-500">
            {view?.world.kind === 'event' ? 'Battle theatre' : 'Home world'}
          </p>
          <p className="text-sm font-semibold text-neutral-100">
            #{view?.world.id} {view?.world.name}
          </p>
          <p className="text-[11px] text-neutral-500">
            {view?.bases.length ?? 0} bases in view · {view?.you.plot ? `you at ${view.you.plot.x}, ${view.you.plot.y}` : 'unplaced'}
          </p>
        </div>

        <button
          onClick={onOpenBase}
          className="pointer-events-auto rounded border border-neutral-700 bg-black/70 px-3 py-2 text-sm text-neutral-200 backdrop-blur hover:border-orange-600"
        >
          My base
        </button>
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 flex gap-2">
        {[
          {label: '+', delta: 1.3},
          {label: '−', delta: 1 / 1.3},
        ].map((btn) => (
          <button
            key={btn.label}
            onClick={() =>
              setCamera((c) => ({
                ...c,
                zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, c.zoom * btn.delta)),
              }))
            }
            className="pointer-events-auto h-9 w-9 rounded border border-neutral-700 bg-black/70 text-lg text-neutral-200 backdrop-blur hover:border-orange-600"
          >
            {btn.label}
          </button>
        ))}
        {view?.you.plot && (
          <button
            onClick={() =>
              setCamera((c) => ({...c, cx: view.you.plot!.x + 0.5, cy: view.you.plot!.y + 0.5}))
            }
            className="pointer-events-auto rounded border border-neutral-700 bg-black/70 px-3 text-sm text-neutral-200 backdrop-blur hover:border-orange-600"
          >
            Recentre
          </button>
        )}
      </div>

      {error && (
        <div className="absolute inset-x-3 bottom-20 rounded border border-red-900 bg-red-950/80 px-3 py-2 text-sm text-red-200 backdrop-blur">
          {error}
        </div>
      )}

      {selected && (
        <div className="absolute inset-x-3 bottom-3 rounded border border-neutral-800 bg-black/85 p-3 backdrop-blur sm:left-auto sm:right-3 sm:w-80">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-[11px] text-neutral-500">
                plot {selected.x}, {selected.y}
              </p>
              {selected.base ? (
                <>
                  <p className="truncate font-semibold text-neutral-100">{selected.base.username}</p>
                  <p className="text-xs text-neutral-400">
                    {skinSpec(selected.base.skin).name} · Command Post{' '}
                    {selected.base.level}
                  </p>
                </>
              ) : (
                <p className="font-semibold text-emerald-400">Open ground</p>
              )}
            </div>
            <button
              onClick={() => setSelected(null)}
              className="shrink-0 text-neutral-500 hover:text-neutral-200"
            >
              ✕
            </button>
          </div>

          {!occupied && (
            <button
              onClick={() => void moveHere()}
              disabled={moving}
              className="mt-3 w-full rounded bg-orange-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {moving ? 'Relocating…' : 'Move here'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
