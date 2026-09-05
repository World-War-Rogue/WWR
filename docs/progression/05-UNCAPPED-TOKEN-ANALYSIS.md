# Uncapped Token Model

MEASURED AGAINST THE REAL RESOLVER — NO CODE WRITTEN

Daily throughput cap removed as instructed. Six cases modelled across three curves. One finding outranks all of it.

## 1\. What the resolver actually does

I ran `shared/combat.ts` directly — the shipped resolver, the shipped catalogue, a 24\-asset draft, thousands of seeded battles. This is measurement, not reasoning.

**The seed does not change who wins.** Five thousand distinct seeds against the same matchup produced **one outcome, every time**. The seed shuffles *which* defenders take damage (losses varied 0–5 of 24). It never changes the result.

**Combat is a step function on power ratio, not a slope.**

| Power ratio | Result |
| --- | --- |
| Below ≈ 1.11 | **Draw, always** |
| Above ≈ 1.14 | **Attacker wins, always** |

There is no probabilistic middle. None.

Measured thresholds, two independent sweeps agreeing:

| Attacker | Defender | Power ratio | Outcome |
| ---: | ---: | ---: | --- |
| L30 | L26 | 1\.146 | attacker, 100% |
| L30 | L27 | 1\.103 | **draw, 100%** |
| L20 | L17 | 1\.133 | attacker, 100% |
| L20 | L18 | 1\.076 | **draw, 100%** |

Three consequences you should sit with:

1. **"Controlled luck" does not exist.** Your direction asks for *"close\-match tension that remains replayable and fair."* Close matches are currently 100% draws. The luck is cosmetic — it decides who gets scratched, never who wins.
2. **Every battle runs the full five rounds** and a decisively beaten defender loses at most 5 assets of 24. Combat is barely lethal.
3. **Mirrored max\-level configurations are neutral** — your requirement holds, but trivially, because everything near\-mirrored is a draw.

This is a Stage 0 finding and it changes the token analysis below, so it comes first.

## 2\. The token model in one line

Because 1 Token \= 1 Command Credit, there is only one comparison:

**Purchased: 10,000 per week \= 1,429 per day.**
**Earned: 420 per day rising to 1,400 per day as sources unlock.**

They are the same order of magnitude. A player who pays at the cap acquires currency at roughly the rate of a committed player who plays — so **paying and playing together is a 2× rate, not a 10× one.**

And there is a hard ceiling at level 30. Money buys **time**, never headroom.

Saving does not break this. Someone who saves 13 weeks of purchases arrives with 130,000 Tokens. A committed free player who *played* those same 13 weeks arrives with about the same in Command Credits. **The stockpiler is not ahead of the player — they simply skipped the game.** The dangerous profile is the one who plays *and* pays for three months, and that is the 2× case.

## 3\. Six cases, three curves

Costs are stepped by level band; the draft climbs together.

| Band | **A Cheap** | **B Middle** | **C Deep** |
| --- | ---: | ---: | ---: |
| 2–5 / 6–10 | 15 / 30 | 30 / 65 | 55 / 120 |
| 11–15 / 16–20 | 50 / 70 | 110 / 160 | 210 / 310 |
| 21–25 / 26–30 | 95 / 115 | 215 / 280 | 430 / 560 |
| **Full 24\-asset draft** | **44,640** | **102,480** | **200,880** |
| Cost in USD | $4,464 | $10,248 | $20,088 |

### Where each case lands

Draft level reached, with percentage of maximum power in brackets.

| Case | A Cheap | B Middle | C Deep |
| --- | --- | --- | --- |
| 1 — Committed free, 10 weeks | **30\.0** (100%) | 19\.6 (70%) | 13\.0 (53%) |
| 2 — One week bought (10k) | 14\.1 (56%) | 9\.6 (44%) | 6\.6 (37%) |
| 3 — Bought every week, 10 weeks | 30\.0 (100%) | 29\.6 (99%) | 21\.7 (76%) |
| 4 — Saved 3 months, spent at once | 30\.0 (100%) | 30\.0 (100%) | 24\.6 (85%) |
| 5 — Saved *and* played 3 months | 30\.0 (100%) | 30\.0 (100%) | 28\.3 (95%) |
| 6 — Committed free \+ bought weekly | 30\.0 (100%) | 30\.0 (100%) | 25\.1 (86%) |

### Can a saved balance create an insurmountable gap?

