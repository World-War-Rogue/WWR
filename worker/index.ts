/**
 * World War Rogue API.
 *
 * Requests to /api/* are handled here; everything else falls through to the
 * static assets binding, which serves the built React client.
 */
import {
  SESSION_TTL_MS,
  hashPassword,
  newId,
  newToken,
  readSessionCookie,
  sessionCookie,
  validateCredentials,
  verifyPassword,
} from './auth';
import {
  BUILDINGS,
  BUILDING_KINDS,
  type BuildingKind,
  type ResourceKind,
  STORAGE_CAP,
  isBuildingKind,
  maxAllowedLevel,
  productionPerHour,
  upgradeCost,
  upgradeDurationMs,
} from './game';

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
}

const RESOURCES: ResourceKind[] = ['fuel', 'steel', 'munitions', 'alloy'];

function json(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {'Content-Type': 'application/json; charset=utf-8', ...(init.headers ?? {})},
  });
}

function fail(status: number, error: string): Response {
  return json({error}, {status});
}

interface PlayerRow {
  id: string;
  username: string;
}

async function authenticate(request: Request, env: Env): Promise<PlayerRow | null> {
  const token = readSessionCookie(request);
  if (!token) return null;
  const row = await env.DB.prepare(
    `SELECT p.id AS id, p.username AS username
       FROM sessions s JOIN players p ON p.id = s.player_id
      WHERE s.token = ?1 AND s.expires_at > ?2`,
  )
    .bind(token, Date.now())
    .first<PlayerRow>();
  return row ?? null;
}

/** Creates the starting base for a new player. */
async function seedBase(env: Env, playerId: string, username: string, now: number): Promise<void> {
  const statements = [
    env.DB.prepare(
      `INSERT INTO bases (player_id, name, resources_at, created_at) VALUES (?1, ?2, ?3, ?3)`,
    ).bind(playerId, `${username}'s Forward Base`, now),
    ...BUILDING_KINDS.map((kind) =>
      env.DB.prepare(`INSERT INTO buildings (player_id, kind, level) VALUES (?1, ?2, ?3)`).bind(
        playerId,
        kind,
        kind === 'command_post' ? 1 : 0,
      ),
    ),
  ];
  await env.DB.batch(statements);
}

interface BaseRow {
  player_id: string;
  name: string;
  fuel: number;
  steel: number;
  munitions: number;
  alloy: number;
  resources_at: number;
}

interface JobRow {
  id: string;
  kind: string;
  to_level: number;
  started_at: number;
  completes_at: number;
}

/**
 * Reads the base and brings it up to date.
 *
 * This is where the "no ticking loop" model lives: production accrued since
 * resources_at is settled now, and any build job whose completes_at has passed
 * is applied now. Nothing runs in the background; state becomes true the moment
 * somebody looks at it.
 */
