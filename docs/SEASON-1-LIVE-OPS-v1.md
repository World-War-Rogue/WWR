# Claude implementation prompt — Season 1 live operations

You are implementing the Season 1 live-operations system for WORLD WAR ROGUE. Work inside the existing repository and architecture. Inspect the current server, data model, combat resolver, authentication, alliance system, wallet/resource ledger, map rendering, and test conventions before making changes. Preserve unrelated work and do not replace any existing server-authoritative calculation with client logic.

This document is the current product decision. It supersedes earlier speculative Arena behavior. The supporting product design is in:

```text
C:\Users\mattr\Documents\Codex\2026-09-06\files-pasted-by-the-user-you\outputs\season-1-live-operations-v1.md
C:\Users\mattr\Documents\Codex\2026-09-06\files-pasted-by-the-user-you\outputs\game-math-spec-v1.md
C:\Users\mattr\Documents\Codex\2026-09-06\files-pasted-by-the-user-you\outputs\claude-master-world-war-rogue-redesign-handoff-v1.md
```

Implement in small, reviewable migrations and commits. Put all adjustable values in server configuration. Do not hard-code product values in the browser.

## Product rules that are not optional

- Season 1 is **Mech Uprising — Iron Dominion**, lasts 10 weeks, and has a maximum Command Center/base/upgrade level of 10.
- Rogue Standard Time is permanently UTC-7. The server provides every daily reset, Sunday weekly reset, countdown, and settlement timestamp. Never derive event time from device time.
- Alliances support up to **100 players**.
- Alliance event/reward eligibility requires 48 continuous hours in the alliance at the relevant server check. Use the same authoritative membership clock as the Trading Post; joining/leaving resets the timer.
- The server owns map spawns, action validation, combat snapshots, score calculations, leaderboards, reward settlement, wallet changes, and anti-abuse checks. The client only requests actions and renders server results.
- Token spending may accelerate progress and provide the configured cosmetic/specialty advantages already approved for the game, but every combat-affecting item or stat must also have an earned route. The earned route is intentionally noticeably slower; Tokens must not bypass the Season 1 Level 10/Base Level cap or server-owned absolute timers.
- A premium player must feel powerful and rewarded personally. A single player must not be able to win the alliance event alone: alliance score uses individual daily caps and coordinated multi-member objectives.
- No event reward may be granted more than once. Every currency/resource change requires an idempotent ledger entry with source, amount, season/week/day, reason, and server timestamp.

## Deliverable

Install a working Season 1 event system with:

1. Daily individual map exercises and Daily Operations resource rewards.
2. Small, repeatable alliance operations with rewards.
3. A weekly alliance Warfront with separate Assault, Operations, and Support metrics.
4. A two-phase weekly Arena:
   - Weeks 1–4: three daily attempts against a generated Dominion benchmark squad, immediate daily leaderboard, normal Sunday weekly Arena reward settlement.
   - Weeks 5–10: three daily head-to-head attempts against server-generated player opponent lists, rating/power-aware point movement, immediate daily leaderboard, normal Sunday weekly settlement.
5. Individual rewards, alliance member rewards, and alliance treasury rewards.
6. Command Center, map, Arena, alliance, leaderboard, mailbox, and battle-report UI surfaces needed to use and explain the system.

## Season data model and configuration

Create migrations/models/services equivalent to the project’s naming patterns. The following entities are required; reuse existing equivalents when present rather than duplicating them.

```text
season
season_week
season_featured_chapter
daily_operation_assignment
daily_operation_progress
map_exercise_node
map_exercise_attempt
alliance_operation_instance
alliance_operation_participant
alliance_event_contribution
alliance_event_weekly_score
arena_period
arena_benchmark_profile
arena_squad_snapshot
arena_attempt
arena_match
arena_rating
arena_candidate_list
arena_leaderboard_snapshot
event_reward_grant
resource_ledger
```

All records that can settle combat, points, or rewards need immutable server timestamps and a version/season/week identifier. Use unique database constraints or transactional idempotency keys for claims, ticket consumption, match settlement, reward grant, and weekly reset jobs.

Create server configuration for, at minimum:

