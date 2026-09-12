/**
 * Interface language.
 *
 * Chat translation goes through a model because a message is written once, by
 * a person, and cannot be known in advance. The interface is the opposite: it
 * is a fixed set of strings that changes only when we change it, so it is
 * translated ONCE at build time and shipped as data.
 *
 * That difference matters more than it looks. Runtime translation of UI text
 * would be slow on first visit in each language, would cost per string per
 * language forever, and would translate badly - "Lift", "Screen", "Breach" and
 * "Range" are ordinary English words with specific meanings here, and a model
 * given one of them with no context will pick the wrong one. A committed
 * dictionary can be corrected by hand when it does.
 *
 * Rollout is screen by screen. A key that has no translation falls back to its
 * English source, so a half-converted interface is a mixed one rather than a
 * broken one, and there is never a moment where this has to land all at once.
 */
import {LANGUAGE_CODES} from '../../shared/chat';
import {EN} from './en';
import {TRANSLATIONS} from './generated';

export type MessageKey = keyof typeof EN;

/**
 * The language the interface is drawn in.
 *
 * Held in a module variable rather than React context on purpose: `t` is
 * called from canvas drawing code and from plain functions that have no
 * component around them, and threading a context through those would mean
 * rewriting them to be hooks for no benefit.
 */
let current = 'en';

export function setLanguage(code: string): void {
  current = LANGUAGE_CODES.includes(code) ? code : 'en';
}

export function language(): string {
  return current;
}

/**
 * One string, in the current language.
 *
 * Falls back to English, which is the source text, so a missing translation
 * shows the real sentence rather than a key. A player seeing one English line
 * among their own language has lost nothing; a player seeing `base.upgrade`
 * has lost the button.
 */
export function t(key: MessageKey, vars?: Record<string, string | number>): string {
  const table = TRANSLATIONS[current as keyof typeof TRANSLATIONS] as
    | Record<string, string>
    | undefined;
  let text = table?.[key] ?? EN[key];

  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.split(`{${name}}`).join(String(value));
    }
  }
  return text;
}

/** How many of the interface's strings exist in a language. For the picker. */
export function coverage(code: string): number {
  const table = TRANSLATIONS[code as keyof typeof TRANSLATIONS] as
    | Record<string, string>
    | undefined;
  if (code === 'en') return 1;
  if (!table) return 0;
  const keys = Object.keys(EN);
  return keys.filter((k) => typeof table[k] === 'string' && table[k].length > 0).length / keys.length;
}
