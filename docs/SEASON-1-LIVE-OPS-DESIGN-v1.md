# WORLD WAR ROGUE — Season 1: Mech Uprising — Iron Dominion

## Season promise

Season 1 is a ten-week server-wide war for a pale salt basin occupied by the automated **Iron Dominion**. New players arrive as Forward Command Bases joining the same live server fight: take contracts, develop a Level 1–10 base, build a Task Force, earn resources every day, compete in the weekly Arena, and contribute to an alliance campaign.

The visual language is dry white salt, dark asphalt, oxidized steel, amber warning lights, automated factories, and massive industrial silhouettes. The enemy is not a faction of real people or a copy of a known franchise: it is an original machine-controlled occupation force. The seasonal objective is to break the Dominion’s supply network, take its factories, and earn standing before the final Iron Dominion Core operation.

| Item | Season 1 rule |
|---|---|
| Duration | 10 server weeks |
| Server time | Rogue Standard Time (RST), UTC-7; all deadlines supplied by server |
| Player/base cap | Level 10; no system may exceed Command Center level or Season 1 cap |
| Live categories | Armour, Artillery, Rotary, Fixed Wing, Drone; Naval is absent |
| Entry | New accounts may register throughout the season; their onboarding uses the same current season state |
| Main competition | Server-wide individual Arena and alliance Warfront leaderboard |
| Core earnable resources | Command Credits, Fuel, Steel, Munitions, Alloy, and package modules/fragments |

## Season map and weekly story beat

All players share the same **Mech Uprising — Iron Dominion** world state. Each weekly chapter rotates the best scoring activities while preserving the same resources and familiar player loop.

| Week | Chapter | Featured play | Server-facing reason |
|---:|---|---|---|
| 1 | Signal Breach | Recon, starter contracts, Arena placement | The Dominion’s signal net is discovered. |
| 2 | Scraplands Sweep | Convoys, resource gathering, alliance supply runs | Outer salvage routes are exposed. |
| 3 | Factory Ring | Factory Defence, breach squads, alliance targets | Automated production lines activate. |
| 4 | Blackout Protocol | Signals, drone/recon, ambush prevention | Dominion jammers disrupt the basin. |
| 5 | Siege Engines | Siege, armour, artillery, repair planning | Mobile fortress units enter the field. |
| 6 | Air Corridor | Rotary/fixed-wing operations, map mobility | The Dominion contests its air lanes. |
| 7 | Broken Convoys | Raids, logistics, alliance escort | Supply chains become vulnerable. |
| 8 | Colossus Wake | Colossus Hunt, multi-band Task Forces | A Dominion industrial titan powers up. |
| 9 | Front Collapse | Mixed-role operations, reinforcements | The outer rings fail and resistance concentrates. |
| 10 | Iron Dominion Core | Server finale, all proven event types | The Core opens for the season’s final campaign. |

Chapter choice changes score weights and featured contracts only. It must never delete a player’s owned progress or change stored asset stats.

## Daily Operations — individual missions

### Player experience

At the Command Center, players see six short **Daily Operations**. They complete any four to unlock the **Daily Operations Cache**. This makes the system welcoming to new players and does not require a player to win PvP, pay, join an alliance, or own a particular asset category.

Every player receives one mission from each of the six lanes below. A lane has alternatives chosen by account state, so an account is never offered a task it cannot perform.

| Lane | Example objective | Account-safe alternative | Individual reward on completion |
|---|---|---|---|
| Command | Read the Command Center bulletin and claim the day’s Intel order | Same for every account | 30 CC + 1 Intel |
| Industry | Collect output from a producing department | Collect any available base production | 120 Fuel + 100 Steel |
| Mobilization | Start a map action, scout, or relocate a ready Task Force | Run a free Tactical Operations drill | 90 Fuel + 60 Munitions |
| Engagement | Complete a neutral contract, simulation, or map combat | Complete one free combat simulation; win not required | 90 Steel + 60 Alloy |
| Readiness | Start/claim an upgrade, build, repair, refit, or asset training action | Inspect and save a valid upgrade/refit plan | 40 CC + 1 random module fragment |
| Cooperation | Donate, reinforce, or help an alliance operation | Complete an extra neutral contract when not in an alliance | 30 CC + 60 Munitions |

