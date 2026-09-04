/**
 * Chat channels.
 *
 * Shared so the client and the Worker build the same channel strings. A tab
 * that asks for a key the server does not recognise is a tab that silently
 * shows nothing.
 */

export const CHAT_TABS = ['server', 'alliance', 'leadership', 'private'] as const;
export type ChatTab = (typeof CHAT_TABS)[number];

export const TAB_LABEL: Record<ChatTab, string> = {
  server: 'Server',
  alliance: 'Alliance',
  leadership: 'Leadership',
  private: 'Private',
};

export const TAB_BLURB: Record<ChatTab, string> = {
  server: 'Everyone on your server.',
  alliance: 'Everyone in your alliance.',
  leadership: 'The general and the lieutenants.',
  private: 'One player, one conversation.',
};

export const MESSAGE_MAX = 400;

/** How long messages are kept. Old chat is noise nobody scrolls back to. */
export const RETENTION_DAYS = 14;

export const serverChannel = (worldId: number) => `server:${worldId}`;
export const allianceChannel = (allianceId: string) => `alliance:${allianceId}`;
export const leadershipChannel = (allianceId: string) => `leadership:${allianceId}`;

/**
 * The channel for a private conversation.
 *
 * Ids are sorted before joining, so both people compute the same string and a
 * conversation cannot exist twice with the halves reversed - which is the bug
 * where you reply and they never see it.
 */
export function dmChannel(a: string, b: string): string {
  return a < b ? `dm:${a}|${b}` : `dm:${b}|${a}`;
}

export function dmOther(channel: string, me: string): string | null {
  if (!channel.startsWith('dm:')) return null;
  const [a, b] = channel.slice(3).split('|');
  if (a === me) return b;
  if (b === me) return a;
  return null;
}

/** Strips control characters, including the newlines that would break a line. */
export function flattenMessage(text: string): string {
  let out = '';
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    out += code < 0x20 || code === 0x7f ? ' ' : ch;
  }
  return out.replace(/\s+/g, ' ').trim();
}

/* -------------------------------------------------------------------------- */
/* Groups                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * People in one group conversation.
 *
 * Twenty is small enough that everybody in it still knows who everybody is,
 * which is the difference between a group chat and a channel. Past that it
 * stops being a conversation and becomes an audience, and the alliance channel
 * already exists for that.
 */
export const GROUP_CAPACITY = 20;

export const GROUP_NAME_MAX = 32;

export const groupChannel = (groupId: string) => `group:${groupId}`;

export function isGroupChannel(channel: string): boolean {
  return channel.startsWith('group:');
}

export function groupIdOf(channel: string): string | null {
  return channel.startsWith('group:') ? channel.slice('group:'.length) : null;
}

/* -------------------------------------------------------------------------- */
/* Translation                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Languages a player can choose to read in.
 *
 * Deliberately a list rather than anything the browser reports. A player who
 * lives abroad usually wants their own language, not the one their laptop was
 * bought in, and this is the field that decides whether they can follow a
 * conversation at all.
 */
export const LANGUAGES: Array<{code: string; name: string}> = [
  {code: 'en', name: 'English'},
  {code: 'es', name: 'Espanol'},
  {code: 'pt', name: 'Portugues'},
  {code: 'fr', name: 'Francais'},
  {code: 'de', name: 'Deutsch'},
  {code: 'it', name: 'Italiano'},
  {code: 'nl', name: 'Nederlands'},
  {code: 'pl', name: 'Polski'},
  {code: 'ru', name: 'Russkiy'},
  {code: 'uk', name: 'Ukrainska'},
  {code: 'tr', name: 'Turkce'},
  {code: 'ar', name: 'Arabic'},
  {code: 'he', name: 'Hebrew'},
  {code: 'hi', name: 'Hindi'},
  {code: 'zh', name: 'Chinese'},
  {code: 'ja', name: 'Japanese'},
  {code: 'ko', name: 'Korean'},
  {code: 'vi', name: 'Tieng Viet'},
  {code: 'th', name: 'Thai'},
  {code: 'id', name: 'Bahasa Indonesia'},
];

export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code);

export function isLanguage(code: unknown): code is string {
  return typeof code === 'string' && LANGUAGE_CODES.includes(code);
}

export function languageName(code: string): string {
  return LANGUAGES.find((l) => l.code === code)?.name ?? code;
}
