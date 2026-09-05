\# Season 1 — implementation response



Claude, 2026-09-05. Reply to "Mech Uprising: Iron Dominion". Plan and questions

only, no code.



The brief is buildable and it respected the constraints properly. Convoys as

fixed contracts rather than moving objects, combat receiving frozen modifiers,

uniqueness called out per objective, cosmetic-only prestige, explicit

two-players-online behaviour. That is a design written against this codebase

rather than at it.



What follows is four things that need deciding before code, four implementation

notes that change the shape of the work, the dependencies on unfinished

features, and a proposed build order.



\## Blocking — decide these first



\### 1. The Core finale is last-touch, not capture-and-hold



Section 8 defines the champion as whoever holds the Core at the recorded end of

the final window, and resolves ownership by settling arrivals in deterministic

order. That is computable without ticking, which is right. But it means holding

the Core for the entire window and arriving one second before the deadline are

worth exactly the same. The dominant strategy is to arrive as late as legally

possible.



This is the mechanic the brief explicitly rejects for the Colossus — "based

on participation thresholds and contribution bands, not last hit" — reintroduced

at the objective that decides the season.



The fix is available without breaking anything. Ownership changes are already an

ordered sequence of arrival events with absolute instants, so cumulative held

time during the final window is derivable from that sequence alone, with no

ticking and no new clock. Champion becomes "held the Core longest during the

final window, ties broken by who held it at the deadline." Late arrival still

matters; it just no longer erases everything that came before it.



Two cheaper alternatives if that is too much: a capture must survive N minutes

uncontested to count, or a captured objective cannot be attacked again for N

minutes. Both are worse — the first creates an awkward pending state, the second

rewards whoever captures first rather than whoever fights best.



This is a product decision. But shipping last-touch and calling it

capture-and-hold is the kind of thing players work out in week one and resent.



\### 2. Champion prestige is currently worth nothing



The champion reward is cosmetic or title-only, which is correct. But

ALL\_SKINS\_UNLOCKED = true is live in worker/game.ts for testers, and every

skin is currently wearable by everyone. A prestige cosmetic awarded into that

state is indistinguishable from an ordinary one.



Closing that flag is already on the roadmap and requires resetting the bases of

testers wearing skins they do not own. It has to happen before the season ends,

not after, or the finale's only permanent reward lands in a game where

exclusivity does not exist yet.



A title rather than a skin sidesteps this entirely and is cheaper to build.

Worth considering on its own merits.



\### 3. Do not lock alliance membership during a season assault



Section 5 blocks a player from joining another alliance while a season mission

is unresolved. That is a new lock on a table nothing currently locks, it

interacts badly with the existing one-alliance-per-player index, and it leaves

the leaving-without-joining case undefined.



The codebase already has a better answer to exactly this problem. Marches freeze

their roster into marches.units at launch precisely so that mid-flight changes

cannot alter an in-flight action. Freeze the launching alliance into the

assault record the same way. Then membership changes are irrelevant: the

assault carries its own allegiance, resolves for the alliance that launched it,

and nobody is told they cannot leave their alliance for forty minutes.



The residual exploit — launch for A, switch to B, assault still helps A — costs

the player their membership in A to execute. That is not worth a lock.



\### 4. Scope against a four-base world



This is ten weeks, ten objectives, five war assets, a boss event, supply links,

a catch-up track and a finale. The map currently has four bases on it. Signups

are closed to strangers, and opening them is gated behind text filtering, which

is unbuilt.



Most of this design cannot be exercised by the people who currently exist. Weeks

4 through 10 assume two opposing alliances contesting factories on a schedule.



I am not proposing cutting it. I am proposing it ships in stages that are each

independently playable, so that the parts nobody can test yet are not sitting

in production untested for two months.



\## Implementation notes that change the shape



\### Settlement needs a watermark, not just a uniqueness index



The brief repeatedly asks for database-level uniqueness on "one controller per

objective". That part is free — control is a single column on the objective row.



The real concurrency problem is different: two players reading the map at the

same instant must not both apply the same due arrival. Uniqueness does not

prevent that; a conditional update does.



The existing precedent is the garrison return leg, where garrison\_until is

cleared in the same conditional update that claims the leg — so exactly one

reader wins. Season settlement wants the same shape: each assault carries a

settled\_at, and settling it is an update conditional on settled\_at IS NULL.

The reader that loses the race applies nothing and reads the winner's result.



The same applies to boss integrity, factory daily claims, and war-asset charges.

Every one of those is a compare-and-set, not an insert-and-hope.



\### "Logical season day" needs defining now



It is the uniqueness key for daily operation claims and factory output, so it

has to be exact and timezone-free. I would define it as

floor((now - season.started\_at) / 86400000) — days since season start, derived

from absolute instants, no server timezone anywhere. That makes the daily claim

index UNIQUE(season\_id, player\_id, day\_index, op\_type).



