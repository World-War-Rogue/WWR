/**
 * Battle reports - the list, and one report in full.
 *
 * Combat does not exist yet, so this screen is empty for everybody. That is
 * deliberate rather than premature: the report is the only place a player ever
 * finds out what happened to them, and deciding what it has to show is far
 * cheaper before the resolver exists than after it has been written to fit
 * whatever the screen happened to render.
 */
import {type ReactNode, useCallback, useEffect, useState} from 'react';
import {type MessageKey, t} from '../i18n';
import {api, type ApiError} from '../net/api';
import type {BattleDetail, BattleSummary} from '../../shared/battles';
import {verdictFor} from '../../shared/battles';

type Scope = 'mine' | 'alliance';

// The relative-time phrases live in core: every screen that stamps something
// with an age says it the same way, and a translator should only have to
// decide what "5m ago" is once.
function when(ts: number): string {
  const delta = Date.now() - ts;
  const minutes = Math.floor(delta / 60000);
  if (minutes < 1) return t('time.justNow');
  if (minutes < 60) return t('time.minutesAgo', {count: minutes});
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('time.hoursAgo', {count: hours});
  return t('time.daysAgo', {count: Math.floor(hours / 24)});
}

// The verdict arrives as a code, not as a word, so it is looked up rather
// than rendered - `verdictFor` returns 'won' | 'lost' | 'drew'.
const VERDICT_LABEL: Record<string, MessageKey> = {
  won: 'battles.won',
  lost: 'battles.lost',
  drew: 'battles.drew',
};

const VERDICT_STYLE: Record<string, string> = {
  won: 'border-emerald-800 bg-emerald-950/60 text-emerald-300',
  lost: 'border-red-900 bg-red-950/60 text-red-300',
  drew: 'border-neutral-700 bg-neutral-900 text-neutral-300',
};

/**
 * A line like "Attacked Ripcord", with the callsign still styled inside it.
 *
 * The whole sentence is one key with a {name} placeholder rather than a verb
 * this screen glues a name onto - word order moves between languages, and a
 * sentence assembled from fragments cannot be translated at all. To keep the
 * name in its own span the placeholder is left unsubstituted and the
 * translated string split around it, so the callsign lands wherever that
 * language puts it.
 */
function withName(text: string, name: ReactNode): ReactNode {
  const [before, after] = text.split('{name}');
  return (
    <>
      {before}
      <span className="font-semibold">{name}</span>
      {after}
    </>
  );
}

function Row({report, onOpen}: {report: BattleSummary; onOpen: () => void}) {
  const verdict = verdictFor(report.outcome, report.yourSide);
  // Named from the reader's side: they care whether they won, not who won.
  const them = report.yourSide === 'attacker' ? report.defender : report.attacker;
  const looted = report.loot.fuel + report.loot.steel + report.loot.munitions + report.loot.alloy;

  return (
    <button
      onClick={onOpen}
      className="flex w-full items-center gap-3 border-b border-neutral-900 px-3 py-3 text-left transition hover:bg-neutral-900/60"
    >
      <span
        className={`w-14 shrink-0 rounded border px-2 py-1 text-center text-[11px] font-semibold uppercase ${VERDICT_STYLE[verdict]}`}
      >
        {t(VERDICT_LABEL[verdict])}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-neutral-100">
          {withName(
            t(report.yourSide === 'attacker' ? 'battles.attacked' : 'battles.defendedAgainst'),
            <>
              {them.name}
              {them.alliance && (
                <span className="font-normal text-neutral-500"> [{them.alliance}]</span>
              )}
            </>,
          )}
        </span>
        <span className="block font-mono text-[11px] text-neutral-500">
          {t('battles.plotAt', {x: report.x, y: report.y, when: when(report.foughtAt)})}
          {looted > 0 && (
            <span className="text-amber-500">
              {' · '}
              {t('battles.looted', {amount: looted.toLocaleString()})}
            </span>
          )}
        </span>
      </span>
      <span className="shrink-0 text-neutral-600">›</span>
    </button>
  );
}

