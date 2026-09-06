/**
 * Assets - the machines a player fields.
 *
 * These are what other games call heroes. Here they are real hardware with
 * real designations, and the word "hero" is not used anywhere: an M1A2 is an
 * asset, and a squad is six of them.
 *
 * Imported by both the Worker and the client, so a stat cannot be one number
 * on the server and another on screen. Data only - no DOM, no Worker APIs.
 *
 * ── The rule this file is built around ────────────────────────────────────
 *
 * NO ASSET IS STRONGER THAN ANOTHER ASSET. They are different, not ranked.
 *
 * There are no tiers, no stars, and no rarity. What separates two assets is
 * their ROLE, the SHAPE of their attributes, and what they cost to field. If
 * an asset is never drafted, that is a balance bug to fix - not a common card
 * doing its job.
 *
 * Two mechanisms make that true rather than merely stated:
 *
 * 1. LIFT. Every asset costs lift to field, and a squad has a lift budget
 *    drawn from the Motor Pool, Airfield and Barracks. Heavy assets have
 *    bigger numbers AND cost proportionally more, so nothing is free power -
 *    a squad of six Abrams is not a choice a player can make.
 *
 * 2. ROLE. Rotary beats armour, fixed wing beats rotary, drones beat
 *    artillery, artillery breaks massed armour and dies to anything that
 *    reaches it, and overwatch cannot fire at what recon has not found. A
 *    squad that ignores the web loses to one that does not, at any level.
 *
 * ── Where the numbers come from ───────────────────────────────────────────
 *
 * Attributes are not invented per row. Each asset gets a budget of
 *
 *     BASE_POINTS + lift * POINTS_PER_LIFT
 *
 * spread across its five attributes, so power per unit of lift is flat across
 * the catalogue and the choice between a heavy asset and two light ones is
 * about role, not efficiency. `auditAssets` below checks every row against
 * that budget; it is exported so a test or a script can fail on a row that
 * drifts, rather than the drift being found in a battle.
 */

export type AssetCategory = 'armour' | 'rotary' | 'fixed_wing' | 'artillery' | 'drone' | 'naval';

/**
 * What an asset is FOR. This is the counter web, and it comes free from
 * reality - a player who knows the hardware already knows the rules.
 */
export type AssetRole =
  /** Heavy armour. Closes, holds ground, and is what artillery is aimed at. */
  | 'breach'
  /** Fast and light. Covers flanks, kills drones and anything unarmoured. */
  | 'screen'
  /** Heavy damage on arrival, cannot take a hit in return. */
  | 'strike'
  /** Hits from outside the fight - but only at what recon has found. */
  | 'overwatch'
  /** Little firepower. Feeds detection to the squad and turns overwatch on. */
  | 'recon'
  /** Sustain, repair, and the ability to bring more. */
  | 'lift';

export interface AssetAttributes {
  /** Damage dealt per engagement. */
  firepower: number;
  /** Damage absorbed before losses start. */
  armour: number;
  /** Who engages first, and who can withdraw. */
  mobility: number;
  /** Which band it fights in - knife, medium, or deep. */
  range: number;
  /** What it sees, and what it lets the rest of the squad see. */
  detection: number;
}

export interface Asset {
  id: string;
  /** The designation. Carries far less trademark weight than the popular name. */
  code: string;
  /** What players will call it. */
  name: string;
  category: AssetCategory;
  role: AssetRole;
  /** Whose kit it is. Flavour and filtering only - it grants nothing. */
  operator: string;
  /** What it costs to field. The brake on stacking heavy assets. */
  lift: number;
  attributes: AssetAttributes;
  /** One line, in the world's voice, for the roster card. */
  blurb: string;
  /**
   * Held back from the opening draft, by being explicitly false. Absent means
   * draftable, so the ninety per cent of rows that are do not each carry a
   * line saying so - and the ones that are not stand out when reading the
   * catalogue, which is the point.
   *
   * Naval waits for the coastal season, because until the map has water there
   * is nowhere for a ship to be.
   */
  draftable?: false;
}

/* -------------------------------------------------------------------------- */
/* Balance                                                                    */
/* -------------------------------------------------------------------------- */

/** Every asset starts with this much, before lift is paid for. */
export const BASE_POINTS = 6;
/** And this much more for each point of lift it costs to field. */
export const POINTS_PER_LIFT = 4;

/** No single attribute may sit outside this, at level 1. */
export const ATTRIBUTE_MIN = 1;
export const ATTRIBUTE_MAX = 10;

export function pointBudget(lift: number): number {
  return BASE_POINTS + lift * POINTS_PER_LIFT;
}

export function pointsSpent(a: AssetAttributes): number {
  return a.firepower + a.armour + a.mobility + a.range + a.detection;
}

export const CATEGORY_LABEL: Record<AssetCategory, string> = {
  armour: 'Armour',
  rotary: 'Rotary',
  fixed_wing: 'Fixed Wing',
  artillery: 'Artillery',
  drone: 'Drones',
  naval: 'Naval',
};

export const ROLE_LABEL: Record<AssetRole, string> = {
  breach: 'Breach',
  screen: 'Screen',
  strike: 'Strike',
  overwatch: 'Overwatch',
  recon: 'Recon',
  lift: 'Lift',
};