**Daily Operations Cache, four completed lanes:** 140 Command Credits, 240 Fuel, 220 Steel, 150 Munitions, 130 Alloy, and 2 random package-module fragments.

Rewards scale only by the active Season 1 week using a server-configured `dailyRewardWeekMultiplier`; recommended launch value is `1 + 0.06 × (week − 1)`. The first-completion reward shown above is the Week 1 value. A player may complete all six lanes for personal progress and alliance score, but receives the Cache once daily.

### Daily Operation rules

- Refresh at the server’s daily RST reset. Do not use device time.
- Incomplete lanes do not roll over. The completed-lane record does roll into weekly participation and alliance contribution.
- A loss, legitimate simulated battle, or valid map action counts where stated; no suicide/instant-cancel actions count.
- The server verifies action IDs, timestamps, action cost, and account state. The client only displays progress.
- One player cannot transfer or trade Daily Operations rewards before they reach their inventory.
- A player who joins the season late receives the current day’s set and the current week multiplier, never backfilled missions.

## Weekly alliance competition — Dominion Warfront

**Dominion Warfront** is the alliance-versus-alliance competition on each server. It runs continuously from Monday reset through the following Sunday reset. Every participating member helps their alliance earn **Warfront Score**; strong individual play matters, but a large alliance cannot win only by recruiting inactive accounts.

### Scoring

Each member can contribute up to **1,000 personal Warfront Score per day**. The daily cap prevents a small number of nonstop players from deciding the entire week. Alliance score is the sum of each member’s capped contribution, plus a limited coordinated-operation bonus.

| Action | Warfront Score | Daily cap source |
|---|---:|---|
| Complete one Daily Operations lane | 35 | Personal cap |
| Claim Daily Operations Cache | 100 | Personal cap |
| Complete a featured neutral/event contract | 90 | Personal cap |
| Complete three Arena matches that day | 80 | Personal cap |
| Complete an alliance operation objective | 120 | Personal cap |
| Finish a featured weekly chapter objective | 180 | Personal cap |
| Alliance coordinated-operation completion | 500 per operation | Alliance cap: 10/week |

Only members who have been in the alliance for at least 48 continuous hours can contribute score or receive final alliance-ranking rewards. This uses the same server membership clock as Trading Post eligibility and blocks last-minute alliance hopping. Contributions made before leaving remain in the historical ledger but are not paid out after the player leaves.

### Warfront divisions and rewards

The server ranks eligible alliances by final Warfront Score, then by: (1) number of distinct eligible contributors, (2) featured objective completions, (3) earlier time at the final score. This makes ties deterministic and rewards active teams.

| Division | Rank | Alliance reward pool | Eligible member reward |
|---|---:|---|---|
| Dominion Breakers | 1 | 10,000 CC; 16,000 each Fuel/Steel; 10,000 each Munitions/Alloy; 60 module fragments | 700 CC; 900 Fuel/Steel; 550 Munitions/Alloy; 6 fragments |
| Iron Vanguard | 2–3 | 7,000 CC; 11,000 each Fuel/Steel; 7,000 each Munitions/Alloy; 42 fragments | 520 CC; 700 Fuel/Steel; 430 Munitions/Alloy; 4 fragments |
| Factory Raiders | 4–10 | 4,500 CC; 7,000 each Fuel/Steel; 4,500 each Munitions/Alloy; 28 fragments | 360 CC; 520 Fuel/Steel; 320 Munitions/Alloy; 3 fragments |
| Scrapland Companies | 11–25 | 2,500 CC; 4,000 each Fuel/Steel; 2,500 each Munitions/Alloy; 14 fragments | 220 CC; 330 Fuel/Steel; 200 Munitions/Alloy; 2 fragments |
| Registered participants | 26+ | Milestone pool only | 120 CC; 180 Fuel/Steel; 110 Munitions/Alloy; 1 fragment |