```json
{
  "seasonId": "season_01_mech_uprising",
  "weeks": 10,
  "levelCap": 10,
  "timezone": "UTC-7",
  "alliance": {
    "maxMembers": 100,
    "rewardEligibilityHours": 48
  },
  "dailyOperations": {
    "laneCount": 6,
    "lanesRequiredForCache": 4,
    "weekMultiplier": { "base": 1.0, "perWeek": 0.06 }
  },
  "warfront": {
    "perPlayerDailyCap": 1000,
    "assaultDailyCap": 450,
    "operationsDailyCap": 350,
    "supportDailyCap": 300,
    "activeMemberThreshold": 500,
    "activeMemberBonus": 350,
    "activeMemberBonusCap": 60,
    "coordinatedOperationScore": 500,
    "coordinatedOperationWeeklyCap": 10
  },
  "arena": {
    "attemptsPerDay": 3,
    "weeksOneToFourMode": "benchmark",
    "weeksFiveToTenMode": "head_to_head",
    "ratingStart": 1000,
    "ratingK": 32,
    "ratingScale": 400,
    "powerWeight": 250,
    "ratingDeltaMin": 4,
    "ratingDeltaMax": 32,
    "maxPairMatchesPer24Hours": 2,
    "maxDefensesPerDay": 5,
    "dailyFieldCacheMatchesRequired": 1,
    "fullEngagementMatchesRequired": 3
  }
}
```

The exact reward tables from `season-1-live-operations-v1.md` must be editable server config. Add an admin/dev configuration path or seed file following existing project conventions; do not create an unrestricted player-visible admin control.

## Command Center and map entry points

Add an **Events** section in the Command Center with these cards:

- `Daily Operations` — completed lanes, 4-of-6 cache progress, reset countdown, and claim state.
- `Iron Dominion Arena` — current phase, attempts remaining, current daily and weekly rank, live leaderboard access, next reset/settlement state.
- `Dominion Warfront` — individual Assault/Operations/Support contribution, alliance rank, active-contributor count, coordinated-operation progress, and reward eligibility countdown/state.
- `Season Map` — current chapter, map exercise locations, featured weekly objective, and major-server progress when applicable.

On the map, show clear, small-screen-readable icons and sheets for daily targets. Spawn only valid reachable targets for the player’s account state; never offer a target requiring Naval, an unavailable building, a non-owned category, or a task force the player cannot field.

### Daily map exercises

Implement these first five exercise types. A player receives three suitable locations each daily reset and may complete any one or two toward their Daily Operations progress. Exercises are personal or protected shared instances: another player cannot steal a new player’s small daily reward.

| ID | Map target | Task Force action | Core reward | Warfront metric |
|---|---|---|---|---|
| `signal_relay` | Dominion Signal Relay | Scout, hold, upload route data | CC + Intel | Operations |
| `abandoned_convoy` | Abandoned Convoy | Search and extract supplies | Fuel + Steel + Alloy | Operations |
| `fuel_silo` | Fuel Silo | Secure and siphon fuel cache | Fuel + small CC | Operations |
| `factory_probe` | Factory Probe | Short event battle, then withdraw with data | Munitions + Intel | Assault |
| `disabled_mech_patrol` | Disabled Mech Patrol | Defeat a small NPC patrol | Munitions + repair/alloy material | Assault |

Use existing march/action/combat patterns. If no live map action system is ready, implement the same server state machine through a temporary activity sheet rather than faking client completion: `available -> marching -> resolving -> settled/claimed`. All timing is server absolute time.

### Daily Operations

Create six account-safe lanes: Command, Industry, Mobilization, Engagement, Readiness, Cooperation. Each lane must select an alternative appropriate to the account. A player completes any four to unlock the Daily Operations Cache; they may finish all six for progress and Warfront contribution but claim the Cache once per day.

Use the following Week 1 baseline reward config and apply the configured week multiplier. Keep the wallet/resource types aligned with the existing resource model.

```json
{
  "laneRewards": {
    "command": { "commandCredits": 30, "intel": 1 },
    "industry": { "fuel": 120, "steel": 100 },
    "mobilization": { "fuel": 90, "munitions": 60 },
    "engagement": { "steel": 90, "alloy": 60 },
    "readiness": { "commandCredits": 40, "moduleFragments": 1 },
    "cooperation": { "commandCredits": 30, "munitions": 60 }
  },
  "fourOfSixCache": { "commandCredits": 140, "fuel": 240, "steel": 220, "munitions": 150, "alloy": 130, "moduleFragments": 2 }
}
```

The Cooperation lane uses alliance donation, reinforcement, or alliance operation when eligible. For a solo/non-eligible player it must automatically offer a neutral-contract alternative. Engagement can use a legitimate loss or simulation where the player was not able to select a PvP battle; do not require a win. Starting and immediately cancelling an action does not count.

