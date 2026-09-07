/**
 * Bot accounts: farm bots that populate a server, and test bots that a
 * harness drives through the public API.
 *
 * Farm bots are ordinary player rows with a `bots` row beside them. They never
 * act - nothing logs in as them, nothing marches for them - so their progress
 * cannot come from a background loop, and there is none: like everything else
 * in this Worker, a bot's state becomes true the moment somebody looks at it.
 * Its building levels and Service Ranks at any instant are a deterministic
 * function of (time since planting, its seed), materialised into the same
 * tables a real player writes to whenever the bot is read - as a raid target,
 * on a profile, or inside a map viewport. Production and raid loot then work
 * unchanged, because to the rest of the game the bot IS a player.
 *
 * Test bots are real accounts with real passwords, minted only while
 * TEST_BOT_SECRET is set in the environment. The harness in tools/testbots
 * plays them; this file only creates them and refuses their attacks on a
 * server that has not opted in.
 */
import {LEVELLED_BUILDINGS, type BuildingLevels, type LevelledBuilding} from '../shared/buildings';
import {STARTER_ASSETS, seasonWeek} from '../shared/season';
import {hashPassword, newId} from './auth';
import {ensureRoster} from './squads';

export const FARM_ROLE = 'farmbot';
export const TEST_ROLE = 'testbot';

export function isBotRole(role: string): boolean {
  return role === FARM_ROLE || role === TEST_ROLE;
}

/** How high a farm bot may grow this season. Staggered pace keeps most below it. */
export const FARM_CEILING_SEASON_1 = 8;

/**
 * Plant at most this many per request. Each bot is eight or so round trips
 * to D1, and a Worker request has a subrequest budget; the bots page loops
 * requests until a world holds its target.
 */
export const PLANT_BATCH_MAX = 10;

/** How many farm bots a server is meant to carry. */
export const FARM_TARGET_PER_WORLD = 200;

/** A bot is re-materialised at most this often. */
const GROW_INTERVAL_MS = 30 * 60_000;

/* -------------------------------------------------------------------------- */
/* Deterministic randomness                                                   */
/* -------------------------------------------------------------------------- */

/** mulberry32: small, fast, and the same sequence on every read for one seed. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: readonly T[], next: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* Growth plan                                                                */
/* -------------------------------------------------------------------------- */

export type GrowthStep =
  | {kind: 'building'; building: LevelledBuilding; level: number}
  | {kind: 'asset'; assetId: string; rank: number};

const PRODUCERS: LevelledBuilding[] = ['fuel_point', 'fabrication_shop', 'garrison_barracks', 'recovery_yard'];
const HUBS: LevelledBuilding[] = ['armour_hub', 'artillery_hub', 'fixed_wing_hub', 'rotary_hub', 'drone_hub'];
const REST: LevelledBuilding[] = LEVELLED_BUILDINGS.filter(
  (b) => b !== 'command_center' && b !== 'quartermaster_warehouse' && !PRODUCERS.includes(b) && !HUBS.includes(b),
);

/**
 * Every upgrade a bot will ever make, in order, from level 1 to its ceiling.
 *
 * Command Center leads each band because it caps everything else, then the
 * producers and the Warehouse (a farm bot exists to hold stock), then the
 * starters' ranks, then the rest. Order inside a tier is shuffled by seed so
 * two bots at the same step are not identical.
 */
export function growthPlan(seed: number, ceiling: number): GrowthStep[] {
  const next = rng(seed ^ 0x9e3779b9);
  const steps: GrowthStep[] = [];
  for (let level = 2; level <= ceiling; level += 1) {
    steps.push({kind: 'building', building: 'command_center', level});
    for (const b of shuffled(PRODUCERS, next)) steps.push({kind: 'building', building: b, level});
    steps.push({kind: 'building', building: 'quartermaster_warehouse', level});
    for (const a of shuffled(STARTER_ASSETS, next)) steps.push({kind: 'asset', assetId: a, rank: level});
    for (const b of shuffled(HUBS, next)) steps.push({kind: 'building', building: b, level});
    for (const b of shuffled(REST, next)) steps.push({kind: 'building', building: b, level});
  }
  return steps;
}

