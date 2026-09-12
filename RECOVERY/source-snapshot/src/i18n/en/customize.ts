/**
 * Base skins and the four cosmetic slots.
 *
 * See ../en.ts for what this file is part of.
 */
export const CUSTOMIZE = {
  // Header
  'customize.eyebrow': 'Customisation',
  'customize.title': 'Your colours',
  'customize.blurb': 'None of this changes what your base can do. It changes what everyone else sees when they find you on the map.',
  'customize.done': 'Done',

  // Saving the look
  'customize.saving': 'Saving…',
  'customize.save': 'Save look',
  'customize.saved': 'Saved',
  'customize.discard': 'Discard changes',

  // The catalogue
  'customize.loading': 'Loading the catalogue…',
  'customize.skins': 'Base',
  'customize.skinsBlurb': 'The compound itself. Rendered art drops in here when it lands.',
  'customize.locked': 'Locked',
  'customize.lockedItem': '{item} — locked',
  'customize.footnote': 'Locked items preview on your own base but cannot be saved yet — there is nothing to buy them with. Four slots, {count} items, 2,058 combinations before the base skin is counted.',

  // What went wrong
  'customize.errorLoad': 'Could not load the catalogue.',
  'customize.errorSave': 'Could not save that loadout.',
} as const;
