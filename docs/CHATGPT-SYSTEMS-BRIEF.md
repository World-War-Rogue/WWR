# Designer brief request — buildings, buffs, and alliance buffs

The prompt below is written to be pasted to the designer whole. It is kept in
the repo because the facts in it are read off the code, and the day they stop
being true is the day this file needs editing rather than the day somebody
designs against a system that has moved.

Everything between the rules is the prompt.

---

# World War Rogue — design request: building purpose, buffs, and alliance buffs

You are the game designer on World War Rogue, a live-service mobile strategy
game. I implement what you design. Return a **design brief**, not code.

Read the whole of this before answering. The first two sections are facts about
the game as it exists right now — not aspirations — and several of them will
change what you would otherwise propose.

## How this game is built, and why it constrains you

These are not preferences. They are properties of the running system, and a
design that violates one cannot be implemented as written.

- **The server decides everything.** Anything the browser can compute, a player
  can edit. If a mechanic requires the client to be trusted, it does not exist.
- **Nothing ticks.** There is no cron, no background job, no queue. Every timer
  is stored as an **absolute completion instant** and settled when somebody next
  reads it. A battle that lands at 3am lands correctly because the next person
  to look at the map resolves it. So: **any mechanic you design must be
  computable from stored state plus the current time.** "Every hour, each player
  gains X" is fine — it is derived on read. "At midnight, pick the top ten
  alliances and award them" is much harder, and you should say so if you need it.
- **Uniqueness is a database index, never a check-then-write.** If two players
  can race for the same thing, the database has to be able to decide.
- **No rarity tiers.** This is the deliberate break from Last War. No item,
  asset, or buff is "legendary". Power comes from what you chose and what you
  invested in, never from what you rolled.
- **Nothing cosmetic grants power.** Settled, permanently.
- **Two currencies.** Command Credits (earned, displayed as Medals) and Tokens
  (bought). They spend on the same things and the player picks the split. The
  server never spends Tokens first.
- **Four resources:** fuel, steel, munitions, alloy. Produced per hour and
  settled on read.
- **Game time is Rogue Standard Time — UTC-7, fixed, no daylight saving.** 24-hour
  clock. Anything scheduled is published as `20:00 RST (UTC-7)`.

## What exists right now, precisely

### Bases and buildings

Six buildings, each max level 30. **The Command Post gates every other one** —
nothing may exceed its level. That single rule is the whole progression.

| Building | What it does today, in the code |
| :--- | :--- |
| **Command Post** | Gates every other building. Storage cap = 5,000 × 1.5^(level−1). Gives the defender a home-ground combat bonus of `+1.5% per level, capped at +25%`. |
| **Refinery** | Fuel per hour = 60 × 1.35^(level−1). |
| **Foundry** | Steel per hour, same curve. |
| **Barracks** | Munitions per hour, at one quarter of that curve. |
| **Motor Pool** | **Nothing.** |
| **Airfield** | **Nothing.** |

