/**
 * Thin client for the game API.
 *
 * Every value returned here was decided by the server. Nothing in this file
 * computes game state - it only reads what it is told, which is the whole
 * point of moving the rules server-side.
 */

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
  resources: Resources;
  productionPerHour: Resources;
  storageCap: number;
  justCompleted: {kind: string; level: number} | null;
  buildings: BuildingView[];
  job: {kind: string; toLevel: number; startedAt: number; completesAt: number} | null;
}

export interface Player {
  id: string;
  username: string;
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
  register: (username: string, password: string) =>
    call<{player: Player}>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({username, password}),
    }),
  login: (username: string, password: string) =>
    call<{player: Player}>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({username, password}),
    }),
  logout: () => call<{ok: true}>('/api/auth/logout', {method: 'POST'}),
  base: () => call<BaseView>('/api/base'),
  upgrade: (kind: string) =>
    call<BaseView>('/api/base/upgrade', {method: 'POST', body: JSON.stringify({kind})}),
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
