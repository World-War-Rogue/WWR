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
import {assetArtUrl, assetStageArtUrl, nextVisualStage, visualStage} from '../../shared/assetVisuals';
import {DRONE_WORDING} from '../../shared/drones';

import {
  type Asset,
  ASSET_MAX_LEVEL,
  ATTRIBUTE_MAX,
  SEASON_GAIN,
  attributeAtLevel,
  maxRankForSeason,
} from '../../shared/assets';
import {packageCost, rankCost} from '../../shared/economy';
import {
  type PackageKey,
  INTEGRATION_MAX_POINTS,
  INTEGRATION_POINTS_PER_RANK,
  PACKAGE_ATTRIBUTE,
  PACKAGE_KEYS,
  PACKAGE_LABEL,
  PACKAGE_POINTS_PER_RANK,
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
 * `reason` is what stops it, and saying WHY it stopped is the whole job of this
 * row - a disabled button with no reason is a bug as far as a player is
 * concerned, which is the same rule the squad chooser follows.
 *
 * `explain` is the (i): what the track does and what this particular purchase
 * is worth, in the player's own numbers rather than in the abstract. Collapsed
 * by default, because five open explanations is a wall of text on a phone.
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
  explain,
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
  explain: {what: string; gain: string};
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-neutral-900 py-2">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-sm text-neutral-200">
            {label} <span className="font-mono text-neutral-500">{rank}</span>
            <span className="font-mono text-neutral-700">/ {ceiling}</span>
            <button
              onClick={() => setOpen((v) => !v)}
              aria-label={`What ${label} does`}
              aria-expanded={open}
              className={`ml-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold leading-none transition ${
                open
                  ? 'border-orange-600 bg-orange-950/50 text-orange-300'
                  : 'border-neutral-700 text-neutral-500 hover:border-orange-600 hover:text-orange-300'
              }`}
            >
              i
            </button>
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

      {open && (
        <div className="mt-1.5 rounded border border-neutral-800 bg-neutral-900/40 px-2.5 py-2">
          <p className="text-[11px] leading-snug text-neutral-400">{explain.what}</p>
          <p className="mt-1 text-[11px] font-semibold leading-snug text-emerald-400">
            {explain.gain}
          </p>
        </div>
      )}
    </div>
  );
}

const STAGE_LABEL: Record<number, number> = {1: 1, 10: 2, 20: 3, 30: 4, 40: 5, 50: 6};

