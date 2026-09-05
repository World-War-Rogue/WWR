/**
 * Thin client for the game API.
 *
 * Every value returned here was decided by the server. Nothing in this file
 * computes game state - it only reads what it is told, which is the whole
 * point of moving the rules server-side.
 */

import type {CosmeticItem, CosmeticSlot, Loadout} from '../../shared/cosmetics';
import type {BattleDetail, BattleSummary} from '../../shared/battles';
import type {Deployment, MarchKind} from '../../shared/march';

export interface ChatMessage {
  id: string;
  author: string;
  body: string;
  createdAt: number;
  rank: 'leader' | 'officer' | 'member' | null;
  hasPortrait: number;
  /** The language it was typed in. */
  lang: string;
  /** Present when the reader's language differs and a translation exists. */
  translated: string | null;
  /** The message this one answers, when it answers one. */
  replyTo: string | null;
  replyAuthor: string | null;
  replyBody: string | null;
}

export interface PendingMention {
  messageId: string;
  channel: string;
  createdAt: number;
  author: string;
  body: string;
}

export interface ChatChannels {
  channels: {server: string | null; alliance: string | null; leadership: string | null};
  threads: Array<{channel: string; other: string; updatedAt: number}>;
  groups: Array<{id: string; name: string; members: number; channel: string}>;
  unread: Record<string, number>;
  /** The most recent message in each channel, for previews. */
  latest: Record<string, {author: string; body: string; createdAt: number}>;
  rank: 'leader' | 'officer' | 'member' | null;
  serverTime: number;
}

export interface AllianceSummary {
  id: string;
  tag: string;
  name: string;
  description: string | null;
  openJoin: boolean;
  members: number;
  emblemTint: string;
  hasCrest: boolean;
  /** Callsign of whoever runs it. Null only if the leader row is missing. */
  leader: string | null;
  /** Every member's power added together. */
  power: number;
}

export interface AllianceMember {
  username: string;
  rank: 'leader' | 'officer' | 'member';
  power: number;
  commandPost: number;
  joinedAt: number;
  portrait: {glyph: string; tint: string; hasImage: boolean};
}

export interface AllianceView {
  alliance: {
    id: string;
    tag: string;
    name: string;
    description: string | null;
    homeWorldId: number;
    openJoin: boolean;
    createdAt: number;
    capacity: number;
    emblemTint: string;
    hasCrest: boolean;
  } | null;
  rank?: 'leader' | 'officer' | 'member';
  roster?: AllianceMember[];
  applications?: Array<{username: string; createdAt: number}>;
  applied?: Array<{tag: string; name: string}>;
}

export interface Profile {
  username: string;
  portrait: {glyph: string; tint: string; hasImage: boolean};
  motto: string | null;
  country: string;
  language: string;
  homeWorldId: number | null;
  power: number;
  commandPost: number;
  baseName: string;
  skin: string;
  alliance: {tag: string; name: string} | null;
  plot: {x: number; y: number} | null;
  joinedAt: number | null;
}

export type ResourceKind = 'fuel' | 'steel' | 'munitions' | 'alloy';
export type Resources = Record<ResourceKind, number>;

export const RESOURCE_ORDER: ResourceKind[] = ['fuel', 'steel', 'munitions', 'alloy'];

export interface BuildingView {
  kind: string;
  name: string;
  blurb: string;
  level: number;
  maxLevel: number;
  canUpgrade: boolean;
  blockedByCommandPost: boolean;
  nextCost: Resources | null;
  nextDurationMs: number | null;
}

export interface BaseView {
  /** The server's clock when it answered. Offsets are measured against this. */
  serverTime: number;
  name: string;
  skin: string;
  loadout: Loadout;
  resources: Resources;
  productionPerHour: Resources;
  storageCap: number;
  justCompleted: {kind: string; level: number} | null;
  buildings: BuildingView[];
  job: {kind: string; toLevel: number; startedAt: number; completesAt: number} | null;
}

export interface SkinSpec {
  id: string;
  name: string;
  blurb: string;
  palette: {ground: string; structure: string; accent: string};
}

export interface PlacedBase {
  x: number;
  y: number;
  skin: string;
  username: string;
  level: number;
  worldId: number;
  /** Home world, not current world - what "same server" means in an event. */
  homeWorldId: number | null;
  /** Whose colours they fly. Null when they belong to no alliance. */
  allianceId: string | null;
  /** The equipped cosmetic layers, sent per base so the map can draw them. */
  banner: string;
  emblem: string;
  lights: string;
  decal: string;
}

export interface WorldView {
  viewport: {x: number; y: number; w: number; h: number};
  world: {id: number; name: string; kind: string; extent: number; closesAt: number | null};
  worlds: Array<{id: number; name: string; kind: string}>;
  you: {
    username: string;
    plot: {x: number; y: number} | null;
    homeWorldId: number | null;
    allianceId: string | null;
    rank: string | null;
    /** Whether this player may plant the marker. Decided by the server. */
    maySetRally: boolean;
    /** Milliseconds until they may answer one; 0 when they may now. */
    rallyCooldownMs: number;
    /** Every squad of yours that is not at home, and what it is doing. */
    deployments: Deployment[];
  };
  skins: Record<string, SkinSpec>;
  bases: PlacedBase[];
  /** The alliance's marker, when there is one in the world being viewed. */
  rally: RallyPoint | null;
  /** Squads in transit, so a defender can see what is coming. */
  marches: MarchView[];
}