## Small alliance operations

Implement these three co-operative operations first. They should generally take 10–20 minutes, have small but worthwhile resource rewards, and require different members. They are not one-player score farms.

| ID | Operation | Minimum distinct eligible members | Required roles | Rewards |
|---|---|---:|---|---|
| `convoy_escort` | Escort a supply convoy through a contested route | 2 | Scout/recon + escort/combat | Personal supply cache; small alliance Fuel/Steel treasury grant; Support score |
| `relay_triangulation` | Scan three Dominion relays | 3 | Three different relay scans | Intel, module fragments, Operations score |
| `factory_sabotage` | Breach, identify weakness, secure withdrawal | 3 | Breach/assault + recon + support | Munitions/Alloy cache, Assault score, small treasury grant |

Do not require named asset categories if the player has a valid equivalent role. If a player has only a starter force, their valid role is determined by the server’s role tags, not UI wording. A participant can receive each small operation’s individual reward once per configured daily/weekly limit. Apply the 48-hour membership rule to alliance event score and final rewards; show a countdown for ineligible members.

## Warfront: alliance event metrics and rewards

Track three distinct metrics for every eligible member each day:

```text
Assault Score: featured battles, Factory Probes, Mech Patrols, sabotage combat
Operations Score: Daily Operations, signal relays, convoys, featured contracts
Support Score: reinforcement, escort, supply, alliance-operation support roles
```

Apply the configured metric caps and then the total daily cap:

```text
dailyMemberWarfrontScore = min(
  perPlayerDailyCap,
  min(assaultEarned, assaultDailyCap)
  + min(operationsEarned, operationsDailyCap)
  + min(supportEarned, supportDailyCap)
)
```

The individual’s weekly contribution is the sum of these capped daily values. Raw enemy damage may be recorded for personal honors, but must not bypass the Warfront cap. This is essential: one premium player can be individually exceptional but cannot supply unlimited alliance placement score.

Calculate the alliance’s final weekly event score as:

```text
allianceWarfrontScore =
  sum(eligibleMemberWeeklyWarfrontScore)
  + activeEligibleMemberCount × activeMemberBonus
  + min(coordinatedOperationCompletions, coordinatedOperationWeeklyCap) × coordinatedOperationScore
```

`activeEligibleMemberCount` means members with at least `activeMemberThreshold` valid event score that week, capped at `activeMemberBonusCap`. Do not count logins or empty membership slots.

Maintain and display a separate **Dominion Impact** individual metric. It may use high capped daily damage/impact credit plus elite target completions and must award personal honors, badges, cosmetics/fragments, and resource rewards. It does **not** directly feed the raw Warfront score beyond normal capped Assault actions. This is the premium-player honor path: powerful players see their personal impact clearly, while a coordinated active alliance wins the team competition.

Use the member and treasury reward bands in `season-1-live-operations-v1.md`, with each configured explicitly. A final alliance payout needs:

- Current alliance ID verified at settlement.
- At least 48 continuous membership hours at settlement.
- Minimum personal contribution configured by reward tier.
- A transactional individual reward grant and a separate auditable Operations Treasury grant.

Do not give one leader unilateral access to a pooled reward. Reuse/implement an Operations Treasury ledger that can fund only published alliance operations and shows all deposits/spends.

## Arena phase A — Weeks 1–4: Iron Dominion Proving Ground

This phase is a daily benchmark test, not head-to-head combat. Players use their best current eligible Task Force and receive **three attempts per day**.

### Best squad selection and snapshot

At attempt creation, the server selects the player’s highest valid `CPTF` Task Force that is not marching, already locked in unresolved combat, deleted, or unavailable. The player may inspect the selected lineup; they do not manipulate a client-side power value. Snapshot every asset, final resolver stat, package/cosmetic/specialty modifier, formation, role, and server timestamp used for the battle. Existing battle snapshot rules remain authoritative.

### Generated benchmark squad

At daily reset, generate exactly one anonymous **Iron Dominion Benchmark Squad** for the server/day. It must look and behave as a game-generated Dominion opponent, not display a real player’s name, assets, cosmetics, or private inventory.

Build it from the strongest valid combat profile available in the prior settled server day:

1. Gather valid highest-CPTF Task Force snapshots from the prior day.
2. Calculate each squad’s `lethalityIndex` using the server’s final effective Firepower, Armour/mitigation, Durability, Detection, role coverage, and expected resolver damage. Keep weights server-configured and itemize them in internal diagnostics.
3. Select the highest legal profile by `lethalityIndex`; tie-break by CPTF then stable account ID.
4. Convert the profile into an anonymous Dominion NPC squad using legal Season 1 category/role templates and equivalent final combat metrics. Store the source snapshot ID privately for audit only; never expose a player identity or exact private collection.
5. If there are too few valid profiles, use the configured Season 1 bootstrap benchmark template.

The battle always uses the existing server combat resolver, a deterministic battle seed, and the attempt snapshot. No player-owned asset is damaged, moved, or consumed by an Arena attempt.

### Proving Ground score and leaderboards

Settle every attempt immediately. Award an `attemptScore` using these normalized resolver outputs, clamped to 0–1 before weighting:

```text
attemptScore = floor(
  6000 × enemyDurabilityDamagePercent
  + 2000 × enemyAssetsEliminatedPercent
  + 1500 × ownDurabilityRemainingPercent
  +  500 × roundEfficiencyPercent
  + clearBonus
)
```

`clearBonus` is server-configured; recommended start value is 2,500 if the Benchmark Squad is defeated, otherwise 0. `roundEfficiencyPercent` rewards finishing in fewer than the resolver’s configured maximum rounds. The battle report must show every scored term and source value.

For a daily leaderboard, use the player’s highest settled `attemptScore` of the three attempts that day. Update it immediately after settlement. For the weekly Arena ranking, sum the player’s seven daily best scores:

```text
weeklyBenchmarkArenaScore = sum(dailyBestAttemptScore for active week days)
```

This produces a live daily board and a live weekly board. Both must state that the final Sunday rank is provisional until server settlement.

The first settled attempt of a day grants the configured Arena Field Cache. Completing all three grants a small configured Full Engagement bonus and the configured Warfront Arena participation score once daily. Neither cache changes leaderboard score.

At every Sunday reset in Weeks 1–4, close attempts, settle pre-close attempts, freeze the ranking, apply deterministic tie-breaks, and pay the normal weekly individual Arena rewards and alliance Arena Merit rewards. Use exactly these reward rank bands: `1`, `2`, `3`, `4–10`, `11–20`, `21–50`, `51–100`, and `101+`. Use the existing configured resource/module/badge table from the Season 1 design; do not overlap rank 50.

## Arena phase B — Weeks 5–10: head-to-head ladder

Beginning immediately after Week 4 Sunday settlement, switch the Arena mode to **Head-to-Head Ladder**. Keep the same three daily attempts, daily live leaderboard, Sunday settlement, individual rewards, alliance merit, Field Cache, and Full Engagement bonus. Replace only the generated benchmark battle with player-versus-player snapshot combat.

### Ratings and weekly reset

- Start every new weekly Head-to-Head ladder at Arena Rating `1000` unless an admin-configured weekly seed is explicitly enabled. Do not carry a hidden rating from the benchmark phase.
- At Week 5 launch, every player starts at 1000.
- Arena Rating is a weekly competitive value; it resets at Sunday settlement/new-week creation after rewards are recorded.
- A player needs at least three settled H2H matches in that week for a final rank reward.

### Opponent list

Generate a server-owned opponent list whenever the player opens the Arena and refresh it after a settled match, subject to a short server-configured cache period. Start with nine candidates:

```text
3 Challenger candidates: higher combined challenge index
3 Peer candidates: near combined challenge index
3 Safer candidates: lower combined challenge index
```

Candidate selection must favor higher-ranked opponents when available; show their current rating, their snapped Arena squad’s displayed combat power, a `Challenger` / `Peer` / `Safer` label, and the estimated available point range. Do not expose private loadout detail beyond what a normal scout/Arena profile is permitted to show.

Eligible candidate rules:

- Same server, same active season/week, not self, not banned/held, and has a valid Arena Defense Squad snapshot.
- Prefer a reasonable Command Center and Combat Power band, widening only when necessary. Keep the starting values server-configured.
- Never list the same opponent more than twice in any 24-hour pair window.
- A defense squad may be challenged at most five times per day. This prevents a popular top player from becoming an unlimited passive rating target.
- If a list is short, widen the rating/power ranges and label the opponent clearly; never silently fabricate a player target.

The defender’s current valid highest-CPTF squad is snapped when it becomes eligible for the list. An attacker’s current valid highest-CPTF squad is snapped at match start. The battle has no world-map asset loss, resource raid, march, repair cost, or hidden player-control advantage.