async function settleAndLoad(env: Env, playerId: string, now: number) {
  const base = await env.DB.prepare(`SELECT * FROM bases WHERE player_id = ?1`)
    .bind(playerId)
    .first<BaseRow>();
  if (!base) return null;

  const buildingRows = await env.DB.prepare(
    `SELECT kind, level FROM buildings WHERE player_id = ?1`,
  )
    .bind(playerId)
    .all<{kind: string; level: number}>();

  const levels = Object.fromEntries(BUILDING_KINDS.map((k) => [k, 0])) as Record<BuildingKind, number>;
  for (const row of buildingRows.results ?? []) {
    if (isBuildingKind(row.kind)) levels[row.kind] = row.level;
  }

  let job = await env.DB.prepare(
    `SELECT id, kind, to_level, started_at, completes_at
       FROM build_jobs WHERE player_id = ?1 AND collected_at IS NULL`,
  )
    .bind(playerId)
    .first<JobRow>();

  const writes: D1PreparedStatement[] = [];

  // Apply a finished upgrade before computing production, so the new level
  // starts earning from the instant it completed rather than from now.
  let productionFrom = base.resources_at;
  let completedJob: {kind: BuildingKind; level: number} | null = null;
  if (job && job.completes_at <= now && isBuildingKind(job.kind)) {
    levels[job.kind] = job.to_level;
    completedJob = {kind: job.kind, level: job.to_level};
    writes.push(
      env.DB.prepare(`UPDATE buildings SET level = ?3 WHERE player_id = ?1 AND kind = ?2`).bind(
        playerId,
        job.kind,
        job.to_level,
      ),
      env.DB.prepare(`UPDATE build_jobs SET collected_at = ?2 WHERE id = ?1`).bind(job.id, now),
    );
    job = null;
  }

  const rate = productionPerHour(levels);
  const cap = STORAGE_CAP(levels.command_post);
  const hours = Math.max(0, now - productionFrom) / 3_600_000;
  const resources = {
    fuel: base.fuel,
    steel: base.steel,
    munitions: base.munitions,
    alloy: base.alloy,
  } as Record<ResourceKind, number>;
  for (const kind of RESOURCES) {
    resources[kind] = Math.min(cap, Math.floor(resources[kind] + rate[kind] * hours));
  }

  writes.push(
    env.DB.prepare(
      `UPDATE bases SET fuel = ?2, steel = ?3, munitions = ?4, alloy = ?5, resources_at = ?6
        WHERE player_id = ?1`,
    ).bind(playerId, resources.fuel, resources.steel, resources.munitions, resources.alloy, now),
  );

  await env.DB.batch(writes);

  return {base, levels, resources, rate, cap, job, completedJob};
}

function baseView(state: NonNullable<Awaited<ReturnType<typeof settleAndLoad>>>, now: number) {
  return {
    serverTime: now,
    name: state.base.name,
    resources: state.resources,
    productionPerHour: state.rate,
    storageCap: state.cap,
    justCompleted: state.completedJob,
    buildings: BUILDING_KINDS.map((kind) => {
      const level = state.levels[kind];
      const spec = BUILDINGS[kind];
      const ceiling = maxAllowedLevel(kind, state.levels.command_post);
      return {
        kind,
        name: spec.name,
        blurb: spec.blurb,
        level,
        maxLevel: spec.maxLevel,
        canUpgrade: level < ceiling,
        blockedByCommandPost: level >= ceiling && level < spec.maxLevel,
        nextCost: level < spec.maxLevel ? upgradeCost(kind, level) : null,
        nextDurationMs: level < spec.maxLevel ? upgradeDurationMs(kind, level) : null,
      };
    }),
    job: state.job
      ? {
          kind: state.job.kind,
          toLevel: state.job.to_level,
          startedAt: state.job.started_at,
          completesAt: state.job.completes_at,
        }
      : null,
  };
}

async function handleRegister(request: Request, env: Env): Promise<Response> {
  const parsed = validateCredentials(await request.json().catch(() => null));
  if (!parsed.ok) return fail(400, parsed.error);
  const {username, password} = parsed.value;
  const now = Date.now();
  const usernameKey = username.toLowerCase();

  const existing = await env.DB.prepare(`SELECT id FROM players WHERE username_key = ?1`)
    .bind(usernameKey)
    .first();
  if (existing) return fail(409, 'That callsign is taken.');

  const id = newId();
  await env.DB.prepare(
    `INSERT INTO players (id, username, username_key, password_hash, created_at, last_seen_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?5)`,
  )
    .bind(id, username, usernameKey, await hashPassword(password), now)
    .run();
  await seedBase(env, id, username, now);

  return startSession(env, id, username, now);
}

async function handleLogin(request: Request, env: Env): Promise<Response> {
  const parsed = validateCredentials(await request.json().catch(() => null));
  if (!parsed.ok) return fail(400, parsed.error);
  const {username, password} = parsed.value;

  const row = await env.DB.prepare(
    `SELECT id, username, password_hash FROM players WHERE username_key = ?1`,
  )
    .bind(username.toLowerCase())
    .first<{id: string; username: string; password_hash: string}>();

  // Same response whether the account is missing or the password is wrong, so
  // the endpoint cannot be used to enumerate callsigns.
  if (!row || !(await verifyPassword(password, row.password_hash))) {
    return fail(401, 'Callsign or password is incorrect.');
  }
  return startSession(env, row.id, row.username, Date.now());
}

