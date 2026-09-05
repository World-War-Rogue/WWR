# Medal economy and alliance awards — implementation plan

PLAN AND BLOCKERS — NO CODE WRITTEN

Read against the live repository at `6f7cb4c`. Supersedes the Command Credit
naming in `09`–`13`; the cost curve in `docs/progression/04` and `06` is affected
and §2 says how.

---

## 0. Three numbers before anything else

### 0.1 A squad is six assets, not four

`SQUAD_SLOTS = 6` and `SQUAD_COUNT = 4`, so the draft is twenty-four
(`shared/assets.ts`). The brief's "complete four-asset squad: about 5,200" is
`4 × 1,300`. At six slots:

| | Assets | Cost |
| :--- | ---: | ---: |
| One asset, fully developed | 1 | 1,300 |
| A complete squad | 6 | **7,800** |
| A full draft, four squads | 24 | **31,200** |

Everything below uses 31,200 as the season target. If the intent really was four
assets per squad, that is a change to `SQUAD_SLOTS` and to every squad screen,
not a cost question — see blocker 1.

### 0.2 The economy hole narrows again, and still does not close

Against the approved earn schedule — 420/day in week 1 rising to 1,400/day from
week 6, **77,000 across a 70-day season** — a full draft at 31,200 clears on
**day 38 of 70**, leaving 45,800 unspent.

That is real progress. Service Rank alone cleared on day 15; adding the four
packages moved it to roughly day 25; these costs move it to day 38. But a
committed player still finishes everything with **four and a half weeks of the
season left** and nothing to spend on.

### 0.3 The prestige problem, which is the finding that matters

At the approved late-season rate of 1,400 Medals per day:

| Award | Medals | Worth, in ordinary play |
| :--- | ---: | :--- |
| Distinguished Service Cross | 1,000 | **17 hours** |
| Silver Star | 250 | 4.3 hours |
| Bronze Star | 50 | **54 minutes** |
| Arena win | 5 | 5 minutes |

**A true Season Finale award, given only to exceptional contributors to the Core
victory, is worth less than a day of ordinary play.** A Bronze Star for
"exceptional contribution and battle support" is worth under an hour. The
denominations and the earn rate are describing two different games.

This is not an argument against the denominations. They are well chosen — a
1:5:20:50:250:1000 ladder reads clearly and each step feels like a step. It is an
argument that **the routine earn rate is roughly three times too high for them.**

### The fix, and it closes §0.2 as a side effect

Bring total season income down to about a full draft, so finishing the draft
takes the season:

- **Flat 446 Medals per day** across 70 days is 31,220 — a full draft, exactly.
- A Distinguished Service Cross becomes **3.2%** of everything a player earns all
  season. That is a finale award.
- A Silver Star is 0.8%, a Bronze Star 0.16%. Small, but they are mid-tier awards
  and they sit on top of routine income rather than replacing it.
- And the surplus disappears: there is no longer a month of the season with
  nothing to buy.

A flat rate is the illustration, not the proposal — late-season activity should
still pay more than week one. A ramp from roughly 300 to 600 averages the same.
What matters is the **total**, which needs to come down from 77,000 to near
31,000, and that is a change to the approved earn schedule in
`docs/progression/06` §3.

### One more, for the record

At the 10,000-per-week Token ceiling a payer clears a full draft in **3.1 weeks**
against a free player's ten. That gap is wider than the old model's, where a
payer ran a few days ahead. It is bounded by the Season Readiness Band — being
finished early buys nothing above the band, which does not reach 10 until week 9
— so what money buys is still time rather than ceiling. But the band is now doing
much more of the work, and the band-tracking projection in `06` §2–3 has to be
re-run against these numbers rather than assumed to carry over.

---

## 1. What "Medals replace Command Credits" means in the code

### One balance, renamed in the string table

Medals are worth exactly one Token in spending, as Command Credits already were.
So this is a **rename, not a new system**: the balance column keeps its name and
displays as Medals, per the rule settled in `09` §0.1 — renaming a live column
buys nothing and costs a migration, and the i18n generator treats a renamed key
as a new one, losing every hand-correction in nineteen languages.

The denominations are **award sizes, not balances**. A Bronze Star grants 50
Medals into the one balance. There is no separate Bronze Star wallet, no
conversion, no rarity.

### But the award record is separate from the balance, and permanent

This is the part the brief implies without stating, and it matters.

If an award only credits a balance, then **spending the Medals erases the
commendation.** A player who earned a Silver Star in the Core operation and spent
it on Armament has no record they ever earned it.

So a grant writes two things:

- **`player_awards`** — permanent, one row per operation award: operation, grade,
  recorded contribution, instant. Never decremented, never spent. This is the
  commendation record, and it is what a profile shows.
- **The spendable balance** — incremented by the denomination's value.

That split also makes Medal of Honor and Purple Heart trivial to add later as
non-spendable prestige: they are award rows with no balance effect.

---

## 2. Costs

Per the brief: about 700 for Service Rank 1→10, about 600 across the four
packages, 1,300 per asset. Both live in the shared economy catalogue with the
rest of the tuning, and both are provisional until §4.

Two constraints that fall out and should be checked rather than assumed:

- **Packages cannot exceed Service Rank**, so the two tracks are not independent.
  600 across four packages is 150 each, over nine steps — about 17 a step against
  a Service Rank step averaging 78. Service Rank upgrades being more expensive
  than package upgrades, as the brief requires, holds comfortably.