export interface Pace {
  /** Milliseconds per step. */
  stepMs: number;
  /** Progress the bot is credited with at planting, in milliseconds. */
  headStartMs: number;
}

/** Between five and fourteen hours a step, and up to a day and a half already done. */
export function paceOf(seed: number): Pace {
  const next = rng(seed);
  const hours = 5 + next() * 9;
  return {stepMs: Math.round(hours * 3_600_000), headStartMs: Math.round(next() * 36 * 3_600_000)};
}

export interface BotState {
  levels: Partial<BuildingLevels>;
  ranks: Record<string, number>;
  stepsDone: number;
  stepsTotal: number;
}

/**
 * The Season Readiness Band a bot honours: week 1 -> 2, week 2 -> 3, ... so a
 * farm bot never leads the week's ceiling, whatever its pace says.
 */
export function bandCeiling(now: number): number {
  return Math.max(1, seasonWeek(now) + 1);
}

/** Where a bot planted at `plantedAt` with `seed` stands at `now`. */
export function botStateAt(seed: number, ceiling: number, plantedAt: number, now: number): BotState {
  const plan = growthPlan(seed, ceiling);
  const pace = paceOf(seed);
  const elapsed = Math.max(0, now - plantedAt) + pace.headStartMs;
  const stepsDone = Math.min(plan.length, Math.floor(elapsed / pace.stepMs));
  const band = bandCeiling(now);
  const levels: Partial<BuildingLevels> = {};
  const ranks: Record<string, number> = {};
  for (const step of plan.slice(0, stepsDone)) {
    if (step.kind === 'building') {
      if (step.level <= band) levels[step.building] = step.level;
    } else if (step.rank <= band) {
      ranks[step.assetId] = step.rank;
    }
  }
  return {levels, ranks, stepsDone, stepsTotal: plan.length};
}

/* -------------------------------------------------------------------------- */
/* Materialising                                                              */
/* -------------------------------------------------------------------------- */

interface BotRow {
  player_id: string;
  kind: string;
  seed: number;
  ceiling: number;
  planted_at: number;
  grown_at: number;
}

/**
 * Bring one farm bot's rows up to where its plan says it should be.
 *
 * Writes are MAX-merges, so a bot can never shrink and a second concurrent
 * read cannot undo the first. Returns false when the player is not a farm bot.
 */
export async function materialiseBot(db: D1Database, playerId: string, now: number): Promise<boolean> {
  const bot = await db
    .prepare(`SELECT player_id, kind, seed, ceiling, planted_at, grown_at FROM bots WHERE player_id = ?1`)
    .bind(playerId)
    .first<BotRow>();
  if (!bot || bot.kind !== 'farm') return false;
  if (now - bot.grown_at < GROW_INTERVAL_MS) return true;
  await applyBotState(db, bot, now);
  return true;
}

async function applyBotState(db: D1Database, bot: BotRow, now: number): Promise<void> {
  const state = botStateAt(bot.seed, bot.ceiling, bot.planted_at, now);
  const writes: D1PreparedStatement[] = [];
  for (const [building, level] of Object.entries(state.levels)) {
    writes.push(
      db
        .prepare(
          `INSERT INTO base_levels (player_id, building, level) VALUES (?1, ?2, ?3)
             ON CONFLICT(player_id, building) DO UPDATE SET level = MAX(level, excluded.level)`,
        )
        .bind(bot.player_id, building, level),
    );
  }
  for (const [assetId, rank] of Object.entries(state.ranks)) {
    writes.push(
      db
        .prepare(`UPDATE player_assets SET level = MAX(level, ?3) WHERE player_id = ?1 AND asset_id = ?2`)
        .bind(bot.player_id, assetId, rank),
    );
  }
  writes.push(
    db.prepare(`UPDATE bots SET grown_at = ?2 WHERE player_id = ?1`).bind(bot.player_id, now),
  );
  await db.batch(writes);
}

/**
 * Grow the stale farm bots inside a map rectangle, a few per call.
 *
 * Called from the viewport read, which is the most frequent read there is, so
 * a busy map settles its bots within a handful of refreshes while a single
 * request never pays for more than `limit` of them.
 */
