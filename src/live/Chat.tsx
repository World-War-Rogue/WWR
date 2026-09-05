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
import {CHAT_TABS, type ChatTab, MESSAGE_MAX} from '../../shared/chat';
import {RANK_KEY} from './ranks';
import {
  GROUP_NAME_MAX,
  groupIdOf,
  mentionQueryAt,
  rankMentions,
  replySnippet,
} from '../../shared/chat';
import {
  ApiError,
  type ChatChannels,
  type ChatMessage,
  type PendingMention,
  api,
} from '../net/api';
import {type MessageKey, t} from '../i18n';
import {Portrait} from './Profile';

/**
 * The tab names and the line that says who is in each channel.
 *
 * The English is in TAB_LABEL and TAB_BLURB, in shared/chat.ts, where the
 * Worker can read it too - and the Worker has no interface language to draw
 * in. So the screen keeps its own map from tab to message key and asks `t`,
 * rather than rendering the shared strings.
 */
const TAB_LABEL_KEY: Record<ChatTab, MessageKey> = {
  server: 'chat.server',
  alliance: 'chat.alliance',
  leadership: 'chat.leadership',
  private: 'chat.private',
};

const TAB_BLURB_KEY: Record<ChatTab, MessageKey> = {
  server: 'chat.serverBlurb',
  alliance: 'chat.allianceBlurb',
  leadership: 'chat.leadershipBlurb',
  private: 'chat.privateBlurb',
};

/**
 * Split a message so callsigns can be picked out of it.
 *
 * Done at render rather than stored as markup, because the message body is
 * player-authored text and the one thing it must never become is markup. The
 * pieces are returned as data and React puts them in the DOM as text.
 */
