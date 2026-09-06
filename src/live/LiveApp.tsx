/**
 * Live base client.
 *
 * This screen is deliberately plain. Its job is to prove the foundation: an
 * account that persists, a base stored on a server, and a build timer that
 * keeps running whether or not this tab is open. The tactical UI in App.tsx
 * gets wired to these same endpoints once the foundation is trusted.
 */
import {type FormEvent, useCallback, useEffect, useRef, useState} from 'react';
import {setLanguage, t} from '../i18n';
import Alliance from './Alliance';
import Assets from './Assets';
import BaseBoard from './BaseBoard';
import {CommandCenterSheet, DepotSheet} from './BaseSheets';
import Battles from './Battles';
import Squads from './Squads';
import Chat from './Chat';
import Customize from './Customize';
import Profile, {Portrait} from './Profile';
import Gate from './Gate';
import {GameClock} from './GameClock';
import {noteServerTime, serverNow} from './serverClock';
import Settings from './Settings';
import {installErrorTap} from './recentErrors';
import WorldMap from './WorldMap';
import {
  ApiError,
  type BaseView,
  type Player,
  type Profile as ProfileData,
  RESOURCE_LABEL,
  RESOURCE_ORDER,
  api,
  formatNumber,
} from '../net/api';
import type {BuildingEntry} from '../../shared/base';
import type {AssetCategory} from '../../shared/assets';