The pool is deposited to an alliance **Operations Treasury** with an auditable ledger; it is not controlled by a single leader. It can fund posted alliance operations only. Individual rewards require both 48-hour eligibility and at least 1,500 Warfront Score that week, except the registered-participant tier which requires 500. Reward numbers are initial server configuration and must be included in economy simulations before launch.

## Weekly individual competition — Iron Dominion Arena

The **Iron Dominion Arena** is the season’s personal server leaderboard. It is a controlled tactical competition rather than a one-loss elimination bracket: every player can keep playing, wins improve rating more than losses, and new players are seeded into an appropriate cohort.

### Schedule and matchmaking

- Opens Monday immediately after weekly reset; closes at the **Sunday weekly reset**. The server must publish the exact `arenaClosesAt` timestamp.
- At close, no new match can start. In-progress matches settle from their server-recorded start snapshot before calculations begin.
- During the post-reset calculation window, the leaderboard is frozen and marked **Calculating**. The server computes all ranks, tie-breaks, alliance shares, and reward ledgers before any reward is claimable.
- Rewards are delivered by server mailbox after calculation. They are never granted based on a client’s visible provisional position.
- Players receive five rated match tickets per day, each replenishing at daily reset. Practice simulations are unlimited but produce no Arena score or reward progress.
- Matchmaking first targets a comparable Arena Rating band, then widens slowly. A player cannot receive rating from the same opponent more than twice in 24 hours, and repeated-account/device abuse is flagged server-side.

### Arena score

Every account begins each week at **1,000 Arena Rating**. A rated victory normally grants 26 rating; a loss normally removes 14. Rating difference adjusts that amount within a configured safe range. A short placement protection applies to a player’s first five rated matches: losses cannot take them below 950 that week. Combat uses the server’s normal published battle resolver and snapshots all relevant items at match start.

Arena Score shown on the leaderboard is the final Arena Rating. It has no permanent stat effect and does not modify world-map combat.

### Daily Arena participation reward

Complete **three rated Arena matches** on a day to receive the **Arena Field Cache**, regardless of wins or losses:

```text
70 Command Credits
110 Fuel
90 Steel
60 Munitions
50 Alloy
1 random module fragment
```

This is separate from Daily Operations. The player can do their three matches for this reward even if they do not complete four Daily Operations lanes. The first three completed matches also contribute the listed 80 daily Warfront Score once.

### Sunday final rankings and individual rewards

The Arena has exactly the requested rank bands. The overlapping request `50–100` is implemented as **51–100** so rank 50 is paid once, and everyone below rank 100 receives a reward.

| Final individual rank | Reward |
|---:|---|
| 1 | 4,000 CC; 5,000 Fuel; 5,000 Steel; 3,000 Munitions; 2,500 Alloy; 16 module fragments; permanent Season 1 #1 Arena badge |
| 2 | 3,000 CC; 3,800 Fuel; 3,800 Steel; 2,300 Munitions; 1,900 Alloy; 12 fragments; permanent Top 3 badge |
| 3 | 2,400 CC; 3,000 Fuel; 3,000 Steel; 1,800 Munitions; 1,500 Alloy; 10 fragments; permanent Top 3 badge |
| 4–10 | 1,600 CC; 2,200 Fuel; 2,200 Steel; 1,300 Munitions; 1,100 Alloy; 7 fragments; Top 10 badge |
| 11–20 | 1,100 CC; 1,600 Fuel; 1,600 Steel; 950 Munitions; 800 Alloy; 5 fragments; Top 20 badge |
| 21–50 | 750 CC; 1,100 Fuel; 1,100 Steel; 650 Munitions; 550 Alloy; 3 fragments |
| 51–100 | 500 CC; 750 Fuel; 750 Steel; 440 Munitions; 380 Alloy; 2 fragments |
| 101 and below | 250 CC; 350 Fuel; 350 Steel; 200 Munitions; 170 Alloy; 1 fragment |