Motor Pool and Airfield used to raise a per-squad "lift budget" that capped what
you could field. That cap was removed on 2026-09-06 — any six assets now fit in
any squad — and with it went the only thing those two buildings did. Their
in-game descriptions still promise things that do not exist ("Unlocks heavier
tracked vehicles", "Sorties need runway length").

**Alloy is produced by nothing.** It is a resource with storage that cannot
currently be earned. The owner's intent is that alloy comes from **events and
similar** rather than from a building — treat that as settled and design the
sources.

Each building also carries a **power weight** used to compute the player's
public power rating: Command Post 60, Motor Pool 45, Airfield 45, Barracks 40,
Refinery 30, Foundry 30. The rating exists so other players can judge whether to
attack you, and it is deliberately weighted toward defence rather than economy.
**It is currently lying**: Motor Pool and Airfield raise it while doing nothing
defensive at all.

Upgrade time is `30 × 1.62^level` seconds, capped at three days, ×1.5 for the
Command Post.

### Squads and assets

- 72 assets in six categories (armour, artillery, rotary, fixed wing, drone,
  naval). 60 draftable in Season 1; the 12 naval are held back until there is
  water on the map.
- Five attributes: firepower, armour, mobility, range, detection. Each asset
  sits exactly on a point budget derived from its **lift**, so bigger assets have
  bigger numbers and cost proportionally more. Lift no longer limits squads; it
  still sets the point budget.
- Four squads — Alpha, Bravo, Charlie, Delta — six slots each. An asset sits in
  exactly one squad, enforced by a unique index.
- **Service Rank 1–50**, ten ranks per season, a geometric curve where a full
  season multiplies every attribute by 1.75. Permanent, and the ceiling for:
- **Four upgrade packages** — Armament (firepower), Protection (armour),
  Propulsion (mobility), Electronics (detection). Independent of each other,
  never above the asset's Service Rank, additive rather than multiplicative, and
  refundable in full.
- **System Integration**: a small flat bonus to all five attributes derived from
  the **lowest** package, so keeping all four up is rewarded and a single tall
  package pays nothing.
- **Season Readiness Band**: effective rank is clamped to the season cap in
  competitive play, so a rank-50 asset fights at the band like everyone else.

### Combat

A pure, deterministic five-round resolver. No map, no clock, no database.

- **A closed counter ring**: rotary beats armour, armour beats drone, drone beats
  artillery, artillery beats naval, naval beats fixed wing, fixed wing beats
  rotary. Perfect counter ×1.2, medium ×1.1.
- **A band-exposure penalty** punishes a squad with no answer to a range band.
  With the lift cap gone, this penalty is now the *only* pressure toward mixing a
  squad, where it used to be one of two. Bear that in mind.
- Home ground comes from the defender's Command Post, passed in by the caller.

### Marching

- A squad crosses one plot in 7 seconds at mobility 5, scaled by the **slowest**
  asset's mobility. Floor 45 seconds, ceiling 40 minutes.
- The roster is **frozen at launch**, so what marched out is what fights.
- Attacking your own alliance reinforces them instead: the squad garrisons at
  their base for 8 hours, then walks home. Every way home takes exactly as long
  as the way out took.

### Alliances

Up to 100 members. Three ranks: General, Lieutenant, Soldier. There is a shared
rendezvous marker, alliance chat, and a crest. **There is no alliance-wide
mechanical benefit of any kind today** — an alliance is coordination and
identity, and nothing else.

## What I need you to design

Four things. Treat them as one system, because they interact.

### 1. Give Motor Pool and Airfield a job

Not a placeholder. A reason a player levels them at the cost of not levelling a
Refinery. The obvious candidates — and you are not limited to these — are march
speed, repair or recovery after a battle, alloy production, and something that
differentiates air from ground.

Say for each building: what it does, the curve, and **what it should be worth
relative to the resource buildings**, since they compete for the same time.

Then tell me what the **power weights** should become. If a building does not
make you harder to attack, it should not claim to.

### 2. Building upgrades that a player can see

Right now upgrading a building changes a number in a list. Design what a level
should mean **visually on the base and on the map**, at what thresholds, and what
is legible at map zoom where a base is about 40 pixels and only its silhouette
survives. Be specific about which levels change the art, because each threshold
is art that has to be commissioned.

### 3. Buffs

There is no buff system at all. Design one, and be explicit about:

- **Sources.** What grants a buff — building levels, events, medals, items,
  time-limited operations?
- **Shape.** Flat or proportional? Which stat does it touch?
- **Duration.** Permanent, timed, or per-march? Timed buffs must be storable as
  an absolute expiry instant.
- **Stacking.** This is the question that decides whether the system survives
  contact. Do two of the same buff stack, refresh, or refuse? Does a buff stack
  with a package? With System Integration? State the rule once, plainly.
- **The ceiling.** What is the maximum a fully buffed player can reach over an
  unbuffed one? Give a number. Anything without a stated ceiling becomes
  unbounded the first time two systems multiply.
- **How a player sees them.** A buff nobody notices is a buff nobody values.

Nothing here may be purchasable in a way that grants power a non-paying player
cannot reach. Tokens may accelerate; they may not exceed.

### 4. Alliance buffs

This is the piece the game most obviously lacks, and the hardest to get right at
100 members. Design it, covering:

- **How an alliance earns them.** Held objectives, member participation,
  contributions, alliance level?
- **Who activates them**, given the General / Lieutenant / Soldier hierarchy —
  and what stops one officer spending everything.
- **Who benefits**, and whether a member who contributed nothing gets the same as
  one who carried the season. The medal economy already established that
  performance-based commendation beats giving all 100 members the same thing;
  say whether that principle applies here too.
- **How a 6-member alliance and a 100-member alliance are both viable.** If the
  buff scales with headcount, the game becomes "join the biggest alliance",
  which is the failure mode.
- **What happens when somebody leaves or is kicked mid-buff.**

### 5. Alloy

Design its sources, given that the owner wants it earned through **events and
similar** rather than produced by a building. What is it for? Right now nothing
consumes it. A resource that is earned and never spent is worse than one that
does not exist.

## How to answer

- **Numbers, or explicitly marked placeholders.** "A meaningful bonus" cannot be
  implemented. "+8% march speed per Motor Pool level, capped at +40%" can.
- **State every stacking and cap rule.** These are where systems like this fail,
  and they fail late.
- **Flag anything that needs something ticking in the background**, so I can tell
  you whether it is buildable or has to be reshaped.
- **Say what you are deliberately leaving out**, and why.
- **Order it for building.** What is the smallest first slice that is playable on
  its own, and what depends on what.

## Do not

- Do not reopen settled decisions: no rarity tiers, no cosmetic power, no
  pay-to-win, no removal of the counter ring, no change to Service Rank or the
  four packages, no naval content, no cross-server play.
- Do not design anything that requires a background job without saying so.
- Do not assume a player base larger than a handful of testers for the first
  slice. The game is in closed testing.