export async function growBotsInViewport(
  db: D1Database,
  worldId: number,
  x: number,
  y: number,
  w: number,
  h: number,
  now: number,
  limit = 6,
): Promise<number> {
  const stale = await db
    .prepare(
      `SELECT b.player_id, b.kind, b.seed, b.ceiling, b.planted_at, b.grown_at
         FROM bots b
         JOIN placements pl ON pl.player_id = b.player_id
        WHERE b.kind = 'farm' AND b.grown_at < ?6
          AND pl.world_id = ?1
          AND pl.plot_x BETWEEN ?2 AND ?3
          AND pl.plot_y BETWEEN ?4 AND ?5
        ORDER BY b.grown_at ASC
        LIMIT ?7`,
    )
    .bind(worldId, x, x + w, y, y + h, now - GROW_INTERVAL_MS, limit)
    .all<BotRow>();
  const rows = stale.results ?? [];
  for (const bot of rows) await applyBotState(db, bot, now);
  return rows.length;
}

/* -------------------------------------------------------------------------- */
/* Creating                                                                   */
/* -------------------------------------------------------------------------- */

/** "Lieutenant 447820": the rank word and six digits, nothing else. */
export function farmCallsign(next: () => number = Math.random): string {
  const digits = String(Math.floor(next() * 900_000) + 100_000);
  return `Lieutenant ${digits}`;
}

/** Test bots read as callsigns a person could have chosen: letters only. */
export function testCallsign(index: number): string {
  const words = ['Harrier', 'Bastion', 'Corsair', 'Sentinel', 'Vanguard', 'Halberd', 'Redoubt', 'Lancer'];
  return `${words[index % words.length]}Test${String.fromCharCode(65 + Math.floor(index / words.length))}`;
}

export function randomPassword(): string {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, (c) => ({'+': 'a', '/': 'b', '=': ''})[c] ?? '');
}

export interface SeedBase {
  (playerId: string, username: string, now: number, worldId?: number): Promise<void>;
}

export interface PlantedBot {
  playerId: string;
  username: string;
}

/**
 * Insert one bot account. No email, no shield, no approval record.
 *
 * `shield` is null for farm bots - they exist to be raided - and the standard
 * new-account shield for test bots, which must look exactly like a player to
 * be worth testing with.
 */
async function insertBotPlayer(
  db: D1Database,
  role: string,
  username: string,
  passwordHash: string,
  now: number,
  shieldUntil: number | null,
  country = 'US',
): Promise<string> {
  const playerId = newId();
  await db
    .prepare(
      `INSERT INTO players (id, username, username_key, password_hash, created_at, last_seen_at,
                            email, email_key, country, locale, approved_at, role,
                            shield_until, shield_kind)
       VALUES (?1, ?2, ?3, ?4, ?5, ?5, NULL, NULL, ?9, 'en', ?5, ?6, ?7, ?8)`,
    )
    .bind(playerId, username, username.toLowerCase(), passwordHash, now, role, shieldUntil, shieldUntil ? 'new' : null, country)
    .run();
  return playerId;
}

/** Country chips a server's population plausibly shows; weighted towards the US. */
const FARM_COUNTRIES = ['US', 'US', 'US', 'US', 'CA', 'GB', 'DE', 'FR', 'BR', 'MX', 'AU', 'PH', 'IN', 'PL', 'TR', 'KR', 'JP'];


/**
 * Plant `count` farm bots in one world. Returns the ones that landed.
 *
 * A callsign collision (the six digits repeat) is simply skipped; the caller
 * plants again for the shortfall. The bot's roster is granted now rather than
 * on first look, because the first look is likely to be an attack, and the
 * defender must already hold its starters when the battle is read.
 */
