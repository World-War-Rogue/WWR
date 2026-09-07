/**
 * The stock, the Depot's resource counter, and the Second Engineer Team.
 *
 * Stock is shown in the Quartermaster Warehouse (the owner's ruling: it lives
 * in a building, not a bar) and as have/need on every cost line.
 */
import {useState} from 'react';
import {type BaseLevelsView, api, ApiError} from '../net/api';
import {
  type ResourceKind,
  DAILY_RESOURCE_CAP,
  capFor,
  depotCapMultiplier,
  RESOURCE_KINDS,
  RESOURCE_LABEL,
  RESOURCE_PER_UNIT,
  SECOND_TEAM,
  PRODUCER_OF,
  protectedShare,
  shortfall,
} from '../../shared/buildings';
import {formatClock} from '../../shared/gametime';
import {buildingLabel, remaining} from './BuildingPanel';
import WalletLine from './WalletLine';

export function StockPanel({base, only}: {base: BaseLevelsView; only?: ResourceKind}) {
  const safe = protectedShare(base.levels);
  const kinds = only ? [only] : RESOURCE_KINDS;
  return (
    <section className="rounded border border-neutral-800 bg-neutral-900/40 p-3">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-neutral-100">{only ? `${RESOURCE_LABEL[only]} stock` : 'Stock'}</h3>
        <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">
          {Math.round(safe * 100)}% raid-protected
        </span>
      </div>
      <div className="mt-2 space-y-1.5">
        {kinds.map((k) => {
          const have = base.resources[k];
          const cap = capFor(k, base.levels);
          const uncapped = !Number.isFinite(cap);
          const full = !uncapped && have >= cap;
          const hoursToFull = full || uncapped ? 0 : (cap - have) / Math.max(1, base.productionPerHour[k]);
          return (
            <div key={k} className="text-[11px]">
              <div className="flex items-baseline justify-between">
                <span className="text-neutral-300">{RESOURCE_LABEL[k]}</span>
                <span className="font-mono text-neutral-200">
                  {Math.floor(have).toLocaleString()}
                  <span className="text-neutral-600">{uncapped ? ' · no cap' : ` / ${cap.toLocaleString()}`}</span>
                  <span className="ml-2 text-neutral-500">
                    +{base.productionPerHour[k].toLocaleString()}/h
                    {!full && !uncapped && ` · full in ${hoursToFull >= 1 ? `${Math.ceil(hoursToFull)}h` : `${Math.ceil(hoursToFull * 60)}m`}`}
                  </span>
                </span>
              </div>
              <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-neutral-900">
                <div
                  className={`h-full rounded-full ${full ? 'bg-red-500' : 'bg-orange-500'}`}
                  style={{width: `${uncapped ? 100 : Math.min(100, (have / cap) * 100)}%`}}
                />
              </div>
              {k === 'fuel' && (
                <p className="mt-0.5 text-[10px] text-neutral-600">
                  Fuel sends attacks: every attack from the map burns some. Stored without limit; won in raids and daily tasks.
                </p>
              )}
              {full && (
                <p className="mt-0.5 text-[10px] text-red-400">
                  {RESOURCE_LABEL[k]} storage is full. Upgrade the Quartermaster Warehouse or spend
                  resources to resume production.
                </p>
              )}
            </div>
          );
        })}
      </div>
      {!only && (
        <p className="mt-2 text-[10px] text-neutral-600">
          Produced at{' '}
          {RESOURCE_KINDS.map((k) => `${buildingLabel(PRODUCER_OF[k])} (${RESOURCE_LABEL[k]})`).join(', ')}.
        </p>
      )}
    </section>
  );
}