export const ROLE_BLURB: Record<AssetRole, string> = {
  breach: 'Closes the distance and holds the ground it takes.',
  screen: 'Covers the flanks. Kills drones and anything unarmoured.',
  strike: 'Hits hard on arrival. Cannot take a hit in return.',
  overwatch: 'Fires from outside the fight, at whatever recon has found.',
  recon: 'Finds things. Without it, overwatch is firing blind.',
  lift: 'Carries, repairs, and keeps a squad in the field.',
};

/*
 * The counter web used to be duplicated here as a second hand-written table,
 * and it disagreed with the resolver in six of twelve entries - the roster card
 * told players that artillery beat armour and that fixed wing lost to drones,
 * and the game implemented neither. It now lives in one place: `counterWeb` in
 * `shared/combat.ts` derives it from the same table the resolver reads.
 */

/* -------------------------------------------------------------------------- */
/* Squads                                                                     */
/* -------------------------------------------------------------------------- */

/** Four squads, six slots each: the twenty-four a player drafts. */
export const SQUAD_COUNT = 4;
export const SQUAD_SLOTS = 6;
export const DRAFT_SIZE = SQUAD_COUNT * SQUAD_SLOTS;

export const SQUAD_NAMES = ['Alpha', 'Bravo', 'Charlie', 'Delta'] as const;
export type SquadName = (typeof SQUAD_NAMES)[number];

/**
 * Service Rank. Every asset shares the same ladder, deliberately.
 *
 * Fifty ranks across the first five seasons, ten per season: 1-10 in Season 1,
 * 11-20 in Season 2, and so on to 41-50 in Season 5. Seasons 6-10 add no
 * further ranks - they grow sideways instead.
 */
export const ASSET_MAX_LEVEL = 50;
export const RANKS_PER_SEASON = 10;

/** The highest rank a given season permits anyone to own. */
export function maxRankForSeason(season: number): number {
  return Math.min(ASSET_MAX_LEVEL, Math.max(0, season) * RANKS_PER_SEASON);
}

/**
 * The catalogue.
 *
 * Twelve per category, which is enough that a draft of twenty-four is a real
 * choice and few enough that every one can be balanced by hand rather than by
 * formula. Naval is present and not draftable: the ships exist so players can
 * see what is coming, and they become available with the coastal season, since
 * until the map has water there is nowhere for one to be.
 */
