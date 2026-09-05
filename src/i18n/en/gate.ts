/**
 * The way in: sign in, request access, and everything a player reads
    before they have an account.
 *
 * See ../en.ts.
 */
export const GATE = {
  // Which door you are standing at
  'gate.signInTitle': 'Report for duty',
  'gate.signInIntro': 'Sign in to your base. It has been running while you were away.',
  'gate.requestTitle': 'Request access',
  'gate.requestIntro': 'The game is in closed testing. Requests are reviewed by hand.',

  // The form
  'gate.email': 'Email',
  'gate.callsign': 'Callsign',
  'gate.password': 'Password',
  'gate.country': 'Country',
  'gate.countryHint': 'Sets your flag and language. Changeable in-game.',
  'gate.baseType': 'Base type',
  'gate.ageConfirm': 'I confirm I am 18 or over.',
  'gate.ageNote': 'World War Rogue is not available to under-18s.',

  // Whether the callsign they are typing can be theirs
  'gate.callsignRule': 'Callsign must be 6-20 letters, no numbers or symbols.',
  'gate.callsignChecking': 'Checking…',
  'gate.callsignAvailable': 'Available',
  'gate.callsignTaken': 'That callsign is taken.',

  // Buttons
  'gate.signIn': 'Sign in',
  'gate.requestAccess': 'Request access',
  'gate.working': 'Working…',
  'gate.toSignIn': 'Already have a callsign? Sign in.',
  'gate.toRequest': 'No account? Request access.',
  'gate.backToSignIn': 'Back to sign in',

  // After the request has gone
  'gate.requestSent': 'Request sent',
  'gate.reviewNote': 'Access is reviewed by hand while the game is in closed testing. You will be emailed either way.',

  // The only failure the client writes itself. Anything the Worker says
  // arrives already in English and is shown as it came.
  'gate.networkError': 'Could not reach the server.',
} as const;
