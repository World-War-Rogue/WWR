/**
 * The front door.
 *
 * Two states: sign in, or request access. The game is closed, so there is no
 * path from here into it without an approved account.
 */
import {type FormEvent, type ReactNode, useEffect, useRef, useState} from 'react';
import {ApiError, type Player, api} from '../net/api';
import {COUNTRIES, guessCountry, languageFor} from './countries';
import {STARTER_SKINS} from './skins';

type Mode = 'signin' | 'request';
type Availability = 'idle' | 'checking' | 'free' | 'taken';

const CALLSIGN_RULE = 'Callsign must be 6-20 letters, no numbers or symbols.';

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-neutral-500">{label}</span>
      {children}
      {hint}
    </label>
  );
}

const inputClass =
  'mt-1 w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-orange-500';

export default function Gate({onAuthed}: {onAuthed: (player: Player) => void}) {
  const [mode, setMode] = useState<Mode>('signin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState(guessCountry);
  const [adult, setAdult] = useState(false);
  const [skin, setSkin] = useState<string>(STARTER_SKINS[0].id);

  const [availability, setAvailability] = useState<Availability>('idle');
  const [availabilityNote, setAvailabilityNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Ignore the answer to a check that has been superseded by later typing.
  const checkSeq = useRef(0);

  useEffect(() => {
    if (mode !== 'request') return;
    const name = username.trim();
    if (name.length === 0) {
      setAvailability('idle');
      setAvailabilityNote(null);
      return;
    }
    if (!/^[A-Za-z]{6,20}$/.test(name)) {
      setAvailability('taken');
      setAvailabilityNote(CALLSIGN_RULE);
      return;
    }

    setAvailability('checking');
    setAvailabilityNote(null);
    const seq = ++checkSeq.current;
    const timer = window.setTimeout(async () => {
      try {
        const result = await api.checkCallsign(name);
        if (seq !== checkSeq.current) return;
        setAvailability(result.available ? 'free' : 'taken');
        setAvailabilityNote(result.available ? null : (result.reason ?? 'That callsign is taken.'));
      } catch {
        if (seq !== checkSeq.current) return;
        setAvailability('idle');
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [username, mode]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === 'signin') {
        const result = await api.login(username.trim(), password);
        onAuthed(result.player);
      } else {
        const result = await api.requestAccess({
          email: email.trim(),
          username: username.trim(),
          password,
          country,
          locale: languageFor(country),
          skin,
          ageConfirmed: adult,
        });
        setSent(result.message);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reach the server.');
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="mx-auto mt-24 w-full max-w-sm px-6">
        <p className="text-xs uppercase tracking-[0.3em] text-orange-500">World War Rogue</p>
        <h1 className="mt-2 text-2xl font-semibold text-neutral-100">Request sent</h1>
        <p className="mt-3 text-sm text-neutral-400">{sent}</p>
        <p className="mt-6 text-sm text-neutral-500">
          Access is reviewed by hand while the game is in closed testing. You will be emailed either
          way.
        </p>
        <button
          onClick={() => {
            setSent(null);
            setMode('signin');
          }}
          className="mt-8 text-sm text-neutral-400 underline underline-offset-4 hover:text-neutral-200"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  const requesting = mode === 'request';
  const canSubmit = requesting
    ? adult && availability === 'free' && email.length > 0 && password.length >= 8
    : username.length > 0 && password.length > 0;

  return (
    <div className="mx-auto mt-16 w-full max-w-sm px-6 pb-16">
      <p className="text-xs uppercase tracking-[0.3em] text-orange-500">World War Rogue</p>
      <h1 className="mt-2 text-2xl font-semibold text-neutral-100">
        {requesting ? 'Request access' : 'Report for duty'}
      </h1>
      <p className="mt-2 text-sm text-neutral-400">
        {requesting
          ? 'The game is in closed testing. Requests are reviewed by hand.'
          : 'Sign in to your base. It has been running while you were away.'}
      </p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        {requesting && (
          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className={inputClass}
            />
          </Field>
        )}

        <Field
          label="Callsign"
          hint={
            requesting && availabilityNote ? (
              <span className="mt-1 block text-xs text-red-400">{availabilityNote}</span>
            ) : requesting && availability === 'free' ? (
              <span className="mt-1 block text-xs text-emerald-400">Available</span>
            ) : requesting && availability === 'checking' ? (
              <span className="mt-1 block text-xs text-neutral-500">Checking…</span>
            ) : requesting ? (
              <span className="mt-1 block text-xs text-neutral-600">{CALLSIGN_RULE}</span>
            ) : null
          }
        >
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            className={inputClass}
          />
        </Field>

        <Field label="Password">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={requesting ? 'new-password' : 'current-password'}
            className={inputClass}
          />
        </Field>

        {requesting && (
          <>
            <Field
              label="Country"
              hint={
                <span className="mt-1 block text-xs text-neutral-600">
                  Sets your flag and language. Changeable in-game.
                </span>
              }
            >
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className={inputClass}
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.name}
                  </option>
                ))}
              </select>
            </Field>

            <div>
              <span className="text-xs uppercase tracking-widest text-neutral-500">Base type</span>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {STARTER_SKINS.map((option) => {
                  const active = option.id === skin;
                  return (
                    <button
                      type="button"
                      key={option.id}
                      onClick={() => setSkin(option.id)}
                      className={`rounded border p-2 text-left ${
                        active
                          ? 'border-orange-500 bg-orange-950/30'
                          : 'border-neutral-800 bg-neutral-900/60 hover:border-neutral-600'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block h-4 w-4 rounded-sm"
                          style={{
                            backgroundColor: option.palette.ground,
                            boxShadow: `inset 0 0 0 2px ${option.palette.accent}`,
                          }}
                        />
                        <span className="text-sm font-medium text-neutral-100">{option.name}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="flex items-start gap-3 rounded border border-neutral-800 bg-neutral-900/60 p-3">
              <input
                type="checkbox"
                checked={adult}
                onChange={(e) => setAdult(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-orange-600"
              />
              <span className="text-sm text-neutral-300">
                I confirm I am 18 or over.
                <span className="mt-1 block text-xs text-neutral-500">
                  World War Rogue is not available to under-18s.
                </span>
              </span>
            </label>
          </>
        )}

        {error && (
          <p className="rounded border border-red-900 bg-red-950/60 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy || !canSubmit}
          className="w-full rounded bg-orange-600 px-4 py-2 font-semibold text-white disabled:opacity-40"
        >
          {busy ? 'Working…' : requesting ? 'Request access' : 'Sign in'}
        </button>
      </form>

      <button
        onClick={() => {
          setMode(requesting ? 'signin' : 'request');
          setError(null);
          setAvailability('idle');
          setAvailabilityNote(null);
        }}
        className="mt-6 text-sm text-neutral-400 underline underline-offset-4 hover:text-neutral-200"
      >
        {requesting ? 'Already have a callsign? Sign in.' : 'No account? Request access.'}
      </button>
    </div>
  );
}
