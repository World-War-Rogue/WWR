# Two\-Currency Cost Model

COST CURVES, EARN SCHEDULE, RESERVATION DESIGN — NO CODE WRITTEN

All four corrections accepted. Previous single\-currency curves are withdrawn. This replaces them.

## 1\. Week boundary — recommendation

**00:00 at the start of Monday, Rogue Standard Time.**

Three reasons, in order of weight:

- **ISO 8601 starts the week on Monday.** A Sunday\-start week is a North American convention, and this game ships in nineteen languages. Monday is the boundary most of your players already hold.
- **A Sunday reset splits the weekend.** Saturday would fall in one week and Sunday in the next, halving purchase capacity across your two highest\-activity days. Monday keeps the weekend whole.
- **"Resets Monday" explains itself.** It is the phrasing live\-service players already expect, which is the whole point of choosing calendar over rolling.

In UTC terms the boundary is **Monday 07:00 UTC**. The wallet should display the next reset as an absolute instant in RST, computed server\-side, never from device time.

## 2\. The two caps determine the curve

This is the finding that decides everything below, and it is arithmetic rather than judgement.

Your rules say purchased Tokens **may help a player reach** the 12\-per\-day throughput cap but **must not allow a player to exceed it**. For the first half of that to be true, a player buying at the weekly maximum has to be able to fund twelve level\-ups on any given day — including their most expensive day.

Purchase ceiling: **10,000 Tokens ÷ 7 days \= 1,428.6 Tokens per day.**

Twelve level\-ups must therefore cost **no more than 1,428.6** at the most expensive band.

**Maximum cost per level\-up at the top band: 119 currency.**

Any curve whose top band exceeds 119 makes the *purchase* cap bind before the *throughput* cap does — which means money stops being able to reach the daily limit, and the fairness rule inverts into a pay\-wall. That single number rules out most of what I proposed last time.

## 3\. Three stepped curves

Costs are in currency units, spendable as Tokens, Command Credits, or any mix.

| Level band | **1 — Gentle** | **2 — Moderate** | **3 — Steep** |
| --- | ---: | ---: | ---: |
| 2–5 | 15 | 20 | 25 |
| 6–10 | 30 | 45 | 60 |
| 11–15 | 50 | 75 | 110 |
| 16–20 | 70 | 105 | 165 |
| 21–25 | 95 | 140 | 225 |
| 26–30 | **115** | 180 | 290 |
| One asset 1→30 | 1,860 | 2,805 | 4,350 |
| Full 24\-asset draft | 44,640 | 67,320 | 104,400 |
| Cost of 12 level\-ups, end\-game | **1,380** | 1,810 | 2,905 |
| Against the 1,429 ceiling | **fits** | exceeds by 27% | exceeds by 103% |

### Season simulation

Seventy days, twenty\-four assets climbing together, Command Credit earning as scheduled in §4, purchases at the weekly cap where shown.

|  | **1 — Gentle** | **2 — Moderate** | **3 — Steep** |
| --- | --- | --- | --- |
| Committed free player | **maxed day 58** | not maxed in 70d | not maxed in 70d |
| Casual free player | not maxed in 70d | not maxed in 70d | not maxed in 70d |
| Casual \+ capped purchases | maxed day 58 | maxed day 58 | maxed day 66 |
| Committed \+ capped purchases | maxed day 58 | maxed day 58 | maxed day 58 |

Day 58 is the floor — 696 level\-ups at 12 per day. Nothing in the game can beat it.

### Recommendation: Curve 1, Gentle

It is the only one of the three that satisfies your own stated rules.

- **It fits under the 119 ceiling** (top band 115), so a capped purchaser can fund a full twelve level\-ups on their most expensive day and never more than twelve on any day. Money reaches the cap exactly and stops there.
- **A committed free player reaches the floor on day 58**, identical to a maximal spender. That is your rule *"every normal active player must be able to earn enough upgrade resources through ordinary play to reach the same daily cap"* actually holding, rather than being asserted.
- **A casual player falls short and money closes the gap.** That is the honest, defensible thing to sell: not power, not exclusivity, not a higher ceiling — just the time you did not have.

Curves 2 and 3 both fail the same way. Under Moderate, a committed free player **cannot** max in a season, so money becomes necessary rather than optional. Under Steep, money is necessary and still slow. Both violate the rule that ordinary play must reach the same daily cap.

**The upper bound on what you can sell in a season is $4,464** under Gentle — the full draft cost. Past that there is nothing left to buy, which is the correct shape for a game with a shared power ceiling.

## 4\. Command Credit earn schedule

Built to track the curve rather than run ahead of it. Sources map onto Season 1 content already specified in your design documents.

