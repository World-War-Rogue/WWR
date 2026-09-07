import {useEffect} from 'react';
import {modalOpened} from './bus';

/**
 * Registers the calling component as an open modal for as long as `open` is
 * true, so General Rider keeps his bubble out from over it. Sheets that mount
 * only while open simply pass `true`.
 */
export function useModal(open = true): void {
  useEffect(() => {
    if (!open) return;
    return modalOpened();
  }, [open]);
}