export const ASSETS: Asset[] = [
  {
    id: 'm1a2',
    code: 'M1A2 SEPv3',
    name: 'Abrams',
    category: 'armour',
    role: 'breach',
    operator: 'USA',
    lift: 5,
    attributes: {firepower: 9, armour: 10, mobility: 3, range: 3, detection: 5},
    blurb: 'Gas turbine, depleted uranium, and a habit of arriving first.',
  },
  {
    id: 'leopard2a7',
    code: 'Leopard 2A7+',
    name: 'Leopard',
    category: 'armour',
    role: 'breach',
    operator: 'Germany',
    lift: 5,
    attributes: {firepower: 9, armour: 8, mobility: 5, range: 5, detection: 3},
    blurb: 'Built to be repaired in the field and rarely needing it.',
  },
  {
    id: 'challenger3',
    code: 'Challenger 3',
    name: 'Challenger',
    category: 'armour',
    role: 'breach',
    operator: 'UK',
    lift: 5,
    attributes: {firepower: 6, armour: 10, mobility: 3, range: 6, detection: 5},
    blurb: 'Slow, stubborn, and famously hard to finish off.',
  },
  {
    id: 'leclerc',
    code: 'Leclerc XLR',
    name: 'Leclerc',
    category: 'armour',
    role: 'screen',
    operator: 'France',
    lift: 4,
    attributes: {firepower: 6, armour: 6, mobility: 7, range: 3, detection: 8},
    blurb: 'Light for its class. Gets somewhere else before the reply lands.',
  },
  {
    id: 'k2',
    code: 'K2 Black Panther',
    name: 'Black Panther',
    category: 'armour',
    role: 'breach',
    operator: 'South Korea',
    lift: 5,
    attributes: {firepower: 8, armour: 9, mobility: 3, range: 7, detection: 3},
    blurb: 'Suspension that reads the ground and a gun that never stops tracking.',
  },
  {
    id: 'type10',
    code: 'Type 10',
    name: 'Type 10',
    category: 'armour',
    role: 'screen',
    operator: 'Japan',
    lift: 4,
    attributes: {firepower: 3, armour: 6, mobility: 10, range: 4, detection: 7},
    blurb: 'Small, quick, and built for ground nobody else brings a tank to.',
  },
  {
    id: 'merkava',
    code: 'Merkava Mk.4 Barak',
    name: 'Merkava',
    category: 'armour',
    role: 'breach',
    operator: 'Israel',
    lift: 5,
    attributes: {firepower: 6, armour: 10, mobility: 6, range: 4, detection: 4},
    blurb: 'Engine in front, crew behind it. The design argument is the crew.',
  },
  {
    id: 't90m',
    code: 'T-90M Proryv',
    name: 'Proryv',
    category: 'armour',
    role: 'breach',
    operator: 'Russia',
    lift: 4,
    attributes: {firepower: 6, armour: 10, mobility: 6, range: 6, detection: 2},
    blurb: 'Cheap to build, plentiful, and unpleasant in numbers.',
  },
  {
    id: 'altay',
    code: 'Altay',
    name: 'Altay',
    category: 'armour',
    role: 'breach',
    operator: 'Turkey',
    lift: 4,
    attributes: {firepower: 8, armour: 8, mobility: 7, range: 3, detection: 4},
    blurb: 'Newer than the fight it was designed for, and better for it.',
  },
  {
    id: 'strv122',
    code: 'Stridsvagn 122',
    name: 'Stridsvagn',
    category: 'armour',
    role: 'breach',
    operator: 'Sweden',
    lift: 5,
    attributes: {firepower: 9, armour: 8, mobility: 3, range: 5, detection: 5},
    blurb: 'A Leopard that went north and came back better armoured.',
  },
  {
    id: 'ariete',
    code: 'Ariete AMV',
    name: 'Ariete',
    category: 'armour',
    role: 'screen',
    operator: 'Italy',
    lift: 4,
    attributes: {firepower: 3, armour: 5, mobility: 8, range: 6, detection: 8},
    blurb: 'Fast on a road and honest about preferring one.',
  },
  {
    id: 'pt91',
    code: 'PT-91 Twardy',
    name: 'Twardy',
    category: 'armour',
    role: 'screen',
    operator: 'Poland',
    lift: 3,
    attributes: {firepower: 5, armour: 7, mobility: 6, range: 6, detection: 6},
    blurb: 'Old bones, new optics, and more of them than you expected.',
  },
  {
    id: 'ah64e',
    code: 'AH-64E',
    name: 'Apache',
    category: 'rotary',
    role: 'strike',
    operator: 'USA',
    lift: 3,
    attributes: {firepower: 9, armour: 3, mobility: 9, range: 4, detection: 5},
    blurb: 'Sits behind a ridge, looks over it once, and empties the far side.',
  },
  {
    id: 'ah1z',
    code: 'AH-1Z',
    name: 'Viper',
    category: 'rotary',
    role: 'strike',
    operator: 'USA',
    lift: 3,
    attributes: {firepower: 9, armour: 5, mobility: 6, range: 4, detection: 6},
    blurb: 'Narrow, quick, and designed to leave from a deck.',
  },
  {
    id: 'ka52m',
    code: 'Ka-52M',
    name: 'Alligator',
    category: 'rotary',
    role: 'strike',
    operator: 'Russia',
    lift: 3,
    attributes: {firepower: 9, armour: 5, mobility: 6, range: 6, detection: 4},
    blurb: 'Coaxial rotors, no tail to shoot off, and ejection seats.',
  },
  {
    id: 'mi28nm',
    code: 'Mi-28NM',
    name: 'Havoc',
    category: 'rotary',
    role: 'strike',
    operator: 'Russia',
    lift: 3,
    attributes: {firepower: 9, armour: 5, mobility: 9, range: 4, detection: 3},
    blurb: 'Armoured to keep flying after being hit, which it expects to be.',
  },
  {
    id: 'mi35m',
    code: 'Mi-35M',
    name: 'Hind',
    category: 'rotary',
    role: 'lift',
    operator: 'Russia',
    lift: 3,
    attributes: {firepower: 3, armour: 8, mobility: 8, range: 6, detection: 5},
    blurb: 'A gunship that also carries eight people. Neither job done gently.',
  },
  {
    id: 'tiger',
    code: 'Tiger HAD',
    name: 'Tiger',
    category: 'rotary',
    role: 'screen',
    operator: 'France / Germany',
    lift: 3,
    attributes: {firepower: 5, armour: 5, mobility: 9, range: 3, detection: 8},
    blurb: 'Quiet for its size and hard to hear coming twice.',
  },
  {
    id: 't129',
    code: 'T129 ATAK',
    name: 'ATAK',
    category: 'rotary',
    role: 'screen',
    operator: 'Turkey',
    lift: 2,
    attributes: {firepower: 4, armour: 3, mobility: 10, range: 6, detection: 7},
    blurb: 'Small, cheap to keep flying, and everywhere it is needed.',
  },
  {
    id: 'z10me',
    code: 'Z-10ME',
    name: 'Z-10',
    category: 'rotary',
    role: 'strike',
    operator: 'China',
    lift: 3,
    attributes: {firepower: 8, armour: 3, mobility: 6, range: 7, detection: 6},
    blurb: 'Uprated engines, new armour, and a great many of them.',
  },
  {
    id: 'rooivalk',
    code: 'Rooivalk Mk1',
    name: 'Rooivalk',
    category: 'rotary',
    role: 'strike',
    operator: 'South Africa',
    lift: 3,
    attributes: {firepower: 7, armour: 5, mobility: 9, range: 4, detection: 5},
    blurb: 'Built where the ranges are long and the support is far away.',
  },
  {
    id: 'uh60m',
    code: 'UH-60M',
    name: 'Black Hawk',
    category: 'rotary',
    role: 'lift',
    operator: 'USA',
    lift: 3,
    attributes: {firepower: 3, armour: 7, mobility: 8, range: 4, detection: 8},
    blurb: 'The one that comes to get you. Everything else is negotiable.',
  },
  {
    id: 'ch47f',
    code: 'CH-47F',
    name: 'Chinook',
    category: 'rotary',
    role: 'lift',
    operator: 'USA',
    lift: 4,
    attributes: {firepower: 3, armour: 5, mobility: 9, range: 6, detection: 7},
    blurb: 'Two rotors and no argument about whether it will fit.',
  },
  {
    id: 'aw101',
    code: 'AW101',
    name: 'Merlin',
    category: 'rotary',
    role: 'lift',
    operator: 'UK / Italy',
    lift: 4,
    attributes: {firepower: 5, armour: 5, mobility: 8, range: 4, detection: 8},
    blurb: 'Three engines, because two has been known to be optimistic.',
  },
  {
    id: 'f35a',
    code: 'F-35A',
    name: 'Lightning II',
    category: 'fixed_wing',
    role: 'strike',
    operator: 'USA',
    lift: 5,
    attributes: {firepower: 9, armour: 5, mobility: 6, range: 7, detection: 3},
    blurb: 'Sees the whole fight and tells everyone else where to shoot.',
  },
  {
    id: 'f22',
    code: 'F-22',
    name: 'Raptor',
    category: 'fixed_wing',
    role: 'screen',
    operator: 'USA',
    lift: 5,
    attributes: {firepower: 5, armour: 5, mobility: 9, range: 5, detection: 6},
    blurb: 'Arrives, clears the sky, and is not seen doing either.',
  },
  {
    id: 'f15ex',
    code: 'F-15EX',
    name: 'Eagle II',
    category: 'fixed_wing',
    role: 'strike',
    operator: 'USA',
    lift: 5,
    attributes: {firepower: 9, armour: 3, mobility: 7, range: 5, detection: 6},
    blurb: 'Carries more than anything its size has any right to.',
  },
  {
    id: 'a10c',
    code: 'A-10C',
    name: 'Thunderbolt II',
    category: 'fixed_wing',
    role: 'strike',
    operator: 'USA',
    lift: 4,
    attributes: {firepower: 8, armour: 3, mobility: 8, range: 8, detection: 3},
    blurb: 'Built around the gun, then armoured until it could stay.',
  },
  {
    id: 'fa18e',
    code: 'F/A-18E',
    name: 'Super Hornet',
    category: 'fixed_wing',
    role: 'strike',
    operator: 'USA',
    lift: 4,
    attributes: {firepower: 10, armour: 5, mobility: 5, range: 5, detection: 5},
    blurb: 'Does six jobs adequately, which wins more days than one job perfectly.',
  },
  {
    id: 'ac130j',
    code: 'AC-130J',
    name: 'Ghostrider',
    category: 'fixed_wing',
    role: 'overwatch',
    operator: 'USA',
    lift: 5,
    attributes: {firepower: 10, armour: 3, mobility: 3, range: 10, detection: 4},
    blurb: 'Turns in a slow circle and takes a town apart from inside it.',
  },
  {
    id: 'typhoon',
    code: 'Eurofighter Typhoon',
    name: 'Typhoon',
    category: 'fixed_wing',
    role: 'screen',
    operator: 'Multi-national',
    lift: 4,
    attributes: {firepower: 7, armour: 4, mobility: 8, range: 3, detection: 8},
    blurb: 'Four nations argued for a decade and got this right.',
  },
  {
    id: 'rafale',
    code: 'Rafale F4',
    name: 'Rafale',
    category: 'fixed_wing',
    role: 'strike',
    operator: 'France',
    lift: 4,
    attributes: {firepower: 8, armour: 5, mobility: 8, range: 5, detection: 4},
    blurb: 'Flies off a carrier or a farm track and does not mind which.',
  },
  {
    id: 'gripen',
    code: 'JAS 39E',
    name: 'Gripen',
    category: 'fixed_wing',
    role: 'screen',
    operator: 'Sweden',
    lift: 3,
    attributes: {firepower: 5, armour: 6, mobility: 8, range: 3, detection: 8},
    blurb: 'Rearmed on a road by six people in ten minutes.',
  },
  {
    id: 'su57',
    code: 'Su-57',
    name: 'Felon',
    category: 'fixed_wing',
    role: 'screen',
    operator: 'Russia',
    lift: 5,
    attributes: {firepower: 4, armour: 4, mobility: 10, range: 3, detection: 9},
    blurb: 'Fewer than advertised, and the ones that fly are not a joke.',
  },
  {
    id: 'su34',
    code: 'Su-34',
    name: 'Fullback',
    category: 'fixed_wing',
    role: 'strike',
    operator: 'Russia',
    lift: 4,
    attributes: {firepower: 8, armour: 3, mobility: 5, range: 8, detection: 6},
    blurb: 'An armoured bathtub for two, wrapped in bomb racks.',
  },
  {
    id: 'kf21',
    code: 'KF-21',
    name: 'Boramae',
    category: 'fixed_wing',
    role: 'screen',
    operator: 'South Korea',
    lift: 4,
    attributes: {firepower: 5, armour: 3, mobility: 8, range: 6, detection: 8},
    blurb: 'New, unblooded, and already better than most of what it replaces.',
  },
  {
    id: 'himars',
    code: 'M142',
    name: 'HIMARS',
    category: 'artillery',
    role: 'overwatch',
    operator: 'USA',
    lift: 3,
    attributes: {firepower: 6, armour: 4, mobility: 5, range: 9, detection: 6},
    blurb: 'Fires six, leaves in ninety seconds, is not where the reply lands.',
  },
  {
    id: 'm270a2',
    code: 'M270A2',
    name: 'MLRS',
    category: 'artillery',
    role: 'overwatch',
    operator: 'USA',
    lift: 4,
    attributes: {firepower: 9, armour: 4, mobility: 3, range: 8, detection: 6},
    blurb: 'Twelve rockets, tracked, and it does not care about the road.',
  },
  {
    id: 'puls',
    code: 'PULS',
    name: 'PULS',
    category: 'artillery',
    role: 'overwatch',
    operator: 'Israel',
    lift: 3,
    attributes: {firepower: 6, armour: 6, mobility: 2, range: 10, detection: 6},
    blurb: 'One launcher, any rocket, decided after it is already deployed.',
  },
  {
    id: 'k239',
    code: 'K239',
    name: 'Chunmoo',
    category: 'artillery',
    role: 'overwatch',
    operator: 'South Korea',
    lift: 3,
    attributes: {firepower: 6, armour: 6, mobility: 5, range: 10, detection: 3},
    blurb: 'Pods swapped in minutes, which is the whole argument for it.',
  },
  {
    id: 'smerch',
    code: 'BM-30',
    name: 'Smerch',
    category: 'artillery',
    role: 'overwatch',
    operator: 'Russia',
    lift: 4,
    attributes: {firepower: 8, armour: 6, mobility: 5, range: 8, detection: 3},
    blurb: 'Twelve tubes of 300mm. Nothing subtle has ever been done with it.',
  },
  {
    id: 'tos1a',
    code: 'TOS-1A',
    name: 'Solntsepyok',
    category: 'artillery',
    role: 'breach',
    operator: 'Russia',
    lift: 4,
    attributes: {firepower: 9, armour: 9, mobility: 5, range: 3, detection: 4},
    blurb: 'Short-ranged, thermobaric, and it has to come close to be used.',
  },
  {
    id: 'phl191',
    code: 'PHL-191',
    name: 'PHL-191',
    category: 'artillery',
    role: 'overwatch',
    operator: 'China',
    lift: 4,
    attributes: {firepower: 8, armour: 1, mobility: 5, range: 9, detection: 7},
    blurb: 'Modular, long, and produced at a rate nobody else matches.',
  },
  {
    id: 'astros',
    code: 'Astros II MK6',
    name: 'Astros',
    category: 'artillery',
    role: 'overwatch',
    operator: 'Brazil',
    lift: 3,
    attributes: {firepower: 6, armour: 6, mobility: 4, range: 7, detection: 7},
    blurb: 'Sold everywhere, quietly effective, rarely photographed.',
  },
  {
    id: 'rm70',
    code: 'RM-70 Vampire',
    name: 'Vampire',
    category: 'artillery',
    role: 'overwatch',
    operator: 'Czechia',
    lift: 3,
    attributes: {firepower: 10, armour: 1, mobility: 4, range: 10, detection: 5},
    blurb: 'A Grad on a better truck, with a reload nobody has to stand outside for.',
  },
  {
    id: 'pzh2000',
    code: 'PzH 2000',
    name: 'PzH 2000',
    category: 'artillery',
    role: 'overwatch',
    operator: 'Germany',
    lift: 4,
    attributes: {firepower: 8, armour: 4, mobility: 5, range: 10, detection: 3},
    blurb: 'Three rounds in the air before the first one lands.',
  },
  {
    id: 'archer',
    code: 'Archer FH77 BW',
    name: 'Archer',
    category: 'artillery',
    role: 'overwatch',
    operator: 'Sweden',
    lift: 3,
    attributes: {firepower: 10, armour: 6, mobility: 3, range: 7, detection: 4},
    blurb: 'Fires from the cab. Nobody gets out, so nobody gets caught out.',
  },
  {
    id: 'k9',
    code: 'K9 Thunder',
    name: 'K9',
    category: 'artillery',
    role: 'overwatch',
    operator: 'South Korea',
    lift: 4,
    attributes: {firepower: 10, armour: 3, mobility: 5, range: 8, detection: 4},
    blurb: 'The one everybody buys, because it works and it arrives.',
  },
  {
    id: 'mq9a',
    code: 'MQ-9A',
    name: 'Reaper',
    category: 'drone',
    role: 'strike',
    operator: 'USA',
    lift: 3,
    attributes: {firepower: 7, armour: 1, mobility: 5, range: 9, detection: 8},
    blurb: 'Fourteen hours overhead, and the last four are the ones that matter.',
  },
  {
    id: 'mq1c',
    code: 'MQ-1C',
    name: 'Gray Eagle',
    category: 'drone',
    role: 'recon',
    operator: 'USA',
    lift: 2,
    attributes: {firepower: 5, armour: 3, mobility: 8, range: 7, detection: 7},
    blurb: 'Watches one road for a day and a half without being noticed.',
  },
  {
    id: 'rq4',
    code: 'RQ-4',
    name: 'Global Hawk',
    category: 'drone',
    role: 'recon',
    operator: 'USA',
    lift: 3,
    attributes: {firepower: 4, armour: 4, mobility: 5, range: 9, detection: 8},
    blurb: 'Sixty thousand feet, and it can read the whole theatre from there.',
  },
  {
    id: 'switchblade',
    code: 'Switchblade 600',
    name: 'Switchblade',
    category: 'drone',
    role: 'strike',
    operator: 'USA',
    lift: 1,
    attributes: {firepower: 5, armour: 5, mobility: 4, range: 9, detection: 7},
    blurb: 'Carried in a tube by one soldier. Waits, then does not come back.',
  },
  {
    id: 'tb2',
    code: 'Bayraktar TB2',
    name: 'TB2',
    category: 'drone',
    role: 'strike',
    operator: 'Turkey',
    lift: 2,
    attributes: {firepower: 6, armour: 5, mobility: 6, range: 8, detection: 5},
    blurb: 'Cheap enough to lose and famous for what it did before anyone noticed.',
  },
  {
    id: 'akinci',
    code: 'Bayraktar Akinci',
    name: 'Akinci',
    category: 'drone',
    role: 'strike',
    operator: 'Turkey',
    lift: 3,
    attributes: {firepower: 8, armour: 5, mobility: 5, range: 6, detection: 6},
    blurb: 'The TB2 grown up, and now carrying what a strike aircraft carries.',
  },
  {
    id: 'herontp',
    code: 'Heron TP',
    name: 'Heron',
    category: 'drone',
    role: 'recon',
    operator: 'Israel',
    lift: 3,
    attributes: {firepower: 3, armour: 5, mobility: 8, range: 6, detection: 8},
    blurb: 'Stays up for a day and a half and forgets nothing it saw.',
  },
  {
    id: 'harop',
    code: 'Harop',
    name: 'Harop',
    category: 'drone',
    role: 'strike',
    operator: 'Israel',
    lift: 1,
    attributes: {firepower: 6, armour: 2, mobility: 8, range: 6, detection: 8},
    blurb: 'Loiters until a radar switches on, then removes the radar.',
  },
  {
    id: 'orbiter4',
    code: 'Orbiter 4',
    name: 'Orbiter',
    category: 'drone',
    role: 'recon',
    operator: 'Israel',
    lift: 1,
    attributes: {firepower: 4, armour: 1, mobility: 7, range: 9, detection: 9},
    blurb: 'Hand-launched, silent, and the reason the artillery is accurate.',
  },
  {
    id: 'lancet3',
    code: 'Lancet-3',
    name: 'Lancet',
    category: 'drone',
    role: 'strike',
    operator: 'Russia',
    lift: 1,
    attributes: {firepower: 5, armour: 5, mobility: 5, range: 5, detection: 10},
    blurb: 'Small, cheap, and specifically interested in your artillery.',
  },
  {
    id: 'wingloong2',
    code: 'Wing Loong II',
    name: 'Wing Loong',
    category: 'drone',
    role: 'recon',
    operator: 'China',
    lift: 2,
    attributes: {firepower: 4, armour: 4, mobility: 5, range: 7, detection: 10},
    blurb: 'Exported widely to people who could not buy the alternative.',
  },
  {
    id: 'ch5',
    code: 'CH-5',
    name: 'Rainbow',
    category: 'drone',
    role: 'recon',
    operator: 'China',
    lift: 3,
    attributes: {firepower: 4, armour: 1, mobility: 9, range: 9, detection: 7},
    blurb: 'Sixty hours aloft, which is longer than most operations last.',
  },
  {
    id: 'burke',
    code: 'DDG Flight III',
    name: 'Arleigh Burke',
    category: 'naval',
    role: 'overwatch',
    operator: 'USA',
    lift: 6,
    attributes: {firepower: 8, armour: 6, mobility: 2, range: 8, detection: 6},
    blurb: 'Ninety-six cells and a radar that sees past the horizon.',
    draftable: false,
  },
  {
    id: 'zumwalt',
    code: 'DDG-1000',
    name: 'Zumwalt',
    category: 'naval',
    role: 'overwatch',
    operator: 'USA',
    lift: 6,
    attributes: {firepower: 8, armour: 5, mobility: 3, range: 10, detection: 4},
    blurb: 'Looks wrong, costs more than it should, and hits very hard.',
    draftable: false,
  },
  {
    id: 'virginia',
    code: 'SSN Virginia',
    name: 'Virginia',
    category: 'naval',
    role: 'strike',
    operator: 'USA',
    lift: 6,
    attributes: {firepower: 8, armour: 6, mobility: 7, range: 6, detection: 3},
    blurb: 'Nobody knows where it is. That is the entire capability.',
    draftable: false,
  },
  {
    id: 'wasp',
    code: 'LHD Wasp',
    name: 'Wasp',
    category: 'naval',
    role: 'lift',
    operator: 'USA',
    lift: 6,
    attributes: {firepower: 4, armour: 8, mobility: 7, range: 5, detection: 6},
    blurb: 'Brings the helicopters, the marines, and somewhere to put them.',
    draftable: false,
  },
  {
    id: 'type45',
    code: 'Type 45',
    name: 'Daring',
    category: 'naval',
    role: 'screen',
    operator: 'UK',
    lift: 5,
    attributes: {firepower: 4, armour: 8, mobility: 8, range: 4, detection: 6},
    blurb: 'Built to shoot down what nobody else can see yet.',
    draftable: false,
  },
  {
    id: 'type26',
    code: 'Type 26',
    name: 'City',
    category: 'naval',
    role: 'recon',
    operator: 'UK',
    lift: 5,
    attributes: {firepower: 3, armour: 4, mobility: 6, range: 8, detection: 9},
    blurb: 'Quiet enough to hear a submarine that is trying not to be heard.',
    draftable: false,
  },
  {
    id: 'fremm',
    code: 'FREMM',
    name: 'FREMM',
    category: 'naval',
    role: 'overwatch',
    operator: 'France / Italy',
    lift: 5,
    attributes: {firepower: 10, armour: 4, mobility: 5, range: 8, detection: 3},
    blurb: 'Two navies, one hull, and a surprising amount of it.',
    draftable: false,
  },
  {
    id: 'sejong',
    code: 'KDX-III',
    name: 'Sejong the Great',
    category: 'naval',
    role: 'overwatch',
    operator: 'South Korea',
    lift: 6,
    attributes: {firepower: 10, armour: 4, mobility: 2, range: 8, detection: 6},
    blurb: 'More missile cells than anything else afloat that is not a carrier.',
    draftable: false,
  },
  {
    id: 'gorshkov',
    code: 'Project 22350',
    name: 'Gorshkov',
    category: 'naval',
    role: 'strike',
    operator: 'Russia',
    lift: 5,
    attributes: {firepower: 10, armour: 3, mobility: 5, range: 8, detection: 4},
    blurb: 'Small for what it carries, which is the point being made.',
    draftable: false,
  },
  {
    id: 'type055',
    code: 'Type 055',
    name: 'Renhai',
    category: 'naval',
    role: 'overwatch',
    operator: 'China',
    lift: 6,
    attributes: {firepower: 10, armour: 6, mobility: 2, range: 8, detection: 4},
    blurb: 'A cruiser in everything but the word used for it.',
    draftable: false,
  },
  {
    id: 'visby',
    code: 'Visby',
    name: 'Visby',
    category: 'naval',
    role: 'screen',
    operator: 'Sweden',
    lift: 4,
    attributes: {firepower: 4, armour: 5, mobility: 10, range: 3, detection: 8},
    blurb: 'Vanishes into an archipelago and is not found again.',
    draftable: false,
  },
  {
    id: 'ada',
    code: 'Ada',
    name: 'Ada',
    category: 'naval',
    role: 'screen',
    operator: 'Turkey',
    lift: 4,
    attributes: {firepower: 6, armour: 5, mobility: 7, range: 5, detection: 7},
    blurb: 'Built at home, sold abroad, and better than its price suggests.',
    draftable: false,
  },
];

