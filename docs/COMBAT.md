# Combat — the design

The last pillar. This is what a battle is, what decides it, and what it costs.
Written before the code, the way the squads plan was, because the expensive
mistakes here are conceptual and none of them are visible until people are
already playing.

---

## 1. Everything starts at level 1

Every asset a player holds is level 1 the first time they log in, and every
asset levels on the same curve. There is no asset that starts ahead.

What differs between them is what they **are** — the shape of their five
attributes, their role, and what they cost in lift. That is the layer the
player chooses with, and it is untouched by progression: a Reaper is a
long-ranged fragile hunter at level 1 and at level 30, and levelling makes it
more of that rather than making it into a tank.

Levels come from events and purchases. Since everybody starts identical,
**the only thing separating two players in week one is what they put in their
squads**, which is exactly where the interest should be.

### The thing to be honest about

Assets do NOT have equal power at level 1. An Abrams has 26 attribute points
and a Switchblade has 10. They are not meant to be equal — they are meant to be
equally *efficient*, because the Abrams costs five lift and the Switchblade
costs one. Power per lift is flat across the catalogue on purpose.

So "no asset is stronger than another" means: **inside a lift budget, no choice
dominates.** It does not mean the numbers match. If lift ever stops binding,
that promise breaks, which is why the lift curve matters as much as the
attributes do.

---

## 2. What a battle is

**One squad marches. Everyone at home defends.**

An attack is a squad leaving your base and travelling the map to a target. It
moves at the speed of its slowest asset, so a squad built around tanks arrives
later than one built around helicopters, and the defender can see it coming.

The defender fights with **every squad still at home**. Squads that have marched
out are not there to help.

That single rule does more work than anything else in this document:

- Attacking is a real decision, because the squad you send is not defending.
- Scouting matters — a target whose squads are away is a target worth hitting.
- The rendezvous point stops being decoration. An alliance that rallies has
  bodies in one place; one that does not gets taken apart in sequence.
- Being asleep is survivable, because your squads are home while you are.

**Marching is visible.** A squad in transit is drawn on the map, in its owner's
allegiance colour, using the asset silhouettes already built. The defender gets
the same warning a real one would.

---

## 2a. The rules that go with marching

Four rules follow from "the squad you send is not defending". Each one exists
because the rule above is worth nothing if a squad can be in two places.

### You cannot move your base while a squad is out

Relocating with a column in the air would let you dodge every counter-attack:
send Alpha, get hit, jump three hundred plots, and the retaliation arrives at
empty ground. So the map refuses. The button says *Bring your squads home
first* rather than greying out, because a disabled control with no reason is a
bug as far as a player is concerned. The server refuses independently — the
label is a courtesy, not the check.

### You cannot attack your own alliance. You reinforce them

The same march, aimed at a teammate, becomes a reinforcement: same travel time,
same visibility, but on arrival it joins their defence instead of fighting it.
It stands there for **eight hours**, then walks home.

**One squad per teammate.** Not one per player — one *per teammate*. Four
squads cannot stack on whoever is being hit, because an alliance whose answer
to every attack is "everyone pile onto Dave" is not a network of people holding
ground, it is one base with five accounts. The limit is a unique index, not a
check: two taps in the same instant would both read the board as clear.

A garrisoned squad is **away**. It defends the ally it is standing at and
nothing else — not its own base, and it cannot march again until it is home.
That is the whole cost of reinforcing, and without it one squad would hold two
plots at once, which is the cheapest exploit in the game and the first one an
alliance would find.

### A march is public in both directions

Everybody sees every column, not just the two players in it. Attacks are
orange going out and red coming at you; reinforcements are green whoever they
belong to, so a friendly squad crossing your plot never reads as a threat for
the half-second it takes to find the name; return legs are dim, because a
squad going home is the one march on the map nobody has to answer.

No times are drawn on the map itself. A column tells you something is
happening and to whom; the numbers live in one place, which is the squads
panel, and that panel is about *your* squads.

### And the squad has to come home

Arrival is not the end. Survivors get a **return leg** — a real march, same
speed, drawn on the map, watched by everyone — and the squad is away for the
whole round trip. An expired garrison gets one too; a reinforcement does not
blink home, it visibly leaves.

So the true cost of an attack is *twice* the flight, and a raid on the far side
of the map is a decision about the next hour, not the next four minutes.

### And you can call it back

Top right of the world map, under the world card, is the list of squads that
are not at home: what each one is doing, who to, and how long until it happens.
An attack shows the moment of impact, a reinforcement in flight its arrival, a
garrison the base it is holding and when it leaves, a return leg only the time.