function useServerClock(base: BaseView | null) {
  // The countdown is drawn against the server's clock, not the browser's, so a
  // wrong system time shows the right remaining time.
  //
  // The offset itself moved to src/live/serverClock.ts, because the map corrects
  // it far more often than this screen does and two components holding two
  // copies of one session fact will drift. This is now just the tick.
  const [, force] = useState(0);

  useEffect(() => {
    if (base) noteServerTime(base.serverTime);
  }, [base]);

  useEffect(() => {
    const id = window.setInterval(() => force((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  return serverNow;
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

/**
 * The player tab, top right.
 *
 * A menu rather than a screen, because everything in it is either a fact you
 * glance at or a door you walk through, and neither is worth losing the base
 * you were looking at. The portrait is the button: it is the one thing on this
 * bar that is unmistakably yours, and it is already how a player is identified
 * everywhere else in the game.
 *
 * Sign out lives at the bottom behind its own divider, away from the two
 * things above it that people press constantly.
 */
function PlayerMenu({
  player,
  onOpenProfile,
  onOpenCustomize,
  onOpenAlliance,
  onOpenSettings,
  onSignOut,
}: {
  player: Player;
  onOpenProfile: () => void;
  onOpenCustomize: () => void;
  onOpenAlliance: () => void;
  onOpenSettings: () => void;
  onSignOut: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const box = useRef<HTMLDivElement | null>(null);

  // Loaded when the menu is first opened, not on every render of the page.
  // Nothing in here changes while it is shut, and the header should not cost a
  // request on a screen that has not been asked for.
  useEffect(() => {
    if (!open || profile) return;
    let live = true;
    api
      .profile(player.username)
      .then((r) => {
        if (live) setProfile(r.profile);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [open, profile, player.username]);

  // Close on a click anywhere else, and on Escape. A menu that only closes by
  // pressing the thing that opened it is a menu people leave open.
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      {/*
        Sized to match Squads on the other side of the header.

        It used to be px-2 py-1.5 around a 26px portrait with the name hidden
        below the sm breakpoint - so on a phone it was a small circle and a
        caret, with nothing on it that said what it was. The two ends of the
        header are the same kind of target and should be the same size; a
        smaller one reads as less important rather than as more compact.

        The name is always shown now. It is what makes this legible as "you"
        rather than as an unlabelled icon, and it truncates rather than
        wrapping - a long callsign narrows this button, it does not break the
        row.
      */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={`${player.username} — profile and settings`}
        aria-expanded={open}
        className={`flex items-center gap-2 rounded border px-3 py-2 text-sm font-medium transition ${
          open
            ? 'border-fuchsia-500 text-fuchsia-200'
            : 'border-neutral-700 text-neutral-300 hover:border-fuchsia-500 hover:text-fuchsia-200'
        }`}
      >
        <Portrait
          glyph={profile?.portrait.glyph ?? 'star'}
          tint={profile?.portrait.tint ?? 'ash'}
          src={`/api/portrait?name=${encodeURIComponent(player.username)}`}
          size={28}
        />
        <span className="max-w-[5.5rem] truncate sm:max-w-[10rem]">{player.username}</span>
        <span aria-hidden="true" className="text-[10px] text-neutral-500">
          ▾
        </span>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded border border-neutral-700 bg-neutral-950 shadow-xl">
          <div className="flex items-center gap-3 border-b border-neutral-800 px-3 py-3">
            <Portrait
              glyph={profile?.portrait.glyph ?? 'star'}
              tint={profile?.portrait.tint ?? 'ash'}
              src={`/api/portrait?name=${encodeURIComponent(player.username)}`}
              size={40}
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-neutral-100">{player.username}</p>
              <p className="truncate text-[11px] text-neutral-500">
                {profile?.alliance ? `[${profile.alliance.tag}] ${profile.alliance.name}` : t('menu.noAlliance')}
              </p>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 border-b border-neutral-800 px-3 py-3 text-[11px]">
            <dt className="text-neutral-500">{t('menu.power')}</dt>
            <dd className="text-right font-mono text-neutral-200">
              {profile ? profile.power.toLocaleString() : '—'}
            </dd>
            <dt className="text-neutral-500">{t('menu.commandPost')}</dt>
            <dd className="text-right font-mono text-neutral-200">{profile?.commandPost ?? '—'}</dd>
            <dt className="text-neutral-500">{t('menu.server')}</dt>
            <dd className="text-right font-mono text-neutral-200">{profile?.homeWorldId ?? '—'}</dd>
          </dl>

          <button
            onClick={() => {
              setOpen(false);
              onOpenProfile();
            }}
            className="block w-full px-3 py-2.5 text-left text-sm text-neutral-200 hover:bg-neutral-900"
          >
            {t('menu.viewProfile')}
          </button>
          <button
            onClick={() => {
              setOpen(false);
              onOpenCustomize();
            }}
            className="block w-full px-3 py-2.5 text-left text-sm text-neutral-200 hover:bg-neutral-900"
          >
            {t('menu.customise')}
          </button>
          <button
            onClick={() => {
              setOpen(false);
              onOpenAlliance();
            }}
            className="block w-full px-3 py-2.5 text-left text-sm text-neutral-200 hover:bg-neutral-900"
          >
            {t('nav.alliance')}
          </button>
          {player.role === 'owner' && (
            <a
              href="/api/access/requests"
              className="block w-full px-3 py-2.5 text-left text-sm text-orange-400 hover:bg-neutral-900"
            >
              {t('menu.accessRequests')}
            </a>
          )}

          <button
            onClick={() => {
              setOpen(false);
              onOpenSettings();
            }}
            className="block w-full border-t border-neutral-800 px-3 py-2.5 text-left text-sm text-neutral-200 hover:bg-neutral-900"
          >
            {t('settings.title')}
          </button>

          <button
            onClick={() => void onSignOut()}
            className="block w-full border-t border-neutral-800 px-3 py-2.5 text-left text-sm text-neutral-500 hover:bg-neutral-900 hover:text-red-300"
          >
            {t('menu.signOut')}
          </button>
        </div>
      )}
    </div>
  );
}

export default function LiveApp() {
  const [player, setPlayer] = useState<Player | null>(null);
  const [base, setBase] = useState<BaseView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  // Which building sheet is open over the board, and which category the
  // assets screen was entered through (null = the whole catalogue).
  const [sheet, setSheet] = useState<'command_center' | 'depot' | null>(null);
  const [assetOnly, setAssetOnly] = useState<AssetCategory | null>(null);
  const [checking, setChecking] = useState(true);
  /** Bumped when the language changes, purely to force a redraw. */
  const [, setLangTick] = useState(0);
  const [screen, setScreen] = useState<
    'base' | 'world' | 'customize' | 'profile' | 'alliance' | 'battles' | 'assets' | 'squads'
    // The map, not the base. A player opening the game wants to see where they
    // are and what is around them - the base screen is a menu, and starting on
    // a menu hides the thing the game is actually about. The map already opens
    // at 94px per plot centred on your own plot, which is what the Home button
    // does, so this needs no second concept of "home".
  >('world');
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Collect client errors from the first render, so a report filed at minute
  // three still carries what went wrong at minute one.
  useEffect(() => {
    installErrorTap();
  }, []);
  // Whose profile is open. Your own from the base header; somebody else's from
  // their base on the map.
  const [viewing, setViewing] = useState<string | null>(null);

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

  // The interface language follows the player's choice, applied before
  // anything below this renders. `t` reads a module variable rather than a
  // context because it is also called from canvas drawing code, which has no
  // component around it to read a context from.
  useEffect(() => {
    setLanguage(player?.language ?? 'en');
    // Nudge a re-render so screens already mounted redraw in the new language
    // rather than waiting for the next thing that happens to change.
    setLangTick((n) => n + 1);
  }, [player?.language]);

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

  if (!player) return <Gate onAuthed={setPlayer} />;

  // Chat is pinned to every signed-in screen rather than being one of them, so
  // it is reachable from the map without leaving the map. Settings rides along
  // in the same element for the same reason - every screen already renders
  // this, so the panel opens over whatever you were looking at without each
  // branch having to know about it.
  const chat = (
    <>
      <Chat
        me={player.username}
        onViewProfile={(name) => {
          setViewing(name);
          setScreen('profile');
        }}
      />
      {settingsOpen && (
        <Settings
          screen={screen === 'world' ? 'map' : screen}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </>
  );

  if (screen === 'alliance') {
    return (
      <>
        <div className="pb-16">
          <Alliance
            me={player.username}
            onClose={() => setScreen('base')}
            onViewProfile={(name) => {
              setViewing(name);
              setScreen('profile');
            }}
          />
        </div>
        {chat}
      </>
    );
  }

  if (screen === 'profile') {
    const who = viewing ?? player.username;
    return (
      <>
        <div className="pb-16">
          <Profile
            username={who}
            editable={who === player.username}
            onClose={() => {
              setScreen(viewing === null ? 'base' : 'world');
              setViewing(null);
            }}
          />
        </div>
        {chat}
      </>
    );
  }

  if (screen === 'customize') {
    return (
      <>
        <div className="pb-16">
          <Customize
            onClose={() => {
              setScreen('base');
              void refresh();
            }}
          />
        </div>
        {chat}
      </>
    );
  }

  // The map owns the whole viewport - it is a canvas, not a page section.
  if (screen === 'world') {
    return (
      <>
        <div className="fixed inset-0">
          <WorldMap
            onOpenBase={() => setScreen('base')}
            onViewProfile={(name) => {
              setViewing(name);
              setScreen('profile');
            }}
            onOpenBattles={() => setScreen('battles')}
            onOpenSquads={() => setScreen('squads')}
          />
        </div>
        {chat}
      </>
    );
  }

  if (screen === 'squads') {
    return (
      <>
        <div className="fixed inset-0 bg-[#0a0906] text-neutral-200">
          <Squads onClose={() => setScreen('base')} onShowAssets={() => setScreen('assets')} />
        </div>
        {chat}
      </>
    );
  }

  // The catalogue is a browsing screen, so it takes the viewport like the
  // others rather than sharing one with the base it is not about.
  if (screen === 'assets') {
    return (
      <>
        <div className="fixed inset-0 bg-[#0a0906] text-neutral-200">
          <Assets
            only={assetOnly}
            onClose={() => {
              setAssetOnly(null);
              setScreen('base');
            }}
            onShowSquads={() => {
              setAssetOnly(null);
              setScreen('squads');
            }}
          />
        </div>
        {chat}
      </>
    );
  }

  // Reports take the whole viewport too: a battle report is a page you read,
  // not a panel you glance at over the map.
  if (screen === 'battles') {
    return (
      <>
        <div className="fixed inset-0 bg-[#0a0906] text-neutral-200">
          <Battles onClose={() => setScreen('world')} />
        </div>
        {chat}
      </>
    );
  }

  return (
    <>
    <div className="mx-auto max-w-3xl px-5 pb-24 pt-8">
      {/*
        Three things, in the three places a thumb reaches: alliance left, map
        centre, you on the right. The base's own name came out because the
        screen it sits on is already the base - a title that repeats where you
        are is a line of furniture, and everything it said is inside the
        profile panel where it can be read on purpose.
      */}
      <header className="flex items-center justify-between gap-3">
        <button
          onClick={() => setScreen('squads')}
          className="flex items-center gap-2 rounded border border-neutral-700 px-3 py-2 text-sm font-medium text-neutral-300 transition hover:border-orange-500 hover:text-orange-200"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          {t('nav.squads')}
        </button>

        <button
          onClick={() => setScreen('world')}
          className="rounded bg-neutral-800 px-3 py-2 text-sm font-medium text-neutral-100 transition hover:bg-neutral-700"
        >
          {t('nav.worldMap')}
        </button>

        <PlayerMenu
          player={player}
          onOpenProfile={() => {
            setViewing(null);
            setScreen('profile');
          }}
          onOpenCustomize={() => setScreen('customize')}
          onOpenAlliance={() => setScreen('alliance')}
          onOpenSettings={() => setSettingsOpen(true)}
          onSignOut={async () => {
            await api.logout();
            setPlayer(null);
            setBase(null);
          }}
        />
      </header>

      {/*
        The clock, on its own line rather than as a fourth thing in the header.
        Three targets across a phone header is already the limit, and a readout
        wedged between two buttons is a readout that gets pressed.
      */}
      <p className="mt-3 text-right text-xs">
        <GameClock />
      </p>

      {error && (
        <p className="mt-6 rounded border border-red-900 bg-red-950/60 px-3 py-2 text-sm text-red-300">{error}</p>
      )}

      {base && (
        <>
          <div className="mt-6">
            <ResourceBar base={base} />
          </div>

          <div className="mt-4">
            <BaseBoard
              base={base}
              onPlacements={(placements) => setBase((b) => (b ? {...b, placements} : b))}
              onOpen={(entry: BuildingEntry) => {
                if (entry.kind === 'assets') {
                  setAssetOnly(entry.category);
                  setScreen('assets');
                } else {
                  setSheet(entry.kind);
                }
              }}
            />
          </div>

          {sheet === 'command_center' && (
            <CommandCenterSheet
              base={base}
              pending={pending}
              onUpgrade={(kind) => void upgrade(kind)}
              onClose={() => setSheet(null)}
            />
          )}
          {sheet === 'depot' && (
            <DepotSheet
              onClose={() => setSheet(null)}
              onCustomise={() => {
                setSheet(null);
                setScreen('customize');
              }}
            />
          )}
        </>
      )}
    </div>
    {chat}
    </>
  );
}
