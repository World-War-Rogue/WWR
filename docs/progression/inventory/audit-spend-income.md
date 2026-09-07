# Audit: Command Credit / Token spend and income (non-building, non-rank/package)

Repo snapshot `/tmp/wwr` (commit 65e77e5). Read-only. Every figure below is quoted from code with `file:line`; nothing is invented. Scope: shields, cosmetics / base skins / portraits, Trade Post, Task Force Delta purchase, Second Engineer Team (currency side only), Depot resource purchase (it spends currency, so it is listed), the weekly test Token top-up, the wallet table and every route that changes `credits` or `tokens`, and every source of Credit income.

---

## 0. Headline findings

1. **There is no Command Credit income source in code.** The only statement anywhere that *increases* `players.credits` is the package-strip refund (`worker/upgrades.ts:431`), and that refund is of currency the player already spent. Every signup starts at `credits = 0` (`migrations/0020_wallet_upgrades.sql:28` default, `migrations/0024_season_1_reset.sql:47` reset). Raids move resources only (`worker/march.ts:752-783`), battles record loot in resources only (`migrations/0013_rally_battles.sql:54-57`), alliances, bots, daily tasks and signup grant nothing. Grep of `worker/` for `credits`/`tokens` hits only `buildings.ts`, `season1.ts`, `index.ts`, `tradePost.ts`, `upgrades.ts`, `squads.ts` (and an unrelated `max_tokens` in `chat.ts:313` / `index.ts:1050`). **Average Credit income per source and per session cannot be computed because the value is exactly zero for every source and there is no session-time model** (§7).
2. **The only currency inflow is the weekly test Token top-up** to `TEST_TOKEN_FLOOR = 100_000` (`shared/economy.ts:49-50`, applied in `worker/upgrades.ts:80-136`). It is a top-up, not an amount: `added = TEST_TOKEN_FLOOR - row.tokens` (`upgrades.ts:108`), so the grant per week equals what the player spent the previous week (capped at 100,000). Migration 0024 also hard-sets every existing player to `tokens = 100000` (`0024_season_1_reset.sql:47`) — a duplicated literal of the constant.
3. **Tokens DO convert to Credits at 1:1 via fit-then-strip.** `packageUp` records `pkg_credits = pkg_credits + (chosen.credits + chosen.tokens)` (`worker/upgrades.ts:368,383`) and `resetPackages` refunds `credits = credits + pkg_credits` (`upgrades.ts:431`). The code comment at `upgrades.ts:372-381` acknowledges this ("fit-then-strip is now a 1:1 Token-to-Credit conversion"). `docs/progression/README.md:63-65` ("Tokens never convert to Command Credits") and the column comment in `migrations/0020_wallet_upgrades.sql:97-100` ("Tokens are not refunded, so they are deliberately not counted here") both contradict the live code.
4. **Every purchasable thing in scope is 1:1** (one `price` number, paid by any split that sums to it — `shared/economy.ts:137-141`), with one caveat: **cosmetics carry a price "in credits" with no Token price and no purchase path at all** (`shared/cosmetics.ts:82-87`: "Prices are provisional; nothing sells them yet"). No cosmetic grants power (§3).
5. **Shield cooldown is only applied when the owner attacks while shielded** (`worker/march.ts:369-377`). A shield that expires naturally sets no `shield_cooldown_until`, so a player may buy back-to-back paid shields with no gap. `shared/shields.ts:6-7` ("a cooldown after") and the ShieldPanel copy at `src/live/ShieldPanel.tsx:95` ("a 4-hour cooldown follows") describe a rule the server does not enforce.
6. **Hardcoded prices outside `shared/economy.ts`:** shields 250/600/1500 (`shared/shields.ts:19-21`), Delta 2500 (`shared/season.ts:78`), Second Engineer Team 1500 (`shared/buildings.ts:300`), Depot rates 100/80/70/60 units per currency (`shared/buildings.ts:183-188`), cosmetics 700–1400 (`shared/cosmetics.ts:156-184`), and the `100000` literal in `migrations/0024_season_1_reset.sql:47`.
7. **`wallet_ledger` is write-only.** No route or screen reads it (grep: only INSERTs in `worker/upgrades.ts:129,206,446`). Trade Post purchases land in the ledger as ordinary `kind = 'package'` rows (`worker/tradePost.ts:200` → `upgrades.ts:385-394`); only `trade_purchases` records that the Trade Post was the route.
8. **The client never sends a `split` for shields, Delta, Depot resources or the Second Team** (`src/net/api.ts:458-488` all pass `split` undefined → server `defaultSplit`, Credits first, `shared/economy.ts:149-152`). With Credits always 0 in Season 1, every such purchase is paid entirely in Tokens.

---

## 1. Wallet: table, columns, and every statement that changes `credits` or `tokens`

### 1.1 Schema

| Column / table | Defined | Meaning |
|---|---|---|
| `players.tokens INTEGER NOT NULL DEFAULT 0` | `migrations/0020_wallet_upgrades.sql:27` | bought currency |
| `players.credits INTEGER NOT NULL DEFAULT 0` | `0020:28` | earned currency |
| `players.granted_week INTEGER NOT NULL DEFAULT 0` | `0020:36` | last game-week index the top-up was applied ("Zero means never granted … the first read always tops up") |
| `players.wallet_rev INTEGER NOT NULL DEFAULT 0` | `0020:50` | monotonic revision claimed by every spend |
| `wallet_ledger (id, player_id, kind, tokens, credits, subject, detail, created_at)` | `0020:57-69` | append-only signed movements; comment lists kinds `'grant' | 'rank' | 'package' | 'reset'` (`0020:61`) but code also writes `'shield'` (`worker/season1.ts:284`), `'delta'` (`season1.ts:352`), `'resources'` (`worker/buildings.ts:363`), `'second_team'` (`buildings.ts:412`) |
| `player_assets.pkg_credits` | `0020:97-101` | refundable package spend (see finding 3 — comment says Tokens excluded; code includes them) |
| `depot_purchases (player_id, day, resource, amount)` | `migrations/0023_base_resources.sql:19-25` | per-game-day per-resource purchase tally |
| `trade_purchases (id, player_id, offer_id, window_key, asset_id, package, route, cost, created_at)` | `migrations/0029_trade_post.sql:9-19` + index on `(player_id, offer_id, window_key)` `:22` | Trade Post purchase rows, PK = client purchase id |
| `players.delta_at INTEGER` | `migrations/0027_delta.sql:4` | Delta opened (bought or earned) |
| `players.second_team_at INTEGER` | `0023:14` | Second Engineer Team ready instant |
| `players.shield_until, shield_kind, shield_cooldown_until, coupon_week (DEFAULT -1), coupon_8_used, coupon_4_used` | `migrations/0025_construction_shields_guide.sql:19-24` | shield state |
| `player_cosmetics (player_id, item_id, slot, source, acquired_at, exclusive)` | `migrations/0005_cosmetics.sql:19-28`, `0006_exclusive.sql:13-18` | owned paid cosmetics/skins (no purchase path writes it) |

