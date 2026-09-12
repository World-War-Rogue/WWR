# Season Combat Cap — Progression Model

FIVE REQUIRED PROJECTIONS — NO CODE WRITTEN

Items 1–4 are currency arithmetic and do not depend on the resolver, so they are answered now rather than after Stage 0. Item 5 is answered as far as it can be before the step function is fixed, and I say where the limit is.

**The cap works.** Under the recommended curve, a committed free player sits at **exactly the Season Combat Cap every single week** — identical to a player holding three months of saved Tokens. The stockpiler gains nothing at all against someone who plays.

The gap that remains is against the *casual* player, who finishes the season at effective level 21 against everyone else's 30. That is the honest thing being sold: not power over people who play, but time for people who can't.

## The curve this is modelled on

Three candidates, judged by one test: **can a committed free player reach each cap on the week it opens?**

| Band | A′ Light | **B′ Tracking** | C′ Heavy |
| --- | ---: | ---: | ---: |
| 2–5 / 6–10 | 20 / 35 | **25 / 45** | 30 / 60 |
| 11–15 / 16–20 | 55 / 75 | **70 / 100** | 95 / 140 |
| 21–25 / 26–30 | 100 / 130 | **140 / 190** | 200 / 280 |
| Full 24\-asset draft | 49,320 | **67,800** | 95,880 |
| In USD | $4,932 | **$6,780** | $9,588 |
| Free player vs cap schedule | 2–13 days **ahead** | **0–5 days behind** | 14–22 days behind |

**A′ is too cheap.** A free player runs ahead of the cap all season and finishes thirteen days early, so the cap is the only limiter and Tokens buy literally nothing. Perfectly fair, unsellable.

**C′ is too dear.** A free player is up to twenty\-two days behind and never reaches level 30 within the season. Payers are permanently above them.

**B′ tracks.** A free player is between zero and five days behind each new cap, and closes to zero by week 10. Money buys a few days of readiness at each step. Real, visible, not decisive.

A committed free player earns **77,000 Command Credits** across a 70\-day season on the earn schedule below; B′ costs 67,800. The margin is deliberate and thin.

## 1\. Real levels owned at season end

Ownership is uncapped, per your rule. This is what each player actually holds.

| Player | Currency acquired | Real draft level |
| --- | ---: | ---: |
| Committed free | 77,000 CC | **30** |
| Casual free (45% activity) | 34,650 CC | **21** |
| Weekly buyer, 10 weeks | 100,000 Tokens | **30** |
| Three\-month saver | 130,000 Tokens | **30** |

Three of the four own a maxed draft. Ownership is not where the difference lives.

## 2\. Effective Season combat level, week by week

This is where it lives.

| Week | Cap | Committed free | Casual free | Stockpiler |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 5 | 5 | 3 | 5 |
| 2 | 5 | 5 | 5 | 5 |
| 3 | 10 | 10 | 8 | 10 |
| 4 | 14 | 14 | 10 | 14 |
| 5 | 18 | 18 | 12 | 18 |
| 6 | 22 | 22 | 15 | 22 |
| 7 | 25 | 25 | 17 | 25 |
| 8 | 27 | 27 | 19 | 27 |
| 9 | 29 | 29 | 20 | 29 |
| 10 | 30 | 30 | 21 | 30 |

**The committed free column and the stockpiler column are identical in every week.** A player who saved 130,000 Tokens across three months and a player who simply played has exactly the same Season combat strength, all season.

The casual player's week\-1 deficit (3 against 5) closes by week 2 and then reopens permanently from week 3 onward. That is the shape of the paid advantage, and it is against inactivity rather than against play.

## 3\. Command Credits needed to reach each cap

| Week | Cap | Currency needed | Committed free reaches it | Lag |
| ---: | ---: | ---: | ---: | ---: |
| 3 | 10 | 7,800 | day 15 | 0 days |
| 4 | 14 | 14,520 | day 23 | \+1 |
| 5 | 18 | 23,400 | day 32 | \+3 |
| 6 | 22 | 34,920 | day 40 | \+4 |
| 7 | 25 | 45,000 | day 48 | \+5 |
| 8 | 27 | 54,120 | day 54 | \+4 |
| 9 | 29 | 63,240 | day 61 | \+4 |
| 10 | 30 | 67,800 | day 64 | 0 |

The earn schedule this assumes, tied to Season 1 content already in your documents:

| Unlocks | Sources added | Per day |
| --- | --- | ---: |
| Week 1 | Rogue Patrols, Salvage Runs, first victory | 420 |
| Week 2 | Convoy Contracts | 600 |
| Week 3 | Power Nodes, Alliance Operations | 910 |
| Week 5 | Factory yield share | 1,160 |
| Week 6 | War\-window participation | 1,400 |

The maximum lag is five days, mid\-season, and it closes by the finale. A payer spends roughly **$680 to erase four or five days** of readiness at each step — visible enough to be worth buying, small enough that nobody is locked out.

## 4\. Catching up — and the problem that is larger than stockpiling

**Joining during protected onboarding is fine.** Reaching the week 1–2 cap of level 5 costs 2,400 currency, which is four to six days of committed play. A player who joins on day 10 is at cap before week 3 opens.

**Joining later is not fine, and this is the finding I would act on first.**

| Joins | Cap that week | Currency needed | Days of committed play to reach it |
| ---: | ---: | ---: | ---: |
| Week 1 | 5 | 2,400 | 6 |
| Week 2 | 5 | 2,400 | 4 |
| Week 4 | 14 | 14,520 | 15 |
| Week 6 | 22 | 34,920 | 25 |
| Week 8 | 27 | 54,120 | 39 |

A player joining in week 6 needs **twenty\-five days** to reach that week's cap — by which time the cap has moved twice more. A week\-8 joiner needs thirty\-nine days and never catches up within the season.

**With a hundred testers arriving on their own schedule, late joining will hurt you far more than stockpiling will.** The stockpiler, as §2 shows, gains nothing against an active player. The week\-6 joiner is permanently behind everybody through no fault of their own, and they are the ones most likely to quit.

**Proposed fix — a below\-cap earn multiplier.** A player whose effective level is under the current Season Combat Cap earns Command Credits faster, scaled to how far below they are. It applies to everyone below the cap regardless of how they got there, so it is not a paid or unpaid mechanic. It is not a spending limit and it caps nothing.

It also solves the returning\-player problem I raised earlier — someone back from two weeks away is below cap by definition and gets the same help. **One mechanism, two problems.**

I have deliberately not picked the multiplier. It needs its own modelling round against the fixed resolver, and I would rather propose the shape than guess the number.

## 5\. Do counters and tactics stay meaningful inside each band?

**Structurally, yes — and I can show it.** I ran a balanced 24\-asset draft against a lopsided one (artillery and drones only, no close band) at every cap level, same level on both sides:

| Cap level | Balanced power | Lopsided power | Ratio |
| ---: | ---: | ---: | ---: |
| 5 | 3,864 | 3,198 | 1\.208 |
| 14 | 6,312 | 5,208 | 1\.212 |
| 22 | 8,928 | 7,416 | 1\.204 |
| 30 | 11,670 | 9,684 | 1\.205 |

**The composition advantage is identical at every cap — 1.20× at level 5 and 1.20× at level 30.** That is not a coincidence: `attributeAtLevel` is a uniform multiplier, so levelling scales both squads by the same factor and never changes their relative shape. The counter web and the lift budget are both level\-independent.

So capping combat to level 5 in week 1 does **not** flatten tactics. It scales the whole fight down and leaves every compositional decision exactly as sharp as it is at level 30. That is a genuinely good property of the cap and it was not obvious in advance.

**Where I have to stop.** "Meaningful" is currently binary. The balanced squad wins 100% of the time at every band, because 1.20 sits above the step\-function threshold of about 1.14. Whether a *marginal* composition edge — 1.05, say — produces a meaningful win rate rather than an automatic draw cannot be answered until Stage 0 replaces the step with a slope. That is the one part of item 5 that has to wait.

## 6\. Recommendation

1. **Approve Curve B′ provisionally** — 25 / 45 / 70 / 100 / 140 / 190, full draft 67,800.
2. **Approve the earn schedule in §3** alongside it. They are one decision.
3. **Add a below\-cap earn multiplier** for late joiners and returning players, shape as described, number to follow.
4. **Build Stage 0**, then re\-run §2, §3 and the open half of §5 against the repaired resolver before anything is priced permanently.

The cap schedule you proposed needs no changes. It lines up with the earn curve almost exactly, and the fact that a committed player lands within five days of every step without any tuning suggests the weekly cap levels were well chosen.

## 7\. Still open

- Curve B′ and the earn schedule — approve together or send back.
- Below\-cap earn multiplier — yes in principle?
- **Monday 00:00 RST** — still unconfirmed, and the wallet display depends on it.
- Late\-verifying payments, payment provider, selling entity and tax — unchanged.