export interface MarchView {
  id: string;
  attacker: string;
  defender: string;
  squad: string;
  from: {x: number; y: number};
  to: {x: number; y: number};
  departedAt: number;
  arrivesAt: number;
  mine: boolean;
  incoming: boolean;
  /**
   * What the column is for. An attack and a reinforcement look different on
   * the map on purpose - an alliance member watching a friendly squad cross
   * their plot should not have to read the name to know it is not an attack -
   * and a return leg is drawn dimly because there is nothing left to decide
   * about it.
   */
  kind: MarchKind;
}

export interface SquadView {
  owned: Array<{assetId: string; level: number}>;
  squads: Record<string, Array<string | null>>;
  lift: {budget: number; used: Record<string, number>};
  power: Record<string, number>;
  buildings: {motor_pool: number; airfield: number; barracks: number};
}

export interface RallyPoint {
  x: number;
  y: number;
  worldId: number;
  setBy: string;
  setAt: number;
}

export interface Player {
  id: string;
  username: string;
  role?: string;
  /** The language the interface is drawn in. Chosen in the profile. */
  language?: string;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'same-origin',
    headers: {'Content-Type': 'application/json', ...(init?.headers ?? {})},
  });

  const raw = await response.text();
  let parsed: unknown = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    // An HTML body means the request never reached the Worker and the static
    // asset fallback answered instead. Say that plainly rather than reporting
    // a confusing JSON parse failure.
    throw new ApiError('The server returned a page instead of data.', response.status);
  }

  if (!response.ok) {
    const message =
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as {error?: unknown}).error === 'string'
        ? (parsed as {error: string}).error
        : `Request failed (${response.status}).`;
    throw new ApiError(message, response.status);
  }
  return parsed as T;
}