**Recall is not a cancel.** The squad turns around *from wherever it actually
is* and takes a return leg home like any other march — visible to everyone,
and away until it lands.

**The way back takes exactly as long as the way out has taken so far.** Turn
around twenty seconds in and the squad is home twenty seconds later; turn
around at the far end and it pays for the whole trip. Elapsed time, not
distance — measuring the distance back would round to a plot and apply the
45-second floor every march gets, so a squad recalled after five seconds would
still owe most of a minute, which is not what changing your mind should cost.

The same rule covers every other way home. A battle's survivors take as long
going back as they took coming out, and so does an expired garrison. Nothing
is recomputed from the roster, because a squad that lost its slowest vehicle
getting home *faster* reads as a reward for taking casualties.

Recall still costs the journey, and that is what stops it being a free look at
somebody's defence — the answer to "someone is inbound and my squads are away"
stays a real decision rather than a button.

Recalling a garrison ends it immediately: the ally loses that squad from their
defence the moment you press it. Being able to leave a teammate exposed is the
cost that makes the eight hours mean something.

The panel is also the only place a garrison is visible at all — that squad has
no column on the map and no line in the incoming strip, it is simply standing
at somebody else's base. A commitment that long has to be somewhere you can see
it without having to remember you made it.

---

## 3. What decides the outcome

Two things decide a battle, and they are the same mechanism seen twice.

**Power sets the expectation. Composition moves it.**

```
effective = power  ×  composition
```

`composition` runs between about **0.88 and 1.15**. That means good building
can overturn roughly a **30% power deficit** and no more.

Read from both ends, that is:

- **In a close fight, composition decides.** Two squads within a third of each
  other, and the one that brought answers wins. This is where the game is.
- **In a lopsided fight, mass decides.** Twice the power wins regardless of how
  clever the smaller squad was, because it should. A counter is an edge, not a
  magic trick, and a game where a perfect answer beats any amount of force
  makes building your base pointless.

Composition is also always visible in the **margin**. A squad that wins with
the right answers loses less and carries off more; one that wins by weight
alone still limps home. So the roles matter in every battle, and flip the
result only in the close ones.

**The band is one constant.** If fights feel too random, narrow it. If they
feel like arithmetic, widen it. Nothing else has to change.

---

## 3a. The resolver knows nothing about the map

Marching, arrival, who is home, loot, shields — none of that is combat. It is
the **map's** answer to who fights whom and what it costs. The fight itself is
a pure function:

```
resolve(sideA, sideB, options) -> report
```

Two squads in, a report out. No positions, no travel, no clock. That is what
lets the same fight run in three different places without three different
balance problems:

| | Who fights | Where the squads come from | What is at stake |
| :--- | :--- | :--- | :--- |
| **Map raid** | One marching squad vs everyone still home | Live, as they stand | Resources, damage, a shield |
| **Arena** | Your squad vs another player's registered squad | A **snapshot**, so an offline defender is not punished for being offline | Rating only |
| **Events** | Whatever the event says | Whatever the event says | Whatever the event says |

Everything in §4 to §6 — power, composition, counters, detection, the three
bands, damage — is inside the resolver and identical everywhere. Everything in
§2 and §7 — marching, who defends, loot, repair, shields, the power floor — is
outside it, and each context supplies its own.

The **defender modifier** is the seam. On the map it carries the Command Post
and building levels, because you are fighting somebody at their own base. In
the arena it is 1.0, because there is no base — the arena is two squads and
nothing else. Passing it in as a number rather than reading buildings inside
the resolver is what keeps the arena from accidentally inheriting a home-ground
bonus nobody is standing on.

### The trap this avoids, and the one it does not

Building combat around marching would have made the arena a second combat
system, and two combat systems means two balance passes, two sets of bugs, and
a category that is strong in one and useless in the other.

But there is a second, subtler version of the same trap, and it applies to an
attribute: **mobility.** If mobility only means march speed, it is worth
nothing in the arena, fast light assets become strictly worse there, and the
two places grow different metagames anyway — through the attributes rather than
through the rules.

So mobility has to earn its place **inside** the fight:

- **Initiative.** Within a band, the higher-mobility side fires first. In a
  close fight that is the difference between trading and not.
- **Withdrawal.** A losing side with high mobility takes fewer losses getting
  out. Being fast is how you survive being wrong.

March speed is then a **bonus** meaning mobility has on the map, on top of a
job it already does everywhere.

**The rule this generalises to:** every attribute must do something inside the
resolver. Anything that only matters on the map is an addition, never the whole
of what an attribute is for. Firepower, armour and range already pass that
test; detection passes it through the spotting formula; mobility now does too.

