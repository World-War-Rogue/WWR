/**
 * How the game tells General Rider what the player just did.
 *
 * One window event, one string. Screens fire it where something happens
 * ("open:building:depot", "tap:slot"); the guide listens and advances when
 * the name matches its current step. Nothing here knows about the script.
 */
const EVENT = 'wwr-guide';

export function guideEvent(name: string): void {
  try {
    window.dispatchEvent(new CustomEvent(EVENT, {detail: name}));
  } catch {
    // A browser without CustomEvent has bigger problems than a guide.
  }
}

export function onGuideEvent(handler: (name: string) => void): () => void {
  const listener = (e: Event) => {
    const name = (e as CustomEvent<string>).detail;
    if (typeof name === 'string') handler(name);
  };
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