### 1.2 Every statement that changes `players.tokens` or `players.credits`

| # | Direction | Statement | File:line | Called from |
|---|---|---|---|---|
| W1 | +tokens | `UPDATE players SET tokens = ?3, granted_week = ?2, wallet_rev = wallet_rev + 1 WHERE id = ?1 AND granted_week < ?2` (sets to floor) | `worker/upgrades.ts:109-116` | `settleWallet` — every wallet read: `GET /api/base` (`index.ts:2685`), `GET /api/base/levels` (`2775`), `POST /api/base/level` (`2790`), `GET /api/trade-post` (`tradePost.ts:91`), and inside every spend |
| W2 | −tokens −credits | `UPDATE players SET tokens = tokens - ?2, credits = credits - ?3, wallet_rev = wallet_rev + 1 WHERE id = ?1 AND wallet_rev = ?4 AND tokens >= ?2 AND credits >= ?3` | `worker/upgrades.ts:183-190` (`claimWallet`) | `rankUp` (`upgrades.ts:291`, route `POST /api/assets/rank` `index.ts:2710`), `packageUp` (`upgrades.ts:366`, `POST /api/assets/package` `index.ts:2831`, and via Trade Post `tradePost.ts:200`), `applyShield` (`season1.ts:277`, `POST /api/shield` `index.ts:2749`), `buyDelta` (`season1.ts:348`, `POST /api/squads/delta` `index.ts:2739`), `buyResource` (`buildings.ts:349`, `POST /api/depot/resources` `index.ts:2801`), `buySecondTeam` (`buildings.ts:405`, `POST /api/base/second-team` `index.ts:2817`) |
| W3 | +credits | `UPDATE players SET credits = credits + ?2, wallet_rev = wallet_rev + 1 WHERE id = ?1 AND wallet_rev = ?3` (refund = `asset.pkg_credits`) | `worker/upgrades.ts:428-434` (`resetPackages`) | `POST /api/assets/reset` (`index.ts:2859`) |
| W4 | =100000 tokens, =0 credits | `UPDATE players SET tokens = 100000, credits = 0, wallet_rev = wallet_rev + 1, granted_week = 0, second_team_at = NULL` | `migrations/0024_season_1_reset.sql:45-47` | one-off migration |

No other file writes either column: `worker/game.ts`, `worker/march.ts`, `worker/battles.ts`, `worker/alliance.ts`, `worker/bots.ts`, `worker/admin.ts`, `worker/botsAdmin.ts`, `worker/signup.ts`, `worker/profile.ts` contain no `credits`/`tokens` reference at all. Signup (`worker/index.ts:539-566`, `seedBase` `index.ts:217-241`) inserts a player row and a base with no wallet columns, so a new account starts at the column defaults (0/0) and is raised to 100,000 Tokens by W1 on its first wallet read (`granted_week` 0 < any current week index).

---

## 2. Income sources (Credits and Tokens)

| Source | Currency | Amount rule | File:line | Status |
|---|---|---|---|---|
| Weekly test top-up | Tokens | If `TEST_GRANTS_ON && grantedWeek < gameWeekIndex(now) && tokens < TEST_TOKEN_FLOOR`: `tokens := 100_000`; `added = 100_000 - tokens` written to ledger as `'grant'` | `shared/economy.ts:49-50`; `worker/upgrades.ts:94-135`; week index `shared/gametime.ts:133-136` (Monday 00:00 RST) | LIVE (test-only flag) |
| Season 1 reset grant | Tokens | one-off `tokens = 100000` | `migrations/0024_season_1_reset.sql:47` | applied once |
| Package strip refund | Credits | `credits += player_assets.pkg_credits` where `pkg_credits` accumulated `chosen.credits + chosen.tokens` per fit | `worker/upgrades.ts:383, 425-434` | LIVE — not income; a refund that converts Token spend into Credits 1:1 |
| Daily tasks / objectives | — | none | `src/i18n/en/base.ts:55` "Season operations, daily objectives and event rewards will run from here." (placeholder copy only) | NOT BUILT |
| Raids | Resources only | `raidLoot(victim.resources, victim.levels)` moves fuel/steel/munitions/alloy | `worker/march.ts:752-783`; `shared/buildings.ts:169` | no currency |
| Battles | Resources only | `loot_fuel/steel/munitions/alloy` columns | `migrations/0013_rally_battles.sql:54-57`; `worker/battles.ts:26-29,54-58` | no currency |
| Alliance | — | nothing | `worker/alliance.ts` has no wallet reference | none |
| Bots | — | nothing (bots are seeded like players, `worker/bots.ts:300-302`, no wallet columns) | none |
| Signup grant | — | nothing explicit; defaults 0/0 then W1 | `worker/index.ts:539-566` | none for Credits |
| Cosmetic `source = 'reward'` | items, not currency | `grantItem(..., 'purchase'|'grant'|'reward')` exists but has **no caller** anywhere (grep `grantItem` → only its definition `worker/cosmetics.ts:100`) | NOT WIRED |
| Token store | Tokens | `WWR_TOKEN_STORE_URL` env → a link only (`worker/index.ts:170`, `worker/tradePost.ts:134`, `src/live/TradePost.tsx:114-123`); no webhook, no credit path | NOT BUILT |

**Conclusion:** Command Credit income in code = **0 from every source**. The `credits` balance of every player is 0 unless they have stripped packages.

Player-facing copy that asserts otherwise: `src/live/AssetUpgrade.tsx:311` ("Command Credits are earned by playing; Tokens are bought."), `src/live/ResourcePanels.tsx:65` ("won in raids and daily tasks"), `shared/march.ts:111` comment ("in raids and daily tasks").

---

## 3. Systems in scope — one JSON object each

"Cost at level N" is not meaningful for these one-shot items; `costAtLevels` reports the single price under `"1"` and `null` elsewhere, and says so in `notes`.

### 3.1 Paid shields

