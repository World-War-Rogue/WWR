/**
 * Alliance rules.
 *
 * Shared so the form that offers a name and the server that accepts one agree
 * about what a name is. A client-side check that the server does not repeat is
 * a suggestion; a server-side check the client does not know about is a form
 * that fails after you have filled it in.
 */

export const ALLIANCE_RANKS = ['leader', 'officer', 'member'] as const;
export type AllianceRank = (typeof ALLIANCE_RANKS)[number];

/** Higher outranks lower. Used for every "may X do this to Y" question. */
export const RANK_ORDER: Record<AllianceRank, number> = {
  leader: 3,
  officer: 2,
  member: 1,
};

/**
 * What each rank is called in the game.
 *
 * The stored values stay 'leader', 'officer' and 'member'. Renaming the labels
 * is a presentation change; renaming the data would be a migration, every
 * permission check rewritten, and a window where old rows mean nothing - all
 * to say the same thing in different words.
 */
export const RANK_LABEL: Record<AllianceRank, string> = {
  leader: 'General',
  officer: 'Lieutenant',
  member: 'Soldier',
};

/**
 * How many lieutenants an alliance may have.
 *
 * The cap is what makes the rank worth having and what keeps the leadership
 * channel a room rather than a crowd - a general who can promote everybody has
 * promoted nobody.
 */
export const MAX_LIEUTENANTS = 10;

/**
 * Tags are letters only, and shown in brackets before a callsign.
 *
 * No digits and no symbols, for the same reason callsigns have none: a tag is
 * read aloud and typed from memory, and [W0LF] against [WOLF] is a fight
 * waiting to happen.
 */
export const TAG_PATTERN = /^[A-Za-z]{2,4}$/;
export const TAG_RULE = 'Tag must be 2-4 letters, no numbers or symbols.';

export const NAME_PATTERN = /^[A-Za-z][A-Za-z ']{2,23}$/;
export const NAME_RULE =
  'Name must be 3-24 characters: letters, spaces and apostrophes, starting with a letter.';

export const DESCRIPTION_MAX = 240;

/**
 * Members per alliance.
 *
 * A cap is what makes an alliance a choice. Without one the strongest alliance
 * absorbs the server and the politics that make the map interesting stop
 * existing - there is nobody left to be anything other than an ally.
 */
export const ALLIANCE_CAPACITY = 100;

export function validTag(tag: string): boolean {
  return TAG_PATTERN.test(tag);
}

export function validName(name: string): boolean {
  return NAME_PATTERN.test(name.trim());
}

/** Case- and space-insensitive key, so "Iron Wolves" and "ironwolves" collide. */
export function nameKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z]/g, '');
}

export function outranks(a: AllianceRank, b: AllianceRank): boolean {
  return RANK_ORDER[a] > RANK_ORDER[b];
}