export const ASSET_BY_ID: Record<string, Asset> = Object.fromEntries(
  ASSETS.map((a) => [a.id, a]),
);

/** What a new player may pick from. Naval is held back until it has a sea. */
export const DRAFTABLE = ASSETS.filter((a) => a.draftable !== false);

/**
 * The categories actually in play. The counter ring is built from this, so
 * turning naval on in Season 3 closes the ring back up on its own.
 */
export const DRAFTABLE_CATEGORIES: AssetCategory[] = [
  ...new Set(DRAFTABLE.map((a) => a.category)),
];

export function assetById(id: string): Asset | null {
  return ASSET_BY_ID[id] ?? null;
}

export function assetsIn(category: AssetCategory): Asset[] {
  return ASSETS.filter((a) => a.category === category);
}

/** Total lift a list of assets costs to field. */
export function liftOf(ids: string[]): number {
  return ids.reduce((sum, id) => sum + (ASSET_BY_ID[id]?.lift ?? 0), 0);
}

/**
 * Every row that does not sit exactly on its point budget, or strays outside
 * the attribute bounds.
 *
 * Exported rather than kept private because the budget is the only thing
 * stopping the catalogue from acquiring a best asset one edit at a time. A
 * test can fail on this; a reviewer cannot be relied upon to add five numbers
 * in their head seventy-two times.
 */
