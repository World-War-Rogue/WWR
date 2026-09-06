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
import {useEffect, useMemo, useState} from 'react';
import AssetIcon from './AssetIcon';
import AssetUpgrade from './AssetUpgrade';
import ForcesTabs from './ForcesTabs';
import {type OwnedAsset, type Wallet, api} from '../net/api';
import {t} from '../i18n';
import {taskForceName} from './taskForce';
import {
  ASSETS,
  ASSET_BY_ID,
  ATTRIBUTE_MAX,
  type Asset,
  type AssetCategory,
  CATEGORY_LABEL,
  ROLE_BLURB,
  ROLE_LABEL,
  SQUAD_NAMES,
  pointsSpent,
} from '../../shared/assets';
import {counterWeb} from '../../shared/combat';
import {PACKAGE_KEYS} from '../../shared/upgrades';
import {assetArtUrl} from '../../shared/assetVisuals';

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

function Card({
  asset,
  squad,
  held,
  onUpgrade,
}: {
  asset: Asset;
  squad: string | null;
  held: OwnedAsset | null;
  onUpgrade: (() => void) | null;
}) {
  const counters = counterWeb(asset.category);
  const fitted = held
    ? PACKAGE_KEYS.reduce((n, k) => n + (held.packages[k] > 1 ? 1 : 0), 0)
    : 0;
  return (
    <article
      className={`rounded border p-3 ${
        asset.draftable === false
          ? 'border-neutral-900 bg-neutral-950/60 opacity-70'
          : 'border-neutral-800 bg-neutral-950'
      }`}
    >
      <div className="flex items-start gap-2">
        {/*
          The asset at its current stage, when it has art; the silhouette
          icon until then. Sized so the card stays a card - the upgrade sheet
          is where the picture gets room.
        */}
        <span className="mt-0.5 shrink-0">
          {assetArtUrl(asset.id, held?.level ?? 1) ? (
            <img
              src={assetArtUrl(asset.id, held?.level ?? 1)!}
              alt=""
              width={56}
              height={56}
              decoding="async"
              loading="lazy"
              className="h-14 w-14 object-contain"
            />
          ) : (
            <AssetIcon asset={asset} size={34} />
          )}
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

      {/*
        Where it is right now. The catalogue is browsed to decide what to put
        in a squad, so the first thing worth knowing about a row is whether it
        is already in one - without it a player has to hold four squads in
        their head while reading sixty cards.
      */}
      <p className="mt-1.5 text-[11px] font-semibold text-orange-400/90">
        {squad ? t('assets.inSquad', {squad: taskForceName(squad)}) : <span className="text-neutral-700">{t('assets.unassigned')}</span>}
      </p>

      <p className="mt-1 text-[11px] leading-snug text-neutral-500">{asset.blurb}</p>

      <Bars asset={asset} />

      {/*
        Rank and fittings, and the way in to change them.
        
        On the card rather than behind a tap, because "what have I already put
        into this one" is the question a player is answering while browsing
        sixty of them, and a number they have to open a panel to see is a number
        they stop checking.
      */}
      {held && onUpgrade && (
        <button
          onClick={onUpgrade}
          className="mt-2 flex w-full items-center gap-2 rounded border border-neutral-800 bg-neutral-900/50 px-2 py-1.5 text-left transition hover:border-orange-600"
        >
          <span className="text-[10px] uppercase tracking-wider text-neutral-600">Rank</span>
          <span className="font-mono text-xs text-neutral-200">{held.level}</span>
          <span className="text-[10px] text-neutral-600">
            {fitted === 0 ? 'no packages' : `${fitted}/4 fitted`}
          </span>
          <span className="ml-auto text-[10px] font-semibold text-orange-400">Upgrade ›</span>
        </button>
      )}

      <div className="mt-2 flex items-center justify-between border-t border-neutral-900 pt-2 text-[10px]">
        <span className="text-neutral-500">
          Lift <span className="font-mono text-neutral-300">{asset.lift}</span>
          <span className="text-neutral-700"> · {pointsSpent(asset.attributes)} pts</span>
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

export default function Assets({
  onClose,
  onShowSquads,
  only = null,
}: {
  onClose: () => void;
  onShowSquads: () => void;
  /**
   * Opened from a category building on the base board: one category, and the
   * category bar is hidden, because the building IS the category. The player
   * came in through the tank; showing them helicopters would undo that.
   */
  only?: AssetCategory | null;
}) {
  const [category, setCategory] = useState<AssetCategory | 'all'>(only ?? 'all');
  useEffect(() => {
    if (only) setCategory(only);
  }, [only]);
  const [query, setQuery] = useState('');
  const [placed, setPlaced] = useState<Map<string, string>>(new Map());
  const [roster, setRoster] = useState<Map<string, OwnedAsset>>(new Map());
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  // Squad placement, so each card can say where it is. Read once when the
  // screen opens: nothing here changes while it is on screen, and the squad
  // screen is one tap away for anybody who wants to change it.
  useEffect(() => {
    let live = true;
    api
      .squads()
      .then((view) => {
        if (!live) return;
        const map = new Map<string, string>();
        for (const squad of SQUAD_NAMES) {
          for (const id of view.squads[squad] ?? []) {
            if (id) map.set(id, squad);
          }
        }
        setPlaced(map);
        setRoster(new Map(view.owned.map((o) => [o.assetId, o])));
        setWallet(view.wallet);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

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
        <ForcesTabs active="assets" onChange={(tab) => tab === 'squads' && onShowSquads()} />
        <span className="text-[11px] text-neutral-600">{shown.length} of {ASSETS.length}</span>
        {wallet && (
          <span className="font-mono text-[11px]">
            <span className="text-emerald-300">{wallet.credits.toLocaleString()}</span>
            <span className="text-neutral-700"> cr</span>
            <span className="ml-2 text-amber-300">{wallet.tokens.toLocaleString()}</span>
            <span className="text-neutral-700"> tk</span>
          </span>
        )}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search"
          className="ml-auto w-32 rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-neutral-100 placeholder:text-neutral-600 focus:border-orange-600 focus:outline-none sm:w-48"
        />
      </div>

      {only ? (
        <div className="shrink-0 border-b border-neutral-800 px-3 py-2 text-xs uppercase tracking-widest text-orange-300">
          {CATEGORY_LABEL[only]}
        </div>
      ) : (
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
      )}

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <p className="mb-3 text-[11px] leading-relaxed text-neutral-600">
          No asset is stronger than another. Bigger numbers cost more lift, and a squad has a
          lift budget — so the choice is what a squad is <em>for</em>, not which entries are best.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((asset) => (
            <div key={asset.id}>
              <Card
                asset={asset}
                squad={placed.get(asset.id) ?? null}
                held={roster.get(asset.id) ?? null}
                onUpgrade={wallet ? () => setUpgrading(asset.id) : null}
              />
            </div>
          ))}
        </div>
        {shown.length === 0 && (
          <p className="py-8 text-center text-sm text-neutral-600">Nothing matches that.</p>
        )}
      </div>

      {upgrading && wallet && roster.get(upgrading) && ASSET_BY_ID[upgrading] && (
        <AssetUpgrade
          asset={ASSET_BY_ID[upgrading]}
          held={roster.get(upgrading)!}
          wallet={wallet}
          onClose={() => setUpgrading(null)}
          onChanged={(nextWallet, nextHeld) => {
            setWallet(nextWallet);
            setRoster((current) => new Map(current).set(nextHeld.assetId, nextHeld));
          }}
        />
      )}
    </div>
  );
}
