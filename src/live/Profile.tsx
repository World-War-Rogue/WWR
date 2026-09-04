/**
 * The profile card.
 *
 * One component serves both readings of it: your own, where the portrait and
 * motto are editable, and somebody else's, where it is the thing you look at
 * before deciding whether to march. Keeping them one component is what stops
 * the two drifting - a stat that appears on your card and not on theirs is a
 * stat you cannot use to compare, which is the entire point of a public power
 * rating.
 */
import {type ChangeEvent, useCallback, useEffect, useRef, useState} from 'react';
import {
  MOTTO_MAX,
  PORTRAIT_GLYPHS,
  PORTRAIT_TINTS,
  PORTRAIT_TINTS_BY_ID,
  type PortraitGlyph,
} from '../../shared/portraits';
import {PORTRAIT_ACCEPT, PORTRAIT_MAX_SOURCE_BYTES} from '../../shared/portraits';
import {ApiError, type Profile as ProfileData, api, formatNumber} from '../net/api';
import PortraitCrop from './PortraitCrop';
import {nameFor} from './countries';
import {drawGlyph} from './cosmeticsPaint';
import {skinSpec} from './skins';

/** The portrait itself: a glyph on a tint, drawn rather than loaded. */
export function Portrait({
  glyph,
  tint,
  image,
  size = 88,
}: {
  glyph: string;
  tint: string;
  image?: string | null;
  size?: number;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  // An uploaded picture is an <img>, not a canvas draw. The browser decodes and
  // scales it far better than a hand-rolled draw would, and it keeps working if
  // the canvas context is ever unavailable.
  if (image) {
    return (
      <img
        src={image}
        alt=""
        width={size}
        height={size}
        style={{width: size, height: size, objectFit: 'cover'}}
        className="shrink-0 rounded-lg border border-neutral-700"
      />
    );
  }

  return <GlyphPortrait glyph={glyph} tint={tint} size={size} canvasRef={ref} />;
}

function GlyphPortrait({
  glyph,
  tint,
  size,
  canvasRef: ref,
}: {
  glyph: string;
  tint: string;
  size: number;
  canvasRef: {current: HTMLCanvasElement | null};
}) {
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const colours = PORTRAIT_TINTS_BY_ID[tint] ?? PORTRAIT_TINTS[0];
    ctx.fillStyle = colours.background;
    ctx.fillRect(0, 0, size, size);
    // A soft top light, so a flat fill reads as a surface rather than a swatch.
    const wash = ctx.createLinearGradient(0, 0, 0, size);
    wash.addColorStop(0, 'rgba(255,255,255,0.14)');
    wash.addColorStop(1, 'rgba(0,0,0,0.18)');
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, size, size);

    drawGlyph(ctx, glyph as PortraitGlyph, size / 2, size / 2, size * 0.3, colours.ink);
  }, [glyph, tint, size]);

  return (
    <canvas
      ref={ref}
      style={{width: size, height: size}}
      className="shrink-0 rounded-lg border border-neutral-700"
    />
  );
}

function Stat({label, value}: {label: string; value: string}) {
  return (
    <div className="rounded border border-neutral-800 bg-neutral-900/60 px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">{label}</p>
      <p className="mt-0.5 font-mono text-sm text-neutral-100">{value}</p>
    </div>
  );
}