```json
{
  "id": "shield-paid",
  "displayName": "Shield (8h / 24h / 72h, paid)",
  "category": "shield",
  "currentLevelMin": 1,
  "currentLevelMax": 1,
  "levelCount": 3,
  "playerVisible": true,
  "upgradeCurrency": ["credits", "tokens"],
  "tokenCostRule": "SHIELD_OPTIONS[kind].price, paid by any split summing to it (defaultSplit: Credits first)",
  "creditCostRule": "same single price field",
  "equalValueCheck": true,
  "costSourceFile": "shared/shields.ts:16-22",
  "costFormulaOrTable": "{paid8: ms 8h price 250}, {paid24: ms 24h price 600}, {paid72: ms 72h price 1500}; per-hour 31.25 / 25.0 / 20.83 currency",
  "costAtLevels": {"1": 250, "10": null, "20": null, "30": null, "40": null, "50": null},
  "cumulativeCostToMax": null,
  "timeCostRule": "shield_until = now + option.ms (worker/season1.ts:258); instant",
  "prerequisiteRule": "no active shield (season1.ts:238); no cooldown (239-241); no inbound attack march (246-250); no outbound attack march (251-255); shield_until NULL or expired in the UPDATE guard (281)",
  "effectDescription": "Base cannot be attacked or raided while shield_until > now (shared/shields.ts:28-30; enforced at worker/march.ts:258 and :561). Ordering an attack while shielded drops the shield and sets shield_cooldown_until = now + 4h (worker/march.ts:369-377).",
  "combatRelevant": true,
  "powerClass": "consumable",
  "statOrPowerFieldsChanged": ["players.shield_until", "players.shield_kind"],
  "powerScoreFormula": null,
  "cumulativePowerAtMax": null,
  "capsAndLimits": "One at a time (no stacking; the UPDATE requires shield_until IS NULL OR <= now, season1.ts:281). SHIELD_COOLDOWN_MS = 4h (shields.ts:12) is applied ONLY by march.ts:369-377 when the owner attacks while shielded; natural expiry sets no cooldown, so consecutive purchases are unlimited. No per-week purchase cap, no price escalation.",
  "serverGrantPath": "worker/season1.ts applyShield() -> POST /api/shield (worker/index.ts:2749-2760); wallet via claimWallet + ledger kind 'shield' (season1.ts:276-285)",
  "clientScreenPath": "src/live/ShieldPanel.tsx (mounted from src/live/BaseSheets.tsx:126 Command Center Protection tab, and :227 Depot Services tab with paidOnly)",
  "notes": "Client calls api.applyShield(kind) with no split (ShieldPanel.tsx:41; api.ts:464-468) so Credits-first default applies; with Credits at 0 the purchase is all Tokens. Price literal lives outside shared/economy.ts. The ShieldPanel footnote 'a 4-hour cooldown follows' (ShieldPanel.tsx:95) is not what the server does after expiry."
}
```

### 3.2 Free shield coupons

```json
{
  "id": "shield-coupon",
  "displayName": "Weekly shield coupons (8h + 4h)",
  "category": "shield",
  "currentLevelMin": 1,
  "currentLevelMax": 1,
  "levelCount": 2,
  "playerVisible": true,
  "upgradeCurrency": [],
  "tokenCostRule": "price 0",
  "creditCostRule": "price 0",
  "equalValueCheck": true,
  "costSourceFile": "shared/shields.ts:17-18",
  "costFormulaOrTable": "{coupon8: 8h, price 0}, {coupon4: 4h, price 0}",
  "costAtLevels": {"1": 0, "10": null, "20": null, "30": null, "40": null, "50": null},
  "cumulativeCostToMax": 0,
  "timeCostRule": "instant",
  "prerequisiteRule": "same hostile-march / active / cooldown checks as paid; coupon_8_used / coupon_4_used = 0 for the current coupon_week (season1.ts:242-243, 264-265)",
  "effectDescription": "Same protection as paid shield for 8h or 4h.",
  "combatRelevant": true,
  "powerClass": "consumable",
  "statOrPowerFieldsChanged": ["players.shield_until", "players.shield_kind", "players.coupon_8_used", "players.coupon_4_used"],
  "powerScoreFormula": null,
  "cumulativePowerAtMax": null,
  "capsAndLimits": "One of each per game week; reset lazily by settleCoupons when coupon_week < gameWeekIndex(now) (worker/season1.ts:97-108). Unused coupons do not carry over.",
  "serverGrantPath": "worker/season1.ts applyShield() price===0 branch (261-271) -> POST /api/shield",
  "clientScreenPath": "src/live/ShieldPanel.tsx",
  "notes": "Plus the 48h New Commander shield on signup: NEW_SHIELD_MS = 48h (shared/shields.ts:11) written at worker/index.ts:550-563 and by migration 0025:37-39. Not a spend."
}
```

### 3.3 Task Force Delta (bought)

```json
{
  "id": "delta-task-force",
  "displayName": "Task Force Delta (purchase)",
  "category": "other",
  "currentLevelMin": 0,
  "currentLevelMax": 1,
  "levelCount": 1,
  "playerVisible": true,
  "upgradeCurrency": ["credits", "tokens"],
  "tokenCostRule": "DELTA_PRICE = 2500, any split summing to it",
  "creditCostRule": "same",
  "equalValueCheck": true,
  "costSourceFile": "shared/season.ts:78",
  "costFormulaOrTable": "export const DELTA_PRICE = 2500;",
  "costAtLevels": {"1": 2500, "10": null, "20": null, "30": null, "40": null, "50": null},
  "cumulativeCostToMax": 2500,
  "timeCostRule": "instant (delta_at = now, worker/season1.ts:350)",
  "prerequisiteRule": "commandCenter >= DELTA_BUY_LEVEL (10) (season1.ts:338; shared/season.ts:77); delta_at IS NULL (341-342, 350). Free alternative: CC >= 20 AND Alpha/Bravo/Charlie each 6 assets all rank >= DELTA_FREE_RANK (20) (shared/season.ts:82-93; worker/squads.ts:134-152).",
  "effectDescription": "Opens the fourth six-slot Task Force (taskForceOpen, shared/season.ts:95-98). More deployable assets per march/defence.",
  "combatRelevant": true,
  "powerClass": "combat",
  "statOrPowerFieldsChanged": ["players.delta_at"],
  "powerScoreFormula": null,
  "cumulativePowerAtMax": null,
  "capsAndLimits": "Once per account; permanent. The 'earned' path is unreachable in Season 1 because maxRankForSeason(1) = 10 (shared/assets.ts:184-186) < DELTA_FREE_RANK 20 and buildingCapForSeason(1) = 10 (shared/buildings.ts:84-86) < CC 20.",
  "serverGrantPath": "worker/season1.ts buyDelta() -> POST /api/squads/delta (worker/index.ts:2739-2747); ledger kind 'delta'",
  "clientScreenPath": "src/live/Squads.tsx:288-297 (buyDelta) and :436-477 (card + confirm)",
  "notes": "Client sends no split (api.ts:458-459). Price literal outside shared/economy.ts. The response is handleSquads, not a wallet; the wallet on screen updates on the next base read."
}
```

