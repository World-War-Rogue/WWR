# Readiness Band and Contribution Floor

IMPLEMENTATION PLAN AND EDGE CASES — NO CODE WRITTEN

Both mechanics are buildable and neither is large. The risks are not in the code.

## 1\. The Season 2 problem

A committed Season 1 player reaches **real level 30 across their whole draft by about day 64**. So does every weekly buyer and every stockpiler.

Season 2 opens at Readiness Band 5.

That player now owns everything, is gated to level 5 like a beginner, and **has nothing to buy and nothing to upgrade for ten weeks.** Their entire Season 2 progression is waiting for the band to rise.

The people this hits hardest are the ones who spent money.

This is not an argument against the band — the band is right, and §2 works. It is a consequence that arrives ten weeks after launch, when it is expensive to fix, and it should be decided now rather than discovered.

**Three ways out, in order of how ready they are:**

**Enable naval.** Twelve finished assets are already in `shared/assets.ts`, fully specified, held back by `draftable: false` with the comment *"Naval is held back until it has a sea."* Turning them on for Season 2 gives every veteran twelve assets at level 1 to build, and gives spenders something to spend on, with no new art and no new design. It is the cheapest answer by a wide margin and it is already written.

**Raise the permanent ceiling per season.** Level 30 in Season 1, 40 in Season 2. Straightforward, but it inflates forever and it breaks the "every asset reaches the same maximum" promise across seasons unless handled carefully.

**Season\-specific asset variants.** Most work, most design risk, and it edges toward the rarity ladder you have ruled out.

**I would enable naval and decide the ceiling question separately.** Either way it needs answering before Season 1 ships, because it changes what Season 1's ending feels like.

## 2\. Season Readiness Band — implementation

### Data

The band is **derived, never stored per player**. It comes from the season phase and server time, exactly like every other timed thing in this codebase.

`shared/season.ts` gains a pure function: given a season row and an instant, return the band. No migration for the band itself; it falls out of `season_windows` and the phase table already planned for Stage 5.

One column is needed where battles are recorded: `marches.readiness_band`, written at launch. That is the whole schema change.

### Where the cap applies

`resolve()` receives `{assetId, level}` pairs and neither knows nor cares where the level came from. So the cap is applied **when the battle input is assembled**, one line on each side:

```math
\text{effective level} = \min(\text{real level},\ \text{band recorded on the march})
```

The resolver stays pure and untouched, which is the property worth protecting. Nothing about the cap leaks into combat.

### The edge cases you specified, and how each falls out

**Band rises mid\-flight.** The march carries `readiness_band` from launch, so a phase change while a squad is in the air cannot alter the fight. Already how `marches.units` works — same pattern, one more column.

**Defender normalisation.** The defender is read live at settlement, per your earlier ruling, and their real levels are then clamped to the march's recorded band. So a defender may rearrange and react, and cannot out\-level the band by upgrading mid\-flight.

**Battle resolving after the season ends.** The march carries its band and its season id. Settlement computes the result but writes no seasonal ownership or award if the season has closed. The battle report still exists; it simply changes nothing.

**Season 2 starts.** Real levels persist; the new season's band schedule applies from its own phase table. Nothing to migrate.

### Two decisions this surfaces

**Which power number does the map show?** Other players decide whether to attack based on the power displayed next to a base. If that is real power, a maxed player looks unassailable in week 1 and nobody attacks them — even though they fight at level 5. If it is effective power, the map is honest and attack decisions are sound.

**My recommendation: season screens and the map show effective Season power; the profile and asset detail show both.** Otherwise the band is invisible where it matters most and players will misread every fight.

**Personal PvE at real levels — is the loop closed?** You allow real levels in personal showcase PvE *"when its rewards cannot create additional competitive power."* If PvE rewards are fixed per completion, that holds. If any reward scales with the power brought, it does not: real level → stronger PvE clear → more Command Credits → more real levels, a paid loop that routes around the band.

**Every PvE reward in Season 1 must be flat per completion, not scaled by performance.** Worth writing into the design as a rule rather than checking case by case.

## 3\. Contribution floor — implementation

### What the rule actually is

Stated as a 60% cap, but the binding half is the other one: **if no account may exceed 60%, the remaining contributors must together supply at least 40%.** For a two\-member alliance that means the second member must personally reach 40%.

That is the number to design against, and it is where the low\-population trouble is.

### Data

`season_objective_contributions` — `season_id`, `objective_id`, `window_id`, `player_id`, `alliance_id`, `amount`, `created_at`. Append\-only. Never updated, never deleted.

Progress and eligibility are **computed from the ledger on read**, in the same style you approved for Alliance Supplies. No stored progress counter, so no counter to drift or to race.

### Enforcing the cap

Each account's *counted* contribution toward an objective is `min(their total, 0.6 × requirement)`. The check is part of the write, so two tabs cannot both pass it:

```sql
INSERT INTO season_objective_contributions (...)
SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7
 WHERE ?6 + COALESCE((
         SELECT SUM(amount) FROM season_objective_contributions
          WHERE objective_id = ?2 AND window_id = ?3 AND player_id = ?4
       ), 0) <= ?8    -- 0.6 * requirement
```

