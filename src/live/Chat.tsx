/**
 * Chat.
 *
 * A bar pinned to the bottom of every screen, which opens full screen when
 * tapped. Full screen rather than a floating panel because this is a game
 * people play on phones, and a chat window that shares a small screen with a
 * map is two things done badly.
 *
 * Delivery is polling, not sockets. A Worker cannot hold a connection open -
 * that needs Durable Objects, which is real work and real cost - and polling
 * on a `since` cursor is a small indexed query that behaves the same whether
 * three people or a thousand are talking. It costs a second or two of latency,
 * which nobody notices in a strategy game, and it is the thing to replace
 * first if chat ever becomes the reason people are here.
 */
import {type FormEvent, useCallback, useEffect, useRef, useState} from 'react';
import {
  CHAT_TABS,
  type ChatTab,
  MESSAGE_MAX,
  TAB_BLURB,
  TAB_LABEL,
} from '../../shared/chat';
import {RANK_LABEL} from '../../shared/alliances';
import {ApiError, type ChatChannels, type ChatMessage, api} from '../net/api';
import {Portrait} from './Profile';

/** While open. Fast enough to feel live, slow enough to be cheap. */
const OPEN_POLL_MS = 4000;
/** While closed, only to keep the unread badge honest. */
const IDLE_POLL_MS = 25000;

function timeOf(ms: number): string {
  return new Date(ms).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
}

