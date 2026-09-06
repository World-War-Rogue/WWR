/**
 * Service Rank and the four packages, for one asset.
 *
 * The rules a player has to be able to see without being told them:
 *
 *   Every track is available from day one and none of them gate each other.
 *   A package can never outrank the asset it is bolted to.
 *   Service Rank is permanent. Only the fittings come off.
 *   System Integration comes from the LOWEST package, so 10/1/1/1 pays nothing.
 *
 * All four are drawn rather than written in a paragraph: the ceiling is shown
 * on the package row that has hit it, and the reset button says in its own
 * label that the rank is not included.
 *
 * No price is ever sent to the server. The target is sent and the cost is
 * recomputed there, so what is drawn here is a quote and not an authority - if
 * the two ever disagree the server wins and says so.
 */
import {useState} from 'react';

import {type Asset, ASSET_MAX_LEVEL, ATTRIBUTE_MAX, maxRankForSeason} from '../../shared/assets';
import {packageCost, rankCost} from '../../shared/economy';
import {
  type PackageKey,
  PACKAGE_ATTRIBUTE,
  PACKAGE_KEYS,
  PACKAGE_LABEL,
  assetPowerWith,
  attributesWith,
  packageCeiling,
  systemIntegration,
} from '../../shared/upgrades';
import {ApiError, type OwnedAsset, type Wallet, api} from '../net/api';

const SEASON = 1;

const ATTR_LABEL: Record<string, string> = {
  firepower: 'Firepower',
  armour: 'Armour',
  mobility: 'Mobility',
  range: 'Range',
  detection: 'Detection',
};

function Money({tokens, credits}: Wallet) {
  return (
    <span className="font-mono text-[11px]">
      <span className="text-emerald-300">{credits.toLocaleString()}</span>
      <span className="text-neutral-700"> cr</span>
      <span className="ml-2 text-amber-300">{tokens.toLocaleString()}</span>
      <span className="text-neutral-700"> tk</span>
    </span>
  );
}

/**
 * One buyable track.
 *
 * `ceiling` is what stops it, and saying WHY it stopped is the whole job of
 * this row - a disabled button with no reason is a bug as far as a player is
 * concerned, which is the same rule the squad chooser already follows.
 */
function Track({
  label,
  rank,
  ceiling,
  cost,
  affordable,
  reason,
  busy,
  onBuy,
  note,
}: {
  label: string;
  rank: number;
  ceiling: number;
  cost: number;
  affordable: boolean;
  reason: string | null;
  busy: boolean;
  onBuy: () => void;
  note?: string;
}) {
  return (
    <div className="flex items-center gap-3 border-t border-neutral-900 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-neutral-200">
          {label} <span className="font-mono text-neutral-500">{rank}</span>
          <span className="font-mono text-neutral-700"> / {ceiling}</span>
        </p>
        {note && <p className="text-[10px] text-neutral-600">{note}</p>}
        {reason && <p className="text-[10px] text-amber-500/80">{reason}</p>}
      </div>
      <button
        onClick={onBuy}
        disabled={busy || !!reason || !affordable}
        className="shrink-0 rounded border border-neutral-700 px-3 py-1.5 text-xs font-semibold text-neutral-200 transition hover:border-orange-500 hover:text-orange-200 disabled:border-neutral-900 disabled:text-neutral-700 disabled:hover:border-neutral-900"
      >
        {reason ? '—' : `+1 · ${cost.toLocaleString()}`}
      </button>
    </div>
  );
}

