/**
 * Password hashing and session handling.
 *
 * PBKDF2-SHA256 via WebCrypto, which is available in the Workers runtime and
 * needs no dependencies. Parameters are stored alongside the hash so the work
 * factor can be raised later without invalidating existing accounts.
 */

// 100k is the Workers runtime's hard ceiling for PBKDF2 - it rejects anything
// higher outright. That is below current OWASP guidance for this algorithm, so
// it is the platform setting the work factor rather than a choice. The
// iteration count is stored in each hash, so raising it later (or moving to a
// stronger KDF) can be done without invalidating existing accounts.
const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const KEY_BITS = 256;

export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
export const SESSION_COOKIE = 'wwr_session';

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    {name: 'PBKDF2', hash: 'SHA-256', salt, iterations},
    key,
    KEY_BITS,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derive(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toBase64(salt)}$${toBase64(hash)}`;
}

/** Constant-time comparison, so a timing signal never leaks the hash. */
function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const iterations = Number.parseInt(parts[1], 10);
  if (!Number.isFinite(iterations) || iterations < 1000) return false;
  const candidate = await derive(password, fromBase64(parts[2]), iterations);
  return equalBytes(candidate, fromBase64(parts[3]));
}

export function newToken(): string {
  return toBase64(crypto.getRandomValues(new Uint8Array(32)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function newId(): string {
  return crypto.randomUUID();
}

export function readSessionCookie(request: Request): string | null {
  const header = request.headers.get('Cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === SESSION_COOKIE) return rest.join('=') || null;
  }
  return null;
}

export function sessionCookie(token: string, maxAgeSeconds: number): string {
  return [
    `${SESSION_COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ].join('; ');
}

export interface Credentials {
  username: string;
  password: string;
}

export function validateCredentials(body: unknown): {ok: true; value: Credentials} | {ok: false; error: string} {
  if (typeof body !== 'object' || body === null) return {ok: false, error: 'Expected a JSON object.'};
  const {username, password} = body as Record<string, unknown>;
  if (typeof username !== 'string' || typeof password !== 'string') {
    return {ok: false, error: 'Username and password are required.'};
  }
  const trimmed = username.trim();
  if (!/^[A-Za-z0-9_.-]{3,20}$/.test(trimmed)) {
    return {
      ok: false,
      error: 'Callsign must be 3-20 characters, letters, numbers, dot, dash or underscore.',
    };
  }
  if (password.length < 8 || password.length > 200) {
    return {ok: false, error: 'Password must be at least 8 characters.'};
  }
  return {ok: true, value: {username: trimmed, password}};
}