### 3.4 Second Engineer Team (currency side)

```json
{
  "id": "second-engineer-team",
  "displayName": "Second Engineer Team",
  "category": "queue",
  "currentLevelMin": 0,
  "currentLevelMax": 1,
  "levelCount": 1,
  "playerVisible": true,
  "upgradeCurrency": ["credits", "tokens", "steel", "alloy"],
  "tokenCostRule": "SECOND_TEAM.currency = 1500, any split summing to it, PLUS resources",
  "creditCostRule": "same",
  "equalValueCheck": true,
  "costSourceFile": "shared/buildings.ts:297-302",
  "costFormulaOrTable": "SECOND_TEAM = {requiresEngineerYard: 10, cost: r(0, 12000, 0, 12000) [fuel 0, steel 12000, munitions 0, alloy 12000], currency: 1500, ms: 24h}",
  "costAtLevels": {"1": 1500, "10": null, "20": null, "30": null, "40": null, "50": null},
  "cumulativeCostToMax": 1500,
  "timeCostRule": "second_team_at = now + 24h (worker/buildings.ts:410); the queue exists once that instant passes",
  "prerequisiteRule": "engineer_support_yard >= 10 (buildings.ts:391-396); resources on hand (397-398); second_team_at IS NULL (389, 409)",
  "effectDescription": "A permanent second build queue (migrations/0023_base_resources.sql:12-14).",
  "combatRelevant": false,
  "powerClass": "convenience/production",
  "statOrPowerFieldsChanged": ["players.second_team_at"],
  "powerScoreFormula": null,
  "cumulativePowerAtMax": null,
  "capsAndLimits": "Once per account. Reachable in Season 1 only at the building cap (Engineer Yard 10 = buildingCapForSeason(1)).",
  "serverGrantPath": "worker/buildings.ts buySecondTeam() -> POST /api/base/second-team (worker/index.ts:2817-2829); atomic batch claimWallet + debit(stock) + UPDATE players + ledger kind 'second_team' (buildings.ts:404-413)",
  "clientScreenPath": "src/live/ResourcePanels.tsx:168-220",
  "notes": "Client sends no split (api.ts:487-488). Currency literal outside shared/economy.ts. Building-level side of this item belongs to the buildings audit."
}
```

### 3.5 Depot resource purchase

```json
{
  "id": "depot-resources",
  "displayName": "Depot: buy Fuel / Steel / Munitions / Alloy",
  "category": "other",
  "currentLevelMin": 1,
  "currentLevelMax": 1,
  "levelCount": 1,
  "playerVisible": true,
  "upgradeCurrency": ["credits", "tokens"],
  "tokenCostRule": "units = floor(amount / RESOURCE_PER_UNIT[kind]); cost = units currency; any split summing to units",
  "creditCostRule": "same",
  "equalValueCheck": true,
  "costSourceFile": "shared/buildings.ts:183-188 (rate), :191-196 (daily cap), :404-406 (cap multiplier); worker/buildings.ts:317-321",
  "costFormulaOrTable": "RESOURCE_PER_UNIT = {fuel: 100, steel: 80, munitions: 70, alloy: 60} per 1 currency. DAILY_RESOURCE_CAP = {fuel: 20000, steel: 16000, munitions: 14000, alloy: 12000} x depotCapMultiplier(depot) where depotCapMultiplier(L) = 1 + 0.5*((min(L,10)-1)/9).",
  "costAtLevels": {"1": 1, "10": null, "20": null, "30": null, "40": null, "50": null},
  "cumulativeCostToMax": null,
  "timeCostRule": "instant",
  "prerequisiteRule": "resulting stock <= capFor(kind, levels) (Warehouse cap) (worker/buildings.ts:324-329); today's purchases + bought <= daily cap (330-343)",
  "effectDescription": "Adds resources to bases.<kind>; resources build buildings (combat indirectly).",
  "combatRelevant": false,
  "powerClass": "convenience/production",
  "statOrPowerFieldsChanged": ["bases.fuel|steel|munitions|alloy", "depot_purchases.amount"],
  "powerScoreFormula": null,
  "cumulativePowerAtMax": null,
  "capsAndLimits": "Per game day (gameDayStart) per resource. Max currency per day: Depot 1 -> 200+200+200+200 = 800; Depot 10 (x1.5) -> 300 each = 1200. Cap holds regardless of Token/Credit mix (0023:16-17).",
  "serverGrantPath": "worker/buildings.ts buyResource() -> POST /api/depot/resources (worker/index.ts:2801-2815); ledger kind 'resources'",
  "clientScreenPath": "src/live/ResourcePanels.tsx:100-150",
  "notes": "Rates are literals outside shared/economy.ts. Client sends no split (api.ts:482-486)."
}
```

### 3.6 Trade Post — Package Component Selector

```json
{
  "id": "trade-post-package-component-selector",
  "displayName": "Trade Post: Package Component Selector (weekly)",
  "category": "other",
  "currentLevelMin": 1,
  "currentLevelMax": 10,
  "levelCount": 9,
  "playerVisible": true,
  "upgradeCurrency": ["credits", "tokens"],
  "tokenCostRule": "quote.tokens = packageStepCost(current) (shared/tradePost.ts:136-137); route 'tokens' pays the whole quote in Tokens (splitFor, :160-162)",
  "creditCostRule": "quote.credits = packageStepCost(current); route 'credits' pays it all in Credits",
  "equalValueCheck": true,
  "costSourceFile": "shared/tradePost.ts:132-138 -> shared/economy.ts:93-95 -> rankStepCost economy.ts:69-73",
  "costFormulaOrTable": "cost of step current->current+1 = round(25 * 1.8^floor(current/5)) : 25 for current 1-4, 45 for 5-9 (Season 1); manifest holds NO price (tradePost.ts:49-60; test tradePost.test.ts:135)",
  "costAtLevels": {"1": null, "10": 45, "20": 81, "30": 146, "40": 262, "50": 472},
  "cumulativeCostToMax": null,
  "timeCostRule": "instant",
  "prerequisiteRule": "player holds the asset; target <= packageCeiling(asset.level); purchasedThisWindow < offer.limit (2); route balance covers the quote (shared/tradePost.ts:182-215)",
  "effectDescription": "Identical to POST /api/assets/package for one step: calls packageUp with the same arguments (worker/tradePost.ts:199-200).",
  "combatRelevant": true,
  "powerClass": "combat",
  "statOrPowerFieldsChanged": ["player_assets.pkg_<key>", "player_assets.pkg_credits", "trade_purchases"],
  "powerScoreFormula": "same as direct package fit (out of scope here)",
  "cumulativePowerAtMax": null,
  "capsAndLimits": "limit 2 per player per weekly window (shared/tradePost.ts:57); weekly window key w:<gameWeekIndex> (Monday 00:00 RST); monthly shelf empty (offersOn('monthly') = []); see §5",
  "serverGrantPath": "worker/tradePost.ts buyFromTradePost() -> POST /api/trade-post/buy (worker/index.ts:2836-2857); read GET /api/trade-post (2833-2835)",
  "clientScreenPath": "src/live/TradePost.tsx (Command Center tab); Review component :201-374",
  "notes": "costAtLevels here means the step INTO level N (from N-1) computed by rankStepCost(N-1); N=1 is null (no step into rank 1). Season 1 cap is rank 10 so only 25/45 are reachable. The Trade Post is a storefront with a limit, not a discount: same number as the direct screen, both routes. Unlike every other purchase, the client sends a single-currency route rather than a split."
}
```

