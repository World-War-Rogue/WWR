\# Season 1 — geometry and schedule



Claude, 2026-09-05. Content decisions that Stage A needs and code cannot

invent. Written from the live map, not from the design documents.



\## 1. The war window schedule is not a Stage A input



The design says twenty regular windows plus a final one, published as absolute

instants before the season starts. That is right, and it should not be written

yet.



Your players are not in one timezone. GrandpaWhale writes Korean, so

UTC+9. There is a German-tagged message in Server chat. You are in Houston,

UTC-5. A two-hour window cannot be evening in Seoul and evening in Houston —

21:00 in Seoul is 07:00 for you, and 20:00 for you is 11:00 the next morning for

him. One of those two people is always attending a battle at a stupid hour.



Two regular windows a week is exactly enough to solve this, but only if they are

staggered on purpose: one window placed for the Americas and Europe, one

placed for Asia, so every player gets one good window a week and the alliance

has to decide which of the two to spend its primary offensive on. That turns a

scheduling constraint into a strategic one.



But you cannot choose those times until you know where the players are, and the

population gate means warfare does not start until there are two alliances of

two anyway.



So Stage A builds the season\_windows table and leaves it empty. Phase

boundaries are Stage A; window instants are a Stage D input. Nothing is lost and

nothing gets published wrong.



Ask GrandpaWhale what timezone he is in. That is a chat message, and it is

the single most useful piece of information for scheduling. Ask the German

speaker too, if they are still around.



\## 2. The concentric fiction inverts at current scale



The four regions are named as rings — Outer Scraplands, Factory Ring, Dominion

Front, Iron Dominion Core — which implies pushing inward from the edge toward

the centre. That reads well and it should be preserved.



The problem is that you are already at the centre. Your base is at -26, 10,

which is a radius of about 28 from the origin, and the map extends to plus or

minus 200. Your entire alliance is clustered there.



So if the Scraplands sit at anything like radius 70, the tutorial content is

further from every existing player than the final objective is. Week 1 sends

people outward and Week 10 brings them back to where they already live. The

fiction runs backwards.



Distance is not a balancing constraint here — a squad crosses at 7s/plot with a

40 minute ceiling, so from anywhere to anywhere is at most 40 minutes, and the

whole map is already within reach of everyone. The rings are for legibility,

not for cost. Which means they should be small enough to see.



Proposed radii, all from the map origin:



\- Iron Dominion Core: radius 0, count 1

\- Dominion Front: radius 12, count 2

\- Factory Ring: radius 26, count 3

\- Outer Scraplands: radius 44, count 4



That puts the Scraplands comfortably outside the current cluster, the Factory

Ring roughly at your doorstep, and the Core one short march away. Everything is

on screen within a couple of zoom steps, which matters more than realism when

four people are meant to find it.



Two things this needs:



\- Reserve the objective plots from base claiming. Plot occupancy is a unique

&#x20; index and objectives are described as overlays that do not consume plots — so

&#x20; as written, someone can park a base on the Core. Reserving ten plots is a

&#x20; small placement rule and it avoids a bad discovery in Week 10.

\- Spread each ring's objectives by angle, not at random. Two Front markers

&#x20; opposite each other, three Factory markers at 120 degrees, four Scraplands at

&#x20; 90 degrees. Deterministic, legible, and derivable in shared/season.ts from

&#x20; radius and count rather than stored as ten hand-picked coordinates.



If the world ever fills to 1000 players at 12% occupancy, these radii are too

tight and become a Season 2 parameter. That is the right time to change them,

not now.



\## 3. What the map confirmed



\- Map colours are correct. The legend reads you, your alliance, your server,

&#x20; another server, at war, and MattofWar renders magenta with the three alliance

&#x20; bases green.

\- Shellwarden works. At high zoom it is plainly a standing figure and cannot

&#x20; be confused with the keeps beside it. The silhouette-contrast argument holds.

\- There are other-server bases in this world. Two clusters, north-west and

&#x20; south-west, roughly ten bases, blue. They sit in regular grids, which does not

&#x20; look organically placed.



That last one is a question rather than a finding. Are those real accounts or

seeded? It matters twice: the population gate for Season 1 warfare asks for

two alliances of two active accounts, and the Iron Dominion's integrity pool is

sized from "recent distinct season participants." If seeded bases count as

participants, the boss is sized for a population that cannot fight it.



\## What to decide



1\. GrandpaWhale's timezone, and the German speaker's. One chat message.

2\. Whether the blue clusters are real players or seeded.

3\. Whether the ring radii above are right, or whether the season should centre

&#x20;  on the population rather than the map origin. I prefer the origin — it stays

&#x20;  correct as the world fills, and the salt flat is already there.

