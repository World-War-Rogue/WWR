/**
 * The server's clock, kept in one place.
 *
 * Every timer in the game is drawn against the server's clock and not the
 * browser's, because a device with a wrong system time - or a deliberately
 * wrong one - must still see the right remaining time on a build job and the
 * right hour on the war schedule.
 *
 * The offset lives at module scope rather than in a hook's state for two
 * reasons. It is one fact about the session, not a fact about a component, so
 * two screens holding two copies could drift apart; and every screen that
 * fetches anything gets a `serverTime` for free, so whichever one loaded most
 * recently should be the one correcting the offset. The map refetches on every
 * camera settle, which makes it by far the most frequent corrector.
 */
import {useEffect, useState} from 'react';

import {formatClock, formatClockWithOffset} from '../../shared/gametime';

let offset = 0;
let seen = false;

/** Called by any fetch that came back with a server timestamp. */
export function noteServerTime(serverTime: number): void {
  offset = serverTime - Date.now();
  seen = true;
}

/** Now, on the server's clock. Falls back to the device until a fetch lands. */
export function serverNow(): number {
  return Date.now() + offset;
}

/** Whether the offset is real yet, for anything that would rather show nothing. */
export function clockSynced(): boolean {
  return seen;
}

/**
 * Re-renders once a second and hands back the server's clock.
 *
 * The interval is aligned to the next whole second of SERVER time rather than
 * being a flat 1000ms from mount, so the digits change when the minute actually
 * turns instead of up to a second late.
 */
export function useServerClock(): number {
  const [now, setNow] = useState(() => serverNow());

  useEffect(() => {
    let timer = 0;
    const tick = () => {
      const t = serverNow();
      setNow(t);
      timer = window.setTimeout(tick, 1000 - (t % 1000));
    };
    timer = window.setTimeout(tick, 1000 - (serverNow() % 1000));
    return () => window.clearTimeout(timer);
  }, []);

  return now;
}

export {formatClock, formatClockWithOffset};
