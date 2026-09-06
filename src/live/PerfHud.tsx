/**
 * The frame-time readout. Only rendered when `?perf=1` has been visited.
 *
 * Three numbers, because three is what you can read at a glance while holding a
 * phone in the other hand:
 *
 *   ms    mean cost of a paint
 *   max   the worst paint in the last ninety, which is the one that is felt
 *   /s    paints per second - NOT the display refresh rate
 *
 * The map deliberately does not repaint when nothing is moving, so a low `/s`
 * on a still map is correct and not a problem. The number to watch is `max`:
 * anything over about 16ms means a gesture will visibly stutter on that device.
 */
import {useEffect, useState} from 'react';

import {readPerf} from './perf';

export function PerfHud() {
  const [, force] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => force((n) => (n + 1) % 1000), 500);
    return () => window.clearInterval(id);
  }, []);

  const r = readPerf();
  const hot = r.worst > 16;

  return (
    <div className="pointer-events-none rounded border border-neutral-800 bg-black/80 px-2 py-1 font-mono text-[10px] leading-tight text-neutral-400 backdrop-blur">
      <div>
        <span className="text-neutral-600">ms </span>
        {r.mean.toFixed(1)}
      </div>
      <div className={hot ? 'text-amber-400' : undefined}>
        <span className="text-neutral-600">max </span>
        {r.worst.toFixed(1)}
      </div>
      <div>
        <span className="text-neutral-600">/s </span>
        {r.rate.toFixed(0)}
      </div>
    </div>
  );
}
