/**
 * The asset catalogue, read-only.
 *
 * Squads and the draft come later; this is the list itself, so the numbers can
 * be looked at and argued with before anything is built on top of them. It is
 * also the screen a player will browse when deciding what to spend a draft on,
 * so it is worth it existing early and being wrong in public.
 *
 * Attributes are drawn as bars against the highest value in the catalogue, not
 * against each asset's own maximum. A bar that always fills to the end tells
 * you nothing; the point of the row is comparison.
 */
import {useMemo, useState} from 'react';
import AssetIcon from './AssetIcon';
import {
  ASSETS,
  ATTRIBUTE_MAX,
  type Asset,
  type AssetCategory,
  CATEGORY_LABEL,
  COUNTERS,
  ROLE_BLURB,
  ROLE_LABEL,
  pointBudget,
} from '../../shared/assets';

const CATEGORIES: AssetCategory[] = [
  'armour',
  'rotary',
  'fixed_wing',
  'artillery',
  'drone',
  'naval',
];

const ATTRS = [
  ['firepower', 'Firepower'],
  ['armour', 'Armour'],
  ['mobility', 'Mobility'],
  ['range', 'Range'],
  ['detection', 'Detection'],
] as const;

const ROLE_TINT: Record<string, string> = {
  breach: 'border-red-800 bg-red-950/50 text-red-300',
  screen: 'border-sky-800 bg-sky-950/50 text-sky-300',
  strike: 'border-orange-800 bg-orange-950/50 text-orange-300',
  overwatch: 'border-amber-800 bg-amber-950/50 text-amber-300',
  recon: 'border-emerald-800 bg-emerald-950/50 text-emerald-300',
  lift: 'border-neutral-700 bg-neutral-900 text-neutral-300',
};

function Bars({asset}: {asset: Asset}) {
  return (
    <div className="mt-2 space-y-1">
      {ATTRS.map(([key, label]) => {
        const value = asset.attributes[key];
        return (
          <div key={key} className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-[10px] uppercase tracking-wider text-neutral-600">
              {label}
            </span>
            <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-neutral-900">
              <span
                className="block h-full rounded-full bg-neutral-500"
                style={{width: `${(value / ATTRIBUTE_MAX) * 100}%`}}
              />
            </span>
            <span className="w-5 shrink-0 text-right font-mono text-[10px] text-neutral-400">
              {value}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Card({asset}: {asset: Asset}) {
  const counters = COUNTERS[asset.category];
  return (
    <article
      className={`rounded border p-3 ${
        asset.draftable === false
          ? 'border-neutral-900 bg-neutral-950/60 opacity-70'
          : 'border-neutral-800 bg-neutral-950'
      }`}
    >
      <div className="flex items-start gap-2">
        <span className="mt-0.5 shrink-0">
          <AssetIcon asset={asset} size={34} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-neutral-100">{asset.name}</p>
          <p className="truncate font-mono text-[10px] text-neutral-600">
            {asset.code} · {asset.operator}
          </p>
        </div>
        <span
          className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
            ROLE_TINT[asset.role]
          }`}
          title={ROLE_BLURB[asset.role]}
        >
          {ROLE_LABEL[asset.role]}
        </span>
      </div>

      <p className="mt-1.5 text-[11px] leading-snug text-neutral-500">{asset.blurb}</p>

      <Bars asset={asset} />

      <div className="mt-2 flex items-center justify-between border-t border-neutral-900 pt-2 text-[10px]">
        <span className="text-neutral-500">
          Lift <span className="font-mono text-neutral-300">{asset.lift}</span>
          <span className="text-neutral-700"> · {pointBudget(asset.lift)} pts</span>
        </span>
        {asset.draftable === false ? (
          <span className="text-neutral-600">Coastal season</span>
        ) : (
          <span className="text-neutral-600">
            loses to {counters.losesTo.map((c) => CATEGORY_LABEL[c]).join(', ') || '—'}
          </span>
        )}
      </div>
    </article>
  );
}

export default function Assets({onClose}: {onClose: () => void}) {
  const [category, setCategory] = useState<AssetCategory | 'all'>('all');
  const [query, setQuery] = useState('');

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ASSETS.filter((a) => {
      if (category !== 'all' && a.category !== category) return false;
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        a.code.toLowerCase().includes(q) ||
        a.operator.toLowerCase().includes(q)
      );
    });
  }, [category, query]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-neutral-800 px-3 py-3">
        <button
          onClick={onClose}
          className="rounded border border-neutral-700 px-2 py-1 text-sm text-neutral-300 hover:border-orange-600"
        >
          ‹ Back
        </button>
        <h2 className="font-semibold text-neutral-100">Assets</h2>
        <span className="text-[11px] text-neutral-600">{shown.length} of {ASSETS.length}</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search"
          className="ml-auto w-32 rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-neutral-100 placeholder:text-neutral-600 focus:border-orange-600 focus:outline-none sm:w-48"
        />
      </div>

      <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-neutral-800 px-3 py-2">
        {(['all', ...CATEGORIES] as const).map((key) => (
          <button
            key={key}
            onClick={() => setCategory(key)}
            className={`shrink-0 rounded border px-2.5 py-1 text-xs ${
              category === key
                ? 'border-orange-600 bg-orange-950/40 text-orange-200'
                : 'border-neutral-800 text-neutral-400 hover:border-neutral-600'
            }`}
          >
            {key === 'all' ? 'All' : CATEGORY_LABEL[key]}
          </button>
        ))}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <p className="mb-3 text-[11px] leading-relaxed text-neutral-600">
          No asset is stronger than another. Bigger numbers cost more lift, and a squad has a
          lift budget — so the choice is what a squad is <em>for</em>, not which entries are best.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((asset) => (
            <div key={asset.id}>
              <Card asset={asset} />
            </div>
          ))}
        </div>
        {shown.length === 0 && (
          <p className="py-8 text-center text-sm text-neutral-600">Nothing matches that.</p>
        )}
      </div>
    </div>
  );
}
