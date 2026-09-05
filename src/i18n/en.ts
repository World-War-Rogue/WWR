/**
 * The source text. English, and the only text written by hand.
 *
 * Keys are `screen.thing`, so a translator - human or model - can see roughly
 * where a string appears, which is most of the context they get. Anything with
 * a placeholder uses {braces}, never string concatenation, because word order
 * moves between languages and a sentence assembled from fragments cannot be
 * translated at all.
 *
 * ONE FILE PER SCREEN, in ./en/, composed here.
 *
 * It was a single file until the table passed a hundred and thirty keys with
 * most of the interface still unconverted. Splitting it is not tidiness: two
 * people - or two agents - converting two screens at once were editing the
 * same block of the same file, and the merge was the risky part of a job that
 * is otherwise purely mechanical. Now a screen's strings are a file nobody
 * else touches.
 *
 * `as const` on every fragment is load-bearing. It is what keeps the literal
 * key types, and MessageKey is derived from them - so a typo in a `t()` call
 * is a compile error rather than a box that renders its own key at a player.
 *
 * Adding a key here and running `npm run i18n` translates it everywhere.
 */
import {ALLIANCE} from './en/alliance';
import {ASSETS} from './en/assets';
import {BATTLES} from './en/battles';
import {CHAT} from './en/chat';
import {CORE} from './en/core';
import {CUSTOMIZE} from './en/customize';
import {GATE} from './en/gate';
import {MAP} from './en/map';
import {PROFILE} from './en/profile';
import {SETTINGS} from './en/settings';
import {SQUADS} from './en/squads';

export const EN = {
  ...CORE,
  ...GATE,
  ...MAP,
  ...CHAT,
  ...SQUADS,
  ...ASSETS,
  ...BATTLES,
  ...PROFILE,
  ...ALLIANCE,
  ...CUSTOMIZE,
  ...SETTINGS,
} as const;