### Required points formula

Points must reward beating a higher-ranked and/or stronger opponent, award fewer points for beating a lower-power/lower-ranked opponent, lose fewer points when defeated by a stronger opponent, and transfer more points to a weaker opponent who defeats a stronger one.

For each match snapshot, calculate:

```text
powerAdjustment = powerWeight × ln(opponentCPTF / playerCPTF)
challengeGap = (opponentArenaRating - playerArenaRating) + powerAdjustment
expectedPlayerWin = 1 / (1 + 10 ^ (challengeGap / ratingScale))

rawPlayerDelta = ratingK × (actualPlayerResult - expectedPlayerWin)
playerDelta = sign(rawPlayerDelta) × clamp(abs(round(rawPlayerDelta)), ratingDeltaMin, ratingDeltaMax)
opponentDelta = -playerDelta
```

Where `actualPlayerResult` is `1` for a player win and `0` for a loss. Use the ratings and CPTF values frozen at match start. `powerWeight`, `ratingScale`, `ratingK`, min, and max are all server config using the values supplied above as starting defaults.

Examples that automated tests must cover:

- Beat a substantially higher-rated, equal-power opponent: larger positive player delta.
- Beat a lower-rated or materially weaker opponent: smaller positive player delta.
- Lose to a materially stronger opponent: smaller negative player delta.
- Lose to a materially weaker opponent: larger negative player delta; the weaker winner receives the corresponding larger positive delta.

Settle both rating changes transactionally. The defender receives/losses points even if offline, because they were a selected Arena opponent; write an Arena battle report and notification. If concurrent matches touch a rating, serialize settlement or use safe optimistic concurrency that recomputes only from the match-start inputs—never double award. Apply the daily defense cap before match creation, not after resolution.

### H2H rank ordering

Use current Arena Rating for the daily live leaderboard and final weekly rank. For ties use, in order:

1. More rated wins that week.
2. Higher total match-start challenge of defeated opponents.
3. Fewer rated losses.
4. Earlier timestamp at which the final rating was reached.
5. Stable account ID ascending.

The final ranking must be immutable once Sunday settlement begins. The server creates reward-grant rows first, then delivers them via mail/notification; never make the browser decide a player’s payout.

## Arena and alliance rewards

Arena remains an individual prestige and premium-value path. Keep a separate weekly **Arena Alliance Merit** ledger based on final rank bands, not raw spend. Use the values in the Season 1 design document:

```text
Rank 1: 1,000 merit
Rank 2: 800 merit
Rank 3: 700 merit
Rank 4–10: 500 each
Rank 11–20: 300 each
Rank 21–50: 160 each
Rank 51–100: 80 each
Rank 101+ with three matches: 25 each
```

At settlement, credit merit only to the alliance the player belongs to at close if the player has the 48-hour continuous membership eligibility. Require five eligible members with three Arena matches each before an alliance qualifies for an Arena Alliance Merit treasury grant. Individual Arena rewards remain individual; alliance treasury grants are separate.

Make the player’s powerful investment visible without allowing a one-player alliance win:

- Battle reports enumerate packages, owned/equipped cosmetic effects, specialty adders, formations, counters, and event effects.
- Dominion Impact honors display top personal combat achievement, with high daily impact caps rather than unlimited no-life farming.
- Arena and Dominion Impact can make a powerful player a visible server leader.
- Alliance Warfront score remains capped per player per day and requires multi-member co-operative objectives.

## Reset, settlement, jobs, and abuse prevention

Create server jobs using existing worker/queue patterns. Jobs must be retry-safe and idempotent.

```text
Daily reset:
  settle pre-reset actions
  create daily map exercises and Daily Operations assignments
  generate Benchmark Squad in Weeks 1–4
  replenish Arena attempts and defense caps
  expire old candidate lists
  publish new daily leaderboard period

Sunday weekly reset:
  reject new Arena attempts
  settle attempts started before close
  freeze Arena, Warfront, Dominion Impact, and Alliance Merit input ledgers
  apply eligibility and abuse holds
  calculate ranks/tie-breaks
  create immutable individual and treasury reward grants
  deliver mailbox/notifications
  close week and start next week
```

Show `Calculating rewards` while a weekly settlement is running. The target is less than 15 minutes; players keep earned rewards even if offline. Never show a guessed final reward before the immutable grant exists.

