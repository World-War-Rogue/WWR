/**
 * Rank labels, in the player's language.
 *
 * The stored values stay 'leader', 'officer' and 'member' - shared/alliances.ts
 * says why. Only the labels move, and they cannot move into that file: shared
 * code runs on the Worker too, and the Worker has no dictionary to read from.
 *
 * Its own module rather than an export from Alliance.tsx because Chat shows
 * ranks as well, and a chat screen importing the alliance screen to get three
 * words is the kind of coupling that quietly makes one of them impossible to
 * change. Two screens needing the same lookup is what a module is for.
 */
import type {MessageKey} from '../i18n';

export const RANK_KEY: Record<'leader' | 'officer' | 'member', MessageKey> = {
  leader: 'alliance.rankLeader',
  officer: 'alliance.rankOfficer',
  member: 'alliance.rankMember',
};
