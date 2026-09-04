/**
 * The source text. English, and the only file written by hand.
 *
 * Keys are `screen.thing`, so a translator - human or model - can see roughly
 * where a string appears, which is most of the context they get. Anything with
 * a placeholder uses {braces}, never string concatenation, because word order
 * moves between languages and a sentence assembled from fragments cannot be
 * translated at all.
 *
 * Adding a key here and running `npm run i18n` translates it everywhere.
 */
export const EN = {
  // Header and navigation
  'nav.alliance': 'Alliance',
  'nav.worldMap': 'World map',
  'nav.myBase': 'My base',
  'nav.squads': 'Squads',
  'nav.back': 'Back',
  'nav.close': 'Close',

  // Player menu
  'menu.viewProfile': 'View full profile',
  'menu.customise': 'Customise base',
  'menu.squads': 'Squads',
  'menu.accessRequests': 'Access requests',
  'menu.signOut': 'Sign out',
  'menu.noAlliance': 'No alliance',
  'menu.power': 'Power',
  'menu.commandPost': 'Command Post',
  'menu.server': 'Server',

  // Resources
  'resource.fuel': 'Fuel',
  'resource.steel': 'Steel',
  'resource.munitions': 'Munitions',
  'resource.alloy': 'Alloy',

  // Base
  'base.upgrade': 'Upgrade',
  'base.upgrading': 'Upgrading',
  'base.storageCap': 'Storage cap {amount} per resource. Raising the Command Post raises the cap and unlocks higher levels everywhere else.',
  'base.level': 'Lv {level}',

  // World map
  'map.homeWorld': 'Home world',
  'map.battleTheatre': 'Battle theatre',
  'map.basesInView': '{count} bases in view',
  'map.oneBaseInView': '1 base in view',
  'map.youAt': 'you at {x}, {y}',
  'map.unplaced': 'unplaced',
  'map.openGround': 'Open ground',
  'map.moveHere': 'Move here',
  'map.relocating': 'Relocating…',
  'map.viewProfile': 'View profile',
  'map.setRendezvous': 'Set rendezvous here',
  'map.settingRendezvous': 'Setting…',
  'map.reports': 'Reports',
  'map.home': 'Home',
  'map.unreachable': 'Could not reach the server.',
  'map.retrying': 'Retrying…',

  // Allegiance
  'allegiance.you': 'You',
  'allegiance.ally': 'Your alliance',
  'allegiance.server': 'Your server',
  'allegiance.neutral': 'Another server',
  'allegiance.hostile': 'At war',

  // Chat
  'chat.comms': 'Comms',
  'chat.server': 'Server',
  'chat.alliance': 'Alliance',
  'chat.leadership': 'Leadership',
  'chat.private': 'Private',
  'chat.send': 'Send',
  'chat.reply': 'Reply',
  'chat.replyingTo': 'Replying to',
  'chat.messagePlaceholder': 'Message {channel} — @ to name someone',
  'chat.noChannel': 'No channel',
  'chat.nothingYet': 'Nothing yet.',
  'chat.allConversations': 'All conversations',
  'chat.noMessagesYet': 'No messages yet',
  'chat.messageRemoved': 'message removed',
  'chat.didNotSend': 'That did not send.',

  // Squads
  'squads.title': 'Squads',
  'squads.liftBudget': 'Lift budget {budget} per squad',
  'squads.power': 'power',
  'squads.lift': 'lift',
  'squads.empty': 'empty',
  'squads.slot': '{squad} · slot {slot}',
  'squads.liftFree': '{amount} lift free',
  'squads.clearSlot': 'Clear slot',
  'squads.cancel': 'Cancel',
  'squads.inSquad': 'in {squad}',
  'squads.readingRoster': 'Reading the roster…',
  'squads.nothingFits': 'Nothing you hold fits in {amount} lift.',
  'squads.nothingFitsHint': 'Clear a slot, or raise the Motor Pool, Airfield or Barracks to carry more.',
  'squads.hint': 'Tap a slot to fill it. Lift is the brake: heavier assets cost more, and the budget comes from your Motor Pool, Airfield and Barracks — so early on a squad has to be mixed, and that is the point.',

  // Assets
  'assets.title': 'Assets',
  'assets.search': 'Search',
  'assets.all': 'All',
  'assets.showing': '{shown} of {total}',
  'assets.nothingMatches': 'Nothing matches that.',
  'assets.comingWithSeason': 'Coastal season',
  'assets.losesTo': 'loses to {categories}',
  'assets.noneStronger': 'No asset is stronger than another. Bigger numbers cost more lift, and a squad has a lift budget — so the choice is what a squad is for, not which entries are best.',

  // Attributes
  'attr.firepower': 'Firepower',
  'attr.armour': 'Armour',
  'attr.mobility': 'Mobility',
  'attr.range': 'Range',
  'attr.detection': 'Detection',

  // Battle reports
  'battles.title': 'Battle reports',
  'battles.mine': 'Mine',
  'battles.alliance': 'Alliance',
  'battles.allReports': 'All reports',
  'battles.none': 'No battles yet.',
  'battles.noneHint': 'Reports appear here the moment combat exists and somebody fights one.',
  'battles.won': 'won',
  'battles.lost': 'lost',
  'battles.drew': 'drew',
  'battles.attacked': 'Attacked',
  'battles.defendedAgainst': 'Defended against',
  'battles.attacker': 'Attacker',
  'battles.defender': 'Defender',
  'battles.losses': 'Losses',
  'battles.carriedOff': 'Carried off',
  'battles.roundByRound': 'Round by round',
  'battles.notes': 'Notes',
  'battles.reading': 'Reading the wire…',

  // Time
  'time.justNow': 'just now',
  'time.minutesAgo': '{count}m ago',
  'time.hoursAgo': '{count}h ago',
  'time.daysAgo': '{count}d ago',
} as const;
