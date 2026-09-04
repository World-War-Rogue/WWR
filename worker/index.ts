/**
 * World War Rogue API.
 *
 * Requests to /api/* are handled here; everything else falls through to the
 * static assets binding, which serves the built React client.
 */
import {handleAdminRequests} from './admin';
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
      allianceId: null,
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
