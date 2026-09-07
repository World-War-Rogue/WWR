/**
 * The Arena battle view: the stored fight, played back.
 *
 * The server resolved the attempt before this screen existed and stored
 * every shot (shared/combat.ts CombatEvent). This screen owns a clock and
 * nothing else: what is on screen at time t is a pure function of the event
 * list and t - which shots have landed, which projectile is in the air,
 * which hardpoint just flashed. Skip to Result sets t to the end. Pause
 * stops the clock. 2x doubles how fast it runs. None of them can touch the
 * outcome, because the outcome was never computed here.
 *
 * Player squad on the left, the Dominion Warden on the right, both in one
 * column each so a phone shows the whole exchange without scrolling.
 */
import {useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {ASSET_BY_ID, CATEGORY_LABEL, type AssetCategory} from '../../shared/assets';
import {type Hardpoint, wardenHardpoints} from '../../shared/arena';
import {type ReplayState, type WeaponKind, initialState, stateAfter, weaponOf} from '../../shared/arenaReplay';
import type {CombatEvent, CombatantSpec} from '../../shared/combat';
import type {ArenaAttempt} from '../net/api';
import AssetIcon from './AssetIcon';
import WardenArt, {type HardpointState, WARDEN_ANCHORS, WARDEN_VIEWBOX} from './WardenArt';

/* -------------------------------------------------------------------------- */
/* Schedule                                                                   */
/* -------------------------------------------------------------------------- */

const TRAVEL_MS: Record<WeaponKind, number> = {gun: 260, burst: 340, rocket: 720, missile: 820, strike: 520};
const HOLD_MS = 340;
const FLASH_MS = 130;
const IMPACT_MS = 320;
const ROUND_GAP_MS = 750;
const END_HOLD_MS = 900;

interface Cue {
  index: number;
  ev: CombatEvent;
  weapon: WeaponKind;
  start: number;
  impact: number;
  end: number;
  /** A round banner shows from `start - ROUND_GAP_MS` when this cue opens a round. */
  opensRound: boolean;
}

function schedule(events: CombatEvent[], units: CombatantSpec[], benchmark: CombatantSpec[]): {cues: Cue[]; total: number} {
  const cues: Cue[] = [];
  let t = ROUND_GAP_MS;
  let round = -1;
  events.forEach((ev, index) => {
    const opensRound = ev.round !== round;
    if (opensRound && index > 0) t += ROUND_GAP_MS;
    round = ev.round;
    const shooter = ev.side === 'attacker' ? units[ev.shooter] : benchmark[ev.shooter];
    const weapon = shooter ? weaponOf(shooter.assetId) : 'gun';
    const start = t;
    const impact = start + TRAVEL_MS[weapon];
    const end = impact + HOLD_MS;
    cues.push({index, ev, weapon, start, impact, end, opensRound});
    t = end;
  });
  return {cues, total: t + END_HOLD_MS};
}

/* -------------------------------------------------------------------------- */
/* The screen                                                                 */
/* -------------------------------------------------------------------------- */

type Point = {x: number; y: number};

export default function ArenaBattle({attempt, onDone}: {attempt: ArenaAttempt; onDone: () => void}) {
  const battle = attempt.battle;
  const units = attempt.units;
  const benchmark = battle?.benchmark ?? [];
  const events = useMemo(() => battle?.events ?? [], [battle]);
  const {cues, total} = useMemo(() => schedule(events, units, benchmark), [events, units, benchmark]);
  const hardpoints = useMemo(() => wardenHardpoints(benchmark), [benchmark]);

  const [t, setT] = useState(0);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState<1 | 2>(1);
  const [finished, setFinished] = useState(false);

  // The clock. Real time in, replay time out, scaled and gated.
  const tRef = useRef(0);
  const pausedRef = useRef(false);
  const speedRef = useRef<1 | 2>(1);
  pausedRef.current = paused;
  speedRef.current = speed;
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      if (!pausedRef.current && tRef.current < total) {
        tRef.current = Math.min(total, tRef.current + dt * speedRef.current);
        setT(tRef.current);
        if (tRef.current >= total) setFinished(true);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [total]);

  // The report opens itself when the last shot has settled.
  useEffect(() => {
    if (!finished) return;
    const id = window.setTimeout(onDone, 500);
    return () => window.clearTimeout(id);
  }, [finished, onDone]);

  function skip() {
    tRef.current = total;
    setT(total);
    setFinished(true);
  }

  // What has landed by now.
  const landed = cues.filter((c) => c.impact <= t).length;
  const state: ReplayState = useMemo(
    () => (landed === 0 ? initialState(units, benchmark) : stateAfter(units, benchmark, events, landed)),
    [landed, units, benchmark, events],
  );
  const active = cues.find((c) => c.start <= t && t < c.end) ?? null;
  const banner = cues.find((c) => c.opensRound && c.start - ROUND_GAP_MS <= t && t < c.start) ?? null;
  const currentRound = active?.ev.round ?? banner?.ev.round ?? (cues.length ? (t < cues[0].start ? cues[0].ev.round : cues[cues.length - 1].ev.round) : 0);
  const recentlyHit = (side: 'attacker' | 'defender', i: number) =>
    cues.some((c) => c.impact <= t && t < c.impact + IMPACT_MS && (c.ev.side === 'attacker' ? 'defender' : 'attacker') === side && c.ev.target === i);

  // Anchors for the tracers: measured from the DOM, in container pixels.
  const rootRef = useRef<HTMLDivElement | null>(null);
  const unitRefs = useRef<Array<HTMLDivElement | null>>([]);
  const wardenRef = useRef<HTMLDivElement | null>(null);
  const [anchors, setAnchors] = useState<{units: Point[]; warden: Point[]; size: {w: number; h: number}}>({units: [], warden: [], size: {w: 0, h: 0}});
  useLayoutEffect(() => {
    const measure = () => {
      const root = rootRef.current;
      if (!root) return;
      const rb = root.getBoundingClientRect();
      const unitPts = units.map((_, i) => {
        const el = unitRefs.current[i];
        if (!el) return {x: 0, y: 0};
        const b = el.getBoundingClientRect();
        return {x: b.right - rb.left - 6, y: b.top - rb.top + b.height / 2};
      });
      const w = wardenRef.current?.querySelector('svg')?.getBoundingClientRect();
      const wardenPts = WARDEN_ANCHORS.map((a) =>
        w ? {x: w.left - rb.left + (a.x / WARDEN_VIEWBOX.w) * w.width, y: w.top - rb.top + (a.y / WARDEN_VIEWBOX.h) * w.height} : {x: 0, y: 0},
      );
      setAnchors({units: unitPts, warden: wardenPts, size: {w: rb.width, h: rb.height}});
    };
    measure();
    window.addEventListener('resize', measure);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (ro && rootRef.current) ro.observe(rootRef.current);
    return () => {
      window.removeEventListener('resize', measure);
      ro?.disconnect();
    };
  }, [units.length]);

  if (!battle) {
    return (
      <div className="p-4 text-sm text-neutral-400">
        This attempt was stored before replays existed. <button onClick={onDone} className="underline">Open the report.</button>
      </div>
    );
  }

  const hpStates: HardpointState[] = hardpoints.map((h) => (state.defender[h.index]?.hp <= 0 ? 'out' : recentlyHit('defender', h.index) ? 'hit' : 'whole'));
  const wardenStrength = benchmark.length ? state.defender.reduce((s, u) => s + u.hp, 0) / benchmark.length : 0;
  const squadStrength = units.length ? state.attacker.reduce((s, u) => s + u.hp, 0) / units.length : 0;
  const btn = 'rounded border border-neutral-700 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-200 hover:border-orange-500 hover:text-orange-200';

  return (
    <div className="mx-auto max-w-3xl p-3 text-neutral-200">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-orange-400">Arena · attempt {attempt.n}</h2>
          <p className="text-[11px] text-neutral-500">
            {banner ? (banner.ev.round === 0 ? 'Opening wave' : `Round ${banner.ev.round}`) : currentRound === 0 ? 'Opening wave' : `Round ${currentRound}`} ·{' '}
            {landed}/{cues.length} shots
          </p>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setPaused((p) => !p)} className={btn} disabled={finished}>
            {paused ? 'Resume' : 'Pause'}
          </button>
          <button onClick={() => setSpeed((s) => (s === 1 ? 2 : 1))} className={btn}>
            {speed}×
          </button>
          <button onClick={skip} className={`${btn} border-orange-700 text-orange-200`}>
            Skip to result
          </button>
        </div>
      </div>

      {/* Side bars. */}
      <div className="mt-2 grid grid-cols-2 gap-3 text-[10px] uppercase tracking-wider text-neutral-500">
        <div>
          <div className="flex justify-between">
            <span>Your squad</span>
            <span className="font-mono text-neutral-300">{Math.round(squadStrength * 100)}%</span>
          </div>
          <div className="mt-0.5 h-1.5 overflow-hidden rounded bg-neutral-800">
            <div className="h-full bg-amber-400 transition-[width] duration-200" style={{width: `${squadStrength * 100}%`}} />
          </div>
        </div>
        <div>
          <div className="flex justify-between">
            <span>{battle.opponent}</span>
            <span className="font-mono text-neutral-300">{Math.round(wardenStrength * 100)}%</span>
          </div>
          <div className="mt-0.5 h-1.5 overflow-hidden rounded bg-neutral-800">
            <div className="h-full bg-red-500 transition-[width] duration-200" style={{width: `${wardenStrength * 100}%`}} />
          </div>
        </div>
      </div>

      {/* The field. */}
      <div ref={rootRef} className="relative mt-2 grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          {units.map((u, i) => {
            const asset = ASSET_BY_ID[u.assetId];
            const s = state.attacker[i];
            const out = s ? s.hp <= 0 : false;
            const hit = recentlyHit('attacker', i);
            const firing = active?.ev.side === 'attacker' && active.ev.shooter === i && t < active.start + FLASH_MS;
            return (
              <div
                key={i}
                ref={(el) => {
                  unitRefs.current[i] = el;
                }}
                className={`flex items-center gap-2 rounded border px-1.5 py-1 transition ${
                  out ? 'border-neutral-900 bg-neutral-950 opacity-50' : hit ? 'border-white bg-white/10' : firing ? 'border-amber-400' : 'border-neutral-800 bg-neutral-950'
                }`}
              >
                {asset && <AssetIcon asset={asset} size={34} level={u.level} />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] text-neutral-100">
                    {asset?.code ?? u.assetId} {out && <span className="ml-1 rounded bg-neutral-800 px-1 text-[9px] text-neutral-400">OUT</span>}
                  </p>
                  <div className="mt-0.5 h-1 overflow-hidden rounded bg-neutral-800">
                    <div className={`h-full ${s && s.hp < 0.35 ? 'bg-orange-500' : 'bg-emerald-500'} transition-[width] duration-200`} style={{width: `${(s?.hp ?? 1) * 100}%`}} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div ref={wardenRef} className="relative">
          <WardenArt states={hpStates} className="w-full" />
          <span className="absolute right-1 top-1 rounded bg-neutral-900/80 px-1 text-[8px] uppercase tracking-wider text-neutral-500">temp art</span>
          <ul className="mt-1 space-y-0.5">
            {hardpoints.map((h: Hardpoint) => {
              const s = state.defender[h.index];
              const out = s ? s.hp <= 0 : false;
              return (
                <li key={h.index} className={`text-[10px] ${out ? 'text-neutral-600 line-through' : 'text-neutral-400'}`}>
                  <div className="flex justify-between">
                    <span className="truncate">
                      {h.name} <span className="text-neutral-600">{CATEGORY_LABEL[h.category as AssetCategory]} Lv {h.level}</span>
                    </span>
                  </div>
                  <div className="h-0.5 overflow-hidden rounded bg-neutral-800">
                    <div className="h-full bg-red-500 transition-[width] duration-200" style={{width: `${(s?.hp ?? 1) * 100}%`}} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Effects: tracers, trails, flashes, impacts. Pure function of t. */}
        <svg className="pointer-events-none absolute inset-0" width={anchors.size.w} height={anchors.size.h} style={{overflow: 'visible'}}>
          {cues
            .filter((c) => c.start <= t && t < c.impact + IMPACT_MS)
            .map((c) => {
              const fromPts = c.ev.side === 'attacker' ? anchors.units : anchors.warden;
              const toPts = c.ev.side === 'attacker' ? anchors.warden : anchors.units;
              const from = fromPts[c.ev.shooter];
              const to = toPts[c.ev.target];
              if (!from || !to) return null;
              const colour = c.ev.side === 'attacker' ? '#fbbf24' : '#ff5a3d';
              const p = Math.max(0, Math.min(1, (t - c.start) / (c.impact - c.start)));
              const flying = t < c.impact;
              const arc = c.weapon === 'rocket' || c.weapon === 'missile' ? -60 : c.weapon === 'strike' ? -30 : 0;
              const at = (q: number) => ({x: from.x + (to.x - from.x) * q, y: from.y + (to.y - from.y) * q + arc * Math.sin(Math.PI * q)});
              const head = at(p);
              const impactAge = t - c.impact;
              return (
                <g key={c.index}>
                  {t < c.start + FLASH_MS && <circle cx={from.x} cy={from.y} r={6 + (t - c.start) / 12} fill={colour} opacity={0.9 - (t - c.start) / FLASH_MS} />}
                  {flying && (c.weapon === 'gun' || c.weapon === 'burst') && (
                    <line x1={at(Math.max(0, p - 0.18)).x} y1={at(Math.max(0, p - 0.18)).y} x2={head.x} y2={head.y} stroke={colour} strokeWidth={c.weapon === 'burst' ? 1.5 : 2.5} strokeLinecap="round" />
                  )}
                  {flying && (c.weapon === 'rocket' || c.weapon === 'missile' || c.weapon === 'strike') && (
                    <>
                      <path d={`M${at(Math.max(0, p - 0.35)).x} ${at(Math.max(0, p - 0.35)).y} Q${at(Math.max(0, p - 0.17)).x} ${at(Math.max(0, p - 0.17)).y} ${head.x} ${head.y}`} stroke="#d4d4d4" strokeWidth="2" fill="none" opacity="0.5" />
                      <circle cx={head.x} cy={head.y} r={c.weapon === 'strike' ? 2.5 : 3.5} fill={colour} />
                    </>
                  )}
                  {!flying && impactAge >= 0 && (
                    <g opacity={1 - impactAge / IMPACT_MS}>
                      <circle cx={to.x} cy={to.y} r={4 + impactAge / 6} fill="none" stroke="#fff7ed" strokeWidth="2" />
                      <circle cx={to.x} cy={to.y} r={2 + impactAge / 14} fill={c.ev.damage > 0 ? '#ffb347' : '#9ca3af'} />
                      {[0, 1, 2, 3, 4].map((k) => {
                        const a = (k / 5) * Math.PI * 2 + c.index;
                        const d = 6 + impactAge / 5;
                        return <line key={k} x1={to.x + Math.cos(a) * 3} y1={to.y + Math.sin(a) * 3} x2={to.x + Math.cos(a) * d} y2={to.y + Math.sin(a) * d} stroke="#ffd166" strokeWidth="1.5" />;
                      })}
                      <text x={to.x + 8} y={to.y - 8 - impactAge / 10} fill={c.ev.damage > 0 ? '#fde68a' : '#9ca3af'} fontSize="11" fontFamily="ui-monospace, monospace" fontWeight="700">
                        {c.ev.damage > 0 ? `-${c.ev.damage}` : 'no damage'}
                      </text>
                      {c.ev.broke && (
                        <text x={to.x + 8} y={to.y + 12} fill="#fca5a5" fontSize="10" fontFamily="ui-monospace, monospace">
                          KNOCKED OUT
                        </text>
                      )}
                    </g>
                  )}
                </g>
              );
            })}
        </svg>

        {banner && (
          <div className="pointer-events-none absolute inset-x-0 top-1/3 flex justify-center">
            <span className="rounded border border-orange-700 bg-neutral-950/90 px-4 py-1 text-sm font-semibold uppercase tracking-[0.3em] text-orange-300">
              {banner.ev.round === 0 ? 'Opening wave' : `Round ${banner.ev.round}`}
            </span>
          </div>
        )}
        {finished && (
          <div className="pointer-events-none absolute inset-x-0 top-1/3 flex justify-center">
            <span className={`rounded border px-4 py-1 text-sm font-semibold uppercase tracking-[0.3em] ${attempt.outcome === 'attacker' ? 'border-emerald-700 bg-emerald-950/90 text-emerald-300' : 'border-red-800 bg-neutral-950/90 text-red-300'}`}>
              {attempt.outcome === 'attacker' ? 'Victory' : attempt.outcome === 'draw' ? 'Draw' : 'Defeat'}
            </span>
          </div>
        )}
      </div>

      <p className="mt-2 text-[10px] text-neutral-600">
        A replay of the fight the server resolved. Bars move only where its record says damage was taken. Nothing of yours is damaged.
      </p>
    </div>
  );
}