An account needs at least three rated matches that week to receive a final Arena rank reward. A zero-point or inactive account does not appear in the ranking and receives no final Arena reward. All values are server configuration, and the economy model must test them alongside the daily caches before public release.

### Alliance rewards from Arena performance

An Arena performance benefits both the player and their eligible alliance. After final individual ranks are computed, each player produces **Arena Alliance Points**:

| Individual finish | Points credited to eligible alliance |
|---:|---:|
| 1 | 1,000 |
| 2 | 800 |
| 3 | 700 |
| 4–10 | 500 each |
| 11–20 | 300 each |
| 21–50 | 160 each |
| 51–100 | 80 each |
| 101+ with three rated matches | 25 each |

Those points do not alter the Arena’s individual placement. They contribute to a weekly **Arena Alliance Merit** ledger. An alliance needs at least five eligible members who each completed three rated matches to qualify. Qualifying alliances receive one of these Operations Treasury grants:

| Arena Alliance Merit rank | Treasury grant |
|---:|---|
| 1 | 6,000 CC; 10,000 Fuel/Steel; 6,000 Munitions/Alloy; 40 fragments |
| 2–3 | 4,000 CC; 6,500 Fuel/Steel; 4,000 Munitions/Alloy; 26 fragments |
| 4–10 | 2,500 CC; 4,000 Fuel/Steel; 2,500 Munitions/Alloy; 16 fragments |
| 11–25 | 1,250 CC; 2,000 Fuel/Steel; 1,250 Munitions/Alloy; 8 fragments |
| 26+ | 700 CC; 1,000 Fuel/Steel; 700 Munitions/Alloy; 4 fragments |

The alliance that a player belongs to at the weekly close receives their Arena Alliance Points only if the member has passed the 48-hour continuous membership requirement. This means an alliance is rewarded for developing its active roster, not for recruiting an already-finished leaderboard player just before reset.

### Deterministic tie-breakers

For identical final Arena Rating, the server ranks by:

1. More rated wins that week.
2. Higher total strength of defeated opponents, measured from their match-start rating.
3. Fewer rated losses.
4. Earlier timestamp at which the final rating was reached.
5. Stable account ID ascending as the final deterministic fallback.

The final tie-break order is shown in the Arena rules before a player queues. Match history, snapshots, reward inputs, and anti-abuse flags are retained server-side for review.

## Season resources and places they become useful

| Earned item | Main sources in Season 1 | Used at |
|---|---|---|
| Command Credits | Daily Operations, Arena, Warfront, normal play | Maintenance Depot: package upgrades, store shortfalls, second queue, eligible power/cosmetic items |
| Fuel | Fuel Point production, daily/event rewards | Marches, repairs, selected construction/operations |
| Steel | Fabrication Yard production, daily/event rewards | Buildings, armour/fixed-wing work, construction |
| Munitions | Garrison production, daily/event rewards | Asset build/refit, combat readiness, operations |
| Alloy | Recovery Yard production, daily/event rewards | Advanced building/asset upgrades, repair/refit |
| Module fragments | Daily Cache, Arena, Warfront | Combine into named package modules at Maintenance Depot; packages require modules + CC/Tokens |
| Intel | Command lane and featured content | Seasonal contract visibility and Command Center event briefing only; no paid purchase in Season 1 |

Resource wallets and the Operations Treasury must be visible in their relevant building sheets and in the persistent resource bar. Every reward notification names the resource, amount, source, and server timestamp.

## Weekly reset sequence

The reset is server-authoritative and uses the published RST instant. The client must render the server-provided countdown only.