| Source | Unlocks | Per day, committed |
| --- | --- | ---: |
| Rogue Patrols | Week 1 | 240 |
| Salvage Runs | Week 1 | 120 |
| First victory of the day | Week 1 | 60 |
| Convoy Contracts | Week 1 | 180 |
| Power Nodes | Week 2 | 120 |
| Alliance Operations contribution | Week 3 | 190 |
| Factory yield share | Week 5 | 250 |
| War\-window participation | Week 6 | 240 |
| **Total at full unlock** |  | **1,400** |

Early game a committed player earns roughly 420/day against a capped day costing 360 — comfortably at the cap. At full unlock they earn 1,400 against a capped day costing 1,380. The two curves track each other by design, which is what keeps the cap reachable at every stage without ever being trivially exceeded.

**A casual player earning around 45% of these rates** falls short from mid\-game onward. That gap is where Tokens have a legitimate job.

### The anti\-stockpiling property, and its cost

Earn scales with **progression**, not with calendar time. A player who idles for a week does not accumulate a war chest, because their unlock state and base development have not moved. That removes the late\-season dump that killed the previous linear model.

**The trade, stated plainly:** it also makes returning after a break hard. Someone who misses two weeks comes back earning at their old rate against opponents earning at a higher one, and catching up through play alone is slow.

That is not accidental, and it is worth being deliberate about: **it gives Tokens their most defensible role — catching up after time away, rather than getting ahead.** If you would rather soften it, the lever is a partial catch\-up bonus on the earn rate for returning players, which I would recommend keeping small and would want to design separately.

## 5\. Purchase reservations

Prevents two tabs, a slow browser return, or parallel checkout sessions from exceeding the weekly cap. Web\-only, per your scope.

### Table

`token_reservations` — `id`, `player_id`, `package_id`, `tokens`, `created_at`, `expires_at`, `consumed_at`, `provider_session_id`.

**Lifetime: 20 minutes.** Long enough for a real card payment including a 3\-D Secure challenge, short enough that an abandoned checkout returns capacity while the player is still in the same sitting.

### Capacity

```math
\text{remaining} = 10{,}000 - \text{credited this RST week} - \text{active unexpired unconsumed reservations}
```

Both terms are computed from the ledger and the reservation table at read time. No stored counter, nothing the client can influence, no reset job.

### Creating a reservation atomically

The capacity check and the insert are one statement, so two tabs cannot both pass a check that only one should:

```sql
INSERT INTO token_reservations
  (id, player_id, package_id, tokens, created_at, expires_at)
SELECT ?1, ?2, ?3, ?4, ?5, ?6
 WHERE ?4 + COALESCE((
         SELECT SUM(tokens) FROM token_ledger
          WHERE player_id = ?2 AND source = 'purchase' AND created_at >= ?7
       ), 0)
     + COALESCE((
         SELECT SUM(tokens) FROM token_reservations
          WHERE player_id = ?2 AND consumed_at IS NULL AND expires_at > ?5
       ), 0)
    <= 10000
```

Zero rows inserted means the package would breach the cap and checkout does not start. `?7` is the RST week boundary.

### Consuming it

On verified payment, one conditional update decides everything:

```sql
UPDATE token_reservations
   SET consumed_at = ?1
 WHERE id = ?2 AND consumed_at IS NULL
```

Zero rows affected means it is already consumed — a replayed webhook — and no credit is written. One reservation becomes at most one Token credit, which is your requirement, enforced by the database rather than by the handler being careful.

The provider transaction id keeps its own `UNIQUE` index as a second, independent guarantee. Two mechanisms, because a payment credited twice is worse than a payment credited late.

### Expiry needs no job

Expired reservations are excluded by `expires_at > now` in the capacity query. They are never deleted, which leaves the audit trail intact and matches the settle\-on\-read model the rest of the game uses.

### The one case that needs your ruling

**A payment verifies after its reservation has expired** — a slow provider, a delayed webhook, a player who left the tab open through lunch.

The money has been taken. Refusing the credit means charging for nothing, which is not acceptable at any cap.

**My recommendation: credit it.** If it fits in the current week's capacity, credit normally. If it does not, credit it anyway, allow the overrun, log it as a cap breach, and block further purchases until the window clears. The alternative is a refund the player did not ask for, on a purchase that succeeded, caused by our timeout rather than their behaviour.

Same shape as the storefront case, arrived at independently — which suggests it is the right answer rather than a workaround.

## 6\. Still open

1. **Confirm Monday 00:00 RST** (§1) — everything about the wallet display depends on it.
2. **Approve Curve 1** (§3) and the earn schedule (§4). They are one decision; approving the curve without the schedule leaves the fairness claim untested.
3. **Whether to soften the returning\-player penalty** (§4) with a small catch\-up bonus.
4. **Late\-verifying payment past reservation expiry** (§5) — credit and allow the overrun, or refund.
5. Payment provider, selling entity and tax treatment — unchanged, still unanswered, still blocking Stage 6 only.

Nothing here changes the staged plan. Stage 0 still needs only its own approval.
