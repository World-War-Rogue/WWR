/**
 * General Rider: the portrait above the chat bar and the speech bubble
 * beside it. Reads the player's saved place, advances on the script's
 * events, saves every step, and plays a building's line when one is opened
 * out of order. Off when Settings says so; tips only once the walkthrough
 * is done.
 */
import {useEffect, useRef, useState} from 'react';
import {type SeasonState, api} from '../../net/api';
import {anyModalOpen, onGuideEvent, onModalChange} from './bus';
import {BUILDING_LINE, GUIDE_STEPS, TIPS} from './script';

export default function Guide() {
  const [state, setState] = useState<SeasonState['guide'] | null>(null);
  const [aside, setAside] = useState<string | null>(null);
  const [tip, setTip] = useState<string | null>(null);
  // Closed with X: the bubble folds down to the portrait until the step
  // changes or the portrait is tapped, so it never sits over the Task Force
  // slabs and the chat bar it is drawn beside.
  const [collapsed, setCollapsed] = useState(false);
  // A sheet, composer or panel is open: Rider steps aside entirely rather
  // than sit over its buttons (see modalOpened in bus.ts). His step is kept,
  // so he is back saying the same thing the moment the modal closes.
  const [modal, setModal] = useState(() => anyModalOpen());
  useEffect(() => onModalChange(setModal), []);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    let live = true;
    api
      .season()
      .then((s) => live && setState(s.guide))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  const save = (patch: Parameters<typeof api.guide>[0]) => {
    api
      .guide(patch)
      .then((r) => setState(r.season1.guide))
      .catch(() => undefined);
  };

  const advance = () => {
    const s = stateRef.current;
    if (!s) return;
    const next = s.step + 1;
    setState({...s, step: next});
    setCollapsed(false);
    save({step: next});
  };

  useEffect(
    () =>
      onGuideEvent((name) => {
        if (name === 'guide:refresh') {
          api
            .season()
            .then((r) => {
              setState(r.guide);
              setCollapsed(false);
            })
            .catch(() => undefined);
          return;
        }
        const s = stateRef.current;
        if (!s || !s.enabled) return;
        // Tips: once each, shown only after the walkthrough (or when off-script).
        if (name.startsWith('tip:')) {
          const [, key, ...rest] = name.split(':');
          if (!s.completed || s.tips.includes(key) || !TIPS[key]) return;
          const vars: Record<string, string> = {};
          for (const kv of rest) {
            const [k, v] = kv.split('=');
            if (k && v !== undefined) vars[k] = decodeURIComponent(v);
          }
          setTip(TIPS[key](vars));
          save({tip: key});
          return;
        }
        if (s.completed) return;
        const step = GUIDE_STEPS.find((x) => x.id === s.step);
        if (!step) return;
        if (step.advance === name) {
          setAside(null);
          advance();
          return;
        }
        // Opened a building out of order: say its line, then carry on.
        if (name.startsWith('open:building:')) {
          const line = BUILDING_LINE[name.slice('open:building:'.length)];
          if (line) setAside(line);
        }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  if (!state || !state.enabled || modal) return null;
  const step = state.completed ? null : GUIDE_STEPS.find((x) => x.id === state.step) ?? null;
  const text = tip ?? aside ?? step?.say ?? null;
  if (!text) return null;
  const highlight = !tip && !aside ? step?.highlight : undefined;
  const folded = collapsed && !tip && !aside;

  return (
    <>
      {highlight && (
        <style>{`[data-guide="${highlight}"]{outline:2px solid rgba(103,232,249,.9);outline-offset:2px;animation:wwr-guide-pulse 1.2s ease-in-out infinite}@keyframes wwr-guide-pulse{0%,100%{outline-color:rgba(103,232,249,.9)}50%{outline-color:rgba(103,232,249,.2)}}`}</style>
      )}
      <div className="pointer-events-none fixed inset-x-2 bottom-[calc(3.25rem+env(safe-area-inset-bottom))] z-[60] flex items-end gap-2">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="pointer-events-auto h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-cyan-400/80 bg-neutral-950 shadow-lg"
          title="General Rider"
        >
          <img src="/guide/rider-portrait.webp" alt="General Rider" className="h-full w-full object-cover" draggable={false} />
        </button>
        {folded ? null : (
        <div className="pointer-events-auto max-w-md flex-1 rounded-lg border border-cyan-800/70 bg-neutral-950/95 px-3 py-2 shadow-lg backdrop-blur">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-400">General Rider</p>
            <button
              onClick={() => {
                if (tip) setTip(null);
                else if (aside) setAside(null);
                else setCollapsed(true);
              }}
              className="text-neutral-500 hover:text-neutral-200"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
          <p className="mt-0.5 text-xs leading-snug text-neutral-100">{text}</p>
          {!tip && !aside && step && step.advance === 'next' && (
            <button
              onClick={advance}
              className="mt-1.5 rounded border border-cyan-700 bg-cyan-950/40 px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-cyan-200 hover:bg-cyan-900/40"
            >
              Next
            </button>
          )}
          {!tip && !aside && step && step.advance === 'finish' && (
            <div className="mt-1.5 flex gap-2">
              <button
                onClick={() => save({completed: true})}
                className="rounded border border-cyan-700 bg-cyan-950/40 px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-cyan-200 hover:bg-cyan-900/40"
              >
                Keep guide on
              </button>
              <button
                onClick={() => save({completed: true, enabled: false})}
                className="rounded border border-neutral-700 px-3 py-0.5 text-[11px] uppercase tracking-wider text-neutral-300"
              >
                Dismiss guide
              </button>
            </div>
          )}
          {aside && !tip && (
            <p className="mt-1 text-[10px] text-neutral-500">Back to where we were when you close this.</p>
          )}
        </div>
        )}
      </div>
    </>
  );
}
