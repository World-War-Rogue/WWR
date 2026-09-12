/**
 * A frame-time readout, for checking graphics and speed on a real device.
 *
 * A tester on a phone cannot open a console, and "it feels a bit slow" is not a
 * number anybody can act on. This turns it into one: how long the map spends
 * painting, and how often it manages to.
 *
 * Turned on by visiting `?perf=1` and off by `?perf=0`. The choice is kept in
 * localStorage because an installed PWA launches at `start_url` and would drop
 * the query string on every cold start otherwise - a tester would have to open
 * the browser, add the parameter, and lose the thing they were testing.
 *
 * Off by default and free when off: `note()` returns on the first line.
 */
const KEY = 'wwr.perf';

let enabled = false;
try {
  const param = new URLSearchParams(window.location.search).get('perf');
  if (param === '1' || param === '0') {
    enabled = param === '1';
    window.localStorage.setItem(KEY, param);
  } else {
    enabled = window.localStorage.getItem(KEY) === '1';
  }
} catch {
  // Private windows and locked-down browsers throw on both accessors. A missing
  // readout is not worth a blank screen.
  enabled = false;
}

export function perfEnabled(): boolean {
  return enabled;
}

/** The last 90 paints: how long each took, and when it happened. */
const cost: number[] = [];
const at: number[] = [];
const KEEP = 90;

export function notePaint(ms: number, when: number): void {
  if (!enabled) return;
  cost.push(ms);
  at.push(when);
  if (cost.length > KEEP) {
    cost.shift();
    at.shift();
  }
}

export interface PerfReading {
  /** Mean paint cost over the window, in milliseconds. */
  mean: number;
  /** Worst paint in the window. The one a player actually notices. */
  worst: number;
  /** Paints per second over the window. Not the display refresh rate. */
  rate: number;
  samples: number;
}

export function readPerf(): PerfReading {
  const n = cost.length;
  if (n === 0) return {mean: 0, worst: 0, rate: 0, samples: 0};
  let sum = 0;
  let worst = 0;
  for (const c of cost) {
    sum += c;
    if (c > worst) worst = c;
  }
  const span = at[n - 1] - at[0];
  return {
    mean: sum / n,
    worst,
    // Over one sample there is no span to divide by, so the rate is unknown
    // rather than infinite.
    rate: span > 0 ? ((n - 1) * 1000) / span : 0,
    samples: n,
  };
}