1. **Sunday reset instant:** Arena queue closes; current match starts are rejected; Warfront contribution ends.
2. **Settlement:** Server settles matches that began before close, freezes source ledgers, checks eligibility/anti-abuse flags, calculates rank and tie-breaks, and creates immutable reward records.
3. **Reward delivery:** Server mails individual Arena rewards, Arena Field Cache claims already earned, Warfront member rewards, and both alliance treasury grants.
4. **New week:** Daily Operations refresh; Arena Rating returns to 1,000; Warfront score returns to zero; a new chapter/featured activity becomes active.

The expected settlement target is under 15 minutes. If it runs longer, the UI says **Calculating rewards** and never displays a guessed payout. No player loses a valid completed reward because they are offline.

## Anti-abuse and fairness controls

- All rewards, placements, weekly caps, eligibility, and time checks are server-owned.
- Arena captures a combat snapshot at match start; equipping, buying, or upgrading after the start cannot alter that match.
- Detect and review repeated pairs, shared control, intentional losses, multi-account funneling, and impossible action-rate patterns. Flagged results are held from reward settlement pending review.
- Only eligible, 48-hour alliance members score or receive final alliance rewards. The first 48 hours are visible as a countdown.
- Daily and weekly score caps apply across every client/platform and cannot be bypassed by currency type.
- The same reward ID can be claimed once only. Mail delivery and resource ledger entries are idempotent.
- No Season 1 reward is tradeable except resources explicitly later marked `tradeable` in server config. Tokens, Command Credits, cosmetics, badges, assets, Arena Rating, and completed modules remain non-tradeable.

## Implementation data contract

Store this entire event system in server configuration. The client receives presentation-ready rules, progress, published deadlines, and ledger summaries; it must not calculate reward amounts, placements, or time remaining locally.

```json
{
  "season": {
    "id": "season_01_mech_uprising",
    "title": "Mech Uprising — Iron Dominion",
    "weeks": 10,
    "levelCap": 10,
    "serverTimezone": "UTC-7"
  },
  "dailyOperations": {
    "lanes": 6,
    "requiredForCache": 4,
    "dailyRewardWeekMultiplier": { "base": 1.0, "perWeek": 0.06 },
    "cache": { "commandCredits": 140, "fuel": 240, "steel": 220, "munitions": 150, "alloy": 130, "moduleFragments": 2 }
  },
  "warfront": {
    "individualDailyScoreCap": 1000,
    "allianceOperationScore": 500,
    "allianceOperationWeeklyCap": 10,
    "membershipHoursRequired": 48,
    "memberScoreForRankReward": 1500,
    "memberScoreForParticipantReward": 500
  },
  "arena": {
    "opensAt": "server supplied",
    "closesAt": "server supplied Sunday reset",
    "initialRating": 1000,
    "dailyRatedTickets": 5,
    "minimumRatedMatchesForRankReward": 3,
    "dailyMatchesForFieldCache": 3,
    "dailyFieldCache": { "commandCredits": 70, "fuel": 110, "steel": 90, "munitions": 60, "alloy": 50, "moduleFragments": 1 },
    "alliances": { "membershipHoursRequired": 48, "minimumEligibleParticipants": 5 }
  }
}
```

## Launch acceptance checks

- A brand-new Level 1 account can complete four Daily Operations without PvP, payment, or alliance membership and receives resources once.
- A player can complete three rated Arena matches, win or lose, and receives the daily Field Cache once.
- Arena final rankings include exactly: 1, 2, 3, 4–10, 11–20, 21–50, 51–100, and 101+.
- At Sunday reset, new Arena matches are blocked, the leaderboard freezes, calculations occur server-side, and rewards arrive only after settlement.
- Individual Arena rewards, alliance Arena Merit, Warfront member rewards, and Warfront treasury grants are separate ledgered rewards; none overwrites another.
- Leaving or joining an alliance near reset does not route alliance rewards incorrectly.
- Every reward value is present in server config and consumed by the economy simulation before release.
- The Command Center shows the active chapter, personal daily progress, Arena close countdown, Warfront standing, and server-sourced reward settlement state.
