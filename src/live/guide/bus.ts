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

/**
 * Whether something modal is open - a sheet, a composer, a settings panel.
 *
 * Rider draws above everything so a step can point at any control, which is
 * also why his bubble sat on top of the Task Force composer's buttons. Rather
 * than each modal fighting him with a higher z-index, every modal registers
 * itself here while it is open and Rider stays out of the way until the
 * count is back to zero. Modals register; the guide listens; nothing else
 * needs to know.
 */
const MODAL_EVENT = 'wwr-modal';
let openModals = 0;

export function modalOpened(): () => void {
  openModals += 1;
  window.dispatchEvent(new Event(MODAL_EVENT));
  let released = false;
  return () => {
    if (released) return;
    released = true;
    openModals = Math.max(0, openModals - 1);
    window.dispatchEvent(new Event(MODAL_EVENT));
  };
}

export function anyModalOpen(): boolean {
  return openModals > 0;
}

export function onModalChange(handler: (open: boolean) => void): () => void {
  const listener = () => handler(openModals > 0);
  window.addEventListener(MODAL_EVENT, listener);
  return () => window.removeEventListener(MODAL_EVENT, listener);
}