function Detail({
  report,
  detail,
  onBack,
}: {
  report: BattleSummary;
  detail: BattleDetail;
  onBack: () => void;
}) {
  const verdict = verdictFor(report.outcome, report.yourSide);
  const loot = report.loot;
  // The four resources are named in core, so a report calls them what the
  // rest of the interface calls them.
  const lootRows = (
    [
      ['resource.fuel', loot.fuel],
      ['resource.steel', loot.steel],
      ['resource.munitions', loot.munitions],
      ['resource.alloy', loot.alloy],
    ] as Array<[MessageKey, number]>
  ).filter(([, value]) => value > 0);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-neutral-800 px-3 py-3">
        <button
          onClick={onBack}
          className="rounded border border-neutral-700 px-2 py-1 text-sm text-neutral-300 hover:border-orange-600"
        >
          ‹ {t('battles.allReports')}
        </button>
        <span
          className={`rounded border px-2 py-1 text-[11px] font-semibold uppercase ${VERDICT_STYLE[verdict]}`}
        >
          {t(VERDICT_LABEL[verdict])}
        </span>
        <span className="font-mono text-[11px] text-neutral-500">
          {t('battles.plotAt', {x: report.x, y: report.y, when: when(report.foughtAt)})}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-2 gap-3">
          {(['attacker', 'defender'] as const).map((side) => {
            const who = report[side];
            return (
              <div
                key={side}
                className={`rounded border p-3 ${
                  report.yourSide === side
                    ? 'border-orange-800 bg-orange-950/20'
                    : 'border-neutral-800 bg-neutral-950'
                }`}
              >
                <p className="text-[11px] uppercase tracking-wide text-neutral-500">
                  {side === 'attacker' ? t('battles.attacker') : t('battles.defender')}
                  {report.yourSide === side && (
                    <span className="text-orange-500"> · {t('battles.you')}</span>
                  )}
                </p>
                <p className="truncate font-semibold text-neutral-100">{who.name}</p>
                {who.alliance && <p className="text-xs text-neutral-500">[{who.alliance}]</p>}
                <dl className="mt-2 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <dt className="text-neutral-500">{t('battles.power')}</dt>
                    <dd className="font-mono text-neutral-200">{who.power.toLocaleString()}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-neutral-500">{t('battles.losses')}</dt>
                    <dd className="font-mono text-red-400">{who.losses.toLocaleString()}</dd>
                  </div>
                </dl>
              </div>
            );
          })}
        </div>

        {lootRows.length > 0 && (
          <section className="mt-3 rounded border border-neutral-800 bg-neutral-950 p-3">
            <h3 className="text-[11px] uppercase tracking-wide text-neutral-500">
              {t('battles.carriedOff')}
            </h3>
            <div className="mt-2 flex flex-wrap gap-3">
              {lootRows.map(([label, value]) => (
                <span key={label} className="text-xs text-neutral-300">
                  {t(label)}{' '}
                  <span className="font-mono text-amber-400">{value.toLocaleString()}</span>
                </span>
              ))}
            </div>
          </section>
        )}

        {detail.squads.length > 0 && (
          <section className="mt-3 rounded border border-neutral-800 bg-neutral-950 p-3">
            <h3 className="text-[11px] uppercase tracking-wide text-neutral-500">
              {t('battles.squads')}
            </h3>
            <ul className="mt-2 space-y-2">
              {detail.squads.map((squad, i) => (
                <li key={`${squad.side}-${squad.squad}-${i}`} className="text-xs">
                  <span className="font-semibold text-neutral-200">{squad.squad}</span>
                  <span className="text-neutral-500">
                    {' · '}
                    {squad.side === 'attacker' ? t('battles.attacker') : t('battles.defender')}
                    {' · '}
                    {squad.survived ? t('battles.withdrew') : t('battles.destroyed')}
                    {' · '}
                    {t('battles.squadLosses', {count: squad.losses})}
                  </span>
                  {squad.heroes.length > 0 && (
                    <p className="font-mono text-[11px] text-neutral-600">
                      {squad.heroes.join(', ')}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {detail.rounds.length > 0 && (
          <section className="mt-3 rounded border border-neutral-800 bg-neutral-950 p-3">
            <h3 className="text-[11px] uppercase tracking-wide text-neutral-500">
              {t('battles.roundByRound')}
            </h3>
            <ol className="mt-2 space-y-2">
              {detail.rounds.map((round) => (
                <li key={round.index} className="flex gap-3 text-xs">
                  <span className="w-5 shrink-0 font-mono text-neutral-600">{round.index}</span>
                  <span className="flex-1 text-neutral-300">{round.summary}</span>
                  <span className="shrink-0 font-mono text-neutral-500">
                    {round.attackerDamage} / {round.defenderDamage}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {detail.notes.length > 0 && (
          <section className="mt-3 rounded border border-neutral-800 bg-neutral-950 p-3">
            <h3 className="text-[11px] uppercase tracking-wide text-neutral-500">
              {t('battles.notes')}
            </h3>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-neutral-400">
              {detail.notes.map((note, i) => (
                <li key={i}>{note}</li>
              ))}
            </ul>
          </section>
        )}

        {detail.rounds.length === 0 && detail.squads.length === 0 && (
          <p className="mt-3 text-xs text-neutral-600">{t('battles.noDetail')}</p>
        )}
      </div>
    </div>
  );
}

export default function Battles({onClose}: {onClose: () => void}) {
  const [scope, setScope] = useState<Scope>('mine');
  const [list, setList] = useState<BattleSummary[] | null>(null);
  const [open, setOpen] = useState<{summary: BattleSummary; detail: BattleDetail} | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (which: Scope) => {
    setList(null);
    setError(null);
    try {
      const result = await api.battles(which);
      setList(result.battles);
    } catch (e) {
      setError((e as ApiError).message);
      setList([]);
    }
  }, []);

  useEffect(() => {
    void load(scope);
  }, [scope, load]);

  if (open) {
    return <Detail report={open.summary} detail={open.detail} onBack={() => setOpen(null)} />;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-neutral-800 px-3 py-3">
        <button
          onClick={onClose}
          className="rounded border border-neutral-700 px-2 py-1 text-sm text-neutral-300 hover:border-orange-600"
        >
          ‹ {t('battles.toMap')}
        </button>
        <h2 className="font-semibold text-neutral-100">{t('battles.title')}</h2>
        <div className="ml-auto flex gap-1">
          {(['mine', 'alliance'] as const).map((which) => (
            <button
              key={which}
              onClick={() => setScope(which)}
              className={`rounded border px-2 py-1 text-xs ${
                scope === which
                  ? 'border-orange-600 bg-orange-950/40 text-orange-200'
                  : 'border-neutral-700 text-neutral-400 hover:border-neutral-500'
              }`}
            >
              {which === 'mine' ? t('battles.mine') : t('battles.alliance')}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {error && <p className="px-3 py-4 text-sm text-red-300">{error}</p>}
        {list === null && !error && (
          <p className="px-3 py-4 text-sm text-neutral-500">{t('battles.reading')}</p>
        )}
        {list?.length === 0 && !error && (
          <div className="px-3 py-8 text-center">
            <p className="text-sm text-neutral-400">{t('battles.none')}</p>
            <p className="mt-1 text-xs text-neutral-600">{t('battles.noneHint')}</p>
          </div>
        )}
        {list?.map((report) => (
          // The key sits on a wrapper: this project has no @types/react, so
          // JSX does not special-case `key` on a custom component and would
          // pass it through as an unknown prop.
          <div key={report.id}>
          <Row
            report={report}
            onOpen={() => {
              void (async () => {
                try {
                  setOpen(await api.battle(report.id));
                } catch (e) {
                  setError((e as ApiError).message);
                }
              })();
            }}
          />
          </div>
        ))}
      </div>
    </div>
  );
}
