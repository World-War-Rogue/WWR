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
      className={`font-mono tabular-nums ${className}`}
      title={`Rogue Standard Time (${CLOCK_OFFSET_LABEL})`}
    >
      {/*
        The digits are the brightest thing in the group and the labels step down
        from them. The whole clock used to sit at neutral-300 with its labels at
        500 and 600, which on a translucent black card was barely there - a
        readout you have to hunt for is a readout nobody reads.
      */}
      <span className="font-semibold text-neutral-50">{formatClock(now)}</span>
      <span className="ml-1 text-orange-400">{CLOCK_NAME}</span>
      <span className="ml-1 hidden text-neutral-400 sm:inline">({CLOCK_OFFSET_LABEL})</span>
    </span>
  );
}
