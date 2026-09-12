/**
 * The player-facing name of a squad.
 *
 * The stored ids stay 'Alpha', 'Bravo', 'Charlie', 'Delta' - they are in
 * squad_slots, in every march row and in the API. What a player sees is
 * "Task Force Alpha": a temporary unit put together for one operation, which
 * is exactly what six assets sent at a base are. Renamed 2026-09-06.
 *
 * One function, so the word lives in the string table once and every screen
 * that names a squad names it the same way.
 */
import {t} from '../i18n';

export function taskForceName(id: string): string {
  return t('tf.name', {name: id});
}