Zero rows inserted means the account is at its ceiling.

**When an account is at its ceiling, refuse the action with a clear message rather than accepting effort that will not count.** Silently banking uncounted contribution is the worse experience — a player who spends an hour on something that does nothing will not report it as a bug, they will just stop playing.

### Contributions are immutable once made

A player who contributes and then leaves the alliance keeps that contribution credited to the alliance it was made for. The alternative — retracting on departure — creates a griefing vector where someone contributes, waits for the window to nearly close, and leaves to void the capture.

### "During that war window" must mean *within*, not *simultaneously*

Two members contributing six hours apart both count. Reading it as simultaneous presence would fail constantly across a hundred testers in different timezones, and would make the rule about scheduling rather than about coordination.

## 4\. Low\-population edge cases

These are where this design will actually hurt, given a hundred testers arriving on their own schedule.

**A two\-member alliance where one member is casual.** The whale can reach 60%. The casual member must reach 40% of a whole objective, alone, and Tokens cannot help them — by design. If they manage 30%, the alliance did 90% of the work and captures nothing.

That is the most likely failure in your beta, and it is a direct consequence of the 60/40 split. The whale cannot fix it with money, cannot fix it with effort, and will experience it as the game punishing them for having a quiet friend.

**Worth considering:** a lower floor for small alliances — the second contributor needs 40% in a two\-member alliance, but a three\-member alliance already only needs 20% each from two others. The rule is hardest on exactly the smallest groups. A floor of, say, 25% for the second contributor with the 60% cap intact would keep one account from carrying an objective while giving a two\-person alliance slack. I am flagging the shape, not proposing a number.

**Objectives sized for a population that has not arrived.** If a requirement is scaled for a ten\-member alliance, a two\-member alliance fails on absolute volume long before the percentage rule matters. Requirements should scale with eligible active members in the alliance, computed at window open, or small alliances are locked out by arithmetic rather than by rule.

**A window with only one member online for its entire duration.** Neutral and personal content works, per your direction. But if this is common, most windows produce nothing and the season feels empty. The Rogue Exercises fallback in your event design is the right answer and should be built alongside the first war window, not after it.

**A whale who joins a two\-person alliance and immediately hits 60% on everything.** Their partner is now permanently the bottleneck and knows it. Socially unpleasant in a way that percentages do not capture. Showing contribution as *"needs one more contributor"* rather than *"you are at your 60% limit"* frames it as a team state rather than a personal cap.

## 5\. Test plan for your eight requirements

Each is a harness assertion, not a human check, except where noted.

| \# | Requirement | How it is proven |
| ---: | --- | --- |
| 1 | L30 and L5 identical under a band of 5 | `resolve()` twice with real levels 30 and 5, band 5. Assert byte\-identical `CombatResult` including per\-unit damage. |
| 2 | Band rise gives correct effective power | `assetPower` at each band value equals `assetPower` at that level exactly. Sweep all nine band values. |
| 3 | Saved Tokens cannot exceed the band | Grant 130,000 Tokens, upgrade to real 30, fight under band 5, assert effective level 5 and identical result to a free player at real 5. |
| 4 | One account cannot exceed 60% | Attempt to contribute 61% in one action, then 60% plus 1% in two. Both refused at the write. |
| 5 | Two members can complete together | 60% \+ 40% completes. 60% \+ 39% does not. Assert both. |
| 6 | Solo member gets personal rewards | Solo contributor completes neutral content, receives personal reward, objective ownership unchanged. |
| 7 | Tokens buy no war authority | Assert no code path writes Alliance Supplies, factory output, war\-asset charges, contribution, or Core time from a token ledger entry. This is a **grep\-and\-review assertion**, and it should be a standing test that fails if a future change wires them together. |
| 8 | Battle inputs store the band used | Launch, force a phase change, settle. Assert the stored `readiness_band` equals the launch band and the result matches a replay at that band. |

Test 1 is the load\-bearing one and it is the cheapest: if a level\-30 asset and a level\-5 asset produce identical battle results under band 5, the entire mechanic is proven at its core.

**Human\-run alongside:** a real player with a maxed roster fighting a fresh account during band 5 and confirming it feels like a fair fight, and confirming the asset detail screen makes the two levels legible rather than confusing.

## 6\. Sequencing

Nothing here changes the staged plan. The Readiness Band belongs in **Stage 5** with Season 1, because it depends on the season phase table. The contribution floor belongs with the first capturable objective, which is Season 1 Stage C.

Both depend on Stage 0 — a band that clamps levels is only meaningful once combat returns a real distribution rather than the step function measured earlier.

## 7\. Decisions

1. **Season 2 content for maxed veterans** (§1) — enable naval, raise the ceiling, or accept ten idle weeks. I recommend naval.
2. **Map and season screens show effective power** (§2) — confirm.
3. **All Season 1 PvE rewards flat per completion**, never scaled by power brought (§2).
4. **The second\-contributor floor** (§4) — 40% as specified, or lower it for two\-member alliances.
5. **Objective requirements scale with eligible alliance size** (§4) — confirm, or small alliances are locked out by volume.
6. **Monday 00:00 RST** — still unconfirmed, four rounds running.