/**
 * The budget every asset sits on. Fixed for all 72 by the game math spec
 * (docs/GAME-MATH-v1.md): 29-31 points across the five attributes, each
 * 1-10. It used to scale with lift - a cheap asset spent fewer points - and
 * that was right while a squad had a lift budget. The lift budget went on
 * 2026-09-06, which left every cheap asset simply worse; the re-budget of
 * 2026-09-06 (asset-budget-v2) put all 72 on the same footing. Shape is what
 * differs now, never total.
 */
export const BUDGET_MIN = 29;
export const BUDGET_MAX = 31;

export function auditAssets(): string[] {
  const problems: string[] = [];
  for (const a of ASSETS) {
    const spent = pointsSpent(a.attributes);
    if (spent < BUDGET_MIN || spent > BUDGET_MAX) {
      problems.push(`${a.id}: ${spent} points spent, budget is ${BUDGET_MIN}-${BUDGET_MAX}`);
    }
    for (const [key, value] of Object.entries(a.attributes)) {
      if (value < ATTRIBUTE_MIN || value > ATTRIBUTE_MAX) {
        problems.push(`${a.id}: ${key} is ${value}, outside ${ATTRIBUTE_MIN}-${ATTRIBUTE_MAX}`);
      }
    }
  }
  const seen = new Set<string>();
  for (const a of ASSETS) {
    if (seen.has(a.id)) problems.push(`${a.id}: duplicate id`);
    seen.add(a.id);
  }
  // Strict dominance: no asset may match another on every attribute and beat
  // it on one. Equal budgets make this rare; the audit makes it impossible.
  const keys = ['firepower', 'armour', 'mobility', 'range', 'detection'] as const;
  for (const a of ASSETS) {
    for (const b of ASSETS) {
      if (a === b) continue;
      const ge = keys.every((k) => b.attributes[k] >= a.attributes[k]);
      const gt = keys.some((k) => b.attributes[k] > a.attributes[k]);
      if (ge && gt) problems.push(`${b.id} dominates ${a.id}`);
    }
  }
  return problems;
}

