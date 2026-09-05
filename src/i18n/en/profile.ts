/**
 * A player profile, own or somebody else's, and the portrait cropper.
 *
 * See ../en.ts for what this file is part of.
 */
export const PROFILE = {
  // The card itself
  'profile.eyebrowOwn': 'Your profile',
  'profile.eyebrowOther': 'Dossier',
  'profile.done': 'Done',
  'profile.loading': 'Loading…',
  'profile.mottoPlaceholder': 'Say something. One line.',

  // Picture
  'profile.changePicture': 'Change your picture',
  'profile.addPicture': 'Add a picture',
  'profile.removePicture': 'Remove picture',

  // Stats
  'profile.noAlliance': 'None',
  'profile.baseLabel': 'Base',
  'profile.position': 'Position',
  'profile.unplaced': 'Unplaced',
  'profile.flying': 'Flying {skin}',
  'profile.flyingDeployed': 'Flying {skin} · deployed {date}',

  // Editing your own
  'profile.language': 'Language',
  'profile.languageBlurb': 'Chat written in another language is translated into this one for you. Your own messages are sent in it.',
  'profile.portrait': 'Portrait',
  'profile.colour': 'Colour',
  'profile.saving': 'Saving…',
  'profile.save': 'Save profile',
  'profile.saved': 'Saved',

  // What went wrong
  'profile.errorLoad': 'Could not load that profile.',
  'profile.errorSave': 'Could not save your profile.',
  'profile.errorPictureTooLarge': 'That picture is too large. Try one under 16MB.',
  'profile.errorPictureSave': 'Could not save that picture.',
  'profile.errorPictureRemove': 'Could not remove that picture.',

  // The cropper
  'crop.title': 'Frame your picture',
  'crop.hint': 'Drag to move, slider to zoom.',
  'crop.use': 'Use this',
  'crop.cancel': 'Cancel',
  'crop.errorOpen': 'That file could not be opened as an image.',
} as const;
