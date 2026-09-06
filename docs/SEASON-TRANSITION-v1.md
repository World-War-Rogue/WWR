# Claude build brief — Offseason, server progression, transfers, and season rollover

Implement this as a server-authoritative system. It is a product decision for WORLD WAR ROGUE, not client-side presentation logic. All values below are **named provisional configuration constants**. The listed values are recommended launch defaults and must be server-configured, versioned, auditable, and changeable without a client deployment.

## 1. Season transition timeline

At the end of every season, settle its final standings first. The server then enters an Offseason, opens transfers only after catch-up events, performs the final migration lock, and loads the next season on its new visual map.

| Constant | Recommended value | Meaning |
|---|---:|---|
| `OFFSEASON_TOTAL_DAYS` | 7 | Full time between final-season settlement and next-season activation. |
| `OFFSEASON_CATCHUP_DAYS` | 4 | First phase; catch-up events run and no transfers are open. |
| `TRANSFER_WINDOW_DAYS` | 2 | Second phase; eligible players may request a server transfer. |
| `TRANSFER_FINALIZATION_DAYS` | 1 | Final phase; transfers are locked and prepared for cutover. |
| `SEASON_CHANGEOVER_MINUTES` | 20 | Planned maintenance time for map unload, migration application, and next-map load. Must remain within named bounds `SEASON_CHANGEOVER_MIN_MINUTES = 10` and `SEASON_CHANGEOVER_MAX_MINUTES = 30`. |
| `SERVER_TIMEZONE` | UTC-7 | Rogue Standard Time; server timestamps are the only source of truth. |

### Required state machine

```text
ACTIVE_SEASON
  -> FINAL_SETTLEMENT
  -> OFFSEASON_CATCHUP
  -> TRANSFER_WINDOW
  -> TRANSFER_FINALIZATION
  -> CHANGEOVER_MAINTENANCE
  -> NEXT_SEASON_ACTIVE
```

Every state transition uses a published server timestamp. The client renders a server-provided phase, absolute deadline, and status message; it never infers an event clock from device time.

### Phase A — Offseason Catch-up

During `OFFSEASON_CATCHUP_DAYS`, lower-progression servers receive resource and progression help to finish the old season’s available Level cap before transfers open. This is not a second competitive season and cannot produce new final-season leaderboard rewards.

Run these events:

| Event ID | Activity | Player reward | Purpose |
|---|---|---|---|
| `offseason_recovery_convoy` | Personal/allianced escort and salvage activity | Fuel, Steel, Alloy, repair supplies | Helps bases and assets recover. |
| `offseason_readiness_drill` | Neutral combat simulation or map drill | Service Merit, module fragments, Command Credits | Lets late players develop viable Task Forces. |
| `offseason_fabrication_push` | Complete construction, repair, or asset production actions | Resource crate and configured construction-time assistance | Helps accounts finish legal upgrades up to the old season cap. |
| `offseason_bridgehead_operation` | Small alliance convoy/relay/sabotage operation | Participant cache and alliance Operations Treasury deposit | Keeps alliances active without a seasonal ranking race. |
| `offseason_next_map_recon` | Preview/intel activity for the next season map | Intel, non-combat profile/banner cosmetic fragments | Creates anticipation without giving next-season map control. |

Use a frozen pre-Offseason server progression snapshot to calculate a server catch-up multiplier:

```text
catchUpGap = max(NON_NEGATIVE_FLOOR, catchUpReferenceProgressionScore - serverProgressionScore - CATCHUP_SCORE_GAP_TRIGGER)
catchUpMultiplier = MULTIPLIER_IDENTITY + min(CATCHUP_REWARD_MAX_ADDITIVE, catchUpGap × CATCHUP_REWARD_PER_SCORE_POINT)
```

