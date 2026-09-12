\# Game time



Decision, 2026-09-05.



\## The rule



Game time is UTC-7, permanently, with no daylight saving. This matches

Arizona year-round, which is where the idea came from, but Arizona is the

explanation and not the specification. The specification is the offset.



Implement it as arithmetic, not as a timezone lookup:



&#x20;   gameTime = new Date(instant - 7 \* 3600 \* 1000)



then read the UTC components off that date. This is deterministic, identical

on the Worker and in the browser, and depends on nothing.



Do not use Intl.DateTimeFormat with timeZone: 'America/Phoenix'. That

makes the game clock a dependency on the IANA timezone database, so a future

rule change would silently move every published war window. It is also

ambiguous: the Navajo Nation observes daylight saving inside Arizona, so

"Arizona time" is not actually one thing. UTC-7 is.



Storage does not change. Everything stays absolute epoch milliseconds, as it

already is. This is purely a display transform — one function, applied at

the edge, and no stored value is ever in game time.



\## Where it lives



shared/gametime.ts, imported by both sides. It holds the offset constant and

the formatting functions, and nothing else. Same reason as every other shared

module: a Worker and a client that each own a copy of the offset will eventually

disagree about when a war window closes, and that is not a bug anyone enjoys

finding.



\## Naming and format



The clock needs a name that is not "Arizona" and not seasonal — seasons change,

the clock does not.



Suggestion: Rogue Standard Time, shown as RST. Always render the offset

alongside it on anything scheduled, so a player who has never heard of it can

work out their own local time without asking: 20:00 RST (UTC-7).



Use 24-hour time. The interface currently shows 09:32 PM in chat. AM and

PM are an English convention; most of your nineteen languages use a 24-hour

clock, and 20:00 needs no translation key at all while PM does. This is a

small change now and an annoying one after the season schedule is published.



\## The day boundary



The logical season day is anchored to the most recent midnight RST at or before

the season start instant, not to the start instant itself.



This means a season can begin at any time of day — including "whenever we

finished building it" — and daily operations still roll over at midnight game

time rather than at 14:37 for reasons nobody can explain.



\## Apply the clock everywhere, not just to the season



Chat timestamps, battle reports, build completions — anything showing a

wall-clock time. Two clocks in one game is worse than one clock that is wrong

for everybody equally, and the whole point of a fixed offset is that "6pm"

means one thing when two players talk about it.



That is the reason this decision is worth making now rather than at Stage D: it

touches chat, which is already open, and it is much cheaper before the season

schedule exists than after.



\## Scheduling consequence



With a fixed clock, staggered war windows become expressible. A Korean player at

UTC+9 is 16 hours ahead of RST; Houston is 1 or 2 hours ahead depending on the

time of year, which is now irrelevant to the schedule and only affects how you

personally read it.



\- 20:00 RST is 12:00 the next day in Seoul — lunchtime, workable.

\- 04:00 RST is 20:00 in Seoul — evening, good — and 05:00 or 06:00 in Houston,

&#x20; which is bad for you and fine for a US player who is not you.



Neither is decided until GrandpaWhale confirms his timezone, but the arithmetic

is now stable, which it would not have been across a daylight saving boundary.



\## Preseason



Preseason is its own season row with its own id and kind, not Season 1 with a

moveable start. It has an end instant set far out rather than null — ending it

is an owner action either way, and a season with a null end is a special case

every read has to handle forever.



Seasonal state must not leak between rows. Preseason participation cannot count

toward Season 1 per-player caps, and it cannot feed the Colossus integrity

sizing, which is derived from recent distinct participants.

