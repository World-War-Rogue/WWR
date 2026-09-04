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

/**
 * What language a message is actually written in.
 *
 * The author's stored preference is not the answer. It says what language they
 * want to READ in, and translation exists precisely for the case where somebody
 * types in something else - an English-speaking player typing Korean at a
 * Korean ally is the whole feature working. Recording the preference as the
 * message's language made that exact case untranslatable, because the message
 * claimed to already be in the reader's language.
 *
 * So the body decides. For every non-Latin script this is not a guess at all:
 * Hangul is Korean, Kana is Japanese, Thai is Thai. Those are the cases where
 * translation matters most and where the answer is certain.
 *
 * Latin script cannot be settled by characters alone, so it falls back to a
 * small set of very common function words. Those are chosen to be words that
 * are frequent, short, and rare in the other Latin languages listed here. When
 * nothing matches - a two-word message, a callsign, "gg" - the author's
 * preference is the best remaining evidence and is used.
 */

/** Scripts that identify their language outright. Order matters: Kana before Han. */
const SCRIPTS: Array<{code: string; re: RegExp}> = [
  {code: 'ko', re: /[가-힯ᄀ-ᇿ㄰-㆏]/},
  // Kana is checked before Han because Japanese text mixes both, and a
  // sentence containing kana is Japanese no matter how many kanji it holds.
  {code: 'ja', re: /[぀-ゟ゠-ヿ]/},
  {code: 'zh', re: /[一-鿿㐀-䶿]/},
  {code: 'th', re: /[฀-๿]/},
  {code: 'he', re: /[֐-׿]/},
  {code: 'ar', re: /[؀-ۿݐ-ݿ]/},
  {code: 'hi', re: /[ऀ-ॿ]/},
  // Ukrainian first: its four distinctive letters do not appear in Russian, so
  // a match is decisive, and Russian is the safe default for the rest.
  {code: 'uk', re: /[ЄІЇҐєіїґ]/},
  {code: 'ru', re: /[Ѐ-ӿ]/},
];

/** Frequent function words, weighted equally. Lowercase, matched whole. */
const LATIN_HINTS: Array<{code: string; words: string[]}> = [
  {code: 'es', words: ['que', 'los', 'las', 'una', 'por', 'para', 'pero', 'esta', 'con', 'muy']},
  {code: 'pt', words: ['nao', 'não', 'uma', 'para', 'com', 'mais', 'você', 'voce', 'isso', 'está']},
  {code: 'fr', words: ['les', 'des', 'une', 'est', 'pas', 'pour', 'que', 'avec', 'vous', 'nous']},
  {code: 'de', words: ['und', 'ich', 'nicht', 'das', 'ist', 'wir', 'auch', 'aber', 'wird', 'sind']},
  {code: 'it', words: ['che', 'non', 'per', 'una', 'sono', 'con', 'della', 'anche', 'come', 'più']},
  {code: 'nl', words: ['het', 'een', 'niet', 'van', 'zijn', 'maar', 'ook', 'wij', 'heeft', 'naar']},
  {code: 'pl', words: ['nie', 'jest', 'sie', 'się', 'jak', 'tak', 'przez', 'tylko', 'juz', 'już']},
  {code: 'tr', words: ['bir', 'için', 'icin', 'ile', 'daha', 'ama', 'çok', 'cok', 'var', 'bu']},
  {code: 'vi', words: ['không', 'khong', 'được', 'duoc', 'các', 'cac', 'này', 'nay', 'trong', 'và']},
  {code: 'id', words: ['yang', 'tidak', 'dengan', 'untuk', 'ini', 'itu', 'dari', 'akan', 'ada', 'saya']},
  {code: 'en', words: ['the', 'and', 'you', 'for', 'are', 'with', 'this', 'that', 'have', 'not']},
];

/**
 * The language, when the writing system settles it outright.
 *
 * Authoritative: nobody types Hangul by accident. This is the only detection
 * good enough to overrule a stored value, which is why it is separate from the
 * guessing below - a weak guess that overwrites a good answer is worse than no
 * guess at all.
 */
export function detectByScript(body: string): string | null {
  for (const script of SCRIPTS) {
    if (script.re.test(body)) return script.code;
  }
  return null;
}

/**
 * The instant, free guess. Right for every non-Latin script and unreliable for
 * Latin ones, where it is only ever a placeholder until the model answers.
 *
 * Word lists cannot carry this on their own. "Hola, vamos a atacar al
 * amanecer" contains no Spanish function word short enough to be worth listing,
 * and chat messages are mostly that short - which is exactly how a Spanish
 * message came through labelled English.
 */
