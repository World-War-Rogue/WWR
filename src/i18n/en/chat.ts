/** chat strings. See ../en.ts for what this file is part of. */
export const CHAT = {
  // Chat
  'chat.comms': 'Comms',

  // The tabs, and the tooltip that says who is in each one
  'chat.server': 'Server',
  'chat.alliance': 'Alliance',
  'chat.leadership': 'Leadership',
  'chat.private': 'Private',
  'chat.serverBlurb': 'Everyone on your server.',
  'chat.allianceBlurb': 'Everyone in your alliance.',
  'chat.leadershipBlurb': 'The general and the lieutenants.',
  'chat.privateBlurb': 'One player, one conversation.',
  'chat.tabLocked': 'Not available to you yet',

  // The composer
  'chat.send': 'Send',
  'chat.reply': 'Reply',
  'chat.replyingTo': 'Replying to',
  'chat.messagePlaceholder': 'Message {channel} — @ to name someone',
  'chat.noChannel': 'No channel',
  'chat.someone': 'someone',
  'chat.messageRemoved': 'message removed',

  // Private conversations and groups
  'chat.allConversations': 'All conversations',
  'chat.callsign': 'Callsign',
  'chat.startDm': 'Message',
  'chat.newGroupName': 'New group name',
  'chat.newGroup': 'Group',
  'chat.addCallsign': 'Add a callsign',
  'chat.add': 'Add',
  'chat.leave': 'Leave',
  'chat.leaveConfirm': 'Leave this group?',

  // Empty states
  'chat.noMessagesYet': 'No messages yet',
  'chat.emptyChannel': 'Nothing yet. {about}',
  'chat.noConversations': 'No conversations yet. Type a callsign above, or open somebody\'s profile from the map.',
  'chat.startPrivateHint': 'Type a callsign above to start a conversation.',
  'chat.leadershipOnly': 'Only the general and the lieutenants can see this channel.',
  'chat.allianceOnly': 'Join an alliance to use this channel.',
  'chat.notDeployed': 'You have not been deployed yet.',

  // What went wrong
  'chat.didNotSend': 'That did not send.',
  'chat.unreachable': 'Chat is unreachable.',
  'chat.couldNotOpen': 'Could not open that conversation.',
  'chat.couldNotStartGroup': 'Could not start that group.',
  'chat.couldNotAdd': 'Could not add them.',
  'chat.couldNotLeave': 'Could not leave that group.',
} as const;