| Constant | Recommended value | Meaning |
|---|---:|---|
| `CATCHUP_SCORE_GAP_TRIGGER` | 3 | Score gap required before a server receives extra help. |
| `CATCHUP_REWARD_PER_SCORE_POINT` | 0.04 | Additional eligible reward multiplier per progression-score point behind. |
| `CATCHUP_REWARD_MAX_ADDITIVE` | 0.40 | Maximum added catch-up reward; multiplier therefore cannot exceed 1.40. |
| `CATCHUP_CONSTRUCTION_SPEED_MULTIPLIER` | 1.25 | Construction/repair speed multiplier for eligible catch-up activities only. |
| `CATCHUP_REFERENCE_METHOD` | population-weighted median | Reference is the frozen median progression score across eligible servers at Offseason start. |
| `MULTIPLIER_IDENTITY` | 1.00 | Neutral multiplier used in formulas. |
| `NON_NEGATIVE_FLOOR` | 0.00 | Lower bound used in formulas. |

The catch-up multiplier applies only to configured Offseason resources, merit, modules, and construction/repair assistance. It does not alter paid cosmetic modifiers, Arena rating, combat resolver formulas, permanent base-stat budgets, or the old season’s level cap.

### What is active and what is frozen in Offseason

| State | Rule |
|---|---|
| Resource production and collection | Active; ordinary storage limits remain. |
| Construction, repair, refit, asset build | Active up to the just-finished season’s legal Command Center/level cap; existing absolute timers continue. |
| Offseason events | Active; only the listed configured events and their successor content are available. |
| Chat and alliance membership | Active, except transferred accounts are moved at cutover. |
| Store | Active only for already released stock and ordinary weekly rules; no next-season power item may be bought/equipped early. |
| Season leaderboard, Warfront, Arena rewards | Frozen after final settlement; no new score or rank input. |
| World-map wars, claims, hostile attacks, reinforcements | Frozen; resolve or safely recall all map actions before transfer finalization. |
| New-season map objectives, claims, and level-cap access | Frozen until `NEXT_SEASON_ACTIVE`. |
| Trading Post | Active during Catch-up, then `TRANSFER_TRADE_LOCK_HOURS` before transfer finalization; all remaining escrow is atomically settled or returned before migration. |

| Constant | Recommended value | Meaning |
|---|---:|---|
| `TRANSFER_TRADE_LOCK_HOURS` | 24 | Period before transfer finalization in which no new trade may be posted. |
| `MAP_ACTION_RESOLUTION_GRACE_MINUTES` | 30 | Time allowed to resolve a valid pre-freeze map action before safe recall/settlement. |

## 2. Server Progression Score

Create a frozen, auditable `ServerProgressionScore` at Offseason start and recompute it at the start of `TRANSFER_WINDOW_DAYS`. The latter is the score used for transfer matching. Do not use account spend, wallet balance, device data, or a subjective operator judgment.

Only accounts active within `SERVER_ACTIVE_PLAYER_WINDOW_DAYS` are sampled. An active account has completed at least one server-verified meaningful action—collection, build/refit/repair action, valid map exercise, Arena attempt, or alliance operation—not merely a login.

| Constant | Recommended value | Meaning |
|---|---:|---|
| `SERVER_ACTIVE_PLAYER_WINDOW_DAYS` | 7 | Lookback window for an active account. |
| `SERVER_PROGRESSION_INDEX_MAX` | 100 | Maximum normalized component and total score. |
| `SERVER_PROGRESS_CC_WEIGHT` | 0.35 | Weight of Command Center development. |
| `SERVER_PROGRESS_SERVICE_RANK_WEIGHT` | 0.30 | Weight of Service Rank development. |
| `SERVER_PROGRESS_ALLIANCE_WEIGHT` | 0.20 | Weight of normalized active alliance strength. |
| `SERVER_PROGRESS_EVENT_WEIGHT` | 0.15 | Weight of meaningful event completion. |
| `ALLIANCE_STRENGTH_TOP_ALLIANCES` | 10 | Largest eligible alliances sampled for the alliance component. |
| `ALLIANCE_MIN_ACTIVE_MEMBERS_FOR_SCORE` | 5 | Minimum active members for an alliance to enter the server-strength sample. |
| `WARFRONT_SCORE_TARGET_PER_ACTIVE_MEMBER` | 4000 | Weekly contribution target used to normalize alliance strength. |
| `EVENT_COMPLETION_TARGET_PER_ACTIVE_ACCOUNT` | 1.00 | Configured completion-target ratio for normalized event performance. |
| `PROGRESSION_RATIO_CAP` | 1.00 | Upper ratio bound before a progression component is converted into its index. |
| `TARGET_PLAYER_PROGRESS_PERCENTILE` | 75 | Target-server active-player percentile used in individual transfer safety. |