Implement server-side abuse controls:

- Attempt ticket, daily reward, mission, reward-claim, and score idempotency.
- Pair limit and Arena defense limit described above.
- Detect/review repeated intentional losses, shared control/device indicators where available, impossible action rates, manipulated timestamps, and multi-account resource funneling.
- Flagged matches/rewards enter an auditable hold state and are excluded from settlement until cleared; do not silently erase records.
- Validate Task Force availability and all modifier eligibility at snapshot creation.
- Do not allow a purchase/equip after an Arena match snapshot to alter that match.

## UI requirements

Mobile first; retain the translated persistent chat bar. No continuous render loops, client timers, or GPU-heavy effects.

### Arena screen

Show:

- Current phase: `Proving Ground` in Weeks 1–4 or `Head-to-Head Ladder` in Weeks 5–10.
- Attempts remaining out of three and exact server refresh time.
- Best automatically selected Arena squad, its displayed CPTF, and selectable inspection only.
- In Weeks 1–4: the generated Benchmark Squad, three attempt history cards, score breakdown, daily rank, weekly rank, daily/weekly leaderboard tabs.
- In Weeks 5–10: nine candidate cards, higher/peer/safer labels, snapped rating and power, point-range explanation, three attempt history cards, rank, and daily/weekly leaderboard tabs.
- Reward bands, Sunday close timestamp, and `Calculating rewards` status.
- Clear text that Arena battles do not destroy world-map assets or raid resources.

### Alliance Warfront screen

Show individual Assault, Operations, and Support bars with personal daily caps; alliance total score; active eligible contributors; co-op objectives; current rank; reward eligibility; personal contribution; and treasury ledger summary. Explain why a player is blocked by the 48-hour rule or a cap.

### Battle reports

Every Arena/benchmark/H2H report must include server time, snapshots used, deterministic seed or audit reference, full score/rating calculation, applied modifiers, results, score/point delta, and reward/Warfront progress. Do not expose protected player inventory or any private identifier.

## Tests and acceptance criteria

Add unit, integration, migration, and end-to-end coverage appropriate to the repository. At minimum prove:

1. A fresh Level 1 account can complete four Daily Operations without payment, PvP, or alliance membership and receives the Cache exactly once.
2. Map exercises cannot be stolen and cannot be settled twice.
3. An alliance supports 100 members but rejects a 101st according to existing membership error patterns.
4. A member below 48 continuous alliance hours cannot contribute final alliance score/rewards; eligibility becomes valid precisely at the server timestamp.
5. One player cannot exceed 1,000 Warfront Score per day even through high damage, Tokens, or repeated operations.
6. Several medium active members can outscore one maximum-cap premium player in Warfront.
7. Weeks 1–4 generate one anonymous daily Benchmark Squad, permit exactly three attempts per account/day, update daily rank after settlement, and use daily best/week sum correctly.
8. Weeks 1–4 pay normal Sunday Arena reward bands every week, not only after Week 4.
9. Week 5 changes the Arena to H2H automatically after Week 4 settlement and exposes only eligible candidate lists.
10. H2H point formula produces the four required outcomes: bigger win against higher/stronger, smaller win against lower/weaker, smaller loss to stronger, larger loss to weaker.
11. A defender receives the opposite rating delta transactionally and cannot be challenged more than the configured daily defense cap.
12. Sunday settlement prevents new matches, handles pre-close match settlement, freezes ranks, creates each reward once, and delivers individual/alliance/treasury grants separately.
13. Resource and reward balances come from server config; client-side changes cannot alter amount, score, rank, timestamp, or reward eligibility.
14. Battle report values reconcile exactly with resolver output and leaderboard/rating ledger values.

## Implementation sequence

1. Inspect and document the existing integration points; add migrations and server configuration.
2. Implement resource/reward ledger primitives and idempotent season/reset jobs if not already available.
3. Implement Daily Operations and five map exercises with test fixtures.
4. Implement three alliance operations, the three-metric Warfront ledger, and eligibility checks.
5. Implement Benchmark Arena and Weeks 1–4 leaderboard/reward settlement.
6. Implement the Week 5 H2H candidate list, snapshots, points formula, and concurrent settlement safety.
7. Add UI surfaces using existing visual patterns, then full test coverage and operator documentation.

At each phase, report changed files, migrations, API contracts, configuration keys, test results, and any architectural blocker. Do not invent different business rules; ask Matt before changing a stated rule.