export async function plantFarmBots(
  db: D1Database,
  worldId: number,
  count: number,
  ceiling: number,
  seedBase: SeedBase,
  now: number,
): Promise<PlantedBot[]> {
  // One hash shared by the batch: nobody signs in as a farm bot with a
  // password - the owner uses the impersonation route - and PBKDF2 at
  // 100,000 iterations per bot would burn the request's CPU budget.
  const hash = await hashPassword(randomPassword());
  const planted: PlantedBot[] = [];
  for (let i = 0; i < Math.min(count, PLANT_BATCH_MAX); i += 1) {
    const username = farmCallsign();
    let playerId: string;
    try {
      const country = FARM_COUNTRIES[Math.floor(Math.random() * FARM_COUNTRIES.length)];
      playerId = await insertBotPlayer(db, FARM_ROLE, username, hash, now, null, country);
    } catch {
      continue; // username_key unique index: those six digits are taken.
    }
    // Planted "a little while ago": spreads created_at so a hundred bots do
    // not share one timestamp anywhere it might show.
    const plantedAt = now - Math.floor(Math.random() * 6 * 3_600_000);
    const seed = Math.floor(Math.random() * 0x7fffffff);
    await seedBase(playerId, username, plantedAt, worldId);
    await ensureRoster(db, playerId, plantedAt);
    await db
      .prepare(
        `INSERT INTO bots (player_id, kind, seed, ceiling, planted_at, grown_at)
         VALUES (?1, 'farm', ?2, ?3, ?4, 0)`,
      )
      .bind(playerId, seed, ceiling, plantedAt)
      .run();
    planted.push({playerId, username});
  }
  return planted;
}

export interface MintedTestBot extends PlantedBot {
  password: string;
}

/** Mint `count` test bots with fresh passwords, returned exactly once. */
export async function mintTestBots(
  db: D1Database,
  count: number,
  seedBase: SeedBase,
  shieldMs: number,
  now: number,
): Promise<MintedTestBot[]> {
  const existing = await db
    .prepare(`SELECT COUNT(*) AS n FROM bots WHERE kind = 'test'`)
    .first<{n: number}>();
  const start = existing?.n ?? 0;
  const minted: MintedTestBot[] = [];
  for (let i = 0; i < Math.min(count, 10); i += 1) {
    const username = testCallsign(start + i);
    const password = randomPassword();
    let playerId: string;
    try {
      playerId = await insertBotPlayer(db, TEST_ROLE, username, await hashPassword(password), now, now + shieldMs);
    } catch {
      continue;
    }
    await seedBase(playerId, username, now);
    await ensureRoster(db, playerId, now);
    await db
      .prepare(
        `INSERT INTO bots (player_id, kind, seed, ceiling, planted_at, grown_at)
         VALUES (?1, 'test', 0, 0, ?2, ?2)`,
      )
      .bind(playerId, now)
      .run();
    minted.push({playerId, username, password});
  }
  return minted;
}

/* -------------------------------------------------------------------------- */
/* Listing                                                                    */
/* -------------------------------------------------------------------------- */

export interface BotSummary {
  playerId: string;
  username: string;
  kind: string;
  worldId: number | null;
  commandCenter: number;
  plantedAt: number;
  lastSeenAt: number;
}

export async function listBots(db: D1Database, limit = 500): Promise<BotSummary[]> {
  const rows = await db
    .prepare(
      `SELECT b.player_id AS playerId, p.username AS username, b.kind AS kind,
              ba.home_world_id AS worldId, COALESCE(bl.level, 1) AS commandCenter,
              b.planted_at AS plantedAt, p.last_seen_at AS lastSeenAt
         FROM bots b
         JOIN players p ON p.id = b.player_id
         LEFT JOIN bases ba ON ba.player_id = b.player_id
         LEFT JOIN base_levels bl ON bl.player_id = b.player_id AND bl.building = 'command_center'
        ORDER BY b.kind DESC, p.username ASC
        LIMIT ?1`,
    )
    .bind(limit)
    .all<BotSummary>();
  return rows.results ?? [];
}

export async function botCountsByWorld(db: D1Database): Promise<Array<{worldId: number; farm: number; test: number}>> {
  const rows = await db
    .prepare(
      `SELECT ba.home_world_id AS worldId,
              SUM(CASE WHEN b.kind = 'farm' THEN 1 ELSE 0 END) AS farm,
              SUM(CASE WHEN b.kind = 'test' THEN 1 ELSE 0 END) AS test
         FROM bots b JOIN bases ba ON ba.player_id = b.player_id
        GROUP BY ba.home_world_id ORDER BY ba.home_world_id`,
    )
    .all<{worldId: number; farm: number; test: number}>();
  return rows.results ?? [];
}