export default function Profile({
  username,
  editable,
  onClose,
}: {
  username: string;
  editable: boolean;
  onClose: () => void;
}) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [glyph, setGlyph] = useState<string>('star');
  const [tint, setTint] = useState<string>('ember');
  const [motto, setMotto] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    api
      .profile(username)
      .then(({profile: p}) => {
        setProfile(p);
        setGlyph(p.portrait.glyph);
        setTint(p.portrait.tint);
        setMotto(p.motto ?? '');
      })
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Could not load that profile.'),
      );
  }, [username]);

  const dirty =
    profile !== null &&
    (glyph !== profile.portrait.glyph ||
      tint !== profile.portrait.tint ||
      motto.trim() !== (profile.motto ?? ''));

  const save = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const {profile: saved} = await api.saveProfile({
        glyph,
        tint,
        motto: motto.trim() === '' ? null : motto.trim(),
      });
      setProfile(saved);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save your profile.');
    } finally {
      setBusy(false);
    }
  }, [glyph, tint, motto]);

  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-orange-500">
            {editable ? 'Your profile' : 'Dossier'}
          </p>
          <h1 className="text-xl font-semibold text-neutral-100">{profile?.username ?? username}</h1>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 rounded border border-neutral-700 px-3 py-2 text-sm text-neutral-300 hover:border-orange-600"
        >
          {editable ? 'Done' : 'Close'}
        </button>
      </header>

      {error && (
        <p className="mt-6 rounded border border-red-900 bg-red-950/60 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {profile === null ? (
        <p className="mt-8 text-sm text-neutral-600">Loading…</p>
      ) : (
        <>
          <div className="mt-6 flex items-start gap-4">
            <div className="relative shrink-0">
              <Portrait glyph={glyph} tint={tint} image={profile.portrait.image} />
              {editable && (
                <button
                  type="button"
                  title={profile.portrait.image ? 'Change your picture' : 'Add a picture'}
                  onClick={() => fileRef.current?.click()}
                  className="absolute -bottom-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full border border-neutral-600 bg-neutral-900 text-lg leading-none text-neutral-200 transition hover:border-orange-500 hover:text-orange-300"
                >
                  +
                </button>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-semibold text-neutral-100">{profile.username}</p>
              <p className="mt-1 flex items-center gap-2 text-sm text-neutral-400">
                <span className="rounded border border-neutral-700 bg-neutral-900 px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-neutral-300">
                  {profile.country}
                </span>
                {nameFor(profile.country)}
              </p>

              {editable ? (
                <input
                  value={motto}
                  maxLength={MOTTO_MAX}
                  placeholder="Say something. One line."
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setMotto(e.target.value)}
                  className="mt-3 w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-orange-600 focus:outline-none"
                />
              ) : (
                profile.motto && (
                  <p className="mt-3 border-l-2 border-neutral-700 pl-3 text-sm italic text-neutral-300">
                    {profile.motto}
                  </p>
                )
              )}
            </div>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept={PORTRAIT_ACCEPT}
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              // Cleared so choosing the same file twice still fires a change.
              e.target.value = '';
              if (!file) return;
              if (file.size > PORTRAIT_MAX_SOURCE_BYTES) {
                setError('That picture is too large. Try one under 16MB.');
                return;
              }
              setError(null);
              setPending(file);
            }}
          />

          {pending && (
            <div className="mt-6">
              <PortraitCrop
                file={pending}
                onCancel={() => setPending(null)}
                onDone={(dataUrl) => {
                  setPending(null);
                  setBusy(true);
                  setError(null);
                  api
                    .setPortrait(dataUrl)
                    .then(({profile: saved}) => setProfile(saved))
                    .catch((err) =>
                      setError(
                        err instanceof ApiError ? err.message : 'Could not save that picture.',
                      ),
                    )
                    .finally(() => setBusy(false));
                }}
              />
            </div>
          )}

          {editable && profile.portrait.image && !pending && (
            <button
              onClick={() => {
                setBusy(true);
                api
                  .setPortrait(null)
                  .then(({profile: saved}) => setProfile(saved))
                  .catch(() => setError('Could not remove that picture.'))
                  .finally(() => setBusy(false));
              }}
              className="mt-3 text-xs text-neutral-500 underline underline-offset-4 hover:text-neutral-300"
            >
              Remove picture
            </button>
          )}

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Power" value={formatNumber(profile.power)} />
            <Stat label="Alliance" value={profile.alliance ?? 'None'} />
            <Stat label="Server" value={profile.homeWorldId ? `#${profile.homeWorldId}` : '—'} />
            <Stat label="Command Post" value={`Lv ${profile.commandPost}`} />
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Stat label="Base" value={profile.baseName} />
            <Stat
              label="Position"
              value={profile.plot ? `${profile.plot.x}, ${profile.plot.y}` : 'Unplaced'}
            />
          </div>

          <p className="mt-3 text-xs text-neutral-600">
            Flying {skinSpec(profile.skin).name}
            {profile.joinedAt
              ? ` · deployed ${new Date(profile.joinedAt).toLocaleDateString()}`
              : ''}
          </p>

          {editable && (
            <div className="mt-8 space-y-6">
              <section>
                <h2 className="text-sm font-semibold text-neutral-200">Portrait</h2>
                <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
                  {PORTRAIT_GLYPHS.map((g) => (
                    <div key={g} className="shrink-0">
                      <button
                        type="button"
                        onClick={() => setGlyph(g)}
                        className={`rounded border p-1 transition ${
                          glyph === g
                            ? 'border-orange-500 bg-orange-950/40'
                            : 'border-neutral-800 hover:border-neutral-600'
                        }`}
                      >
                        <Portrait glyph={g} tint={tint} size={52} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h2 className="text-sm font-semibold text-neutral-200">Colour</h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  {PORTRAIT_TINTS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      title={t.name}
                      onClick={() => setTint(t.id)}
                      style={{background: t.background}}
                      className={`h-9 w-9 rounded border transition ${
                        tint === t.id ? 'border-orange-400 ring-2 ring-orange-500/50' : 'border-neutral-700'
                      }`}
                    />
                  ))}
                </div>
              </section>

              <button
                onClick={() => void save()}
                disabled={!dirty || busy}
                className="rounded bg-orange-600 px-6 py-2 text-sm font-semibold text-white disabled:bg-neutral-800 disabled:text-neutral-500"
              >
                {busy ? 'Saving…' : dirty ? 'Save profile' : 'Saved'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