export function detectLanguage(body: string, fallback: string): string {
  const text = body.trim();
  if (text.length === 0) return fallback;

  const script = detectByScript(text);
  if (script) return script;

  // Nothing here is written in the fallback's script, so the fallback is
  // wrong however little else we know. Korean cannot be typed in ASCII, and
  // labelling "hey server 1001" as Korean is worse than labelling it nothing:
  // the translator would be handed English, told it was Korean, and would
  // return something confidently meaningless.
  const latinFallback = SCRIPTS.some((script) => script.code === fallback) ? 'en' : fallback;

  const words = text.toLowerCase().split(/[^\p{L}\p{M}]+/u).filter(Boolean);
  if (words.length === 0) return latinFallback;

  let best = latinFallback;
  let bestScore = 0;
  for (const hint of LATIN_HINTS) {
    let score = 0;
    for (const word of words) if (hint.words.includes(word)) score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = hint.code;
    }
  }

  // One matching word out of a long message is noise, not evidence. Short
  // messages are the common case in chat, so the bar is one hit for a handful
  // of words and two once there is enough text to have found them by accident.
  const needed = words.length > 8 ? 2 : 1;
  return bestScore >= needed ? best : latinFallback;
}

/* -------------------------------------------------------------------------- */
/* Mentions                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Callsigns named in a message.
 *
 * The pattern deliberately stops at the characters a callsign may contain.
 * Being greedier would swallow the punctuation after a name - "@BatKat," would
 * look up a player called "BatKat," and quietly match nobody - and being
 * stricter about word boundaries would break "(@BatKat)".
 *
 * Returns them lowercased and deduplicated. Matching is case-insensitive
 * because nobody types a callsign's capitalisation correctly under pressure,
 * and that is exactly when people are being called.
 */
export const MENTION_PATTERN = /(^|[^A-Za-z0-9_-])@([A-Za-z0-9_-]{2,24})/g;

export function mentionsIn(body: string): string[] {
  const found = new Set<string>();
  for (const match of body.matchAll(MENTION_PATTERN)) {
    found.add(match[2].toLowerCase());
  }
  return [...found];
}

/**
 * The partial callsign being typed at the caret, or null.
 *
 * Only looks at the run immediately before the caret and gives up the moment
 * it sees whitespace, so an `@` earlier in the line does not keep the
 * autocomplete open for the rest of the message. An empty run counts - typing
 * a bare `@` should open the list, not wait for a first letter.
 */
export function mentionQueryAt(text: string, caret: number): {query: string; start: number} | null {
  let i = caret - 1;
  while (i >= 0) {
    const ch = text[i];
    if (ch === '@') {
      // An address only starts a mention at the start of a line or after
      // whitespace, so an email address does not open the menu mid-word.
      const before = i > 0 ? text[i - 1] : ' ';
      if (!/\s/.test(before) && i !== 0) return null;
      return {query: text.slice(i + 1, caret).toLowerCase(), start: i};
    }
    if (!/[A-Za-z0-9_-]/.test(ch)) return null;
    if (caret - i > 25) return null;
    i -= 1;
  }
  return null;
}

/** How many names the autocomplete offers at once. */
export const MENTION_SUGGESTIONS = 6;

/**
 * Rank the candidates for a partial callsign.
 *
 * Prefix matches come before contained matches, because somebody typing "bat"
 * means BatKat far more often than they mean CombatEngineer, and within each
 * group the shorter name wins - it is the one they finished typing.
 */
export function rankMentions(candidates: string[], query: string): string[] {
  if (!query) return candidates.slice(0, MENTION_SUGGESTIONS);
  const q = query.toLowerCase();
  const scored: Array<{name: string; rank: number}> = [];
  for (const name of candidates) {
    const lower = name.toLowerCase();
    if (lower.startsWith(q)) scored.push({name, rank: 0});
    else if (lower.includes(q)) scored.push({name, rank: 1});
  }
  scored.sort((a, b) => a.rank - b.rank || a.name.length - b.name.length || a.name.localeCompare(b.name));
  return scored.slice(0, MENTION_SUGGESTIONS).map((s) => s.name);
}

/** The quoted line shown above a reply. Long enough to identify, short enough to skim. */
export const REPLY_SNIPPET_MAX = 90;

export function replySnippet(body: string): string {
  const flat = flattenMessage(body);
  return flat.length <= REPLY_SNIPPET_MAX ? flat : `${flat.slice(0, REPLY_SNIPPET_MAX - 1)}…`;
}
