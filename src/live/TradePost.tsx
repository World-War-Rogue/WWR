/**
 * The Trade Post: a tab in the Command Center sheet, beside Events and Wars.
 *
 * A permanent facility with no level and no upgrade. Two shelves, weekly and
 * monthly, each with a server-provided reset instant and per-offer remaining
 * limit. A card opens a review: choose the destination first, then the
 * route, then confirm - and confirmation sends only the choices. Every
 * number on this screen came from the server, and the same number is shown
 * for Tokens and for Command Credits because it IS the same number.
 *
 * Nothing here mentions money. Tokens are bought on the website; the link to
 * it is drawn only when the server says the website exists, and pressing it
 * changes no balance - balances are re-read when the player comes back.
 */
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {type TradePostView, type Wallet, api, ApiError} from '../net/api';
import {PACKAGE_KEYS, PACKAGE_LABEL, type PackageKey} from '../../shared/upgrades';
import {formatClock, formatGameDate} from '../../shared/gametime';
import {t} from '../i18n';

type Shelf = 'weekly' | 'monthly';
type Route = 'tokens' | 'credits';

function newPurchaseId(): string {
  // Chosen when the review opens, so a refresh mid-confirm re-sends the same
  // key and the server answers with the purchase already made.
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function resetLabel(at: number): string {
  return `${formatGameDate(at)} ${formatClock(at)} RST`;
}

export default function TradePost({onWallet}: {onWallet?: (wallet: Wallet) => void}) {
  const [view, setView] = useState<TradePostView | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [shelf, setShelf] = useState<Shelf>('weekly');
  const [reviewing, setReviewing] = useState<string | null>(null);
  // Held in a ref: the parent passes a fresh arrow every render, and a load
  // that depended on it would refetch on every render, forever.
  const onWalletRef = useRef(onWallet);
  onWalletRef.current = onWallet;

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const v = await api.tradePost();
      setView(v);
      onWalletRef.current?.(v.wallet);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Could not reach the server.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Coming back from the website: re-read the authoritative balances.
  useEffect(() => {
    const onShow = () => {
      if (document.visibilityState === 'visible') void load();
    };
    document.addEventListener('visibilitychange', onShow);
    return () => document.removeEventListener('visibilitychange', onShow);
  }, [load]);

  if (loadError) {
    return (
      <section className="rounded border border-red-900/60 bg-red-950/20 p-3 text-xs text-red-300">
        <p>{loadError}</p>
        <button onClick={() => void load()} className="mt-2 rounded border border-red-800 px-2 py-1 text-[11px] text-red-200">
          Try again
        </button>
      </section>
    );
  }
  if (!view) {
    return (
      <section className="animate-pulse space-y-2" aria-busy="true" aria-label="Loading the Trade Post">
        <div className="h-12 rounded bg-neutral-900" />
        <div className="h-8 w-1/2 rounded bg-neutral-900" />
        <div className="h-28 rounded bg-neutral-900" />
      </section>
    );
  }

  const current = view.shelves.find((s) => s.shelf === shelf) ?? view.shelves[0];
  const offer = reviewing ? current.offers.find((o) => o.id === reviewing) ?? null : null;

  return (
    <section className="space-y-3">
      <header className="rounded border border-neutral-800 bg-neutral-900/40 p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-neutral-100">{t('cc.tradePost')}</h3>
            <p className="text-[10px] uppercase tracking-wider text-neutral-500">Permanent facility · No building upgrades</p>
          </div>
          <dl className="text-right font-mono text-[11px] leading-5 text-neutral-300">
            <div>
              <dt className="inline text-neutral-500">Tokens </dt>
              <dd className="inline">{view.wallet.tokens.toLocaleString()}</dd>
            </div>
            <div>
              <dt className="inline text-neutral-500">Command Credits </dt>
              <dd className="inline">{view.wallet.credits.toLocaleString()}</dd>
            </div>
          </dl>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-neutral-800 pt-2 text-[11px] text-neutral-400">
          <span>Token purchases happen on the WWR website.</span>
          {view.tokenStoreUrl && (
            <a
              href={view.tokenStoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded border border-amber-700/70 bg-amber-950/30 px-2 py-1 font-semibold text-amber-200 hover:bg-amber-900/30"
            >
              Visit Token Store
            </a>
          )}
        </div>
      </header>

      <div role="tablist" aria-label="Shelves" className="flex gap-1">
        {view.shelves.map((s) => (
          <button
            key={s.shelf}
            role="tab"
            aria-selected={shelf === s.shelf}
            aria-controls={`shelf-${s.shelf}`}
            onClick={() => {
              setShelf(s.shelf);
              setReviewing(null);
            }}
            className={`rounded border px-2.5 py-1 text-xs ${
              shelf === s.shelf ? 'border-orange-500 bg-orange-950/30 text-orange-200' : 'border-neutral-800 text-neutral-400'
            }`}
          >
            {s.shelf === 'weekly' ? 'Weekly Requisition' : 'Monthly Contract'}
          </button>
        ))}
      </div>

      <div id={`shelf-${current.shelf}`} role="tabpanel" className="space-y-2">
        <p className="text-[11px] text-neutral-500">Resets {resetLabel(current.resetAt)}</p>
        {current.offers.length === 0 && (
          <p className="rounded border border-dashed border-neutral-800 p-4 text-center text-xs text-neutral-500">{current.emptyText}</p>
        )}
        {current.offers.map((o) => (
          <button
            key={o.id}
            onClick={() => setReviewing(o.id)}
            aria-expanded={reviewing === o.id}
            className="flex w-full gap-3 rounded-lg border border-[#3a3f2a] bg-[#1d2117] p-2 text-left transition hover:border-amber-700/60"
          >
            <span className="flex h-24 w-24 shrink-0 items-center justify-center rounded-md bg-[#262b1c] sm:h-28 sm:w-28">
              <img src={o.art} alt="" width={512} height={512} decoding="async" className="h-[88%] w-[88%] object-contain" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-neutral-100">{o.name}</span>
              <span className="mt-0.5 block text-[11px] leading-snug text-neutral-400">{o.description}</span>
              <span className="mt-1.5 block text-[11px] text-neutral-300">
                {o.remaining} of {o.limit} left this {current.shelf === 'weekly' ? 'week' : 'month'}
              </span>
              <span className="mt-1 block text-[11px] text-amber-200/90">
                {o.kind === 'package-step' ? 'Select target to view current cost' : ''}
              </span>
              <span className="block text-[10px] text-neutral-500">Same number in Tokens and Command Credits.</span>
            </span>
          </button>
        ))}
      </div>

      {offer && (
        // Keyed on a wrapper, not the component (CLAUDE.md): a new offer gets
        // fresh review state and a fresh purchase key.
        <div key={offer.id}>
          <Review
            offer={offer}
            shelf={current.shelf}
            view={view}
            onClose={() => setReviewing(null)}
            onBought={(wallet) => {
              onWalletRef.current?.(wallet);
              void load();
            }}
          />
        </div>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Review                                                                     */
/* -------------------------------------------------------------------------- */

function Review({
  offer,
  shelf,
  view,
  onClose,
  onBought,
}: {
  offer: TradePostView['shelves'][number]['offers'][number];
  shelf: Shelf;
  view: TradePostView;
  onClose: () => void;
  onBought: (wallet: Wallet) => void;
}) {
  const [purchaseId] = useState(newPurchaseId);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [pkg, setPkg] = useState<PackageKey | null>(null);
  const [route, setRoute] = useState<Route | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{remaining: number; duplicate: boolean} | null>(null);

  const eligible = useMemo(() => view.targets.filter((a) => a.eligible), [view.targets]);
  const asset = view.targets.find((a) => a.assetId === assetId) ?? null;
  const quote = asset && pkg ? asset.packages[pkg] : null;
  const soldOut = offer.remaining <= 0;

  // Why the final button is disabled, in the player's words. One reason at a time.
  const blocker: string | null = (() => {
    if (soldOut) return `${shelf === 'weekly' ? 'Weekly' : 'Monthly'} limit reached. Resets ${resetLabel(view.shelves.find((s) => s.shelf === shelf)!.resetAt)}.`;
    if (eligible.length === 0) return 'No eligible target: every package you hold is already at its asset’s Service Rank. Raise a rank first.';
    if (!asset) return null;
    if (!pkg) return null;
    if (!quote) return `${PACKAGE_LABEL[pkg]} is already at Service Rank ${asset.level}. Raise the rank first.`;
    if (!route) return null;
    if (route === 'tokens' && quote.cost > view.wallet.tokens) return `Not enough Tokens. This costs ${quote.cost} Tokens; you hold ${view.wallet.tokens.toLocaleString()}.`;
    if (route === 'credits' && quote.cost > view.wallet.credits) return `Not enough Command Credits. This costs ${quote.cost} Command Credits; you hold ${view.wallet.credits.toLocaleString()}.`;
    return null;
  })();
  const ready = !!asset && !!pkg && !!quote && !!route && !blocker && !busy && !done;

  const confirm = async () => {
    if (!asset || !pkg || !route) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api.tradePostBuy({purchaseId, offerId: offer.id, assetId: asset.assetId, package: pkg, route});
      setDone({remaining: r.remaining, duplicate: r.duplicate});
      onBought(r.wallet);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reach the server. Nothing was charged; try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-label={`Review ${offer.name}`}
      className="rounded-lg border border-amber-900/60 bg-neutral-950 p-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-neutral-100">{offer.name}</p>
          <p className="text-[10px] uppercase tracking-wider text-neutral-500">Exact result shown · Same item, either route</p>
        </div>
        <button onClick={onClose} className="rounded border border-neutral-700 px-2 py-0.5 text-[11px] text-neutral-300">
          {t('nav.close')}
        </button>
      </div>

      {done ? (
        <p className="mt-3 rounded border border-emerald-900/60 bg-emerald-950/20 p-2 text-xs text-emerald-200">
          {done.duplicate ? 'That purchase had already gone through - nothing was charged twice.' : 'Fitted.'}{' '}
          {asset && pkg && quote ? `${asset.code} ${PACKAGE_LABEL[pkg]} is now level ${quote.target}.` : ''} {done.remaining} left this{' '}
          {shelf === 'weekly' ? 'week' : 'month'}.
        </p>
      ) : (
        <>
          {/* 1. Destination */}
          <fieldset className="mt-3" disabled={soldOut || eligible.length === 0}>
            <legend className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">1 · Destination</legend>
            <div className="mt-1 grid grid-cols-2 gap-1 sm:grid-cols-3">
              {eligible.map((a) => (
                <button
                  key={a.assetId}
                  onClick={() => {
                    setAssetId(a.assetId);
                    setPkg(null);
                    setRoute(null);
                  }}
                  aria-pressed={assetId === a.assetId}
                  className={`rounded border px-2 py-1 text-left text-[11px] ${
                    assetId === a.assetId ? 'border-amber-500 bg-amber-950/30 text-amber-100' : 'border-neutral-800 text-neutral-300'
                  }`}
                >
                  <span className="block font-semibold">{a.code}</span>
                  <span className="block text-[10px] text-neutral-500">Service Rank {a.level}</span>
                </button>
              ))}
            </div>
            {asset && (
              <div className="mt-2 grid grid-cols-2 gap-1 sm:grid-cols-4">
                {PACKAGE_KEYS.map((k) => {
                  const q = asset.packages[k];
                  return (
                    <button
                      key={k}
                      onClick={() => {
                        setPkg(k);
                        setRoute(null);
                      }}
                      disabled={!q}
                      aria-pressed={pkg === k}
                      className={`rounded border px-2 py-1 text-left text-[11px] disabled:opacity-40 ${
                        pkg === k ? 'border-amber-500 bg-amber-950/30 text-amber-100' : 'border-neutral-800 text-neutral-300'
                      }`}
                    >
                      <span className="block font-semibold">{PACKAGE_LABEL[k]}</span>
                      <span className="block text-[10px] text-neutral-500">{q ? `${q.current} → ${q.target}` : `At rank ${asset.level}`}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </fieldset>

          {/* 2. Route */}
          {quote && (
            <fieldset className="mt-3">
              <legend className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">2 · Pay with</legend>
              <div className="mt-1 grid grid-cols-2 gap-1">
                {(['tokens', 'credits'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRoute(r)}
                    aria-pressed={route === r}
                    className={`rounded border px-2 py-1.5 text-left ${
                      route === r ? 'border-amber-500 bg-amber-950/30' : 'border-neutral-800'
                    }`}
                  >
                    <span className="block font-mono text-sm text-neutral-100">
                      {quote.cost} {r === 'tokens' ? 'Tokens' : 'Command Credits'}
                    </span>
                    <span className="block text-[10px] text-neutral-500">
                      You hold {(r === 'tokens' ? view.wallet.tokens : view.wallet.credits).toLocaleString()}
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[10px] text-neutral-500">
                Result: {asset?.code} {PACKAGE_LABEL[pkg!]} level {quote.current} → {quote.target}. Identical to the upgrade screen.
              </p>
            </fieldset>
          )}

          {blocker && <p className="mt-3 rounded border border-red-900/60 bg-red-950/20 px-2 py-1.5 text-[11px] text-red-300">{blocker}</p>}
          {error && <p className="mt-3 rounded border border-red-900/60 bg-red-950/20 px-2 py-1.5 text-[11px] text-red-300">{error}</p>}

          {/* 3. Confirm */}
          {!soldOut && eligible.length > 0 && (
            <button
              onClick={() => void confirm()}
              disabled={!ready}
              className="mt-3 w-full rounded border border-amber-600 bg-amber-950/40 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-amber-200 hover:bg-amber-900/40 disabled:cursor-not-allowed disabled:border-neutral-800 disabled:bg-transparent disabled:text-neutral-600"
            >
              {busy ? 'Confirming…' : quote && route ? `Confirm · ${quote.cost} ${route === 'tokens' ? 'Tokens' : 'Command Credits'}` : 'Choose a destination and a route'}
            </button>
          )}
        </>
      )}
    </div>
  );
}
