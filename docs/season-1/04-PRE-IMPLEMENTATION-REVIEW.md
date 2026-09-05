\# Season 1 — pre-implementation review



Claude, 2026-09-05. Response to the Season 1 Design Response. Section 12

collision check, then the Stage A plan.



The decisions are accepted as written. Held time at the Core, pro-rated

factories, frozen launch allegiance, title and banner rather than a skin, days

since season start, two-hour windows, the population gate, and no seasonal

duplicates of unfinished combat systems — all of that is settled and I will build

to it.



Six collisions remain. The first is a suggestion that makes the design cheaper,

not a problem.



\## 1. Alliance Supplies should be computed, not stored



The design now says factory output settles "whenever a relevant season, map,

factory, or alliance read occurs." That means the most common request in the

game — a map read — can write supply rows, and several alliance members reading

at once contend on the same balance.



There is a better answer, and the codebase already uses it: power is computed

on every read, never stored.



Do the same here. Store only what is spent. Derive what is earned from the

ownership event log and the season's absolute instants, at read time. Balance is

earned minus spent.



\- No write on read at all. Map reads stay reads.

\- No contention on accrual, because nothing accrues. The only conditional update

&#x20; in the whole supply system is the spend, which needs one anyway.

\- Recomputation is trivially cheap: three factories over ten weeks with a few

&#x20; captures a day is a few hundred rows to sum.

\- The projected-versus-settled distinction the design asks for stops being a

&#x20; display problem, because there is no settled figure to drift from the

&#x20; projection.



This also removes the need to decide when factory yield "settles," which is

otherwise a question with no good answer under settle-on-read.



\## 2. The Colossus integrity pool must freeze on first read



Sizing integrity from "recent distinct season participants" needs an instant to

be measured at. Nothing ticks, so there is no moment when that calculation

naturally happens.



If it is computed on every read, the pool grows as players join and the boss

gets harder retroactively — including for damage already dealt.



Compute it once, on the first read after the event's start instant, and store

it. Same conditional-update shape as everything else: write only if

integrity\_max IS NULL. Every later read uses the frozen number.



\## 3. "Alliance banner" collides with an existing name



There is already a cosmetic slot called banner — one of the four base

cosmetic slots, alongside emblem, perimeter lights and ground marking. Alliances

separately have crests.



So "permanent title and alliance banner" is ambiguous: a new base banner item, a

crest variant, or a third thing. This matters more than it sounds. The reason

shared/ exists at all is that two copies of the skin catalogue diverged and

Ravenkeep vanished from Customise for a session.



Proposal: call it an alliance pennant, rendered next to the crest on the

alliance screen and in chat, and keep the word banner for the base cosmetic

slot. Any name works as long as it is not the one already in use.



\## 4. Reinforcing an objective is an extension of an untested system



Section 10 says an objective should be contestable by one strong squad "with

existing valid reinforcement mechanics available where appropriate."



Reinforcement currently targets player bases. Its uniqueness rule is one

reinforcement per teammate, enforced by index, and garrison is tracked by

garrison\_until on the squad. Objectives are not players, so that index does not

apply and a new rule is needed — one squad per objective, or one per alliance

per objective.



More importantly, the reinforcement round trip is on the untested list: the

garrison being counted in a defence, the eight hours expiring, and the return leg

appearing have never been observed end to end. That system took three separate

fixes to get right, because a garrisoned squad reads as home to the naive query.



Recommendation: test the existing reinforcement flow before extending it, and

until then, treat objective garrisoning as out of scope for Stage D. One strong

squad contesting an objective works without it.



\## 5. Objective markers and plot occupancy



Markers are described as overlays that do not consume claimable plots. That

leaves a case undefined: can a player base sit on the same plot as the Core?



Plot occupancy is a unique index, and bases are painted in y order so a

northern base cannot cover the one in front of it. An overlay at the same

coordinate as a base is a rendering question with no current answer, and the Core

sits in the 20-plot salt flat at the centre — which I believe is currently

claimable.



Two options: reserve objective plots from base placement (a new placement rule,

small), or allow overlap and define the draw order. I would reserve them. An

alliance parking a base on the Core before the finale opens is the kind of thing

that gets discovered at the worst moment.



\## 6. Translation volume and the line-anchored parser



Season panel, ten objective types, five war assets, lock reasons, boss states,

reward states, window countdowns: realistically 80 to 120 new keys against a

current 301. That is a 30% increase in the dictionary in one season.



Cost is fine — translation is build-time and free per player. Two process risks:



\- The i18n parser is line-anchored. A long string wrapped onto a second line

&#x20; matches nothing and is silently never translated. The generator counts keys two

&#x20; ways and refuses to run on a mismatch, so this fails loudly now, but at this

&#x20; volume it will fire.

\- Check the artefact, not the run. The first translation pass reported

&#x20; 301/301 in every language with 32 broken strings in it.



Titles are also a new player-facing field. I will treat title names as English

server data, consistent with skin, cosmetic and asset names, unless told

otherwise.



\## Everything else checks out



Server authority, read-settled timers, database-enforced uniqueness, computed

power, combat purity and the population gate all hold as written. War windows as

published absolute instants need no scheduler. Frozen launch allegiance matches

the existing marches.units idiom exactly. Days since season start removes

timezone entirely.



\## Stage A — season skeleton



Scope. Season record, phase computation from absolute time, objective

records, ownership event table, map overlay, season status panel. No captures, no

combat, no supplies.



Why this first. It is the schema that everything else hangs off, and schema

mistakes are cheapest to find before six systems depend on them. It is also

fully testable today with the accounts that exist, because nothing in it needs a

second alliance.



Tables. seasons, season\_objectives, season\_ownership\_events,

season\_windows. Migration 0018.



The ownership event table lands in Stage A rather than Stage C deliberately —

both the Core score and factory pro-rating derive from it, and having it present

from the start means Stage C adds a reader rather than a new foundation.



Shared module. shared/season.ts: phase definitions, objective types,

window schedule shape, and the phase-from-instant function, imported by both

sides so they cannot disagree.



What "working" looks like. A test season configured with boundaries a few

minutes apart. Opening the map before and after each boundary shows the correct

phase, correct unlocked regions and correct objective states, with nothing having

run in between. Two clients reading simultaneously agree. Changing device clock

or locale changes nothing.



Not in Stage A. Supplies, captures, assaults, war assets, boss, rewards,

catch-up.