### Components

All values are calculated from existing server records and clamped to `SERVER_PROGRESSION_INDEX_MAX`.

```text
ccIndex = SERVER_PROGRESSION_INDEX_MAX × mean(
  min(commandCenterLevel, currentSeasonLevelCap) / currentSeasonLevelCap
) over active accounts

serviceRankIndex = SERVER_PROGRESSION_INDEX_MAX × mean(
  min(serviceRank, currentSeasonLevelCap) / currentSeasonLevelCap
) over active accounts

allianceStrengthIndex = SERVER_PROGRESSION_INDEX_MAX × median(
  min(PROGRESSION_RATIO_CAP, allianceEligibleWarfrontScorePerActiveMember / WARFRONT_SCORE_TARGET_PER_ACTIVE_MEMBER)
) over the strongest eligible alliances, up to ALLIANCE_STRENGTH_TOP_ALLIANCES

eventCompletionIndex = SERVER_PROGRESSION_INDEX_MAX × mean(
  min(PROGRESSION_RATIO_CAP, eligibleEventCompletionRatio / EVENT_COMPLETION_TARGET_PER_ACTIVE_ACCOUNT)
) over active accounts

serverProgressionScore =
  SERVER_PROGRESS_CC_WEIGHT × ccIndex
  + SERVER_PROGRESS_SERVICE_RANK_WEIGHT × serviceRankIndex
  + SERVER_PROGRESS_ALLIANCE_WEIGHT × allianceStrengthIndex
  + SERVER_PROGRESS_EVENT_WEIGHT × eventCompletionIndex
```

`eligibleEventCompletionRatio` uses settled Daily Operations, valid Arena participation, valid Warfront/alliance-operation participation, and configured weekly event completions. Exclude cancelled actions, held/invalidated actions, and raw currency spend. This captures actual event results without allowing a single whale or an inactive account to distort the server score.

Persist each component, source record counts, sample cutoff timestamp, formula version, and final score. Operations staff can audit why two servers were or were not matched; players see only a readable progression band such as `Developing`, `Established`, or `Advanced`, not exploitable raw cohort data.

## 3. Transfers

Transfers are individual-account migrations in this version. There is no bulk alliance migration. This is intentional: it lets players find a suitable server while preventing a powerful alliance from moving as a block to farm a weaker server.

### Eligibility

| Constant | Recommended value | Meaning |
|---|---:|---|
| `TRANSFER_MIN_ACCOUNT_AGE_DAYS` | 14 | Account must be old enough to have established a real history. |
| `TRANSFER_MIN_SEASON_PARTICIPATION_DAYS` | 3 | Account must have valid activity across this many season days. |
| `TRANSFER_COOLDOWN_SEASONS` | 2 | Minimum season boundaries between completed transfers. |
| `TRANSFER_MAX_AFFILIATED_ORIGIN_MEMBERS_PER_TARGET` | 5 | Maximum players from the same source-alliance roster that may enter one target server in a transfer window. |
| `TRANSFER_ALLIANCE_EVENT_LOCK_DAYS` | 7 | After transfer, player cannot contribute to or receive ranked alliance-event rewards on the target server. |
| `TRANSFER_MAX_SERVER_SCORE_GAP` | 8 | Source/target scores must be within this absolute gap. |
| `TRANSFER_MAX_DOWNWARD_SERVER_SCORE_GAP` | 3 | Target cannot be more than this many progression points below source. |
| `TRANSFER_MAX_PLAYER_PROGRESS_ABOVE_TARGET_P75` | 10 | Player progression cannot exceed the target server’s active-player 75th-percentile score by more than this allowance. |
| `TRANSFER_TARGET_CAPACITY_RESERVE` | server configured | Target must have this many available account slots after reservation. |

