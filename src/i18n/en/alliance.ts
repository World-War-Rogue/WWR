/**
 * Founding, browsing, the roster, applications and the crest.
 *
 * See ../en.ts for what this file is part of.
 */
export const ALLIANCE = {
  // Header
  'alliance.unaffiliated': 'Unaffiliated',
  'alliance.done': 'Done',
  'alliance.addCrest': 'Add a crest',
  'alliance.changeCrest': 'Change the crest',
  'alliance.loading': 'Loading…',

  // Ranks. What a rank is called on screen - the stored values stay
  // leader/officer/member. See RANK_KEY in ../../live/Alliance.tsx.
  'alliance.rankLeader': 'General',
  'alliance.rankOfficer': 'Lieutenant',
  'alliance.rankMember': 'Soldier',

  // The alliance you are in
  'alliance.summary': 'Server #{server} · {members} of {capacity} members · {entry} · you are {rank}',
  'alliance.openToAnyone': 'Open to anyone',
  'alliance.applicationsReviewed': 'Applications reviewed',
  'alliance.applications': 'Applications ({count})',
  'alliance.accept': 'Accept',
  'alliance.decline': 'Decline',
  'alliance.roster': 'Roster',
  'alliance.memberStats': '{power} power · CP {commandPost}',
  'alliance.promote': 'Promote',
  'alliance.demote': 'Demote',
  'alliance.makeGeneral': 'Make general',
  'alliance.handoverConfirm': 'Hand command to {name}? You become a lieutenant.',
  'alliance.removeMember': 'Remove',

  // Settings, which only the general sees
  'alliance.settings': 'Settings',
  'alliance.purposePlaceholder': 'What this alliance is for.',
  'alliance.openJoin': 'Anyone may join without applying',
  'alliance.crestColour': 'Crest colour',
  'alliance.crestColourHint': 'Used behind the tag when no picture is set.',
  'alliance.removeCrest': 'Remove crest',
  'alliance.crestTooLarge': 'That picture is too large. Try one under 16MB.',

  // Leaving and disbanding
  'alliance.disband': 'Disband alliance',
  'alliance.leave': 'Leave alliance',
  'alliance.disbandConfirm': 'Disband [{tag}]? Everyone in it is removed. This cannot be undone.',
  'alliance.leaveConfirm': 'Leave [{tag}]?',

  // Founding one
  'alliance.applied': 'Applied to {alliances}. Waiting on an officer.',
  'alliance.found': 'Found an alliance',
  'alliance.tagPlaceholder': 'TAG',
  'alliance.namePlaceholder': 'Alliance name',
  'alliance.descriptionPlaceholder': 'What it is for. Other players read this before joining.',
  'alliance.foundSubmit': 'Found it',
  'alliance.foundRules': 'Tag must be 2-4 letters, no numbers or symbols. All three fields are required. Up to {capacity} members.',

  // The same rules again as errors. Their English matches TAG_RULE and
  // NAME_RULE in shared/alliances.ts, which the Worker also answers with:
  // shared code cannot read the dictionary, so the client says it in the
  // player's language and the server's copy is the fallback.
  'alliance.tagRule': 'Tag must be 2-4 letters, no numbers or symbols.',
  'alliance.nameRule': 'Name must be 3-24 characters: letters, spaces and apostrophes, starting with a letter.',
  'alliance.descriptionRule': 'Say what the alliance is for, in a sentence or more.',

  // Browsing
  'alliance.browse': 'Alliances on your server',
  'alliance.browsing': 'Looking…',
  'alliance.browseEmpty': 'None yet. Found the first one and everybody else joins you.',
  'alliance.ledBy': 'Led by {name}',
  'alliance.ledByNobody': 'Led by nobody',
  'alliance.full': 'Full',
  'alliance.join': 'Join',
  'alliance.apply': 'Apply',
  'alliance.members': 'Members',
  'alliance.entry': 'Entry',
  'alliance.entryOpen': 'Open',
  'alliance.entryReviewed': 'Reviewed',

  // Errors the client writes itself
  'alliance.loadFailed': 'Could not load your alliance.',
  'alliance.serverUnreachable': 'Could not reach the server.',
} as const;