### 3.7 Cosmetics (banner / emblem / lights / decal)

```json
{
  "id": "cosmetics-accessories",
  "displayName": "Base cosmetics (banner, emblem, perimeter lights, ground marking)",
  "category": "cosmetic",
  "currentLevelMin": 0,
  "currentLevelMax": 0,
  "levelCount": 0,
  "playerVisible": true,
  "upgradeCurrency": [],
  "tokenCostRule": "none defined — `price` is documented as 'Price in credits' (shared/cosmetics.ts:82-87); no Token price, no purchase route",
  "creditCostRule": "CosmeticItem.price literal per item; 'nothing sells them yet' (cosmetics.ts:86)",
  "equalValueCheck": false,
  "costSourceFile": "shared/cosmetics.ts:150-185",
  "costFormulaOrTable": "Free (price 0): banner_none/olive/sand/slate, emblem_none/star/wolf/skull, lights_amber/white/red, decal_none/pad/chevrons/grid. Paid: banner_ember 900, banner_chevron 1200, banner_crimson 1200, emblem_phoenix 1000, emblem_crown 1400, emblem_trident 1000, lights_azure 800, lights_violet 900, lights_viridian 800, decal_scorch 700, decal_stripes 1100, decal_compass 1300. Paid total 12,300.",
  "costAtLevels": {"1": null, "10": null, "20": null, "30": null, "40": null, "50": null},
  "cumulativeCostToMax": null,
  "timeCostRule": null,
  "prerequisiteRule": "equip requires ownership: price === 0 OR a player_cosmetics row (worker/cosmetics.ts:29-41, 57-78; worker/index.ts:1496-1506)",
  "effectDescription": "Visual only. 'Nothing here touches power. A banner does not make a base harder to take.' (shared/cosmetics.ts:17). Customize copy: 'None of this changes what your base can do.' (src/i18n/en/customize.ts:10)",
  "combatRelevant": false,
  "powerClass": "cosmetic-only",
  "statOrPowerFieldsChanged": ["bases.banner", "bases.emblem", "bases.lights", "bases.decal"],
  "powerScoreFormula": null,
  "cumulativePowerAtMax": null,
  "capsAndLimits": "Exclusive one-of-ones enforced by partial unique index idx_player_cosmetics_exclusive (migrations/0006_exclusive.sql:17-18); none flagged exclusive in the catalogue today.",
  "serverGrantPath": "NO purchase route. grantItem() (worker/cosmetics.ts:100-124) exists for 'purchase'|'grant'|'reward' but has zero callers. Equip only: POST /api/cosmetics/equip (worker/index.ts:2924 -> handleEquip 1492-1538); catalogue GET /api/cosmetics (2922 -> handleCosmetics 1458-1484).",
  "clientScreenPath": "src/live/Customize.tsx (ItemTile shows caption=String(item.price) :121; locked = !owned.has(item.id) :363)",
  "notes": "Do cosmetics grant power today? No. Grep of worker/power.ts, shared/combat.ts, shared/battles.ts, worker/battles.ts, worker/march.ts, shared/base.ts, shared/buildings.ts for banner|emblem|decal|lights|skin|portrait|cosmetic returns nothing that reads a cosmetic. The catalogue has no stat fields at all (CosmeticItem = id, slot, name, blurb, price, config, exclusive?; cosmetics.ts:77-95). docs/GAME-MATH-v1.md:165-177 specifies cosmetic modifiers (+5% Firepower etc.) that are NOT implemented. Whether the price is a Token or Credit price cannot be derived; 1:1 cannot be verified because there is no purchase."
}
```

### 3.8 Base skins

```json
{
  "id": "base-skins",
  "displayName": "Base skins (9)",
  "category": "cosmetic",
  "currentLevelMin": 0,
  "currentLevelMax": 0,
  "levelCount": 0,
  "playerVisible": true,
  "upgradeCurrency": [],
  "tokenCostRule": "none — SkinIdentity has no price field (shared/skins.ts:40-53)",
  "creditCostRule": "none",
  "equalValueCheck": false,
  "costSourceFile": "shared/skins.ts:55-121 (no cost)",
  "costFormulaOrTable": "starter: circular_shield_bunker, desert_command_citadel, field_workshop, medieval_fortress, rose_command_citadel; non-starter: ember_sentinel, ravenkeep, shellwarden; exclusive one-of-one: signature_one ('Shadow Empress')",
  "costAtLevels": {"1": null, "10": null, "20": null, "30": null, "40": null, "50": null},
  "cumulativeCostToMax": null,
  "timeCostRule": null,
  "prerequisiteRule": "ALL_SKINS_UNLOCKED = true (worker/game.ts:233) bypasses skin ownership: every skin selectable by everyone (worker/index.ts:1470-1472, 1518-1524)",
  "effectDescription": "Visual only (palette + client-only drawing in src/live/skins.ts).",
  "combatRelevant": false,
  "powerClass": "cosmetic-only",
  "statOrPowerFieldsChanged": ["bases.skin"],
  "powerScoreFormula": null,
  "cumulativePowerAtMax": null,
  "capsAndLimits": "Exclusive flag enforced by the same partial unique index when granted via grantItem (never called). With ALL_SKINS_UNLOCKED the exclusive skin is equippable by anyone (equip does not check exclusivity, only ownership, and ownership is bypassed).",
  "serverGrantPath": "none (equip only via POST /api/cosmetics/equip)",
  "clientScreenPath": "src/live/Customize.tsx SkinTile :128-160, :330-345",
  "notes": "Portraits (shared/portraits.ts, worker/profile.ts, POST /api/profile/portrait index.ts:2920) have no price, no currency and no power fields (grep price|credit|token|buy returns nothing)."
}
```

