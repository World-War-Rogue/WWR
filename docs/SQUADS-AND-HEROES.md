# Squads and heroes — the plan

The last major pillar. This is the design and the order to build it in, not the
implementation.

A **hero is a machine.** An M1A2 Abrams is a hero. There are no pilots, no
portraits, no characters — the hardware is the collectible, and it is real
hardware with its real name.

- **60+ heroes** exist across six categories.
- **A new player drafts 24 of them** at signup.
- **Four squads of six.** Heroes move freely between your own squads.
- **Every hero levels independently** and gains attributes as it does.

---

## 1. The rule that has to hold

**No hero is stronger than another hero. They are different, not ranked.**

This is the same commitment as no rarity tiers, applied one layer down, and it
is the whole reason to use real hardware. An Abrams is not "better" than a
HIMARS — it is the answer to a different question. If a hero is never drafted,
that is a balance bug to fix, not a common card doing its job.

What this rules out, permanently:

- Tiers, stars, ranks, or any word that sorts the catalogue.
- A "better version" of a hero sold later. An upgraded Abrams is the same hero
  at a higher level, not a new one.
- Anything bought with money that raises a number in combat.

What it leaves as the real differences: **role**, **attribute shape**, **lift
cost**, and **how far you have levelled it**. That is enough. Four squads built
from an identical catalogue still come out different, because nobody can afford
to level all 24 at once.

---

## 2. What a hero is made of

Five attributes. Small on purpose — a player has to be able to hold the whole
comparison in their head at a glance.

| Attribute | What it decides |
| :--- | :--- |
| **Firepower** | Damage per engagement |
| **Armour** | Damage absorbed before losses |
| **Mobility** | Who engages first, and who can withdraw |
| **Range** | Which engagement band it fights in — knife, medium, deep |
| **Detection** | What it can see, and what it lets the rest of the squad see |

Plus three fixed properties:

| Property | What it is |
| :--- | :--- |
| **Category** | Armour, Rotary, Fixed Wing, Artillery, Drone, Naval |
| **Role** | Breach, Screen, Strike, Overwatch, Recon, Lift |
| **Lift** | What it costs to field — see §4 |

**Role is what creates the counter web, and it comes free from reality:**

- **Breach** — heavy armour, closes and holds ground. Tanks.
- **Screen** — fast and light, covers flanks, kills drones and light stuff.
- **Strike** — heavy damage on arrival, cannot take a hit. Attack aircraft.
- **Overwatch** — hits from outside the fight, but **only at what Recon has
  found.** Artillery.
- **Recon** — little firepower, feeds Detection to the whole squad and turns
  Overwatch on. Surveillance drones.
- **Lift** — sustain, repair, and the ability to bring more. Transport rotary.

---

## 3. The counter web

Grounded in how these things actually relate, which means players who know the
hardware already know the rules:

```
        Rotary ──beats──> Armour
          ^                  │
          │                  beats
        beats                v
      Fixed Wing <──beats── Drone
          ^                  ^
          │                  │
        beats              beats
          │                  │
      Artillery <────────────┘

  Armour beats Drone and Screen at close range.
  Artillery beats massed Armour and anything static — and is helpless up close.
  Recon is what lets Artillery hit anything at all.
```

Read as sentences:

- **Helicopters kill tanks.** Top attack. The oldest rule in the book.
- **Fighters kill helicopters.** Nothing a Ka-52 can do about an F-35.
- **Drones find and kill artillery.** Counter-battery is the drone's whole job.
- **Artillery breaks massed armour** — and dies to anything that reaches it.
- **Tanks kill drones and light screens** at close range, and nothing at long.
- **Recon is a force multiplier, not a fighter.** A squad with no Recon fields
  its artillery blind.

A squad of six that ignores this loses to a squad that does not, regardless of
levels. **That is the game.**

---

## 4. Lift — why nobody fields six Abrams

Each hero has a **Lift cost**. Each squad has a **Lift budget**, and the budget
comes from buildings that already exist and currently do almost nothing:

| Building | Grants |
| :--- | :--- |
| **Motor Pool** | Ground lift — armour and tube artillery |
| **Airfield** | Air lift — rotary, fixed wing, large drones |
| **Barracks** | Squad capacity and crew quality |
| **Command Post** | Caps all three, as it already caps everything |

A squad has six slots **and** a lift budget. Early on you cannot fill six slots
with heavy armour — you physically cannot lift it — so a new player's squad is
necessarily mixed, and learns the counter web by being made to.

This does three things at once:

1. **It stops the dominant loadout** without nerfing anything.
2. **It gives Motor Pool and Airfield a reason to exist.** Right now they are
   upgrade buttons with no consequence.
3. **It makes base building and combat one system** rather than two games in
   the same app.

---

## 5. Progression, and the resource that has been waiting for a job

Every hero levels **1 → 30 on the same curve.** Same costs, same rate, for an
Abrams and a Bayraktar. Levelling raises the attributes in the shape that hero
already has — a tank grows Armour faster than Range, an MLRS the reverse — but
no hero levels faster or higher than another.

