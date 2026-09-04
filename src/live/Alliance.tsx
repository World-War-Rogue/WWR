/**
 * The alliance screen.
 *
 * Two states in one place: what you see when you belong to one, and what you
 * see when you do not. Splitting them into separate screens would mean a
 * player who just left one has to go and find the other, when the thing they
 * almost certainly want next is on it.
 *
 * Every button here is a courtesy. The server decides what a rank may do and
 * refuses anything else, so hiding a control a player cannot use saves them a
 * click - it does not make the rule.
 */
import {type FormEvent, useCallback, useEffect, useRef, useState} from 'react';
import {
  ALLIANCE_CAPACITY,
  NAME_RULE,
  RANK_LABEL,
  TAG_RULE,
  validName,
  validTag,
} from '../../shared/alliances';
import {
  type AllianceSummary,
  type AllianceView,
  ApiError,
  api,
  formatNumber,
} from '../net/api';
import {Crest} from './Crest';
import PortraitCrop from './PortraitCrop';
import {Portrait} from './Profile';
import {
  PORTRAIT_ACCEPT,
  PORTRAIT_MAX_SOURCE_BYTES,
  PORTRAIT_TINTS,
} from '../../shared/portraits';

function RankBadge({rank}: {rank: 'leader' | 'officer' | 'member'}) {
  const tone =
    rank === 'leader'
      ? 'border-amber-600 text-amber-300'
      : rank === 'officer'
        ? 'border-sky-700 text-sky-300'
        : 'border-neutral-700 text-neutral-400';
  return (
    <span className={`rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${tone}`}>
      {RANK_LABEL[rank]}
    </span>
  );
}