/** The Depot counter: buy resources for Tokens or Credits at the fixed rate. */
export function ResourceShop({
  base,
  onChanged,
}: {
  base: BaseLevelsView;
  onChanged: (next: BaseLevelsView) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [units, setUnits] = useState<Record<string, number>>({});

  const buy = async (k: (typeof RESOURCE_KINDS)[number]) => {
    const n = Math.max(1, Math.floor(units[k] ?? 10));
    setBusy(k);
    setError(null);
    try {
      onChanged(await api.buyResource(k, n * RESOURCE_PER_UNIT[k]));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reach the server.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="rounded border border-neutral-800 bg-neutral-900/40 p-3">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-neutral-100">Supplies</h3>
        <WalletLine credits={base.wallet.credits} tokens={base.wallet.tokens} />
      </div>
      <p className="mt-1 text-[11px] text-neutral-500">
        One Credit or Token buys a fixed amount. Credits are spent first. Daily limits reset at
        00:00 RST. Storage is unlimited.
      </p>
      <div className="mt-2 space-y-2">
        {RESOURCE_KINDS.map((k) => {
          const n = Math.max(1, Math.floor(units[k] ?? 10));
          const room = capFor(k, base.levels) - base.resources[k];
          return (
            <div key={k} className="flex items-center gap-2 text-[11px]">
              <span className="w-20 text-neutral-300">{RESOURCE_LABEL[k]}</span>
              <span className="text-neutral-500">
                {RESOURCE_PER_UNIT[k]} each · cap{' '}
                {Math.floor(DAILY_RESOURCE_CAP[k] * depotCapMultiplier(base.levels.depot)).toLocaleString()}/day
              </span>
              <input
                type="number"
                min={1}
                value={n}
                onChange={(e) => setUnits((u) => ({...u, [k]: Number(e.target.value)}))}
                className="ml-auto w-16 rounded border border-neutral-700 bg-neutral-900 px-1.5 py-0.5 text-right font-mono text-neutral-100 focus:border-orange-600 focus:outline-none"
              />
              <button
                onClick={() => void buy(k)}
                disabled={busy !== null || room < RESOURCE_PER_UNIT[k]}
                className="shrink-0 rounded border border-orange-600 bg-orange-950/40 px-2 py-0.5 font-semibold text-orange-200 transition hover:bg-orange-900/40 disabled:cursor-not-allowed disabled:border-neutral-800 disabled:bg-transparent disabled:text-neutral-600"
              >
                Buy {(n * RESOURCE_PER_UNIT[k]).toLocaleString()} for {n}
              </button>
            </div>
          );
        })}
      </div>
      {error && <p className="mt-2 text-[11px] text-red-400">{error}</p>}
    </section>
  );
}

/** Engineer Support Yard: the permanent second build queue. */
export function SecondTeamPanel({
  base,
  onChanged,
}: {
  base: BaseLevelsView;
  onChanged: (next: BaseLevelsView) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const now = Date.now();
  const gate = base.levels.engineer_support_yard < SECOND_TEAM.requiresEngineerYard;
  const short = shortfall(base.resources, SECOND_TEAM.cost);
  const money = base.wallet.tokens + base.wallet.credits >= SECOND_TEAM.currency;

  const buy = async () => {
    setBusy(true);
    setError(null);
    try {
      onChanged(await api.buySecondTeam());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reach the server.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded border border-neutral-800 bg-neutral-900/40 p-3">
      <h3 className="text-sm font-semibold text-neutral-100">Second Engineer Team</h3>
      <p className="mt-1 text-[11px] text-neutral-400">
        A permanent second build queue: two upgrades at once, for good.
      </p>
      {base.secondTeamAt !== null ? (
        <p className="mt-2 text-[11px] text-orange-200">
          {base.secondTeamAt <= now
            ? 'Hired. Two upgrades can run at once.'
            : `Arriving ${formatClock(base.secondTeamAt)} RST · ${remaining(base.secondTeamAt - now)} remaining`}
        </p>
      ) : (
        <>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
            <span className={short.steel ? 'text-red-400' : 'text-neutral-300'}>
              Steel <span className="font-mono">{SECOND_TEAM.cost.steel.toLocaleString()}</span>
            </span>
            <span className={short.alloy ? 'text-red-400' : 'text-neutral-300'}>
              Alloy <span className="font-mono">{SECOND_TEAM.cost.alloy.toLocaleString()}</span>
            </span>
            <span className={money ? 'text-neutral-300' : 'text-red-400'}>
              <span className="font-mono">{SECOND_TEAM.currency.toLocaleString()}</span> Credits or Tokens
            </span>
            <span className="font-mono text-neutral-300">{remaining(SECOND_TEAM.ms)}</span>
            <button
              onClick={() => void buy()}
              disabled={busy || gate || !money || Object.keys(short).length > 0}
              className="ml-auto shrink-0 rounded border border-orange-600 bg-orange-950/40 px-3 py-1 text-xs font-semibold text-orange-200 transition hover:bg-orange-900/40 disabled:cursor-not-allowed disabled:border-neutral-800 disabled:bg-transparent disabled:text-neutral-600"
            >
              Hire
            </button>
          </div>
          {gate && (
            <p className="mt-1 text-[11px] text-neutral-500">
              {buildingLabel('engineer_support_yard')} must reach level {SECOND_TEAM.requiresEngineerYard} first.
            </p>
          )}
        </>
      )}
      {error && <p className="mt-1 text-[11px] text-red-400">{error}</p>}
    </section>
  );
}

/** Engineer Support Yard: what is building, and its fixed completion. */
export function QueuePanel({base}: {base: BaseLevelsView}) {
  const now = Date.now();
  return (
    <section className="rounded border border-neutral-800 bg-neutral-900/40 p-3">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-neutral-100">Build queue</h3>
        <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">
          {base.jobs.length} / {base.queues} in use
        </span>
      </div>
      {base.jobs.length === 0 ? (
        <p className="mt-1 text-[11px] text-neutral-500">Nothing is building.</p>
      ) : (
        <ul className="mt-2 space-y-1 text-[11px]">
          {base.jobs.map((j) => (
            <li key={j.id} className="flex items-center justify-between">
              <span className="text-neutral-200">
                {buildingLabel(j.building as never)} → {j.toLevel}
              </span>
              <span className="font-mono text-neutral-400">
                {formatClock(j.completesAt)} RST · {remaining(j.completesAt - now)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