An account may request one target only during an open transfer window. It must satisfy:

```text
accountAgeDays >= TRANSFER_MIN_ACCOUNT_AGE_DAYS
seasonParticipationDays >= TRANSFER_MIN_SEASON_PARTICIPATION_DAYS
completedTransferCooldownSeasons >= TRANSFER_COOLDOWN_SEASONS
source and target are both in TRANSFER_WINDOW
target has capacity reservation
abs(sourceServerProgressionScore - targetServerProgressionScore) <= TRANSFER_MAX_SERVER_SCORE_GAP
targetServerProgressionScore >= sourceServerProgressionScore - TRANSFER_MAX_DOWNWARD_SERVER_SCORE_GAP
playerProgressionScore <= targetActivePlayerP75 + TRANSFER_MAX_PLAYER_PROGRESS_ABOVE_TARGET_P75
no unresolved combat, map action, trade escrow, abuse hold, or account penalty exists
```

`playerProgressionScore` is an auditable normalized score using existing records: Command Center level, Service Rank, highest valid Task Force Combat Power, and settled event participation. Define its four weights as named server constants; do not use Tokens spent, wallet balances, or hidden cosmetics as direct transfer criteria.

Take a **source-alliance roster snapshot** at `TRANSFER_ROSTER_SNAPSHOT_TIMESTAMP`, the opening of the transfer window. A player’s affiliated-origin group is based on that snapshot, not on an alliance leave/join performed after it. The destination must reject a request once the group reaches `TRANSFER_MAX_AFFILIATED_ORIGIN_MEMBERS_PER_TARGET`.

### Destination list and transfer flow

1. Server generates an eligible destination list from progression, region/technical compatibility, capacity, population-health configuration, and anti-farming checks.
2. Player sees only valid targets, their progression band, population state, transfer deadline, and any target-specific restriction. Never expose raw server internals or a route to request a weak server manually.
3. Player selects one destination and server creates a **transfer reservation** with idempotency key, source/target score snapshots, roster-group count, and expiry at the transfer window close.
4. At transfer finalization, server revalidates all eligibility, locks map/trade state, safely settles or recalls actions, atomically moves account-scoped data, removes source alliance membership, and writes a durable transfer record.
5. At next-season activation, player signs into the target server’s new map. Their target-server alliance membership starts empty and normal membership clocks begin then.

Do not transfer the source alliance’s identity, treasury, current event score, operations, map claims, chat room history, diplomatic status, or pending trades. A transferred player may join a target alliance normally, but `TRANSFER_ALLIANCE_EVENT_LOCK_DAYS` prevents immediate seasonal alliance ranking/reward exploitation. Personal Daily Operations and unranked Offseason content remain available during that lock.

If a transfer fails validation at finalization, keep the account on the source server, release the capacity reservation, and show a specific server-provided reason. Do not partially duplicate or delete player data.

## 4. Carry-over and reset ledger

The governing rule is: **everything the player earned carries into the next season unless it is explicitly map-state, time-limited, or a completed seasonal standing.** Preserve history even when an active seasonal value resets.

### Carries into the next season

