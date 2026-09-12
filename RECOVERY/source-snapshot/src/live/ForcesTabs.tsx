/**
 * Squads and Assets are two views of the same thing.
 *
 * One is what you have; the other is how it is arranged. Splitting them across
 * two entries in a menu made a player leave one screen to reach the other,
 * which is the wrong shape for a pair you compare constantly - deciding what
 * goes in a slot means looking at the catalogue, and looking at the catalogue
 * is only interesting because of the slots.
 *
 * So they share a door and switch between themselves. Rendered as a shared
 * component rather than copied into both, because two copies of a tab bar
 * drift the first time one of them gains a badge.
 */
import {t} from '../i18n';

export type ForcesTab = 'squads' | 'assets';

export default function ForcesTabs({
  active,
  onChange,
}: {
  active: ForcesTab;
  onChange: (tab: ForcesTab) => void;
}) {
  return (
    <div className="flex gap-1">
      {(['squads', 'assets'] as const).map((key) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`rounded border px-3 py-1 text-sm font-medium transition ${
            active === key
              ? 'border-orange-600 bg-orange-950/40 text-orange-200'
              : 'border-neutral-800 text-neutral-400 hover:border-neutral-600 hover:text-neutral-200'
          }`}
        >
          {key === 'squads' ? t('squads.title') : t('assets.title')}
        </button>
      ))}
    </div>
  );
}
