/**
 * The Dominion Warden, drawn.
 *
 * TEMPORARY ART. This is a placeholder war machine built from shapes so the
 * Arena battle view has an enemy to point tracers at until the finished
 * Warden art lands (docs/CHATGPT-DOMINION-WARDEN-ART-BRIEF.md). It is
 * labelled as such wherever it is shown and must not appear in marketing.
 *
 * Six hardpoints, one per benchmark unit in unit order: turret, left rocket
 * pod, right missile rack, two forward autocannon pods, sensor mast. Each
 * has an anchor (viewBox coordinates) the battle view fires at, and a state:
 * whole, just hit, or knocked out. Non-grim by construction - a knocked-out
 * hardpoint goes dark and sparks; nothing burns and nobody is in it.
 */
export const WARDEN_VIEWBOX = {w: 320, h: 300} as const;

/** Where each hardpoint sits, in viewBox units. Index = benchmark unit index. */
export const WARDEN_ANCHORS: ReadonlyArray<{x: number; y: number}> = [
  {x: 150, y: 118}, // 0 turret
  {x: 70, y: 128}, // 1 left rocket pod
  {x: 236, y: 128}, // 2 right missile rack
  {x: 96, y: 196}, // 3 forward-left autocannon pod
  {x: 214, y: 196}, // 4 forward-right autocannon pod
  {x: 176, y: 62}, // 5 sensor mast
];

export type HardpointState = 'whole' | 'hit' | 'out';

export default function WardenArt({states, className}: {states: HardpointState[]; className?: string}) {
  const st = (i: number): HardpointState => states[i] ?? 'whole';
  const fill = (i: number, whole: string) => (st(i) === 'out' ? '#3a3a3a' : st(i) === 'hit' ? '#ffd9c2' : whole);
  const glow = (i: number) => (st(i) === 'hit' ? 'url(#hitGlow)' : undefined);
  return (
    <svg viewBox={`0 0 ${WARDEN_VIEWBOX.w} ${WARDEN_VIEWBOX.h}`} className={className} role="img" aria-label="Dominion Warden">
      <defs>
        <linearGradient id="hull" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5b5f66" />
          <stop offset="0.55" stopColor="#2f3237" />
          <stop offset="1" stopColor="#1a1c20" />
        </linearGradient>
        <linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="red" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff6a4d" />
          <stop offset="1" stopColor="#8f1b12" />
        </linearGradient>
        <filter id="hitGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ground shadow */}
      <ellipse cx="156" cy="268" rx="130" ry="14" fill="#000" opacity="0.35" />

      {/* legs / treads */}
      <g fill="url(#hull)" stroke="#0e0f11" strokeWidth="2">
        <rect x="34" y="212" width="70" height="46" rx="10" />
        <rect x="206" y="212" width="70" height="46" rx="10" />
        <rect x="48" y="224" width="42" height="22" rx="6" fill="#111214" />
        <rect x="220" y="224" width="42" height="22" rx="6" fill="#111214" />
      </g>

      {/* hull */}
      <g stroke="#0e0f11" strokeWidth="2">
        <path d="M60 150 L90 132 L230 132 L260 150 L262 214 L48 214 Z" fill="url(#hull)" />
        <path d="M60 150 L90 132 L230 132 L260 150 L258 162 L62 162 Z" fill="url(#gloss)" stroke="none" />
        <rect x="118" y="168" width="84" height="30" rx="6" fill="#1b1d21" />
        <rect x="126" y="176" width="68" height="6" rx="3" fill="url(#red)" />
        <rect x="126" y="186" width="42" height="5" rx="2" fill="url(#red)" opacity="0.7" />
      </g>

      {/* 5 sensor mast */}
      <g filter={glow(5)}>
        <rect x="172" y="70" width="8" height="46" fill={fill(5, '#3d4147')} stroke="#0e0f11" strokeWidth="2" />
        <circle cx="176" cy="62" r="12" fill={fill(5, '#22262b')} stroke="#0e0f11" strokeWidth="2" />
        <circle cx="176" cy="62" r="5" fill={st(5) === 'out' ? '#2a2a2a' : '#ff5a3d'} />
      </g>

      {/* 0 turret */}
      <g filter={glow(0)}>
        <path d="M112 134 L124 100 L196 100 L208 134 Z" fill={fill(0, '#3b3f45')} stroke="#0e0f11" strokeWidth="2" />
        <path d="M124 100 L196 100 L200 110 L120 110 Z" fill="url(#gloss)" />
        <rect x="150" y="112" width="70" height="12" rx="4" fill={fill(0, '#25282d')} stroke="#0e0f11" strokeWidth="2" />
        <rect x="216" y="114" width="14" height="8" rx="2" fill={fill(0, '#16181b')} />
        <rect x="132" y="106" width="28" height="7" rx="2" fill="url(#red)" />
      </g>

      {/* 1 left rocket pod */}
      <g filter={glow(1)}>
        <rect x="44" y="108" width="52" height="40" rx="8" fill={fill(1, '#3b3f45')} stroke="#0e0f11" strokeWidth="2" />
        {[0, 1, 2].map((r) =>
          [0, 1].map((c) => <circle key={`${r}${c}`} cx={58 + c * 24} cy={118 + r * 11} r="4.5" fill={st(1) === 'out' ? '#222' : '#0d0e10'} stroke="#7a7f88" strokeWidth="1.5" />),
        )}
      </g>

      {/* 2 right missile rack */}
      <g filter={glow(2)}>
        <rect x="212" y="106" width="60" height="44" rx="8" fill={fill(2, '#3b3f45')} stroke="#0e0f11" strokeWidth="2" />
        {[0, 1, 2].map((r) => (
          <g key={r}>
            <rect x="218" y={112 + r * 12} width="46" height="7" rx="3.5" fill={st(2) === 'out' ? '#222' : '#15171a'} stroke="#7a7f88" strokeWidth="1.2" />
            <circle cx="262" cy={115.5 + r * 12} r="2.5" fill={st(2) === 'out' ? '#2a2a2a' : '#ff5a3d'} />
          </g>
        ))}
      </g>

      {/* 3 + 4 forward autocannon pods */}
      {[
        {i: 3, x: 74},
        {i: 4, x: 192},
      ].map(({i, x}) => (
        <g key={i} filter={glow(i)}>
          <rect x={x} y="180" width="54" height="30" rx="7" fill={fill(i, '#33373d')} stroke="#0e0f11" strokeWidth="2" />
          <rect x={x + 8} y="190" width="38" height="5" rx="2" fill={st(i) === 'out' ? '#222' : '#101214'} />
          <rect x={x + 8} y="198" width="38" height="5" rx="2" fill={st(i) === 'out' ? '#222' : '#101214'} />
          <rect x={x + 20} y="184" width="14" height="4" rx="2" fill="url(#red)" />
        </g>
      ))}

      {/* knocked-out marks: dark cracks and a few sparks, never fire */}
      {WARDEN_ANCHORS.map((a, i) =>
        st(i) === 'out' ? (
          <g key={i} opacity="0.9">
            <path d={`M${a.x - 10} ${a.y - 6} l6 5 l-4 6 l8 4`} stroke="#0a0a0a" strokeWidth="2" fill="none" />
            <circle cx={a.x + 8} cy={a.y - 8} r="1.6" fill="#ffd166" />
            <circle cx={a.x - 6} cy={a.y + 9} r="1.2" fill="#ffd166" />
          </g>
        ) : null,
      )}
    </svg>
  );
}
