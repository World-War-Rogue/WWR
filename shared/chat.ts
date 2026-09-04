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