**Alloy is the hero currency.** It is currently produced only by buildings at
level 10 or above and has nothing to spend it on — Matt's own base shows 0. It
is the late-game resource with no sink, and hero levels are exactly the sink it
was shaped for. Fuel, Steel and Munitions stay on the base; Alloy goes to the
roster.

The consequence worth designing around: **you cannot level 24 heroes.** A player
will carry maybe eight to real strength in a season. Which eight is the choice
that makes two players with identical rosters play differently, and it is the
choice a returning player will talk about.

---

## 6. The catalogue

At least ten per category. Real designations, real operators. These are the
first pass — names, categories, roles — and the attribute numbers come in
Phase 1 when they can be tuned against each other.

### Armour — Breach and Screen

| Hero | Operator | Role |
| :--- | :--- | :--- |
| M1A2 SEPv3 Abrams | USA | Breach |
| Leopard 2A7+ | Germany | Breach |
| Challenger 3 | UK | Breach |
| Leclerc XLR | France | Screen |
| K2 Black Panther | South Korea | Breach |
| Type 10 | Japan | Screen |
| Merkava Mk.4 Barak | Israel | Breach |
| T-90M Proryv | Russia | Breach |
| Altay | Turkey | Breach |
| Stridsvagn 122 | Sweden | Breach |
| Ariete AMV | Italy | Screen |
| PT-91 Twardy | Poland | Screen |

### Rotary — the answer to armour

| Hero | Operator | Role |
| :--- | :--- | :--- |
| AH-64E Apache Guardian | USA | Strike |
| AH-1Z Viper | USA | Strike |
| Ka-52M Alligator | Russia | Strike |
| Mi-28NM Havoc | Russia | Strike |
| Mi-35M Hind | Russia | Strike / Lift |
| Tiger HAD | France / Germany | Screen |
| T129 ATAK | Turkey | Screen |
| Z-10ME | China | Strike |
| Rooivalk Mk1 | South Africa | Strike |
| UH-60M Black Hawk | USA | Lift |
| CH-47F Chinook | USA | Lift |
| AW101 Merlin | UK / Italy | Lift |

### Fixed Wing — the answer to rotary

| Hero | Operator | Role |
| :--- | :--- | :--- |
| F-35A Lightning II | USA | Strike |
| F-22 Raptor | USA | Screen |
| F-15EX Eagle II | USA | Strike |
| A-10C Thunderbolt II | USA | Strike |
| F/A-18E Super Hornet | USA | Strike |
| AC-130J Ghostrider | USA | Overwatch |
| Eurofighter Typhoon | Multi-national | Screen |
| Dassault Rafale F4 | France | Strike |
| JAS 39E Gripen | Sweden | Screen |
| Su-57 Felon | Russia | Screen |
| Su-34 Fullback | Russia | Strike |
| KF-21 Boramae | South Korea | Screen |

### Artillery — rocket and tube

| Hero | Operator | Role |
| :--- | :--- | :--- |
| M142 HIMARS | USA | Overwatch |
| M270A2 MLRS | USA | Overwatch |
| PULS | Israel | Overwatch |
| K239 Chunmoo | South Korea | Overwatch |
| BM-30 Smerch | Russia | Overwatch |
| TOS-1A Solntsepyok | Russia | Breach |
| PHL-191 | China | Overwatch |
| Astros II MK6 | Brazil | Overwatch |
| RM-70 Vampire | Czechia | Overwatch |
| PzH 2000 | Germany | Overwatch |
| Archer FH77 BW | Sweden | Overwatch |
| K9 Thunder | South Korea | Overwatch |

### Drones — eyes, and the answer to artillery

| Hero | Operator | Role |
| :--- | :--- | :--- |
| MQ-9A Reaper | USA | Strike |
| MQ-1C Gray Eagle | USA | Recon |
| RQ-4 Global Hawk | USA | Recon |
| Switchblade 600 | USA | Strike |
| Bayraktar TB2 | Turkey | Strike |
| Bayraktar Akinci | Turkey | Strike |
| Heron TP | Israel | Recon |
| Harop | Israel | Strike |
| Orbiter 4 | Israel | Recon |
| Lancet-3 | Russia | Strike |
| Wing Loong II | China | Strike |
| CH-5 Rainbow | China | Recon |

### Naval — built now, switched on after Season 1

| Hero | Operator | Role |
| :--- | :--- | :--- |
| Arleigh Burke Flight III | USA | Overwatch |
| Zumwalt DDG-1000 | USA | Overwatch |
| Virginia-class SSN | USA | Strike |
| Wasp-class LHD | USA | Lift |
| Type 45 Daring | UK | Screen |
| Type 26 City-class | UK | Screen |
| FREMM | France / Italy | Overwatch |
| Sejong the Great | South Korea | Overwatch |
| Admiral Gorshkov | Russia | Strike |
| Type 055 Renhai | China | Overwatch |
| Visby-class | Sweden | Screen |
| Ada-class | Turkey | Screen |

