# Season 1 — decisions, round 2

Continues `13-DECISIONS.md`. Twenty-two more answered in one sitting, closing
every open blocker in plans `14`, `15` and `16`.

**Two answers were not answers to the question asked — they were new systems.**
Ambush and the relocation inventory are both larger than what they replaced, and
each gets its own section below rather than a line in a list.

---

## Terrain props

**16. Props hide under occupied plots.** A plot holding a base draws no prop, so
nothing lands on a live player and no existing base is invalidated. Needs no
stored state. Consequence: a player who moves away sees the prop appear and
cannot move back to that plot.

**17. The salt flat is bare, except the stranded freighter.** No props on the
central flats other than the wreck the terrain already generates — the ship left
where the sea dried. One landmark on an otherwise empty pale expanse.

**18. `terrain_version` freezes per world, with an owner re-roll.** A world keeps
its layout forever, so a refactor can never move a pylon under somebody's base.
Plus an owner-only re-roll for tuning density on a test world during the beta.

**19. Batch 1 ships as soon as it is cut out; batch 2 by season week 3.** The
Factory Ring opens in week 3 and the Dominion Front in week 6, so the structures
are needed then rather than at launch. The map stops looking like a grid
immediately.

## Map interaction

**20. The base card shows the real base name.** `bases.name` exists in the schema
and is simply missing from the world payload; adding it is one field.

**21. Anchored callouts track their plot while panning**, clamped so they never
slide under Home or Reports.

## Ambush — a new system

Replaces "Join Assault". This is coordinated multi-player combat, which
`docs/COMBAT.md` §10 lists as open and describes as a large addition to the
resolver and the report. It is now Season 1 scope.

**22. Tapping an enemy base or target offers three actions: Attack, Ambush, or
Message.**

**23. Ambush opens a three-minute join window.** An Ambush button appears on the
right of the map for every alliance member. Up to four others may join, each
choosing which squad goes — five squads maximum.

**24. Joiners march to the initiator's base to gather.** Only squads that have
physically arrived within the three minutes take part. This makes ambush a
neighbourhood tool rather than an alliance-wide one, deliberately: a distant ally
cannot reach the staging point in time.

**25. The combined force then travels to the target at the initiator's squad
speed** — not the slowest joiner's. The initiator's position and mobility are
what the operation is built on.

**26. After the battle every squad returns independently to its own base**, at
its own pace.

**27. Losses are each player's own; rewards split by measured contribution.**
Consistent with the performance-based principle already set for alliance awards,
and it stops a passive joiner collecting a full share.

**28. Ambush targets enemy bases and season objectives**, with a per-event flag
so an individual operation can disable it where its own mechanics require.

### What this means for the resolver

The resolver takes two sides. Five attacking squads become **one assembled
attacker side** — which the pure-function design already permits, since the
caller assembles the units. So the resolver itself does not change; what changes
is attribution: the report must record which units belonged to whom, so losses
and recovery land on the right players and rewards can be split.

That attribution is new and it is the real work, not the combat.

## Relocation and the base inventory — a new system

**29. Relocations become a consumable charge.** A free allowance of roughly three
a week, **accumulating with no cap** — consistent with the existing rule that
Tokens never expire and have no balance ceiling.

**30. Extra charges cost the same in Tokens or Medals.** A player who plays buys
them exactly like a player who pays, so money continues to buy time rather than
advantage.

**31. Answering a Rendezvous consumes a charge, and charges replace the
thirty-minute cooldown.** One rule instead of two, and an alliance can answer two
calls in quick succession when it matters.

**32. The base view shows an inventory** carrying relocation charges and
Rendezvous charges.

**33. Scarcity is the whole mitigation for dodging.** Relocating while a hostile
march is inbound stays legal; it just costs a charge. Recorded plainly: **an
attack aimed at a placed player can still be voided by moving**, so attacking
remains unreliable against a defender holding charges. Accepted knowingly.

## Medals and the economy

**34. A squad is six assets.** `SQUAD_SLOTS` is 6 and the draft is 24. A complete
squad costs 7,800 and a full draft **31,200**. The "5,200 four-asset squad" in
the brief was four assets, not a squad.

**35. Season income comes down to about 31,000**, from the approved 77,000. A
full draft then takes the whole season, a Distinguished Service Cross becomes
3.2% of everything a player earns all year, and the four-week stretch with
nothing to buy disappears. **This supersedes the earn schedule in
`docs/progression/06` §3.**

**36. An asset reset returns full value, paid entirely in Medals.** Tokens spent
come back as Medals rather than Tokens.

> I flagged this as a route around the purchase cap and was wrong about the
> scale. Only **one asset may be reset per season**, so at most 1,300 can ever
> move from Tokens to Medals — against a 10,000-per-week purchase ceiling. The
> concern is negligible and the more generous rule is the better one.

**37. The quota scales from members who contributed, recomputed live** as people
take part.

> This has a failure mode: a player who met their quota at hour two can fail it
> at hour six because two more people joined. **Proposed resolution, which needs
> no further decision: a grade locks the moment it is reached.** Cross your
> quota and Meritorious Service is yours, whatever the quota does afterwards.
> Live recomputation stays, the unfairness does not. Implemented as a
> high-water mark on the awards row.

**38. Named medals are written only for ranked and competitive results** — Arena
wins, operation awards, the Core finale. Daily operations and PvE pay Medals to
spend but write no commendation, so a profile stays a record of achievement
rather than a log of attendance.

**39. The below-quota thresholds are deferred until costs are simulated.**
Where Achievement ends and Commendation begins is a tuning number, and it cannot
be set before the upgrade costs it is measured against. Correct call — it goes in
with the rest of the economy tuning after the simulation in `16` §4.

---

## Two things this opens that are not yet planned

**Ambush needs its own plan.** Sections 22–28 describe a system with a staging
mechanic, a join window, a two-leg march, an assembled combat side, per-player
loss attribution and a contribution-weighted reward split. None of that exists.
It is buildable and none of it changes the resolver, but it is a stage of work
rather than a feature, and it should be planned before it is written.

**"Tracked and ranked" implies a surface that does not exist.** The reasoning
behind decision 37 was that every event and exercise, by players independently
and by alliances, needs to be tracked and ranked. Contribution ledgers cover the
tracking. **Ranking — leaderboards, standings, where a player sits against their
alliance and the server — is not in any plan yet.** Flagged rather than silently
absorbed.