export default function AssetUpgrade({
  asset,
  held,
  wallet,
  onClose,
  onChanged,
  boost = 1,
  rankCeiling,
}: {
  asset: Asset;
  held: OwnedAsset;
  wallet: Wallet;
  onClose: () => void;
  onChanged: (wallet: Wallet, held: OwnedAsset) => void;
  /** The category building's boost, so the numbers here match the fight. */
  boost?: number;
  /** The Command Center's ceiling on rank. Absent means only the season caps. */
  rankCeiling?: number;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const seasonCap = Math.min(ASSET_MAX_LEVEL, maxRankForSeason(SEASON));
  const cap = Math.min(seasonCap, rankCeiling ?? seasonCap);
  const ccBlocked = held.level >= cap && cap < seasonCap;
  const now = attributesWith(asset, held.level, held.packages, boost);
  const power = assetPowerWith(asset, held.level, held.packages, boost);
  const integration = systemIntegration(held.packages);

  /**
   * The most any attribute can reach this season: the catalogue maximum taken
   * to the season rank cap, plus a maxed package, plus full integration. The
   * bars are drawn against this so they have somewhere to grow.
   */
  const ceiling =
    attributeAtLevel(ATTRIBUTE_MAX, cap) +
    (cap - 1) * PACKAGE_POINTS_PER_RANK +
    INTEGRATION_MAX_POINTS;

  /** The lowest fitted package. System Integration is measured off this one. */
  const lowestPackage = Math.min(...PACKAGE_KEYS.map((k) => held.packages[k]));

  /** What one more rank is worth on this asset, in points across all five. */
  const rankGain =
    held.level >= cap
      ? 0
      : (['firepower', 'armour', 'mobility', 'range', 'detection'] as const).reduce(
          (sum, k) =>
            sum +
            (attributeAtLevel(asset.attributes[k], held.level + 1) -
              attributeAtLevel(asset.attributes[k], held.level)),
          0,
        );

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

        {/*
          The asset as it looks at this rank, and when it next changes. The
          picture is the reason to rank up that no number on this sheet gives:
          at 10, 20, 30, 40 and 50 the machine visibly becomes more.
        */}
        {assetArtUrl(asset.id, held.level) && (() => {
          const now = visualStage(held.level);
          const next = nextVisualStage(held.level);
          return (
            <div className="mt-3 rounded border border-neutral-800 bg-neutral-900/40 p-2">
              <div className="flex items-center justify-around gap-2">
                <div className="flex flex-col items-center">
                  <img
                    src={assetArtUrl(asset.id, now)!}
                    alt=""
                    decoding="async"
                    className="h-28 w-28 object-contain"
                  />
                  <p className="mt-1 text-xs text-neutral-200">
                    Stage {STAGE_LABEL[now]} of 6
                  </p>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">Now</p>
                </div>
                {next ? (
                  <>
                    <span className="text-2xl text-neutral-600" aria-hidden>
                      &rarr;
                    </span>
                    <div className="flex flex-col items-center">
                      {assetStageArtUrl(asset.id, next) ? (
                        <img
                          src={assetStageArtUrl(asset.id, next)!}
                          alt=""
                          decoding="async"
                          className="h-28 w-28 object-contain"
                        />
                      ) : (
                        <div className="flex h-28 w-28 items-center justify-center rounded border border-dashed border-neutral-700 text-[10px] uppercase tracking-[0.2em] text-neutral-600">
                          Classified
                        </div>
                      )}
                      <p className="mt-1 text-xs text-neutral-200">
                        Stage {STAGE_LABEL[next]} of 6
                      </p>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-orange-400">
                        At Service Rank {next}
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-neutral-400">Final form.</p>
                )}
              </div>
              <div className="mt-2 flex justify-center gap-1">
                {([1, 10, 20, 30, 40, 50] as const).map((r) => (
                  <span
                    key={r}
                    className={`h-1.5 w-5 rounded ${
                      held.level >= r ? 'bg-orange-500' : 'bg-neutral-800'
                    }`}
                  />
                ))}
              </div>
            </div>
          );
        })()}

        <div className="mt-3 flex items-center justify-between rounded border border-neutral-800 bg-neutral-900/50 px-3 py-2">
          <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-600">Wallet</span>
          <Money {...wallet} />
        </div>

        {/*
          What the money has actually bought. Attributes are drawn WITH the
          packages fitted rather than as the catalogue values, because an
          upgrade whose effect is invisible is an upgrade a player stops buying.
        */}
        {/*
          Two segments: what the asset came with, and what has been bought on
          top. The bar used to be drawn from the CATALOGUE value, so buying an
          upgrade moved the number on the right and left the bar exactly where
          it was - which reads as the purchase not working.

          Scaled against the most any attribute can reach this season rather
          than against ATTRIBUTE_MAX, because a ranked asset passes 10 and a bar
          that pinned at full would go back to telling you nothing. It starts
          around a third full and fills as you buy, which is the point.
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
                <span className="flex h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-neutral-900">
                  <span
                    className="block h-full bg-neutral-500"
                    style={{width: `${Math.min(100, (base / ceiling) * 100)}%`}}
                  />
                  <span
                    className="block h-full bg-emerald-500"
                    style={{width: `${Math.min(100, (Math.max(0, gained) / ceiling) * 100)}%`}}
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
            ccBlocked
              ? `Command Center must reach level ${held.level + 1} first`
              : held.level >= cap
              ? `Season ${SEASON} caps this at ${cap}`
              : !canAfford(rankStep)
                ? 'Not enough to cover that'
                : null
          }
          note="Permanent, and the ceiling every package is measured against"
          explain={{
            what:
              `Raises all five attributes at once, by the same proportion — a ranked ` +
              `${asset.name} is a better ${asset.name}, never a different one. It is also ` +
              `the ceiling: no package can be fitted above the Service Rank, so this is ` +
              `what unlocks the four below. Permanent, and the one thing a strip cannot ` +
              `undo. A full season of ranks is worth ${SEASON_GAIN}x.`,
            gain:
              ccBlocked
                ? `Held at the Command Center's level.`
                : held.level >= cap
                ? `At the Season ${SEASON} cap.`
                : `+${rankGain.toFixed(1)} points across all five, and raises every package ` +
                  `ceiling to ${held.level + 1}.`,
          }}
          busy={busy}
          onBuy={() => void run(() => api.rankUp(held.assetId, held.level + 1))}
        />

        {PACKAGE_KEYS.map((key: PackageKey) => {
          const rank = held.packages[key];
          // Not `ceiling` - that name is taken by the attribute scale above, and
          // the shadowing would compile into the wrong number in the bar.
          const ceilingFor = packageCeiling(held.level);
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
              ceiling={ceilingFor}
              cost={cost}
              affordable={canAfford(cost)}
              reason={
                rank >= ceilingFor
                  ? `Raise Service Rank past ${held.level} first`
                  : !canAfford(cost)
                    ? 'Not enough to cover that'
                    : null
              }
              note={
                key === 'propulsion' && asset.category === 'drone'
                  ? `${ATTR_LABEL[PACKAGE_ATTRIBUTE[key]]} · ${DRONE_WORDING.propulsion}`
                  : ATTR_LABEL[PACKAGE_ATTRIBUTE[key]]
              }
              explain={{
                what:
                  `Specialises this asset: ${PACKAGE_LABEL[key]} adds to ` +
                  `${ATTR_LABEL[PACKAGE_ATTRIBUTE[key]]} and nothing else. Added on top of ` +
                  `the Service Rank rather than multiplied by it, so a point here is worth ` +
                  `the same on a rank 1 asset as on a rank 10 one. Can be stripped later ` +
                  `for a full refund in Command Credits.`,
                gain:
                  rank >= ceilingFor
                    ? `Blocked at Service Rank ${held.level}.`
                    : `+${PACKAGE_POINTS_PER_RANK.toFixed(1)} ` +
                      `${ATTR_LABEL[PACKAGE_ATTRIBUTE[key]].toLowerCase()}` +
                      (rank + 1 > lowestPackage
                        ? '.'
                        : `, and +${INTEGRATION_POINTS_PER_RANK.toFixed(1)} to all five ` +
                          `from System Integration.`),
              }}
              busy={busy}
              onBuy={() => void run(() => api.fitPackage(held.assetId, key, rank + 1))}
            />
            </div>
          );
        })}

        <div className="mt-3 rounded border border-neutral-800 bg-neutral-900/40 px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-neutral-300">System Integration</p>
            <span className="shrink-0 font-mono text-xs text-neutral-300">
              {integration > 0 ? `+${integration.toFixed(1)} all` : '—'}
            </span>
          </div>
          <p className="mt-0.5 text-[10px] leading-snug text-neutral-600">
            Free, and not bought. Measured off your <em>lowest</em> package, currently{' '}
            {lowestPackage} — so raising your best one pays nothing here and raising your
            worst one pays on all five attributes at once. Caps at{' '}
            +{INTEGRATION_MAX_POINTS.toFixed(1)}.
          </p>
        </div>

        <button
          onClick={() => void run(() => api.resetPackages(held.assetId))}
          disabled={busy || held.packageCredits === 0}
          className="mt-3 w-full rounded border border-neutral-800 px-3 py-2 text-xs text-neutral-400 transition hover:border-red-800 hover:text-red-300 disabled:border-neutral-900 disabled:text-neutral-700 disabled:hover:border-neutral-900"
        >
          {held.packageCredits === 0
            ? 'Strip packages · nothing fitted yet'
            : `Strip packages · refunds ${held.packageCredits.toLocaleString()} cr`}
          <span className="block text-[10px] text-neutral-700">
            Takes all four back to 1 and refunds the whole cost in Command Credits, whatever
            you paid in. Service Rank is untouched.
          </span>
        </button>
      </div>
    </div>
  );
}