/* -------------------------------------------------------------------------- */
/* Lift                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * How much a squad can carry.
 *
 * This is the brake on stacking heavy assets, and it is what stops "no asset
 * is stronger than another" from being a slogan: bigger numbers cost more
 * lift, so a squad of six Abrams is not a choice anybody can make. It also
 * gives three buildings a consequence - the Motor Pool, the Airfield and the
 * Barracks have been upgrade buttons with nothing behind them since the game
 * had buildings.
 *
 * A squad has six slots AND a budget, and early on the budget is the binding
 * one: a new base can fill perhaps three slots with anything heavy, so its
 * first squad is necessarily mixed and learns the counter web by being made
 * to. Late, the budget stops binding and the six slots take over, which is the
 * right way round - by then the player is choosing shape, not affording it.
 */
export const BASE_LIFT = 10;

export function squadLiftBudget(levels: {
  motor_pool: number;
  airfield: number;
  barracks: number;
}): number {
  return (
    BASE_LIFT +
    Math.floor(0.8 * (levels.motor_pool + levels.airfield) + 0.5 * levels.barracks)
  );
}

export function isSquadName(value: unknown): value is SquadName {
  return typeof value === 'string' && (SQUAD_NAMES as readonly string[]).includes(value);
}

/**
 * What a Service Rank does to an attribute.
 *
 * The same curve for every asset, deliberately. Ranking up raises what an asset
 * already is rather than closing the gap to something else, so an Abrams at 30
 * is a better Abrams and never becomes a drone.
 *
 * Geometric: every rank is the same proportional step, RANK_GROWTH, so every
 * season is worth the same multiple and there is no cliff anywhere. Set to
 * 1.045 by the game math specification (docs/GAME-MATH-v1.md, 2026-09-06),
 * which replaced the earlier 1.75 per season (about 1.0576 per rank): rank 50
 * is 8.6x rank 1 instead of 15x - strong but readable, and easier to balance
 * across five seasons. Competitive combat never sees the ceiling anyway,
 * because the Season Readiness Band clamps effective rank.
 *
 * ── Precision ─────────────────────────────────────────────────────────────
 *
 * This used to round to a whole number, which was a live bug: a base-3
 * attribute at rank 2 is 3.135, rounded to 3, so the first rank a player ever
 * bought did nothing to it - and the same held for every low attribute for
 * several ranks. Attributes are now kept to a thousandth (the specification's
 * milli-points) and rounded only for display. Every rank moves every number.
 */
export const RANK_GROWTH = 1.045;
/** What ten ranks - one season - multiply an attribute by. Derived, for copy. */
export const SEASON_GAIN = Number((RANK_GROWTH ** RANKS_PER_SEASON).toFixed(3));
/** Attributes are held to this many decimal places everywhere but the screen. */
export const STAT_PRECISION = 1000;

export function milli(value: number): number {
  return Math.round(value * STAT_PRECISION) / STAT_PRECISION;
}

export function attributeAtLevel(base: number, level: number): number {
  return milli(base * RANK_GROWTH ** (level - 1));
}

/** Power contributed by one asset at one level. What a squad is compared on. */
export function assetPower(asset: Asset, level: number): number {
  const a = asset.attributes;
  const total =
    attributeAtLevel(a.firepower, level) +
    attributeAtLevel(a.armour, level) +
    attributeAtLevel(a.mobility, level) +
    attributeAtLevel(a.range, level) +
    attributeAtLevel(a.detection, level);
  return Math.round(total * 6);
}