export default function AssetUpgrade({
  asset,
  held,
  wallet,
  onClose,
  onChanged,
}: {
  asset: Asset;
  held: OwnedAsset;
  wallet: Wallet;
  onClose: () => void;
  onChanged: (wallet: Wallet, held: OwnedAsset) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cap = Math.min(ASSET_MAX_LEVEL, maxRankForSeason(SEASON));
  const now = attributesWith(asset, held.level, held.packages);
  const power = assetPowerWith(asset, held.level, held.packages);
  const integration = systemIntegration(held.packages);

  async function run(fn: () => Promise<{wallet: Wallet; asset: Record<string, number | string>}>) {
    setBusy(true);
    setError(null);
    try {
      const result = await fn();
      const row = result.asset as unknown as {
        level: number;
        pkg_armament: number;
        pkg_protection: number;
        pkg_propulsion: number;
        pkg_electronics: number;
        pkg_credits: number;
      };
      onChanged(result.wallet, {
        assetId: held.assetId,
        level: row.level,
        packages: {
          armament: row.pkg_armament,
          protection: row.pkg_protection,
          propulsion: row.pkg_propulsion,
          electronics: row.pkg_electronics,
        },
        packageCredits: row.pkg_credits,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reach the server.');
    } finally {
      setBusy(false);
    }
  }

  const rankStep = rankCost(held.level, held.level + 1);
  const canAfford = (cost: number) => wallet.credits + wallet.tokens >= cost;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/75 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-lg border border-neutral-800 bg-neutral-950 p-4 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-neutral-100">{asset.name}</p>
            <p className="truncate font-mono text-[10px] text-neutral-600">
              {asset.code} · {asset.operator}
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 text-neutral-500 transition hover:text-neutral-200"
          >
            ✕
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between rounded border border-neutral-800 bg-neutral-900/50 px-3 py-2">
          <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-600">Wallet</span>
          <Money {...wallet} />
        </div>

        {/*
          What the money has actually bought. Attributes are drawn WITH the
          packages fitted rather than as the catalogue values, because an
          upgrade whose effect is invisible is an upgrade a player stops buying.
        */}
        <div className="mt-3 space-y-1">
          {(['firepower', 'armour', 'mobility', 'range', 'detection'] as const).map((key) => {
            const base = asset.attributes[key];
            const value = now[key];
            const gained = value - base;
            return (
              <div key={key} className="flex items-center gap-2">
                <span className="w-16 shrink-0 text-[10px] uppercase tracking-wider text-neutral-600">
                  {ATTR_LABEL[key]}
                </span>
                <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-neutral-900">
                  <span
                    className="block h-full rounded-full bg-neutral-500"
                    style={{width: `${Math.min(100, (base / ATTRIBUTE_MAX) * 100)}%`}}
                  />
                </span>
                <span className="w-16 shrink-0 text-right font-mono text-[10px] text-neutral-400">
                  {value.toFixed(1)}
                  {gained > 0.05 && (
                    <span className="text-emerald-500"> +{gained.toFixed(1)}</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>

        <p className="mt-2 text-right font-mono text-[11px] text-neutral-500">
          power <span className="text-neutral-200">{power.toLocaleString()}</span>
        </p>

        {error && (
          <p className="mt-3 rounded border border-red-900 bg-red-950/60 px-3 py-2 text-xs text-red-300">
            {error}
          </p>
        )}

        <Track
          label="Service Rank"
          rank={held.level}
          ceiling={cap}
          cost={rankStep}
          affordable={canAfford(rankStep)}
          reason={
            held.level >= cap
              ? `Season ${SEASON} caps this at ${cap}`
              : !canAfford(rankStep)
                ? 'Not enough to cover that'
                : null
          }
          note="Permanent, and the ceiling every package is measured against"
          busy={busy}
          onBuy={() => void run(() => api.rankUp(held.assetId, held.level + 1))}
        />

        {PACKAGE_KEYS.map((key: PackageKey) => {
          const rank = held.packages[key];
          const ceiling = packageCeiling(held.level);
          const cost = packageCost(rank, rank + 1);
          return (
            // The key goes on a wrapper, not on Track. Without @types/react,
            // JSX does not special-case `key` on a custom component and
            // type-checks it as a prop it does not have - the same reason the
            // deployed-squad rows on the map are wrapped.
            <div key={key}>
            <Track
              label={PACKAGE_LABEL[key]}
              rank={rank}
              ceiling={ceiling}
              cost={cost}
              affordable={canAfford(cost)}
              reason={
                rank >= ceiling
                  ? `Raise Service Rank past ${held.level} first`
                  : !canAfford(cost)
                    ? 'Not enough to cover that'
                    : null
              }
              note={ATTR_LABEL[PACKAGE_ATTRIBUTE[key]]}
              busy={busy}
              onBuy={() => void run(() => api.fitPackage(held.assetId, key, rank + 1))}
            />
            </div>
          );
        })}

        <div className="mt-3 flex items-center justify-between rounded border border-neutral-800 bg-neutral-900/40 px-3 py-2">
          <div className="min-w-0">
            <p className="text-xs text-neutral-300">System Integration</p>
            <p className="text-[10px] text-neutral-600">
              From your lowest package. Everything up, or nothing.
            </p>
          </div>
          <span className="shrink-0 font-mono text-xs text-neutral-300">
            {integration > 0 ? `+${integration.toFixed(1)} all` : '—'}
          </span>
        </div>

        <button
          onClick={() => void run(() => api.resetPackages(held.assetId))}
          disabled={busy || held.packageCredits === 0}
          className="mt-3 w-full rounded border border-neutral-800 px-3 py-2 text-xs text-neutral-400 transition hover:border-red-800 hover:text-red-300 disabled:border-neutral-900 disabled:text-neutral-700 disabled:hover:border-neutral-900"
        >
          Strip packages · refunds {held.packageCredits.toLocaleString()} cr
          <span className="block text-[10px] text-neutral-700">
            Service Rank is not refunded, and Tokens are not refunded
          </span>
        </button>
      </div>
    </div>
  );
}
