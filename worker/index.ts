/**
 * World War Rogue API.
 *
 * Requests to /api/* are handled here; everything else falls through to the
 * static assets binding, which serves the built React client.
 */
import {handleAdminRequests} from './admin';
import {
  type Viewer,
  channelsFor,
  readChannel,
  readRecent,
  resolveAccess,
} from './chat';
import {
  MESSAGE_MAX,
  RETENTION_DAYS,
  dmChannel,
  dmOther,
  flattenMessage,
} from '../shared/chat';
import {
  atCapacity,
  createAlliance,
  mayActOn,
  memberCount,
  membershipOf,
  rosterOf,
} from './alliance';
import {
  ALLIANCE_CAPACITY,
  type AllianceRank,
  DESCRIPTION_MAX,
  MAX_LIEUTENANTS,
} from '../shared/alliances';
import {
  type ProfileEdit,
  clearPortrait,
  loadProfile,
  imageResponse,
  savePortrait,
  validateEdit,
  validatePortrait,
} from './profile';
import {isPortraitTint} from '../shared/portraits';
import {
  COSMETIC_SLOTS,
  checkLoadout,
  ownedItemIds,
} from './cosmetics';
import {COSMETICS, normaliseLoadout} from '../shared/cosmetics';
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
  type MailerConfig,
  CALLSIGN_RULE,
  approvalEmail,
  decisionEmail,
  sendMail,
  validateAccessRequest,
  validateCallsign,
} from './signup';
import {
  assignHomeWorld,
  basesInViewport,
  getWorld,
  placeSomewhereFree,
  reachableWorlds,
  tryPlace,
} from './world';
import {
  BUILDINGS,
  BUILDING_KINDS,
  SKINS,
  SKIN_IDS,
  STARTER_SKIN_IDS,
  ALL_SKINS_UNLOCKED,
  type SkinId,
  WORLD_EXTENT,
  candidatePlots,
  isSkinId,
  type BuildingKind,
  type ResourceKind,
  STORAGE_CAP,
  isBuildingKind,
  maxAllowedLevel,
  productionPerHour,
  totalPower,
  upgradeCost,
  upgradeDurationMs,
} from './game';

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  DEBUG_ERRORS?: string;
  /** Set with: wrangler secret put RESEND_API_KEY */
  RESEND_API_KEY?: string;
  MAIL_FROM?: string;
  OWNER_EMAIL?: string;
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
  role: string;
}

async function authenticate(request: Request, env: Env): Promise<PlayerRow | null> {
  const token = readSessionCookie(request);
  if (!token) return null;
  const row = await env.DB.prepare(
    `SELECT p.id AS id, p.username AS username, p.role AS role
       FROM sessions s JOIN players p ON p.id = s.player_id
      WHERE s.token = ?1 AND s.expires_at > ?2`,
  )
    .bind(token, Date.now())
    .first<PlayerRow>();
  return row ?? null;
}

/**
 * Places a base on a free plot.
 *
 * Collision is settled by the unique index on (plot_x, plot_y) rather than by
 * checking first and then writing: two players registering in the same instant
 * would both pass a check, but only one can win the insert. A rejected attempt
 * simply tries the next candidate.
 */
