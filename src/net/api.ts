/**
 * Thin client for the game API.
 *
 * Every value returned here was decided by the server. Nothing in this file
 * computes game state - it only reads what it is told, which is the whole
 * point of moving the rules server-side.
 */

import type {CosmeticItem, CosmeticSlot, Loadout} from '../../shared/cosmetics';

export interface Profile {
  username: string;
  portrait: {glyph: string; tint: string};
  motto: string | null;
  country: string;
  homeWorldId: number | null;
  power: number;
  commandPost: number;
  baseName: string;
  skin: string;
  alliance: string | null;
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
  };
  skins: Record<string, SkinSpec>;
  bases: PlacedBase[];
}

export interface Player {
  id: string;
  username: string;
  role?: string;
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
  profile: (name: string) =>
    call<{profile: Profile}>(`/api/profile?name=${encodeURIComponent(name)}`),
  saveProfile: (edit: {glyph: string; tint: string; motto: string | null}) =>
    call<{profile: Profile}>('/api/profile', {
      method: 'POST',
      body: JSON.stringify(edit),
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