function withMentions(body: string, me: string): Array<{text: string; mention: boolean; self: boolean}> {
  const out: Array<{text: string; mention: boolean; self: boolean}> = [];
  const re = /(^|[^A-Za-z0-9_-])@([A-Za-z0-9_-]{2,24})/g;
  let last = 0;
  for (const m of body.matchAll(re)) {
    const at = (m.index ?? 0) + m[1].length;
    if (at > last) out.push({text: body.slice(last, at), mention: false, self: false});
    out.push({
      text: `@${m[2]}`,
      mention: true,
      self: m[2].toLowerCase() === me.toLowerCase(),
    });
    last = at + m[2].length + 1;
  }
  if (last < body.length) out.push({text: body.slice(last), mention: false, self: false});
  return out;
}

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
  const [groupName, setGroupName] = useState('');
  const [addName, setAddName] = useState('');

  /** The message being answered, held until it is sent or dismissed. */
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  /** Callsigns that can be named here, fetched per channel and cached. */
  const [mentionable, setMentionable] = useState<string[]>([]);
  const [mentionQuery, setMentionQuery] = useState<{query: string; start: number} | null>(null);
  const [mentionPick, setMentionPick] = useState(0);
  /** Mentions of me I have not looked at yet. */
  const [mentions, setMentions] = useState<PendingMention[]>([]);
  /** A message to scroll to and flash, set when jumping from a mention. */
  const [jumpTo, setJumpTo] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const messageRefs = useRef(new Map<string, HTMLDivElement>());

  const sinceRef = useRef<number | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // The channel the bar previews when closed: whichever was last open.
  // Remembered rather than derived, because the point of the bar is to keep an
  // eye on the conversation you were actually in.
  const [lastChannel, setLastChannel] = useState<string | null>(null);

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

  // Switching channel starts the history again, and drops whatever was half
  // typed. Carrying a draft across is how a message meant for your alliance
  // gets sent to a stranger, and there is no undo for that.
  useEffect(() => {
    sinceRef.current = null;
    setMessages([]);
    setDraft('');
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
          setError(err instanceof ApiError ? err.message : t('chat.unreachable'));
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

  useEffect(() => {
    if (channel) setLastChannel(channel);
  }, [channel]);

  // The roster for autocomplete, per channel. Fetched when the channel opens
  // rather than on each `@`, so the menu appears the instant it is typed - a
  // dropdown that arrives after the next keystroke is worse than none.
  useEffect(() => {
    if (!channel) {
      setMentionable([]);
      return;
    }
    let live = true;
    api
      .chatMentionable(channel)
      .then((r) => {
        if (live) setMentionable(r.names);
      })
      .catch(() => {
        if (live) setMentionable([]);
      });
    return () => {
      live = false;
    };
  }, [channel]);

  // A reply and a half-typed mention both belong to the channel they started
  // in. Carrying either across would attach an answer to the wrong
  // conversation, which is the exact confusion replies exist to end.
  useEffect(() => {
    setReplyTo(null);
    setMentionQuery(null);
  }, [channel]);

  // Poll for mentions of me. Slower than the channel poll: the badge is a
  // nudge, not a conversation, and it keeps running while chat is shut.
  useEffect(() => {
    const pull = () =>
      api
        .chatMentions()
        .then((r) => setMentions(r.mentions))
        .catch(() => undefined);
    void pull();
    const id = window.setInterval(pull, open ? OPEN_POLL_MS * 2 : IDLE_POLL_MS);
    return () => window.clearInterval(id);
  }, [open]);

  // Scroll a jumped-to message into view once it is on screen, and flash it.
  // Without the flash, a jump into a busy channel lands you somewhere with no
  // indication of which line you were sent to look at.
  useEffect(() => {
    if (!jumpTo) return;
    const node = messageRefs.current.get(jumpTo);
    if (!node) return;
    node.scrollIntoView({block: 'center', behavior: 'smooth'});
    const id = window.setTimeout(() => setJumpTo(null), 2200);
    return () => window.clearTimeout(id);
  }, [jumpTo, messages]);

  const suggestions = mentionQuery === null ? [] : rankMentions(mentionable, mentionQuery.query);

  /** Put the highlighted callsign into the draft, replacing what was typed. */
  function completeMention(name: string) {
    if (!mentionQuery) return;
    const caretNow = inputRef.current?.selectionStart ?? draft.length;
    const before = draft.slice(0, mentionQuery.start);
    const after = draft.slice(caretNow);
    setDraft(`${before}@${name} ${after}`);
    setMentionQuery(null);
    setMentionPick(0);
    // Caret goes after the name just inserted, not to the end of the line -
    // people name somebody in the middle of a sentence.
    const caret = before.length + name.length + 2;
    window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(caret, caret);
    }, 0);
  }

  /** Open a mention: switch to its channel and scroll to the line. */
  function goToMention(m: PendingMention) {
    setOpen(true);
    setMentions((current) => current.filter((x) => x.messageId !== m.messageId));
    if (m.channel.startsWith('server:')) setTab('server');
    else if (m.channel.startsWith('alliance:')) setTab('alliance');
    else if (m.channel.startsWith('leadership:')) setTab('leadership');
    else {
      setTab('private');
      setThread(m.channel);
    }
    setJumpTo(m.messageId);
  }

  async function send(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!channel || text === '') return;
    setDraft('');
    const answering = replyTo;
    setReplyTo(null);
    setMentionQuery(null);
    try {
      await api.chatSend(channel, text, answering?.id ?? null);
      const result = await api.chatRead(channel, sinceRef.current ?? undefined);
      sinceRef.current = result.serverTime;
      if (result.messages.length > 0) {
        setMessages((current) => [...current, ...result.messages].slice(-300));
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('chat.didNotSend'));
      setDraft(text);
      setReplyTo(answering);
    }
  }

  async function openDm(username: string) {
    try {
      const result = await api.chatOpenDm(username);
      setTab('private');
      setThread(result.channel);
      await loadChannels();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('chat.couldNotOpen'));
    }
  }

  const totalUnread = Object.values<number>(info?.unread ?? {}).reduce((a, b) => a + b, 0);

  // On the Private tab with nothing selected, the tab IS the list - the
  // conversation and its composer have nothing to be about yet.
  const showConversation = !(tab === 'private' && thread === null);

  if (!open) {
    // The bar previews the channel you were last in, not the one you last
    // spoke in. Somebody watching a conversation wants to see it continue,
    // whether or not they are the one talking.
    const preview = lastChannel
      ? info?.latest[lastChannel] ?? null
      : info?.latest[info?.channels.server ?? ''] ?? null;

    // Being named is not the same as having unread messages, so it does not
    // share the unread badge. A player can have forty unread lines they do not
    // care about and one that was aimed at them, and the second is the only
    // one worth interrupting them for - so it gets its own row above the bar,
    // and pressing it goes straight to the line rather than to the channel.
    const newest = mentions[0];

    return (
      <div className="fixed inset-x-0 bottom-0 z-40">
        {newest && (
          <button
            onClick={() => goToMention(newest)}
            className="flex w-full items-center gap-2 border-t border-orange-800 bg-orange-950/90 px-4 py-2 text-left backdrop-blur"
          >
            <span className="shrink-0 rounded bg-orange-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
              @
            </span>
            <span className="min-w-0 flex-1 truncate text-xs">
              <span className="font-semibold text-orange-200">{newest.author}</span>
              <span className="text-orange-300/70"> {newest.body}</span>
            </span>
            {mentions.length > 1 && (
              <span className="shrink-0 text-[10px] text-orange-400/70">
                +{mentions.length - 1}
              </span>
            )}
          </button>
        )}

        <button
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-3 border-t border-neutral-800 bg-neutral-950/95 px-4 py-3 text-left backdrop-blur"
        >
          <span className="min-w-0 flex-1 truncate text-sm">
            {preview ? (
              <>
                <span className="font-semibold text-neutral-300">{preview.author}</span>
                <span className="text-neutral-500"> {preview.body}</span>
              </>
            ) : (
              <span className="text-neutral-600">{t('chat.comms')}</span>
            )}
          </span>
          {totalUnread > 0 && (
            <span className="shrink-0 rounded-full bg-orange-600 px-2 py-0.5 text-xs font-semibold text-white">
              {totalUnread}
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-neutral-950">
      <header className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
        <p className="text-xs uppercase tracking-[0.3em] text-orange-500">{t('chat.comms')}</p>
        {mentions.length > 0 && (
          <button
            onClick={() => goToMention(mentions[0])}
            className="rounded border border-orange-700 bg-orange-950/60 px-2 py-1 text-xs font-semibold text-orange-200"
          >
            @{mentions.length}
          </button>
        )}
        <button
          onClick={() => setOpen(false)}
          className="rounded border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:border-orange-600"
        >
          {t('nav.close')}
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
              title={available ? t(TAB_BLURB_KEY[key]) : t('chat.tabLocked')}
              className={`flex-1 border-b-2 px-2 py-2 text-sm transition ${
                tab === key
                  ? 'border-orange-500 text-neutral-100'
                  : 'border-transparent text-neutral-500 hover:text-neutral-300'
              } disabled:text-neutral-700`}
            >
              {t(TAB_LABEL_KEY[key])}
              {count > 0 && (
                <span className="ml-1.5 rounded-full bg-orange-600 px-1.5 text-[10px] font-semibold text-white">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {tab === 'private' && thread === null && (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="border-b border-neutral-800 p-3">
            <div className="flex gap-2">
              <input
                value={dmName}
                onChange={(e) => setDmName(e.target.value)}
                placeholder={t('chat.callsign')}
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
                {t('chat.startDm')}
              </button>
            </div>
            <div className="mt-2 flex gap-2">
              <input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                maxLength={GROUP_NAME_MAX}
                placeholder={t('chat.newGroupName')}
                className="min-w-0 flex-1 rounded border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-100 focus:border-orange-600 focus:outline-none"
              />
              <button
                onClick={() => {
                  const name = groupName.trim();
                  if (name.length < 2) return;
                  setGroupName('');
                  api
                    .chatCreateGroup(name)
                    .then((g) => {
                      setThread(g.channel);
                      return loadChannels();
                    })
                    .catch((err) =>
                      setError(
                        err instanceof ApiError ? err.message : t('chat.couldNotStartGroup'),
                      ),
                    );
                }}
                className="shrink-0 rounded border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:border-orange-600"
              >
                {t('chat.newGroup')}
              </button>
            </div>
          </div>

          {error && (
            <p className="m-3 rounded border border-red-900 bg-red-950/60 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          {(info?.groups.length ?? 0) > 0 && (
            <ul className="divide-y divide-neutral-900 border-b border-neutral-900">
              {info!.groups.map((g) => {
                const last = info!.latest[g.channel];
                const unread = info!.unread[g.channel] ?? 0;
                return (
                  <li key={g.channel}>
                    <button
                      onClick={() => setThread(g.channel)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-neutral-900/60"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-neutral-700 bg-neutral-900 text-xs font-semibold text-neutral-400">
                        {g.members}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-neutral-100">
                            {g.name}
                          </span>
                          {last && (
                            <span className="shrink-0 font-mono text-[10px] text-neutral-700">
                              {timeOf(last.createdAt)}
                            </span>
                          )}
                        </span>
                        <span className="block truncate text-xs text-neutral-500">
                          {last ? `${last.author}: ${last.body}` : t('chat.noMessagesYet')}
                        </span>
                      </span>
                      {unread > 0 && (
                        <span className="shrink-0 rounded-full bg-orange-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                          {unread}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {(info?.threads.length ?? 0) === 0 ? (
            <p className="p-4 text-sm text-neutral-600">{t('chat.noConversations')}</p>
          ) : (
            <ul className="divide-y divide-neutral-900">
              {info!.threads.map((t) => {
                const last = info!.latest[t.channel];
                const unread = info!.unread[t.channel] ?? 0;
                return (
                  <li key={t.channel}>
                    <button
                      onClick={() => setThread(t.channel)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-neutral-900/60"
                    >
                      <Portrait
                        glyph="star"
                        tint="ash"
                        src={`/api/portrait?name=${encodeURIComponent(t.other)}`}
                        size={36}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-neutral-100">
                            {t.other}
                          </span>
                          {last && (
                            <span className="shrink-0 font-mono text-[10px] text-neutral-700">
                              {timeOf(last.createdAt)}
                            </span>
                          )}
                        </span>
                        <span className="block truncate text-xs text-neutral-500">
                          {last ? `${last.author}: ${last.body}` : t('chat.noMessagesYet')}
                        </span>
                      </span>
                      {unread > 0 && (
                        <span className="shrink-0 rounded-full bg-orange-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                          {unread}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {tab === 'private' && thread !== null && (
        <div className="shrink-0 border-b border-neutral-800">
          <button
            onClick={() => setThread(null)}
            className="px-4 py-2 text-left text-xs text-neutral-400 hover:text-neutral-200"
          >
            &larr; {t('chat.allConversations')}
          </button>

          {groupIdOf(thread) && (
            <div className="flex items-center gap-2 px-4 pb-3">
              <input
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder={t('chat.addCallsign')}
                className="min-w-0 flex-1 rounded border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-100 focus:border-orange-600 focus:outline-none"
              />
              <button
                onClick={() => {
                  const id = groupIdOf(thread);
                  const name = addName.trim();
                  if (!id || !name) return;
                  setAddName('');
                  api
                    .chatAddToGroup(id, name)
                    .then(setInfo)
                    .catch((err) =>
                      setError(err instanceof ApiError ? err.message : t('chat.couldNotAdd')),
                    );
                }}
                className="shrink-0 rounded border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:border-orange-600"
              >
                {t('chat.add')}
              </button>
              <button
                onClick={() => {
                  const id = groupIdOf(thread);
                  if (!id) return;
                  if (!window.confirm(t('chat.leaveConfirm'))) return;
                  api
                    .chatLeaveGroup(id)
                    .then((next) => {
                      setInfo(next);
                      setThread(null);
                    })
                    .catch(() => setError(t('chat.couldNotLeave')));
                }}
                className="shrink-0 rounded border border-red-900 px-3 py-1.5 text-sm text-red-300"
              >
                {t('chat.leave')}
              </button>
            </div>
          )}
        </div>
      )}

      {showConversation && (
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {error && (
          <p className="mb-3 rounded border border-red-900 bg-red-950/60 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        {!channel ? (
          <p className="text-sm text-neutral-600">
            {tab === 'private'
              ? t('chat.startPrivateHint')
              : tab === 'leadership'
                ? t('chat.leadershipOnly')
                : tab === 'alliance'
                  ? t('chat.allianceOnly')
                  : t('chat.notDeployed')}
          </p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-neutral-600">
            {t('chat.emptyChannel', {about: t(TAB_BLURB_KEY[tab])})}
          </p>
        ) : (
          <div className="space-y-3">
            {messages.map((m) => (
              <div
                key={m.id}
                ref={(node) => {
                  if (node) messageRefs.current.set(m.id, node);
                  else messageRefs.current.delete(m.id);
                }}
                className={`flex gap-2 rounded transition-colors duration-700 ${
                  jumpTo === m.id ? 'bg-orange-950/50 ring-1 ring-orange-700' : ''
                }`}
              >
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
                        {t(RANK_KEY[m.rank])}
                      </span>
                    )}
                    <span className="shrink-0 font-mono text-[10px] text-neutral-700">
                      {timeOf(m.createdAt)}
                    </span>
                  </p>
                  {/*
                    What this answers, above the answer. A quote is the only
                    way a channel with three conversations in it stays
                    readable, and it is clickable because the next thing you
                    want is the line it came from.
                  */}
                  {m.replyTo && (
                    <button
                      onClick={() => m.replyTo && setJumpTo(m.replyTo)}
                      className="mb-1 flex w-full min-w-0 gap-1.5 border-l-2 border-neutral-700 pl-2 text-left hover:border-orange-600"
                    >
                      <span className="shrink-0 text-[11px] font-semibold text-neutral-500">
                        {m.replyAuthor ?? t('chat.someone')}
                      </span>
                      <span className="min-w-0 truncate text-[11px] text-neutral-600">
                        {m.replyBody ? replySnippet(m.replyBody) : t('chat.messageRemoved')}
                      </span>
                    </button>
                  )}

                  <p className="break-words text-sm text-neutral-300">
                    {withMentions(m.body, me).map((part, i) =>
                      part.mention ? (
                        <span
                          key={i}
                          className={
                            part.self
                              ? 'rounded bg-orange-600/30 px-1 font-semibold text-orange-200'
                              : 'font-semibold text-sky-400'
                          }
                        >
                          {part.text}
                        </span>
                      ) : (
                        <span key={i}>{part.text}</span>
                      ),
                    )}
                  </p>
                  {m.translated && (
                    // The original stays above. A translation that replaced it
                    // would hide the fact that a machine guessed, and a player
                    // who speaks a little of the language could not check it.
                    <p className="mt-0.5 flex gap-1.5 break-words text-sm text-sky-300/80">
                      <span className="shrink-0 select-none text-[10px] uppercase tracking-wider text-neutral-600">
                        {m.lang}
                      </span>
                      {m.translated}
                    </p>
                  )}

                  <button
                    onClick={() => {
                      setReplyTo(m);
                      inputRef.current?.focus();
                    }}
                    className="mt-0.5 text-[11px] text-neutral-600 hover:text-orange-400"
                  >
                    {t('chat.reply')}
                  </button>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      )}

      {showConversation && (
      <div className="relative shrink-0 border-t border-neutral-800">
        {/*
          What you are answering, held above the box until it is sent. Shown
          here rather than only on the message so it cannot be forgotten
          halfway through typing a reply to the wrong line.
        */}
        {replyTo && (
          <div className="flex items-center gap-2 border-b border-neutral-800 bg-neutral-900/60 px-3 py-1.5">
            <span className="shrink-0 text-[11px] uppercase tracking-wider text-neutral-500">
              {t('chat.replyingTo')}
            </span>
            <span className="shrink-0 text-[11px] font-semibold text-neutral-300">
              {replyTo.author}
            </span>
            <span className="min-w-0 flex-1 truncate text-[11px] text-neutral-600">
              {replySnippet(replyTo.body)}
            </span>
            <button
              onClick={() => setReplyTo(null)}
              className="shrink-0 text-neutral-500 hover:text-neutral-200"
            >
              ✕
            </button>
          </div>
        )}

        {/*
          The callsign menu. Above the box, because it is below the fold on a
          phone otherwise, and the keyboard is already covering that half.
        */}
        {suggestions.length > 0 && (
          <ul className="absolute inset-x-3 bottom-full mb-1 overflow-hidden rounded border border-neutral-700 bg-neutral-950 shadow-lg">
            {suggestions.map((name, i) => (
              <li key={name}>
                <button
                  onMouseDown={(e) => {
                    // mousedown, not click: click fires after the input has
                    // already lost focus and the caret position with it.
                    e.preventDefault();
                    completeMention(name);
                  }}
                  onMouseEnter={() => setMentionPick(i)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                    i === mentionPick ? 'bg-orange-950/60 text-orange-200' : 'text-neutral-300'
                  }`}
                >
                  <Portrait
                    glyph="star"
                    tint="ash"
                    src={`/api/portrait?name=${encodeURIComponent(name)}`}
                    size={20}
                  />
                  {name}
                </button>
              </li>
            ))}
          </ul>
        )}

      <form onSubmit={send} className="flex gap-2 p-3">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setMentionQuery(mentionQueryAt(e.target.value, e.target.selectionStart ?? 0));
            setMentionPick(0);
          }}
          onKeyDown={(e) => {
            if (suggestions.length === 0) return;
            // While the menu is open it owns these keys. Enter picking a name
            // instead of sending is the whole point of an autocomplete, and
            // letting the form see it would post a half-typed callsign.
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setMentionPick((i) => (i + 1) % suggestions.length);
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setMentionPick((i) => (i - 1 + suggestions.length) % suggestions.length);
            } else if (e.key === 'Enter' || e.key === 'Tab') {
              e.preventDefault();
              completeMention(suggestions[Math.min(mentionPick, suggestions.length - 1)]);
            } else if (e.key === 'Escape') {
              e.preventDefault();
              setMentionQuery(null);
            }
          }}
          onKeyUp={(e) => {
            // Arrow keys and clicks move the caret without changing the text,
            // so the menu has to be re-evaluated on movement too.
            const el = e.currentTarget;
            setMentionQuery(mentionQueryAt(el.value, el.selectionStart ?? 0));
          }}
          onBlur={() => setMentionQuery(null)}
          maxLength={MESSAGE_MAX}
          disabled={!channel}
          placeholder={
            channel
              ? t('chat.messagePlaceholder', {channel: t(TAB_LABEL_KEY[tab])})
              : t('chat.noChannel')
          }
          className="min-w-0 flex-1 rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-orange-600 focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!channel || draft.trim() === ''}
          className="shrink-0 rounded bg-orange-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-neutral-800 disabled:text-neutral-500"
        >
          {t('chat.send')}
        </button>
      </form>
      </div>
      )}
    </div>
  );
}
