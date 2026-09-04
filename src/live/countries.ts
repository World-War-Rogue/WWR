/**
 * Countries, flags and default language.
 *
 * Only the ISO codes are listed. Display names come from Intl, which the
 * browser already has for every language it supports, and flags are derived
 * arithmetically from the code - so this file stays a few hundred bytes
 * instead of shipping a 250-entry table of names and emoji.
 */

// ISO 3166-1 alpha-2.
const CODES =
  'AD AE AF AG AL AM AO AR AT AU AZ BA BB BD BE BF BG BH BI BJ BN BO BR BS BT BW BY BZ CA CD CF CG CH CI CL CM CN CO CR CU CV CY CZ DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FM FR GA GB GD GE GH GM GN GQ GR GT GW GY HN HR HT HU ID IE IL IN IQ IR IS IT JM JO JP KE KG KH KI KM KN KP KR KW KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MH MK ML MM MN MR MT MU MV MW MX MY MZ NA NE NG NI NL NO NP NR NZ OM PA PE PG PH PK PL PT PW PY QA RO RS RU RW SA SB SC SD SE SG SI SK SL SM SN SO SR SS ST SV SY SZ TD TG TH TJ TL TM TN TO TR TT TV TW TZ UA UG US UY UZ VA VC VE VN VU WS YE ZA ZM ZW'.split(
    ' ',
  );

/**
 * Default language per country. Only where it differs from English, and only
 * for languages the game is likely to carry - the point is a sensible starting
 * guess, which the player can change in-game, not a linguistic map of the world.
 */
const LANGUAGE_BY_COUNTRY: Record<string, string> = {
  AR: 'es', BO: 'es', CL: 'es', CO: 'es', CR: 'es', CU: 'es', DO: 'es', EC: 'es',
  ES: 'es', GT: 'es', HN: 'es', MX: 'es', NI: 'es', PA: 'es', PE: 'es', PY: 'es',
  SV: 'es', UY: 'es', VE: 'es',
  BR: 'pt', PT: 'pt', AO: 'pt', MZ: 'pt',
  FR: 'fr', BE: 'fr', CI: 'fr', CD: 'fr', CM: 'fr', SN: 'fr', ML: 'fr', MC: 'fr',
  DE: 'de', AT: 'de', CH: 'de', LI: 'de',
  IT: 'it', SM: 'it', VA: 'it',
  RU: 'ru', BY: 'ru', KZ: 'ru', KG: 'ru',
  CN: 'zh', TW: 'zh', SG: 'zh',
  JP: 'ja',
  KR: 'ko', KP: 'ko',
  SA: 'ar', AE: 'ar', EG: 'ar', DZ: 'ar', IQ: 'ar', JO: 'ar', KW: 'ar', LB: 'ar',
  LY: 'ar', MA: 'ar', OM: 'ar', QA: 'ar', SD: 'ar', SY: 'ar', TN: 'ar', YE: 'ar',
  ID: 'id', MY: 'ms', TH: 'th', VN: 'vi', PH: 'tl',
  TR: 'tr', PL: 'pl', UA: 'uk', NL: 'nl', SE: 'sv', NO: 'no', DK: 'da', FI: 'fi',
  GR: 'el', CZ: 'cs', HU: 'hu', RO: 'ro', IL: 'he', IR: 'fa', IN: 'hi', PK: 'ur',
};

/** Regional indicator letters: 'GB' becomes the pair that renders as a flag. */
export function flagFor(code: string): string {
  if (!/^[A-Z]{2}$/.test(code)) return '';
  return String.fromCodePoint(
    ...[...code].map((c) => 0x1f1e6 + (c.charCodeAt(0) - 65)),
  );
}

export function languageFor(code: string): string {
  return LANGUAGE_BY_COUNTRY[code] ?? 'en';
}

let displayNames: Intl.DisplayNames | null = null;
function nameFor(code: string): string {
  if (displayNames === null) {
    try {
      displayNames = new Intl.DisplayNames(['en'], {type: 'region'});
    } catch {
      return code;
    }
  }
  try {
    return displayNames.of(code) ?? code;
  } catch {
    return code;
  }
}

export interface Country {
  code: string;
  name: string;
  flag: string;
  language: string;
}

export const COUNTRIES: Country[] = CODES.map((code) => ({
  code,
  name: nameFor(code),
  flag: flagFor(code),
  language: languageFor(code),
})).sort((a, b) => a.name.localeCompare(b.name));

/**
 * A first guess at the player's country from the browser's own locale, so the
 * picker opens on something plausible instead of on Afghanistan.
 */
export function guessCountry(): string {
  try {
    const locale = new Intl.Locale(navigator.language);
    const region = locale.maximize().region;
    if (region && CODES.includes(region)) return region;
  } catch {
    // Older browsers, or a locale Intl cannot expand. Fall through.
  }
  return 'US';
}