/** Creates the starting base for a new player. */
async function seedBase(
  env: Env,
  playerId: string,
  username: string,
  skin: SkinId,
  now: number,
): Promise<void> {
  const worldId = await assignHomeWorld(env.DB, now);
  const statements = [
    env.DB.prepare(
      `INSERT INTO bases (player_id, name, resources_at, created_at, skin, home_world_id)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
    ).bind(playerId, `${username}'s Forward Base`, now, now, skin, worldId),
    ...BUILDING_KINDS.map((kind) =>
      env.DB.prepare(`INSERT INTO buildings (player_id, kind, level) VALUES (?1, ?2, ?3)`).bind(
        playerId,
        kind,
        kind === 'command_post' ? 1 : 0,
      ),
    ),
  ];
  await env.DB.batch(statements);
  const world = await getWorld(env.DB, worldId);
  await placeSomewhereFree(env.DB, worldId, playerId, world?.extent ?? WORLD_EXTENT, now);
}

interface BaseRow {
  player_id: string;
  name: string;
  fuel: number;
  steel: number;
  munitions: number;
  alloy: number;
  resources_at: number;
  skin: string;
  home_world_id: number | null;
  banner: string;
  emblem: string;
  lights: string;
  decal: string;
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
    skin: state.base.skin,
    loadout: normaliseLoadout(state.base),
    homeWorldId: state.base.home_world_id,
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

/**
 * Access request handlers.
 *
 * Registering no longer creates an account. It creates a request, which is
 * approved or declined from a link in an email. An account exists only after
 * approval.
 */

/** Nobody may hold more than one pending request, and the queue is capped. */
const MAX_PENDING = 200;

async function handleCallsignCheck(request: Request, env: Env): Promise<Response> {
  const name = new URL(request.url).searchParams.get('name') ?? '';
  const parsed = validateCallsign(name);
  if (!parsed.ok) return json({available: false, reason: parsed.error});

  const key = parsed.value.toLowerCase();
  const [player, pending] = await Promise.all([
    env.DB.prepare(`SELECT 1 AS hit FROM players WHERE username_key = ?1`).bind(key).first(),
    env.DB.prepare(`SELECT 1 AS hit FROM signups WHERE username_key = ?1 AND status = 'pending'`)
      .bind(key)
      .first(),
  ]);

  return player || pending
    ? json({available: false, reason: 'That callsign is taken.'})
    : json({available: true});
}

async function handleRequestAccess(request: Request, env: Env): Promise<Response> {
  const now = Date.now();
  const parsed = validateAccessRequest(await request.json().catch(() => null));
  if (!parsed.ok) return fail(400, parsed.error);
  const req = parsed.value;

  const emailKey = req.email.toLowerCase();
  const usernameKey = req.username.toLowerCase();

  const [callsignTaken, emailKnown, pending] = await Promise.all([
    env.DB.prepare(
      `SELECT 1 AS hit FROM players WHERE username_key = ?1
        UNION SELECT 1 FROM signups WHERE username_key = ?1 AND status = 'pending'`,
    )
      .bind(usernameKey)
      .first(),
    env.DB.prepare(
      `SELECT 1 AS hit FROM players WHERE email_key = ?1
        UNION SELECT 1 FROM signups WHERE email_key = ?1 AND status = 'pending'`,
    )
      .bind(emailKey)
      .first(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM signups WHERE status = 'pending'`).first<{n: number}>(),
  ]);

  // A taken callsign is answered plainly - every callsign is already on show
  // across the map, so refusing to say costs the applicant a guessing game and
  // protects nothing.
  if (callsignTaken) return fail(409, 'That callsign is taken. Choose another.');

  // Whether an address already has an account is not public anywhere, so this
  // answers exactly as it would for a brand new address.
  if (emailKnown) {
    return json({
      status: 'pending',
      message: 'Request sent. You will be emailed once it has been reviewed.',
    });
  }

  if ((pending?.n ?? 0) >= MAX_PENDING) {
    return fail(503, 'The request queue is full. Try again later.');
  }

  const token = newToken();

  await env.DB.prepare(
    `INSERT INTO signups (id, email, email_key, username, username_key, password_hash,
                          age_confirmed, country, locale, skin, decide_token,
                          created_at, request_ip)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1, ?7, ?8, ?9, ?10, ?11, ?12)`,
  )
    .bind(
      newId(),
      req.email,
      emailKey,
      req.username,
      usernameKey,
      await hashPassword(req.password),
      req.country,
      req.locale,
      req.skin,
      token,
      now,
      request.headers.get('CF-Connecting-IP') ?? null,
    )
    .run();

  const mailer = mailerFrom(env);
  if (mailer) {
    const origin = new URL(request.url).origin;
    const mail = approvalEmail({
      username: req.username,
      email: req.email,
      country: req.country,
      origin,
      token,
      pendingCount: (pending?.n ?? 0) + 1,
    });
    const sent = await sendMail(mailer, mailer.owner, mail.subject, mail.html);
    // A stored request is not a failure just because the notification did not
    // go out: the request still waits in the queue either way.
    if (!sent.ok) console.error('Approval email failed:', sent.error);
  } else {
    console.error('RESEND_API_KEY is not configured; approval email not sent.');
  }

  return json({
    status: 'pending',
    message: 'Request sent. You will be emailed once it has been reviewed.',
  });
}

/**
 * Approve or decline, from the link in the notification email.
 *
 * Answers HTML rather than JSON: this is opened in a mail client, by a person.
 */
async function handleDecision(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get('token') ?? '';
  const decision = url.searchParams.get('decision');
  if (!token || (decision !== 'approve' && decision !== 'decline')) {
    return page('Bad link', 'That approval link is not valid.');
  }

  const row = await env.DB.prepare(
    `SELECT id, email, username, username_key, password_hash, country, locale, skin, status
       FROM signups WHERE decide_token = ?1`,
  )
    .bind(token)
    .first<{
      id: string;
      email: string;
      username: string;
      username_key: string;
      password_hash: string;
      country: string;
      locale: string;
      skin: string;
      status: string;
    }>();

  if (!row) return page('Not found', 'That request no longer exists.');
  if (row.status !== 'pending') {
    return page('Already decided', `${row.username} was already ${row.status}.`);
  }

  const now = Date.now();
  const approved = decision === 'approve';

  if (approved) {
    const taken = await env.DB.prepare(`SELECT id FROM players WHERE username_key = ?1`)
      .bind(row.username_key)
      .first();
    if (taken) {
      await env.DB.prepare(
        `UPDATE signups SET status = 'declined', decided_at = ?2 WHERE id = ?1`,
      )
        .bind(row.id, now)
        .run();
      return page('Callsign taken', `${row.username} was claimed while this request was waiting.`);
    }

    const playerId = newId();
    await env.DB.prepare(
      `INSERT INTO players (id, username, username_key, password_hash, created_at, last_seen_at,
                            email, email_key, country, locale, approved_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?5, ?6, ?7, ?8, ?9, ?5)`,
    )
      .bind(
        playerId,
        row.username,
        row.username_key,
        row.password_hash,
        now,
        row.email,
        row.email.toLowerCase(),
        row.country,
        row.locale,
      )
      .run();
    await seedBase(env, playerId, row.username, isSkinId(row.skin) ? row.skin : 'desert_fob', now);
  }

  // The stored password hash is cleared on decision: an approved request has
  // handed it to the account, and a declined one has no use for it.
  await env.DB.prepare(
    `UPDATE signups SET status = ?2, decided_at = ?3, password_hash = '' WHERE id = ?1`,
  )
    .bind(row.id, approved ? 'approved' : 'declined', now)
    .run();

  const mailer = mailerFrom(env);
  if (mailer) {
    const mail = decisionEmail({username: row.username, approved, origin: url.origin});
    const sent = await sendMail(mailer, row.email, mail.subject, mail.html);
    if (!sent.ok) console.error('Decision email failed:', sent.error);
  }

  return page(
    approved ? 'Approved' : 'Declined',
    approved
      ? `${row.username} can now sign in. They have been emailed.`
      : `${row.username} has been declined and emailed.`,
  );
}

function page(title: string, body: string): Response {
  return new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
     <title>${title}</title>
     <div style="font-family:ui-sans-serif,system-ui,sans-serif;background:#0a0c0b;color:#e5e7eb;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px">
       <div style="max-width:420px">
         <p style="font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#ea580c;margin:0">World War Rogue</p>
         <h1 style="font-size:22px;margin:8px 0 10px">${title}</h1>
         <p style="color:#9ca3af;font-size:14px;margin:0">${body}</p>
       </div>
     </div>`,
    {status: 200, headers: {'Content-Type': 'text/html; charset=utf-8'}},
  );
}

function mailerFrom(env: Env): MailerConfig | null {
  if (!env.RESEND_API_KEY) return null;
  return {
    apiKey: env.RESEND_API_KEY,
    from: env.MAIL_FROM ?? 'World War Rogue <noreply@worldwarrogue.com>',
    owner: env.OWNER_EMAIL ?? 'support@worldwarrogue.com',
  };
}

async function handleLogin(request: Request, env: Env): Promise<Response> {
  const parsed = validateCredentials(await request.json().catch(() => null));
  if (!parsed.ok) return fail(400, parsed.error);
  const {username, password} = parsed.value;

  const row = await env.DB.prepare(
    `SELECT id, username, password_hash, role FROM players WHERE username_key = ?1`,
  )
    .bind(username.toLowerCase())
    .first<{id: string; username: string; password_hash: string; role: string}>();

  // Same response whether the account is missing or the password is wrong, so
  // the endpoint cannot be used to enumerate callsigns.
  if (!row || !(await verifyPassword(password, row.password_hash))) {
    return fail(401, 'Callsign or password is incorrect.');
  }
  return startSession(env, row.id, row.username, Date.now(), row.role);
}

async function startSession(
  env: Env,
  playerId: string,
  username: string,
  now: number,
  role = 'player',
): Promise<Response> {
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
    {player: {id: playerId, username, role}},
    {headers: {'Set-Cookie': sessionCookie(token, Math.floor(SESSION_TTL_MS / 1000))}},
  );
}

/**
 * The map viewport.
 *
 * Bounded by what is on screen rather than by the population, so a world with
 * a thousand bases costs the same to draw as one with ten.
 */
async function handleWorld(request: Request, env: Env, player: PlayerRow): Promise<Response> {
  const url = new URL(request.url);
  const now = Date.now();
  const num = (key: string, fallback: number) => {
    const raw = Number.parseInt(url.searchParams.get(key) ?? '', 10);
    return Number.isFinite(raw) ? raw : fallback;
  };

  const worlds = await reachableWorlds(env.DB, player.id, now);
  if (worlds.length === 0) return fail(409, 'You have not been deployed yet.');

  // A player may only look at worlds they can actually stand in: their home,
  // and any open event admitting it. Asking for another world is refused
  // rather than quietly answered with someone else's map.
  const requested = url.searchParams.get('world');
  const world = requested
    ? worlds.find((entry) => String(entry.id) === requested)
    : (worlds.find((entry) => entry.kind === 'home') ?? worlds[0]);
  if (!world) return fail(403, 'That world is not open to you.');

  const x = num('x', 0);
  const y = num('y', 0);
  const w = Math.min(80, Math.max(1, num('w', 40)));
  const h = Math.min(80, Math.max(1, num('h', 40)));

  const [bases, self, home] = await Promise.all([
    basesInViewport(env.DB, world.id, x, y, w, h),
    env.DB.prepare(
      `SELECT plot_x AS x, plot_y AS y FROM placements WHERE world_id = ?1 AND player_id = ?2`,
    )
      .bind(world.id, player.id)
      .first<{x: number; y: number}>(),
    env.DB.prepare(`SELECT home_world_id AS id FROM bases WHERE player_id = ?1`)
      .bind(player.id)
      .first<{id: number | null}>(),
  ]);

  const ownAlliance = await env.DB.prepare(
    `SELECT alliance_id AS id FROM alliance_members WHERE player_id = ?1`,
  )
    .bind(player.id)
    .first<{id: string}>();

  return json({
    viewport: {x, y, w, h},
    world: {
      id: world.id,
      name: world.name,
      kind: world.kind,
      extent: world.extent,
      closesAt: world.closes_at,
    },
    worlds: worlds.map((entry) => ({id: entry.id, name: entry.name, kind: entry.kind})),
    you: {
      username: player.username,
      plot: self ?? null,
      // Everything the client needs to colour a base by allegiance. Alliances
      // do not exist yet, so allianceId is always null and nothing is ever
      // drawn as an ally - the branch is here so that adding them later is a
      // query, not a rendering change.
      homeWorldId: home?.id ?? null,
      allianceId: ownAlliance?.id ?? null,
    },
    skins: SKINS,
    bases,
  });
}

/**
 * Move to a chosen plot.
 *
 * The plot is claimed by writing it, not by checking it first: two players
 * pressing Move on the same square in the same instant would both see it free,
 * and only the unique index can decide between them. The loser is asked to
 * pick again rather than being silently dumped somewhere else.
 */
async function handleMove(request: Request, env: Env, player: PlayerRow): Promise<Response> {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const x = Number(body?.x);
  const y = Number(body?.y);
  if (!Number.isInteger(x) || !Number.isInteger(y)) return fail(400, 'Pick a plot on the map.');

  const now = Date.now();
  const worlds = await reachableWorlds(env.DB, player.id, now);
  if (worlds.length === 0) return fail(409, 'You have not been deployed yet.');

  const requested = body?.worldId;
  const world =
    requested === undefined
      ? (worlds.find((entry) => entry.kind === 'home') ?? worlds[0])
      : worlds.find((entry) => entry.id === Number(requested));
  if (!world) return fail(403, 'That world is not open to you.');

  if (Math.abs(x) > world.extent || Math.abs(y) > world.extent) {
    return fail(400, 'That is beyond the edge of the map.');
  }

  const moved = await tryPlace(env.DB, world.id, player.id, x, y, now);
  if (!moved) return fail(409, 'Another base already holds that ground.');

  return json({world: {id: world.id, name: world.name}, plot: {x, y}});
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

/**
 * Detailed error text is returned while the backend is being brought up, so a
 * failure is diagnosable from the client instead of arriving as an opaque
 * "Worker threw exception" page. Set DEBUG_ERRORS to "off" once real players
 * exist - internal messages should not be public then.
 */
function serverError(error: unknown, env: Env): Response {
  const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  console.error('Unhandled API error:', detail);
  const expose = (env.DEBUG_ERRORS ?? 'on') !== 'off';
  return json({error: expose ? detail : 'Something went wrong on the server.'}, {status: 500});
}

/**
 * The catalogue, what this player owns, and what their base is wearing.
 *
 * Everything is sent in one response because the customisation screen needs
 * all three to draw a single row, and three round trips to render one screen
 * is three chances to show a half-built page.
 */
async function handleCosmetics(env: Env, player: PlayerRow): Promise<Response> {
  const [owned, base] = await Promise.all([
    ownedItemIds(env.DB, player.id),
    env.DB.prepare(`SELECT skin, banner, emblem, lights, decal FROM bases WHERE player_id = ?1`)
      .bind(player.id)
      .first<Record<string, string>>(),
  ]);

  // The base skin is not a cosmetic item, but ownership of a premium one is
  // recorded in the same table keyed by the skin id. That way there is exactly
  // one place to look to answer "may this player wear this", and granting a
  // skin and granting a banner are the same operation.
  const skinsOwned = ALL_SKINS_UNLOCKED
    ? [...SKIN_IDS]
    : SKIN_IDS.filter((id) => STARTER_SKIN_IDS.includes(id) || owned.has(id));

  return json({
    slots: COSMETIC_SLOTS,
    items: COSMETICS,
    owned: [...owned],
    loadout: normaliseLoadout(base ?? {}),
    skins: SKINS,
    skinIds: SKIN_IDS,
    skinsOwned,
    skin: base?.skin ?? 'desert_fob',
  });
}

/**
 * Equips a loadout.
 *
 * Ownership is checked here and only here. The client can preview anything it
 * likes - that is what makes a store worth browsing - but what the rest of the
 * map sees is whatever this function was willing to write.
 */
async function handleEquip(request: Request, env: Env, player: PlayerRow): Promise<Response> {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return fail(400, 'Nothing to equip.');

  const owned = await ownedItemIds(env.DB, player.id);
  const result = checkLoadout(body, owned);
  if ('rejected' in result) {
    return fail(
      result.rejected.reason === 'unknown' ? 400 : 403,
      result.rejected.reason === 'unknown'
        ? 'That item does not exist.'
        : 'You do not own that item yet.',
    );
  }

  // The base skin travels with the loadout because a player changes both on
  // the same screen, and saving them separately would let a half-applied look
  // exist if the second request failed.
  const current = await env.DB.prepare(`SELECT skin FROM bases WHERE player_id = ?1`)
    .bind(player.id)
    .first<{skin: string}>();
  let skin = current?.skin ?? 'desert_fob';

  if (body.skin !== undefined && body.skin !== null) {
    if (!isSkinId(body.skin)) return fail(400, 'That base skin does not exist.');
    if (
      !ALL_SKINS_UNLOCKED &&
      !STARTER_SKIN_IDS.includes(body.skin) &&
      !owned.has(body.skin)
    ) {
      return fail(403, 'You do not own that base skin yet.');
    }
    skin = body.skin;
  }

  const {loadout} = result;
  const changed = await env.DB.prepare(
    `UPDATE bases SET skin = ?2, banner = ?3, emblem = ?4, lights = ?5, decal = ?6
      WHERE player_id = ?1`,
  )
    .bind(player.id, skin, loadout.banner, loadout.emblem, loadout.lights, loadout.decal)
    .run();

  if (!changed.success) return fail(500, 'Could not save that loadout.');
  return json({loadout, skin});
}

/**
 * Anyone's profile, by callsign.
 *
 * Signed-in players only - not because the contents are sensitive, but because
 * an open endpoint that enumerates players by name is a list of accounts to
 * try passwords against, and there is no reason to publish one.
 */
async function handleProfile(request: Request, env: Env): Promise<Response> {
  const name = new URL(request.url).searchParams.get('name');
  if (!name) return fail(400, 'Which player?');
  const profile = await loadProfile(env.DB, name);
  if (!profile) return fail(404, 'No such callsign.');
  return json({profile});
}

/** Edits your own, and only your own. */
async function handleEditProfile(
  request: Request,
  env: Env,
  player: PlayerRow,
): Promise<Response> {
  const body = (await request.json().catch(() => null)) as ProfileEdit | null;
  if (!body) return fail(400, 'Nothing to save.');

  const result = validateEdit(body);
  if (!result.ok) return fail(400, result.error);

  await env.DB.prepare(
    `UPDATE players SET portrait_glyph = ?2, portrait_tint = ?3, motto = ?4
      WHERE id = ?1`,
  )
    .bind(player.id, result.glyph, result.tint, result.motto)
    .run();

  const profile = await loadProfile(env.DB, player.username);
  return json({profile});
}

/**
 * Sets or removes your own portrait.
 *
 * Separate from the profile edit because the payload is tens of kilobytes and
 * the rest of a profile edit is a few dozen bytes. Sending them together would
 * mean re-uploading a photograph every time somebody changed their motto.
 */
async function handlePortrait(
  request: Request,
  env: Env,
  player: PlayerRow,
): Promise<Response> {
  const body = (await request.json().catch(() => null)) as {image?: unknown} | null;
  if (!body) return fail(400, 'Nothing received.');

  if (body.image === null) {
    await clearPortrait(env.DB, player.id);
    const cleared = await loadProfile(env.DB, player.username);
    return json({profile: cleared});
  }

  const result = validatePortrait(body.image);
  if (!result.ok) return fail(400, result.error);

  await savePortrait(env.DB, player.id, result, Date.now());
  const profile = await loadProfile(env.DB, player.username);
  return json({profile});
}

/**
 * Your alliance, its roster, and the applications waiting on it.
 *
 * Applications are only included for officers and above. A member seeing the
 * queue would be harmless; a member seeing it and being unable to act on it is
 * a screen that invites a click it will then refuse.
 */
async function handleAlliance(env: Env, player: PlayerRow): Promise<Response> {
  const membership = await membershipOf(env.DB, player.id);
  if (!membership) {
    const pending = await env.DB.prepare(
      `SELECT a.tag AS tag, a.name AS name
         FROM alliance_applications ap
         JOIN alliances a ON a.id = ap.alliance_id
        WHERE ap.player_id = ?1`,
    )
      .bind(player.id)
      .all<{tag: string; name: string}>();
    return json({alliance: null, applied: pending.results ?? []});
  }

  const {alliance, rank} = membership;
  const roster = await rosterOf(env.DB, alliance.id);

  let applications: Array<{username: string; power: number; createdAt: number}> = [];
  if (rank === 'leader' || rank === 'officer') {
    const rows = await env.DB.prepare(
      `SELECT p.username AS username, ap.created_at AS created_at
         FROM alliance_applications ap
         JOIN players p ON p.id = ap.player_id
        WHERE ap.alliance_id = ?1
        ORDER BY ap.created_at ASC`,
    )
      .bind(alliance.id)
      .all<{username: string; created_at: number}>();
    applications = (rows.results ?? []).map((r) => ({
      username: r.username,
      power: 0,
      createdAt: r.created_at,
    }));
  }

  return json({
    alliance: {
      id: alliance.id,
      tag: alliance.tag,
      name: alliance.name,
      description: alliance.description,
      homeWorldId: alliance.home_world_id,
      openJoin: alliance.open_join === 1,
      createdAt: alliance.created_at,
      capacity: ALLIANCE_CAPACITY,
      emblemTint: alliance.emblem_tint,
      hasCrest: alliance.has_crest === 1,
    },
    rank,
    roster,
    applications,
  });
}

/**
 * Every alliance on this player's home server.
 *
 * Carries the four things somebody actually decides on: how strong it is, who
 * runs it, how full it is, and whether they can walk in. A list of names and
 * member counts makes every alliance look the same, which is the one thing a
 * join screen must not do.
 *
 * Power is summed in TypeScript from raw building levels rather than computed
 * in SQL. Doing the arithmetic in the query would be faster and would create a
 * second definition of power that drifts from the one on the profile - and two
 * numbers that disagree about the same alliance is worse than one query.
 */
async function handleBrowseAlliances(env: Env, player: PlayerRow): Promise<Response> {
  const home = await env.DB.prepare(`SELECT home_world_id AS id FROM bases WHERE player_id = ?1`)
    .bind(player.id)
    .first<{id: number | null}>();
  if (!home?.id) return fail(409, 'You have not been deployed yet.');

  const [list, levels] = await Promise.all([
    env.DB.prepare(
      `SELECT a.id AS id, a.tag AS tag, a.name AS name, a.description AS description,
              a.open_join AS open_join, a.emblem_tint AS emblem_tint,
              (CASE WHEN ap.alliance_id IS NULL THEN 0 ELSE 1 END) AS has_crest,
              COUNT(m.player_id) AS members,
              (SELECT p.username
                 FROM alliance_members lm
                 JOIN players p ON p.id = lm.player_id
                WHERE lm.alliance_id = a.id AND lm.rank = 'leader'
                LIMIT 1) AS leader
         FROM alliances a
         LEFT JOIN alliance_members m ON m.alliance_id = a.id
         LEFT JOIN alliance_portraits ap ON ap.alliance_id = a.id
        WHERE a.home_world_id = ?1
        GROUP BY a.id
        LIMIT 100`,
    )
      .bind(home.id)
      .all<{
        id: string;
        tag: string;
        name: string;
        description: string | null;
        open_join: number;
        members: number;
        leader: string | null;
        emblem_tint: string;
        has_crest: number;
      }>(),
    env.DB.prepare(
      `SELECT m.alliance_id AS aid, b.player_id AS pid, b.kind AS kind, b.level AS level
         FROM alliance_members m
         JOIN alliances a ON a.id = m.alliance_id
         JOIN buildings b ON b.player_id = m.player_id
        WHERE a.home_world_id = ?1`,
    )
      .bind(home.id)
      .all<{aid: string; pid: string; kind: string; level: number}>(),
  ]);

  // Levels, grouped per player, then power per player, then summed per
  // alliance. Going straight from rows to a total would double-count, because
  // power is not linear in level.
  const byPlayer = new Map<string, {aid: string; levels: Record<BuildingKind, number>}>();
  for (const row of levels.results ?? []) {
    if (!isBuildingKind(row.kind)) continue;
    let entry = byPlayer.get(row.pid);
    if (!entry) {
      entry = {
        aid: row.aid,
        levels: Object.fromEntries(BUILDING_KINDS.map((k) => [k, 0])) as Record<
          BuildingKind,
          number
        >,
      };
      byPlayer.set(row.pid, entry);
    }
    entry.levels[row.kind] = row.level;
  }

  const powerByAlliance = new Map<string, number>();
  for (const {aid, levels: own} of byPlayer.values()) {
    powerByAlliance.set(aid, (powerByAlliance.get(aid) ?? 0) + totalPower(own));
  }

  const alliances = (list.results ?? [])
    .map((r) => ({
      id: r.id,
      tag: r.tag,
      name: r.name,
      description: r.description,
      openJoin: r.open_join === 1,
      members: r.members,
      leader: r.leader,
      power: powerByAlliance.get(r.id) ?? 0,
      emblemTint: r.emblem_tint,
      hasCrest: r.has_crest === 1,
    }))
    // Strongest first. Somebody browsing is looking for the alliance worth
    // joining, and that is the order that answers it.
    .sort((a, b) => b.power - a.power || b.members - a.members);

  return json({homeWorldId: home.id, capacity: ALLIANCE_CAPACITY, alliances});
}

/** Founds an alliance. The founder becomes its leader. */
async function handleCreateAlliance(
  request: Request,
  env: Env,
  player: PlayerRow,
): Promise<Response> {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return fail(400, 'Nothing to create.');

  const existing = await membershipOf(env.DB, player.id);
  if (existing) return fail(409, 'Leave your current alliance first.');

  const home = await env.DB.prepare(`SELECT home_world_id AS id FROM bases WHERE player_id = ?1`)
    .bind(player.id)
    .first<{id: number | null}>();
  if (!home?.id) return fail(409, 'You have not been deployed yet.');

  const tag = typeof body.tag === 'string' ? body.tag.trim() : '';
  const name = typeof body.name === 'string' ? body.name : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  // Required, not optional. An alliance with no stated purpose is one nobody
  // browsing can tell apart from the others, and the browse list is where the
  // decision to join is actually made.
  if (description.length < 8) {
    return fail(400, 'Say what the alliance is for, in a sentence or more.');
  }

  const result = await createAlliance(
    env.DB,
    player.id,
    home.id,
    newId(),
    tag,
    name,
    description,
    body.openJoin !== false,
    Date.now(),
  );
  if (!result.ok) return fail(409, result.error);

  // Any applications elsewhere are void the moment you found something.
  await env.DB.prepare(`DELETE FROM alliance_applications WHERE player_id = ?1`)
    .bind(player.id)
    .run();

  return handleAlliance(env, player);
}

/**
 * Joins an open alliance, or applies to a closed one.
 *
 * Capacity is checked here and enforced by the insert failing if two people
 * take the last seat at once - the check is a courtesy that produces a good
 * message, not the thing keeping the count right.
 */
async function handleJoinAlliance(
  request: Request,
  env: Env,
  player: PlayerRow,
): Promise<Response> {
  const body = (await request.json().catch(() => null)) as {allianceId?: unknown} | null;
  const allianceId = typeof body?.allianceId === 'string' ? body.allianceId : null;
  if (!allianceId) return fail(400, 'Which alliance?');

  if (await membershipOf(env.DB, player.id)) {
    return fail(409, 'Leave your current alliance first.');
  }

  const home = await env.DB.prepare(`SELECT home_world_id AS id FROM bases WHERE player_id = ?1`)
    .bind(player.id)
    .first<{id: number | null}>();

  const alliance = await env.DB.prepare(
    `SELECT id, open_join, home_world_id FROM alliances WHERE id = ?1`,
  )
    .bind(allianceId)
    .first<{id: string; open_join: number; home_world_id: number}>();
  if (!alliance) return fail(404, 'No such alliance.');

  // An alliance belongs to a server. Joining across servers would make the
  // server number, and the map colour that depends on it, mean nothing.
  if (alliance.home_world_id !== home?.id) {
    return fail(403, 'That alliance belongs to another server.');
  }

  if (atCapacity(await memberCount(env.DB, alliance.id))) {
    return fail(409, 'That alliance is full.');
  }

  const now = Date.now();
  if (alliance.open_join === 1) {
    try {
      await env.DB.prepare(
        `INSERT INTO alliance_members (player_id, alliance_id, rank, joined_at)
         VALUES (?1, ?2, 'member', ?3)`,
      )
        .bind(player.id, alliance.id, now)
        .run();
    } catch {
      return fail(409, 'You are already in an alliance.');
    }
    await env.DB.prepare(`DELETE FROM alliance_applications WHERE player_id = ?1`)
      .bind(player.id)
      .run();
    return handleAlliance(env, player);
  }

  await env.DB.prepare(
    `INSERT INTO alliance_applications (alliance_id, player_id, created_at)
     VALUES (?1, ?2, ?3) ON CONFLICT DO NOTHING`,
  )
    .bind(alliance.id, player.id, now)
    .run();
  return handleAlliance(env, player);
}

/**
 * Leaves, or disbands.
 *
 * A leader cannot simply walk out of an alliance with people still in it -
 * that would leave a group with no one able to accept applications or remove
 * anybody, which is a dead alliance nobody can fix or leave cleanly. They hand
 * over first, or they disband it deliberately.
 */
async function handleLeaveAlliance(
  request: Request,
  env: Env,
  player: PlayerRow,
): Promise<Response> {
  const membership = await membershipOf(env.DB, player.id);
  if (!membership) return fail(409, 'You are not in an alliance.');

  const body = (await request.json().catch(() => null)) as {disband?: unknown} | null;
  const count = await memberCount(env.DB, membership.alliance.id);

  if (membership.rank === 'leader' && count > 1) {
    if (body?.disband !== true) {
      return fail(
        409,
        'Hand leadership to somebody else first, or disband the alliance.',
      );
    }
    // Disbanding takes the alliance with it; the cascade clears membership and
    // any outstanding applications.
    await env.DB.prepare(`DELETE FROM alliances WHERE id = ?1`)
      .bind(membership.alliance.id)
      .run();
    return json({alliance: null, applied: []});
  }

  await env.DB.prepare(`DELETE FROM alliance_members WHERE player_id = ?1`)
    .bind(player.id)
    .run();

  // A last member walking out takes the empty alliance with them, rather than
  // leaving a name and tag reserved by nobody.
  if (count <= 1) {
    await env.DB.prepare(`DELETE FROM alliances WHERE id = ?1`)
      .bind(membership.alliance.id)
      .run();
  }

  return json({alliance: null, applied: []});
}

/** Accepts or declines an application. Officers and above. */
async function handleDecideApplication(
  request: Request,
  env: Env,
  player: PlayerRow,
): Promise<Response> {
  const membership = await membershipOf(env.DB, player.id);
  if (!membership) return fail(409, 'You are not in an alliance.');
  if (membership.rank === 'member') return fail(403, 'Lieutenants and the general only.');

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const username = typeof body?.username === 'string' ? body.username : null;
  const accept = body?.accept === true;
  if (!username) return fail(400, 'Which applicant?');

  const applicant = await env.DB.prepare(
    `SELECT id FROM players WHERE username = ?1 COLLATE NOCASE`,
  )
    .bind(username)
    .first<{id: string}>();
  if (!applicant) return fail(404, 'No such callsign.');

  await env.DB.prepare(
    `DELETE FROM alliance_applications WHERE alliance_id = ?1 AND player_id = ?2`,
  )
    .bind(membership.alliance.id, applicant.id)
    .run();

  if (accept) {
    if (atCapacity(await memberCount(env.DB, membership.alliance.id))) {
      return fail(409, 'The alliance is full.');
    }
    try {
      await env.DB.prepare(
        `INSERT INTO alliance_members (player_id, alliance_id, rank, joined_at)
         VALUES (?1, ?2, 'member', ?3)`,
      )
        .bind(applicant.id, membership.alliance.id, Date.now())
        .run();
    } catch {
      return fail(409, 'They have joined another alliance.');
    }
  }

  return handleAlliance(env, player);
}

/**
 * Promotes, demotes, removes a member, or hands over leadership.
 *
 * Every one of these is the same question - may this rank act on that rank -
 * and the answer is always "only downward". That single rule is what stops two
 * officers removing each other and what stops a leader being kicked out of the
 * alliance they founded.
 */
async function handleAllianceRank(
  request: Request,
  env: Env,
  player: PlayerRow,
): Promise<Response> {
  const membership = await membershipOf(env.DB, player.id);
  if (!membership) return fail(409, 'You are not in an alliance.');

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const username = typeof body?.username === 'string' ? body.username : null;
  const action = typeof body?.action === 'string' ? body.action : null;
  if (!username || !action) return fail(400, 'Who, and what?');

  const target = await env.DB.prepare(
    `SELECT p.id AS id, m.rank AS rank, m.alliance_id AS alliance_id
       FROM players p
       JOIN alliance_members m ON m.player_id = p.id
      WHERE p.username = ?1 COLLATE NOCASE`,
  )
    .bind(username)
    .first<{id: string; rank: AllianceRank; alliance_id: string}>();

  if (!target || target.alliance_id !== membership.alliance.id) {
    return fail(404, 'They are not in your alliance.');
  }
  if (target.id === player.id) return fail(400, 'That one is about you.');
  if (!mayActOn(membership.rank, target.rank)) {
    return fail(403, 'You cannot act on somebody of that rank.');
  }

  const now = Date.now();

  if (action === 'remove') {
    await env.DB.prepare(`DELETE FROM alliance_members WHERE player_id = ?1`)
      .bind(target.id)
      .run();
    return handleAlliance(env, player);
  }

  if (action === 'promote' || action === 'demote') {
    // Only a leader creates or unmakes officers. An officer promoting another
    // officer would be creating a peer who could then act on nobody, and
    // demoting one would be acting sideways.
    if (membership.rank !== 'leader') return fail(403, 'Only the general may do that.');
    if (action === 'promote') {
      const count = await env.DB.prepare(
        `SELECT COUNT(*) AS n FROM alliance_members
          WHERE alliance_id = ?1 AND rank = 'officer'`,
      )
        .bind(membership.alliance.id)
        .first<{n: number}>();
      if ((count?.n ?? 0) >= MAX_LIEUTENANTS) {
        return fail(409, `An alliance may have at most ${MAX_LIEUTENANTS} lieutenants.`);
      }
    }
    const rank: AllianceRank = action === 'promote' ? 'officer' : 'member';
    await env.DB.prepare(`UPDATE alliance_members SET rank = ?2 WHERE player_id = ?1`)
      .bind(target.id, rank)
      .run();
    return handleAlliance(env, player);
  }

  if (action === 'handover') {
    if (membership.rank !== 'leader') return fail(403, 'Only the general may do that.');
    // Both writes or neither. A half-applied handover leaves an alliance with
    // two leaders or none, and either is worse than the change not happening.
    await env.DB.batch([
      env.DB.prepare(`UPDATE alliance_members SET rank = 'leader' WHERE player_id = ?1`).bind(
        target.id,
      ),
      env.DB.prepare(`UPDATE alliance_members SET rank = 'officer' WHERE player_id = ?1`).bind(
        player.id,
      ),
    ]);
    return handleAlliance(env, player);
  }

  return fail(400, 'Unknown action.');
}

/** Edits the alliance itself. Leaders only. */
async function handleAllianceSettings(
  request: Request,
  env: Env,
  player: PlayerRow,
): Promise<Response> {
  const membership = await membershipOf(env.DB, player.id);
  if (!membership) return fail(409, 'You are not in an alliance.');
  if (membership.rank !== 'leader') return fail(403, 'Only the general may do that.');

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return fail(400, 'Nothing to change.');

  const description =
    typeof body.description === 'string' ? body.description.trim().slice(0, DESCRIPTION_MAX) : '';
  const openJoin = body.openJoin !== false;

  await env.DB.prepare(
    `UPDATE alliances SET description = ?2, open_join = ?3 WHERE id = ?1`,
  )
    .bind(membership.alliance.id, description === '' ? null : description, openJoin ? 1 : 0)
    .run();

  return handleAlliance(env, player);
}

/** A player's uploaded portrait, as an image rather than as JSON. */
async function handlePortraitImage(request: Request, env: Env): Promise<Response> {
  const name = new URL(request.url).searchParams.get('name');
  if (!name) return fail(400, 'Which player?');

  const row = await env.DB.prepare(
    `SELECT pp.mime AS mime, pp.data_url AS data_url, pp.updated_at AS updated_at
       FROM players p
       JOIN player_portraits pp ON pp.player_id = p.id
      WHERE p.username = ?1 COLLATE NOCASE`,
  )
    .bind(name)
    .first<{mime: string; data_url: string; updated_at: number}>();
  if (!row) return fail(404, 'No portrait.');

  return imageResponse(request, row.data_url, row.mime, row.updated_at);
}

/** An alliance's uploaded crest. */
async function handleAllianceCrestImage(request: Request, env: Env): Promise<Response> {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return fail(400, 'Which alliance?');

  const row = await env.DB.prepare(
    `SELECT mime, data_url, updated_at FROM alliance_portraits WHERE alliance_id = ?1`,
  )
    .bind(id)
    .first<{mime: string; data_url: string; updated_at: number}>();
  if (!row) return fail(404, 'No crest.');

  return imageResponse(request, row.data_url, row.mime, row.updated_at);
}

/**
 * Sets or removes the alliance crest, and its fallback colour.
 *
 * Leaders only. A crest is the alliance's identity in every list it appears
 * in, and letting an officer change it means the thing other players recognise
 * an alliance by can be altered by somebody who did not found it.
 */
async function handleAllianceCrest(
  request: Request,
  env: Env,
  player: PlayerRow,
): Promise<Response> {
  const membership = await membershipOf(env.DB, player.id);
  if (!membership) return fail(409, 'You are not in an alliance.');
  if (membership.rank !== 'leader') return fail(403, 'Leaders only.');

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return fail(400, 'Nothing received.');

  if (typeof body.tint === 'string' && isPortraitTint(body.tint)) {
    await env.DB.prepare(`UPDATE alliances SET emblem_tint = ?2 WHERE id = ?1`)
      .bind(membership.alliance.id, body.tint)
      .run();
  }

  if (body.image === null) {
    await env.DB.prepare(`DELETE FROM alliance_portraits WHERE alliance_id = ?1`)
      .bind(membership.alliance.id)
      .run();
    return handleAlliance(env, player);
  }

  if (body.image !== undefined) {
    const result = validatePortrait(body.image);
    if (!result.ok) return fail(400, result.error);
    await env.DB.prepare(
      `INSERT INTO alliance_portraits (alliance_id, mime, data_url, bytes, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5)
       ON CONFLICT(alliance_id) DO UPDATE SET
         mime = excluded.mime, data_url = excluded.data_url,
         bytes = excluded.bytes, updated_at = excluded.updated_at`,
    )
      .bind(
        membership.alliance.id,
        result.mime,
        result.dataUrl,
        result.bytes,
        Date.now(),
      )
      .run();
  }

  return handleAlliance(env, player);
}

/** Everything about this player that decides which channels they belong to. */
async function chatViewer(env: Env, player: PlayerRow): Promise<Viewer> {
  const [home, membership] = await Promise.all([
    env.DB.prepare(`SELECT home_world_id AS id FROM bases WHERE player_id = ?1`)
      .bind(player.id)
      .first<{id: number | null}>(),
    membershipOf(env.DB, player.id),
  ]);
  return {
    playerId: player.id,
    homeWorldId: home?.id ?? null,
    allianceId: membership?.alliance.id ?? null,
    rank: membership?.rank ?? null,
  };
}

/**
 * Reads a channel.
 *
 * Access is checked here as well as on send. A channel string in a request is
 * a claim, not a credential - if reads were trusted because writes were
 * checked, alliance planning would be readable by the people it is about.
 */
async function handleChatRead(
  request: Request,
  env: Env,
  player: PlayerRow,
): Promise<Response> {
  const url = new URL(request.url);
  const channel = url.searchParams.get('channel');
  if (!channel) return fail(400, 'Which channel?');

  const viewer = await chatViewer(env, player);
  const access = resolveAccess(channel, viewer);
  if (!access.ok) return fail(403, access.error);

  const sinceRaw = url.searchParams.get('since');
  const since = sinceRaw === null ? null : Number(sinceRaw);

  const messages =
    since === null || !Number.isFinite(since)
      ? await readRecent(env.DB, channel, 80)
      : await readChannel(env.DB, channel, since, 200);

  // Opening a channel marks it read. Anything arriving after this instant is
  // what the unread badge is counting.
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO channel_reads (player_id, channel, last_read_at)
     VALUES (?1, ?2, ?3)
     ON CONFLICT(player_id, channel) DO UPDATE SET last_read_at = excluded.last_read_at`,
  )
    .bind(player.id, channel, now)
    .run();

  return json({channel, messages, serverTime: now});
}

/**
 * Sends a message.
 *
 * Both sides of a private conversation get a thread row, so it appears in the
 * recipient's Private tab without them having to already know it exists -
 * otherwise the first message to somebody would be invisible to them.
 */
async function handleChatSend(
  request: Request,
  env: Env,
  player: PlayerRow,
): Promise<Response> {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const channelRaw = typeof body?.channel === 'string' ? body.channel : null;
  const textRaw = typeof body?.body === 'string' ? body.body : null;
  if (!channelRaw || textRaw === null) return fail(400, 'Nothing to send.');

  const text = flattenMessage(textRaw);
  if (text.length === 0) return fail(400, 'Say something.');
  if (text.length > MESSAGE_MAX) {
    return fail(400, `Messages are ${MESSAGE_MAX} characters or fewer.`);
  }

  const viewer = await chatViewer(env, player);
  const access = resolveAccess(channelRaw, viewer);
  if (!access.ok) return fail(403, access.error);
  if (!access.canWrite) return fail(403, 'You cannot post there.');

  const now = Date.now();
  const writes: D1PreparedStatement[] = [
    env.DB.prepare(
      `INSERT INTO messages (id, channel, author_id, body, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5)`,
    ).bind(newId(), channelRaw, player.id, text, now),
  ];

  const other = dmOther(channelRaw, player.id);
  if (other) {
    for (const [owner, partner] of [
      [player.id, other],
      [other, player.id],
    ]) {
      writes.push(
        env.DB.prepare(
          `INSERT INTO dm_threads (player_id, other_id, channel, updated_at)
           VALUES (?1, ?2, ?3, ?4)
           ON CONFLICT(player_id, other_id) DO UPDATE SET updated_at = excluded.updated_at`,
        ).bind(owner, partner, channelRaw, now),
      );
    }
  }

  await env.DB.batch(writes);

  // Pruning rides on sending rather than on a schedule, because a Worker has
  // no background. One send in roughly two hundred pays for it, which is often
  // enough to keep the table bounded and rare enough to be invisible.
  if (Math.random() < 0.005) {
    await env.DB.prepare(`DELETE FROM messages WHERE created_at < ?1`)
      .bind(now - RETENTION_DAYS * 86_400_000)
      .run();
  }

  return json({ok: true, serverTime: now});
}

/** Which channels this player has, and how much is unread in each. */
async function handleChatChannels(env: Env, player: PlayerRow): Promise<Response> {
  const viewer = await chatViewer(env, player);
  const channels = channelsFor(viewer);

  const threads = await env.DB.prepare(
    `SELECT t.channel AS channel, p.username AS other, t.updated_at AS updatedAt
       FROM dm_threads t
       JOIN players p ON p.id = t.other_id
      WHERE t.player_id = ?1
      ORDER BY t.updated_at DESC
      LIMIT 50`,
  )
    .bind(player.id)
    .all<{channel: string; other: string; updatedAt: number}>();

  const keys = [channels.server, channels.alliance, channels.leadership]
    .concat((threads.results ?? []).map((t) => t.channel))
    .filter((k): k is string => k !== null);

  const unread: Record<string, number> = {};
  if (keys.length > 0) {
    const placeholders = keys.map((_, i) => `?${i + 2}`).join(', ');
    const rows = await env.DB.prepare(
      `SELECT m.channel AS channel, COUNT(*) AS n
         FROM messages m
         LEFT JOIN channel_reads r
                ON r.channel = m.channel AND r.player_id = ?1
        WHERE m.channel IN (${placeholders})
          AND m.author_id <> ?1
          AND m.created_at > COALESCE(r.last_read_at, 0)
        GROUP BY m.channel`,
    )
      .bind(player.id, ...keys)
      .all<{channel: string; n: number}>();
    for (const row of rows.results ?? []) unread[row.channel] = row.n;
  }

  // The most recent message in each channel, for the collapsed bar and the
  // private conversation list. One query rather than one per channel: a player
  // with a dozen conversations would otherwise pay a dozen round trips to
  // render a list they have not opened.
  const latest: Record<string, {author: string; body: string; createdAt: number}> = {};
  if (keys.length > 0) {
    const placeholders = keys.map((_, i) => `?${i + 1}`).join(', ');
    const rows = await env.DB.prepare(
      `SELECT m.channel AS channel, m.body AS body, m.created_at AS createdAt,
              p.username AS author
         FROM messages m
         JOIN players p ON p.id = m.author_id
         JOIN (SELECT channel, MAX(created_at) AS newest
                 FROM messages
                WHERE channel IN (${placeholders})
                GROUP BY channel) last
           ON last.channel = m.channel AND last.newest = m.created_at`,
    )
      .bind(...keys)
      .all<{channel: string; body: string; createdAt: number; author: string}>();
    for (const row of rows.results ?? []) {
      latest[row.channel] = {
        author: row.author,
        body: row.body,
        createdAt: row.createdAt,
      };
    }
  }

  return json({
    channels,
    threads: threads.results ?? [],
    unread,
    latest,
    rank: viewer.rank,
    serverTime: Date.now(),
  });
}

/** Opens (or finds) a private conversation with somebody, by callsign. */
async function handleChatOpenDm(
  request: Request,
  env: Env,
  player: PlayerRow,
): Promise<Response> {
  const body = (await request.json().catch(() => null)) as {username?: unknown} | null;
  const username = typeof body?.username === 'string' ? body.username : null;
  if (!username) return fail(400, 'Who with?');

  const other = await env.DB.prepare(
    `SELECT id, username FROM players WHERE username = ?1 COLLATE NOCASE`,
  )
    .bind(username)
    .first<{id: string; username: string}>();
  if (!other) return fail(404, 'No such callsign.');
  if (other.id === player.id) return fail(400, 'That one is you.');

  const channel = dmChannel(player.id, other.id);
  // Only the opener's own thread row is created. The recipient's appears when
  // there is something in it to see - a list of conversations nobody has
  // spoken in is a list of people who tried to talk to you and did not.
  await env.DB.prepare(
    `INSERT INTO dm_threads (player_id, other_id, channel, updated_at)
     VALUES (?1, ?2, ?3, ?4)
     ON CONFLICT(player_id, other_id) DO NOTHING`,
  )
    .bind(player.id, other.id, channel, Date.now())
    .run();

  return json({channel, other: other.username});
}

async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);

  const endpoint = `${request.method} ${url.pathname}`;

  if (endpoint === 'POST /api/access/request') return handleRequestAccess(request, env);

  if (endpoint === 'GET /api/access/decide') return handleDecision(request, env);

  if (endpoint === 'GET /api/access/callsign') return handleCallsignCheck(request, env);
  if (endpoint === 'POST /api/auth/login') return handleLogin(request, env);

  if (endpoint === 'POST /api/auth/logout') {
    const token = readSessionCookie(request);
    if (token) await env.DB.prepare(`DELETE FROM sessions WHERE token = ?1`).bind(token).run();
    return json({ok: true}, {headers: {'Set-Cookie': sessionCookie('', 0)}});
  }

  const player = await authenticate(request, env);
  if (!player) return fail(401, 'Not signed in.');

  if (endpoint === 'GET /api/me') return json({player});

  if (endpoint === 'GET /api/access/requests') return handleAdminRequests(env, player);

  if (endpoint === 'GET /api/base') {
    const now = Date.now();
    const state = await settleAndLoad(env, player.id, now);
    if (!state) return fail(404, 'No base found.');
    return json(baseView(state, now));
  }

  if (endpoint === 'POST /api/base/upgrade') return handleStartUpgrade(request, env, player);

  if (endpoint === 'GET /api/chat') return handleChatRead(request, env, player);

  if (endpoint === 'POST /api/chat') return handleChatSend(request, env, player);

  if (endpoint === 'GET /api/chat/channels') return handleChatChannels(env, player);

  if (endpoint === 'POST /api/chat/dm') return handleChatOpenDm(request, env, player);

  if (endpoint === 'GET /api/portrait') return handlePortraitImage(request, env);

  if (endpoint === 'GET /api/alliance/crest') return handleAllianceCrestImage(request, env);

  if (endpoint === 'POST /api/alliance/crest') return handleAllianceCrest(request, env, player);

  if (endpoint === 'GET /api/alliance') return handleAlliance(env, player);

  if (endpoint === 'GET /api/alliance/browse') return handleBrowseAlliances(env, player);

  if (endpoint === 'POST /api/alliance/create') {
    return handleCreateAlliance(request, env, player);
  }

  if (endpoint === 'POST /api/alliance/join') return handleJoinAlliance(request, env, player);

  if (endpoint === 'POST /api/alliance/leave') return handleLeaveAlliance(request, env, player);

  if (endpoint === 'POST /api/alliance/decide') {
    return handleDecideApplication(request, env, player);
  }

  if (endpoint === 'POST /api/alliance/rank') return handleAllianceRank(request, env, player);

  if (endpoint === 'POST /api/alliance/settings') {
    return handleAllianceSettings(request, env, player);
  }

  if (endpoint === 'GET /api/profile') return handleProfile(request, env);

  if (endpoint === 'POST /api/profile') return handleEditProfile(request, env, player);

  if (endpoint === 'POST /api/profile/portrait') return handlePortrait(request, env, player);

  if (endpoint === 'GET /api/cosmetics') return handleCosmetics(env, player);

  if (endpoint === 'POST /api/cosmetics/equip') return handleEquip(request, env, player);

  if (endpoint === 'GET /api/world') return handleWorld(request, env, player);

  if (endpoint === 'POST /api/world/move') return handleMove(request, env, player);

  return fail(404, 'No such endpoint.');
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await route(request, env);
    } catch (error) {
      return serverError(error, env);
    }
  },
} satisfies ExportedHandler<Env>;
