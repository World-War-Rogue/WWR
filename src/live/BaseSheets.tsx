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
import {type ReactNode, useEffect, useState} from 'react';
import BuildingPanel from './BuildingPanel';
import {type BaseLevelsView, type Wallet, api} from '../net/api';
import {type MessageKey, t} from '../i18n';
import {
  type BaseView,
  RESOURCE_LABEL,
  RESOURCE_ORDER,
  formatDuration,
  formatNumber,
} from '../net/api';
import {serverNow} from './serverClock';

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
}: {
  base: BaseView;
  pending: string | null;
  onUpgrade: (kind: string) => void;
  onClose: () => void;
  /** The player panel - who you are and the doors you walk through. */
  profile: ReactNode;
}) {
  const [tab, setTab] = useState<'departments' | 'events' | 'wars' | 'profile'>('departments');
  // Base levels v2: the Command Center's own level. Read when the sheet opens.
  const [levels, setLevels] = useState<BaseLevelsView | null>(null);
  const [wallet, setWallet] = useState<Wallet>(base.wallet);
  useEffect(() => {
    let live = true;
    api
      .baseLevels()
      .then((b) => live && setLevels(b))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);
  const tabs = [
    {key: 'departments', label: t('cc.departments')},
    {key: 'events', label: t('cc.events')},
    {key: 'wars', label: t('cc.wars')},
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
      {tab === 'events' && <Soon text={t('cc.eventsSoon')} />}
      {tab === 'wars' && <Soon text={t('cc.warsSoon')} />}
      {tab === 'profile' && profile}
      {tab === 'departments' && (
        <>
          {levels && (
            <div className="mb-4">
              <BuildingPanel
                building="command_center"
                levels={levels.levels}
                job={levels.job}
                season={levels.season}
                wallet={wallet}
                onChanged={(next) => {
                  setLevels((b) => (b ? {...b, levels: next.levels, job: next.job} : b));
                  if (next.wallet) setWallet(next.wallet);
                }}
              />
            </div>
          )}
          {base.job && (
            <div className="mb-4 rounded border border-orange-800 bg-orange-950/30 p-4">
              <p className="text-xs uppercase tracking-widest text-orange-400">Under construction</p>
              <p className="mt-1 text-neutral-200">
                {base.buildings.find((b) => b.kind === base.job!.kind)?.name ?? base.job.kind} → level{' '}
                {base.job.toLevel}
              </p>
              <p className="mt-2 font-mono text-2xl text-orange-300">
                {formatDuration(base.job.completesAt - serverNow())}
              </p>
            </div>
          )}
          <p className="mb-3 text-xs text-neutral-500">{t('cc.capNote')}</p>
          <div className="space-y-3">
            {base.buildings.map((building) => {
              const busy = pending === building.kind;
              const blocked = building.blockedByCommandPost;
              const name = building.kind === 'command_post' ? t('cc.title') : building.name;
              return (
                <div
                  key={building.kind}
                  className="flex flex-wrap items-center justify-between gap-3 rounded border border-neutral-800 bg-neutral-900/60 p-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2">
                      <h3 className="font-semibold text-neutral-100">{name}</h3>
                      <span className="font-mono text-sm text-orange-500">Lv {building.level}</span>
                    </div>
                    <p className="mt-1 text-sm text-neutral-500">{building.blurb}</p>
                    {building.nextCost && (
                      <p className="mt-2 font-mono text-xs text-neutral-400">
                        {RESOURCE_ORDER.filter((r) => building.nextCost![r] > 0)
                          .map((r) => `${RESOURCE_LABEL[r]} ${formatNumber(building.nextCost![r])}`)
                          .join('   ')}
                        {building.nextDurationMs !== null && `   ·   ${formatDuration(building.nextDurationMs)}`}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => onUpgrade(building.kind)}
                    disabled={busy || blocked || !building.canUpgrade || Boolean(base.job)}
                    className="shrink-0 rounded bg-orange-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-neutral-800 disabled:text-neutral-500"
                  >
                    {blocked ? `${t('cc.title')} too low` : busy ? 'Starting…' : 'Upgrade'}
                  </button>
                </div>
              );
            })}
          </div>
          <p className="mt-6 text-xs text-neutral-600">
            {t('base.storageCap', {amount: formatNumber(base.storageCap)})}
          </p>
        </>
      )}
    </Sheet>
  );
}

export function DepotSheet({onClose, onCustomise}: {onClose: () => void; onCustomise: () => void}) {
  const [tab, setTab] = useState<'supplies' | 'modules' | 'cosmetics' | 'services'>('supplies');
  const tabs = [
    {key: 'supplies', label: t('depot.supplies')},
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
      {tab === 'supplies' && <Soon text={t('depot.suppliesSoon')} />}
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
      {tab === 'services' && <Soon text={t('depot.servicesSoon')} />}
    </Sheet>
  );
}

/** A department that has a building but no screen yet: its name and its job. */
export function DepartmentSheet({id, onClose}: {id: string; onClose: () => void}) {
  const name = t(`building.${id}` as MessageKey);
  const blurb = t(`blurb.${id}` as MessageKey);
  return (
    <Sheet title={name} tabs={[{key: 'about', label: t('department.soon')}]} active="about" onTab={() => undefined} onClose={onClose}>
      <p className="text-sm text-neutral-200">{blurb}</p>
      <p className="mt-3 text-xs text-neutral-500">{t('department.soonBody')}</p>
    </Sheet>
  );
}