export default function Alliance({
  me,
  onClose,
  onViewProfile,
}: {
  me: string;
  onClose: () => void;
  onViewProfile: (username: string) => void;
}) {
  const [view, setView] = useState<AllianceView | null>(null);
  const [browse, setBrowse] = useState<AllianceSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stamp, setStamp] = useState(0);
  const [pendingCrest, setPendingCrest] = useState<File | null>(null);
  const crestRef = useRef<HTMLInputElement | null>(null);

  const [tag, setTag] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [openJoin, setOpenJoin] = useState(true);

  const run = useCallback(async (work: () => Promise<AllianceView>) => {
    setBusy(true);
    setError(null);
    try {
      setView(await work());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reach the server.');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    api
      .alliance()
      .then(setView)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Could not load your alliance.'),
      );
  }, []);

  useEffect(() => {
    if (view && view.alliance === null && browse === null) {
      api
        .browseAlliances()
        .then((r) => setBrowse(r.alliances))
        .catch(() => setBrowse([]));
    }
  }, [view, browse]);

  const alliance = view?.alliance ?? null;
  const rank = view?.rank ?? 'member';
  const canManage = rank === 'leader' || rank === 'officer';

  // Every field, before the button does anything. An alliance with no stated
  // purpose is one nobody browsing can tell apart from the others, and the
  // browse list is where the decision to join is actually made.
  const createReady =
    validTag(tag) && validName(name) && description.trim().length >= 8;

  async function create(e: FormEvent) {
    e.preventDefault();
    if (!validTag(tag)) return setError(TAG_RULE);
    if (!validName(name)) return setError(NAME_RULE);
    if (description.trim().length < 8) {
      return setError('Say what the alliance is for, in a sentence or more.');
    }
    await run(() => api.createAlliance({tag, name, description: description.trim(), openJoin}));
    setBrowse(null);
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <header className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          {alliance && (
            <div className="relative shrink-0">
              <Crest
                tag={alliance.tag}
                tint={alliance.emblemTint}
                src={
                  alliance.hasCrest
                    ? `/api/alliance/crest?id=${encodeURIComponent(alliance.id)}&v=${stamp}`
                    : null
                }
                size={64}
              />
              {rank === 'leader' && (
                <button
                  type="button"
                  title={alliance.hasCrest ? 'Change the crest' : 'Add a crest'}
                  onClick={() => crestRef.current?.click()}
                  className="absolute -bottom-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full border border-neutral-600 bg-neutral-900 text-lg leading-none text-neutral-200 transition hover:border-orange-500 hover:text-orange-300"
                >
                  +
                </button>
              )}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.3em] text-orange-500">Alliance</p>
            <h1 className="truncate text-xl font-semibold text-neutral-100">
              {alliance ? `[${alliance.tag}] ${alliance.name}` : 'Unaffiliated'}
            </h1>
          </div>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 rounded border border-neutral-700 px-3 py-2 text-sm text-neutral-300 hover:border-orange-600"
        >
          Done
        </button>
      </header>

      <input
        ref={crestRef}
        type="file"
        accept={PORTRAIT_ACCEPT}
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          if (file.size > PORTRAIT_MAX_SOURCE_BYTES) {
            setError('That picture is too large. Try one under 16MB.');
            return;
          }
          setError(null);
          setPendingCrest(file);
        }}
      />

      {pendingCrest && (
        <div className="mt-6">
          <PortraitCrop
            file={pendingCrest}
            onCancel={() => setPendingCrest(null)}
            onDone={(dataUrl) => {
              setPendingCrest(null);
              void run(() => api.setAllianceCrest({image: dataUrl})).then(() =>
                setStamp(Date.now()),
              );
            }}
          />
        </div>
      )}

      {error && (
        <p className="mt-6 rounded border border-red-900 bg-red-950/60 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {view === null ? (
        <p className="mt-8 text-sm text-neutral-600">Loading…</p>
      ) : alliance ? (
        <>
          {alliance.description && (
            <p className="mt-4 border-l-2 border-neutral-700 pl-3 text-sm text-neutral-300">
              {alliance.description}
            </p>
          )}
          <p className="mt-3 text-xs text-neutral-500">
            Server #{alliance.homeWorldId} · {view.roster?.length ?? 0} of {alliance.capacity}{' '}
            members · {alliance.openJoin ? 'Open to anyone' : 'Applications reviewed'} · you are{' '}
            {RANK_LABEL[rank].toLowerCase()}
          </p>

          {canManage && (view.applications?.length ?? 0) > 0 && (
            <section className="mt-6">
              <h2 className="text-sm font-semibold text-neutral-200">
                Applications ({view.applications!.length})
              </h2>
              <div className="mt-2 space-y-2">
                {view.applications!.map((a) => (
                  <div
                    key={a.username}
                    className="flex items-center justify-between gap-3 rounded border border-neutral-800 bg-neutral-900/60 px-3 py-2"
                  >
                    <button
                      onClick={() => onViewProfile(a.username)}
                      className="truncate text-sm text-neutral-200 hover:text-orange-300"
                    >
                      {a.username}
                    </button>
                    <div className="flex shrink-0 gap-2">
                      <button
                        disabled={busy}
                        onClick={() => void run(() => api.decideApplication(a.username, true))}
                        className="rounded bg-emerald-700 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        Accept
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => void run(() => api.decideApplication(a.username, false))}
                        className="rounded border border-neutral-700 px-3 py-1 text-xs text-neutral-300 disabled:opacity-50"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="mt-6">
            <h2 className="text-sm font-semibold text-neutral-200">Roster</h2>
            <div className="mt-2 space-y-2">
              {(view.roster ?? []).map((m) => (
                <div
                  key={m.username}
                  className="flex items-center gap-3 rounded border border-neutral-800 bg-neutral-900/60 p-2"
                >
                  <Portrait
                    glyph={m.portrait.glyph}
                    tint={m.portrait.tint}
                    src={
                      m.portrait.hasImage
                        ? `/api/portrait?name=${encodeURIComponent(m.username)}`
                        : null
                    }
                    size={40}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onViewProfile(m.username)}
                        className="truncate text-sm font-semibold text-neutral-100 hover:text-orange-300"
                      >
                        {m.username}
                      </button>
                      <RankBadge rank={m.rank} />
                    </div>
                    <p className="font-mono text-xs text-neutral-500">
                      {formatNumber(m.power)} power · CP {m.commandPost}
                    </p>
                  </div>

                  {m.username !== me && canManage && (
                    <div className="flex shrink-0 flex-wrap justify-end gap-1">
                      {rank === 'leader' && m.rank === 'member' && (
                        <button
                          disabled={busy}
                          onClick={() => void run(() => api.allianceRank(m.username, 'promote'))}
                          className="rounded border border-neutral-700 px-2 py-1 text-[11px] text-neutral-300 hover:border-sky-600"
                        >
                          Promote
                        </button>
                      )}
                      {rank === 'leader' && m.rank === 'officer' && (
                        <button
                          disabled={busy}
                          onClick={() => void run(() => api.allianceRank(m.username, 'demote'))}
                          className="rounded border border-neutral-700 px-2 py-1 text-[11px] text-neutral-300"
                        >
                          Demote
                        </button>
                      )}
                      {rank === 'leader' && (
                        <button
                          disabled={busy}
                          onClick={() => {
                            if (
                              window.confirm(
                                `Hand command to ${m.username}? You become a lieutenant.`,
                              )
                            ) {
                              void run(() => api.allianceRank(m.username, 'handover'));
                            }
                          }}
                          className="rounded border border-amber-800 px-2 py-1 text-[11px] text-amber-300"
                        >
                          Make general
                        </button>
                      )}
                      <button
                        disabled={busy}
                        onClick={() => void run(() => api.allianceRank(m.username, 'remove'))}
                        className="rounded border border-red-900 px-2 py-1 text-[11px] text-red-300"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {rank === 'leader' && (
            <section className="mt-8">
              <h2 className="text-sm font-semibold text-neutral-200">Settings</h2>
              <textarea
                defaultValue={alliance.description ?? ''}
                onBlur={(e) =>
                  void run(() =>
                    api.allianceSettings({
                      description: e.target.value,
                      openJoin: alliance.openJoin,
                    }),
                  )
                }
                rows={2}
                placeholder="What this alliance is for."
                className="mt-2 w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-orange-600 focus:outline-none"
              />
              <label className="mt-2 flex items-center gap-2 text-sm text-neutral-400">
                <input
                  type="checkbox"
                  checked={alliance.openJoin}
                  onChange={(e) =>
                    void run(() =>
                      api.allianceSettings({
                        description: alliance.description ?? '',
                        openJoin: e.target.checked,
                      }),
                    )
                  }
                  className="accent-orange-600"
                />
                Anyone may join without applying
              </label>
              <p className="mt-4 text-xs uppercase tracking-wider text-neutral-500">
                Crest colour
              </p>
              <p className="mt-1 text-xs text-neutral-600">
                Used behind the tag when no picture is set.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {PORTRAIT_TINTS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    title={t.name}
                    disabled={busy}
                    onClick={() => void run(() => api.setAllianceCrest({tint: t.id}))}
                    style={{background: t.background}}
                    className={`h-8 w-8 rounded border transition ${
                      alliance.emblemTint === t.id
                        ? 'border-orange-400 ring-2 ring-orange-500/50'
                        : 'border-neutral-700'
                    }`}
                  />
                ))}
              </div>

              {alliance.hasCrest && (
                <button
                  disabled={busy}
                  onClick={() =>
                    void run(() => api.setAllianceCrest({image: null})).then(() =>
                      setStamp(Date.now()),
                    )
                  }
                  className="mt-3 text-xs text-neutral-500 underline underline-offset-4 hover:text-neutral-300"
                >
                  Remove crest
                </button>
              )}
            </section>
          )}

          <button
            disabled={busy}
            onClick={() => {
              const last = (view.roster?.length ?? 0) <= 1;
              const disband = rank === 'leader' && !last;
              const message = disband
                ? `Disband [${alliance.tag}]? Everyone in it is removed. This cannot be undone.`
                : `Leave [${alliance.tag}]?`;
              if (window.confirm(message)) {
                void run(() => api.leaveAlliance(disband)).then(() => setBrowse(null));
              }
            }}
            className="mt-8 rounded border border-red-900 px-4 py-2 text-sm text-red-300 hover:bg-red-950/40 disabled:opacity-50"
          >
            {rank === 'leader' && (view.roster?.length ?? 0) > 1
              ? 'Disband alliance'
              : 'Leave alliance'}
          </button>
        </>
      ) : (
        <>
          {(view.applied?.length ?? 0) > 0 && (
            <p className="mt-6 rounded border border-sky-900 bg-sky-950/40 px-3 py-2 text-sm text-sky-200">
              Applied to {view.applied!.map((a) => `[${a.tag}] ${a.name}`).join(', ')}. Waiting on
              an officer.
            </p>
          )}

          <form onSubmit={create} className="mt-6 rounded border border-neutral-800 p-4">
            <h2 className="text-sm font-semibold text-neutral-200">Found an alliance</h2>
            <div className="mt-3 flex flex-wrap gap-3">
              <input
                value={tag}
                onChange={(e) => setTag(e.target.value.toUpperCase())}
                placeholder="TAG"
                maxLength={4}
                className="w-24 rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-center font-mono text-sm uppercase text-neutral-100 focus:border-orange-600 focus:outline-none"
              />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alliance name"
                maxLength={24}
                className="min-w-0 flex-1 rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 focus:border-orange-600 focus:outline-none"
              />
            </div>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What it is for. Other players read this before joining."
              maxLength={240}
              className="mt-3 w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 focus:border-orange-600 focus:outline-none"
            />
            <label className="mt-3 flex items-center gap-2 text-sm text-neutral-400">
              <input
                type="checkbox"
                checked={openJoin}
                onChange={(e) => setOpenJoin(e.target.checked)}
                className="accent-orange-600"
              />
              Anyone may join without applying
            </label>
            <button
              type="submit"
              disabled={busy || !createReady}
              className="mt-4 rounded bg-orange-600 px-5 py-2 text-sm font-semibold text-white disabled:bg-neutral-800 disabled:text-neutral-500"
            >
              Found it
            </button>
            <p className="mt-2 text-xs text-neutral-600">
              {TAG_RULE} All three fields are required. Up to {ALLIANCE_CAPACITY} members.
            </p>
          </form>

          <section className="mt-8">
            <h2 className="text-sm font-semibold text-neutral-200">Alliances on your server</h2>
            {browse === null ? (
              <p className="mt-2 text-sm text-neutral-600">Looking…</p>
            ) : browse.length === 0 ? (
              <p className="mt-2 text-sm text-neutral-600">
                None yet. Found the first one and everybody else joins you.
              </p>
            ) : (
              <div className="mt-2 space-y-2">
                {browse.map((a) => (
                  <div
                    key={a.id}
                    className="rounded border border-neutral-800 bg-neutral-900/60 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <Crest
                          tag={a.tag}
                          tint={a.emblemTint}
                          src={
                            a.hasCrest
                              ? `/api/alliance/crest?id=${encodeURIComponent(a.id)}`
                              : null
                          }
                          size={48}
                        />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-neutral-100">
                            <span className="font-mono text-orange-400">[{a.tag}]</span> {a.name}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-neutral-500">
                            Led by {a.leader ?? 'nobody'}
                          </p>
                        </div>
                      </div>
                      <button
                        disabled={busy || a.members >= ALLIANCE_CAPACITY}
                        onClick={() => void run(() => api.joinAlliance(a.id))}
                        className="shrink-0 rounded bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white disabled:bg-neutral-800 disabled:text-neutral-500"
                      >
                        {a.members >= ALLIANCE_CAPACITY
                          ? 'Full'
                          : a.openJoin
                            ? 'Join'
                            : 'Apply'}
                      </button>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <div className="rounded border border-neutral-800 bg-neutral-950/60 px-2 py-1.5">
                        <p className="text-[10px] uppercase tracking-wider text-neutral-500">
                          Power
                        </p>
                        <p className="font-mono text-sm text-neutral-100">
                          {formatNumber(a.power)}
                        </p>
                      </div>
                      <div className="rounded border border-neutral-800 bg-neutral-950/60 px-2 py-1.5">
                        <p className="text-[10px] uppercase tracking-wider text-neutral-500">
                          Members
                        </p>
                        <p className="font-mono text-sm text-neutral-100">
                          {a.members}/{ALLIANCE_CAPACITY}
                        </p>
                      </div>
                      <div className="rounded border border-neutral-800 bg-neutral-950/60 px-2 py-1.5">
                        <p className="text-[10px] uppercase tracking-wider text-neutral-500">
                          Entry
                        </p>
                        <p className="text-sm text-neutral-100">
                          {a.openJoin ? 'Open' : 'Reviewed'}
                        </p>
                      </div>
                    </div>

                    {a.description && (
                      <p className="mt-2 text-xs text-neutral-400">{a.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