async function startSession(env: Env, playerId: string, username: string, now: number): Promise<Response> {
  const token = newToken();
  const expiresAt = now + SESSION_TTL_MS;
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO sessions (token, player_id, created_at, expires_at) VALUES (?1, ?2, ?3, ?4)`,
    ).bind(token, playerId, now, expiresAt),
    env.DB.prepare(`UPDATE players SET last_seen_at = ?2 WHERE id = ?1`).bind(playerId, now),
    env.DB.prepare(`DELETE FROM sessions WHERE expires_at < ?1`).bind(now),
  ]);
  return json(
    {player: {id: playerId, username}},
    {headers: {'Set-Cookie': sessionCookie(token, Math.floor(SESSION_TTL_MS / 1000))}},
  );
}

async function handleStartUpgrade(request: Request, env: Env, player: PlayerRow): Promise<Response> {
  const body = (await request.json().catch(() => null)) as {kind?: unknown} | null;
  const kind = body?.kind;
  if (typeof kind !== 'string' || !isBuildingKind(kind)) return fail(400, 'Unknown structure.');

  const now = Date.now();
  const state = await settleAndLoad(env, player.id, now);
  if (!state) return fail(404, 'No base found.');
  if (state.job) return fail(409, 'Another upgrade is already under way.');

  const level = state.levels[kind];
  const ceiling = maxAllowedLevel(kind, state.levels.command_post);
  if (level >= BUILDINGS[kind].maxLevel) return fail(409, 'Already at maximum level.');
  if (level >= ceiling) return fail(409, 'Command Post level is too low for this upgrade.');

  const cost = upgradeCost(kind, level);
  const short = RESOURCES.filter((r) => state.resources[r] < cost[r]);
  if (short.length > 0) return fail(409, `Not enough ${short.join(' and ')}.`);

  const completesAt = now + upgradeDurationMs(kind, level);
  await env.DB.batch([
    env.DB.prepare(
      `UPDATE bases SET fuel = ?2, steel = ?3, munitions = ?4, alloy = ?5, resources_at = ?6
        WHERE player_id = ?1`,
    ).bind(
      player.id,
      state.resources.fuel - cost.fuel,
      state.resources.steel - cost.steel,
      state.resources.munitions - cost.munitions,
      state.resources.alloy - cost.alloy,
      now,
    ),
    env.DB.prepare(
      `INSERT INTO build_jobs (id, player_id, kind, to_level, started_at, completes_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
    ).bind(newId(), player.id, kind, level + 1, now, completesAt),
  ]);

  const after = await settleAndLoad(env, player.id, now);
  return json(after ? baseView(after, now) : {error: 'State unavailable.'});
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);

    const route = `${request.method} ${url.pathname}`;

    if (route === 'POST /api/auth/register') return handleRegister(request, env);
    if (route === 'POST /api/auth/login') return handleLogin(request, env);

    if (route === 'POST /api/auth/logout') {
      const token = readSessionCookie(request);
      if (token) await env.DB.prepare(`DELETE FROM sessions WHERE token = ?1`).bind(token).run();
      return json({ok: true}, {headers: {'Set-Cookie': sessionCookie('', 0)}});
    }

    const player = await authenticate(request, env);
    if (!player) return fail(401, 'Not signed in.');

    if (route === 'GET /api/me') return json({player});

    if (route === 'GET /api/base') {
      const now = Date.now();
      const state = await settleAndLoad(env, player.id, now);
      return state ? json(baseView(state, now)) : fail(404, 'No base found.');
    }

    if (route === 'POST /api/base/upgrade') return handleStartUpgrade(request, env, player);

    return fail(404, 'No such endpoint.');
  },
} satisfies ExportedHandler<Env>;