export default function Chat({
  me,
  onViewProfile,
}: {
  me: string;
  onViewProfile: (username: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<ChatTab>('server');
  const [info, setInfo] = useState<ChatChannels | null>(null);
  const [thread, setThread] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [dmName, setDmName] = useState('');

  const sinceRef = useRef<number | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Which channel the current tab is looking at. Private has no single
  // channel - it has a list, and one of them is selected.
  const channel =
    tab === 'server'
      ? info?.channels.server ?? null
      : tab === 'alliance'
        ? info?.channels.alliance ?? null
        : tab === 'leadership'
          ? info?.channels.leadership ?? null
          : thread;

  const loadChannels = useCallback(async () => {
    try {
      setInfo(await api.chatChannels());
    } catch {
      // A failed channel list is not worth an error banner; the next poll
      // fixes it, and the one that matters is a failed send.
    }
  }, []);

  useEffect(() => {
    void loadChannels();
  }, [loadChannels]);

  // Unread badge while closed.
  useEffect(() => {
    if (open) return;
    const id = window.setInterval(() => void loadChannels(), IDLE_POLL_MS);
    return () => window.clearInterval(id);
  }, [open, loadChannels]);

  // Switching channel starts the history again.
  useEffect(() => {
    sinceRef.current = null;
    setMessages([]);
  }, [channel]);

  // The live poll.
  useEffect(() => {
    if (!open || !channel) return;
    let alive = true;

    const pull = async () => {
      try {
        const since = sinceRef.current;
        const result = await api.chatRead(channel, since ?? undefined);
        if (!alive) return;
        sinceRef.current = result.serverTime;
        if (result.messages.length > 0) {
          setMessages((current) =>
            since === null ? result.messages : [...current, ...result.messages].slice(-300),
          );
        }
        setError(null);
      } catch (err) {
        if (alive) {
          setError(err instanceof ApiError ? err.message : 'Chat is unreachable.');
        }
      }
    };

    void pull();
    const id = window.setInterval(() => void pull(), OPEN_POLL_MS);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [open, channel]);

  // Opening a channel clears its badge on the server, so refresh the counts.
  useEffect(() => {
    if (open) void loadChannels();
  }, [open, channel, loadChannels]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({block: 'end'});
  }, [messages]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!channel || text === '') return;
    setDraft('');
    try {
      await api.chatSend(channel, text);
      const result = await api.chatRead(channel, sinceRef.current ?? undefined);
      sinceRef.current = result.serverTime;
      if (result.messages.length > 0) {
        setMessages((current) => [...current, ...result.messages].slice(-300));
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That did not send.');
      setDraft(text);
    }
  }

  async function openDm(username: string) {
    try {
      const result = await api.chatOpenDm(username);
      setTab('private');
      setThread(result.channel);
      await loadChannels();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not open that conversation.');
    }
  }

  const totalUnread = Object.values<number>(info?.unread ?? {}).reduce((a, b) => a + b, 0);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between border-t border-neutral-800 bg-neutral-950/95 px-4 py-3 text-left backdrop-blur"
      >
        <span className="text-sm text-neutral-400">
          {totalUnread > 0 ? 'New messages' : 'Comms'}
        </span>
        <span className="flex items-center gap-2">
          {totalUnread > 0 && (
            <span className="rounded-full bg-orange-600 px-2 py-0.5 text-xs font-semibold text-white">
              {totalUnread}
            </span>
          )}
          <span className="text-xs uppercase tracking-widest text-neutral-600">Open</span>
        </span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-neutral-950">
      <header className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
        <p className="text-xs uppercase tracking-[0.3em] text-orange-500">Comms</p>
        <button
          onClick={() => setOpen(false)}
          className="rounded border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:border-orange-600"
        >
          Close
        </button>
      </header>

      <nav className="flex shrink-0 border-b border-neutral-800">
        {CHAT_TABS.map((key) => {
          const target =
            key === 'server'
              ? info?.channels.server
              : key === 'alliance'
                ? info?.channels.alliance
                : key === 'leadership'
                  ? info?.channels.leadership
                  : null;
          const count =
            key === 'private'
              ? (info?.threads ?? []).reduce((n, t) => n + (info?.unread[t.channel] ?? 0), 0)
              : target
                ? info?.unread[target] ?? 0
                : 0;
          const available = key === 'private' || Boolean(target);
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              disabled={!available}
              title={available ? TAB_BLURB[key] : 'Not available to you yet'}
              className={`flex-1 border-b-2 px-2 py-2 text-sm transition ${
                tab === key
                  ? 'border-orange-500 text-neutral-100'
                  : 'border-transparent text-neutral-500 hover:text-neutral-300'
              } disabled:text-neutral-700`}
            >
              {TAB_LABEL[key]}
              {count > 0 && (
                <span className="ml-1.5 rounded-full bg-orange-600 px-1.5 text-[10px] font-semibold text-white">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {tab === 'private' && (
        <div className="shrink-0 border-b border-neutral-800 p-3">
          <div className="flex gap-2">
            <input
              value={dmName}
              onChange={(e) => setDmName(e.target.value)}
              placeholder="Callsign"
              className="min-w-0 flex-1 rounded border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-100 focus:border-orange-600 focus:outline-none"
            />
            <button
              onClick={() => {
                const name = dmName.trim();
                if (name) {
                  setDmName('');
                  void openDm(name);
                }
              }}
              className="shrink-0 rounded bg-orange-600 px-3 py-1.5 text-sm font-semibold text-white"
            >
              Message
            </button>
          </div>
          {(info?.threads.length ?? 0) > 0 && (
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {info!.threads.map((t) => (
                <button
                  key={t.channel}
                  onClick={() => setThread(t.channel)}
                  className={`shrink-0 rounded border px-3 py-1 text-xs transition ${
                    thread === t.channel
                      ? 'border-orange-500 text-neutral-100'
                      : 'border-neutral-700 text-neutral-400 hover:border-neutral-500'
                  }`}
                >
                  {t.other}
                  {(info!.unread[t.channel] ?? 0) > 0 && (
                    <span className="ml-1.5 rounded-full bg-orange-600 px-1.5 text-[10px] font-semibold text-white">
                      {info!.unread[t.channel]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {error && (
          <p className="mb-3 rounded border border-red-900 bg-red-950/60 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        {!channel ? (
          <p className="text-sm text-neutral-600">
            {tab === 'private'
              ? 'Type a callsign above to start a conversation.'
              : tab === 'leadership'
                ? 'Only the general and the lieutenants can see this channel.'
                : tab === 'alliance'
                  ? 'Join an alliance to use this channel.'
                  : 'You have not been deployed yet.'}
          </p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-neutral-600">Nothing yet. {TAB_BLURB[tab]}</p>
        ) : (
          <div className="space-y-3">
            {messages.map((m) => (
              <div key={m.id} className="flex gap-2">
                <button onClick={() => onViewProfile(m.author)} className="shrink-0">
                  <Portrait
                    glyph="star"
                    tint="ash"
                    src={
                      m.hasPortrait === 1
                        ? `/api/portrait?name=${encodeURIComponent(m.author)}`
                        : null
                    }
                    size={28}
                  />
                </button>
                <div className="min-w-0">
                  <p className="flex items-baseline gap-2">
                    <button
                      onClick={() => onViewProfile(m.author)}
                      className={`truncate text-sm font-semibold hover:underline ${
                        m.author === me ? 'text-orange-400' : 'text-neutral-200'
                      }`}
                    >
                      {m.author}
                    </button>
                    {m.rank && (
                      <span className="shrink-0 text-[10px] uppercase tracking-wider text-neutral-600">
                        {RANK_LABEL[m.rank]}
                      </span>
                    )}
                    <span className="shrink-0 font-mono text-[10px] text-neutral-700">
                      {timeOf(m.createdAt)}
                    </span>
                  </p>
                  <p className="break-words text-sm text-neutral-300">{m.body}</p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <form onSubmit={send} className="flex shrink-0 gap-2 border-t border-neutral-800 p-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={MESSAGE_MAX}
          disabled={!channel}
          placeholder={channel ? `Message ${TAB_LABEL[tab]}` : 'No channel'}
          className="min-w-0 flex-1 rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-orange-600 focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!channel || draft.trim() === ''}
          className="shrink-0 rounded bg-orange-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-neutral-800 disabled:text-neutral-500"
        >
          Send
        </button>
      </form>
    </div>
  );
}
