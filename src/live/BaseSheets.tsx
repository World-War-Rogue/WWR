/**
 * What opens when a building on the board is entered.
 *
 * Sheets, not screens: they rise from above the chat bar and leave the board
 * visible behind them, so a player who opened the Command Center to check a
 * timer is still standing in their base. The chat bar stays under every sheet,
 * as decided - z-30 here, the bar is z-40.
 *
 * The Command Center's Departments tab is the old base menu, kept whole. The
 * six production buildings still exist in the database and still produce, and
 * until the redesign reset retires them this is where they are upgraded.
 */
import {type ReactNode, Suspense, lazy, useState} from 'react';
import {useModal} from './guide/useModal';
import BuildingPanel from './BuildingPanel';
import {QueuePanel, ResourceShop, SecondTeamPanel, StockPanel} from './ResourcePanels';
import {useBase, useSeason} from './useBase';
import ShieldPanel from './ShieldPanel';
// A separate download: most sessions never open the Trade Post.
const TradePost = lazy(() => import('./TradePost'));
import {type LevelledBuilding, PRODUCER_OF, RESOURCE_KINDS, isLevelledBuilding} from '../../shared/buildings';
import {type MessageKey, t} from '../i18n';
import {
  type BaseView,
  RESOURCE_LABEL,
  RESOURCE_ORDER,
  formatDuration,
  formatNumber,
} from '../net/api';
import {serverNow} from './serverClock';
import DailyOperations from './DailyOperations';

