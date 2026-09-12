/**
 * A ring buffer of the last few client errors, for attaching to bug reports.
 *
 * Console output is where the answer usually is, and asking a player to open
 * devtools and paste it is asking for nothing. Collecting it costs a wrapped
 * function and a bounded array.
 *
 * Deliberately only errors. A full log would be a privacy question and a size
 * problem; an unhandled rejection and a thrown error are neither.
 */
import {REPORT_CONSOLE_MAX} from '../../shared/support';

const lines: string[] = [];
let installed = false;

function push(line: string): void {
  lines.push(line.slice(0, 500));
  if (lines.length > REPORT_CONSOLE_MAX) lines.shift();
}

/** Idempotent - LiveApp mounts more than once in development. */
export function installErrorTap(): void {
  if (installed) return;
  installed = true;

  const original = console.error;
  console.error = (...args: unknown[]) => {
    try {
      push(args.map((a) => (a instanceof Error ? `${a.name}: ${a.message}` : String(a))).join(' '));
    } catch {
      // Never let the tap break the thing it is watching.
    }
    original(...args);
  };

  window.addEventListener('error', (e) => push(`error: ${e.message} @ ${e.filename}:${e.lineno}`));
  window.addEventListener('unhandledrejection', (e) => push(`unhandled: ${String(e.reason)}`));
}

export function recentErrors(): string[] {
  return [...lines];
}

/**
 * Which build is running, taken from the hashed bundle filename vite emits.
 *
 * Not a version number, but it is the thing that actually distinguishes one
 * deploy from another, and it is already on the page - "which build were you
 * on" is otherwise unanswerable after the next deploy.
 */
export function buildId(): string {
  const tag = document.querySelector('script[type="module"][src]');
  return tag?.getAttribute('src')?.split('/').pop() ?? 'unknown';
}