| Data | Rule |
|---|---|
| Account identity, access, tester status, language, notification preferences | Carry unchanged. |
| Tokens, Command Credits, Fuel, Steel, Munitions, Alloy, Intel, module fragments, completed package modules | Carry unchanged, subject to ordinary storage rules. |
| Command Center/building levels, Service Rank, stored capped Merit, asset ownership, package levels, Combat Systems, specialty items | Carry unchanged. New season level access still uses the new season cap and Base Level cap. |
| Cosmetics, skins, nameplates, base effects, squad effects, badges, profile honors, inventory modifiers | Carry unchanged; effects use their published configuration in the new season. |
| Permanent account purchases and unlocks, including second construction queue | Carry unchanged. |
| Owned assets and valid repair/refit/build queues | Carry. Timers remain server-owned absolute completion instants; they pause only for `SEASON_CHANGEOVER_MINUTES` if the runtime cannot settle them during maintenance. |
| Alliance membership on the same server | Carries. Alliance treasury balance carries with its auditable ledger; active operations do not. |
| Season history | Carry as immutable profile/archive history: final rank, badges, rewards, and season results. |

### Resets or expires

| Data | Rule |
|---|---|
| World map visual map, terrain, objective sites, NPCs, factories, Colossus state | Replaced by the new season map. |
| Map claims, territory, base placement, marches, reinforcements, open wars, map action locks | Reset after safe settlement/recall before maintenance. New map assigns valid base placement. |
| Arena rating, Arena attempts, daily/weekly Arena leaderboard, candidate lists, benchmark profiles | Reset. Final standings remain in history and rewards are delivered before reset. |
| Warfront score, Dominion Impact score, Alliance Arena Merit, daily event caps, active event progress | Reset. Final standings and rewards remain historical. |
| Daily Operations assignments and unclaimed daily/weekly event claims | Expire at their published deadline; granted rewards remain. |
| Time-limited event buffs, event-only specialty effects, temporary construction boosts | Expire unless their config explicitly marks them `carryAcrossSeason = true`. |
| Alliance active operations, operation locks, seasonal treasury budgets | Reset; the underlying treasury balance carries. |
| Weekly cosmetic-purchase clearance and other weekly limits | Reset for the first new-season week; no carry-over. |
| Transfer reservations | Consume on success or expire/return on failure; never carry. |

### Pre-maintenance settlement rules

Before `CHANGEOVER_MAINTENANCE`, the server must:

1. Complete final season reward settlement and write immutable reward grants.
2. Settle/recall all valid map actions using `MAP_ACTION_RESOLUTION_GRACE_MINUTES`.
3. Settle or return Trading Post escrow after `TRANSFER_TRADE_LOCK_HOURS` begins.
4. Apply all successful account transfers exactly once.
5. Snapshot carry-over state and verify resource/wallet/asset ledger reconciliation.
6. Disable game entry with a maintenance status, load the new visual map, create new map-state records, then re-enable entry.

## 5. Implementation and test requirements

Implement named server configuration, versioned formula snapshots, durable job records, and idempotent jobs for phase transitions, progression snapshots, transfer reservations, migrations, rewards, recalls, and map bootstrap. The client must never be trusted to supply a score, timer, eligibility decision, transfer target, or carry-over bundle.

Required automated tests:

- A lower-score server receives the bounded catch-up multiplier; an equal/higher-score server does not.
- Catch-up cannot exceed the old season’s level cap or alter permanent combat formulas.
- Progression score is reproducible from the stored component inputs and excludes inactive/log-in-only accounts.
- A high-score server cannot transfer a player to a materially weaker target under `TRANSFER_MAX_DOWNWARD_SERVER_SCORE_GAP`.
- A source alliance cannot move more than `TRANSFER_MAX_AFFILIATED_ORIGIN_MEMBERS_PER_TARGET` members to the same target, including players who leave the alliance after the roster snapshot.
- A transferred player cannot receive target-server alliance ranking rewards during `TRANSFER_ALLIANCE_EVENT_LOCK_DAYS`.
- Transfers with active escrow, combat, or abuse holds safely fail without partial migration or resource duplication.
- Same-server season rollover preserves all listed carry-over data and resets every listed seasonal/map value.
- Maintenance duration is recorded; a changeover outside the configured named min/max range raises an operator alert.
- Every carry/reset result reconciles to wallet, asset, inventory, queue, and alliance treasury ledgers.