### 3.9 Weekly test Token top-up (income)

```json
{
  "id": "test-token-top-up",
  "displayName": "Weekly test Token top-up",
  "category": "other",
  "currentLevelMin": 0,
  "currentLevelMax": 0,
  "levelCount": 0,
  "playerVisible": false,
  "upgradeCurrency": ["tokens"],
  "tokenCostRule": "INCOME: tokens := max(tokens, 100_000) once per game week",
  "creditCostRule": "n/a (never touches credits)",
  "equalValueCheck": false,
  "costSourceFile": "shared/economy.ts:49-50; worker/upgrades.ts:80-136",
  "costFormulaOrTable": "if (!TEST_GRANTS_ON || grantedWeek >= week || tokens >= TEST_TOKEN_FLOOR) -> no grant (mark week); else tokens = TEST_TOKEN_FLOOR, ledger 'grant' tokens = TEST_TOKEN_FLOOR - previous",
  "costAtLevels": {"1": null, "10": null, "20": null, "30": null, "40": null, "50": null},
  "cumulativeCostToMax": null,
  "timeCostRule": "settle-on-read, no cron; applied on any wallet read (GET /api/base is the guaranteed one, index.ts:2685-2686)",
  "prerequisiteRule": "TEST_GRANTS_ON === true",
  "effectDescription": "Every active tester holds up to 100,000 Tokens per week of spend.",
  "combatRelevant": false,
  "powerClass": "consumable",
  "statOrPowerFieldsChanged": ["players.tokens", "players.granted_week", "wallet_ledger"],
  "powerScoreFormula": null,
  "cumulativePowerAtMax": null,
  "capsAndLimits": "Max inflow 100,000 Tokens per game week per player (equal to prior-week spend). Race-safe via granted_week < ?2 guard (upgrades.ts:113-116). Not visible as a grant in any UI (ledger unread).",
  "serverGrantPath": "worker/upgrades.ts settleWallet()",
  "clientScreenPath": "none (balance shows on src/live/WalletLine.tsx)",
  "notes": "The 100000 literal is duplicated in migrations/0024_season_1_reset.sql:47. docs/progression/README.md:101-106 records the 10,000 vs 100,000 weekly question as OPEN; code has 100,000 as a free floor rather than a purchase cap."
}
```

### 3.10 Package strip refund (Credit inflow — for completeness)

```json
{
  "id": "package-strip-refund",
  "displayName": "Strip packages -> refund in Command Credits",
  "category": "other",
  "currentLevelMin": 0,
  "currentLevelMax": 0,
  "levelCount": 0,
  "playerVisible": true,
  "upgradeCurrency": ["credits"],
  "tokenCostRule": "n/a",
  "creditCostRule": "INFLOW: credits += pkg_credits, where pkg_credits = sum over fits of (split.credits + split.tokens)",
  "equalValueCheck": true,
  "costSourceFile": "worker/upgrades.ts:368-383 (accrual), :425-457 (refund)",
  "costFormulaOrTable": "refund = asset.pkg_credits; packages reset to 1; pkg_credits = 0; ledger kind 'reset'",
  "costAtLevels": {"1": null, "10": null, "20": null, "30": null, "40": null, "50": null},
  "cumulativeCostToMax": null,
  "timeCostRule": "instant",
  "prerequisiteRule": "some package > 1 (upgrades.ts:416-420)",
  "effectDescription": "The only code path that increases players.credits. Converts Token-paid package spend into Credits 1:1.",
  "combatRelevant": false,
  "powerClass": "consumable",
  "statOrPowerFieldsChanged": ["players.credits", "player_assets.pkg_*", "player_assets.pkg_credits"],
  "powerScoreFormula": null,
  "cumulativePowerAtMax": null,
  "capsAndLimits": "Unlimited; no cooldown; no haircut. Trade Post package purchases are refundable the same way (same packageUp).",
  "serverGrantPath": "worker/upgrades.ts resetPackages() -> POST /api/assets/reset (worker/index.ts:2859)",
  "clientScreenPath": "src/live/AssetUpgrade.tsx:577-582 ('Strip packages · refunds N Credits')",
  "notes": "Contradicts docs/progression/README.md:63-65 and the pkg_credits column comment in migrations/0020:97-100. Documented as a deliberate owner call at upgrades.ts:372-381 with the exchange-rate side effect noted there."
}
```

---

## 4. 1:1 check, hardcoded prices, duplicated rules

| Item | 1:1? | Where the price lives | Note |
|---|---|---|---|
| Shields 250/600/1500 | yes (single `price`, `splitIsValid` sum check `season1.ts:274`) | `shared/shields.ts:19-21` | outside economy.ts |
| Delta 2500 | yes (`season1.ts:344-345`) | `shared/season.ts:78` | outside economy.ts |
| Second Team 1500 | yes (`buildings.ts:397-400`) | `shared/buildings.ts:300` | outside economy.ts; plus 12k steel + 12k alloy |
| Depot 100/80/70/60 per unit | yes (`buildings.ts:342-343`) | `shared/buildings.ts:183-188` | outside economy.ts |
| Trade Post | yes by construction (`tradePost.ts:137` `{tokens: cost, credits: cost}`; test `tradePost.test.ts:39-48`) | resolves to `economy.ts` | no price in manifest |
| Cosmetics 700–1400 | cannot verify (no Token price, no purchase path) | `shared/cosmetics.ts:156-184` | "Price in credits" per comment |
| Skins / portraits | n/a (no price) | — | — |
| Test top-up 100,000 | n/a | `shared/economy.ts:50` and duplicated literal `migrations/0024:47` | duplicated |

Duplicated rules: (a) shield cooldown wording in `shared/shields.ts:6-7` and `src/live/ShieldPanel.tsx:95` vs the single enforcement point at `worker/march.ts:369-377`; (b) the `wallet_ledger.kind` enumeration in the migration comment (`0020:61`) vs the eight kinds actually written; (c) `pkg_credits` semantic in `0020:97-100` vs `upgrades.ts:372-383`.

---

## 5. Trade Post: windows, limits, idempotency, audit behaviour

