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

## 4. The numbers that decide a battle

Six inputs. Nothing else.

| Input | Where it comes from | What it does |
| :--- | :--- | :--- |
| **Power** | Asset attributes at their level, summed | Sets the expected outcome |
| **Counter coverage** | Which categories each side brought | The largest part of composition |
| **Detection** | Recon assets, and the detection attribute | Gates what overwatch may fire at |
| **Lift efficiency** | How fully the budget was used | Unused lift is power left at home |
| **Base defence** | Command Post and building levels | A defender multiplier |
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
| **1. Resolver** | Pure function: two squads in, a report out. No UI, no marching | Testable in isolation, and every balance question can be answered by running it a thousand times |
| **2. Marching** | Squads leave, travel, arrive; drawn on the map | The rule everything else depends on |
| **3. Resolution on arrival** | The resolver runs server-side, writes a report | Combat exists here |
| **4. Damage and repair** | Damaged state, repair timers, alloy repair | Consequence |
| **5. Protection** | Shields, power floor, loot caps | Before anybody who is not a friend can play |
| **6. Red on the map** | The `hostile` allegiance colour turns on | It has been waiting since the map was built |

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
- **Does winning take ground?** Taking the loser's plot is the strongest
  possible stake and the strongest possible way to drive somebody off the game.
  Probably not, or only in events.