**Yes. Measured, not estimated.** A level\-30 draft against a level\-1 draft: **100% attacker wins across every seed, 23.7 of 24 attackers undamaged.** A player who dumps three months of saved Tokens on day one of a season is unbeatable by anyone who started that season normally.

The one thing that blunts it — and it is a defect, not a design:

Because the win threshold is a power ratio of about 1.14, a defender only has to reach **draft level 27** to be un\-beatable by a maxed attacker. Level 27 costs **80% of a full draft** on every curve.

So under the current resolver, a free player at 80% of max currency **cannot lose** to a payer at 100%.

**Do not bank on this.** It is a consequence of the step function above, which Stage 0 exists to fix. When close battles stop being automatic draws, this cushion disappears and the full slope is exposed.

## 4\. The tradeoff, stated plainly

You asked me not to disguise this as fairness. I won't.

**With no throughput cap, two goals you have both stated are in direct conflict:**

- A committed free player should reach the ceiling within a season.
- A saver should not be able to reach the ceiling on day one.

Only **Curve A** satisfies the first — it is the only curve where a committed free player maxes inside ten weeks. And Curve A fails the second worst of the three: 130,000 saved Tokens against a 44,640 draft means the saver maxes instantly with 85,000 left over.

Only **Curve C** satisfies the second — a saver reaches 85%, not 100%. And it fails the first badly: a committed free player finishes the season at level 13, barely half power, permanently beatable by anyone who paid.

**Curve B fails both.** A committed free player reaches 19.6 while a weekly payer reaches 29.6 — a power ratio of 1.41, well above the win threshold, so the payer beats them 100% of the time all season. And a saver still maxes on day one.

**The daily throughput cap was the thing making both goals achievable at once.** It decoupled currency from speed: money bought the currency, the cap bought the time, and both players arrived on day 58.

Remove it and currency *is* speed. Then any price low enough for a free player to finish is low enough for a saver to finish instantly, and any price high enough to stop the saver is high enough to strand the free player.

That is arithmetic, not preference. It cannot be priced around.

## 5\. What I would recommend, given the constraint

If the no\-cap rule stands, **Curve A is the least bad**, and you should adopt it knowing exactly what you are buying:

- A committed free player reaches maximum power on roughly day 58 and is competitive all season.
- A weekly payer reaches it around week 4.5 — **six weeks of dominance, then convergence.**
- A three\-month saver is unbeatable on day one and stays that way until free players cross 80%.
- Total revenue ceiling per player per season: **$4,464**, after which there is nothing to sell.

That is a real product: paid acceleration with a shared ceiling and eventual convergence. It is defensible and plenty of games ship it. It is **not** competitive balance, and the first six weeks of every season will visibly belong to whoever paid.

### One alternative that respects your constraint

You ruled out spending limits. A **season level gate** is not a spending limit — it is a content gate, applied identically to everyone regardless of currency source:

> Maximum attainable asset level rises with the season calendar. Weeks 1–2 cap at level 10, weeks 3–4 at 15, and so on to 30 in weeks 9–10.

It costs nothing to implement, adds no per\-player limit, and closes the day\-one dump completely: saved Tokens buy you straight to the current gate and no further. A saver arrives at week 1 capped at level 10 like everyone else, then converts their balance into being first to each new gate.

It also fits Season 1's existing shape — protected weeks 1–2, warfare from week 6 — where a level\-30 draft in week 1 makes no narrative sense anyway.

I am flagging it, not adding it. Say no and Curve A stands as described.

## 6\. What this does to the plan

Nothing in the staged order changes, and the measurement supports it:

**Stage 0 is now more urgent, not less.** Pricing a progression system against a resolver where the seed does not matter and close fights are always draws means pricing against a ruler that is not merely bent — it has one mark on it. Every number in §3 above would shift once combat returns a real distribution.

**Recommendation:** approve Curve A provisionally, build Stage 0, re\-run these six cases against the fixed resolver, and confirm the price then. The curve is one line of shared data; re\-deciding it after Stage 0 costs nothing. Shipping a price that was set against a broken resolver costs a season.

## 7\. Open

1. **Curve A provisional, or a different call** given §4 is a genuine tradeoff and yours to make.
2. **Season level gate** — yes or no. It is the only lever I can see that keeps both goals without a spending limit.
3. **Monday 00:00 RST** still unconfirmed.
4. Returning\-player catch\-up, late\-verifying payments, payment provider, tax — all unchanged from the previous document.