- **The most expensive single upgrade** lands around 130–150 at the top of the
  Service Rank curve. Worth knowing because `docs/progression/04` derived a
  119 ceiling from a daily throughput cap — but that cap was subsequently
  dropped, so the derivation is moot rather than violated. Noting it so nobody
  rediscovers it as a conflict.

---

## 3. Alliance awards

### The ledger already exists in design

`07-READINESS-BAND` §3 specified `season_objective_contributions` as append-only,
never updated, never deleted, with progress computed from the ledger on read. The
award system reads the same ledger. Nothing new is stored per player.

### The quota freezes when the window opens

The quota scales from eligible active membership **at window open**, and is
written once. It must not track membership live, for the same reason the Colossus
integrity pool freezes on first read: otherwise joining an alliance late changes
everybody's quota retroactively, and a player who met their quota at hour two can
fail it at hour six because two people joined.

Same shape as `marches.units` freezing a roster and `marches.readiness_band`
freezing the band — a conditional write that only lands once
(`quota IS NULL`).

### Grading

Grade is a pure function of recorded contribution, the frozen quota, and the
operation's absolute threshold. Server-computed on read, never client-scored,
never officer-selected, never random:

| Grade | Condition |
| :--- | :--- |
| none | no qualifying contribution |
| Achievement / Commendation | meaningful, below quota |
| Meritorious Service | met the quota |
| Bronze Star | clearly exceptional contribution and support |
| Silver Star | top qualifying performer **and** above a high absolute threshold |
| Distinguished Service Cross | exceptional Core contributor, championship alliance only |

**The absolute threshold on the top two grades is the load-bearing part**, and it
is the direct answer to the low-population problem in `07` §4: without it, a
two-person alliance where one player does anything at all is by definition the
"top performer" and would collect a Silver Star for trivial activity. Ranking
alone never awards the top two.

### Settlement

On read or on a claim action, never a scheduled job — the same rule as every
timer in this codebase. `UNIQUE(operation_id, player_id)` on the awards table
means an account receives each operation award once, and it is the index rather
than a check that enforces it, so two tabs claiming at the same instant are
separated by the database.

That index also implements "cannot earn from more than one alliance for the same
operation window" for free: one award row per player per operation, whichever
alliance it was earned in.

### Leaving

Contribution is immutable once made and stays credited to the alliance it was
made for — already settled in `07` §3, and it exists to close a griefing vector
where somebody contributes, waits for the window to nearly close, and leaves to
void the capture. A player who leaves keeps their eligibility for that operation.

### Arena

A valid win grants a Commendation Medal, 5 Medals. Repeat wins against the same
opponent stop paying inside the server-day window — which is the existing rule
that Command Credits "cannot be farmed through repeated matches against the same
account", now with a number attached. The window is a server-day in Rogue
Standard Time, UTC-7, so it rolls at the same instant for everyone.

---

## 4. What simulation has to settle first

The harness exists and five assertions already fail the build. These are
economy rather than combat, so they belong in a sibling script sharing the
catalogue:

1. **A committed free player tracks the Readiness Band.** The check from `06`
   §2–3, re-run against 1,300 per asset and the revised earn schedule. If they
   fall behind the band, the season is unplayable for anyone who does not pay.
2. **The draft takes the season.** Full completion lands near day 70, not day 38.
3. **A late joiner can still reach the band.** `06` §4 found a week-6 joiner
   needed twenty-five days to reach that week's cap; the below-cap earn
   multiplier proposed there needs re-checking against these numbers.
4. **Awards are a garnish, not the income.** Total award value across a season
   should be a small fraction of routine income, or the alliance system becomes
   the only way to progress and a soloist is locked out.
5. **The top two grades are unreachable by trivial activity** at every alliance
   size from two to a hundred.

Nothing is locked before these are green. That is the whole reason Stage 0 exists.

---

## 5. Blocking questions

**1. Is a squad six assets or four?** The brief prices "a complete four-asset
squad". The code has six slots and a twenty-four asset draft, and every squad
screen, the lift budget and the combat harness assume six. If six is right, the
figure is 7,800 and a draft is 31,200. If four is right, that is a change to
`SQUAD_SLOTS` with wide consequences, and it should be made deliberately rather
than inferred from a cost table.

**2. Does the approved earn schedule come down?** §0.3 is the argument that it
must, from 77,000 to near 31,000. It closes the surplus and makes the medal
denominations mean what they say. But it is a real cut to how much a day of play
pays, and it supersedes an approved document.

**3. What counts as an "eligible active" member for the quota?** Signed in during
the window? Contributed anything? Placed on the map? A generous definition
inflates the quota and punishes small alliances; a tight one lets a large
alliance shrink its own quota by having members go quiet.

**4. Do Achievement and Commendation split on a rule, or is Commendation just the
higher of the two below-quota bands?** The brief lists them together. I would make
Achievement any qualifying contribution and Commendation half the quota, but that
is a number rather than a principle.

**5. Do awards exist outside seasonal operations?** The Arena grants a
Commendation Medal, and operations grant graded awards. But routine income —
Daily Operations, PvE, the thing that actually pays 446 a day — has no
denomination attached. Is that simply an unnamed Medal trickle, or does every
grant carry a denomination? I read it as a trickle, with named medals reserved
for awards worth recording.

---

## 6. Not doing

No separate medal wallets. No random or rarity-based awards. No officer-selected
rewards. No background job or scheduled settlement. No client-computed score. And
Medal of Honor and Purple Heart stay out entirely — reserved, if ever added, as
permanent non-spendable prestige with no power attached.