export const api = {
  me: () => call<{player: Player}>('/api/me'),
  checkCallsign: (name: string) =>
    call<{available: boolean; reason?: string}>(
      `/api/access/callsign?name=${encodeURIComponent(name)}`,
    ),
  requestAccess: (body: {
    email: string;
    username: string;
    password: string;
    country: string;
    locale: string;
    skin: string;
    ageConfirmed: boolean;
  }) =>
    call<{status: string; message: string}>('/api/access/request', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  login: (username: string, password: string) =>
    call<{player: Player}>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({username, password}),
    }),
  logout: () => call<{ok: true}>('/api/auth/logout', {method: 'POST'}),
  base: () => call<BaseView>('/api/base'),
  world: (x: number, y: number, w: number, h: number, worldId?: number) => {
    const params = new URLSearchParams({x: String(x), y: String(y), w: String(w), h: String(h)});
    if (worldId !== undefined) params.set('world', String(worldId));
    return call<WorldView>(`/api/world?${params.toString()}`);
  },
  move: (x: number, y: number, worldId?: number) =>
    call<{world: {id: number; name: string}; plot: {x: number; y: number}}>('/api/world/move', {
      method: 'POST',
      body: JSON.stringify(worldId === undefined ? {x, y} : {x, y, worldId}),
    }),
  setRally: (x: number, y: number, worldId?: number) =>
    call<{rally: RallyPoint | null}>('/api/rally/set', {
      method: 'POST',
      body: JSON.stringify(worldId === undefined ? {x, y} : {x, y, worldId}),
    }),
  rally: () =>
    call<{world: {id: number; name: string}; plot: {x: number; y: number}; cooldownMs: number}>(
      '/api/rally',
      {method: 'POST'},
    ),
  squads: () => call<SquadView>('/api/squads'),
  attack: (squad: string, x: number, y: number) =>
    call<{arrivesAt: number; seconds: number}>('/api/attack', {
      method: 'POST',
      body: JSON.stringify({squad, x, y}),
    }),
  recall: (squad: string) =>
    call<{arrivesAt: number}>('/api/recall', {
      method: 'POST',
      body: JSON.stringify({squad}),
    }),
  assignSlot: (squad: string, slot: number, assetId: string | null) =>
    call<SquadView>('/api/squads/assign', {
      method: 'POST',
      body: JSON.stringify({squad, slot, assetId}),
    }),
  moveSlot: (
    from: {squad: string; slot: number},
    to: {squad: string; slot: number},
  ) => call<SquadView>('/api/squads/move', {method: 'POST', body: JSON.stringify({from, to})}),
  battles: (scope: 'mine' | 'alliance', before?: number) => {
    const params = new URLSearchParams({scope});
    if (before !== undefined) params.set('before', String(before));
    return call<{scope: string; battles: BattleSummary[]; retentionDays: number}>(
      `/api/battles?${params.toString()}`,
    );
  },
  battle: (id: string) =>
    call<{summary: BattleSummary; detail: BattleDetail}>(
      `/api/battle?id=${encodeURIComponent(id)}`,
    ),
  chatChannels: () => call<ChatChannels>('/api/chat/channels'),
  chatRead: (channel: string, since?: number) => {
    const params = new URLSearchParams({channel});
    if (since !== undefined) params.set('since', String(since));
    return call<{channel: string; messages: ChatMessage[]; serverTime: number}>(
      `/api/chat?${params.toString()}`,
    );
  },
  chatSend: (channel: string, body: string, replyTo?: string | null) =>
    call<{ok: true; serverTime: number; mentioned: string[]}>('/api/chat', {
      method: 'POST',
      body: JSON.stringify(replyTo ? {channel, body, replyTo} : {channel, body}),
    }),
  chatMentionable: (channel: string) =>
    call<{channel: string; names: string[]}>(
      `/api/chat/mentionable?channel=${encodeURIComponent(channel)}`,
    ),
  chatMentions: () => call<{mentions: PendingMention[]}>('/api/chat/mentions'),
  chatCreateGroup: (name: string) =>
    call<{channel: string; id: string; name: string}>('/api/chat/group', {
      method: 'POST',
      body: JSON.stringify({name}),
    }),
  chatAddToGroup: (groupId: string, username: string) =>
    call<ChatChannels>('/api/chat/group/add', {
      method: 'POST',
      body: JSON.stringify({groupId, username}),
    }),
  chatLeaveGroup: (groupId: string) =>
    call<ChatChannels>('/api/chat/group/leave', {
      method: 'POST',
      body: JSON.stringify({groupId}),
    }),
  chatOpenDm: (username: string) =>
    call<{channel: string; other: string}>('/api/chat/dm', {
      method: 'POST',
      body: JSON.stringify({username}),
    }),
  alliance: () => call<AllianceView>('/api/alliance'),
  browseAlliances: () =>
    call<{homeWorldId: number; capacity: number; alliances: AllianceSummary[]}>(
      '/api/alliance/browse',
    ),
  createAlliance: (body: {
    tag: string;
    name: string;
    description: string;
    openJoin: boolean;
  }) => call<AllianceView>('/api/alliance/create', {method: 'POST', body: JSON.stringify(body)}),
  joinAlliance: (allianceId: string) =>
    call<AllianceView>('/api/alliance/join', {
      method: 'POST',
      body: JSON.stringify({allianceId}),
    }),
  leaveAlliance: (disband = false) =>
    call<AllianceView>('/api/alliance/leave', {
      method: 'POST',
      body: JSON.stringify({disband}),
    }),
  decideApplication: (username: string, accept: boolean) =>
    call<AllianceView>('/api/alliance/decide', {
      method: 'POST',
      body: JSON.stringify({username, accept}),
    }),
  allianceRank: (username: string, action: 'promote' | 'demote' | 'remove' | 'handover') =>
    call<AllianceView>('/api/alliance/rank', {
      method: 'POST',
      body: JSON.stringify({username, action}),
    }),
  setAllianceCrest: (body: {image?: string | null; tint?: string}) =>
    call<AllianceView>('/api/alliance/crest', {method: 'POST', body: JSON.stringify(body)}),
  allianceSettings: (body: {description: string; openJoin: boolean}) =>
    call<AllianceView>('/api/alliance/settings', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  profile: (name: string) =>
    call<{profile: Profile}>(`/api/profile?name=${encodeURIComponent(name)}`),
  saveProfile: (edit: {glyph: string; tint: string; motto: string | null; language: string}) =>
    call<{profile: Profile}>('/api/profile', {
      method: 'POST',
      body: JSON.stringify(edit),
    }),
  setPortrait: (image: string | null) =>
    call<{profile: Profile}>('/api/profile/portrait', {
      method: 'POST',
      body: JSON.stringify({image}),
    }),
  upgrade: (kind: string) =>
    call<BaseView>('/api/base/upgrade', {method: 'POST', body: JSON.stringify({kind})}),
  cosmetics: () =>
    call<{
      slots: CosmeticSlot[];
      items: CosmeticItem[];
      owned: string[];
      loadout: Loadout;
      skinIds: string[];
      skinsOwned: string[];
      skin: string;
    }>('/api/cosmetics'),
  equip: (loadout: Loadout, skin: string) =>
    call<{loadout: Loadout; skin: string}>('/api/cosmetics/equip', {
      method: 'POST',
      body: JSON.stringify({...loadout, skin}),
    }),
};

export function formatDuration(ms: number): string {
  if (ms <= 0) return 'complete';
  const total = Math.ceil(ms / 1000);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (days > 0) return `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  return `${minutes}:${pad(seconds)}`;
}

export function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 10_000) return `${(value / 1000).toFixed(1)}K`;
  return Math.floor(value).toLocaleString('en-US');
}

export const RESOURCE_LABEL: Record<ResourceKind, string> = {
  fuel: 'Fuel',
  steel: 'Steel',
  munitions: 'Munitions',
  alloy: 'Alloy',
};