---

## 4. The numbers that decide a battle

Six inputs. Nothing else.

| Input | Where it comes from | What it does |
| :--- | :--- | :--- |
| **Power** | Asset attributes at their level, summed | Sets the expected outcome |
| **Counter coverage** | Which categories each side brought | The largest part of composition |
| **Detection** | Recon assets, and the detection attribute | Gates what overwatch may fire at |
| **Lift efficiency** | How fully the budget was used | Unused lift is power left at home |
| **Defender modifier** | Command Post and buildings on the map; 1.0 in the arena | A defender multiplier, supplied by the context |
| **Chance** | ±5%, bounded | Stops identical matchups being decided in advance |

Chance is deliberately small. A player who loses should be able to read the
report and see **why**, and "unlucky" is not a reason anybody accepts twice.

---

## 5. How a round resolves

A battle is **five rounds**. Each round has three bands, resolved in order,
because that is the order a real engagement happens in and it makes the
counter web mechanical rather than a table of multipliers.

### Band 1 — Deep

Artillery, naval and strike aircraft fire before anything closes.

**Overwatch fires at what recon has found.** Each side's deep damage is scaled
by its share of total detection:

```
spotting = ourDetection / (ourDetection + theirDetection)
deepDamage = firepower × (0.35 + 1.3 × spotting)
```

A squad with no recon still fires, at about a third effect. A squad that owns
the detection contest fires at nearly double. **This is the single most
important line in the design** — it is what makes a drone worth a slot next to
a tank, and it is why artillery is not simply the best category.

### Band 2 — Air

Rotary, fixed wing and drones engage. Fixed wing engages rotary first — an
attack helicopter that is being hunted never reaches the armour. Drones hunt
artillery, which is the counter-battery answer to Band 1.

### Band 3 — Close

Armour and screens. Whatever survived the first two bands fights over the
ground. Screens protect the flanks; breach assets take and hold.

### Initiative and withdrawal

Within each band, the side with more **mobility** resolves first. In an even
fight that is the difference between trading blows and taking one for free.

A side that is losing withdraws, and mobility decides how much it saves. Being
fast is how you survive having brought the wrong squad — which is what stops
mobility being a stat you only care about on the way to the fight.

### Damage and losses

Damage is absorbed by the receiving side's armour pool, then spills into
losses. A depleted asset becomes **damaged**: it stops contributing for the
rest of the battle and repairs afterwards. It is never destroyed.

---

## 6. The counter multipliers

Applied per attacking category against defending category. Grounded in reality,
so a player who knows the hardware already knows the rules.

| Attacker | Beats (×1.5) | Struggles against (×0.6) |
| :--- | :--- | :--- |
| Rotary | Armour | Fixed Wing |
| Fixed Wing | Rotary | Drones |
| Drone | Artillery, Fixed Wing | Armour |
| Armour | Drones, Artillery | Rotary |
| Artillery | Armour | Drones, Rotary |
| Naval | Artillery | Fixed Wing |

The multipliers are the same both ways: what beats you also takes less from
you. A squad of six tanks meeting a squad with helicopters is not "slightly
behind" — it is the wrong squad, and it will read that way in the report.

---

## 7. What is at stake

**Resources, and time. Never assets.**

The winner carries off fuel, steel, munitions and alloy, capped as a share of
what the loser actually holds. Losing assets are **damaged**, not destroyed:
they repair on a timer, or immediately for alloy, which finally gives Alloy a
second job beyond levelling.

Nobody is ever permanently poorer for having been attacked while asleep. That
is the rule that decides whether people are still here in month two.

### Protection

Three brakes, all needed:

- **A shield after a loss.** Beaten badly, a base cannot be attacked again for
  a period. Without this the first player to fall gets farmed to nothing by
  everybody who sees it happen.
- **A power floor.** You cannot attack somebody far below you. Bullying the
  weakest player on the server should not be the most profitable action
  available.
- **A loot cap.** There is a ceiling on what one raid takes, so being offline
  for a night costs a bad morning rather than a week.

---

## 8. What the report has to show

The battle report tables already exist (`migrations/0013`), and the shape they
were given holds. What matters is that a defeated player can read it and learn
something:

- Both sides' power, **and both sides' composition multiplier**, so the reason
  is on the page rather than inferred
- The detection contest, which is the least obvious of the six inputs
- Round by round, band by band
- Which assets were damaged and when they repair

A report that says only "you lost" teaches nothing and reads as a rigged game.
The report is where the counter web is taught, and it is the only place most
players will ever learn it.

