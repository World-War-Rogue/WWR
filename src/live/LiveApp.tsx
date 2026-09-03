/**
 * Live base client.
 *
 * This screen is deliberately plain. Its job is to prove the foundation: an
 * account that persists, a base stored on a server, and a build timer that
 * keeps running whether or not this tab is open. The tactical UI in App.tsx
 * gets wired to these same endpoints once the foundation is trusted.
 */
import {type FormEvent, useCallback, useEffect, useRef, useState} from 'react';
import {
  ApiError,
  type BaseView,
  type Player,
  RESOURCE_LABEL,
  RESOURCE_ORDER,
  api,
  formatDuration,
  formatNumber,
} from '../net/api';

function useServerClock(base: BaseView | null) {
  // The countdown is drawn against the server's clock, not the browser's, so a
  // wrong system time shows the right remaining time.
  const offsetRef = useRef(0);
  const [, force] = useState(0);

  useEffect(() => {
    if (base) offsetRef.current = base.serverTime - Date.now();
  }, [base]);

  useEffect(() => {
    const id = window.setInterval(() => force((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  return () => Date.now() + offsetRef.current;
}

function AuthPanel({onAuthed}: {onAuthed: (player: Player) => void}) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = mode === 'login' ? await api.login(username, password) : await api.register(username, password);
      onAuthed(result.player);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reach the server.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto mt-24 w-full max-w-sm px-6">
      <p className="text-xs uppercase tracking-[0.3em] text-orange-500">World War Rogue</p>
      <h1 className="mt-2 text-2xl font-semibold text-neutral-100">
        {mode === 'login' ? 'Report for duty' : 'Establish a callsign'}
      </h1>
      <p className="mt-2 text-sm text-neutral-400">
        Your base runs on the server. It keeps building while you are away.
      </p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <label className="block">
          <span className="text-xs uppercase tracking-widest text-neutral-500">Callsign</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            className="mt-1 w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-orange-500"
          />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-widest text-neutral-500">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            className="mt-1 w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-orange-500"
          />
        </label>

        {error && <p className="rounded border border-red-900 bg-red-950/60 px-3 py-2 text-sm text-red-300">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded bg-orange-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
        >
          {busy ? 'Working…' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>
      </form>

      <button
        onClick={() => {
          setMode(mode === 'login' ? 'register' : 'login');
          setError(null);
        }}
        className="mt-6 text-sm text-neutral-400 underline underline-offset-4 hover:text-neutral-200"
      >
        {mode === 'login' ? 'No callsign yet? Create one.' : 'Already have a callsign? Sign in.'}
      </button>
    </div>
  );
}

function ResourceBar({base}: {base: BaseView}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {RESOURCE_ORDER.map((kind) => {
        const value = base.resources[kind];
        const rate = base.productionPerHour[kind];
        const pct = Math.min(100, (value / base.storageCap) * 100);
        return (
          <div key={kind} className="rounded border border-neutral-800 bg-neutral-900/60 p-3">
            <div className="flex items-baseline justify-between">
              <span className="text-xs uppercase tracking-widest text-neutral-500">{RESOURCE_LABEL[kind]}</span>
              {rate > 0 && <span className="text-xs text-emerald-400">+{formatNumber(rate)}/h</span>}
            </div>
            <div className="mt-1 font-mono text-lg text-neutral-100">{formatNumber(value)}</div>
            <div className="mt-2 h-1 w-full rounded bg-neutral-800">
              <div className="h-1 rounded bg-orange-600" style={{width: `${pct}%`}} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function LiveApp() {
  const [player, setPlayer] = useState<Player | null>(null);
  const [base, setBase] = useState<BaseView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  const now = useServerClock(base);

  const refresh = useCallback(async () => {
    try {
      setBase(await api.base());
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reach the server.');
    }
  }, []);

  useEffect(() => {
    api
      .me()
      .then((r) => setPlayer(r.player))
      .catch(() => undefined)
      .finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    if (player) void refresh();
  }, [player, refresh]);

  // Re-read when a job should have finished, and whenever the tab regains
  // focus. The server decides what actually happened; this only asks.
  const job = base?.job ?? null;
  useEffect(() => {
    if (!job) return;
    const delay = Math.max(0, job.completesAt - now()) + 500;
    const id = window.setTimeout(() => void refresh(), delay);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.completesAt, refresh]);

  useEffect(() => {
    const onFocus = () => {
      if (player) void refresh();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [player, refresh]);

  async function upgrade(kind: string) {
    setPending(kind);
    setError(null);
    try {
      setBase(await api.upgrade(kind));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reach the server.');
    } finally {
      setPending(null);
    }
  }

  if (checking) {
    return <div className="p-10 text-sm text-neutral-500">Checking your session…</div>;
  }

  if (!player) return <AuthPanel onAuthed={setPlayer} />;

  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-orange-500">Forward Operating Base</p>
          <h1 className="text-xl font-semibold text-neutral-100">{base?.name ?? '…'}</h1>
        </div>
        <button
          onClick={async () => {
            await api.logout();
            setPlayer(null);
            setBase(null);
          }}
          className="text-sm text-neutral-500 underline underline-offset-4 hover:text-neutral-300"
        >
          Sign out, {player.username}
        </button>
      </header>

      {error && (
        <p className="mt-6 rounded border border-red-900 bg-red-950/60 px-3 py-2 text-sm text-red-300">{error}</p>
      )}

      {base && (
        <>
          <div className="mt-6">
            <ResourceBar base={base} />
          </div>

          {base.job && (
            <div className="mt-6 rounded border border-orange-800 bg-orange-950/30 p-4">
              <p className="text-xs uppercase tracking-widest text-orange-400">Under construction</p>
              <p className="mt-1 text-neutral-200">
                {base.buildings.find((b) => b.kind === base.job!.kind)?.name ?? base.job.kind} → level{' '}
                {base.job.toLevel}
              </p>
              <p className="mt-2 font-mono text-2xl text-orange-300">
                {formatDuration(base.job.completesAt - now())}
              </p>
              <p className="mt-2 text-xs text-neutral-500">
                This timer lives on the server. Close the tab and it keeps running.
              </p>
            </div>
          )}

          <div className="mt-6 space-y-3">
            {base.buildings.map((building) => {
              const busy = pending === building.kind;
              const blocked = building.blockedByCommandPost;
              return (
                <div
                  key={building.kind}
                  className="flex flex-wrap items-center justify-between gap-4 rounded border border-neutral-800 bg-neutral-900/60 p-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2">
                      <h2 className="font-semibold text-neutral-100">{building.name}</h2>
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
                    onClick={() => void upgrade(building.kind)}
                    disabled={busy || blocked || !building.canUpgrade || Boolean(base.job)}
                    className="shrink-0 rounded bg-orange-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-neutral-800 disabled:text-neutral-500"
                  >
                    {blocked ? 'Command Post too low' : busy ? 'Starting…' : 'Upgrade'}
                  </button>
                </div>
              );
            })}
          </div>

          <p className="mt-8 text-xs text-neutral-600">
            Storage cap {formatNumber(base.storageCap)} per resource. Raising the Command Post raises the cap and
            unlocks higher levels everywhere else.
          </p>
        </>
      )}
    </div>
  );
}
