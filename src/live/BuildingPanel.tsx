/**
 * A levelled building's header: its level, what the next level gives, the
 * Start button, and the timer when one is running.
 *
 * Sits at the top of the Command Center sheet and of each asset building's
 * screen. The server owns every number here - the panel only recomputes the
 * price for display from the same shared table the server charges from, so
 * the two can never disagree by more than a deploy.
 */
import {useEffect, useState} from 'react';
import {type BaseJobView, type Wallet, api, ApiError} from '../net/api';
import {type MessageKey, t} from '../i18n';
import {
  type BuildingLevels,
  type LevelledBuilding,
  BUILDING_STEP,
  CATEGORY_OF_HUB,
  buildingBlock,
  buildingBoost,
  buildingCapForSeason,
  buildingStep,
} from '../../shared/buildings';
import {CATEGORY_LABEL} from '../../shared/assets';
import {formatClock} from '../../shared/gametime';

function remaining(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

export default function BuildingPanel({
  building,
  levels,
  job,
  season,
  wallet,
  onChanged,
}: {
  building: LevelledBuilding;
  levels: BuildingLevels;
  job: BaseJobView | null;
  season: number;
  wallet: Wallet | null;
  /** New levels/job/wallet after a start, or after a timer runs out. */
  onChanged: (next: {levels: BuildingLevels; job: BaseJobView | null; wallet?: Wallet}) => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tick while a job runs; when it lands, ask the server to fold it in.
  const running = job && job.completesAt > now ? job : null;
  useEffect(() => {
    if (!job) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [job]);
  useEffect(() => {
    if (!job || job.completesAt > now) return;
    let live = true;
    api
      .baseLevels()
      .then((b) => live && onChanged({levels: b.levels, job: b.job}))
      .catch(() => undefined);
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.id, job && job.completesAt <= now]);

  const level = levels[building];
  const next = level + 1;
  const cap = buildingCapForSeason(season);
  const step = buildingStep(building, next);
  const blocked = buildingBlock(building, levels, season);
  const mine = running && running.building === building ? running : null;
  const otherRunning = running && running.building !== building;
  const category = CATEGORY_OF_HUB[building];
  const pct = Math.round((BUILDING_STEP - 1) * 100);
  const total = Math.round((buildingBoost(level) - 1) * 1000) / 10;
  const canPay = wallet ? wallet.tokens + wallet.credits >= step.cost : false;

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await api.startLevel(building);
      onChanged({levels: r.levels, job: r.job, wallet: r.wallet});
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reach the server.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded border border-neutral-800 bg-neutral-900/40 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-neutral-100">
          {t(`building.${building}` as MessageKey)}
          <span className="ml-2 text-[10px] font-normal uppercase tracking-[0.2em] text-neutral-500">
            {category ? 'Category Systems Upgrade' : 'Base Level'}
          </span>
        </h3>
        <span className="font-mono text-xs text-neutral-300">
          Lv <span className="text-orange-300">{level}</span>
          <span className="text-neutral-600"> / {cap}</span>
        </span>
      </div>

      <p className="mt-1 text-[11px] leading-relaxed text-neutral-400">
        {category
          ? `All ${CATEGORY_LABEL[category]} assets: +${pct}% Firepower, Armour, Mobility, Range and Detection per level.`
          : 'The ceiling for everything. No building, Service Rank or package can stand above this level.'}
        {category && total > 0 && (
          <span className="text-neutral-500"> Now +{total}%.</span>
        )}
      </p>

      {mine ? (
        <div className="mt-2 flex items-center justify-between rounded border border-orange-900/60 bg-orange-950/20 px-2 py-1.5 text-[11px]">
          <span className="text-orange-200">Building level {mine.toLevel}</span>
          <span className="font-mono text-neutral-300">
            Completes {formatClock(mine.completesAt)} RST ·{' '}
            <span className="text-orange-300">{remaining(mine.completesAt - now)}</span> remaining
          </span>
        </div>
      ) : level >= cap ? (
        <p className="mt-2 text-[11px] text-neutral-500">Season {season} cap reached.</p>
      ) : (
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[11px] text-neutral-400">
            Level {next}:{' '}
            <span className="font-mono text-neutral-200">{step.cost.toLocaleString()}</span>
            <span className="text-neutral-600"> Credits or Tokens · </span>
            <span className="font-mono text-neutral-200">{remaining(step.ms)}</span>
          </span>
          <button
            onClick={() => void start()}
            disabled={busy || !!blocked || !!otherRunning || !canPay}
            title={blocked ?? (otherRunning ? 'One upgrade at a time.' : undefined)}
            className="shrink-0 rounded border border-orange-600 bg-orange-950/40 px-3 py-1 text-xs font-semibold text-orange-200 transition hover:bg-orange-900/40 disabled:cursor-not-allowed disabled:border-neutral-800 disabled:bg-transparent disabled:text-neutral-600"
          >
            Start Level {next}
          </button>
        </div>
      )}
      {!mine && (blocked || otherRunning) && level < cap && (
        <p className="mt-1 text-[11px] text-neutral-500">
          {blocked ?? 'The engineers are busy. One upgrade at a time.'}
        </p>
      )}
      {!mine && !blocked && !otherRunning && !canPay && wallet && level < cap && (
        <p className="mt-1 text-[11px] text-neutral-500">Not enough to cover that.</p>
      )}
      {error && <p className="mt-1 text-[11px] text-red-400">{error}</p>}
    </section>
  );
}
