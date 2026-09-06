/**
 * The game clock.
 *
 * Rogue Standard Time, UTC-7, the same digits for every player on earth. The
 * point of a fixed offset is that "20:00" means one thing when two players in
 * two countries talk about when to hit something, so this is deliberately NOT
 * the reader's local time and is labelled so nobody mistakes it for that.
 *
 * The offset is spelled out on wide screens and dropped on narrow ones, where
 * the name alone has to carry it - a phone header cannot afford eleven
 * characters that never change. Anything SCHEDULED still renders the offset in
 * full regardless of width, per the decision; that is a different call site.
 */
import {CLOCK_NAME, CLOCK_OFFSET_LABEL} from '../../shared/gametime';
import {formatClock, useServerClock} from './serverClock';

export function GameClock({className = ''}: {className?: string}) {
  const now = useServerClock();
  return (
    <span
      className={`font-mono tabular-nums text-neutral-300 ${className}`}
      title={`Rogue Standard Time (${CLOCK_OFFSET_LABEL})`}
    >
      {formatClock(now)}
      <span className="ml-1 text-neutral-500">{CLOCK_NAME}</span>
      <span className="ml-1 hidden text-neutral-600 sm:inline">({CLOCK_OFFSET_LABEL})</span>
    </span>
  );
}