**Windows** (`shared/tradePost.ts:88-105`):
- weekly key `w:${gameWeekIndex(now)}`; `gameWeekIndex = floor((floor((instant + GAME_OFFSET_MS)/DAY) + 3) / 7)` (`shared/gametime.ts:133-136`) → weeks start Monday 00:00 RST (UTC-7); reset instant `gameWeekStart(index+1)` (`gametime.ts:139-141`).
- monthly key `m:YYYY-MM` from `new Date(now + GAME_OFFSET_MS)` UTC fields; reset = 1st 00:00 RST (`tradePost.ts:97-99`).
- Pinned by tests `tools/tests/tradePost.test.ts:109-119`.

**Per-player limits**: manifest `limit: 2` on `package-component-selector` (`shared/tradePost.ts:57`); counted as `COUNT(*) FROM trade_purchases WHERE player_id AND offer_id AND window_key` (`worker/tradePost.ts:53-57`). Checked twice: in `decidePurchase` (`shared/tradePost.ts:203-206`) and again inside the INSERT's `WHERE (SELECT COUNT(*) …) < ?10` (`worker/tradePost.ts:187-197`) so two racing requests for the last slot are serialised by the DB. The limit is per offer per player per window, not per asset or per package.

**Idempotency**: PK `trade_purchases.id` = client-generated 32-hex purchase id created when the review opens (`src/live/TradePost.tsx:24-30, 214`; regex `^[A-Za-z0-9_-]{16,64}$` `worker/tradePost.ts:148`). A repeat id → `standing()` returns current wallet/asset/remaining with `duplicate: true` and grants nothing (`tradePost.ts:161-169, 209-231`); an id owned by another player → 400 (`167`). Order: row inserted FIRST, then `packageUp`; a refused grant deletes the row (`201-204`).

**Audit trail**: `trade_purchases` records offer, window key, asset, package, route, `cost = quote.credits`, timestamp (`189-193`). The wallet movement lands in `wallet_ledger` as `kind='package'`, subject asset id, detail "`<Package> a to b`" (`upgrades.ts:385-394`) — **indistinguishable from a direct upgrade in the ledger**; correlation is only by timestamp. Neither table is read by any admin or player screen.

**Edge cases observed (not exploitable for value, but worth noting)**:
- If `packageUp` throws (D1 error) rather than returning `ok:false`, the row remains: slot consumed with no grant, and a retry with the same id reports `duplicate: true` ("already gone through", `TradePost.tsx:274`) although nothing was fitted.
- `standing()` counts `remaining` against the *current* window, so a duplicate replay after Monday reports the new window's remaining.
- The `route` is single-currency (`splitFor`, `tradePost.ts:160-162`); the direct upgrade screen allows a mixed split. Same total either way.

---

## 6. Season 1 spend ceiling in scope (code-derived)

Season 1 = 10 weeks (`shared/season.ts:14`). Reachable in-scope spends for one player:

| Item | Max Season 1 spend | Derivation |
|---|---|---|
| Delta | 2,500 | once, CC ≥ 10 |
| Second Engineer Team | 1,500 (+12k steel, +12k alloy) | once, Engineer Yard 10 |
| Depot resources | ≤ 800/day at Depot 1 … ≤ 1,200/day at Depot 10; 70 days → 56,000–84,000 | `DAILY_RESOURCE_CAP / RESOURCE_PER_UNIT` = 200 units per resource × 4 × `depotCapMultiplier` |
| Paid shields | no cap; continuous 72h cover ≈ 70/3 × 1,500 ≈ 35,000; continuous 8h cover = 3 × 250 × 70 = 52,500 | one at a time, no post-expiry cooldown (§0.5) |
| Trade Post | 2 package steps/week × 10 weeks = 20 steps × (25 or 45) ≤ 900 | limit 2, Season 1 step costs |
| Cosmetics | 0 (unpurchasable) | — |

Against this, inflow = up to 100,000 Tokens/week (top-up) and 0 Credits.

---

## 7. Can average Credit income per source and per active 15-minute session be computed from code today?

**No.**

What exists: the answer per source is trivially **0 Credits** for every source (§2) — there is no statement that adds Credits except the strip refund, which returns the player's own spend. So "average income per source" = 0 and "per 15-minute session" = 0, which is a degenerate computation, not a model.

What is missing to compute a non-zero figure:
1. **Any Credit-granting code path.** No daily task, objective, event, raid bonus, battle bonus, alliance contribution, login grant or first-win grant writes `players.credits`. The `'reward'` source for cosmetics and the `player_materials` table (`0020:118-131`, "nothing produces them yet") are placeholders.
2. **Amount rules.** None exist in `shared/` — `shared/economy.ts` defines only sinks (rank/package curves, split validation) and the Token floor.
3. **A session model.** The only activity timestamp is `players.last_seen_at` (`migrations/0001_init.sql:14`); there is no session-length, login-count or action-rate record, so "an active 15-minute daily session" has no code correlate. `docs/GAME-MATH-v1.md:271` specifies `expectedFreeActiveMinutes` etc. as things a balance tool "must store"; nothing stores them.
4. **Token income is computable only as a bound**, not an average: per player per game week, inflow = `max(0, 100_000 − tokens_at_first_read_of_week)`, i.e. equal to the previous week's net spend, capped at 100,000. The average depends on spend behaviour, which is not modelled.

The only Credit-related arithmetic that *can* be run from code is the sink side (already covered by the rank/package audits) — e.g. `fullDraftCost(10)` = 24 × (rankCost(1,10) + 4 × packageCost(1,10)) = 24 × (325 + 4 × 325) = 24 × 1,625 = **39,000** (`shared/economy.ts:108-115`). There is nothing in code to set against it.

---

## 8. Economy assumptions in `scripts/simulate.mjs` and `docs/progression/*.md` that code does not implement

`scripts/simulate.mjs` is a **combat** harness only (header `:1-33`); it imports `assets`, `combat`, `base`, `buildings`, `upgrades`, `drones` (`:57-62`) and never `economy`, `shields`, `tradePost`, `season` or `cosmetics`. It asserts building cost tables against BUILDING-RESOURCES v1 (`:836-872`) and encodes **no currency, income, shield or store assumption**. Nothing to reconcile in scope.

Docs assumptions with no code counterpart:

| Doc | Assumption | Code |
|---|---|---|
| `docs/progression/04-TWO-CURRENCY-MODEL.md:75-91` | Credit earn schedule: Rogue Patrols 240/day, Salvage Runs 120, First victory 60, Convoy Contracts 180, Power Nodes 120 (wk2), Alliance Ops 190 (wk3), Factory yield 250 (wk5), War-window 240 (wk6); 1,400/day at full unlock; casual ≈45% | none of these sources exist |
| `06-SEASON-COMBAT-CAP.md:79-87, :30` | 420 → 1,400/day by week; 77,000 CC per 70-day season; below-cap earn multiplier | none |
| `08-TEN-SEASON-PROGRESSION.md:14-21, 93-104` | committed earner 1,400/day; earn growth ~1.4×/season; 10,000 vs 100,000 weekly Token *purchase* cap | code has a free 100,000 weekly *floor*, no purchase cap, no purchase |
| `03-WALLET-HANDOFF.md`, `04:105-166` | wallet handoff, `token_reservations`, provider webhooks, rolling 7-day 10,000 cap | none; `WWR_TOKEN_STORE_URL` is a link only |
| `progression/README.md:63-65` | "Tokens never convert to Command Credits" | contradicted by strip refund (§0.3) |
| `docs/GAME-MATH-v1.md:320-350` | weekly income table 1,300 → 4,450 CC/week active (28,750 per season), casual 45%; module income | none; `player_materials` empty |
| `GAME-MATH-v1.md:165-177` | cosmetic modifiers: category Base Skin +5% Firepower/+5% Armour/+2% Mobility equipped, half when owned; Nameplate +2% FP; Base Effect +3% Armour; Task Force Effect +3% Detection/Mobility | cosmetics have no stat fields; nothing reads them |
| `GAME-MATH-v1.md:108` | Combat System cost `ceil(200 × 1.17^(L−1))` CC/Tokens + modules | no Combat Systems |
| `GAME-MATH-v1.md:156` | Depot daily crates `1 + floor(L/10)`, earned modules ×(1+0.003L) | Depot only sells resources under a cap |
| `GAME-MATH-v1.md:259-271` | time-for-money parity, `expectedFreeActiveMinutes`, route disclosure | none |
| `01-IMPLEMENTATION-PLAN.md:194`, `02-REVISED-PLAN.md:73` | 12 level-ups/day throughput cap | no daily upgrade cap in code (README:66-67 "No daily upgrade limit" — consistent with code) |

---

## 9. notBuiltYet (in scope)

- Cosmetic purchase / grant / reward: `grantItem` unused (`worker/cosmetics.ts:100`); `player_cosmetics.source` values `'purchase'|'reward'` never written.
- Cosmetic stat modifiers (GAME-MATH v1 §cosmetic modifiers).
- Token store / checkout / webhook (`WWR_TOKEN_STORE_URL` link only; `docs/progression/03`, `04`).
- Monthly Trade Post shelf offers (`offersOn('monthly') = []`, `shared/tradePost.ts:44-47`; CLAUDE.md "empty on purpose").
- Any Trade Post `OfferKind` other than `'package-step'` (`shared/tradePost.ts:24`; other kinds refused at `worker/tradePost.ts:159`).
- Daily objectives / event rewards (`src/i18n/en/base.ts:55` placeholder).
- Materials / modules (`player_materials`, `0020:118-131`).
- Shield post-expiry cooldown (documented, not enforced).

## 10. powerDiscrepancies (in scope)

None of the in-scope items feed a power computation: shields gate targeting (`worker/march.ts:258, 561`) but do not alter power; Delta changes slot count not per-asset power; cosmetics/skins/portraits are not read by `worker/power.ts`, `shared/combat.ts` or `shared/battles.ts`. Trade Post fits change `pkg_*` exactly as the direct route does.

## 11. hardcodedPrices (literal prices outside `shared/economy.ts`)

- `shared/shields.ts:19-21` — 250, 600, 1500
- `shared/season.ts:78` — `DELTA_PRICE = 2500`
- `shared/buildings.ts:300` — `SECOND_TEAM.currency: 1500` (and resources `:299`)
- `shared/buildings.ts:183-188` — `RESOURCE_PER_UNIT` 100/80/70/60; `:191-196` daily caps
- `shared/cosmetics.ts:156-158, 165-167, 173-175, 182-184` — 900, 1200, 1200, 1000, 1400, 1000, 800, 900, 800, 700, 1100, 1300
- `migrations/0024_season_1_reset.sql:47` — `tokens = 100000` (duplicate of `TEST_TOKEN_FLOOR`)

## 12. missingInformation

- Credit income: no source, amount, cadence or cap exists in code (§7).
- Session/activity model: only `last_seen_at`.
- Cosmetic currency: "credits" per comment, no Token price, no purchase.
- Whether the Token floor (100,000) or a purchase cap (10,000) is the intended launch rule — open per `docs/progression/README.md:101-106`.
- Shield cooldown intent after natural expiry.
- Whether Token→Credit conversion via strip is intended to survive (owner call recorded in code comment; docs say otherwise).

## 13. filesToChangeLater (for a level 1–50 economy, in scope)

- `shared/economy.ts` — `TEST_GRANTS_ON`, `TEST_TOKEN_FLOOR`; any future Credit income schedule belongs here (`rankStepCost` growth already spans 1–50).
- `worker/upgrades.ts` — `settleWallet` (grant rule), `packageUp` `pkg_credits` accrual (`:368-383`), `resetPackages` refund (`:425-457`) if the Token→Credit conversion is to change.
- `shared/shields.ts` — `SHIELD_OPTIONS` prices/durations, `SHIELD_COOLDOWN_MS`; `worker/season1.ts applyShield` and `worker/march.ts:369-377` if cooldown-on-expiry is to exist.
- `shared/season.ts` — `DELTA_PRICE`, `DELTA_BUY_LEVEL`, `DELTA_FREE_RANK`, `TASK_FORCE_UNLOCK`; `worker/season1.ts buyDelta`, `worker/squads.ts deltaOpen`.
- `shared/buildings.ts` — `SECOND_TEAM`, `RESOURCE_PER_UNIT`, `DAILY_RESOURCE_CAP`, `depotCapMultiplier` (`ramp` clamps at 10, `:378-383`); `worker/buildings.ts buyResource / buySecondTeam`.
- `shared/tradePost.ts` — `TRADE_POST_OFFERS` limits, `OfferKind`; `worker/tradePost.ts buyFromTradePost` for new kinds.
- `shared/cosmetics.ts` — prices and a currency designation; `worker/cosmetics.ts grantItem` needs a route; `worker/game.ts ALL_SKINS_UNLOCKED`.
- `migrations/` — new income tables (tasks/objectives), a ledger-reading admin view; correct the `wallet_ledger.kind` and `pkg_credits` comments in `0020`.
- `src/live/ShieldPanel.tsx:95`, `src/live/AssetUpgrade.tsx:311`, `src/live/ResourcePanels.tsx:65` — copy that promises rules/income the server does not have.
