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
 *
 * ONE LANGUAGE PER DOWNLOAD. The dictionaries live in generated/<code>.json
 * and each is its own chunk, fetched the first time that language is chosen.
 * Shipping all of them in the entry bundle was 337 KB of source - the largest
 * single thing a player downloaded - for twenty-one languages they would never
 * read. English is inline; it is the source text and the fallback.
 */
import {LANGUAGE_CODES} from '../../shared/chat';
import {EN} from './en';
import COVERAGE from './coverage.json';

export type MessageKey = keyof typeof EN;

type Table = Record<string, string>;

/** Every dictionary, as a lazy loader keyed by its path. Vite splits each into a chunk. */
const LOADERS = import.meta.glob<{default: Table}>('./generated/*.json');

const loaded = new Map<string, Table>();
const listeners = new Set<() => void>();

/**
 * The language the interface is drawn in.
 *
 * Held in a module variable rather than React context on purpose: `t` is
 * called from canvas drawing code and from plain functions that have no
 * component around them, and threading a context through those would mean
 * rewriting them to be hooks for no benefit.
 */
let current = 'en';

/**
 * Switch language. Resolves once the dictionary is in memory; until then `t`
 * answers in English, and subscribers are told when the words change so a
 * screen already drawn re-draws in the new language.
 */
export async function setLanguage(code: string): Promise<void> {
  current = LANGUAGE_CODES.includes(code) ? code : 'en';
  if (current !== 'en' && !loaded.has(current)) {
    const load = LOADERS[`./generated/${current}.json`];
    if (load) {
      try {
        loaded.set(current, (await load()).default);
      } catch {
        // Offline, or the chunk failed: English stays up. Nothing is lost.
      }
    }
  }
  for (const fn of listeners) fn();
}

/** Called after a language finishes loading or changes. Returns the unsubscribe. */
export function onLanguageChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
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
  const table = current === 'en' ? undefined : loaded.get(current);
  let text = table?.[key] ?? EN[key];

  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.split(`{${name}}`).join(String(value));
    }
  }
  return text;
}

/**
 * How many of the interface's strings exist in a language. For the picker.
 * Read from a generated count so describing a language never downloads it.
 */
export function coverage(code: string): number {
  if (code === 'en') return 1;
  const n = (COVERAGE as Record<string, number>)[code] ?? 0;
  return n / Object.keys(EN).length;
}