function Sheet({
  title,
  tabs,
  active,
  onTab,
  onClose,
  children,
}: {
  title: string;
  tabs: readonly {key: string; label: string}[];
  active: string;
  onTab: (key: string) => void;
  onClose: () => void;
  children: ReactNode;
}) {
  useModal();
  return (
    <div className="fixed inset-x-0 bottom-16 z-30 mx-auto flex max-h-[72vh] w-full max-w-3xl flex-col rounded-t-xl border border-b-0 border-neutral-700 bg-neutral-950 shadow-2xl">
      <div className="flex shrink-0 items-center justify-between border-b border-neutral-800 px-4 py-3">
        <h2 className="font-semibold text-neutral-100">{title}</h2>
        <button
          onClick={onClose}
          className="rounded border border-neutral-700 px-2 py-1 text-xs text-neutral-300 hover:border-orange-500"
        >
          {t('nav.close')}
        </button>
      </div>
      <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-neutral-800 px-3 py-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTab(tab.key)}
            className={`shrink-0 rounded border px-2.5 py-1 text-xs ${
              active === tab.key
                ? 'border-orange-600 bg-orange-950/40 text-orange-200'
                : 'border-neutral-800 text-neutral-400 hover:border-neutral-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
    </div>
  );
}

function Soon({text}: {text: string}) {
  return (
    <div className="rounded border border-dashed border-neutral-800 p-6 text-center">
      <p className="text-xs uppercase tracking-widest text-orange-400">{t('depot.comingSoon')}</p>
      <p className="mt-2 text-sm text-neutral-400">{text}</p>
    </div>
  );
}

export function CommandCenterSheet({
  base,
  pending,
  onUpgrade,
  onClose,
  profile,
  onGoTo,
}: {
  base: BaseView;
  pending: string | null;
  onUpgrade: (kind: string) => void;
  onClose: () => void;
  /** The player panel - who you are and the doors you walk through. */
  profile: ReactNode;
  /** Open another building's sheet (a blocked upgrade's way out). */
  onGoTo?: (where: LevelledBuilding) => void;
}) {
  // Ruling 2026-09-07: the Command Center holds its own upgrade and the
  // player's profile, and nothing else. Shields and the Trade Post live in
  // the Depot; Events and Wars open from the Tactical Operations Center.
  const [tab, setTab] = useState<'upgrade' | 'profile'>('upgrade');
  // Base levels v2: the Command Center's own level. Read when the sheet opens.
  const [levels, setLevels] = useBase();
  const tabs = [
    {key: 'upgrade', label: t('cc.title')},
    {key: 'profile', label: t('cc.profile')},
  ] as const;

  return (
    <Sheet
      title={`${t('cc.title')} · ${t('board.level', {level: levels?.levels.command_center ?? 0})}`}
      tabs={tabs}
      active={tab}
      onTab={(k) => setTab(k as typeof tab)}
      onClose={onClose}
    >
      {tab === 'profile' && profile}
      {tab === 'upgrade' &&
        (levels ? (
          <div className="space-y-3">
            <BuildingPanel building="command_center" base={levels} onChanged={setLevels} onGoTo={onGoTo} />
            <p className="text-[11px] text-neutral-600">{t('cc.capNote')}</p>
          </div>
        ) : (
          <Soon text="Reading…" />
        ))}
    </Sheet>
  );
}

export function DepotSheet({onClose, onCustomise, onGoTo}: {onClose: () => void; onCustomise: () => void; onGoTo?: (where: LevelledBuilding) => void}) {
  const [tab, setTab] = useState<'supplies' | 'trade' | 'modules' | 'cosmetics' | 'services'>('supplies');
  const [base, setBase] = useBase();
  const [season1, setSeason1] = useSeason();
  const tabs = [
    {key: 'supplies', label: t('depot.supplies')},
    // The Trade Post lives in the Depot (ruling 2026-09-07): a store shelf,
    // not a department - no level, no upgrade.
    {key: 'trade', label: t('cc.tradePost')},
    {key: 'modules', label: t('depot.modules')},
    {key: 'cosmetics', label: t('depot.cosmetics')},
    {key: 'services', label: t('depot.services')},
  ] as const;
  return (
    <Sheet
      title={t('depot.title')}
      tabs={tabs}
      active={tab}
      onTab={(k) => setTab(k as typeof tab)}
      onClose={onClose}
    >
      {tab === 'supplies' &&
        (base ? (
          <div className="space-y-3">
            <BuildingPanel building="depot" base={base} onChanged={setBase} onGoTo={onGoTo} />
            <ResourceShop base={base} onChanged={setBase} />
          </div>
        ) : (
          <Soon text={t('depot.suppliesSoon')} />
        ))}
      {tab === 'trade' && (
        <Suspense fallback={<Soon text="Loading…" />}>
          <TradePost
            onWallet={(wallet) => {
              if (base) setBase({...base, wallet});
            }}
          />
        </Suspense>
      )}
      {tab === 'modules' && <Soon text={t('depot.modulesSoon')} />}
      {tab === 'cosmetics' && (
        <>
          <Soon text={t('depot.cosmeticsSoon')} />
          <button
            onClick={onCustomise}
            className="mt-4 w-full rounded border border-neutral-700 px-3 py-2 text-sm text-neutral-200 hover:border-orange-500"
          >
            {t('depot.customise')}
          </button>
        </>
      )}
      {tab === 'services' && (
        <div className="space-y-3">
          {season1 && base && (
            <ShieldPanel
              season1={season1}
              wallet={base.wallet}
              onChanged={(next, wallet) => {
                setSeason1(next);
                setBase({...base, wallet});
              }}
            />
          )}
          <Soon text={t('depot.servicesSoon')} />
        </div>
      )}
    </Sheet>
  );
}

/** A department that has a building but no screen yet: its name and its job. */
export function DepartmentSheet({id, onClose, onGoTo}: {id: string; onClose: () => void; onGoTo?: (where: LevelledBuilding) => void}) {
  const name = t(`building.${id}` as MessageKey);
  const blurb = t(`blurb.${id}` as MessageKey);
  const [base, setBase] = useBase();
  const levelled = isLevelledBuilding(id) ? id : null;
  // The Tactical Operations Center is where operations are run from: Events
  // (Daily Operations today; Arena and Warfront when they exist) and, once
  // built, Wars.
  const toc = id === 'tactical_operations_center';
  // Wars gets its tab here the day it exists; nothing is teased before then.
  const [tab, setTab] = useState<'about' | 'events'>(toc ? 'events' : 'about');
  const tabs = toc
    ? ([
        {key: 'events', label: t('cc.events')},
        {key: 'about', label: 'Building'},
      ] as const)
    : ([{key: 'about', label: 'Building'}] as const);
  return (
    <Sheet title={name} tabs={tabs} active={tab} onTab={(k) => setTab(k as typeof tab)} onClose={onClose}>
      {tab === 'events' && <DailyOperations />}
      {tab !== 'about' ? null : levelled && base ? (
        <div className="space-y-3">
          <BuildingPanel building={levelled} base={base} onChanged={setBase} onGoTo={onGoTo} />
          {levelled === 'quartermaster_warehouse' && <StockPanel base={base} />}
          {RESOURCE_KINDS.filter((k) => PRODUCER_OF[k] === levelled).map((k) => (
            <div key={k}>
              <StockPanel base={base} only={k} />
            </div>
          ))}
          {levelled === 'engineer_support_yard' && (
            <>
              <QueuePanel base={base} />
              <SecondTeamPanel base={base} onChanged={setBase} />
            </>
          )}
          {levelled === 'signals_center' && (
            <p className="text-[12px] text-neutral-400">
              Incoming attacks appear on the World map once they are within your warning lead time.
            </p>
          )}
          {levelled === 'alliance_trading_post' && (
            <p className="text-[12px] text-neutral-400">
              Trading opens when your alliance eligibility is met: 48 hours of membership in the same
              alliance. Offer → counteroffer → both accept → the exchange lands at once.
            </p>
          )}
          <p className="text-xs text-neutral-500">{blurb}</p>
        </div>
      ) : (
        // Levels are still loading: a skeleton, never a placeholder that reads
        // as a design decision.
        <div className="animate-pulse space-y-2" aria-busy="true">
          <div className="h-16 rounded border border-neutral-800 bg-neutral-900/50" />
          <p className="text-[12px] text-neutral-500">{blurb}</p>
        </div>
      )}
    </Sheet>
  );
}