---

## 9. Build order

| Phase | What lands | Why here |
| :--- | :--- | :--- |
| **1. Resolver** | Pure function: two squads in, a report out. No UI, no marching, no map | Testable in isolation, every balance question answerable by running it a thousand times, and it is the same function the arena and every event will call |
| **2. Marching** | Squads leave, travel, arrive; drawn on the map | The rule everything else depends on |
| **3. Resolution on arrival** | The resolver runs server-side, writes a report | Combat exists here |
| **4. Damage and repair** | Damaged state, repair timers, alloy repair | Consequence |
| **5. Protection** | Shields, power floor, loot caps | Before anybody who is not a friend can play |
| **6. Red on the map** | The `hostile` allegiance colour turns on | It has been waiting since the map was built |
| **7. Arena** | Registered squads, snapshots, a ladder | Calls the phase-1 resolver unchanged. If it needs anything added to the resolver, phase 1 got the seam wrong |

**Phase 1 is where the design gets tested.** The resolver is a pure function,
so ten thousand simulated battles will say whether the band is right, whether
any category dominates, and whether an asset is never worth taking — the same
job `auditAssets` does for the catalogue, done for the fight.

---

## 10. Still open

- **Can several players attack one base together?** Alliance warfare wants
  yes; it is a large addition to the resolver and to the report.
- **Can a marching squad be intercepted?** Deferred once already. It is what
  makes territory mean something, and it is the hardest part.
- **Does the defender choose a garrison, or is it simply everyone at home?**
  Everyone at home is simpler and creates the attack/defend tension for free.
- **How long is a march?** Long enough to be seen and answered, short enough
  that attacking is not an evening's commitment. Probably minutes across a
  neighbourhood, tens of minutes across the map.
- **Does the arena use one squad or all four?** One is a cleaner test of
  building a squad. Four is a better test of building a roster, and it is the
  only thing that would make the other three squads matter to a player who
  never attacks anybody.
- **How often does an arena snapshot refresh?** Too rarely and the ladder
  fights ghosts; too often and it is just the map without the map.
- **Does winning take ground?** Taking the loser's plot is the strongest
  possible stake and the strongest possible way to drive somebody off the game.
  Probably not, or only in events.

---

## 11. What ten thousand simulated battles said

The resolver was built first, as a pure function, precisely so this could be
run before anything was wired to the map. It found three things wrong with the
design above, and all three would have been expensive to discover with players
in the game.

### Survivability cannot be the armour attribute

`hp = armour × 12` made an armour-category asset **eight times tougher** than a
drone. No 1.5× counter overcomes 8× durability, so **artillery lost to armour
99% of the time despite being its designed counter**, and drones lost to
everything.

Durability now scales with what an asset *is* — its total attributes, which
scale with its lift — with armour as a bonus on top rather than the whole
story. That alone fixed the rotary-versus-armour counter.

### The counter multipliers were too strong

At 1.5 / 0.6, rotary beat armour **96%** of the time. That is the "counters
decide almost everything" design that was explicitly not chosen. At 1.35 / 0.75
the counter is a real edge without being the whole answer, and power stays the
main driver.

### A mono-category squad beat a mixed one

This was the important finding, because it is the opposite of the central
claim. A focused squad never suffers a bad matchup within itself; a mixed squad
is a bet on what it will meet. **Rock-paper-scissors with one throw rewards
guessing right, not bringing variety** — so "bring combined arms" was advice
the mechanics actively punished.

The fix is an **exposure penalty**: a squad takes ×1.5 more damage for each
band it did not bring. No close band and nothing shields the rear; no air band
and nothing contests the sky. Both are true of real formations, and both are
now expensive.

With it, a combined-arms squad beats every pure squad:

| Combined arms vs | Wins |
| :--- | :--- |
| pure armour | 93% |
| pure rotary | 90% |
| pure fixed wing | 67% |
| pure artillery | 100% |
| pure drone | 100% |

### Still wrong, and worth knowing before this ships

- **Fixed wing beats rotary 100% of the time.** The counter is doing exactly
  what it should and there is no upset left in it. Rotary needs something back
  — probably that helicopters are harder to spot, via the detection contest.
- **A pure drone squad cannot win anything.** That is partly correct — six
  drones spend 17 of a 26 lift budget, so it is a cheap squad and should lose
  to an expensive one. But it means the six-slot cap, not lift, is what binds
  for light assets, and the lift budget curve may be growing too fast.
- **The upset band has not been re-measured** since these changes. The
  0.88–1.15 composition band in §3 is still a target, not a verified number.