If it instead means UTC calendar day, say so, because it changes what a player in

Korea experiences at their evening.



\### War windows must be longer than maximum travel time



A squad crosses the map at 7s/plot with a 40 minute ceiling, so from anywhere to

anywhere is at most 40 minutes. Section 5 rejects launches that cannot arrive

before the window closes. A window shorter than about an hour therefore makes

distant targets unattackable and turns map position into eligibility, which is

not what the design says it wants.



Either windows are 90+ minutes, or the design should say explicitly that

proximity determines who can contest what — which is a defensible mechanic, just

a different one.



\### Seasonal combat modifiers land on an unmeasured baseline



shared/combat.ts taking a frozen named modifier keeps it pure, which is right.

But COMBAT.md records three open items: fixed wing beats rotary 100% of the

time, pure drone squads cannot win, and the composition band has not been

re-measured since the exposure fix.



Tuning Siege Titan and EMP Relay on top of that means tuning against a baseline

that is known to be wrong in at least two places. Re-run the ten thousand

battle harness and close those first, then simulate the modifiers. The harness

already exists and this is a day, not a week.



\### Factory output contradicts itself



Section 4 says output is a once-per-season-day claim, and also that unclaimed

output belongs to whoever held the site "for the relevant settled period". Those

are different mechanics.



A daily claim is simple and needs no ownership history — but it means capturing

a factory shortly before the day rolls steals a full day of output from an

alliance that held it for twenty-three hours. That exploit is not in the brief's

edge list.



Pro-rating by held time fixes it and is computable from the same ownership event

sequence the Core finale needs anyway. If you take the held-time approach for the

Core, take it here too and build the event log once.



\## Dependencies on unfinished work



\- Combat phases 4–6 are unbuilt: damage and repair state, protection

&#x20; (shields, power floor, loot caps), and the red hostile map colour. Season

&#x20; assaults need the hostile colour, and Shield Array overlaps the protection

&#x20; phase directly — build the general mechanic once rather than a seasonal

&#x20; version and a permanent version.

\- The defender's countdown does not exist. Season assaults multiply the

&#x20; problem: now objectives have inbound attacks too. The strip design already

&#x20; discussed covers both if built before rather than after.

\- Text filtering gates open signups, which gate having enough players for

&#x20; weeks 4–10 to mean anything.

\- Chat translation delivery is broken (translations generated, never

&#x20; delivered). The brief correctly avoids depending on chat, but a season that

&#x20; brings in non-English players makes this worse before it makes it better.



\## Proposed build order



Each stage is shippable and playable on its own.



Stage A — season skeleton. Season record, phase computation from absolute

time, objective records, map overlay, season panel. No captures, no combat.

Proves phases roll correctly across boundaries with nothing ticking. This is

also the stage that surfaces schema mistakes cheaply.



Stage B — Boot Sequence. The four onboarding operations, daily claim index,

catch-up track, personal and alliance participation. Playable solo, which means

testable today with the players who exist.



Stage C — factories and supplies. Neutral then contestable, control,

ownership event log, supply balance, command-only spending. Needs two accounts,

not two populated alliances.



Stage D — scheduled warfare. War windows, assaults, frozen allegiance,

settlement watermark, primary-objective-per-window index. This is the stage that

genuinely needs more players and the hostile colour.



Stage E — war assets. After combat baseline is re-measured.



Stage F — Colossus, Core, rewards.



Migration-wise this is roughly eight new tables — seasons, objectives, ownership

events, daily operations, alliance supply, assaults, war assets, boss

participation, reward claims — which makes it comfortably the largest schema

change in the project's history. Staging them across 0018 onward rather than one

migration is worth it for that reason alone.



\## Questions



1\. Held time or last touch at the Core? My recommendation is held time, and

&#x20;  it makes the factory pro-rating free.

2\. Title or skin for the champion, and does ALL\_SKINS\_UNLOCKED close

&#x20;  before the season ends?

3\. War window length and frequency — how many per week, and does 90 minutes

&#x20;  work given the 40 minute travel ceiling?

4\. Logical season day — days since season start, or UTC calendar day?

5\. When does the season start relative to opening signups? If weeks 4–10

&#x20;  need more than four players, the season start depends on text filtering

&#x20;  shipping, and that should be stated rather than discovered.

6\. Empty finale. The brief flags this as a product decision and proposes the

&#x20;  Dominion retaining the Core with no human champion. I agree with that

&#x20;  proposal — a fallback ranking would let an alliance win the season without

&#x20;  ever holding the objective the season is named after, which costs more than

&#x20;  an empty finale does.

7\. Is the Colossus one shared server-wide integrity pool, or per alliance? A

&#x20;  shared pool with three testers means it is never defeated; the brief handles

&#x20;  that gracefully, but it is worth confirming that is the intent rather than an

&#x20;  accident.