**76 heroes.** Enough that a 24-hero draft is a real choice, small enough that
every one can be balanced by hand rather than by formula.

---

## 7. The draft — 24 picks without drowning a new player

Twenty-four choices before you understand the game is too many asked at once.
The fix is framing, not fewer heroes.

**Draft in four rounds of six, one squad at a time.** The player is never
picking 24 things; they are building Squad Alpha, then Bravo, then Charlie,
then Delta. Same outcome, a quarter of the weight.

**Each round starts from a doctrine preset.** Offer three or four filled squads
— *Armoured Fist*, *Air Cavalry*, *Deep Fires*, *Recon Screen* — that a player
can take in one click and then swap pieces out of. Most will take a preset and
change two things, which is exactly the right amount of decision for a first
session and teaches the counter web by example.

**Enforce coverage, do not enforce taste.** A squad must contain at least one
Recon and cannot be six of one category. Beyond that, let people build badly —
they will learn faster from losing than from a rule.

**One free full re-draft in the first seven days.** New players will get it
wrong, and a roster you regret is a reason to stop playing rather than a reason
to spend.

**Later heroes are earned, not sold.** The other 52 come from progression and
events. The moment a hero is purchasable the no-pay-to-win commitment is gone,
whatever the price.

---

## 8. Water on the map

Naval needs somewhere to be, and the map needs to stop being uniform ground.

**Do this now, before there are players.** Terrain is generated deterministically
from the world seed, so adding water changes what every existing plot is. With
three testers that costs nothing; with three hundred players it means telling
people their base is now in a lake.

The work:

- Generate water in the terrain pass — coast, a lake or two, a river system —
  from the same seed, so it still needs no storage and everyone sees the same
  map.
- **Placement must reject water plots.** This is a server rule, in the same
  place that already enforces one base per plot, and it applies to movement as
  well as first placement.
- Target occupancy is currently 12% of all plots. Water reduces the buildable
  area, so the placement density needs re-checking against the land plots, not
  the total.
- Water gets its own allegiance-layer treatment at strategic zoom — it should
  still read as water when the bases have become coloured blocks.

Naval heroes then deploy from coastal plots when the season opens. Until then
they exist in the catalogue, undraftable, which is deliberate: players can see
what is coming.

---

## 9. Build order

Each phase is shippable on its own and visible to a player. Nothing here needs
the phase after it to be worth deploying.

| Phase | What lands | Why here |
| :--- | :--- | :--- |
| **0. Water** | Terrain generates water; placement and movement reject it | Cheapest it will ever be. Do it before the roster work starts |
| **1. The catalogue** | `shared/units.ts` — 76 heroes, attributes, roles, lift. No combat | Data only, imported by both sides. Tunable before anything depends on it |
| **2. Roster and draft** | Signup draft in four rounds; a roster screen; heroes owned | First thing a player sees. Testable without combat existing |
| **3. Squads** | Four squads, six slots, lift budgets from Motor Pool / Airfield / Barracks | Gives three existing buildings a consequence |
| **4. Hero levels** | Alloy sink, 1→30, attribute growth | Turns the dead resource on and makes bases matter to squads |
| **5. Combat** | Server-side resolution, replayed by the client | Everything above is input to this. The red map colour turns on here |
| **6. Naval** | Coastal season, naval heroes draftable, shore deployment | Content beat, and the payoff for Phase 0 |

**Database work:** roughly four migrations — heroes owned, squads, squad slots,
hero levels. Squad slots need a unique index on (squad, slot) for the same
reason plots do: two drags in the same instant must be separated by the
database, not by a check.

**Combat must resolve on the server and be replayed by the client.** The client
sends "attack this base with Squad Bravo"; the server decides the whole outcome
and returns it as a sequence to animate. Anything the browser computes, a player
edits — and combat is the one place where that stops being a bug and becomes
the reason nobody plays.

---

## 10. Two things to decide before Phase 1

**What sells.** With no rarity and no purchasable power, the roster cannot be
the revenue. What can be sold safely is decoration on it: liveries and nose art
for individual heroes, squad crests, a callsign on the fuselage. That fits the
thesis — customisation people pay for because it makes them different — and it
extends the cosmetic system that already exists rather than starting a new one.
What must not be sold: heroes, levels, lift capacity, re-drafts beyond the free
one.

**The names.** These are real designations and most are trademarked by their
manufacturers. Games use real hardware names routinely and it is normally
treated as accurate factual reference rather than endorsement — but "normally"
is not "always", and this game sells things. Worth twenty minutes with someone
who does trademark law before the catalogue ships, and worth knowing that the
fallback is cheap: the designations (M1A2, AH-64E, MQ-9A) carry far less
trademark weight than the popular names (Abrams, Apache, Reaper), so the whole
catalogue can be renamed to designations in one data file if it ever has to be.
